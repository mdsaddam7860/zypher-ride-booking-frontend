import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export function formatInr(amount: number): string {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(
    amount
  );
}

/**
 * Formats a vehicle type for display, tolerating rides where the field is
 * missing or unrecognized (e.g. rides created before vehicleType existed on
 * the backend, or any other shape drift) instead of throwing.
 */
export function formatVehicleType(vehicleType: string | null | undefined): string {
  if (!vehicleType) return "Vehicle type unknown";
  return vehicleType.replace("_", "-");
}

/**
 * Client-side mirror of the backend's advance-payment refund tiers, purely
 * for showing an estimate on the cancel-confirmation screen before the
 * rider commits. The real number always comes back from the cancel
 * response itself — this is a preview only.
 */
export function estimateRefundPercent(scheduledStartAt: string | null, now = new Date()): number {
  if (!scheduledStartAt) return 0;
  const hoursUntilStart = (new Date(scheduledStartAt).getTime() - now.getTime()) / (1000 * 60 * 60);
  if (hoursUntilStart < 0) return 0;
  if (hoursUntilStart >= 24) return 100;
  if (hoursUntilStart >= 12) return 75;
  return 50;
}

/** Great-circle distance between two coordinates, in meters. Client-side-only
 *  estimate used to decide when to *show* geofenced actions (e.g. "I've
 *  arrived") — the backend is the source of truth and re-validates on the
 *  actual request, so this only needs to be roughly right. */
export function haversineDistanceMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
