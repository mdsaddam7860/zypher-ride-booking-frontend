import type { ReactNode } from "react";
import { SideNav } from "@/components/layout/SideNav";
import { PageTransition } from "@/components/layout/PageTransition";
import type { Role } from "@/types";

export function DashboardShell({
  role,
  children,
  fullBleed = false,
}: {
  role: Role;
  children: ReactNode;
  /** Skip the padded/max-width content wrapper — used by the rider map view. */
  fullBleed?: boolean;
}) {
  return (
    // Stacked (mobile top bar + content) below lg, side-by-side (rail + content) at lg+.
    <div className="flex h-screen flex-col overflow-hidden lg:flex-row">
      <SideNav role={role} />
      <main
        className={
          fullBleed
            ? "relative flex-1 overflow-y-auto lg:overflow-hidden"
            : "flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8"
        }
      >
        {fullBleed ? (
          <PageTransition>{children}</PageTransition>
        ) : (
          <div className="mx-auto max-w-5xl space-y-6">
            <PageTransition>{children}</PageTransition>
          </div>
        )}
      </main>
    </div>
  );
}
