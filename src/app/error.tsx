"use client";

import { RouteError } from "@/components/layout/RouteError";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <RouteError error={error} reset={reset} />
    </div>
  );
}
