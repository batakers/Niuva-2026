"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

// Client-only controls stay disabled until event handlers are attached.
export function useHydrated() {
  return useSyncExternalStore(subscribe, () => true, () => false);
}
