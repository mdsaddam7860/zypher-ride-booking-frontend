import { useCallback, useEffect, useState } from "react";
import type { LatLng } from "@/types";

const STORAGE_KEY = "savedAddresses";

export type SavedAddressKind = "home" | "work" | "other";

export interface SavedAddress {
  id: string;
  kind: SavedAddressKind;
  /** Short display label, e.g. "Home", "Work", or a custom nickname. */
  label: string;
  /** Full human-readable address string shown under the label. */
  address: string;
  location: LatLng;
}

/**
 * Reads saved addresses straight from localStorage. Safe to call during SSR
 * (returns an empty list) since `window`/`localStorage` don't exist there.
 */
export function getSavedAddresses(): SavedAddress[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    // Corrupt or unreadable localStorage shouldn't crash the app — just
    // behave as if the rider has no saved addresses yet.
    return [];
  }
}

function persist(addresses: SavedAddress[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(addresses));
}

export function saveSavedAddress(address: SavedAddress): SavedAddress[] {
  const existing = getSavedAddresses().filter((a) => a.id !== address.id);
  const next = [...existing, address];
  persist(next);
  return next;
}

export function removeSavedAddress(id: string): SavedAddress[] {
  const next = getSavedAddresses().filter((a) => a.id !== id);
  persist(next);
  return next;
}

/**
 * React-friendly wrapper around the helpers above: reads saved addresses
 * once on mount (so the app "remembers" Home/Work even after being fully
 * closed and reopened) and keeps a live copy in state so components
 * re-render when an address is added/removed.
 */
export function useSavedAddresses() {
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);

  useEffect(() => {
    setAddresses(getSavedAddresses());
  }, []);

  const save = useCallback((address: SavedAddress) => {
    setAddresses(saveSavedAddress(address));
  }, []);

  const remove = useCallback((id: string) => {
    setAddresses(removeSavedAddress(id));
  }, []);

  return { addresses, save, remove };
}
