import { cn } from "@/lib/utils";

interface StatusDotProps {
  active?: boolean;
  className?: string;
}

export const StatusDot = ({ active = false, className }: StatusDotProps) => {
  return (
    <span
      className={cn(
        "inline-flex h-2.5 w-2.5 rounded-full",
        active ? "bg-emerald-500" : "bg-slate-400",
        className,
      )}
    />
  );
};
