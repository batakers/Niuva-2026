import "server-only";

export type OrderStatusPreviewScenario =
  | "retail-paid"
  | "retail-processing"
  | "retail-ready-to-ship"
  | "retail-shipped"
  | "retail-completed"
  | "custom-quote-pending"
  | "custom-quote-accepted"
  | "custom-production"
  | "custom-awaiting-shipping-payment"
  | "cancelled"
  | "late-payment"
  | "loading"
  | "service-error"
  | "expired-token"
  | "revoked-token";

export type OrderStatusPreview = Readonly<{
  createdAt: string;
  currentDescription: string;
  currentLabel: string;
  items: readonly Readonly<{
    label: string;
    quantity: number;
    total: string;
  }>[];
  nextAction: Readonly<{
    description: string;
    kind: "none" | "quote" | "payment-unavailable" | "shipping-payment-unavailable" | "support";
    label?: string;
    title: string;
    tone: "success" | "warning" | "info" | "error";
  }>;
  orderNumber: string;
  orderType: "RETAIL" | "CUSTOM_PRINT";
  paidAt: string | null;
  shipment: Readonly<{
    status: string;
    trackingNumber: string | null;
  }> | null;
  steps: readonly Readonly<{
    description?: string;
    id: string;
    label: string;
    state: "pending" | "current" | "completed" | "delayed" | "failed" | "cancelled";
    timestamp?: string;
  }>[];
  total: string;
}>;

export type OrderStatusPreviewResult =
  | Readonly<{ kind: "ready"; order: OrderStatusPreview; scenario: OrderStatusPreviewScenario }>
  | Readonly<{ kind: "loading" }>
  | Readonly<{ kind: "service-error" }>
  | Readonly<{ kind: "access-denied"; reason: "expired" | "revoked" }>;

const supportedScenarios: readonly OrderStatusPreviewScenario[] = [
  "retail-paid",
  "retail-processing",
  "retail-ready-to-ship",
  "retail-shipped",
  "retail-completed",
  "custom-quote-pending",
  "custom-quote-accepted",
  "custom-production",
  "custom-awaiting-shipping-payment",
  "cancelled",
  "late-payment",
  "loading",
  "service-error",
  "expired-token",
  "revoked-token",
];

function resolveScenario(requested: unknown): OrderStatusPreviewScenario {
  return typeof requested === "string" && supportedScenarios.includes(requested as OrderStatusPreviewScenario)
    ? requested as OrderStatusPreviewScenario
    : "retail-paid";
}

export async function getOrderStatusPreview(input: Readonly<{
  preview: unknown;
  state: unknown;
  token: string;
}>): Promise<OrderStatusPreviewResult | null> {
  const isExplicitDevelopmentPreview =
    process.env.NODE_ENV === "development" &&
    input.preview === "examples" &&
    input.token === "preview-order";

  if (!isExplicitDevelopmentPreview) return null;

  const scenario = resolveScenario(input.state);

  if (scenario === "loading") return { kind: "loading" };
  if (scenario === "service-error") return { kind: "service-error" };
  if (scenario === "expired-token") return { kind: "access-denied", reason: "expired" };
  if (scenario === "revoked-token") return { kind: "access-denied", reason: "revoked" };

  const { buildExampleOrderStatus } = await import("./order-status-fixture");

  return {
    kind: "ready",
    order: buildExampleOrderStatus(scenario),
    scenario,
  };
}
