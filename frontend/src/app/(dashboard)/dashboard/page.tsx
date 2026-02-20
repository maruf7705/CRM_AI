"use client";

import { format, subDays } from "date-fns";
import { useState } from "react";
import { DateRangePicker } from "@/components/analytics/DateRangePicker";
import { StatsCards } from "@/components/analytics/StatsCards";
import { MessageChart } from "@/components/analytics/MessageChart";
import { ChannelPieChart } from "@/components/analytics/ChannelPieChart";
import { AiPerformanceCard } from "@/components/analytics/AiPerformanceCard";
import { ResponseTimeChart } from "@/components/analytics/ResponseTimeChart";
import { EmptyState } from "@/components/shared/EmptyState";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { useAnalyticsAi, useAnalyticsChannels, useAnalyticsOverview } from "@/hooks/useAnalytics";
import { useAuthStore } from "@/stores/authStore";

const toInputDate = (date: Date): string => format(date, "yyyy-MM-dd");

const resolveErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }

  return "Unable to load analytics data.";
};

export default function DashboardPage() {
  const organizationId = useAuthStore((state) => state.organizationId);
  const [from, setFrom] = useState<string>(() => toInputDate(subDays(new Date(), 6)));
  const [to, setTo] = useState<string>(() => toInputDate(new Date()));

  const range = { from, to };

  const overviewQuery = useAnalyticsOverview(organizationId ?? undefined, range);
  const channelsQuery = useAnalyticsChannels(organizationId ?? undefined, range);
  const aiQuery = useAnalyticsAi(organizationId ?? undefined, range);

  const hasError = Boolean(overviewQuery.error || channelsQuery.error || aiQuery.error);

  if (!organizationId) {
    return (
      <EmptyState
        title="No organization selected"
        description="Sign in again to load your dashboard analytics."
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Monitor conversations, performance, and AI activity."
        actions={<DateRangePicker from={from} to={to} onFromChange={setFrom} onToChange={setTo} />}
      />

      {hasError ? (
        <Card className="border-red-200">
          <CardContent className="p-4 text-sm text-red-600 dark:text-red-300">
            {resolveErrorMessage(overviewQuery.error ?? channelsQuery.error ?? aiQuery.error)}
          </CardContent>
        </Card>
      ) : null}

      <StatsCards overview={overviewQuery.data} isLoading={overviewQuery.isLoading} />

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <MessageChart data={overviewQuery.data?.messagesTrend} isLoading={overviewQuery.isLoading} />
        </div>
        <ChannelPieChart
          channels={channelsQuery.data?.channels ?? overviewQuery.data?.channels}
          isLoading={channelsQuery.isLoading && !overviewQuery.data}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <ResponseTimeChart
            data={overviewQuery.data?.responseTimeTrend}
            isLoading={overviewQuery.isLoading}
          />
        </div>
        <AiPerformanceCard analytics={aiQuery.data} isLoading={aiQuery.isLoading} />
      </div>
    </div>
  );
}
