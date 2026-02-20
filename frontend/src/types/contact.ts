export type ContactStage = "NEW" | "LEAD" | "QUALIFIED" | "CUSTOMER" | "CHURNED";

export interface ContactTag {
  id: string;
  name: string;
  color: string;
}

export interface Contact {
  id: string;
  firstName?: string;
  lastName?: string;
  displayName: string;
  email?: string;
  phone?: string;
  avatar?: string;
  facebookId?: string;
  instagramId?: string;
  whatsappId?: string;
  telegramId?: string;
  company?: string;
  jobTitle?: string;
  notes?: string;
  stage: ContactStage;
  leadScore: number;
  customFields?: Record<string, unknown>;
  lastSeenAt?: string;
  createdAt: string;
  updatedAt: string;
  tags: ContactTag[];
  conversationCount: number;
}

export interface ContactConversation {
  id: string;
  status: "OPEN" | "PENDING" | "RESOLVED" | "CLOSED";
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  subject?: string;
  unreadCount: number;
  lastMessageAt?: string;
  lastMessagePreview?: string;
  createdAt: string;
  updatedAt: string;
  channel: {
    id: string;
    type: "FACEBOOK" | "INSTAGRAM" | "WHATSAPP" | "WEBCHAT" | "TELEGRAM" | "EMAIL";
    name: string;
  };
  assignedTo?: {
    id: string;
    firstName: string;
    lastName: string;
  };
}
