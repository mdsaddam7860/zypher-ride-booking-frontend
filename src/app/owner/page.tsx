"use client";

import { useState } from "react";
import axios from "axios";
import { AlertTriangle, Clock3, Gauge, Loader2, ShieldCheck, User2 } from "lucide-react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { VehicleTypeToggle } from "@/components/ride/VehicleTypeToggle";
import { FareBillingSummary } from "@/components/ride/FareBillingSummary";
import { AuditTrail } from "@/components/ride/AuditTrail";
import { RideHistoryList } from "@/components/ride/RideHistoryList";
import { ContactDetails } from "@/components/user/ContactDetails";
import { RideContactButtons } from "@/components/ride/RideContactButtons";
import { ProfilePanel } from "@/components/user/ProfilePanel";
import { OwnerDriverDocumentsReview } from "@/components/owner/OwnerDriverDocumentsReview";
import {
  useAssignDriver,
  useAvailableDrivers,
  useEditRide,
  useNearbyDrivers,
  useOwnerDispatchSocket,
  useOwnerRideHistory,
  useOwnerRides,
  usePendingRides,
  useRideAudit,
} from "@/hooks/owner/useOwnerDispatch";
import { useCancelRide } from "@/hooks/rider/useRiderRide";
import { getApiErrorMessage } from "@/lib/api";
import { formatVehicleType } from "@/lib/utils";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { SkeletonRow, Skeleton } from "@/components/ui/skeleton";
import type { Ride, RideStatus, VehicleType } from "@/types";

const STATUS_TABS: { value: RideStatus | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "pending_assignment", label: "Pending" },
  { value: "driver_assigned", label: "Assigned" },
  { value: "driver_accepted", label: "Accepted" },
  { value: "in_progress", label: "In progress" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

function EditRideForm({ ride, onDone }: { ride: Ride; onDone: () => void }) {
  const [vehicleType, setVehicleType] = useState<VehicleType>(
    ride.vehicleType ?? "4_seater"
  );
  const [notes, setNotes] = useState(ride.notes ?? "");
  const editRide = useEditRide();

  return (
    <div className="space-y-3 rounded-md border bg-muted/30 p-3">
      <VehicleTypeToggle
        value={vehicleType}
        onChange={setVehicleType}
        disabled={editRide.isPending}
      />
      <div className="space-y-1.5">
        <Label htmlFor={`notes-${ride.rideId}`}>Notes</Label>
        <Input
          id={`notes-${ride.rideId}`}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>
      <div className="flex gap-2">
        <Button
          size="sm"
          disabled={editRide.isPending}
          onClick={() =>
            editRide.mutate(
              { rideId: ride.rideId, patch: { vehicleType, notes } },
              { onSuccess: onDone }
            )
          }
        >
          {editRide.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            "Save changes"
          )}
        </Button>
        <Button size="sm" variant="outline" onClick={onDone}>
          Cancel
        </Button>
      </div>
      {editRide.isError && (
        <p className="text-sm text-destructive">
          {getApiErrorMessage(editRide.error)}
        </p>
      )}
    </div>
  );
}

