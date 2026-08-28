import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import {
  ActionQueueItem,
  EvidenceCard,
  FileUploadField,
  FormField,
  MoneySummary,
  OrderStatusTimeline,
  StatusNotice,
  VariantSelector,
} from "@/components/niuva";
import { Input } from "@/components/ui/input";

describe("Niuva P0 components", () => {
  it("renders evidence variants with a factual action link", () => {
    render(
      <EvidenceCard
        actionLabel="Buka project"
        description="Ringkasan bukti project."
        eyebrow="PROJECT / PROOF"
        href="#project"
        meta={["Riset", "Prototype"]}
        title="Perangkat yang dapat diuji"
        variant="project"
      />,
    );

    expect(screen.getByRole("heading", { level: 3, name: "Perangkat yang dapat diuji" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Buka project" })).toHaveAttribute("href", "#project");
    expect(screen.getByText("Project")).toBeInTheDocument();
  });

  it("connects FormField labels, descriptions, and recovery errors", () => {
    render(
      <FormField
        description="Gunakan referensi yang mudah dibaca."
        error="Referensi belum ditemukan. Periksa kembali format."
        id="project-reference"
        label="Referensi proyek"
        required
      >
        <Input />
      </FormField>,
    );

    const input = screen.getByRole("textbox");

    expect(input).toHaveAttribute("id", "project-reference");
    expect(input).toHaveAttribute(
      "aria-describedby",
      "project-reference-description project-reference-error",
    );
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByText("Referensi belum ditemukan. Periksa kembali format.")).toHaveAttribute(
      "role",
      "alert",
    );
  });

  it("renders every semantic StatusNotice tone with a next action", () => {
    const tones = ["success", "warning", "info", "error"] as const;

    render(
      <div>
        {tones.map((tone) => (
          <StatusNotice
            action={<button type="button">Tindakan</button>}
            description="Penjelasan keadaan dan langkah berikutnya."
            key={tone}
            title={`Status ${tone}`}
            tone={tone}
          />
        ))}
      </div>,
    );

    expect(document.querySelectorAll("[data-component='status-notice']")).toHaveLength(4);
    expect(screen.getByRole("alert")).toHaveAttribute("data-tone", "error");
    expect(screen.getAllByRole("status")).toHaveLength(3);
    expect(screen.getAllByRole("button", { name: "Tindakan" })).toHaveLength(4);
  });

  it("keeps ActionQueueItem focused on an operator decision", () => {
    render(
      <ActionQueueItem
        kind="custom-review"
        primaryAction={<button type="button">Mulai review</button>}
        reference="DEMO-025"
        status="blocked"
        summary="File custom membutuhkan pemeriksaan"
        updatedAt="baru saja"
      />,
    );

    expect(screen.getByText("Custom 3D Print")).toBeInTheDocument();
    expect(screen.getByText("Terblokir")).toBeInTheDocument();
    expect(screen.getByText("DEMO-025")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Mulai review" })).toBeInTheDocument();
  });
});

describe("Niuva P1 components", () => {
  it("renders server-provided money values without taking calculation authority", () => {
    render(
      <MoneySummary
        action={<button type="button">Periksa ulang quote</button>}
        lines={[
          { label: "Material", value: "Rp 420.000" },
          { label: "Pengiriman", value: "Rp 35.000" },
        ]}
        note="Quote operator · fixture"
        sourceStatus="changed"
        title="Custom quote"
        total="Rp 455.000"
        currency="IDR"
        variant="quote"
      />,
    );

    expect(screen.getByRole("heading", { level: 3, name: "Custom quote" })).toBeInTheDocument();
    expect(screen.getByText("Rp 420.000")).toBeInTheDocument();
    expect(screen.getByText("Rp 455.000")).toBeInTheDocument();
    expect(screen.getAllByText("IDR").length).toBeGreaterThan(0);
    expect(screen.getByText("Perlu validasi ulang")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Periksa ulang quote" })).toBeInTheDocument();
  });

  it("keeps private upload selection accessible and explains invalid recovery", () => {
    const onSelect = vi.fn();
    const selectedFile = new File(["solid"], "model.stl", { type: "model/stl" });

    const { rerender } = render(
      <FileUploadField
        acceptedExtensions={[".stl", ".3mf"]}
        description="Berkas hanya digunakan untuk review operator."
        id="custom-file"
        label="Berkas custom print"
        maxSizeLabel="Maks. sesuai policy server"
        onSelect={onSelect}
      />,
    );

    const input = screen.getByLabelText("Berkas custom print");
    expect(input).toHaveAttribute("accept", ".stl,.3mf");
    expect(input).toHaveAttribute("aria-describedby", "custom-file-description custom-file-status");

    fireEvent.change(input, { target: { files: [selectedFile] } });
    expect(onSelect).toHaveBeenCalledWith(selectedFile);

    rerender(
      <FileUploadField
        acceptedExtensions={[".stl", ".3mf"]}
        error="Format berkas tidak didukung."
        id="custom-file"
        label="Berkas custom print"
        maxSizeLabel="Maks. sesuai policy server"
        status="invalid"
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent("Format berkas tidak didukung.");
    expect(screen.getByRole("button", { name: "Pilih berkas lain" })).toBeInTheDocument();
  });

  it("exposes current and recovery states in an ordered status timeline", () => {
    render(
      <OrderStatusTimeline
        nextExpectation="Operator memeriksa file berikutnya."
        steps={[
          { id: "received", label: "File diterima", state: "completed" },
          { id: "review", label: "Review operator", state: "current" },
          { id: "quote", label: "Quote dikirim", state: "pending" },
          { id: "access", label: "Akses status", state: "access-expired" },
        ]}
        title="Custom quote DEMO-025"
        variant="custom-quote"
      />,
    );

    expect(screen.getByRole("list", { name: "Tahapan Custom quote" })).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(4);
    expect(screen.getByRole("listitem", { current: "step" })).toHaveTextContent("Sedang berjalan");
    expect(screen.getByText("Akses berakhir")).toBeInTheDocument();
    expect(screen.getByText("Berikutnya:")).toBeInTheDocument();
  });

  it("uses the radio-group contract for selectable retail variants", () => {
    const onChange = vi.fn();

    render(
      <VariantSelector
        defaultSelectedId="blue"
        description="Pilihan berasal dari ketersediaan server."
        label="Finishing"
        onChange={onChange}
        options={[
          { id: "blue", label: "Niuva Blue", swatchTone: "brand" },
          { id: "natural", label: "Natural ABS", swatchTone: "neutral" },
          { id: "sample", label: "Sample", availability: "out-of-stock" },
        ]}
        variant="swatch"
      />,
    );

    expect(screen.getByRole("radiogroup", { name: "Finishing" })).toBeInTheDocument();
    expect(screen.getAllByRole("radio")).toHaveLength(3);
    expect(screen.getByRole("radio", { name: "Niuva Blue" })).toBeChecked();
    expect(screen.getByRole("radio", { name: /Sample.*Stok habis/ })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
    expect(screen.getByText("Stok habis")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("radio", { name: "Natural ABS" }));
    expect(onChange).toHaveBeenCalledWith("natural");
  });
});
