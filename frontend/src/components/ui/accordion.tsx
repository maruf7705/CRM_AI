"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface AccordionContextValue {
  value: string | null;
  setValue: (value: string | null) => void;
  collapsible: boolean;
}

interface AccordionItemContextValue {
  value: string;
  open: boolean;
  toggle: () => void;
}

const AccordionContext = React.createContext<AccordionContextValue | null>(null);
const AccordionItemContext = React.createContext<AccordionItemContextValue | null>(null);

const useAccordionContext = (): AccordionContextValue => {
  const context = React.useContext(AccordionContext);
  if (!context) {
    throw new Error("Accordion components must be used within <Accordion>");
  }

  return context;
};

const useAccordionItemContext = (): AccordionItemContextValue => {
  const context = React.useContext(AccordionItemContext);
  if (!context) {
    throw new Error("Accordion components must be used within <AccordionItem>");
  }

  return context;
};

interface AccordionProps extends React.HTMLAttributes<HTMLDivElement> {
  defaultValue?: string;
  collapsible?: boolean;
}

export const Accordion = ({
  defaultValue,
  collapsible = true,
  className,
  children,
  ...props
}: AccordionProps) => {
  const [value, setValue] = React.useState<string | null>(defaultValue ?? null);

  return (
    <AccordionContext.Provider value={{ value, setValue, collapsible }}>
      <div className={cn("w-full", className)} {...props}>
        {children}
      </div>
    </AccordionContext.Provider>
  );
};

interface AccordionItemProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
}

export const AccordionItem = ({ value, className, children, ...props }: AccordionItemProps) => {
  const { value: activeValue, setValue, collapsible } = useAccordionContext();
  const open = activeValue === value;

  const toggle = () => {
    if (open) {
      setValue(collapsible ? null : value);
      return;
    }

    setValue(value);
  };

  return (
    <AccordionItemContext.Provider value={{ value, open, toggle }}>
      <div
        data-state={open ? "open" : "closed"}
        className={cn("rounded-lg border bg-card", className)}
        {...props}
      >
        {children}
      </div>
    </AccordionItemContext.Provider>
  );
};

export const AccordionTrigger = ({
  className,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) => {
  const { open, toggle } = useAccordionItemContext();

  return (
    <button
      type="button"
      onClick={toggle}
      className={cn(
        "flex w-full items-center justify-between gap-2 px-4 py-3 text-left text-sm font-semibold",
        className,
      )}
      {...props}
    >
      <span>{children}</span>
      <ChevronDown className={cn("h-4 w-4 transition-transform", open ? "rotate-180" : "")} />
    </button>
  );
};

export const AccordionContent = ({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => {
  const { open } = useAccordionItemContext();

  if (!open) {
    return null;
  }

  return (
    <div className={cn("px-4 pb-4 text-sm text-muted-foreground", className)} {...props}>
      {children}
    </div>
  );
};
