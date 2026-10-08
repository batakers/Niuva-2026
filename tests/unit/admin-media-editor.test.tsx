import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AdminMediaEditor } from "@/app/admin/admin-media-editor";

describe("business media form", () => {
  it("saves descriptions and reordered media through the existing action contract", () => {
    const { container } = render(<form><AdminMediaEditor label="Foto" media={[{ storageKey: "media/products/a.webp", altText: "A", sortOrder: 0 }, { storageKey: "media/products/b.webp", altText: "B", sortOrder: 1 }]} /></form>);
    fireEvent.change(screen.getAllByLabelText("Deskripsi foto")[1]!, { target: { value: "Deskripsi B baru" } });
    fireEvent.click(screen.getByRole("button", { name: "Naikkan foto 2" }));
    expect(JSON.parse(String(new FormData(container.querySelector("form")!).get("mediaJson")))).toEqual([{ storageKey: "media/products/b.webp", altText: "Deskripsi B baru", sortOrder: 0 }, { storageKey: "media/products/a.webp", altText: "A", sortOrder: 1 }]);
    expect(screen.queryByText("Media JSON")).not.toBeInTheDocument();
  });
});
