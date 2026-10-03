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
 * The public variant relies on PublicShell or SystemFrame for the skip link;
 * the admin variant renders its own because admin pages have no shared shell here.
 */
export function SystemStateView({ variant, title, description, eyebrow, stateId, children }: SystemStateViewProps) {
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
