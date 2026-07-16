"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Car, Gauge, LogOut, MapPin, Menu, Search, User, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSessionStore } from "@/store/useSessionStore";
import type { Role } from "@/types";
import { Button } from "@/components/ui/button";
import { BrandHeader } from "@/components/layout/BrandHeader";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { InstallAppButton } from "@/components/layout/InstallAppButton";

const NAV_ITEMS: Record<
  Role,
  { href: string; label: string; icon: typeof Gauge }[]
> = {
  rider: [{ href: "/rider", label: "My ride", icon: MapPin }],
  driver: [{ href: "/driver", label: "Driver console", icon: Car }],
  owner: [{ href: "/owner", label: "Dispatch overview", icon: Gauge }],
};

export function SideNav({ role }: { role: Role }) {
  const pathname = usePathname();
  const router = useRouter();
  const session = useSessionStore((s) => s.session);
  const clearSession = useSessionStore((s) => s.clearSession);
  const [isOpen, setIsOpen] = useState(false);

  // Close the mobile drawer whenever the route changes.
  useEffect(() => setIsOpen(false), [pathname]);

  function handleSignOut() {
    clearSession();
    router.replace("/login");
  }

  return (
    <>
      {/* Mobile top bar — hidden at lg+, where the rail below is always visible instead. */}
      <div className="safe-top flex h-14 shrink-0 items-center justify-between border-b bg-card px-4 lg:hidden">
        <BrandHeader role={role} compact />
        <div className="flex items-center gap-2">
          <InstallAppButton compact />
          <ThemeToggle />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Backdrop for the mobile drawer. */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={() => setIsOpen(false)}
          aria-hidden
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex h-screen w-72 flex-col border-r bg-card transition-transform duration-200 ease-out",
          "lg:static lg:z-auto lg:w-64 lg:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex items-center justify-between border-b p-4">
          <BrandHeader role={role} />
          <Button
            variant="ghost"
            size="sm"
            className="lg:hidden"
            onClick={() => setIsOpen(false)}
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <nav className="flex-1 space-y-1 p-3">
          {NAV_ITEMS[role].map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground",
                pathname === href
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          ))}

          <button
            type="button"
            onClick={() =>
              document.dispatchEvent(
                new KeyboardEvent("keydown", { key: "k", metaKey: true })
              )
            }
            className="mt-2 flex w-full items-center justify-between rounded-md border border-dashed px-3 py-2 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            <span className="flex items-center gap-2">
              <Search className="h-3.5 w-3.5" />
              Quick actions
            </span>
            <kbd className="rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px]">
              ⌘K
            </kbd>
          </button>
        </nav>

        <div className="border-t p-3">
          <div
            className="mb-2 flex items-center justify-between gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground"
            title={session?.userId}
          >
            <span className="flex min-w-0 items-center gap-2">
              <User className="h-4 w-4 shrink-0" />
              <span className="truncate">{session?.userId.slice(0, 8)}…</span>
            </span>
            <ThemeToggle />
          </div>
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start gap-2"
            onClick={handleSignOut}
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </Button>
          <InstallAppButton className="mt-2 w-full justify-start" />
        </div>
      </aside>
    </>
  );
}
