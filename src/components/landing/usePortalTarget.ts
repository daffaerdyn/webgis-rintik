"use client";

import { useSyncExternalStore } from "react";

const emptySubscribe = () => () => {};

/** Resolves a client-only DOM portal container safely after hydration. */
export function usePortalTarget(elementId: string): HTMLElement | null {
  const isClient = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
  return isClient ? document.getElementById(elementId) : null;
}
