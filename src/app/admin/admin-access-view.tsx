import { AdminSessionActions } from "@/components/niuva/admin-session-actions";

export function AdminAccessUnavailableView() {
  return (
    <main className="mx-auto max-w-admin px-5 py-8 sm:px-8 sm:py-10" id="main-content">
      <header className="max-w-2xl border-b border-border pb-6">
        <p className="text-sm font-medium text-brand-700">Niuva / Admin</p>
        <h1 className="mt-4 text-balance text-3xl font-semibold tracking-tight sm:text-5xl">
          Akses admin belum tersedia
        </h1>
        <p className="mt-4 text-base leading-7 text-muted-foreground">
          Halaman ini hanya dapat ditampilkan untuk profil Owner atau Admin Niuva yang aktif.
        </p>
        <div className="mt-6">
          <AdminSessionActions retryHref="/admin" showLogout={Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY)} />
        </div>
      </header>
    </main>
  );
}
