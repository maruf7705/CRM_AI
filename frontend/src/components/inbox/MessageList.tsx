"use client";

import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { Message } from "@/types";
import { MessageBubble } from "./MessageBubble";

interface MessageListProps {
  messages: Message[];
  hasMore?: boolean | undefined;
  isLoadingMore?: boolean | undefined;
  onLoadMore?: (() => void) | undefined;
}

export const MessageList = ({
  messages,
  hasMore = false,
  isLoadingMore = false,
  onLoadMore,
}: MessageListProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const topSentinelRef = useRef<HTMLDivElement>(null);
  const keepPinnedToBottomRef = useRef(true);
  const previousScrollHeightRef = useRef(0);

  useEffect(() => {
    const container = containerRef.current;
    const sentinel = topSentinelRef.current;

    if (!container || !sentinel || !onLoadMore || !hasMore) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) {
          return;
        }

        if (isLoadingMore) {
          return;
        }

        previousScrollHeightRef.current = container.scrollHeight;
        onLoadMore();
      },
      {
        root: container,
        rootMargin: "120px",
        threshold: 0,
      },
    );

    observer.observe(sentinel);

    return () => observer.disconnect();
  }, [hasMore, isLoadingMore, onLoadMore]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    if (keepPinnedToBottomRef.current) {
      container.scrollTop = container.scrollHeight;
      previousScrollHeightRef.current = container.scrollHeight;
      return;
    }

    if (isLoadingMore) {
      return;
    }

    const previousHeight = previousScrollHeightRef.current;
    if (previousHeight > 0) {
      const heightDelta = container.scrollHeight - previousHeight;
      if (heightDelta > 0) {
        container.scrollTop += heightDelta;
      }
    }

    previousScrollHeightRef.current = container.scrollHeight;
  }, [messages, isLoadingMore]);

  return (
    <div
      ref={containerRef}
      className="h-full overflow-y-auto px-4 py-4"
      onScroll={() => {
        const container = containerRef.current;
        if (!container) {
          return;
        }

        const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
        keepPinnedToBottomRef.current = distanceFromBottom < 100;
      }}
    >
      <div ref={topSentinelRef} className="h-1" />

      {isLoadingMore ? <p className="mb-3 text-center text-xs text-muted-foreground">Loading older messages...</p> : null}

      <div className="space-y-3">
        <AnimatePresence initial={false}>
          {messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
            >
              <MessageBubble
                content={message.content}
                sender={message.sender}
                status={message.status}
                timestamp={new Date(message.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                aiConfidence={message.aiConfidence}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};