function OwnerRidesTable({ status }: { status: RideStatus | "all" }) {
  const [selectedRideId, setSelectedRideId] = useState<string | null>(null);
  const [driverScope, setDriverScope] = useState<"available" | "nearby">(
    "available"
  );
  const [editingRideId, setEditingRideId] = useState<string | null>(null);
  const [auditRideId, setAuditRideId] = useState<string | null>(null);
  const [contactRideId, setContactRideId] = useState<string | null>(null);
  const [assignConflict, setAssignConflict] = useState<string | null>(null);

  const rides = useOwnerRides(status === "all" ? undefined : status);
  const cancelRide = useCancelRide();
  const availableDrivers = useAvailableDrivers();
  const nearbyDrivers = useNearbyDrivers(
    driverScope === "nearby" ? selectedRideId : null
  );
  const assignDriver = useAssignDriver();
  const audit = useRideAudit(auditRideId);

  const drivers = driverScope === "nearby" ? nearbyDrivers : availableDrivers;

  function handleAssign(rideId: string, driverId: string) {
    setAssignConflict(null);
    assignDriver.mutate(
      { rideId, driverId },
      {
        onError: (error) => {
          if (axios.isAxiosError(error) && error.response?.status === 409) {
            setAssignConflict(
              getApiErrorMessage(
                error,
                "Driver already has a ride scheduled in that time window"
              )
            );
          }
        },
      }
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Rides</CardTitle>
          <CardDescription>
            Edit is only available while a ride is pending_assignment; once a
            driver is assigned it locks.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {rides.isError && (
            <p className="text-sm text-destructive">
              {getApiErrorMessage(rides.error)}
            </p>
          )}
          {rides.data?.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No rides in this view.
            </p>
          )}

          {rides.data?.map((ride) => {
            const canEdit = ride.status === "pending_assignment";
            const canCancel = ride.status !== "completed" && ride.status !== "cancelled";
            return (
              <div
                key={ride.rideId}
                className={`space-y-2 rounded-md border p-3 text-sm ${
                  selectedRideId === ride.rideId ? "border-primary" : ""
                }`}
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-medium">{ride.rideId.slice(0, 8)}…</p>
                    <p className="text-muted-foreground">
                      pickup{" "}
                      {ride.pickup
                        ? `${ride.pickup.lat.toFixed(
                            3
                          )}, ${ride.pickup.lng.toFixed(3)}`
                        : "—"}{" "}
                      · {formatVehicleType(ride.vehicleType)}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
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
                    {ride.bookingType === "now" && (
                      <Badge variant="secondary">Ride now</Badge>
                    )}
                    {ride.autoDispatchExhausted && (
                      <Badge variant="destructive">
                        Needs manual assignment
                      </Badge>
                    )}
                    {ride.status === "pending_assignment" && (
                      <Button
                        size="sm"
                        onClick={() => setSelectedRideId(ride.rideId)}
                      >
                        Assign a driver →
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={!canEdit}
                      onClick={() => setEditingRideId(ride.rideId)}
                    >
                      Edit ride
                    </Button>
                    {canCancel && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-destructive hover:text-destructive"
                        disabled={cancelRide.isPending}
                        onClick={() =>
                          cancelRide.mutate({
                            rideId: ride.rideId,
                            reason: "Owner cancelled from dashboard",
                          })
                        }
                      >
                        Cancel ride
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        setAuditRideId(
                          auditRideId === ride.rideId ? null : ride.rideId
                        )
                      }
                    >
                      {auditRideId === ride.rideId ? "Hide history" : "History"}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        setContactRideId(
                          contactRideId === ride.rideId ? null : ride.rideId
                        )
                      }
                    >
                      {contactRideId === ride.rideId
                        ? "Hide contacts"
                        : "Contacts"}
                    </Button>
                  </div>
                </div>

                <FareBillingSummary ride={ride} />

                {contactRideId === ride.rideId && (
                  <div className="space-y-3 rounded-md border bg-muted/20 p-3">
                    <RideContactButtons ride={ride} />
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

                {editingRideId === ride.rideId && (
                  <EditRideForm
                    ride={ride}
                    onDone={() => setEditingRideId(null)}
                  />
                )}

                {auditRideId === ride.rideId && (
                  <div className="rounded-md border bg-muted/20 p-3">
                    {audit.isLoading && (
                      <div className="space-y-1.5" aria-busy="true" aria-label="Loading audit history">
                        <Skeleton className="h-3 w-full" />
                        <Skeleton className="h-3 w-5/6" />
                        <Skeleton className="h-3 w-2/3" />
                      </div>
                    )}
                    {audit.isError && (
                      <p className="text-sm text-destructive">
                        {getApiErrorMessage(audit.error)}
                      </p>
                    )}
                    {audit.data && <AuditTrail entries={audit.data} />}
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Assign a driver</CardTitle>
          <CardDescription title={selectedRideId ?? undefined}>
            {selectedRideId
              ? `Ride: ${selectedRideId.slice(0, 8)}…`
              : "Pick a pending ride above first."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button
              variant={driverScope === "available" ? "default" : "outline"}
              size="sm"
              onClick={() => setDriverScope("available")}
            >
              All available
            </Button>
            <Button
              variant={driverScope === "nearby" ? "default" : "outline"}
              size="sm"
              onClick={() => setDriverScope("nearby")}
              disabled={!selectedRideId}
            >
              Nearest to pickup
            </Button>
          </div>

          {drivers.isError && (
            <p className="text-sm text-destructive">
              {getApiErrorMessage(drivers.error)}
            </p>
          )}

          <div className="space-y-2">
            {drivers.data?.map((driver) => (
              <div
                key={driver.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3 text-sm"
              >
                <div className="flex items-center gap-2">
                  <span className="font-medium">{driver.name}</span>
                  <Badge variant="secondary">{driver.status}</Badge>
                  {driver.distanceMeters != null && (
                    <span className="text-muted-foreground">
                      {(driver.distanceMeters / 1000).toFixed(2)} km
                    </span>
                  )}
                </div>
                <Button
                  size="sm"
                  disabled={!selectedRideId || assignDriver.isPending}
                  onClick={() =>
                    selectedRideId && handleAssign(selectedRideId, driver.id)
                  }
                >
                  Assign
                </Button>
              </div>
            ))}
            {drivers.data?.length === 0 && (
              <p className="text-sm text-muted-foreground">No drivers found.</p>
            )}
          </div>

          {assignConflict && (
            <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{assignConflict}</span>
            </div>
          )}
          {assignDriver.isError && !assignConflict && (
            <p className="text-sm text-destructive">
              {getApiErrorMessage(assignDriver.error)}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function PastRidesTab() {
  const history = useOwnerRideHistory();
  return (
    <div>
      <h2 className="mb-4 text-lg font-semibold">Past rides (all riders)</h2>
      {history.isLoading && (
        <div className="space-y-2" aria-busy="true" aria-label="Loading past rides">
          <SkeletonRow />
          <SkeletonRow />
          <SkeletonRow />
        </div>
      )}
      {history.isError && (
        <p className="text-sm text-destructive">
          {getApiErrorMessage(history.error)}
        </p>
      )}
      {history.data && <RideHistoryList rides={history.data} />}
    </div>
  );
}

export default function OwnerDashboardPage() {
  const [statusFilter, setStatusFilter] = useState<RideStatus | "all">("all");
  const pendingRides = usePendingRides();
  const availableDrivers = useAvailableDrivers();
  const allRides = useOwnerRides();
  const activeRidesNow = (allRides.data ?? []).filter(
    (r) => r.status === "driver_accepted" || r.status === "in_progress"
  ).length;
  useOwnerDispatchSocket();

  return (
    <div className="space-y-6">
      <div>
        <p className="font-mono text-[11px] font-medium uppercase tracking-[0.2em] text-primary">
          Zypher · Owner
        </p>
        <h1 className="font-display text-3xl font-semibold leading-tight tracking-tight">
          Dispatch overview
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Metrics, ride management, and manual driver assignment.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 stagger-in">
        <Card className="transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-md">
          <CardHeader className="pb-2">
            <CardDescription>Needs assignment</CardDescription>
            <CardTitle className="text-3xl">
              <AnimatedNumber value={pendingRides.data?.length} />
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-md">
          <CardHeader className="pb-2">
            <CardDescription>Available drivers</CardDescription>
            <CardTitle className="text-3xl">
              <AnimatedNumber value={availableDrivers.data?.length} />
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-md">
          <CardHeader className="pb-2">
            <CardDescription>Active rides now</CardDescription>
            <CardTitle className="text-3xl">
              <AnimatedNumber value={allRides.data ? activeRidesNow : null} />
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Tabs defaultValue="rides">
        <TabsList className="hidden sm:inline-flex">
          <TabsTrigger value="rides">Rides</TabsTrigger>
          <TabsTrigger value="drivers">Drivers</TabsTrigger>
          <TabsTrigger value="history">Past rides</TabsTrigger>
          <TabsTrigger value="profile">Profile</TabsTrigger>
        </TabsList>
        <TabsList variant="bottomNav" className="sm:hidden">
          <TabsTrigger value="rides" icon={<Gauge className="h-5 w-5" />}>
            Rides
          </TabsTrigger>
          <TabsTrigger value="drivers" icon={<ShieldCheck className="h-5 w-5" />}>
            Drivers
          </TabsTrigger>
          <TabsTrigger value="history" icon={<Clock3 className="h-5 w-5" />}>
            Past rides
          </TabsTrigger>
          <TabsTrigger value="profile" icon={<User2 className="h-5 w-5" />}>
            Profile
          </TabsTrigger>
        </TabsList>
        <TabsContent value="rides" className="space-y-4 pb-20 sm:pb-0">
          <Tabs
            value={statusFilter}
            onValueChange={(v) => setStatusFilter(v as RideStatus | "all")}
          >
            <TabsList className="flex-wrap">
              {STATUS_TABS.map((tab) => (
                <TabsTrigger key={tab.value} value={tab.value}>
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <OwnerRidesTable status={statusFilter} />
        </TabsContent>
        <TabsContent value="drivers" className="pb-20 sm:pb-0">
          <OwnerDriverDocumentsReview />
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
