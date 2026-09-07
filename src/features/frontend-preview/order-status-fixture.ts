import type {
  OrderStatusPreview,
  OrderStatusPreviewScenario,
} from "./order-status";

type StepDefinition = Readonly<{
  description: string;
  id: string;
  label: string;
  timestamp?: string;
}>;

type ReadyScenario = Exclude<OrderStatusPreviewScenario, "loading" | "service-error" | "expired-token" | "revoked-token">;
type RetailScenario = Extract<ReadyScenario, `retail-${string}`>;
type CustomScenario = Extract<ReadyScenario, `custom-${string}`>;

const retailScenarios: readonly RetailScenario[] = [
  "retail-paid",
  "retail-processing",
  "retail-ready-to-ship",
  "retail-shipped",
  "retail-completed",
];

function isRetailScenario(scenario: ReadyScenario): scenario is RetailScenario {
  return retailScenarios.includes(scenario as RetailScenario);
}

const retailSteps: readonly StepDefinition[] = [
  { id: "waiting-payment", label: "Menunggu pembayaran", description: "Order dibuat dan menunggu pembayaran terverifikasi.", timestamp: "7 September 2026, 09.12 WIB" },
  { id: "paid", label: "Pembayaran diterima", description: "Pembayaran telah diverifikasi oleh server.", timestamp: "7 September 2026, 09.18 WIB" },
  { id: "processing", label: "Order diproses", description: "Item disiapkan dan diperiksa sebelum pengiriman." },
  { id: "ready-to-ship", label: "Siap dikirim", description: "Paket telah selesai disiapkan." },
  { id: "shipped", label: "Dalam pengiriman", description: "Paket sudah diserahkan kepada mitra pengiriman." },
  { id: "completed", label: "Selesai", description: "Order telah selesai." },
];

const customSteps: readonly StepDefinition[] = [
  { id: "submitted", label: "Request diterima", description: "Konfigurasi dan file masuk ke antrean review.", timestamp: "5 September 2026, 10.20 WIB" },
  { id: "under-review", label: "Review operator", description: "Operator memeriksa konfigurasi dan hasil slicer.", timestamp: "6 September 2026, 14.10 WIB" },
  { id: "quote-pending", label: "Menunggu persetujuan quote", description: "Quote immutable tersedia untuk ditinjau." },
  { id: "waiting-payment", label: "Menunggu pembayaran", description: "Quote sudah diterima dan order menunggu pembayaran." },
  { id: "paid", label: "Pembayaran diterima", description: "Pembayaran utama telah diverifikasi." },
  { id: "production", label: "Dalam produksi", description: "Pencetakan berjalan sesuai scope yang disetujui." },
  { id: "finishing", label: "Finishing dan QC", description: "Hasil cetak diperiksa sebelum pengukuran paket final." },
  { id: "shipping-payment", label: "Menunggu pembayaran pengiriman", description: "Biaya pengiriman dihitung dari ukuran paket final." },
  { id: "ready-to-ship", label: "Siap dikirim", description: "Paket siap diserahkan kepada mitra pengiriman." },
  { id: "shipped", label: "Dalam pengiriman", description: "Paket sudah diserahkan kepada mitra pengiriman." },
  { id: "completed", label: "Selesai", description: "Order custom print telah selesai." },
];

function buildSteps(definitions: readonly StepDefinition[], currentId: string) {
  const currentIndex = definitions.findIndex((step) => step.id === currentId);

  return definitions.map((step, index) => ({
    ...step,
    state: index < currentIndex ? "completed" as const : index === currentIndex ? "current" as const : "pending" as const,
  }));
}

const retailState: Record<
  RetailScenario,
  Readonly<{ currentId: string; description: string; label: string }>
> = {
  "retail-paid": { currentId: "paid", label: "Pembayaran diterima", description: "Pembayaran sudah terverifikasi. Item berikutnya masuk ke persiapan order." },
  "retail-processing": { currentId: "processing", label: "Order sedang diproses", description: "Tim sedang menyiapkan item dan pemeriksaan akhir." },
  "retail-ready-to-ship": { currentId: "ready-to-ship", label: "Order siap dikirim", description: "Paket selesai disiapkan dan menunggu serah terima pengiriman." },
  "retail-shipped": { currentId: "shipped", label: "Order dalam pengiriman", description: "Paket sudah diserahkan kepada mitra pengiriman." },
  "retail-completed": { currentId: "completed", label: "Order selesai", description: "Seluruh proses order telah selesai." },
};

