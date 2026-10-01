import { z } from "zod";
export const passwordSchema = z.string().min(15, "Gunakan sedikitnya 15 karakter.").max(128, "Gunakan maksimal 128 karakter.");
export const emailSchema = z.string().trim().max(254).email("Masukkan alamat email yang valid.");
export const registrationSchema = z.object({
  name: z.string().trim().min(1, "Masukkan nama lengkap Anda.").max(120),
  email: emailSchema,
  password: passwordSchema,
  confirmPassword: z.string(),
  consent: z.literal("on", { error: "Setujui Syarat Layanan dan Kebijakan Privasi." }),
  returnTo: z.string().max(2048).optional(),
}).refine(value => value.password === value.confirmPassword, { path: ["confirmPassword"], message: "Konfirmasi password belum cocok." });
export const loginSchema = z.object({ email: emailSchema, password: z.string().min(1, "Masukkan password Anda.").max(128), remember: z.enum(["on", "off"]).optional(), returnTo: z.string().max(2048).optional() });
export const tokenSchema = z.string().regex(/^[A-Za-z0-9_-]{43}$/, "Tautan tidak valid. Minta tautan baru.");
