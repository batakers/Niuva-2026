import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { vi } from "vitest";

vi.mock("next/image", () => ({
  default: () => null,
}));

import Home from "@/app/page";

describe("baseline homepage", () => {
  it("renders the starter heading and documentation link", () => {
    render(<Home />);

    expect(
      screen.getByRole("heading", { level: 1, name: /to get started/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Documentation" })).toHaveAttribute(
      "href",
      expect.stringContaining("nextjs.org/docs"),
    );
  });
});
