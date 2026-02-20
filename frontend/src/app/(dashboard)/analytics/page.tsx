"use client";

import { format, subDays } from "date-fns";
import { useState } from "react";
import { AgentPerformanceTable } from "@/components/analytics/AgentPerformanceTable";
import { AiPerformanceCard } from "@/components/analytics/AiPerformanceCard";
import { ChannelPieChart } from "@/components/analytics/ChannelPieChart";
import { DateRangePicker } from "@/components/analytics/DateRangePicker";
import { MessageChart } from "@/components/analytics/MessageChart";
import { ResponseTimeChart } from "@/components/analytics/ResponseTimeChart";
import { StatsCards } from "@/components/analytics/StatsCards";
import { EmptyState } from "@/components/shared/EmptyState";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import {
  useAnalyticsAgents,
  useAnalyticsAi,
  useAnalyticsChannels,
  useAnalyticsOverview,
} from "@/hooks/useAnalytics";
import { useAuthStore } from "@/stores/authStore";

const toInputDate = (date: Date): string => format(date, "yyyy-MM-dd");

const resolveErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }

  return "Unable to load analytics data.";
};

export default function AnalyticsPage() {
  const organizationId = useAuthStore((state) => state.organizationId);
  const [from, setFrom] = useState<string>(() => toInputDate(subDays(new Date(), 29)));
  const [to, setTo] = useState<string>(() => toInputDate(new Date()));

  const range = { from, to };

  const overviewQuery = useAnalyticsOverview(organizationId ?? undefined, range);
  const channelsQuery = useAnalyticsChannels(organizationId ?? undefined, range);
  const aiQuery = useAnalyticsAi(organizationId ?? undefined, range);
  const agentsQuery = useAnalyticsAgents(organizationId ?? undefined, range);

  const error =
    overviewQuery.error ?? channelsQuery.error ?? aiQuery.error ?? agentsQuery.error ?? undefined;

  if (!organizationId) {
    return (
      <EmptyState
        title="No organization selected"
        description="Sign in again to load your analytics workspace."
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Analytics"
        description="Review trends by channel, AI performance, and agent productivity."
        actions={<DateRangePicker from={from} to={to} onFromChange={setFrom} onToChange={setTo} />}
      />

      {error ? (
        <Card className="border-red-200">
          <CardContent className="p-4 text-sm text-red-600 dark:text-red-300">
            {resolveErrorMessage(error)}
          </CardContent>
        </Card>
      ) : null}

      <StatsCards overview={overviewQuery.data} isLoading={overviewQuery.isLoading} />

      <div className="grid gap-6 xl:grid-cols-2">
        <MessageChart data={overviewQuery.data?.messagesTrend} isLoading={overviewQuery.isLoading} />
        <ResponseTimeChart
          data={overviewQuery.data?.responseTimeTrend}
          isLoading={overviewQuery.isLoading}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <AgentPerformanceTable agents={agentsQuery.data?.agents} isLoading={agentsQuery.isLoading} />
        </div>
        <div className="space-y-6">
          <ChannelPieChart
            channels={channelsQuery.data?.channels ?? overviewQuery.data?.channels}
            isLoading={channelsQuery.isLoading && !overviewQuery.data}
          />
          <AiPerformanceCard analytics={aiQuery.data} isLoading={aiQuery.isLoading} />
        </div>
      </div>
    </div>
  );
}
