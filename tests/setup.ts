import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";
import { vi } from "vitest";
const testRouter = vi.hoisted(() => ({ replace: vi.fn(), push: vi.fn(), refresh: vi.fn(), back: vi.fn(), forward: vi.fn(), prefetch: vi.fn() }));
vi.mock("next/navigation", async importOriginal => {
  const actual = await importOriginal<typeof import("next/navigation")>();
  return { ...actual, useRouter: () => testRouter };
});

vi.mock("next/font/google", () => {
  const createFont = (family: string, variable: string) => () => ({
    className: `mock-${variable}`,
    style: { fontFamily: family },
    variable,
  });

  return {
    Fraunces: createFont("Fraunces", "--font-public-editorial"),
    Google_Sans: createFont("Google Sans", "--font-google-action"),
    Space_Grotesk: createFont("Space Grotesk", "--font-public-sans"),
  };
});

afterEach(() => {
  cleanup();
});
