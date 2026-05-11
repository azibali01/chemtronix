import { useState, useMemo, useEffect, useCallback } from "react";
import {
  Card,
  Text,
  Table,
  Group,
  Button,
  TextInput,
  Pagination,
  Select,
  Modal,
  Stack,
  NumberInput,
  SegmentedControl,
} from "@mantine/core";
import { Download, Edit, Trash2, Plus } from "lucide-react";
import jsPDF from "jspdf";
import autoTable, { type RowInput } from "jspdf-autotable";
import { useChartOfAccounts } from "../../Context/ChartOfAccountsContext";
import api from "../../../api_configuration/api";

interface JournalVoucherEntry {
  /** Chart of accounts code — sent to API as `accountNumber`, not shown in the form. */
  accountNumber: string;
  accountName: string;
  debit: number;
  credit: number;
  description?: string;
  /** Which side holds the amount for this line (form UX; stored as debit/credit numbers). */
  entrySide?: "debit" | "credit";
}

function buildJournalLineDescription(
  voucherLevelDescription: string | undefined,
  entry: JournalVoucherEntry,
): string {
  const parts: string[] = [];
  const v = (voucherLevelDescription || "").trim();
  const e = (entry.description || "").trim();
  if (v) parts.push(v);
  if (e) parts.push(e);
  return parts.join(" | ");
}

/** Strip legacy `| Open invoice …` suffix from stored descriptions when loading. */
function parseStoredJournalLineDescription(stored: string): string {
  const s = (stored || "").trim();
  const tailPipe = s.match(/\s*\|\s*Open invoice\s+.+$/i);
  if (tailPipe?.index !== undefined) {
    return s.slice(0, tailPipe.index).trim();
  }
  const onlyInv = s.match(/^Open invoice\s+.+$/i);
  if (onlyInv) {
    return "";
  }
  return s;
}

interface JournalVoucher {
  _id?: string;
  voucherNumber: string;
  date: string;
  description?: string; // Voucher-level description
  entries: JournalVoucherEntry[];
}

