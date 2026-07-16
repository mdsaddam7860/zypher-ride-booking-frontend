import { RequireAuth } from "@/components/auth/RequireAuth";
import { DashboardShell } from "@/components/layout/DashboardShell";

export default function RiderLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth role="rider">
      <DashboardShell role="rider" fullBleed>
        {children}
      </DashboardShell>
    </RequireAuth>
  );
}
