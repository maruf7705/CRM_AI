"use client";

import { Bot } from "lucide-react";
import { StatusDot } from "@/components/shared/StatusDot";
import { Switch } from "@/components/ui/switch";

interface AiToggleProps {
  enabled: boolean;
  disabled?: boolean;
  disabledReason?: string | undefined;
  onToggle: (enabled: boolean) => void;
}

export const AiToggle = ({ enabled, disabled = false, disabledReason, onToggle }: AiToggleProps) => {
  return (
    <div className="flex items-center gap-2" title={disabled && disabledReason ? disabledReason : undefined}>
      <StatusDot active={enabled} className={enabled ? "animate-pulseSoft" : ""} />
      <span className="inline-flex items-center gap-1 text-sm font-medium">
        <Bot className="h-3.5 w-3.5" />
        AI
      </span>
      <Switch checked={enabled} disabled={disabled} onCheckedChange={onToggle} />
      <span className="text-xs text-muted-foreground">{enabled ? "AI responding" : "Manual"}</span>
    </div>
  );
};
