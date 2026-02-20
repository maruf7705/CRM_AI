"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, ChevronDown, LogOut, User } from "lucide-react";
import { toast } from "sonner";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

export const UserMenu = () => {
  const router = useRouter();
  const { user, logout } = useAuth();

  const initials = user ? `${user.firstName[0] ?? "U"}${user.lastName[0] ?? "S"}` : "US";

  const handleLogout = async () => {
    await logout();
    toast.success("Logged out");
    router.replace("/login");
  };

  return (
    <div className="relative flex items-center gap-2">
      <Button variant="ghost" size="icon" aria-label="Notifications">
        <Bell className="h-5 w-5" />
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger>
          <div className="flex items-center gap-2 rounded-lg px-2 py-1 hover:bg-muted">
            <Avatar className="h-8 w-8">
              <AvatarFallback>{initials.toUpperCase()}</AvatarFallback>
            </Avatar>
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </div>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-44 rounded-md border bg-background p-1 shadow-lg">
          <DropdownMenuItem className="gap-2">
            <Link href="/settings/profile" className="inline-flex w-full items-center gap-2">
              <User className="h-4 w-4" />
              Profile
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem className="gap-2" onClick={handleLogout}>
            <LogOut className="h-4 w-4" />
            Logout
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};
