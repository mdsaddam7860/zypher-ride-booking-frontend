import { RequireAuth } from "@/components/auth/RequireAuth";
import { DashboardShell } from "@/components/layout/DashboardShell";

export default function DriverLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth role="driver">
      <DashboardShell role="driver">{children}</DashboardShell>
    </RequireAuth>
  );
}
