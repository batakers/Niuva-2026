"use client";

import { useEffect, useState, useSyncExternalStore, type PointerEvent } from "react";

// Matches --duration-fast-token in globals.css; retained surfaces exit in 150ms.
const exitDuration = 150;
const reducedMotionQuery = "(prefers-reduced-motion: reduce)";

function subscribeReducedMotion(onChange: () => void) {
  if (typeof window.matchMedia !== "function") return () => {};
  const query = window.matchMedia(reducedMotionQuery);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

function readReducedMotion() {
  return typeof window.matchMedia !== "function" || window.matchMedia(reducedMotionQuery).matches;
}

export function useAdminReducedMotion() {
  return useSyncExternalStore(subscribeReducedMotion, readReducedMotion, () => true);
}

export function isPointerInteraction(event: Event) {
  if (event.type === "click") return "detail" in event && typeof event.detail === "number" && event.detail > 0;
  return ["pointerdown", "pointerup", "mousedown", "mouseup", "touchstart", "touchend"].includes(event.type);
}

/** Keep a closing surface only for its exit; reopening cancels the old removal. */
export function useAdminExitPresence(present: boolean, motionEnabled: boolean) {
  const [retained, setRetained] = useState(present);
  if ((present && !retained) || (!present && !motionEnabled && retained)) {
    setRetained(present);
  }
  useEffect(() => {
    if (present || !retained || !motionEnabled) return;
    const timer = window.setTimeout(() => setRetained(false), exitDuration);
    return () => window.clearTimeout(timer);
  }, [present, retained, motionEnabled]);
  return present || (motionEnabled && retained);
}

/** Pointer feedback never delays keyboard focus or activation. */
export function useAdminPointerPress() {
  const [state, setState] = useState<"instant" | "pressed" | "released">("instant");
  return {
    "data-press-motion": state !== "instant",
    "data-pointer-pressed": state === "pressed",
    onPointerDown: (event: PointerEvent<HTMLElement>) => {
      if (event.button === 0) setState("pressed");
    },
    onPointerUp: () => setState("released"),
    onPointerCancel: () => setState("released"),
    onPointerLeave: () => setState("released"),
    onKeyDown: () => setState("instant"),
    onBlur: () => setState("instant"),
  };
}
