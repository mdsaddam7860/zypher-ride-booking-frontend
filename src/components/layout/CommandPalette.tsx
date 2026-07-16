"use client";

import * as React from "react";
import { Command } from "cmdk";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import {
  Car,
  Copy,
  Gauge,
  LogOut,
  MapPin,
  Monitor,
  Moon,
  Sun,
} from "lucide-react";
import { useSessionStore } from "@/store/useSessionStore";

/**
 * Global Cmd/Ctrl+K palette. Mounted once near the root so it's reachable
 * from anywhere in the app. Commands are intentionally scoped to what's
 * actually possible here — each role has exactly one dashboard route, so
 * this leans on quick actions (theme, sign out, copy active ride) rather
 * than pretending there's a big page tree to search.
 */
export function CommandPalette() {
  const [open, setOpen] = React.useState(false);
  const router = useRouter();
  const { setTheme } = useTheme();
  const session = useSessionStore((s) => s.session);
  const clearSession = useSessionStore((s) => s.clearSession);
  const activeRideId = useSessionStore((s) => s.activeRideId);

  React.useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  function run(action: () => void) {
    setOpen(false);
    action();
  }

  if (!session) return null;

  const dashboardHref = `/${session.role}`;
  const dashboardIcon =
    session.role === "rider" ? MapPin : session.role === "driver" ? Car : Gauge;
  const DashboardIcon = dashboardIcon;

  return (
    <Command.Dialog
      open={open}
      onOpenChange={setOpen}
      label="Command palette"
      overlayClassName="fixed inset-0 z-[100] bg-black/40 backdrop-blur-[2px] animate-in fade-in duration-150"
      contentClassName="fixed left-1/2 top-[18vh] z-[101] w-full max-w-lg -translate-x-1/2 overflow-hidden rounded-xl border bg-popover text-popover-foreground shadow-2xl animate-in fade-in zoom-in-95 slide-in-from-top-2 duration-150"
    >
      <div className="flex items-center gap-2 border-b px-3">
        <Command.Input
          autoFocus
          placeholder="Type a command or search…"
          className="h-12 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
        <kbd className="hidden shrink-0 rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground sm:inline-block">
          Esc
        </kbd>
      </div>

      <Command.List className="max-h-[60vh] overflow-y-auto p-2">
        <Command.Empty className="py-6 text-center text-sm text-muted-foreground">
          No matching commands.
        </Command.Empty>

        <Command.Group heading="Navigate" className="px-2 py-1.5 text-xs font-medium text-muted-foreground [&_[cmdk-group-heading]]:mb-1">
          <Command.Item
            onSelect={() => run(() => router.push(dashboardHref))}
            className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground"
          >
            <DashboardIcon className="h-4 w-4" />
            Go to dashboard
          </Command.Item>
        </Command.Group>

        {activeRideId && (
          <Command.Group heading="Active ride" className="px-2 py-1.5 text-xs font-medium text-muted-foreground [&_[cmdk-group-heading]]:mb-1">
            <Command.Item
              onSelect={() =>
                run(async () => {
                  await navigator.clipboard.writeText(activeRideId);
                  toast.success("Ride ID copied");
                })
              }
              className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground"
            >
              <Copy className="h-4 w-4" />
              Copy active ride ID
            </Command.Item>
          </Command.Group>
        )}

        <Command.Group heading="Theme" className="px-2 py-1.5 text-xs font-medium text-muted-foreground [&_[cmdk-group-heading]]:mb-1">
          <Command.Item
            onSelect={() => run(() => setTheme("light"))}
            className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground"
          >
            <Sun className="h-4 w-4" />
            Light theme
          </Command.Item>
          <Command.Item
            onSelect={() => run(() => setTheme("dark"))}
            className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground"
          >
            <Moon className="h-4 w-4" />
            Dark theme
          </Command.Item>
          <Command.Item
            onSelect={() => run(() => setTheme("system"))}
            className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground"
          >
            <Monitor className="h-4 w-4" />
            System theme
          </Command.Item>
        </Command.Group>

        <Command.Group heading="Account" className="px-2 py-1.5 text-xs font-medium text-muted-foreground [&_[cmdk-group-heading]]:mb-1">
          <Command.Item
            onSelect={() =>
              run(() => {
                clearSession();
                router.replace("/login");
              })
            }
            className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm text-destructive data-[selected=true]:bg-destructive/10"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </Command.Item>
        </Command.Group>
      </Command.List>
    </Command.Dialog>
  );
}
