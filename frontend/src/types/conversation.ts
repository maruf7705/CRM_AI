export type ConversationStatus = "OPEN" | "PENDING" | "RESOLVED" | "CLOSED";
export type Priority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

export interface Conversation {
  id: string;
  externalId?: string;
  status: ConversationStatus;
  priority: Priority;
  subject?: string;
  lastMessagePreview?: string;
  lastMessageAt?: string;
  unreadCount: number;
  aiEnabled: boolean;
  isAiHandling: boolean;
  metadata?: Record<string, unknown>;
  closedAt?: string;
  createdAt: string;
  updatedAt: string;
  channel: {
    id: string;
    type: "FACEBOOK" | "INSTAGRAM" | "WHATSAPP" | "WEBCHAT" | "TELEGRAM" | "EMAIL";
    name: string;
  };
  contact: {
    id: string;
    displayName: string;
    stage: "NEW" | "LEAD" | "QUALIFIED" | "CUSTOMER" | "CHURNED";
    email?: string;
    phone?: string;
    avatar?: string;
  };
  assignedTo?: {
    id: string;
    firstName: string;
    lastName: string;
    avatar?: string;
  };
}
