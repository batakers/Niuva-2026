"use client";

import { Button } from "@/components/ui/button";

export type PortfolioMediaDraft = Readonly<{
  altText: string;
  id: string;
  label: string;
}>;

type PortfolioMediaEditorProps = Readonly<{
  disabled: boolean;
  media: readonly PortfolioMediaDraft[];
  onAltTextChange: (id: string, value: string) => void;
  onMove: (id: string, direction: "up" | "down") => void;
}>;

export function PortfolioMediaEditor({ disabled, media, onAltTextChange, onMove }: PortfolioMediaEditorProps) {
  return (
    <section aria-labelledby="portfolio-media-heading" className="border-t border-border pt-6">
      <div>
        <h2 className="text-lg font-semibold" id="portfolio-media-heading">Urutan media dan alt text</h2>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">Setiap baris hanya metadata fixture. Tidak ada file, URL storage, atau gambar client yang dibaca.</p>
      </div>
      <ol className="mt-5 space-y-3" aria-label="Media portofolio preview">
        {media.map((item, index) => (
          <li className="rounded-xl border border-border bg-muted/25 p-4" key={item.id}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm font-medium">{index + 1}. {item.label}</p>
              <div className="flex gap-2">
                <Button aria-label={`Naikkan urutan ${item.label}`} className="min-h-11 cursor-pointer" disabled={disabled || index === 0} onClick={() => onMove(item.id, "up")} size="sm" type="button" variant="outline">Naik</Button>
                <Button aria-label={`Turunkan urutan ${item.label}`} className="min-h-11 cursor-pointer" disabled={disabled || index === media.length - 1} onClick={() => onMove(item.id, "down")} size="sm" type="button" variant="outline">Turun</Button>
              </div>
            </div>
            <label className="mt-4 block text-sm font-medium" htmlFor={`portfolio-media-alt-${item.id}`}>Alt text contoh</label>
            <textarea className="mt-2 min-h-20 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm leading-6 outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50" disabled={disabled} id={`portfolio-media-alt-${item.id}`} onChange={(event) => onAltTextChange(item.id, event.target.value)} value={item.altText} />
          </li>
        ))}
      </ol>
    </section>
  );
}
