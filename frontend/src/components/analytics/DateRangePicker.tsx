"use client";

import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

interface DateRangePickerProps {
  from: string;
  to: string;
  onFromChange: (value: string) => void;
  onToChange: (value: string) => void;
  className?: string;
  disabled?: boolean;
}

export const DateRangePicker = ({
  from,
  to,
  onFromChange,
  onToChange,
  className,
  disabled = false,
}: DateRangePickerProps) => {
  return (
    <div className={cn("grid gap-2 sm:grid-cols-2", className)}>
      <Input
        type="date"
        value={from}
        max={to || undefined}
        disabled={disabled}
        onChange={(event) => onFromChange(event.target.value)}
      />
      <Input
        type="date"
        value={to}
        min={from || undefined}
        disabled={disabled}
        onChange={(event) => onToChange(event.target.value)}
      />
    </div>
  );
};
