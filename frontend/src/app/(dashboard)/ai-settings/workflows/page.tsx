"use client";

import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { appConfig } from "@/lib/constants";
import { useAuth } from "@/hooks/useAuth";
import { useAiSettings } from "@/hooks/useAiSettings";

export default function AiWorkflowsPage() {
  const { organizationId } = useAuth();
  const settingsQuery = useAiSettings(organizationId ?? undefined);

  const callbackUrl = `${appConfig.apiBaseUrl}/webhooks/n8n-callback`;

  return (
    <div className="space-y-6">
      <PageHeader
        title="AI Workflows"
        description="Manage n8n webhook orchestration and callback wiring."
      />

      <Card>
        <CardHeader>
          <CardTitle>n8n Reply Webhook</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            Active n8n webhook URL:
            <span className="ml-1 break-all font-mono">
              {settingsQuery.data?.n8nWebhookUrl ?? "Not configured"}
            </span>
          </p>
          <p>
            Callback URL:
            <span className="ml-1 break-all font-mono">{callbackUrl}</span>
          </p>
          <p>
            Header for callback auth:
            <span className="ml-1 font-mono">x-n8n-callback-secret: &lt;N8N_CALLBACK_SECRET&gt;</span>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
