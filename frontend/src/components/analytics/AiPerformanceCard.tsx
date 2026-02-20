import type { AnalyticsAi } from "@/types";
import { formatNumber, formatPercent } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface AiPerformanceCardProps {
  analytics: AnalyticsAi | undefined;
  isLoading?: boolean;
}

const formatMinutes = (value: number): string => `${formatNumber(value)}m`;

export const AiPerformanceCard = ({ analytics, isLoading = false }: AiPerformanceCardProps) => {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>AI Performance</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-4 w-3/4" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>AI Performance</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm text-muted-foreground">
        <p>AI replies: {formatNumber(analytics?.aiRepliesInRange ?? 0)}</p>
        <p>AI reply rate: {formatPercent(analytics?.aiReplyRate ?? 0)}</p>
        <p>Average confidence: {formatNumber(analytics?.averageConfidence ?? 0)}</p>
        <p>Average AI response: {formatMinutes(analytics?.averageAiResponseMinutes ?? 0)}</p>
        <p>AI-handled conversations: {formatNumber(analytics?.aiHandledConversations ?? 0)}</p>
      </CardContent>
    </Card>
  );
};
