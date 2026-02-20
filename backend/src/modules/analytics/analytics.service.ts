import { ChannelType, Prisma, Role } from "@prisma/client";
import { logger } from "../../config/logger";
import { prisma } from "../../config/prisma";
import { redis } from "../../config/redis";
import { BadRequestError, ForbiddenError } from "../../utils/errors";
import type { AnalyticsRangeQuery } from "./analytics.validators";

const CACHE_TTL_SECONDS = 60 * 5;
const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const CHANNEL_TYPES: readonly ChannelType[] = [
  "FACEBOOK",
  "INSTAGRAM",
  "WHATSAPP",
  "WEBCHAT",
  "TELEGRAM",
  "EMAIL",
] as const;

interface DateRange {
  from: Date;
  to: Date;
  fromIso: string;
  toIso: string;
}

interface AnalyticsDateRange {
  from: string;
  to: string;
}

interface AnalyticsChannelBreakdown {
  channelType: ChannelType;
  messageCount: number;
  percentage: number;
}

interface AnalyticsMessageTrendPoint {
  date: string;
  messages: number;
  aiReplies: number;
}

interface AnalyticsResponseTimeTrendPoint {
  date: string;
  averageFirstResponseMinutes: number;
}

interface AnalyticsAiTrendPoint {
  date: string;
  aiReplies: number;
  averageConfidence: number;
}

interface AnalyticsOverview {
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

interface AnalyticsChannels {
  range: AnalyticsDateRange;
  totalMessagesInRange: number;
  channels: AnalyticsChannelBreakdown[];
  topChannel?: ChannelType;
}

interface AnalyticsAi {
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

interface AnalyticsAgentPerformance {
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

interface AnalyticsAgents {
  range: AnalyticsDateRange;
  summary: {
    totalAgentMessages: number;
    activeAgents: number;
    averageFirstResponseMinutes: number;
  };
  agents: AnalyticsAgentPerformance[];
}

interface ChannelBreakdownRow {
  channelType: ChannelType;
  messageCount: number | bigint | string;
}

interface MessageTrendRow {
  day: Date | string;
  messageCount: number | bigint | string;
  aiMessageCount: number | bigint | string;
}

interface ResponseStatsRow {
  averageMinutes: number | null;
  conversationCount: number | bigint | string;
}

interface ResponseTrendRow {
  day: Date | string;
  averageMinutes: number | null;
}

interface AiTrendRow {
  day: Date | string;
  aiReplies: number | bigint | string;
  averageConfidence: number | null;
}

interface DistinctConversationCountRow {
  conversationCount: number | bigint | string;
}

interface AgentMessageStatsRow {
  userId: string;
  messageCount: number | bigint | string;
  conversationCount: number | bigint | string;
}

interface AgentResponseStatsRow {
  userId: string;
  averageMinutes: number | null;
  conversationCount: number | bigint | string;
}

const toNumber = (value: number | bigint | string | null | undefined): number => {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === "bigint") {
    return Number(value);
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
};

const roundTo = (value: number, digits = 2): number => {
  if (!Number.isFinite(value)) {
    return 0;
  }

  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
};

const startOfUtcDay = (date: Date): Date =>
  new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0));

const addUtcDays = (date: Date, days: number): Date => {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
};

const toDateKey = (date: Date): string => date.toISOString().slice(0, 10);

const coerceDate = (value: Date | string): Date => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new BadRequestError("Invalid date value");
  }

  return date;
};

export class AnalyticsService {
  private async requireMembership(userId: string, orgId: string): Promise<void> {
    const membership = await prisma.orgMember.findUnique({
      where: {
        userId_organizationId: {
          userId,
          organizationId: orgId,
        },
      },
      select: { id: true },
    });

    if (!membership) {
      throw new ForbiddenError("You do not have access to this organization");
    }
  }

  private parseDateInput(input: string, boundary: "start" | "end"): Date {
    const trimmed = input.trim();
    if (DATE_ONLY_PATTERN.test(trimmed)) {
      const suffix = boundary === "start" ? "T00:00:00.000Z" : "T23:59:59.999Z";
      return new Date(`${trimmed}${suffix}`);
    }

    const parsed = new Date(trimmed);
    if (Number.isNaN(parsed.getTime())) {
      throw new BadRequestError("Invalid date range");
    }

    return parsed;
  }

