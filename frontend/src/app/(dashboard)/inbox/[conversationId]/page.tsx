"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { FullPageLoader } from "@/components/shared/FullPageLoader";
import { useInboxStore } from "@/stores/inboxStore";

interface ConversationRoutePageProps {
  params: {
    conversationId: string;
  };
}

export default function ConversationRoutePage({ params }: ConversationRoutePageProps) {
  const router = useRouter();
  const setSelectedConversationId = useInboxStore((state) => state.setSelectedConversationId);

  useEffect(() => {
    setSelectedConversationId(params.conversationId);
    router.replace("/inbox");
  }, [params.conversationId, router, setSelectedConversationId]);

  return <FullPageLoader label="Opening conversation..." />;
}
