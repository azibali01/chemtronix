export type LedgerPrintRow = {
  date: string;
  vchNo: string;
  narration: string;
  debit: number;
  credit: number;
  balance: number;
  balanceSide: "Dr" | "Cr";
};

type BrandLedgerProfile = {
  companyName: string;
  address: string;
  phone: string;
};

const BRAND_PROFILES: Record<string, BrandLedgerProfile> = {
  hydroworx: {
    companyName: "Hydro Worx",
    address: "Bahawalpur Bypass Road, Multan",
    phone: "061-6761611",
  },
  chemtronics: {
    companyName: "Chemtronix Engineering Solution",
    address:
      "552 Mujtaba Canal View, Main Qasimpur Canal Road, Multan",
    phone: "061-6781611",
  },
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function fmtMoney(n: number): string {
  return (n || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function fmtDrCr(amount: number, side: "Dr" | "Cr"): string {
  if (!amount) return "";
  return `${fmtMoney(amount)} ${side}`;
}

function formatRangeDate(d?: Date | null): string {
  if (!d) return "";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function formatPrintTimestamp(): string {
  const now = new Date();
  const dd = String(now.getDate()).padStart(2, "0");
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const yyyy = now.getFullYear();
  let hours = now.getHours();
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12;
  const mins = String(now.getMinutes()).padStart(2, "0");
  const secs = String(now.getSeconds()).padStart(2, "0");
  return `${dd}/${mm}/${yyyy} ${hours}:${mins}:${secs}${ampm}`;
}

export type AccountLedgerPrintInput = {
  brand: string;
  accountNumber: string;
  accountName: string;
  fromDate?: Date | null;
  toDate?: Date | null;
  includeOpeningBalance: boolean;
  rows: LedgerPrintRow[];
  totalDebit: number;
  totalCredit: number;
  endingBalance: number;
};

export function buildAccountLedgerPrintHtml(
  input: AccountLedgerPrintInput,
): string {
  const profile =
    BRAND_PROFILES[input.brand] ?? BRAND_PROFILES.chemtronics;
  const from = formatRangeDate(input.fromDate);
  const to = formatRangeDate(input.toDate);
  const dateRangeText =
    from || to
      ? `Date From: ${from || "—"} To: ${to || "—"}`
      : "Date From: — To: —";

  const endingSide: "Dr" | "Cr" =
    input.endingBalance >= 0 ? "Dr" : "Cr";
  const endingAbs = Math.abs(input.endingBalance);

  const bodyRows = input.rows
    .map((row) => {
      const debitCell =
        row.debit > 0 ? fmtDrCr(row.debit, "Dr") : "";
      const creditCell =
        row.credit > 0 ? fmtDrCr(row.credit, "Cr") : "";
      const balCell = fmtDrCr(row.balance, row.balanceSide);
      return `<tr>
        <td class="c">${escapeHtml(row.date)}</td>
        <td class="c">${escapeHtml(row.vchNo)}</td>
        <td class="n">${escapeHtml(row.narration)}</td>
        <td class="r">${escapeHtml(debitCell)}</td>
        <td class="r">${escapeHtml(creditCell)}</td>
        <td class="r">${escapeHtml(balCell)}</td>
      </tr>`;
    })
    .join("");

  const openingLabel = input.includeOpeningBalance ? "Yes" : "No";

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Account Ledger — ${escapeHtml(input.accountNumber)}</title>
  <style>
    @page { size: A4 portrait; margin: 12mm; }
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; }
    body {
      font-family: Arial, Helvetica, sans-serif;
      font-size: 11px;
      color: #000;
    }
    .page { padding: 8px 12px 20px; max-width: 210mm; margin: 0 auto; }
    .company-header {
      text-align: center;
      margin-bottom: 4px;
    }
    .company-name {
      font-size: 18px;
      font-weight: 700;
      color: #990000;
      margin-bottom: 4px;
    }
    .company-line { font-size: 11px; margin-bottom: 2px; }
    .report-title {
      text-align: center;
      font-size: 16px;
      font-weight: 700;
      color: #000080;
      margin: 14px 0 8px;
      text-decoration: underline;
    }
    .meta-block { font-size: 11px; line-height: 1.5; margin-bottom: 6px; }
    .meta-block .account-line { font-weight: 600; margin-bottom: 4px; }
    .opening-flag { margin-bottom: 10px; font-size: 11px; }
    .opening-flag .yes { font-weight: 700; margin-right: 6px; }
    table.ledger {
      width: 100%;
      border-collapse: collapse;
      border: 1px solid #000;
    }
    table.ledger th,
    table.ledger td {
      border: 1px solid #000;
      padding: 5px 6px;
      vertical-align: top;
    }
    table.ledger thead th {
      background: #d9d9d9;
      color: #000080;
      font-weight: 700;
      text-align: center;
      font-size: 10px;
    }
    table.ledger .n {
      text-align: left;
      white-space: pre-wrap;
      word-break: break-word;
      min-width: 200px;
    }
    table.ledger .c { text-align: center; }
    table.ledger .r { text-align: right; white-space: nowrap; }
    table.ledger tbody tr { min-height: 22px; }
    tr.grand-total td {
      background: #000080;
      color: #fff;
      font-weight: 700;
      border-color: #000080;
    }
    tr.grand-total .r { color: #fff; }
    .footer {
      margin-top: 12px;
      display: flex;
      justify-content: space-between;
      font-size: 10px;
      color: #333;
    }
    @media print {
      .page { padding: 0; }
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>
  <div class="page">
    <div class="company-header">
      <div class="company-name">${escapeHtml(profile.companyName)}</div>
      <div class="company-line">${escapeHtml(profile.address)}</div>
      <div class="company-line">${escapeHtml(profile.phone)}</div>
    </div>

    <div class="report-title">Account Ledger Report</div>

    <div class="meta-block">
      <div class="account-line">Account: ${escapeHtml(input.accountNumber)} ${escapeHtml(input.accountName)} ${escapeHtml(dateRangeText)}</div>
    </div>
    <div class="opening-flag"><span class="yes">${openingLabel}</span> Opening Balance Included</div>

    <table class="ledger">
      <thead>
        <tr>
          <th style="width:72px">Date</th>
          <th style="width:64px">VchNo</th>
          <th>Narration</th>
          <th style="width:88px">Debit</th>
          <th style="width:88px">Credit</th>
          <th style="width:96px">Balance</th>
        </tr>
      </thead>
      <tbody>
        ${bodyRows}
        <tr class="grand-total">
          <td colspan="3" class="n">Grand Total:</td>
          <td class="r">${fmtMoney(input.totalDebit)}</td>
          <td class="r">${fmtMoney(input.totalCredit)}</td>
          <td class="r">${fmtDrCr(endingAbs, endingSide)}</td>
        </tr>
      </tbody>
    </table>

    <div class="footer">
      <span>Page 1 of 1</span>
      <span>${escapeHtml(formatPrintTimestamp())}</span>
    </div>
  </div>
</body>
</html>`;
}

/** Demo ledger matching the reference PDF (no account required). */
export function buildSampleAccountLedgerPrintHtml(brand: string): string {
  return buildAccountLedgerPrintHtml({
    brand,
    accountNumber: "14130",
    accountName: "Qari Ahmad Shb. Baseer Pur",
    fromDate: new Date("2023-12-01"),
    toDate: new Date("2025-10-22"),
    includeOpeningBalance: true,
    rows: [
      {
        date: "30-Nov-2023",
        vchNo: "OB",
        narration: "Opening Balances",
        debit: 23200,
        credit: 0,
        balance: 23200,
        balanceSide: "Dr",
      },
      {
        date: "03-Apr-2024",
        vchNo: "SJV-253",
        narration:
          "Sale bill made SI-127 PO# :Verbal, Item: CRO 66A Rate:450 Qty:32",
        debit: 17150,
        credit: 0,
        balance: 40350,
        balanceSide: "Dr",
      },
      {
        date: "09-May-2024",
        vchNo: "SJV-337",
        narration: "Sale bill made SI-169 — Service Charges",
        debit: 8000,
        credit: 0,
        balance: 48350,
        balanceSide: "Dr",
      },
      {
        date: "22-Oct-2025",
        vchNo: "SJV-1683",
        narration: "Sale bill made SI-839",
        debit: 22400,
        credit: 0,
        balance: 79250,
        balanceSide: "Dr",
      },
    ],
    totalDebit: 79250,
    totalCredit: 0,
    endingBalance: 79250,
  });
}

export function openAccountLedgerPrintPreview(
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
