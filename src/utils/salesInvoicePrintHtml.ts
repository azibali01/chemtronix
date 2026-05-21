import {
  getFooterImage,
  getHeaderImage,
  resolvePrintAssetUrl,
} from "./assetPaths";
import type { Invoice, InvoiceItem } from "./invoice";
import type { ChemtronicsInvoicePrintInput } from "./chemtronicsInvoicePrintHtml";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatMoney(amount: number): string {
  return amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** e.g. 07-October-2025 (rptSaleInvoice 8). */
function formatDateLongMonth(dateStr?: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr.length === 10 ? `${dateStr}T00:00:00` : dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  const dd = String(d.getDate()).padStart(2, "0");
  const month = d.toLocaleString("en-US", { month: "long" });
  return `${dd}-${month}-${d.getFullYear()}`;
}

function resolveCustomerAddress(
  invoice: Invoice,
  accounts: ChemtronicsInvoicePrintInput["accounts"],
): string {
  const title = (invoice.accountTitle || "").trim();
  const code = (invoice.accountNumber || "").trim();
  let found:
    | NonNullable<ChemtronicsInvoicePrintInput["accounts"]>[number]
    | undefined;

  const walk = (nodes: NonNullable<ChemtronicsInvoicePrintInput["accounts"]>) => {
    for (const n of nodes) {
      const name = (n.accountName || "").trim();
      const ac = String(n.accountCode ?? n.selectedCode ?? "").trim();
      if ((code && ac === code) || (title && name === title)) {
        found = n;
        return;
      }
      if (n.children?.length) walk(n.children);
    }
  };
  if (accounts?.length) walk(accounts);
  return (found?.address || "").trim();
}

/** Sales Invoice layout from rptSaleInvoice (8).pdf */
export function buildSalesInvoicePrintHtml({
  invoice,
  brand,
  accounts = [],
  assetBaseUrl,
}: Omit<ChemtronicsInvoicePrintInput, "kind" | "company">): string {
  const itemsList = invoice.items || [];
  const grossValue = itemsList.reduce(
    (s, it) => s + (it.qty || 0) * (it.rate || 0),
    0,
  );
  const discount = 0;
  const netTotal = grossValue - discount;

  const headerImageUrl = resolvePrintAssetUrl(
    getHeaderImage(brand),
    assetBaseUrl,
  );
  const footerImageUrl = resolvePrintAssetUrl(
    getFooterImage(brand),
    assetBaseUrl,
  );
  const customerAddress = escapeHtml(
    resolveCustomerAddress(invoice, accounts) || "",
  );

  const itemsRows = itemsList
    .map((item: InvoiceItem, idx: number) => {
      const gross = (item.qty || 0) * (item.rate || 0);
      const name = escapeHtml(
        item.product || item.description || item.code || "",
      );
      return `<tr>
        <td class="c">${idx + 1}</td>
        <td class="l">${name}</td>
        <td class="c">${(item.qty || 0).toFixed(2)}</td>
        <td class="r">${formatMoney(item.rate || 0)}</td>
        <td class="r">${formatMoney(gross)}</td>
        <td class="r">${formatMoney(gross)}</td>
      </tr>`;
    })
    .join("");

  const desiredRows = 14;
  const paddingRows = Array.from({
    length: Math.max(0, desiredRows - itemsList.length),
  })
    .map(
      () => `<tr class="pad">
        <td class="c">&nbsp;</td>
        <td class="l">&nbsp;</td>
        <td class="c">&nbsp;</td>
        <td class="r">&nbsp;</td>
        <td class="r">&nbsp;</td>
        <td class="r">&nbsp;</td>
      </tr>`,
    )
    .join("");

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Sale Invoice ${escapeHtml(invoice.invoiceNumber)}</title>
  <style>
    @page { size: A4 portrait; margin: 8mm; }
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; width: 100%; }
    body {
      font-family: Arial, Helvetica, sans-serif;
      color: #000;
      font-size: 12px;
    }
    .sale-page {
      width: 100%;
      max-width: 100%;
      padding: 0 0 12px;
    }
    .sale-logo-wrap {
      padding: 4px 4% 8px;
      width: 100%;
    }
    .sale-logo {
      display: block;
      height: auto;
      max-height: 72px;
      width: auto;
      max-width: 220px;
    }
    .sale-details-panel {
      border: 1px solid #000;
      border-radius: 14px;
      margin: 0 4% 12px;
      padding: 10px 16px 12px;
      width: auto;
    }
    .sale-details-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      column-gap: 24px;
      row-gap: 6px;
      font-size: 12px;
    }
    .sale-details-grid .lbl {
      color: #0B4AA6;
      font-weight: 700;
      display: inline-block;
      min-width: 92px;
    }
    .sale-details-grid .val {
      color: #000;
      font-weight: 400;
    }
    .sale-details-grid .row { margin: 0; }
    .sale-items-wrap {
      padding: 0 4%;
      width: 100%;
    }
    .sale-items {
      width: 100%;
      border-collapse: collapse;
      border: 1px solid #000;
      font-size: 12px;
    }
    .sale-items th,
    .sale-items td {
      border: 1px solid #000;
      padding: 6px 8px;
      vertical-align: middle;
    }
    .sale-items thead th {
      background: #1e4fa8;
      color: #fff;
      font-weight: 700;
      text-align: center;
    }
    .sale-items tbody tr { height: 28px; }
    .sale-items tbody tr.pad td { height: 28px; }
    .sale-items .l { text-align: left; }
    .sale-items .c { text-align: center; }
    .sale-items .r { text-align: right; }
    .sale-items th:nth-child(2),
    .sale-items td:nth-child(2) { width: 36%; }
    .sale-bottom {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      padding: 10px 4% 0;
      width: 100%;
      page-break-inside: avoid;
    }
    .sale-sig {
      font-size: 11px;
      color: #333;
      max-width: 50%;
    }
    .sale-totals {
      width: 300px;
      flex-shrink: 0;
      font-size: 12px;
    }
    .sale-totals .line {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      padding: 3px 0 5px;
      border-bottom: 1px solid #000;
      margin-bottom: 4px;
      color: #0B4AA6;
      font-weight: 700;
    }
    .sale-totals .line span:last-child {
      color: #000;
      font-weight: 400;
      min-width: 100px;
      text-align: right;
    }
    .sale-totals .line.net-total {
      border-bottom: 3px double #000;
      margin-top: 6px;
      font-weight: 700;
    }
    .sale-totals .line.net-total span:last-child {
      font-weight: 700;
    }
    .sale-footer {
      margin-top: 16px;
      width: 100%;
      line-height: 0;
    }
    .sale-footer img {
      display: block;
      width: 100%;
      height: auto;
      min-width: 100%;
    }
  </style>
