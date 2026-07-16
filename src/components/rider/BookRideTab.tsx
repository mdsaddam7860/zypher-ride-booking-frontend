"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  Car,
  Clock3,
  KeyRound,
  Loader2,
  MapPin,
  Phone,
  Route as RouteIcon,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CopyButton } from "@/components/ui/copy-button";
import { useMyProfile } from "@/hooks/useUserProfile";
import type { RiderProfile } from "@/hooks/useUserProfile";
import { LocationSearchField } from "@/components/map/LocationSearchField";
import { RideStateLadder } from "@/components/ride/RideStateLadder";
import { VehicleCatalog } from "@/components/ride/VehicleCatalog";
import { FareBillingSummary } from "@/components/ride/FareBillingSummary";
import { ContactDetails } from "@/components/user/ContactDetails";
import {
  useCancelRide,
  useConfirmPayment,
  useCreateFare,
  useRequestRide,
  useRide,
  useRideStatusSocket,
} from "@/hooks/rider/useRiderRide";
import { fetchRoute, reverseGeocode } from "@/lib/geocode";
import { getApiErrorMessage } from "@/lib/api";
import { useSessionStore } from "@/store/useSessionStore";
import { useRideStore } from "@/store/useRideStore";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { cn, estimateRefundPercent, formatInr } from "@/lib/utils";
import type { BookingType, LatLng, PaymentMethod, VehicleType } from "@/types";
import type { ActiveField } from "@/components/map/RideMap";
import axios from "axios";

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

