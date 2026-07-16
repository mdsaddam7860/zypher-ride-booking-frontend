import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api, getApiErrorMessage } from "@/lib/api";
import { deriveDriverDocumentStatus, type DriverDocuments } from "@/types";

/** GET /api/drivers/documents/me — current driver's submitted document status.
 *  Polls while a review is pending so approval/rejection shows up without a
 *  manual refresh; stops once there's a final answer. */
export function useMyDriverDocuments() {
  return useQuery({
    queryKey: ["my-driver-documents"],
    queryFn: async () => {
      const { data } = await api.get<DriverDocuments>("/api/drivers/documents/me");
      return data;
    },
    retry: false,
    refetchInterval: (query) =>
      query.state.data && deriveDriverDocumentStatus(query.state.data) === "pending"
        ? 8000
        : false,
  });
}

export interface DriverDocumentsInput {
  aadharNumber: string;
  aadharPhoto: File | null;
  licenseNumber: string;
  licenseExpiry: string;
  licensePhoto: File | null;
  vehicleRegistrationNumber: string;
  vehicleModel: string;
  vehiclePhoto: File | null;
}

function toFormData(input: DriverDocumentsInput): FormData {
  const form = new FormData();
  form.append("aadharNumber", input.aadharNumber);
  form.append("licenseNumber", input.licenseNumber);
  form.append("licenseExpiry", input.licenseExpiry);
  form.append("vehicleRegistrationNumber", input.vehicleRegistrationNumber);
  form.append("vehicleModel", input.vehicleModel);
  if (input.aadharPhoto) form.append("aadharPhoto", input.aadharPhoto);
  if (input.licensePhoto) form.append("licensePhoto", input.licensePhoto);
  if (input.vehiclePhoto) form.append("vehiclePhoto", input.vehiclePhoto);
  return form;
}

/** POST /api/drivers/documents — multipart submission (fields + 3 photos).
 *  Also used to resubmit after a rejection; the backend clears
 *  rejectionReason and flips back to pending automatically. */
export function useSubmitDriverDocuments() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: DriverDocumentsInput) => {
      const { data } = await api.post<DriverDocuments>(
        "/api/drivers/documents",
        toFormData(input)
      );
      return data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["my-driver-documents"], data);
      queryClient.invalidateQueries({ queryKey: ["my-profile", "driver"] });
      toast.success("Documents submitted for review");
    },
    onError: (error) => {
      toast.error("Couldn't submit documents", { description: getApiErrorMessage(error) });
    },
  });
}

/** GET /api/owner/drivers/:driverId/documents — single-driver detail, used
 *  as a fallback if a driver isn't already in the pending list (e.g. deep
 *  link) — the pending list itself already carries full document data. */
export function useDriverDocumentsForOwner(driverId: string | null) {
  return useQuery({
    queryKey: ["owner-driver-documents", driverId],
    queryFn: async () => {
      const { data } = await api.get<DriverDocuments>(
        `/api/owner/drivers/${driverId}/documents`
      );
      return data;
    },
    enabled: !!driverId,
    retry: false,
  });
}

/** PATCH /api/owner/drivers/:driverId/documents/verify — approve/reject.
 *  Rejection requires a reason (server returns 400 without one); approval
 *  sends no reason field at all. */
export function useVerifyDriverDocuments() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      input:
        | { driverId: string; isVerified: true }
        | { driverId: string; isVerified: false; rejectionReason: string }
    ) => {
      const { driverId, isVerified } = input;
      const body =
        isVerified === true
          ? { isVerified: true }
          : { isVerified: false, rejectionReason: input.rejectionReason };
      const { data } = await api.patch<DriverDocuments>(
        `/api/owner/drivers/${driverId}/documents/verify`,
        body
      );
      return data;
    },
    onSuccess: (_data, { driverId, isVerified }) => {
      queryClient.invalidateQueries({ queryKey: ["owner-driver-documents", driverId] });
      queryClient.invalidateQueries({ queryKey: ["owner-pending-driver-documents"] });
      toast.success(isVerified ? "Driver approved" : "Driver rejected");
    },
    onError: (error) => {
      toast.error("Couldn't update verification", { description: getApiErrorMessage(error) });
    },
  });
}

/** GET /api/owner/drivers/pending-documents — returns full document records
 *  (not just a summary) including driverName/driverEmail/driverPhone, so the
 *  review queue can render straight from this list without a second
 *  per-driver fetch. Polled so new submissions show up without a refresh. */
export function usePendingDriverDocuments() {
  return useQuery({
    queryKey: ["owner-pending-driver-documents"],
    queryFn: async () => {
      const { data } = await api.get<DriverDocuments[]>(
        "/api/owner/drivers/pending-documents"
      );
      return data;
    },
    retry: false,
    refetchInterval: 15000,
  });
}