</head>
<body>
  <div class="sale-page">
    <div class="sale-logo-wrap">
      <img class="sale-logo" src="${headerImageUrl}" alt="Logo" />
    </div>

    <div class="sale-details-panel">
      <div class="sale-details-grid">
        <div class="col-left">
          <p class="row"><span class="lbl">Messer's:</span> <span class="val">${escapeHtml(invoice.accountTitle || "")}</span></p>
          <p class="row"><span class="lbl">Address:</span> <span class="val">${customerAddress}</span></p>
        </div>
        <div class="col-right">
          <p class="row"><span class="lbl">InvoiceNo:</span> <span class="val">${escapeHtml(invoice.invoiceNumber)}</span></p>
          <p class="row"><span class="lbl">Invoice Date:</span> <span class="val">${escapeHtml(formatDateLongMonth(invoice.invoiceDate))}</span></p>
          <p class="row"><span class="lbl">Delivery No:</span> <span class="val">${escapeHtml(invoice.deliveryNumber || "")}</span></p>
          <p class="row"><span class="lbl">Delivery Date:</span> <span class="val">${escapeHtml(formatDateLongMonth(invoice.deliveryDate))}</span></p>
          <p class="row"><span class="lbl">Po No:</span> <span class="val">${escapeHtml(invoice.poNumber || "")}</span></p>
          <p class="row"><span class="lbl">Po DateDate:</span> <span class="val">${escapeHtml(formatDateLongMonth(invoice.poDate))}</span></p>
        </div>
      </div>
    </div>

    <div class="sale-items-wrap">
      <table class="sale-items">
        <thead>
          <tr>
            <th>S.No</th>
            <th>Product Name</th>
            <th>Qty</th>
            <th>Rate</th>
            <th>GrossAmount</th>
            <th>Net Amount</th>
          </tr>
        </thead>
        <tbody>
          ${itemsRows}${paddingRows}
        </tbody>
      </table>
    </div>

    <div class="sale-bottom">
      <div class="sale-sig">*Computer generated invoice. No need for signature</div>
      <div class="sale-totals">
        <div class="line"><span>Gross Value :</span><span>${formatMoney(grossValue)}</span></div>
        <div class="line"><span>Discount:</span><span>${formatMoney(discount)}</span></div>
        <div class="line net-total"><span>Net Total :</span><span>${formatMoney(netTotal)}</span></div>
      </div>
    </div>

    <div class="sale-footer">
      <img src="${footerImageUrl}" alt="Footer" />
    </div>
  </div>
</body>
</html>`;
}

/** Sample from rptSaleInvoice (8).pdf */
export function buildSampleSalesInvoicePrintHtml(
  brand: string,
  assetBaseUrl?: string,
): string {
  const base =
    assetBaseUrl ??
    (typeof window !== "undefined" ? window.location.origin : "");
  return buildSalesInvoicePrintHtml({
    brand,
    assetBaseUrl: base || undefined,
    invoice: {
      id: "sample",
      invoiceNumber: "S-818",
      invoiceDate: "2025-10-07",
      deliveryNumber: "",
      deliveryDate: "2025-10-07",
      poNumber: "Choti Zareen",
      poDate: "2025-10-07",
      accountTitle: "NEW Defense View (NDVHS)",
      amount: 28800,
      province: "Punjab",
      items: [
        {
          id: "1",
          code: "CER-1122",
          product: "CER-1122",
          description: "CER-1122",
          hsCode: "",
          qty: 32,
          rate: 450,
          exGSTRate: 0,
          exGSTAmount: 0,
        },
        {
          id: "2",
          code: "FILTER",
          product: 'Cartridge Filter 20" 5M Jumbo',
          description: 'Cartridge Filter 20" 5M Jumbo',
          hsCode: "",
          qty: 18,
          rate: 800,
          exGSTRate: 0,
          exGSTAmount: 0,
        },
      ],
    },
    accounts: [{ accountName: "NEW Defense View (NDVHS)", address: "DGK" }],
  });
}
