"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useSessionStore } from "@/store/useSessionStore";
import { DashboardSkeleton } from "@/components/layout/DashboardSkeleton";
import type { Role } from "@/types";

interface RequireAuthProps {
  /** Only sessions with this role may view the wrapped content. */
  role: Role;
  children: ReactNode;
}

/**
 * Layout-level auth wrapper. Waits for the persisted zustand store to
 * rehydrate (so we don't flash a redirect before localStorage has loaded),
 * then:
 *  - no session at all           -> /login
 *  - session exists but wrong role (e.g. a driver hitting /owner) -> /login
 *  - session matches             -> render children
 *
 * Use this in each protected route's layout.tsx, e.g.:
 *   <RequireAuth role="rider">{children}</RequireAuth>
 */
export function RequireAuth({ role, children }: RequireAuthProps) {
  const router = useRouter();
  const session = useSessionStore((s) => s.session);
  const hasHydrated = useSessionStore((s) => s.hasHydrated);

  const isAuthorized = !!session && session.role === role;

  useEffect(() => {
    if (!hasHydrated) return;
    if (!isAuthorized) {
      router.replace("/login");
    }
  }, [hasHydrated, isAuthorized, router]);

  // Avoid rendering protected content (or a premature redirect) until we
  // know what's actually in storage.
  if (!hasHydrated || !isAuthorized) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <DashboardSkeleton />
      </div>
    );
  }

  return <>{children}</>;
}

/**
 * HOC variant, for wrapping a whole page component instead of using it
 * inline in a layout — functionally identical to <RequireAuth>.
 *
 *   export default withAuthGuard(RiderDashboardPage, "rider");
 */
export function withAuthGuard<P extends object>(
  Component: ((props: P) => JSX.Element) & { displayName?: string; name?: string },
  role: Role
) {
  function Guarded(props: P) {
    return (
      <RequireAuth role={role}>
        <Component {...props} />
      </RequireAuth>
    );
  }
  Guarded.displayName = `withAuthGuard(${Component.displayName ?? Component.name ?? "Component"})`;
  return Guarded;
}
