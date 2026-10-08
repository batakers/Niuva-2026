export type PublicSiteInformation = Readonly<{
  shortDescription: string;
  email: string;
  phone: string;
  address: string;
  socialLinks: readonly Readonly<{ label: string; href: string }>[];
}>;
export type SiteInformationSnapshot = Readonly<{ version: number; values: PublicSiteInformation }>;
export type SiteInformationActionState = Readonly<{ status: "idle" | "success" | "error"; message?: string; version?: number }>;
