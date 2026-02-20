import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ChannelType } from "@/types";
import { AiToggle } from "./AiToggle";
import { ChannelBadge } from "./ChannelBadge";

interface AssigneeOption {
  id: string;
  label: string;
}

interface ChatHeaderProps {
  title: string;
  subtitle?: string | undefined;
  channelType: ChannelType;
  aiEnabled: boolean;
  aiToggleDisabled?: boolean | undefined;
  aiToggleDisabledReason?: string | undefined;
  assignedToId?: string | null | undefined;
  assigneeOptions?: AssigneeOption[] | undefined;
  isAssigning?: boolean | undefined;
  showBackButton?: boolean | undefined;
  onBack?: (() => void) | undefined;
  onToggleAi: (enabled: boolean) => void;
  onAssign?: ((assigneeId: string | null) => void) | undefined;
}

export const ChatHeader = ({
  title,
  subtitle,
  channelType,
  aiEnabled,
  aiToggleDisabled = false,
  aiToggleDisabledReason,
  assignedToId,
  assigneeOptions,
  isAssigning = false,
  showBackButton = false,
  onBack,
  onToggleAi,
  onAssign,
}: ChatHeaderProps) => {
  return (
    <header className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
      <div className="min-w-0 space-y-1">
        <div className="flex items-center gap-2">
          {showBackButton ? (
            <Button type="button" variant="ghost" size="icon" onClick={onBack} className="h-7 w-7">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          ) : null}
          <h2 className="truncate text-sm font-semibold md:text-base">{title}</h2>
        </div>

        <div className="flex items-center gap-2">
          <ChannelBadge type={channelType} />
          {subtitle ? <p className="truncate text-xs text-muted-foreground">{subtitle}</p> : null}
        </div>
      </div>

      <div className="flex items-center gap-2">
        {onAssign && assigneeOptions && assigneeOptions.length > 0 ? (
          <select
            value={assignedToId ?? ""}
            disabled={isAssigning}
            onChange={(event) => onAssign(event.target.value || null)}
            className="h-8 rounded-md border bg-background px-2 text-xs"
          >
            <option value="">Unassigned</option>
            {assigneeOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        ) : null}

        <AiToggle
          enabled={aiEnabled}
          disabled={aiToggleDisabled}
          disabledReason={aiToggleDisabledReason}
          onToggle={onToggleAi}
        />
      </div>
    </header>
  );
};
