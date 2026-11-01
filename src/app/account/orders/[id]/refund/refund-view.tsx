import { randomUUID } from "node:crypto";
import { RefundCaseSummary } from "@/components/niuva/refund-case-summary";
import { RefundWorkflowForm } from "@/components/niuva/refund-workflow-form";
import { Icon } from "@/components/ui/Icon";
import { NiuvaLink } from "@/components/ui/NiuvaLink";
import { typographySystemTokens as type } from "@/design/typography";
import type { RefundFormState, RefundOrderView } from "@/modules/refund/types";
import { formatRupiah } from "@/modules/shared/format";

const cardClass = "rounded-[var(--radius-card)] border border-border bg-card p-5 sm:p-6";
const sectionTitleClass = "text-2xl font-medium tracking-[-0.015em]";

export function RefundView({ action, orderId, view }: Readonly<{
  action: (state: RefundFormState, data: FormData) => Promise<RefundFormState>;
  orderId: string;
  view: RefundOrderView;
}>) {
  const facts = [
    ["Nomor pesanan", view.orderNumber],
    ["Pembayaran terverifikasi", view.eligibleAmountRp ? formatRupiah(view.eligibleAmountRp) : "Perlu diperiksa"],
  ] as const;
  return <main id="main-content" className="overflow-x-hidden pb-16 sm:pb-24">
    <div className="mx-auto max-w-public px-5 pt-8 sm:px-12 sm:pt-10">
      <NiuvaLink className="min-h-11" href={`/account/orders/${orderId}`} size="sm" variant="outline">
        <Icon aria-hidden="true" className="size-4" name="arrow-left" />
        Kembali ke pesanan
      </NiuvaLink>
      <h1 className={`${type.display.className} mt-8 max-w-[16em] text-balance`}>Pengajuan refund</h1>
      <p className="mt-4 max-w-[56ch] text-lead leading-[1.6]">Nominal mengikuti pembayaran yang telah diterima Niuva. Pengajuan diperiksa terlebih dahulu dan memerlukan persetujuan Owner.</p>
      <dl className="mt-8 grid max-w-3xl gap-px overflow-hidden rounded-[var(--radius-card)] border border-border bg-border sm:grid-cols-2">
        {facts.map(([term, value]) => (
          <div className="bg-card px-5 py-4 sm:px-6" key={term}>
            <dt className="text-ui font-normal text-muted-foreground">{term}</dt>
            <dd className="mt-1 break-words text-lg font-medium tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
    <div className="mx-auto grid max-w-public items-start gap-8 px-5 pt-12 sm:px-12 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-12">
      {view.refund ? (
        <section aria-labelledby="refund-case-heading" className={`min-w-0 ${cardClass}`}>
          <h2 id="refund-case-heading" className={sectionTitleClass}>Kasus refund Anda</h2>
          <div className="mt-5"><RefundCaseSummary refund={view.refund} /></div>
        </section>
      ) : view.eligibleAmountRp ? (
        <section aria-labelledby="refund-request-heading" className={`min-w-0 ${cardClass}`}>
          <h2 id="refund-request-heading" className={sectionTitleClass}>Ajukan pemeriksaan</h2>
          <p className="mt-3 text-ui font-normal leading-[1.55]">Total pembayaran terverifikasi: <strong className="font-semibold tabular-nums">{formatRupiah(view.eligibleAmountRp)}</strong>. Syarat retur diperiksa sesuai kondisi pesanan.</p>
          <RefundWorkflowForm action={action} mode="request" permalink={`/account/orders/${orderId}/refund`} submissionKey={randomUUID()} />
        </section>
      ) : (
        <section aria-labelledby="refund-check-heading" className={`min-w-0 ${cardClass}`}>
          <h2 id="refund-check-heading" className={sectionTitleClass}>Pembayaran perlu diperiksa</h2>
          <p className="mt-3 text-ui font-normal leading-[1.55]">{view.eligibilityIssue ?? "Pembayaran pesanan ini perlu diperiksa sebelum refund dapat diajukan."}</p>
        </section>
      )}
      <aside aria-labelledby="refund-help-heading" className={cardClass}>
        <h2 className="text-xl font-medium tracking-[-0.015em]" id="refund-help-heading">Butuh bantuan?</h2>
        <p className="mt-2 text-ui font-normal leading-[1.55] text-muted-foreground">Untuk keluhan atau tindak lanjut, kirim email dengan nomor pesanan ini ke <a className="font-medium text-primary underline underline-offset-4" href="mailto:niuvamakerspace@gmail.com">niuvamakerspace@gmail.com</a>.</p>
        <p className="mt-3 text-caption leading-[1.45] text-muted-foreground">Jangan kirim password, OTP, atau data kartu.</p>
      </aside>
    </div>
  </main>;
}
