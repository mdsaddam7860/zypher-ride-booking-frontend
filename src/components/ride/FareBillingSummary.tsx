import { formatInr } from "@/lib/utils";
import type { Ride } from "@/types";

const PAYMENT_STATUS_LABEL: Record<string, string> = {
  pending: "Payment pending",
  paid: "Paid",
  failed: "Payment failed",
  not_required: "Pay on arrival (cash)",
};

/**
 * Renders the fare (visible to rider/driver/owner) and, when present, the
 * billing block (rider/owner only — the backend simply omits `billing` for
 * driver views, so this always guards on `ride.billing` rather than
 * checking role directly).
 */
export function FareBillingSummary({ ride }: { ride: Ride }) {
  return (
    <div className="space-y-1 rounded-xl border bg-muted/40 p-3 text-sm">
      {ride.fare ? (
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Fare</span>
          <span className="font-semibold">{formatInr(ride.fare.estimatedPrice)}</span>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">Fare not available.</p>
      )}

      {ride.billing && (
        <>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Payment method</span>
            <span className="font-medium capitalize">{ride.billing.paymentMethod}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Status</span>
            <span className="font-medium">
              {PAYMENT_STATUS_LABEL[ride.billing.paymentStatus] ?? ride.billing.paymentStatus}
            </span>
          </div>
          {ride.billing.refundAmount != null && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Refund</span>
              <span className="font-medium">{formatInr(ride.billing.refundAmount)}</span>
            </div>
          )}
        </>
      )}
    </div>
  );
}
