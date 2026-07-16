import { Skeleton, SkeletonCard, SkeletonRow } from "@/components/ui/skeleton";

/** Generic skeleton shown by loading.tsx for the rider/driver/owner routes
 *  while the route segment (and any server work) streams in. Mirrors the
 *  DashboardShell's max-w-5xl / space-y-6 layout so there's no content jump. */
export function DashboardSkeleton() {
  return (
    <div className="mx-auto max-w-5xl space-y-6" aria-busy="true" aria-live="polite">
      <div className="space-y-2">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-72" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>

      <div className="space-y-2">
        <Skeleton className="h-4 w-32" />
        <SkeletonRow />
        <SkeletonRow />
        <SkeletonRow />
      </div>

      <span className="sr-only">Loading…</span>
    </div>
  );
}
