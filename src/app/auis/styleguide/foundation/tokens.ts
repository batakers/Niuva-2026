export type TokenStatus = "locked" | "approved";

export type TokenSwatch = {
  label: string;
  token: string;
  value: string;
  status: TokenStatus;
};

export const brandScale = [
  { label: "50", token: "--brand-50", value: "#f5f9fc", status: "approved" },
  { label: "100", token: "--brand-100", value: "#e8f1f8", status: "approved" },
  { label: "200", token: "--brand-200", value: "#d2e3ef", status: "approved" },
  { label: "300", token: "--brand-300", value: "#b4cfe0", status: "approved" },
  { label: "400", token: "--brand-400", value: "#8fb5cf", status: "approved" },
  { label: "500", token: "--brand-500", value: "#6390bb", status: "locked" },
  { label: "600", token: "--brand-600", value: "#4f789f", status: "approved" },
  { label: "700", token: "--brand-700", value: "#3f607f", status: "approved" },
  { label: "800", token: "--brand-800", value: "#344f67", status: "approved" },
  { label: "900", token: "--brand-900", value: "#2b4053", status: "approved" },
  { label: "950", token: "--brand-950", value: "#1f2e3b", status: "approved" },
] as const satisfies readonly TokenSwatch[];

export const neutralScale = [
  { label: "50", token: "--neutral-50", value: "#f8fafc", status: "approved" },
  { label: "100", token: "--neutral-100", value: "#f1f5f9", status: "approved" },
  { label: "200", token: "--neutral-200", value: "#e2e8f0", status: "approved" },
  { label: "300", token: "--neutral-300", value: "#cbd5e1", status: "approved" },
  { label: "400", token: "--neutral-400", value: "#94a3b8", status: "approved" },
  { label: "500", token: "--neutral-500", value: "#64748b", status: "approved" },
  { label: "600", token: "--neutral-600", value: "#475569", status: "approved" },
  { label: "700", token: "--neutral-700", value: "#334155", status: "approved" },
  { label: "800", token: "--neutral-800", value: "#1e293b", status: "approved" },
  { label: "900", token: "--neutral-900", value: "#0f172a", status: "approved" },
  { label: "950", token: "--neutral-950", value: "#020617", status: "approved" },
] as const satisfies readonly TokenSwatch[];

export const semanticTokens = [
  { label: "Background", token: "--background", value: "var(--neutral-50)", status: "approved" },
  { label: "Foreground", token: "--foreground", value: "var(--neutral-900)", status: "approved" },
  { label: "Primary", token: "--primary", value: "var(--brand-500)", status: "approved" },
  { label: "Primary foreground", token: "--primary-foreground", value: "var(--neutral-900)", status: "approved" },
  { label: "Secondary", token: "--secondary", value: "var(--brand-100)", status: "approved" },
  { label: "Muted", token: "--muted", value: "var(--neutral-100)", status: "approved" },
  { label: "Border", token: "--border", value: "var(--neutral-200)", status: "approved" },
  { label: "Success", token: "--success", value: "#166534", status: "approved" },
  { label: "Warning", token: "--warning", value: "#92400e", status: "approved" },
  { label: "Info", token: "--info", value: "#1d4ed8", status: "approved" },
  { label: "Destructive", token: "--destructive", value: "#b91c1c", status: "approved" },
] as const satisfies readonly TokenSwatch[];

export const contrastTokens = [
  {
    label: "Text utama / light canvas",
    foreground: "#0f172a",
    background: "#f8fafc",
    ratio: "17.06:1",
  },
  {
    label: "Body text / card",
    foreground: "#334155",
    background: "#ffffff",
    ratio: "10.35:1",
  },
  {
    label: "Muted text / card",
    foreground: "#475569",
    background: "#ffffff",
    ratio: "7.58:1",
  },
  {
    label: "Brand link / card",
    foreground: "#3f607f",
    background: "#ffffff",
    ratio: "6.58:1",
  },
  {
    label: "Button text / Niuva Blue",
    foreground: "#0f172a",
    background: "#6390bb",
    ratio: "5.30:1",
  },
] as const;

export const typographyTokens = [
  {
    role: "Display",
    className: "font-display text-4xl font-semibold leading-tight tracking-tight sm:text-5xl",
    familyToken: "--font-display-token",
    size: "2.25rem → 3rem",
    lineHeight: "1.1",
    weight: "600",
    tracking: "-0.025em",
    usage: "Hero or page-level proof heading",
  },
  {
    role: "Heading",
    className: "font-display text-2xl font-semibold leading-tight tracking-tight",
    familyToken: "--font-display-token",
    size: "1.5rem",
    lineHeight: "1.25",
    weight: "600",
    tracking: "-0.025em",
    usage: "Section heading",
  },
  {
    role: "Body",
    className: "font-body text-base leading-7",
    familyToken: "--font-body-token",
    size: "1rem",
    lineHeight: "1.75",
    weight: "400",
    tracking: "0",
    usage: "Reading and explanatory copy",
  },
  {
    role: "Label",
    className: "font-body text-sm font-medium",
    familyToken: "--font-body-token",
    size: "0.875rem",
    lineHeight: "1.25",
    weight: "500",
    tracking: "0",
    usage: "Form and metadata labels",
  },
  {
    role: "Mono",
    className: "font-technical text-sm",
    familyToken: "--font-technical-token",
    size: "0.875rem",
    lineHeight: "1.25",
    weight: "400",
    tracking: "0.02em",
    usage: "Technical labels, token names, and status values",
  },
] as const;

export const rhythmTokens = [
  { label: "Section gap", token: "--section-gap-token", value: "4rem", usage: "Large page sections" },
  { label: "Content gap", token: "--content-gap-token", value: "1.5rem", usage: "Related content groups" },
  { label: "Card gap", token: "--card-gap-token", value: "1rem", usage: "Tight component groups" },
  { label: "Control radius", token: "--radius-control", value: "0.5rem", usage: "Buttons and inputs" },
  { label: "Card radius", token: "--radius-card", value: "0.75rem", usage: "Panels and cards" },
  { label: "Media radius", token: "--radius-media", value: "1rem", usage: "Images and media frames" },
] as const;

export const shadowTokens = [
  { label: "Card", token: "--shadow-card-token", value: "0 1px 2px rgb(15 23 42 / 0.06)", usage: "Quiet separation from the surface" },
  { label: "Floating", token: "--shadow-floating-token", value: "0 16px 32px / 0 2px 8px", usage: "Temporary overlays and elevated UI" },
] as const;

export const motionTokens = [
  { label: "Fast", token: "--duration-fast-token", value: "150ms", usage: "Micro feedback and control states" },
  { label: "Standard", token: "--duration-normal-token", value: "220ms", usage: "Short movement and surface transitions" },
  { label: "Standard easing", token: "--ease-standard-token", value: "cubic-bezier(0.2, 0, 0, 1)", usage: "Decelerated UI response" },
  { label: "Emphasis easing", token: "--ease-emphasis-token", value: "cubic-bezier(0.2, 0.8, 0.2, 1)", usage: "Purposeful emphasis movement" },
] as const;
