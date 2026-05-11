"use client";

import { LogOut, User } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

import type { AdminRole } from "@/lib/auth/types";

export type UserMenuProps = {
  email: string;
  roles: readonly AdminRole[];
  authBypass?: boolean;
};

export function UserMenu({ email, roles, authBypass = false }: UserMenuProps) {
  async function signOut() {
    if (authBypass) {
      window.location.href = "/admin/dashboard";
      return;
    }
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <User className="size-4" aria-hidden />
          Account
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col gap-1">
            <span className="truncate text-sm font-medium">{email}</span>
            <span className="text-muted-foreground text-xs">
              {roles.length ? roles.join(", ") : "No roles assigned"}
            </span>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => void signOut()}>
          <LogOut className="mr-2 size-4" />
          {authBypass ? "Reload dashboard" : "Sign out"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