/** "now" formatted for an <input type="datetime-local"> in the browser's local time. */
function nowForDatetimeLocal(): string {
  const d = new Date(Date.now() + 5 * 60 * 1000); // a few minutes of buffer so "now" doesn't fail the future-time check
  d.setSeconds(0, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

export function BookRideTab() {
  const { t } = useTranslation();

  // Pickup/drop-off/vehicle selection lives in the shared ride draft store
  // (see src/store/useRideStore.ts) rather than local useState, so it
  // survives switching over to the Home tab and back.
  const pickup = useRideStore((s) => s.pickup);
  const pickupLabel = useRideStore((s) => s.pickupLabel);
  const destination = useRideStore((s) => s.destination);
  const destinationLabel = useRideStore((s) => s.destinationLabel);
  const activeField = useRideStore((s) => s.activeField);
  const selectedCar = useRideStore((s) => s.selectedCar);
  const setPickup = useRideStore((s) => s.setPickup);
  const setPickupLabel = useRideStore((s) => s.setPickupLabel);
  const setDestination = useRideStore((s) => s.setDestination);
  const setDestinationLabel = useRideStore((s) => s.setDestinationLabel);
  const setActiveFieldStore = useRideStore((s) => s.setActiveField);
  const setSelectedCar = useRideStore((s) => s.setSelectedCar);
  const resetDraft = useRideStore((s) => s.resetDraft);
  const focusPickupToken = useRideStore((s) => s.focusPickupToken);

  const [route, setRoute] = useState<LatLng[] | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const rideId = useSessionStore((s) => s.activeRideId);
  const setRideId = useSessionStore((s) => s.setActiveRideId);
  const vehicleType: VehicleType = selectedCar.vehicleType;
  const [scheduledStartAt, setScheduledStartAt] = useState(nowForDatetimeLocal);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [bookingType, setBookingType] = useState<BookingType>("now");
  const [notes, setNotes] = useState("");
  const [activeRideConflict, setActiveRideConflict] = useState(false);

  const pickupInputRef = useRef<HTMLInputElement>(null);

  const createFare = useCreateFare();
  const requestRide = useRequestRide();
  const cancelRide = useCancelRide();
  const profile = useMyProfile();
  const riderProfile = profile.data as RiderProfile | undefined;
  const confirmPayment = useConfirmPayment();
  const rideQuery = useRide(rideId);
  useRideStatusSocket(rideId);

  const lastFareKey = useRef<string | null>(null);

  // Focus the pickup field whenever the Home tab's "Where to?" trigger (or
  // any future caller) bumps focusPickupToken — including the very first
  // render if it was requested just before this tab mounted.
  useEffect(() => {
    if (focusPickupToken > 0) {
      pickupInputRef.current?.focus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusPickupToken]);

  // Any time the pickup pin, drop-off pin, or vehicle type changes, a
  // previously fetched fare estimate is stale (price depends on all three)
  // — clear it so the rider re-estimates before requesting.
  useEffect(() => {
    const key =
      pickup && destination
        ? `${pickup.lat},${pickup.lng}-${destination.lat},${destination.lng}-${vehicleType}`
        : null;
    if (lastFareKey.current !== null && lastFareKey.current !== key) {
      createFare.reset();
    }
    lastFareKey.current = key;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pickup, destination, vehicleType]);

  // Draw a live route line once both points are set.
  useEffect(() => {
    if (!pickup || !destination) {
      setRoute(null);
      return;
    }
    const controller = new AbortController();
    fetchRoute(pickup, destination, controller.signal).then(setRoute);
    return () => controller.abort();
  }, [pickup, destination]);

  // Auto-fetch the rider's current location as pickup on load, instead of
  // making them tap "use my location" — falls back silently to manual
  // search/pin-drop if permission is denied. Only do this the first time
  // the tab is used in this session (i.e. no pickup pin yet); otherwise a
  // rider who already picked a location and hopped over to Home would have
  // it silently overwritten when they come back.
  useEffect(() => {
    if (!pickup) {
      handleUseCurrentLocation();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleMapPick(field: ActiveField, location: LatLng) {
    if (field === "pickup") {
      setPickup(location, "Locating address…");
      reverseGeocode(location).then((label) => setPickupLabel(label));
    } else {
      setDestination(location, "Locating address…");
      reverseGeocode(location).then((label) => setDestinationLabel(label));
    }
  }

  function handleUseCurrentLocation() {
    if (!navigator.geolocation) {
      setLocationError("Your browser doesn't support geolocation");
      return;
    }
    setIsLocating(true);
    setLocationError(null);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const location: LatLng = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        setPickup(location, "Locating address…");
        try {
          const label = await reverseGeocode(location);
          setPickupLabel(label);
        } finally {
          setIsLocating(false);
        }
      },
      () => {
        setLocationError(
          "Couldn't get your location — check browser permissions"
        );
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  function handleGetEstimate() {
    if (!pickup || !destination) return;
    createFare.mutate({
      pickupLocation: pickup,
      destination,
      pickupAddress: pickupLabel,
      destinationAddress: destinationLabel,
      vehicleType,
    });
  }

  function handleRequestRide() {
    if (!createFare.data) return;
    setActiveRideConflict(false);
    requestRide.mutate(
      {
        fareId: createFare.data.fareId,
        scheduledStartAt: new Date(scheduledStartAt).toISOString(),
        paymentMethod,
        bookingType,
        notes: notes.trim() || undefined,
      },
      {
        onSuccess: (ride) => setRideId(ride.rideId),
        onError: (error) => {
          if (axios.isAxiosError(error) && error.response?.status === 409) {
            setActiveRideConflict(true);
          }
        },
      }
    );
  }

  function handleBookAnother() {
    setRideId(null);
    createFare.reset();
    requestRide.reset();
    confirmPayment.reset();
    setActiveRideConflict(false);
    setScheduledStartAt(nowForDatetimeLocal());
    setBookingType("now");
    resetDraft();
  }

  const canEstimate = !!pickup && !!destination;
  const ride = rideQuery.data;
  const isRideOver = ride
    ? ["completed", "cancelled"].includes(ride.status)
    : false;
  const needsPayment =
    !!ride &&
    ride.billing?.paymentMethod === "advance" &&
    ride.billing.paymentStatus === "pending";
  const paymentFailed = !!ride && ride.billing?.paymentStatus === "failed";
  const refundPreviewPercent = ride
    ? estimateRefundPercent(ride.scheduledStartAt)
    : 0;

  return (
    <div className="flex h-full w-full flex-col overflow-y-auto bg-background text-foreground lg:flex-row lg:overflow-hidden">
      {/* Left panel: search + booking flow */}
      <div className="stagger-in flex w-full shrink-0 flex-col border-b-2 border-foreground bg-card lg:max-w-md lg:border-b-0 lg:border-r-2">
        <div className="border-b-2 border-foreground px-5 py-5">
          <p className="font-mono text-[11px] font-medium uppercase tracking-[0.2em] text-primary">
            Zypher · Book
          </p>
          <h1 className="font-display text-3xl font-semibold leading-none tracking-tight">
            {t("rider.form.title")}
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">{t("rider.form.subtitle")}</p>
        </div>

        <div className="space-y-3 border-b border-border px-5 py-4">
          <LocationSearchField
            label="Pickup"
            placeholder="Search pickup location"
            value={pickupLabel}
            onValueChange={setPickupLabel}
            onSelect={(location, label) => setPickup(location, label)}
            active={activeField === "pickup"}
            onFocusField={() => setActiveFieldStore("pickup")}
            dotColorClassName="bg-[hsl(var(--success))]"
            showUseCurrentLocation
            onUseCurrentLocation={handleUseCurrentLocation}
            locating={isLocating}
            inputRef={pickupInputRef}
          />
          <LocationSearchField
            label="Drop-off"
            placeholder="Search destination"
            value={destinationLabel}
            onValueChange={setDestinationLabel}
            onSelect={(location, label) => setDestination(location, label)}
            active={activeField === "destination"}
            onFocusField={() => setActiveFieldStore("destination")}
            dotColorClassName="bg-foreground"
          />
          {locationError && (
            <p className="text-xs text-destructive">{locationError}</p>
          )}
          <p className="text-xs text-muted-foreground">
            Tip: tap the map to drop a pin for the{" "}
            {activeField === "pickup" ? "pickup" : "drop-off"} point, or drag a
            marker to fine-tune it.
          </p>
        </div>

        <div className="px-5 py-4 lg:flex-1 lg:overflow-y-auto">
          {!rideId && (
            <div className="space-y-4">
              {/* Vehicle must be chosen before the price is shown — fare depends on it. */}
              <VehicleCatalog
                selectedCarId={selectedCar.id}
                onSelect={setSelectedCar}
                disabled={createFare.isPending}
              />

              <Button
                className="w-full"
                size="lg"
                disabled={!canEstimate || createFare.isPending}
                onClick={handleGetEstimate}
              >
                {createFare.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Getting fare…
                  </>
                ) : (
                  "See fare estimate"
                )}
              </Button>

              {createFare.isError && (
                <p className="text-sm text-destructive">
                  {getApiErrorMessage(createFare.error)}
                </p>
              )}

              {createFare.data && (
                <div className="space-y-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Your ride
                  </p>
                  <div className="flex items-center gap-3 rounded-xl border-2 border-foreground bg-muted/40 p-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-foreground text-background">
                      <Car className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold">
                        {selectedCar.make} {selectedCar.model} · {selectedCar.seats} seats
                      </p>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <RouteIcon className="h-3 w-3" />
                          {(createFare.data.distanceMeters / 1000).toFixed(
                            1
                          )}{" "}
                          km
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock3 className="h-3 w-3" />
                          {Math.max(
                            1,
                            Math.round(createFare.data.durationSeconds / 60)
                          )}{" "}
                          min
                        </span>
                        {createFare.data.isLongDistance && (
                          <span>· Long distance</span>
                        )}
                      </div>
                    </div>
                    <p className="shrink-0 text-sm font-semibold">
                      {formatInr(createFare.data.estimatedPrice)}
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      When
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {(
                        [
                          { value: "now", label: "Ride now" },
                          { value: "scheduled", label: "Schedule for later" },
                        ] as { value: BookingType; label: string }[]
                      ).map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => {
                            setBookingType(option.value);
                            if (option.value === "now")
                              setScheduledStartAt(nowForDatetimeLocal());
                          }}
                          className={cn(
                            "rounded-xl border-2 p-2.5 text-sm font-medium transition-colors",
                            bookingType === option.value
                              ? "border-foreground bg-muted/40"
                              : "border-border hover:border-foreground/40"
                          )}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {bookingType === "scheduled" && (
                    <div className="space-y-1.5">
                      <Label htmlFor="scheduledStartAt">Pickup time</Label>
                      <Input
                        id="scheduledStartAt"
                        type="datetime-local"
                        value={scheduledStartAt}
                        min={nowForDatetimeLocal()}
                        onChange={(e) => setScheduledStartAt(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">
                        Pick a future pickup time.
                      </p>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Payment method
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {(["cash", "advance"] as PaymentMethod[]).map(
                        (method) => (
                          <button
                            key={method}
                            type="button"
                            onClick={() => setPaymentMethod(method)}
                            className={cn(
                              "rounded-xl border-2 p-2.5 text-sm font-medium capitalize transition-colors",
                              paymentMethod === method
                                ? "border-foreground bg-muted/40"
                                : "border-border hover:border-foreground/40"
                            )}
                          >
                            {method === "advance" ? "Pay in advance" : "Cash"}
                          </button>
                        )
                      )}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="notes">Notes (optional)</Label>
                    <Input
                      id="notes"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="e.g. call on arrival"
                    />
                  </div>

                  <Button
                    className="w-full"
                    size="lg"
                    disabled={requestRide.isPending}
                    onClick={handleRequestRide}
                  >
                    {requestRide.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" /> Requesting…
                      </>
                    ) : (
                      `Confirm ${selectedCar.model}`
                    )}
                  </Button>

                  {activeRideConflict && (
                    <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                      <span>
                        You already have an active ride. Check the &ldquo;My
                        ride&rdquo; view to manage it before booking another.
                      </span>
                    </div>
                  )}
                  {requestRide.isError && !activeRideConflict && (
                    <p className="text-sm text-destructive">
                      {getApiErrorMessage(requestRide.error)}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {rideId && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold">Your ride</p>
                  <div className="flex items-center gap-1">
                    <p className="text-xs text-muted-foreground">
                      Ride ID: {rideId.slice(0, 8)}…
                    </p>
                    <CopyButton
                      value={rideId}
                      label=""
                      successLabel=""
                      toastMessage="Ride ID copied"
                      className="h-5 w-5 shrink-0 p-0"
                      aria-label="Copy full ride ID"
                    />
                  </div>
                </div>
                {isRideOver && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleBookAnother}
                  >
                    Book another
                  </Button>
                )}
              </div>

              {ride && <RideStateLadder currentStatus={ride.status} />}

              {ride?.status === "pending_assignment" &&
                ride.bookingType === "now" && (
                  <p className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" /> Finding your
                    driver…
                  </p>
                )}

              {ride?.status === "driver_accepted" && (
                <p
                  className={cn(
                    "text-sm font-medium",
                    ride.arrivedAt
                      ? "text-[hsl(var(--success))]"
                      : "text-muted-foreground"
                  )}
                >
                  {ride.arrivedAt
                    ? `Your driver has arrived — head to pickup (${new Date(
                        ride.arrivedAt
                      ).toLocaleTimeString("en-IN")})`
                    : "Driver en route to pickup"}
                </p>
              )}

              {(ride?.status === "driver_assigned" || ride?.status === "driver_accepted") &&
                riderProfile?.rideOtp && (
                  <div className="flex items-center justify-between gap-3 rounded-xl border border-primary/30 bg-primary/5 p-3">
                    <div className="flex items-center gap-2.5">
                      <KeyRound className="h-4 w-4 shrink-0 text-primary" />
                      <div>
                        <p className="text-xs text-muted-foreground">
                          Share this OTP with your driver to start the ride
                        </p>
                        <p className="font-mono text-2xl font-semibold tracking-[0.4em]">
                          {riderProfile.rideOtp}
                        </p>
                      </div>
                    </div>
                    <CopyButton
                      value={riderProfile.rideOtp}
                      label=""
                      successLabel=""
                      toastMessage="OTP copied"
                      className="h-8 w-8 shrink-0 p-0"
                      aria-label="Copy OTP"
                    />
                  </div>
                )}

              <div className="space-y-2 rounded-xl border bg-muted/40 p-3 text-sm">
                <div className="flex items-start gap-2">
                  <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-[hsl(var(--success))]" />
                  <span className="truncate text-muted-foreground">
                    {pickupLabel || "Pickup"}
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-foreground" />
                  <span className="truncate text-muted-foreground">
                    {destinationLabel || "Destination"}
                  </span>
                </div>
                {ride?.scheduledStartAt && (
                  <p className="text-xs text-muted-foreground">
                    Scheduled:{" "}
                    {new Date(ride.scheduledStartAt).toLocaleString("en-IN")}
                  </p>
                )}
                {ride?.notes && (
                  <p className="text-xs text-muted-foreground">
                    Notes: {ride.notes}
                  </p>
                )}
              </div>

              {ride && <FareBillingSummary ride={ride} />}

              {ride?.driverId && (
                <ContactDetails
                  userId={ride.driverId}
                  kind="driver"
                  label="Driver"
                />
              )}

              {ride?.contact && (
                <a href={`tel:${ride.contact.driverPhone}`}>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Phone className="h-3.5 w-3.5" /> Call driver
                  </Button>
                </a>
              )}

              {needsPayment && (
                <div className="space-y-2 rounded-xl border border-primary/40 bg-primary/5 p-3">
                  <p className="text-sm font-semibold">Payment pending</p>
                  <p className="text-xs text-muted-foreground">
                    You chose to pay in advance. Confirm payment to lock in your
                    ride.
                  </p>
                  <Button
                    className="w-full"
                    size="sm"
                    onClick={() => confirmPayment.mutate(ride!.rideId)}
                    disabled={confirmPayment.isPending}
                  >
                    {confirmPayment.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" /> Processing…
                      </>
                    ) : (
                      "Pay Now"
                    )}
                  </Button>
                  {confirmPayment.isError && (
                    <p className="text-xs text-destructive">
                      {getApiErrorMessage(confirmPayment.error)}
                    </p>
                  )}
                </div>
              )}

              {paymentFailed && (
                <div className="space-y-2 rounded-xl border border-destructive/30 bg-destructive/10 p-3">
                  <p className="text-sm font-semibold text-destructive">
                    Payment failed
                  </p>
                  <Button
                    className="w-full"
                    size="sm"
                    onClick={() => confirmPayment.mutate(ride!.rideId)}
                    disabled={confirmPayment.isPending}
                  >
                    Retry payment
                  </Button>
                </div>
              )}

              {ride && !isRideOver && (
                <div className="space-y-2">
                  {ride.billing?.paymentMethod === "advance" &&
                    ride.billing.paymentStatus === "paid" && (
                      <p className="text-xs text-muted-foreground">
                        Estimated refund if you cancel now:{" "}
                        {refundPreviewPercent}% (100% ≥24h before pickup, 75%
                        12–24h before, 50% under 12h, 0% after departure).
                      </p>
                    )}
                  <Button
                    variant="destructive"
                    size="sm"
                    className="w-full"
                    onClick={() =>
                      cancelRide.mutate({
                        rideId,
                        reason: "Rider cancelled from dashboard",
                      })
                    }
                    disabled={cancelRide.isPending}
                  >
                    {cancelRide.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" /> Cancelling…
                      </>
                    ) : (
                      <>
                        <X className="h-4 w-4" /> Cancel ride
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Map: fixed-height preview on mobile (stacked below the form), fills
          the remaining space beside the form at lg+ */}
      <div className="relative h-72 w-full shrink-0 sm:h-96 lg:h-full lg:flex-1">
        <RideMap
          pickup={pickup}
          destination={destination}
          route={route}
          activeField={activeField}
          onPick={handleMapPick}
        />

        <div className="pointer-events-none absolute left-4 top-4 flex gap-2">
          <button
            type="button"
            onClick={() => setActiveFieldStore("pickup")}
            className={cn(
              "pointer-events-auto rounded-full border px-3 py-1.5 text-xs font-semibold shadow-sm backdrop-blur transition-colors",
              activeField === "pickup"
                ? "bg-foreground text-background"
                : "bg-background/90 text-foreground"
            )}
          >
            Setting pickup
          </button>
          <button
            type="button"
            onClick={() => setActiveFieldStore("destination")}
            className={cn(
              "pointer-events-auto rounded-full border px-3 py-1.5 text-xs font-semibold shadow-sm backdrop-blur transition-colors",
              activeField === "destination"
                ? "bg-foreground text-background"
                : "bg-background/90 text-foreground"
            )}
          >
            Setting drop-off
          </button>
        </div>
      </div>
    </div>
  );
}
