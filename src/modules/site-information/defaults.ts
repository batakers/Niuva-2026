import { publicCompanyProfile } from "@/features/public/company-content";
import type { PublicSiteInformation } from "./types";
export const defaultSiteInformation: PublicSiteInformation = {
  shortDescription: publicCompanyProfile.supportingCopy,
  email: publicCompanyProfile.contact.email,
  phone: publicCompanyProfile.contact.phone,
  address: publicCompanyProfile.contact.location,
  socialLinks: [],
};
