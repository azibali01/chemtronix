"use client";
import { useState, useEffect, useMemo } from "react";
import api from "../../../api_configuration/api";
import {
  Card,
  Text,
  Grid,
  Button,
  Table,
  Group,
  Stack,
  Pagination,
  TextInput,
} from "@mantine/core";
import jsPDF from "jspdf";
import autoTable, { type RowInput } from "jspdf-autotable";
import { Download, Filter } from "lucide-react";
import { useBrand } from "../../Context/BrandContext";
import { getHeaderImage, getFooterImage } from "../../../utils/assetPaths";
import { IconArrowUpRight } from "@tabler/icons-react";

type ARCustomer = {
  accountNumber: string;
  accountName: string;
  openingDebit: number;
  openingCredit: number;
  currentDebit: number;
  currentCredit: number;
  closingBalance: number;
};

type SaleInvoiceLine = {
  netAmount?: number;
  quantity?: number | string;
  qty?: number | string;
  rate?: number | string;
  exGstAmount?: number;
};

type SaleInvoice = {
  _id?: string;
  accountTitle: string;
  accountNumber?: string;
  invoiceNumber?: string;
  invoiceDate?: string;
  netAmount?: number;
  products?: SaleInvoiceLine[];
};

type InvoiceRow = {
  id: string;
  invoiceNumber: string;
  date: string;
  amount: number;
};

type PendingInvoiceRow = InvoiceRow & {
  customerName: string;
  accountNumber: string;
};

/** Invoice total from line netAmount (API shape) or quantity × rate fallback. */
function saleInvoiceAmount(inv: SaleInvoice): number {
  const lines = inv.products ?? [];
  if (lines.length > 0) {
    const fromNet = lines.reduce(
      (s, p) => s + (Number(p.netAmount) || 0),
      0,
    );
    if (fromNet > 0) return fromNet;
    const fromQtyRate = lines.reduce((s, p) => {
      const qty = Number(p.quantity ?? p.qty) || 0;
      const rate = Number(p.rate) || 0;
      return s + qty * rate;
    }, 0);
    if (fromQtyRate > 0) return fromQtyRate;
    const fromExGst = lines.reduce(
      (s, p) => s + (Number(p.exGstAmount) || 0),
      0,
    );
    if (fromExGst > 0) return fromExGst;
  }
  return Number(inv.netAmount) || 0;
}

function fmtRs(n: number) {
  return `Rs. ${Math.abs(Number(n) || 0).toLocaleString()}`;
}

/** Normalize chart / invoice account codes for comparison (spacing, case). */
function normalizeAccountCode(s: string | undefined): string {
  return String(s ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "");
}

/** Compare two account codes allowing prefix match (e.g. "1410" vs "1410-Receivables Accounts"). */
function accountCodesMatch(a: string | undefined, b: string | undefined): boolean {
  const x = normalizeAccountCode(a);
  const y = normalizeAccountCode(b);
  if (!x || !y) return false;
  if (x === y) return true;
  const xHead = x.split("-")[0] ?? x;
  const yHead = y.split("-")[0] ?? y;
  if (xHead && yHead && (xHead === yHead || x.startsWith(yHead) || y.startsWith(xHead)))
    return true;
  return false;
}

/** Sale invoice belongs to this AR row (title and/or account number). */
function invoiceMatchesCustomer(inv: SaleInvoice, c: ARCustomer): boolean {
  const titleInv = (inv.accountTitle || "").trim().toLowerCase();
  const titleCust = (c.accountName || "").trim().toLowerCase();
  if (titleInv && titleCust && titleInv === titleCust) return true;
  return accountCodesMatch(inv.accountNumber, c.accountNumber);
}

function customerMatchesSearch(c: ARCustomer, q: string): boolean {
  const query = q.trim().toLowerCase();
  if (!query) return true;
  const name = (c.accountName || "").toLowerCase();
  const num = String(c.accountNumber || "").toLowerCase();
  const numCompact = num.replace(/\s+/g, "");
  if (name.includes(query) || num.includes(query) || numCompact.includes(query.replace(/\s+/g, "")))
    return true;
  const tokens = query.split(/\s+/).filter(Boolean);
  if (tokens.length > 1) {
    return tokens.every(
      (t) => name.includes(t) || num.includes(t) || numCompact.includes(t.replace(/\s+/g, "")),
    );
  }
  return false;
}

