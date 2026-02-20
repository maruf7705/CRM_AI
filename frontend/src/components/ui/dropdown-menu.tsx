"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface DropdownContextValue {
  open: boolean;
  setOpen: (value: boolean) => void;
}

const DropdownContext = React.createContext<DropdownContextValue | null>(null);

const useDropdownContext = (): DropdownContextValue => {
  const context = React.useContext(DropdownContext);
  if (!context) {
    throw new Error("Dropdown components must be wrapped in <DropdownMenu>");
  }

  return context;
};

export const DropdownMenu = ({ children }: { children: React.ReactNode }) => {
  const [open, setOpen] = React.useState(false);
  return <DropdownContext.Provider value={{ open, setOpen }}>{children}</DropdownContext.Provider>;
};

export const DropdownMenuTrigger = ({ children }: { children: React.ReactNode }) => {
  const { setOpen } = useDropdownContext();
  return (
    <button type="button" onClick={() => setOpen(true)}>
      {children}
    </button>
  );
};

export const DropdownMenuContent = ({ className, children }: { className?: string; children: React.ReactNode }) => {
  const { open, setOpen } = useDropdownContext();
  if (!open) {
    return null;
  }

  return (
    <div className="absolute right-0 top-full z-50 mt-2 min-w-[200px] rounded-md border bg-popover p-1 shadow-md">
      <div className={cn(className)} onMouseLeave={() => setOpen(false)}>
        {children}
      </div>
    </div>
  );
};

export const DropdownMenuItem = ({ className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
  <button
    type="button"
    className={cn(
      "flex w-full items-center rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground",
      className,
    )}
    {...props}
  />
);

export const DropdownMenuLabel = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("px-2 py-1.5 text-sm font-semibold", className)} {...props} />
);

export const DropdownMenuSeparator = ({ className, ...props }: React.HTMLAttributes<HTMLHRElement>) => (
  <hr className={cn("my-1 border-border", className)} {...props} />
);
