"use client";

import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import type { AiTrainingDoc } from "@/hooks/useAiSettings";

interface TrainingDocListProps {
  docs: AiTrainingDoc[];
  deletingId?: string | null;
  onDelete?: (docId: string) => void;
}

export const TrainingDocList = ({ docs, deletingId, onDelete }: TrainingDocListProps) => {
  if (docs.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
        No training docs uploaded yet.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {docs.map((doc) => (
        <article key={doc.id} className="rounded-lg border p-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate font-medium">{doc.title}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Updated {formatDistanceToNow(new Date(doc.updatedAt), { addSuffix: true })}
              </p>
            </div>
            {onDelete ? (
              <Button
                size="sm"
                variant="destructive"
                onClick={() => onDelete(doc.id)}
                disabled={deletingId === doc.id}
              >
                {deletingId === doc.id ? "Deleting..." : "Delete"}
              </Button>
            ) : null}
          </div>
          <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{doc.content}</p>
        </article>
      ))}
    </div>
  );
};
