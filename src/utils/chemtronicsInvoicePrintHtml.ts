import type { CompanyTaxProfile } from "./assetPaths";
import {
  getInvoicePrintFooterImage,
  getInvoicePrintHeaderImage,
  resolvePrintAssetUrl,
} from "./assetPaths";
import type { Invoice, InvoiceItem } from "./invoice";
import {
  buildInvoicePrintHeaderHtml,
  INVOICE_PRINT_HEADER_STYLES,
} from "./invoicePrintHeader";
import { buildSalesInvoicePrintHtml } from "./salesInvoicePrintHtml";

export type InvoicePrintKind = "commercial" | "sales" | "gst";

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
  if (kind === "commercial") return "Commercial Invoice";
  if (kind === "gst") return "Sales Tax Invoice";
  return "Sale Invoice";
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

/** Line-item amounts in PDF (7) use plain decimals without thousands separators. */
function formatLineAmount(amount: number): string {
  return amount.toFixed(2);
}

function getPoDateLabel(kind: InvoicePrintKind): string {
  return kind === "commercial" ? "Po DateDate:" : "Po Date:";
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
  /** e.g. window.location.origin — needed for header/footer images in blob print windows */
  assetBaseUrl?: string;
};

export function buildChemtronicsInvoicePrintHtml({
  invoice,
  kind,
  brand,
  company,
  accounts = [],
  assetBaseUrl,
}: ChemtronicsInvoicePrintInput): string {
  if (kind === "sales") {
    return buildSalesInvoicePrintHtml({
      invoice,
      brand,
      accounts,
      assetBaseUrl,
    });
  }

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
  const showOriginalCopy = kind === "gst" || kind === "commercial";
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
        <td class="r">${formatLineAmount(net)}</td>
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

  const headerImageUrl = resolvePrintAssetUrl(
    getInvoicePrintHeaderImage(brand),
    assetBaseUrl,
  );
  const footerImageUrl = resolvePrintAssetUrl(
    getInvoicePrintFooterImage(brand),
    assetBaseUrl,
  );
  const docTitleClass =
    kind === "gst"
      ? "doc-title doc-title--gst"
      : kind === "commercial"
        ? "doc-title doc-title--commercial"
        : "doc-title doc-title--sales";
  const poDateLabel = getPoDateLabel(kind);
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
      width: 100%;
      max-width: 100%;
      margin: 0;
      padding: 0 0 16px;
    }
    .page-body {
      width: 100%;
      padding: 0 6mm;
      box-sizing: border-box;
    }
    ${INVOICE_PRINT_HEADER_STYLES}
    .header-meta-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      width: 100%;
      padding: 2px 3.2% 8px 5.2%;
      box-sizing: border-box;
      gap: 12px;
    }
    .company-tax {
      flex: 0 0 auto;
      font-family: Arial, Helvetica, sans-serif;
      font-size: 12px;
      font-weight: 700;
      line-height: 1.65;
      color: #0B4AA6;
    }
    .company-tax .tax-line {
      display: block;
      white-space: nowrap;
    }
    .copy-marks {
      flex: 0 0 auto;
      margin-left: auto;
      border-collapse: collapse;
      font-family: Arial, Helvetica, sans-serif;
      font-size: 11px;
      border: 1px solid #000;
    }
    .copy-marks td {
      border: 1px solid #000;
      vertical-align: middle;
    }
    .copy-marks .label-cell {
      color: #0B4AA6;
      font-weight: 700;
      padding: 5px 12px 5px 10px;
      text-align: left;
      white-space: nowrap;
    }
    .copy-marks .box-cell {
      width: 62px;
      min-width: 62px;
      height: 24px;
      padding: 0;
      background: #fff;
    }
    .header-rule {
      border: none;
      border-top: 1px solid #000;
      margin: 0 3.2% 10px 3.2%;
      width: auto;
    }
    .doc-title {
      text-align: center;
      font-weight: 700;
      margin: 6px 0 6px;
      font-family: "Times New Roman", Times, Georgia, serif;
      color: #000;
    }
    .doc-title--gst {
      font-size: 26px;
      margin: 8px 0 10px;
      color: #000080;
      text-decoration: underline;
    }
    .doc-title--commercial,
    .doc-title--sales {
      font-size: 22px;
      text-decoration: none;
      color: #000;
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
    .footer-banner {
      margin-top: 18px;
      width: 100%;
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .footer-img {
      display: block;
      width: 100%;
      height: auto;
      min-width: 100%;
    }
    .items-table, .bottom-wrap, .footer-banner {
      break-inside: avoid;
      page-break-inside: avoid;
    }
  </style>
</head>
<body>
  <div class="page">
    ${buildInvoicePrintHeaderHtml(headerImageUrl)}

    <div class="${docTitleClass}">${escapeHtml(printHeading)}</div>

    <div class="header-meta-row">
      <div class="company-tax">
        <span class="tax-line">NTN: ${companyNtn}</span>
        <span class="tax-line">STRN: ${companyStrn}</span>
      </div>
      <table class="copy-marks">
        ${showOriginalCopy ? "<tr><td class=\"label-cell\">Original:</td><td class=\"box-cell\">&nbsp;</td></tr>" : ""}
        <tr><td class="label-cell">Duplicate:</td><td class="box-cell">&nbsp;</td></tr>
        <tr><td class="label-cell">Triplicate:</td><td class="box-cell">&nbsp;</td></tr>
      </table>
    </div>
    <hr class="header-rule" />

    <div class="page-body">
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
          <div class="row"><span class="lbl">${poDateLabel}</span> ${escapeHtml(formatDateDdMmYyyy(invoice.poDate))}</div>
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
    </div>

    <div class="footer-banner">
      <img class="footer-img" src="${footerImageUrl}" alt="Chemtronix footer" />
    </div>
  </div>
</body>
</html>`;
}

/** Sample Commercial Invoice from rptGstInvoice (7).pdf (no API). */
export function buildSampleCommercialInvoicePrintHtml(
  brand: string,
  assetBaseUrl?: string,
): string {
  const base =
    assetBaseUrl ??
    (typeof window !== "undefined" ? window.location.origin : "");
  return buildChemtronicsInvoicePrintHtml({
    invoice: sampleInvoiceFgsts459(),
    kind: "commercial",
    brand,
    assetBaseUrl: base || undefined,
    company: {
      legalName: "Chemtronix Engineering Solution",
      ntn: "C270254-2",
      strn: "32-77-8763-241-63",
    },
    accounts: [
      {
        accountName: "AHMAD FINE WEAVING LIMITED (UNIT-II)",
        address:
          "Industrial Estate Link Road, Askari Bypass, Opp.P.C Hotal Multan",
      },
    ],
  });
}

/** Sample GST / Sales Tax invoice (same layout as PDF 7, Sales Tax title). */
export function buildSampleGstInvoicePrintHtml(
  brand: string,
  assetBaseUrl?: string,
): string {
  const base =
    assetBaseUrl ??
    (typeof window !== "undefined" ? window.location.origin : "");
  return buildChemtronicsInvoicePrintHtml({
    invoice: sampleInvoiceFgsts459(),
    kind: "gst",
    brand,
    assetBaseUrl: base || undefined,
    company: {
      legalName: "Chemtronix Engineering Solution",
      ntn: "C270254-2",
      strn: "32-77-8763-241-63",
    },
    accounts: [
      {
        accountName: "AHMAD FINE WEAVING LIMITED (UNIT-II)",
        address:
          "Industrial Estate Link Road, Askari Bypass, Opp.P.C Hotal Multan",
      },
    ],
  });
}

function sampleInvoiceFgsts459(): Invoice {
  return {
    id: "sample",
    invoiceNumber: "FGSTS-459",
    invoiceDate: "2025-08-04",
    deliveryNumber: "14",
    deliveryDate: "2025-07-31",
    poNumber: "0120277170",
    poDate: "2025-07-25",
    accountTitle: "AHMAD FINE WEAVING LIMITED (UNIT-II)",
    ntnNumber: "4099235-7",
    strnNumber: "04-00-4099-235-18",
    amount: 46067.2,
    province: "Punjab",
    items: [
      {
        id: "1",
        code: "CEB-500",
        product: "CEB-500",
        hsCode: "3824",
        description: "CEB-500",
        qty: 32,
        rate: 265,
        exGSTRate: 0,
        exGSTAmount: 0,
      },
      {
        id: "2",
        code: "CEB 511A",
        product: "CEB 511A",
        hsCode: "3824",
        description: "CEB 511A",
        qty: 32,
        rate: 275,
        exGSTRate: 0,
        exGSTAmount: 0,
      },
      {
        id: "3",
        code: "CER-1122",
        product: "CER-1122",
        hsCode: "3824",
        description: "CER-1122",
        qty: 32,
        rate: 390,
        exGSTRate: 0,
        exGSTAmount: 0,
      },
      {
        id: "4",
        code: "CEB-450",
        product: "CEB-450",
        hsCode: "3824",
        description: "CEB-450",
        qty: 32,
        rate: 290,
        exGSTRate: 0,
        exGSTAmount: 0,
      },
    ],
  };
}

export function openInvoicePrintPreview(
  html: string,
  options?: { autoPrint?: boolean },
): boolean {
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const w = window.open(url, "_blank", "noopener,noreferrer");
  if (!w) {
    URL.revokeObjectURL(url);
    return false;
  }
  const cleanup = () => URL.revokeObjectURL(url);
  if (options?.autoPrint !== false) {
    w.addEventListener("load", () => {
      cleanup();
      setTimeout(() => {
        try {
          w.focus();
          w.print();
        } catch {
          /* ignore */
        }
      }, 400);
    });
  } else {
    w.addEventListener("load", cleanup);
  }
  return true;
}
