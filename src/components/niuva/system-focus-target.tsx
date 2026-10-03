"use client";

import { useEffect } from "react";
import { SYSTEM_HEADING_ID } from "./system-state-copy";

// system-state-copy.ts is a pure constants module (no server-only imports),
// so it is safe to import from a client component.
const DEFAULT_TARGET_ID = SYSTEM_HEADING_ID;

/**
 * Moves focus to the system-state heading on mount so the next Tab lands on
 * the first recovery action. Renders nothing.
 */
export function SystemFocusTarget({ targetId = DEFAULT_TARGET_ID }: Readonly<{ targetId?: string }>) {
  useEffect(() => {
    document.getElementById(targetId)?.focus({ preventScroll: true });
  }, [targetId]);

  return null;
}
