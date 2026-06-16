export function formatTerm(start: Date, end: Date | null): string {
  const s = new Date(start).getFullYear();
  const e = end ? new Date(end).getFullYear() : "—";
  return `${s} – ${e}`;
}

export function partyLabel(p: string): string {
  if (p === "D") return "Democrat";
  if (p === "R") return "Republican";
  return p;
}

export function fmtSigned(n: number | null, digits = 2): string {
  if (n === null) return "—";
  return `${n >= 0 ? "+" : ""}${n.toFixed(digits)}`;
}
