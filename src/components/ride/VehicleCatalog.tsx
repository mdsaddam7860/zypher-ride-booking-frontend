"use client";

import { cn } from "@/lib/utils";
import type { VehicleType } from "@/types";

export interface CarModel {
  id: string;
  make: string;
  model: string;
  vehicleType: VehicleType;
  seats: number;
  tagline: string;
  /** Single emoji used as a lightweight stand-in for a vehicle photo/illustration. */
  glyph: string;
}

export const CAR_CATALOG: CarModel[] = [
  {
    id: "honda-city",
    make: "Honda",
    model: "City",
    vehicleType: "4_seater",
    seats: 4,
    tagline: "Sedan comfort, everyday price",
    glyph: "🚗",
  },
  {
    id: "hyundai-aura",
    make: "Hyundai",
    model: "Aura",
    vehicleType: "4_seater",
    seats: 4,
    tagline: "Compact & quick through traffic",
    glyph: "🚕",
  },
  {
    id: "maruti-ertiga",
    make: "Maruti Suzuki",
    model: "Ertiga",
    vehicleType: "7_seater",
    seats: 7,
    tagline: "Room for the whole group",
    glyph: "🚐",
  },
];

interface VehicleCatalogProps {
  selectedCarId: string;
  onSelect: (car: CarModel) => void;
  disabled?: boolean;
}

/**
 * Shows the actual bookable car models up front (not just an abstract
 * "4-seater/7-seater" toggle). Selecting a card still resolves to the
 * `VehicleType` the backend prices on — the specific model is
 * presentation-only until a per-model pricing endpoint exists.
 */
export function VehicleCatalog({ selectedCarId, onSelect, disabled }: VehicleCatalogProps) {
  return (
    <div className="space-y-2.5">
      <p className="font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
        Available cars nearby
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {CAR_CATALOG.map((car) => {
          const isSelected = car.id === selectedCarId;
          return (
            <button
              key={car.id}
              type="button"
              disabled={disabled}
              onClick={() => onSelect(car)}
              className={cn(
                "group relative flex flex-col items-start gap-2 overflow-hidden rounded-md border-2 p-4 text-left transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-50",
                isSelected
                  ? "border-primary bg-primary/5"
                  : "border-border bg-card hover:border-foreground/40"
              )}
            >
              <span
                className={cn(
                  "flex h-12 w-12 items-center justify-center rounded-md text-2xl transition-transform duration-150",
                  isSelected ? "bg-primary/15" : "bg-muted group-hover:scale-105"
                )}
              >
                {car.glyph}
              </span>
              <div className="min-w-0">
                <p className="font-display text-base font-semibold leading-tight">
                  {car.make} {car.model}
                </p>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">{car.tagline}</p>
              </div>
              <span className="mt-auto flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground">
                {car.seats} seats · {car.vehicleType === "4_seater" ? "Hatchback/Sedan" : "SUV/Minivan"}
              </span>
              {isSelected && (
                <span className="absolute right-3 top-3 h-2 w-2 rounded-full bg-primary" aria-hidden />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
