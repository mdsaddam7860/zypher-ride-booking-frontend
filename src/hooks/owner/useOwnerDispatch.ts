import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api, getApiErrorMessage } from "@/lib/api";
import { useSocketEvent } from "@/hooks/useSocketEvent";
import type { AuditEntry, DriverWithLocation, LatLng, Ride, RideStatus, VehicleType } from "@/types";

/**
 * Socket "ride:dispatch:accepted" / "ride:dispatch:exhausted" -> instantly
 * refreshes the owner's rides queries instead of waiting for their 5s poll.
 * Both queries already poll on their own as a fallback, so this is purely
 * an optimization — mount once (e.g. at the top of the owner page).
 */
export function useOwnerDispatchSocket() {
  const queryClient = useQueryClient();
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["owner", "rides"] });
    queryClient.invalidateQueries({ queryKey: ["owner", "pending-rides"] });
  };
  useSocketEvent<{ rideId: string; driverId: string }>("ride:dispatch:accepted", invalidate);
  useSocketEvent<{ rideId: string }>("ride:dispatch:exhausted", invalidate);
}

/** GET /api/owner/rides/pending — polled for a live-ish "needs assignment" queue. */
export function usePendingRides() {
  return useQuery({
    queryKey: ["owner", "pending-rides"],
    queryFn: async () => {
      const { data } = await api.get<Ride[]>("/api/owner/rides/pending");
      return data;
    },
    refetchInterval: 5000,
  });
}

/**
 * GET /api/owner/rides?status= — the full dashboard feed (pending, assigned,
 * in-progress, completed, cancelled), pre-sorted by the backend. Pass no
 * status for everything, or one of the RideStatus values to filter.
 */
export function useOwnerRides(status?: RideStatus) {
  return useQuery({
    queryKey: ["owner", "rides", status ?? "all"],
    queryFn: async () => {
      const { data } = await api.get<Ride[]>("/api/owner/rides", { params: status ? { status } : undefined });
      return data;
    },
    refetchInterval: 5000,
  });
}

/** GET /api/owner/drivers/available */
export function useAvailableDrivers() {
  return useQuery({
    queryKey: ["owner", "available-drivers"],
    queryFn: async () => {
      const { data } = await api.get<DriverWithLocation[]>("/api/owner/drivers/available");
      return data;
    },
    refetchInterval: 10000,
  });
}

/** GET /api/owner/drivers/nearby?rideId= */
export function useNearbyDrivers(rideId: string | null) {
  return useQuery({
    queryKey: ["owner", "nearby-drivers", rideId],
    queryFn: async () => {
      const { data } = await api.get<DriverWithLocation[]>("/api/owner/drivers/nearby", { params: { rideId } });
      return data;
    },
    enabled: !!rideId,
  });
}

/**
 * POST /api/owner/rides/:id/assign — equivalent to
 * POST /api/rides/:rideId/assign-driver (kept here since it fits the
 * existing owner-dispatch routing). A driver can now be double-booked as
 * long as their scheduled windows don't overlap; an overlap comes back as
 * a 409 with a message the UI should surface clearly.
 */
export function useAssignDriver() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ rideId, driverId }: { rideId: string; driverId: string }) => {
      const { data } = await api.post<Ride>(`/api/owner/rides/${rideId}/assign`, { driverId });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["owner", "pending-rides"] });
      queryClient.invalidateQueries({ queryKey: ["owner", "rides"] });
      toast.success("Driver assigned");
    },
    onError: (error) => {
      toast.error("Couldn't assign driver", { description: getApiErrorMessage(error) });
    },
  });
}

/**
 * PATCH /api/rides/:id/edit — owner-only, only works while the ride is
 * still pending_assignment. Body is a partial patch: any of pickup,
 * dropoff, vehicleType, notes (at least one required). A 409 means the
 * ride got assigned out from under the owner between page load and submit.
 */
export function useEditRide() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      rideId,
      patch,
    }: {
      rideId: string;
      patch: Partial<{ pickup: LatLng; dropoff: LatLng; vehicleType: VehicleType; notes: string }>;
    }) => {
      const { data } = await api.patch<Ride>(`/api/rides/${rideId}/edit`, patch);
      return data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["ride", data.rideId], data);
      queryClient.invalidateQueries({ queryKey: ["owner", "pending-rides"] });
      queryClient.invalidateQueries({ queryKey: ["owner", "rides"] });
      toast.success("Ride updated");
    },
    onError: (error) => {
      toast.error("Couldn't update ride", { description: getApiErrorMessage(error) });
    },
  });
}

/** GET /api/rides/:rideId/audit — owner-only chronological change history. */
export function useRideAudit(rideId: string | null) {
  return useQuery({
    queryKey: ["ride", rideId, "audit"],
    queryFn: async () => {
      const { data } = await api.get<AuditEntry[]>(`/api/rides/${rideId}/audit`);
      return data;
    },
    enabled: !!rideId,
  });
}

/** GET /api/rides/history — owner sees every rider's completed/cancelled rides. */
export function useOwnerRideHistory() {
  return useQuery({
    queryKey: ["owner", "rides", "history"],
    queryFn: async () => {
      const { data } = await api.get<Ride[]>("/api/rides/history");
      return data;
    },
  });
}