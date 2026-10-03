import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { loadAdminPageAccess } from "@/app/admin/admin-page-access";
import { AdminAccessView } from "@/app/admin/admin-access-view";
import { AdminShell } from "@/components/niuva/admin-shell";
import { typographySystemTokens as type } from "@/design/typography";
export const metadata: Metadata = { title: "Tinjauan draf policy · Owner Niuva", robots: { index: false, follow: false } };
export default async function PolicyPreview({ searchParams }: { searchParams: Promise<{ document?: string }> }) {
  await connection();
  const gate = await loadAdminPageAccess({ permission: "PRIVACY_REQUEST_MANAGE" });
  if (gate.kind === "denied") return <AdminAccessView state={gate.state} />;
  const access = gate.access;
  const document = (await searchParams).document === "privacy" ? "privacy" : "terms";
  const source = await readFile(join(process.cwd(), "docs", "legal", `customer-${document}-draft.md`), "utf8");
  return <AdminShell active="privacy" role={access.profile.role}><main id="main-content" className="mx-auto max-w-3xl space-y-6"><Link href="/admin/privacy" className="inline-flex min-h-11 items-center text-primary underline">Kembali ke Privasi Customer</Link><p role="status" className="rounded-lg border border-border bg-card p-4 leading-6">Draf untuk tinjauan Owner. Belum berlaku atau menjadi persetujuan pendaftaran publik.</p><article className="space-y-5 break-words">{source.split(/\r?\n\r?\n/).map((block, index) => {
    const text = block.replace(/\*\*/g, "");
    if (text.startsWith("# ")) return <h1 className={type.heading.className} key={index}>{text.slice(2)}</h1>;
    if (text.startsWith("## ")) return <h2 className={`pt-5 ${type.subheading.className}`} key={index}>{text.slice(3)}</h2>;
    if (text.startsWith("### ")) return <h3 className={`pt-3 ${type.subheading.className}`} key={index}>{text.slice(4)}</h3>;
    return <p className="whitespace-pre-wrap text-base leading-7 text-muted-foreground" key={index}>{text}</p>;
  })}</article></main></AdminShell>;
}
