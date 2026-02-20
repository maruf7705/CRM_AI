"use client";

import { Moon, Search, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { useUiStore } from "@/stores/uiStore";
import { BreadcrumbNav } from "./BreadcrumbNav";
import { MobileSidebar } from "./MobileSidebar";
import { UserMenu } from "./UserMenu";

export const Header = () => {
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const openCommandPalette = useUiStore((state) => state.setCommandPaletteOpen);

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b bg-background/95 px-4 backdrop-blur">
      <MobileSidebar />
      <div className="hidden md:block">
        <BreadcrumbNav />
      </div>
      <button
        type="button"
        onClick={() => openCommandPalette(true)}
        className="ml-auto hidden w-full max-w-md items-center justify-between rounded-md border bg-background px-3 py-2 text-left text-sm text-muted-foreground transition-colors hover:bg-muted/30 md:flex"
      >
        <span className="flex items-center gap-2">
          <Search className="h-4 w-4" />
          Search conversations, contacts, channels...
        </span>
        <kbd className="rounded border bg-muted px-1.5 py-0.5 text-xs">Cmd/Ctrl+K</kbd>
      </button>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setTheme(isDark ? "light" : "dark")}
        aria-label="Toggle dark mode"
      >
        {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </Button>
      <UserMenu />
    </header>
  );
};
