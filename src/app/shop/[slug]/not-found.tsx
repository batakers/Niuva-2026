import { PublicShell } from "@/components/niuva/public-shell";
import { SystemFocusTarget } from "@/components/niuva/system-focus-target";
import { SystemStateView } from "@/components/niuva/system-state-view";
import { NiuvaLink } from "@/components/ui/NiuvaLink";
import { mascotRenders } from "@/features/public/mascot";

export default function ProductNotFound() {
  return (
    <PublicShell scope="product-detail">
      <SystemFocusTarget />
      <SystemStateView
        description="Produk mungkin sudah tidak dijual atau tautannya tidak sesuai. Lihat produk lain di Toko."
        mascot={mascotRenders.idea}
        stateId="product-not-found"
        title="Produk ini tidak tersedia."
        variant="public"
      >
        <NiuvaLink href="/shop" variant="onBrand" className="min-h-11">Lihat Toko</NiuvaLink>
        <NiuvaLink href="/" variant="link" className="-mx-2 min-h-11 px-2 text-white underline underline-offset-4 hover:decoration-2 focus-visible:ring-white/60">Kembali ke beranda</NiuvaLink>
      </SystemStateView>
    </PublicShell>
  );
}
