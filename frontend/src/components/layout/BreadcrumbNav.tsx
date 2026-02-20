"use client";

import { useMemo } from "react";
import { usePathname } from "next/navigation";

export const BreadcrumbNav = () => {
  const pathname = usePathname();

  const crumbs = useMemo(() => {
    return pathname
      .split("/")
      .filter(Boolean)
      .map((segment) => segment.replace(/-/g, " "));
  }, [pathname]);

  if (crumbs.length === 0) {
    return <span className="text-sm text-muted-foreground">Home</span>;
  }

  return (
    <nav className="flex items-center gap-1 text-sm text-muted-foreground">
      <span>Home</span>
      {crumbs.map((crumb) => (
        <span key={crumb} className="capitalize">
          / {crumb}
        </span>
      ))}
    </nav>
  );
};
