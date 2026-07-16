"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";

/**
 * Wraps next-themes so we get Light / Dark / System with zero flash-of-wrong-theme
 * (next-themes injects a blocking script that sets `class="dark"` on <html> before
 * paint, based on localStorage or the OS preference).
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  );
}
