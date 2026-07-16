"use client";

import { useTheme } from "next-themes";
import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

/** Sonner instance wired to next-themes and our card/border tokens, so toasts
 *  look native to the app instead of the library's default styling. */
export function Toaster({ ...props }: ToasterProps) {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      position="top-right"
      closeButton
      richColors
      toastOptions={{
        classNames: {
          toast:
            "group toast rounded-lg border bg-card text-card-foreground shadow-lg font-sans",
          description: "text-muted-foreground",
          actionButton:
            "bg-primary text-primary-foreground rounded-md",
          cancelButton:
            "bg-muted text-muted-foreground rounded-md",
        },
      }}
      {...props}
    />
  );
}
