export type MotionTokenKind = "duration" | "easing" | "spring";

export type MotionSystemToken = {
  id: string;
  kind: MotionTokenKind;
  label: string;
  token: string;
  usage: string;
  value: string;
};

export type MotionRecipe = {
  id: string;
  label: string;
  property: string;
  rule: string;
  token: string;
};

export const motionSystemMeta = {
  dependencyAdded: false,
  reducedMotion: "prefers-reduced-motion: reduce",
  scope: "styleguide-only",
  status: "approved-styleguide-only",
  visualReviewApprovedAt: "2026-09-03",
  version: "1.0",
} as const;

export const motionSystemTokens = [
  {
    id: "duration-fast",
    kind: "duration",
    label: "Fast",
    token: "--duration-fast-token",
    usage: "Button state, toggle, and micro feedback.",
    value: "150ms",
  },
  {
    id: "duration-standard",
    kind: "duration",
    label: "Standard",
    token: "--duration-normal-token",
    usage: "Short movement and surface transitions.",
    value: "220ms",
  },
  {
    id: "duration-deliberate",
    kind: "duration",
    label: "Deliberate",
    token: "--motion-duration-deliberate",
    usage: "Layered entrance or layout emphasis; never for routine feedback.",
    value: "320ms",
  },
  {
    id: "ease-standard",
    kind: "easing",
    label: "Standard easing",
    token: "--ease-standard-token",
    usage: "Decelerated response when an element settles into place.",
    value: "cubic-bezier(0.2, 0, 0, 1)",
  },
  {
    id: "ease-emphasis",
    kind: "easing",
    label: "Emphasis easing",
    token: "--ease-emphasis-token",
    usage: "A purposeful state change that needs a little more presence.",
    value: "cubic-bezier(0.2, 0.8, 0.2, 1)",
  },
  {
    id: "spring-like",
    kind: "spring",
    label: "Spring-like fallback",
    token: "--motion-ease-spring-like",
    usage: "CSS-only substitute; a physics engine is not part of v1.",
    value: "cubic-bezier(0.22, 1, 0.36, 1)",
  },
] as const satisfies readonly MotionSystemToken[];

export const motionRecipes = [
  {
    id: "enter",
    label: "Enter",
    property: "opacity + translateY(4px)",
    rule: "Reveal once, settle quickly, and keep the final layout readable without motion.",
    token: "duration-standard + ease-standard",
  },
  {
    id: "exit",
    label: "Exit",
    property: "opacity + translateY(-2px)",
    rule: "Make removal clear but shorter than entrance; never hide a required recovery action.",
    token: "duration-fast + ease-standard",
  },
  {
    id: "hover",
    label: "Hover",
    property: "translateY(-2px) + border/surface",
    rule: "Offer a quiet affordance on pointer surfaces; do not make hover the only explanation.",
    token: "duration-fast + ease-standard",
  },
  {
    id: "press",
    label: "Press",
    property: "translateY(1px)",
    rule: "Acknowledge activation without changing the control's footprint or label.",
    token: "duration-fast + ease-emphasis",
  },
  {
    id: "scroll",
    label: "Scroll",
    property: "scroll-behavior: smooth",
    rule: "Use only for intentional in-page navigation; reduced motion restores automatic scrolling.",
    token: "platform behavior + reduced-motion override",
  },
  {
    id: "layout",
    label: "Layout transition",
    property: "transform/opacity first",
    rule: "Prefer compositor-friendly properties; do not animate height, price, or domain state as spectacle.",
    token: "duration-standard + spring-like fallback",
  },
] as const satisfies readonly MotionRecipe[];