function JournalVoucherList() {
  const { accounts: chartAccounts } = useChartOfAccounts();
  const [vouchers, setVouchers] = useState<JournalVoucher[]>([]);

  const [search, setSearch] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [activePage, setActivePage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(5);

  const [openedCreate, setOpenedCreate] = useState(false);
  const [openedEdit, setOpenedEdit] = useState(false);
  const [editVoucher, setEditVoucher] = useState<JournalVoucher | null>(null);
  const [nextVoucherNumber, setNextVoucherNumber] = useState<string>("");

  // Helper function to get account name from chart of accounts
  const getAccountName = useCallback(
    (accountCode: string): string => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const flattenAccounts = (accounts: any[]): any[] => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let result: any[] = [];
        accounts.forEach((account) => {
          result.push(account);
          if (account.children && account.children.length > 0) {
            result = result.concat(flattenAccounts(account.children));
          }
        });
        return result;
      };

      const flatAccounts = flattenAccounts(chartAccounts);
      const account = flatAccounts.find((a) => a.accountCode === accountCode);
      return account?.accountName || "Unknown Account";
    },
    [chartAccounts],
  );

  // Helper function to transform backend response (flat entries) to grouped vouchers
  const transformBackendResponse = useCallback(
    (backendData: Array<Record<string, string | number>>) => {
      const groupedVouchers: { [key: string]: JournalVoucher } = {};

      backendData.forEach((entry: Record<string, string | number>) => {
        const voucherNum = String(entry.voucherNumber);

        if (!groupedVouchers[voucherNum]) {
          groupedVouchers[voucherNum] = {
            _id: String(entry._id),
            voucherNumber: String(entry.voucherNumber),
            date: String(entry.date),
            description: String(entry.description || ""),
            entries: [],
          };
        }

        const accountNum = String(entry.accountNumber ?? "");
        const rawDesc =
          typeof entry.description === "string"
            ? entry.description
            : String(entry.description ?? "");
        const dr = Number(entry.debit) || 0;
        const cr = Number(entry.credit) || 0;
        const entrySide: "debit" | "credit" =
          dr > 0 ? "debit" : cr > 0 ? "credit" : "debit";
        groupedVouchers[voucherNum].entries.push({
          accountNumber: accountNum,
          accountName: getAccountName(accountNum),
          debit: dr,
          credit: cr,
          description: parseStoredJournalLineDescription(rawDesc),
          entrySide,
        });
      });

      return Object.values(groupedVouchers);
    },
    [getAccountName],
  );

  // Fetch journal vouchers from API
  useEffect(() => {
    const fetchJournalVouchers = async () => {
      try {
        const response = await api.get("/journal-vouchers");
        console.log("Journal Vouchers API response:", response.data);

        // Transform flat backend response to grouped vouchers
        const vouchersArray = transformBackendResponse(response.data || []);
        console.log("Grouped vouchers:", vouchersArray);

        setVouchers(vouchersArray);

        // Generate next voucher number
        generateNextVoucherNumber(vouchersArray);
      } catch (error) {
        console.error("Failed to fetch journal vouchers:", error);
        setVouchers([]);
        setNextVoucherNumber("JV-0001");
      }
    };

    fetchJournalVouchers();
  }, [chartAccounts, getAccountName, transformBackendResponse]);

  const generateNextVoucherNumber = (vouchersList: JournalVoucher[]) => {
    if (vouchersList.length === 0) {
      setNextVoucherNumber("JV-0001");
      return;
    }

    // Extract numbers from voucher numbers and find the maximum
    const numbers = vouchersList
      .map((v) => {
        const match = v.voucherNumber.match(/\d+/);
        return match ? parseInt(match[0], 10) : 0;
      })
      .filter((num) => !isNaN(num));

    const maxNumber = numbers.length > 0 ? Math.max(...numbers) : 0;
    const nextNumber = maxNumber + 1;
    setNextVoucherNumber(`JV-${nextNumber.toString().padStart(4, "0")}`);
  };

  // Flatten accounts for dropdown
  const flattenAccounts = (accounts: Account[]): Account[] => {
    let result: Account[] = [];
    accounts.forEach((account) => {
      result.push(account);
      if (account.children && account.children.length > 0) {
        result = result.concat(flattenAccounts(account.children));
      }
    });
    return result;
  };

  interface Account {
    accountCode?: string;
    accountName?: string;
    children?: Account[];
  }

  /** Searchable account picker: label is account name only (code used as value for API). */
  const accountSelectOptions = useMemo(() => {
    const flatAccounts = flattenAccounts(chartAccounts as Account[]);
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
        value: String(acc.accountCode),
        label,
      };
    });
  }, [chartAccounts]);

  const filteredData = useMemo(() => {
    let result = vouchers;
    if (fromDate) {
      result = result.filter((v) => new Date(v.date) >= new Date(fromDate));
    }
    if (toDate) {
      result = result.filter((v) => new Date(v.date) <= new Date(toDate));
    }
    if (search) {
      const s = search.toLowerCase();
      result = result.filter(
        (v) =>
          v.voucherNumber.toLowerCase().includes(s) ||
          (v.description && v.description.toLowerCase().includes(s)) ||
          (v.entries || []).some((e) =>
            (e.accountName ?? "").toLowerCase().includes(s),
          ),
      );
    }
    return result;
  }, [vouchers, fromDate, toDate, search]);

  const paginatedData = useMemo(() => {
    const start = (activePage - 1) * rowsPerPage;
    const end = start + rowsPerPage;
    return filteredData.slice(start, end);
  }, [filteredData, activePage, rowsPerPage]);

  const exportRowPDF = (voucher: JournalVoucher) => {
    const doc = new jsPDF("p", "pt", "a4");
    const companyName = "Chemtronix Engineering Solutions";
    const reportTitle = "Journal Voucher";
    const currentDate = new Date().toLocaleDateString();

    doc.setFontSize(18);
    doc.setTextColor("#0A6802");
    doc.text(companyName, 40, 40);
    doc.setFontSize(14);
    doc.setTextColor("#222");
    doc.text(reportTitle, 40, 65);

    doc.setFontSize(11);
    doc.setTextColor("#444");
    doc.text(`Voucher No: ${voucher.voucherNumber}`, 40, 95);
    doc.text(`Date: ${voucher.date}`, 250, 95);
    doc.text(`Description: ${voucher.description || "N/A"}`, 40, 115);

    const totalDebit = (voucher.entries || []).reduce(
      (sum, e) => sum + e.debit,
      0,
    );
    const totalCredit = (voucher.entries || []).reduce(
      (sum, e) => sum + e.credit,
      0,
    );

    autoTable(doc, {
      startY: 135,
      head: [["Account", "Debit", "Credit"]],
      body: [
        ...(voucher.entries || []).map((entry) => [
          entry.accountName,
          `Rs. ${entry.debit.toLocaleString()}`,
          `Rs. ${entry.credit.toLocaleString()}`,
        ]),
        [
          { content: "Totals", colSpan: 1, styles: { fontStyle: "bold" } },
          `Rs. ${totalDebit.toLocaleString()}`,
          `Rs. ${totalCredit.toLocaleString()}`,
        ],
      ] as RowInput[],
      styles: { fontSize: 12 },
      headStyles: { fillColor: [10, 104, 2], textColor: 255 },
      theme: "grid",
      margin: { left: 40, right: 40 },
    });

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(
      `Generated on: ${currentDate}`,
      40,
      doc.internal.pageSize.height - 30,
    );
    doc.text(`Page 1 of 1`, 480, doc.internal.pageSize.height - 30);

    doc.save(`${voucher.voucherNumber}.pdf`);
  };

  const exportAllPDF = () => {
    const doc = new jsPDF("p", "pt", "a4");
    const companyName = "Chemtronix Engineering Solutions";
    const reportTitle = "Journal Vouchers Report";
    const currentDate = new Date().toLocaleDateString();

    doc.setFontSize(18);
    doc.setTextColor("#0A6802");
    doc.text(companyName, 40, 40);
    doc.setFontSize(14);
    doc.setTextColor("#222");
    doc.text(reportTitle, 40, 65);

    doc.setFontSize(11);
    doc.setTextColor("#444");
    let dateText = "";
    if (fromDate && toDate) {
      dateText = `From: ${fromDate}   To: ${toDate}`;
    } else if (fromDate) {
      dateText = `From: ${fromDate}`;
    } else if (toDate) {
      dateText = `To: ${toDate}`;
    }
    if (dateText) {
      doc.text(dateText, 40, 90);
    }

    const totalDebit = filteredData.reduce(
      (sum, v) => sum + (v.entries || []).reduce((s, e) => s + e.debit, 0),
      0,
    );
    const totalCredit = filteredData.reduce(
      (sum, v) => sum + (v.entries || []).reduce((s, e) => s + e.credit, 0),
      0,
    );

    autoTable(doc, {
      startY: dateText ? 110 : 90,
      head: [["Voucher No", "Date", "Description", "Debit", "Credit"]],
      body: [
        ...filteredData.map((v) => [
          v.voucherNumber,
          v.date,
          v.description || "N/A",
          `Rs. ${(v.entries || [])
            .reduce((s, e) => s + e.debit, 0)
            .toLocaleString()}`,
          `Rs. ${(v.entries || [])
            .reduce((s, e) => s + e.credit, 0)
            .toLocaleString()}`,
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
        ],
      ] as RowInput[],
      styles: { fontSize: 11 },
      headStyles: { fillColor: [10, 104, 2], textColor: 255 },
      theme: "grid",
      margin: { left: 40, right: 40 },
      didDrawPage: function () {
        const pageCount = doc.getNumberOfPages();
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(
          `Generated on: ${currentDate}`,
          40,
          doc.internal.pageSize.height - 30,
        );
        doc.text(
          `Page ${doc.getCurrentPageInfo().pageNumber} of ${pageCount}`,
          480,
          doc.internal.pageSize.height - 30,
        );
      },
    });

    doc.save("journal_vouchers.pdf");
  };

  const handleCreate = async (newVoucher: JournalVoucher) => {
    try {
      // Backend expects an array of DTOs, one for each entry
      const payload = newVoucher.entries.map((entry) => ({
        voucherNumber: newVoucher.voucherNumber,
        accountNumber: entry.accountNumber,
        date: newVoucher.date,
        description: buildJournalLineDescription(
          newVoucher.description,
          entry,
        ),
        debit: Number(entry.debit) || 0,
        credit: Number(entry.credit) || 0,
      }));

      console.log("Creating journal voucher with payload:", payload);
      console.log("Making POST request to: /journal-vouchers");
      const response = await api.post("/journal-vouchers", payload);
      console.log("Create response:", response.data);

      // Fetch and transform the updated data
      const fetchResponse = await api.get("/journal-vouchers");
      const transformedVouchers = transformBackendResponse(
        fetchResponse.data || [],
      );
      setVouchers(transformedVouchers);
      generateNextVoucherNumber(transformedVouchers);
      setOpenedCreate(false);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      console.error("Failed to create journal voucher:", error);
      console.error("Error details:", error.response?.data);
      console.error("Error status:", error.response?.status);
      console.error("Error URL:", error.config?.url);
      alert(
        `Error creating journal voucher: ${
          error.response?.data?.message || error.message
        }`,
      );
    }
  };

  const handleEdit = async (updatedVoucher: JournalVoucher) => {
    try {
      // Backend expects an array of DTOs, one for each entry
      const payload = updatedVoucher.entries.map((entry) => ({
        voucherNumber: updatedVoucher.voucherNumber,
        accountNumber: entry.accountNumber,
        date: updatedVoucher.date,
        description: buildJournalLineDescription(
          updatedVoucher.description,
          entry,
        ),
        debit: Number(entry.debit) || 0,
        credit: Number(entry.credit) || 0,
      }));

      console.log("Updating journal voucher with payload:", payload);
      await api.put(`/journal-vouchers/${updatedVoucher._id}`, payload);

      // Fetch and transform the updated data
      const response = await api.get("/journal-vouchers");
      const transformedVouchers = transformBackendResponse(response.data || []);
      setVouchers(transformedVouchers);
      generateNextVoucherNumber(transformedVouchers);
      setOpenedEdit(false);
    } catch (error) {
      console.error("Failed to update journal voucher:", error);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/journal-vouchers/${id}`);

      // Fetch and transform the updated data
      const response = await api.get("/journal-vouchers");
      const transformedVouchers = transformBackendResponse(response.data || []);
      setVouchers(transformedVouchers);
      generateNextVoucherNumber(transformedVouchers);
    } catch (error) {
      console.error("Failed to delete journal voucher:", error);
    }
  };

  return (
    <div className="p-6">
      <Group justify="space-between" mb="md">
        <Stack gap={0}>
          <Text size="xl" fw={700}>
            Journal Vouchers
          </Text>
          <Text>Manage journal entries and adjustments</Text>
        </Stack>
        <Group>
          <Button
            leftSection={<Plus size={16} />}
            color="#0A6802"
            onClick={() => setOpenedCreate(true)}
          >
            Create Voucher
          </Button>
        </Group>
      </Group>

      <Card shadow="sm" p="md" withBorder bg="#F1FCF0">
        <Group>
          <Group grow w="55%">
            <TextInput
              label="Search"
              placeholder="Search by voucher, account, description"
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
          </Group>
          <Group>
            <Button
              variant="outline"
              color="gray"
              mt={22}
              onClick={() => {
                setSearch("");
                setFromDate("");
                setToDate("");
              }}
            >
              Clear
            </Button>
          </Group>
          <Button
            leftSection={<Download size={16} />}
            color="#819E00"
            onClick={exportAllPDF}
            mt={22}
          >
            Export All
          </Button>
          <Group justify="end" ml="auto">
            <Select
              label="Rows per page"
              data={["5", "10", "20"]}
              value={rowsPerPage.toString()}
              onChange={(value) => {
                setRowsPerPage(Number(value));
                setActivePage(1);
              }}
              w={120}
              mt={22}
            />
          </Group>
        </Group>
      </Card>

      <Card shadow="sm" p="md" mt="md" withBorder bg="#F1FCF0">
        <Group justify="space-between" mb={15}>
          <Stack>
            <Text fw={600}>Journal Entries</Text>
          </Stack>
        </Group>

        <Table highlightOnHover withTableBorder>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Voucher No</Table.Th>
              <Table.Th>Date</Table.Th>
              <Table.Th>Description</Table.Th>
              <Table.Th>Debit</Table.Th>
              <Table.Th>Credit</Table.Th>
              <Table.Th>Actions</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {paginatedData.map((v, i) => (
              <Table.Tr key={i}>
                <Table.Td>{v.voucherNumber}</Table.Td>
                <Table.Td>{v.date}</Table.Td>
                <Table.Td>{v.description || "N/A"}</Table.Td>
                <Table.Td c="#0A6802">
                  Rs.{" "}
                  {(v.entries || [])
                    .reduce((s, e) => s + e.debit, 0)
                    .toLocaleString()}
                </Table.Td>
                <Table.Td c="red">
                  Rs.{" "}
                  {(v.entries || [])
                    .reduce((s, e) => s + e.credit, 0)
                    .toLocaleString()}
                </Table.Td>
                <Table.Td>
                  <Group gap="xs">
                    <Button
                      size="xs"
                      variant="light"
                      color="#0A6802"
                      leftSection={<Edit size={14} />}
                      onClick={() => {
                        setEditVoucher(v);
                        setOpenedEdit(true);
                      }}
                    ></Button>
                    <Button
                      size="xs"
                      variant="light"
                      color="red"
                      leftSection={<Trash2 size={14} />}
                      onClick={() => v._id && handleDelete(v._id)}
                    ></Button>
                    <Button
                      size="xs"
                      variant="light"
                      color="#819E00"
                      leftSection={<Download size={14} />}
                      onClick={() => exportRowPDF(v)}
                    ></Button>
                  </Group>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>

        <Group justify="center" mt="md">
          <Pagination
            total={Math.ceil(filteredData.length / rowsPerPage)}
            value={activePage}
            onChange={setActivePage}
            color="#0A6802"
          />
        </Group>
      </Card>

      <Modal
        opened={openedCreate}
        onClose={() => setOpenedCreate(false)}
        title={<strong>Create Journal Voucher</strong>}
        size="xl"
      >
        <VoucherForm
          onSubmit={handleCreate}
          accountSelectOptions={accountSelectOptions}
          autoVoucherNumber={nextVoucherNumber}
        />
      </Modal>

      <Modal
        opened={openedEdit}
        onClose={() => setOpenedEdit(false)}
        title={<strong>Edit Journal Voucher</strong>}
        size="xl"
      >
        {editVoucher && (
          <VoucherForm
            initialData={editVoucher}
            onSubmit={handleEdit}
            accountSelectOptions={accountSelectOptions}
          />
        )}
      </Modal>
    </div>
  );
}

function VoucherForm({
  onSubmit,
  initialData,
  accountSelectOptions,
  autoVoucherNumber,
}: {
  onSubmit: (data: JournalVoucher) => void;
  initialData?: JournalVoucher;
  accountSelectOptions: { value: string; label: string }[];
  autoVoucherNumber?: string;
}) {
  const emptyEntry = (defaultSide: "debit" | "credit" = "debit"): JournalVoucherEntry => ({
    accountNumber: "",
    accountName: "",
    debit: 0,
    credit: 0,
    entrySide: defaultSide,
  });

  const [voucher, setVoucher] = useState<JournalVoucher>(
    initialData || {
      voucherNumber: autoVoucherNumber || "",
      date: new Date().toISOString().split("T")[0],
      description: "",
      entries: [emptyEntry("debit"), emptyEntry("credit")],
    },
  );

  useEffect(() => {
    if (initialData) {
      setVoucher(initialData);
    }
  }, [initialData]);

  // Update voucher number when autoVoucherNumber changes
  useEffect(() => {
    if (autoVoucherNumber && !initialData) {
      setVoucher((prev) => ({ ...prev, voucherNumber: autoVoucherNumber }));
    }
  }, [autoVoucherNumber, initialData]);

  const handleVoucherChange = (field: string, value: string) => {
    setVoucher((prev) => ({ ...prev, [field]: value }));
  };

  const setLineAmount = (index: number, raw: string | number) => {
    const amt = typeof raw === "number" ? raw : Number(raw) || 0;
    setVoucher((prev) => {
      const newEntries = [...prev.entries];
      const e = newEntries[index];
      const side = e.entrySide ?? (Number(e.debit) > 0 ? "debit" : "credit");
      newEntries[index] = {
        ...e,
        entrySide: side,
        debit: side === "debit" ? amt : 0,
        credit: side === "credit" ? amt : 0,
      };
      return { ...prev, entries: newEntries };
    });
  };

  const handleEntryChange = (
    index: number,
    field: keyof JournalVoucherEntry,
    value: string | number,
  ) => {
    const newEntries = [...voucher.entries];

    if (field === "accountNumber") {
      const sel = accountSelectOptions.find((o) => o.value === String(value));
      const baseName = sel
        ? sel.label.replace(/\s*\([^)]*\)\s*$/, "").trim()
        : "";
      newEntries[index] = {
        ...newEntries[index],
        accountNumber: String(value ?? ""),
        accountName: baseName,
      };
    } else if (field === "entrySide") {
      const side = value as "debit" | "credit";
      const e = newEntries[index];
      const amt = Math.max(Number(e.debit) || 0, Number(e.credit) || 0);
      newEntries[index] = {
        ...e,
        entrySide: side,
        debit: side === "debit" ? amt : 0,
        credit: side === "credit" ? amt : 0,
      };
    } else {
      newEntries[index] = { ...newEntries[index], [field]: value };
    }

    setVoucher((prev) => ({ ...prev, entries: newEntries }));
  };

  const addEntry = () => {
    setVoucher((prev) => ({
      ...prev,
      entries: [...prev.entries, emptyEntry("debit")],
    }));
  };

  const totalDebit = voucher.entries.reduce(
    (sum, e) => sum + Number(e.debit),
    0,
  );
  const totalCredit = voucher.entries.reduce(
    (sum, e) => sum + Number(e.credit),
    0,
  );
  const isBalanced = totalDebit === totalCredit && totalDebit > 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isBalanced) {
      alert("Debit and Credit must be equal and greater than 0!");
      return;
    }
    const missingAccount = voucher.entries.some(
      (row) => (Number(row.debit) > 0 || Number(row.credit) > 0) && !row.accountNumber,
    );
    if (missingAccount) {
      alert("Select an account for each line that has a debit or credit amount.");
      return;
    }
    onSubmit(voucher);
  };

  return (
    <form onSubmit={handleSubmit}>
      <Stack gap="md">
        <TextInput
          label="Voucher Number"
          value={voucher.voucherNumber}
          onChange={(e) =>
            handleVoucherChange("voucherNumber", e.currentTarget.value)
          }
          readOnly={!initialData}
          disabled={!initialData}
        />
        <TextInput
          label="Date"
          type="date"
          value={voucher.date}
          onChange={(e) => handleVoucherChange("date", e.currentTarget.value)}
        />

        <Text fw={600} mb="sm">
          Journal Entries
        </Text>

        {voucher.entries.map((entry, index) => {
          const side =
            entry.entrySide ??
            (Number(entry.debit) > 0
              ? "debit"
              : Number(entry.credit) > 0
                ? "credit"
                : "debit");
          const lineAmount =
            side === "debit" ? Number(entry.debit) || 0 : Number(entry.credit) || 0;
          const prev = index > 0 ? voucher.entries[index - 1] : null;
          const prevSide = prev
            ? prev.entrySide ??
              (Number(prev.debit) > 0
                ? "debit"
                : Number(prev.credit) > 0
                  ? "credit"
                  : "debit")
            : null;
          const prevAmt =
            prev && prevSide
              ? prevSide === "debit"
                ? Number(prev.debit) || 0
                : Number(prev.credit) || 0
              : 0;
          const offsetVerb =
            prevSide === "debit" ? "credit" : prevSide === "credit" ? "debit" : null;

          return (
          <Card key={index} shadow="sm" p="sm" mb="sm" withBorder>
            <Stack gap="md">
              {index > 0 && prevAmt > 0 && offsetVerb ? (
                <Text size="sm" c="dimmed">
                  Offset the line above: enter a{" "}
                  <Text span fw={600} c="dark" tt="capitalize">
                    {offsetVerb}
                  </Text>{" "}
                  of Rs. {prevAmt.toLocaleString()} on this line (pick the account
                  and side below).
                </Text>
              ) : null}
              <Select
                label="Account"
                placeholder="Type to search by account name"
                searchable
                data={accountSelectOptions}
                value={entry.accountNumber || null}
                onChange={(v) =>
                  handleEntryChange(index, "accountNumber", v ?? "")
                }
                clearable
              />
              <div>
                <Text size="sm" fw={500} mb={6}>
                  This line is
                </Text>
                <SegmentedControl
                  fullWidth
                  data={[
                    { label: "Debit", value: "debit" },
                    { label: "Credit", value: "credit" },
                  ]}
                  value={side}
                  onChange={(v) =>
                    handleEntryChange(
                      index,
                      "entrySide",
                      v as "debit" | "credit",
                    )
                  }
                />
              </div>
              <NumberInput
                label={side === "debit" ? "Debit amount" : "Credit amount"}
                value={lineAmount}
                onChange={(value) => setLineAmount(index, value ?? 0)}
                min={0}
                step={0.01}
              />
              <TextInput
                label="Description"
                value={entry.description ?? ""}
                onChange={(e) =>
                  handleEntryChange(index, "description", e.currentTarget.value)
                }
              />
            </Stack>
          </Card>
          );
        })}

        <Button
          variant="light"
          color="#0A6802"
          leftSection={<Plus size={16} />}
          onClick={addEntry}
          mb="md"
          fullWidth
        >
          Add Entry
        </Button>

        <Card shadow="sm" p="md" mb="md" withBorder bg="#F1FCF0">
          <Group justify="space-between">
            <div>
              <Text size="sm" c="dimmed">
                Total Debit
              </Text>
              <Text fw={700} c="#0A6802">
                Rs. {totalDebit.toLocaleString()}
              </Text>
            </div>
            <div>
              <Text size="sm" c="dimmed">
                Total Credit
              </Text>
              <Text fw={700} c="red">
                Rs. {totalCredit.toLocaleString()}
              </Text>
            </div>
            <div>
              <Text size="sm" c="dimmed">
                Status
              </Text>
              <Text fw={700} c={isBalanced ? "#0A6802" : "orange"}>
                {isBalanced ? "✓ Balanced" : "⚠ Not Balanced"}
              </Text>
            </div>
          </Group>
        </Card>

        <Group justify="flex-end" mt="md">
          <Button type="submit" color="#0A6802" disabled={!isBalanced}>
            Save Voucher
          </Button>
        </Group>
      </Stack>
    </form>
  );
}

export default function JournalVouchers() {
  return <JournalVoucherList />;
}
