"use client";

import { useCallback, useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // iOS Safari's own flag for "added to home screen", predates the
    // display-mode media query.
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

/**
 * Wraps the `beforeinstallprompt` lifecycle (Chrome/Edge/Android) so any
 * component can show a custom "Install app" affordance instead of relying
 * on the browser's own UI, and know when to hide it because the app is
 * already installed.
 *
 * Safari/iOS never fires `beforeinstallprompt` — there's no programmatic
 * install prompt there, only "Add to Home Screen" from the share sheet.
 * `canInstall` will simply stay false on those browsers; consumers that
 * want to nudge iOS users toward that manual flow should check
 * `isIos` themselves.
 */
export function useInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(
    null
  );
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    setIsInstalled(isStandalone());

    function handleBeforeInstallPrompt(event: Event) {
      // Stop the browser's default mini-infobar; we show our own button.
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    }

    function handleAppInstalled() {
      setIsInstalled(true);
      setDeferredPrompt(null);
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    if (!deferredPrompt) return "unavailable" as const;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    // Each captured event can only be used once.
    setDeferredPrompt(null);
    return outcome;
  }, [deferredPrompt]);

  return {
    /** True once a real, native install prompt is ready to fire. */
    canInstall: !!deferredPrompt && !isInstalled,
    /** True if the app is already running installed/standalone. */
    isInstalled,
    promptInstall,
  };
}
