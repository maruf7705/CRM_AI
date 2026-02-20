"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChannelCard } from "@/components/channels/ChannelCard";
import { ConnectFacebook } from "@/components/channels/ConnectFacebook";
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

const OAUTH_STATE_KEY = "omnidesk:channels:facebook:oauth-state";

const resolveErrorMessage = (error: unknown): string => {
  if (typeof error === "object" && error !== null && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string") {
      return message;
    }
  }

  return "Unexpected error";
};

export default function FacebookChannelPage() {
  const router = useRouter();
  const { organizationId } = useAuth();
  const channelsQuery = useChannels(organizationId ?? undefined);
  const requestConnectUrl = useChannelConnectUrl(organizationId ?? undefined, "FACEBOOK");
  const completeConnect = useCompleteChannelConnect(organizationId ?? undefined, "FACEBOOK");
  const deleteChannel = useDeleteChannel(organizationId ?? undefined);
  const testChannelConnection = useTestChannelConnection(organizationId ?? undefined);

  const [statusMessage, setStatusMessage] = useState<string>("");
  const [disconnectingId, setDisconnectingId] = useState<string | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [oauthCode, setOauthCode] = useState<string | null>(null);
  const [oauthStateParam, setOauthStateParam] = useState<string | null>(null);
  const oauthHandledRef = useRef(false);

  const facebookChannels = useMemo(
    () => (channelsQuery.data ?? []).filter((channel) => channel.type === "FACEBOOK"),
    [channelsQuery.data],
  );

  const handleConnect = async () => {
    if (!organizationId) {
      return;
    }

    try {
      const redirectUri = `${window.location.origin}/channels/facebook`;
      const generatedState = crypto.randomUUID();
      window.localStorage.setItem(OAUTH_STATE_KEY, generatedState);

      const result = await requestConnectUrl.mutateAsync({
        redirectUri,
        state: generatedState,
      });

      window.location.assign(result.authUrl);
    } catch (error) {
      setStatusMessage(`Facebook OAuth redirect failed: ${resolveErrorMessage(error)}`);
    }
  };

  const handleDisconnect = async (channelId: string) => {
    const confirmed = window.confirm("Disconnect this Facebook channel?");
    if (!confirmed) {
      return;
    }

    try {
      setDisconnectingId(channelId);
      await deleteChannel.mutateAsync(channelId);
      setStatusMessage("Facebook channel disconnected.");
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

    const redirectUri = `${window.location.origin}/channels/facebook`;
    const expectedState = window.localStorage.getItem(OAUTH_STATE_KEY);

    if (expectedState && oauthStateParam && expectedState !== oauthStateParam) {
      setStatusMessage("Facebook OAuth state mismatch. Restart the connect flow.");
      return;
    }

    void completeConnect
      .mutateAsync({
        code: oauthCode,
        redirectUri,
        ...(oauthStateParam ? { state: oauthStateParam } : {}),
      })
      .then((result) => {
        setStatusMessage(result.isNew ? "Facebook channel connected." : "Facebook channel refreshed.");
        window.localStorage.removeItem(OAUTH_STATE_KEY);
        router.replace("/channels/facebook");
      })
      .catch((error: unknown) => {
        setStatusMessage(`Facebook connect failed: ${resolveErrorMessage(error)}`);
        router.replace("/channels/facebook");
      });
  }, [completeConnect, oauthCode, oauthStateParam, organizationId, router]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Facebook Channel"
        description="Connect Facebook Messenger via OAuth and process webhook events in real time."
      />

      <ConnectFacebook
        onConnect={() => void handleConnect()}
        isPending={requestConnectUrl.isPending || completeConnect.isPending}
        statusMessage={statusMessage || `Webhook URL: ${appConfig.apiBaseUrl}/webhooks/facebook`}
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
          title="Failed to load Facebook channels"
          description="Refresh the page and try again."
        />
      ) : null}

      {!channelsQuery.isLoading && !channelsQuery.isError && facebookChannels.length === 0 ? (
        <EmptyState
          title="No Facebook channel connected"
          description="Start the OAuth flow to connect a Facebook Page."
          illustrationSrc="/images/empty-states/no-channels.svg"
          illustrationAlt="No channels illustration"
          actionLabel="Connect Facebook"
          onAction={() => void handleConnect()}
        />
      ) : null}

      {facebookChannels.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {facebookChannels.map((channel) => (
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
          Use ngrok or your Railway URL for webhook validation in Meta Developer settings:
          <span className="ml-1 font-mono">{appConfig.apiBaseUrl}/webhooks/facebook</span>
        </CardContent>
      </Card>
    </div>
  );
}
