import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Icon, type IconName } from "@/components/ui/Icon";
import { Separator } from "@/components/ui/separator";

import {
  designSystemComponentGroups,
  designSystemGuardrails,
  designSystemLayers,
  designSystemMeta,
  designSystemPatterns,
  designSystemPromotionStages,
  registrySources,
  type DesignSystemStatus,
  type RegistrySourceStatus,
} from "../registry/design-system";

type RegistryStatus = DesignSystemStatus | RegistrySourceStatus;

const statusPresentation: Record<
  RegistryStatus,
  { icon: IconName; label: string; variant: "default" | "destructive" | "outline" | "secondary" }
> = {
  approved: { icon: "check-circle-2", label: "Approved", variant: "default" },
  candidate: { icon: "info", label: "Candidate", variant: "secondary" },
  implemented: { icon: "check-circle-2", label: "Implemented", variant: "secondary" },
  "reference-only": { icon: "info", label: "Reference only", variant: "outline" },
  "review-required": { icon: "triangle-alert", label: "Review required", variant: "secondary" },
  restricted: { icon: "lock-keyhole", label: "Restricted", variant: "destructive" },
  planned: { icon: "clock-3", label: "Planned", variant: "outline" },
};

function StatusBadge({ status }: { status: RegistryStatus }) {
  const presentation = statusPresentation[status];

  return (
    <Badge variant={presentation.variant}>
      <Icon aria-hidden="true" name={presentation.icon} />
      {presentation.label}
    </Badge>
  );
}

