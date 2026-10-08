import { expect, it } from "vitest";
import { invoicePaymentInstructions } from "@/modules/finance/presentation";
const issuer = { issuerName: "Synthetic issuer", issuerAddress: "Synthetic address", issuerEmail: "fixture@example.test", bankName: "Synthetic Bank", accountName: "Synthetic account", accountNumber: "00000000", transferInstructions: "Transfer B2B hanya setelah menerima tagihan." };
it("direct transfer instructions belong to B2B; provider orders retain their payment authority", () => {
  expect(invoicePaymentInstructions({ sourceKind: "B2B", issuer }).join(" ")).toContain("00000000");
  for (const sourceKind of ["ORDER_TOTAL", "CUSTOM_SHIPPING"] as const) { const text = invoicePaymentInstructions({ sourceKind, issuer }).join(" "); expect(text).toContain("konfirmasi penyedia pembayaran"); expect(text).not.toContain("00000000"); }
});
