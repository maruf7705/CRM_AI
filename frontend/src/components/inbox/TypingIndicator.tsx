interface TypingIndicatorProps {
  userCount?: number;
  label?: string | undefined;
}

export const TypingIndicator = ({ userCount = 1, label }: TypingIndicatorProps) => {
  return (
    <div className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current" />
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current [animation-delay:120ms]" />
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current [animation-delay:240ms]" />
      {label ?? (userCount > 1 ? `${userCount} users typing` : "typing")}
    </div>
  );
};
