"use client";

import { useState } from "react";
import { toast } from "sonner";
import { AiConfigPanel } from "@/components/ai/AiConfigPanel";
import { AiTestChat } from "@/components/ai/AiTestChat";
import { EmptyState } from "@/components/shared/EmptyState";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAiSettings, useTestAi, useUpdateAiSettings } from "@/hooks/useAiSettings";
import { useAuth } from "@/hooks/useAuth";

const errorToMessage = (error: unknown): string => {
  if (typeof error === "object" && error !== null && "message" in error && typeof error.message === "string") {
    return error.message;
  }

  return "Unexpected error";
};

export default function AiSettingsPage() {
  const { organizationId } = useAuth();
  const settingsQuery = useAiSettings(organizationId ?? undefined);
  const updateSettingsMutation = useUpdateAiSettings(organizationId ?? undefined);
  const testAiMutation = useTestAi(organizationId ?? undefined);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <PageHeader
        title="AI Settings"
        description="Configure global AI mode, model behavior, and quick response tests."
      />

      {settingsQuery.isLoading ? (
        <Card>
          <CardContent className="space-y-3 p-6">
            <Skeleton className="h-6 w-1/4" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      ) : null}

      {settingsQuery.isError ? (
        <EmptyState title="Failed to load AI settings" description="Please refresh and try again." />
      ) : null}

      {settingsQuery.data ? (
        <AiConfigPanel
          settings={settingsQuery.data}
          isSaving={updateSettingsMutation.isPending}
          onSave={async (payload) => {
            try {
              await updateSettingsMutation.mutateAsync(payload);
              setStatusMessage("AI settings updated.");
              toast.success("AI settings updated.");
            } catch (error) {
              const message = `Failed to update AI settings: ${errorToMessage(error)}`;
              setStatusMessage(message);
              toast.error(message);
            }
          }}
        />
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>AI Test Chat</CardTitle>
        </CardHeader>
        <CardContent>
          <AiTestChat
            isTesting={testAiMutation.isPending}
            onTest={async (message) => {
              try {
                const result = await testAiMutation.mutateAsync({ message });
                toast.success(result.response ? "AI response generated." : "AI test completed.");
                return result;
              } catch (error) {
                toast.error(`AI test failed: ${errorToMessage(error)}`);
                throw error;
              }
            }}
          />
        </CardContent>
      </Card>

      {statusMessage ? (
        <Card>
          <CardContent className="p-4 text-sm text-muted-foreground">{statusMessage}</CardContent>
        </Card>
      ) : null}
    </div>
  );
}
