/** Responsive typography classes shared by product routes. See DESIGN.md. */
export const typographySystemTokens = {
  display: {
    className:
      "text-[36px] font-normal leading-[1.1] tracking-[-0.022em] sm:text-[48px] xl:text-[58px] xl:leading-[1.08] xl:tracking-[-0.025em]",
  },
  heading: {
    className:
      "text-[30px] font-normal leading-[1.12] tracking-[-0.02em] sm:text-[38px] xl:text-[46px] xl:leading-[1.1] xl:tracking-[-0.022em]",
  },
  subheading: {
    className: "text-[22px] font-medium leading-[1.25] tracking-[-0.012em] sm:text-[26px]",
  },
  body: {
    className: "max-w-[68ch] text-[16px] font-normal leading-[1.65] sm:text-[17px]",
  },
  "ui-data": {
    className: "text-[14px] font-medium leading-[20px] tabular-nums",
  },
  /** Former serif accent; kept as a role name so existing auth screens keep working until T49. */
  "editorial-accent": {
    className: "text-[28px] font-normal leading-[1.2] tracking-[-0.018em] sm:text-[32px]",
  },
} as const;
