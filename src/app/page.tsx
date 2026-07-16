"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSessionStore } from "@/store/useSessionStore";

export default function RootPage() {
  const router = useRouter();
  const session = useSessionStore((s) => s.session);
  const hasHydrated = useSessionStore((s) => s.hasHydrated);

  useEffect(() => {
    if (!hasHydrated) return;
    router.replace(session ? `/${session.role}` : "/login");
  }, [hasHydrated, session, router]);

  return null;
}
