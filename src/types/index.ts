// These mirror the backend's serializers exactly (see
// ride-booking-backend/src/utils/serializers.ts and controllers). Keeping
// this file in lockstep with the API contract is what gives the rest of the
// app end-to-end type safety.

export type Role = "rider" | "driver" | "owner";

export type RideStatus =
  | "pending_assignment"
  | "driver_assigned"
  | "driver_accepted"
  | "in_progress"
  | "completed"
  | "cancelled";

export type DriverDocumentStatus = "not_submitted" | "pending" | "verified" | "rejected";

export type DriverStatus = "available" | "busy" | "offline";

export type VehicleType = "4_seater" | "7_seater";

export type PaymentMethod = "cash" | "advance";

export type PaymentStatus = "pending" | "paid" | "failed" | "not_required";

export type BookingType = "now" | "scheduled";

export interface LatLng {
  lat: number;
  lng: number;
}

// POST /api/auth/register|login/{rider,driver,owner}
export interface AuthResult {
  token: string;
  userId: string;
  role: Role;
}

// POST /api/fares
export interface FareEstimate {
  fareId: string;
  vehicleType: VehicleType;
  estimatedPrice: number;
  // Always "INR" — kept as a string (rather than a literal) in case the
  // backend ever needs to widen this, but every value we get back today is INR.
  currency: string;
  distanceMeters: number;
  durationSeconds: number;
  // Informational only — the backend doesn't block booking on this, so the
  // frontend shouldn't either. Fine to surface as a badge/note.
  isLongDistance: boolean;
  expiresAt: string;
}

export interface RideFareSummary {
  estimatedPrice: number;
  currency: string;
}

export interface RideBilling {
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  refundAmount: number | null;
}

// GET/POST /api/rides/*, /api/owner/rides/*
export interface Ride {
  rideId: string;
  riderId: string;
  driverId: string | null;
  fareId: string;
  status: RideStatus;
  vehicleType: VehicleType;
  notes: string | null;
  pickup: LatLng;
  dropoff: LatLng;
  scheduledStartAt: string | null;
  scheduledEndAt: string | null;
  distanceMeters: number;
  isLongDistance: boolean;
  cancelReason: string | null;
  cancelledBy: Role | null;
  assignedAt: string | null;
  acceptedAt: string | null;
  arrivedAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
  bookingType: BookingType;
  // True once real-time auto-dispatch has run out of nearby drivers to
  // offer the ride to — surfaced as a "needs manual assignment" badge on
  // the owner dashboard.
  autoDispatchExhausted: boolean;
  // Visible to rider, driver, and owner.
  fare?: RideFareSummary;
  // Only present for rider and owner — undefined for driver views. Always
  // guard rendering with `if (ride.billing)`.
  billing?: RideBilling;
  // Present while a driver is on the ride (rider/driver apps: only during
  // driver_assigned/accepted/in_progress) or, for the owner dashboard, on
  // ANY ride that ever had a driver assigned — including completed/cancelled,
  // for dispute/support lookups. Always guard with `if (ride.contact)`.
  contact?: { riderPhone: string; driverPhone: string };
}

// Pushed via socket "ride:offer" to a driver — a real-time auto-dispatch offer.
export interface RideOffer {
  offerId: string;
  rideId: string;
  vehicleType: VehicleType;
  pickup: LatLng;
  dropoff: LatLng;
  distanceMeters: number;
  scheduledStartAt: string | null;
  expiresAt: string;
}

// POST /api/rides/:id/pay
export interface PaymentResult {
  paymentId: string;
  rideId: string;
  amount: number;
  currency: string;
  status: "paid" | "failed";
}

// GET /api/rides/:rideId/audit
export interface AuditEntry {
  id: string;
  action: string;
  changedBy: { id: string; role: Role };
  changes: Record<string, unknown>;
  at: string;
}


// GET /api/owner/drivers/available|nearby
export interface DriverWithLocation {
  id: string;
  name: string;
  status: DriverStatus;
  lat: number;
  lng: number;
  updatedAt: string;
  distanceMeters?: number;
}

// GET/POST /api/drivers/documents/me, /api/owner/drivers/:driverId/documents,
// GET /api/owner/drivers/pending-documents (same shape + driver identity fields)
export interface DriverDocuments {
  driverId: string;
  aadharNumber: string | null;
  aadharPhotoUrl: string | null;
  licenseNumber: string | null;
  licenseExpiry: string | null;
  licensePhotoUrl: string | null;
  vehicleRegistrationNumber: string | null;
  vehicleModel: string | null;
  vehiclePhotoUrl: string | null;
  isVerified: boolean;
  rejectionReason: string | null;
  verifiedAt: string | null;
  updatedAt: string;
  // Only present on the owner-facing endpoints (not /me).
  driverName?: string;
  driverEmail?: string;
  driverPhone?: string;
}

/** There's no explicit status enum from the backend — derived from
 *  isVerified/rejectionReason so the UI can still branch on one thing. */
export function deriveDriverDocumentStatus(
  doc: Pick<DriverDocuments, "isVerified" | "rejectionReason" | "licenseNumber">
): DriverDocumentStatus {
  if (doc.isVerified) return "verified";
  if (doc.rejectionReason) return "rejected";
  if (!doc.licenseNumber) return "not_submitted";
  return "pending";
}

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
  };
}

// GET /api/users/:id — NOT YET IMPLEMENTED on the backend (same kind of gap
// documented in the README for the driver "active ride" and owner "fares"
// endpoints). Wired up here so contact-info UI (name/email/phone) across the
// app lights up the moment this endpoint ships; until then it 404s and
// callers fall back gracefully (see <ContactDetails />).
export interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: Role;
}

// GET /api/fares/options?pickup=..&destination=.. — presentation-layer
// catalogue for the rider "Choose a ride" sheet. Distinct from the narrower
// `VehicleType` used by /api/fares (which only distinguishes 4/7-seater for
// pricing purposes): this is the richer service catalogue Uber-style apps
// show, one row per bookable product. `vehicleType` maps each row back to
// the pricing-relevant enum so selecting a row still drives a valid fare
// request.
export type RideOptionCode =
  | "go"
  | "bike"
  | "bike_saver"
  | "premier"
  | "auto"
  | "go_rentals"
  | "go_non_ac"
  | "go_priority"
  | "request_any"
  | "uber_xl";

export interface RideOptionDiscount {
  /** Original (pre-discount) price, present only when a discount applies. */
  originalPrice?: number;
  /** "percent" shows e.g. "10-40%"/"7%"; "flat" shows e.g. "₹10"; "promo" shows a plain "Promo" badge. */
  badgeKind: "percent" | "percentRange" | "flat" | "promo";
  percent?: number;
  percentMin?: number;
  percentMax?: number;
  flatAmount?: number;
}

export interface RideOption {
  code: RideOptionCode;
  vehicleType: VehicleType;
  capacity: number;
  price: number;
  currency: string;
  etaMinutes: number;
  /** ISO time string for the next available pickup slot. */
  pickupAt: string;
  /** Short status line under the ETA, e.g. "Longer wait", "Priority pickup". */
  noteKey?: string;
  discount?: RideOptionDiscount;
}