"use client";

import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { cn } from "@/lib/utils";

const Tabs = TabsPrimitive.Root;

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List> & {
    /** "bottomNav" pins this list to the bottom of the viewport as an
     *  app-style tab bar on mobile, reverting to the normal inline pill
     *  style at sm+ (where there's room for a real tab strip). */
    variant?: "default" | "bottomNav";
  }
>(({ className, variant = "default", ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      variant === "default" &&
        "inline-flex h-10 items-center justify-start gap-1 rounded-md bg-muted p-1 text-muted-foreground",
      variant === "bottomNav" &&
        cn(
          "fixed inset-x-0 bottom-0 z-40 flex h-16 items-stretch justify-around gap-1 border-t bg-background/85 px-1 pb-[env(safe-area-inset-bottom)] text-muted-foreground backdrop-blur-md",
          "sm:static sm:inset-auto sm:h-10 sm:items-center sm:justify-start sm:gap-1 sm:rounded-md sm:border-t-0 sm:bg-muted sm:px-1 sm:pb-1 sm:backdrop-blur-none"
        ),
      className
    )}
    {...props}
  />
));
TabsList.displayName = TabsPrimitive.List.displayName;

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger> & {
    /** Shown stacked above the label on mobile when the parent TabsList
     *  uses variant="bottomNav"; hidden at sm+ where the label alone fits
     *  the pill style. */
    icon?: React.ReactNode;
  }
>(({ className, icon, children, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm",
      icon &&
        "flex-1 flex-col gap-0.5 rounded-lg text-[11px] data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none sm:flex-none sm:flex-row sm:gap-1.5 sm:text-sm sm:data-[state=active]:bg-background sm:data-[state=active]:text-foreground sm:data-[state=active]:shadow-sm",
      className
    )}
    {...props}
  >
    {icon && <span className="sm:hidden">{icon}</span>}
    {children}
  </TabsPrimitive.Trigger>
));
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn("mt-4 focus-visible:outline-none", className)}
    {...props}
  />
));
TabsContent.displayName = TabsPrimitive.Content.displayName;

export { Tabs, TabsList, TabsTrigger, TabsContent };
