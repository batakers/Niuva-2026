import { typographySystemTokens as type } from "@/design/typography";
import { PublicSiteAddress } from "@/components/niuva/public-site-information";
import { NiuvaLink } from "@/components/ui/NiuvaLink";
import { createStudioBookingWhatsAppHref, studioBookingPhone, studioPriceGroups } from "@/features/public/studio-rental";
import { formatRupiah } from "@/modules/shared/format";

/** For visitors who would rather print themselves: studio prices, the published address, and a WhatsApp booking. */
export function StudioRentalSection() {
  return (
    <section aria-labelledby="studio-title" className="mx-auto max-w-public scroll-mt-24 px-5 pt-24 sm:px-12 sm:pt-32" id="studio">
      <div className="grid gap-10 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-16">
        <div>
          <h2 className={`${type.heading.className} text-balance`} id="studio-title">Ingin mencetak sendiri? Datang ke studio Niuva.</h2>
          <p className="mt-4 max-w-[44ch] text-lead leading-[1.6] text-muted-foreground">Sewa printer per jam, siapkan file di laptop Anda atau PC studio, lalu lihat model Anda tercetak langsung.</p>
          <dl className="mt-8 border-t border-border pt-5 text-ui">
            <dt className="font-normal text-muted-foreground">Alamat studio</dt>
            <dd className="mt-1 max-w-[40ch] text-base leading-[1.55]"><PublicSiteAddress /></dd>
          </dl>
          <NiuvaLink className="mt-8 min-h-11" href={createStudioBookingWhatsAppHref()} rel="noreferrer">Booking lewat WhatsApp</NiuvaLink>
          <p className="mt-3 max-w-[44ch] text-caption leading-[1.45] text-muted-foreground">WhatsApp {studioBookingPhone}. Jam buka, mesin yang tersedia, dan syarat membership dikonfirmasi saat booking.</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {studioPriceGroups.map((group, index) => (
            <article aria-labelledby={`studio-prices-${index}`} className={`rounded-[var(--radius-card)] border border-border bg-card p-5 sm:p-6 ${index === studioPriceGroups.length - 1 ? "sm:col-span-2" : ""}`} key={group.title}>
              <h3 className="text-lg font-medium tracking-[-0.01em]" id={`studio-prices-${index}`}>{group.title}</h3>
              <dl className="mt-4 divide-y divide-border border-t border-border">
                {group.prices.map((price) => (
                  <div className="flex items-baseline justify-between gap-4 py-3" key={price.label}>
                    <dt className="min-w-0">
                      <span className="block text-ui font-medium">{price.label}</span>
                      {price.note ? <span className="mt-0.5 block text-caption leading-[1.45] text-muted-foreground">{price.note}</span> : null}
                    </dt>
                    <dd className="shrink-0 text-ui font-semibold tabular-nums">
                      {price.amountRp === 0 ? "Gratis" : formatRupiah(BigInt(price.amountRp))}
                      {price.per ? <span className="font-normal text-muted-foreground">{price.per}</span> : null}
                    </dd>
                  </div>
                ))}
              </dl>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
