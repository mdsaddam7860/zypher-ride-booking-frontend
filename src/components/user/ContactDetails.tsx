"use client";

import { Mail, Phone, User } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useSessionStore } from "@/store/useSessionStore";
import { useRiderProfileForOwner } from "@/hooks/useUserProfile";

/**
 * Shows a rider's or driver's name/phone/email so the other party can get in
 * touch. Only one lookup actually exists on the backend right now — an
 * owner viewing a rider (GET /api/owner/riders/:riderId). Every other
 * combination (driver->rider, rider->driver, owner->driver) has no endpoint
 * yet, so this just shows a plain "not available yet" note for those
 * instead of guessing at a URL.
 */
export function ContactDetails({
  userId,
  kind,
  label,
}: {
  userId: string | null | undefined;
  kind: "rider" | "driver";
  label: string;
}) {
  const viewerRole = useSessionStore((s) => s.session?.role);
  const canFetch = kind === "rider" && viewerRole === "owner";
  const profile = useRiderProfileForOwner(canFetch ? userId : null);

  if (!userId) return null;

  return (
    <div className="space-y-1.5 rounded-lg border bg-muted/30 p-3 text-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>

      {!canFetch && (
        <p className="text-xs text-muted-foreground" title={userId}>
          Contact details aren&apos;t available yet — {label.toLowerCase()} ID{" "}
          {userId.slice(0, 8)}…
        </p>
      )}

      {canFetch && profile.isLoading && (
        <div className="space-y-1.5" aria-busy="true" aria-label="Loading contact details">
          <Skeleton className="h-3.5 w-28" />
          <Skeleton className="h-3.5 w-32" />
          <Skeleton className="h-3.5 w-36" />
        </div>
      )}

      {canFetch && profile.isError && (
        <p className="text-xs text-muted-foreground" title={userId}>
          Contact details aren&apos;t available yet — {label.toLowerCase()} ID{" "}
          {userId.slice(0, 8)}…
        </p>
      )}

      {canFetch && profile.data && (
        <div className="space-y-1">
          <p className="flex items-center gap-2 font-medium">
            <User className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            {profile.data.name}
          </p>
          {profile.data.phone && (
            <a
              href={`tel:${profile.data.phone}`}
              className="flex items-center gap-2 text-primary hover:underline"
            >
              <Phone className="h-3.5 w-3.5 shrink-0" />
              {profile.data.phone}
            </a>
          )}
          {profile.data.email && (
            <a
              href={`mailto:${profile.data.email}`}
              className="flex items-center gap-2 text-primary hover:underline"
            >
              <Mail className="h-3.5 w-3.5 shrink-0" />
              {profile.data.email}
            </a>
          )}
        </div>
      )}
    </div>
  );
}
