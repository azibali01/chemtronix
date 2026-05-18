import type { CompanyTaxProfile } from "./assetPaths";
import { getFooterImage, getHeaderImage } from "./assetPaths";
import type { Invoice, InvoiceItem } from "./invoice";

export type InvoicePrintKind = "commercial" | "sales";

type AccountLike = {
  accountName?: string;
  accountCode?: string;
  selectedCode?: string;
  address?: string;
  children?: AccountLike[];
};

const hsCodeTypeMap: Record<
  string,
  "Chemicals" | "Equipments" | "Pumps" | "Services"
> = {
  "3824": "Chemicals",
  "8421": "Equipments",
  "8413": "Pumps",
  "9833": "Services",
};

function getTaxRate(hsCode: string, province: "Punjab" | "Sindh") {
  const type = hsCodeTypeMap[hsCode];
  if (!type) return 0;
  if (type === "Services") return province === "Punjab" ? 16 : 15;
  return 18;
}

export function getInvoicePrintHeading(kind: InvoicePrintKind): string {
  return kind === "commercial" ? "Commercial Invoice" : "Sales Invoice";
}

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

function formatDateDdMmYyyy(dateStr?: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr.length === 10 ? `${dateStr}T00:00:00` : dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function formatLongPrintDate(date = new Date()): string {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function numberToWords(num: number): string {
  if (!num) return "ZERO";
  const a = [
    "",
    "one",
    "two",
    "three",
    "four",
    "five",
    "six",
    "seven",
    "eight",
    "nine",
    "ten",
    "eleven",
    "twelve",
    "thirteen",
    "fourteen",
    "fifteen",
    "sixteen",
    "seventeen",
    "eighteen",
    "nineteen",
  ];
  const b = [
    "",
    "",
    "twenty",
    "thirty",
    "forty",
    "fifty",
    "sixty",
    "seventy",
    "eighty",
    "ninety",
  ];
  function inWords(n: number): string {
    if (n < 20) return a[n];
    if (n < 100)
      return b[Math.floor(n / 10)] + (n % 10 ? " " + a[n % 10] : "");
    if (n < 1000)
      return (
        a[Math.floor(n / 100)] +
        " hundred" +
        (n % 100 ? " " + inWords(n % 100) : "")
      );
    if (n < 1000000)
      return (
        inWords(Math.floor(n / 1000)) +
        " thousand" +
        (n % 1000 ? " " + inWords(n % 1000) : "")
      );
    return (
      inWords(Math.floor(n / 1000000)) +
      " million" +
      (n % 1000000 ? " " + inWords(n % 1000000) : "")
    );
  }
  return inWords(Math.round(num)).toUpperCase();
}

export function resolveCustomerAddress(
  invoice: Invoice,
  accounts: AccountLike[],
): string {
  const title = (invoice.accountTitle || "").trim();
  const code = (invoice.accountNumber || "").trim();
  let found: AccountLike | undefined;

  const walk = (nodes: AccountLike[]) => {
    for (const n of nodes) {
      const name = (n.accountName || "").trim();
      const ac =
        String(n.accountCode ?? n.selectedCode ?? "").trim();
      if (
        (code && ac === code) ||
        (title && name === title)
      ) {
        found = n;
        return;
      }
      if (n.children?.length) walk(n.children);
    }
  };
  walk(accounts);
  return (found?.address || "").trim();
}

export type ChemtronicsInvoicePrintInput = {
  invoice: Invoice;
  kind: InvoicePrintKind;
  brand: string;
  company: CompanyTaxProfile;
  accounts?: AccountLike[];
};

export function buildChemtronicsInvoicePrintHtml({
  invoice,
  kind,
  brand,
  company,
  accounts = [],
}: ChemtronicsInvoicePrintInput): string {
  const itemsList = invoice.items || [];
  const province = invoice.province || "Punjab";
  const subtotal = itemsList.reduce(
    (s, it) => s + (it.qty || 0) * (it.rate || 0),
    0,
  );
  const salesTax = itemsList.reduce(
    (s, it) =>
      s +
      ((it.qty || 0) * (it.rate || 0) * getTaxRate(it.hsCode, province)) / 100,
    0,
  );
  const discount = 0;
  const grandTotal = subtotal + salesTax - discount;

  const printHeading = getInvoicePrintHeading(kind);
  const companyNtn = escapeHtml((company.ntn || "").trim() || "—");
  const companyStrn = escapeHtml((company.strn || "").trim() || "—");
  const customerAddress = escapeHtml(
    resolveCustomerAddress(invoice, accounts),
  );

  const itemsRows = itemsList
    .map((item: InvoiceItem, idx: number) => {
      const gst = getTaxRate(item.hsCode, province);
      const net = (item.qty || 0) * (item.rate || 0);
      const desc = escapeHtml(
        item.product || item.description || item.code || "",
      );
      return `<tr>
        <td class="c">${idx + 1}</td>
        <td class="l">${desc}</td>
        <td class="c">${escapeHtml(item.hsCode || "")}</td>
        <td class="c">${gst.toFixed(2)}</td>
        <td class="r">${formatMoney(item.rate || 0)}</td>
        <td class="c">${(item.qty || 0).toFixed(2)}</td>
        <td class="r">${formatMoney(net)}</td>
      </tr>`;
    })
    .join("");

  const desiredRows = 12;
  const paddingCount = Math.max(0, desiredRows - itemsList.length);
  const paddingRows = Array.from({ length: paddingCount })
    .map(
      () => `<tr class="pad">
        <td class="c">&nbsp;</td>
        <td class="l">&nbsp;</td>
        <td class="c">&nbsp;</td>
        <td class="c">&nbsp;</td>
        <td class="r">&nbsp;</td>
        <td class="c">&nbsp;</td>
        <td class="r">&nbsp;</td>
      </tr>`,
    )
    .join("");

  const headerImageUrl = getHeaderImage(brand);
  const footerImageUrl = getFooterImage(brand);
  const amountWords = numberToWords(Math.round(grandTotal));
  const printDateLong = formatLongPrintDate();

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(printHeading)} ${escapeHtml(invoice.invoiceNumber)}</title>
  <style>
    @page { size: A4 portrait; margin: 8mm; }
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; }
    body {
      font-family: "Times New Roman", Times, Georgia, serif;
      color: #000;
      font-size: 12px;
    }
    .page {
      padding: 12px 20px 16px;
      max-width: 210mm;
      margin: 0 auto;
    }
    .header-img {
      display: block;
      width: 100%;
      height: auto;
      object-fit: contain;
    }
    .header-sub {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-top: 4px;
      min-height: 44px;
    }
    .company-tax {
      color: #0B4AA6;
      font-weight: 700;
      font-size: 13px;
      line-height: 1.55;
      font-family: Arial, Helvetica, sans-serif;
    }
    .company-tax .lbl { font-weight: 700; }
    .copy-marks {
      border-collapse: collapse;
      font-family: Arial, Helvetica, sans-serif;
      font-size: 11px;
      margin-top: 2px;
    }
    .copy-marks td {
      border: 1px solid #000;
      padding: 2px 8px;
      vertical-align: middle;
    }
    .copy-marks .box {
      width: 52px;
      height: 18px;
    }
    .doc-title {
      text-align: center;
      font-size: 26px;
      font-weight: 700;
      margin: 10px 0 12px;
      color: #000;
      font-family: "Times New Roman", Times, Georgia, serif;
    }
    .details-box {
      border: 1px solid #000;
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 10px;
      font-family: Arial, Helvetica, sans-serif;
      font-size: 12px;
    }
    .details-box td {
      border: none;
      padding: 6px 10px;
      vertical-align: top;
      width: 50%;
    }
    .details-box .lbl {
      font-weight: 700;
      display: inline-block;
      min-width: 88px;
    }
    .details-box .title-val {
      font-weight: 700;
    }
    .details-box .row { margin-bottom: 4px; }
    .items-table {
      width: 100%;
      border-collapse: collapse;
      border: 2px solid #000;
      font-family: Arial, Helvetica, sans-serif;
      font-size: 12px;
    }
    .items-table th,
    .items-table td {
      border: 1px solid #000;
      padding: 6px 8px;
      vertical-align: middle;
    }
    .items-table thead th {
      background: #d9d9d9;
      color: #0B4AA6;
      font-weight: 700;
      text-align: center;
    }
    .items-table tbody tr { height: 40px; }
    .items-table tbody tr.pad td { height: 40px; }
    .items-table .l { text-align: left; }
    .items-table .c { text-align: center; }
    .items-table .r { text-align: right; }
    .items-table th:nth-child(2),
    .items-table td:nth-child(2) { width: 38%; }
    .bottom-wrap {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-top: 10px;
      gap: 16px;
      page-break-inside: avoid;
    }
    .bottom-left {
      flex: 1;
      font-family: Arial, Helvetica, sans-serif;
      font-size: 11px;
      color: #333;
      padding-top: 4px;
    }
    .bottom-left .sig { margin-bottom: 6px; }
    .bottom-left .date { font-size: 12px; color: #000; }
    .totals-block {
      width: 300px;
      flex-shrink: 0;
      font-family: Arial, Helvetica, sans-serif;
      font-size: 12px;
    }
    .totals-block .line {
      display: flex;
      justify-content: space-between;
      margin-bottom: 4px;
    }
    .totals-block .line.grand {
      font-weight: 700;
      margin-top: 6px;
      margin-bottom: 8px;
    }
    .totals-block .words {
      font-weight: 700;
      font-size: 12px;
      text-transform: uppercase;
      text-align: left;
      margin-top: 4px;
      line-height: 1.35;
    }
    .footer-img {
      display: block;
      width: 100%;
      height: auto;
      max-height: 150px;
      object-fit: cover;
      margin-top: 14px;
    }
    .items-table, .bottom-wrap, .footer-img {
      break-inside: avoid;
      page-break-inside: avoid;
    }
  </style>
</head>
<body>
  <div class="page">
    <img class="header-img" src="${headerImageUrl}" alt="" />

    <div class="header-sub">
      <div class="company-tax">
        <div><span class="lbl">NTN:</span> ${companyNtn}</div>
        <div><span class="lbl">STRN:</span> ${companyStrn}</div>
      </div>
      <table class="copy-marks">
        <tr><td>Duplicate:</td><td class="box"></td></tr>
        <tr><td>Triplicate:</td><td class="box"></td></tr>
      </table>
    </div>

    <div class="doc-title">${escapeHtml(printHeading)}</div>

    <table class="details-box">
      <tr>
        <td>
          <div class="row"><span class="lbl">Title:</span> <span class="title-val">${escapeHtml(invoice.accountTitle || "")}</span></div>
          <div class="row"><span class="lbl">Address:</span> ${customerAddress}</div>
          <div class="row"><span class="lbl">NTN:</span> ${escapeHtml(invoice.ntnNumber || "")}</div>
          <div class="row"><span class="lbl">STRN:</span> ${escapeHtml(invoice.strnNumber || "")}</div>
        </td>
        <td>
          <div class="row"><span class="lbl">InvoiceNo:</span> ${escapeHtml(invoice.invoiceNumber)}</div>
          <div class="row"><span class="lbl">Invoice Date:</span> ${escapeHtml(formatDateDdMmYyyy(invoice.invoiceDate))}</div>
          <div class="row"><span class="lbl">Delivery No:</span> ${escapeHtml(invoice.deliveryNumber || "")}</div>
          <div class="row"><span class="lbl">Delivery Date:</span> ${escapeHtml(formatDateDdMmYyyy(invoice.deliveryDate))}</div>
          <div class="row"><span class="lbl">Po No:</span> ${escapeHtml(invoice.poNumber || "")}</div>
          <div class="row"><span class="lbl">Po Date:</span> ${escapeHtml(formatDateDdMmYyyy(invoice.poDate))}</div>
        </td>
      </tr>
    </table>

    <table class="items-table">
      <thead>
        <tr>
          <th>SR No</th>
          <th>Description</th>
          <th>HS Code</th>
          <th>GST %</th>
          <th>Rate</th>
          <th>Qty</th>
          <th>Net Amount</th>
        </tr>
      </thead>
      <tbody>
        ${itemsRows}${paddingRows}
      </tbody>
    </table>

    <div class="bottom-wrap">
      <div class="bottom-left">
        <div class="sig">*Computer generated invoice. No need for signature</div>
        <div class="date">${escapeHtml(printDateLong)}</div>
      </div>
      <div class="totals-block">
        <div class="line"><span>Gross Total:</span><span>${formatMoney(subtotal)}</span></div>
        <div class="line"><span>Sales Tax:</span><span>${formatMoney(salesTax)}</span></div>
        <div class="line"><span>Discount:</span><span>${formatMoney(discount)}</span></div>
        <div class="line grand"><span>Grand Total Inclusive Tax:</span><span>${formatMoney(grandTotal)}</span></div>
        <div class="words">${escapeHtml(amountWords)}</div>
      </div>
    </div>

    <img class="footer-img" src="${footerImageUrl}" alt="" />
  </div>
</body>
</html>`;
}
