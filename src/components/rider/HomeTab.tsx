"use client";

import {
  Bike,
  Briefcase,
  Car,
  Clock3,
  Download,
  Eye,
  Home as HomeIcon,
  MapPin,
  Search,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { useSessionStore } from "@/store/useSessionStore";
import { useRideStore } from "@/store/useRideStore";
import { useRide } from "@/hooks/rider/useRiderRide";
import { useMyProfile } from "@/hooks/useUserProfile";
import type { RiderProfile } from "@/hooks/useUserProfile";
import { useSavedAddresses } from "@/lib/savedAddresses";
import { useInstallPrompt } from "@/hooks/useInstallPrompt";
import { RideStateLadder } from "@/components/ride/RideStateLadder";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface HomeTabProps {
  /** Switches the parent <Tabs> to the "book" tab. */
  onGoToBook: () => void;
}

/**
 * Placeholder copy only — layout/structure is the point here, not the
 * words. Swap these in for real marketing copy + illustrations whenever
 * they're ready; nothing else in the tab depends on the exact text.
 */
const FEATURE_HIGHLIGHTS = [
  {
    icon: Car,
    title: "On-demand rides",
    body: "Request a ride in a couple of taps, day or night, and watch your driver make their way to you in real time.",
  },
  {
    icon: Eye,
    title: "Fare transparency",
    body: "See your price before you book — no surprise charges, no haggling, no surge you didn't agree to.",
  },
  {
    icon: ShieldCheck,
    title: "Safety features",
    body: "Verified drivers, a ride OTP only you and your driver share, and live trip details you can pass along to anyone you trust.",
  },
];

const SAVED_ADDRESS_ICONS: Record<string, typeof HomeIcon> = {
  home: HomeIcon,
  work: Briefcase,
  other: MapPin,
};

export function HomeTab({ onGoToBook }: HomeTabProps) {
  const activeRideId = useSessionStore((s) => s.activeRideId);
  const requestFocusPickup = useRideStore((s) => s.requestFocusPickup);
  const profile = useMyProfile();
  const riderProfile = profile.data as RiderProfile | undefined;
  const { addresses } = useSavedAddresses();
  const { canInstall, promptInstall } = useInstallPrompt();

  // Only fetch/poll the active ride when there actually is one — this tab
  // shouldn't duplicate BookRideTab's socket/polling work otherwise.
  const rideQuery = useRide(activeRideId);
  const ride = rideQuery.data;

  function handleWhereTo() {
    requestFocusPickup();
    onGoToBook();
  }

  function handleActiveRideBanner() {
    onGoToBook();
  }

  async function handleInstall() {
    const outcome = await promptInstall();
    if (outcome === "accepted") {
      toast.success("Installing Zypher…");
    }
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 p-5 pb-24 sm:pb-6">
      <div>
        <p className="font-mono text-[11px] font-medium uppercase tracking-[0.2em] text-primary">
          Zypher
        </p>
        <h1 className="font-display text-3xl font-semibold leading-none tracking-tight">
          {riderProfile?.name ? `Hey, ${riderProfile.name.split(" ")[0]}` : "Hey there"}
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Where are you headed today?
        </p>
      </div>

      {activeRideId && (
        <button
          type="button"
          onClick={handleActiveRideBanner}
          className="flex w-full items-center gap-3 rounded-xl border-2 border-foreground bg-muted/40 p-4 text-left transition-colors hover:bg-muted/70"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-foreground text-background">
            <Car className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">Active ride</p>
            {ride ? (
              <div className="mt-1">
                <RideStateLadder currentStatus={ride.status} className="text-xs" />
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Tap to see live status</p>
            )}
          </div>
        </button>
      )}

      {/* "Where to?" — lightweight trigger only, for now. Just switches to
          the Book tab and focuses its pickup field; it doesn't own any
          location state itself yet. */}
      <button
        type="button"
        onClick={handleWhereTo}
        className="flex w-full items-center gap-3 rounded-xl border-2 border-foreground bg-card px-4 py-4 text-left shadow-sm transition-transform active:scale-[0.99]"
      >
        <Search className="h-5 w-5 shrink-0 text-muted-foreground" />
        <span className="text-sm font-medium text-muted-foreground">Where to?</span>
      </button>

      {addresses.length > 0 && (
        <div className="flex gap-2 overflow-x-auto scrollbar-none">
          {addresses.map((address) => {
            const Icon = SAVED_ADDRESS_ICONS[address.kind] ?? MapPin;
            return (
              <button
                key={address.id}
                type="button"
                onClick={handleWhereTo}
                className="flex shrink-0 items-center gap-2 rounded-full border-2 border-foreground bg-card px-3.5 py-2 text-sm font-medium"
              >
                <Icon className="h-3.5 w-3.5" />
                {address.label}
              </button>
            );
          })}
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <QuickAction icon={Clock3} label="Ride now" onClick={handleWhereTo} />
        <QuickAction icon={Sparkles} label="Schedule" onClick={handleWhereTo} />
        <QuickAction icon={Bike} label="2-wheeler" onClick={handleWhereTo} />
        <QuickAction icon={Car} label="4-seater" onClick={handleWhereTo} />
        {canInstall && (
          <QuickAction icon={Download} label="Install app" onClick={handleInstall} />
        )}
      </div>

      <div className="space-y-3 border-t border-border pt-5">
        {FEATURE_HIGHLIGHTS.map((feature) => (
          <div
            key={feature.title}
            className="flex items-start gap-3 rounded-xl border border-border bg-card p-4"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted">
              <feature.icon className="h-4 w-4 text-foreground" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold">{feature.title}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{feature.body}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function QuickAction({
  icon: Icon,
  label,
  onClick,
  className,
}: {
  icon: typeof Car;
  label: string;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-3 text-xs font-medium transition-colors hover:border-foreground/40",
        className
      )}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}
