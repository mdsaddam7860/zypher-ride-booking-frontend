"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Shared body for every route-level error.tsx. Next.js passes `error` and
 *  `reset` (re-renders the segment) to each error boundary automatically. */
export function RouteError({
  error,
  reset,
  title = "Something went wrong",
}: {
  error: Error & { digest?: string };
  reset: () => void;
  title?: string;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex min-h-[50vh] max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
        <AlertTriangle className="h-6 w-6 text-destructive" />
      </div>
      <div className="space-y-1">
        <h2 className="font-display text-lg font-semibold">{title}</h2>
        <p className="text-sm text-muted-foreground">
          {error.message || "An unexpected error occurred. You can try again."}
        </p>
      </div>
      <Button onClick={reset} className="gap-2">
        <RotateCw className="h-4 w-4" />
        Try again
      </Button>
    </div>
  );
}
