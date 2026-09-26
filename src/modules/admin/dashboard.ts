export type DashboardDay = Readonly<{
  date: string;
  inquiries: number;
  customPrint: number;
  orders: number;
}>;

export type DashboardWindow = Readonly<{
  start: Date;
  end: Date;
  dates: readonly string[];
}>;

export type DashboardSource = Readonly<{
  newInquiries: number;
  submittedCustomPrint: number;
  paidOrders: number;
  inquiryCreatedAt: readonly Date[];
  customPrintCreatedAt: readonly Date[];
  orderCreatedAt: readonly Date[];
}>;

export type DashboardResult = Readonly<{
  generatedAt: Date;
  newInquiries: number;
  submittedCustomPrint: number;
  paidOrders: number;
  activity: readonly DashboardDay[];
}>;

const DAY_MS = 24 * 60 * 60 * 1000;
// Asia/Jakarta is UTC+07:00 and does not observe daylight saving time.
const JAKARTA_OFFSET_MS = 7 * 60 * 60 * 1000;

function jakartaDateKey(value: Date): string {
  return new Date(value.getTime() + JAKARTA_OFFSET_MS).toISOString().slice(0, 10);
}

export function dashboardWindow(now: Date): DashboardWindow {
  const local = new Date(now.getTime() + JAKARTA_OFFSET_MS);
  const todayStart = Date.UTC(
    local.getUTCFullYear(),
    local.getUTCMonth(),
    local.getUTCDate(),
  ) - JAKARTA_OFFSET_MS;
  const start = new Date(todayStart - 29 * DAY_MS);
  const end = new Date(todayStart + DAY_MS);
  const dates = Array.from({ length: 30 }, (_, index) =>
    jakartaDateKey(new Date(start.getTime() + index * DAY_MS)),
  );
  return { start, end, dates };
}

export function projectDashboard(
  source: DashboardSource,
  generatedAt: Date,
  window: DashboardWindow,
): DashboardResult {
  const activity = new Map<string, { inquiries: number; customPrint: number; orders: number }>(
    window.dates.map((date) => [date, { inquiries: 0, customPrint: 0, orders: 0 }]),
  );

  for (const createdAt of source.inquiryCreatedAt) {
    const day = activity.get(jakartaDateKey(createdAt));
    if (day) day.inquiries += 1;
  }
  for (const createdAt of source.customPrintCreatedAt) {
    const day = activity.get(jakartaDateKey(createdAt));
    if (day) day.customPrint += 1;
  }
  for (const createdAt of source.orderCreatedAt) {
    const day = activity.get(jakartaDateKey(createdAt));
    if (day) day.orders += 1;
  }

  return {
    generatedAt,
    newInquiries: source.newInquiries,
    submittedCustomPrint: source.submittedCustomPrint,
    paidOrders: source.paidOrders,
    activity: window.dates.map((date) => ({
      date,
      ...(activity.get(date) ?? { inquiries: 0, customPrint: 0, orders: 0 }),
    })),
  };
}
