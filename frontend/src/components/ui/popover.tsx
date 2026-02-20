import * as React from "react";
import { cn } from "@/lib/utils";

export const Popover = ({ children }: { children: React.ReactNode }) => <div className="relative inline-block">{children}</div>;

export const PopoverTrigger = ({ children }: { children: React.ReactNode }) => <>{children}</>;

export const PopoverContent = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn("absolute z-50 mt-2 rounded-md border bg-popover p-3 text-popover-foreground shadow-md", className)}
    {...props}
  />
);
