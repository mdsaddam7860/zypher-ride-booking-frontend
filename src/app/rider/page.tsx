"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Clock3, Home as HomeIcon, MapPin, User2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SkeletonRow } from "@/components/ui/skeleton";
import { RideHistoryList } from "@/components/ride/RideHistoryList";
import { ProfilePanel } from "@/components/user/ProfilePanel";
import { HomeTab } from "@/components/rider/HomeTab";
import { BookRideTab } from "@/components/rider/BookRideTab";
import { useRideHistory } from "@/hooks/rider/useRiderRide";
import { getApiErrorMessage } from "@/lib/api";
import { useSessionStore } from "@/store/useSessionStore";

type RiderTab = "home" | "book" | "history" | "profile";

function PastRidesTab() {
  const history = useRideHistory();
  return (
    <div className="mx-auto max-w-2xl p-6">
      <h2 className="mb-4 text-lg font-semibold">Past rides</h2>
      {history.isLoading && (
        <div className="space-y-2" aria-busy="true" aria-label="Loading past rides">
          <SkeletonRow />
          <SkeletonRow />
          <SkeletonRow />
        </div>
      )}
      {history.isError && (
        <p className="text-sm text-destructive">
          {getApiErrorMessage(history.error)}
        </p>
      )}
      {history.data && <RideHistoryList rides={history.data} />}
    </div>
  );
}

function RiderDashboard() {
  const activeRideId = useSessionStore((s) => s.activeRideId);
  const hasHydrated = useSessionStore((s) => s.hasHydrated);
  const searchParams = useSearchParams();
  const requestedTab = searchParams.get("tab");

  // Start on "home"; once we know (post-hydration) whether the rider has an
  // in-progress ride, bounce straight to "book" instead — we don't want to
  // hide their live status behind the Home tab on load. An explicit
  // ?tab=... (e.g. from a PWA app shortcut) always wins.
  const [tab, setTab] = useState<RiderTab>(
    requestedTab === "history" || requestedTab === "book" || requestedTab === "profile"
      ? requestedTab
      : "home"
  );
  const [hasAppliedDefaultRoute, setHasAppliedDefaultRoute] = useState(
    requestedTab !== null
  );

  useEffect(() => {
    if (!hasHydrated || hasAppliedDefaultRoute) return;
    if (activeRideId) setTab("book");
    setHasAppliedDefaultRoute(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasHydrated]);

  return (
    <Tabs
      value={tab}
      onValueChange={(value) => setTab(value as RiderTab)}
      className="flex h-full w-full flex-col"
    >
      <div className="hidden border-b px-5 py-2 sm:block">
        <TabsList>
          <TabsTrigger value="home">Home</TabsTrigger>
          <TabsTrigger value="book">Book</TabsTrigger>
          <TabsTrigger value="history">Past rides</TabsTrigger>
          <TabsTrigger value="profile">Profile</TabsTrigger>
        </TabsList>
      </div>
      <TabsList variant="bottomNav" className="sm:hidden">
        <TabsTrigger value="home" icon={<HomeIcon className="h-5 w-5" />}>
          Home
        </TabsTrigger>
        <TabsTrigger value="book" icon={<MapPin className="h-5 w-5" />}>
          Book
        </TabsTrigger>
        <TabsTrigger value="history" icon={<Clock3 className="h-5 w-5" />}>
          Past rides
        </TabsTrigger>
        <TabsTrigger value="profile" icon={<User2 className="h-5 w-5" />}>
          Profile
        </TabsTrigger>
      </TabsList>
      <TabsContent
        value="home"
        className="mt-0 flex-1 overflow-y-auto pb-16 sm:pb-0"
      >
        <HomeTab onGoToBook={() => setTab("book")} />
      </TabsContent>
      <TabsContent
        value="book"
        className="mt-0 flex-1 overflow-y-auto pb-16 lg:overflow-hidden lg:pb-0 sm:pb-0"
      >
        <BookRideTab />
      </TabsContent>
      <TabsContent value="history" className="mt-0 flex-1 overflow-y-auto pb-20 sm:pb-4">
        <PastRidesTab />
      </TabsContent>
      <TabsContent value="profile" className="mt-0 flex-1 overflow-y-auto p-6 pb-20 sm:pb-6">
        <ProfilePanel />
      </TabsContent>
    </Tabs>
  );
}

export default function RiderDashboardPage() {
  return (
    <Suspense fallback={null}>
      <RiderDashboard />
    </Suspense>
  );
}
