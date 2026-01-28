import type { QuotationReviewItem } from "@/lib/platformClient";

const escapeCsv = (value: string) => {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
};

export const buildQuotationCsv = (payload: {
  items: QuotationReviewItem[];
  total: number;
  currencyLabel?: string;
}) => {
  const lines = [
    ["大項", "中項", "小項", "價格"].join(","),
    ...payload.items.map((item) =>
      [
        escapeCsv(item.h1),
        escapeCsv(item.h2 ?? ""),
        escapeCsv(item.h3),
        item.price === null ? "" : String(item.price),
      ].join(",")
    ),
    ["總計", "", "", String(payload.total)].join(","),
  ];
  const content = lines.join("\n");
  return `\ufeff${content}`;
};

export const downloadCsv = (filename: string, csvContent: string) => {
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

export const buildQuotationPrintHtml = (payload: {
  title: string;
  items: QuotationReviewItem[];
  total: number;
  currencyLabel?: string;
}) => {
  const currency = payload.currencyLabel ?? "TWD";
  const rows = payload.items
    .map(
      (item) => `
      <tr>
        <td>${item.h1}</td>
        <td>${item.h2 ?? ""}</td>
        <td>${item.h3}</td>
        <td style="text-align:right;">${item.price ?? ""}</td>
      </tr>`
    )
    .join("");
  return `<!doctype html>
<html lang="zh-Hant">
<head>
  <meta charset="utf-8" />
  <title>${payload.title}</title>
  <style>
    body { font-family: "Noto Sans TC", "Microsoft JhengHei", sans-serif; padding: 24px; color: #1f2937; }
    h1 { font-size: 20px; margin-bottom: 12px; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th, td { border: 1px solid #e5e7eb; padding: 6px 8px; }
    th { background: #f3f4f6; text-align: left; }
    tfoot td { font-weight: 600; background: #f9fafb; }
    .meta { font-size: 12px; color: #6b7280; margin-bottom: 12px; }
  </style>
</head>
<body>
  <h1>${payload.title}</h1>
  <div class="meta">幣別：${currency}</div>
  <table>
    <thead>
      <tr>
        <th>大項</th>
        <th>中項</th>
        <th>小項</th>
        <th style="text-align:right;">價格</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
    </tbody>
    <tfoot>
      <tr>
        <td colspan="3">總計</td>
        <td style="text-align:right;">${payload.total}</td>
      </tr>
    </tfoot>
  </table>
</body>
</html>`;
};

export const printQuotation = (payload: {
  title: string;
  items: QuotationReviewItem[];
  total: number;
  currencyLabel?: string;
}) => {
  const html = buildQuotationPrintHtml(payload);
  const popup = window.open("", "_blank", "noopener,noreferrer");
  if (!popup) return;
  popup.document.open();
  popup.document.write(html);
  popup.document.close();
  popup.focus();
  popup.print();
};
