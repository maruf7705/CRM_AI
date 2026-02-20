"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { MessageCircle, MessageSquare, Send } from "lucide-react";
import { toast } from "sonner";
import { ChannelCard } from "@/components/channels/ChannelCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { PageHeader } from "@/components/shared/PageHeader";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { useChannels, useDeleteChannel, useTestChannelConnection } from "@/hooks/useChannels";
import { cn } from "@/lib/utils";

const resolveErrorMessage = (error: unknown): string => {
  if (typeof error === "object" && error !== null && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string") {
      return message;
    }
  }

  return "Unexpected error";
};

const channelConfigs = [
  {
    type: "FACEBOOK",
    title: "Facebook Messenger",
    description: "OAuth connect, webhook verification, and real-time inbound processing.",
    href: "/channels/facebook",
    icon: MessageSquare,
  },
  {
    type: "INSTAGRAM",
    title: "Instagram DM",
    description: "Connect Instagram business messaging through the Meta OAuth flow.",
    href: "/channels/instagram",
    icon: MessageCircle,
  },
  {
    type: "WHATSAPP",
    title: "WhatsApp Cloud API",
    description: "Manual credential setup with delivery/read status webhooks.",
    href: "/channels/whatsapp",
    icon: Send,
  },
] as const;

export default function ChannelsPage() {
  const router = useRouter();
  const { organizationId } = useAuth();
  const channelsQuery = useChannels(organizationId ?? undefined);
  const deleteChannel = useDeleteChannel(organizationId ?? undefined);
  const testChannelConnection = useTestChannelConnection(organizationId ?? undefined);

  const [disconnectingId, setDisconnectingId] = useState<string | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);

  const channels = channelsQuery.data ?? [];
  const connectedCounts = useMemo(() => {
    return channelConfigs.reduce<Record<string, number>>((acc, config) => {
      acc[config.type] = channels.filter((channel) => channel.type === config.type).length;
      return acc;
    }, {});
  }, [channels]);

  const handleDisconnect = async (channelId: string) => {
    const confirmed = window.confirm("Disconnect this channel?");
    if (!confirmed) {
      return;
    }

    try {
      setDisconnectingId(channelId);
      await deleteChannel.mutateAsync(channelId);
      toast.success("Channel disconnected.");
    } catch (error) {
      toast.error(`Failed to disconnect channel: ${resolveErrorMessage(error)}`);
    } finally {
      setDisconnectingId(null);
    }
  };

  const handleTest = async (channelId: string) => {
    try {
      setTestingId(channelId);
      const result = await testChannelConnection.mutateAsync(channelId);
      toast.success(result.message);
    } catch (error) {
      toast.error(`Connection test failed: ${resolveErrorMessage(error)}`);
    } finally {
      setTestingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Channels"
        description="Manage Facebook, Instagram, and WhatsApp integrations."
      />

      <div className="grid gap-4 md:grid-cols-3">
        {channelConfigs.map((config) => (
          <Card key={config.type}>
            <CardHeader className="space-y-1">
              <div className="flex items-center gap-2">
                <config.icon className="h-4 w-4 text-indigo-600" />
                <CardTitle className="text-base">{config.title}</CardTitle>
              </div>
              <CardDescription>{config.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Connected: <span className="font-semibold text-foreground">{connectedCounts[config.type] ?? 0}</span>
              </p>
              <Link href={config.href} className={cn(buttonVariants(), "w-full")}>
                Open Setup
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>

      {channelsQuery.isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((index) => (
            <Card key={index}>
              <CardHeader>
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
              <CardContent className="space-y-2">
                <Skeleton className="h-4 w-2/5" />
                <Skeleton className="h-9 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : null}

      {channelsQuery.isError ? (
        <EmptyState title="Unable to load channels" description="Please refresh and try again." />
      ) : null}

      {!channelsQuery.isLoading && !channelsQuery.isError && channels.length === 0 ? (
        <EmptyState
          title="No channels connected"
          description="Open a setup page above to connect your first channel."
          illustrationSrc="/images/empty-states/no-channels.svg"
          illustrationAlt="No channels illustration"
          actionLabel="Facebook Setup"
          onAction={() => {
            router.push("/channels/facebook");
          }}
        />
      ) : null}

      {!channelsQuery.isLoading && !channelsQuery.isError && channels.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {channels.map((channel) => (
            <ChannelCard
              key={channel.id}
              channel={channel}
              onTest={handleTest}
              onDisconnect={handleDisconnect}
              testing={testingId === channel.id}
              disconnecting={disconnectingId === channel.id}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
