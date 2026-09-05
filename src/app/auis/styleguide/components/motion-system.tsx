import type { CSSProperties } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Icon } from "@/components/ui/Icon";

import {
  motionRecipes,
  motionSystemMeta,
  motionSystemTokens,
} from "../foundation/motion";

const motionStyle = {
  "--motion-duration-deliberate": "320ms",
  "--motion-ease-spring-like": "cubic-bezier(0.22, 1, 0.36, 1)",
} as CSSProperties;

export function MotionSystemProof() {
  return (
    <section
      className="scroll-mt-8 space-y-6"
      data-motion-system
      data-motion-system-scope={motionSystemMeta.scope}
      data-motion-system-status={motionSystemMeta.status}
      data-motion-system-visual-review="approved"
      data-motion-system-version={motionSystemMeta.version}
      id="motion-system"
      style={motionStyle}
    >
      <div className="space-y-3">
        <p className="text-sm font-medium text-brand-700">Design System · motion v1</p>
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-2xl font-semibold tracking-tight">Gerak yang menjelaskan, bukan menghibur</h2>
          <Badge>Approved · styleguide-only</Badge>
          <Badge variant="secondary">No new dependency</Badge>
        </div>
        <p className="max-w-3xl leading-7 text-muted-foreground">
          Motion System v1 memberi vocabulary kecil untuk feedback, hierarchy, dan
          perpindahan konteks. Setiap recipe memiliki fallback statis dan mengikuti
          <code className="mx-1 font-mono text-xs">prefers-reduced-motion</code>;
          spring physics tetap menjadi kandidat terpisah.
        </p>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-semibold">Token vocabulary</h3>
                <p className="text-sm text-muted-foreground">Nilai awal memakai token foundation yang sudah ada.</p>
              </div>
              <Badge variant="outline">{motionSystemTokens.length} tokens</Badge>
            </div>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            {motionSystemTokens.map((token) => (
              <div
                className="min-w-0 rounded-lg border border-border bg-muted/40 p-3"
                data-motion-token={token.id}
                key={token.id}
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-medium">{token.label}</p>
                  <span className="rounded-full bg-background px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                    {token.kind}
                  </span>
                </div>
                <code className="mt-2 block break-all font-mono text-xs text-brand-700">{token.token}</code>
                <p className="mt-2 text-sm font-medium text-foreground">{token.value}</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">{token.usage}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-semibold">Safety contract</h3>
                <p className="text-sm text-muted-foreground">Gerak selalu memiliki versi diam.</p>
              </div>
              <Icon aria-hidden="true" className="size-5 text-success" name="check-circle-2" />
            </div>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-6 text-muted-foreground">
            <p data-motion-safety="reduced-motion">
              <span className="font-medium text-foreground">Reduced motion:</span>{" "}
              semua transition dipendekkan dan scroll kembali automatic.
            </p>
            <p data-motion-safety="static-fallback">
              <span className="font-medium text-foreground">Static fallback:</span>{" "}
              hierarchy, label, state, dan recovery tetap terbaca tanpa animasi.
            </p>
            <p data-motion-safety="performance">
              <span className="font-medium text-foreground">Performance:</span>{" "}
              prioritaskan transform dan opacity; hindari layout thrashing.
            </p>
            <p data-motion-safety="scope">
              <span className="font-medium text-foreground">Scope:</span>{" "}
              proof ini hidup di styleguide; belum menjadi izin propagasi layar.
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4" data-motion-recipes>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h3 className="font-semibold">Recipe proof</h3>
            <p className="text-sm text-muted-foreground">Hover, focus, press, scroll, dan layout memakai gerak singkat.</p>
          </div>
          <Badge variant="outline">{motionRecipes.length} recipes</Badge>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {motionRecipes.map((recipe) => (
            <article
              className="group min-w-0 rounded-xl border border-border bg-card p-4 shadow-card"
              data-motion-recipe={recipe.id}
              key={recipe.id}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-medium text-brand-700">{recipe.token}</p>
                  <h4 className="mt-1 text-sm font-semibold">{recipe.label}</h4>
                </div>
                <span aria-hidden="true" className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground transition-transform group-hover:translate-y-[-2px]" style={{ transitionDuration: "var(--duration-fast-token)", transitionTimingFunction: "var(--ease-standard-token)" }}>
                  <Icon className="size-4" name={recipe.id === "press" ? "arrow-right" : "arrow-up-right"} />
                </span>
              </div>
              <p className="mt-3 text-xs font-medium text-foreground">{recipe.property}</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">{recipe.rule}</p>
              {recipe.id === "hover" || recipe.id === "press" ? (
                <Button
                  className="mt-4 transition-transform"
                  size="sm"
                  style={{
                    transitionDuration: "var(--duration-fast-token)",
                    transitionTimingFunction: recipe.id === "press" ? "var(--ease-emphasis-token)" : "var(--ease-standard-token)",
                  }}
                  type="button"
                  variant="outline"
                >
                  {recipe.id === "press" ? "Tekan untuk feedback" : "Arahkan atau fokus"}
                </Button>
              ) : null}
            </article>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2 border-t border-border pt-4 text-sm text-muted-foreground">
        <Icon aria-hidden="true" className="size-4 text-success" name="check-circle-2" />
        <span>Motion v1 disetujui untuk styleguide-only; product propagation dan runtime Motion engine tetap memiliki gate terpisah.</span>
      </div>
    </section>
  );
}
