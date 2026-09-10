import type { B2BInquiryInput } from "@/modules/inquiry/schema";
import { publicServices } from "@/features/public/company-content";

type BriefField = {
  name: keyof B2BInquiryInput; label: string; required?: boolean; type?: "text" | "email" | "tel" | "date" | "url" | "textarea" | "select";
  autoComplete?: string; description?: string; options?: readonly { value: string; label: string }[];
};
export const briefFieldGroups: readonly { title: string; fields: readonly BriefField[] }[] = [
  { title: "Kontak untuk percakapan awal", fields: [
    { name: "name", label: "Nama kontak", required: true, autoComplete: "name" },
    { name: "company", label: "Perusahaan atau tim (opsional)", autoComplete: "organization" },
    { name: "email", label: "Email", type: "email", required: true, autoComplete: "email" },
    { name: "phone", label: "Nomor WhatsApp", type: "tel", required: true, autoComplete: "tel" },
  ] },
  { title: "Konteks dan tujuan proyek", fields: [
    { name: "projectGoal", label: "Apa yang ingin dicapai?", required: true },
    { name: "currentStage", label: "Tahap saat ini", type: "select", required: true, options: [
      { value: "IDEA", label: "Ide" }, { value: "SKETCH", label: "Sketsa" }, { value: "CAD", label: "CAD" },
      { value: "PROTOTYPE", label: "Prototype" }, { value: "EXISTING_PRODUCT", label: "Produk yang sudah ada" },
    ] },
    { name: "description", label: "Ceritakan kebutuhan dan batasannya", type: "textarea", required: true, description: "Misalnya fungsi, pengguna, material, atau keputusan yang perlu ditinjau." },
    { name: "targetQuantity", label: "Target jumlah", required: true, description: "Boleh berupa perkiraan, misalnya 1 prototype atau 20–30 unit." },
    { name: "targetDeadline", label: "Target waktu", type: "date", required: true },
  ] },
  { title: "Referensi dan preferensi", fields: [
    { name: "referenceLink", label: "Link referensi", type: "url", required: true, description: "Gunakan link yang dapat Anda bagikan. Upload file belum tersedia pada tahap ini." },
    { name: "budgetRange", label: "Rentang anggaran (opsional)" },
    { name: "preferredService", label: "Dukungan yang dicari (opsional)", type: "select", options: publicServices.map(service => ({ value: service.title, label: service.title })) },
  ] },
];
