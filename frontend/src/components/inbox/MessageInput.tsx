"use client";

import { Paperclip, Send, Smile } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface MessageInputProps {
  value: string;
  disabled?: boolean;
  isSending?: boolean;
  onChange: (value: string) => void;
  onSend: () => void;
}

export const MessageInput = ({ value, disabled = false, isSending = false, onChange, onSend }: MessageInputProps) => {
  const canSend = value.trim().length > 0 && !disabled && !isSending;

  return (
    <div className="border-t p-3">
      <div className="flex items-end gap-2">
        <div className="flex shrink-0 items-center gap-1">
          <Button type="button" size="icon" variant="ghost" className="h-8 w-8" disabled={disabled}>
            <Paperclip className="h-4 w-4" />
          </Button>
          <Button type="button" size="icon" variant="ghost" className="h-8 w-8" disabled={disabled}>
            <Smile className="h-4 w-4" />
          </Button>
        </div>

        <Textarea
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              if (canSend) {
                onSend();
              }
            }
          }}
          placeholder="Type a message..."
          className="min-h-[62px]"
        />

        <Button size="icon" onClick={onSend} aria-label="Send message" disabled={!canSend}>
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};
