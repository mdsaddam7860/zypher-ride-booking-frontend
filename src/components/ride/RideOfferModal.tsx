"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, MapPin, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { useSocketEvent } from "@/hooks/useSocketEvent";
import { useRespondToOffer } from "@/hooks/driver/useDriverActions";
import { formatVehicleType } from "@/lib/utils";
import type { RideOffer } from "@/types";

/**
 * Listens for real-time auto-dispatch offers pushed over socket
 * ("ride:offer") while the driver is online, and shows a modal with an
 * accept/decline countdown. Auto-dismisses on "ride:offer:expired" (or
 * locally, if the countdown hits zero first in case that event is missed).
 * Responds via REST (POST /api/rides/offers/:offerId/respond), not the
 * socket itself.
 */
export function RideOfferModal() {
  const [offer, setOffer] = useState<RideOffer | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const respond = useRespondToOffer();

  useSocketEvent<RideOffer>("ride:offer", (payload) => setOffer(payload));

  useSocketEvent<{ offerId: string; rideId: string }>(
    "ride:offer:expired",
    (payload) => {
      setOffer((current) =>
        current?.offerId === payload.offerId ? null : current
      );
    }
  );

  useEffect(() => {
    if (!offer) return;
    const tick = () => {
      const remaining = Math.max(
        0,
        Math.round((new Date(offer.expiresAt).getTime() - Date.now()) / 1000)
      );
      setSecondsLeft(remaining);
      if (remaining === 0) setOffer(null);
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [offer]);

  function handleRespond(action: "accept" | "decline") {
    if (!offer) return;
    respond.mutate(
      { offerId: offer.offerId, action },
      { onSettled: () => setOffer(null) }
    );
  }

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {offer && (
        <motion.div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <motion.div
            className="w-full max-w-sm"
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          >
            <Card>
              <CardHeader>
                <CardTitle>New ride offer</CardTitle>
                <CardDescription>
                  {formatVehicleType(offer.vehicleType)} ·{" "}
                  {(offer.distanceMeters / 1000).toFixed(1)} km
                  {offer.scheduledStartAt &&
                    ` · ${new Date(offer.scheduledStartAt).toLocaleString("en-IN")}`}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5 text-sm">
                  <p className="flex items-center gap-2">
                    <span className="h-2 w-2 shrink-0 rounded-full bg-[hsl(142_71%_45%)]" />
                    {offer.pickup.lat.toFixed(5)}, {offer.pickup.lng.toFixed(5)}
                  </p>
                  <p className="flex items-center gap-2">
                    <MapPin className="h-3.5 w-3.5 shrink-0" />
                    {offer.dropoff.lat.toFixed(5)}, {offer.dropoff.lng.toFixed(5)}
                  </p>
                </div>

                <p className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Timer className="h-4 w-4" /> Expires in {secondsLeft}s
                </p>

                <div className="flex gap-2">
                  <Button
                    className="flex-1"
                    onClick={() => handleRespond("accept")}
                    disabled={respond.isPending}
                  >
                    {respond.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Accept"
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => handleRespond("decline")}
                    disabled={respond.isPending}
                  >
                    Decline
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
