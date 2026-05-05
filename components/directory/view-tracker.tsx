"use client";

import { useEffect, useRef } from "react";

/**
 * Mounts on the app detail page; fires one POST to /api/views/{appId}
 * per page render. Tracking failure is silent — we never block the user.
 *
 * The useRef guard makes the StrictMode dev-mode double-mount idempotent
 * for the lifetime of the component instance. (Real visitors get one
 * ping each — distinct mounts in production.)
 */
export function ViewTracker({ appId }: { appId: number }) {
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    // keepalive lets the request survive a quick navigation away.
    fetch(`/api/views/${appId}`, { method: "POST", keepalive: true }).catch(
      () => {
        // intentionally silent
      },
    );
  }, [appId]);

  return null;
}
