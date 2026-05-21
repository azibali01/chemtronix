import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Card,
  Text,
  Grid,
  Table,
  Group,
  Button,
  TextInput,
  Select,
  Pagination,
} from "@mantine/core";
import { Download, Filter } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { RowInput } from "jspdf-autotable";
import api from "../../../api_configuration/api";
import { getHeaderImage, getFooterImage } from "../../../utils/assetPaths";

type TbRow = {
  accountNumber: string;
  accountName: string;
  accountType: string;
  parentAccount: string;
  totalDebit: number;
  totalCredit: number;
  netBalance: number;
};

/**
 * Resolve a canonical category label from a row.
 * Handles correctly-labelled parentAccount values ("Asset" etc.) and
 * numeric root-code values ("1000", "2000" etc.) by falling back to
 * the first digit of accountNumber.
 */
function resolveCategory(r: TbRow): string {
  const known: Record<string, string> = {
    Asset: "Asset",
    Liability: "Liability",
    Equity: "Equity",
    Revenue: "Revenue",
    Expense: "Expense",
  };
  if (r.parentAccount && known[r.parentAccount]) return known[r.parentAccount];
  const firstDigit = String(r.accountNumber ?? "")
    .trim()
    .charAt(0);
  switch (firstDigit) {
    case "1":
      return "Asset";
    case "2":
      return "Liability";
    case "3":
      return "Equity";
    case "4":
      return "Revenue";
    case "5":
      return "Expense";
    default:
      return r.parentAccount || "Other";
  }
}

