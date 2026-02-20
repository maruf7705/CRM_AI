import type { MessageStatus } from "@prisma/client";
import { logger } from "../../config/logger";
import { supabaseAdmin } from "../../config/supabase-admin";

interface BroadcastPayload {
  event: string;
  payload: Record<string, unknown>;
}

export class RealtimeService {
  private async send(channelName: string, data: BroadcastPayload): Promise<void> {
    const channel = supabaseAdmin.channel(channelName);

    const response = await channel.send({
      type: "broadcast",
      event: data.event,
      payload: data.payload,
    });

    if (response !== "ok") {
      logger.warn("Realtime broadcast returned non-ok response", {
        channelName,
        event: data.event,
        response,
      });
    }
  }

  async broadcastNewMessage(
    orgId: string,
    message: Record<string, unknown>,
    conversation: Record<string, unknown>,
  ): Promise<void> {
    await this.send(`org:${orgId}`, {
      event: "new_message",
      payload: { message, conversation },
    });
  }

  async broadcastMessageStatus(orgId: string, messageId: string, status: MessageStatus): Promise<void> {
    await this.send(`org:${orgId}`, {
      event: "message_status",
      payload: { messageId, status },
    });
  }

  async broadcastConversationUpdate(
    orgId: string,
    conversationId: string,
    updates: Record<string, unknown>,
  ): Promise<void> {
    await this.send(`org:${orgId}`, {
      event: "conversation_update",
      payload: { conversationId, updates },
    });
  }

  async broadcastNewConversation(orgId: string, conversation: Record<string, unknown>): Promise<void> {
    await this.send(`org:${orgId}`, {
      event: "new_conversation",
      payload: { conversation },
    });
  }

  async broadcastAiProcessing(orgId: string, conversationId: string): Promise<void> {
    await this.send(`org:${orgId}`, {
      event: "ai_processing",
      payload: { conversationId },
    });
  }

  async broadcastAiReply(orgId: string, conversationId: string, message: Record<string, unknown>): Promise<void> {
    await this.send(`org:${orgId}`, {
      event: "ai_reply",
      payload: { conversationId, message },
    });
  }

  async broadcastAiSuggestion(orgId: string, conversationId: string, suggestion: string): Promise<void> {
    await this.send(`org:${orgId}`, {
      event: "ai_suggestion",
      payload: { conversationId, suggestion },
    });
  }

  async broadcastAiError(orgId: string, conversationId: string, error: string): Promise<void> {
    await this.send(`org:${orgId}`, {
      event: "ai_error",
      payload: { conversationId, error },
    });
  }

  async broadcastTyping(orgId: string, conversationId: string, userId: string): Promise<void> {
    await this.send(`org:${orgId}`, {
      event: "typing",
      payload: { conversationId, userId },
    });
  }

  async broadcastNotification(userId: string, notification: Record<string, unknown>): Promise<void> {
    await this.send(`user:${userId}`, {
      event: "notification",
      payload: { notification },
    });
  }

  async broadcastUnreadUpdate(orgId: string, conversationId: string, count: number): Promise<void> {
    await this.send(`org:${orgId}`, {
      event: "unread_update",
      payload: { conversationId, count },
    });
  }
}

export const realtimeService = new RealtimeService();
