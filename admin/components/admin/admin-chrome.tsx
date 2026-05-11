"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { useState, type ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Toaster } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";
import { getAdminEnvLabel } from "@/lib/env/admin-env";
import {
  AI_SUBLINKS,
  CONTENT_SUBLINKS,
  PUBLISHING_SUBLINKS,
  REVIEW_SUBLINKS,
  SIDEBAR_GROUPS,
  SETTINGS_SUBLINKS,
  USER_SUBLINKS,
  type NavEntry,
} from "@/lib/nav/mvp-config";

import type { AdminRole } from "@/lib/auth/types";

import { UserMenu } from "./user-menu";

export type AdminChromeProps = {
  email: string;
  roles: readonly AdminRole[];
  /** When true, sign out only reloads admin (no Supabase session). */
  authBypass?: boolean;
  children: ReactNode;
};

function NavButton({
  entry,
  pathname,
  onNavigate,
}: {
  entry: NavEntry;
  pathname: string;
  onNavigate?: () => void;
}) {
  const active =
    pathname === entry.href || pathname.startsWith(`${entry.href}/`);
  if (entry.disabled) {
    return (
      <span
        className={cn(
          "text-muted-foreground flex items-center justify-between gap-2 rounded-md px-3 py-2 text-sm",
          "cursor-not-allowed opacity-60",
        )}
      >
        <span className="line-through">{entry.label}</span>
        {entry.badge ? (
          <Badge variant="secondary" className="text-[10px]">
            {entry.badge}
          </Badge>
        ) : null}
      </span>
    );
  }
  return (
    <Link
      href={entry.href}
      onClick={onNavigate}
      className={cn(
        "hover:bg-muted block rounded-md px-3 py-2 text-sm font-medium transition-colors",
        active ? "bg-muted text-foreground" : "text-muted-foreground",
      )}
    >
      {entry.label}
    </Link>
  );
}

function SideNav({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <nav className="flex flex-col gap-6 p-4" aria-label="Primary">
      {SIDEBAR_GROUPS.map((group) => (
        <div key={group.id}>
          <p className="text-muted-foreground mb-2 px-3 text-xs font-semibold uppercase tracking-wide">
            {group.label}
          </p>
          <div className="flex flex-col gap-1">
            {group.items.map((entry) => (
              <NavButton
                key={entry.href}
                entry={entry}
                pathname={pathname}
                onNavigate={onNavigate}
              />
            ))}
            {group.id === "operate" && pathname.startsWith("/admin/content") ? (
              <div className="border-muted mt-2 ml-3 border-l pl-3">
                <p className="text-muted-foreground px-3 pb-1 text-[11px] font-medium uppercase">
                  Content
                </p>
                {CONTENT_SUBLINKS.map((entry) => (
                  <NavButton
                    key={entry.href}
                    entry={entry}
                    pathname={pathname}
                    onNavigate={onNavigate}
                  />
                ))}
              </div>
            ) : null}
            {group.id === "operate" && pathname.startsWith("/admin/ai") ? (
              <div className="border-muted mt-2 ml-3 border-l pl-3">
                <p className="text-muted-foreground px-3 pb-1 text-[11px] font-medium uppercase">
                  AI Studio
                </p>
                {AI_SUBLINKS.map((entry) => (
                  <NavButton
                    key={entry.href}
                    entry={entry}
                    pathname={pathname}
                    onNavigate={onNavigate}
                  />
                ))}
              </div>
            ) : null}
            {group.id === "review" && pathname.startsWith("/admin/reviews") ? (
              <div className="border-muted mt-2 ml-3 border-l pl-3">
                <p className="text-muted-foreground px-3 pb-1 text-[11px] font-medium uppercase">
                  Queues
                </p>
                {REVIEW_SUBLINKS.map((entry) => (
                  <NavButton
                    key={entry.href}
                    entry={entry}
                    pathname={pathname}
                    onNavigate={onNavigate}
                  />
                ))}
              </div>
            ) : null}
            {group.id === "review" &&
            pathname.startsWith("/admin/publishing") ? (
              <div className="border-muted mt-2 ml-3 border-l pl-3">
                <p className="text-muted-foreground px-3 pb-1 text-[11px] font-medium uppercase">
                  Publishing
                </p>
                {PUBLISHING_SUBLINKS.map((entry) => (
                  <NavButton
                    key={entry.href}
                    entry={entry}
                    pathname={pathname}
                    onNavigate={onNavigate}
                  />
                ))}
              </div>
            ) : null}
            {group.id === "admin" && pathname.startsWith("/admin/users") ? (
              <div className="border-muted mt-2 ml-3 border-l pl-3">
                <p className="text-muted-foreground px-3 pb-1 text-[11px] font-medium uppercase">
                  Users
                </p>
                {USER_SUBLINKS.map((entry) => (
                  <NavButton
                    key={entry.href}
                    entry={entry}
                    pathname={pathname}
                    onNavigate={onNavigate}
                  />
                ))}
              </div>
            ) : null}
            {group.id === "admin" && pathname.startsWith("/admin/settings") ? (
              <div className="border-muted mt-2 ml-3 border-l pl-3">
                <p className="text-muted-foreground px-3 pb-1 text-[11px] font-medium uppercase">
                  Settings
                </p>
                {SETTINGS_SUBLINKS.map((entry) => (
                  <NavButton
                    key={entry.href}
                    entry={entry}
                    pathname={pathname}
                    onNavigate={onNavigate}
                  />
                ))}
              </div>
            ) : null}
          </div>
        </div>
      ))}
    </nav>
  );
}

