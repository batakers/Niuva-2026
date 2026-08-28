import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/image", () => ({
  default: () => null,
}));

import AuisWelcomePage from "@/app/auis/welcome/page";
import BrandIntakeForm from "@/app/auis/welcome/brand-intake-form";

describe("AUiS brand welcome", () => {
  it("renders the confirmed Niuva brand intake", () => {
    render(<AuisWelcomePage />);

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Tinjau identitas brand Niuva",
      }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Nama produk")).toHaveValue("Niuva");
    expect(screen.getByLabelText("Path logo publik")).toHaveValue(
      "/assets/brand/niuva-logo-horizontal-dark.svg",
    );
    expect(screen.getByText("configured: true")).toBeInTheDocument();
  });

  it("preserves configured true when an established brand is saved", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      Response.json({ ok: true, configured: true }),
    );

    render(
      <BrandIntakeForm
        initial={{
          name: "Niuva",
          tagline: "Mitra pengembangan produk end-to-end.",
          logo: "/assets/brand/niuva-logo-horizontal-dark.svg",
          configured: true,
        }}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Simpan perubahan" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/auis/brand",
        expect.objectContaining({
          body: expect.stringContaining('"configured":true'),
        }),
      );
    });
  });
});