export function DesignSystemArchitecture() {
  return (
    <section
      className="scroll-mt-8 space-y-6"
      data-design-system-architecture
      data-design-system-scope={designSystemMeta.scope}
      data-design-system-status={designSystemMeta.status}
      data-design-system-version={designSystemMeta.version}
      id="architecture"
    >
      <div className="space-y-2">
        <p className="text-sm font-medium text-brand-700">Design System · architecture</p>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl space-y-2">
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Design System Architecture v1
            </h2>
            <p className="leading-7 text-muted-foreground">
              Peta ownership, sumber, promotion gate, dan batas implementasi
              untuk menjaga Niuva tetap khas saat foundation berkembang menjadi
              sistem yang dapat digunakan ulang.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge>Architecture v1.0</Badge>
            <Badge variant="secondary">Styleguide only</Badge>
            <Badge variant="outline">Product proof pending</Badge>
            <Badge variant="outline">Propagation paused</Badge>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-brand-200 bg-brand-50 p-5 shadow-card sm:p-6">
        <div className="flex items-start gap-3">
          <Icon
            aria-hidden="true"
            className="mt-0.5 size-5 shrink-0 text-brand-700"
            name="lock-keyhole"
          />
          <div className="space-y-1 text-sm leading-6 text-brand-950">
            <p className="font-semibold">Boundary keputusan</p>
            <p>
              Architecture v1 mendokumentasikan arah dan registry di route ini.
              Tidak menambah dependency, tidak membuka global token, dan belum
              memberi izin propagasi product screen. Homepage dan
              `/project-brief` masih berada pada proof yang menunggu acceptance;
              checkout, admin, Creative, Decorative, dan screen lain tetap
              membutuhkan gate terpisah.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 rounded-xl border border-border bg-card p-5 shadow-card sm:p-6">
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">Layer map</h3>
          <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
            Setiap layer memiliki tugas dan boundary sendiri. Urutan ini
            mencegah efek dekoratif atau source eksternal menjadi fondasi
            perilaku produk.
          </p>
        </div>

        <div className="grid gap-3">
          {designSystemLayers.map((layer, index) => (
            <div key={layer.id}>
              <article
                className="grid gap-4 rounded-lg border border-border bg-background p-4 lg:grid-cols-[auto_minmax(0,1fr)_minmax(12rem,0.8fr)] lg:items-start"
                data-design-system-layer={layer.id}
                data-design-system-layer-status={layer.status}
              >
                <div className="flex items-center gap-3 lg:block">
                  <span className="font-mono text-xs font-semibold tracking-[0.12em] text-brand-700">
                    {layer.number}
                  </span>
                  <h4 className="font-semibold lg:mt-2">{layer.title}</h4>
                </div>
                <div className="min-w-0 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge status={layer.status} />
                    <span className="text-xs text-muted-foreground">Owner: {layer.owner}</span>
                  </div>
                  <p className="text-sm leading-6 text-muted-foreground">{layer.intent}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {layer.items.map((item) => (
                      <span
                        className="rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground"
                        key={item}
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="space-y-2 border-t border-border pt-3 text-xs leading-5 text-muted-foreground lg:border-l lg:border-t-0 lg:pl-4 lg:pt-0">
                  <p>
                    <span className="font-medium text-foreground">Source:</span> {layer.source}
                  </p>
                  <p>
                    <span className="font-medium text-foreground">Boundary:</span> {layer.boundary}
                  </p>
                </div>
              </article>
              {index < designSystemLayers.length - 1 ? (
                <div aria-hidden="true" className="flex h-5 items-center justify-center text-brand-700">
                  ↓
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card data-design-system-registry="sources">
          <CardHeader>
            <CardTitle>Source map</CardTitle>
            <CardDescription>
              Satu sumber perilaku utama, source-owned core components, dan
              katalog referensi yang tidak menjadi dependency otomatis.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {registrySources.map((source) => (
              <div
                className="space-y-2 rounded-lg border border-border bg-background p-3"
                data-design-system-source={source.id}
                key={source.id}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">{source.label}</p>
                    <span className="text-xs text-muted-foreground">{source.kind}</span>
                  </div>
                  <StatusBadge status={source.status} />
                </div>
                <p className="text-sm leading-5 text-muted-foreground">{source.role}</p>
                <code className="block break-words text-xs text-muted-foreground">{source.reference}</code>
                <p className="text-xs leading-5 text-muted-foreground">
                  <span className="font-medium text-foreground">Boundary:</span> {source.boundary}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card data-design-system-registry="promotion">
          <CardHeader>
            <CardTitle>Promotion path</CardTitle>
            <CardDescription>
              Status yang wajib dilewati sebelum sebuah komponen atau effect
              boleh digunakan di product screen.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ol className="space-y-3">
              {designSystemPromotionStages.map((stage) => (
                <li className="flex gap-3" data-design-system-stage={stage.label.toLowerCase()} key={stage.label}>
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-900">
                    {stage.number}
                  </span>
                  <div className="min-w-0 space-y-1">
                    <p className="text-sm font-medium">{stage.label}</p>
                    <p className="text-xs leading-5 text-muted-foreground">{stage.description}</p>
                  </div>
                </li>
              ))}
            </ol>
            <Separator />
            <div className="space-y-2">
              <p className="text-sm font-medium">Guardrails</p>
              <ul className="space-y-2 text-sm leading-6 text-muted-foreground">
                {designSystemGuardrails.map((guardrail) => (
                  <li className="flex gap-2" key={guardrail}>
                    <Icon aria-hidden="true" className="mt-1 size-4 shrink-0 text-brand-700" name="check-circle-2" />
                    <span>{guardrail}</span>
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <Card data-design-system-registry="components">
          <CardHeader>
            <CardTitle>Component ownership</CardTitle>
            <CardDescription>
              Primitive bridge, reusable core, dan Niuva composites memiliki
              boundary yang berbeda.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-3">
            {designSystemComponentGroups.map((group) => (
              <article
                className="flex min-w-0 flex-col gap-3 rounded-lg border border-border bg-background p-3"
                data-design-system-component-group={group.id}
                key={group.id}
              >
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h4 className="text-sm font-medium">{group.label}</h4>
                    <StatusBadge status={group.status} />
                  </div>
                  <p className="text-xs leading-5 text-muted-foreground">{group.source}</p>
                </div>
                <ul className="space-y-1.5 text-xs leading-5 text-muted-foreground">
                  {group.items.map((item) => (
                    <li key={item}>· {item}</li>
                  ))}
                </ul>
                <p className="mt-auto border-t border-border pt-3 text-xs leading-5 text-muted-foreground">
                  {group.boundary}
                </p>
              </article>
            ))}
          </CardContent>
        </Card>

        <Card data-design-system-registry="patterns">
          <CardHeader>
            <CardTitle>Pattern register</CardTitle>
            <CardDescription>
              Pattern tetap dekat dengan journey dan evidence sampai
              pengulangan membuktikan boundary yang stabil.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {designSystemPatterns.map((pattern) => (
              <div className="space-y-2 border-b border-border pb-3 last:border-0 last:pb-0" data-design-system-pattern={pattern.id} key={pattern.id}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium">{pattern.label}</p>
                  <StatusBadge status={pattern.status} />
                </div>
                <p className="text-xs leading-5 text-muted-foreground">{pattern.source}</p>
                <div className="flex flex-wrap gap-1.5">
                  {pattern.items.map((item) => (
                    <span className="rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground" key={item}>
                      {item}
                    </span>
                  ))}
                </div>
                <p className="text-xs leading-5 text-muted-foreground">{pattern.boundary}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
