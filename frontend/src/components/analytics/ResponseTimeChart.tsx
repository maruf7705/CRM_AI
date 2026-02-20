"use client";

import { format, parseISO } from "date-fns";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { AnalyticsResponseTimeTrendPoint } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface ResponseTimeChartProps {
  data: AnalyticsResponseTimeTrendPoint[] | undefined;
  isLoading?: boolean;
}

const formatDateLabel = (value: string): string => format(parseISO(value), "MMM d");

export const ResponseTimeChart = ({ data = [], isLoading = false }: ResponseTimeChartProps) => {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Average First Response Time</CardTitle>
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
          <CardTitle>Average First Response Time</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          No response-time data in this range.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Average First Response Time</CardTitle>
      </CardHeader>
      <CardContent className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <XAxis dataKey="date" tickFormatter={formatDateLabel} />
            <YAxis />
            <Tooltip
              formatter={(value: number) => [`${value.toFixed(2)} min`, "Avg first response"]}
              labelFormatter={(label: string) => formatDateLabel(label)}
            />
            <Bar dataKey="averageFirstResponseMinutes" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
