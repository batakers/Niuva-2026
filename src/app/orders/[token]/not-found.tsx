import Link from "next/link";

export default function OrderStatusNotFound() {
  return (
    <main className="mx-auto flex min-h-[70dvh] max-w-public items-center px-5 py-16 sm:px-8" id="main-content">
      <div className="max-w-2xl">
        <p className="text-sm font-medium text-brand-700">Akses status order</p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-5xl">Status order tidak dapat ditampilkan.</h1>
        <p className="mt-5 max-w-xl text-base leading-7 text-muted-foreground">
          Tautan mungkin tidak valid atau sudah tidak tersedia. Detail order tidak ditampilkan untuk menjaga keamanan akses.
        </p>
        <Link className="mt-8 inline-flex min-h-11 items-center rounded-lg text-sm font-medium text-brand-700 underline underline-offset-4 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50" href="/">
          Kembali ke halaman utama
        </Link>
      </div>
    </main>
  );
}
