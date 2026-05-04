import { useState, useRef, useEffect } from "react";
import { useBrand } from "../../Context/BrandContext";
import { getHeaderImage, getFooterImage } from "../../../utils/assetPaths";
import {
  Card,
  Text,
  Group,
  Button,
  Table,
  Modal,
  TextInput,
  ActionIcon,
  NumberInput,
  Textarea,
  Select,
  Pagination,
} from "@mantine/core";
import {
  IconPlus,
  IconTrash,
  IconPencil,
  IconSearch,
  IconDownload,
  IconX,
} from "@tabler/icons-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useSalesInvoice } from "../../Context/Invoicing/SalesInvoiceContext";
import { useChartOfAccounts } from "../../Context/ChartOfAccountsContext";
import api from "../../../api_configuration/api";
import { notifications } from "@mantine/notifications";
import { useDebounce } from "../../../hooks/useDebounce";

export interface InvoiceItem {
  id: string;
  code: string;
  product: string;
  hsCode: string;
  description: string;
  qty: number;
  rate: number;
  exGSTRate: number;
  exGSTAmount: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  deliveryNumber?: string;
  deliveryDate?: string;
  poNumber?: string;
  poDate?: string;
  accountNumber?: string;
  accountTitle: string;
  saleAccount?: string;
  saleAccountTitle?: string;
  ntnNumber?: string;
  strnNumber?: string;
  amount: number;
  netAmount?: number;
  province?: "Punjab" | "Sindh";
  items?: InvoiceItem[];
  isChallanGenerated?: boolean;
}

import type { AccountNode as ChartAccountNode } from "../../Context/ChartOfAccountsContext";
import { getReceivableAccounts } from "../../utils/receivableAccounts";
type AccountNode = ChartAccountNode;

const saleAccountTitleMap: Record<string, string> = {
  "4114": "Sale Of Chemicals and Equipments",
  "4112": "Sale Of Equipments",
  "4111": "Sales Of Chemicals",
  "4113": "Services",
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
  if (type === "Services") {
    return province === "Punjab" ? 16 : 15;
  }
  return 18;
}

function addHeaderFooter(doc: jsPDF, title: string) {
  doc.setFontSize(18);
  doc.text("CHEMTRONIX ENGINEERING SOLUTION", 14, 14);
  doc.setFontSize(12);
  doc.text(title, 14, 24);

  const pageHeight = doc.internal.pageSize.height || 297;
  doc.setFontSize(10);
  doc.text(
    "*Computer generated invoice. No need for signature",
    14,
    pageHeight - 20,
  );
  doc.setFontSize(11);
  doc.text(
    "HEAD OFFICE: 552 Mujtaba Canal View, Main Qasimpur Canal Road, Multan",
    14,
    pageHeight - 14,
  );
  doc.text(
    "PLANT SITE: 108-1 Tufailabad Industrial Estate Multan",
    14,
    pageHeight - 8,
  );
}

function PrintableInvoice({ invoice }: { invoice: Invoice | null }) {
  const { brand } = useBrand();
  if (!invoice) return <div>No invoice to print</div>;
  return (
    <div
      style={{
        padding: 24,
        fontFamily: "Arial",
        background: "#fff",
        color: "#222",
      }}
    >
      {/* Header banner */}
      <div style={{ marginBottom: 12, padding: 0 }}>
        <img
          src={getHeaderImage(brand)}
          alt="Header"
          style={{
            display: "block",
            width: "calc(100% + 48px)",
            marginLeft: -24,
            height: "auto",
            maxHeight: 120,
            objectFit: "contain",
          }}
        />
      </div>

      <h2>Invoice #{invoice.invoiceNumber}</h2>
      <p>Date: {invoice.invoiceDate}</p>
      <p>Account: {invoice.accountTitle}</p>
      <p>Amount: PKR {invoice.amount?.toFixed(2)}</p>

      {/* Footer banner */}
      <div style={{ marginTop: 18 }}>
        <img
          src={getFooterImage(brand)}
          alt="Footer"
          style={{ width: "100%", height: "auto" }}
        />
      </div>
    </div>
  );
}

// getNextInvoiceNumber is imported from utils/invoice

// (Removed duplicate/unused getSalesAccounts function)

import { getNextInvoiceNumber, mapRawToInvoice } from "../../../utils/invoice";

type FieldErrors = Record<string, string>;

/**
 * Splits NestJS class-validator messages into field-level errors
 * (e.g. "invoiceDate must be a valid date") and global errors
 * (e.g. "Insufficient stock").
 */
function parseValidationMessages(messages: string[]): {
  fieldErrors: FieldErrors;
  globalErrors: string[];
} {
  const fieldErrors: FieldErrors = {};
  const globalErrors: string[] = [];
  for (const msg of messages) {
    const match = msg.match(/^([\.\w\[\]]+)\s+(must|should)/i);
    if (match) {
      fieldErrors[match[1]] = msg;
    } else {
      globalErrors.push(msg);
    }
  }
  return { fieldErrors, globalErrors };
}

function extractError(error: unknown, fallback: string): string {
  const msg = (error as { response?: { data?: { message?: unknown } } })
    ?.response?.data?.message;
  if (Array.isArray(msg)) return msg.join(", ");
  if (typeof msg === "string" && msg) return msg;
  return fallback;
}

