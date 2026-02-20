import type { ReactNode } from "react";
import { CommandPalette } from "@/components/layout/CommandPalette";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <CommandPalette />
      <div className="flex">
        <Sidebar />
        <main className="min-h-[calc(100vh-4rem)] flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
