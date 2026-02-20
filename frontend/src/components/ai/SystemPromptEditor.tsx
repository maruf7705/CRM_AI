"use client";

import { Textarea } from "@/components/ui/textarea";

interface SystemPromptEditorProps {
  value: string;
  onChange: (value: string) => void;
  maxLength?: number;
}

export const SystemPromptEditor = ({ value, onChange, maxLength = 20_000 }: SystemPromptEditorProps) => {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">System Prompt</label>
      <Textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-[180px]"
        maxLength={maxLength}
        placeholder="You are a helpful assistant for Acme Corp. Answer clearly, accurately, and briefly."
      />
      <p className="text-xs text-muted-foreground">
        {value.length}/{maxLength} characters
      </p>
    </div>
  );
};
