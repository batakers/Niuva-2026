"use client";

import "./globals.css";

import { Button, buttonVariants } from "@/components/ui/button";
import { SkipLink } from "@/components/niuva/skip-link";
import { SystemStateView } from "@/components/niuva/system-state-view";
import { systemCopy } from "@/components/niuva/system-state-copy";
import { cn } from "@/lib/utils";

/**
 * Global error fallback. It replaces the root layout, so it must not use any
 * provider, font variable, or component that depends on `src/app/layout.tsx`.
 * `SkipLink`, `Button`, and `SystemStateView` are plain modules without layout imports.
 */
export function GlobalErrorView({ onRetry }: Readonly<{ onRetry: () => void }>) {
  const { title, description } = systemCopy.globalError;

  return (
    <>
      <SkipLink />
      <SystemStateView variant="public" stateId="global-error" title={title} description={description}>
        <Button type="button" onClick={onRetry}>
          {systemCopy.actions.retry}
        </Button>
        {/* Plain anchor: router context is not guaranteed when the root layout fails. */}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- full navigation is intended here */}
        <a href="/" className={cn(buttonVariants({ variant: "outline" }))}>
          {systemCopy.actions.home}
        </a>
      </SystemStateView>
    </>
  );
}

/**
 * The root layout declares `--font-public-sans` through `next/font`, which is not loaded here.
 * Setting the documented Arial/Helvetica fallback inline keeps the text readable, because a
 * `var()` that resolves to nothing would otherwise drop `font-family` to the browser default.
 */
const fallbackFontFamily = "Arial, Helvetica, sans-serif";

export default function GlobalError({ retry }: Readonly<{ retry: () => void }>) {
  // The error object is intentionally never read: no message, stack, or digest is rendered.
  return (
    <html lang="id">
      <head>
        <title>{systemCopy.globalError.title}</title>
        <meta name="robots" content="noindex, nofollow" />
      </head>
      <body style={{ fontFamily: fallbackFontFamily }}>
        <GlobalErrorView onRetry={() => retry()} />
      </body>
    </html>
  );
}
