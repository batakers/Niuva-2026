import { notFound } from "next/navigation";
import { connection } from "next/server";
import { PublicShell } from "@/components/niuva/public-shell";
import { PolicyDocument } from "@/components/niuva/policy-document";
import { isPolicyPublished, PUBLIC_CUSTOMER_POLICY } from "@/modules/customer-auth/public-policy";
import { readApprovedCustomerPolicy } from "@/modules/customer-auth/public-policy-content";

const dateFormat = new Intl.DateTimeFormat("id-ID", { dateStyle: "long", timeZone: "Asia/Jakarta" });

// The official text is public only once its recorded publication has taken
// effect; before that the route does not exist.
export async function PublicPolicyPage({ document }: { document: "terms" | "privacy" }) {
  await connection();
  const policy = PUBLIC_CUSTOMER_POLICY;
  if (!isPolicyPublished() || policy.publishedAt === null || policy.effectiveAt === null) notFound();
  const source = await readApprovedCustomerPolicy(document);
  return <PublicShell scope="policy" functionalStatus="server-backed">
    <main id="main-content" className="mx-auto max-w-reading px-5 py-12 sm:px-8">
      <PolicyDocument source={source} afterTitle={
        <dl className="grid gap-x-6 gap-y-1 text-sm text-muted-foreground sm:grid-cols-[auto_1fr]">
          <dt className="font-medium text-foreground">Versi</dt><dd>{policy[document].version}</dd>
          <dt className="font-medium text-foreground">Diterbitkan</dt><dd><time dateTime={policy.publishedAt}>{dateFormat.format(new Date(policy.publishedAt))}</time></dd>
          <dt className="font-medium text-foreground">Berlaku sejak</dt><dd><time dateTime={policy.effectiveAt}>{dateFormat.format(new Date(policy.effectiveAt))}</time></dd>
        </dl>
      } />
    </main>
  </PublicShell>;
}
