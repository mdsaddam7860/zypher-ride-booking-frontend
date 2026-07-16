import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { RideStatus } from "@/types";

interface Stage {
  status: RideStatus;
  label: string;
  colorVar: string; // CSS var name defined in globals.css
}

// Mirrors the backend's actual RideStatus pipeline 1:1 (see
// ride-booking-backend/src/types/index.ts) rather than inventing stage
// names the API doesn't produce.
const STAGES: Stage[] = [
  { status: "pending_assignment", label: "Requested", colorVar: "--ladder-pending" },
  { status: "driver_assigned", label: "Driver assigned", colorVar: "--ladder-assigned" },
  { status: "driver_accepted", label: "Arriving", colorVar: "--ladder-accepted" },
  { status: "in_progress", label: "In transit", colorVar: "--ladder-progress" },
  { status: "completed", label: "Completed", colorVar: "--ladder-completed" },
];

export interface RideStateLadderProps {
  currentStatus: RideStatus;
  className?: string;
}

/**
 * Visual stepper for the ride pipeline. Lights up every stage up to and
 * including `currentStatus`; renders a distinct cancelled state instead of
 * the ladder when the ride was called off.
 */
export function RideStateLadder({ currentStatus, className }: RideStateLadderProps) {
  if (currentStatus === "cancelled") {
    return (
      <div
        className={cn(
          "flex items-center gap-2 rounded-md border border-[hsl(var(--ladder-cancelled))]/30 bg-[hsl(var(--ladder-cancelled))]/10 px-4 py-3 text-sm font-medium text-[hsl(var(--ladder-cancelled))]",
          className
        )}
      >
        <X className="h-4 w-4" />
        Ride cancelled
      </div>
    );
  }

  const currentIndex = STAGES.findIndex((stage) => stage.status === currentStatus);

  return (
    <div className={cn("flex w-full items-start", className)}>
      {STAGES.map((stage, index) => {
        const isDone = currentIndex > index;
        const isCurrent = currentIndex === index;
        const isActive = isDone || isCurrent;

        return (
          <div key={stage.status} className="flex flex-1 flex-col items-center last:flex-none">
            <div className="flex w-full items-center">
              <div
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-xs font-semibold transition-all duration-300",
                  isActive ? "border-transparent text-white" : "border-border bg-background text-muted-foreground",
                  isCurrent && "scale-110 shadow-md"
                )}
                style={isActive ? { backgroundColor: `hsl(var(${stage.colorVar}))` } : undefined}
              >
                {isDone ? <Check className="h-4 w-4" /> : index + 1}
              </div>

              {/* connector after the node, joining it to the next stage */}
              {index < STAGES.length - 1 && (
                <div
                  className={cn(
                    "h-0.5 flex-1 transition-colors",
                    currentIndex > index ? "bg-primary" : "bg-border"
                  )}
                />
              )}
            </div>

            <span
              className={cn(
                "mt-2 text-center text-xs font-medium",
                isCurrent ? "text-foreground" : "text-muted-foreground"
              )}
            >
              {stage.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
