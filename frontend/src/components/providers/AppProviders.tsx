"use client";

import type { ReactNode } from "react";
import { QueryProvider } from "./QueryProvider";
import { RealtimeProvider } from "./RealtimeProvider";
import { ThemeProvider } from "./ThemeProvider";
import { ToastProvider } from "./ToastProvider";

interface AppProvidersProps {
  children: ReactNode;
}

export const AppProviders = ({ children }: AppProvidersProps) => {
  return (
    <ThemeProvider>
      <QueryProvider>
        <RealtimeProvider>
          <ToastProvider>{children}</ToastProvider>
        </RealtimeProvider>
      </QueryProvider>
    </ThemeProvider>
  );
};
