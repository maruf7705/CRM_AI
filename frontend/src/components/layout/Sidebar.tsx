"use client";

import { HelpCircle, Sparkles } from "lucide-react";
import { hasRoleAccess, sidebarNavItems } from "@/lib/constants";
import { useInboxStore } from "@/stores/inboxStore";
import { useAuthStore } from "@/stores/authStore";
import { Logo } from "@/components/shared/Logo";
import { SidebarItem } from "./SidebarItem";

export const Sidebar = () => {
  const unreadCount = useInboxStore((state) => state.unreadCount);
  const role = useAuthStore((state) => state.role);
  const effectiveRole = role ?? "VIEWER";
  const visibleItems = sidebarNavItems.filter((item) => hasRoleAccess(effectiveRole, item.minRole ?? "VIEWER"));

  return (
    <aside className="hidden h-[calc(100vh-4rem)] w-64 shrink-0 border-r bg-background px-3 py-4 lg:block">
      <div className="px-2 pb-4">
        <Logo />
      </div>
      <nav className="space-y-1">
        {visibleItems.map((item) => (
          <SidebarItem key={item.href} item={item} badge={item.label === "Inbox" ? unreadCount : undefined} />
        ))}
      </nav>
      <div className="mt-6 space-y-1 border-t pt-4">
        <a
          href="#"
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <HelpCircle className="h-4 w-4" />
          Help
        </a>
        <a
          href="#"
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-indigo-600 hover:bg-indigo-50 dark:text-indigo-300 dark:hover:bg-indigo-950"
        >
          <Sparkles className="h-4 w-4" />
          Upgrade
        </a>
      </div>
    </aside>
  );
};
