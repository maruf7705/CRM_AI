import { Mail, MessageCircle, MessageSquareText, Send, Smartphone } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { ChannelType } from "@/types";

const channelMap: Record<
  ChannelType,
  {
    label: string;
    Icon: typeof MessageCircle;
  }
> = {
  FACEBOOK: { label: "FB", Icon: MessageCircle },
  INSTAGRAM: { label: "IG", Icon: Smartphone },
  WHATSAPP: { label: "WA", Icon: MessageSquareText },
  WEBCHAT: { label: "Web", Icon: MessageSquareText },
  TELEGRAM: { label: "TG", Icon: Send },
  EMAIL: { label: "Email", Icon: Mail },
};

export const ChannelBadge = ({ type }: { type: ChannelType }) => {
  const config = channelMap[type];

  return (
    <Badge variant="secondary" className="inline-flex items-center gap-1">
      <config.Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
};
