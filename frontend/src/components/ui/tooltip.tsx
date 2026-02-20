import * as React from "react";
import { cn } from "@/lib/utils";

export const TooltipProvider = ({ children }: { children: React.ReactNode }) => <>{children}</>;

export const Tooltip = ({ children }: { children: React.ReactNode }) => (
  <span className="relative inline-flex">{children}</span>
);

export const TooltipTrigger = ({ children }: { children: React.ReactNode }) => <>{children}</>;

export const TooltipContent = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <span
    className={cn(
      "pointer-events-none absolute left-1/2 top-full z-50 mt-1 -translate-x-1/2 rounded bg-slate-900 px-2 py-1 text-xs text-white",
      className,
    )}
    {...props}
  />
);
