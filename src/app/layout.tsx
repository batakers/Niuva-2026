import type { Metadata } from "next";
import { Fraunces, Space_Grotesk } from "next/font/google";

import { TooltipProvider } from "@/components/ui/tooltip";
import { PublicPageViewCollector } from "@/components/niuva/public-page-view-collector";

import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  display: "swap",
  variable: "--font-public-sans",
  subsets: ["latin"],
  weight: "variable",
});

const fraunces = Fraunces({
  axes: ["opsz"],
  display: "swap",
  variable: "--font-public-editorial",
  subsets: ["latin"],
  weight: "variable",
});

export const metadata: Metadata = {
  title: "Niuva",
  description:
    "Niuva Inovasi Utama adalah mitra inovasi dan pengembangan produk end-to-end yang membantu perusahaan mengubah ide menjadi solusi teknologi dan produk kreatif bernilai tinggi melalui riset, desain, engineering, prototyping, hingga dukungan manufaktur.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="id"
      className={`${spaceGrotesk.variable} ${fraunces.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <TooltipProvider>
          {process.env.NIUVA_ANALYTICS_ENABLED === "true" ? <PublicPageViewCollector /> : null}
          {children}
        </TooltipProvider>
      </body>
    </html>
  );
}
