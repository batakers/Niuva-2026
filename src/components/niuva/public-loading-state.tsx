import { PublicShell } from "./public-shell";

/**
 * Loading fallback for public and account segments.
 *
 * Renders the only `main#main-content` in the document while loading (the
 * destination page replaces it, never nests it), one labelled status message,
 * and a decorative skeleton. The skeleton pulses only under `motion-safe:` so
 * its dimensions stay identical when `prefers-reduced-motion: reduce` applies.
 * It carries no user data and no heading.
 */
export function PublicLoadingState({
  label,
  scope,
}: Readonly<{ label: string; scope: string }>) {
  return (
    <PublicShell scope={scope}>
      <main id="main-content" aria-busy="true" className="mx-auto w-full max-w-public px-5 py-10 sm:px-8 sm:py-14">
        <p role="status" aria-label={label} className="text-sm font-medium text-muted-foreground">
          {label}…
        </p>
        <div aria-hidden="true" className="mt-6 space-y-4 motion-safe:animate-pulse" data-loading-skeleton="">
          <div className="h-8 w-2/3 rounded-lg bg-muted sm:w-1/3" />
          <div className="grid gap-4 md:grid-cols-3">
            {Array.from({ length: 3 }, (_, index) => (
              <div className="h-40 rounded-xl border border-border bg-card" key={index} />
            ))}
          </div>
          <div className="h-24 rounded-xl border border-border bg-card" />
        </div>
      </main>
    </PublicShell>
  );
}