export function buildExampleOrderStatus(
  scenario: ReadyScenario,
): OrderStatusPreview {
  if (isRetailScenario(scenario)) {
    const state = retailState[scenario];
    const isShipped = scenario === "retail-shipped" || scenario === "retail-completed";

    return {
      createdAt: "7 September 2026, 09.12 WIB",
      currentDescription: state.description,
      currentLabel: state.label,
      items: [
        { label: "Desk organizer modular", quantity: 1, total: "Rp185.000" },
        { label: "Cable dock mini", quantity: 2, total: "Rp158.000" },
      ],
      nextAction: scenario === "retail-completed"
        ? { kind: "none", title: "Tidak ada tindakan lanjutan", description: "Order ini sudah selesai.", tone: "success" }
        : { kind: "none", title: "Tidak ada tindakan yang diperlukan", description: "Perubahan berikutnya akan muncul setelah diverifikasi oleh sistem Niuva.", tone: "info" },
      orderNumber: "ORD-260907-R4K8",
      orderType: "RETAIL",
      paidAt: "7 September 2026, 09.18 WIB",
      shipment: isShipped ? { status: scenario === "retail-completed" ? "Selesai" : "Dalam pengiriman", trackingNumber: "NVA-DEMO-4821" } : null,
      steps: buildSteps(retailSteps, state.currentId),
      total: "Rp343.000",
    };
  }

  if (scenario === "cancelled" || scenario === "late-payment") {
    const latePayment = scenario === "late-payment";
    return {
      createdAt: "7 September 2026, 08.00 WIB",
      currentDescription: latePayment
        ? "Pembayaran tiba setelah batas waktu. Order tetap dibatalkan dan exception refund penuh memerlukan penyelesaian."
        : "Order dibatalkan sebelum pembayaran terverifikasi.",
      currentLabel: latePayment ? "Refund penuh sedang direkonsiliasi" : "Order dibatalkan",
      items: [{ label: "Desk organizer modular", quantity: 1, total: "Rp185.000" }],
      nextAction: latePayment
        ? { kind: "support", title: "Tunggu konfirmasi refund", description: "Jangan melakukan pembayaran ulang. Siapkan nomor order saat menghubungi Niuva melalui kanal konfirmasi Anda.", tone: "warning" }
        : { kind: "none", title: "Order sudah ditutup", description: "Tidak ada pembayaran atau pemenuhan yang akan dilanjutkan untuk order ini.", tone: "warning" },
      orderNumber: "ORD-260907-X9C2",
      orderType: "RETAIL",
      paidAt: null,
      shipment: null,
      steps: [
        { ...retailSteps[0], state: "completed" },
        ...(latePayment ? [{ id: "late-payment", label: "Pembayaran melewati batas waktu", description: "Skenario exception menunggu refund penuh, bukan membuka kembali order.", state: "delayed" as const }] : []),
        { id: "cancelled", label: "Order dibatalkan", description: "Stok atau pemenuhan tidak dilanjutkan.", state: "cancelled" },
      ],
      total: "Rp185.000",
    };
  }

  const customStates: Record<CustomScenario, Readonly<{ currentId: string; description: string; label: string }>> = {
    "custom-quote-pending": { currentId: "quote-pending", label: "Quote menunggu keputusan", description: "Tinjau scope, asumsi, total, dan masa berlaku sebelum menerima quote." },
    "custom-quote-accepted": { currentId: "waiting-payment", label: "Menunggu pembayaran utama", description: "Quote diterima. Pembayaran nyata tetap harus dibuat dan diverifikasi oleh server." },
    "custom-production": { currentId: "production", label: "Custom print dalam produksi", description: "Produksi berjalan berdasarkan scope quote yang sudah dikunci." },
    "custom-awaiting-shipping-payment": { currentId: "shipping-payment", label: "Menunggu pembayaran pengiriman", description: "Paket final sudah diukur dan biaya pengiriman menunggu pembayaran." },
  };
  const customScenario = scenario as CustomScenario;
  const customState = customStates[customScenario];

  const nextAction = customScenario === "custom-quote-pending"
    ? { kind: "quote" as const, label: "Tinjau quote contoh", title: "Keputusan quote diperlukan", description: "Tinjau versi quote aktif sebelum masa berlakunya selesai.", tone: "warning" as const }
    : customScenario === "custom-quote-accepted"
      ? { kind: "payment-unavailable" as const, label: "Pembayaran belum aktif", title: "Pembayaran utama menunggu integrasi", description: "Preview tidak membuat transaksi atau menganggap browser sebagai bukti pembayaran.", tone: "info" as const }
      : customScenario === "custom-awaiting-shipping-payment"
        ? { kind: "shipping-payment-unavailable" as const, label: "Pembayaran pengiriman belum aktif", title: "Biaya pengiriman siap ditinjau", description: "Preview tidak membuka Midtrans atau membuat payment attempt.", tone: "info" as const }
        : { kind: "none" as const, title: "Tidak ada tindakan yang diperlukan", description: "Tim Niuva akan memperbarui status setelah tahap produksi berikutnya selesai.", tone: "info" as const };

  return {
    createdAt: "5 September 2026, 10.20 WIB",
    currentDescription: customState.description,
    currentLabel: customState.label,
    items: [{ label: "Enclosure sensor custom, PLA, 2 unit", quantity: 1, total: "Rp115.360" }],
    nextAction,
    orderNumber: "CUS-260907-N2Q8",
    orderType: "CUSTOM_PRINT",
    paidAt: scenario === "custom-production" || scenario === "custom-awaiting-shipping-payment" ? "7 September 2026, 16.28 WIB" : null,
    shipment: null,
    steps: buildSteps(customSteps, customState.currentId),
    total: "Rp115.360",
  };
}
