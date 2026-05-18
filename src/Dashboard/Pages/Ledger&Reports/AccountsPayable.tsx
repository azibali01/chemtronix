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
import { IconArrowDown } from "@tabler/icons-react";

type APVendor = {
  accountNumber: string;
  accountName: string;
  openingDebit: number;
  openingCredit: number;
  currentDebit: number;
  currentCredit: number;
  closingBalance: number;
};

type PurchaseInvoiceLine = {
  price?: number;
  unit?: number;
  qty?: number | string;
  rate?: number | string;
};

type PurchaseInvoice = {
  _id?: string;
  invoiceNo?: string;
  invoiceNumber?: string;
  partyBillNumber?: string;
  invoiceDate?: string;
  partyBillDate?: string;
  date?: string;
  supplier?: { name?: string; code?: number | string };
  purchaseAccount?: string;
  purchaseTitle?: string;
  grandTotal?: number;
  totalAmount?: number;
  products?: PurchaseInvoiceLine[];
  items?: PurchaseInvoiceLine[];
};

type BillRow = {
  id: string;
  invoiceNumber: string;
  date: string;
  amount: number;
};

type PendingBillRow = BillRow & {
  vendorName: string;
  accountNumber: string;
};

function purchaseInvoiceAmount(inv: PurchaseInvoice): number {
  const lineTotal = (lines: PurchaseInvoiceLine[]) =>
    lines.reduce((s, p) => {
      const price = Number(p.price) || Number(p.rate) || 0;
      const qty = Number(p.unit) || Number(p.qty) || 0;
      return s + price * qty;
    }, 0);

  return (
    Number(inv.grandTotal) ||
    Number(inv.totalAmount) ||
    lineTotal(inv.products ?? []) ||
    lineTotal(inv.items ?? [])
  );
}

function fmtRs(n: number) {
  return `Rs. ${Math.abs(Number(n) || 0).toLocaleString()}`;
}

function normalizeName(s: string | undefined): string {
  return String(s ?? "")
    .trim()
    .toLowerCase();
}

function normalizeAccountCode(s: string | undefined): string {
  return String(s ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "");
}

function purchaseInvoiceMatchesVendor(
  inv: PurchaseInvoice,
  vendor: APVendor,
): boolean {
  const supplier = normalizeName(inv.supplier?.name);
  const title = normalizeName(inv.purchaseTitle);
  const vName = normalizeName(vendor.accountName);
  const vCode = String(vendor.accountNumber ?? "")
    .trim()
    .toLowerCase();
  const purchaseAcct = String(inv.purchaseAccount ?? "")
    .trim()
    .toLowerCase();
  if (supplier && vName && supplier === vName) return true;
  if (title && vName && title === vName) return true;
  if (purchaseAcct && vCode) {
    const vHead = vCode.split("-")[0] ?? vCode;
    const pHead = purchaseAcct.split("-")[0] ?? purchaseAcct;
    if (
      purchaseAcct === vCode ||
      purchaseAcct.startsWith(vHead) ||
      vCode.startsWith(pHead)
    )
      return true;
  }
  if (supplier && vName && (supplier.includes(vName) || vName.includes(supplier)))
    return true;
  return false;
}

function vendorMatchesSearch(v: APVendor, q: string): boolean {
  const query = q.trim().toLowerCase();
  if (!query) return true;
  const name = (v.accountName || "").toLowerCase();
  const num = String(v.accountNumber || "").toLowerCase();
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

function parseLocalDateEndOfDay(ymd: string): Date | null {
  if (!ymd) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd.trim());
  if (!m) return null;
  const dt = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 23, 59, 59, 999);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

function parseLocalDateStartOfDay(ymd: string): Date | null {
  if (!ymd) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd.trim());
  if (!m) return null;
  const dt = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 0, 0, 0, 0);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

