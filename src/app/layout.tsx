import type { Metadata } from "next";
import { Manrope } from "next/font/google";

import { TooltipProvider } from "@/components/ui/tooltip";
import { PublicPageViewCollector } from "@/components/niuva/public-page-view-collector";
import { buildRootMetadata } from "@/lib/site-metadata";
import { getPublicSiteInformation } from "@/modules/site-information/public-reader";
import { PublicSiteInformationProvider } from "@/components/niuva/public-site-information";

import "./globals.css";

const manrope = Manrope({
  display: "swap",
  variable: "--font-niuva-sans",
  subsets: ["latin"],
  weight: "variable",
});

export const metadata: Metadata = buildRootMetadata(process.env);

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const siteInformation = await getPublicSiteInformation();
  return (
    <html
      lang="id"
      className={`${manrope.variable} h-full antialiased`}
      data-scroll-behavior="smooth"
    >
      <body className="min-h-full flex flex-col">
        <TooltipProvider>
          {process.env.NIUVA_ANALYTICS_ENABLED === "true" ? <PublicPageViewCollector /> : null}
          <PublicSiteInformationProvider values={siteInformation}>{children}</PublicSiteInformationProvider>
        </TooltipProvider>
      </body>
    </html>
  );
}
