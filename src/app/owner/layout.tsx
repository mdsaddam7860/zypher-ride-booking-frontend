import { RequireAuth } from "@/components/auth/RequireAuth";
import { DashboardShell } from "@/components/layout/DashboardShell";

export default function OwnerLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth role="owner">
      <DashboardShell role="owner">{children}</DashboardShell>
    </RequireAuth>
  );
}
