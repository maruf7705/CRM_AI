import {
  BarChart3,
  Bot,
  ContactRound,
  Home,
  Inbox,
  LineChart,
  MessageSquare,
  Settings,
  Users,
} from "lucide-react";
import type { Role } from "@/types";

const ensureProtocol = (value: string): string => {
  const trimmed = value.trim();
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  return `https://${trimmed}`;
};

const normalizeUrl = (value: string): string => {
  const withProtocol = ensureProtocol(value);

  try {
    const parsed = new URL(withProtocol);
    parsed.pathname = parsed.pathname.replace(/\/+$/, "") || "/";
    return parsed.toString().replace(/\/+$/, "");
  } catch {
    return withProtocol.replace(/\/+$/, "");
  }
};

const normalizeApiBaseUrl = (value: string): string => {
  const normalized = normalizeUrl(value);

  try {
    const parsed = new URL(normalized);
    const pathname = parsed.pathname.replace(/\/+$/, "");

    if (pathname === "" || pathname === "/") {
      parsed.pathname = "/api/v1";
    }

    return parsed.toString().replace(/\/+$/, "");
  } catch {
    return normalized;
  }
};

export const appConfig = {
  name: process.env.NEXT_PUBLIC_APP_NAME ?? "OmniDesk AI",
  apiBaseUrl: normalizeApiBaseUrl(process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1"),
  appUrl: normalizeUrl(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
} as const;

export interface SidebarNavItem {
  label: string;
  href: string;
  icon: typeof Home;
  minRole?: Role;
}

const roleRank: Record<Role, number> = {
  VIEWER: 1,
  AGENT: 2,
  ADMIN: 3,
  OWNER: 4,
};

export const hasRoleAccess = (currentRole: Role | null | undefined, minRole: Role): boolean => {
  if (!currentRole) {
    return false;
  }

  return roleRank[currentRole] >= roleRank[minRole];
};

export const sidebarNavItems: SidebarNavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: Home, minRole: "VIEWER" },
  { label: "Inbox", href: "/inbox", icon: Inbox, minRole: "VIEWER" },
  { label: "Contacts", href: "/contacts", icon: ContactRound, minRole: "VIEWER" },
  { label: "Channels", href: "/channels", icon: MessageSquare, minRole: "ADMIN" },
  { label: "AI Setup", href: "/ai-settings", icon: Bot, minRole: "ADMIN" },
  { label: "Analytics", href: "/analytics", icon: LineChart, minRole: "AGENT" },
  { label: "Team", href: "/team", icon: Users, minRole: "ADMIN" },
  { label: "Settings", href: "/settings", icon: Settings, minRole: "VIEWER" },
  { label: "Reports", href: "/dashboard", icon: BarChart3, minRole: "ADMIN" },
];
