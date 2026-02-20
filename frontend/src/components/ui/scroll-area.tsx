import * as React from "react";
import { cn } from "@/lib/utils";

export const ScrollArea = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("overflow-auto", className)} {...props} />
);
