import type { ChannelType } from "./channel";
import type { Role } from "./auth";

export interface AnalyticsDateRange {
  from: string;
  to: string;
}

export interface AnalyticsChannelBreakdown {
  channelType: ChannelType;
  messageCount: number;
  percentage: number;
}

export interface AnalyticsMessageTrendPoint {
  date: string;
  messages: number;
  aiReplies: number;
}

export interface AnalyticsResponseTimeTrendPoint {
  date: string;
  averageFirstResponseMinutes: number;
}

export interface AnalyticsOverview {
  range: AnalyticsDateRange;
  totals: {
    messagesToday: number;
    messagesWeek: number;
    messagesMonth: number;
    messagesAllTime: number;
    messagesInRange: number;
    aiRepliesInRange: number;
    aiReplyRate: number;
    activeConversations: number;
    newContactsInRange: number;
    resolutionRate: number;
    averageFirstResponseMinutes: number;
    respondedConversations: number;
  };
  channels: AnalyticsChannelBreakdown[];
  messagesTrend: AnalyticsMessageTrendPoint[];
  responseTimeTrend: AnalyticsResponseTimeTrendPoint[];
}

export interface AnalyticsChannels {
  range: AnalyticsDateRange;
  totalMessagesInRange: number;
  channels: AnalyticsChannelBreakdown[];
  topChannel?: ChannelType;
}

export interface AnalyticsAiTrendPoint {
  date: string;
  aiReplies: number;
  averageConfidence: number;
}

export interface AnalyticsAi {
  range: AnalyticsDateRange;
  totalMessagesInRange: number;
  aiRepliesInRange: number;
  aiReplyRate: number;
  averageConfidence: number;
  averageAiResponseMinutes: number;
  aiHandledConversations: number;
  aiResponseConversations: number;
  aiTrend: AnalyticsAiTrendPoint[];
}

export interface AnalyticsAgentPerformance {
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  avatar?: string;
  role: Role;
  messagesHandled: number;
  conversationsHandled: number;
  averageFirstResponseMinutes: number;
}

export interface AnalyticsAgents {
  range: AnalyticsDateRange;
  summary: {
    totalAgentMessages: number;
    activeAgents: number;
    averageFirstResponseMinutes: number;
  };
  agents: AnalyticsAgentPerformance[];
}