export default function SalesInvoicePage() {
  const { brand } = useBrand();
  // Always fetch latest Chart of Accounts on mount
  // get both accounts and setter from context
  const { accounts, setAccounts } = useChartOfAccounts();
  // get invoices state from SalesInvoice context
  const { invoices, setInvoices, search, isLoading } = useSalesInvoice();
  // local loading flag for invoices fetch
  const [invoicesLoading, setInvoicesLoading] = useState(false);
  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        const res = await api.get("/chart-of-account");
        if (Array.isArray(res.data)) {
          setAccounts(res.data);
        }
      } catch {
        setAccounts([]);
      }
    };
    fetchAccounts();
  }, [setAccounts]);
  // Debug: log only Revenue accounts when accounts change
  useEffect(() => {
    const allRevenueAccounts: AccountNode[] = [];
    function collectRevenueAccounts(nodes: AccountNode[]) {
      if (!Array.isArray(nodes)) return;
      nodes.forEach((node) => {
        if (!node) return;
        if (String(node.accountType) === "REVENUE") {
          allRevenueAccounts.push(node);
        }
        if (node.children && node.children.length > 0) {
          collectRevenueAccounts(node.children);
        }
      });
    }
    collectRevenueAccounts(accounts);
    console.log("All Revenue accounts:", allRevenueAccounts);
  }, [accounts]);
  const printRef = useRef<HTMLDivElement>(null);

  // Debug: log only Revenue accounts when accounts change

  // Field-level validation errors from backend (class-validator)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const [editInvoice, setEditInvoice] = useState<Invoice | null>(null);
  const [deleteInvoice, setDeleteInvoice] = useState<Invoice | null>(null);
  // Removed: Convert to Delivery Challan state
  const [searchInput, setSearchInput] = useState("");
  const debouncedSearchTerm = useDebounce(searchInput, 300);
  const [createModal, setCreateModal] = useState(false);
  const [newInvoiceNumber, setNewInvoiceNumber] = useState(
    getNextInvoiceNumber(invoices),
  );
  const [newInvoiceDate, setNewInvoiceDate] = useState(() => {
    const today = new Date();
    return today.toISOString().slice(0, 10);
  });
  const [newDeliveryNumber, setNewDeliveryNumber] = useState("");
  const [newDeliveryDate, setNewDeliveryDate] = useState("");
  const [newPoNumber, setNewPoNumber] = useState("");
  const [newPoDate, setNewPoDate] = useState("");
  const [newAccountNumber, setNewAccountNumber] = useState("");
  const [newAccountTitle, setNewAccountTitle] = useState("");
  const [newSaleAccount, setNewSaleAccount] = useState("");
  const [newSaleAccountTitle, setNewSaleAccountTitle] = useState("");
  const [newNtnNumber, setNewNtnNumber] = useState("");
  const [newStrnNumber, setNewStrnNumber] = useState("");

  // Helper: When account number or title changes, auto-populate NTN/STRN
  useEffect(() => {
    // Try to find the selected account by account number or title
    let selected: AccountNode | undefined = undefined;
    if (newAccountNumber) {
      selected = accounts.find(
        (acc) =>
          String(acc.accountCode) === String(newAccountNumber) ||
          String(acc.selectedCode) === String(newAccountNumber),
      );
    } else if (newAccountTitle) {
      selected = accounts.find((acc) => acc.accountName === newAccountTitle);
    }
    if (selected) {
      setNewNtnNumber(selected.ntn || "");
      setNewStrnNumber(selected.strn || "");
    } else {
      setNewNtnNumber("");
      setNewStrnNumber("");
    }
  }, [newAccountNumber, newAccountTitle, accounts]);
  const [province, setProvince] = useState<"Punjab" | "Sindh">("Punjab");

  // Handle debounced search
  useEffect(() => {
    if (debouncedSearchTerm.trim()) {
      search(debouncedSearchTerm);
    } else {
      // Reset to show all invoices when search is cleared
      // Fetch all invoices
      const fetchAllInvoices = async () => {
        try {
          setInvoicesLoading(true);
          const response = await api.get("/sale-invoice");
          setInvoices(response.data);
        } catch (error) {
          console.error("Failed to fetch invoices:", error);
        } finally {
          setInvoicesLoading(false);
        }
      };
      fetchAllInvoices();
    }
  }, [debouncedSearchTerm]);

  const [items, setItems] = useState<InvoiceItem[]>([
    {
      id: "1",
      code: "",
      product: "",
      hsCode: "",
      description: "",
      qty: 0,
      rate: 0,
      exGSTRate: 0,
      exGSTAmount: 0,
    },
  ]);
  const [notes, setNotes] = useState("");
  const [pageSize, setPageSize] = useState(8);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [page, setPage] = useState(1);

  const [currentInvoiceForPrint, setCurrentInvoiceForPrint] =
    useState<Invoice | null>(null);

  const [productCodes, setProductCodes] = useState<
    {
      value: string;
      label: string;
      productName: string;
      description: string;
      rate: number;
    }[]
  >([]);

  const subtotal = items.reduce(
    (acc: number, i: InvoiceItem) => acc + i.qty * i.rate,
    0,
  );

  // Compute GST per-item using HS code + province via getTaxRate (keeps variable names consistent)
  const exGstAmount = items.reduce(
    (acc: number, i: InvoiceItem) =>
      acc + (i.qty * i.rate * getTaxRate(i.hsCode, province)) / 100,
    0,
  );

  const gstAmount = exGstAmount;

  const netTotal = subtotal + gstAmount;

  // totalGst (sum of percentages) was confusing in the UI; keep it if needed elsewhere
  const totalGst = items.reduce(
    (acc: number, i: InvoiceItem) => acc + getTaxRate(i.hsCode, province),
    0,
  );

  useEffect(() => {
    fetchSalesInvoices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    interface Product {
      code: string;
      productName?: string;
      name?: string;
      productDescription?: string;
      description?: string;
      unitPrice?: number;
    }
    const fetchProductCodes = async () => {
      try {
        const res = await api.get("/products");
        if (Array.isArray(res.data)) {
          setProductCodes(
            res.data.map((p: Product) => ({
              value: p.code,
              label: `${p.code} - ${p.productName || p.name || ""}`,
              productName: p.productName || p.name || "",
              description: p.productDescription || p.description || "",
              rate: p.unitPrice || 0,
            })),
          );
        }
      } catch {
        setProductCodes([]);
      }
    };
    fetchProductCodes();
  }, []);

  const salesAccountOptions = getSalesAccounts(accounts)
    .sort((a, b) => a.label.localeCompare(b.label))
    .map((a) => ({
      ...a,
      value: a.code && a.accountName ? `${a.code}-${a.accountName}` : a.value,
    }));

  useEffect(() => {
    // (console.log removed)
  }, [accounts, salesAccountOptions]);

  const fetchSalesInvoices = async () => {
    setInvoicesLoading(true);
    try {
      const response = await api.get("/sale-invoice");
      // Map backend 'products' to frontend 'items' for table compatibility
      const mapped = Array.isArray(response.data)
        ? (response.data as unknown[]).map((invRaw) =>
            mapRawToInvoice(invRaw as Record<string, unknown>),
          )
        : [];
      setInvoices(mapped);
      // update the generated invoice number from the latest invoices
      setNewInvoiceNumber(getNextInvoiceNumber(mapped));
      return mapped;
    } catch (error) {
      console.error("Error fetching sales invoices:", error);
      notifications.show({
        title: "Error",
        message: "Failed to fetch sales invoices",
        color: "red",
      });
      return [] as Invoice[];
    } finally {
      setInvoicesLoading(false);
    }
  };

  const createSalesInvoice = async () => {
    try {
      if (!newInvoiceNumber || !newInvoiceDate || !newAccountTitle) {
        notifications.show({
          title: "Validation Error",
          message: "Please fill in all required fields",
          color: "red",
        });
        return;
      }

      const payload = {
        computerNumber: newInvoiceNumber,
        invoiceNumber: newInvoiceNumber,
        invoiceDate: newInvoiceDate,
        deliveryNumber: newDeliveryNumber || undefined,
        deliveryDate: newDeliveryDate || undefined,
        poNumber: newPoNumber || undefined,
        poDate: newPoDate || undefined,
        account: newAccountNumber,
        accountTitle: newAccountTitle,
        saleAccount: newSaleAccount,
        saleAccountTitle: newSaleAccountTitle,
        ntnNumber: newNtnNumber || undefined,
        strnNumber: newStrnNumber || undefined,
        products: items.map((item) => {
          const codeDigits = String(item.code || "").match(/\d+/)?.[0];
          const numericCode = codeDigits ? Number(codeDigits) : Number(item.code);
          const baseAmount = item.qty * item.rate;
          const gstPercent = brand !== "hydroworx" ? getTaxRate(item.hsCode, province) : 0;
          return {
            code: numericCode,
            productName: item.product,
            hsCode: item.hsCode,
            quantity: item.qty,
            rate: item.rate,
            gstPercent,
            exGstRate: item.rate,
            exGstAmount: baseAmount,
            netAmount: baseAmount + (baseAmount * gstPercent) / 100,
          };
        }),
      };

      const response = await api.post("/sale-invoice", payload);

      if (response.data) {
        // Map the backend response to our Invoice shape and add to state
        const mappedNew = mapRawToInvoice(
          response.data as Record<string, unknown>,
        );
        setInvoices((prev) => {
          const next: Invoice[] = [mappedNew, ...prev];
          setNewInvoiceNumber(getNextInvoiceNumber(next));
          return next;
        });

        notifications.show({
          title: "Success",
          message: "Sales invoice created successfully",
          color: "green",
        });

        setCreateModal(false);
        resetForm();
      }
    } catch (error: unknown) {
      const msg = (error as { response?: { data?: { message?: unknown } } })
        ?.response?.data?.message;
      if (Array.isArray(msg)) {
        const { fieldErrors: fe, globalErrors: ge } =
          parseValidationMessages(msg);
        setFieldErrors(fe);
        notifications.show({
          title: ge.length > 0 ? "Operation Failed" : "Validation Error",
          message:
            ge.length > 0
              ? ge.join(", ")
              : "Please correct the highlighted fields.",
          color: "red",
          icon: <IconX size={18} />,
        });
      } else {
        notifications.show({
          title: "Operation Failed",
          message:
            typeof msg === "string" && msg
              ? msg
              : "Failed to create sales invoice",
          color: "red",
          icon: <IconX size={18} />,
        });
      }
      console.error("Error creating sales invoice:", error);
    }
  };

  // Update an existing sales invoice
  const updateSalesInvoice = async (invoiceData: Invoice) => {
    try {
      // Map frontend InvoiceItem fields → backend DTO product fields
      const products = (invoiceData.items || []).map((item) => {
        const gstPct =
          brand !== "hydroworx"
            ? getTaxRate(item.hsCode, province)
            : 0;
        const exGstAmount = item.qty * item.rate;
        const gstAmount = (exGstAmount * gstPct) / 100;
        const netAmount = exGstAmount + gstAmount;
        return {
          code: item.code,
          productName: item.product,
          hsCode: item.hsCode,
          description: item.description,
          quantity: item.qty,
          rate: item.rate,
          gstPercent: gstPct,
          exGstRate: item.rate,
          exGstAmount,
          netAmount,
        };
      });

      const payload = {
        ...invoiceData,
        // Backend DTO uses 'account', Invoice type uses 'accountNumber'
        account: invoiceData.accountNumber || "",
        products,
        amount: editTotal,
        netAmount: editNetAmount,
        province,
      };

      const response = await api.put(
        `/sale-invoice/${invoiceData.id}`,
        payload,
      );

      if (response.data) {
        const res = response.data as Record<string, unknown>;
        const itemsSource = Array.isArray(res.products)
          ? res.products
          : Array.isArray(res.items)
            ? res.items
            : Array.isArray(invoiceData.items)
              ? invoiceData.items
              : [];

        const updatedInvoice: Invoice = {
          id: res._id ? String(res._id) : String(res.id ?? invoiceData.id),
          invoiceNumber:
            (res.invoiceNumber as string) ??
            (res.number as string) ??
            invoiceData.invoiceNumber,
          invoiceDate: res.invoiceDate
            ? String(res.invoiceDate).slice(0, 10)
            : invoiceData.invoiceDate,
          deliveryNumber: res.deliveryNumber ?? invoiceData.deliveryNumber,
          deliveryDate: res.deliveryDate
            ? String(res.deliveryDate).slice(0, 10)
            : invoiceData.deliveryDate,
          poNumber: res.poNumber ?? invoiceData.poNumber,
          poDate: res.poDate
            ? String(res.poDate).slice(0, 10)
            : invoiceData.poDate,
          accountNumber: res.accountNumber ?? invoiceData.accountNumber,
          accountTitle: res.accountTitle ?? invoiceData.accountTitle,
          saleAccount: res.saleAccount ?? invoiceData.saleAccount,
          saleAccountTitle:
            res.saleAccountTitle ?? invoiceData.saleAccountTitle,
          ntnNumber: res.ntnNumber ?? invoiceData.ntnNumber,
          amount:
            typeof res.amount === "number"
              ? res.amount
              : typeof res.netAmount === "number"
                ? res.netAmount
                : invoiceData.amount,
          netAmount:
            typeof res.netAmount === "number"
              ? res.netAmount
              : invoiceData.netAmount,
          province:
            (res.province as string | undefined) ?? invoiceData.province,
          items: itemsSource.map((it: unknown) => {
            const obj = (it as Record<string, unknown>) || {};
            return {
              ...obj,
              id:
                obj.id !== undefined
                  ? String(obj.id)
                  : obj._id !== undefined
                    ? String(obj._id)
                    : String(Math.random()),
            } as InvoiceItem;
          }),
        } as Invoice;

        setInvoices((prev) =>
          prev.map((inv) => (inv.id === invoiceData.id ? updatedInvoice : inv)),
        );

        notifications.show({
          title: "Success",
          message: "Sales invoice updated successfully",
          color: "green",
        });

        setEditInvoice(null);
      }
    } catch (error: unknown) {
      const msg = (error as { response?: { data?: { message?: unknown } } })
        ?.response?.data?.message;
      if (Array.isArray(msg)) {
        const { fieldErrors: fe, globalErrors: ge } =
          parseValidationMessages(msg);
        setFieldErrors(fe);
        notifications.show({
          title: ge.length > 0 ? "Operation Failed" : "Validation Error",
          message:
            ge.length > 0
              ? ge.join(", ")
              : "Please correct the highlighted fields.",
          color: "red",
          icon: <IconX size={18} />,
        });
      } else {
        notifications.show({
          title: "Operation Failed",
          message:
            typeof msg === "string" && msg
              ? msg
              : "Failed to update sales invoice",
          color: "red",
          icon: <IconX size={18} />,
        });
      }
      console.error("Error updating sales invoice:", error);
    }
  };

  const deleteSalesInvoice = async (invoiceId: string) => {
    try {
      await api.delete(`/sale-invoice/${invoiceId}`);

      setInvoices((prev) =>
        prev.filter((i) => String(i.id) !== String(invoiceId)),
      );

      notifications.show({
        title: "Success",
        message: "Sales invoice deleted successfully",
        color: "green",
      });

      setDeleteInvoice(null);
    } catch (error: unknown) {
      notifications.show({
        title: "Operation Failed",
        message: extractError(error, "Failed to delete sales invoice"),
        color: "red",
        icon: <IconX size={18} />,
      });
      console.error("Error deleting sales invoice:", error);
    }
  };

  // Removed: Convert to Delivery Challan handler

  const resetForm = () => {
    setFieldErrors({});
    // Keep newInvoiceNumber as-is (generator should remain based on fetched invoices)
    setNewInvoiceDate(() => {
      const today = new Date();
      return today.toISOString().slice(0, 10);
    });
    setNewDeliveryNumber("");
    setNewDeliveryDate("");
    setNewPoNumber("");
    setNewPoDate("");
    setNewAccountNumber("");
    setNewAccountTitle("");
    setNewSaleAccount("");
    setNewSaleAccountTitle("");
    setNewNtnNumber("");
    setNewStrnNumber("");
    setProvince("Punjab");
    setItems([
      {
        id: "1",
        code: "",
        product: "",
        hsCode: "",
        description: "",
        qty: 0,
        rate: 0,
        exGSTRate: 0,
        exGSTAmount: 0,
      },
    ]);
    setNotes("");
  };

  // Filter invoices by date range only (search is done server-side)
  const filteredInvoices = (invoices as Invoice[]).filter((inv) => {
    const invoiceDate = inv.invoiceDate
      ? new Date(inv.invoiceDate + "T00:00:00").getTime()
      : 0;
    const fromOk = fromDate
      ? invoiceDate >= new Date(fromDate + "T00:00:00").getTime()
      : true;
    const toOk = toDate
      ? invoiceDate <= new Date(toDate + "T00:00:00").getTime()
      : true;
    return fromOk && toOk;
  });

  const start = (page - 1) * pageSize;
  const paginatedInvoices = filteredInvoices.slice(start, start + pageSize);

  const clearFilters = () => {
    setSearchInput("");
    setFromDate("");
    setToDate("");
    setPage(1);
  };

  const exportInvoicesPDF = () => {
    const doc = new jsPDF();
    addHeaderFooter(doc, "Sales Invoices");

    autoTable(doc, {
      startY: 32,
      head: [
        [
          "Invoice #",
          "Invoice Date",
          "Delivery No",
          "Delivery Date",
          "PO No",
          "PO Date",
          "Account No",
          "Account Title",
          "Sale Account",
          "Sale Account Title",
          "NTN",
          "STRN",
          "Amount",
        ],
      ],
      body: filteredInvoices.map((i) => [
        i.invoiceNumber,
        i.invoiceDate,
        i.deliveryNumber || "",
        i.deliveryDate || "",
        i.poNumber || "",
        i.poDate || "",
        i.accountNumber || "",
        i.accountTitle || "",
        i.saleAccount || "",
        i.saleAccountTitle || "",
        i.ntnNumber || "",
        i.strnNumber || "",
        `PKR ${i.amount.toFixed(2)}`,
      ]),
      styles: { fontSize: 10 },
      headStyles: { fillColor: [10, 104, 2] },
      theme: "grid",
      margin: { left: 14, right: 14 },
      didDrawPage: (data) => {
        const finalY = (data.cursor?.y ?? 60) + 8;
        doc.setFontSize(12);
        doc.text(`Total Invoices: ${filteredInvoices.length}`, 14, finalY);
        doc.text(
          `Total Amount: PKR ${filteredInvoices
            .reduce((sum, i) => sum + (i.amount || 0), 0)
            .toFixed(2)}`,
          80,
          finalY,
        );
      },
    });

    doc.save("sales_invoices.pdf");
  };

  const exportSingleInvoicePDF = (invoice: Invoice) => {
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    addHeaderFooter(doc, `Commercial Invoice`);

    // Top box with customer and invoice meta
    const leftX = 14;
    const rightX = 400;
    doc.setFontSize(10);
    doc.text(`Title: ${invoice.accountTitle || ""}`, leftX, 80);
    doc.text(`Address: ${""}`, leftX, 95);
    doc.text(`NTN: ${invoice.ntnNumber || ""}`, leftX, 110);
    doc.text(`STRN: ${invoice.strnNumber || ""}`, leftX, 125);

    doc.setFontSize(10);
    doc.text(`InvoiceNo: ${invoice.invoiceNumber}`, rightX, 80);
    doc.text(`Invoice Date: ${invoice.invoiceDate}`, rightX, 95);
    doc.text(`Delivery No: ${invoice.deliveryNumber || ""}`, rightX, 110);
    doc.text(`Delivery Date: ${invoice.deliveryDate || ""}`, rightX, 125);
    doc.text(`PO No: ${invoice.poNumber || ""}`, rightX, 140);

    // Items table with GST % and net amount
    const tableStartY = 170;
    autoTable(doc, {
      startY: tableStartY,
      head: [
        [
          "SR No",
          "Description",
          "HS Code",
          "GST %",
          "Rate",
          "Qty",
          "Net Amount",
        ],
      ],
      body: (invoice.items ?? []).map((item, idx) => {
        const gstRate = getTaxRate(item.hsCode, invoice.province ?? "Punjab");
        const net = (item.qty || 0) * (item.rate || 0);
        return [
          idx + 1,
          item.product || item.description || item.code || "",
          item.hsCode || "",
          gstRate.toFixed(2),
          (item.rate || 0).toFixed(2),
          (item.qty || 0).toFixed(2),
          net.toFixed(2),
        ];
      }),
      styles: { fontSize: 10 },
      headStyles: { fillColor: [240, 240, 240] },
      theme: "grid",
      margin: { left: 14, right: 14 },
      didDrawPage: () => {},
    });

    // Totals calculation
    const subtotal = (invoice.items ?? []).reduce(
      (s, it) => s + (it.qty || 0) * (it.rate || 0),
      0,
    );
    const salesTax = (invoice.items ?? []).reduce(
      (s, it) =>
        s +
        ((it.qty || 0) *
          (it.rate || 0) *
          getTaxRate(it.hsCode, invoice.province ?? "Punjab")) /
          100,
      0,
    );
    const discount = 0;
    const grandTotal = subtotal + salesTax - discount;

    // Right-aligned totals block
    const pageWidth = doc.internal.pageSize.getWidth();
    const totalsX = pageWidth - 200;
    let totalsY = tableStartY + 20 + (invoice.items?.length || 0) * 18;
    totalsY = Math.max(totalsY, 320);
    doc.setFontSize(10);
    doc.text(`Gross Total:`, totalsX, totalsY);
    doc.text(`PKR ${subtotal.toFixed(2)}`, totalsX + 120, totalsY, {
      align: "right",
    });
    totalsY += 16;
    doc.text(`Sales Tax:`, totalsX, totalsY);
    doc.text(`PKR ${salesTax.toFixed(2)}`, totalsX + 120, totalsY, {
      align: "right",
    });
    totalsY += 16;
    doc.text(`Discount:`, totalsX, totalsY);
    doc.text(`PKR ${discount.toFixed(2)}`, totalsX + 120, totalsY, {
      align: "right",
    });
    totalsY += 16;
    doc.setFontSize(11);
    doc.text(`Grand Total Inclusive Tax:`, totalsX, totalsY);
    doc.text(`PKR ${grandTotal.toFixed(2)}`, totalsX + 120, totalsY, {
      align: "right",
    });

    // Amount in words
    function numberToWords(num: number) {
      if (num === 0) return "zero";
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
      const intPart = Math.floor(num);
      const words = inWords(intPart);
      return words.toUpperCase();
    }

    doc.setFontSize(10);
    doc.text(
      `Amount in words: ${numberToWords(Math.round(grandTotal))}`,
      14,
      totalsY + 30,
    );

    doc.save(`invoice_${invoice.invoiceNumber}.pdf`);
  };

  // Helper to set invoice for printing (used by UI buttons)
  const handlePrintInvoice = (invoice: Invoice) => {
    // set a minimal current invoice for the hidden print template and trigger window.print()
    // also store invoice into hidden print template state so DOM-based printing can use it
    setCurrentInvoiceForPrint(invoice);
    try {
      // Generate a standalone HTML string for the invoice and open it in a new window
      const itemsList = invoice.items || [];
      const subtotal = itemsList.reduce(
        (s, it) => s + (it.qty || 0) * (it.rate || 0),
        0,
      );
      const salesTax = itemsList.reduce(
        (s, it) =>
          s +
          ((it.qty || 0) *
            (it.rate || 0) *
            getTaxRate(it.hsCode, invoice.province || "Punjab")) /
            100,
        0,
      );
      const discount = 0;
      const grandTotal = subtotal + salesTax - discount;

      // small helper to convert number to words (rounded, uppercase)
      function numberToWordsLocal(num: number) {
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

      // build HTML rows for items and padding rows to expand the body like the screenshot
      const _itemsForRows = invoice.items || [];
      const itemsRows = _itemsForRows
        .map((item, idx) => {
          const gst = getTaxRate(item.hsCode, invoice.province || "Punjab");
          const net = (item.qty || 0) * (item.rate || 0);
          return `<tr>
                      <td align="center">${idx + 1}</td>
                      <td align="center">${(
                        item.product ||
                        item.description ||
                        item.code ||
                        ""
                      ).replace(/</g, "&lt;")}</td>
                      <td align="center">${item.hsCode || ""}</td>
                      <td align="center">${gst.toFixed(2)}</td>
                      <td align="center">${(item.rate || 0).toFixed(2)}</td>
                      <td align="center">${(item.qty || 0).toFixed(2)}</td>
                      <td class="right">PKR ${net.toFixed(2)}</td>
                    </tr>`;
        })
        .join("");

      // Keep one fewer filler row so totals and footer stay on the first printed page.
      const desiredRows = 7;
      const paddingCount = Math.max(0, desiredRows - _itemsForRows.length);
      const paddingRows = Array.from({ length: paddingCount })
        .map(() => {
          return `<tr>
                    <td align="center">&nbsp;</td>
                    <td align="center">&nbsp;</td>
                    <td align="center">&nbsp;</td>
                    <td align="center">&nbsp;</td>
                    <td align="center">&nbsp;</td>
                    <td align="center">&nbsp;</td>
                    <td class="right">&nbsp;</td>
                  </tr>`;
        })
        .join("");

      const rowsHtml = itemsRows + paddingRows;

      const headerImageUrl = getHeaderImage(brand);
      const footerImageUrl = getFooterImage(brand);

      const html = `<!doctype html>
        <html>
        <head>
          <meta charset="utf-8" />
          <title>Invoice ${invoice.invoiceNumber}</title>
          <style>
            @page { size: A4 portrait; margin: 8mm; }
            html, body { margin: 0; padding: 0; }
            body { font-family: Arial, sans-serif; color: #222; }
            .page { padding: 24px; box-sizing: border-box; }
            .header { display:flex; align-items:center; gap:12px; }
            .company { color: #0A6802; font-weight:700; font-size:18px; }
            .meta { margin-top: 12px; display: flex; justify-content: space-between; gap:12px; }
            .box { border: 1px solid #222; padding: 8px; }
            /* Table styling to match screenshot: strong outer border, gray header, blue header text */
            table { width: 100%; border-collapse: collapse; margin-top: 12px; border: 2px solid #000; }
            /* Use full 1px borders on all cells so vertical column borders appear */
            th, td { border: 1px solid #000; padding: 8px; font-size: 12px; vertical-align: top; }
            /* Wider description column */
            thead th:nth-child(2), tbody td:nth-child(2) { width: 40%; }
            thead th { background: #e9e9e9; color: #0B4AA6; font-weight: 700; border-bottom: 1px solid #000; }
            thead th:first-child { border-left: 1px solid #000; border-top-left-radius: 6px; }
            thead th:last-child { border-right: 1px solid #000; border-top-right-radius: 6px; }
            tbody td:first-child { border-left: 1px solid #000; }
            tbody tr { height: 48px; }
            tbody td:last-child { border-right: 1px solid #000; }
            .totals { margin-top: 12px; width: 100%; display: flex; justify-content: flex-end; }
            .totals .block { width: 320px; border: 1px solid #222; padding: 12px; }
            .totals, .totals .block, .footer { break-inside: avoid; page-break-inside: avoid; }
            .right { text-align: right; }
            .muted { color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="page">
          <div class="header" style="padding:0;">
            <img src="${headerImageUrl}" alt="Header" style="display:block; width:calc(100% + 48px);  height:auto;  object-fit: cover;" />
          </div>
          <div class="meta">
            <div class="box" style="flex:1; margin-right:8px;">
              <div><strong>Title:</strong> ${invoice.accountTitle || ""}</div>
              <div><strong>NTN:</strong> ${invoice.ntnNumber || ""}</div>
              <div><strong>STRN:</strong> ${invoice.strnNumber || ""}</div>
            </div>
            <div style="width:320px;">
              <div class="box">
                <div><strong>Invoice No:</strong> ${invoice.invoiceNumber}</div>
                <div><strong>Invoice Date:</strong> ${invoice.invoiceDate}</div>
                <div><strong>Delivery No:</strong> ${
                  invoice.deliveryNumber || ""
                }</div>
                <div><strong>Delivery Date:</strong> ${
                  invoice.deliveryDate || ""
                }</div>
                <div><strong>PO No:</strong> ${invoice.poNumber || ""}</div>
              </div>
            </div>
          </div>

          <table>
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
              ${rowsHtml}
            </tbody>
          </table>

          <div style="margin-top:8px; font-size:12px; color:#666;">*Computer generated invoice. No need for signature</div>

          <div class="totals">
            <div class="block">
              <div style="display:flex; justify-content:space-between;">
                <div>Gross Total:</div>
                <div>PKR ${subtotal.toFixed(2)}</div>
              </div>
              <div style="display:flex; justify-content:space-between;">
                <div>Sales Tax:</div>
                <div>PKR ${salesTax.toFixed(2)}</div>
              </div>
              <div style="display:flex; justify-content:space-between;">
                <div>Discount:</div>
                <div>PKR 0.00</div>
              </div>
              <hr />
              <div style="display:flex; justify-content:space-between; font-weight:bold;">
                <div>Grand Total Inclusive Tax:</div>
                <div>PKR ${grandTotal.toFixed(2)}</div>
              </div>
              <div style="margin-top:10px; font-size:12px;">Amount in words: ${numberToWordsLocal(
                Math.round(grandTotal),
              )}</div>
            </div>
          </div>

          <div style="margin-top:18px;" class="footer">
            <img src="${footerImageUrl}" alt="Footer" style="width:100%; height:auto; max-height:120px; object-fit:contain;" />
          </div>
          </div>

        </body>
        </html>`;

      const w = window.open("", "_blank");
      if (!w) return;
      w.document.open();
      w.document.write(html);
      w.document.close();
      // allow the new window to render before calling print
      setTimeout(() => {
        try {
          w.focus();
          w.print();
          // do not auto-close, let user decide
          // clear hidden print template state after print attempt
          setCurrentInvoiceForPrint(null);
        } catch (e) {
          setCurrentInvoiceForPrint(null);
          console.error("Print failed", e);
        }
      }, 300);
    } catch (e) {
      setCurrentInvoiceForPrint(null);
      console.error("Print failed", e);
    }
  };

  const editSubtotal =
    editInvoice?.items?.reduce(
      (acc: number, i: InvoiceItem) => acc + i.qty * i.rate,
      0,
    ) || 0;
  const editGstAmount = editSubtotal * 0.18;
  const editTotal = editSubtotal + editGstAmount;
  const editNetAmount = editTotal;

  const editExGstAmount =
    editInvoice?.items?.reduce(
      (acc: number, i: InvoiceItem) =>
        acc + (i.qty * i.rate * getTaxRate(i.hsCode, province)) / 100,
      0,
    ) || 0;
  const editTotalGst =
    editInvoice?.items?.reduce(
      (acc: number, i: InvoiceItem) => acc + getTaxRate(i.hsCode, province),
      0,
    ) || 0;

  const handleOpenCreateModal = async () => {
    if ((!invoices || invoices.length === 0) && !invoicesLoading) {
      await fetchSalesInvoices();
    }
    setNewInvoiceNumber(getNextInvoiceNumber(invoices));
    setCreateModal(true);
  };

  // Helper: Get all sales accounts (children under 4110 - Sales)
  function getSalesAccounts(nodes: AccountNode[]): {
    value: string;
    label: string;
    code: string;
    accountName: string;
    accountCode?: string;
  }[] {
    const result: {
      value: string;
      label: string;
      code: string;
      accountName: string;
      accountCode?: string;
    }[] = [];

    function walk(node: AccountNode) {
      if (!node) return;

      // Map all accounts where selectedAccountType1 === '4100'
      if (
        node.selectedAccountType1 === "4100" &&
        node.accountCode &&
        node.accountName
      ) {
        result.push({
          value: node.accountCode,
          label: `${node.accountCode} - ${node.accountName}`,
          code: node.accountCode,
          accountName: node.accountName,
          accountCode: node.accountCode,
        });
      }

      // Continue to children
      if (node.children && node.children.length > 0) {
        node.children.forEach(walk);
      }
    }

    // Traverse all nodes (including root level)
    if (Array.isArray(nodes)) {
      nodes.forEach(walk);
    }
    return result;
  }

  // Use utility to get all receivable accounts (1410 and children)
  const receivablesAccounts = getReceivableAccounts(
    accounts as AccountNode[],
  ).filter((account: AccountNode) => account.isParty);

  const accountNoOptions = receivablesAccounts.map((acc: AccountNode) => ({
    value: acc.accountCode || acc.selectedCode,
    label: `${acc.accountCode || acc.selectedCode} - ${acc.accountName}`,
  }));
  const accountTitleOptions = receivablesAccounts.map((acc: AccountNode) => ({
    value: acc.accountName,
    label: acc.accountName,
    code: acc.accountCode || acc.selectedCode,
  }));

  // Remove empty/duplicate/invalid options for account selects
  const uniqueAccountNoOptions: { value: string; label: string }[] = Array.from(
    new Map(
      accountNoOptions
        .filter((a: { value: string; label: string }) => a.value && a.label)
        .map((a: { value: string; label: string }) => [a.value, a]),
    ).values(),
  ) as { value: string; label: string }[];
  const uniqueAccountTitleOptions = Array.from(
    new Map(
      accountTitleOptions
        .filter((a: { value: string; label: string }) => a.value && a.label)
        .map((a: { value: string; label: string; code: string }) => [
          a.value,
          a,
        ]),
    ).values(),
  ) as { value: string; label: string; code: string }[];

  // Sales account options are already formatted in getSalesAccounts

  return (
    <div className="p-6 space-y-6">
      <div
        style={{
          padding: 24,
          display: "flex",
          flexDirection: "column",
          gap: 24,
        }}
      >
        <div
          style={{
            position: "fixed",
            left: "-9999px",
            top: 0,
            zIndex: -1,
            width: "800px",
          }}
          ref={printRef}
        >
          {currentInvoiceForPrint && (
            <PrintableInvoice invoice={currentInvoiceForPrint} />
          )}
        </div>
        <div id="invoice-print-content" style={{ display: "none" }}>
          {currentInvoiceForPrint && (
            <InvoicePrintTemplate invoice={currentInvoiceForPrint} />
          )}
        </div>

        <Group justify="space-between" mb="lg">
          <Text size="xl" fw={600}>
            Sales Invoice
          </Text>
          <Button
            leftSection={<IconPlus size={16} />}
            onClick={handleOpenCreateModal}
            color="#0A6802"
            disabled={invoicesLoading}
          >
            {invoicesLoading ? "Loading..." : "Create Invoice"}
          </Button>
        </Group>

        <Group grow>
          <Card shadow="sm" padding="lg" radius="md" withBorder bg={"#F1FCF0"}>
            <Text>Total Invoices</Text>
            <Text fw={700} size="xl">
              {invoices.length}
            </Text>
          </Card>
          <Card shadow="sm" padding="lg" radius="md" withBorder bg={"#F1FCF0"}>
            <Text>Total Amount</Text>
            <Text fw={700} size="xl">
              PKR
              {invoices.reduce((acc, i) => acc + (i.amount || 0), 0).toFixed(2)}
            </Text>
          </Card>
        </Group>

        <Card
          shadow="sm"
          padding="lg"
          radius="md"
          withBorder
          mt={20}
          bg={"#F1FCF0"}
        >
          <Group justify="space-between" mb="md">
            <div>
              <Text fw={600}>Sales Invoices</Text>
              <Text size="sm" c="dimmed">
                Manage your sales invoices and track payments
              </Text>
            </div>
          </Group>

          <Group mb="md" gap="md" grow>
            <TextInput
              label="Search"
              placeholder="Search invoices..."
              leftSection={<IconSearch size={16} />}
              value={searchInput}
              rightSection={
                isLoading ? (
                  <Text size="xs" c="dimmed">
                    Searching...
                  </Text>
                ) : (
                  <ActionIcon
                    size="sm"
                    variant="subtle"
                    onClick={() => {
                      setSearchInput("");
                      setPage(1);
                    }}
                    style={{
                      opacity: searchInput ? 1 : 0,
                      pointerEvents: searchInput ? "auto" : "none",
                    }}
                  >
                    <IconX size={16} />
                  </ActionIcon>
                )
              }
              onChange={(e) => {
                setSearchInput(e.currentTarget.value);
                setPage(1);
              }}
              w={250}
            />
            <TextInput
              label="From Date"
              type="date"
              placeholder="From date"
              value={fromDate}
              onChange={(e) => setFromDate(e.currentTarget.value)}
              w={150}
            />
            <TextInput
              label="To Date"
              type="date"
              placeholder="To date"
              value={toDate}
              onChange={(e) => setToDate(e.currentTarget.value)}
              w={150}
            />
            <Group mt={24}>
              <Button variant="outline" color="#0A6802" onClick={clearFilters}>
                Clear
              </Button>
              <Button
                color="#0A6802"
                onClick={exportInvoicesPDF}
                leftSection={<IconDownload size={16} />}
              >
                Export
              </Button>
            </Group>
            <Group mb="sm" gap="md" justify="flex-end">
              <Text fw={500}>Rows per page:</Text>
              <Select
                data={[
                  { value: "8", label: "8" },
                  { value: "15", label: "15" },
                  { value: "30", label: "30" },
                ]}
                value={String(pageSize)}
                onChange={(val) => {
                  setPageSize(Number(val));
                  setPage(1);
                }}
                w={80}
              />
            </Group>
          </Group>

          <Table highlightOnHover withColumnBorders>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Invoice #</Table.Th>
                <Table.Th>Invoice Date</Table.Th>
                <Table.Th>Delivery Number</Table.Th>
                <Table.Th>Delivery Date</Table.Th>
                <Table.Th>PO Number</Table.Th>
                <Table.Th>PO Date</Table.Th>
                <Table.Th>Account Number</Table.Th>
                <Table.Th>Account Title</Table.Th>
                <Table.Th>Sale Account</Table.Th>
                <Table.Th>Sale Account Title</Table.Th>
                <Table.Th>NTN Number</Table.Th>
                <Table.Th>Amount</Table.Th>
                <Table.Th>Net Amount</Table.Th>
                <Table.Th>Actions</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {paginatedInvoices.length === 0 ? (
                <Table.Tr>
                  <Table.Td colSpan={14}>
                    <Text c="dimmed" ta="center" py="xl">
                      {searchInput && invoices.length === 0
                        ? "No invoices found matching your search. Try a different term."
                        : "No invoices available. Click 'Create New' to add one."}
                    </Text>
                  </Table.Td>
                </Table.Tr>
              ) : (
                paginatedInvoices.map((i) => (
                  <Table.Tr key={i.id}>
                    <Table.Td>{i.invoiceNumber}</Table.Td>
                    <Table.Td>{i.invoiceDate}</Table.Td>
                    <Table.Td>{i.deliveryNumber || ""}</Table.Td>
                    <Table.Td>{i.deliveryDate || ""}</Table.Td>
                    <Table.Td>{i.poNumber || ""}</Table.Td>
                    <Table.Td>{i.poDate || ""}</Table.Td>
                    <Table.Td>{i.accountNumber || ""}</Table.Td>
                    <Table.Td>{i.accountTitle || ""}</Table.Td>
                    <Table.Td>{i.saleAccount || ""}</Table.Td>
                    <Table.Td>{i.saleAccountTitle || ""}</Table.Td>
                    <Table.Td>{i.ntnNumber || ""}</Table.Td>
                    <Table.Td>PKR {(i.amount || 0).toFixed(2)}</Table.Td>
                    <Table.Td>
                      PKR{" "}
                      {i.netAmount !== undefined
                        ? (i.netAmount || 0).toFixed(2)
                        : (i.amount || 0).toFixed(2)}
                    </Table.Td>
                    <Table.Td>
                      <Group gap="xs">
                        <ActionIcon
                          color="#0A6802"
                          variant="light"
                          onClick={() =>
                            setEditInvoice(
                              mapRawToInvoice(
                                i as unknown as Record<string, unknown>,
                              ),
                            )
                          }
                        >
                          <IconPencil size={16} />
                        </ActionIcon>
                        <ActionIcon
                          color="red"
                          variant="light"
                          onClick={() => setDeleteInvoice(i)}
                        >
                          <IconTrash size={16} />
                        </ActionIcon>
                        <ActionIcon
                          color="#819E00"
                          variant="light"
                          onClick={() => exportSingleInvoicePDF(i)}
                          title="Download PDF"
                        >
                          <IconDownload size={16} />
                        </ActionIcon>
                        {/* Removed: Convert to Delivery Challan button */}
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                ))
              )}
            </Table.Tbody>
          </Table>

          <Group mt="md" justify="center">
            <Pagination
              value={page}
              onChange={setPage}
              total={Math.max(1, Math.ceil(filteredInvoices.length / pageSize))}
              color="#0A6802"
              radius="md"
              size="md"
              withControls
            />
          </Group>
        </Card>

        {/* Create Invoice Modal */}
        <Modal
          opened={createModal}
          onClose={() => setCreateModal(false)}
          title="Create Invoice"
          size="100%"
        >
          <Group grow mb="sm">
            <TextInput
              label="Invoice Number"
              value={newInvoiceNumber}
              readOnly
              mb="sm"
            />
            <TextInput
              label="Invoice Date"
              type="date"
              placeholder="mm/dd/yyyy"
              value={newInvoiceDate}
              onChange={(e) => setNewInvoiceDate(e.currentTarget.value)}
              error={fieldErrors.invoiceDate}
            />
            <TextInput
              label="Delivery Number"
              type="number"
              placeholder="Delivery Number"
              value={newDeliveryNumber}
              onChange={(e) => setNewDeliveryNumber(e.currentTarget.value)}
            />
            <TextInput
              label="Delivery Date"
              type="date"
              placeholder="mm/dd/yyyy"
              value={newDeliveryDate}
              onChange={(e) => setNewDeliveryDate(e.currentTarget.value)}
            />
          </Group>
          <Group grow mb="sm" w={"50%"}>
            <TextInput
              label="PO Number"
              placeholder="PO Number"
              value={newPoNumber}
              onChange={(e) => setNewPoNumber(e.currentTarget.value)}
            />
            <TextInput
              label="PO Date"
              type="date"
              placeholder="PO Date"
              value={newPoDate}
              onChange={(e) => setNewPoDate(e.currentTarget.value)}
            />
          </Group>
          <Group grow>
            <Select
              label="Account Number"
              placeholder="Select Account Number"
              data={uniqueAccountNoOptions}
              value={newAccountNumber}
              onChange={(v) => {
                setNewAccountNumber(v || "");
                // Find account by accountCode from receivablesAccounts
                const acc = receivablesAccounts.find(
                  (a: AccountNode) => (a.accountCode || a.code) === v,
                );
                if (acc) {
                  setNewAccountTitle(acc.accountName || "");
                  setNewNtnNumber(acc.ntn || "");
                  setNewStrnNumber(acc.strn || "");
                } else {
                  setNewAccountTitle("");
                  setNewNtnNumber("");
                  setNewStrnNumber("");
                }
              }}
              clearable
              error={fieldErrors.accountNumber ?? fieldErrors.account}
            />
            <Select
              label="Account Title"
              placeholder="Select Account Title"
              data={uniqueAccountTitleOptions}
              value={newAccountTitle}
              onChange={(v) => {
                setNewAccountTitle(v || "");
                // Find account by name from receivablesAccounts
                const acc = receivablesAccounts.find(
                  (a: AccountNode) => a.accountName === v,
                );
                if (acc) {
                  setNewAccountNumber(
                    acc.accountCode !== undefined
                      ? String(acc.accountCode)
                      : acc.code !== undefined
                        ? String(acc.code)
                        : "",
                  );
                  setNewNtnNumber(acc.ntn || "");
                  setNewStrnNumber(acc.strn || "");
                } else {
                  setNewAccountNumber("");
                  setNewNtnNumber("");
                  setNewStrnNumber("");
                }
              }}
              mb="sm"
              clearable
              error={fieldErrors.accountTitle}
            />
            <Select
              label="Sale Account"
              placeholder="Select Sale Account"
              data={salesAccountOptions}
              value={newSaleAccount}
              onChange={(v) => {
                setNewSaleAccount(v || "");
                // Auto-fill Sale Account Title
                const acc = salesAccountOptions.find((a) => a.value === v);
                if (acc) {
                  setNewSaleAccountTitle(acc.accountName);
                } else {
                  setNewSaleAccountTitle("");
                }
              }}
              description="Select from sales accounts under 4110 - Sales"
              clearable
              searchable
              error={
                fieldErrors.saleAccount ??
                (salesAccountOptions.length === 0
                  ? "No sales accounts available. Create them in Chart of Accounts first."
                  : undefined)
              }
            />
            <TextInput
              label="Sale Account Title"
              value={newSaleAccountTitle}
              readOnly
              description="Auto-filled based on selected sale account"
            />
            <TextInput
              label="NTN Number"
              value={newNtnNumber}
              onChange={(e) => setNewNtnNumber(e.currentTarget.value)}
            />
            <TextInput
              label="STRN"
              value={newStrnNumber}
              onChange={(e) => setNewStrnNumber(e.currentTarget.value)}
            />
          </Group>

          <Select
            label="Province"
            data={[
              { value: "Punjab", label: "Punjab" },
              { value: "Sindh", label: "Sindh" },
            ]}
            value={province}
            onChange={(v) => setProvince(v as "Punjab" | "Sindh")}
          />

          <Table withColumnBorders highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Code</Table.Th>
                <Table.Th>Product Name</Table.Th>
                <Table.Th>HS Code</Table.Th>
                <Table.Th>Description</Table.Th>
                <Table.Th>Qty</Table.Th>
                <Table.Th>Rate</Table.Th>
                {brand !== "hydroworx" && <Table.Th>EX.GST Rate</Table.Th>}
                {brand !== "hydroworx" && <Table.Th>EX.GST Amt</Table.Th>}
                <Table.Th>Amount</Table.Th>
                <Table.Th>Remove</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {items.map((item, index) => {
                const gstRate = getTaxRate(item.hsCode, province);
                const gstAmount = (item.qty * item.rate * gstRate) / 100;
                const amount = item.qty * item.rate;

                return (
                  <Table.Tr key={item.id}>
                    <Table.Td>
                      <Select
                        placeholder="Product Code"
                        data={Array.from(
                          new Map(
                            productCodes.map((p) => [
                              String(p.value),
                              {
                                value: String(p.value),
                                label: p.label,
                                productName: p.productName,
                                description: p.description,
                                rate: p.rate,
                              },
                            ]),
                          ).values(),
                        )}
                        value={item.code}
                        onChange={(v) => {
                          const selected = productCodes.find(
                            (p) => String(p.value) === v,
                          );
                          const newItems = [...items];
                          newItems[index].code = v || "";
                          newItems[index].product = selected?.productName || "";
                          newItems[index].description =
                            selected?.description || "";
                          newItems[index].rate = selected?.rate || 0;
                          setItems(newItems);
                        }}
                        searchable
                      />
                    </Table.Td>
                    <Table.Td>
                      <TextInput
                        placeholder="Product"
                        value={item.product}
                        onChange={(e) => {
                          const newItems = [...items];
                          newItems[index].product = e.currentTarget.value;
                          setItems(newItems);
                        }}
                      />
                    </Table.Td>
                    <Table.Td>
                      <Select
                        placeholder="HS Code"
                        data={[
                          { value: "3824", label: "3824 Chemicals" },
                          { value: "8421", label: "8421 Equipment" },
                          { value: "8413", label: "8413 Pumps" },
                          { value: "9833", label: "9833 Service" },
                        ]}
                        value={item.hsCode}
                        onChange={(v) => {
                          const newItems = [...items];
                          newItems[index].hsCode = v || "";
                          setItems(newItems);
                        }}
                      />
                    </Table.Td>
                    <Table.Td>
                      <TextInput
                        placeholder="Description"
                        value={item.description}
                        onChange={(e) => {
                          const newItems = [...items];
                          newItems[index].description = e.currentTarget.value;
                          setItems(newItems);
                        }}
                      />
                    </Table.Td>
                    <Table.Td>
                      <NumberInput
                        value={item.qty}
                        min={1}
                        onChange={(val) => {
                          const newItems = [...items];
                          newItems[index].qty = Number(val) || 0;
                          setItems(newItems);
                        }}
                        error={fieldErrors[`items.${index}.qty`]}
                      />
                    </Table.Td>
                    <Table.Td>
                      <NumberInput
                        value={item.rate}
                        min={0}
                        onChange={(val) => {
                          const newItems = [...items];
                          newItems[index].rate = Number(val) || 0;
                          setItems(newItems);
                        }}
                        error={fieldErrors[`items.${index}.rate`]}
                      />
                    </Table.Td>
                    {brand !== "hydroworx" && (
                      <Table.Td>
                        <NumberInput value={gstRate} disabled />
                      </Table.Td>
                    )}
                    {brand !== "hydroworx" && (
                      <Table.Td>
                        <NumberInput value={gstAmount} disabled />
                      </Table.Td>
                    )}
                    <Table.Td>
                      <NumberInput value={amount} disabled />
                    </Table.Td>
                    <Table.Td>
                      <ActionIcon
                        color="red"
                        variant="light"
                        onClick={() =>
                          setItems((prev) =>
                            prev.filter((i) => i.id !== item.id),
                          )
                        }
                      >
                        <IconTrash size={18} />
                      </ActionIcon>
                    </Table.Td>
                  </Table.Tr>
                );
              })}
            </Table.Tbody>
          </Table>
          <Button
            mt="sm"
            leftSection={<IconPlus size={16} />}
            color="#0A6802"
            onClick={() =>
              setItems((prev) => [
                ...prev,
                {
                  id: String(prev.length + 1),
                  code: "",
                  product: "",
                  hsCode: "",
                  description: "",
                  qty: 1,
                  rate: 0,
                  exGSTRate: 0,
                  exGSTAmount: 0,
                },
              ])
            }
          >
            Add Item
          </Button>

          <div
            style={{
              marginTop: 16,
              marginRight: 40,
              display: "flex",
              flexDirection: "column",
              gap: 4,
              alignItems: "flex-end",
            }}
          >
            <Text>Subtotal: {subtotal.toFixed(2)}</Text>
            {brand !== "hydroworx" && (
              <Text>Ex Gst Amount: {exGstAmount.toFixed(2)}</Text>
            )}
            {brand !== "hydroworx" && (
              <Text>Total GST: {totalGst.toFixed(2)}</Text>
            )}
            <Text fw={700}>Net Total: {netTotal.toFixed(2)}</Text>
          </div>

          <Textarea
            label="Notes (Optional)"
            placeholder="Additional notes or terms..."
            value={notes}
            onChange={(e) => setNotes(e.currentTarget.value)}
            mt="md"
          />

          <Group justify="flex-end" mt="md">
            <Button
              variant="outline"
              color="#819E00"
              onClick={() => {
                handlePrintInvoice({
                  id: String(invoices.length + 1),
                  invoiceNumber: newInvoiceNumber,
                  invoiceDate: newInvoiceDate,
                  accountTitle: newAccountTitle,
                  amount: netTotal,
                  netAmount: netTotal,
                  items,
                });
              }}
              mr={8}
            >
              Print
            </Button>
            <Button variant="default" onClick={() => setCreateModal(false)}>
              Save as Draft
            </Button>
            <Button
              color="#0A6802"
              onClick={createSalesInvoice} // Change this to call backend function
            >
              Create
            </Button>
          </Group>
        </Modal>

        {/* Edit Invoice Modal */}
        <Modal
          opened={!!editInvoice}
          onClose={() => setEditInvoice(null)}
          title="Edit Invoice"
          size="70%"
        >
          {editInvoice && (
            <>
              <Group grow mb="sm">
                <TextInput
                  label="Invoice Number"
                  value={editInvoice.invoiceNumber}
                  onChange={(e) =>
                    setEditInvoice({
                      ...editInvoice,
                      invoiceNumber: e.currentTarget.value,
                    })
                  }
                  mb="sm"
                />
                <TextInput
                  label="Invoice Date"
                  type="date"
                  placeholder="mm/dd/yyyy"
                  value={editInvoice.invoiceDate}
                  onChange={(e) =>
                    setEditInvoice({
                      ...editInvoice,
                      invoiceDate: e.currentTarget.value,
                    })
                  }
                />
                <TextInput
                  label="Delivery Number"
                  type="number"
                  placeholder="Delivery Number"
                  value={editInvoice.deliveryNumber || ""}
                  onChange={(e) =>
                    setEditInvoice({
                      ...editInvoice,
                      deliveryNumber: e.currentTarget.value,
                    })
                  }
                />
                <TextInput
                  label="Delivery Date"
                  type="date"
                  placeholder="mm/dd/yyyy"
                  value={editInvoice.deliveryDate || ""}
                  onChange={(e) =>
                    setEditInvoice({
                      ...editInvoice,
                      deliveryDate: e.currentTarget.value,
                    })
                  }
                />
              </Group>
              <Group grow mb="sm" w={"50%"}>
                <TextInput
                  label="PO Number"
                  placeholder="PO Number"
                  value={editInvoice.poNumber || ""}
                  onChange={(e) =>
                    setEditInvoice({
                      ...editInvoice,
                      poNumber: e.currentTarget.value,
                    })
                  }
                />
                <TextInput
                  label="PO Date"
                  type="date"
                  placeholder="PO Date"
                  value={editInvoice.poDate || ""}
                  onChange={(e) =>
                    setEditInvoice({
                      ...editInvoice,
                      poDate: e.currentTarget.value,
                    })
                  }
                />
              </Group>
              <Group grow>
                <Select
                  label="Account Number"
                  placeholder="Select Account Number"
                  data={uniqueAccountNoOptions}
                  value={editInvoice.accountNumber || ""}
                  onChange={(v) => {
                    const acc = accounts.find((a) => a.selectedCode === v);
                    setEditInvoice({
                      ...editInvoice,
                      accountNumber: v || "",
                      accountTitle: acc?.accountName || "",
                      ntnNumber: acc?.ntn || "",
                      strnNumber: acc?.strn || "",
                    });
                  }}
                  clearable
                />
                <Select
                  label="Account Title"
                  placeholder="Select Account Title"
                  data={uniqueAccountTitleOptions}
                  value={editInvoice.accountTitle || ""}
                  onChange={(v) => {
                    const acc = accounts.find((a) => a.accountName === v);
                    setEditInvoice({
                      ...editInvoice,
                      accountTitle: v || "",
                      accountNumber: acc?.selectedCode || "",
                      ntnNumber: acc?.ntn || "",
                      strnNumber: acc?.strn || "",
                    });
                  }}
                  mb="sm"
                  clearable
                />
                <Select
                  label="Sale Account"
                  placeholder="Select Sale Account"
                  data={salesAccountOptions}
                  value={editInvoice.saleAccount || ""}
                  onChange={(v) => {
                    const acc = salesAccountOptions.find((a) => a.value === v);
                    setEditInvoice({
                      ...editInvoice,
                      saleAccount: v || "",
                      saleAccountTitle: acc
                        ? acc.accountName
                        : saleAccountTitleMap[v || ""] || "",
                    });
                  }}
                  description="Select from sales accounts under 4110 - Sales"
                  clearable
                  searchable
                />
                <TextInput
                  label="Sale Account Title"
                  value={editInvoice.saleAccountTitle || ""}
                  readOnly
                  description="Auto-filled based on selected sale account"
                />
                <TextInput
                  label="NTN Number"
                  value={editInvoice.ntnNumber || ""}
                  onChange={(e) =>
                    setEditInvoice({
                      ...editInvoice,
                      ntnNumber: e.currentTarget.value,
                    })
                  }
                />
                <TextInput
                  label="STRN"
                  value={editInvoice.strnNumber || ""}
                  onChange={(e) =>
                    setEditInvoice({
                      ...editInvoice,
                      strnNumber: e.currentTarget.value,
                    })
                  }
                />
              </Group>
              <Select
                label="Province"
                data={[
                  { value: "Punjab", label: "Punjab" },
                  { value: "Sindh", label: "Sindh" },
                ]}
                value={province}
                onChange={(v) => setProvince(v as "Punjab" | "Sindh")}
              />
              <Table withColumnBorders highlightOnHover>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Code</Table.Th>
                    <Table.Th>Product Name</Table.Th>
                    <Table.Th>HS Code</Table.Th>
                    <Table.Th>Description</Table.Th>
                    <Table.Th>Qty</Table.Th>
                    <Table.Th>Rate</Table.Th>
                    <Table.Th>EX.GST Rate</Table.Th>
                    <Table.Th>EX.GST Amt</Table.Th>
                    <Table.Th>Amount</Table.Th>
                    <Table.Th>Remove</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {editInvoice.items?.map((item, index) => {
                    const amount = item.qty * item.rate;
                    const gstRate = getTaxRate(item.hsCode, province);
                    const gstAmount = (item.qty * item.rate * gstRate) / 100;

                    return (
                      <Table.Tr key={item.id}>
                        <Table.Td>
                          <TextInput
                            value={item.code}
                            onChange={(e) => {
                              const newItems = [...(editInvoice.items || [])];
                              newItems[index].code = e.currentTarget.value;
                              setEditInvoice({
                                ...editInvoice,
                                items: newItems,
                              });
                            }}
                          />
                        </Table.Td>
                        <Table.Td>
                          <TextInput
                            placeholder="Product"
                            value={item.product}
                            onChange={(e) => {
                              const newItems = [...(editInvoice.items || [])];
                              newItems[index].product = e.currentTarget.value;
                              setEditInvoice({
                                ...editInvoice,
                                items: newItems,
                              });
                            }}
                          />
                        </Table.Td>
                        <Table.Td>
                          <Select
                            placeholder="HS Code"
                            data={[
                              { value: "3824", label: "3824 Chemicals" },
                              { value: "8421", label: "8421 Equipment" },
                              { value: "8413", label: "8413 Pumps" },
                              { value: "9833", label: "9833 Service" },
                            ]}
                            value={item.hsCode}
                            onChange={(v) => {
                              const newItems = [...(editInvoice.items || [])];
                              newItems[index].hsCode = v || "";
                              setEditInvoice({
                                ...editInvoice,
                                items: newItems,
                              });
                            }}
                          />
                        </Table.Td>
                        <Table.Td>
                          <TextInput
                            placeholder="Description"
                            value={item.description}
                            onChange={(e) => {
                              const newItems = [...(editInvoice.items || [])];
                              newItems[index].description =
                                e.currentTarget.value;
                              setEditInvoice({
                                ...editInvoice,
                                items: newItems,
                              });
                            }}
                          />
                        </Table.Td>
                        <Table.Td>
                          <NumberInput
                            value={item.qty}
                            min={1}
                            onChange={(val) => {
                              const newItems = [...(editInvoice.items || [])];
                              newItems[index].qty = Number(val) || 0;
                              setEditInvoice({
                                ...editInvoice,
                                items: newItems,
                              });
                            }}
                          />
                        </Table.Td>
                        <Table.Td>
                          <NumberInput
                            value={item.rate}
                            min={0}
                            onChange={(val) => {
                              const newItems = [...(editInvoice.items || [])];
                              newItems[index].rate = Number(val) || 0;
                              setEditInvoice({
                                ...editInvoice,
                                items: newItems,
                              });
                            }}
                          />
                        </Table.Td>
                        <Table.Td>
                          <NumberInput value={gstRate} disabled />
                        </Table.Td>
                        <Table.Td>
                          <NumberInput value={gstAmount} disabled />
                        </Table.Td>
                        <Table.Td>
                          <NumberInput value={amount} disabled />
                        </Table.Td>
                        <Table.Td>
                          <ActionIcon
                            color="red"
                            variant="light"
                            onClick={() => {
                              const newItems = (editInvoice.items || []).filter(
                                (i) => i.id !== item.id,
                              );
                              setEditInvoice({
                                ...editInvoice,
                                items: newItems,
                              });
                            }}
                          >
                            <IconTrash size={18} />
                          </ActionIcon>
                        </Table.Td>
                      </Table.Tr>
                    );
                  })}
                </Table.Tbody>
              </Table>
              <Button
                mt="sm"
                leftSection={<IconPlus size={16} />}
                color="#0A6802"
                onClick={() => {
                  setEditInvoice({
                    ...editInvoice,
                    items: [
                      ...(editInvoice.items || []),
                      {
                        id: String((editInvoice.items?.length || 0) + 1),
                        code: "",
                        product: "",
                        hsCode: "",
                        description: "",
                        qty: 1,
                        rate: 0,
                        exGSTRate: 0,
                        exGSTAmount: 0,
                      },
                    ],
                  });
                }}
              >
                Add Item
              </Button>
              {/* Fix: Replace className with style object */}
              <div
                style={{
                  marginTop: 16,
                  marginRight: 40,
                  display: "flex",
                  alignItems: "flex-end",
                  flexDirection: "column",
                  gap: 4,
                }}
              >
                <Text>Subtotal: {editSubtotal.toFixed(2)}</Text>
                <Text>Ex Gst Amount: {editExGstAmount.toFixed(2)}</Text>
                <Text>Total GST: {editTotalGst.toFixed(2)}</Text>
                <Text fw={700}>Net Total: {editNetAmount.toFixed(2)}</Text>
              </div>
              <Group mt="md" justify="flex-end">
                <Button
                  variant="outline"
                  color="#819E00"
                  onClick={() => {
                    handlePrintInvoice({
                      ...editInvoice,
                      netAmount: editNetAmount,
                    });
                  }}
                  mr={8}
                >
                  Print
                </Button>
                <Button variant="default" onClick={() => setEditInvoice(null)}>
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    if (editInvoice) {
                      updateSalesInvoice(editInvoice); // Change this to call backend function
                    }
                  }}
                >
                  Save Changes
                </Button>
              </Group>
            </>
          )}
        </Modal>

        {/* Delete Invoice Modal */}
        <Modal
          opened={!!deleteInvoice}
          onClose={() => setDeleteInvoice(null)}
          title="Confirm Delete"
        >
          <Text>
            Are you sure you want to delete invoice{" "}
            <b>{deleteInvoice?.invoiceNumber}</b>?
          </Text>
          <Group mt="md" justify="flex-end">
            <Button variant="default" onClick={() => setDeleteInvoice(null)}>
              Cancel
            </Button>
            <Button
              color="red"
              onClick={() => {
                if (deleteInvoice) {
                  deleteSalesInvoice(deleteInvoice.id);
                }
              }}
            >
              Delete
            </Button>
          </Group>
        </Modal>

        {/* Removed: Convert to Delivery Challan Modal */}

        {/* Invoice Print Template (for direct printing, hidden) */}
        <div style={{ display: "none" }}>
          {invoices.map((invoice) => (
            <InvoicePrintTemplate key={invoice.id} invoice={invoice} />
          ))}
        </div>
      </div>
    </div>
  );
}

