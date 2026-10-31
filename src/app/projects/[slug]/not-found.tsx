import { PublicShell } from "@/components/niuva/public-shell";
import { SystemFocusTarget } from "@/components/niuva/system-focus-target";
import { SystemStateView } from "@/components/niuva/system-state-view";
import { NiuvaLink } from "@/components/ui/NiuvaLink";
import { mascotRenders } from "@/features/public/mascot";

export default function ProjectNotFound() {
  return (
    <PublicShell scope="project-not-found">
      <SystemFocusTarget />
      <SystemStateView
        description="Proyek mungkin belum diterbitkan atau tautannya tidak sesuai. Lihat proyek lain yang sudah terbit."
        mascot={mascotRenders.idea}
        stateId="project-not-found"
        title="Proyek ini tidak tersedia."
        variant="public"
      >
        <NiuvaLink href="/projects" variant="onBrand" className="min-h-11">Lihat semua proyek</NiuvaLink>
        <NiuvaLink href="/" variant="link" className="min-h-11 px-0 text-white underline underline-offset-4 hover:decoration-2 focus-visible:ring-white/60">Kembali ke beranda</NiuvaLink>
      </SystemStateView>
    </PublicShell>
  );
}
