"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Camera, CheckCircle2, Clock3, FileWarning, ShieldAlert } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useMyDriverDocuments,
  useSubmitDriverDocuments,
  type DriverDocumentsInput,
} from "@/hooks/driver/useDriverDocuments";
import { deriveDriverDocumentStatus, type DriverDocumentStatus } from "@/types";
import { validatePhoto } from "@/lib/validatePhoto";

const EMPTY_INPUT: DriverDocumentsInput = {
  aadharNumber: "",
  aadharPhoto: null,
  licenseNumber: "",
  licenseExpiry: "",
  licensePhoto: null,
  vehicleRegistrationNumber: "",
  vehicleModel: "",
  vehiclePhoto: null,
};

function PhotoField({
  label,
  file,
  existingUrl,
  onChange,
}: {
  label: string;
  file: File | null;
  existingUrl?: string | null;
  onChange: (file: File | null) => void;
}) {
  const inputId = `photo-${label.toLowerCase().replace(/\s+/g, "-")}`;
  const previewUrl = file ? URL.createObjectURL(file) : existingUrl || null;
  const [error, setError] = useState<string | null>(null);

  function handleChange(selected: File | null) {
    if (!selected) {
      setError(null);
      onChange(null);
      return;
    }
    const validationError = validatePhoto(selected);
    setError(validationError);
    // Still don't hand a bad file up to the form — resets the input so a
    // rejected file can't be silently submitted.
    onChange(validationError ? null : selected);
  }

  return (
    <div className="space-y-1.5">
      <Label htmlFor={inputId}>{label}</Label>
      <div className="flex items-center gap-3">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-muted">
          {previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={previewUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <Camera className="h-5 w-5 text-muted-foreground" />
          )}
        </div>
        <div className="flex-1">
          <Input
            id={inputId}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(e) => handleChange(e.target.files?.[0] ?? null)}
            className="text-xs"
          />
          <p className="mt-1 text-[11px] text-muted-foreground">Image, up to 5MB</p>
          {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
        </div>
      </div>
    </div>
  );
}

function StatusBanner({
  status,
  rejectionReason,
}: {
  status: DriverDocumentStatus;
  rejectionReason?: string | null;
}) {
  if (status === "verified") {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-success/30 bg-success/10 px-3 py-2 text-sm text-success">
        <CheckCircle2 className="h-4 w-4 shrink-0" />
        Your documents are verified. You&apos;re all set to go online.
      </div>
    );
  }
  if (status === "pending") {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-sm text-warning">
        <Clock3 className="h-4 w-4 shrink-0" />
        Submitted — waiting on owner review. This usually doesn&apos;t take long.
      </div>
    );
  }
  if (status === "rejected") {
    return (
      <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
        <FileWarning className="mt-0.5 h-4 w-4 shrink-0" />
        <span>
          Rejected{rejectionReason ? `: ${rejectionReason}` : "."} Please correct and resubmit
          below.
        </span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2 rounded-lg border border-dashed px-3 py-2 text-sm text-muted-foreground">
      <ShieldAlert className="h-4 w-4 shrink-0" />
      Submit your documents to get verified and start accepting rides.
    </div>
  );
}

/** Driver "Complete your profile" screen — Aadhaar, license, and vehicle
 *  details + photos, reviewed by the owner before the driver can go online. */
export function DriverDocumentsForm() {
  const documents = useMyDriverDocuments();
  const submit = useSubmitDriverDocuments();
  const [form, setForm] = useState<DriverDocumentsInput>(EMPTY_INPUT);

  const status = documents.data ? deriveDriverDocumentStatus(documents.data) : "not_submitted";
  const canEdit = status === "not_submitted" || status === "rejected";

  // Surfaces approval/rejection as a toast the moment the polling query
  // picks it up, in lieu of dedicated push/in-app notification infra —
  // there's no notification list elsewhere in the app to hook into yet.
  const previousStatus = useRef(status);
  useEffect(() => {
    if (previousStatus.current === "pending" && status === "verified") {
      toast.success("Your documents were approved", {
        description: "You're all set to go online.",
      });
    }
    if (previousStatus.current === "pending" && status === "rejected") {
      toast.error("Your documents were rejected", {
        description: documents.data?.rejectionReason || "Please review and resubmit.",
      });
    }
    previousStatus.current = status;
  }, [status, documents.data?.rejectionReason]);

  function update<K extends keyof DriverDocumentsInput>(key: K, value: DriverDocumentsInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    submit.mutate(form);
  }

  if (documents.isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-3.5 w-64" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <div>
            <CardTitle>Driver documents</CardTitle>
            <CardDescription>
              Aadhaar, license, and vehicle details — reviewed by the owner before you can go
              online.
            </CardDescription>
          </div>
          {status === "verified" && <Badge variant="success">Verified</Badge>}
          {status === "pending" && <Badge variant="secondary">Pending review</Badge>}
          {status === "rejected" && <Badge variant="destructive">Rejected</Badge>}
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <StatusBanner status={status} rejectionReason={documents.data?.rejectionReason} />

        {canEdit && (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-3">
              <p className="text-sm font-medium">Aadhaar</p>
              <div className="space-y-1.5">
                <Label htmlFor="aadhaar-number">Aadhaar number</Label>
                <Input
                  id="aadhaar-number"
                  inputMode="numeric"
                  maxLength={12}
                  placeholder="1234 5678 9012"
                  value={form.aadharNumber}
                  onChange={(e) => update("aadharNumber", e.target.value)}
                  required
                />
              </div>
              <PhotoField
                label="Aadhaar photo"
                file={form.aadharPhoto}
                existingUrl={documents.data?.aadharPhotoUrl}
                onChange={(f) => update("aadharPhoto", f)}
              />
            </div>

            <div className="space-y-3 border-t pt-4">
              <p className="text-sm font-medium">Driving license</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="license-number">License number</Label>
                  <Input
                    id="license-number"
                    value={form.licenseNumber}
                    onChange={(e) => update("licenseNumber", e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="license-expiry">Expiry date</Label>
                  <Input
                    id="license-expiry"
                    type="date"
                    value={form.licenseExpiry}
                    onChange={(e) => update("licenseExpiry", e.target.value)}
                    required
                  />
                </div>
              </div>
              <PhotoField
                label="License photo"
                file={form.licensePhoto}
                existingUrl={documents.data?.licensePhotoUrl}
                onChange={(f) => update("licensePhoto", f)}
              />
            </div>

            <div className="space-y-3 border-t pt-4">
              <p className="text-sm font-medium">Vehicle</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="vehicle-reg">Registration number</Label>
                  <Input
                    id="vehicle-reg"
                    value={form.vehicleRegistrationNumber}
                    onChange={(e) => update("vehicleRegistrationNumber", e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="vehicle-model">Model</Label>
                  <Input
                    id="vehicle-model"
                    placeholder="e.g. Maruti Swift Dzire"
                    value={form.vehicleModel}
                    onChange={(e) => update("vehicleModel", e.target.value)}
                    required
                  />
                </div>
              </div>
              <PhotoField
                label="Vehicle photo"
                file={form.vehiclePhoto}
                existingUrl={documents.data?.vehiclePhotoUrl}
                onChange={(f) => update("vehiclePhoto", f)}
              />
            </div>

            <Button type="submit" disabled={submit.isPending} className="w-full sm:w-auto">
              {submit.isPending ? "Submitting…" : "Submit for review"}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
