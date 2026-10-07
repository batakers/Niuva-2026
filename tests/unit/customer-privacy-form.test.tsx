import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PrivacyForm } from "@/components/niuva/privacy-form";
afterEach(() => vi.unstubAllGlobals());
describe("privacy progressive forms", () => {
  it("keeps Owner response input and focus when an enhanced detail submission fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ ok: false, message: "Periksa tanggapan.", fields: { response: "Tanggapan perlu diperiksa." } }, { status: 422 })));
    const { container } = render(<PrivacyForm action="/api/admin/privacy" mode="owner" prefix="owner-detail" hidden={{ id: "7614b2eb-6e0c-4a27-9162-e94fb377ebd4", status: "IN_REVIEW", responseView: "detail", returnTo: "/admin/privacy?status=OPEN&page=2" }} fields={[{ name: "response", label: "Tanggapan", kind: "textarea" }]} label="Simpan penanganan" />);
    fireEvent.change(screen.getByLabelText("Tanggapan"), { target: { value: "Synthetic private response fixture" } });
    fireEvent.submit(container.querySelector("form")!);
    await waitFor(() => expect(screen.getByLabelText("Tanggapan")).toHaveAttribute("aria-invalid", "true"));
    expect(screen.getByLabelText("Tanggapan")).toHaveValue("Synthetic private response fixture");
    expect(screen.getByLabelText("Tanggapan")).toHaveFocus();
    expect(screen.getByRole("button")).toBeEnabled();
  });
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
