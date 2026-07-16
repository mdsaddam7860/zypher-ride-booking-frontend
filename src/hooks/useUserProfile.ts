import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api, getApiErrorMessage } from "@/lib/api";
import { useSessionStore } from "@/store/useSessionStore";

export interface RiderProfile {
  riderId: string;
  name: string;
  email: string;
  phone: string;
  createdAt: string;
  // Permanent 4-digit OTP the rider reads aloud to their driver to start
  // the trip — only ever returned on the rider's own /me call.
  rideOtp?: string;
}

export interface DriverProfile {
  driverId: string;
  name: string;
  email: string;
  phone: string;
  status: string;
  createdAt: string;
  // Gates going online / accepting rides — false until an owner verifies
  // the driver's submitted documents.
  isActive?: boolean;
  profilePhotoUrl?: string | null;
}

export type MyProfile = RiderProfile | DriverProfile;

/**
 * GET /api/riders/me | /api/drivers/me — the logged-in user's own profile.
 * Owners have no "my profile" endpoint yet, so this simply doesn't run for
 * that role — <ProfilePanel> shows a placeholder instead.
 */
export function useMyProfile() {
  const role = useSessionStore((s) => s.session?.role);
  return useQuery({
    queryKey: ["my-profile", role],
    queryFn: async () => {
      const path = role === "driver" ? "/api/drivers/me" : "/api/riders/me";
      const { data } = await api.get<MyProfile>(path);
      return data;
    },
    enabled: role === "rider" || role === "driver",
    retry: false,
  });
}

/**
 * PATCH /api/riders/me | /api/drivers/me — DUMMY, not confirmed on the
 * backend. Powers the Profile tab's "Edit" form end-to-end the moment it
 * exists; until then this call fails and the form surfaces that error.
 */
export function useUpdateMyProfile() {
  const role = useSessionStore((s) => s.session?.role);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (patch: { name: string; email: string; phone: string; profilePhotoUrl?: string }) => {
      const path = role === "driver" ? "/api/drivers/me" : "/api/riders/me";
      const { data } = await api.patch<MyProfile>(path, patch);
      return data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["my-profile", role], data);
      toast.success("Profile updated");
    },
    onError: (error) => {
      toast.error("Couldn't update profile", { description: getApiErrorMessage(error) });
    },
  });
}

/**
 * PATCH /api/riders/me/password | /api/drivers/me/password | /api/owner/me/password
 * Body: { currentPassword, newPassword }. Works for all three roles — the
 * only thing that differs is the path, resolved from the active session.
 */
export function useUpdatePassword() {
  const role = useSessionStore((s) => s.session?.role);
  return useMutation({
    mutationFn: async (input: { currentPassword: string; newPassword: string }) => {
      const path =
        role === "driver"
          ? "/api/drivers/me/password"
          : role === "owner"
          ? "/api/owner/me/password"
          : "/api/riders/me/password";
      const { data } = await api.patch<{ success: boolean }>(path, input);
      return data;
    },
    onSuccess: () => {
      toast.success("Password updated");
    },
    onError: (error) => {
      toast.error("Couldn't update password", { description: getApiErrorMessage(error) });
    },
  });
}

/**
 * PATCH /api/drivers/me (multipart) — uploads/replaces the driver's profile
 * photo. Separate from useUpdateMyProfile since this is a file upload, not
 * a JSON patch.
 */
export function useUploadDriverProfilePhoto() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (photo: File) => {
      const form = new FormData();
      form.append("profilePhoto", photo);
      const { data } = await api.patch<MyProfile>("/api/drivers/me", form);
      return data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["my-profile", "driver"], data);
      toast.success("Profile photo updated");
    },
    onError: (error) => {
      toast.error("Couldn't update profile photo", { description: getApiErrorMessage(error) });
    },
  });
}

/** GET /api/owner/riders/:riderId — owner-only lookup of a rider's profile. */
export function useRiderProfileForOwner(riderId: string | null | undefined) {
  return useQuery({
    queryKey: ["owner-rider-profile", riderId],
    queryFn: async () => {
      const { data } = await api.get<RiderProfile>(`/api/owner/riders/${riderId}`);
      return data;
    },
    enabled: !!riderId,
    retry: false,
  });
}