// Invoice print template component
function InvoicePrintTemplate({ invoice }: { invoice: Invoice }) {
  const { brand } = useBrand();
  if (!invoice) return null;
  if (brand === "hydroworx") {
    // Hydroworx: Crystal Report PDF design
    return (
      <div
        style={{
          fontFamily: "Arial, sans-serif",
          background: "#fff",
          padding: 24,
          minWidth: 900,
          position: "relative",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: 8, padding: 0 }}>
          <img
            src={getHeaderImage(brand)}
            alt="Header"
            style={{
              display: "block",
              width: "calc(100% + 48px)",
              marginLeft: -24,
              height: "auto",
              maxHeight: 120,
              objectFit: "contain",
            }}
          />
        </div>
        <table
          style={{
            width: "100%",
            fontSize: 14,
            marginBottom: 16,
            border: "2px solid #000",
            borderCollapse: "collapse",
          }}
        >
          <tbody>
            <tr>
              <td style={{ fontWeight: "bold" }}>Invoice #</td>
              <td>{invoice.invoiceNumber}</td>
              <td style={{ fontWeight: "bold" }}>Date</td>
              <td>{invoice.invoiceDate}</td>
            </tr>
            <tr>
              <td style={{ fontWeight: "bold" }}>Account Title</td>
              <td>{invoice.accountTitle}</td>
              <td style={{ fontWeight: "bold" }}>Account Number</td>
              <td>{invoice.accountNumber || ""}</td>
            </tr>
            <tr>
              <td style={{ fontWeight: "bold" }}>Delivery Number</td>
              <td>{invoice.deliveryNumber || ""}</td>
              <td style={{ fontWeight: "bold" }}>PO Number</td>
              <td>{invoice.poNumber || ""}</td>
            </tr>
          </tbody>
        </table>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: 13,
            marginBottom: 24,
            border: "2px solid #000",
          }}
        >
          <thead>
            <tr style={{ background: "#e9e9e9" }}>
              <th
                style={{
                  border: "1px solid #000",
                  padding: 8,
                  color: "#0B4AA6",
                  fontWeight: 700,
                }}
              >
                Code
              </th>
              <th
                style={{
                  border: "1px solid #000",
                  padding: 8,
                  width: "40%",
                  color: "#0B4AA6",
                  fontWeight: 700,
                }}
              >
                Product
              </th>
              <th
                style={{
                  border: "1px solid #000",
                  padding: 8,
                  color: "#0B4AA6",
                  fontWeight: 700,
                }}
              >
                HS Code
              </th>
              <th
                style={{
                  border: "1px solid #000",
                  padding: 8,
                  color: "#0B4AA6",
                  fontWeight: 700,
                }}
              >
                Description
              </th>
              <th
                style={{
                  border: "1px solid #000",
                  padding: 8,
                  color: "#0B4AA6",
                  fontWeight: 700,
                }}
              >
                Qty
              </th>
              <th
                style={{
                  border: "1px solid #000",
                  padding: 8,
                  color: "#0B4AA6",
                  fontWeight: 700,
                }}
              >
                Rate
              </th>
              <th
                style={{
                  border: "1px solid #000",
                  padding: 8,
                  color: "#0B4AA6",
                  fontWeight: 700,
                }}
              >
                Amount
              </th>
            </tr>
          </thead>
          <tbody>
            {(() => {
              const itemsForTemplate = invoice.items || [];
              const desiredRows = 8;
              return Array.from({ length: desiredRows }).map((_, idx) => {
                const item = itemsForTemplate[idx];
                if (item) {
                  const amount = (item.qty || 0) * (item.rate || 0);
                  return (
                    <tr key={idx} style={{ height: 48 }}>
                      <td style={{ border: "1px solid #000", padding: 8 }}>
                        {item.code}
                      </td>
                      <td style={{ border: "1px solid #000", padding: 8 }}>
                        {item.product}
                      </td>
                      <td style={{ border: "1px solid #000", padding: 8 }}>
                        {item.hsCode}
                      </td>
                      <td style={{ border: "1px solid #000", padding: 8 }}>
                        {item.description}
                      </td>
                      <td style={{ border: "1px solid #000", padding: 8 }}>
                        {item.qty}
                      </td>
                      <td style={{ border: "1px solid #000", padding: 8 }}>
                        {(item.rate || 0).toFixed(2)}
                      </td>
                      <td style={{ border: "1px solid #000", padding: 8 }}>
                        {amount.toFixed(2)}
                      </td>
                    </tr>
                  );
                }
                return (
                  <tr key={idx} style={{ height: 48 }}>
                    <td style={{ border: "1px solid #000", padding: 8 }}>
                      &nbsp;
                    </td>
                    <td style={{ border: "1px solid #000", padding: 8 }}>
                      &nbsp;
                    </td>
                    <td style={{ border: "1px solid #000", padding: 8 }}>
                      &nbsp;
                    </td>
                    <td style={{ border: "1px solid #000", padding: 8 }}>
                      &nbsp;
                    </td>
                    <td style={{ border: "1px solid #000", padding: 8 }}>
                      &nbsp;
                    </td>
                    <td style={{ border: "1px solid #000", padding: 8 }}>
                      &nbsp;
                    </td>
                    <td style={{ border: "1px solid #000", padding: 8 }}>
                      &nbsp;
                    </td>
                  </tr>
                );
              });
            })()}
          </tbody>
        </table>
        <div style={{ marginTop: 8, fontSize: 12, color: "#666" }}>
          *Computer generated invoice. No need for signature
        </div>
        <div
          style={{
            marginTop: 24,
            fontWeight: "bold",
            fontSize: 16,
            pageBreakInside: "avoid",
          }}
        >
          Total: PKR {invoice.amount?.toFixed(2)}
        </div>
        <div style={{ marginTop: 18, pageBreakInside: "avoid" }}>
          <img
            src={getFooterImage(brand)}
            alt="Footer Banner"
            style={{
              width: "100%",
              height: "auto",
              maxHeight: 120,
              objectFit: "contain",
            }}
          />
        </div>
      </div>
    );
  }
  // Chemtronics or other brands: keep existing layout
  // ...existing code...
}
