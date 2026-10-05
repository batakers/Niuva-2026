export const CAD_INSPECTION_PREFIX_BYTES = 64 * 1024;
const CAD_EXTENSIONS = ["stl", "obj", "3mf", "step", "stp"] as const;
export type CadFileExtension = typeof CAD_EXTENSIONS[number];

export function isCadFileExtension(extension: string): extension is CadFileExtension {
  return CAD_EXTENSIONS.some(value => value === extension);
}

const NUMBER = "[+-]?(?:\\d+(?:\\.\\d*)?|\\.\\d+)(?:[eE][+-]?\\d+)?";
const NORMAL = new RegExp(`(?:^|\\n)\\s*facet\\s+normal\\s+${NUMBER}\\s+${NUMBER}\\s+${NUMBER}(?:\\s|$)`);
const VERTEX = new RegExp(`^v\\s+${NUMBER}\\s+${NUMBER}\\s+${NUMBER}(?:\\s|$)`);

/** A bounded format-header check, not geometry validation or archive extraction. */
export function matchesCadContent(extension: CadFileExtension, prefix: Uint8Array, sizeBytes: number): boolean {
  if (!Number.isSafeInteger(sizeBytes) || sizeBytes < 1 || prefix.length > CAD_INSPECTION_PREFIX_BYTES || prefix.length > sizeBytes) return false;
  if (extension === "3mf") {
    // 3MF is ZIP-based. This only recognizes a local ZIP header; contents remain
    // an operator responsibility and may be an unrelated ZIP archive.
    return prefix.length >= 4 && prefix[0] === 0x50 && prefix[1] === 0x4b && prefix[2] === 0x03 && prefix[3] === 0x04;
  }
  if (extension === "stl" && prefix.length >= 84) {
    const count = new DataView(prefix.buffer, prefix.byteOffset, prefix.byteLength).getUint32(80, true);
    // Binary headers can start with "solid"; inspect length before ASCII.
    if (sizeBytes === 84 + 50 * count) return true;
  }
  if (prefix.includes(0)) return false;
  let text: string;
  try { text = new TextDecoder("utf-8", { fatal: true }).decode(prefix, { stream: true }).replace(/^\uFEFF/, "").trimStart(); }
  catch { return false; }
  if (extension === "stl") return /^solid(?:\s|$)/.test(text) && NORMAL.test(text);
  if (extension === "obj") return text.split(/\r?\n/).some(line => VERTEX.test(line.trim()));
  return /^ISO-10303-21;\s*HEADER;/i.test(text);
}
