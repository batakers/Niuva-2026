/** Responsive typography classes shared by product routes. See DESIGN.md. */
export const typographySystemTokens = {
  display: {
    className:
      "text-[40px] font-semibold leading-[43px] tracking-[-0.03em] sm:text-[48px] sm:leading-[51px] sm:tracking-[-0.035em] xl:text-[60px] xl:leading-[63px] xl:tracking-[-0.04em]",
  },
  heading: {
    className:
      "text-[30px] font-semibold leading-[36px] tracking-[-0.02em] sm:text-[36px] sm:leading-[42px] sm:tracking-[-0.025em] xl:text-[40px] xl:leading-[46px] xl:tracking-[-0.03em]",
  },
  subheading: {
    className:
      "text-[22px] font-semibold leading-[29px] tracking-[-0.015em] sm:text-[24px] sm:leading-[31px]",
  },
  body: {
    className: "max-w-[70ch] text-[16px] font-normal leading-[24px] tracking-[0em]",
  },
  "ui-data": {
    className: "text-[14px] font-medium leading-[20px] tracking-[0em] tabular-nums",
  },
  "editorial-accent": {
    className:
      "text-[28px] font-medium leading-[35px] tracking-[-0.01em] sm:text-[32px] sm:leading-[39px] xl:text-[36px] xl:leading-[43px]",
  },
} as const;
