import { notFound } from "next/navigation";
import { isCustomerEmailTestRuntime } from "@/modules/customer-auth/email-test-runtime";
export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false, follow: false } };
export default function Page() {
  if (!isCustomerEmailTestRuntime()) notFound();
  return <main className="p-8"><h1>Fixture pengujian kebijakan autentikasi</h1><p>TEST ONLY. Halaman ini bukan Syarat Layanan atau Kebijakan Privasi resmi Niuva.</p></main>;
}
