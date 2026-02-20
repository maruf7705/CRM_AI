"use client";

import { Pie, PieChart, ResponsiveContainer, Tooltip, Cell } from "recharts";
import type { AnalyticsChannelBreakdown, ChannelType } from "@/types";
import { formatPercent } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface ChannelPieChartProps {
  channels: AnalyticsChannelBreakdown[] | undefined;
  isLoading?: boolean;
}

const channelColorMap: Record<ChannelType, string> = {
  FACEBOOK: "#3b82f6",
  INSTAGRAM: "#ec4899",
  WHATSAPP: "#22c55e",
  WEBCHAT: "#14b8a6",
  TELEGRAM: "#0ea5e9",
  EMAIL: "#f59e0b",
};

const channelLabelMap: Record<ChannelType, string> = {
  FACEBOOK: "Facebook",
  INSTAGRAM: "Instagram",
  WHATSAPP: "WhatsApp",
  WEBCHAT: "Webchat",
  TELEGRAM: "Telegram",
  EMAIL: "Email",
};

export const ChannelPieChart = ({ channels = [], isLoading = false }: ChannelPieChartProps) => {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Channel Mix</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  const chartData = channels
    .filter((item) => item.messageCount > 0)
    .map((item) => ({
      name: channelLabelMap[item.channelType],
      value: item.messageCount,
      percent: item.percentage,
      color: channelColorMap[item.channelType],
    }));

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Channel Mix</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">No channel activity in this range.</CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Channel Mix</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="h-60">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={chartData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85}>
                {chartData.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number, _name: string, payload) => [value, payload?.payload.name]} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="space-y-2">
          {chartData.map((entry) => (
            <div key={entry.name} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                <span>{entry.name}</span>
              </div>
              <span className="text-muted-foreground">{formatPercent(entry.percent)}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
