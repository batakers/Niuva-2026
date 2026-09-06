import { PublicShell } from "@/components/niuva/public-shell";
import { AuLink } from "@/components/ui/AuLink";
import { typographySystemTokens as type } from "@/app/auis/styleguide/foundation/typography-proof";

export default function ProjectNotFound() {
  return <PublicShell scope="project-not-found"><main id="main-content" className="mx-auto max-w-public px-5 py-20 sm:px-8">
    <p className="text-sm text-brand-700">Project tidak tersedia</p><h1 className={`${type.display.className} mt-4 max-w-2xl`}>Cerita ini belum dapat ditampilkan.</h1>
    <p className="mt-6 max-w-lg text-base leading-7 text-muted-foreground">Project mungkin belum dipublikasikan atau tautannya tidak sesuai. Kembali ke daftar untuk melihat informasi yang tersedia.</p>
    <AuLink href="/projects" className="min-h-11 mt-8">Kembali ke Projects</AuLink>
  </main></PublicShell>;
}
