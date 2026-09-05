import type { CSSProperties } from "react";

export type TypographyViewport = "compact" | "standard" | "wide";
export type TypographyFamily = "Space Grotesk" | "Fraunces";
export type TypographyCoreWeight = 400 | 500 | 600;
export type TypographyStrongWeight = 700;
export type TypographyCoreRole =
  | "display"
  | "heading"
  | "subheading"
  | "body"
  | "ui-data";
export type TypographyRole = TypographyCoreRole | "editorial-accent";

type PixelValue = `${number}px`;
type EmValue = `${number}em`;
type ResponsiveValue<T> = Readonly<Record<TypographyViewport, T>>;

export interface TypographySystemToken {
  className: string;
  family: TypographyFamily;
  label: string;
  lineHeight: ResponsiveValue<PixelValue>;
  sample: string;
  size: ResponsiveValue<PixelValue>;
  tracking: ResponsiveValue<EmValue>;
  usage: string;
  weight: TypographyCoreWeight;
}

export interface TypographyViewportStep {
  description: string;
  id: TypographyViewport;
  label: string;
  range: string;
}

export const typographyViewportSteps = [
  {
    description: "Satu kolom, line break terkontrol, dan body tetap 16px.",
    id: "compact",
    label: "Compact",
    range: "0–639px",
  },
  {
    description: "Tablet dan laptop kecil memakai kenaikan hierarchy pertama.",
    id: "standard",
    label: "Standard",
    range: "640–1279px",
  },
  {
    description: "Display mencapai ukuran penuh hanya saat ruang benar-benar tersedia.",
    id: "wide",
    label: "Wide",
    range: "≥1280px",
  },
] as const satisfies readonly TypographyViewportStep[];

export const typographyCoreRoleOrder = [
  "display",
  "heading",
  "subheading",
  "body",
  "ui-data",
] as const satisfies readonly TypographyCoreRole[];

export const typographySystemMeta = {
  approvedAt: "2026-08-29",
  propagation: "styleguide-only",
  status: "approved",
  version: "1.0",
} as const;

export const typographyScalePolicy = {
  base: "16px",
  ratio: 1.25,
  rounding: "optical rounding ke langkah 2px/4px",
} as const;

/**
 * Typography System v1.0 yang disetujui owner. Kontrak tetap hanya berlaku di
 * foundation/styleguide sampai ada task propagasi product screen yang eksplisit.
 */
