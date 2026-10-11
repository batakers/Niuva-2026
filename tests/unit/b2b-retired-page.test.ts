import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ requireCustomer: vi.fn() }));
vi.mock("@/lib/auth/customer", () => ({ requireCustomer: mocks.requireCustomer }));
vi.mock("next/navigation", () => ({
  redirect: (href: string): never => { throw new Error(`REDIRECT:${href}`); },
}));
import RetiredProjectBriefPage from "@/app/project-brief/page";

describe("legacy Project Brief entry", () => {
  it.each([
    [undefined, "/services"],
    ["research-development", "/services/research-development"],
    ["design-prototyping", "/services/design-prototyping"],
    ["unknown", "/services"],
    [["design-prototyping", "unknown"], "/services"],
  ] as const)("preserves only a valid service context: %s", async (service, destination) => {
    await expect(RetiredProjectBriefPage({ searchParams: Promise.resolve({
      service: typeof service === "string" || service === undefined ? service : [...service],
    }) })).rejects.toThrow(`REDIRECT:${destination}`);
    expect(mocks.requireCustomer).not.toHaveBeenCalled();
  });
});
