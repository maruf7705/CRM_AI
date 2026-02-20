import * as React from "react";
import { cn } from "@/lib/utils";

export const Command = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("rounded-md border bg-popover text-popover-foreground", className)} {...props} />
);

export const CommandInput = ({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) => (
  <input className={cn("w-full border-b px-3 py-2 text-sm", className)} {...props} />
);

export const CommandList = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("max-h-72 overflow-y-auto", className)} {...props} />
);

export const CommandItem = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("cursor-pointer px-3 py-2 text-sm hover:bg-accent", className)} {...props} />
);

export const CommandEmpty = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("py-6 text-center text-sm", className)} {...props} />
);