export default function TrialBalance() {
  const brand = "chemtronix";
  const [rawData, setRawData] = useState<TbRow[]>([]);
  const [activePage, setActivePage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(5);

  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [accountTypeFilter, setAccountTypeFilter] = useState<string | null>(
    null,
  );
  const [search, setSearch] = useState("");

  const fetchTrialBalance = useCallback(async (start: string, end: string) => {
    try {
      const params: Record<string, string> = {};
      if (start) params.startDate = start;
      if (end) params.endDate = end;
      const { data } = await api.get("/reports/trial-balance", { params });
      setRawData(Array.isArray(data) ? data : []);
      setActivePage(1);
    } catch (e) {
      console.error("Failed to fetch trial balance:", e);
      setRawData([]);
    }
  }, []);

  // Auto-fetch on mount
  useEffect(() => {
    fetchTrialBalance("", "");
  }, [fetchTrialBalance]);

  // Client-side: filter by parentAccount type and search term
  const filteredData = useMemo(() => {
    return rawData.filter((r) => {
      const matchType = accountTypeFilter
        ? resolveCategory(r) === accountTypeFilter
        : true;
      const matchSearch = search
        ? r.accountNumber.toLowerCase().includes(search.toLowerCase()) ||
          r.accountName.toLowerCase().includes(search.toLowerCase())
        : true;
      return matchType && matchSearch;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawData, accountTypeFilter, search]);

  const applyFilter = () => {
    fetchTrialBalance(fromDate, toDate);
  };

  // Cards use rawData so the type-filter dropdown doesn't zero out other cards
  const totalDebit = rawData.reduce((s, r) => s + Number(r.totalDebit), 0);
  const totalCredit = rawData.reduce((s, r) => s + Number(r.totalCredit), 0);
  const balanced = Math.abs(totalDebit - totalCredit) < 0.01;

  const assets = rawData
    .filter((r) => resolveCategory(r) === "Asset")
    .reduce((s, r) => s + Number(r.totalDebit) - Number(r.totalCredit), 0);
  const liabilities = rawData
    .filter((r) => resolveCategory(r) === "Liability")
    .reduce((s, r) => s + Number(r.totalCredit) - Number(r.totalDebit), 0);
  const equity = rawData
    .filter((r) => resolveCategory(r) === "Equity")
    .reduce((s, r) => s + Number(r.totalCredit) - Number(r.totalDebit), 0);
  const revenue = rawData
    .filter((r) => resolveCategory(r) === "Revenue")
    .reduce((s, r) => s + Number(r.totalCredit) - Number(r.totalDebit), 0);
  const expenses = rawData
    .filter((r) => resolveCategory(r) === "Expense")
    .reduce((s, r) => s + Number(r.totalDebit) - Number(r.totalCredit), 0);

  const start = (activePage - 1) * rowsPerPage;
  const end = start + rowsPerPage;
  const paginatedAccounts = filteredData.slice(start, end);

  const exportPDF = () => {
    const logoUrl = "/Logo.png";
    const headerUrl = getHeaderImage(brand);
    const footerUrl = getFooterImage(brand);
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
      doc.text("Trial Balance Report", pageWidth / 2, 52, {
        align: "center",
      });
      doc.setFontSize(10);
      doc.text("Date: " + new Date().toLocaleDateString(), pageWidth / 2, 59, {
        align: "center",
      });

      autoTable(doc, {
        head: [
          ["Code", "Account Name", "Type", "Debit", "Credit", "Net Balance"],
        ],
        body: [
          ...filteredData.map((r) => [
            r.accountNumber,
            r.accountName,
            r.parentAccount,
            `Rs. ${r.totalDebit.toLocaleString()}`,
            `Rs. ${r.totalCredit.toLocaleString()}`,
            `Rs. ${Math.abs(r.netBalance).toLocaleString()}${r.netBalance < 0 ? " (Cr)" : r.netBalance > 0 ? " (Dr)" : ""}`,
          ]),
          [
            {
              content: "Totals",
              colSpan: 3,
              styles: { halign: "right", fontStyle: "bold" },
            },
            {
              content: `Rs. ${totalDebit.toLocaleString()}`,
              styles: { fontStyle: "bold" },
            },
            {
              content: `Rs. ${totalCredit.toLocaleString()}`,
              styles: { fontStyle: "bold" },
            },
            "",
          ],
        ] as RowInput[],
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

      doc.save("trial_balance.pdf");
    }
  };

  return (
    <div className="p-6">
      <Group justify="space-between" mb="md">
        <Text size="xl" fw={700}>
          Trial Balance
        </Text>
        <Button
          leftSection={<Download size={16} />}
          color="#0A6802"
          onClick={exportPDF}
        >
          Export Report
        </Button>
      </Group>

      <Grid>
        <Grid.Col span={2}>
          <Card withBorder p="md" bg="#F1FCF0">
            <Text>Assets</Text>
            <Text fw={700}>Rs. {assets.toLocaleString()}</Text>
          </Card>
        </Grid.Col>
        <Grid.Col span={2}>
          <Card withBorder p="md" bg="#F1FCF0">
            <Text>Liabilities</Text>
            <Text fw={700}>Rs. {liabilities.toLocaleString()}</Text>
          </Card>
        </Grid.Col>
        <Grid.Col span={2}>
          <Card withBorder p="md" bg="#F1FCF0">
            <Text>Equity</Text>
            <Text fw={700}>Rs. {equity.toLocaleString()}</Text>
          </Card>
        </Grid.Col>
        <Grid.Col span={3}>
          <Card withBorder p="md" bg="#F1FCF0">
            <Text>Revenue</Text>
            <Text fw={700}>Rs. {revenue.toLocaleString()}</Text>
          </Card>
        </Grid.Col>
        <Grid.Col span={3}>
          <Card withBorder p="md" bg="#F1FCF0">
            <Text>Expenses</Text>
            <Text fw={700}>Rs. {expenses.toLocaleString()}</Text>
          </Card>
        </Grid.Col>
      </Grid>

      <Card shadow="sm" p="md" mt="md" bg="#F1FCF0" withBorder>
        <Group grow>
          <TextInput
            label="Search"
            placeholder="Search by account code or name"
            value={search}
            onChange={(e) => setSearch(e.currentTarget.value)}
          />
          <TextInput
            label="From Date"
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.currentTarget.value)}
          />
          <TextInput
            label="To Date"
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.currentTarget.value)}
          />
          <Select
            label="Account Type"
            placeholder="Select type"
            data={["Asset", "Liability", "Equity", "Revenue", "Expense"]}
            value={accountTypeFilter}
            onChange={setAccountTypeFilter}
            clearable
          />
          <Button
            mt={23}
            color="#0A6802"
            leftSection={<Filter size={16} color="white" />}
            onClick={applyFilter}
          >
            Generate Report
          </Button>
        </Group>
      </Card>

      <Card shadow="sm" p="md" mt="md" withBorder bg="#F1FCF0">
        <Text fw={600} mb="sm">
          Trial Balance (Filtered)
        </Text>
        <Table striped highlightOnHover withTableBorder bg={"#F1FCF0"}>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Code</Table.Th>
              <Table.Th>Account Name</Table.Th>
              <Table.Th>Type</Table.Th>
              <Table.Th>Debit</Table.Th>
              <Table.Th>Credit</Table.Th>
              <Table.Th>Net Balance</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {paginatedAccounts.map((r, i) => (
              <Table.Tr key={i}>
                <Table.Td>{r.accountNumber}</Table.Td>
                <Table.Td>{r.accountName}</Table.Td>
                <Table.Td>{resolveCategory(r)}</Table.Td>
                <Table.Td c="#0A6802">
                  Rs. {r.totalDebit.toLocaleString()}
                </Table.Td>
                <Table.Td c="red">
                  Rs. {r.totalCredit.toLocaleString()}
                </Table.Td>
                <Table.Td c={r.netBalance < 0 ? "red" : undefined}>
                  Rs. {Math.abs(r.netBalance).toLocaleString()}
                  {r.netBalance < 0 ? " (Cr)" : r.netBalance > 0 ? " (Dr)" : ""}
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
          <Table.Tfoot>
            <Table.Tr>
              <Table.Th colSpan={3}>Totals</Table.Th>
              <Table.Th>Rs. {totalDebit.toLocaleString()}</Table.Th>
              <Table.Th>Rs. {totalCredit.toLocaleString()}</Table.Th>
              <Table.Th></Table.Th>
            </Table.Tr>
          </Table.Tfoot>
        </Table>

        <Text mt="sm" c={balanced ? "#0A6802" : "red"} fw={700}>
          {balanced ? "Balanced" : "Unbalanced"}
        </Text>

        <Group justify="space-between">
          <Group gap="xs">
            <Text size="sm">Rows per page:</Text>
            <Select
              value={rowsPerPage.toString()}
              onChange={(value) => {
                setRowsPerPage(Number(value));
                setActivePage(1);
              }}
              data={["5", "10", "20", "50"]}
              w={80}
            />
          </Group>

          <Pagination
            color="#0A6802"
            total={Math.ceil(filteredData.length / rowsPerPage)}
            value={activePage}
            onChange={setActivePage}
            withEdges
          />
        </Group>
      </Card>
    </div>
  );
}
