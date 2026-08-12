/**
 * Exportação de listas de clientes / licenças em CSV, XLSX e PDF.
 * Todas as libs pesadas são carregadas dinamicamente (lazy) no clique.
 */

export type ExportRow = Record<string, string | number | null | undefined>;

function toCsvValue(v: unknown): string {
  const s = v == null ? "" : String(v);
  return `"${s.replace(/"/g, '""')}"`;
}

export function exportCsv(filename: string, rows: ExportRow[]) {
  if (rows.length === 0) return;
  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(","),
    ...rows.map((r) => headers.map((h) => toCsvValue(r[h])).join(",")),
  ].join("\n");
  triggerDownload(new Blob([csv], { type: "text/csv;charset=utf-8" }), `${filename}.csv`);
}

export async function exportXlsx(filename: string, rows: ExportRow[]) {
  if (rows.length === 0) return;
  const XLSX = await import("xlsx");
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Dados");
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

export async function exportPdf(
  filename: string,
  title: string,
  rows: ExportRow[],
) {
  if (rows.length === 0) return;
  const [{ default: jsPDF }, autoTableMod] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);
  const autoTable = (autoTableMod as any).default ?? (autoTableMod as any);
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  doc.setFontSize(14);
  doc.text(title, 40, 40);
  const headers = Object.keys(rows[0]);
  autoTable(doc, {
    head: [headers],
    body: rows.map((r) => headers.map((h) => (r[h] == null ? "" : String(r[h])))),
    startY: 60,
    styles: { fontSize: 9, cellPadding: 4 },
    headStyles: { fillColor: [40, 40, 60] },
    margin: { left: 40, right: 40 },
  });
  doc.save(`${filename}.pdf`);
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
