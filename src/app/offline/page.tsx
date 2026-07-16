import type { Metadata } from "next";
import { WifiOff } from "lucide-react";

export const metadata: Metadata = {
  title: "You're offline — Zypher",
};

/**
 * Static fallback the service worker serves for any navigation that fails
 * while offline (see `navigateFallback` in next.config.mjs). Deliberately
 * simple and dependency-free — it has to render from the precache alone,
 * with no API calls, no map, and no client-side data fetching.
 */
export default function OfflinePage() {
  return (
    <div className="flex h-screen w-full flex-col items-center justify-center gap-4 bg-background px-6 text-center text-foreground">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
        <WifiOff className="h-6 w-6 text-muted-foreground" />
      </div>
      <div className="space-y-1.5">
        <h1 className="font-display text-2xl font-semibold tracking-tight">
          You&apos;re offline
        </h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          Zypher needs a connection to book, track, or manage a ride. Check
          your Wi-Fi or mobile data and try again — this page will
          automatically retry when you&apos;re back online.
        </p>
      </div>
      <a
        href="/"
        className="mt-2 rounded-full border-2 border-foreground px-5 py-2 text-sm font-semibold transition-colors hover:bg-foreground hover:text-background"
      >
        Retry
      </a>
    </div>
  );
}
