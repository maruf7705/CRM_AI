import { formatDistanceToNow } from "date-fns";
import type { Channel } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConnectionStatusBadge } from "./ConnectionStatusBadge";

interface ChannelCardProps {
  channel: Channel;
  onTest?: (channelId: string) => void;
  onDisconnect?: (channelId: string) => void;
  testing?: boolean;
  disconnecting?: boolean;
}

export const ChannelCard = ({
  channel,
  onTest,
  onDisconnect,
  testing = false,
  disconnecting = false,
}: ChannelCardProps) => {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>{channel.name}</CardTitle>
          <p className="text-xs text-muted-foreground">{channel.type}</p>
        </div>
        <ConnectionStatusBadge connected={channel.isActive} />
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-muted-foreground">
        <p>External ID: {channel.externalId ?? "Not configured"}</p>
        <p>
          Last sync:{" "}
          {channel.lastSyncAt
            ? `${formatDistanceToNow(new Date(channel.lastSyncAt), { addSuffix: true })}`
            : "Never"}
        </p>
        <div className="flex gap-2">
          {onTest ? (
            <Button variant="outline" onClick={() => onTest(channel.id)} disabled={testing}>
              {testing ? "Testing..." : "Test"}
            </Button>
          ) : null}
          {onDisconnect ? (
            <Button variant="destructive" onClick={() => onDisconnect(channel.id)} disabled={disconnecting}>
              {disconnecting ? "Disconnecting..." : "Disconnect"}
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
};
