import {
  Card,
  Group,
  Button,
  Table,
  ActionIcon,
  Modal,
  TextInput,
  Pagination,
  Select,
} from "@mantine/core";
import {
  IconPencil,
  IconTrash,
  IconPlus,
  IconCreditCard,
  IconDownload,
  IconSearch,
  IconPrinter,
} from "@tabler/icons-react";
import { useState, useRef, useEffect } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { getHeaderImage, getFooterImage } from "../../../utils/assetPaths";
import {
  useCreditSales,
  type CreditSale,
  type CreditSaleItem,
} from "../../Context/Invoicing/CreditSalesContext";
import api from "../../../api_configuration/api";
import { useChartOfAccounts } from "../../Context/ChartOfAccountsContext";
import { getReceivableAccounts } from "../../utils/receivableAccounts";
import type { AccountNode } from "../../Context/ChartOfAccountsContext";

function CreditSaleInvoiceInner() {
  const { sales, addSale, updateSale, deleteSale } = useCreditSales();
  const { accounts } = useChartOfAccounts();

  const brand = "chemtronix";
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [search, setSearch] = useState("");

  const filteredData = sales.filter(
    (d) =>
      d.id.toLowerCase().includes(search.toLowerCase()) &&
      (!fromDate || new Date(d.date) >= new Date(fromDate)) &&
      (!toDate || new Date(d.date) <= new Date(toDate)),
  );

  const start = (page - 1) * pageSize;
  const paginatedData = filteredData.slice(start, start + pageSize);

  const [opened, setOpened] = useState(false);
  const [editData, setEditData] = useState<CreditSale | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [saleDate, setSaleDate] = useState<string>("");
  const [customer, setCustomer] = useState<string>("");
  const [customerTitle, setCustomerTitle] = useState<string>("");
  const [saleAccount, setSaleAccount] = useState<string>("");
  const [saleTitle, setSaleTitle] = useState<string>("");
  const [salesman, setSalesman] = useState<string>("");
  const [invoiceNumber, setInvoiceNumber] = useState<string>("");

  const [items, setItems] = useState<CreditSaleItem[]>([]);

  // Products state
  const [products, setProducts] = useState<
    Array<{
      id: string;
      code: string;
      productName: string;
      unitPrice: number | "";
      productDescription: string;
    }>
  >([]);

  // Fetch products on component mount
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        console.log("Fetching products...");
        const response = await api.get("/products");
        console.log("Products fetched:", response.data);

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
          console.log("Transformed products:", transformedProducts);
          setProducts(transformedProducts);
        } else {
          setProducts([]);
        }
      } catch (error) {
        console.error("Failed to fetch products:", error);
        setProducts([]);
      }
    };
    fetchProducts();
  }, []);

  // Debug: Log products when they change
  useEffect(() => {
    console.log("Products state updated:", products.length, "products");
    console.log("Products:", products);
  }, [products]);

  const activeSales = sales.length;

  const exportPDF = (row: CreditSale) => {
    const doc = new jsPDF("p", "pt", "a4");
    const companyName = "Chemtronix Engineering Solutions";
    const reportTitle = "Credit Sale Invoice";
    const currentDate = new Date().toLocaleDateString();

    // Header
    doc.setFontSize(16);
    doc.text(companyName, 40, 30);
    doc.setFontSize(14);
    doc.text(reportTitle, 40, 55);

    // Invoice Info
    doc.setFontSize(11);
    doc.text(`Date: ${currentDate}`, 480, 30);
    doc.text(`Invoice #: ${row.id}`, 40, 75);
    doc.text(`Sale Date: ${row.date}`, 250, 75);
    doc.text(`Customer: ${row.customer || "-"}`, 40, 95);
    doc.text(`Customer Title: ${row.customerTitle || "-"}`, 250, 95);
    doc.text(`Sale Account: ${row.saleAccount || "-"}`, 40, 115);
    doc.text(`Sale Title: ${row.saleTitle || "-"}`, 250, 115);
    doc.text(`Salesman: ${row.salesman || "-"}`, 40, 135);

    // Items Table
    autoTable(doc, {
      startY: 155,
      head: [
        [
          "Code",
          "Product Name",
          "Description",
          "Quantity",
          "Rate",
          "Amount",
          "Discount",
          "Net Amount",
        ],
      ],
      body:
        row.items && row.items.length > 0
          ? row.items.map((item) => [
              item.code,
              item.productName,
              item.description,
              item.quantity,
              item.rate,
              item.amount,
              item.discount,
              item.netAmount,
            ])
          : [["-", "-", "-", "-", "-", "-", "-", "-"]],
      styles: { fontSize: 10 },
      headStyles: { fillColor: [10, 104, 2] },
      theme: "grid",
      margin: { left: 40, right: 40 },
      didDrawPage: function () {
        // Footer: current date and total pages
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
    let totalDiscount = 0;
    let totalNetAmount = 0;
    if (row.items && row.items.length > 0) {
      row.items.forEach((item) => {
        totalQty += Number(item.quantity) || 0;
        totalAmount += Number(item.amount) || 0;
        totalDiscount += Number(item.discount) || 0;
        totalNetAmount += Number(item.netAmount) || 0;
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
    doc.text(`Total Amount: ${totalAmount.toFixed(2)}`, 150, finalY);
    doc.text(`Total Discount: ${totalDiscount.toFixed(2)}`, 300, finalY);
    doc.text(`Total Net Amount: ${totalNetAmount.toFixed(2)}`, 450, finalY);

    doc.save(`${row.id}.pdf`);
  };

  const exportFilteredPDF = () => {
    const doc = new jsPDF("p", "pt", "a4");
    const companyName = "Chemtronix Engineering Solutions";
    const reportTitle = "Credit Sales Report";
    const currentDate = new Date().toLocaleDateString();

    // Header
    doc.setFontSize(16);
    doc.text(companyName, 40, 30);
    doc.setFontSize(14);
    doc.text(reportTitle, 40, 55);

    // From/To Date
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

    // Table
    autoTable(doc, {
      startY: dateText ? 95 : 80,
      head: [
        [
          "Invoice#",
          "Date",
          "Customer",
          "Customer Title",
          "Sale Account",
          "Sale Title",
          "Salesman",
          "Total Qty",
          "Total Amount",
          "Total Discount",
          "Total Net Amount",
        ],
      ],
      body: filteredData.map((row) => {
        let totalQty = 0;
        let totalAmount = 0;
        let totalDiscount = 0;
        let totalNetAmount = 0;
        if (row.items && row.items.length > 0) {
          row.items.forEach((item) => {
            totalQty += Number(item.quantity) || 0;
            totalAmount += Number(item.amount) || 0;
            totalDiscount += Number(item.discount) || 0;
            totalNetAmount += Number(item.netAmount) || 0;
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
          totalQty,
          totalAmount.toFixed(2),
          totalDiscount.toFixed(2),
          totalNetAmount.toFixed(2),
        ];
      }),
      styles: { fontSize: 10 },
      headStyles: { fillColor: [10, 104, 2] },
      theme: "grid",
      margin: { left: 40, right: 40 },
      didDrawPage: function () {
        // Footer: current date and total pages
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
    let grandDiscount = 0;
    let grandNetAmount = 0;
    filteredData.forEach((row) => {
      if (row.items && row.items.length > 0) {
        row.items.forEach((item) => {
          grandQty += Number(item.quantity) || 0;
          grandAmount += Number(item.amount) || 0;
          grandDiscount += Number(item.discount) || 0;
          grandNetAmount += Number(item.netAmount) || 0;
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
    doc.text(`Grand Total Amount: ${grandAmount.toFixed(2)}`, 180, finalY);
    doc.text(`Grand Total Discount: ${grandDiscount.toFixed(2)}`, 340, finalY);
    doc.text(
      `Grand Total Net Amount: ${grandNetAmount.toFixed(2)}`,
      500,
      finalY,
    );

    doc.save("credit_sales_report.pdf");
  };

  const openCreate = () => {
    setEditData(null);
    resetForm();
    setOpened(true);
  };

  const openEdit = (row: CreditSale) => {
    setEditData(row);
    setSaleDate(row.date);
    setCustomer(row.customer || "");
    setCustomerTitle(row.customerTitle || "");
    setSaleAccount(row.saleAccount || "");
    setSaleTitle(row.saleTitle || "");
    setSalesman(row.salesman || "");
    setInvoiceNumber(row.id || "");
    setItems(row.items ? [...row.items] : []);
    setOpened(true);
  };

  const handleSave = () => {
    if (!saleDate) return;
    const newSale: CreditSale = {
      id: invoiceNumber || `CS-${Math.floor(Math.random() * 1000)}`,
      date: saleDate,
      customer,
      customerTitle,
      saleAccount,
      saleTitle,
      salesman,
      items: [...items],
    };
    if (editData) {
      updateSale(newSale);
    } else {
      addSale(newSale);
      setItems([]);
    }
    setOpened(false);
    resetForm();
  };

  const openDelete = (id: string) => setDeleteId(id);

  const confirmDelete = () => {
    if (deleteId) deleteSale(deleteId);
    setDeleteId(null);
  };

  const addItem = () => {
    setItems([
      ...items,
      {
        code: "",
        productName: "",
        description: "",
        quantity: 0,
        rate: 0,
        amount: 0,
        discount: 0,
        netAmount: 0,
      },
    ]);
  };

  const updateItem = (
    index: number,
    field: keyof CreditSaleItem,
    value: string | number,
  ) => {
    const updated = items.map((item, i) => {
      if (i !== index) return item;

      const newItem = { ...item, [field]: value };

      // Auto-calculate amount when quantity or rate changes
      if (field === "quantity" || field === "rate") {
        newItem.amount = Number(newItem.quantity) * Number(newItem.rate);
      }

      // Auto-calculate netAmount when amount or discount changes
      if (field === "amount" || field === "discount") {
        const discountAmount =
          (Number(newItem.amount) * Number(newItem.discount)) / 100;
        newItem.netAmount = Number(newItem.amount) - discountAmount;
      }

      // If quantity or rate changed, also recalculate netAmount
      if (field === "quantity" || field === "rate") {
        const discountAmount =
          (Number(newItem.amount) * Number(newItem.discount)) / 100;
        newItem.netAmount = Number(newItem.amount) - discountAmount;
      }

      return newItem;
    });
    setItems(updated);
  };

  const handleProductSelect = (index: number, productId: string | null) => {
    if (!productId) return;

    const selectedProduct = products.find((p) => p.id === productId);
    if (!selectedProduct) return;

    const updated = items.map((item, i) => {
      if (i !== index) return item;

      const newItem = {
        ...item,
        code: selectedProduct.code,
        productName: selectedProduct.productName,
        description: selectedProduct.productDescription || "",
        rate: Number(selectedProduct.unitPrice) || 0,
      };

      // Auto-calculate amount and netAmount
      newItem.amount = Number(newItem.quantity) * Number(newItem.rate);
      const discountAmount =
        (Number(newItem.amount) * Number(newItem.discount)) / 100;
      newItem.netAmount = Number(newItem.amount) - discountAmount;

      return newItem;
    });
    setItems(updated);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const resetForm = () => {
    setSaleDate("");
    setCustomer("");
    setCustomerTitle("");
    setSaleAccount("");
    setSaleTitle("");
    setSalesman("");
    setInvoiceNumber("");
    setItems([]);
  };

  const buildPrintableCreditSaleHtml = (sale: CreditSale) => {
    const itemsList = sale.items || [];
    const subtotal = itemsList.reduce((s, it) => s + (it.amount || 0), 0);
    const totalDiscount = itemsList.reduce(
      (s, it) => s + (it.discount || 0),
      0,
    );
    const netTotal = itemsList.reduce((s, it) => s + (it.netAmount || 0), 0);

    const rowsHtml = itemsList
      .map((item, idx) => {
        return `<tr>
          <td style="border:1px solid #000;padding:8px;text-align:center">${
            idx + 1
          }</td>
          <td style="border:1px solid #000;padding:8px">${String(
            item.code || "",
          ).replace(/</g, "&lt;")}</td>
          <td style="border:1px solid #000;padding:8px">${String(
            item.productName || "",
          ).replace(/</g, "&lt;")}</td>
          <td style="border:1px solid #000;padding:8px">${String(
            item.description || "",
          ).replace(/</g, "&lt;")}</td>
          <td style="border:1px solid #000;padding:8px;text-align:center">${(
            item.quantity || 0
          ).toFixed(2)}</td>
          <td style="border:1px solid #000;padding:8px;text-align:center">${(
            item.rate || 0
          ).toFixed(2)}</td>
          <td style="border:1px solid #000;padding:8px;text-align:right">${(
            item.amount || 0
          ).toFixed(2)}</td>
          <td style="border:1px solid #000;padding:8px;text-align:center">${
            item.discount || 0
          }%</td>
          <td style="border:1px solid #000;padding:8px;text-align:right">${(
            item.netAmount || 0
          ).toFixed(2)}</td>
        </tr>`;
      })
      .join("");

    const desiredRows = 8;
    const paddingCount = Math.max(0, desiredRows - itemsList.length);
    const paddingRows = Array.from({ length: paddingCount })
      .map(
        () =>
          `<tr><td style="border:1px solid #000;padding:8px">&nbsp;</td><td style="border:1px solid #000;padding:8px">&nbsp;</td><td style="border:1px solid #000;padding:8px">&nbsp;</td><td style="border:1px solid #000;padding:8px">&nbsp;</td><td style="border:1px solid #000;padding:8px">&nbsp;</td><td style="border:1px solid #000;padding:8px">&nbsp;</td><td style="border:1px solid #000;padding:8px">&nbsp;</td><td style="border:1px solid #000;padding:8px">&nbsp;</td><td style="border:1px solid #000;padding:8px">&nbsp;</td></tr>`,
      )
      .join("");

    const html =
      `<!doctype html><html><head><meta charset="utf-8"/><title>Credit Sale Invoice</title><style>body{font-family:Arial,sans-serif;color:#222;margin:24px}table{width:100%;border-collapse:collapse;border:2px solid #000}th,td{border:1px solid #000;padding:8px;font-size:12px;vertical-align:top}thead th:nth-child(3){width:20%}tbody tr{height:48px}.right{text-align:right}.muted{color:#666;font-size:12px}</style></head><body>` +
      `<div style="padding:0;margin-bottom:12px"><img src="${getHeaderImage(brand)}" style="display:block;width:100%;height:auto;max-height:120px;object-fit:contain"/></div>` +
      `<div style="text-align:center;margin-bottom:12px"><h2 style="color:#819E00;margin:8px 0">Credit Sale Invoice</h2></div>` +
      `<div style="display:flex;justify-content:space-between;margin-bottom:12px"><div style="border:1px solid #222;padding:8px;flex:1;margin-right:8px"><div><strong>Customer:</strong> ${
        sale.customer || ""
      }</div><div><strong>Customer Title:</strong> ${
        sale.customerTitle || ""
      }</div><div><strong>Sale Account:</strong> ${
        sale.saleAccount || ""
      }</div><div><strong>Sale Title:</strong> ${
        sale.saleTitle || ""
      }</div><div><strong>Salesman:</strong> ${
        sale.salesman || ""
      }</div></div><div style="width:320px;border:1px solid #222;padding:8px"><div><strong>Invoice No:</strong> ${
        sale.id || ""
      }</div><div><strong>Date:</strong> ${sale.date || ""}</div></div></div>` +
      `<table><thead><tr><th>SR No</th><th>Code</th><th>Product Name</th><th>Description</th><th>Quantity</th><th>Rate</th><th>Amount</th><th>Discount %</th><th>Net Amount</th></tr></thead><tbody>` +
      rowsHtml +
      paddingRows +
      `</tbody></table>` +
      `<div style="margin-top:8px;font-size:12px;color:#666">*Computer generated invoice. No need for signature</div>` +
      `<div style="margin-top:12px;display:flex;justify-content:flex-end"><div style="width:360px;border:1px solid #222;padding:12px"><div style="display:flex;justify-content:space-between"><div>Gross Total:</div><div>${subtotal.toFixed(
        2,
      )}</div></div><div style="display:flex;justify-content:space-between"><div>Total Discount:</div><div>${totalDiscount.toFixed(
        2,
      )}</div></div><hr/><div style="display:flex;justify-content:space-between;font-weight:bold"><div>Net Total:</div><div>${netTotal.toFixed(
        2,
      )}</div></div></div></div>` +
      `<div style="margin-top:18px;page-break-inside:avoid"><img src="${getFooterImage(brand)}" style="width:100%;max-height:120px;object-fit:contain"/></div>` +
      `</body></html>`;

    return html;
  };

  const printCreditInvoiceWindow = (sale: CreditSale) => {
    const html = buildPrintableCreditSaleHtml(sale);
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.open();
    w.document.write(html);
    w.document.close();
    setTimeout(() => {
      try {
        w.focus();
        w.print();
      } catch (err) {
        console.error(err);
      }
    }, 250);
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

  return (
    <div>
      <Group justify="space-between" mb="md">
        <h2>Credit Sales</h2>
        <Button
          leftSection={<IconPlus size={16} />}
          color="#0A6802"
          onClick={openCreate}
        >
          Create Credit Sale
        </Button>
      </Group>

      <Card shadow="sm" radius="md" withBorder bg={"#F1FCF0"}>
        <Group justify="space-between">
          <span>Active Credit Sales</span>
          <span style={{ color: "#819E00" }}>
            <IconCreditCard size={20} />
          </span>
        </Group>
        <h3 style={{ marginTop: 15 }}>{activeSales}</h3>
      </Card>

      <div
        style={{
          marginBottom: "1rem",
          border: "1px solid #e0e0e0",
          paddingTop: "1rem",
          marginTop: "1rem",
          borderRadius: "10px",
          backgroundColor: "#F1FCF0",
        }}
      >
        <div style={{ padding: "0.5rem" }}>
          <strong>Credit Sales Overview</strong>
          <p style={{ color: "gray", fontSize: "0.9em" }}>
            Manage credit sales and payment terms
          </p>
        </div>
        <Group gap="xs" style={{ padding: "0.5rem" }}>
          <TextInput
            style={{ padding: "0.5rem" }}
            placeholder="Search by ID"
            leftSection={<IconSearch size={16} />}
            value={search}
            onChange={(e) => {
              setSearch(e.currentTarget.value);
              setPage(1);
            }}
            w={220}
          />
          <TextInput
            type="date"
            placeholder="From Date"
            value={fromDate}
            onChange={(e) => setFromDate(e.currentTarget.value)}
            style={{ minWidth: 140, marginLeft: 8 }}
          />
          <TextInput
            type="date"
            placeholder="To Date"
            value={toDate}
            onChange={(e) => setToDate(e.currentTarget.value)}
            style={{ minWidth: 140, marginLeft: 8 }}
          />
          <Button
            variant="outline"
            color="gray"
            style={{ marginLeft: 8 }}
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
            style={{ marginLeft: 8 }}
            leftSection={<IconDownload size={16} />}
            onClick={exportFilteredPDF}
          >
            Export
          </Button>
        </Group>
        <Card withBorder radius="md" shadow="sm" p="md" bg={"#F1FCF0"}>
          <Group mb="sm" gap={"xs"} justify="flex-end">
            <span>Rows per page:</span>
            <Select
              data={["5", "10", "20", "50"]}
              value={pageSize.toString()}
              onChange={(val) => {
                setPageSize(Number(val));
                setPage(1);
              }}
              w={100}
            />
          </Group>
          <Group mb="sm">
            <IconCreditCard size={20} />
            <strong>Credit Sales List</strong>
          </Group>
          <Table highlightOnHover withTableBorder withColumnBorders>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Invoice#</Table.Th>
                <Table.Th>Date</Table.Th>
                <Table.Th>Customer</Table.Th>
                <Table.Th>Customer Title</Table.Th>
                <Table.Th>Sale Account</Table.Th>
                <Table.Th>Sale Title</Table.Th>
                <Table.Th>Salesman</Table.Th>
                <Table.Th>Items</Table.Th>
                <Table.Td>Actions</Table.Td>
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
                  <Table.Td>
                    {Array.isArray(row.items) ? (
                      <Table withTableBorder>
                        <Table.Thead>
                          <Table.Tr>
                            <Table.Th>Code</Table.Th>
                            <Table.Th>Product Name</Table.Th>
                            <Table.Th>Description</Table.Th>
                            <Table.Th>Quantity</Table.Th>
                            <Table.Th>Rate</Table.Th>
                            <Table.Th>Amount</Table.Th>
                            <Table.Th>Discount</Table.Th>
                            <Table.Th>Net Amount</Table.Th>
                          </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                          {row.items.map((item, idx) => (
                            <Table.Tr key={idx}>
                              <Table.Td>{item.code}</Table.Td>
                              <Table.Td>{item.productName}</Table.Td>
                              <Table.Td>{item.description}</Table.Td>
                              <Table.Td>{item.quantity}</Table.Td>
                              <Table.Td>{item.rate}</Table.Td>
                              <Table.Td>{item.amount}</Table.Td>
                              <Table.Td>{item.discount}</Table.Td>
                              <Table.Td>{item.netAmount}</Table.Td>
                            </Table.Tr>
                          ))}
                        </Table.Tbody>
                      </Table>
                    ) : null}
                  </Table.Td>
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
                        onClick={() => printCreditInvoiceWindow(row)}
                        title="Print"
                      >
                        <IconPrinter size={16} />
                      </ActionIcon>
                    </Group>
                  </Table.Td>
                </Table.Tr>
              ))}
              {paginatedData.length === 0 && (
                <Table.Tr>
                  <Table.Td colSpan={10} style={{ textAlign: "center" }}>
                    No results found
                  </Table.Td>
                </Table.Tr>
              )}
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
      </div>
      <Modal
        opened={opened}
        onClose={() => setOpened(false)}
        title={
          editData ? (
            <strong>Edit Credit Sale</strong>
          ) : (
            <strong>Create New Credit Sale</strong>
          )
        }
        centered
        size="70%"
      >
        <div ref={useRef(null)}>
          <form>
            <Group grow mb="md" w={"50%"}>
              <TextInput
                label="Invoice #"
                placeholder="Enter invoice number"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.currentTarget.value)}
              />
              <TextInput
                label="Invoice Date"
                placeholder="mm/dd/yyyy"
                type="date"
                value={saleDate}
                onChange={(e) => setSaleDate(e.currentTarget.value)}
              />
            </Group>
            <Group mb="md" grow>
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
              {/* Sale Account Select Dropdown */}
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
            <div
              style={{ marginBottom: "8px", fontSize: "12px", color: "#666" }}
            >
              {products.length > 0
                ? `${products.length} products available`
                : "Loading products..."}
            </div>
            <Table withTableBorder highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Code</Table.Th>
                  <Table.Th>Product Name</Table.Th>
                  <Table.Th>Description</Table.Th>
                  <Table.Th>Quantity</Table.Th>
                  <Table.Th>Rate</Table.Th>
                  <Table.Th>Amount</Table.Th>
                  <Table.Th>Discount</Table.Th>
                  <Table.Th>Net Amount</Table.Th>
                  <Table.Th>Actions</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {items.map((item, idx) => (
                  <Table.Tr key={idx}>
                    <Table.Td>
                      <TextInput
                        value={item.code}
                        onChange={(e) =>
                          updateItem(idx, "code", e.currentTarget.value)
                        }
                        placeholder="Code"
                        readOnly
                        styles={{ input: { backgroundColor: "#f8f9fa" } }}
                      />
                    </Table.Td>
                    <Table.Td>
                      <Select
                        value={
                          products.find(
                            (p) => p.productName === item.productName,
                          )?.id || null
                        }
                        onChange={(value) => handleProductSelect(idx, value)}
                        data={products
                          .filter((p) => p.id && p.productName)
                          .map((p) => ({
                            value: p.id,
                            label: `${p.code || ""} - ${p.productName}`,
                          }))}
                        placeholder="Select Product"
                        searchable
                        clearable
                        disabled={products.length === 0}
                      />
                    </Table.Td>
                    <Table.Td>
                      <TextInput
                        value={item.description}
                        onChange={(e) =>
                          updateItem(idx, "description", e.currentTarget.value)
                        }
                        placeholder="Description"
                      />
                    </Table.Td>
                    <Table.Td>
                      <TextInput
                        type="number"
                        value={item.quantity}
                        onChange={(e) =>
                          updateItem(
                            idx,
                            "quantity",
                            Number(e.currentTarget.value),
                          )
                        }
                        placeholder="Quantity"
                      />
                    </Table.Td>
                    <Table.Td>
                      <TextInput
                        type="number"
                        value={item.rate}
                        onChange={(e) =>
                          updateItem(idx, "rate", Number(e.currentTarget.value))
                        }
                        placeholder="Rate"
                      />
                    </Table.Td>
                    <Table.Td>
                      <TextInput
                        type="number"
                        value={item.amount}
                        readOnly
                        placeholder="Amount"
                        styles={{ input: { backgroundColor: "#f8f9fa" } }}
                      />
                    </Table.Td>
                    <Table.Td>
                      <TextInput
                        type="number"
                        value={item.discount}
                        onChange={(e) =>
                          updateItem(
                            idx,
                            "discount",
                            Number(e.currentTarget.value),
                          )
                        }
                        placeholder="Discount"
                      />
                    </Table.Td>
                    <Table.Td>
                      <TextInput
                        type="number"
                        value={item.netAmount}
                        readOnly
                        placeholder="Net Amount"
                        styles={{ input: { backgroundColor: "#f8f9fa" } }}
                      />
                    </Table.Td>
                    <Table.Td>
                      <Button
                        color="red"
                        size="xs"
                        onClick={() => removeItem(idx)}
                      >
                        Remove
                      </Button>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </form>
        </div>

        <Button color="#0A6802" mb="md" onClick={addItem}>
          Add Item
        </Button>
        <Group justify="flex-end" mt="md">
          <Button
            color="#0A6802"
            onClick={() =>
              printCreditInvoiceWindow({
                id: invoiceNumber,
                date: saleDate,
                customer,
                customerTitle,
                saleAccount,
                saleTitle,
                salesman,
                items: [...items],
              })
            }
          >
            Print
          </Button>
          <Button variant="default" onClick={() => setOpened(false)}>
            Cancel
          </Button>
          <Button color="#0A6802" onClick={handleSave}>
            {editData ? "Update Credit Sale" : "Create Credit Sale"}
          </Button>
        </Group>
      </Modal>

      <Modal
        opened={!!deleteId}
        onClose={() => setDeleteId(null)}
        title="Delete Credit Sale"
        centered
      >
        <p style={{ marginBottom: "1rem" }}>
          Are you sure you want to delete this record?
        </p>
        <Group justify="flex-end">
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

export default CreditSaleInvoiceInner;
