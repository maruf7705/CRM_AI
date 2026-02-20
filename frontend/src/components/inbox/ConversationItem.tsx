import { formatDistanceToNowStrict } from "date-fns";
import { Bot } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import type { ChannelType, ConversationStatus, Priority } from "@/types";
import { ChannelBadge } from "./ChannelBadge";

const PRIORITY_BORDER_CLASS: Record<Priority, string> = {
  LOW: "border-l-emerald-400",
  MEDIUM: "border-l-amber-300",
  HIGH: "border-l-orange-400",
  URGENT: "border-l-red-500",
};

interface ConversationItemProps {
  id: string;
  name: string;
  preview: string;
  unreadCount: number;
  channelType: ChannelType;
  status: ConversationStatus;
  priority: Priority;
  lastMessageAt?: string | undefined;
  aiEnabled: boolean;
  selected?: boolean;
  onClick?: (id: string) => void;
}

export const ConversationItem = ({
  id,
  name,
  preview,
  unreadCount,
  channelType,
  status,
  priority,
  lastMessageAt,
  aiEnabled,
  selected = false,
  onClick,
}: ConversationItemProps) => {
  const relativeTime = lastMessageAt
    ? formatDistanceToNowStrict(new Date(lastMessageAt), { addSuffix: true })
    : "No messages";

  return (
    <button
      type="button"
      onClick={() => onClick?.(id)}
      className={cn(
        "w-full rounded-lg border border-l-4 p-3 text-left transition-colors",
        PRIORITY_BORDER_CLASS[priority],
        selected ? "bg-indigo-50 dark:bg-indigo-950" : "hover:bg-muted/60",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-3">
          <Avatar className="h-9 w-9">
            <AvatarFallback>{name.slice(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="truncate text-sm font-medium">{name}</p>
              {aiEnabled ? <Bot className="h-3.5 w-3.5 text-violet-500" /> : null}
            </div>
            <p className="line-clamp-1 text-xs text-muted-foreground">{preview}</p>
          </div>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-1">
          <ChannelBadge type={channelType} />
          <p className="text-[11px] text-muted-foreground">{relativeTime}</p>
        </div>
      </div>

      <div className="mt-2 flex items-center justify-between">
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{status}</p>
        {unreadCount > 0 ? (
          <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-medium text-white">
            {unreadCount}
          </span>
        ) : null}
      </div>
    </button>
  );
};