/** Parse YYYY-MM-DD as local calendar date (avoids UTC off-by-one vs invoice times). */
function parseLocalDateEndOfDay(ymd: string): Date | null {
  if (!ymd) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd.trim());
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  const d = Number(m[3]);
  const dt = new Date(y, mo, d, 23, 59, 59, 999);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

function parseLocalDateStartOfDay(ymd: string): Date | null {
  if (!ymd) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd.trim());
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  const d = Number(m[3]);
  const dt = new Date(y, mo, d, 0, 0, 0, 0);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

function invoiceDateInRange(
  inv: SaleInvoice,
  fromYmd: string,
  toYmd: string,
): boolean {
  if (!inv.invoiceDate) return false;
  const d = new Date(inv.invoiceDate);
  if (Number.isNaN(d.getTime())) return false;
  const from = fromYmd ? parseLocalDateStartOfDay(fromYmd) : null;
  const to = toYmd ? parseLocalDateEndOfDay(toYmd) : null;
  if (from && d < from) return false;
  if (to && d > to) return false;
  return true;
}

function hasAppliedDateRange(fromYmd: string, toYmd: string): boolean {
  return fromYmd.trim() !== "" || toYmd.trim() !== "";
}

/** Net opening receivable (debit − credit). */
function openingBalanceNet(c: ARCustomer): number {
  return (Number(c.openingDebit) || 0) - (Number(c.openingCredit) || 0);
}

/** Net current-period receivable (debit − credit). */
function currentBalanceNet(c: ARCustomer): number {
  return (Number(c.currentDebit) || 0) - (Number(c.currentCredit) || 0);
}

/** Closing = opening balance + current debit − current credit. */
function closingFromOpeningAndCurrent(c: ARCustomer): number {
  return (
    openingBalanceNet(c) +
    (Number(c.currentDebit) || 0) -
    (Number(c.currentCredit) || 0)
  );
}

/**
 * With a date range: invoices outside the range add to opening debit;
 * in-range invoices are current debit; closing = opening balance + current debit − current credit.
 */
function adjustCustomerBalancesForDateRange(
  customer: ARCustomer,
  invoices: SaleInvoice[],
  fromYmd: string,
  toYmd: string,
): ARCustomer {
  const customerInvs = invoices.filter((inv) =>
    invoiceMatchesCustomer(inv, customer),
  );

  let outOfRangeDebit = 0;
  let inRangeDebit = 0;

  for (const inv of customerInvs) {
    const amt = saleInvoiceAmount(inv);
    if (!inv.invoiceDate) {
      outOfRangeDebit += amt;
      continue;
    }
    if (invoiceDateInRange(inv, fromYmd, toYmd)) {
      inRangeDebit += amt;
    } else {
      outOfRangeDebit += amt;
    }
  }

  const openingDebit =
    (Number(customer.openingDebit) || 0) + outOfRangeDebit;
  const openingCredit = Number(customer.openingCredit) || 0;
  const currentDebit = inRangeDebit;
  const currentCredit = Number(customer.currentCredit) || 0;

  const adjusted: ARCustomer = {
    ...customer,
    openingDebit,
    openingCredit,
    currentDebit,
    currentCredit,
    closingBalance: 0,
  };
  adjusted.closingBalance = closingFromOpeningAndCurrent(adjusted);
  return adjusted;
}

/** Minimal AR row for a customer known only from sale invoices (not in JV summary). */
function customerRowFromInvoice(
  inv: SaleInvoice,
  invoices: SaleInvoice[],
): ARCustomer | null {
  const title = (inv.accountTitle || "").trim();
  const code = String(inv.accountNumber || "").trim();
  if (!title && !code) return null;

  const base: ARCustomer = {
    accountNumber: code || title,
    accountName: title || code,
    openingDebit: 0,
    openingCredit: 0,
    currentDebit: 0,
    currentCredit: 0,
    closingBalance: 0,
  };

  const related = invoices.filter((i) => invoiceMatchesCustomer(i, base));
  if (related.length === 0) return null;

  return base;
}

