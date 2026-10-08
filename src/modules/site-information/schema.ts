import { z } from "zod";
const plain = (min: number, max: number) => z.string().trim().min(min).max(max).refine(value => !/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value));
export const siteInformationSchema = z.object({
  shortDescription: plain(10, 600),
  email: z.email().max(254),
  phone: z.string().trim().min(9).max(30).regex(/^\+?[0-9 ()-]+$/).refine(value => /^\d{9,15}$/.test(value.replace(/\D/g, ""))),
  address: plain(10, 600),
  socialLinks: z.array(z.object({ label: plain(1, 40), href: z.url().max(500).refine(value => { const url = new URL(value); return url.protocol === "https:" && !url.username && !url.password; }) }).strict()).max(8),
}).strict();
export const publishSiteInformationSchema = z.object({ expectedVersion: z.number().int().min(0), values: siteInformationSchema }).strict();
