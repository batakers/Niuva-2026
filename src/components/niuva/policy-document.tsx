import { Fragment, type ReactNode } from "react";
import { typographySystemTokens as type } from "@/design/typography";

// Renders the approved policy Markdown subset: headings, paragraphs, "- "
// lists, pipe tables and **bold**. Content is repository-reviewed and
// checksum-pinned, never user input, so no HTML is interpreted.
function inline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).filter(Boolean).map((part, index) =>
    part.startsWith("**") && part.endsWith("**") ? <strong className="font-semibold text-foreground" key={index}>{part.slice(2, -2)}</strong> : part);
}

function tableCells(row: string): string[] {
  return row.trim().replace(/^\||\|$/g, "").split("|").map(cell => cell.trim());
}

function joinWrapped(lines: readonly string[]): string {
  return lines.map(line => line.trim()).join(" ");
}

function splitBlocks(source: string): string[] {
  return source.replace(/\r\n/g, "\n").split(/\n{2,}/).map(block => block.trim()).filter(Boolean);
}

export type PolicySection = Readonly<{ id: string; title: string }>;

/** Anchor targets for every `## ` section, in order; ids drop the section number so they stay valid CSS selectors. */
export function policyOutline(source: string): PolicySection[] {
  const used = new Set<string>();
  return splitBlocks(source).filter(block => block.startsWith("## ")).map(block => {
    const title = (block.split("\n")[0] ?? "").slice(3).replace(/\*\*/g, "").trim();
    const base = title.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^[0-9-]+|-$/g, "") || "bagian";
    let id = base;
    for (let suffix = 2; used.has(id); suffix += 1) id = `${base}-${suffix}`;
    used.add(id);
    return { id, title };
  });
}

function Block({ block, sectionId }: { block: string; sectionId?: string }) {
  const lines = block.split("\n");
  const first = lines[0] ?? "";
  if (first.startsWith("# ")) return <h1 className={`${type.display.className} text-balance`}>{inline(first.slice(2))}</h1>;
  // The sticky header is 4.5rem tall; the margin keeps an anchored heading clear of it.
  if (first.startsWith("## ")) return <h2 className={`scroll-mt-24 pt-8 ${type.subheading.className}`} id={sectionId}>{inline(first.slice(3))}</h2>;
  if (first.startsWith("### ")) return <h3 className="pt-2 text-lg font-semibold leading-7">{inline(first.slice(4))}</h3>;
  if (first.startsWith("|")) {
    const [header = "", , ...rows] = lines;
    // Focusable so keyboard users can scroll a table wider than the screen.
    return <div tabIndex={0} role="region" aria-label={`Tabel ${tableCells(header).join(", ")}`} className="overflow-x-auto rounded-[var(--radius-control)] border border-border bg-card focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"><table className="w-full min-w-xl border-collapse text-left text-sm leading-6">
      <thead className="bg-muted/50"><tr>{tableCells(header).map((cell, index) => <th scope="col" className="border-b border-border px-3 py-2 font-semibold" key={index}>{inline(cell)}</th>)}</tr></thead>
      <tbody>{rows.map((row, rowIndex) => <tr className="border-b border-border last:border-b-0" key={rowIndex}>{tableCells(row).map((cell, index) => <td className="px-3 py-2 align-top" key={index}>{inline(cell)}</td>)}</tr>)}</tbody>
    </table></div>;
  }
  if (first.startsWith("- ")) {
    const items: string[][] = [];
    for (const line of lines) {
      if (line.startsWith("- ")) items.push([line.slice(2)]);
      else items.at(-1)?.push(line);
    }
    return <ul className={`list-disc space-y-1.5 pl-6 marker:text-muted-foreground ${type.body.className}`}>{items.map((item, index) => <li key={index}>{inline(joinWrapped(item))}</li>)}</ul>;
  }
  return <p className={type.body.className}>{inline(joinWrapped(lines))}</p>;
}

/** `afterTitle` renders right below the leading `# ` heading (version, dates). */
export function PolicyDocument({ source, afterTitle }: { source: string; afterTitle?: ReactNode }) {
  const blocks = splitBlocks(source);
  const sectionIds = policyOutline(source).map(section => section.id);
  let sectionIndex = 0;
  return <article className="space-y-4 break-words">{blocks.map((block, index) => {
    const sectionId = block.startsWith("## ") ? sectionIds[sectionIndex++] : undefined;
    return <Fragment key={index}><Block block={block} sectionId={sectionId} />{index === 0 ? afterTitle : null}</Fragment>;
  })}</article>;
}
