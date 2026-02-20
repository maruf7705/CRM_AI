"use client";

import type { ReactNode } from "react";
import { useRealtime } from "@/hooks/useRealtime";
import { useAuthStore } from "@/stores/authStore";

interface RealtimeProviderProps {
  children: ReactNode;
}

export const RealtimeProvider = ({ children }: RealtimeProviderProps) => {
  const organizationId = useAuthStore((state) => state.organizationId);
  const userId = useAuthStore((state) => state.user?.id);

  useRealtime({
    organizationId: organizationId ?? undefined,
    userId: userId ?? undefined,
  });

  return <>{children}</>;
};
