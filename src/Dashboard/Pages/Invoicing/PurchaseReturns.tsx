/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect } from "react";

import {
  Modal,
  Button,
  Select,
  Textarea,
  NumberInput,
  Group,
  TextInput,
  ActionIcon,
  Table,
  Card,
  Pagination,
} from "@mantine/core";
import {
  IconPlus,
  IconSearch,
  IconPencil,
  IconTrash,
  IconMinus,
  IconDownload,
  IconPrinter,
  IconX,
} from "@tabler/icons-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { usePurchaseReturns } from "../../Context/Invoicing/PurchaseReturnsContext";
import { useProducts } from "../../Context/Inventory/ProductsContext";
import api from "../../../api_configuration/api";
import { notifications } from "@mantine/notifications";
import usePrintService from "../../../hooks/usePrintService";
import PrintPreview from "../../../components/shared/PrintPreview";
import { PurchaseReturnContent } from "../../../components/shared/PurchaseReturnContent";

declare module "jspdf" {
  interface jsPDF {
    autoTable: typeof autoTable;
  }
}
jsPDF.prototype.autoTable = autoTable;

interface ReturnItem {
  product: string;
  quantity: number;
  rate: number;
  amount: number;
  code: string;
  unit: string;
  discount?: number;
  netAmount?: number;
}

interface ReturnEntry {
  id: string;
  invoice: string;
  date: string;
  referenceNumber: string;
  referenceDate: string;
  amount: number;
  notes: string;
  items: ReturnItem[];
  supplierNumber: string;
  supplierTitle: string;
  purchaseAccount: string;
  purchaseTitle: string;
}

// Helper to get next invoice number
function getNextReturnNumber(returns: ReturnEntry[]) {
  const numbers = returns
    .map((r) => {
      if (!r.id || typeof r.id !== "string") return null;
      const match = r.id.match(/^PR-(\d+)$/);
      return match ? parseInt(match[1], 10) : null;
    })
    .filter((n) => n !== null) as number[];
  const max = numbers.length ? Math.max(...numbers) : 0;
  const next = max + 1;
  return `PR-${next}`;
}

type FieldErrors = Record<string, string>;

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

