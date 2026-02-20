import type { ChannelType, Message } from "@/types";
import { AiSuggestionBar } from "./AiSuggestionBar";
import { ChatHeader } from "./ChatHeader";
import { MessageInput } from "./MessageInput";
import { MessageList } from "./MessageList";
import { TypingIndicator } from "./TypingIndicator";

interface AssigneeOption {
  id: string;
  label: string;
}

interface ChatWindowProps {
  title: string;
  subtitle?: string;
  channelType: ChannelType;
  aiEnabled: boolean;
  aiToggleDisabled?: boolean;
  aiToggleDisabledReason?: string;
  assignedToId?: string | null;
  assigneeOptions?: AssigneeOption[];
  isAssigning?: boolean;
  showBackButton?: boolean;
  onBack?: () => void;
  onAssign?: (assigneeId: string | null) => void;
  messages: Message[];
  hasMoreMessages?: boolean;
  isLoadingMoreMessages?: boolean;
  onLoadMoreMessages?: () => void;
  inputValue: string;
  isSending?: boolean;
  isTyping?: boolean;
  isAiProcessing?: boolean;
  typingUsersCount?: number;
  aiSuggestion?: string;
  onInputChange: (value: string) => void;
  onSend: () => void;
  onToggleAi: (enabled: boolean) => void;
  onSendSuggestion?: () => void;
  onEditSuggestion?: () => void;
  onDismissSuggestion?: () => void;
}

export const ChatWindow = ({
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
  onAssign,
  messages,
  hasMoreMessages = false,
  isLoadingMoreMessages = false,
  onLoadMoreMessages,
  inputValue,
  isSending = false,
  isTyping = false,
  isAiProcessing = false,
  typingUsersCount = 1,
  aiSuggestion,
  onInputChange,
  onSend,
  onToggleAi,
  onSendSuggestion,
  onEditSuggestion,
  onDismissSuggestion,
}: ChatWindowProps) => {
  return (
    <section className="flex h-full min-h-0 flex-col rounded-xl border">
      <ChatHeader
        title={title}
        subtitle={subtitle}
        channelType={channelType}
        aiEnabled={aiEnabled}
        aiToggleDisabled={aiToggleDisabled}
        aiToggleDisabledReason={aiToggleDisabledReason}
        assignedToId={assignedToId}
        assigneeOptions={assigneeOptions}
        isAssigning={isAssigning}
        showBackButton={showBackButton}
        onBack={onBack}
        onAssign={onAssign}
        onToggleAi={onToggleAi}
      />

      {aiSuggestion && onSendSuggestion && onEditSuggestion && onDismissSuggestion ? (
        <div className="border-b p-2">
          <AiSuggestionBar
            suggestion={aiSuggestion}
            onSend={onSendSuggestion}
            onEdit={onEditSuggestion}
            onDismiss={onDismissSuggestion}
          />
        </div>
      ) : null}

      <div className="min-h-0 flex-1 overflow-hidden">
        <MessageList
          messages={messages}
          hasMore={hasMoreMessages}
          isLoadingMore={isLoadingMoreMessages}
          onLoadMore={onLoadMoreMessages}
        />
      </div>

      {isTyping || isAiProcessing ? (
        <div className="px-3 pb-2">
          <TypingIndicator
            userCount={typingUsersCount}
            label={isAiProcessing && !isTyping ? "AI processing" : undefined}
          />
        </div>
      ) : null}

      <MessageInput value={inputValue} onChange={onInputChange} onSend={onSend} isSending={isSending} />
    </section>
  );
};
