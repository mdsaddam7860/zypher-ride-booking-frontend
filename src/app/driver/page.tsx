"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { Car, Clock3, Loader2, LocateFixed, Navigation, Navigation2, Phone, ShieldAlert, User2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SkeletonRow } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RideStateLadder } from "@/components/ride/RideStateLadder";
import { FareBillingSummary } from "@/components/ride/FareBillingSummary";
import { RideHistoryList } from "@/components/ride/RideHistoryList";
import { ContactDetails } from "@/components/user/ContactDetails";
import { ProfilePanel } from "@/components/user/ProfilePanel";
import { RideOfferModal } from "@/components/ride/RideOfferModal";
import {
  useArriveRide,
  useCompleteRide,
  useDriverRides,
  useRespondToRide,
  useSetDriverStatus,
  useStartRide,
  useUpdateDriverLocation,
} from "@/hooks/driver/useDriverActions";
import { useCancelRide } from "@/hooks/rider/useRiderRide";
import { getApiErrorMessage } from "@/lib/api";
import { useMyProfile } from "@/hooks/useUserProfile";
import type { DriverProfile } from "@/hooks/useUserProfile";
import { formatVehicleType, haversineDistanceMeters } from "@/lib/utils";
import { fetchRouteSummary, googleMapsDirectionsUrl } from "@/lib/geocode";
import type { LatLng, Ride } from "@/types";

// Leaflet touches `window`, so the map itself must never render on the server.
const RideMap = dynamic(
  () => import("@/components/map/RideMap").then((mod) => mod.RideMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center bg-muted">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    ),
  }
);

