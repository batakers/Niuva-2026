export default function AdminLoading() {
  return (
    <main className="min-h-dvh bg-neutral-100 px-4 py-6 text-foreground sm:px-8" id="main-content" role="status" aria-live="polite">
      <div className="mx-auto max-w-admin space-y-5">
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-sm font-semibold text-brand-700">Niuva / Operations</p>
          <p className="mt-2 text-sm text-muted-foreground">Memuat ruang Admin…</p>
        </div>
        <div aria-hidden="true" className="motion-safe:animate-pulse space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }, (_, index) => <div className="h-28 rounded-xl border border-border bg-card" key={index} />)}
          </div>
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.65fr)_minmax(17rem,0.85fr)]">
            <div className="h-64 rounded-xl border border-border bg-card" />
            <div className="h-64 rounded-xl border border-border bg-card" />
          </div>
        </div>
      </div>
    </main>
  );
}
