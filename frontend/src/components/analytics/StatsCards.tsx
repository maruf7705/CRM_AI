import type { AnalyticsOverview } from "@/types";
import { formatNumber, formatPercent } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface StatsCardsProps {
  overview: AnalyticsOverview | undefined;
  isLoading?: boolean;
}

const formatMinutes = (value: number): string => `${formatNumber(value)}m`;

export const StatsCards = ({ overview, isLoading = false }: StatsCardsProps) => {
  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((index) => (
          <Card key={index}>
            <CardHeader>
              <Skeleton className="h-4 w-20" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-28" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const stats = [
    {
      label: "Messages",
      value: formatNumber(overview?.totals.messagesInRange ?? 0),
      hint: `${formatNumber(overview?.totals.messagesToday ?? 0)} today`,
    },
    {
      label: "AI Replies",
      value: formatPercent(overview?.totals.aiReplyRate ?? 0),
      hint: `${formatNumber(overview?.totals.aiRepliesInRange ?? 0)} in range`,
    },
    {
      label: "Avg Response",
      value: formatMinutes(overview?.totals.averageFirstResponseMinutes ?? 0),
      hint: `${formatNumber(overview?.totals.respondedConversations ?? 0)} replied convos`,
    },
    {
      label: "Resolution Rate",
      value: formatPercent(overview?.totals.resolutionRate ?? 0),
      hint: `${formatNumber(overview?.totals.activeConversations ?? 0)} active`,
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {stats.map((stat) => (
        <Card key={stat.label}>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">{stat.label}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <p className="text-2xl font-semibold">{stat.value}</p>
            <p className="text-xs text-muted-foreground">{stat.hint}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
