import {
  Card,
  Group,
  Button,
  Table,
  ActionIcon,
  Title,
  Text,
  Modal,
  Select,
  NumberInput,
  TextInput,
  Textarea,
  Pagination,
} from "@mantine/core";
import {
  IconPlus,
  IconTrash,
  IconPencil,
  IconDownload,
  IconSearch,
  IconX,
} from "@tabler/icons-react";
import { useMemo, useState, useRef, useEffect } from "react";
import { getHeaderImage, getFooterImage } from "../../../utils/assetPaths";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useSaleReturns } from "../../Context/Invoicing/SaleReturnsContext";
import {
  type SaleReturn,
  type SaleReturnItem,
} from "../../Context/Invoicing/SaleReturnsContext";
import api from "../../../api_configuration/api";
import { notifications } from "@mantine/notifications";
import { useChartOfAccounts } from "../../Context/ChartOfAccountsContext";
import { getReceivableAccounts } from "../../utils/receivableAccounts";
import type { AccountNode } from "../../Context/ChartOfAccountsContext";

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

function SaleReturnsInner() {
  const { returns, setReturns } = useSaleReturns(); // Updated to use setReturns instead of addReturn, updateReturn, deleteReturn
  const { accounts } = useChartOfAccounts();

  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [opened, setOpened] = useState(false);
  const [editData, setEditData] = useState<SaleReturn | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [invoiceNumber, setInvoiceNumber] = useState<string>("");
  const [customer, setCustomer] = useState<string>("");
  const [customerTitle, setCustomerTitle] = useState<string>("");
  const [saleAccount, setSaleAccount] = useState<string>("");
  const [saleTitle, setSaleTitle] = useState<string>("");
  const [salesman, setSalesman] = useState<string>("");
  const [date, setDate] = useState<string>("");
  const [items, setItems] = useState<SaleReturnItem[]>([]);
  const [notes, setNotes] = useState<string>("");

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  const filteredData = useMemo(() => {
    const q = search.trim().toLowerCase();
    return returns.filter((d) => {
      const matchesSearch = !q || d.id.toLowerCase().includes(q);
      const matchesFromDate =
        !fromDate || new Date(d.date) >= new Date(fromDate);
      const matchesToDate = !toDate || new Date(d.date) <= new Date(toDate);
      return matchesSearch && matchesFromDate && matchesToDate;
    });
  }, [returns, search, fromDate, toDate]);

  const paginatedData = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, page, pageSize]);

  // PDF Export: remove reason, add Discount and Net Amount columns
  const exportPDF = (row: SaleReturn) => {
    const doc = new jsPDF("p", "pt", "a4");
    const companyName = "Chemtronix Engineering Solutions";
    const reportTitle = "Sale Return Invoice";
    const currentDate = new Date().toLocaleDateString();

    doc.setFontSize(16);
    doc.text(companyName, 40, 30);
    doc.setFontSize(14);
    doc.text(reportTitle, 40, 55);

    doc.setFontSize(11);
    doc.text(`Date: ${currentDate}`, 480, 30);
    doc.text(`Invoice #: ${row.id}`, 40, 75);
    doc.text(`Return Date: ${row.date}`, 250, 75);
    doc.text(`Customer: ${row.customer || "-"}`, 40, 95);
    doc.text(`Customer Title: ${row.customerTitle || "-"}`, 250, 95);
    doc.text(`Sale Account: ${row.saleAccount || "-"}`, 40, 115);
    doc.text(`Sale Title: ${row.saleTitle || "-"}`, 250, 115);
    doc.text(`Salesman: ${row.salesman || "-"}`, 40, 135);
    doc.text(`Notes: ${row.notes || "-"}`, 40, 155);

    autoTable(doc, {
      startY: 175,
      head: [
        [
          "Code",
          "Product Name",
          "Description",
          "Unit",
          "Quantity",
          "Rate",
          "Amount",
          "Discount (%)",
          "Net Amount",
        ],
      ],
      body:
        row.items && row.items.length > 0
          ? row.items.map((item) => [
              item.code,
              item.productName,
              item.description,
              item.unit ?? "-",
              item.quantity,
              item.rate,
              item.amount,
              item.discount ?? 0,
              (item.amount ?? 0) -
                ((item.amount ?? 0) * (item.discount ?? 0)) / 100,
            ])
          : [["-", "-", "-", "-", "-", "-", "-", "-", "-"]],
      styles: { fontSize: 10 },
      headStyles: { fillColor: [10, 104, 2] },
      theme: "grid",
      margin: { left: 40, right: 40 },
      didDrawPage: function () {
        const pageCount = doc.getNumberOfPages();
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`Date: ${currentDate}`, 40, doc.internal.pageSize.height - 30);
        doc.text(
          `Page ${doc.getCurrentPageInfo().pageNumber} of ${pageCount}`,
          480,
          doc.internal.pageSize.height - 30,
        );
      },
    });

    // Totals
    let totalQty = 0;
    let totalAmount = 0;
    if (row.items && row.items.length > 0) {
      row.items.forEach((item) => {
        totalQty += Number(item.quantity) || 0;
        totalAmount += Number(item.amount) || 0;
      });
    }

    doc.setFontSize(12);
    doc.setTextColor("#0A6802");
    type JsPDFWithAutoTable = jsPDF & { lastAutoTable?: { finalY?: number } };
    const docWithAutoTable = doc as JsPDFWithAutoTable;
    const finalY =
      docWithAutoTable.lastAutoTable && docWithAutoTable.lastAutoTable.finalY
        ? docWithAutoTable.lastAutoTable.finalY + 20
        : doc.internal.pageSize.height - 60;
    doc.text(`Total Qty: ${totalQty}`, 40, finalY);
    doc.text(`Total Amount: ${totalAmount.toFixed(2)}`, 200, finalY);

    doc.save(`${row.id}.pdf`);
  };

  const exportFilteredPDF = () => {
    const doc = new jsPDF("p", "pt", "a4");
    const companyName = "Chemtronix Engineering Solutions";
    const reportTitle = "Sale Returns Report";
    const currentDate = new Date().toLocaleDateString();

    doc.setFontSize(16);
    doc.text(companyName, 40, 30);
    doc.setFontSize(14);
    doc.text(reportTitle, 40, 55);

    doc.setFontSize(11);
    let dateText = "";
    if (fromDate && toDate) {
      dateText = `From: ${fromDate}   To: ${toDate}`;
    } else if (fromDate) {
      dateText = `From: ${fromDate}`;
    } else if (toDate) {
      dateText = `To: ${toDate}`;
    }
    if (dateText) {
      doc.text(dateText, 40, 75);
    }

    autoTable(doc, {
      startY: dateText ? 95 : 80,
      head: [
        [
          "Invoice #",
          "Date",
          "Customer",
          "Customer Title",
          "Sale Account",
          "Sale Title",
          "Salesman",
          "Notes",
          "Total Qty",
          "Total Amount",
        ],
      ],
      body: filteredData.map((row) => {
        let totalQty = 0;
        let totalAmount = 0;
        if (row.items && row.items.length > 0) {
          row.items.forEach((item) => {
            totalQty += Number(item.quantity) || 0;
            totalAmount += Number(item.amount) || 0;
          });
        }
        return [
          row.id,
          row.date,
          row.customer || "-",
          row.customerTitle || "-",
          row.saleAccount || "-",
          row.saleTitle || "-",
          row.salesman || "-",
          row.notes || "-",
          totalQty,
          totalAmount.toFixed(2),
        ];
      }),
      styles: { fontSize: 10 },
      headStyles: { fillColor: [10, 104, 2] },
      theme: "grid",
      margin: { left: 40, right: 40 },
      didDrawPage: function () {
        const pageCount = doc.getNumberOfPages();
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`Date: ${currentDate}`, 40, doc.internal.pageSize.height - 30);
        doc.text(
          `Page ${doc.getCurrentPageInfo().pageNumber} of ${pageCount}`,
          480,
          doc.internal.pageSize.height - 30,
        );
      },
    });

    // Grand Totals
    let grandQty = 0;
    let grandAmount = 0;
    filteredData.forEach((row) => {
      if (row.items && row.items.length > 0) {
        row.items.forEach((item) => {
          grandQty += Number(item.quantity) || 0;
          grandAmount += Number(item.amount) || 0;
        });
      }
    });

    doc.setFontSize(12);
    doc.setTextColor("#0A6802");
    type JsPDFWithAutoTable = jsPDF & { lastAutoTable?: { finalY?: number } };
    const docWithAutoTable = doc as JsPDFWithAutoTable;
    const finalY =
      docWithAutoTable.lastAutoTable && docWithAutoTable.lastAutoTable.finalY
        ? docWithAutoTable.lastAutoTable.finalY + 20
        : doc.internal.pageSize.height - 60;
    doc.text(`Grand Total Qty: ${grandQty}`, 40, finalY);
    doc.text(`Grand Total Amount: ${grandAmount.toFixed(2)}`, 200, finalY);

    doc.save("sale_returns_report.pdf");
  };

  const openCreate = () => {
    setEditData(null);
    resetForm();
    setInvoiceNumber(getNextInvoiceNumber(returns)); // auto-generate invoice #
    setDate(new Date().toISOString().slice(0, 10)); // auto-set today's date
    setOpened(true);
  };

  const openEdit = (row: SaleReturn) => {
    setEditData(row);
    setInvoiceNumber(row.id);
    setCustomer(row.customer);
    setCustomerTitle(row.customerTitle);
    setSaleAccount(row.saleAccount);
    setSaleTitle(row.saleTitle);
    setSalesman(row.salesman);
    setDate(row.date);
    setItems(row.items.map((i) => ({ ...i })));
    setNotes(row.notes || "");
    setOpened(true);
  };

  const openDelete = (id: string) => {
    setDeleteId(id);
  };

  // Add useEffect to fetch sale returns from backend on component mount
  useEffect(() => {
    fetchSaleReturns();
  }, []);

  // Function to fetch all sale returns from backend
  const fetchSaleReturns = async () => {
    try {
      const response = await api.get("/sale-return"); // Changed path
      setReturns(response.data);
    } catch (error) {
      console.error("Error fetching sale returns:", error);
      notifications.show({
        title: "Error",
        message: "Failed to fetch sale returns",
        color: "red",
      });
    }
  };

  // Function to create sale return in backend
  const createSaleReturn = async (returnData: SaleReturn) => {
    try {
      const payload = {
        id: returnData.id,
        customer: returnData.customer,
        customerTitle: returnData.customerTitle,
        saleAccount: returnData.saleAccount,
        saleTitle: returnData.saleTitle,
        salesman: returnData.salesman,
        date: returnData.date,
        items: returnData.items,
        notes: returnData.notes,
        amount: returnData.amount,
      };

      const response = await api.post(
        "/sale-return", // Changed path
        payload,
      );

      if (response.data) {
        // Add to local state after successful backend save
        setReturns((prev) => [response.data, ...prev]);

        notifications.show({
          title: "Success",
          message: "Sale return created successfully",
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
              : "Failed to create sale return",
          color: "red",
          icon: <IconX size={18} />,
        });
      }
      console.error("Error creating sale return:", error);
    }
  };

  // Function to update sale return
  const updateSaleReturn = async (returnData: SaleReturn) => {
    try {
      const payload = {
        id: returnData.id,
        customer: returnData.customer,
        customerTitle: returnData.customerTitle,
        saleAccount: returnData.saleAccount,
        saleTitle: returnData.saleTitle,
        salesman: returnData.salesman,
        date: returnData.date,
        items: returnData.items,
        notes: returnData.notes,
        amount: returnData.amount,
      };

      const response = await api.put(
        `/sale-return/${returnData.id}`, // Changed path
        payload,
      );

      if (response.data) {
        // Update local state after successful backend update
        setReturns((prev) =>
          prev.map((r) => (r.id === returnData.id ? response.data : r)),
        );

        notifications.show({
          title: "Success",
          message: "Sale return updated successfully",
          color: "green",
        });

        setOpened(false);
        setEditData(null);
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
              : "Failed to update sale return",
          color: "red",
          icon: <IconX size={18} />,
        });
      }
      console.error("Error updating sale return:", error);
    }
  };

  // Function to delete sale return
  const deleteSaleReturn = async (returnId: string) => {
    try {
      await api.delete(`/sale-return/${returnId}`); // Changed path

      // Remove from local state after successful backend deletion
      setReturns((prev) => prev.filter((r) => r.id !== returnId));

      notifications.show({
        title: "Success",
        message: "Sale return deleted successfully",
        color: "green",
      });

      setDeleteId(null);
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
              : "Failed to delete sale return",
          color: "red",
          icon: <IconX size={18} />,
        });
      }
      console.error("Error deleting sale return:", error);
    }
  };

  // Updated handleSave function to use backend
  const handleSave = async () => {
    try {
      if (!invoiceNumber || !date) {
        notifications.show({
          title: "Validation Error",
          message: "Please fill in required fields",
          color: "red",
        });
        return;
      }

      const normalized = items.map((i) => {
        const qty = Number(i.quantity) || 0;
        const rate = Number(i.rate) || 0;
        const amount = qty * rate;
        const discount = Number(i.discount) || 0;
        const netAmount = amount - (amount * discount) / 100;
        return { ...i, quantity: qty, rate, amount, discount, netAmount };
      });

      const returnData: SaleReturn = {
        id: invoiceNumber,
        customer,
        customerTitle,
        saleAccount,
        saleTitle,
        salesman,
        date,
        items: normalized,
        notes,
        number: invoiceNumber,
        accountTitle: customerTitle,
        amount: netTotal,
      };

      if (editData) {
        await updateSaleReturn(returnData);
      } else {
        await createSaleReturn(returnData);
      }
    } catch (error) {
      console.error("Error in handleSave:", error);
    }
  };

  // Updated confirmDelete function to use backend
  const confirmDelete = async () => {
    if (deleteId) {
      await deleteSaleReturn(deleteId);
    }
  };

  const resetForm = () => {
    setInvoiceNumber("");
    setCustomer("");
    setCustomerTitle("");
    setSaleAccount("");
    setSaleTitle("");
    setSalesman("");
    setDate("");
    setItems([]);
    setNotes("");
  };

  const printInvoiceWindow = (invoice: SaleReturn) => {
    try {
      // Calculate totals
      const itemsList = invoice.items || [];
      const subtotal = itemsList.reduce(
        (s, it) => s + (it.quantity || 0) * (it.rate || 0),
        0,
      );
      const totalDiscount = itemsList.reduce(
        (s, it) =>
          s + ((it.quantity || 0) * (it.rate || 0) * (it.discount || 0)) / 100,
        0,
      );
      const grandTotal = subtotal - totalDiscount;

      // Helper function to convert number to words
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

      // Build HTML rows for items with padding
      const _itemsForRows = invoice.items || [];
      const itemsRows = _itemsForRows
        .map((item, idx) => {
          const amount = (item.quantity || 0) * (item.rate || 0);
          const discountAmount = (amount * (item.discount || 0)) / 100;
          const netAmount = amount - discountAmount;
          return `<tr>
                    <td align="center">${idx + 1}</td>
                    <td align="center">${(
                      item.productName ||
                      item.description ||
                      item.code ||
                      ""
                    ).replace(/</g, "&lt;")}</td>
                    <td align="center">${item.code || ""}</td>
                    <td align="center">${(item.rate || 0).toFixed(2)}</td>
                    <td align="center">${(item.quantity || 0).toFixed(2)}</td>
                    <td class="right">PKR ${amount.toFixed(2)}</td>
                    <td align="center">${(item.discount || 0).toFixed(2)}%</td>
                    <td class="right">PKR ${netAmount.toFixed(2)}</td>
                  </tr>`;
        })
        .join("");

      // Add padding rows for consistent layout
      const desiredRows = 8;
      const paddingCount = Math.max(0, desiredRows - _itemsForRows.length);
      const paddingRows = Array.from({ length: paddingCount })
        .map(() => {
          return `<tr>
                    <td align="center">&nbsp;</td>
                    <td align="center">&nbsp;</td>
                    <td align="center">&nbsp;</td>
                    <td align="center">&nbsp;</td>
                    <td align="center">&nbsp;</td>
                    <td class="right">&nbsp;</td>
                    <td align="center">&nbsp;</td>
                    <td class="right">&nbsp;</td>
                  </tr>`;
        })
        .join("");

      const rowsHtml = itemsRows + paddingRows;
      const brand = "chemtronix";

      const html = `<!doctype html>
        <html>
        <head>
          <meta charset="utf-8" />
          <title>Sale Return ${invoice.id}</title>
          <style>
            body { font-family: Arial, sans-serif; color: #222; margin: 24px; }
            .header { display:flex; align-items:center; gap:12px; }
            .company { color: #0A6802; font-weight:700; font-size:18px; }
            .meta { margin-top: 12px; display: flex; justify-content: space-between; gap:12px; }
            .box { border: 1px solid #222; padding: 8px; }
            table { width: 100%; border-collapse: collapse; margin-top: 12px; border: 2px solid #000; }
            th, td { border: 1px solid #000; padding: 8px; font-size: 12px; vertical-align: top; }
            thead th:nth-child(2), tbody td:nth-child(2) { width: 30%; }
            thead th { background: #e9e9e9; color: #0B4AA6; font-weight: 700; border-bottom: 1px solid #000; }
            thead th:first-child { border-left: 1px solid #000; border-top-left-radius: 6px; }
            thead th:last-child { border-right: 1px solid #000; border-top-right-radius: 6px; }
            tbody td:first-child { border-left: 1px solid #000; }
            tbody tr { height: 48px; }
            tbody td:last-child { border-right: 1px solid #000; }
            .totals { margin-top: 12px; width: 100%; display: flex; justify-content: flex-end; }
            .totals .block { width: 320px; border: 1px solid #222; padding: 12px; }
            .right { text-align: right; }
            .muted { color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="header" style="padding:0;">
            <img src="${getHeaderImage(brand)}" alt="Header" style="display:block; width:calc(100% + 48px); height:auto; object-fit: cover;" />
          </div>
          
          <div style="text-align:center; margin:12px 0; font-size:20px; font-weight:700; color:#d32f2f;">
            SALE RETURN
          </div>

          <div class="meta">
            <div class="box" style="flex:1; margin-right:8px;">
              <div><strong>Title:</strong> ${
                invoice.customerTitle || invoice.accountTitle || ""
              }</div>
              <div><strong>Account:</strong> ${invoice.customer || ""}</div>
              <div><strong>Sale Account:</strong> ${
                invoice.saleAccount || ""
              }</div>
              <div><strong>Salesman:</strong> ${invoice.salesman || ""}</div>
            </div>
            <div style="width:320px;">
              <div class="box">
                <div><strong>Return No:</strong> ${invoice.id}</div>
                <div><strong>Return Date:</strong> ${invoice.date}</div>
                <div><strong>Invoice No:</strong> ${invoice.number || ""}</div>
              </div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>SR No</th>
                <th>Description</th>
                <th>Code</th>
                <th>Rate</th>
                <th>Qty</th>
                <th>Amount</th>
                <th>Discount</th>
                <th>Net Amount</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>

          <div style="margin-top:8px; font-size:12px; color:#666;">*Computer generated sale return. No need for signature</div>

          <div class="totals">
            <div class="block">
              <div style="display:flex; justify-content:space-between;">
                <div>Gross Total:</div>
                <div>PKR ${subtotal.toFixed(2)}</div>
              </div>
              <div style="display:flex; justify-content:space-between;">
                <div>Total Discount:</div>
                <div>PKR ${totalDiscount.toFixed(2)}</div>
              </div>
              <hr />
              <div style="display:flex; justify-content:space-between; font-weight:bold;">
                <div>Grand Total:</div>
                <div>PKR ${grandTotal.toFixed(2)}</div>
              </div>
              <div style="margin-top:10px; font-size:12px;">Amount in words: ${numberToWordsLocal(
                Math.round(grandTotal),
              )}</div>
              ${
                invoice.notes
                  ? `<div style="margin-top:10px; font-size:11px;"><strong>Notes:</strong> ${invoice.notes}</div>`
                  : ""
              }
            </div>
          </div>

          <div style="margin-top:18px; page-break-inside:avoid;" class="footer">
            <img src="${getFooterImage(brand)}" alt="Footer" style="width:100%; height:auto; max-height:120px; object-fit:contain;" />
          </div>

        </body>
        </html>`;

      const w = window.open("", "_blank");
      if (!w) return;
      w.document.open();
      w.document.write(html);
      w.document.close();
      setTimeout(() => {
        try {
          w.focus();
          w.print();
        } catch (e) {
          console.error("Print failed", e);
        }
      }, 300);
    } catch (e) {
      console.error("Print failed", e);
    }
  };

  // Get Sales Accounts dynamically from Chart of Accounts (selectedAccountType1 === '4100')
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

  const salesAccountOptions = getSalesAccounts(accounts as AccountNode[])
    .sort((a, b) => a.label.localeCompare(b.label))
    .map((a) => ({
      ...a,
      value: a.code && a.accountName ? a.code : a.value,
    }));

  // Customer Account mapping (from receivables - account 1410 and children)
  const receivablesAccounts = getReceivableAccounts(accounts as AccountNode[]);

  const customerAccountOptions = receivablesAccounts.map(
    (acc: AccountNode) => ({
      value: acc.accountCode || acc.selectedCode,
      label: `${acc.accountCode || acc.selectedCode} - ${acc.accountName}`,
    }),
  );

  const customerTitleOptions = receivablesAccounts.map((acc: AccountNode) => ({
    value: acc.accountName,
    label: acc.accountName,
    code: acc.accountCode || acc.selectedCode,
  }));

  // Remove empty/duplicate options
  const uniqueCustomerAccountOptions: { value: string; label: string }[] =
    Array.from(
      new Map(
        customerAccountOptions
          .filter((a: { value: string; label: string }) => a.value && a.label)
          .map((a: { value: string; label: string }) => [a.value, a]),
      ).values(),
    );

  const uniqueCustomerTitleOptions: { value: string; label: string }[] =
    Array.from(
      new Map(
        customerTitleOptions
          .filter((a: { value: string; label: string }) => a.value && a.label)
          .map((a: { value: string; label: string }) => [a.value, a]),
      ).values(),
    );

  // Fetch and transform products
  const [productList, setProductList] = useState<
    Array<{
      id: string;
      code: string;
      productName: string;
      unitPrice: number | "";
      productDescription: string;
    }>
  >([]);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await api.get("/products");

        // Transform products to match our interface
        if (response.data && Array.isArray(response.data)) {
          const transformedProducts = response.data.map(
            (product: {
              id?: string;
              _id?: string;
              code?: string;
              name?: string;
              productname?: string;
              productName?: string;
              unitPrice?: number;
              unit_price?: number;
              description?: string;
              productDescription?: string;
            }) => ({
              id:
                product.id ||
                product._id ||
                `p-${Math.random().toString(36).slice(2, 8)}`,
              code: String(product.code || ""),
              productName: String(
                product.name ||
                  product.productname ||
                  product.productName ||
                  "",
              ),
              unitPrice: product.unitPrice || product.unit_price || 0,
              productDescription: String(
                product.description || product.productDescription || "",
              ),
            }),
          );
          setProductList(transformedProducts);
        } else {
          setProductList([]);
        }
      } catch (error) {
        console.error("Failed to fetch products:", error);
        setProductList([]);
      }
    };
    fetchProducts();
  }, []);

  // Calculate net total for all items (sum of net amounts after discount)
  const netTotal = items.reduce(
    (sum, item) =>
      sum +
      ((item.amount ?? 0) - ((item.amount ?? 0) * (item.discount ?? 0)) / 100),
    0,
  );

  return (
    <div>
      <Group justify="space-between" mb="md">
        <Title order={2}>Sale Returns</Title>
        <Button
          leftSection={<IconPlus size={16} />}
          color="#0A6802"
          onClick={openCreate}
        >
          New Sale Return
        </Button>
      </Group>

      <Card withBorder shadow="sm" radius="md" p="md">
        <Text fw={600} mb="sm">
          Sale Returns List
        </Text>

        <Group mb="md" gap={"xs"} justify="space-between">
          <Group>
            <TextInput
              w={220}
              placeholder="Search by invoice number..."
              leftSection={<IconSearch size={16} />}
              value={search}
              onChange={(e) => {
                setSearch(e.currentTarget.value);
                setPage(1);
              }}
            />
            <TextInput
              type="date"
              placeholder="From Date"
              value={fromDate}
              onChange={(e) => setFromDate(e.currentTarget.value)}
              style={{ minWidth: 140 }}
            />
            <TextInput
              type="date"
              placeholder="To Date"
              value={toDate}
              onChange={(e) => setToDate(e.currentTarget.value)}
              style={{ minWidth: 140 }}
            />
            <Button
              variant="outline"
              color="gray"
              onClick={() => {
                setSearch("");
                setFromDate("");
                setToDate("");
              }}
            >
              Clear
            </Button>
            <Button
              variant="filled"
              color="#0A6802"
              leftSection={<IconDownload size={16} />}
              onClick={exportFilteredPDF}
            >
              Export
            </Button>
          </Group>
          <Group>
            <Select
              w={120}
              data={["5", "10", "20", "50"]}
              value={String(pageSize)}
              onChange={(val) => {
                setPageSize(Number(val));
                setPage(1);
              }}
              label="Rows per page"
            />
          </Group>
        </Group>
        <Table highlightOnHover withTableBorder>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Invoice #</Table.Th>
              <Table.Th>Invoice Date</Table.Th>
              <Table.Th>Customer</Table.Th>
              <Table.Th>Customer Title</Table.Th>
              <Table.Th>Sale Account</Table.Th>
              <Table.Th>Sale Title</Table.Th>
              <Table.Th>Salesman</Table.Th>
              <Table.Th>Notes</Table.Th>
              <Table.Th>Actions</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {paginatedData.map((row) => (
              <Table.Tr key={row.id}>
                <Table.Td>{row.id}</Table.Td>
                <Table.Td>{row.date}</Table.Td>
                <Table.Td>{row.customer}</Table.Td>
                <Table.Td>{row.customerTitle}</Table.Td>
                <Table.Td>{row.saleAccount}</Table.Td>
                <Table.Td>{row.saleTitle}</Table.Td>
                <Table.Td>{row.salesman}</Table.Td>
                <Table.Td>{row.notes}</Table.Td>
                <Table.Td>
                  <Group gap="xs">
                    <ActionIcon
                      variant="light"
                      color="#0A6802"
                      onClick={() => openEdit(row)}
                    >
                      <IconPencil size={16} />
                    </ActionIcon>
                    <ActionIcon
                      variant="light"
                      color="red"
                      onClick={() => openDelete(row.id)}
                    >
                      <IconTrash size={16} />
                    </ActionIcon>
                    <ActionIcon
                      variant="light"
                      color="#819E00"
                      onClick={() => exportPDF(row)}
                    >
                      <IconDownload size={16} />
                    </ActionIcon>
                    <ActionIcon
                      variant="light"
                      color="#819E00"
                      onClick={() => printInvoiceWindow(row)}
                    >
                      <IconDownload size={16} />
                    </ActionIcon>
                  </Group>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>

        <Group justify="center" mt="md">
          <Pagination
            total={Math.ceil(filteredData.length / pageSize)}
            value={page}
            onChange={setPage}
            size="sm"
            color="#0A6802"
          />
        </Group>
      </Card>

      <Modal
        opened={opened}
        onClose={() => setOpened(false)}
        title={
          editData ? (
            <strong>Edit Sale Return</strong>
          ) : (
            <strong>Create Sale Return</strong>
          )
        }
        size="70%"
        centered
      >
        <div ref={useRef(null)}>
          <Group grow mb="md" w={"50%"}>
            <TextInput
              label="Invoice #"
              placeholder="Enter invoice number"
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(e.currentTarget.value)}
              readOnly
            />
            <TextInput
              label="Invoice Date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.currentTarget.value)}
            />
          </Group>
          <Group grow mb="md">
            <Select
              label="Customer Account"
              placeholder="Select Customer Account"
              data={uniqueCustomerAccountOptions}
              value={customer}
              onChange={(v) => {
                setCustomer(v || "");
                // Find account by accountCode from receivablesAccounts
                const acc = receivablesAccounts.find(
                  (a: AccountNode) => (a.accountCode || a.selectedCode) === v,
                );
                if (acc) {
                  setCustomerTitle(acc.accountName || "");
                } else {
                  setCustomerTitle("");
                }
              }}
              clearable
              searchable
            />
            <Select
              label="Customer Title"
              placeholder="Select Customer Title"
              data={uniqueCustomerTitleOptions}
              value={customerTitle}
              onChange={(v) => {
                setCustomerTitle(v || "");
                // Find account by name from receivablesAccounts
                const acc = receivablesAccounts.find(
                  (a: AccountNode) => a.accountName === v,
                );
                if (acc) {
                  setCustomer(
                    acc.accountCode !== undefined
                      ? String(acc.accountCode)
                      : acc.selectedCode !== undefined
                        ? String(acc.selectedCode)
                        : "",
                  );
                } else {
                  setCustomer("");
                }
              }}
              clearable
              searchable
            />
            <Select
              label="Sale Account"
              placeholder="Select Sale Account"
              data={salesAccountOptions}
              value={saleAccount}
              onChange={(v) => {
                setSaleAccount(v || "");
                // Auto-fill Sale Account Title
                const acc = salesAccountOptions.find((a) => a.value === v);
                if (acc) {
                  setSaleTitle(acc.accountName);
                } else {
                  setSaleTitle("");
                }
              }}
              description="Select from sales accounts under 4100 - Sales"
              clearable
              searchable
              error={
                salesAccountOptions.length === 0
                  ? "No sales accounts available. Create them in Chart of Accounts first."
                  : undefined
              }
            />
            <TextInput
              label="Sale Title"
              placeholder="Sale title"
              value={saleTitle}
              readOnly
              description="Auto-filled based on selected sale account"
            />
            <TextInput
              label="Salesman"
              placeholder="Enter salesman"
              value={salesman}
              onChange={(e) => setSalesman(e.currentTarget.value)}
            />
          </Group>
          <Card withBorder mb="md" p="md">
            <Group justify="space-between" align="center" mb="sm">
              <Text fw={600}>Return Items</Text>
              <Button
                color="#0A6802"
                onClick={() =>
                  setItems([
                    ...items,
                    {
                      code: "",
                      productName: "",
                      description: "",
                      unit: "",
                      quantity: 0,
                      rate: 0,
                      amount: 0,
                      discount: 0,
                      netAmount: 0,
                    },
                  ])
                }
                style={{ minWidth: 20, padding: "0 10px" }}
              >
                + Add Item
              </Button>
            </Group>
            {items.map((item, idx) => (
              <Group key={idx} grow mb="xs" align="end">
                <TextInput
                  label="Code"
                  placeholder="Code"
                  value={item.code}
                  readOnly
                  styles={{ input: { backgroundColor: "#f8f9fa" } }}
                />
                <Select
                  label="Product Name"
                  placeholder="Select product name"
                  data={productList
                    .filter((p) => p.id && p.productName)
                    .map((p) => ({
                      value: p.id,
                      label: `${p.code || ""} - ${p.productName}`,
                    }))}
                  value={
                    productList.find((p) => p.productName === item.productName)
                      ?.id || null
                  }
                  onChange={(val) => {
                    if (!val) return;
                    const selectedProduct = productList.find(
                      (p) => p.id === val,
                    );
                    if (!selectedProduct) return;

                    const next = [...items];
                    next[idx].code = selectedProduct.code;
                    next[idx].productName = selectedProduct.productName;
                    next[idx].description =
                      selectedProduct.productDescription || "";
                    next[idx].rate = Number(selectedProduct.unitPrice) || 0;
                    // Auto-calculate amount and netAmount
                    next[idx].amount = next[idx].quantity * next[idx].rate;
                    next[idx].netAmount =
                      (next[idx].amount ?? 0) -
                      ((next[idx].amount ?? 0) * (next[idx].discount ?? 0)) /
                        100;
                    setItems(next);
                  }}
                  searchable
                  clearable
                  disabled={productList.length === 0}
                />
                <TextInput
                  label="Description"
                  placeholder="Description"
                  value={item.description}
                  onChange={(e) => {
                    const next = [...items];
                    next[idx].description = e.currentTarget.value;
                    setItems(next);
                  }}
                />
                <TextInput
                  label="Unit"
                  placeholder="Unit"
                  value={item.unit}
                  onChange={(e) => {
                    const next = [...items];
                    next[idx].unit = e.currentTarget.value;
                    setItems(next);
                  }}
                />
                <NumberInput
                  label="Quantity"
                  placeholder="Quantity"
                  value={item.quantity}
                  onChange={(val) => {
                    const next = [...items];
                    next[idx].quantity = Number(val) || 0;
                    next[idx].amount = next[idx].quantity * next[idx].rate;
                    next[idx].netAmount =
                      (next[idx].amount ?? 0) -
                      ((next[idx].amount ?? 0) * (next[idx].discount ?? 0)) /
                        100;
                    setItems(next);
                  }}
                  min={0}
                />
                <NumberInput
                  label="Rate"
                  placeholder="Rate"
                  value={item.rate}
                  onChange={(val) => {
                    const next = [...items];
                    next[idx].rate = Number(val) || 0;
                    next[idx].amount = next[idx].quantity * next[idx].rate;
                    next[idx].netAmount =
                      (next[idx].amount ?? 0) -
                      ((next[idx].amount ?? 0) * (next[idx].discount ?? 0)) /
                        100;
                    setItems(next);
                  }}
                  min={0}
                />
                <NumberInput
                  label="Amount"
                  placeholder="Amount"
                  value={item.amount}
                  readOnly
                />
                <NumberInput
                  label="Discount (%)"
                  placeholder="Discount %"
                  value={item.discount ?? 0}
                  onChange={(val) => {
                    const next = [...items];
                    next[idx].discount = Number(val) || 0;
                    next[idx].netAmount =
                      (next[idx].amount ?? 0) -
                      ((next[idx].amount ?? 0) * (next[idx].discount ?? 0)) /
                        100;
                    setItems(next);
                  }}
                  min={0}
                  max={100}
                />
                <NumberInput
                  label="Net Amount"
                  placeholder="Net Amount"
                  value={
                    (item.amount ?? 0) -
                    ((item.amount ?? 0) * (item.discount ?? 0)) / 100
                  }
                  readOnly
                />
                <Button
                  variant="light"
                  color="red"
                  onClick={() => setItems(items.filter((_, i) => i !== idx))}
                >
                  <IconTrash size={16} />
                </Button>
              </Group>
            ))}
            <Group mt="md" justify="flex-start">
              <Text fw={600} size="md" c="#000000ff">
                Net Total: {netTotal.toFixed(2)}
              </Text>
            </Group>
          </Card>
          <Textarea
            label="Notes"
            placeholder="Additional notes..."
            value={notes}
            onChange={(e) => setNotes(e.currentTarget.value)}
            mt="md"
          />
          <Group justify="flex-end" mt="md">
            <Button color="#819E00" onClick={handleSave}>
              {editData ? "Save Changes" : "Create"}
            </Button>
            <Button variant="default" onClick={() => setOpened(false)}>
              Cancel
            </Button>
            <Button
              color="#0A6802"
              onClick={() =>
                printInvoiceWindow({
                  id: invoiceNumber,
                  customer,
                  customerTitle,
                  saleAccount,
                  saleTitle,
                  salesman,
                  date,
                  items,
                  notes,
                  number: invoiceNumber,
                  accountTitle: customerTitle,
                  amount: netTotal,
                })
              }
            >
              Print
            </Button>
          </Group>
        </div>
      </Modal>

      <Modal
        opened={!!deleteId}
        onClose={() => setDeleteId(null)}
        title="Confirm Delete"
        centered
      >
        <Text>
          Are you sure you want to delete sale return <b>{deleteId}</b>?
        </Text>
        <Group mt="md" justify="flex-end">
          <Button variant="default" onClick={() => setDeleteId(null)}>
            Cancel
          </Button>
          <Button color="red" onClick={confirmDelete}>
            Delete
          </Button>
        </Group>
      </Modal>
    </div>
  );
}

export default SaleReturnsInner;

function getNextInvoiceNumber(returns: SaleReturn[]) {
  const numbers = returns
    .map((r) => {
      const match = r.id.match(/^SR-(\d+)$/);
      return match ? parseInt(match[1], 10) : null;
    })
    .filter((n) => n !== null) as number[];
  const max = numbers.length ? Math.max(...numbers) : 0;
  const next = max + 1;
  return `SR-${next.toString().padStart(3, "0")}`;
}