/** One accepted/in-progress ride: state ladder, live route to pickup/drop-off, actions. */
function ActiveRideCard({
  ride,
  gpsLocation,
}: {
  ride: Ride;
  gpsLocation: LatLng | null;
}) {
  const [route, setRoute] = useState<LatLng[] | null>(null);
  const [distanceMeters, setDistanceMeters] = useState<number | null>(null);
  const [durationSeconds, setDurationSeconds] = useState<number | null>(null);
  const [showOtpEntry, setShowOtpEntry] = useState(false);
  const [otp, setOtp] = useState("");
  const arriveRide = useArriveRide();
  const startRide = useStartRide();
  const completeRide = useCompleteRide();
  const cancelRide = useCancelRide();

  // ~200m geofence, mirroring the backend's arrival check — this is only a
  // client-side hint to avoid a pointless tap-and-409; the server re-checks
  // for real. Generous by design since phone GPS commonly drifts 20-50m.
  const distanceToPickup =
    gpsLocation && ride.status === "driver_accepted"
      ? haversineDistanceMeters(gpsLocation, ride.pickup)
      : null;
  const isNearPickup = distanceToPickup === null || distanceToPickup <= 250;

  // Route: driver -> pickup right after accepting, then pickup -> drop-off
  // once the trip is under way. Also captures live distance/ETA for the
  // "Navigate" card below.
  const navTarget = ride.status === "in_progress" ? ride.dropoff : ride.pickup;
  const navOrigin = ride.status === "in_progress" ? ride.pickup : gpsLocation;
  useEffect(() => {
    if (!navOrigin) {
      setRoute(null);
      setDistanceMeters(null);
      setDurationSeconds(null);
      return;
    }
    const controller = new AbortController();
    fetchRouteSummary(navOrigin, navTarget, controller.signal).then((summary) => {
      setRoute(summary?.geometry ?? null);
      setDistanceMeters(summary?.distanceMeters ?? null);
      setDurationSeconds(summary?.durationSeconds ?? null);
    });
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navOrigin?.lat, navOrigin?.lng, navTarget.lat, navTarget.lng, ride.status]);

  return (
    <div className="space-y-4 rounded-lg border p-3">
      <RideStateLadder currentStatus={ride.status} />

      <div className="space-y-1 text-sm text-muted-foreground">
        <p>Vehicle: {formatVehicleType(ride.vehicleType)}</p>
        {ride.scheduledStartAt && (
          <p>
            Scheduled: {new Date(ride.scheduledStartAt).toLocaleString("en-IN")}
          </p>
        )}
        {ride.notes && <p>Notes: {ride.notes}</p>}
      </div>

      {/* Fare is visible to the driver; billing (payment method/status/refund)
          is rider/owner-only and simply won't be present here, so this guards itself. */}
      <FareBillingSummary ride={ride} />

      <ContactDetails userId={ride.riderId} kind="rider" label="Rider" />

      {ride.contact && (
        <a href={`tel:${ride.contact.riderPhone}`}>
          <Button variant="outline" size="sm" className="gap-2">
            <Phone className="h-3.5 w-3.5" /> Call rider
          </Button>
        </a>
      )}

      {ride.arrivedAt && (
        <p className="text-sm font-medium text-[hsl(var(--success))]">
          You marked arrival at{" "}
          {new Date(ride.arrivedAt).toLocaleTimeString("en-IN")}
        </p>
      )}

      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <Navigation className="h-3.5 w-3.5" />
            {ride.status === "in_progress" ? "Route to drop-off" : "Route to pickup"}
            {distanceMeters !== null && durationSeconds !== null && (
              <span className="font-mono text-foreground">
                · {(distanceMeters / 1000).toFixed(1)} km · {Math.max(1, Math.round(durationSeconds / 60))} min
              </span>
            )}
          </div>
          {gpsLocation && (
            <a
              href={googleMapsDirectionsUrl(gpsLocation, navTarget)}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button size="sm" variant="outline" className="gap-1.5">
                <Navigation2 className="h-3.5 w-3.5" /> Navigate
              </Button>
            </a>
          )}
        </div>
        <div className="h-80 w-full overflow-hidden rounded-md border-2 border-foreground">
          <RideMap
            pickup={ride.pickup}
            destination={
              ride.status === "in_progress" ? ride.dropoff : ride.pickup
            }
            route={route}
            activeField="pickup"
            onPick={() => {}}
            driverLocation={gpsLocation}
            readOnly
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {ride.status === "driver_accepted" && !ride.arrivedAt && (
          <div className="space-y-1.5">
            <Button
              onClick={() => arriveRide.mutate(ride.rideId)}
              disabled={arriveRide.isPending || !isNearPickup}
            >
              {arriveRide.isPending ? "Marking arrival…" : "I've arrived"}
            </Button>
            {!isNearPickup && distanceToPickup !== null && (
              <p className="text-xs text-muted-foreground">
                {Math.round(distanceToPickup)}m from pickup — get closer to mark arrival.
              </p>
            )}
          </div>
        )}
        {ride.status === "driver_accepted" && !showOtpEntry && (
          <Button
            variant={ride.arrivedAt ? "default" : "outline"}
            onClick={() => setShowOtpEntry(true)}
          >
            Start ride
          </Button>
        )}
        {ride.status === "in_progress" && (
          <Button
            onClick={() => completeRide.mutate(ride.rideId)}
            disabled={completeRide.isPending}
          >
            Complete ride
          </Button>
        )}
        {ride.status !== "completed" && ride.status !== "cancelled" && (
          <Button
            variant="outline"
            className="text-destructive hover:text-destructive"
            onClick={() =>
              cancelRide.mutate({ rideId: ride.rideId, reason: "Driver cancelled from console" })
            }
            disabled={cancelRide.isPending}
          >
            {cancelRide.isPending ? "Cancelling…" : "Cancel ride"}
          </Button>
        )}
      </div>

      {ride.status === "driver_accepted" && showOtpEntry && (
        <div className="flex flex-wrap items-end gap-2 rounded-md border bg-muted/30 p-3">
          <div className="space-y-1.5">
            <Label htmlFor={`otp-${ride.rideId}`}>Rider's OTP</Label>
            <Input
              id={`otp-${ride.rideId}`}
              inputMode="numeric"
              maxLength={4}
              placeholder="1234"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 4))}
              className="w-24 text-center text-lg tracking-[0.3em]"
              autoFocus
            />
          </div>
          <Button
            onClick={() =>
              startRide.mutate(
                { rideId: ride.rideId, otp },
                { onSuccess: () => setShowOtpEntry(false) }
              )
            }
            disabled={startRide.isPending || otp.length !== 4}
          >
            {startRide.isPending ? "Starting…" : "Confirm & start"}
          </Button>
          <Button variant="ghost" onClick={() => setShowOtpEntry(false)}>
            Cancel
          </Button>
        </div>
      )}

      {(arriveRide.isError || startRide.isError || completeRide.isError) && (
        <p className="text-sm text-destructive">
          {getApiErrorMessage(
            arriveRide.error ?? startRide.error ?? completeRide.error
          )}
        </p>
      )}
    </div>
  );
}

function formatLatLng(location: LatLng): string {
  return `${location.lat.toFixed(5)}, ${location.lng.toFixed(5)}`;
}

