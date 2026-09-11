import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type {
  ActionQueueItem,
  ActionQueueResult,
} from "@/modules/admin/action-queue";
import {
  AdminActionQueueErrorView,
  AdminActionQueueView,
} from "@/app/admin/action-queue-view";

const generatedAt = new Date("2026-09-11T08:00:00.000Z");

function item(overrides: Partial<ActionQueueItem> = {}): ActionQueueItem {
  return {
    attention: "STANDARD",
    id: "action-queue:B2B_INQUIRY:inquiry-1",
    kind: "B2B_INQUIRY",
    nextAction: "Tinjau brief proyek baru",
    reference: "BRF-NEW-1",
    sourceUpdatedAt: new Date("2026-09-11T05:00:00.000Z"),
    title: "Brief proyek baru",
    ...overrides,
  };
}

function result(items: readonly ActionQueueItem[]): ActionQueueResult {
  return { generatedAt, items };
}

describe("AdminActionQueueView", () => {
  it("renders safe server-derived work rows with textual exception context", () => {
    render(
      <AdminActionQueueView
        role="OWNER"
        result={result([
          item({
            attention: "EXCEPTION",
            id: "action-queue:SHIPPING_EXCEPTION:shipment-1",
            kind: "SHIPPING_EXCEPTION",
            nextAction: "Tinjau exception pengiriman",
            reference: "ORD-SHIP-1",
            title: "Pengiriman memiliki exception",
          }),
        ])}
      />,
    );

    expect(
      screen.getByRole("heading", { level: 1, name: "Action Queue" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Owner")).toBeInTheDocument();
    expect(screen.getByRole("list", { name: "Pekerjaan operasional" })).toBeInTheDocument();
    expect(screen.getByText("ORD-SHIP-1")).toBeInTheDocument();
    expect(screen.getByText("Tinjau exception pengiriman")).toBeInTheDocument();
    expect(screen.getByText("Exception")).toBeInTheDocument();
    expect(screen.queryByText("client@example.com")).not.toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("renders a genuine empty state without preview examples", () => {
    render(
      <AdminActionQueueView
        role="ADMIN"
        result={result([])}
      />,
    );

    expect(
      screen.getByText("Tidak ada pekerjaan yang perlu ditinjau."),
    ).toBeInTheDocument();
    expect(screen.queryByText("Development-only preview")).not.toBeInTheDocument();
    expect(screen.queryByRole("list", { name: "Pekerjaan operasional" })).not.toBeInTheDocument();
  });

  it("renders a safe recovery state when the queue cannot be read", () => {
    render(<AdminActionQueueErrorView role="ADMIN" />);

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Action Queue belum dapat dimuat",
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Data operasional belum dapat dimuat.",
    );
    expect(screen.queryByText("Development-only preview")).not.toBeInTheDocument();
  });
});
