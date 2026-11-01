/** Shared motion classes for product routes. See DESIGN.md Motion. */
export const motionSystemClasses = {
  /** Inline content that appears after a click: rises 8px while fading in over 220ms on the standard curve. Never for content rendered with the page. */
  enter: "transition-[opacity,translate] duration-[var(--duration-normal-token)] starting:translate-y-2 starting:opacity-0",
} as const;
