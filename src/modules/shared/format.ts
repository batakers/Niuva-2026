const rupiahFormatter = new Intl.NumberFormat("id-ID", {
  currency: "IDR",
  maximumFractionDigits: 0,
  style: "currency",
});

/**
 * "77500" → "Rp 77.500" without float conversion. Stored Decimal padding ("77500.000000")
 * is accepted; a real fraction is shown as stored rather than rounded.
 */
export function formatRupiah(value: string | bigint): string {
  if (typeof value === "bigint") return rupiahFormatter.format(value);
  const match = /^(-?\d+)(?:\.(\d+))?$/.exec(value.trim());
  if (match === null || /[1-9]/.test(match[2] ?? "")) return `Rp ${value}`;
  return rupiahFormatter.format(BigInt(match[1]));
}

/** "128.400000" → "128,4": trims stored decimal padding without float conversion. */
export function formatGrams(value: string): string {
  const [whole, fraction = ""] = value.split(".");
  const trimmed = fraction.replace(/0+$/, "");
  return trimmed === "" ? whole : `${whole},${trimmed}`;
}

export function formatPrintDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3_600);
  const minutes = Math.floor((seconds % 3_600) / 60);

  if (hours === 0) {
    return `${minutes} menit`;
  }

  return `${hours} jam${minutes === 0 ? "" : ` ${minutes} menit`}`;
}
