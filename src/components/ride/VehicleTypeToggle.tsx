"use client";

import { Car } from "lucide-react";
import { cn } from "@/lib/utils";
import type { VehicleType } from "@/types";

const OPTIONS: { value: VehicleType; label: string; hint: string }[] = [
  { value: "4_seater", label: "4-seater", hint: "Hatchback/sedan" },
  { value: "7_seater", label: "7-seater", hint: "SUV/minivan" },
];

interface VehicleTypeToggleProps {
  value: VehicleType;
  onChange: (value: VehicleType) => void;
  disabled?: boolean;
}

/**
 * Radio-style toggle shown on the fare-estimate screen, before the price.
 * Fare depends on vehicle type, so callers should re-fetch the estimate
 * whenever this changes rather than reusing a stale quote.
 */
export function VehicleTypeToggle({ value, onChange, disabled }: VehicleTypeToggleProps) {
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Vehicle type</p>
      <div className="grid grid-cols-2 gap-2">
        {OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            disabled={disabled}
            onClick={() => onChange(option.value)}
            className={cn(
              "flex items-center gap-2 rounded-xl border-2 p-2.5 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50",
              value === option.value ? "border-foreground bg-muted/40" : "border-border hover:border-foreground/40"
            )}
          >
            <Car className="h-4 w-4 shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-semibold leading-tight">{option.label}</p>
              <p className="truncate text-xs text-muted-foreground">{option.hint}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
