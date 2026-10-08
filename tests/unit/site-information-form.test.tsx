import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SiteInformationForm } from "@/app/admin/content/site-information/site-information-form";
import { defaultSiteInformation } from "@/modules/site-information/defaults";
describe("site information form", () => {
  it("previews without publishing, and retains input after a failed save", async () => {
    const action = vi.fn(async () => ({ status: "error" as const, message: "Informasi telah berubah." }));
    render(<SiteInformationForm action={action} snapshot={{ version: 0, values: defaultSiteInformation }} />);
    fireEvent.change(screen.getByLabelText("Deskripsi singkat"), { target: { value: "Deskripsi fixture yang ditinjau sebelum terbit." } });
    fireEvent.click(screen.getByRole("button", { name: "Pratinjau" }));
    expect(screen.getByRole("region", { name: "Pratinjau informasi publik" })).toHaveTextContent("Deskripsi fixture yang ditinjau sebelum terbit.");
    expect(action).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Terbitkan perubahan" }));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Informasi telah berubah."));
    expect(screen.getByLabelText("Deskripsi singkat")).toHaveValue("Deskripsi fixture yang ditinjau sebelum terbit.");
  });
});
