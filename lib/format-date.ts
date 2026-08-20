export function formatDate(s?: string): string {
  if (!s) return "—";
  if (/^\d{4}$/.test(s)) return s;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short" });
}
