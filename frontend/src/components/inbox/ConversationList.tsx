import type { ChannelType, ConversationStatus, Priority } from "@/types";
import { ConversationItem } from "./ConversationItem";

export interface ConversationListItem {
  id: string;
  name: string;
  preview: string;
  unreadCount: number;
  channelType: ChannelType;
  status: ConversationStatus;
  priority: Priority;
  lastMessageAt?: string;
  aiEnabled: boolean;
}

interface ConversationListProps {
  items: ConversationListItem[];
  selectedId?: string | undefined;
  onSelect?: (id: string) => void;
}

export const ConversationList = ({ items, selectedId, onSelect = () => undefined }: ConversationListProps) => {
  return (
    <div className="space-y-2 p-2">
      {items.map((item) => (
        <ConversationItem
          key={item.id}
          id={item.id}
          name={item.name}
          preview={item.preview}
          unreadCount={item.unreadCount}
          channelType={item.channelType}
          status={item.status}
          priority={item.priority}
          lastMessageAt={item.lastMessageAt}
          aiEnabled={item.aiEnabled}
          selected={selectedId === item.id}
          onClick={onSelect}
        />
      ))}
    </div>
  );
};
