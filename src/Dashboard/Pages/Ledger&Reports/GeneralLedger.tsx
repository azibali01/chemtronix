import { useState, useEffect, useCallback, useMemo } from "react";
import { useChartOfAccounts } from "../../Context/ChartOfAccountsContext";
import {
  Card,
  Grid,
  Text,
  Group,
  Table,
  Button,
  Select,
  TextInput,
  Badge,
  Pagination,
  Stack,
  Switch,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";

import {
  IconArrowDownRight,
  IconArrowUpRight,
  IconBook,
  IconFilter,
  IconSearch,
  IconCash,
  IconPrinter,
} from "@tabler/icons-react";

import api, { apiBaseURL } from "../../../api_configuration/api";

function formatLedgerDate(d: Date): string {
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

function fmtMoney(n: number): string {
  return (n || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function isOpeningBalanceRow(entry: {
  reference: string;
  description: string;
}): boolean {
  const d = (entry.description || "").toLowerCase();
  return (
    entry.reference === "—" &&
    (d.includes("opening balance") || d.includes("brought forward"))
  );
}

/** JV line for the table (API + computed running balance) */
interface LedgerEntry {
  dateSort: number;
  date: string;
  account: string;
  type: string;
  reference: string;
  description: string;
  debitAmount: number;
  creditAmount: number;
  runningBalanceRaw: number;
  /** Running balance from server (includes opening B/F when requested). */
  apiRunningBalance?: number;
  /** Value shown in Balance column (set in displayData). */
  displayBalance?: number;
}

/** CoA row for account dropdown + code resolution only */
interface AccountPickRow {
  account: string;
  type: string;
  reference: string;
}

interface GLEntry {
  date: string;
  voucherNumber: string;
  accountNumber?: string;
  accountName?: string;
  accountType?: string;
  description?: string;
  debit: number;
  credit: number;
  runningBalance: number;
}

export default function GeneralLedger() {
  const { accounts } = useChartOfAccounts();
  const [account, setAccount] = useState<string | null>(null);
  const [accountType, setAccountType] = useState<string | null>(null);
  const [fromDate, setFromDate] = useState<Date | null>(null);
  const [toDate, setToDate] = useState<Date | null>(null);
  const [accountOptions, setAccountOptions] = useState<AccountPickRow[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  /** null = initial; after first fetch, always an array (possibly empty) */
  const [backendRows, setBackendRows] = useState<LedgerEntry[] | null>(null);
  /** B/F row from API (optional From date refines the anchor) */
  const [includeOpeningBalance, setIncludeOpeningBalance] = useState(false);

  // Flatten Chart of Accounts for the account dropdown only (not shown as GL rows)
  useEffect(() => {
    if (!accounts || accounts.length === 0) {
      return;
    }

    interface AccountNode {
      accountCode?: string;
      selectedCode?: string;
      accountName?: string;
      children?: AccountNode[];
    }

    const flattenAccounts = (
      accountsList: AccountNode[],
      parentType = "",
    ): AccountPickRow[] => {
      const entries: AccountPickRow[] = [];

      accountsList.forEach((acc) => {
        let type = parentType;
        if (!type) {
          const code = acc.accountCode || acc.selectedCode || "";
          if (code.startsWith("1")) type = "asset";
          else if (code.startsWith("2")) type = "liability";
          else if (code.startsWith("3")) type = "equity";
          else if (code.startsWith("4")) type = "revenue";
          else if (code.startsWith("5")) type = "expense";
          else type = "other";
        }

        entries.push({
          account: acc.accountName || "Unknown Account",
          type,
          reference: acc.accountCode || acc.selectedCode || "N/A",
        });

        if (acc.children && acc.children.length > 0) {
          entries.push(...flattenAccounts(acc.children, type));
        }
      });

      return entries;
    };

    setAccountOptions(flattenAccounts(accounts));
  }, [accounts]);

  /** When "All accounts" + opening + search: scope B/F to matching chart account codes. */
  const openingScopeParam = useMemo(() => {
    if (!includeOpeningBalance || account) return "";
    const t = search.trim();
    if (!t) return "";
    const lower = t.toLowerCase();
    const hits = accountOptions.filter(
      (o) =>
        o.account.toLowerCase().includes(lower) ||
        String(o.reference).toLowerCase().includes(lower),
    );
    const codes = [
      ...new Set(
        hits
          .map((h) => String(h.reference).split("-")[0].trim())
          .filter(Boolean),
      ),
    ];
    return codes.length > 0 ? codes.join(",") : "";
  }, [includeOpeningBalance, account, search, accountOptions]);

  const [activePage, setActivePage] = useState(1);
  const pageSize = 10;

  /** Table only shows journal data from API (never synthetic CoA rows). */
  const baseData = backendRows !== null ? backendRows : [];

  const displayData = useMemo(() => {
    const filtered = baseData.filter((entry) => {
      const entryDate = new Date(entry.dateSort);
      const isBf = isOpeningBalanceRow(entry);

      const matchesSearch =
        search === "" ||
        entry.account.toLowerCase().includes(search.toLowerCase()) ||
        entry.description.toLowerCase().includes(search.toLowerCase()) ||
        entry.reference.toLowerCase().includes(search.toLowerCase());
      const passesSearch =
        matchesSearch || (includeOpeningBalance && isBf);

      const matchesAccount = !account || entry.account === account;
      const matchesType =
        !accountType ||
        (includeOpeningBalance && isBf) ||
        entry.type.toLowerCase() === accountType.toLowerCase();

      const matchesFromDate =
        !fromDate ||
        entryDate >= startOfDay(fromDate) ||
        (includeOpeningBalance && isBf);
      const matchesToDate =
        !toDate || entryDate <= endOfDay(toDate);

      return (
        passesSearch &&
        matchesAccount &&
        matchesType &&
        matchesFromDate &&
        matchesToDate
      );
    });

    const sorted = [...filtered].sort((a, b) => {
      if (a.dateSort !== b.dateSort) return a.dateSort - b.dateSort;
      const aBf = includeOpeningBalance && isOpeningBalanceRow(a);
      const bBf = includeOpeningBalance && isOpeningBalanceRow(b);
      if (aBf && !bBf) return -1;
      if (!aBf && bBf) return 1;
      return 0;
    });

    let running = 0;
    const useApiRunning =
      includeOpeningBalance &&
      !!account &&
      !search.trim() &&
      !accountType;

    return sorted.map((row) => {
      running += row.debitAmount - row.creditAmount;
      const displayBalance =
        useApiRunning && typeof row.apiRunningBalance === "number"
          ? row.apiRunningBalance
          : running;
      return { ...row, runningBalanceRaw: running, displayBalance };
    });
  }, [
    baseData,
    search,
    account,
    accountType,
    fromDate,
    toDate,
    includeOpeningBalance,
  ]);

  const fetchLedger = useCallback(async () => {
    const raw = account
      ? (accountOptions.find((e) => e.account === account)?.reference ??
          account)
      : null;
    const accountCode = raw ? raw.split("-")[0].trim() : "";

    const params = new URLSearchParams();
    if (fromDate) params.set("startDate", fromDate.toISOString().split("T")[0]);
    if (toDate) params.set("endDate", toDate.toISOString().split("T")[0]);
    if (includeOpeningBalance) {
      params.set("includeOpeningBalance", "true");
    }
    if (openingScopeParam) {
      params.set("openingScope", openingScopeParam);
    }

    const endpoint = accountCode
      ? `/reports/general-ledger/${accountCode}?${params.toString()}`
      : `/reports/general-ledger/all?${params.toString()}`;

    setLoading(true);
    setActivePage(1);
    try {
      const { data } = await api.get<GLEntry[]>(endpoint);

      const accountEntryType = account
        ? (accountOptions.find((e) => e.account === account)?.type ?? "other")
        : "other";

      const mapped: LedgerEntry[] = data.map((e) => {
        const d = new Date(e.date);
        const rb =
          typeof e.runningBalance === "number" && !Number.isNaN(e.runningBalance)
            ? e.runningBalance
            : undefined;
        return {
          dateSort: d.getTime(),
          date: formatLedgerDate(d),
          account: account
            ? `${account}`
            : (e.accountName?.trim() || e.accountNumber || "").trim(),
          type: e.accountType ? e.accountType.toLowerCase() : accountEntryType,
          reference: e.voucherNumber ?? "",
          description: e.description ?? "",
          debitAmount: Number(e.debit) || 0,
          creditAmount: Number(e.credit) || 0,
          runningBalanceRaw: 0,
          apiRunningBalance: rb,
        };
      });

      setBackendRows(mapped);
    } catch {
      setBackendRows([]);
      notifications.show({
        title: "Error",
        message: "Failed to fetch ledger entries from the server.",
        color: "red",
      });
    } finally {
      setLoading(false);
    }
  }, [
    account,
    fromDate,
    toDate,
    accountOptions,
    includeOpeningBalance,
    openingScopeParam,
  ]);

  // Auto-fetch on mount and whenever account or date filters change
  useEffect(() => {
    fetchLedger();
  }, [fetchLedger]);

  const totalPages = Math.max(1, Math.ceil(displayData.length / pageSize));
  useEffect(() => {
    if (activePage > totalPages) setActivePage(totalPages);
  }, [activePage, totalPages]);

  const startIndex = (activePage - 1) * pageSize;
  const paginatedData = displayData.slice(startIndex, startIndex + pageSize);

  const totalDebits = displayData.reduce((sum, e) => sum + e.debitAmount, 0);
  const totalCredits = displayData.reduce((sum, e) => sum + e.creditAmount, 0);
  const netBalance = totalDebits - totalCredits;
  const endingRunning =
    displayData.length > 0
      ? (displayData[displayData.length - 1]!.displayBalance ??
        displayData[displayData.length - 1]!.runningBalanceRaw)
      : 0;

  const printLedgerPdf = () => {
    const selectedCode = account
      ? accountOptions.find((e) => e.account === account)?.reference
      : undefined;

    if (!selectedCode) {
      notifications.show({
        title: "Select an Account",
        message:
          "Please select an account from the filter to generate the ledger PDF.",
        color: "yellow",
      });
      return;
    }

    const params = new URLSearchParams();
    if (fromDate) params.set("startDate", fromDate.toISOString().split("T")[0]);
    if (toDate) params.set("endDate", toDate.toISOString().split("T")[0]);
    if (includeOpeningBalance) {
      params.set("includeOpeningBalance", "true");
    }

    // Attach token + brand so the backend can authorise a plain browser navigation
    const token = localStorage.getItem("access_token") ?? "";
    const brand = localStorage.getItem("brand") ?? "chemtronics";
    params.set("token", token);
    params.set("brand", brand);

    const url = `${apiBaseURL}/reports/general-ledger/${selectedCode}/pdf?${params.toString()}`;
    window.open(url, "_blank");
  };
  return (
    <div>
      <Group justify="space-between" mb="lg">
        <Stack gap={0}>
          <Text size="xl" fw={700} mb="md">
            General Ledger
          </Text>
          <Text size="sm" c="dimmed" mb="lg">
            Complete record of all financial transactions
          </Text>
        </Stack>
        <Group gap="xs">
          <Button
            variant="outline"
            color="#000080"
            leftSection={<IconPrinter size={16} />}
            onClick={printLedgerPdf}
          >
            Print Ledger PDF
          </Button>
        </Group>
      </Group>

      <Grid mb="lg">
        <Grid.Col span={3}>
          <Card shadow="sm" p="lg" radius="md" withBorder bg="#F1FCF0">
            <Group>
              <IconArrowDownRight size={30} color="green" />
              <div>
                <Text size="sm">Total Debits</Text>
                <Text fw={700} size="lg">
                  Rs.{" "}
                  {totalDebits.toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </Text>
              </div>
            </Group>
          </Card>
        </Grid.Col>
        <Grid.Col span={3}>
          <Card shadow="sm" p="lg" radius="md" withBorder bg="#F1FCF0">
            <Group>
              <IconArrowUpRight size={30} color="red" />
              <div>
                <Text size="sm">Total Credits</Text>
                <Text fw={700} size="lg">
                  Rs.{" "}
                  {totalCredits.toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </Text>
              </div>
            </Group>
          </Card>
        </Grid.Col>
        <Grid.Col span={3}>
          <Card shadow="sm" p="lg" radius="md" withBorder bg="#F1FCF0">
            <Group>
              <IconCash size={30} color={netBalance >= 0 ? "blue" : "red"} />
              <div>
                <Text size="sm">
                  {netBalance >= 0 ? "Debit Balance" : "Credit Balance"}
                </Text>
                <Text
                  fw={700}
                  size="lg"
                  c={netBalance >= 0 ? "#0A6802" : "red"}
                >
                  Rs.{" "}
                  {Math.abs(netBalance).toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </Text>
                {account && displayData.length > 0 && (
                  <Text size="xs" c="dimmed" mt={4}>
                    Closing (running): {fmtMoney(Math.abs(endingRunning))}{" "}
                    {endingRunning >= 0 ? "Dr" : "Cr"}
                  </Text>
                )}
                {!account && (
                  <Text size="xs" c="dimmed" mt={4}>
                    Select a specific account for a single-account ledger view.
                  </Text>
                )}
              </div>
            </Group>
          </Card>
        </Grid.Col>
        <Grid.Col span={3}>
          <Card shadow="sm" p="lg" radius="md" withBorder bg="#F1FCF0">
            <Group>
              <IconBook size={30} />
              <div>
                <Text size="sm">Total Entries</Text>
                <Text fw={700} size="lg">
                  {displayData.length}
                </Text>
              </div>
            </Group>
          </Card>
        </Grid.Col>
      </Grid>

      <Card shadow="sm" p="lg" radius="md" withBorder mb="lg" bg="#F1FCF0">
        <Stack gap="sm" mb="md">
          <Switch
            label="Include opening balance (brought forward)"
            description={
              fromDate
                ? account
                  ? "Net activity before the From date, then period lines."
                  : "Net of all lines before the From date, then period lines."
                : account
                  ? "No From date: opening is net activity before the first day that appears in the list (for the current filters)."
                  : "No From date: opening is before the first listed day. With All accounts, typing in Search limits the opening line to chart accounts that match the search."
            }
            checked={includeOpeningBalance}
            onChange={(e) =>
              setIncludeOpeningBalance(e.currentTarget.checked)
            }
            color="#0A6802"
          />
        </Stack>
        <Group grow>
          <TextInput
            placeholder="Search accounts..."
            leftSection={<IconSearch size={16} />}
            value={search}
            onChange={(e) => setSearch(e.currentTarget.value)}
          />
          <Select
            placeholder="All Accounts"
            data={[...new Set(accountOptions.map((d) => d.account))]}
            value={account}
            onChange={setAccount}
            clearable
          />
          <Select
            placeholder="All Types"
            data={["asset", "revenue", "expense", "liability"]}
            value={accountType}
            onChange={setAccountType}
            clearable
          />
          <TextInput
            type="date"
            placeholder="From Date"
            value={fromDate ? fromDate.toISOString().split("T")[0] : ""}
            onChange={(e) =>
              setFromDate(
                e.currentTarget.value ? new Date(e.currentTarget.value) : null,
              )
            }
          />
          <TextInput
            type="date"
            placeholder="To Date"
            value={toDate ? toDate.toISOString().split("T")[0] : ""}
            onChange={(e) =>
              setToDate(
                e.currentTarget.value ? new Date(e.currentTarget.value) : null,
              )
            }
          />
          <Button
            color="#0A6802"
            leftSection={<IconFilter size={16} />}
            onClick={fetchLedger}
            loading={loading}
          >
            Apply Filter
          </Button>
        </Group>
      </Card>

      <Card shadow="sm" p="lg" radius="md" withBorder bg="#F1FCF0">
        <Text fw={600} mb="md">
          Ledger Entries
        </Text>
        {loading ? (
          <Text c="dimmed" style={{ textAlign: "center", padding: "2rem 0" }}>
            Loading...
          </Text>
        ) : (
          <Table highlightOnHover withTableBorder withColumnBorders>
            <Table.Thead>
              <Table.Tr style={{ background: "#E8EEF9" }}>
                <Table.Th>Date</Table.Th>
                {!account && <Table.Th>Account</Table.Th>}
                {!account && <Table.Th>Type</Table.Th>}
                <Table.Th>Vch No</Table.Th>
                <Table.Th>Narration</Table.Th>
                <Table.Th style={{ textAlign: "right" }}>Debit</Table.Th>
                <Table.Th style={{ textAlign: "right" }}>Credit</Table.Th>
                <Table.Th style={{ textAlign: "right" }}>Balance</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {paginatedData.map((entry, index) => {
                const t = (entry.type || "").toLowerCase();
                const colorMap: Record<string, string> = {
                  asset: "blue",
                  revenue: "green",
                  expense: "orange",
                  liability: "red",
                  equity: "violet",
                };
                const rb =
                  entry.displayBalance ?? entry.runningBalanceRaw;
                const balLabel = `${fmtMoney(Math.abs(rb))} ${rb >= 0 ? "Dr" : "Cr"}`;
                return (
                  <Table.Tr key={`${entry.dateSort}-${entry.reference}-${index}`}>
                    <Table.Td>{entry.date}</Table.Td>
                    {!account && <Table.Td>{entry.account}</Table.Td>}
                    {!account && (
                      <Table.Td>
                        <Badge color={colorMap[t] ?? "gray"}>
                          {(entry.type || "OTHER").toUpperCase()}
                        </Badge>
                      </Table.Td>
                    )}
                    <Table.Td>{entry.reference}</Table.Td>
                    <Table.Td maw={360}>
                      <Text size="sm" style={{ whiteSpace: "pre-wrap" }}>
                        {entry.description}
                      </Text>
                    </Table.Td>
                    <Table.Td c="#0A6802" style={{ textAlign: "right" }}>
                      {entry.debitAmount > 0
                        ? `Rs. ${fmtMoney(entry.debitAmount)}`
                        : ""}
                    </Table.Td>
                    <Table.Td c="red" style={{ textAlign: "right" }}>
                      {entry.creditAmount > 0
                        ? `Rs. ${fmtMoney(entry.creditAmount)}`
                        : ""}
                    </Table.Td>
                    <Table.Td fw={600} style={{ textAlign: "right" }}>
                      {balLabel}
                    </Table.Td>
                  </Table.Tr>
                );
              })}
              {paginatedData.length === 0 && (
                <Table.Tr>
                  <Table.Td
                    colSpan={account ? 5 : 7}
                    style={{ textAlign: "center" }}
                  >
                    No journal entries match the current filters.
                  </Table.Td>
                </Table.Tr>
              )}
            </Table.Tbody>
          </Table>
        )}
        {displayData.length > 0 && !loading && (
          <Group
            justify="space-between"
            mt="md"
            p="sm"
            style={{
              background: "#000080",
              borderRadius: 8,
              color: "#fff",
            }}
            wrap="nowrap"
          >
            <Text fw={700} c="#fff" size="sm">
              Grand total (all filtered rows)
            </Text>
            <Group gap="xl" wrap="nowrap">
              <Text fw={700} c="#fff" size="sm">
                Debit: Rs. {fmtMoney(totalDebits)}
              </Text>
              <Text fw={700} c="#fff" size="sm">
                Credit: Rs. {fmtMoney(totalCredits)}
              </Text>
              <Text fw={700} c="#fff" size="sm">
                Balance: {fmtMoney(Math.abs(endingRunning))}{" "}
                {endingRunning >= 0 ? "Dr" : "Cr"}
              </Text>
            </Group>
          </Group>
        )}
        {displayData.length > 0 ? (
          <Group justify="center" mt="md">
            <Pagination
              color="#0A6802"
              total={totalPages}
              value={activePage}
              onChange={setActivePage}
            />
          </Group>
        ) : null}
      </Card>
    </div>
  );
}
