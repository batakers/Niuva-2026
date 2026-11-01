import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/**
 * Knows the named sizes from `--text-*` in globals.css. Without them,
 * tailwind-merge reads `text-ui` as a colour and drops it (or the colour)
 * whenever both share one `cn()`.
 */
const twMerge = extendTailwindMerge({
  extend: { theme: { text: ["caption", "ui", "lead"] } },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