export function AdminChrome({
  email,
  roles,
  authBypass = false,
  children,
}: AdminChromeProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const env = getAdminEnvLabel();

  return (
    <div className="bg-background flex min-h-screen">
      <aside
        className="border-border bg-sidebar text-sidebar-foreground hidden w-64 shrink-0 border-r lg:block"
        aria-label="Sidebar"
      >
        <div className="flex h-14 items-center border-b px-4">
          <Link
            href="/admin/dashboard"
            className="flex min-w-0 items-center gap-2 rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <Image
              src="/brand/spinvault-admin-wordmark.png"
              alt=""
              width={160}
              height={36}
              className="h-8 w-auto max-w-[152px] object-contain object-left dark:brightness-[1.02]"
              priority
              sizes="152px"
            />
            <span className="sr-only">SpinVault Admin</span>
          </Link>
        </div>
        <SideNav pathname={pathname} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="border-border bg-background/80 supports-[backdrop-filter]:bg-background/60 sticky top-0 z-30 flex h-14 items-center gap-3 border-b px-4 backdrop-blur">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden"
                aria-label="Open navigation"
              >
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0">
              <SheetHeader className="border-b p-4 text-left">
                <SheetTitle className="flex items-center gap-2 font-semibold tracking-tight">
                  <Image
                    src="/brand/spinvault-admin-mark.png"
                    alt=""
                    width={32}
                    height={32}
                    className="size-8 shrink-0 object-contain"
                  />
                  <span>SpinVault Admin</span>
                </SheetTitle>
              </SheetHeader>
              <SideNav
                pathname={pathname}
                onNavigate={() => setOpen(false)}
              />
            </SheetContent>
          </Sheet>

          <div className="flex flex-1 items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Image
                src="/brand/spinvault-admin-mark.png"
                alt="SpinVault Admin"
                width={28}
                height={28}
                className="size-7 shrink-0 object-contain lg:hidden"
                sizes="28px"
              />
              <Badge
                variant={env === "Production" ? "destructive" : "secondary"}
                className="font-mono text-[10px] uppercase tracking-wide"
              >
                {env}
              </Badge>
              <Separator orientation="vertical" className="hidden h-6 sm:block" />
              <Button variant="ghost" size="sm" className="hidden sm:inline-flex" disabled>
                Search
              </Button>
              <Button variant="ghost" size="sm" className="hidden sm:inline-flex" disabled>
                Alerts
              </Button>
            </div>
            <UserMenu email={email} roles={roles} authBypass={authBypass} />
          </div>
        </header>

        <a
          href="#main-content"
          className="focus:bg-background sr-only focus:not-sr-only focus:absolute focus:top-16 focus:left-4 focus:z-40 focus:rounded-md focus:border focus:px-3 focus:py-2"
        >
          Skip to content
        </a>

        <main id="main-content" className="flex-1 p-4 md:p-6">
          {children}
        </main>
      </div>
      <Toaster richColors closeButton position="top-center" />
    </div>
  );
}
