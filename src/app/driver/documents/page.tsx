"use client";

import { DriverDocumentsForm } from "@/components/driver/DriverDocumentsForm";

export default function DriverDocumentsPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <p className="font-mono text-[11px] font-medium uppercase tracking-[0.2em] text-primary">
          Zypher · Driver
        </p>
        <h1 className="font-display text-3xl font-semibold leading-tight tracking-tight">
          Complete your profile
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Submit your documents to get verified — this unlocks going online and accepting rides.
        </p>
      </div>
      <DriverDocumentsForm />
    </div>
  );
}
