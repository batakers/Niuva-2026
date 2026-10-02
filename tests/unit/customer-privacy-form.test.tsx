import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PrivacyForm } from "@/components/niuva/privacy-form";
afterEach(() => vi.unstubAllGlobals());
describe("privacy progressive forms", () => {
  it("keeps native POST and field-associated errors with first-error focus", () => {
    const fetch = vi.fn(); vi.stubGlobal("fetch", fetch);
    const { container } = render(<PrivacyForm action="/api/account/privacy/requests" mode="request" prefix="test" hidden={{ kind: "CORRECTION", submissionKey: crypto.randomUUID() }} fields={[{ name: "details", label: "Data yang salah", kind: "textarea" }, { name: "correction", label: "Koreksi", kind: "textarea" }]} label="Ajukan" />);
    fireEvent.submit(container.querySelector("form")!);
    const input = screen.getByLabelText("Data yang salah"); expect(input).toHaveFocus(); expect(input).toHaveAttribute("aria-invalid", "true"); expect(input).toHaveAttribute("aria-describedby", expect.stringContaining("test-details-error")); expect(fetch).not.toHaveBeenCalled(); expect(container.querySelector("form")).toHaveAttribute("method", "post");
  });
  it("blocks repeated activation, announces failure, and restores pending on pageshow", async () => {
    let finish!: (response: Response) => void;
    const fetch = vi.fn(() => new Promise<Response>(resolve => { finish = resolve; })); vi.stubGlobal("fetch", fetch);
    const { container } = render(<PrivacyForm action="/api/account/privacy/confirmation-email" mode="email" prefix="test" hidden={{ purpose: "EXPORT" }} label="Minta tautan" />);
    const form = container.querySelector("form")!; fireEvent.submit(form); fireEvent.submit(form);
    expect(fetch).toHaveBeenCalledTimes(1); expect(screen.getByRole("button")).toBeDisabled(); expect(screen.getByRole("status")).toHaveTextContent("Memproses permintaan");
    finish(Response.json({ ok: false, message: "Email gagal dikirim." }, { status: 503 }));
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Email gagal dikirim."));
    expect(screen.getByRole("button")).toBeEnabled(); fireEvent.submit(form); fireEvent(window, new Event("pageshow")); expect(screen.getByRole("button")).toBeEnabled();
  });
});
