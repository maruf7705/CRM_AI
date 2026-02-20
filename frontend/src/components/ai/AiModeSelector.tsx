"use client";

import { Select } from "@/components/ui/select";

interface AiModeSelectorProps {
  value: "OFF" | "SUGGESTION" | "AUTO_REPLY";
  onChange: (value: "OFF" | "SUGGESTION" | "AUTO_REPLY") => void;
}

export const AiModeSelector = ({ value, onChange }: AiModeSelectorProps) => {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">AI Mode</label>
      <Select
        value={value}
        onChange={(event) => onChange(event.target.value as "OFF" | "SUGGESTION" | "AUTO_REPLY")}
      >
        <option value="OFF">OFF</option>
        <option value="SUGGESTION">SUGGESTION</option>
        <option value="AUTO_REPLY">AUTO_REPLY</option>
      </Select>
      <p className="text-xs text-muted-foreground">
        OFF disables assistant responses, SUGGESTION drafts for agents, AUTO_REPLY sends automatically.
      </p>
    </div>
  );
};
