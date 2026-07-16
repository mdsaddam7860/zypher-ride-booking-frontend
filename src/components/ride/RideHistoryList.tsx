"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp, MapPin, Search, SlidersHorizontal } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { FareBillingSummary } from "@/components/ride/FareBillingSummary";
import { ContactDetails } from "@/components/user/ContactDetails";
import { RideContactButtons } from "@/components/ride/RideContactButtons";
import { CopyButton } from "@/components/ui/copy-button";
import { ShareRideButton } from "@/components/ride/ShareRideButton";
import { reverseGeocode } from "@/lib/geocode";
import { useCancelRide } from "@/hooks/rider/useRiderRide";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { formatVehicleType } from "@/lib/utils";
import type { Ride, RideStatus } from "@/types";

interface AddressState {
  pickup?: string;
  dropoff?: string;
  loading: boolean;
}

type SortOrder = "newest" | "oldest";

const STATUS_FILTERS: { value: RideStatus | "all"; label: string }[] = [
  { value: "all", label: "All statuses" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
  { value: "pending_assignment", label: "Pending" },
  { value: "driver_assigned", label: "Assigned" },
  { value: "driver_accepted", label: "Accepted" },
  { value: "in_progress", label: "In progress" },
];

function rideTimestamp(ride: Ride): number {
  const raw = ride.completedAt ?? ride.cancelledAt ?? ride.createdAt;
  return raw ? new Date(raw).getTime() : 0;
}

function formatDateTime(value: string | null): string {
  return value ? new Date(value).toLocaleString("en-IN") : "—";
}

/** GET /api/rides/history rendered as cards — used on all three dashboards.
 *  Includes client-side search/filter/sort since ride history can grow long
 *  and there's no server-side query support for it yet. */
export function RideHistoryList({ rides }: { rides: Ride[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [addresses, setAddresses] = useState<Record<string, AddressState>>({});
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<RideStatus | "all">("all");
  const [sortOrder, setSortOrder] = useState<SortOrder>("newest");
  const cancelRide = useCancelRide();

  const debouncedSearch = useDebouncedValue(search, 250);

  const filteredRides = useMemo(() => {
    const query = debouncedSearch.trim().toLowerCase();
    let result = rides;

    if (statusFilter !== "all") {
      result = result.filter((ride) => ride.status === statusFilter);
    }
    if (query) {
      result = result.filter(
        (ride) =>
          ride.rideId.toLowerCase().includes(query) ||
          formatVehicleType(ride.vehicleType).toLowerCase().includes(query) ||
          (ride.notes ?? "").toLowerCase().includes(query)
      );
    }

    return [...result].sort((a, b) =>
      sortOrder === "newest"
        ? rideTimestamp(b) - rideTimestamp(a)
        : rideTimestamp(a) - rideTimestamp(b)
    );
  }, [rides, debouncedSearch, statusFilter, sortOrder]);

  if (rides.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed py-10 text-center">
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-muted">
          <MapPin className="h-5 w-5 text-muted-foreground" />
        </div>
        <p className="text-sm font-medium">No past rides yet</p>
        <p className="max-w-[22rem] text-xs text-muted-foreground">
          Completed and cancelled rides will show up here once you take your first trip.
        </p>
      </div>
    );
  }

  function toggle(ride: Ride) {
    const isOpen = expandedId === ride.rideId;
    setExpandedId(isOpen ? null : ride.rideId);

    if (!isOpen && !addresses[ride.rideId]) {
      setAddresses((prev) => ({ ...prev, [ride.rideId]: { loading: true } }));
      Promise.all([reverseGeocode(ride.pickup), reverseGeocode(ride.dropoff)])
        .then(([pickup, dropoff]) => {
          setAddresses((prev) => ({
            ...prev,
            [ride.rideId]: { pickup, dropoff, loading: false },
          }));
        })
        .catch(() => {
          setAddresses((prev) => ({
            ...prev,
            [ride.rideId]: { loading: false },
          }));
        });
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by ride ID, vehicle, or notes…"
            className="pl-9"
            aria-label="Search ride history"
          />
        </div>
        <Select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as RideStatus | "all")}
          className="sm:w-44"
          aria-label="Filter by status"
        >
          {STATUS_FILTERS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
        <Select
          value={sortOrder}
          onChange={(e) => setSortOrder(e.target.value as SortOrder)}
          className="sm:w-40"
          aria-label="Sort order"
        >
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
        </Select>
      </div>

      {filteredRides.length === 0 && (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed py-10 text-center">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-muted">
            <SlidersHorizontal className="h-5 w-5 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium">No rides match your filters</p>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearch("");
              setStatusFilter("all");
            }}
          >
            Clear filters
          </Button>
        </div>
      )}

      {filteredRides.map((ride) => {
        const isOpen = expandedId === ride.rideId;
        const addr = addresses[ride.rideId];

        return (
          <div
            key={ride.rideId}
            className="space-y-2 rounded-xl border p-3 text-sm"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-1">
                <p className="truncate font-medium">{ride.rideId.slice(0, 8)}…</p>
                <CopyButton
                  value={ride.rideId}
                  label=""
                  successLabel=""
                  toastMessage="Ride ID copied"
                  className="h-6 w-6 shrink-0 p-0"
                  aria-label="Copy full ride ID"
                />
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Badge
                  variant={
                    ride.status === "completed"
                      ? "success"
                      : ride.status === "cancelled"
                      ? "destructive"
                      : "secondary"
                  }
                >
                  {ride.status}
                </Badge>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 gap-1 px-2 text-xs"
                  onClick={() => toggle(ride)}
                  aria-expanded={isOpen}
                >
                  {isOpen ? "Hide details" : "View details"}
                  {isOpen ? (
                    <ChevronUp className="h-3.5 w-3.5" />
                  ) : (
                    <ChevronDown className="h-3.5 w-3.5" />
                  )}
                </Button>
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              {formatVehicleType(ride.vehicleType)} ·{" "}
              {ride.completedAt
                ? new Date(ride.completedAt).toLocaleString("en-IN")
                : ride.cancelledAt
                ? new Date(ride.cancelledAt).toLocaleString("en-IN")
                : new Date(ride.createdAt).toLocaleString("en-IN")}
            </p>
            {ride.cancelReason && (
              <p className="text-xs text-muted-foreground">
                Cancel reason: {ride.cancelReason}
              </p>
            )}

            <FareBillingSummary ride={ride} />

            {isOpen && (
              <div className="space-y-3 rounded-lg border bg-muted/20 p-3">
                <div className="space-y-2 text-xs">
                  <div className="flex items-start gap-2">
                    <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[hsl(142_71%_45%)]" />
                    <div className="min-w-0">
                      <p className="font-medium text-foreground">
                        Pickup (starting location)
                      </p>
                      <p className="truncate text-muted-foreground">
                        {addr?.loading ? (
                          <Skeleton className="h-3 w-40" />
                        ) : (
                          addr?.pickup ??
                          `${ride.pickup.lat.toFixed(
                            5
                          )}, ${ride.pickup.lng.toFixed(5)}`
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <MapPin className="mt-0.5 h-3 w-3 shrink-0 text-foreground" />
                    <div className="min-w-0">
                      <p className="font-medium text-foreground">
                        Drop-off (ending location)
                      </p>
                      <p className="truncate text-muted-foreground">
                        {addr?.loading ? (
                          <Skeleton className="h-3 w-40" />
                        ) : (
                          addr?.dropoff ??
                          `${ride.dropoff.lat.toFixed(
                            5
                          )}, ${ride.dropoff.lng.toFixed(5)}`
                        )}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs sm:grid-cols-3">
                  <div>
                    <p className="text-muted-foreground">Requested</p>
                    <p className="font-medium">
                      {formatDateTime(ride.createdAt)}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Scheduled</p>
                    <p className="font-medium">
                      {formatDateTime(ride.scheduledStartAt)}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Assigned</p>
                    <p className="font-medium">
                      {formatDateTime(ride.assignedAt)}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Accepted</p>
                    <p className="font-medium">
                      {formatDateTime(ride.acceptedAt)}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Started</p>
                    <p className="font-medium">
                      {formatDateTime(ride.startedAt)}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Completed</p>
                    <p className="font-medium">
                      {formatDateTime(ride.completedAt)}
                    </p>
                  </div>
                  {ride.cancelledAt && (
                    <div>
                      <p className="text-muted-foreground">Cancelled</p>
                      <p className="font-medium">
                        {formatDateTime(ride.cancelledAt)}
                        {ride.cancelledBy ? ` (by ${ride.cancelledBy})` : ""}
                      </p>
                    </div>
                  )}
                  <div>
                    <p className="text-muted-foreground">Distance</p>
                    <p className="font-medium">
                      {(ride.distanceMeters / 1000).toFixed(1)} km
                      {ride.isLongDistance ? " · Long distance" : ""}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Vehicle</p>
                    <p className="font-medium">
                      {formatVehicleType(ride.vehicleType)}
                    </p>
                  </div>
                </div>

                {ride.notes && (
                  <p className="text-xs">
                    <span className="text-muted-foreground">Notes: </span>
                    {ride.notes}
                  </p>
                )}

                <div className="flex flex-wrap items-center gap-2">
                  <RideContactButtons ride={ride} />
                  <ShareRideButton
                    rideId={ride.rideId}
                    status={ride.status}
                    vehicleType={formatVehicleType(ride.vehicleType)}
                  />
                  {ride.status !== "completed" && ride.status !== "cancelled" && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-destructive hover:text-destructive"
                      disabled={cancelRide.isPending && cancelRide.variables?.rideId === ride.rideId}
                      onClick={() =>
                        cancelRide.mutate({
                          rideId: ride.rideId,
                          reason: "Cancelled from ride history",
                        })
                      }
                    >
                      {cancelRide.isPending && cancelRide.variables?.rideId === ride.rideId
                        ? "Cancelling…"
                        : "Cancel ride"}
                    </Button>
                  )}
                </div>

                <div className="grid gap-2 sm:grid-cols-2">
                  <ContactDetails
                    userId={ride.riderId}
                    kind="rider"
                    label="Rider"
                  />
                  {ride.driverId && (
                    <ContactDetails
                      userId={ride.driverId}
                      kind="driver"
                      label="Driver"
                    />
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
