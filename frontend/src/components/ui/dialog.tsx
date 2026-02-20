"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface DialogContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const DialogContext = React.createContext<DialogContextValue | null>(null);

const useDialogContext = (): DialogContextValue => {
  const context = React.useContext(DialogContext);
  if (!context) {
    throw new Error("Dialog components must be used within <Dialog>");
  }

  return context;
};

export const Dialog = ({ children }: { children: React.ReactNode }) => {
  const [open, setOpen] = React.useState(false);

  return <DialogContext.Provider value={{ open, setOpen }}>{children}</DialogContext.Provider>;
};

export const DialogTrigger = ({ children }: { children: React.ReactNode }) => {
  const { setOpen } = useDialogContext();
  return (
    <button type="button" onClick={() => setOpen(true)}>
      {children}
    </button>
  );
};

export const DialogContent = ({ className, children }: { className?: string; children: React.ReactNode }) => {
  const { open, setOpen } = useDialogContext();

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" onClick={() => setOpen(false)}>
      <div
        role="dialog"
        aria-modal
        className={cn("w-full max-w-lg rounded-xl border bg-background p-6 shadow-xl", className)}
        onClick={(event) => event.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
};

export const DialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col space-y-1.5", className)} {...props} />
);

export const DialogTitle = ({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
  <h2 className={cn("text-lg font-semibold", className)} {...props} />
);

export const DialogDescription = ({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) => (
  <p className={cn("text-sm text-muted-foreground", className)} {...props} />
);

export const DialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("mt-4 flex items-center justify-end gap-2", className)} {...props} />
);

export const DialogClose = ({ children }: { children: React.ReactNode }) => {
  const { setOpen } = useDialogContext();
  return (
    <button type="button" onClick={() => setOpen(false)}>
      {children}
    </button>
  );
};