function LiveRideTab() {
  const [isOnline, setIsOnline] = useState(false);
  const [gpsLocation, setGpsLocation] = useState<LatLng | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [isGpsActive, setIsGpsActive] = useState(false);
  const lastSentAt = useRef(0);

  const setStatus = useSetDriverStatus();
  const updateLocation = useUpdateDriverLocation();
  const rides = useDriverRides();
  const respond = useRespondToRide();
  const profile = useMyProfile();
  const driverProfile = profile.data as DriverProfile | undefined;
  // Undefined (older backend / still loading) defaults to true so this
  // doesn't regress environments that don't send isActive yet — only an
  // explicit `false` blocks the driver from going online.
  const isActive = driverProfile?.isActive !== false;

  // Auto-lock to "available" the moment the console loads, rather than
  // waiting for the driver to click "Go online" — but only once we know
  // the driver is actually verified, otherwise this would just 409 loop.
  useEffect(() => {
    if (profile.isLoading || !isActive) return;
    setStatus.mutate("available", { onSuccess: () => setIsOnline(true) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile.isLoading, isActive]);

  function toggleOnline() {
    if (!isActive) return;
    const next = isOnline ? "offline" : "available";
    setStatus.mutate(next, {
      onSuccess: () => setIsOnline(next === "available"),
    });
  }

  // Continuous GPS broadcast: while online, watch the browser's real
  // position and push it to the backend every ~5s. This is a separate 5s
  // loop from the ride-list poll below (different data, different reason to
  // exist) — not duplicated polling of the same thing.
  useEffect(() => {
    if (!isOnline) {
      setIsGpsActive(false);
      return;
    }
    if (!navigator.geolocation) {
      setGpsError("Your browser doesn't support geolocation");
      return;
    }

    setGpsError(null);
    setIsGpsActive(true);

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const next: LatLng = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        setGpsLocation(next);

        const now = Date.now();
        if (now - lastSentAt.current >= 5000) {
          lastSentAt.current = now;
          updateLocation.mutate(next);
        }
      },
      () => {
        setGpsError(
          "Couldn't get your GPS location — check browser location permissions"
        );
        setIsGpsActive(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnline]);

  const allRides = rides.data ?? [];
  const assignedRides = allRides.filter((r) => r.status === "driver_assigned");
  const activeRides = allRides.filter(
    (r) => r.status === "driver_accepted" || r.status === "in_progress"
  );

  return (
    <div className="space-y-6">
      {!profile.isLoading && !isActive && (
        <div className="flex flex-col items-start gap-3 rounded-lg border border-warning/30 bg-warning/10 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-2">
            <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-warning" />
            <div>
              <p className="text-sm font-medium">Verification required</p>
              <p className="text-sm text-muted-foreground">
                Submit your documents for verification before you can go online or accept rides.
              </p>
            </div>
          </div>
          <Link href="/driver/documents">
            <Button size="sm">Complete your profile</Button>
          </Link>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Availability</CardTitle>
          <CardDescription>
            {isActive
              ? "You're set to available automatically when you sign in."
              : "Unlocks once your documents are verified."}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-4">
          <Badge variant={isOnline ? "success" : "secondary"}>
            {isOnline ? "Available" : "Offline"}
          </Badge>
          <Button
            variant={isOnline ? "outline" : "default"}
            onClick={toggleOnline}
            disabled={setStatus.isPending || !isActive}
            title={!isActive ? "Submit documents for verification first" : undefined}
          >
            {isOnline ? "Go offline" : "Go online"}
          </Button>
          {isGpsActive && gpsLocation && (
            <span className="inline-flex items-center gap-1 text-sm font-medium text-[hsl(var(--success))]">
              <LocateFixed className="h-3.5 w-3.5" /> Live GPS (
              {formatLatLng(gpsLocation)}) — broadcasting every 5s
            </span>
          )}
          {gpsError && (
            <p className="w-full text-sm text-destructive">{gpsError}</p>
          )}
        </CardContent>
      </Card>

      {isOnline && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LocateFixed className="h-4 w-4" /> Your location
            </CardTitle>
            <CardDescription>
              Streams to the dispatch system every 5 seconds while you&apos;re online.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {gpsLocation ? (
              <div className="h-64 w-full overflow-hidden rounded-md border-2 border-foreground">
                <RideMap
                  pickup={null}
                  destination={null}
                  route={null}
                  activeField="pickup"
                  onPick={() => {}}
                  driverLocation={gpsLocation}
                  readOnly
                />
              </div>
            ) : (
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Acquiring GPS signal…
              </p>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Assigned rides</CardTitle>
          <CardDescription>
            Auto-checked every 5 seconds — no ride ID to paste in. You can be
            assigned more than one ride at a time as long as their scheduled
            windows don&apos;t overlap, so accept or deny each below.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {rides.isLoading && (
            <p className="text-sm text-muted-foreground">
              Checking for assignments…
            </p>
          )}
          {rides.isError && (
            <p className="text-sm text-destructive">
              {getApiErrorMessage(rides.error)}
            </p>
          )}
          {rides.data && assignedRides.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No rides waiting on your response right now.
            </p>
          )}
          {assignedRides.map((ride) => (
            <div
              key={ride.rideId}
              className="space-y-2 rounded-lg border p-3 text-sm"
            >
              <div className="flex items-center justify-between">
                <p className="font-medium">{ride.rideId.slice(0, 8)}…</p>
                <Badge variant="secondary">
                  {formatVehicleType(ride.vehicleType)}
                </Badge>
              </div>
              {ride.scheduledStartAt && (
                <p className="text-xs text-muted-foreground">
                  Scheduled:{" "}
                  {new Date(ride.scheduledStartAt).toLocaleString("en-IN")}
                </p>
              )}
              <FareBillingSummary ride={ride} />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  disabled={respond.isPending}
                  onClick={() =>
                    respond.mutate({ rideId: ride.rideId, action: "accept" })
                  }
                >
                  Accept
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={respond.isPending}
                  onClick={() =>
                    respond.mutate({ rideId: ride.rideId, action: "deny" })
                  }
                >
                  Deny
                </Button>
              </div>
            </div>
          ))}
          {respond.isError && (
            <p className="text-sm text-destructive">
              {getApiErrorMessage(respond.error)}
            </p>
          )}
        </CardContent>
      </Card>

      {activeRides.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>
              Active ride{activeRides.length > 1 ? "s" : ""}
            </CardTitle>
            <CardDescription>
              Automatically tracked — no lookup needed, updates every 5 seconds.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {activeRides.map((ride) => (
              <ActiveRideCard
                key={ride.rideId}
                ride={ride}
                gpsLocation={gpsLocation}
              />
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function PastRidesTab() {
  const rides = useDriverRides();
  const pastRides = (rides.data ?? []).filter(
    (r) => r.status === "completed" || r.status === "cancelled"
  );

  return (
    <div>
      <h2 className="mb-4 text-lg font-semibold">Past rides</h2>
      {rides.isLoading && (
        <div className="space-y-2" aria-busy="true" aria-label="Loading past rides">
          <SkeletonRow />
          <SkeletonRow />
          <SkeletonRow />
        </div>
      )}
      {rides.isError && (
        <p className="text-sm text-destructive">
          {getApiErrorMessage(rides.error)}
        </p>
      )}
      {rides.data && <RideHistoryList rides={pastRides} />}
    </div>
  );
}

export default function DriverDashboardPage() {
  return (
    <div className="space-y-6">
      <RideOfferModal />

      <div>
        <p className="font-mono text-[11px] font-medium uppercase tracking-[0.2em] text-primary">
          Zypher · Driver
        </p>
        <h1 className="font-display text-3xl font-semibold leading-tight tracking-tight">
          Driver console
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage availability and respond to ride assignments.
        </p>
      </div>

      <Tabs defaultValue="live">
        <TabsList className="hidden sm:inline-flex">
          <TabsTrigger value="live">Live</TabsTrigger>
          <TabsTrigger value="history">Past rides</TabsTrigger>
          <TabsTrigger value="profile">Profile</TabsTrigger>
        </TabsList>
        <TabsList variant="bottomNav" className="sm:hidden">
          <TabsTrigger value="live" icon={<Car className="h-5 w-5" />}>
            Live
          </TabsTrigger>
          <TabsTrigger value="history" icon={<Clock3 className="h-5 w-5" />}>
            Past rides
          </TabsTrigger>
          <TabsTrigger value="profile" icon={<User2 className="h-5 w-5" />}>
            Profile
          </TabsTrigger>
        </TabsList>
        <TabsContent value="live" className="pb-20 sm:pb-0">
          <LiveRideTab />
        </TabsContent>
        <TabsContent value="history" className="pb-20 sm:pb-0">
          <PastRidesTab />
        </TabsContent>
        <TabsContent value="profile" className="pb-20 sm:pb-0">
          <ProfilePanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}
