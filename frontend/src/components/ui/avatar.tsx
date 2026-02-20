import * as React from "react";
import { cn } from "@/lib/utils";

interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string;
  alt?: string;
}

export const Avatar = ({ className, src, alt, ...props }: AvatarProps) => {
  return (
    <div
      className={cn("relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full bg-muted", className)}
      {...props}
    >
      {src ? <img src={src} alt={alt ?? "Avatar"} className="h-full w-full object-cover" /> : null}
    </div>
  );
};

export const AvatarImage = ({ className, src, alt }: React.ImgHTMLAttributes<HTMLImageElement>) => (
  <img src={src} alt={alt} className={cn("h-full w-full object-cover", className)} />
);

export const AvatarFallback = ({ className, children }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex h-full w-full items-center justify-center bg-muted text-muted-foreground", className)}>
    {children}
  </div>
);
