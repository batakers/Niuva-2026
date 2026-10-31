import Image from "next/image";
import type { ReactNode } from "react";
import { typographySystemTokens } from "@/design/typography";

/**
 * The Niuva-blue closing field of a Company page: one heading, its actions, and a mascot render
 * standing at the panel's foot. Text sits on the header's content gutter through `--panel-inset`.
 */
export function ClosingPanel({ children, homeSection, id, mascot, title }: Readonly<{
  children: ReactNode;
  /** Homepage section marker kept for its tests and inspector checks. */
  homeSection?: string;
  id: string;
  mascot: string;
  title: string;
}>) {
  return (
    <section
      aria-labelledby={id}
      className="relative mx-3 mt-24 overflow-hidden rounded-[var(--radius-media)] bg-[linear-gradient(140deg,var(--brand-700)_0%,var(--brand-800)_100%)] px-6 pt-11 pb-70 text-white sm:mx-6 sm:mt-32 sm:px-(--panel-inset) lg:h-110 lg:pb-0"
      data-home-section={homeSection}
    >
      <div className="relative z-10 lg:absolute lg:top-1/2 lg:left-(--panel-inset) lg:-translate-y-1/2">
        <h2 className={`${typographySystemTokens.heading.className} max-w-[13em]`} id={id}>{title}</h2>
        {children}
      </div>
      <Image alt="" className="absolute -bottom-5 left-1/2 h-70 w-auto -translate-x-1/2 object-contain lg:right-[8%] lg:-bottom-7.5 lg:left-auto lg:h-[118%] lg:translate-x-0" height={1400} sizes="(max-width: 1024px) 70vw, 520px" src={mascot} width={1400} />
    </section>
  );
}
