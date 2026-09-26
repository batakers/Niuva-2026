import { z } from "zod";

export const ACTION_QUEUE_LIMIT = 50;
export const ACTION_QUEUE_GROUPS = ["all", "inquiries", "custom-print", "orders"] as const;
const actionQueueGroupSchema = z.enum(ACTION_QUEUE_GROUPS);
export type ActionQueueGroup = z.infer<typeof actionQueueGroupSchema>;

export function parseActionQueueGroup(value: unknown): ActionQueueGroup {
  const parsed = actionQueueGroupSchema.safeParse(value);
  return parsed.success ? parsed.data : "all";
}

export type ActionQueueKind =
  | "B2B_INQUIRY"
  | "CUSTOM_PRINT_REVIEW"
  | "QUOTE_PREPARATION"
  | "QUOTE_SEND"
  | "ORDER_PROCESSING"
  | "PACKAGE_MEASUREMENT"
  | "SHIPPING_EXCEPTION";

export type ActionQueueSignal = Readonly<{
  entityId: string;
  kind: ActionQueueKind;
  reference: string;
  sourceUpdatedAt: Date;
  targetId?: string;
  workflowKey?: string;
}>;

export type ActionQueueItem = Readonly<{
  attention: "STANDARD" | "EXCEPTION";
  id: string;
  href: string;
  kind: ActionQueueKind;
  nextAction: string;
  reference: string;
  sourceUpdatedAt: Date;
  title: string;
}>;

export type ActionQueueResult = Readonly<{
  filteredTotal: number;
  generatedAt: Date;
  group: ActionQueueGroup;
  items: readonly ActionQueueItem[];
  priorityItems: readonly ActionQueueItem[];
  totalOpen: number;
}>;

type ActionQueueCopy = Readonly<{
  attention: ActionQueueItem["attention"];
  nextAction: string;
  title: string;
}>;

const ACTION_QUEUE_COPY = {
  B2B_INQUIRY: {
    attention: "STANDARD",
    nextAction: "Tinjau brief proyek baru",
    title: "Brief proyek baru",
  },
  CUSTOM_PRINT_REVIEW: {
    attention: "STANDARD",
    nextAction: "Mulai review custom print",
    title: "Custom print menunggu review",
  },
  ORDER_PROCESSING: {
    attention: "STANDARD",
    nextAction: "Proses pesanan berbayar",
    title: "Pesanan berbayar menunggu proses",
  },
  PACKAGE_MEASUREMENT: {
    attention: "STANDARD",
    nextAction: "Ukur paket final untuk pengiriman",
    title: "Custom order menunggu pengukuran paket",
  },
  QUOTE_PREPARATION: {
    attention: "STANDARD",
    nextAction: "Siapkan quote",
    title: "Custom print siap dibuatkan quote",
  },
  QUOTE_SEND: {
    attention: "STANDARD",
    nextAction: "Kirim quote",
    title: "Quote menunggu dikirim",
  },
  SHIPPING_EXCEPTION: {
    attention: "EXCEPTION",
    nextAction: "Tinjau exception pengiriman",
    title: "Pengiriman memiliki exception",
  },
} satisfies Record<ActionQueueKind, ActionQueueCopy>;

export function projectActionQueueSignals(
  signals: readonly ActionQueueSignal[],
  generatedAt: Date,
  group: ActionQueueGroup = "all",
): ActionQueueResult {
  const draftWorkflowKeys = new Set(
    signals.flatMap((signal) =>
      signal.kind === "QUOTE_SEND" && signal.workflowKey !== undefined
        ? [signal.workflowKey]
        : [],
    ),
  );
  const uniqueSignals = new Map<string, ActionQueueSignal>();

  for (const signal of signals) {
    if (
      signal.kind === "QUOTE_PREPARATION" &&
      signal.workflowKey !== undefined &&
      draftWorkflowKeys.has(signal.workflowKey)
    ) {
      continue;
    }

    const key = `${signal.kind}:${signal.entityId}`;
    const previous = uniqueSignals.get(key);

    if (
      previous === undefined ||
      signal.sourceUpdatedAt.getTime() > previous.sourceUpdatedAt.getTime()
    ) {
      uniqueSignals.set(key, signal);
    }
  }

  const allItems = Array.from(uniqueSignals.values())
    .map(toActionQueueItem)
    .sort(compareActionQueueItems);
  const filteredItems = allItems.filter((item) =>
    group === "all" || actionQueueGroupForKind(item.kind) === group,
  );

  return {
    filteredTotal: filteredItems.length,
    generatedAt,
    group,
    items: filteredItems.slice(0, ACTION_QUEUE_LIMIT),
    priorityItems: allItems.slice(0, 5),
    totalOpen: allItems.length,
  };
}

function actionQueueGroupForKind(kind: ActionQueueKind): Exclude<ActionQueueGroup, "all"> {
  if (kind === "B2B_INQUIRY") return "inquiries";
  if (kind === "CUSTOM_PRINT_REVIEW" || kind === "QUOTE_PREPARATION" || kind === "QUOTE_SEND") {
    return "custom-print";
  }
  return "orders";
}

function toActionQueueItem(signal: ActionQueueSignal): ActionQueueItem {
  const copy = ACTION_QUEUE_COPY[signal.kind];

  return {
    attention: copy.attention,
    href: actionQueueHref(signal),
    id: `action-queue:${signal.kind}:${signal.entityId}`,
    kind: signal.kind,
    nextAction: copy.nextAction,
    reference: signal.reference,
    sourceUpdatedAt: signal.sourceUpdatedAt,
    title: copy.title,
  };
}

function actionQueueHref(signal: ActionQueueSignal): string {
  switch (signal.kind) {
    case "B2B_INQUIRY":
      return `/admin/inquiries/${encodeURIComponent(signal.entityId)}`;
    case "CUSTOM_PRINT_REVIEW":
    case "QUOTE_PREPARATION":
      return `/admin/custom-print/${encodeURIComponent(signal.entityId)}`;
    case "QUOTE_SEND":
      return signal.targetId
        ? `/admin/custom-print/${encodeURIComponent(signal.targetId)}`
        : "/admin/custom-print";
    case "ORDER_PROCESSING":
    case "PACKAGE_MEASUREMENT":
      return `/admin/orders/${encodeURIComponent(signal.entityId)}`;
    case "SHIPPING_EXCEPTION":
      return signal.targetId
        ? `/admin/orders/${encodeURIComponent(signal.targetId)}`
        : "/admin/orders";
  }
}

function compareActionQueueItems(
  left: ActionQueueItem,
  right: ActionQueueItem,
): number {
  const attentionOrder =
    Number(right.attention === "EXCEPTION") -
    Number(left.attention === "EXCEPTION");

  if (attentionOrder !== 0) {
    return attentionOrder;
  }

  const ageOrder =
    left.sourceUpdatedAt.getTime() - right.sourceUpdatedAt.getTime();

  return ageOrder === 0 ? left.id.localeCompare(right.id) : ageOrder;
}