export const typographySystemTokens = {
  display: {
    className:
      "text-[40px] font-semibold leading-[43px] tracking-[-0.03em] sm:text-[48px] sm:leading-[51px] sm:tracking-[-0.035em] xl:text-[60px] xl:leading-[63px] xl:tracking-[-0.04em]",
    family: "Space Grotesk",
    label: "Display",
    lineHeight: { compact: "43px", standard: "51px", wide: "63px" },
    sample: "Dari brief ke benda nyata.",
    size: { compact: "40px", standard: "48px", wide: "60px" },
    tracking: { compact: "-0.03em", standard: "-0.035em", wide: "-0.04em" },
    usage: "Homepage hero dan pernyataan brand yang singkat.",
    weight: 600,
  },
  heading: {
    className:
      "text-[30px] font-semibold leading-[36px] tracking-[-0.02em] sm:text-[36px] sm:leading-[42px] sm:tracking-[-0.025em] xl:text-[40px] xl:leading-[46px] xl:tracking-[-0.03em]",
    family: "Space Grotesk",
    label: "Heading",
    lineHeight: { compact: "36px", standard: "42px", wide: "46px" },
    sample: "Proses yang dapat ditinjau.",
    size: { compact: "30px", standard: "36px", wide: "40px" },
    tracking: { compact: "-0.02em", standard: "-0.025em", wide: "-0.03em" },
    usage: "Page title, section title, dan case-study opener.",
    weight: 600,
  },
  subheading: {
    className:
      "text-[22px] font-semibold leading-[29px] tracking-[-0.015em] sm:text-[24px] sm:leading-[31px]",
    family: "Space Grotesk",
    label: "Subheading",
    lineHeight: { compact: "29px", standard: "31px", wide: "31px" },
    sample: "Keputusan tetap berada di tangan manusia.",
    size: { compact: "22px", standard: "24px", wide: "24px" },
    tracking: { compact: "-0.015em", standard: "-0.015em", wide: "-0.015em" },
    usage: "Product title, card title, dan heading operasional.",
    weight: 600,
  },
  body: {
    className:
      "max-w-[70ch] text-[16px] font-normal leading-[24px] tracking-[0em]",
    family: "Space Grotesk",
    label: "Body",
    lineHeight: { compact: "24px", standard: "24px", wide: "24px" },
    sample:
      "Setiap keputusan penting ditopang oleh brief, prototype, dan review operator yang dapat dipahami.",
    size: { compact: "16px", standard: "16px", wide: "16px" },
    tracking: { compact: "0em", standard: "0em", wide: "0em" },
    usage: "Default reading dan explanatory copy dengan measure 55–70 karakter.",
    weight: 400,
  },
  "ui-data": {
    className:
      "text-[14px] font-medium leading-[20px] tracking-[0em] tabular-nums",
    family: "Space Grotesk",
    label: "UI / data",
    lineHeight: { compact: "20px", standard: "20px", wide: "20px" },
    sample: "Status proyek · Review operator · 29 Agu 2026",
    size: { compact: "14px", standard: "14px", wide: "14px" },
    tracking: { compact: "0em", standard: "0em", wide: "0em" },
    usage: "Button, label, status, harga, dan metadata yang perlu dipindai.",
    weight: 500,
  },
  "editorial-accent": {
    className:
      "text-[28px] font-medium leading-[35px] tracking-[-0.01em] sm:text-[32px] sm:leading-[39px] xl:text-[36px] xl:leading-[43px]",
    family: "Fraunces",
    label: "Editorial accent",
    lineHeight: { compact: "35px", standard: "39px", wide: "43px" },
    sample: "Dipakai saat makna perlu melambat.",
    size: { compact: "28px", standard: "32px", wide: "36px" },
    tracking: { compact: "-0.01em", standard: "-0.01em", wide: "-0.01em" },
    usage: "Standalone statement atau quote; tidak dipakai pada control dan data.",
    weight: 500,
  },
} as const satisfies Record<TypographyRole, TypographySystemToken>;

export const typographyWeightPolicy = {
  core: [400, 500, 600],
  excluded: [300],
  strongByException: 700,
} as const satisfies {
  core: readonly TypographyCoreWeight[];
  excluded: readonly number[];
  strongByException: TypographyStrongWeight;
};

export const technicalTypographyPolicy = {
  casing: "uppercase hanya untuk micro-label 1–3 kata",
  lineHeight: "18px",
  size: "12px",
  tracking: "0.05em",
  weight: 500,
} as const satisfies {
  casing: string;
  lineHeight: PixelValue;
  size: PixelValue;
  tracking: EmValue;
  weight: TypographyCoreWeight;
};

export const frauncesAxisPolicy = {
  italic: "off pada core v1",
  loadedAxes: ["opsz"],
  opticalSizing: "auto",
  restrainedAxes: ["SOFT", "WONK"],
  style: "normal Roman",
  weight: 500,
} as const;

export const frauncesSystemStyle = {
  fontFamily: "var(--font-auis-proof-serif), Georgia, serif",
  fontOpticalSizing: frauncesAxisPolicy.opticalSizing,
  fontSynthesis: "none",
} satisfies CSSProperties;

function withoutPixelUnit(value: PixelValue): string {
  return value.slice(0, -2);
}

export function formatResponsiveSpec(token: TypographySystemToken): string {
  return typographyViewportSteps
    .map(
      ({ id }) =>
        `${withoutPixelUnit(token.size[id])}/${withoutPixelUnit(token.lineHeight[id])}`,
    )
    .join(" → ");
}

export function formatResponsiveTracking(token: TypographySystemToken): string {
  return [
    ...new Set(typographyViewportSteps.map(({ id }) => token.tracking[id])),
  ].join(" → ");
}
