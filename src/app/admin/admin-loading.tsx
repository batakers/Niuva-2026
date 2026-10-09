import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
export default function AdminLoading() {
  return (
    <main className="min-h-dvh bg-neutral-100 px-4 py-6 text-foreground sm:px-8" id="main-content" role="status" aria-live="polite">
      <div className="mx-auto max-w-admin space-y-5">
        <Card className="gap-0 py-0 ring-0 rounded-xl border border-border bg-card p-5">
          <p className="text-sm font-semibold">Memuat ruang Admin…</p>
          <p className="mt-2 text-sm text-muted-foreground">Menyiapkan data pekerjaan Anda.</p>
        </Card>
        <div aria-hidden="true" className="motion-safe:animate-pulse space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }, (_, index) => <Skeleton className="h-28 rounded-xl motion-reduce:animate-none" key={index} />)}
          </div>
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.65fr)_minmax(17rem,0.85fr)]">
            <Skeleton className="h-64 rounded-xl motion-reduce:animate-none" />
            <Skeleton className="h-64 rounded-xl motion-reduce:animate-none" />
          </div>
        </div>
      </div>
    </main>
  );
}
