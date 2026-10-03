import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AppError } from "@/modules/shared/errors";

const state = vi.hoisted(() => ({
  authError: null as unknown,
  capabilities: { database: true, customerGoogle: true, customUploads: true } as Record<string, boolean>,
}));

vi.mock("next/image", () => ({ default: () => null }));
vi.mock("next/server", () => ({ connection: async () => undefined }));
vi.mock("next/navigation", () => ({
  usePathname: () => "/",
  redirect: (url: string) => {
    throw new Error(`REDIRECT:${url}`);
  },
}));
vi.mock("@/lib/auth/customer", () => ({
  requireCustomer: async () => {
    if (state.authError) throw state.authError;
    return { id: "test-customer", email: "customer@example.test", name: "Test Customer" };
  },
}));
vi.mock("@/lib/env/server", () => ({
  getServerCapabilities: () => state.capabilities,
  isLocalDemoMode: () => false,
}));
vi.mock("@/features/frontend-preview/server", () => ({
  getShopPreview: async () => ({ scenario: null, products: [] }),
  getLiveShopProducts: async () => [],
}));
vi.mock("@/app/checkout/checkout-form", () => ({ CheckoutForm: () => null }));
vi.mock("@/app/project-brief/brief-form", () => ({ BriefForm: () => null }));
vi.mock("@/app/custom-print/request/request-form", () => ({ RequestForm: () => null }));
vi.mock("@/app/custom-print/request/reference-request-form", () => ({ ReferenceRequestForm: () => null }));

import CheckoutPage from "@/app/checkout/page";
import CustomPrintPage from "@/app/custom-print/page";
import CustomPrintRequestPage from "@/app/custom-print/request/page";
import ProjectBriefPage from "@/app/project-brief/page";

const UNAVAILABLE_TITLE = "Login Customer belum tersedia";
const CUSTOM_PRINT_TITLE = "Login Customer belum tersedia pada runtime ini.";
const CUSTOM_PRINT_CTA = "Pengajuan menunggu login Customer tersedia.";
const CUSTOM_PRINT_STATUS_TITLE = "Pengiriman menunggu login Customer.";

function expectNeutralLoginCopy(text: string) {
  expect(text.toLowerCase()).toContain("login customer");
  expect(text.toLowerCase()).not.toContain("google");
}

function noticeContaining(text: string): HTMLElement {
  const notice = screen.getByText(text).closest<HTMLElement>('[data-component="status-notice"]');
  expect(notice).not.toBeNull();
  return notice as HTMLElement;
}

function gatedAuth() {
  state.authError = new AppError("CUSTOMER_AUTH_UNAVAILABLE");
}

beforeEach(() => {
  state.authError = null;
  state.capabilities = { database: true, customerGoogle: true, customUploads: true };
});

const gatedPages = [
  {
    name: "checkout",
    title: "Login Customer belum tersedia.",
    description: "Checkout membutuhkan login Customer. Lengkapi konfigurasi autentikasi non-production sebelum melanjutkan.",
    render: () => CheckoutPage({ searchParams: Promise.resolve({}) }),
    loginRedirect: "REDIRECT:/login?returnTo=/checkout",
  },
  {
    name: "project-brief",
    title: UNAVAILABLE_TITLE,
    description: "Project Brief memerlukan login Customer sebelum dapat dikirim pada runtime ini.",
    render: () => ProjectBriefPage({ searchParams: Promise.resolve({}) }),
    loginRedirect: `REDIRECT:/login?returnTo=${encodeURIComponent("/project-brief")}`,
  },
  {
    name: "custom-print/request",
    title: UNAVAILABLE_TITLE,
    description: "Request MAKE memerlukan login Customer sebelum dapat dikirim pada runtime ini.",
    render: () => CustomPrintRequestPage({ searchParams: Promise.resolve({}) }),
    loginRedirect: `REDIRECT:/login?returnTo=${encodeURIComponent("/custom-print/request")}`,
  },
] as const;

