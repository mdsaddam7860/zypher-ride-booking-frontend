"use client";

import { useState } from "react";
import { Car, CreditCard, IdCard, ShieldCheck, ShieldX } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SkeletonRow } from "@/components/ui/skeleton";
import { getApiErrorMessage } from "@/lib/api";
import {
  usePendingDriverDocuments,
  useVerifyDriverDocuments,
} from "@/hooks/driver/useDriverDocuments";
import type { DriverDocuments } from "@/types";

function DocumentPhoto({ label, url }: { label: string; url: string | null }) {
  return (
    <div className="space-y-1">
      <p className="text-xs text-muted-foreground">{label}</p>
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={label} className="h-28 w-full rounded-md border object-cover" />
      ) : (
        <div className="flex h-28 w-full items-center justify-center rounded-md border border-dashed text-xs text-muted-foreground">
          Not provided
        </div>
      )}
    </div>
  );
}

function DriverDocumentReviewCard({
  doc,
  onDone,
}: {
  doc: DriverDocuments;
  onDone: () => void;
}) {
  const verify = useVerifyDriverDocuments();
  const [rejectionReason, setRejectionReason] = useState("");
  const [showReject, setShowReject] = useState(false);

  return (
    <div className="space-y-4 p-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <p className="flex items-center gap-1.5 text-sm font-medium">
            <IdCard className="h-3.5 w-3.5" /> Aadhaar
          </p>
          <p className="text-sm text-muted-foreground">{doc.aadharNumber ?? "Not provided"}</p>
          <DocumentPhoto label="Aadhaar photo" url={doc.aadharPhotoUrl} />
        </div>
        <div className="space-y-2">
          <p className="flex items-center gap-1.5 text-sm font-medium">
            <CreditCard className="h-3.5 w-3.5" /> License
          </p>
          <p className="text-sm text-muted-foreground">
            {doc.licenseNumber ?? "Not provided"}
            {doc.licenseExpiry && ` · expires ${new Date(doc.licenseExpiry).toLocaleDateString("en-IN")}`}
          </p>
          <DocumentPhoto label="License photo" url={doc.licensePhotoUrl} />
        </div>
        <div className="space-y-2">
          <p className="flex items-center gap-1.5 text-sm font-medium">
            <Car className="h-3.5 w-3.5" /> Vehicle
          </p>
          <p className="text-sm text-muted-foreground">
            {doc.vehicleModel ?? "Not provided"}
            {doc.vehicleRegistrationNumber && ` · ${doc.vehicleRegistrationNumber}`}
          </p>
          <DocumentPhoto label="Vehicle photo" url={doc.vehiclePhotoUrl} />
        </div>
      </div>

      {showReject && (
        <div className="space-y-1.5 rounded-md border border-destructive/30 bg-destructive/5 p-3">
          <Label htmlFor={`reject-reason-${doc.driverId}`}>
            Rejection reason <span className="text-destructive">*</span>
          </Label>
          <Input
            id={`reject-reason-${doc.driverId}`}
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            placeholder="e.g. License photo is blurry, please retake"
            autoFocus
            required
          />
          <p className="text-xs text-muted-foreground">
            Required — this is shown to the driver so they know what to fix.
          </p>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <Button
          className="gap-1.5"
          disabled={verify.isPending}
          onClick={() =>
            verify.mutate({ driverId: doc.driverId, isVerified: true }, { onSuccess: onDone })
          }
        >
          <ShieldCheck className="h-4 w-4" /> Approve
        </Button>
        {!showReject ? (
          <Button variant="outline" onClick={() => setShowReject(true)}>
            Reject
          </Button>
        ) : (
          <Button
            variant="destructive"
            className="gap-1.5"
            disabled={verify.isPending || !rejectionReason.trim()}
            onClick={() =>
              verify.mutate(
                { driverId: doc.driverId, isVerified: false, rejectionReason },
                { onSuccess: onDone }
              )
            }
          >
            <ShieldX className="h-4 w-4" /> Confirm rejection
          </Button>
        )}
      </div>

      {verify.isError && (
        <p className="text-sm text-destructive">{getApiErrorMessage(verify.error)}</p>
      )}
    </div>
  );
}

/** Owner review queue for pending driver document submissions. The
 *  pending-documents endpoint returns full document records (including
 *  driverName/driverEmail/driverPhone), so this renders directly from the
 *  list — no second per-driver fetch needed. */
export function OwnerDriverDocumentsReview() {
  const pending = usePendingDriverDocuments();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (pending.isLoading) {
    return (
      <div className="space-y-2">
        <SkeletonRow />
        <SkeletonRow />
        <SkeletonRow />
      </div>
    );
  }

  if (pending.isError) {
    return <p className="text-sm text-destructive">{getApiErrorMessage(pending.error)}</p>;
  }

  const drivers = pending.data ?? [];

  if (drivers.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed py-10 text-center">
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-muted">
          <ShieldCheck className="h-5 w-5 text-muted-foreground" />
        </div>
        <p className="text-sm font-medium">No documents pending review</p>
        <p className="max-w-[22rem] text-xs text-muted-foreground">
          New driver document submissions will show up here for approval.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {drivers.map((doc) => (
        <Card key={doc.driverId}>
          <CardHeader
            className="cursor-pointer"
            onClick={() =>
              setExpandedId((current) => (current === doc.driverId ? null : doc.driverId))
            }
          >
            <div className="flex items-center justify-between gap-2">
              <div>
                <CardTitle className="text-base">
                  {doc.driverName ?? "Unknown driver"}
                </CardTitle>
                {(doc.driverEmail || doc.driverPhone) && (
                  <CardDescription>
                    {[doc.driverEmail, doc.driverPhone].filter(Boolean).join(" · ")}
                  </CardDescription>
                )}
                <CardDescription>
                  Last updated {new Date(doc.updatedAt).toLocaleString("en-IN")}
                </CardDescription>
              </div>
              <Badge variant="secondary">Pending review</Badge>
            </div>
          </CardHeader>
          {expandedId === doc.driverId && (
            <CardContent className="border-t p-0">
              <DriverDocumentReviewCard doc={doc} onDone={() => setExpandedId(null)} />
            </CardContent>
          )}
        </Card>
      ))}
    </div>
  );
}
