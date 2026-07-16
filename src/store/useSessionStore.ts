import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { AuthResult, Role } from "@/types";
import type { Locale } from "@/lib/i18n/useTranslation";

/**
 * This is a production dashboard, not the old multi-role dev console, so we
 * only ever track ONE active session at a time (a user is logged in as
 * exactly one role: rider, driver, or owner). The token lives in
 * localStorage via zustand's persist middleware; lib/api.ts reads it
 * straight out of this store on every outgoing request.
 */
interface SessionState {
  session: AuthResult | null;
  setSession: (session: AuthResult) => void;
  clearSession: () => void;
  /** True once persisted state has been read back from localStorage. */
  hasHydrated: boolean;
  setHasHydrated: (hydrated: boolean) => void;
  /** UI language, persisted the same way session data is. Defaults to English. */
  locale: Locale;
  setLocale: (locale: Locale) => void;
  /**
   * Rider's in-progress ride id. Previously kept as local useState inside
   * <BookRideTab>, which Radix's <Tabs.Content> unmounts when you switch to
   * "Past rides"/"Profile" — losing the active ride entirely. Lives here
   * instead so it survives tab switches and page reloads.
   */
  activeRideId: string | null;
  setActiveRideId: (rideId: string | null) => void;
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      session: null,
      setSession: (session) => set({ session }),
      clearSession: () => set({ session: null, activeRideId: null }),
      hasHydrated: false,
      setHasHydrated: (hydrated) => set({ hasHydrated: hydrated }),
      locale: "en",
      setLocale: (locale) => set({ locale }),
      activeRideId: null,
      setActiveRideId: (rideId) => set({ activeRideId: rideId }),
    }),
    {
      name: "ride-booking-session",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        session: state.session,
        locale: state.locale,
        activeRideId: state.activeRideId,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);

export function getStoredToken(): string | null {
  return useSessionStore.getState().session?.token ?? null;
}

export function getStoredRole(): Role | null {
  return useSessionStore.getState().session?.role ?? null;
}
