import { notFound } from "next/navigation";
import { isCustomerEmailTestRuntime } from "@/modules/customer-auth/email-test-runtime";
import { getPublicCustomerAuthLegalDocuments } from "@/modules/customer-auth/legal";
import { readApprovedCustomerPolicy } from "@/modules/customer-auth/public-policy-content";
export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false, follow: false } };
export default async function Page({ searchParams }: { searchParams: Promise<{ document?: string }> } = { searchParams: Promise.resolve({}) }) {
  if (!isCustomerEmailTestRuntime()) notFound();
  const legal = getPublicCustomerAuthLegalDocuments();
  if (legal) {
    const params = await searchParams;
    const document = params.document;
    if (document !== "terms" && document !== "privacy") notFound();
    const content = await readApprovedCustomerPolicy(document);
    return <main className="mx-auto max-w-reading space-y-6 px-5 py-8"><h1 className="text-2xl font-semibold">Fixture lokal · {legal[document].version}</h1><p>Isi disetujui Owner pada 24 Oktober 2026. Salinan ini untuk pengujian lokal; policy belum dipublikasikan dan belum memiliki tanggal berlaku publik.</p><pre className="whitespace-pre-wrap break-words font-sans text-sm leading-6">{content}</pre></main>;
  }
  return <main className="p-8"><h1>Fixture pengujian kebijakan autentikasi</h1><p>TEST ONLY. Halaman ini bukan Syarat Layanan atau Kebijakan Privasi resmi Niuva.</p></main>;
}
