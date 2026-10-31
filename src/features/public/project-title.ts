/**
 * Project titles join the work and its client or qualifier with an em dash
 * ("Smart Drop Box", "P&G"). Public pages never show that dash: headings set the
 * two parts on separate lines, and plain-text places join them with a comma.
 */
export function splitProjectTitle(title: string): { name: string; qualifier: string | null } {
  const [name = title, ...rest] = title.split(/\s*—\s*/).filter(Boolean);
  return { name, qualifier: rest.length > 0 ? rest.join(", ") : null };
}

/** The title as one line of plain text, for the document title and similar places. */
export function projectTitleText(title: string): string {
  const { name, qualifier } = splitProjectTitle(title);
  return qualifier ? `${name}, ${qualifier}` : name;
}
