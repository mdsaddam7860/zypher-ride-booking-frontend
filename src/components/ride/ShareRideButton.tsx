"use client";

import { Share2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

/** Uses the Web Share API where available (mobile browsers, most desktop
 *  browsers over HTTPS); falls back to copying a share-worthy summary to
 *  the clipboard everywhere else instead of failing silently. */
export function ShareRideButton({
  rideId,
  status,
  vehicleType,
  className,
}: {
  rideId: string;
  status: string;
  vehicleType: string;
  className?: string;
}) {
  async function handleShare(e: React.MouseEvent) {
    e.stopPropagation();
    const text = `Zypher ride ${rideId.slice(0, 8)}… (${vehicleType}) — ${status}`;
    const shareUrl = typeof window !== "undefined" ? window.location.href : undefined;

    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: "Zypher ride", text, url: shareUrl });
      } catch {
        // Ignored — user dismissed the native share sheet, not an error.
      }
      return;
    }

    try {
      await navigator.clipboard.writeText(shareUrl ? `${text} — ${shareUrl}` : text);
      toast.success("Ride details copied to clipboard");
    } catch {
      toast.error("Couldn't share — try copying the ride ID instead");
    }
  }

  return (
    <Button type="button" variant="ghost" size="sm" onClick={handleShare} className={className}>
      <Share2 className="h-3.5 w-3.5" />
      Share
    </Button>
  );
}
