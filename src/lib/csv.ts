// CSV export utility — generates CSV string from data and triggers browser download.
// Works fully client-side, no server/storage needed.

/** Convert a value to a CSV-safe cell (handles commas, quotes, newlines). */
function escapeCell(value: unknown): string {
  if (value == null) return "";
  const str = String(value);
  // If contains comma, quote, or newline — wrap in quotes and escape quotes
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/** Build a CSV string from an array of row objects. */
export function buildCsv<T extends Record<string, unknown>>(
  rows: T[],
  columns: { key: keyof T; label: string }[]
): string {
  const header = columns.map((c) => escapeCell(c.label)).join(",");
  const body = rows
    .map((row) => columns.map((c) => escapeCell(row[c.key])).join(","))
    .join("\n");
  // BOM for Excel UTF-8 compatibility
  return "\uFEFF" + header + "\n" + body;
}

/** Trigger a browser download of the CSV file. */
export function downloadCsv(csv: string, filename: string): void {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  // Revoke after a short delay to ensure download starts
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Convenience: build + download in one call. */
export function exportToCsv<T extends Record<string, unknown>>(
  rows: T[],
  columns: { key: keyof T; label: string }[],
  filename: string
): void {
  if (rows.length === 0) return;
  const csv = buildCsv(rows, columns);
  downloadCsv(csv, filename);
}
