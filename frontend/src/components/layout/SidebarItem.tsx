"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { SidebarNavItem } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface SidebarItemProps {
  item: SidebarNavItem;
  badge?: number | undefined;
}

export const SidebarItem = ({ item, badge }: SidebarItemProps) => {
  const pathname = usePathname();
  const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      className={cn(
        "group flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors",
        isActive
          ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-200"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      <span className="flex items-center gap-2">
        <Icon className="h-4 w-4" />
        {item.label}
      </span>
      {badge && badge > 0 ? (
        <span className="rounded-full bg-red-500 px-2 py-0.5 text-xs font-semibold text-white">{badge}</span>
      ) : null}
    </Link>
  );
};
