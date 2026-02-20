import { Check, CheckCheck, Clock3, AlertTriangle, Bot } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MessageStatus, SenderType } from "@/types";

interface MessageBubbleProps {
  content: string;
  sender: SenderType;
  timestamp: string;
  status?: MessageStatus | undefined;
  aiConfidence?: number | undefined;
}

const statusIconMap: Record<MessageStatus, JSX.Element> = {
  PENDING: <Clock3 className="h-3 w-3" />,
  SENT: <Check className="h-3 w-3" />,
  DELIVERED: <CheckCheck className="h-3 w-3" />,
  READ: <CheckCheck className="h-3 w-3 text-emerald-200" />,
  FAILED: <AlertTriangle className="h-3 w-3 text-red-200" />,
};

export const MessageBubble = ({ content, sender, timestamp, status, aiConfidence }: MessageBubbleProps) => {
  const isIncoming = sender === "CONTACT";

  return (
    <div className={cn("group flex", isIncoming ? "justify-start" : "justify-end")}> 
      <div
        className={cn(
          "max-w-[85%] rounded-xl px-3 py-2 text-sm shadow-sm md:max-w-[75%]",
          sender === "CONTACT" && "bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100",
          sender === "AGENT" && "bg-indigo-500 text-white",
          sender === "AI" && "animate-pulseSoft bg-violet-500 text-white",
          sender === "SYSTEM" && "bg-secondary text-secondary-foreground",
        )}
      >
        {sender === "AI" ? (
          <div className="mb-1 inline-flex items-center gap-1 rounded-full bg-white/20 px-1.5 py-0.5 text-[10px] uppercase tracking-wide">
            <Bot className="h-3 w-3" />
            AI
          </div>
        ) : null}

        <p className="whitespace-pre-wrap break-words">{content}</p>

        <div className="mt-1 flex items-center justify-end gap-2 text-[11px] opacity-90">
          {sender === "AI" && typeof aiConfidence === "number" ? (
            <span>{Math.round(aiConfidence * 100)}%</span>
          ) : null}
          {status && !isIncoming ? statusIconMap[status] : null}
          <span className="opacity-70 transition-opacity group-hover:opacity-100">{timestamp}</span>
        </div>
      </div>
    </div>
  );
};
