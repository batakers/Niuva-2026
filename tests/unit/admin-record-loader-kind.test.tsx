import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { loadAdminRecord } from "@/app/admin/admin-record-loader";
import { AdminDataUnavailableView } from "@/components/niuva/admin-shell";
import {
  adminDataUnavailableDescription,
  systemCopy,
} from "@/components/niuva/system-state-copy";
import { FAILURE_KINDS, type FailureKind } from "@/lib/observability/logger";
import { AppError } from "@/modules/shared/errors";

// Task 3.6 (G3): `unavailable` carries a FailureKind; the view picks copy by kind.
// **Validates: Requirements 8.4, 8.5, 27.4, 27.5, 5.1**

const legacyDescription =
  "Sesi Admin tersedia, tetapi sumber data sedang tidak dapat dijangkau. Coba muat ulang tanpa mengubah data.";

function namedError(name: string, code?: string): Error {
  const error = new Error("raw provider detail that must not reach the view");
  error.name = name;
  if (code !== undefined) Object.assign(error, { code });
  return error;
}

describe("loadAdminRecord unavailable kind", () => {
  it("reports DATABASE_UNAVAILABLE for a database connectivity failure", async () => {
    const result = await loadAdminRecord(() => Promise.reject(namedError("PrismaClientKnownRequestError", "P1001")));
    expect(result).toEqual({ status: "unavailable", kind: "DATABASE_UNAVAILABLE" });
  });

  it("reports PROVIDER_TIMEOUT for an abort/timeout failure", async () => {
    const result = await loadAdminRecord(() => Promise.reject(namedError("TimeoutError")));
    expect(result).toEqual({ status: "unavailable", kind: "PROVIDER_TIMEOUT" });
  });

  it("reports CODE_DEFECT for an unrecognised failure", async () => {
    const result = await loadAdminRecord(() => Promise.reject(new TypeError("boom")));
    expect(result).toEqual({ status: "unavailable", kind: "CODE_DEFECT" });
  });

  it("keeps found and not-found results unchanged", async () => {
    expect(await loadAdminRecord(() => Promise.resolve({ id: "a" }))).toEqual({
      status: "found",
      record: { id: "a" },
    });
    expect(await loadAdminRecord(() => Promise.resolve(null))).toEqual({ status: "not-found" });
    expect(await loadAdminRecord(() => Promise.reject(new AppError("NOT_FOUND")))).toEqual({
      status: "not-found",
    });
  });
});

describe("AdminDataUnavailableView copy by kind", () => {
  function descriptionOf(kind?: FailureKind): string {
    const { container, unmount } = render(
      <AdminDataUnavailableView kind={kind} role="ADMIN" title="Detail belum dapat dimuat" />,
    );
    const text = container.querySelector("main h1 + p")?.textContent ?? "";
    unmount();
    return text;
  }

  it("keeps the existing copy when no kind is given", () => {
    expect(descriptionOf()).toBe(legacyDescription);
  });

  it.each([
    ["DATABASE_UNAVAILABLE", systemCopy.adminDataUnavailable.DATABASE_UNAVAILABLE],
    ["PROVIDER_TIMEOUT", systemCopy.adminDataUnavailable.PROVIDER_TIMEOUT],
    ["CODE_DEFECT", systemCopy.adminDataUnavailable.CODE_DEFECT],
  ] as const)("renders dedicated copy for %s", (kind, expected) => {
    expect(descriptionOf(kind)).toBe(expected);
  });

  it("uses the safe fallback for every other kind", () => {
    const dedicated = new Set<FailureKind>(["DATABASE_UNAVAILABLE", "PROVIDER_TIMEOUT", "CODE_DEFECT"]);
    for (const kind of FAILURE_KINDS.filter((candidate) => !dedicated.has(candidate))) {
      expect(adminDataUnavailableDescription(kind)).toBe(systemCopy.adminDataUnavailable.fallback);
      expect(descriptionOf(kind)).toBe(systemCopy.adminDataUnavailable.fallback);
    }
  });

  it("gives the three dedicated causes distinct copy", () => {
    const copies = new Set([
      adminDataUnavailableDescription("DATABASE_UNAVAILABLE"),
      adminDataUnavailableDescription("PROVIDER_TIMEOUT"),
      adminDataUnavailableDescription("CODE_DEFECT"),
    ]);
    expect(copies.size).toBe(3);
  });

  it("never renders raw error detail", () => {
    const { container } = render(<AdminDataUnavailableView kind="PROVIDER_TIMEOUT" role="OWNER" />);
    expect(container.textContent).not.toContain("raw provider detail");
  });
});