  private resolveDateRange(query: AnalyticsRangeQuery): DateRange {
    const now = new Date();
    const parsedFrom = query.from ? this.parseDateInput(query.from, "start") : undefined;
    const parsedTo = query.to ? this.parseDateInput(query.to, "end") : undefined;
    const to = parsedTo ?? now;
    const from = parsedFrom ?? startOfUtcDay(addUtcDays(to, -29));

    if (from.getTime() > to.getTime()) {
      throw new BadRequestError("'from' must be before or equal to 'to'");
    }

    return {
      from,
      to,
      fromIso: from.toISOString(),
      toIso: to.toISOString(),
    };
  }

  private toRangePayload(range: DateRange): AnalyticsDateRange {
    return {
      from: range.fromIso,
      to: range.toIso,
    };
  }

  private buildCacheKey(orgId: string, scope: string, range: DateRange): string {
    return `analytics:${orgId}:${scope}:${range.fromIso}:${range.toIso}`;
  }

  private async withCache<T>(
    key: string,
    builder: () => Promise<T>,
    context: { orgId: string; scope: string },
  ): Promise<T> {
    try {
      const cached = await redis.get<unknown>(key);
      if (typeof cached === "string") {
        return JSON.parse(cached) as T;
      }

      if (cached !== null && cached !== undefined && typeof cached === "object") {
        return cached as T;
      }
    } catch (error) {
      logger.warn("Analytics cache read failed", {
        ...context,
        cacheKey: key,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }

    const value = await builder();

    try {
      await redis.set(key, JSON.stringify(value), { ex: CACHE_TTL_SECONDS });
    } catch (error) {
      logger.warn("Analytics cache write failed", {
        ...context,
        cacheKey: key,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }

    return value;
  }

  private getDateKeys(range: DateRange): string[] {
    const keys: string[] = [];
    let cursor = startOfUtcDay(range.from);
    const end = startOfUtcDay(range.to);

    while (cursor.getTime() <= end.getTime()) {
      keys.push(toDateKey(cursor));
      cursor = addUtcDays(cursor, 1);
    }

    return keys;
  }

  private normalizeChannelBreakdown(
    rows: ChannelBreakdownRow[],
    totalMessagesInRange: number,
  ): AnalyticsChannelBreakdown[] {
    const messageCounts = new Map<ChannelType, number>();

    for (const row of rows) {
      messageCounts.set(row.channelType, toNumber(row.messageCount));
    }

    return CHANNEL_TYPES.map((channelType) => {
      const messageCount = messageCounts.get(channelType) ?? 0;
      const percentage = totalMessagesInRange > 0 ? roundTo(messageCount / totalMessagesInRange, 4) : 0;

      return {
        channelType,
        messageCount,
        percentage,
      };
    }).sort((a, b) => b.messageCount - a.messageCount);
  }

  private buildMessageTrend(range: DateRange, rows: MessageTrendRow[]): AnalyticsMessageTrendPoint[] {
    const byDay = new Map<string, { messages: number; aiReplies: number }>();

    for (const row of rows) {
      const key = toDateKey(coerceDate(row.day));
      byDay.set(key, {
        messages: toNumber(row.messageCount),
        aiReplies: toNumber(row.aiMessageCount),
      });
    }

    return this.getDateKeys(range).map((date) => {
      const point = byDay.get(date);
      return {
        date,
        messages: point?.messages ?? 0,
        aiReplies: point?.aiReplies ?? 0,
      };
    });
  }

  private buildResponseTimeTrend(
    range: DateRange,
    rows: ResponseTrendRow[],
  ): AnalyticsResponseTimeTrendPoint[] {
    const byDay = new Map<string, number>();

    for (const row of rows) {
      const key = toDateKey(coerceDate(row.day));
      byDay.set(key, roundTo(toNumber(row.averageMinutes), 2));
    }

    return this.getDateKeys(range).map((date) => ({
      date,
      averageFirstResponseMinutes: byDay.get(date) ?? 0,
    }));
  }

  private buildAiTrend(range: DateRange, rows: AiTrendRow[]): AnalyticsAiTrendPoint[] {
    const byDay = new Map<string, { aiReplies: number; averageConfidence: number }>();

    for (const row of rows) {
      const key = toDateKey(coerceDate(row.day));
      byDay.set(key, {
        aiReplies: toNumber(row.aiReplies),
        averageConfidence: roundTo(toNumber(row.averageConfidence), 4),
      });
    }

    return this.getDateKeys(range).map((date) => {
      const point = byDay.get(date);
      return {
        date,
        aiReplies: point?.aiReplies ?? 0,
        averageConfidence: point?.averageConfidence ?? 0,
      };
    });
  }

  private async queryChannelBreakdown(orgId: string, range: DateRange): Promise<ChannelBreakdownRow[]> {
    return prisma.$queryRaw<ChannelBreakdownRow[]>(Prisma.sql`
      SELECT
        ch."type" AS "channelType",
        COUNT(*)::bigint AS "messageCount"
      FROM "messages" m
      INNER JOIN "conversations" c ON c."id" = m."conversationId"
      INNER JOIN "channels" ch ON ch."id" = c."channelId"
      WHERE c."organizationId" = ${orgId}
        AND m."createdAt" >= ${range.from}
        AND m."createdAt" <= ${range.to}
      GROUP BY ch."type"
    `);
  }

  private async queryMessageTrend(orgId: string, range: DateRange): Promise<MessageTrendRow[]> {
    return prisma.$queryRaw<MessageTrendRow[]>(Prisma.sql`
      SELECT
        date_trunc('day', m."createdAt") AS "day",
        COUNT(*)::bigint AS "messageCount",
        SUM(CASE WHEN m."isAiGenerated" THEN 1 ELSE 0 END)::bigint AS "aiMessageCount"
      FROM "messages" m
      INNER JOIN "conversations" c ON c."id" = m."conversationId"
      WHERE c."organizationId" = ${orgId}
        AND m."createdAt" >= ${range.from}
        AND m."createdAt" <= ${range.to}
      GROUP BY date_trunc('day', m."createdAt")
      ORDER BY date_trunc('day', m."createdAt") ASC
    `);
  }

  private async queryResponseStats(orgId: string, range: DateRange): Promise<ResponseStatsRow | undefined> {
    const rows = await prisma.$queryRaw<ResponseStatsRow[]>(Prisma.sql`
      WITH first_inbound AS (
        SELECT
          c."id" AS conversation_id,
          MIN(m."createdAt") AS first_inbound_at
        FROM "conversations" c
        INNER JOIN "messages" m ON m."conversationId" = c."id"
        WHERE c."organizationId" = ${orgId}
          AND m."direction" = 'INBOUND'
          AND m."createdAt" >= ${range.from}
          AND m."createdAt" <= ${range.to}
        GROUP BY c."id"
      ),
      first_outbound AS (
        SELECT
          fi.conversation_id,
          MIN(m."createdAt") AS first_outbound_at
        FROM first_inbound fi
        INNER JOIN "messages" m ON m."conversationId" = fi.conversation_id
        WHERE m."direction" = 'OUTBOUND'
          AND m."createdAt" > fi.first_inbound_at
        GROUP BY fi.conversation_id
      )
      SELECT
        AVG(EXTRACT(EPOCH FROM (fo.first_outbound_at - fi.first_inbound_at)) / 60.0)::float8 AS "averageMinutes",
        COUNT(*)::bigint AS "conversationCount"
      FROM first_inbound fi
      INNER JOIN first_outbound fo ON fo.conversation_id = fi.conversation_id
    `);

    return rows[0];
  }

  private async queryResponseTrend(orgId: string, range: DateRange): Promise<ResponseTrendRow[]> {
    return prisma.$queryRaw<ResponseTrendRow[]>(Prisma.sql`
      WITH first_inbound AS (
        SELECT
          c."id" AS conversation_id,
          MIN(m."createdAt") AS first_inbound_at
        FROM "conversations" c
        INNER JOIN "messages" m ON m."conversationId" = c."id"
        WHERE c."organizationId" = ${orgId}
          AND m."direction" = 'INBOUND'
          AND m."createdAt" >= ${range.from}
          AND m."createdAt" <= ${range.to}
        GROUP BY c."id"
      ),
      first_outbound AS (
        SELECT
          fi.conversation_id,
          MIN(m."createdAt") AS first_outbound_at
        FROM first_inbound fi
        INNER JOIN "messages" m ON m."conversationId" = fi.conversation_id
        WHERE m."direction" = 'OUTBOUND'
          AND m."createdAt" > fi.first_inbound_at
        GROUP BY fi.conversation_id
      )
      SELECT
        date_trunc('day', fi.first_inbound_at) AS "day",
        AVG(EXTRACT(EPOCH FROM (fo.first_outbound_at - fi.first_inbound_at)) / 60.0)::float8 AS "averageMinutes"
      FROM first_inbound fi
      INNER JOIN first_outbound fo ON fo.conversation_id = fi.conversation_id
      GROUP BY date_trunc('day', fi.first_inbound_at)
      ORDER BY date_trunc('day', fi.first_inbound_at) ASC
    `);
  }

  private async queryAiResponseStats(orgId: string, range: DateRange): Promise<ResponseStatsRow | undefined> {
    const rows = await prisma.$queryRaw<ResponseStatsRow[]>(Prisma.sql`
      WITH first_inbound AS (
        SELECT
          c."id" AS conversation_id,
          MIN(m."createdAt") AS first_inbound_at
        FROM "conversations" c
        INNER JOIN "messages" m ON m."conversationId" = c."id"
        WHERE c."organizationId" = ${orgId}
          AND m."direction" = 'INBOUND'
          AND m."createdAt" >= ${range.from}
          AND m."createdAt" <= ${range.to}
        GROUP BY c."id"
      ),
      first_ai_outbound AS (
        SELECT
          fi.conversation_id,
          MIN(m."createdAt") AS first_outbound_at
        FROM first_inbound fi
        INNER JOIN "messages" m ON m."conversationId" = fi.conversation_id
        WHERE m."direction" = 'OUTBOUND'
          AND m."isAiGenerated" = true
          AND m."createdAt" > fi.first_inbound_at
        GROUP BY fi.conversation_id
      )
      SELECT
        AVG(EXTRACT(EPOCH FROM (fao.first_outbound_at - fi.first_inbound_at)) / 60.0)::float8 AS "averageMinutes",
        COUNT(*)::bigint AS "conversationCount"
      FROM first_inbound fi
      INNER JOIN first_ai_outbound fao ON fao.conversation_id = fi.conversation_id
    `);

    return rows[0];
  }

  private async queryAiTrend(orgId: string, range: DateRange): Promise<AiTrendRow[]> {
    return prisma.$queryRaw<AiTrendRow[]>(Prisma.sql`
      SELECT
        date_trunc('day', m."createdAt") AS "day",
        COUNT(*)::bigint AS "aiReplies",
        AVG(m."aiConfidence")::float8 AS "averageConfidence"
      FROM "messages" m
      INNER JOIN "conversations" c ON c."id" = m."conversationId"
      WHERE c."organizationId" = ${orgId}
        AND m."isAiGenerated" = true
        AND m."createdAt" >= ${range.from}
        AND m."createdAt" <= ${range.to}
      GROUP BY date_trunc('day', m."createdAt")
      ORDER BY date_trunc('day', m."createdAt") ASC
    `);
  }

  private async queryAgentMessageStats(orgId: string, range: DateRange): Promise<AgentMessageStatsRow[]> {
    return prisma.$queryRaw<AgentMessageStatsRow[]>(Prisma.sql`
      SELECT
        m."userId" AS "userId",
        COUNT(*)::bigint AS "messageCount",
        COUNT(DISTINCT m."conversationId")::bigint AS "conversationCount"
      FROM "messages" m
      INNER JOIN "conversations" c ON c."id" = m."conversationId"
      WHERE c."organizationId" = ${orgId}
        AND m."direction" = 'OUTBOUND'
        AND m."sender" = 'AGENT'
        AND m."userId" IS NOT NULL
        AND m."createdAt" >= ${range.from}
        AND m."createdAt" <= ${range.to}
      GROUP BY m."userId"
    `);
  }

  private async queryAgentResponseStats(orgId: string, range: DateRange): Promise<AgentResponseStatsRow[]> {
    return prisma.$queryRaw<AgentResponseStatsRow[]>(Prisma.sql`
      WITH first_inbound AS (
        SELECT
          c."id" AS conversation_id,
          MIN(m."createdAt") AS first_inbound_at
        FROM "conversations" c
        INNER JOIN "messages" m ON m."conversationId" = c."id"
        WHERE c."organizationId" = ${orgId}
          AND m."direction" = 'INBOUND'
          AND m."createdAt" >= ${range.from}
          AND m."createdAt" <= ${range.to}
        GROUP BY c."id"
      ),
      first_agent_reply AS (
        SELECT
          fi.conversation_id,
          m."userId" AS user_id,
          MIN(m."createdAt") AS first_reply_at
        FROM first_inbound fi
        INNER JOIN "messages" m ON m."conversationId" = fi.conversation_id
        WHERE m."direction" = 'OUTBOUND'
          AND m."sender" = 'AGENT'
          AND m."userId" IS NOT NULL
          AND m."createdAt" > fi.first_inbound_at
        GROUP BY fi.conversation_id, m."userId"
      ),
      ranked_replies AS (
        SELECT
          far.conversation_id,
          far.user_id,
          fi.first_inbound_at,
          far.first_reply_at,
          ROW_NUMBER() OVER (PARTITION BY far.conversation_id ORDER BY far.first_reply_at ASC) AS reply_rank
        FROM first_agent_reply far
        INNER JOIN first_inbound fi ON fi.conversation_id = far.conversation_id
      )
      SELECT
        rr.user_id AS "userId",
        AVG(EXTRACT(EPOCH FROM (rr.first_reply_at - rr.first_inbound_at)) / 60.0)::float8 AS "averageMinutes",
        COUNT(*)::bigint AS "conversationCount"
      FROM ranked_replies rr
      WHERE rr.reply_rank = 1
      GROUP BY rr.user_id
    `);
  }

  async getOverview(userId: string, orgId: string, query: AnalyticsRangeQuery): Promise<AnalyticsOverview> {
    await this.requireMembership(userId, orgId);
    const range = this.resolveDateRange(query);
    const inRange = { gte: range.from, lte: range.to };
    const cacheKey = this.buildCacheKey(orgId, "overview", range);

    return this.withCache(
      cacheKey,
      async () => {
        const now = new Date();
        const todayStart = startOfUtcDay(now);
        const weekStart = startOfUtcDay(addUtcDays(now, -6));
        const monthStart = startOfUtcDay(addUtcDays(now, -29));

        const [
          messagesToday,
          messagesWeek,
          messagesMonth,
          messagesAllTime,
          messagesInRange,
          aiRepliesInRange,
          activeConversations,
          newContactsInRange,
          totalConversationsInRange,
          resolvedConversationsInRange,
          channelRows,
          messageTrendRows,
          responseStats,
          responseTrendRows,
        ] = await Promise.all([
          prisma.message.count({
            where: {
              conversation: { organizationId: orgId },
              createdAt: { gte: todayStart },
            },
          }),
          prisma.message.count({
            where: {
              conversation: { organizationId: orgId },
              createdAt: { gte: weekStart },
            },
          }),
          prisma.message.count({
            where: {
              conversation: { organizationId: orgId },
              createdAt: { gte: monthStart },
            },
          }),
          prisma.message.count({
            where: {
              conversation: { organizationId: orgId },
            },
          }),
          prisma.message.count({
            where: {
              conversation: { organizationId: orgId },
              createdAt: inRange,
            },
          }),
          prisma.message.count({
            where: {
              conversation: { organizationId: orgId },
              createdAt: inRange,
              isAiGenerated: true,
            },
          }),
          prisma.conversation.count({
            where: {
              organizationId: orgId,
              status: {
                in: ["OPEN", "PENDING"],
              },
            },
          }),
          prisma.contact.count({
            where: {
              organizationId: orgId,
              createdAt: inRange,
            },
          }),
          prisma.conversation.count({
            where: {
              organizationId: orgId,
              createdAt: inRange,
            },
          }),
          prisma.conversation.count({
            where: {
              organizationId: orgId,
              createdAt: inRange,
              status: {
                in: ["RESOLVED", "CLOSED"],
              },
            },
          }),
          this.queryChannelBreakdown(orgId, range),
          this.queryMessageTrend(orgId, range),
          this.queryResponseStats(orgId, range),
          this.queryResponseTrend(orgId, range),
        ]);

        const aiReplyRate = messagesInRange > 0 ? roundTo(aiRepliesInRange / messagesInRange, 4) : 0;
        const resolutionRate =
          totalConversationsInRange > 0
            ? roundTo(resolvedConversationsInRange / totalConversationsInRange, 4)
            : 0;

        const averageFirstResponseMinutes = roundTo(toNumber(responseStats?.averageMinutes), 2);
        const respondedConversations = toNumber(responseStats?.conversationCount);

        return {
          range: this.toRangePayload(range),
          totals: {
            messagesToday,
            messagesWeek,
            messagesMonth,
            messagesAllTime,
            messagesInRange,
            aiRepliesInRange,
            aiReplyRate,
            activeConversations,
            newContactsInRange,
            resolutionRate,
            averageFirstResponseMinutes,
            respondedConversations,
          },
          channels: this.normalizeChannelBreakdown(channelRows, messagesInRange),
          messagesTrend: this.buildMessageTrend(range, messageTrendRows),
          responseTimeTrend: this.buildResponseTimeTrend(range, responseTrendRows),
        };
      },
      { orgId, scope: "overview" },
    );
  }

  async getChannels(userId: string, orgId: string, query: AnalyticsRangeQuery): Promise<AnalyticsChannels> {
    await this.requireMembership(userId, orgId);
    const range = this.resolveDateRange(query);
    const cacheKey = this.buildCacheKey(orgId, "channels", range);

    return this.withCache(
      cacheKey,
      async () => {
        const totalMessagesInRange = await prisma.message.count({
          where: {
            conversation: { organizationId: orgId },
            createdAt: {
              gte: range.from,
              lte: range.to,
            },
          },
        });

        const rows = await this.queryChannelBreakdown(orgId, range);
        const channels = this.normalizeChannelBreakdown(rows, totalMessagesInRange);
        const topChannel = channels.find((item) => item.messageCount > 0)?.channelType;

        const payload: AnalyticsChannels = {
          range: this.toRangePayload(range),
          totalMessagesInRange,
          channels,
        };

        if (topChannel) {
          payload.topChannel = topChannel;
        }

        return payload;
      },
      { orgId, scope: "channels" },
    );
  }

  async getAi(userId: string, orgId: string, query: AnalyticsRangeQuery): Promise<AnalyticsAi> {
    await this.requireMembership(userId, orgId);
    const range = this.resolveDateRange(query);
    const cacheKey = this.buildCacheKey(orgId, "ai", range);

    return this.withCache(
      cacheKey,
      async () => {
        const inRange = {
          gte: range.from,
          lte: range.to,
        };

        const [totalMessagesInRange, aiAggregate, aiConversationRows, aiResponseStats, aiTrendRows] =
          await Promise.all([
            prisma.message.count({
              where: {
                conversation: { organizationId: orgId },
                createdAt: inRange,
              },
            }),
            prisma.message.aggregate({
              where: {
                conversation: { organizationId: orgId },
                createdAt: inRange,
                isAiGenerated: true,
              },
              _count: {
                _all: true,
              },
              _avg: {
                aiConfidence: true,
              },
            }),
            prisma.$queryRaw<DistinctConversationCountRow[]>(Prisma.sql`
              SELECT COUNT(DISTINCT m."conversationId")::bigint AS "conversationCount"
              FROM "messages" m
              INNER JOIN "conversations" c ON c."id" = m."conversationId"
              WHERE c."organizationId" = ${orgId}
                AND m."isAiGenerated" = true
                AND m."createdAt" >= ${range.from}
                AND m."createdAt" <= ${range.to}
            `),
            this.queryAiResponseStats(orgId, range),
            this.queryAiTrend(orgId, range),
          ]);

        const aiRepliesInRange = aiAggregate._count._all;
        const aiReplyRate = totalMessagesInRange > 0 ? roundTo(aiRepliesInRange / totalMessagesInRange, 4) : 0;
        const averageConfidence = roundTo(aiAggregate._avg.aiConfidence ?? 0, 4);
        const averageAiResponseMinutes = roundTo(toNumber(aiResponseStats?.averageMinutes), 2);
        const aiResponseConversations = toNumber(aiResponseStats?.conversationCount);
        const aiHandledConversations = toNumber(aiConversationRows[0]?.conversationCount);

        return {
          range: this.toRangePayload(range),
          totalMessagesInRange,
          aiRepliesInRange,
          aiReplyRate,
          averageConfidence,
          averageAiResponseMinutes,
          aiHandledConversations,
          aiResponseConversations,
          aiTrend: this.buildAiTrend(range, aiTrendRows),
        };
      },
      { orgId, scope: "ai" },
    );
  }

  async getAgents(userId: string, orgId: string, query: AnalyticsRangeQuery): Promise<AnalyticsAgents> {
    await this.requireMembership(userId, orgId);
    const range = this.resolveDateRange(query);
    const cacheKey = this.buildCacheKey(orgId, "agents", range);

    return this.withCache(
      cacheKey,
      async () => {
        const [memberships, messageRows, responseRows] = await Promise.all([
          prisma.orgMember.findMany({
            where: {
              organizationId: orgId,
              role: {
                in: ["OWNER", "ADMIN", "AGENT"],
              },
            },
            include: {
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                  avatar: true,
                },
              },
            },
            orderBy: [{ role: "asc" }, { createdAt: "asc" }],
          }),
          this.queryAgentMessageStats(orgId, range),
          this.queryAgentResponseStats(orgId, range),
        ]);

        const messageMap = new Map<string, { messageCount: number; conversationCount: number }>();
        for (const row of messageRows) {
          messageMap.set(row.userId, {
            messageCount: toNumber(row.messageCount),
            conversationCount: toNumber(row.conversationCount),
          });
        }

        const responseMap = new Map<string, { averageMinutes: number; conversationCount: number }>();
        for (const row of responseRows) {
          responseMap.set(row.userId, {
            averageMinutes: roundTo(toNumber(row.averageMinutes), 2),
            conversationCount: toNumber(row.conversationCount),
          });
        }

        const agents = memberships
          .map<AnalyticsAgentPerformance>((membership) => {
            const messageStats = messageMap.get(membership.userId);
            const responseStats = responseMap.get(membership.userId);

            return {
              userId: membership.userId,
              firstName: membership.user.firstName,
              lastName: membership.user.lastName,
              email: membership.user.email,
              ...(membership.user.avatar ? { avatar: membership.user.avatar } : {}),
              role: membership.role,
              messagesHandled: messageStats?.messageCount ?? 0,
              conversationsHandled: messageStats?.conversationCount ?? 0,
              averageFirstResponseMinutes: responseStats?.averageMinutes ?? 0,
            };
          })
          .sort((a, b) => {
            if (a.messagesHandled !== b.messagesHandled) {
              return b.messagesHandled - a.messagesHandled;
            }

            return `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`);
          });

        const totalAgentMessages = agents.reduce((sum, agent) => sum + agent.messagesHandled, 0);
        const activeAgents = agents.filter((agent) => agent.messagesHandled > 0).length;
        const weightedResponseTotal = responseRows.reduce(
          (sum, row) => sum + toNumber(row.averageMinutes) * toNumber(row.conversationCount),
          0,
        );
        const totalRespondedConversations = responseRows.reduce(
          (sum, row) => sum + toNumber(row.conversationCount),
          0,
        );
        const averageFirstResponseMinutes =
          totalRespondedConversations > 0
            ? roundTo(weightedResponseTotal / totalRespondedConversations, 2)
            : 0;

        return {
          range: this.toRangePayload(range),
          summary: {
            totalAgentMessages,
            activeAgents,
            averageFirstResponseMinutes,
          },
          agents,
        };
      },
      { orgId, scope: "agents" },
    );
  }
}

export const analyticsService = new AnalyticsService();

