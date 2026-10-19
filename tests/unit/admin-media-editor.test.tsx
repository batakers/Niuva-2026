import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AdminMediaEditor } from "@/app/admin/admin-media-editor";
const owner = { kind: "product" as const, id: "b512d5d5-d54b-48f7-8327-1e11af6a44d4" };
afterEach(() => vi.unstubAllGlobals());

describe("business media form", () => {
  it("saves descriptions and reordered media through the existing action contract", () => {
    const { container } = render(<form><AdminMediaEditor owner={owner} label="Foto" media={[{ storageKey: "media/products/a.webp", altText: "A", sortOrder: 0 }, { storageKey: "media/products/b.webp", altText: "B", sortOrder: 1 }]} /></form>);
    fireEvent.change(screen.getAllByLabelText("Deskripsi foto")[1]!, { target: { value: "Deskripsi B baru" } });
    fireEvent.click(screen.getByRole("button", { name: "Naikkan foto 2" }));
    expect(JSON.parse(String(new FormData(container.querySelector("form")!).get("mediaJson")))).toEqual([{ storageKey: "media/products/b.webp", altText: "Deskripsi B baru", sortOrder: 0 }, { storageKey: "media/products/a.webp", altText: "A", sortOrder: 1 }]);
    expect(screen.queryByText("Media JSON")).not.toBeInTheDocument();
  });
  it("uploads a file through intent, quarantine PUT and confirmation before adding it to the gallery", async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(Response.json({ assetId: "asset-fixture", uploadUrl: "https://upload.example.test/fixture" }))
      .mockResolvedValueOnce(new Response(null, { status: 200 }))
      .mockResolvedValueOnce(Response.json({ assetId: "asset-fixture", storageKey: "media/products/new.webp", url: "/media/products/new.webp" }));
    vi.stubGlobal("fetch", fetcher);
    const { container } = render(<form><AdminMediaEditor owner={owner} label="Foto" media={[]} /></form>);
    fireEvent.change(screen.getByLabelText("Unggah foto"), { target: { files: [new File(["fixture"], "foto.webp", { type: "image/webp" })] } });
    await waitFor(() => expect(screen.getByLabelText("Deskripsi foto")).toBeInTheDocument());
    expect(fetcher).toHaveBeenCalledTimes(3);
    expect(JSON.parse(fetcher.mock.calls[0][1].body)).toEqual({ operation: "intent", owner, contentType: "image/webp", sizeBytes: 7 });
    expect(fetcher.mock.calls[1]).toEqual(["https://upload.example.test/fixture", expect.objectContaining({ method: "PUT", headers: { "Content-Type": "application/octet-stream" } })]);
    expect(JSON.parse(String(new FormData(container.querySelector("form")!).get("mediaJson")))).toEqual([{ storageKey: "media/products/new.webp", altText: "", sortOrder: 0 }]);
    expect(screen.queryByLabelText("Lokasi foto yang sudah diunggah")).not.toBeInTheDocument();
  });
  it("shows a failed confirmation without adding an unverified asset", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(Response.json({ assetId: "fixture", uploadUrl: "https://upload.example.test/fixture" })).mockResolvedValueOnce(new Response(null, { status: 200 })).mockResolvedValueOnce(Response.json({ error: "Isi foto ditolak." }, { status: 422 })));
    render(<form><AdminMediaEditor owner={owner} label="Foto" media={[]} /></form>);
    fireEvent.change(screen.getByLabelText("Unggah foto"), { target: { files: [new File(["fixture"], "foto.webp", { type: "image/webp" })] } });
    expect(await screen.findByRole("alert")).toHaveTextContent("Isi foto ditolak.");
    expect(screen.queryByLabelText("Deskripsi foto")).not.toBeInTheDocument();
  });
});
