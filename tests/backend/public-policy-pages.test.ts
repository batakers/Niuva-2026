import { renderToStaticMarkup } from "react-dom/server";
import { createElement, type ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
const dates = vi.hoisted(() => ({ publishedAt: null as string | null, effectiveAt: null as string | null }));
vi.mock("next/server", () => ({ connection: async () => {} }));
vi.mock("@/components/niuva/public-shell", () => ({ PublicShell: ({ children }: { children: ReactNode }) => createElement("div", null, children) }));
vi.mock("@/modules/customer-auth/public-policy", async original => {
  const actual = await original<typeof import("@/modules/customer-auth/public-policy")>();
  const policy = { ...actual.PUBLIC_CUSTOMER_POLICY, get publishedAt() { return dates.publishedAt; }, get effectiveAt() { return dates.effectiveAt; } };
  return { ...actual, PUBLIC_CUSTOMER_POLICY: policy, isPolicyPublished: () => actual.isPolicyPublished(dates, Date.parse("2026-11-01T00:00:00Z")) };
});
import TermsPage from "@/app/terms/page";
import PrivacyPage from "@/app/privacy/page";
import { PublicPolicyPage } from "@/components/niuva/public-policy-page";
import { PolicyDocument, policyOutline } from "@/components/niuva/policy-document";
import { readApprovedCustomerPolicy } from "@/modules/customer-auth/public-policy-content";

beforeEach(() => { dates.publishedAt = null; dates.effectiveAt = null; });

describe("public policy pages", () => {
  it.each([["terms", TermsPage], ["privacy", PrivacyPage]] as const)("/%s routes to its official document", (document, Page) => {
    expect(Page()).toMatchObject({ type: PublicPolicyPage, props: { document } });
  });

  it.each(["terms", "privacy"] as const)("%s does not exist before the recorded publication takes effect", async document => {
    await expect(PublicPolicyPage({ document })).rejects.toThrow(/NEXT_HTTP_ERROR_FALLBACK;404|NEXT_NOT_FOUND/);
    dates.publishedAt = "2026-10-30T00:00:00Z"; dates.effectiveAt = "2026-11-02T00:00:00Z";
    await expect(PublicPolicyPage({ document })).rejects.toThrow(/NEXT_HTTP_ERROR_FALLBACK;404|NEXT_NOT_FOUND/);
  });

  it.each([["terms", "NIUVA-TERMS-v1.0", "Syarat Layanan Niuva"], ["privacy", "NIUVA-PRIVACY-v1.0", "Kebijakan Privasi Niuva"]] as const)("%s renders the approved text with version and dates once effective", async (document, version, title) => {
    dates.publishedAt = "2026-10-30T00:00:00+07:00"; dates.effectiveAt = "2026-10-31T00:00:00+07:00";
    const html = renderToStaticMarkup(await PublicPolicyPage({ document }));
    expect(html).toContain(version); expect(html).toContain(title);
    expect(html).toContain("30 Oktober 2026"); expect(html).toContain("31 Oktober 2026");
    expect(html).toContain("PT. NIUVA INOVASI UTAMA");
  });

  it.each(["terms", "privacy"] as const)("the %s text carries no internal review notes and no unresolved marker once published", async document => {
    const source = await readApprovedCustomerPolicy(document);
    for (const internal of ["Draf", "DRAFT-", "T11", "Owner", "docs/", ".md)"]) expect(source, internal).not.toContain(internal);
    // An unresolved marker may exist only while publication dates are unset.
    const { PUBLIC_CUSTOMER_POLICY: recorded } = await vi.importActual<typeof import("@/modules/customer-auth/public-policy")>("@/modules/customer-auth/public-policy");
    if (recorded.publishedAt !== null) expect(source).not.toContain("[PERLU");
  });
});

describe("policy document renderer", () => {
  it("renders headings, lists, tables and bold text without interpreting HTML", () => {
    const html = renderToStaticMarkup(createElement(PolicyDocument, { source: "# Judul\n\nParagraf **tebal**\nlanjutan.\n\n- satu\n  sambungan\n- dua\n\n| A | B |\n| --- | --- |\n| <b>x</b> | y |" }));
    expect(html).toContain("<h1"); expect(html).toContain("<strong");
    expect(html).toContain("Paragraf <strong class=\"font-semibold text-foreground\">tebal</strong> lanjutan.");
    expect(html).toContain("<li>satu sambungan</li>"); expect(html).toContain("<th scope=\"col\"");
    expect(html).toContain("&lt;b&gt;x&lt;/b&gt;");
  });

  it("gives every section a unique anchor that is also a valid CSS selector", () => {
    const source = "# Judul\n\n## 1. Data **Anda**\n\nTeks.\n\n## Data Anda\n\n## 2. Hak & Pilihan";
    expect(policyOutline(source)).toEqual([
      { id: "data-anda", title: "1. Data Anda" },
      { id: "data-anda-2", title: "Data Anda" },
      { id: "hak-pilihan", title: "2. Hak & Pilihan" },
    ]);
    const html = renderToStaticMarkup(createElement(PolicyDocument, { source }));
    expect(html).toContain('id="data-anda"'); expect(html).toContain('id="data-anda-2"'); expect(html).toContain('id="hak-pilihan"');
  });
});
