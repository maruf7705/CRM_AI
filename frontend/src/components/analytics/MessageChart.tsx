"use client";

import { format, parseISO } from "date-fns";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { AnalyticsMessageTrendPoint } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface MessageChartProps {
  data: AnalyticsMessageTrendPoint[] | undefined;
  isLoading?: boolean;
}

const formatDateLabel = (value: string): string => format(parseISO(value), "MMM d");

export const MessageChart = ({ data = [], isLoading = false }: MessageChartProps) => {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Messages Over Time</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Messages Over Time</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">No message activity in this range.</CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Messages Over Time</CardTitle>
      </CardHeader>
      <CardContent className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <XAxis dataKey="date" tickFormatter={formatDateLabel} />
            <YAxis />
            <Tooltip
              formatter={(value: number, name: string) => [value, name === "aiReplies" ? "AI replies" : "Messages"]}
              labelFormatter={(label: string) => formatDateLabel(label)}
            />
            <Line type="monotone" dataKey="messages" stroke="#6366f1" strokeWidth={3} dot={false} />
            <Line type="monotone" dataKey="aiReplies" stroke="#8b5cf6" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
