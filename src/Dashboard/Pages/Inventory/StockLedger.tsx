import {
  ActionIcon,
  Button,
  Card,
  Group,
  Pagination,
  Table,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { IconDownload } from "@tabler/icons-react";
import { useMemo, useState, useEffect } from "react";
import api from "../../../api_configuration/api";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

type StockLedgerRow = {
  id: string;
  date: string;
  invid: string;
  particulars: string;
  productCode: string;
  productName: string;
  qtyIn: number;
  qtyOut: number;
  qtyBalance: number;
  txnRate: number; // rate of this specific transaction
  avgRate: number; // running weighted-average cost
  rate: number; // kept for PDF compat (= avgRate)
  balance: number;
  type: "Sale" | "Purchase";
};

const toDate = (s: string) => new Date(s + "T00:00:00");
const inRange = (d: string, from: string, to: string) => {
  const dt = toDate(d).getTime();
  const fromOk = from ? dt >= toDate(from).getTime() : true;
  const toOk = to ? dt <= toDate(to).getTime() : true;
  return fromOk && toOk;
};

export default function StockLedger() {
  const [stockLedgerData, setStockLedgerData] = useState<StockLedgerRow[]>([]);

  // Lifted product list for code→name lookup without searching ledger rows
  type ProductLookup = { code: string; productName: string };
  const [productsList, setProductsList] = useState<ProductLookup[]>([]);

  // Fetch sale invoices and map to stock ledger rows
  useEffect(() => {
    const fetchAndMapData = async () => {
      try {
        // Fetch products, sales, and purchase invoices
        const [productsRes, salesRes, purchaseRes] = await Promise.all([
          api.get("/products"),
          api.get("/sale-invoice"),
          api.get("/purchase-invoice/all-purchase-invoices"),
        ]);
        const products = Array.isArray(productsRes.data)
          ? productsRes.data
          : [];
        const sales = Array.isArray(salesRes.data) ? salesRes.data : [];
        const purchases = Array.isArray(purchaseRes.data)
          ? purchaseRes.data
          : [];
        console.log("All Products:", products);
        console.log("All Sale Invoices:", sales);
        console.log("All Purchase Invoices:", purchases);

        // Lift the product list so filters can do code→name lookup
        setProductsList(
          (products as Product[]).map((p) => ({
            code: String(p.code ?? ""),
            productName: p.productName || String(p.code ?? ""),
          })),
        );
        // Types
        type Product = {
          code: string | number;
          productName: string;
          openingQuantity?: number;
          costPrice?: number;
          createdAt?: string;
        };
        type SaleInvoiceItem = {
          id?: string | number;
          code?: string | number;
          productCode?: string | number; // alternate field name variation
          productName?: string;
          quantity?: number;
          rate?: number;
          unitPrice?: number;
          price?: number;
        };
        type PurchaseInvoiceItem = {
          id?: string | number;
          code: string | number;
          name?: string;
          unit?: number; // qty field on purchase entity
          price?: number; // rate field on purchase entity
        };
        type SaleInvoice = {
          id: string;
          invoiceDate: string;
          invoiceNumber: string;
          accountTitle?: string;
          products?: SaleInvoiceItem[];
        };
        type PurchaseInvoice = {
          id: string;
          invoiceDate: string;
          invoiceNumber: string;
          supplier?: { name?: string };
          items?: PurchaseInvoiceItem[];
        };
        const rows: StockLedgerRow[] = [];

        // Collect all transactions first
        const allTransactions: Array<{
          date: string;
          productCode: string;
          productName: string;
          qtyIn: number;
          qtyOut: number;
          rate: number;
          invid: string;
          particulars: string;
          type: "Sale" | "Purchase";
          id: string;
        }> = [];

        // Opening Balances — use openingQuantity baked into each product.
        // This is the permanent baseline set when the product was first created.
        (products as Product[]).forEach((prod) => {
          const qtyIn = Number(prod.openingQuantity) || 0;
          const rate = Number(prod.costPrice) || 0;
          const codeStr = String(prod.code ?? "");
          if (qtyIn > 0) {
            allTransactions.push({
              id: "opening-" + codeStr,
              date: prod.createdAt
                ? new Date(prod.createdAt).toISOString().split("T")[0]
                : "2000-01-01",
              productCode: codeStr,
              productName: prod.productName || codeStr,
              qtyIn,
              qtyOut: 0,
              rate,
              invid: "",
              particulars: "Opening Balance",
              type: "Purchase",
            });
          }
        });

        // Purchases — entity fields: items[], item.code, item.name, item.unit (qty), item.price (rate)
        (purchases as PurchaseInvoice[]).forEach((inv) => {
          const purchaseItems = Array.isArray(inv.items) ? inv.items : [];
          purchaseItems.forEach((item, idx) => {
            const qty = Number(item.unit) || 0;
            const rate = Number(item.price) || 0;
            allTransactions.push({
              id: inv.id + "-purchase-" + (item.id ?? idx),
              date: inv.invoiceDate,
              productCode: String(item.code ?? ""),
              productName: item.name || String(item.code ?? ""),
              qtyIn: qty,
              qtyOut: 0,
              rate,
              invid: inv.invoiceNumber,
              particulars: inv.supplier?.name || "Purchase Invoice",
              type: "Purchase",
            });
          });
        });

        // Sales — entity fields: products[], item.code, item.productName, item.quantity, item.rate
        (sales as SaleInvoice[]).forEach((inv) => {
          const saleItems = Array.isArray(inv.products) ? inv.products : [];
          saleItems.forEach((item, idx) => {
            const qty = Number(item.quantity) || 0;
            const rate = Number(item.rate ?? item.unitPrice ?? item.price) || 0;
            const codeStr = String(item.code ?? item.productCode ?? "");
            allTransactions.push({
              id: inv.id + "-sale-" + (item.id ?? idx),
              date: inv.invoiceDate,
              productCode: codeStr,
              productName: item.productName || String(item.code ?? ""),
              qtyIn: 0,
              qtyOut: qty,
              rate,
              invid: inv.invoiceNumber,
              particulars: inv.accountTitle || "Sale Invoice",
              type: "Sale",
            });
          });
        });

        // Sort all transactions by date ascending — Opening Balance rows
        // (oldest dates) will naturally land at the top.
        allTransactions.sort(
          (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
        );

        // Build rows with a simple cumulative running balance per product.
        // runningQty tracks the warehouse quantity after every transaction.
        const runningQty: Record<string, number> = {};
        allTransactions.forEach((txn) => {
          const prev = runningQty[txn.productCode] ?? 0;
          const newQty = prev + (txn.qtyIn || 0) - (txn.qtyOut || 0);
          runningQty[txn.productCode] = newQty;

          rows.push({
            id: txn.id,
            date: txn.date,
            invid: txn.invid,
            particulars: txn.particulars,
            productCode: txn.productCode,
            productName: txn.productName,
            qtyIn: txn.qtyIn,
            qtyOut: txn.qtyOut,
            qtyBalance: newQty,
            txnRate: txn.rate,
            avgRate: txn.rate,
            rate: txn.rate,
            balance: newQty * txn.rate,
            type: txn.type,
          });
        });

        setStockLedgerData(rows);
      } catch {
        setStockLedgerData([]);
      }
    };
    fetchAndMapData();
  }, []);
  // filters UI state
  const [productCode, setProductCode] = useState<string>("");
  const [productName, setProductName] = useState<string>("");
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");
  const [codeNotFound, setCodeNotFound] = useState(false);

  const [applied, setApplied] = useState({
    productCode: "",
    productName: "",
    fromDate: "",
    toDate: "",
  });

  // Look up product name from the products list when the code input changes
  const handleProductCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const code = e.currentTarget.value.trim();
    setProductCode(code);
    setCodeNotFound(false);
    if (!code) {
      setProductName("");
      return;
    }
    const found = productsList.find(
      (p) => p.code.toLowerCase() === code.toLowerCase(),
    );
    setProductName(found ? found.productName : "");
  };

  const applyFilter = () => {
    if (productCode) {
      const exists = productsList.some(
        (p) => p.code.toLowerCase() === productCode.toLowerCase(),
      );
      if (!exists) {
        setCodeNotFound(true);
        return;
      }
    }
    setCodeNotFound(false);
    setPage(1);
    setApplied({ productCode, productName, fromDate, toDate });
  };

  const clearFilter = () => {
    setProductCode("");
    setProductName("");
    setFromDate("");
    setToDate("");
    setCodeNotFound(false);
    setApplied({ productCode: "", productName: "", fromDate: "", toDate: "" });
    setPage(1);
  };

  const [page, setPage] = useState(1);
  const pageSize = 10;

  // filtered data memo
  const filtered = useMemo(() => {
    // 1. Filter by product code (optional) + date range
    const sorted = stockLedgerData
      .filter((r) => {
        const matchesCode = applied.productCode
          ? r.productCode.toLowerCase() === applied.productCode.toLowerCase()
          : true;
        const matchesDates = inRange(r.date, applied.fromDate, applied.toDate);
        return matchesCode && matchesDates;
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    if (applied.productCode) {
      // Single-product view: cumulative running balance from zero
      let runningQty = 0;
      return sorted.map((r) => {
        runningQty = runningQty + (r.qtyIn || 0) - (r.qtyOut || 0);
        return { ...r, qtyBalance: runningQty };
      });
    }

    // All-products view: net qty impact per row
    return sorted.map((r) => ({
      ...r,
      qtyBalance: (r.qtyIn || 0) - (r.qtyOut || 0),
    }));
  }, [applied, stockLedgerData]);

  const start = (page - 1) * pageSize;
  const paginatedData = filtered.slice(start, start + pageSize);
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("Stock Ledger", 14, 18);

    const filterLine = [
      applied.productCode
        ? `Product Code: ${applied.productCode}`
        : "All Products",
      applied.productName ? `Product Name: ${applied.productName}` : "",
      applied.fromDate ? `From: ${applied.fromDate}` : "",
      applied.toDate ? `To: ${applied.toDate}` : "",
    ]
      .filter(Boolean)
      .join("  •  ");
    if (filterLine) {
      doc.setFontSize(10);
      doc.text(filterLine, 14, 26);
    }

    autoTable(doc, {
      startY: filterLine ? 32 : 26,
      head: [
        [
          "Date",
          "Invoice Number",
          "Type",
          "Particulars",
          "Product Code",
          "Product Name",
          "Qty In",
          "Qty Out",
          "Qty Balance",
          "Rate",
          "Balance",
        ],
      ],
      body: filtered.map((r) => [
        r.date,
        r.invid,
        r.type,
        r.particulars,
        r.productCode,
        r.productName,
        r.qtyIn ? `+${r.qtyIn}` : "",
        r.qtyOut ? `${Math.abs(r.qtyOut)}` : "",
        r.qtyBalance,
        `Rs. ${Number(r.rate).toFixed(2)}`,
        `Rs. ${Number(r.balance).toFixed(2)}`,
      ]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [10, 104, 2] }, // #0A6802
    });

    doc.save("stock-ledger.pdf");
  };

  return (
    <div>
      <Group justify="space-between" mb="md">
        <div>
          <Title order={2}>Stock Ledger</Title>
          <Text c="dimmed" size="sm">
            Track stock movements and transactions
          </Text>
        </div>
        <ActionIcon
          size="lg"
          variant="filled"
          color="#0A6802"
          onClick={exportPDF}
          title="Export PDF"
          aria-label="Export PDF"
        >
          <IconDownload size={18} />
        </ActionIcon>
      </Group>

      <Card withBorder radius="md" shadow="sm" mb="lg" bg="#F1FCF0">
        <Group gap="md" align="flex-end" grow wrap="wrap">
          <div style={{ minWidth: 180 }}>
            <Text fw={600} size="sm" mb={6}>
              Product Code
            </Text>
            <TextInput
              placeholder="Enter product code"
              value={productCode}
              onChange={handleProductCodeChange}
              error={codeNotFound ? "Product not found" : undefined}
            />
          </div>
          <div style={{ minWidth: 180 }}>
            <Text fw={600} size="sm" mb={6}>
              Product Name
            </Text>
            <TextInput
              placeholder="Auto-filled from code"
              value={productName}
              readOnly
            />
          </div>
          <div style={{ minWidth: 180 }}>
            <Text fw={600} size="sm" mb={6}>
              From Date
            </Text>
            <TextInput
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.currentTarget.value)}
            />
          </div>
          <div style={{ minWidth: 180 }}>
            <Text fw={600} size="sm" mb={6}>
              To Date
            </Text>
            <TextInput
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.currentTarget.value)}
            />
          </div>
          <Group justify="flex-end" mt="xs">
            <Button variant="default" onClick={clearFilter}>
              Clear
            </Button>
            <Button color="#0A6802" onClick={applyFilter}>
              Apply Filter
            </Button>
          </Group>
        </Group>
      </Card>

      <Card withBorder radius="md" shadow="sm" p="md" bg={"#F1FCF0"}>
        {(applied.productCode || applied.productName) && (
          <Group mb="md">
            <Text fw={600}>Product Code: {applied.productCode || "-"}</Text>
            <Text fw={600} ml="lg">
              Product Name: {applied.productName || "-"}
            </Text>
          </Group>
        )}
        <Group justify="space-between" mb="sm">
          <Text fw={600}>Stock Movement History</Text>
          <Text size="sm" c="dimmed">
            Total Entries: {filtered.length}
          </Text>
        </Group>
        <Table
          highlightOnHover
          withTableBorder
          verticalSpacing="sm"
          withRowBorders
          withColumnBorders
        >
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Date</Table.Th>
              <Table.Th>Product Code</Table.Th>
              <Table.Th>Product Name</Table.Th>
              <Table.Th>Invoice Number</Table.Th>
              <Table.Th>Type</Table.Th>
              <Table.Th>Particulars</Table.Th>
              <Table.Th style={{ textAlign: "right" }}>Qty In</Table.Th>
              <Table.Th style={{ textAlign: "right" }}>Qty Out</Table.Th>
              <Table.Th style={{ textAlign: "right" }}>
                {applied.productCode ? "Qty Balance" : "Net Qty"}
              </Table.Th>
              <Table.Th style={{ textAlign: "right" }}>Rate</Table.Th>
              <Table.Th style={{ textAlign: "right" }}>Balance</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {paginatedData.map((r) => (
              <Table.Tr key={r.id}>
                <Table.Td style={{ whiteSpace: "nowrap" }}>
                  {new Date(r.date).toLocaleDateString("en-GB")}
                </Table.Td>
                <Table.Td>{r.productCode}</Table.Td>
                <Table.Td>{r.productName}</Table.Td>
                <Table.Td>{r.invid}</Table.Td>
                <Table.Td>{r.type}</Table.Td>
                <Table.Td
                  style={{
                    maxWidth: 200,
                    whiteSpace: "normal",
                    wordBreak: "break-word",
                  }}
                >
                  {r.particulars}
                </Table.Td>
                <Table.Td ta="right" c="#0A6802">
                  {r.qtyIn > 0 ? `+${r.qtyIn}` : ""}
                </Table.Td>
                <Table.Td ta="right" c="red">
                  {r.qtyOut > 0 ? Math.abs(r.qtyOut) : ""}
                </Table.Td>
                <Table.Td
                  ta="right"
                  fw={500}
                  c={r.qtyBalance < 0 ? "red" : undefined}
                >
                  {r.qtyBalance}
                </Table.Td>
                <Table.Td ta="right" c={r.txnRate === 0 ? "dimmed" : undefined}>
                  Rs. {Number(r.txnRate).toFixed(2)}
                </Table.Td>
                <Table.Td
                  ta="right"
                  fw={500}
                  c={r.balance === 0 ? "dimmed" : undefined}
                >
                  Rs. {Number(r.balance).toFixed(2)}
                </Table.Td>
              </Table.Tr>
            ))}
            {paginatedData.length === 0 && (
              <Table.Tr>
                <Table.Td colSpan={11}>
                  <Text c="dimmed" ta="center">
                    No records found for the current filters.
                  </Text>
                </Table.Td>
              </Table.Tr>
            )}
          </Table.Tbody>
        </Table>
        <Group justify="center" mt="md">
          <Pagination
            total={totalPages}
            value={page}
            onChange={setPage}
            size="sm"
            color="#0A6802"
          />
        </Group>
      </Card>
    </div>
  );
}
