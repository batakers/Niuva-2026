import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";
import { vi } from "vitest";

vi.mock("next/font/google", () => {
  const createFont = (family: string, variable: string) => () => ({
    className: `mock-${variable}`,
    style: { fontFamily: family },
    variable,
  });

  return {
    Fraunces: createFont("Fraunces", "--font-public-editorial"),
    Space_Grotesk: createFont("Space Grotesk", "--font-public-sans"),
  };
});

afterEach(() => {
  cleanup();
});