export default function AccountsReceivable() {
  const { brand } = useBrand();
  const [arData, setArData] = useState<ARCustomer[]>([]);
  const [saleInvoices, setSaleInvoices] = useState<SaleInvoice[]>([]);

  const [page, setPage] = useState(1);
  const [invoicePage, setInvoicePage] = useState(1);
  const [pendingPage, setPendingPage] = useState(1);
  /** Which receivable row is expanded (chart account code / JV key). */
  const [expandedAccountNumber, setExpandedAccountNumber] = useState<
    string | null
  >(null);
  const [search, setSearch] = useState("");
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");
  const [appliedFromDate, setAppliedFromDate] = useState<string>("");
  const [appliedToDate, setAppliedToDate] = useState<string>("");

  const pageSize = 5;
  const invoicePageSize = 5;

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [arRes, invRes] = await Promise.all([
          api.get("/reports/accounts-receivable"),
          api.get("/sale-invoice"),
        ]);
        setArData(Array.isArray(arRes.data) ? arRes.data : []);
        setSaleInvoices(Array.isArray(invRes.data) ? invRes.data : []);
      } catch (e) {
        console.error("Failed to fetch AR data:", e);
      }
    };
    fetchAll();
  }, []);

  useEffect(() => {
    setPage(1);
    setPendingPage(1);
  }, [search]);

  const applyFilters = () => {
    setAppliedFromDate(fromDate);
    setAppliedToDate(toDate);
    setPage(1);
    setInvoicePage(1);
    setPendingPage(1);
  };

  const dateRangeActive = hasAppliedDateRange(
    appliedFromDate,
    appliedToDate,
  );

  const displayCustomers = useMemo(() => {
    const searched = arData.filter((c) => customerMatchesSearch(c, search));

    if (!dateRangeActive) {
      return searched.map((c) => ({
        ...c,
        closingBalance: closingFromOpeningAndCurrent(c),
      }));
    }

    const adjusted = searched.map((c) => {
      const row = adjustCustomerBalancesForDateRange(
        c,
        saleInvoices,
        appliedFromDate,
        appliedToDate,
      );
      return {
        ...row,
        closingBalance: closingFromOpeningAndCurrent(row),
      };
    });

    const seenKeys = new Set(
      adjusted.map((c) => normalizeAccountCode(c.accountNumber)),
    );

    for (const inv of saleInvoices) {
      const inAr = arData.some((c) => invoiceMatchesCustomer(inv, c));
      if (inAr) continue;

      const row = customerRowFromInvoice(inv, saleInvoices);
      if (!row || !customerMatchesSearch(row, search)) continue;
      const key = normalizeAccountCode(row.accountNumber);
      if (seenKeys.has(key)) continue;
      seenKeys.add(key);

      adjusted.push(
        adjustCustomerBalancesForDateRange(
          row,
          saleInvoices,
          appliedFromDate,
          appliedToDate,
        ),
      );
    }

    return adjusted.filter(
      (c) =>
        c.closingBalance > 0 ||
        currentBalanceNet(c) > 0 ||
        openingBalanceNet(c) > 0,
    );
  }, [
    arData,
    saleInvoices,
    search,
    dateRangeActive,
    appliedFromDate,
    appliedToDate,
  ]);

  const expandedCustomerRow = useMemo(
    () =>
      expandedAccountNumber
        ? (displayCustomers.find(
            (c) => c.accountNumber === expandedAccountNumber,
          ) ?? null)
        : null,
    [displayCustomers, expandedAccountNumber],
  );

  useEffect(() => {
    setInvoicePage(1);
  }, [expandedAccountNumber, appliedFromDate, appliedToDate]);

  useEffect(() => {
    if (!expandedAccountNumber) return;
    const stillInView = displayCustomers.some(
      (c) => c.accountNumber === expandedAccountNumber,
    );
    if (!stillInView) setExpandedAccountNumber(null);
  }, [displayCustomers, expandedAccountNumber]);

  useEffect(() => {
    setPage(1);
  }, [dateRangeActive, appliedFromDate, appliedToDate]);

  const paginatedCustomers = displayCustomers.slice(
    (page - 1) * pageSize,
    page * pageSize,
  );

  const totalClosing = displayCustomers.reduce(
    (s, c) => s + (Number(c.closingBalance) || 0),
    0,
  );
  const totalOpeningDebit = displayCustomers.reduce(
    (s, c) => s + (Number(c.openingDebit) || 0),
    0,
  );
  const totalOpeningCredit = displayCustomers.reduce(
    (s, c) => s + (Number(c.openingCredit) || 0),
    0,
  );
  const totalCurrentDebit = displayCustomers.reduce(
    (s, c) => s + (Number(c.currentDebit) || 0),
    0,
  );
  const totalCurrentCredit = displayCustomers.reduce(
    (s, c) => s + (Number(c.currentCredit) || 0),
    0,
  );

  /** Sale invoices for receivable customers (in-range only when date filter is on). */
  const pendingInvoices = useMemo<PendingInvoiceRow[]>(() => {
    const q = search.trim().toLowerCase();

    return saleInvoices
      .filter((inv) => {
        const customer =
          displayCustomers.find((c) => invoiceMatchesCustomer(inv, c)) ??
          arData.find((c) => invoiceMatchesCustomer(inv, c));
        if (!customer) return false;
        if (dateRangeActive) {
          if (!inv.invoiceDate) return false;
          if (!invoiceDateInRange(inv, appliedFromDate, appliedToDate))
            return false;
        }
        if (!q) return true;
        const invNo = (inv.invoiceNumber ?? "").toLowerCase();
        const name = (customer.accountName ?? "").toLowerCase();
        const num = String(customer.accountNumber ?? "").toLowerCase();
        return (
          name.includes(q) ||
          num.includes(q) ||
          invNo.includes(q) ||
          num.replace(/\s+/g, "").includes(q.replace(/\s+/g, ""))
        );
      })
      .map((inv) => {
        const customer =
          displayCustomers.find((c) => invoiceMatchesCustomer(inv, c)) ??
          arData.find((c) => invoiceMatchesCustomer(inv, c))!;
        return {
          id: inv._id ?? `${inv.invoiceNumber}-${inv.invoiceDate}`,
          invoiceNumber: inv.invoiceNumber ?? "",
          date: inv.invoiceDate?.split("T")[0] ?? "",
          amount: saleInvoiceAmount(inv),
          customerName: customer.accountName,
          accountNumber: customer.accountNumber,
        };
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [
    saleInvoices,
    arData,
    displayCustomers,
    dateRangeActive,
    appliedFromDate,
    appliedToDate,
    search,
  ]);

  const pendingInvoicesPaginated = pendingInvoices.slice(
    (pendingPage - 1) * invoicePageSize,
    pendingPage * invoicePageSize,
  );

  const totalPendingInvoices = pendingInvoices.reduce(
    (s, i) => s + i.amount,
    0,
  );

  const expandedInvoices = useMemo<InvoiceRow[]>(() => {
    if (!expandedCustomerRow) return [];
    const hasDateRange =
      appliedFromDate.trim() !== "" || appliedToDate.trim() !== "";

    return saleInvoices
      .filter((inv) => {
        if (!invoiceMatchesCustomer(inv, expandedCustomerRow)) return false;
        if (!hasDateRange) return true;
        if (!inv.invoiceDate) return false;
        return invoiceDateInRange(inv, appliedFromDate, appliedToDate);
      })
      .map((inv) => ({
        id: inv._id ?? "",
        invoiceNumber: inv.invoiceNumber ?? "",
        date: inv.invoiceDate?.split("T")[0] ?? "",
        amount: saleInvoiceAmount(inv),
      }));
  }, [
    expandedCustomerRow,
    saleInvoices,
    appliedFromDate,
    appliedToDate,
  ]);

  const expandedInvoicesPaginated = expandedInvoices.slice(
    (invoicePage - 1) * invoicePageSize,
    invoicePage * invoicePageSize,
  );

  const exportPDF = () => {
    const headerUrl = getHeaderImage(brand);
    const footerUrl = getFooterImage(brand);
    const logoUrl = "/Logo.png";
    const logoImg = new window.Image();
    const headerImg = new window.Image();
    const footerImg = new window.Image();
    let loaded = 0;
    function tryDraw() {
      loaded++;
      if (loaded === 3) {
        drawPDF();
      }
    }
    logoImg.src = logoUrl;
    headerImg.src = headerUrl;
    footerImg.src = footerUrl;
    logoImg.onload = tryDraw;
    headerImg.onload = tryDraw;
    footerImg.onload = tryDraw;
    logoImg.onerror = tryDraw;
    headerImg.onerror = tryDraw;
    footerImg.onerror = tryDraw;

    function drawPDF() {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      doc.addImage(headerImg, "JPEG", 0, 0, pageWidth, 25);
      const logoWidth = 40;
      const logoHeight = 20;
      const logoX = (pageWidth - logoWidth) / 2;
      doc.addImage(logoImg, "PNG", logoX, 27, logoWidth, logoHeight);

      doc.setFontSize(16);
      doc.text("Accounts Receivable Report", pageWidth / 2, 52, {
        align: "center",
      });
      doc.setFontSize(10);
      doc.text(`Date: ${new Date().toLocaleDateString()}`, pageWidth / 2, 59, {
        align: "center",
      });

      const head = [
        [
          "Customer",
          "Opening Dr",
          "Opening Cr",
          "Current Dr",
          "Current Cr",
          "Closing",
        ],
      ];
      const body: RowInput[] = [
        ...displayCustomers.map((c) => [
          c.accountName,
          fmtRs(c.openingDebit),
          fmtRs(c.openingCredit),
          fmtRs(c.currentDebit),
          fmtRs(c.currentCredit),
          fmtRs(c.closingBalance),
        ]),
        [
          {
            content: "Totals",
            colSpan: 1,
            styles: { halign: "right", fontStyle: "bold" },
          },
          fmtRs(totalOpeningDebit),
          fmtRs(totalOpeningCredit),
          fmtRs(totalCurrentDebit),
          fmtRs(totalCurrentCredit),
          fmtRs(totalClosing),
        ],
      ];

      autoTable(doc, {
        head,
        body,
        startY: 65,
        theme: "grid",
        headStyles: {
          fillColor: [10, 104, 2],
          textColor: 255,
          fontStyle: "bold",
        },
        bodyStyles: {
          fillColor: [241, 252, 240],
          textColor: 0,
        },
        footStyles: {
          fillColor: [10, 104, 2],
          textColor: 255,
          fontStyle: "bold",
        },
        didDrawPage: function (data) {
          const pageSize = doc.internal.pageSize;
          doc.addImage(
            footerImg,
            "JPEG",
            0,
            pageSize.getHeight() - 25,
            pageSize.getWidth(),
            25,
          );
          doc.setFontSize(9);
          doc.text(
            `Page ${data.pageNumber}`,
            pageSize.getWidth() - 40,
            pageSize.getHeight() - 10,
          );
        },
      });

      doc.save("accounts_receivable.pdf");
    }
  };

  const exportInvoicesPDF = (customer: ARCustomer) => {
    const hasDateRange =
      appliedFromDate.trim() !== "" || appliedToDate.trim() !== "";
    const invs = saleInvoices
      .filter((inv) => {
        if (!invoiceMatchesCustomer(inv, customer)) return false;
        if (!hasDateRange) return true;
        if (!inv.invoiceDate) return false;
        return invoiceDateInRange(inv, appliedFromDate, appliedToDate);
      })
      .map((inv) => ({
        invoiceNumber: inv.invoiceNumber ?? "",
        date: inv.invoiceDate?.split("T")[0] ?? "",
        amount: saleInvoiceAmount(inv),
      }));

    const headerUrl = getHeaderImage(brand);
    const footerUrl = getFooterImage(brand);
    const logoUrl = "/Logo.png";
    const logoImg = new window.Image();
    const headerImg = new window.Image();
    const footerImg = new window.Image();
    let loaded = 0;

    function tryDraw() {
      loaded++;
      if (loaded === 3) drawInvoicePDF();
    }

    logoImg.src = logoUrl;
    headerImg.src = headerUrl;
    footerImg.src = footerUrl;
    logoImg.onload = tryDraw;
    headerImg.onload = tryDraw;
    footerImg.onload = tryDraw;
    logoImg.onerror = tryDraw;
    headerImg.onerror = tryDraw;
    footerImg.onerror = tryDraw;

    function drawInvoicePDF() {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();

      doc.addImage(headerImg, "JPEG", 0, 0, pageWidth, 25);
      const logoX = (pageWidth - 40) / 2;
      doc.addImage(logoImg, "PNG", logoX, 27, 40, 20);

      doc.setFontSize(16);
      doc.text(
        `Customer Invoices - ${customer.accountName}`,
        pageWidth / 2,
        52,
        {
          align: "center",
        },
      );
      doc.setFontSize(10);
      doc.text(`Date: ${new Date().toLocaleDateString()}`, pageWidth / 2, 59, {
        align: "center",
      });

      autoTable(doc, {
        head: [["Date", "Invoice No.", "Amount"]],
        body: invs.map((i) => [
          i.date,
          i.invoiceNumber,
          fmtRs(i.amount),
        ]) as RowInput[],
        startY: 65,
        theme: "grid",
        headStyles: {
          fillColor: [10, 104, 2],
          textColor: 255,
          fontStyle: "bold",
        },
        bodyStyles: { fillColor: [241, 252, 240], textColor: 0 },
        didDrawPage: function (data) {
          const ps = doc.internal.pageSize;
          doc.addImage(
            footerImg,
            "JPEG",
            0,
            ps.getHeight() - 25,
            ps.getWidth(),
            25,
          );
          doc.setFontSize(9);
          doc.text(
            `Page ${data.pageNumber}`,
            ps.getWidth() - 40,
            ps.getHeight() - 10,
          );
        },
      });

      doc.save(
        `invoices_${String(customer.accountNumber).replace(/[/\\?%*:|"<>]/g, "-")}.pdf`,
      );
    }
  };

  return (
    <div className="p-6">
      <Group justify="space-between" mb="md">
        <Stack gap={0}>
          <Text size="xl" fw={700} mb="md">
            Accounts Receivable
          </Text>
          <Text c="dimmed">
            {dateRangeActive
              ? "With a date range: invoices outside the range are in opening; in-range invoices are current debit; closing = opening balance + current debit − current credit."
              : "Opening debit/credit from chart of accounts; current debit/credit (last 30 days on the ledger); closing = opening balance + current debit − current credit."}
          </Text>
        </Stack>
        <Button
          leftSection={<Download size={16} />}
          color="#0A6802"
          onClick={exportPDF}
        >
          Export Report
        </Button>
      </Group>

      <Grid mb="md">
        <Grid.Col span={{ base: 12, sm: 6, md: 4 }}>
          <Card shadow="sm" p="md" withBorder bg="#F1FCF0">
            <Group>
              <IconArrowUpRight size={30} color="green" />
              <Stack gap={0}>
                <Text size="sm" c="dimmed">
                  Total closing (receivable)
                </Text>
                <Text fw={700}>{fmtRs(totalClosing)}</Text>
              </Stack>
            </Group>
          </Card>
        </Grid.Col>
      </Grid>

      <Card shadow="sm" p="md" mb="md" withBorder bg="#F1FCF0">
        <Group grow>
          <TextInput
            label="Search account"
            description="Name, code, or e.g. 1410"
            placeholder="Customer name or account number"
            value={search}
            onChange={(e) => setSearch(e.currentTarget.value)}
          />
          <TextInput
            type="date"
            label="From date (invoices)"
            description="Applies after Apply filter"
            value={fromDate}
            onChange={(e) => setFromDate(e.currentTarget.value)}
          />
          <TextInput
            type="date"
            label="To date (invoices)"
            description="Inclusive end date"
            value={toDate}
            onChange={(e) => setToDate(e.currentTarget.value)}
          />
          <Button
            mt={23}
            color="#0A6802"
            leftSection={<Filter size={16} />}
            onClick={applyFilters}
          >
            Apply Filter
          </Button>
        </Group>
      </Card>

      <Card shadow="sm" p="md" mb="md" withBorder bg="#F1FCF0">
        <Stack gap={4} mb="sm">
          <Text fw={600}>Pending invoices</Text>
          <Text size="sm" c="dimmed">
            {dateRangeActive
              ? "Sale invoices within the selected date range."
              : "Sale invoices for customers with an outstanding receivable balance."}
            {pendingInvoices.length > 0 && (
              <>
                {" "}
                {pendingInvoices.length} invoice
                {pendingInvoices.length === 1 ? "" : "s"},{" "}
                {fmtRs(totalPendingInvoices)} total.
              </>
            )}
          </Text>
          {(appliedFromDate || appliedToDate) && (
            <Text size="sm" c="dimmed">
              Date filter: {appliedFromDate || "…"} → {appliedToDate || "…"}
            </Text>
          )}
        </Stack>
        <Table highlightOnHover withTableBorder striped>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Customer</Table.Th>
              <Table.Th>Date</Table.Th>
              <Table.Th>Invoice No.</Table.Th>
              <Table.Th>Amount</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {pendingInvoicesPaginated.map((i) => (
              <Table.Tr key={i.id}>
                <Table.Td>{i.customerName}</Table.Td>
                <Table.Td>{i.date}</Table.Td>
                <Table.Td>{i.invoiceNumber}</Table.Td>
                <Table.Td>{fmtRs(i.amount)}</Table.Td>
              </Table.Tr>
            ))}
            {pendingInvoicesPaginated.length === 0 && (
              <Table.Tr>
                <Table.Td colSpan={4}>
                  <Text c="dimmed" ta="center">
                    No pending invoices match your filters.
                  </Text>
                </Table.Td>
              </Table.Tr>
            )}
          </Table.Tbody>
        </Table>
        {pendingInvoices.length > invoicePageSize && (
          <Group justify="center" mt="md">
            <Pagination
              total={Math.ceil(pendingInvoices.length / invoicePageSize)}
              value={pendingPage}
              onChange={setPendingPage}
              size="sm"
              color="#0A6802"
            />
          </Group>
        )}
      </Card>

      <Card shadow="sm" p="md" withBorder bg="#F1FCF0">
        <Stack gap={4} mb="sm">
          <Text fw={600}>Customer receivables</Text>
          {dateRangeActive && (
            <Text size="sm" c="dimmed">
              Period {appliedFromDate || "…"} → {appliedToDate || "…"} — closing
              = opening balance + current debit − current credit.
            </Text>
          )}
        </Stack>
        <Table highlightOnHover withTableBorder striped>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Customer</Table.Th>
              <Table.Th>Opening debit</Table.Th>
              <Table.Th>Opening credit</Table.Th>
              <Table.Th>Current debit</Table.Th>
              <Table.Th>Current credit</Table.Th>
              <Table.Th>Closing balance</Table.Th>
              <Table.Th>Action</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {paginatedCustomers.map((c) => (
              <Table.Tr key={c.accountNumber}>
                <Table.Td>{c.accountName}</Table.Td>
                <Table.Td>{fmtRs(c.openingDebit)}</Table.Td>
                <Table.Td>{fmtRs(c.openingCredit)}</Table.Td>
                <Table.Td>{fmtRs(c.currentDebit)}</Table.Td>
                <Table.Td>{fmtRs(c.currentCredit)}</Table.Td>
                <Table.Td style={{ fontWeight: 600 }}>
                  {fmtRs(c.closingBalance)}
                </Table.Td>
                <Table.Td>
                  <Group gap="xs">
                    <Button
                      size="xs"
                      color="#0A6802"
                      onClick={() =>
                        setExpandedAccountNumber(
                          expandedAccountNumber === c.accountNumber
                            ? null
                            : c.accountNumber,
                        )
                      }
                    >
                      {expandedAccountNumber === c.accountNumber
                        ? "Hide invoices"
                        : "View invoices"}
                    </Button>
                    <Button
                      size="xs"
                      color="blue"
                      onClick={() => exportInvoicesPDF(c)}
                    >
                      Export invoices
                    </Button>
                  </Group>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>

        <Group justify="center" mt="md">
          <Pagination
            total={Math.ceil(displayCustomers.length / pageSize)}
            value={page}
            onChange={setPage}
            size="sm"
            color="#0A6802"
          />
        </Group>
      </Card>

      {expandedCustomerRow && (
        <Card shadow="sm" p="md" mt="lg" withBorder bg="#F1FCF0">
          <Stack gap={4} mb="sm">
            <Text fw={600}>
              Invoices — {expandedCustomerRow.accountName}
            </Text>
            {(appliedFromDate || appliedToDate) && (
              <Text size="sm" c="dimmed">
                Date filter: {appliedFromDate || "…"} → {appliedToDate || "…"}
              </Text>
            )}
          </Stack>
          <Table highlightOnHover withTableBorder striped>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Date</Table.Th>
                <Table.Th>Invoice No.</Table.Th>
                <Table.Th>Amount</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {expandedInvoicesPaginated.map((i) => (
                <Table.Tr key={i.id}>
                  <Table.Td>{i.date}</Table.Td>
                  <Table.Td>{i.invoiceNumber}</Table.Td>
                  <Table.Td>{fmtRs(i.amount)}</Table.Td>
                </Table.Tr>
              ))}
              {expandedInvoicesPaginated.length === 0 && (
                <Table.Tr>
                  <Table.Td colSpan={3}>
                    <Text c="dimmed" ta="center">
                      No invoices found.
                    </Text>
                  </Table.Td>
                </Table.Tr>
              )}
            </Table.Tbody>
          </Table>

          <Group justify="center" mt="md">
            <Pagination
              total={Math.ceil(expandedInvoices.length / invoicePageSize)}
              value={invoicePage}
              onChange={setInvoicePage}
              size="sm"
              color="#0A6802"
            />
          </Group>
        </Card>
      )}
    </div>
  );
}
