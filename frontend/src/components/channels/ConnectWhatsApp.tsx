"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export interface WhatsAppConnectInput {
  name: string;
  phoneNumberId: string;
  accessToken: string;
  webhookSecret?: string;
}

interface ConnectWhatsAppProps {
  onConnect: (payload: WhatsAppConnectInput) => Promise<void> | void;
  isPending?: boolean;
  statusMessage?: string;
}

export const ConnectWhatsApp = ({
  onConnect,
  isPending = false,
  statusMessage,
}: ConnectWhatsAppProps) => {
  const [name, setName] = useState("WhatsApp Business");
  const [phoneNumberId, setPhoneNumberId] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [webhookSecret, setWebhookSecret] = useState("");

  const canSubmit = name.trim().length >= 2 && phoneNumberId.trim().length > 0 && accessToken.trim().length > 0;

  const handleSubmit = async () => {
    if (!canSubmit) {
      return;
    }

    const payload: WhatsAppConnectInput = {
      name: name.trim(),
      phoneNumberId: phoneNumberId.trim(),
      accessToken: accessToken.trim(),
    };

    const normalizedWebhookSecret = webhookSecret.trim();
    if (normalizedWebhookSecret) {
      payload.webhookSecret = normalizedWebhookSecret;
    }

    await onConnect(payload);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Connect WhatsApp Cloud API</CardTitle>
        <CardDescription>
          Provide your Meta Cloud API phone number id and permanent access token for outbound messaging.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Channel name" />
        <Input
          value={phoneNumberId}
          onChange={(event) => setPhoneNumberId(event.target.value)}
          placeholder="Phone number ID"
        />
        <Input
          value={accessToken}
          onChange={(event) => setAccessToken(event.target.value)}
          placeholder="Permanent access token"
          type="password"
        />
        <Input
          value={webhookSecret}
          onChange={(event) => setWebhookSecret(event.target.value)}
          placeholder="Webhook secret (optional)"
        />
        <Button onClick={() => void handleSubmit()} disabled={!canSubmit || isPending} className="w-full">
          {isPending ? "Connecting..." : "Connect WhatsApp"}
        </Button>
        {statusMessage ? <p className="text-sm text-muted-foreground">{statusMessage}</p> : null}
      </CardContent>
    </Card>
  );
};
