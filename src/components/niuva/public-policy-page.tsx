import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Icon } from "@/components/ui/Icon";
import { PublicShell } from "@/components/niuva/public-shell";
import { PolicyDocument, policyOutline, type PolicySection } from "@/components/niuva/policy-document";
import { isPolicyPublished, PUBLIC_CUSTOMER_POLICY } from "@/modules/customer-auth/public-policy";
import { readApprovedCustomerPolicy } from "@/modules/customer-auth/public-policy-content";

const dateFormat = new Intl.DateTimeFormat("id-ID", { dateStyle: "long", timeZone: "Asia/Jakarta" });

const companion = {
  terms: { href: "/privacy", title: "Kebijakan Privasi" },
  privacy: { href: "/terms", title: "Syarat Layanan" },
} as const;

function SectionLinks({ sections }: Readonly<{ sections: readonly PolicySection[] }>) {
  return (
    <ol className="space-y-1">
      {sections.map(section => (
        <li key={section.id}>
          <a className="block rounded-[var(--radius-control)] px-3 py-2 text-ui leading-[1.4] text-muted-foreground transition-colors duration-[var(--duration-fast-token)] hover:bg-card hover:text-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50" href={`#${section.id}`}>
            {section.title}
          </a>
        </li>
      ))}
    </ol>
  );
}

// The official text is public only once its recorded publication has taken
// effect; before that the route does not exist.
export async function PublicPolicyPage({ document }: { document: "terms" | "privacy" }) {
  await connection();
  const policy = PUBLIC_CUSTOMER_POLICY;
  if (!isPolicyPublished() || policy.publishedAt === null || policy.effectiveAt === null) notFound();
  const source = await readApprovedCustomerPolicy(document);
  const sections = policyOutline(source);
  const other = companion[document];
  return <PublicShell scope="policy" functionalStatus="server-backed">
    {/* Reading layout: a sticky table of contents beside the text from lg; below lg it folds into a disclosure under the title. */}
    <main id="main-content" className="mx-auto grid max-w-public grid-cols-[minmax(0,1fr)] gap-12 px-5 pt-10 pb-24 sm:px-12 sm:pt-14 lg:grid-cols-[15rem_minmax(0,46rem)] lg:gap-16 xl:grid-cols-[17rem_minmax(0,46rem)] xl:gap-24">
      <nav aria-label="Daftar isi" className="hidden lg:sticky lg:-ml-3 lg:top-24 lg:block lg:max-h-[calc(100dvh-7rem)] lg:self-start lg:overflow-y-auto lg:pt-3">
        <p className="px-3 text-ui font-semibold">Daftar isi</p>
        <div className="mt-3"><SectionLinks sections={sections} /></div>
      </nav>
      <div>
        <PolicyDocument source={source} afterTitle={
          <div className="space-y-4 pt-2">
            <dl className="grid gap-4 rounded-[var(--radius-card)] border border-border bg-card p-5 sm:grid-cols-3 sm:gap-6 sm:p-6">
              <div><dt className="text-caption text-muted-foreground">Versi</dt><dd className="mt-1 text-ui font-medium">{policy[document].version}</dd></div>
              <div><dt className="text-caption text-muted-foreground">Diterbitkan</dt><dd className="mt-1 text-ui font-medium"><time dateTime={policy.publishedAt}>{dateFormat.format(new Date(policy.publishedAt))}</time></dd></div>
              <div><dt className="text-caption text-muted-foreground">Berlaku sejak</dt><dd className="mt-1 text-ui font-medium"><time dateTime={policy.effectiveAt}>{dateFormat.format(new Date(policy.effectiveAt))}</time></dd></div>
            </dl>
            <details className="group rounded-[var(--radius-card)] border border-border bg-card lg:hidden">
              <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 rounded-[var(--radius-card)] px-5 text-ui font-semibold focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 [&::-webkit-details-marker]:hidden">
                Daftar isi
                <Icon aria-hidden="true" className="size-4 transition-transform duration-[var(--duration-normal-token)] group-open:rotate-180 motion-reduce:transition-none" name="arrow-down" />
              </summary>
              <nav aria-label="Daftar isi" className="px-2 pb-3"><SectionLinks sections={sections} /></nav>
            </details>
          </div>
        } />
        <Link className="group mt-16 flex min-h-11 items-center justify-between gap-4 rounded-[var(--radius-card)] border border-border bg-card p-5 transition-colors duration-[var(--duration-fast-token)] hover:border-brand-500 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 sm:p-6" href={other.href}>
          <span>
            <span className="block text-caption text-muted-foreground">Baca juga</span>
            <span className="mt-1 block text-lead font-medium">{other.title}</span>
          </span>
          <Icon aria-hidden="true" className="size-5 shrink-0 transition-transform duration-[var(--duration-fast-token)] group-hover:translate-x-1 motion-reduce:transition-none" name="arrow-right" />
        </Link>
      </div>
    </main>
  </PublicShell>;
}
