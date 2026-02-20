import Image from "next/image";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  illustrationSrc?: string;
  illustrationAlt?: string;
  className?: string;
}

export const EmptyState = ({
  title,
  description,
  actionLabel,
  onAction,
  illustrationSrc,
  illustrationAlt = "",
  className,
}: EmptyStateProps) => {
  return (
    <div className={cn("rounded-xl border border-dashed bg-muted/30 p-8 text-center", className)}>
      {illustrationSrc ? (
        <Image
          src={illustrationSrc}
          alt={illustrationAlt}
          width={180}
          height={140}
          className="mx-auto mb-5 h-auto w-auto"
        />
      ) : null}
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
      {actionLabel && onAction ? (
        <Button className="mt-4" onClick={onAction}>
          {actionLabel}
        </Button>
      ) : null}
    </div>
  );
};
