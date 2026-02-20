"use client";

import { Menu } from "lucide-react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useUiStore } from "@/stores/uiStore";
import { Sidebar } from "./Sidebar";

export const MobileSidebar = () => {
  const isOpen = useUiStore((state) => state.isMobileSidebarOpen);
  const toggle = useUiStore((state) => state.toggleMobileSidebar);
  const setOpen = useUiStore((state) => state.setMobileSidebarOpen);

  return (
    <>
      <Button variant="ghost" size="icon" className="lg:hidden" onClick={toggle} aria-label="Toggle sidebar">
        <Menu className="h-5 w-5" />
      </Button>
      <Sheet open={isOpen} onOpenChange={setOpen}>
        <SheetContent className="p-0 lg:hidden">
          <div className="h-full w-64">
            <Sidebar />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};