function billDateInRange(inv: PurchaseInvoice, fromYmd: string, toYmd: string): boolean {
  const dateStr = inv.invoiceDate ?? inv.partyBillDate ?? inv.date;
  if (!dateStr) return false;
  const d = new Date(dateStr);
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

/** Net opening payable (credit − debit). */
function openingBalanceNet(v: APVendor): number {
  return (Number(v.openingCredit) || 0) - (Number(v.openingDebit) || 0);
}

/** Net current-period payable (credit − debit). */
function currentBalanceNet(v: APVendor): number {
  return (Number(v.currentCredit) || 0) - (Number(v.currentDebit) || 0);
}

/** Amount still owed: opening balance + current credit − current debit. */
function closingPayable(v: APVendor): number {
  return (
    openingBalanceNet(v) +
    (Number(v.currentCredit) || 0) -
    (Number(v.currentDebit) || 0)
  );
}

function adjustVendorBalancesForDateRange(
  vendor: APVendor,
  invoices: PurchaseInvoice[],
  fromYmd: string,
  toYmd: string,
): APVendor {
  const vendorBills = invoices.filter((inv) =>
    purchaseInvoiceMatchesVendor(inv, vendor),
  );

  let outOfRangeCredit = 0;
  let inRangeCredit = 0;

  for (const inv of vendorBills) {
    const amt = purchaseInvoiceAmount(inv);
    const dateStr = inv.invoiceDate ?? inv.partyBillDate ?? inv.date;
    if (!dateStr) {
      outOfRangeCredit += amt;
      continue;
    }
    if (billDateInRange(inv, fromYmd, toYmd)) {
      inRangeCredit += amt;
    } else {
      outOfRangeCredit += amt;
    }
  }

  const adjusted: APVendor = {
    ...vendor,
    openingDebit: Number(vendor.openingDebit) || 0,
    openingCredit: (Number(vendor.openingCredit) || 0) + outOfRangeCredit,
    currentDebit: Number(vendor.currentDebit) || 0,
    currentCredit: inRangeCredit,
    closingBalance: 0,
  };
  adjusted.closingBalance = closingPayable(adjusted);
  return adjusted;
}

function vendorRowFromInvoice(
  inv: PurchaseInvoice,
  invoices: PurchaseInvoice[],
): APVendor | null {
  const title = (inv.supplier?.name ?? inv.purchaseTitle ?? "").trim();
  const code = String(inv.purchaseAccount ?? "").trim();
  if (!title && !code) return null;

  const base: APVendor = {
    accountNumber: code || title,
    accountName: title || code,
    openingDebit: 0,
    openingCredit: 0,
    currentDebit: 0,
    currentCredit: 0,
    closingBalance: 0,
  };

  const related = invoices.filter((i) => purchaseInvoiceMatchesVendor(i, base));
  if (related.length === 0) return null;
  return base;
}

export default function AccountsPayable() {
  const { brand } = useBrand();
  const [apData, setApData] = useState<APVendor[]>([]);
  const [purchaseInvoices, setPurchaseInvoices] = useState<PurchaseInvoice[]>([]);

  const [page, setPage] = useState(1);
  const [billPage, setBillPage] = useState(1);
  const [pendingPage, setPendingPage] = useState(1);
  const [expandedAccountNumber, setExpandedAccountNumber] = useState<string | null>(
    null,
  );
  const [search, setSearch] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [appliedFromDate, setAppliedFromDate] = useState("");
  const [appliedToDate, setAppliedToDate] = useState("");

  const pageSize = 5;
  const billsPerPage = 5;

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [apRes, invRes] = await Promise.all([
          api.get("/reports/accounts-payable"),
          api.get("/purchase-invoice/all-purchase-invoices"),
        ]);
        setApData(Array.isArray(apRes.data) ? apRes.data : []);
        setPurchaseInvoices(Array.isArray(invRes.data) ? invRes.data : []);
      } catch (e) {
        console.error("Failed to fetch AP data:", e);
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
    setBillPage(1);
    setPendingPage(1);
  };

  const dateRangeActive = hasAppliedDateRange(appliedFromDate, appliedToDate);

  const displayVendors = useMemo(() => {
    const searched = apData.filter((v) => vendorMatchesSearch(v, search));

    if (!dateRangeActive) {
      return searched.map((v) => ({
        ...v,
        closingBalance: closingPayable(v),
      }));
    }

    const adjusted = searched.map((v) => {
      const row = adjustVendorBalancesForDateRange(
        v,
        purchaseInvoices,
        appliedFromDate,
        appliedToDate,
      );
      return { ...row, closingBalance: closingPayable(row) };
    });

    const seenKeys = new Set(
      adjusted.map((v) => normalizeAccountCode(v.accountNumber)),
    );

    for (const inv of purchaseInvoices) {
      const inAp = apData.some((v) => purchaseInvoiceMatchesVendor(inv, v));
      if (inAp) continue;

      const row = vendorRowFromInvoice(inv, purchaseInvoices);
      if (!row || !vendorMatchesSearch(row, search)) continue;
      const key = normalizeAccountCode(row.accountNumber);
      if (seenKeys.has(key)) continue;
      seenKeys.add(key);

      adjusted.push(
        adjustVendorBalancesForDateRange(
          row,
          purchaseInvoices,
          appliedFromDate,
          appliedToDate,
        ),
      );
    }

    return adjusted.filter(
      (v) =>
        v.closingBalance > 0 ||
        currentBalanceNet(v) > 0 ||
        openingBalanceNet(v) > 0,
    );
  }, [
    apData,
    purchaseInvoices,
    search,
    dateRangeActive,
    appliedFromDate,
    appliedToDate,
  ]);

  const expandedVendorRow = useMemo(
    () =>
      expandedAccountNumber
        ? (displayVendors.find((v) => v.accountNumber === expandedAccountNumber) ??
          null)
        : null,
    [displayVendors, expandedAccountNumber],
  );

  useEffect(() => {
    setBillPage(1);
  }, [expandedAccountNumber, appliedFromDate, appliedToDate]);

  useEffect(() => {
    if (!expandedAccountNumber) return;
    const stillInView = displayVendors.some(
      (v) => v.accountNumber === expandedAccountNumber,
    );
    if (!stillInView) setExpandedAccountNumber(null);
  }, [displayVendors, expandedAccountNumber]);

  useEffect(() => {
    setPage(1);
  }, [dateRangeActive, appliedFromDate, appliedToDate]);

  const paginatedVendors = displayVendors.slice(
    (page - 1) * pageSize,
    page * pageSize,
  );

  const totalClosing = displayVendors.reduce(
    (s, v) => s + (Number(v.closingBalance) || 0),
    0,
  );
  const totalOpeningDebit = displayVendors.reduce(
    (s, v) => s + (Number(v.openingDebit) || 0),
    0,
  );
  const totalOpeningCredit = displayVendors.reduce(
    (s, v) => s + (Number(v.openingCredit) || 0),
    0,
  );
  const totalCurrentDebit = displayVendors.reduce(
    (s, v) => s + (Number(v.currentDebit) || 0),
    0,
  );
  const totalCurrentCredit = displayVendors.reduce(
    (s, v) => s + (Number(v.currentCredit) || 0),
    0,
  );

  const pendingBills = useMemo<PendingBillRow[]>(() => {
    const q = search.trim().toLowerCase();

    return purchaseInvoices
      .filter((inv) => {
        const vendor =
          displayVendors.find((v) => purchaseInvoiceMatchesVendor(inv, v)) ??
          apData.find((v) => purchaseInvoiceMatchesVendor(inv, v));
        if (!vendor) return false;
        if (dateRangeActive) {
          if (!billDateInRange(inv, appliedFromDate, appliedToDate)) return false;
        }
        if (!q) return true;
        const billNo = (
          inv.partyBillNumber ??
          (typeof inv.invoiceNumber === "string" ? inv.invoiceNumber : "") ??
          inv.invoiceNo ??
          ""
        )
          .toString()
          .toLowerCase();
        const vName = (vendor.accountName ?? "").toLowerCase();
        const vNum = String(vendor.accountNumber ?? "").toLowerCase();
        const supplier = (inv.supplier?.name ?? "").toLowerCase();
        return (
          vName.includes(q) ||
          vNum.includes(q) ||
          supplier.includes(q) ||
          billNo.includes(q)
        );
      })
      .map((inv) => {
        const vendor =
          displayVendors.find((v) => purchaseInvoiceMatchesVendor(inv, v)) ??
          apData.find((v) => purchaseInvoiceMatchesVendor(inv, v))!;
        const dateStr = inv.invoiceDate ?? inv.partyBillDate ?? inv.date ?? "";
        return {
          id: inv._id ?? `${inv.partyBillNumber}-${dateStr}`,
          invoiceNumber:
            inv.partyBillNumber ??
            (typeof inv.invoiceNumber === "string" ? inv.invoiceNumber : "") ??
            inv.invoiceNo ??
            "",
          date: dateStr ? dateStr.split("T")[0] : "",
          amount: purchaseInvoiceAmount(inv),
          vendorName: vendor.accountName,
          accountNumber: vendor.accountNumber,
        };
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [
    purchaseInvoices,
    apData,
    displayVendors,
    dateRangeActive,
    appliedFromDate,
    appliedToDate,
    search,
  ]);

  const pendingBillsPaginated = pendingBills.slice(
    (pendingPage - 1) * billsPerPage,
    pendingPage * billsPerPage,
  );

  const totalPendingBills = pendingBills.reduce((s, i) => s + i.amount, 0);

  const expandedBills = useMemo<BillRow[]>(() => {
    if (!expandedVendorRow) return [];
    const hasRange =
      appliedFromDate.trim() !== "" || appliedToDate.trim() !== "";

    return purchaseInvoices
      .filter((inv) => {
        if (!purchaseInvoiceMatchesVendor(inv, expandedVendorRow)) return false;
        if (!hasRange) return true;
        return billDateInRange(inv, appliedFromDate, appliedToDate);
      })
      .map((inv) => {
        const dateStr = inv.invoiceDate ?? inv.partyBillDate ?? inv.date ?? "";
        return {
          id: inv._id ?? "",
          invoiceNumber:
            inv.partyBillNumber ??
            (typeof inv.invoiceNumber === "string" ? inv.invoiceNumber : "") ??
            inv.invoiceNo ??
            "",
          date: dateStr ? dateStr.split("T")[0] : "",
          amount: purchaseInvoiceAmount(inv),
        };
      });
  }, [expandedVendorRow, purchaseInvoices, appliedFromDate, appliedToDate]);

  const expandedBillsPaginated = expandedBills.slice(
    (billPage - 1) * billsPerPage,
    billPage * billsPerPage,
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
      if (loaded === 3) drawPDF();
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
      const logoX = (pageWidth - 40) / 2;
      doc.addImage(logoImg, "PNG", logoX, 27, 40, 20);

      doc.setFontSize(16);
      doc.text("Accounts Payable Report", pageWidth / 2, 52, { align: "center" });
      doc.setFontSize(10);
      doc.text(`Date: ${new Date().toLocaleDateString()}`, pageWidth / 2, 59, {
        align: "center",
      });

      autoTable(doc, {
        head: [
          [
            "Vendor",
            "Opening Dr",
            "Opening Cr",
            "Current Dr",
            "Current Cr",
            "Closing (owed)",
          ],
        ],
        body: [
          ...displayVendors.map((v) => [
            v.accountName,
            fmtRs(v.openingDebit),
            fmtRs(v.openingCredit),
            fmtRs(v.currentDebit),
            fmtRs(v.currentCredit),
            fmtRs(v.closingBalance),
          ]),
          [
            { content: "Totals", styles: { fontStyle: "bold" } },
            fmtRs(totalOpeningDebit),
            fmtRs(totalOpeningCredit),
            fmtRs(totalCurrentDebit),
            fmtRs(totalCurrentCredit),
            fmtRs(totalClosing),
          ],
        ] as RowInput[],
        startY: 65,
        theme: "grid",
        headStyles: {
          fillColor: [10, 104, 2],
          textColor: 255,
          fontStyle: "bold",
        },
        bodyStyles: { fillColor: [241, 252, 240], textColor: 0 },
        didDrawPage(data) {
          const ps = doc.internal.pageSize;
          doc.addImage(footerImg, "JPEG", 0, ps.getHeight() - 25, ps.getWidth(), 25);
          doc.setFontSize(9);
          doc.text(
            `Page ${data.pageNumber}`,
            ps.getWidth() - 40,
            ps.getHeight() - 10,
          );
        },
      });

      doc.save("accounts_payable.pdf");
    }
  };

  const exportBillsPDF = (vendor: APVendor) => {
    const bills = expandedBills.length
      ? expandedBills
      : purchaseInvoices
          .filter((inv) => purchaseInvoiceMatchesVendor(inv, vendor))
          .map((inv) => {
            const dateStr = inv.invoiceDate ?? inv.partyBillDate ?? inv.date ?? "";
            return {
              id: inv._id ?? "",
              invoiceNumber:
                inv.partyBillNumber ??
                (typeof inv.invoiceNumber === "string" ? inv.invoiceNumber : "") ??
                inv.invoiceNo ??
                "",
              date: dateStr ? dateStr.split("T")[0] : "",
              amount: purchaseInvoiceAmount(inv),
            };
          });

    const headerUrl = getHeaderImage(brand);
    const footerUrl = getFooterImage(brand);
    const logoImg = new window.Image();
    const headerImg = new window.Image();
    const footerImg = new window.Image();
    let loaded = 0;
    function tryDraw() {
      loaded++;
      if (loaded === 3) drawPDF();
    }
    logoImg.src = "/Logo.png";
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
      doc.addImage(logoImg, "PNG", (pageWidth - 40) / 2, 27, 40, 20);
      doc.setFontSize(16);
      doc.text(`Vendor Bills - ${vendor.accountName}`, pageWidth / 2, 52, {
        align: "center",
      });

      autoTable(doc, {
        head: [["Date", "Bill No.", "Amount"]],
        body: bills.map((b) => [b.date, b.invoiceNumber, fmtRs(b.amount)]) as RowInput[],
        startY: 65,
        theme: "grid",
        headStyles: { fillColor: [10, 104, 2], textColor: 255, fontStyle: "bold" },
        bodyStyles: { fillColor: [241, 252, 240], textColor: 0 },
      });

      doc.save(
        `bills_${String(vendor.accountNumber).replace(/[/\\?%*:|"<>]/g, "-")}.pdf`,
      );
    }
  };

  return (
    <div className="p-6">
      <Group justify="space-between" mb="md">
        <Stack gap={0}>
          <Text size="xl" fw={700}>
            Accounts Payable
          </Text>
          <Text c="dimmed" size="sm">
            {dateRangeActive
              ? "With a date range: bills outside the range are in opening credit; in-range bills are current credit; closing = opening balance + current credit − current debit (amount we still owe)."
              : "Vendors with pending payments from the company. Closing = opening balance + current credit − current debit."}
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
              <IconArrowDown size={30} color="red" />
              <Stack gap={0}>
                <Text size="sm" c="dimmed">
                  Total closing (payable)
                </Text>
                <Text fw={700} c="red">
                  {fmtRs(totalClosing)}
                </Text>
              </Stack>
            </Group>
          </Card>
        </Grid.Col>
      </Grid>

      <Card shadow="sm" p="md" mb="md" withBorder bg="#F1FCF0">
        <Group grow>
          <TextInput
            label="Search vendor"
            description="Name, code, or bill number"
            placeholder="Vendor name or account"
            value={search}
            onChange={(e) => setSearch(e.currentTarget.value)}
          />
          <TextInput
            type="date"
            label="From date (bills)"
            description="Applies after Apply filter"
            value={fromDate}
            onChange={(e) => setFromDate(e.currentTarget.value)}
          />
          <TextInput
            type="date"
            label="To date (bills)"
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
          <Text fw={600}>Pending bills (amount owed)</Text>
          <Text size="sm" c="dimmed">
            {dateRangeActive
              ? "Purchase bills within the selected date range."
              : "Bills for vendors we still owe (positive closing balance)."}
            {pendingBills.length > 0 && (
              <>
                {" "}
                {pendingBills.length} bill
                {pendingBills.length === 1 ? "" : "s"}, {fmtRs(totalPendingBills)}{" "}
                total.
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
              <Table.Th>Vendor</Table.Th>
              <Table.Th>Date</Table.Th>
              <Table.Th>Bill / Invoice No.</Table.Th>
              <Table.Th>Amount</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {pendingBillsPaginated.map((b) => (
              <Table.Tr key={b.id}>
                <Table.Td>{b.vendorName}</Table.Td>
                <Table.Td>{b.date}</Table.Td>
                <Table.Td>{b.invoiceNumber}</Table.Td>
                <Table.Td c="red">{fmtRs(b.amount)}</Table.Td>
              </Table.Tr>
            ))}
            {pendingBillsPaginated.length === 0 && (
              <Table.Tr>
                <Table.Td colSpan={4}>
                  <Text c="dimmed" ta="center">
                    No pending bills match your filters.
                  </Text>
                </Table.Td>
              </Table.Tr>
            )}
          </Table.Tbody>
        </Table>
        {pendingBills.length > billsPerPage && (
          <Group justify="center" mt="md">
            <Pagination
              total={Math.ceil(pendingBills.length / billsPerPage)}
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
          <Text fw={600}>Vendor payables</Text>
          {dateRangeActive && (
            <Text size="sm" c="dimmed">
              Period {appliedFromDate || "…"} → {appliedToDate || "…"} — closing
              = opening balance + current credit − current debit.
            </Text>
          )}
        </Stack>
        <Table highlightOnHover withTableBorder striped>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Vendor</Table.Th>
              <Table.Th>Opening debit</Table.Th>
              <Table.Th>Opening credit</Table.Th>
              <Table.Th>Current debit</Table.Th>
              <Table.Th>Current credit</Table.Th>
              <Table.Th>Closing balance</Table.Th>
              <Table.Th>Action</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {paginatedVendors.map((v) => (
              <Table.Tr key={v.accountNumber}>
                <Table.Td>{v.accountName}</Table.Td>
                <Table.Td>{fmtRs(v.openingDebit)}</Table.Td>
                <Table.Td>{fmtRs(v.openingCredit)}</Table.Td>
                <Table.Td>{fmtRs(v.currentDebit)}</Table.Td>
                <Table.Td>{fmtRs(v.currentCredit)}</Table.Td>
                <Table.Td c="red" style={{ fontWeight: 600 }}>
                  {fmtRs(v.closingBalance)}
                </Table.Td>
                <Table.Td>
                  <Group gap="xs">
                    <Button
                      size="xs"
                      color="#0A6802"
                      onClick={() =>
                        setExpandedAccountNumber(
                          expandedAccountNumber === v.accountNumber
                            ? null
                            : v.accountNumber,
                        )
                      }
                    >
                      {expandedAccountNumber === v.accountNumber
                        ? "Hide bills"
                        : "View bills"}
                    </Button>
                    <Button
                      size="xs"
                      color="blue"
                      onClick={() => exportBillsPDF(v)}
                    >
                      Export bills
                    </Button>
                  </Group>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>

        <Group justify="center" mt="md">
          <Pagination
            total={Math.ceil(displayVendors.length / pageSize)}
            value={page}
            onChange={setPage}
            size="sm"
            color="#0A6802"
          />
        </Group>
      </Card>

      {expandedVendorRow && (
        <Card shadow="sm" p="md" mt="lg" withBorder bg="#F1FCF0">
          <Stack gap={4} mb="sm">
            <Text fw={600}>Bills — {expandedVendorRow.accountName}</Text>
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
                <Table.Th>Bill No.</Table.Th>
                <Table.Th>Amount</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {expandedBillsPaginated.map((b) => (
                <Table.Tr key={b.id}>
                  <Table.Td>{b.date}</Table.Td>
                  <Table.Td>{b.invoiceNumber}</Table.Td>
                  <Table.Td c="red">{fmtRs(b.amount)}</Table.Td>
                </Table.Tr>
              ))}
              {expandedBillsPaginated.length === 0 && (
                <Table.Tr>
                  <Table.Td colSpan={3}>
                    <Text c="dimmed" ta="center">
                      No bills found.
                    </Text>
                  </Table.Td>
                </Table.Tr>
              )}
            </Table.Tbody>
          </Table>

          <Group justify="center" mt="md">
            <Pagination
              total={Math.ceil(expandedBills.length / billsPerPage)}
              value={billPage}
              onChange={setBillPage}
              size="sm"
              color="#0A6802"
            />
          </Group>
        </Card>
      )}
    </div>
  );
}