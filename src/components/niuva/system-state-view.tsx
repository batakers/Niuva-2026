import Image from "next/image";
import type { ReactNode } from "react";
import { typographySystemTokens as type } from "@/design/typography";
import { SkipLink } from "./skip-link";
import { SYSTEM_HEADING_ID } from "./system-state-copy";

export type SystemStateViewProps = Readonly<{
  variant: "public" | "admin";
  title: string;
  description: string;
  eyebrow?: string;
  /** Rendered as `data-system-state` for E2E selectors. */
  stateId: string;
  /**
   * Public variant only: a mascot render path puts the state on the Niuva-blue field
   * (DESIGN.md: one blue field per screen as the mascot's stage). Actions must then use
   * the on-brand styles. Without it the state stays a plain text block (global error).
   */
  mascot?: string;
  /** Recovery actions (NiuvaLink / Button). */
  children?: ReactNode;
}>;

const mainClassName = {
  public: "mx-auto w-full max-w-public px-5 py-14 outline-none sm:px-8 sm:py-20",
  admin: "mx-auto min-h-dvh w-full max-w-reading bg-background px-5 py-14 text-foreground outline-none sm:px-8 sm:py-20",
} as const satisfies Record<SystemStateViewProps["variant"], string>;

/**
 * Shared body for system pages (not-found, error, admin access).
 * Intentionally has no "use client" directive so server and client modules can import it.
 * The public variant relies on PublicShell or SystemFrame for the skip link and the
 * `--panel-inset` gutter; the admin variant renders its own skip link because admin
 * pages have no shared shell here.
 */
export function SystemStateView({ variant, title, description, eyebrow, stateId, mascot, children }: SystemStateViewProps) {
  if (variant === "public" && mascot) {
    // Same field geometry and gradient as the service hero, whose text contrast was measured.
    return (
      <main id="main-content" data-system-state={stateId} className="w-full pt-6 outline-none">
        <div className="relative mx-3 overflow-hidden rounded-[var(--radius-media)] bg-[radial-gradient(130%_70%_at_50%_100%,var(--brand-400)_0%,var(--brand-600)_32%,var(--brand-700)_62%,var(--brand-800)_100%)] text-white sm:mx-6 lg:h-120 lg:bg-[radial-gradient(52%_105%_at_83%_38%,var(--brand-400)_0%,var(--brand-600)_30%,var(--brand-700)_58%,var(--brand-800)_100%)]">
          <div className="relative z-10 px-6 pt-10 sm:px-(--panel-inset) lg:absolute lg:inset-y-0 lg:left-0 lg:flex lg:w-[calc(var(--panel-inset)+38rem)] lg:flex-col lg:justify-center lg:pr-0 lg:pt-0">
            {eyebrow ? <p className="mb-3 text-ui font-medium text-white">{eyebrow}</p> : null}
            <h1 id={SYSTEM_HEADING_ID} tabIndex={-1} className={`${type.display.className} max-w-[14em] text-balance outline-none`}>
              {title}
            </h1>
            <p className="mt-5 max-w-[44ch] text-base leading-[1.6] text-white sm:text-lg">{description}</p>
            {children ? <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">{children}</div> : null}
          </div>
          <div className="relative h-64 lg:absolute lg:inset-y-0 lg:right-0 lg:left-[calc(var(--panel-inset)+38rem)] lg:h-auto">
            <Image alt="" className="absolute -bottom-7.5 left-1/2 h-[108%] w-auto max-w-none -translate-x-1/2 object-contain drop-shadow-xl lg:-bottom-10 lg:h-[112%]" height={1400} sizes="(max-width: 1024px) 90vw, 560px" src={mascot} width={1400} />
          </div>
        </div>
      </main>
    );
  }

  const content = (
    <main id="main-content" data-system-state={stateId} className={mainClassName[variant]}>
      {eyebrow ? (
        <p className="mb-3 text-xs font-medium uppercase tracking-widest text-muted-foreground">{eyebrow}</p>
      ) : null}
      <h1 id={SYSTEM_HEADING_ID} tabIndex={-1} className={`${type.heading.className} max-w-3xl outline-none`}>
        {title}
      </h1>
      <p className={`${type.body.className} mt-4 text-muted-foreground`}>{description}</p>
      {children ? <div className="mt-8 flex flex-wrap items-center gap-3">{children}</div> : null}
    </main>
  );

  if (variant === "admin") {
    return (
      <>
        <SkipLink />
        {content}
      </>
    );
  }

  return content;
}
