"use client";

import { Bell, BellOff, Volume2, VolumeX } from "lucide-react";
import { SearchInput } from "@/components/shared/SearchInput";
import { Button } from "@/components/ui/button";
import type { ChannelType, ConversationStatus } from "@/types";

const CHANNEL_OPTIONS: Array<{ label: string; value: ChannelType | "" }> = [
  { label: "All channels", value: "" },
  { label: "Facebook", value: "FACEBOOK" },
  { label: "Instagram", value: "INSTAGRAM" },
  { label: "WhatsApp", value: "WHATSAPP" },
  { label: "Webchat", value: "WEBCHAT" },
  { label: "Telegram", value: "TELEGRAM" },
  { label: "Email", value: "EMAIL" },
];

const STATUS_OPTIONS: Array<{ label: string; value: ConversationStatus | "" }> = [
  { label: "All statuses", value: "" },
  { label: "Open", value: "OPEN" },
  { label: "Pending", value: "PENDING" },
  { label: "Resolved", value: "RESOLVED" },
  { label: "Closed", value: "CLOSED" },
];

interface ConversationFiltersProps {
  search: string;
  status: ConversationStatus | "";
  channel: ChannelType | "";
  soundEnabled: boolean;
  browserNotificationsEnabled: boolean;
  onSearchChange: (value: string) => void;
  onStatusChange: (value: ConversationStatus | "") => void;
  onChannelChange: (value: ChannelType | "") => void;
  onToggleSound: () => void;
  onToggleBrowserNotifications: () => void;
}

export const ConversationFilters = ({
  search,
  status,
  channel,
  soundEnabled,
  browserNotificationsEnabled,
  onSearchChange,
  onStatusChange,
  onChannelChange,
  onToggleSound,
  onToggleBrowserNotifications,
}: ConversationFiltersProps) => {
  return (
    <div className="space-y-3 border-b p-3">
      <SearchInput value={search} onChange={onSearchChange} placeholder="Search conversations" />

      <div className="grid grid-cols-2 gap-2">
        <select
          value={channel}
          onChange={(event) => onChannelChange(event.target.value as ChannelType | "")}
          className="h-9 rounded-md border bg-background px-2 text-xs"
        >
          {CHANNEL_OPTIONS.map((option) => (
            <option key={option.label} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <select
          value={status}
          onChange={(event) => onStatusChange(event.target.value as ConversationStatus | "")}
          className="h-9 rounded-md border bg-background px-2 text-xs"
        >
          {STATUS_OPTIONS.map((option) => (
            <option key={option.label} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex gap-2">
        <Button
          type="button"
          variant={soundEnabled ? "default" : "outline"}
          size="sm"
          className="h-8 flex-1 text-xs"
          onClick={onToggleSound}
        >
          {soundEnabled ? <Volume2 className="mr-1 h-3 w-3" /> : <VolumeX className="mr-1 h-3 w-3" />}
          Sound
        </Button>

        <Button
          type="button"
          variant={browserNotificationsEnabled ? "default" : "outline"}
          size="sm"
          className="h-8 flex-1 text-xs"
          onClick={onToggleBrowserNotifications}
        >
          {browserNotificationsEnabled ? <Bell className="mr-1 h-3 w-3" /> : <BellOff className="mr-1 h-3 w-3" />}
          Alerts
        </Button>
      </div>
    </div>
  );
};
