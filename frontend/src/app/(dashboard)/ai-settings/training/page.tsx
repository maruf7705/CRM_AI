"use client";

import { useState } from "react";
import { toast } from "sonner";
import { TrainingDocList } from "@/components/ai/TrainingDocList";
import { TrainingDocUpload } from "@/components/ai/TrainingDocUpload";
import { EmptyState } from "@/components/shared/EmptyState";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import {
  useCreateTrainingDoc,
  useDeleteTrainingDoc,
  useTrainingDocs,
} from "@/hooks/useAiSettings";

const errorToMessage = (error: unknown): string => {
  if (typeof error === "object" && error !== null && "message" in error && typeof error.message === "string") {
    return error.message;
  }

  return "Unexpected error";
};

export default function AiTrainingPage() {
  const { organizationId } = useAuth();
  const docsQuery = useTrainingDocs(organizationId ?? undefined);
  const createDocMutation = useCreateTrainingDoc(organizationId ?? undefined);
  const deleteDocMutation = useDeleteTrainingDoc(organizationId ?? undefined);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <PageHeader
        title="AI Training"
        description="Upload business context, policies, and docs for richer AI responses."
      />

      {statusMessage ? (
        <Card>
          <CardContent className="p-4 text-sm text-muted-foreground">{statusMessage}</CardContent>
        </Card>
      ) : null}

      <TrainingDocUpload
        isUploading={createDocMutation.isPending}
        onUpload={async (payload) => {
          try {
            await createDocMutation.mutateAsync(payload);
            setStatusMessage("Training document uploaded.");
            toast.success("Training document uploaded.");
          } catch (error) {
            const message = `Upload failed: ${errorToMessage(error)}`;
            setStatusMessage(message);
            toast.error(message);
          }
        }}
      />

      {docsQuery.isLoading ? (
        <Card>
          <CardContent className="space-y-2 p-6">
            {[0, 1, 2, 3].map((index) => (
              <Skeleton key={index} className="h-12 w-full" />
            ))}
          </CardContent>
        </Card>
      ) : null}

      {docsQuery.isError ? (
        <EmptyState title="Failed to load training docs" description="Please refresh and try again." />
      ) : null}

      {!docsQuery.isLoading && !docsQuery.isError ? (
        <TrainingDocList
          docs={docsQuery.data ?? []}
          deletingId={deletingId}
          onDelete={(docId) => {
            if (!window.confirm("Delete this training document?")) {
              return;
            }

            setDeletingId(docId);
            void deleteDocMutation
              .mutateAsync(docId)
              .then(() => {
                setStatusMessage("Training document deleted.");
                toast.success("Training document deleted.");
              })
              .catch((error: unknown) => {
                const message = `Delete failed: ${errorToMessage(error)}`;
                setStatusMessage(message);
                toast.error(message);
              })
              .finally(() => {
                setDeletingId(null);
              });
          }}
        />
      ) : null}
    </div>
  );
}
