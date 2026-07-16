"use client";

import { useCallback, useState } from "react";

/**
 * Scaffolding only — there is no push server yet (no VAPID keys, no
 * `/api/push/subscribe` endpoint on the backend). This hook exists so the
 * eventual push feature has an obvious, single place to land without
 * touching the service worker config again:
 *
 *   1. Generate a VAPID key pair and add the public key as
 *      NEXT_PUBLIC_VAPID_PUBLIC_KEY.
 *   2. Add a backend endpoint to store/remove PushSubscription objects.
 *   3. Call `subscribe()` below from wherever you want to prompt the rider
 *      (e.g. after their first completed ride), then POST
 *      `registration.pushManager.subscribe(...)`'s result to that endpoint.
 *   4. Add a `push` + `notificationclick` listener. @ducanh2912/next-pwa
 *      supports merging a custom worker source — see the "Notifications"
 *      section of PWA_SETUP.md for the exact wiring.
 *
 * Calling `isSupported()` today will simply tell you whether the current
 * browser *could* support push — it does not register anything.
 */
export function usePushNotifications() {
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">(
    typeof window !== "undefined" && "Notification" in window
      ? Notification.permission
      : "unsupported"
  );

  const isSupported = useCallback(() => {
    return (
      typeof window !== "undefined" &&
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      "Notification" in window
    );
  }, []);

  const requestPermission = useCallback(async () => {
    if (!isSupported()) return "unsupported" as const;
    const result = await Notification.requestPermission();
    setPermission(result);
    return result;
  }, [isSupported]);

  return { permission, isSupported, requestPermission };
}
