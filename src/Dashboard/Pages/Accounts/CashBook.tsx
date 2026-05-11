// src/pages/CashBook.tsx
import {
  Title,
  Text,
  Group,
  Button,
  Card,
  SimpleGrid,
  Table,
  Badge,
  Modal,
  Textarea,
  Select,
  NumberInput,
  TextInput,
  Pagination,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
  IconPlus,
  IconDownload,
  IconArrowDown,
  IconArrowUp,
  IconSearch,
  IconFilter,
} from "@tabler/icons-react";
import { useEffect, useMemo, useState, useCallback } from "react";
import { useForm } from "@mantine/form";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useChartOfAccounts } from "../../Context/ChartOfAccountsContext";
import api from "../../../api_configuration/api";
import { getHeaderImage, getFooterImage } from "../../../utils/assetPaths";

type Entry = {
  date: string;
  particulars: string;
  voucher: string;
  type: "Receipt" | "Payment";
  amount: number;
};

type EntryWithBalance = Entry & { balance: number };

interface JournalVoucher {
  _id: string;
  voucherNumber: string;
  date: string;
  accountNumber: string;
  description?: string;
  debit?: number;
  credit?: number;
}

export default function CashBook() {
  const brand = "chemtronix";
  const { accounts: chartAccounts } = useChartOfAccounts();
  const [journalVouchers, setJournalVouchers] = useState<JournalVoucher[]>([]);
  const [opened, { open, close }] = useDisclosure(false);

  const form = useForm({
    initialValues: {
      date: new Date().toISOString().split("T")[0],
      type: "Cash Receipt",
      particulars: "",
      amount: 0,
      contraAccount: "",
    },

    validate: {
      particulars: (value) =>
        value.trim().length === 0 ? "Please enter particulars" : null,
      amount: (value) => (value <= 0 ? "Amount must be greater than 0" : null),
      contraAccount: (value) =>
        value.trim().length === 0 ? "Please select contra account" : null,
    },
  });

  // Fetch journal vouchers from API
  useEffect(() => {
    const fetchJournalVouchers = async () => {
      try {
        const response = await api.get("/journal-vouchers");
        console.log("Journal Vouchers API response:", response.data);
        setJournalVouchers(response.data || []);
      } catch (error) {
        console.error("Failed to fetch journal vouchers:", error);
        setJournalVouchers([]);
      }
    };

    fetchJournalVouchers();
  }, []);

  // Find Cash account from Chart of Accounts
  interface Account {
    accountCode?: string;
    accountName?: string;
    openingBalance?: { debit?: number; credit?: number };
    children?: Account[];
  }

  const flattenAccounts = useCallback((accounts: Account[]): Account[] => {
    let result: Account[] = [];
    accounts.forEach((account) => {
      result.push(account);
      if (account.children && account.children.length > 0) {
        result = result.concat(flattenAccounts(account.children));
      }
    });
    return result;
  }, []);

  const cashAccount = useMemo(() => {
    const flatAccounts = flattenAccounts(chartAccounts);
    // Find Cash account (usually code starts with 1101 or account name contains "Cash")
    return flatAccounts.find(
      (acc) =>
        acc.accountCode?.startsWith("1101") ||
        acc.accountName?.toLowerCase().includes("cash"),
    );
  }, [chartAccounts, flattenAccounts]);

  // Get all detail accounts for contra selection
  const detailAccounts = useMemo(() => {
    const flatAccounts = flattenAccounts(chartAccounts);
    const rows = flatAccounts.filter((acc) => acc.accountCode && acc.accountName);
    const nameCount = new Map<string, number>();
    rows.forEach((acc) => {
      const n = String(acc.accountName);
      nameCount.set(n, (nameCount.get(n) || 0) + 1);
    });
    return rows.map((acc) => {
      const name = String(acc.accountName);
      const dup = (nameCount.get(name) || 0) > 1;
      const label = dup ? `${name} (${String(acc.accountCode)})` : name;
      return {
        value: acc.accountCode || "",
        label,
      };
    });
  }, [chartAccounts, flattenAccounts]);

  // Build entries from journal vouchers
  const entries: Entry[] = useMemo(() => {
    if (!cashAccount) return [];
    const cashCode = cashAccount.accountCode || "";

    return journalVouchers
      .filter((jv) => jv.accountNumber?.startsWith(cashCode))
      .map((jv) => {
        const debit = jv.debit ?? 0;
        const credit = jv.credit ?? 0;
        const isReceipt = debit > 0;
        const amount = isReceipt ? debit : credit;
        return {
          date:
            jv.date?.split("T")[0] || new Date().toISOString().split("T")[0],
          particulars: jv.description || "Cash transaction",
          voucher: jv.voucherNumber || "N/A",
          type: isReceipt ? "Receipt" : "Payment",
          amount: isReceipt ? amount : -amount,
        };
      });
  }, [journalVouchers, cashAccount]);

  const [query, setQuery] = useState<string>("");
  const [typeFilter, setTypeFilter] = useState<"All" | "Receipt" | "Payment">(
    "All",
  );

  const [dateRange, setDateRange] = useState<[string | null, string | null]>([
    null,
    null,
  ]);

  const [pageSize, setPageSize] = useState<number>(10);
  const [page, setPage] = useState<number>(1);

  useEffect(() => {
    setPage(1);
  }, [query, typeFilter, dateRange, pageSize]);

  const toDate = (value: string | null): Date | null => {
    if (!value) return null;
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  };

  const filteredSorted: Entry[] = useMemo(() => {
    const [startStr, endStr] = dateRange;
    const start = toDate(startStr);
    const end = toDate(endStr);

    const byFilters = entries.filter((e) => {
      if (typeFilter !== "All" && e.type !== typeFilter) return false;

      if (query.trim()) {
        const q = query.toLowerCase();
        const hit =
          e.particulars.toLowerCase().includes(q) ||
          e.voucher.toLowerCase().includes(q);
        if (!hit) return false;
      }

      const d = new Date(e.date);
      if (start && d < start) return false;
      if (end && d > end) return false;

      return true;
    });

    return byFilters.sort(
      (a: Entry, b: Entry) =>
        new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
  }, [entries, query, typeFilter, dateRange]);

  const withBalance: EntryWithBalance[] = useMemo(() => {
    // Sort OLDEST first so running balance accumulates chronologically
    const chronological = [...filteredSorted].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );
    const openingBalance = cashAccount?.openingBalance?.debit || 0;
    let bal = openingBalance;
    const result = chronological.map((e) => {
      bal += e.amount;
      return { ...e, balance: bal };
    });
    // Show newest first in the table
    return result.reverse();
  }, [filteredSorted, cashAccount]);

  const pageCount = Math.max(1, Math.ceil(withBalance.length / pageSize));
  const pagedRows = withBalance.slice((page - 1) * pageSize, page * pageSize);

  const totalReceipts = filteredSorted
    .filter((e) => e.type === "Receipt")
    .reduce((sum, e) => sum + e.amount, 0);

  const totalPayments = Math.abs(
    filteredSorted
      .filter((e) => e.type === "Payment")
      .reduce((sum, e) => sum + e.amount, 0),
  );

  const closingBalance =
    withBalance.length > 0
      ? withBalance[withBalance.length - 1]?.balance
      : cashAccount?.openingBalance?.debit || 0;

  const handleSubmit = async (values: typeof form.values) => {
    try {
      const isReceipt = values.type === "Cash Receipt";

      // Generate next CB voucher number
      const cbNums = journalVouchers
        .filter((jv) => jv.voucherNumber?.startsWith("CB-"))
        .map((jv) => {
          const m = jv.voucherNumber?.match(/(\d+)$/);
          return m ? parseInt(m[1]) : 0;
        });
      const nextNum = cbNums.length > 0 ? Math.max(...cbNums) + 1 : 1;
      const voucherNumber = `CB-${nextNum.toString().padStart(4, "0")}`;

      const payload = [
        {
          date: values.date,
          voucherNumber,
          accountNumber: cashAccount?.accountCode || "1101",
          description: values.particulars,
          debit: isReceipt ? values.amount : 0,
          credit: isReceipt ? 0 : values.amount,
        },
        {
          date: values.date,
          voucherNumber,
          accountNumber: values.contraAccount,
          description: values.particulars,
          debit: isReceipt ? 0 : values.amount,
          credit: isReceipt ? values.amount : 0,
        },
      ];

      await api.post("/journal-vouchers", payload);

      // Refresh data
      const response = await api.get("/journal-vouchers");
      setJournalVouchers(response.data || []);

      close();
      form.reset();
    } catch (error) {
      console.error("Failed to create cash book entry:", error);
    }
  };

  const exportToPDF = () => {
    const logoUrl = "/Logo.png";
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
      doc.text("Cash Book Report", pageWidth / 2, 52, { align: "center" });
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(
        `Generated: ${new Date().toLocaleDateString()}`,
        pageWidth / 2,
        59,
        { align: "center" },
      );

      const filterLineParts: string[] = [];
      if (query.trim()) filterLineParts.push(`Search="${query.trim()}"`);
      if (typeFilter !== "All") filterLineParts.push(`Type=${typeFilter}`);
      if (dateRange[0] || dateRange[1])
        filterLineParts.push(
          `Range=${dateRange[0] ?? "—"} to ${dateRange[1] ?? "—"}`,
        );

      if (filterLineParts.length) {
        doc.setFontSize(9);
        doc.setTextColor(120);
        doc.text(filterLineParts.join("  |  "), pageWidth / 2, 65, {
          align: "center",
        });
      }

      autoTable(doc, {
        startY: filterLineParts.length ? 70 : 65,
        head: [
          ["Date", "Particulars", "Voucher No.", "Type", "Amount", "Balance"],
        ],
        body: withBalance.map((e) => [
          e.date,
          e.particulars,
          e.voucher,
          e.type,
          e.amount > 0
            ? `Rs. ${e.amount.toLocaleString()}`
            : `- Rs. ${Math.abs(e.amount).toLocaleString()}`,
          `Rs. ${e.balance.toLocaleString()}`,
        ]),
        styles: { fontSize: 9 },
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

      const lastY =
        (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable
          ?.finalY ?? 70;

      doc.setFontSize(11);
      doc.setTextColor(0);
      doc.setFont("helvetica", "bold");
      doc.text(
        `Total Receipts: Rs. ${totalReceipts.toLocaleString()}`,
        14,
        lastY + 10,
      );
      doc.text(
        `Total Payments: Rs. ${totalPayments.toLocaleString()}`,
        14,
        lastY + 17,
      );
      doc.setTextColor(34, 139, 34);
      doc.text(
        `Closing Balance: Rs. ${closingBalance.toLocaleString()}`,
        14,
        lastY + 24,
      );

      doc.save("cashbook.pdf");
    }
  };

  const allClosingBalance = useMemo(() => {
    const openingBalance = cashAccount?.openingBalance?.debit || 0;
    let bal = openingBalance;

    [...entries]
      .sort(
        (a: Entry, b: Entry) =>
          new Date(a.date).getTime() - new Date(b.date).getTime(),
      )
      .forEach((e) => {
        bal += e.amount;
      });
    return bal;
  }, [entries, cashAccount]);

  const allReceipts = useMemo(
    () =>
      entries
        .filter((e) => e.type === "Receipt")
        .reduce((sum, e) => sum + e.amount, 0),
    [entries],
  );

  const allPayments = useMemo(
    () =>
      Math.abs(
        entries
          .filter((e) => e.type === "Payment")
          .reduce((sum, e) => sum + e.amount, 0),
      ),
    [entries],
  );

  return (
    <div>
      <Group justify="space-between" mb="md">
        <div>
          <Title order={2}>Cash Book</Title>
          <Text c="dimmed">Record all cash receipts and payments</Text>
        </div>
        <Group>
          <Button
            leftSection={<IconPlus size={16} />}
            color="#0A6802"
            onClick={open}
          >
            Add Entry
          </Button>
        </Group>
      </Group>

      <SimpleGrid cols={{ base: 1, sm: 3 }} mb="md">
        <Card shadow="sm" padding="lg" radius="md" withBorder bg={"#F1FCF0"}>
          <Group>
            <IconArrowUp color="green" />
            <div>
              <Text size="xs" c="dimmed">
                Total Receipts
              </Text>
              <Text fw={500}>Rs. {allReceipts.toLocaleString()}</Text>
            </div>
          </Group>
        </Card>
        <Card shadow="sm" padding="lg" radius="md" withBorder bg={"#F1FCF0"}>
          <Group>
            <IconArrowDown color="red" />
            <div>
              <Text size="xs" c="dimmed">
                Total Payments
              </Text>
              <Text fw={500}>Rs. {allPayments.toLocaleString()}</Text>
            </div>
          </Group>
        </Card>
        <Card shadow="sm" padding="lg" radius="md" withBorder bg={"#F1FCF0"}>
          <Group>
            <div>
              <Text size="xs" c="dimmed">
                Closing Balance
              </Text>
              <Text fw={500}>Rs. {allClosingBalance.toLocaleString()}</Text>
            </div>
          </Group>
        </Card>
      </SimpleGrid>

      {!cashAccount && (
        <Card
          shadow="sm"
          padding="lg"
          radius="md"
          withBorder
          bg="#FFF3CD"
          mb="md"
        >
          <Text c="orange" fw={500}>
            ⚠️ Cash account not found in Chart of Accounts. Please create a Cash
            account with code starting with "1101".
          </Text>
        </Card>
      )}

      <Card
        shadow="sm"
        padding="md"
        radius="md"
        withBorder
        mb="md"
        bg={"#F1FCF0"}
      >
        <Group mb="sm" gap="sm">
          <TextInput
            label="Search"
            leftSection={<IconSearch size={16} />}
            placeholder="Search particulars or voucher..."
            value={query}
            onChange={(e) => setQuery(e.currentTarget.value)}
            style={{ flex: 1 }}
          />
          <Select
            label="Filter Type"
            leftSection={<IconFilter size={16} />}
            data={["All", "Receipt", "Payment"]}
            value={typeFilter}
            onChange={(val) =>
              setTypeFilter((val as "All" | "Receipt" | "Payment") ?? "All")
            }
          />

          <Group gap="sm">
            <TextInput
              type="date"
              label="From"
              value={dateRange[0] ?? ""}
              onChange={(e) =>
                setDateRange([e.currentTarget.value || null, dateRange[1]])
              }
            />
            <TextInput
              type="date"
              label="To"
              value={dateRange[1] ?? ""}
              onChange={(e) =>
                setDateRange([dateRange[0], e.currentTarget.value || null])
              }
            />
          </Group>
        </Group>
      </Card>
      <Group justify="flex-end">
        <Button
          mb={20}
          color="#0A6802"
          leftSection={<IconDownload size={16} />}
          onClick={exportToPDF}
        >
          Export PDF
        </Button>
      </Group>

      <Table highlightOnHover withTableBorder withColumnBorders bg={"#F1FCF0"}>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Date</Table.Th>
            <Table.Th>Particulars</Table.Th>
            <Table.Th>Voucher No.</Table.Th>
            <Table.Th>Type</Table.Th>
            <Table.Th>Amount</Table.Th>
            <Table.Th>Balance</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {pagedRows.map((e, idx) => (
            <Table.Tr key={idx}>
              <Table.Td>{e.date}</Table.Td>
              <Table.Td>{e.particulars}</Table.Td>
              <Table.Td>{e.voucher}</Table.Td>
              <Table.Td>
                <Badge color={e.type === "Receipt" ? "#0A6802" : "red"}>
                  {e.type}
                </Badge>
              </Table.Td>
              <Table.Td c={e.amount > 0 ? "#0A6802" : "red"}>
                {e.amount > 0
                  ? `Rs. ${e.amount.toLocaleString()}`
                  : `- Rs. ${Math.abs(e.amount).toLocaleString()}`}
              </Table.Td>
              <Table.Td>Rs. {e.balance.toLocaleString()}</Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>

      <Group justify="space-between" mt="md">
        <Select
          data={["5", "10", "20", "50"]}
          value={pageSize.toString()}
          onChange={(v) => setPageSize(Number(v))}
          label="Rows per page"
          style={{ width: "100px" }}
        />
        <Pagination
          color="#0A6802"
          total={pageCount}
          value={page}
          onChange={setPage}
        />
      </Group>

      <Modal
        opened={opened}
        onClose={close}
        title={<strong>Add Cash Book Entry</strong>}
        centered
      >
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <TextInput
            label="Date"
            type="date"
            value={form.values.date}
            onChange={(e) => form.setFieldValue("date", e.currentTarget.value)}
            mb="md"
          />

          <Select
            label="Entry Type"
            data={["Cash Receipt", "Cash Payment"]}
            value={form.values.type}
            onChange={(value) => form.setFieldValue("type", value || "")}
            mb="md"
          />

          <Textarea
            label="Particulars"
            placeholder="Description of transaction"
            {...form.getInputProps("particulars")}
            mb="md"
          />

          <Select
            label="Contra Account"
            placeholder="Select account"
            data={detailAccounts}
            searchable
            {...form.getInputProps("contraAccount")}
            mb="md"
          />

          <NumberInput
            label="Amount"
            min={0}
            step={0.01}
            value={form.values.amount}
            onChange={(n) => form.setFieldValue("amount", Number(n) || 0)}
            mb="md"
          />

          <Group justify="flex-end" mt="md">
            <Button variant="default" onClick={close}>
              Cancel
            </Button>
            <Button type="submit" color="#0A6802">
              Add Entry
            </Button>
          </Group>
        </form>
      </Modal>
    </div>
  );
}