describe("Customer login availability copy (R11)", () => {
  describe.each(gatedPages)("$name", (page) => {
    it("shows neutral 'login Customer' description without Google when login is unavailable", async () => {
      gatedAuth();
      render(await page.render());

      const notice = noticeContaining(page.description);
      expect(within(notice).getByText(page.title)).toBeInTheDocument();
      expectNeutralLoginCopy(page.description);
      expect(notice.textContent?.toLowerCase()).not.toContain("google");
    });

    it("keeps the 'Login Customer belum tersedia' title unchanged", async () => {
      gatedAuth();
      render(await page.render());

      expect(within(noticeContaining(page.title)).getByText(page.description)).toBeInTheDocument();
    });

    it("still redirects unauthenticated visitors to /login and renders the page when a Customer exists", async () => {
      state.authError = new AppError("UNAUTHORIZED");
      await expect(page.render()).rejects.toThrow(page.loginRedirect);

      state.authError = null;
      render(await page.render());
      expect(screen.getByRole("main")).toBeInTheDocument();
      expect(screen.queryByText(page.title)).not.toBeInTheDocument();
      expect(screen.queryByText(page.description)).not.toBeInTheDocument();
    });

    it("rethrows unrelated errors instead of showing the login notice", async () => {
      const failure = new Error("unexpected");
      state.authError = failure;
      await expect(page.render()).rejects.toBe(failure);
    });
  });

  it("project-brief and custom-print/request keep the notice without adding a link action", async () => {
    gatedAuth();
    render(await ProjectBriefPage({ searchParams: Promise.resolve({}) }));
    expect(within(noticeContaining(UNAVAILABLE_TITLE)).queryByRole("link")).not.toBeInTheDocument();
  });

  describe("custom-print", () => {
    function gateCustomerAuth() {
      state.capabilities = { database: true, customerGoogle: false, customUploads: true };
    }

    it("uses neutral 'login Customer' copy in all three affected locations when login is unavailable", async () => {
      gateCustomerAuth();
      render(await CustomPrintPage());

      // (a) notice title and description
      const notice = noticeContaining(CUSTOM_PRINT_TITLE);
      expectNeutralLoginCopy(CUSTOM_PRINT_TITLE);
      expect(notice.textContent?.toLowerCase()).not.toContain("google");

      // (b) call-to-action text, one per product option
      const ctas = screen.getAllByText(CUSTOM_PRINT_CTA);
      expect(ctas.length).toBeGreaterThan(0);
      for (const cta of ctas) expectNeutralLoginCopy(cta.textContent ?? "");

      // (c) delivery status title
      const status = screen.getByText(CUSTOM_PRINT_STATUS_TITLE);
      expectNeutralLoginCopy(status.textContent ?? "");
    });

    it("shows no Google wording anywhere in the gated login notices", async () => {
      gateCustomerAuth();
      render(await CustomPrintPage());

      const notices = document.querySelectorAll('[data-component="status-notice"]');
      expect(notices.length).toBeGreaterThan(0);
      for (const notice of notices) {
        expect(notice.textContent?.toLowerCase()).not.toContain("google");
      }
    });

    it("keeps gating on database && customerGoogle and hides the login copy when both are enabled", async () => {
      render(await CustomPrintPage());

      expect(screen.queryByText(CUSTOM_PRINT_TITLE)).not.toBeInTheDocument();
      expect(screen.queryByText(CUSTOM_PRINT_CTA)).not.toBeInTheDocument();
      expect(screen.queryByText(CUSTOM_PRINT_STATUS_TITLE)).not.toBeInTheDocument();
      expect(screen.getByRole("link", { name: "Ajukan referensi untuk review" })).toHaveAttribute(
        "href",
        "/custom-print/request?mode=reference",
      );
    });

    it("stays gated when the database capability is missing", async () => {
      state.capabilities = { database: false, customerGoogle: true, customUploads: true };
      render(await CustomPrintPage());

      expect(screen.getByText(CUSTOM_PRINT_TITLE)).toBeInTheDocument();
      expect(screen.getByText(CUSTOM_PRINT_STATUS_TITLE)).toBeInTheDocument();
      expect(screen.queryByRole("link", { name: "Ajukan referensi untuk review" })).not.toBeInTheDocument();
    });

    it("does not reuse the 'Login Customer belum tersedia' title on the custom-print page", async () => {
      gateCustomerAuth();
      render(await CustomPrintPage());

      expect(screen.queryByText(UNAVAILABLE_TITLE)).not.toBeInTheDocument();
      expect(screen.queryByText(`${UNAVAILABLE_TITLE}.`)).not.toBeInTheDocument();
    });
  });
});
