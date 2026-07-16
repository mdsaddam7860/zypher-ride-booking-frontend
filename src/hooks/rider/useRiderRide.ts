import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api, getApiErrorMessage } from "@/lib/api";
import { useSocketEvent } from "@/hooks/useSocketEvent";
import type { BookingType, FareEstimate, LatLng, PaymentMethod, PaymentResult, Ride, VehicleType } from "@/types";

const ACTIVE_STATUSES: Ride["status"][] = [
  "pending_assignment",
  "driver_assigned",
  "driver_accepted",
  "in_progress",
];

/**
 * POST /api/fares — get a price/distance estimate before requesting a ride.
 * Price depends on vehicleType, so callers should re-fetch whenever the
 * rider changes their vehicle selection.
 */
export function useCreateFare() {
  return useMutation({
    mutationFn: async (input: {
      pickupLocation: LatLng;
      destination: LatLng;
      pickupAddress: string;
      destinationAddress: string;
      vehicleType: VehicleType;
    }) => {
      const { data } = await api.post<FareEstimate>("/api/fares", input);
      return data;
    },
    onError: (error) => {
      toast.error("Couldn't get a fare estimate", { description: getApiErrorMessage(error) });
    },
  });
}

/**
 * POST /api/rides — turn a fare estimate into an actual ride request.
 * vehicleType is intentionally NOT accepted here — it's locked from the
 * fare the rider already picked. `bookingType` is a required, explicit
 * choice ("now" triggers real-time auto-dispatch to nearby drivers;
 * "scheduled" just sits pending for the owner to assign manually) — always
 * send it rather than relying on the backend's "now" default.
 */
export function useRequestRide() {
  return useMutation({
    mutationFn: async (input: {
      fareId: string;
      scheduledStartAt: string;
      paymentMethod: PaymentMethod;
      bookingType: BookingType;
      notes?: string;
    }) => {
      const { data } = await api.post<Ride>("/api/rides", input);
      return data;
    },
    onSuccess: (data) => {
      toast.success(
        data.bookingType === "now" ? "Ride requested" : "Ride scheduled",
        { description: "We'll notify you as soon as a driver is assigned." }
      );
    },
    onError: (error) => {
      toast.error("Couldn't request ride", { description: getApiErrorMessage(error) });
    },
  });
}

/**
 * GET /api/rides/:id — polls while the ride is in an active state so the
 * RideStateLadder updates live; stops polling once completed/cancelled.
 */
export function useRide(rideId: string | null) {
  return useQuery({
    queryKey: ["ride", rideId],
    queryFn: async () => {
      const { data } = await api.get<Ride>(`/api/rides/${rideId}`);
      return data;
    },
    enabled: !!rideId,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status && ACTIVE_STATUSES.includes(status) ? 4000 : false;
    },
  });
}

/**
 * Socket "ride:status" -> instantly refreshes the ride query cache instead
 * of waiting for the next poll. `useRide`'s polling stays on as a fallback
 * (reconnects, missed events), so this is purely an optimization — call it
 * alongside `useRide(rideId)`, not instead of it.
 */
export function useRideStatusSocket(rideId: string | null) {
  const queryClient = useQueryClient();
  useSocketEvent<{ rideId: string; status: Ride["status"] }>("ride:status", (payload) => {
    if (payload.rideId === rideId) {
      queryClient.invalidateQueries({ queryKey: ["ride", rideId] });
    }
  });
}

/**
 * POST /api/rides/:id/pay — rider-only, confirms an "advance" payment
 * (mock gateway today). Invalidates the ride query afterwards to pick up
 * the updated billing.paymentStatus.
 */
export function useConfirmPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (rideId: string) => {
      const { data } = await api.post<PaymentResult>(`/api/rides/${rideId}/pay`);
      return data;
    },
    onSuccess: (_result, rideId) => {
      queryClient.invalidateQueries({ queryKey: ["ride", rideId] });
      toast.success("Payment confirmed");
    },
    onError: (error) => {
      toast.error("Payment failed", { description: getApiErrorMessage(error) });
    },
  });
}

/** PATCH /api/rides/:id/cancel */
export function useCancelRide() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ rideId, reason }: { rideId: string; reason?: string }) => {
      const { data } = await api.patch<Ride>(`/api/rides/${rideId}/cancel`, { reason });
      return data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["ride", data.rideId], data);
      toast.success("Ride cancelled");
    },
    onError: (error) => {
      toast.error("Couldn't cancel ride", { description: getApiErrorMessage(error) });
    },
  });
}

/** GET /api/rides/history — rider's own completed/cancelled rides. */
export function useRideHistory() {
  return useQuery({
    queryKey: ["rides", "history"],
    queryFn: async () => {
      const { data } = await api.get<Ride[]>("/api/rides/history");
      return data;
    },
  });
}