export default function PurchaseReturnModal() {
  // Use context for returns
  const { returns, setReturns } = usePurchaseReturns();
  const { products } = useProducts();

  // Print service for centralized printing
  const {
    isPreviewOpen,
    printData,
    openPrintPreview,
    closePrintPreview,
    print,
  } = usePrintService();

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ReturnEntry | null>(null);
  const [opened, setOpened] = useState(false);
  const [editOpened, setEditOpened] = useState(false);

  const [returnDate, setReturnDate] = useState("");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [referenceDate, setReferenceDate] = useState("");
  const [notes, setNotes] = useState<string>("");
  const [supplierNumber, setSupplierNumber] = useState("");
  const [supplierTitle, setSupplierTitle] = useState("");
  const [purchaseAccount, setPurchaseAccount] = useState("");
  const [purchaseTitle, setPurchaseTitle] = useState("");
  const [invoice, setInvoice] = useState("");

  // --- Supplier mapping logic (same as PurchaseInvoice) ---
  const [accounts, setAccounts] = useState<any[]>([]);

  const flattenAccounts = React.useCallback((nodes: any[]): any[] => {
    let result: any[] = [];
    nodes.forEach((node) => {
      result.push({
        code: node.code,
        name: node.name,
        parentAccount: node.parentAccount,
        isParty: node.isParty,
        accountName: node.accountName,
        accountType: node.accountType,
        address: node.address,
        phoneNo: node.phoneNo,
        ntn: node.ntn,
      });
      if (node.children && node.children.length > 0) {
        result = result.concat(flattenAccounts(node.children));
      }
    });
    return result;
  }, []);

  useEffect(() => {
    api.get("/chart-of-account/all").then((res) => {
      console.log("Raw accounts response:", res.data);
      if (Array.isArray(res.data)) {
        setAccounts(res.data);
        // Flatten and console all accounts
        const allAccounts = flattenAccounts(res.data);
        console.log("All found accounts in Purchase Return:", allAccounts);
      }
    });
  }, [flattenAccounts]);

  // Derive Purchase Party accounts (Liabilities → Current Liabilities → Purchase Party)
  // Filter accounts whose code starts with "221"
  const supplierAccounts = (() => {
    const results: any[] = [];

    function walk(nodes: any[]) {
      if (!Array.isArray(nodes)) return;
      for (const node of nodes) {
        if (!node) continue;

        // Get the account code
        const accountCode = String(
          node.accountCode ?? node.code ?? node.selectedCode ?? "",
        );

        // Check if this is a Purchase Party account (code starts with "221")
        const isPurchaseParty =
          accountCode.startsWith("221") && Boolean(node.isParty);

        if (isPurchaseParty) {
          results.push({
            code: String(node.accountCode ?? node.code ?? ""),
            name: String(node.accountName ?? node.name ?? ""),
            accountName: String(node.accountName ?? node.name ?? ""),
            accountCode: String(node.accountCode ?? node.code ?? ""),
            ...node,
          });
        }

        // Recursively walk children
        if (Array.isArray(node.children) && node.children.length > 0) {
          walk(node.children);
        }
      }
    }

    walk(accounts);

    // Remove duplicates
    const uniqueResults = results.filter(
      (r, idx, arr) =>
        arr.findIndex((x) => x.accountCode === r.accountCode) === idx,
    );

    console.log(
      "Purchase Party Accounts (Suppliers) - codes starting with 221:",
      uniqueResults,
    );
    return uniqueResults;
  })();

  // Supplier select options from Purchase Party accounts
  const supplierSelectOptions =
    supplierAccounts.length > 0
      ? supplierAccounts
          .filter((supplier) => supplier.accountName || supplier.name)
          .map((supplier) => ({
            value: supplier.accountName || supplier.name,
            label: `${supplier.accountCode || supplier.code} - ${
              supplier.accountName || supplier.name
            }`,
            data: supplier,
          }))
      : [{ value: "", label: "No suppliers found", disabled: true }];

  // Function to handle supplier selection
  const handleSupplierSelect = (selectedValue: string) => {
    const selectedSupplier = supplierAccounts.find(
      (s: any) =>
        s.accountName === selectedValue ||
        s.name === selectedValue ||
        `${s.accountCode || s.code} - ${s.accountName || s.name}` ===
          selectedValue,
    );
    if (selectedSupplier) {
      setSupplierNumber(
        selectedSupplier.accountCode || selectedSupplier.code || "",
      );
      setSupplierTitle(selectedSupplier.accountName || selectedSupplier.name);
    }
  };

  // --- Purchase Account mapping logic from Chart of Accounts ---
  // Derive Inventory accounts (Assets → Inventories)
  // Filter accounts whose code starts with "13" (Inventory accounts under Assets)
  const purchaseAccountOptions = (() => {
    const results: any[] = [];
    const allAccounts: any[] = [];

    function walk(nodes: any[]) {
      if (!Array.isArray(nodes)) return;
      for (const node of nodes) {
        if (!node) continue;

        // Get the account code
        const accountCode = String(
          node.accountCode ?? node.code ?? node.selectedCode ?? "",
        );

        // Log all accounts for debugging
        if (accountCode.startsWith("13")) {
          allAccounts.push({
            code: accountCode,
            name: node.accountName ?? node.name ?? "",
            type: node.accountType,
          });
        }

        // Check if this is an Inventory account (code starts with "13")
        const isInventoryAccount = accountCode.startsWith("13");

        // Include if it's an inventory account and EITHER Detail type OR has no children (leaf node)
        if (
          isInventoryAccount &&
          (node.accountType === "Detail" ||
            !node.children ||
            node.children.length === 0)
        ) {
          results.push({
            code: String(node.accountCode ?? node.code ?? ""),
            name: String(node.accountName ?? node.name ?? ""),
            accountName: String(node.accountName ?? node.name ?? ""),
            accountCode: String(node.accountCode ?? node.code ?? ""),
            ...node,
          });
        }

        // Recursively walk children
        if (Array.isArray(node.children) && node.children.length > 0) {
          walk(node.children);
        }
      }
    }

    walk(accounts);

    // Remove duplicates
    const uniqueResults = results.filter(
      (r, idx, arr) =>
        arr.findIndex((x) => x.accountCode === r.accountCode) === idx,
    );

    console.log("All accounts starting with 13 (Inventories):", allAccounts);
    console.log(
      "Purchase Accounts from Inventories (filtered):",
      uniqueResults,
    );

    return uniqueResults.length > 0
      ? uniqueResults.map((acc) => ({
          value: acc.accountCode || acc.code,
          label: `${acc.accountCode || acc.code} - ${
            acc.accountName || acc.name
          }`,
          data: acc,
        }))
      : [{ value: "", label: "No purchase accounts found", disabled: true }];
  })();

  // Function to handle purchase account selection
  const handleSaleAccountSelect = (selectedValue: string) => {
    const selectedAccount = purchaseAccountOptions.find(
      (opt: any) => opt.value === selectedValue,
    );
    if (selectedAccount && "data" in selectedAccount && selectedAccount.data) {
      setPurchaseAccount(selectedValue);
      setPurchaseTitle(
        selectedAccount.data.accountName || selectedAccount.data.name,
      );
    } else {
      setPurchaseAccount(selectedValue);
      setPurchaseTitle("");
    }
  };

  const [search, setSearch] = useState<string>("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const [items, setItems] = useState<ReturnItem[]>([
    {
      product: "",
      quantity: 0,
      rate: 0,
      amount: 0,
      code: "",
      unit: "",
      discount: 0,
      netAmount: 0,
    },
  ]);

  const [editingReturn, setEditingReturn] = useState<ReturnEntry | null>(null);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  // Function to fetch all purchase returns from backend
  const fetchPurchaseReturns = React.useCallback(async () => {
    try {
      const response = await api.get("/purchase-return");
      setReturns(response.data);
    } catch (error) {
      console.error("Error fetching purchase returns:", error);
      notifications.show({
        title: "Error",
        message: "Failed to fetch purchase returns",
        color: "red",
      });
    }
  }, [setReturns]);

  // Add useEffect to fetch purchase returns from backend on component mount
  useEffect(() => {
    fetchPurchaseReturns();
  }, [fetchPurchaseReturns]);

  // Function to create purchase return in backend
  const createPurchaseReturn = async (returnData: ReturnEntry) => {
    try {
      // Extract numeric part from invoice string (e.g., 'PR-1' -> 1)
      const invoiceNumber = returnData.invoice
        ? parseInt(String(returnData.invoice).replace(/\D/g, ""), 10)
        : null;
      const payload = {
        invoiceNumber,
        invoiceDate: returnData.date,
        referenceNumber: returnData.referenceNumber,
        referenceDate: returnData.referenceDate,
        supplier: {
          name: returnData.supplierTitle,
          code: returnData.supplierNumber,
        },
        supplierTitle: returnData.supplierTitle,
        products: returnData.items.map((item) => ({
          code: item.code,
          productName: item.product,
          unit: item.unit,
          quantity: item.quantity,
          rate: item.rate,
          amount: item.amount,
        })),
        notes: returnData.notes,
        amount: returnData.amount,
      };

      const response = await api.post("/purchase-return", payload);

      if (response.data) {
        setReturns((prev) => [response.data, ...prev]);
        notifications.show({
          title: "Success",
          message: "Purchase return created successfully",
          color: "green",
        });
        setOpened(false);
        resetForm();
      }
    } catch (error: unknown) {
      const msg = (error as { response?: { data?: { message?: unknown } } })
        ?.response?.data?.message;
      if (Array.isArray(msg)) {
        const { globalErrors: ge } = parseValidationMessages(msg);
        notifications.show({
          title: ge.length > 0 ? "Operation Failed" : "Validation Error",
          message: ge.length > 0 ? ge.join(", ") : msg.join("\n"),
          color: "red",
          icon: <IconX size={18} />,
        });
      } else {
        notifications.show({
          title: "Operation Failed",
          message:
            typeof msg === "string" && msg
              ? msg
              : "Failed to create purchase return",
          color: "red",
          icon: <IconX size={18} />,
        });
      }
      console.error("Error creating purchase return:", error);
    }
  };

  // Function to update purchase return
  const updatePurchaseReturn = async (returnData: ReturnEntry) => {
    try {
      // Extract numeric part from invoice string (e.g., 'PR-1' -> 1)
      const invoiceNumber = returnData.invoice
        ? parseInt(String(returnData.invoice).replace(/\D/g, ""), 10)
        : null;
      const payload = {
        invoiceNumber,
        invoiceDate: returnData.date,
        referenceNumber: returnData.referenceNumber,
        referenceDate: returnData.referenceDate,
        supplier: {
          name: returnData.supplierTitle,
          code: returnData.supplierNumber,
        },
        supplierTitle: returnData.supplierTitle,
        products: returnData.items.map((item) => ({
          code: item.code,
          productName: item.product,
          unit: item.unit,
          quantity: item.quantity,
          rate: item.rate,
          amount: item.amount,
        })),
        notes: returnData.notes,
        amount: returnData.amount,
      };

      const response = await api.put(
        `/purchase-return/${returnData.id}`,
        payload,
      );

      if (response.data) {
        setReturns((prev) =>
          prev.map((r) => (r.id === returnData.id ? response.data : r)),
        );
        notifications.show({
          title: "Success",
          message: "Purchase return updated successfully",
          color: "green",
        });
        setEditOpened(false);
        setEditingReturn(null);
      }
    } catch (error: unknown) {
      const msg = (error as { response?: { data?: { message?: unknown } } })
        ?.response?.data?.message;
      if (Array.isArray(msg)) {
        const { globalErrors: ge } = parseValidationMessages(msg);
        notifications.show({
          title: ge.length > 0 ? "Operation Failed" : "Validation Error",
          message: ge.length > 0 ? ge.join(", ") : msg.join("\n"),
          color: "red",
          icon: <IconX size={18} />,
        });
      } else {
        notifications.show({
          title: "Operation Failed",
          message:
            typeof msg === "string" && msg
              ? msg
              : "Failed to update purchase return",
          color: "red",
          icon: <IconX size={18} />,
        });
      }
      console.error("Error updating purchase return:", error);
    }
  };

  // Function to delete purchase return
  const deletePurchaseReturn = async (returnId: string) => {
    try {
      await api.delete(`/purchase-return/${returnId}`); // Changed path

      // Remove from local state after successful backend deletion
      setReturns((prev) => prev.filter((r) => r.id !== returnId));

      notifications.show({
        title: "Success",
        message: "Purchase return deleted successfully",
        color: "green",
      });

      setDeleteModalOpen(false);
      setDeleteTarget(null);
    } catch (error: unknown) {
      notifications.show({
        title: "Operation Failed",
        message: extractError(error, "Failed to delete purchase return"),
        color: "red",
        icon: <IconX size={18} />,
      });
      console.error("Error deleting purchase return:", error);
    }
  };

  // Add reset form function
  const resetForm = () => {
    setInvoice(getNextReturnNumber(returns));
    setReturnDate(new Date().toISOString().slice(0, 10));
    setReferenceNumber("");
    setReferenceDate("");
    setSupplierNumber("");
    setSupplierTitle("");
    setPurchaseAccount("");
    setPurchaseTitle("");
    setNotes("");
    setItems([
      {
        product: "",
        quantity: 0,
        rate: 0,
        amount: 0,
        code: "",
        unit: "",
        discount: 0,
        netAmount: 0,
      },
    ]);
  };

  const addItem = () => {
    setItems((prev) => [
      ...prev,
      {
        product: "",
        quantity: 0,
        rate: 0,
        amount: 0,
        code: "",
        unit: "",
        discount: 0,
        netAmount: 0,
      },
    ]);
  };

  const removeItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const updateItem = (
    index: number,
    field: keyof ReturnItem,
    value: string | number,
  ) => {
    setItems((prev) => {
      const newItems = [...prev];
      const item = { ...newItems[index] };

      if (field === "product" && typeof value === "string")
        item.product = value;
      if (field === "quantity" && typeof value === "number")
        item.quantity = value;
      if (field === "rate" && typeof value === "number") item.rate = value;
      if (field === "code" && typeof value === "string") item.code = value;
      if (field === "unit" && typeof value === "string") item.unit = value;
      if (field === "discount" && typeof value === "number")
        item.discount = value;

      item.amount = item.quantity * item.rate;
      item.netAmount = item.amount - (item.amount * (item.discount ?? 0)) / 100;

      newItems[index] = item;
      return newItems;
    });
  };

  // Updated handleSubmit function to use backend
  const handleSubmit = async () => {
    try {
      // Validation
      if (!invoice || !returnDate || !supplierTitle) {
        notifications.show({
          title: "Validation Error",
          message: "Please fill in all required fields",
          color: "red",
        });
        return;
      }

      const newReturn: ReturnEntry = {
        id: getNextReturnNumber(returns),
        invoice,
        date: returnDate,
        referenceNumber,
        referenceDate,
        notes,
        items,
        amount: items.reduce((acc, i) => acc + i.amount, 0),
        supplierNumber,
        supplierTitle,
        purchaseAccount,
        purchaseTitle,
      };

      // Map to backend DTO before sending
      await createPurchaseReturn(newReturn);
    } catch (error) {
      console.error("Error in handleSubmit:", error);
    }
  };

  // Updated handleEditSubmit function to use backend
  const handleEditSubmit = async () => {
    if (!editingReturn) return;

    try {
      const updated: ReturnEntry = {
        ...editingReturn,
        invoice,
        date: returnDate,
        referenceNumber,
        referenceDate,
        notes,
        items,
        amount: items.reduce((acc, i) => acc + i.amount, 0),
        supplierNumber,
        supplierTitle,
        purchaseAccount,
        purchaseTitle,
      };

      await updatePurchaseReturn(updated);
      setEditOpened(false);
      setEditingReturn(null);
      resetForm();
    } catch (error) {
      console.error("Error in handleEditSubmit:", error);
      notifications.show({
        title: "Error",
        message: "Failed to update purchase return",
        color: "red",
      });
    }
  };

  // Updated handleDelete function to use backend
  const handleDelete = async (id: string) => {
    try {
      await deletePurchaseReturn(id);
      setDeleteModalOpen(false);
      setDeleteTarget(null);
    } catch (error) {
      console.error("Error in handleDelete:", error);
      notifications.show({
        title: "Error",
        message: "Failed to delete purchase return",
        color: "red",
      });
    }
  };

  const exportPDF = (entry: ReturnEntry) => {
    const doc = new jsPDF();

    // Header
    doc.setFontSize(18);
    doc.text("CHEMTRONIX ENGINEERING SOLUTION", 14, 14);
    doc.setFontSize(12);
    doc.text(`Purchase Return - ${entry.id}`, 14, 24);

    // Details Table
    autoTable(doc, {
      startY: 32,
      head: [["Field", "Value"]],
      body: [
        ["Invoice", entry.invoice || ""],
        ["Date", entry.date],
        ["Reference Number", entry.referenceNumber || ""],
        ["Reference Date", entry.referenceDate || ""],
        ["Supplier Number", entry.supplierNumber || ""],
        ["Supplier Title", entry.supplierTitle],
        ["Purchase Account", entry.purchaseAccount],
        ["Purchase Title", entry.purchaseTitle],
        ["Notes", entry.notes],
      ],
      styles: { fontSize: 10 },
      headStyles: { fillColor: [10, 104, 2] },
      theme: "grid",
      margin: { left: 14, right: 14 },
    });

    // Items Table
    autoTable(doc, {
      startY: (doc as jsPDF & { lastAutoTable?: { finalY?: number } })
        .lastAutoTable?.finalY
        ? ((doc as jsPDF & { lastAutoTable?: { finalY?: number } })
            .lastAutoTable?.finalY ?? 60) + 8
        : 60,
      head: [["Code", "Product", "Unit", "Quantity", "Rate", "Amount"]],
      body: entry.items.map((item) => [
        item.code,
        item.product,
        item.unit,
        item.quantity,
        item.rate,
        item.amount,
      ]),
      styles: { fontSize: 10 },
      headStyles: { fillColor: [10, 104, 2] },
      theme: "grid",
      margin: { left: 14, right: 14 },
      didDrawPage: (data) => {
        const finalY = (data.cursor?.y ?? 68) + 8;
        doc.setFontSize(12);
        doc.text(`Total: ${entry.amount.toFixed(2)}`, 14, finalY);
      },
    });

    // Footer
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

    doc.save(`${entry.id}.pdf`);
  };

  const filteredReturns = returns.filter((entry) => {
    const matchesSearch =
      (entry.invoice || "").toLowerCase().includes(search.toLowerCase()) ||
      (entry.supplierNumber || "").toLowerCase().includes(search.toLowerCase());

    const entryDate = new Date(entry.date).getTime();
    const fromOk = fromDate ? entryDate >= new Date(fromDate).getTime() : true;
    const toOk = toDate ? entryDate <= new Date(toDate).getTime() : true;

    return matchesSearch && fromOk && toOk;
  });

  // Pagination logic
  const paginatedReturns = filteredReturns.slice(
    (page - 1) * pageSize,
    page * pageSize,
  );

  const exportFilteredPDF = () => {
    const doc = new jsPDF();

    // Header
    doc.setFontSize(18);
    doc.text("CHEMTRONIX ENGINEERING SOLUTION", 14, 14);
    doc.setFontSize(12);
    doc.text("Purchase Returns", 14, 24);

    // Table
    autoTable(doc, {
      startY: 32,
      head: [
        [
          "Invoice",
          "Date",
          "Reference Number",
          "Reference Date",
          "Supplier Number",
          "Supplier Title",
          "Purchase Account",
          "Purchase Title",
          "Amount",
          "Notes",
        ],
      ],
      body: filteredReturns.map((entry) => [
        entry.invoice || "",
        entry.date,
        entry.referenceNumber || "",
        entry.referenceDate || "",
        entry.supplierNumber || "",
        entry.supplierTitle,
        entry.purchaseAccount,
        entry.purchaseTitle,
        entry.amount.toFixed(2),
        entry.notes,
      ]),
      styles: { fontSize: 10 },
      headStyles: { fillColor: [10, 104, 2] },
      theme: "grid",
      margin: { left: 14, right: 14 },
      didDrawPage: (data) => {
        const finalY = (data.cursor?.y ?? 68) + 8;
        doc.setFontSize(12);
        doc.text(`Total Returns: ${filteredReturns.length}`, 14, finalY);
        doc.text(
          `Total Amount: ${filteredReturns
            .reduce((sum, entry) => sum + entry.amount, 0)
            .toFixed(2)}`,
          80,
          finalY,
        );
      },
    });

    // Footer
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

    doc.save("purchase_returns.pdf");
  };

  // When opening the modal, set invoice number and date automatically
  const handleOpen = () => {
    setInvoice(getNextReturnNumber(returns));
    setReturnDate(new Date().toISOString().slice(0, 10)); // set today's date
    setReferenceNumber("");
    setReferenceDate("");
    setSupplierNumber("");
    setSupplierTitle("");
    setPurchaseAccount("");
    setPurchaseTitle("");
    setNotes("");
    setItems([
      {
        product: "",
        quantity: 0,
        rate: 0,
        amount: 0,
        code: "",
        unit: "",
        discount: 0,
        netAmount: 0,
      },
    ]);
    setOpened(true);
  };

  const [productCodes, setProductCodes] = useState<
    {
      value: string;
      label: string;
      productName: string;
      description: string;
      rate: number;
    }[]
  >([]);

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
              label: `${p.code} - ${p.productName || ""}`,
              productName: p.productName || "",
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

  const productCodeOptions = products.map((p) => ({
    value: p.code,
    label: p.code,
  }));

  const productNameOptions = products.map((p) => ({
    value: p.productName,
    label: p.productName,
  }));

  // NEW: Print return using centralized print service
  const handlePrintReturn = (entry: ReturnEntry) => {
    openPrintPreview({
      type: "purchase-return",
      title: "Purchase Return",
      content: (
        <PurchaseReturnContent
          data={{
            id: entry.id,
            invoice: entry.invoice,
            date: entry.date,
            referenceNumber: entry.referenceNumber,
            referenceDate: entry.referenceDate,
            supplierNumber: entry.supplierNumber,
            supplierTitle: entry.supplierTitle,
            purchaseAccount: entry.purchaseAccount,
            purchaseTitle: entry.purchaseTitle,
            items: entry.items.map((item) => ({
              code: item.code,
              product: item.product,
              unit: item.unit,
              quantity: item.quantity,
              rate: item.rate,
              amount: item.amount,
              discount: item.discount || 0,
              netAmount: item.netAmount || 0,
            })),
            notes: entry.notes,
            amount: entry.amount,
          }}
        />
      ),
      showHeader: true,
      showFooter: true,
      onPrintComplete: () => {
        closePrintPreview();
      },
    });

    // Automatically trigger print dialog after DOM is ready
    setTimeout(() => {
      print();
    }, 300);
  };

  const netTotal = items.reduce((sum, item) => sum + (item.netAmount ?? 0), 0);

  // Add this missing editNetTotal calculation
  const editNetTotal = items.reduce(
    (sum, item) => sum + (item.netAmount ?? 0),
    0,
  );

  // Add this missing handleEdit function
  const handleEdit = (entry: ReturnEntry) => {
    setEditingReturn(entry);
    setInvoice(entry.invoice || "");
    setReturnDate(entry.date);
    setReferenceNumber(entry.referenceNumber || "");
    setReferenceDate(entry.referenceDate || "");
    setSupplierNumber(entry.supplierNumber || "");
    setSupplierTitle(entry.supplierTitle);
    setPurchaseAccount(entry.purchaseAccount);
    setPurchaseTitle(entry.purchaseTitle);
    setNotes(entry.notes);
    setItems(entry.items);
    setEditOpened(true);
  };

  return (
    <div>
      <Card shadow="sm" p="lg" radius="md" withBorder mt={20} bg={"#F1FCF0"}>
        <Group justify="space-between" mb="md">
          <div>
            <h2>Purchase Returns</h2>
            <p>Manage purchase returns and refunds</p>
          </div>
          <Button
            leftSection={<IconPlus size={16} />}
            onClick={handleOpen}
            color="#0A6802"
          >
            New Purchase Return
          </Button>
        </Group>

        <Group mb="md" grow>
          <TextInput
            label="Search"
            w={220}
            placeholder="Search by Invoice No ..."
            leftSection={<IconSearch size={16} />}
            value={search}
            onChange={(e) => setSearch(e.currentTarget.value)}
          />
          <TextInput
            label="From Date"
            type="date"
            placeholder="From Date"
            value={fromDate}
            onChange={(e) => setFromDate(e.currentTarget.value)}
            style={{ minWidth: 140 }}
          />
          <TextInput
            label="To Date"
            type="date"
            placeholder="To Date"
            value={toDate}
            onChange={(e) => setToDate(e.currentTarget.value)}
            style={{ minWidth: 140 }}
          />
          <Group>
            <Button
              mt={22}
              variant="outline"
              color="#0A6802"
              onClick={() => {
                setSearch("");
                setFromDate("");
                setToDate("");
              }}
            >
              Clear
            </Button>
            <Button
              mt={22}
              variant="filled"
              color="#0A6802"
              leftSection={<IconDownload size={16} />}
              onClick={exportFilteredPDF}
            >
              Export
            </Button>
          </Group>

          <Group justify="flex-end">
            <Select
              label="Rows per page"
              data={["5", "10", "20", "50"]}
              value={pageSize.toString()}
              onChange={(val) => {
                setPageSize(Number(val));
                setPage(1);
              }}
              style={{ width: 120 }}
              size="xs"
            />
          </Group>
        </Group>

        <Table highlightOnHover withColumnBorders>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Invoice</Table.Th>
              <Table.Th>Date</Table.Th>
              <Table.Th>Reference Number</Table.Th>
              <Table.Th>Reference Date</Table.Th>
              <Table.Th>Supplier Number</Table.Th>
              <Table.Th>Supplier Title</Table.Th>
              <Table.Th>Purchase Account</Table.Th>
              <Table.Th>Purchase Title</Table.Th>
              <Table.Th>Amount</Table.Th>
              <Table.Th>Actions</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {paginatedReturns.map((r) => (
              <Table.Tr key={r.id}>
                <Table.Td>{r.invoice}</Table.Td>
                <Table.Td>{r.date}</Table.Td>
                <Table.Td>{r.referenceNumber}</Table.Td>
                <Table.Td>{r.referenceDate}</Table.Td>
                <Table.Td>{r.supplierNumber}</Table.Td>
                <Table.Td>{r.supplierTitle}</Table.Td>
                <Table.Td>{r.purchaseAccount}</Table.Td>
                <Table.Td>{r.purchaseTitle}</Table.Td>
                <Table.Td>Rs. {r.amount.toLocaleString()}</Table.Td>
                <Table.Td>
                  <Group gap="xs">
                    <ActionIcon
                      variant="light"
                      color="#0A6802"
                      onClick={() => handleEdit(r)}
                    >
                      <IconPencil size={16} />
                    </ActionIcon>
                    <ActionIcon
                      variant="light"
                      color="red"
                      onClick={() => {
                        setDeleteTarget(r);
                        setDeleteModalOpen(true);
                      }}
                    >
                      <IconTrash size={16} />
                    </ActionIcon>
                    <Modal
                      opened={deleteModalOpen}
                      onClose={() => setDeleteModalOpen(false)}
                      title="Confirm Delete"
                      centered
                    >
                      <p>
                        Are you sure you want to delete{" "}
                        <b>{deleteTarget?.invoice}</b>?
                      </p>
                      <Group justify="flex-end" mt="md">
                        <Button
                          variant="default"
                          onClick={() => setDeleteModalOpen(false)}
                        >
                          Cancel
                        </Button>
                        <Button
                          color="red"
                          onClick={
                            () => deleteTarget && handleDelete(deleteTarget.id) // This now calls backend function
                          }
                        >
                          Delete
                        </Button>
                      </Group>
                    </Modal>
                    <ActionIcon
                      variant="light"
                      color="#819E00"
                      onClick={() => exportPDF(r)}
                    >
                      <IconDownload size={16} />
                    </ActionIcon>
                    <ActionIcon
                      variant="light"
                      color="#819E00"
                      onClick={() => handlePrintReturn(r)}
                      title="Print"
                    >
                      <IconPrinter size={16} />
                    </ActionIcon>
                  </Group>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>

        <Group mt="md" justify="center">
          <Pagination
            value={page}
            onChange={setPage}
            total={Math.max(1, Math.ceil(filteredReturns.length / pageSize))}
            color="#0A6802"
            radius="md"
            size="md"
            withControls
          />
        </Group>
      </Card>

      <Modal
        opened={opened}
        onClose={() => setOpened(false)}
        title="Create Purchase Return"
        size="100%"
        centered
      >
        <Group grow mb="md" w={"50%"}>
          <TextInput
            label="Invoice Number"
            placeholder="Enter invoice number"
            value={invoice}
            onChange={(e) => setInvoice(e.currentTarget.value)}
            readOnly
          />
          <TextInput
            label="Date"
            type="date"
            placeholder="mm/dd/yyyy"
            value={returnDate}
            onChange={(e) => setReturnDate(e.currentTarget.value)}
          />
          <TextInput
            label="Reference Number"
            placeholder="Enter reference number"
            value={referenceNumber}
            onChange={(e) => setReferenceNumber(e.currentTarget.value)}
          />
          <TextInput
            label="Reference Date"
            type="date"
            placeholder="mm/dd/yyyy"
            value={referenceDate}
            onChange={(e) => setReferenceDate(e.currentTarget.value)}
          />
        </Group>
        <Group grow mb="md">
          <Select
            label="Select Supplier (Purchase Party)"
            placeholder="Choose supplier from Purchase Party accounts"
            data={supplierSelectOptions}
            value={supplierNumber}
            onChange={(selectedValue) => {
              if (selectedValue) {
                handleSupplierSelect(selectedValue);
              }
            }}
            searchable
            clearable
            maxDropdownHeight={200}
          />
          <TextInput
            label="Supplier Title (Auto-filled)"
            placeholder="Auto-filled from selected account"
            value={supplierTitle}
            onChange={(e) => setSupplierTitle(e.currentTarget.value)}
          />
        </Group>
        <Group grow mb="md">
          <Select
            label="Purchase Account"
            placeholder="Select purchase account from Chart of Accounts"
            data={purchaseAccountOptions}
            value={purchaseAccount}
            onChange={(selectedValue) => {
              if (selectedValue) {
                handleSaleAccountSelect(selectedValue);
              }
            }}
            searchable
            clearable
          />
          <TextInput
            label="Purchase Title (Auto-filled)"
            placeholder="Auto-filled from selected account"
            value={purchaseTitle}
            onChange={(e) => setPurchaseTitle(e.currentTarget.value)}
          />
        </Group>
        <ReturnForm
          notes={notes}
          setNotes={setNotes}
          items={items}
          setItems={setItems}
          updateItem={updateItem}
          addItem={addItem}
          removeItem={removeItem}
          productCodes={productCodes}
          productCodeOptions={productCodeOptions}
          productNameOptions={productNameOptions}
          netTotal={netTotal} // <-- Add this line
        />
        <Group justify="flex-end" mt="lg">
          <Button
            color="#819E00"
            onClick={() =>
              handlePrintReturn({
                id: invoice,
                invoice,
                date: returnDate,
                referenceNumber,
                referenceDate,
                notes,
                items,
                amount: items.reduce((acc, i) => acc + i.amount, 0),
                supplierNumber,
                supplierTitle,
                purchaseAccount,
                purchaseTitle,
              })
            }
            leftSection={<IconPrinter size={16} />}
          >
            Print
          </Button>
          <Button variant="default" onClick={() => setOpened(false)}>
            Cancel
          </Button>
          <Button color="#0A6802" onClick={handleSubmit}>
            Create Return
          </Button>
        </Group>
      </Modal>

      <Modal
        opened={editOpened}
        onClose={() => setEditOpened(false)}
        title="Edit Purchase Return"
        size="70%"
        centered
      >
        <Group grow mb="md" w={"50%"}>
          <TextInput
            label="Invoice Number"
            placeholder="Enter invoice number"
            value={invoice}
            onChange={(e) => setInvoice(e.currentTarget.value)}
          />
          <TextInput
            label="Date"
            type="date"
            placeholder="mm/dd/yyyy"
            value={returnDate}
            onChange={(e) => setReturnDate(e.currentTarget.value)}
          />
          <TextInput
            label="Reference Number"
            placeholder="Enter reference number"
            value={referenceNumber}
            onChange={(e) => setReferenceNumber(e.currentTarget.value)}
          />
          <TextInput
            label="Reference Date"
            type="date"
            placeholder="mm/dd/yyyy"
            value={referenceDate}
            onChange={(e) => setReferenceDate(e.currentTarget.value)}
          />
        </Group>
        <Group grow mb="md">
          <TextInput
            label="Supplier Number"
            placeholder="Enter supplier number"
            value={supplierNumber}
            onChange={(e) => setSupplierNumber(e.currentTarget.value)}
          />
          <TextInput
            label="Supplier Title"
            placeholder="Enter supplier name/title"
            value={supplierTitle}
            onChange={(e) => setSupplierTitle(e.currentTarget.value)}
          />
        </Group>
        <Group grow mb="md">
          <Select
            label="Purchase Account"
            placeholder="Select purchase account from Chart of Accounts"
            data={purchaseAccountOptions}
            value={purchaseAccount}
            onChange={(selectedValue) => {
              if (selectedValue) {
                handleSaleAccountSelect(selectedValue);
              }
            }}
            searchable
            clearable
          />
          <TextInput
            label="Purchase Title (Auto-filled)"
            placeholder="Auto-filled from selected account"
            value={purchaseTitle}
            onChange={(e) => setPurchaseTitle(e.currentTarget.value)}
          />
        </Group>
        <ReturnForm
          notes={notes}
          setNotes={setNotes}
          items={items}
          setItems={setItems}
          updateItem={updateItem}
          addItem={addItem}
          removeItem={removeItem}
          productCodes={productCodes}
          productCodeOptions={productCodeOptions}
          productNameOptions={productNameOptions}
          netTotal={editNetTotal} // Changed from 0 to editNetTotal
        />

        <Group justify="flex-end" mt="lg">
          <Button variant="default" onClick={() => setEditOpened(false)}>
            Cancel
          </Button>
          <Button color="#0A6802" onClick={handleEditSubmit}>
            Save Changes
          </Button>
        </Group>
      </Modal>

      {/* Centralized Print Preview Component */}
      <PrintPreview
        isOpen={isPreviewOpen}
        data={printData}
        onClose={closePrintPreview}
      />
    </div>
  );
}

interface ReturnFormProps {
  notes: string;
  setNotes: (notes: string) => void;
  items: ReturnItem[];
  setItems: React.Dispatch<React.SetStateAction<ReturnItem[]>>;
  updateItem: (
    index: number,
    field: keyof ReturnItem,
    value: string | number,
  ) => void;
  addItem: () => void;
  removeItem: (index: number) => void;
  productCodes: {
    value: string;
    label: string;
    productName: string;
    description: string;
    rate: number;
  }[];
  productCodeOptions: { value: string; label: string }[];
  productNameOptions: { value: string; label: string }[];
  netTotal: number; // <-- Add this line
}

function ReturnForm({
  notes,
  setNotes,
  items,
  setItems,
  updateItem,
  addItem,
  removeItem,
  productCodes,

  netTotal, // <-- Add this line
}: ReturnFormProps) {
  return (
    <>
      <div>
        <p className="font-medium mb-2">Return Items</p>
        {items.map((item: ReturnItem, index: number) => (
          <Group key={index} grow mb="xs">
            <Select
              label="Code"
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
                newItems[index].rate = selected?.rate || 0;
                setItems(newItems);
              }}
              searchable
            />
            <Select
              label="Product"
              placeholder="Product Name"
              data={Array.from(
                new Map(
                  productCodes.map((p) => [
                    p.productName,
                    {
                      value: p.productName,
                      label: p.productName,
                      code: p.value,
                      description: p.description,
                      rate: p.rate,
                    },
                  ]),
                ).values(),
              )}
              value={item.product}
              onChange={(v) => {
                const selected = productCodes.find((p) => p.productName === v);
                const newItems = [...items];
                newItems[index].product = v || "";
                newItems[index].code = selected?.value || "";
                newItems[index].rate = selected?.rate || 0;
                setItems(newItems);
              }}
              searchable
            />
            <TextInput
              label="Unit"
              value={item.unit || ""}
              onChange={(e) => updateItem(index, "unit", e.currentTarget.value)}
            />
            <NumberInput
              label="Quantity"
              placeholder="Qty"
              value={item.quantity}
              onChange={(val) => updateItem(index, "quantity", val ?? 0)}
            />
            <NumberInput
              label="Rate"
              placeholder="Rate"
              value={item.rate}
              onChange={(val) => updateItem(index, "rate", val ?? 0)}
            />
            <NumberInput
              label="Amount"
              placeholder="Amount"
              value={item.amount}
              readOnly
            />
            <NumberInput
              label="Discount (%)"
              placeholder="Discount"
              value={item.discount}
              onChange={(val) => updateItem(index, "discount", val ?? 0)}
            />
            <NumberInput
              label="Net Amount"
              placeholder="Net Amount"
              value={item.netAmount}
              readOnly
            />
            <ActionIcon mt={20} color="#0A6802" onClick={addItem}>
              <IconPlus size={16} />
            </ActionIcon>
            {items.length > 1 && (
              <ActionIcon mt={20} color="red" onClick={() => removeItem(index)}>
                <IconMinus size={16} />
              </ActionIcon>
            )}
          </Group>
        ))}
      </div>

      {/* Net Total above Notes */}
      <Group mb="md">
        <div style={{ fontWeight: "bold", fontSize: 16, color: "#0A6802" }}>
          Net Total: {netTotal.toFixed(2)}
        </div>
      </Group>

      <Textarea
        label="Notes"
        placeholder="Additional notes..."
        value={notes}
        onChange={(e) => setNotes(e.currentTarget.value)}
        mt="md"
      />
    </>
  );
}
