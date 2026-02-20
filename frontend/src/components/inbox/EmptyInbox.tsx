import { EmptyState } from "@/components/shared/EmptyState";

interface EmptyInboxProps {
  onAction?: () => void;
}

export const EmptyInbox = ({ onAction }: EmptyInboxProps) => {
  return (
    <EmptyState
      title="No conversations yet"
      description="Connect a channel to start receiving messages in your unified inbox."
      illustrationSrc="/images/empty-states/no-conversations.svg"
      illustrationAlt="No conversations illustration"
      {...(onAction ? { actionLabel: "Go to Channels", onAction } : {})}
    />
  );
};
