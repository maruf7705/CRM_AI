"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface ConnectInstagramProps {
  onConnect: () => void;
  isPending?: boolean;
  statusMessage?: string;
}

export const ConnectInstagram = ({
  onConnect,
  isPending = false,
  statusMessage,
}: ConnectInstagramProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Instagram DM OAuth</CardTitle>
        <CardDescription>
          Authenticate through Meta and attach your Instagram business account for direct messages.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Button onClick={onConnect} disabled={isPending} className="w-full">
          {isPending ? "Redirecting..." : "Connect with Instagram"}
        </Button>
        {statusMessage ? <p className="text-sm text-muted-foreground">{statusMessage}</p> : null}
      </CardContent>
    </Card>
  );
};
