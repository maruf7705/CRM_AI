"use client";

import { Bot } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AiSuggestionBarProps {
  suggestion: string;
  onSend: () => void;
  onEdit: () => void;
  onDismiss: () => void;
}

export const AiSuggestionBar = ({ suggestion, onSend, onEdit, onDismiss }: AiSuggestionBarProps) => {
  return (
    <div className="rounded-md border bg-violet-50 p-3 dark:bg-violet-950/40">
      <p className="flex items-center gap-2 text-sm text-violet-900 dark:text-violet-100">
        <Bot className="h-4 w-4" />
        AI suggests: {suggestion}
      </p>
      <div className="mt-2 flex gap-2">
        <Button size="sm" onClick={onSend}>
          Send
        </Button>
        <Button size="sm" variant="outline" onClick={onEdit}>
          Edit
        </Button>
        <Button size="sm" variant="ghost" onClick={onDismiss}>
          Dismiss
        </Button>
      </div>
    </div>
  );
};
