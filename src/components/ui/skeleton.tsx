import { cn } from "@/lib/utils";

/** Base shimmer block. Compose into shapes with className (h-4 w-32, rounded-full, etc). */
function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-muted",
        className
      )}
      {...props}
    />
  );
}

/** A line of text-shaped skeleton blocks with slightly varied widths, so a
 *  paragraph placeholder doesn't look like a row of identical bricks. */
function SkeletonText({
  lines = 3,
  className,
}: {
  lines?: number;
  className?: string;
}) {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn("h-3.5", i === lines - 1 ? "w-2/3" : "w-full")}
        />
      ))}
    </div>
  );
}

/** Card-shaped skeleton — matches the padding/border of components/ui/card.tsx. */
function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn("rounded-lg border bg-card p-4 shadow-sm", className)}>
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-3.5 w-1/3" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
      <SkeletonText lines={2} className="mt-4" />
    </div>
  );
}

/** Row-shaped skeleton for lists like ride history. */
function SkeletonRow({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-3 rounded-lg border bg-card p-3", className)}>
      <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
      <div className="flex-1 space-y-1.5">
        <Skeleton className="h-3 w-2/5" />
        <Skeleton className="h-2.5 w-3/5" />
      </div>
      <Skeleton className="h-3 w-12 shrink-0" />
    </div>
  );
}

export { Skeleton, SkeletonText, SkeletonCard, SkeletonRow };
