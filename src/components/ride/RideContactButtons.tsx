"use client";

import { Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Ride } from "@/types";

/**
 * Tap-to-dial (tel:) buttons for the rider's and driver's phone numbers.
 * Purely presence-guarded on `ride.contact` — the backend decides who gets
 * it and for how long:
 *   - rider/driver apps: only while the ride is active (driver_assigned ->
 *     in_progress); gone once it ends or is cancelled.
 *   - owner dashboard: present on any ride that ever had a driver assigned,
 *     including completed/cancelled, for dispute/support lookups.
 * No frontend role branching needed — just render when it's there.
 */
export function RideContactButtons({ ride }: { ride: Ride }) {
  if (!ride.contact) return null;

  return (
    <div className="flex flex-wrap gap-2">
      <a href={`tel:${ride.contact.riderPhone}`}>
        <Button variant="outline" size="sm" className="gap-2">
          <Phone className="h-3.5 w-3.5" /> Call rider
        </Button>
      </a>
      {ride.driverId && (
        <a href={`tel:${ride.contact.driverPhone}`}>
          <Button variant="outline" size="sm" className="gap-2">
            <Phone className="h-3.5 w-3.5" /> Call driver
          </Button>
        </a>
      )}
    </div>
  );
}
