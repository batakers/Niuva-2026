import { CustomerAuthPage, type CustomerAuthQuery } from '@/components/niuva/customer-auth-page';
export const metadata = { title: 'Akun Customer · Niuva', robots: { index: false, follow: false }, referrer: 'origin' as const };
export default function Page({ searchParams }: { searchParams: Promise<CustomerAuthQuery> }) {
 return <CustomerAuthPage mode='verify-email' searchParams={searchParams} />;
}
