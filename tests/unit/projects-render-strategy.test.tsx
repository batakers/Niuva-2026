import { readFileSync } from "node:fs";
import path from "node:path";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/image", () => ({ default: () => null }));
vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  usePathname: () => "/projects",
}));

const getProjectPreview = vi.fn();
const getProjectPreviewBySlug = vi.fn();
vi.mock("@/features/frontend-preview/server", () => ({
  getProjectPreview: (...args: unknown[]) => getProjectPreview(...args),
  getProjectPreviewBySlug: (...args: unknown[]) => getProjectPreviewBySlug(...args),
}));

import nextConfig from "../../next.config";
import * as detailModule from "@/app/projects/[slug]/page";
import * as listModule from "@/app/projects/page";
import ProjectsPreviewPage from "@/app/preview/projects/page";

const root = process.cwd();
const read = (file: string) => readFileSync(path.join(root, file), "utf8");

describe("/projects and /projects/[slug] render strategy (Req 16.1)", () => {
  it("use time-based revalidation and ignore the preview parameter on the public path", async () => {
    expect(listModule.revalidate).toBe(300);
    expect(detailModule.revalidate).toBe(300);
    expect(detailModule.generateStaticParams()).toEqual([]);

    getProjectPreview.mockResolvedValueOnce({ projects: [], scenario: null });
    render(await listModule.default());
    expect(getProjectPreview).toHaveBeenLastCalledWith(undefined);
    expect(screen.getByRole("heading", { level: 1 })).toBeTruthy();
  });

  it("shows the existing error state instead of throwing when the list cannot load", async () => {
    getProjectPreview.mockRejectedValueOnce(new Error("db down"));
    render(await listModule.default());
    expect(screen.getByText("Daftar project belum dapat dimuat.")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Coba lagi" }).getAttribute("href")).toBe("/projects");
  });

  it("does not read request-time APIs in the public route files", () => {
    for (const file of ["src/app/projects/page.tsx", "src/app/projects/[slug]/page.tsx"]) {
      const source = read(file).replace(/\/\/.*$/gm, "");
      expect(source, file).not.toMatch(/searchParams|connection\s*\(|cookies\s*\(|headers\s*\(/);
    }
  });

  it("serves the preview scenarios from a dynamic, noindex route behind a rewrite", async () => {
    getProjectPreview.mockResolvedValueOnce({ projects: [], scenario: "empty" });
    render(await ProjectsPreviewPage({ searchParams: Promise.resolve({ preview: "empty" }) }));
    expect(getProjectPreview).toHaveBeenLastCalledWith("empty");

    const rewrites = await nextConfig.rewrites?.();
    const beforeFiles = Array.isArray(rewrites) ? [] : rewrites?.beforeFiles ?? [];
    const query = [{ type: "query", key: "preview" }];
    expect(beforeFiles).toContainEqual({ has: query, destination: "/preview/projects", source: "/projects" });
    expect(beforeFiles).toContainEqual({ has: query, destination: "/preview/projects/:slug", source: "/projects/:slug" });
  });
});

describe("admin portfolio actions invalidate the detail pattern (Req 16.2)", () => {
  it("call revalidatePath('/projects/[slug]', 'page') next to '/projects'", () => {
    const source = read("src/app/admin/actions.ts");
    const pattern = /revalidatePath\("\/projects"\);\s*revalidatePath\("\/projects\/\[slug\]", "page"\);/g;
    expect(source.match(pattern)).toHaveLength(2);
  });

  it("also invalidate the homepage, which shows published projects (Req 16.2)", () => {
    const source = read("src/app/admin/actions.ts");
    const pattern = /revalidatePath\("\/projects\/\[slug\]", "page"\);\s*revalidatePath\("\/"\);/g;
    expect(source.match(pattern)).toHaveLength(2);
  });
});
