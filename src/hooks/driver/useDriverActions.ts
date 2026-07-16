import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api, getApiErrorMessage } from "@/lib/api";
import type { LatLng, Ride } from "@/types";

const RIDES_QUERY_KEY = ["driver", "rides"] as const;

/** POST /api/drivers/status/available|offline */
export function useSetDriverStatus() {
  return useMutation({
    mutationFn: async (status: "available" | "offline") => {
      await api.post(`/api/drivers/status/${status}`);
      return status;
    },
    onSuccess: (status) => {
      toast.success(status === "available" ? "You're online" : "You're offline");
    },
    onError: (error) => {
      toast.error("Couldn't update status", { description: getApiErrorMessage(error) });
    },
  });
}

/** POST /api/drivers/location */
export function useUpdateDriverLocation() {
  return useMutation({
    mutationFn: async (location: LatLng) => {
      await api.post("/api/drivers/location", location);
    },
  });
}

/**
 * GET /api/rides/history — turns out this already returns every ride tied to
 * this driver, not just completed/cancelled ones (driver_assigned,
 * driver_accepted, and in_progress rides show up here too). So this single
 * query, polled every 5s, is the one source of truth for the whole driver
 * console:
 *   - status === "driver_assigned"          -> the accept/deny queue
 *   - status "driver_accepted" | "in_progress" -> the tracked/active ride(s)
 *   - status "completed" | "cancelled"        -> the Past rides tab
 *
 * No separate "my assigned ride" endpoint, no pasting a ride ID by hand, and
 * only one 5s timer for ride data (GPS location broadcasting is its own,
 * separate 5s loop in the page — that's a different concern, not duplicated
 * polling of the same thing).
 */
export function useDriverRides() {
  return useQuery({
    queryKey: RIDES_QUERY_KEY,
    queryFn: async () => {
      const { data } = await api.get<Ride[]>("/api/rides/history");
      return data;
    },
    refetchInterval: 5000,
  });
}

/** PATCH /api/rides/:id — accept or deny a manually-assigned ride. */
export function useRespondToRide() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ rideId, action }: { rideId: string; action: "accept" | "deny" }) => {
      const { data } = await api.patch<Ride>(`/api/rides/${rideId}`, { action });
      return data;
    },
    onSuccess: (_data, { action }) => {
      queryClient.invalidateQueries({ queryKey: RIDES_QUERY_KEY });
      toast.success(action === "accept" ? "Ride accepted" : "Ride declined");
    },
    onError: (error) => {
      toast.error("Couldn't respond to ride", { description: getApiErrorMessage(error) });
    },
  });
}

/**
 * POST /api/rides/offers/:offerId/respond — accept/decline a real-time
 * auto-dispatch offer pushed over socket ("ride:offer"). This is a
 * different flow from useRespondToRide above: offers come from auto-dispatch
 * ("now" bookings going out to nearby drivers), while useRespondToRide is
 * for rides the owner assigned manually — both can be in play at once.
 */
export function useRespondToOffer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ offerId, action }: { offerId: string; action: "accept" | "decline" }) => {
      const { data } = await api.post(`/api/rides/offers/${offerId}/respond`, { action });
      return data;
    },
    onSuccess: (_data, { action }) => {
      queryClient.invalidateQueries({ queryKey: RIDES_QUERY_KEY });
      toast.success(action === "accept" ? "Ride offer accepted" : "Ride offer declined");
    },
    onError: (error) => {
      toast.error("Couldn't respond to offer", { description: getApiErrorMessage(error) });
    },
  });
}

/** POST /api/rides/:id/arrive — driver-only, valid only while driver_accepted. */
export function useArriveRide() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (rideId: string) => {
      const { data } = await api.post<Ride>(`/api/rides/${rideId}/arrive`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: RIDES_QUERY_KEY });
      toast.success("Marked as arrived");
    },
    onError: (error) => {
      toast.error("Couldn't mark as arrived", { description: getApiErrorMessage(error) });
    },
  });
}

/** POST /api/rides/:id/start — requires the rider's 4-digit OTP as of the
 *  latest backend change; the old no-body call now fails validation. */
export function useStartRide() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ rideId, otp }: { rideId: string; otp: string }) => {
      const { data } = await api.post<Ride>(`/api/rides/${rideId}/start`, { otp });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: RIDES_QUERY_KEY });
      toast.success("Ride started");
    },
    onError: (error) => {
      toast.error("Couldn't start ride", { description: getApiErrorMessage(error) });
    },
  });
}

/** POST /api/rides/:id/complete */
export function useCompleteRide() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (rideId: string) => {
      const { data } = await api.post<Ride>(`/api/rides/${rideId}/complete`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: RIDES_QUERY_KEY });
      toast.success("Ride completed");
    },
    onError: (error) => {
      toast.error("Couldn't complete ride", { description: getApiErrorMessage(error) });
    },
  });
}