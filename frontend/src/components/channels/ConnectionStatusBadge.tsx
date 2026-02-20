import { Badge } from "@/components/ui/badge";

export const ConnectionStatusBadge = ({ connected }: { connected: boolean }) => {
  return <Badge variant={connected ? "success" : "outline"}>{connected ? "Connected" : "Disconnected"}</Badge>;
};
