import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Req 28.13, 16.7: the five test-only routes stay fail-closed outside local
// development/test, carry noindex, and are absent from sitemap and robots.

class NotFoundSignal extends Error {
  constructor() {
    super("NEXT_NOT_FOUND");
  }
}

const notFound = vi.hoisted(() => vi.fn());
const redirect = vi.hoisted(() => vi.fn());
const getCurrentCustomer = vi.hoisted(() => vi.fn());
const getProjectPreview = vi.hoisted(() => vi.fn());
const actionQueueList = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({ notFound, redirect }));
vi.mock("next/server", () => ({ connection: vi.fn(async () => undefined) }));
vi.mock("@/lib/auth/customer", () => ({ getCurrentCustomer }));
vi.mock("@/features/frontend-preview/server", () => ({ getProjectPreview }));
vi.mock("@/modules/admin/action-queue-service", () => ({
  ActionQueueService: class {
    list = actionQueueList;
  },
}));
vi.mock("@/app/demo/action-queue/demo-authorizer", () => ({
  createDemoActionQueueAuthorizer: () => ({}),
}));
vi.mock("@/app/demo/action-queue/action-queue-demo-view", () => ({
  LocalDemoActionQueueView: () => null,
}));
vi.mock("@/components/niuva/public-shell", () => ({
  PublicShell: ({ children }: { children: unknown }) => children,
}));
vi.mock("@/components/niuva/internal-google-consent-form", () => ({
  InternalGoogleConsentForm: () => null,
}));

import AuthTestPolicyPage, { metadata as authTestPolicyMetadata } from "@/app/auth-test-policy/page";
import InternalPolicyPage, { metadata as policyMetadata } from "@/app/internal-testing/policy/page";
import GoogleConsentPage, { metadata as consentMetadata } from "@/app/internal-testing/google-consent/page";
import DemoActionQueuePage, { metadata as demoMetadata } from "@/app/demo/action-queue/page";
import { GET as mediaGet } from "@/app/api/frontend-preview/media/[id]/route";
import { curatedFeaturedProjects } from "@/features/frontend-preview/curated-content";
import sitemap from "@/app/sitemap";
import robots from "@/app/robots";

const NOINDEX = { index: false, follow: false };

// Non-local tier: production runtime, remote database and origin. Every local
// opt-in flag is set, so a passing guard proves the tier/host check decides.
function stubNonLocalEnv() {
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv("NIUVA_DEPLOYMENT_TIER", "production");
  vi.stubEnv("NIUVA_RUNTIME_MODE", "demo");
  vi.stubEnv("NIUVA_CUSTOMER_AUTH_MOCK", "true");
  vi.stubEnv("NIUVA_INTERNAL_AUTH_ENABLED", "true");
  vi.stubEnv("NIUVA_INTERNAL_GOOGLE_EMAIL", "google@example.com");
  vi.stubEnv("NIUVA_INTERNAL_PASSWORD_EMAIL", "password@example.com");
  vi.stubEnv("APP_URL", "https://niuva.example.com");
  vi.stubEnv("DATABASE_URL", "postgresql://user:pw@db.example.com:5432/niuva_test");
}

async function rendersNotFound(render: () => unknown): Promise<boolean> {
  try {
    await render();
    return false;
  } catch (error) {
    return error instanceof NotFoundSignal;
  }
}

describe("test-only routes fail closed and stay noindex (Req 28.13, 16.7)", () => {
  beforeEach(() => {
    notFound.mockImplementation(() => {
      throw new NotFoundSignal();
    });
    redirect.mockImplementation(() => {
      throw new Error("unexpected redirect");
    });
    getCurrentCustomer.mockResolvedValue(null);
    getProjectPreview.mockResolvedValue({ scenario: null, projects: [] });
    actionQueueList.mockResolvedValue({});
    stubNonLocalEnv();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  it("/auth-test-policy calls notFound() on a non-local tier", async () => {
    expect(await rendersNotFound(() => AuthTestPolicyPage())).toBe(true);
  });

  it("/internal-testing/policy calls notFound() on a non-local tier for both documents", async () => {
    for (const document of ["terms", "privacy"]) {
      expect(
        await rendersNotFound(() => InternalPolicyPage({ searchParams: Promise.resolve({ document }) })),
      ).toBe(true);
    }
  });

  it("/internal-testing/google-consent calls notFound() on a non-local tier", async () => {
    expect(
      await rendersNotFound(() => GoogleConsentPage({ searchParams: Promise.resolve({}) })),
    ).toBe(true);
    expect(getCurrentCustomer).not.toHaveBeenCalled();
  });

  it("/demo/action-queue calls notFound() on a non-local tier and never reads the queue", async () => {
    expect(await rendersNotFound(() => DemoActionQueuePage())).toBe(true);
    expect(actionQueueList).not.toHaveBeenCalled();
  });

  it("/api/frontend-preview/media/[id] returns 404 for every curated id outside development", async () => {
    const ids = [...curatedFeaturedProjects.map((project) => project.id.toLowerCase()), "unknown"];
    expect(ids.length).toBeGreaterThan(1);
    for (const runtime of ["production", "test"]) {
      vi.stubEnv("NODE_ENV", runtime);
      for (const id of ids) {
        const response = await mediaGet(new Request("https://niuva.example.com/x"), {
          params: Promise.resolve({ id }),
        });
        expect(response.status).toBe(404);
        expect(response.headers.get("Content-Type")).not.toBe("image/png");
      }
    }
  });

  it("the four page routes export metadata.robots index:false, follow:false", () => {
    for (const metadata of [authTestPolicyMetadata, policyMetadata, consentMetadata, demoMetadata]) {
      expect(metadata.robots).toEqual(NOINDEX);
    }
  });

  it("the media API serves X-Robots-Tag noindex, nofollow when it does serve an asset (development)", async () => {
    vi.stubEnv("NODE_ENV", "development");
    const id = curatedFeaturedProjects[0]?.id.toLowerCase() ?? "";
    const response = await mediaGet(new Request("http://localhost:3000/x"), {
      params: Promise.resolve({ id }),
    });
    // The proof image may be absent from a checkout; a served response must be
    // noindex, and a 404 fallback must never be cacheable.
    if (response.status === 200) {
      expect(response.headers.get("X-Robots-Tag")).toBe("noindex, nofollow");
    } else {
      expect(response.status).toBe(404);
      expect(response.headers.get("Cache-Control")).toBe("no-store");
    }
  });

  it("sitemap lists none of the five routes", async () => {
    const urls = (await sitemap()).map((entry) => new URL(entry.url).pathname);
    expect(urls.length).toBeGreaterThan(0);
    for (const path of urls) {
      for (const forbidden of [
        "/auth-test-policy",
        "/internal-testing",
        "/demo",
        "/api/frontend-preview",
      ]) {
        expect(path.startsWith(forbidden)).toBe(false);
      }
    }
  });

  it("robots disallows the prefixes of all five routes", () => {
    const rules = robots().rules;
    const rule = Array.isArray(rules) ? rules[0] : rules;
    const value = rule?.disallow;
    const disallow = Array.isArray(value) ? value : value ? [value] : [];
    for (const prefix of ["/auth-test-policy", "/internal-testing", "/demo", "/api"]) {
      expect(disallow).toContain(prefix);
    }
  });
});
