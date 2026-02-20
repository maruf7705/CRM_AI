"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface ConnectFacebookProps {
  onConnect: () => void;
  isPending?: boolean;
  statusMessage?: string;
}

export const ConnectFacebook = ({ onConnect, isPending = false, statusMessage }: ConnectFacebookProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Facebook Messenger OAuth</CardTitle>
        <CardDescription>
          Connect your Facebook Page and automatically subscribe to Messenger webhook events.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Button onClick={onConnect} disabled={isPending} className="w-full">
          {isPending ? "Redirecting..." : "Connect with Facebook"}
        </Button>
        {statusMessage ? <p className="text-sm text-muted-foreground">{statusMessage}</p> : null}
      </CardContent>
    </Card>
  );
};
