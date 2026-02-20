"use client";

import type { AnalyticsAgentPerformance } from "@/types";
import { formatNumber } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

interface AgentPerformanceTableProps {
  agents: AnalyticsAgentPerformance[] | undefined;
  isLoading?: boolean;
}

const roleVariantMap: Record<AnalyticsAgentPerformance["role"], "default" | "secondary" | "outline"> = {
  OWNER: "default",
  ADMIN: "secondary",
  AGENT: "outline",
  VIEWER: "outline",
};

const formatMinutes = (value: number): string => `${formatNumber(value)}m`;

export const AgentPerformanceTable = ({ agents = [], isLoading = false }: AgentPerformanceTableProps) => {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Agent Performance</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {[0, 1, 2, 3].map((index) => (
            <Skeleton key={index} className="h-10 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Agent Performance</CardTitle>
      </CardHeader>
      <CardContent>
        {agents.length === 0 ? (
          <p className="text-sm text-muted-foreground">No agent performance data in this range.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Agent</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="text-right">Messages</TableHead>
                <TableHead className="text-right">Conversations</TableHead>
                <TableHead className="text-right">Avg Response</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {agents.map((agent) => (
                <TableRow key={agent.userId}>
                  <TableCell>
                    <div className="font-medium">{`${agent.firstName} ${agent.lastName}`}</div>
                    <div className="text-xs text-muted-foreground">{agent.email}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={roleVariantMap[agent.role]}>{agent.role}</Badge>
                  </TableCell>
                  <TableCell className="text-right">{formatNumber(agent.messagesHandled)}</TableCell>
                  <TableCell className="text-right">{formatNumber(agent.conversationsHandled)}</TableCell>
                  <TableCell className="text-right">
                    {formatMinutes(agent.averageFirstResponseMinutes)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};
