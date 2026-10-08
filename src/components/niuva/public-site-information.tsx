"use client";
import { createContext, useContext, type ReactNode } from "react";
import { defaultSiteInformation } from "@/modules/site-information/defaults";
import type { PublicSiteInformation } from "@/modules/site-information/types";
const context = createContext<PublicSiteInformation>(defaultSiteInformation);
export function PublicSiteInformationProvider({ values, children }: Readonly<{ values: PublicSiteInformation; children: ReactNode }>) { return <context.Provider value={values}>{children}</context.Provider>; }
export function usePublicSiteInformation() { return useContext(context); }
export function PublicSiteDescription() { return <>{usePublicSiteInformation().shortDescription}</>; }
export function PublicSiteContact() {
  const values = usePublicSiteInformation();
  return <><p>{values.address}</p><a className="mt-3 block underline underline-offset-4 hover:text-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50" href={`mailto:${values.email}`}>{values.email}</a><a className="mt-1 block underline underline-offset-4 hover:text-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50" href={`tel:+${values.phone.replace(/\D/g, "")}`}>{values.phone}</a>{values.socialLinks.length ? <nav className="mt-3 flex flex-wrap gap-3" aria-label="Media sosial">{values.socialLinks.map(link => <a className="inline-flex min-h-11 items-center underline underline-offset-4" key={link.href} href={link.href} rel="noopener noreferrer" target="_blank">{link.label}</a>)}</nav> : null}</>;
}
