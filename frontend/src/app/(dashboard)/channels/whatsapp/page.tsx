"use client";

import { useMemo, useState } from "react";
import { ChannelCard } from "@/components/channels/ChannelCard";
import { ConnectWhatsApp, type WhatsAppConnectInput } from "@/components/channels/ConnectWhatsApp";
import { EmptyState } from "@/components/shared/EmptyState";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { appConfig } from "@/lib/constants";
import { useAuth } from "@/hooks/useAuth";
import {
  useChannels,
  useCreateChannel,
  useDeleteChannel,
  useTestChannelConnection,
  useUpdateChannel,
} from "@/hooks/useChannels";

const resolveErrorMessage = (error: unknown): string => {
  if (typeof error === "object" && error !== null && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string") {
      return message;
    }
  }

  return "Unexpected error";
};

export default function WhatsAppChannelPage() {
  const { organizationId } = useAuth();
  const channelsQuery = useChannels(organizationId ?? undefined);
  const createChannel = useCreateChannel(organizationId ?? undefined);
  const deleteChannel = useDeleteChannel(organizationId ?? undefined);
  const testChannelConnection = useTestChannelConnection(organizationId ?? undefined);
  const [editingChannelId, setEditingChannelId] = useState<string | null>(null);
  const updateChannel = useUpdateChannel(organizationId ?? undefined, editingChannelId ?? undefined);

  const [statusMessage, setStatusMessage] = useState<string>("");
  const [disconnectingId, setDisconnectingId] = useState<string | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);

  const whatsappChannels = useMemo(
    () => (channelsQuery.data ?? []).filter((channel) => channel.type === "WHATSAPP"),
    [channelsQuery.data],
  );

  const handleConnect = async (payload: WhatsAppConnectInput) => {
    try {
      const existing = whatsappChannels.find((channel) => channel.externalId === payload.phoneNumberId);

      if (existing) {
        setEditingChannelId(existing.id);
        await updateChannel.mutateAsync({
          name: payload.name,
          externalId: payload.phoneNumberId,
          webhookSecret: payload.webhookSecret ?? null,
          credentials: {
            accessToken: payload.accessToken,
            phoneNumberId: payload.phoneNumberId,
          },
          isActive: true,
        });
        setStatusMessage("Updated existing WhatsApp channel credentials.");
        return;
      }

      await createChannel.mutateAsync({
        type: "WHATSAPP",
        name: payload.name,
        externalId: payload.phoneNumberId,
        webhookSecret: payload.webhookSecret ?? null,
        credentials: {
          accessToken: payload.accessToken,
          phoneNumberId: payload.phoneNumberId,
        },
        metadata: {
          setup: "manual",
        },
      });

      setStatusMessage("WhatsApp channel connected.");
    } catch (error) {
      setStatusMessage(`Failed to connect WhatsApp channel: ${resolveErrorMessage(error)}`);
    } finally {
      setEditingChannelId(null);
    }
  };

  const handleDisconnect = async (channelId: string) => {
    const confirmed = window.confirm("Disconnect this WhatsApp channel?");
    if (!confirmed) {
      return;
    }

    try {
      setDisconnectingId(channelId);
      await deleteChannel.mutateAsync(channelId);
      setStatusMessage("WhatsApp channel disconnected.");
    } catch (error) {
      setStatusMessage(`Failed to disconnect channel: ${resolveErrorMessage(error)}`);
    } finally {
      setDisconnectingId(null);
    }
  };

  const handleTest = async (channelId: string) => {
    try {
      setTestingId(channelId);
      const result = await testChannelConnection.mutateAsync(channelId);
      setStatusMessage(result.message);
    } catch (error) {
      setStatusMessage(`Connection test failed: ${resolveErrorMessage(error)}`);
    } finally {
      setTestingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="WhatsApp Channel"
        description="Connect WhatsApp Cloud API with manual credentials and verify delivery status webhooks."
      />

      <ConnectWhatsApp
        onConnect={handleConnect}
        isPending={createChannel.isPending || updateChannel.isPending}
        statusMessage={statusMessage || `Webhook URL: ${appConfig.apiBaseUrl}/webhooks/whatsapp`}
      />

      {channelsQuery.isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((index) => (
            <Card key={index}>
              <CardContent className="space-y-3 p-4">
                <Skeleton className="h-5 w-2/3" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-9 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : null}

      {channelsQuery.isError ? (
        <EmptyState
          title="Failed to load WhatsApp channels"
          description="Refresh the page and try again."
        />
      ) : null}

      {!channelsQuery.isLoading && !channelsQuery.isError && whatsappChannels.length === 0 ? (
        <EmptyState
          title="No WhatsApp channel connected"
          description="Add Cloud API credentials to start sending and receiving WhatsApp messages."
          illustrationSrc="/images/empty-states/no-channels.svg"
          illustrationAlt="No channels illustration"
        />
      ) : null}

      {whatsappChannels.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {whatsappChannels.map((channel) => (
            <ChannelCard
              key={channel.id}
              channel={channel}
              onDisconnect={handleDisconnect}
              onTest={handleTest}
              disconnecting={disconnectingId === channel.id}
              testing={testingId === channel.id}
            />
          ))}
        </div>
      ) : null}

      <Card>
        <CardContent className="space-y-1 p-4 text-sm text-muted-foreground">
          <p>Webhook verify token must match your backend `WHATSAPP_VERIFY_TOKEN` environment variable.</p>
          <p>
            Callback URL:
            <span className="ml-1 font-mono">{appConfig.apiBaseUrl}/webhooks/whatsapp</span>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
