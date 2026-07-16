import { create } from "zustand";
import type { CarModel } from "@/components/ride/VehicleCatalog";
import { CAR_CATALOG } from "@/components/ride/VehicleCatalog";
import type { LatLng } from "@/types";
import type { ActiveField } from "@/components/map/RideMap";

/**
 * Draft booking-form state for the rider's "Book" tab.
 *
 * This used to live as local `useState` inside <BookRideTab>. That was fine
 * while "Book" was the only tab a rider ever saw, but now that a "Home" tab
 * sits alongside it, Radix's <Tabs.Content> unmounts the inactive tab's
 * subtree — so switching Home -> Book -> Home would wipe out whatever the
 * rider had already typed/pinned. Lives in a Zustand store instead (outside
 * the React tree, so it survives unmount) purely so the two tabs can share
 * one instantly-readable source of truth with no flicker.
 *
 * Deliberately NOT persisted to localStorage: pickup/drop-off pins are
 * short-lived, in-session data, not a "preference" worth keeping across
 * browser restarts (unlike the saved Home/Work addresses in
 * `lib/savedAddresses.ts`, or the active ride id in `useSessionStore`,
 * which both are).
 */
interface RideDraftState {
  pickup: LatLng | null;
  pickupLabel: string;
  destination: LatLng | null;
  destinationLabel: string;
  activeField: ActiveField;
  selectedCar: CarModel;

  setPickup: (location: LatLng | null, label?: string) => void;
  setPickupLabel: (label: string) => void;
  setDestination: (location: LatLng | null, label?: string) => void;
  setDestinationLabel: (label: string) => void;
  setActiveField: (field: ActiveField) => void;
  setSelectedCar: (car: CarModel) => void;
  resetDraft: () => void;

  /**
   * Bumped every time something (e.g. the Home tab's "Where to?" button)
   * wants the Book tab's pickup field focused as soon as it mounts/becomes
   * visible. BookRideTab watches this value rather than a boolean so that
   * requesting focus twice in a row (without the value changing in between)
   * still triggers the effect.
   */
  focusPickupToken: number;
  requestFocusPickup: () => void;
}

const initialDraft = {
  pickup: null as LatLng | null,
  pickupLabel: "",
  destination: null as LatLng | null,
  destinationLabel: "",
  activeField: "pickup" as ActiveField,
  selectedCar: CAR_CATALOG[0]!,
};

export const useRideStore = create<RideDraftState>()((set) => ({
  ...initialDraft,

  setPickup: (location, label) =>
    set((state) => ({
      pickup: location,
      pickupLabel: label !== undefined ? label : state.pickupLabel,
    })),
  setPickupLabel: (label) => set({ pickupLabel: label }),
  setDestination: (location, label) =>
    set((state) => ({
      destination: location,
      destinationLabel: label !== undefined ? label : state.destinationLabel,
    })),
  setDestinationLabel: (label) => set({ destinationLabel: label }),
  setActiveField: (field) => set({ activeField: field }),
  setSelectedCar: (car) => set({ selectedCar: car }),
  resetDraft: () => set({ ...initialDraft }),

  focusPickupToken: 0,
  requestFocusPickup: () =>
    set((state) => ({ focusPickupToken: state.focusPickupToken + 1 })),
}));
