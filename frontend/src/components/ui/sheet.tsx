"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface SheetContextValue {
  open: boolean;
  setOpen: (value: boolean) => void;
}

const SheetContext = React.createContext<SheetContextValue | null>(null);

const useSheetContext = (): SheetContextValue => {
  const context = React.useContext(SheetContext);
  if (!context) {
    throw new Error("Sheet components must be wrapped in <Sheet>");
  }

  return context;
};

export const Sheet = ({ open, onOpenChange, children }: {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}) => {
  const [internalOpen, setInternalOpen] = React.useState(false);
  const actualOpen = open ?? internalOpen;

  const setOpen = (value: boolean) => {
    setInternalOpen(value);
    onOpenChange?.(value);
  };

  return <SheetContext.Provider value={{ open: actualOpen, setOpen }}>{children}</SheetContext.Provider>;
};

export const SheetTrigger = ({ children }: { children: React.ReactNode }) => {
  const { setOpen } = useSheetContext();
  return (
    <button type="button" onClick={() => setOpen(true)}>
      {children}
    </button>
  );
};

export const SheetContent = ({ className, children }: { className?: string; children: React.ReactNode }) => {
  const { open, setOpen } = useSheetContext();

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex" onClick={() => setOpen(false)}>
      <div
        className={cn("h-full w-80 border-r bg-background p-4 shadow-lg", className)}
        onClick={(event) => event.stopPropagation()}
      >
        {children}
      </div>
      <div className="flex-1 bg-black/40" />
    </div>
  );
};

export const SheetHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("mb-4", className)} {...props} />
);

export const SheetTitle = ({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
  <h2 className={cn("text-base font-semibold", className)} {...props} />
);

export const SheetClose = ({ children }: { children: React.ReactNode }) => {
  const { setOpen } = useSheetContext();
  return (
    <button type="button" onClick={() => setOpen(false)}>
      {children}
    </button>
  );
};
