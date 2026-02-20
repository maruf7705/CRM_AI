"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChannelCard } from "@/components/channels/ChannelCard";
import { ConnectInstagram } from "@/components/channels/ConnectInstagram";
import { EmptyState } from "@/components/shared/EmptyState";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { appConfig } from "@/lib/constants";
import { useAuth } from "@/hooks/useAuth";
import {
  useChannelConnectUrl,
  useChannels,
  useCompleteChannelConnect,
  useDeleteChannel,
  useTestChannelConnection,
} from "@/hooks/useChannels";

const OAUTH_STATE_KEY = "omnidesk:channels:instagram:oauth-state";

const resolveErrorMessage = (error: unknown): string => {
  if (typeof error === "object" && error !== null && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string") {
      return message;
    }
  }

  return "Unexpected error";
};

export default function InstagramChannelPage() {
  const router = useRouter();
  const { organizationId } = useAuth();
  const channelsQuery = useChannels(organizationId ?? undefined);
  const requestConnectUrl = useChannelConnectUrl(organizationId ?? undefined, "INSTAGRAM");
  const completeConnect = useCompleteChannelConnect(organizationId ?? undefined, "INSTAGRAM");
  const deleteChannel = useDeleteChannel(organizationId ?? undefined);
  const testChannelConnection = useTestChannelConnection(organizationId ?? undefined);

  const [statusMessage, setStatusMessage] = useState<string>("");
  const [disconnectingId, setDisconnectingId] = useState<string | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [oauthCode, setOauthCode] = useState<string | null>(null);
  const [oauthStateParam, setOauthStateParam] = useState<string | null>(null);
  const oauthHandledRef = useRef(false);

  const instagramChannels = useMemo(
    () => (channelsQuery.data ?? []).filter((channel) => channel.type === "INSTAGRAM"),
    [channelsQuery.data],
  );

  const handleConnect = async () => {
    if (!organizationId) {
      return;
    }

    try {
      const redirectUri = `${window.location.origin}/channels/instagram`;
      const generatedState = crypto.randomUUID();
      window.localStorage.setItem(OAUTH_STATE_KEY, generatedState);

      const result = await requestConnectUrl.mutateAsync({
        redirectUri,
        state: generatedState,
      });

      window.location.assign(result.authUrl);
    } catch (error) {
      setStatusMessage(`Instagram OAuth redirect failed: ${resolveErrorMessage(error)}`);
    }
  };

  const handleDisconnect = async (channelId: string) => {
    const confirmed = window.confirm("Disconnect this Instagram channel?");
    if (!confirmed) {
      return;
    }

    try {
      setDisconnectingId(channelId);
      await deleteChannel.mutateAsync(channelId);
      setStatusMessage("Instagram channel disconnected.");
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

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setOauthCode(params.get("code"));
    setOauthStateParam(params.get("state"));
  }, []);

  useEffect(() => {
    if (!organizationId || !oauthCode || oauthHandledRef.current) {
      return;
    }

    oauthHandledRef.current = true;

    const redirectUri = `${window.location.origin}/channels/instagram`;
    const expectedState = window.localStorage.getItem(OAUTH_STATE_KEY);

    if (expectedState && oauthStateParam && expectedState !== oauthStateParam) {
      setStatusMessage("Instagram OAuth state mismatch. Restart the connect flow.");
      return;
    }

    void completeConnect
      .mutateAsync({
        code: oauthCode,
        redirectUri,
        ...(oauthStateParam ? { state: oauthStateParam } : {}),
      })
      .then((result) => {
        setStatusMessage(result.isNew ? "Instagram channel connected." : "Instagram channel refreshed.");
        window.localStorage.removeItem(OAUTH_STATE_KEY);
        router.replace("/channels/instagram");
      })
      .catch((error: unknown) => {
        setStatusMessage(`Instagram connect failed: ${resolveErrorMessage(error)}`);
        router.replace("/channels/instagram");
      });
  }, [completeConnect, oauthCode, oauthStateParam, organizationId, router]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Instagram Channel"
        description="Connect Instagram DM via OAuth and receive message webhook events."
      />

      <ConnectInstagram
        onConnect={() => void handleConnect()}
        isPending={requestConnectUrl.isPending || completeConnect.isPending}
        statusMessage={statusMessage || `Webhook URL: ${appConfig.apiBaseUrl}/webhooks/instagram`}
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
          title="Failed to load Instagram channels"
          description="Refresh the page and try again."
        />
      ) : null}

      {!channelsQuery.isLoading && !channelsQuery.isError && instagramChannels.length === 0 ? (
        <EmptyState
          title="No Instagram channel connected"
          description="Start the OAuth flow to connect an Instagram business account."
          illustrationSrc="/images/empty-states/no-channels.svg"
          illustrationAlt="No channels illustration"
          actionLabel="Connect Instagram"
          onAction={() => void handleConnect()}
        />
      ) : null}

      {instagramChannels.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {instagramChannels.map((channel) => (
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
        <CardContent className="p-4 text-sm text-muted-foreground">
          Configure the Meta webhook callback URL:
          <span className="ml-1 font-mono">{appConfig.apiBaseUrl}/webhooks/instagram</span>
        </CardContent>
      </Card>
    </div>
  );
}
