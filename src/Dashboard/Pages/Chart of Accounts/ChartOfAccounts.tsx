// Receivable accounts utility moved to utils/receivableAccounts.ts
import { useState, useEffect } from "react";
import {
  Button,
  Card,
  Group,
  Modal,
  Stack,
  Text,
  TextInput,
  Select,
  Divider,
  ActionIcon,
  Pagination,
  Tooltip,
  Loader,
  Tabs,
} from "@mantine/core";
import {
  IconEdit,
  IconTrash,
  IconBuildingBank,
  IconCreditCard,
  IconUsers,
  IconChartBar,
  IconCurrencyDollar,
} from "@tabler/icons-react";
// Tree view component for hierarchy
import type { AccountNode } from "../../Context/ChartOfAccountsContext";
import { useChartOfAccounts } from "../../Context/ChartOfAccountsContext";
import type { JSX } from "react/jsx-runtime";
import api from "../../../api_configuration/api";

function ChartOfAccounts() {
  const { accounts, setAccounts } = useChartOfAccounts();
  // Tree view expand/collapse logic
  const PAGE_SIZE = 15;
  const [tab, setTab] = useState<string>("assets");
  const [opened, setOpened] = useState(false);
  const [page, setPage] = useState(1);
  const [selectedCode, setSelectedCode] = useState("");
  const [accountCode, setAccountCode] = useState("");
  const [accountName, setAccountName] = useState("");
  const [accountType, setAccountType] = useState<AccountType | null>(null);
  const [parentAccount, setParentAccount] = useState<string>("");
  const [type, setType] = useState<AccountGroupType>("Group");
  const [isParty, setIsParty] = useState(false);
  const [address, setAddress] = useState("");
  const [phoneNo, setPhoneNo] = useState("");
  const [strn, setStrn] = useState("");
  const [ntn, setNtn] = useState("");
  const [editing, setEditing] = useState<AccountNode | null>(null);
  const [search, setSearch] = useState("");
  const [filterParent, setFilterParent] = useState<string>("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [selectedAccountType1, setSelectedAccountType1] = useState<string>("");
  const [selectedAccountType2, setSelectedAccountType2] = useState<string>("");
  const [formError, setFormError] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const equityAccountTypeOptions = [
    { value: "Share Capital", label: "Share Capital" },
  ];
  const autoLevel = selectedAccountType2
    ? "Level 2"
    : selectedAccountType1
      ? "Level 1"
      : parentAccount
        ? "Parent"
        : "General";
  const autoIsParty = ["1410", "2210"].includes(selectedAccountType2);
  const autoType: AccountGroupType = editing ? type : "Group";

  const parentOptions = [
    { value: "1000", label: "1000 - Assets" },
    { value: "2000", label: "2000 - Liabilities" },
    { value: "3000", label: "3000 - Equity" },
    { value: "4000", label: "4000 - Revenue" },
    { value: "5000", label: "5000 - Expenses" },
  ];

  const handleCreateOrUpdate = async () => {
    setFormError("");
    if (!accountName.trim()) {
      setFormError("Account Name is required.");
      return;
    }
    if (!accountCode.trim()) {
      setFormError("Account Code is required.");
      return;
    }
    const duplicateCode = accounts.some(
      (acc: any) =>
        acc.accountCode === accountCode &&
        (!editing || acc.selectedCode !== editing.selectedCode),
    );
    if (duplicateCode) {
      setFormError("Account Code already exists. Please choose another.");
      return;
    }
    const duplicateName = accounts.some(
      (acc: any) =>
        acc.accountName.trim().toLowerCase() ===
          accountName.trim().toLowerCase() &&
        (!editing || acc.selectedCode !== editing.selectedCode),
    );
    if (duplicateName) {
      setFormError("Account Name already exists. Please choose another.");
      return;
    }
    setLoading(true);
    let resolvedAccountType: AccountType | null = accountType;
    if (
      [
        "1000",
        "1100",
        "1200",
        "1300",
        "1400",
        "1500",
        "1110",
        "1120",
        "1130",
        "1410",
        "1510",
        "1121",
      ].includes(parentAccount) ||
      selectedAccountType1?.startsWith("1")
    ) {
      resolvedAccountType = "Asset";
    } else if (
      ["2000", "2100", "2200", "2300", "2400", "2500", "2210", "2220"].includes(
        parentAccount,
      ) ||
      selectedAccountType1?.startsWith("2")
    ) {
      resolvedAccountType = "Liability";
    } else if (
      ["3000"].includes(parentAccount) ||
      selectedAccountType1 === "Share Capital"
    ) {
      resolvedAccountType = "Equity";
    } else if (
      ["4000", "4100", "4110"].includes(parentAccount) ||
      selectedAccountType1?.startsWith("4")
    ) {
      resolvedAccountType = "Revenue";
    } else if (
      [
        "5000",
        "5100",
        "5200",
        "5300",
        "5400",
        "5110",
        "5120",
        "5130",
        "5140",
        "5210",
        "5220",
        "5310",
        "5320",
        "5410",
      ].includes(parentAccount) ||
      selectedAccountType1?.startsWith("5")
    ) {
      resolvedAccountType = "Expense";
    }
    const payload = {
      selectedCode,
      selectedAccountType1,
      selectedAccountType2,
      accountCode,
      level: autoLevel,
      accountName,
      accountType: resolvedAccountType,
      parentAccount,
      type: autoType,
      isParty: editing ? isParty : autoIsParty,
      address,
      phoneNo,
      strn,
      ntn,
    };
    try {
      if (editing && editing._id) {
        await api.put(`/chart-of-account/${editing._id}`, payload);
      } else {
        await api.post("/chart-of-account", payload);
      }
      await fetchAccounts(setAccounts);
      if (!editing) {
        setSelectedCode("");
        setAccountCode("");
        setAccountName("");
        setAccountType(null);
        setParentAccount("");
        setType("Group");
        setIsParty(false);
        setAddress("");
        setPhoneNo("");
        setStrn("");
        setNtn("");
        setSelectedAccountType1("");
        setSelectedAccountType2("");
      }
      setEditing(null);
      setOpened(false);
    } catch (err) {
      setFormError("Failed to create or update account. Please try again.");
      console.error("Failed to create/update account", err);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (acc: AccountNode) => {
    setEditing(acc);
    setAccountCode(acc.accountCode);
    setSelectedCode(acc.selectedCode);
    setAccountName(acc.accountName);
    const validAccountTypes: AccountType[] = [
      "Asset",
      "Liability",
      "Equity",
      "Revenue",
      "Expense",
    ];
    setAccountType(
      validAccountTypes.includes(acc.accountType as AccountType)
        ? (acc.accountType as AccountType)
        : null,
    );
    if (["1000", "2000", "3000", "4000", "5000"].includes(acc.selectedCode)) {
      setParentAccount(acc.selectedCode);
    } else {
      setParentAccount(acc.parentAccount);
    }
    setType(acc.type);
    setIsParty(acc.isParty);
    setAddress(acc.address || "");
    setPhoneNo(acc.phoneNo || "");
    setStrn(acc.strn || "");
    setNtn(acc.ntn || "");
    setOpened(true);
  };

  const handleDelete = (_id: string) => {
    setDeleteId(_id);
  };
  const confirmDelete = async () => {
    if (deleteId) {
      try {
        await api.delete(`/chart-of-account/${deleteId}`);
        await fetchAccounts(setAccounts);
      } catch (err) {
        alert("Failed to delete account. Please try again.");
        console.error("Failed to delete account", err);
      }
    }
    setDeleteId(null);
  };

  // Tab-based filtering
  const tabParentCodes: Record<string, string> = {
    assets: "1000",
    liability: "2000",
    equity: "3000",
    revenue: "4000",
    expenses: "5000",
  };
  const currentParentCode = tabParentCodes[tab];
  let filteredAccounts = accounts.filter(
    (acc: any) =>
      acc.selectedCode === currentParentCode ||
      acc.parentAccount?.split("-")[0] === currentParentCode,
  );
  if (search.trim() !== "") {
    const searchLower = search.trim().toLowerCase();
    filteredAccounts = filteredAccounts.filter(
      (acc: any) =>
        acc.accountName && acc.accountName.toLowerCase().includes(searchLower),
    );
  }
  if (filterParent) {
    filteredAccounts = filteredAccounts.filter((acc: any) => {
      if (!acc.parentAccount) return false;
      const parentCode = acc.parentAccount.split("-")[0];
      return parentCode === filterParent;
    });
  }
  const totalPages = Math.ceil(filteredAccounts.length / PAGE_SIZE) || 1;
  const paginatedAccounts = filteredAccounts.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE,
  );

  useEffect(() => {
    if (
      (!selectedAccountType1 || selectedAccountType1 === "") &&
      (!selectedAccountType2 || selectedAccountType2 === "")
    ) {
      setAccountCode("");
      return;
    }
    let codePrefix = "";
    if (selectedAccountType2) {
      codePrefix = selectedAccountType2.split("-")[0];
    } else if (selectedAccountType1) {
      codePrefix = selectedAccountType1.split("-")[0];
    }
    const siblings = accounts.filter((acc: any) => {
      if (!acc.accountCode) return false;
      return acc.accountCode.startsWith(codePrefix);
    });
    const usedSuffixes = new Set(
      siblings
        .map((acc: any) => {
          const code = acc.accountCode;
          const suffix = code.slice(codePrefix.length);
          const parsed = parseInt(suffix, 10);
          return !isNaN(parsed) && parsed > 0 ? parsed : null;
        })
        .filter((v: any) => v !== null),
    );
    let nextSuffix = 1;
    while (usedSuffixes.has(nextSuffix)) {
      nextSuffix++;
    }
    setAccountCode(codePrefix + String(nextSuffix));
  }, [selectedAccountType1, selectedAccountType2, accounts]);

  useEffect(() => {
    setPage(1);
  }, [search, filterParent]);

  const assetCount = countAccountsByParentCode(accounts, "1000");
  const liabilityCount = countAccountsByParentCode(accounts, "2000");
  const equityCount = countAccountsByParentCode(accounts, "3000");
  const revenueCount = countAccountsByParentCode(accounts, "4000");
  const expenseCount = countAccountsByParentCode(accounts, "5000");

  return (
    <div className="p-6">
      <Group justify="space-between" mb="lg">
        <Text size="xl" fw={600}>
          Chart of Accounts
        </Text>
        <Button
          color="#0A6802"
          onClick={() => {
            setEditing(null);
            setSelectedCode("");
            let maxCode = 0;
            accounts.forEach((acc: any) => {
              const codeNum = parseInt(acc.accountCode, 10);
              if (!isNaN(codeNum) && codeNum > maxCode) maxCode = codeNum;
            });
            setAccountCode(maxCode ? String(maxCode + 1) : "1001");
            setAccountName("");
            setAccountType(null);
            setParentAccount("");
            setType("Group");
            setIsParty(false);
            setAddress("");
            setPhoneNo("");
            setStrn("");
            setNtn("");
            setSelectedAccountType1("");
            setSelectedAccountType2("");
            setOpened(true);
          }}
        >
          + Add Account
        </Button>
      </Group>
      <Group grow mb="xl">
        <Card withBorder padding="lg">
          <Group justify="space-between">
            <Stack gap={2}>
              <Text fw={600}>Assets</Text>
              <Text size="xl" fw={700}>
                {assetCount} Accounts
              </Text>
            </Stack>
            <IconBuildingBank size={32} color="blue" />
          </Group>
        </Card>
        <Card withBorder padding="lg">
          <Group justify="space-between">
            <Stack gap={2}>
              <Text fw={600}>Liabilities</Text>
              <Text size="xl" fw={700}>
                {liabilityCount} Accounts
              </Text>
            </Stack>
            <IconCreditCard size={32} color="red" />
          </Group>
        </Card>
        <Card withBorder padding="lg">
          <Group justify="space-between">
            <Stack gap={2}>
              <Text fw={600}>Equity</Text>
              <Text size="xl" fw={700}>
                {equityCount} Accounts
              </Text>
            </Stack>
            <IconUsers size={32} color="#0A6802" />
          </Group>
        </Card>
        <Card withBorder padding="lg">
          <Group justify="space-between">
            <Stack gap={2}>
              <Text fw={600}>Revenue</Text>
              <Text size="xl" fw={700}>
                {revenueCount} Accounts
              </Text>
            </Stack>
            <IconChartBar size={32} color="teal" />
          </Group>
        </Card>
        <Card withBorder padding="lg">
          <Group justify="space-between">
            <Stack gap={2}>
              <Text fw={600}>Expenses</Text>
              <Text size="xl" fw={700}>
                {expenseCount} Accounts
              </Text>
            </Stack>
            <IconCurrencyDollar size={32} color="orange" />
          </Group>
        </Card>
      </Group>
      <Card withBorder padding="lg">
        <Stack>
          <Text fw={600}>Account Structure</Text>
          <Tabs
            value={tab}
            onChange={(value) => setTab(value || "assets")}
            mb="md"
          >
            <Tabs.List>
              <Tabs.Tab value="assets">Assets</Tabs.Tab>
              <Tabs.Tab value="liability">Liability</Tabs.Tab>
              <Tabs.Tab value="equity">Equity</Tabs.Tab>
              <Tabs.Tab value="revenue">Revenue</Tabs.Tab>
              <Tabs.Tab value="expenses">Expenses</Tabs.Tab>
            </Tabs.List>
          </Tabs>
          <Group grow mt="sm">
            <TextInput
              label="Search"
              placeholder="Search by name or code..."
              value={search}
              onChange={(e) => setSearch(e.currentTarget.value)}
            />
            <Select
              placeholder="Filter by Parent Account"
              label="Filter by Parent Account"
              data={parentOptions}
              value={filterParent}
              onChange={(v) => setFilterParent(v || "")}
              clearable
            />
          </Group>
          <Divider />
          {renderAccountsTable(
            paginatedAccounts,
            accounts,
            handleEdit,
            handleDelete,
          )}
          <Group justify="center" mt="md">
            <Pagination
              value={page}
              onChange={setPage}
              total={totalPages}
              size="md"
              radius="xl"
              color="#0A6802"
              disabled={totalPages <= 1}
            />
          </Group>
        </Stack>
      </Card>
      <Modal
        opened={opened}
        onClose={() => setOpened(false)}
        title={
          editing ? (
            <strong>Edit Account</strong>
          ) : (
            <strong>Add New Account</strong>
          )
        }
        centered
        size="lg"
      >
        <Stack>
          {formError && (
            <Text c="red" fw={600} mb={-10} mt={-5}>
              {formError}
            </Text>
          )}
          <Group grow>
            <TextInput
              label="Selected Code"
              placeholder="Selected Code"
              value={selectedCode}
              onChange={(e) => setSelectedCode(e.currentTarget.value)}
              disabled={!!editing}
            />
            <TextInput
              label="Account Code"
              placeholder="Account Code"
              value={accountCode}
              onChange={(e) => setAccountCode(e.currentTarget.value)}
              disabled={!!editing}
            />
          </Group>
          <Group grow>
            <Select
              label="Parent Account"
              placeholder="Select parent account"
              data={parentOptions}
              value={parentAccount}
              onChange={(v) => {
                if (
                  v === "1000" ||
                  v === "2000" ||
                  v === "3000" ||
                  v === "4000" ||
                  v === "5000"
                ) {
                  setSelectedCode(v);
                  setParentAccount(v);
                } else {
                  setParentAccount(v || "");
                }
              }}
              clearable
            />
            {!["1000", "2000", "3000", "4000", "5000"].includes(
              parentAccount,
            ) && (
              <Select
                label="Account Type"
                placeholder="Select account type"
                data={[]}
                value={accountType as string}
                onChange={(v) => setAccountType(v as AccountType)}
                disabled
              />
            )}
          </Group>
          <Group grow>
            {/* --- Main Parent: ASSETS --- */}
            {parentAccount === "1000" && (
              <>
                <Select
                  label="Account Type (Level 1)"
                  placeholder="Select account type"
                  data={[
                    { value: "1100", label: "1100 - Current Assets" },
                    { value: "1200", label: "1200 - Fixed Assets" },
                    { value: "1300", label: "1300 - Inventories" },
                    { value: "1400", label: "1400 - Receivables" },
                    { value: "1500", label: "1500 - Advances & Commissions" },
                  ]}
                  value={selectedAccountType1}
                  onChange={(v) => {
                    setSelectedAccountType1(v || "");
                    setSelectedAccountType2("");
                  }}
                  clearable
                />
                {selectedAccountType1 === "1100" && (
                  <Select
                    label="Account Type (Level 2)"
                    placeholder="Select subaccount of Current Assets"
                    data={[
                      { value: "1110", label: "1110 - Cash" },
                      { value: "1120", label: "1120 - Bank Accounts" },
                      { value: "1130", label: "1130 - Other Current Assets" },
                    ]}
                    value={selectedAccountType2}
                    onChange={(v) => setSelectedAccountType2(v || "")}
                    clearable
                  />
                )}
                {selectedAccountType1 === "1400" && (
                  <Select
                    label="Account Type (Level 2)"
                    placeholder="Select subaccount of Receivables"
                    data={[
                      { value: "1410", label: "1410 - Receivables Accounts" },
                    ]}
                    value={selectedAccountType2}
                    onChange={(v) => setSelectedAccountType2(v || "")}
                    clearable
                  />
                )}
                {selectedAccountType1 === "1500" && (
                  <Select
                    label="Account Type (Level 2)"
                    placeholder="Select subaccount of Advances & Commissions"
                    data={[
                      { value: "1510", label: "1510 - Salesman Account" },
                      { value: "1520", label: "1520 - Staff Account" },
                    ]}
                    value={selectedAccountType2}
                    onChange={(v) => setSelectedAccountType2(v || "")}
                    clearable
                  />
                )}
              </>
            )}
            {/* --- Main Parent: LIABILITIES --- */}
            {parentAccount === "2000" && (
              <>
                <Select
                  label="Account Type (Level 1)"
                  placeholder="Select account type"
                  data={[
                    { value: "2100", label: "2100 - Captial" },
                    { value: "2200", label: "2200 - Current Liabilities" },
                    { value: "2300", label: "2300 - Other" },
                    { value: "2400", label: "2400 - Salesman Account" },
                    { value: "2500", label: "2500 - Bismillah" },
                  ]}
                  value={selectedAccountType1}
                  onChange={(v) => {
                    setSelectedAccountType1(v || "");
                    setSelectedAccountType2("");
                  }}
                  clearable
                />
                {selectedAccountType1 === "2200" && (
                  <Select
                    label="Account Type (Level 2)"
                    placeholder="Select subaccount of Current Liabilities"
                    data={[
                      { value: "2210", label: "2210 - Purchase Party" },
                      { value: "2220", label: "2220 - Advance Exp." },
                      { value: "2230", label: "2230 - Loan" },
                    ]}
                    value={selectedAccountType2}
                    onChange={(v) => setSelectedAccountType2(v || "")}
                    clearable
                  />
                )}
              </>
            )}
            {/* --- Main Parent: EQUITY --- */}
            {parentAccount === "3000" && (
              <Select
                label="Account Type"
                placeholder="Select account type"
                data={equityAccountTypeOptions}
                value={selectedAccountType1}
                onChange={(v) => setSelectedAccountType1(v || "")}
                clearable
              />
            )}
            {/* --- Main Parent: REVENUE --- */}
            {parentAccount === "4000" && (
              <>
                <Select
                  label="Account Type (Level 1)"
                  placeholder="Select account type"
                  data={[
                    { value: "4100", label: "4100 - Sales Control Account" },
                  ]}
                  value={selectedAccountType1}
                  onChange={(v) => {
                    setSelectedAccountType1(v || "");
                    setSelectedAccountType2("");
                  }}
                  clearable
                />
                {selectedAccountType1 === "4100" && (
                  <Select
                    label="Account Type (Level 2)"
                    placeholder="Select subaccount of Sales Control Account"
                    data={[{ value: "4110", label: "4110 - Sales" }]}
                    value={selectedAccountType2}
                    onChange={(v) => setSelectedAccountType2(v || "")}
                    clearable
                  />
                )}
              </>
            )}
            {/* --- Main Parent: EXPENSES --- */}
            {parentAccount === "5000" && (
              <>
                <Select
                  label="Account Type (Level 1)"
                  placeholder="Select account type"
                  data={[
                    { value: "5100", label: "5100 - Administrative Expenses" },
                    { value: "5200", label: "5200 - Selling Expenses" },
                    { value: "5300", label: "5300 - Financial Charges" },
                    { value: "5400", label: "5400 - Other Charges" },
                  ]}
                  value={selectedAccountType1}
                  onChange={(v) => {
                    setSelectedAccountType1(v || "");
                    setSelectedAccountType2("");
                  }}
                  clearable
                />
                {selectedAccountType1 === "5100" && (
                  <Select
                    label="Account Type (Level 2)"
                    placeholder="Select subaccount of Administrative Expenses"
                    data={[
                      { value: "5110", label: "5110 - Salaries" },
                      { value: "5120", label: "5120 - Rent" },
                      { value: "5130", label: "5130 - Utilities" },
                      { value: "5140", label: "5140 - Depreciation" },
                    ]}
                    value={selectedAccountType2}
                    onChange={(v) => setSelectedAccountType2(v || "")}
                    clearable
                  />
                )}
                {selectedAccountType1 === "5200" && (
                  <Select
                    label="Account Type (Level 2)"
                    placeholder="Select subaccount of Selling Expenses"
                    data={[
                      { value: "5210", label: "5210 - Advertising" },
                      { value: "5220", label: "5220 - Sales Commission" },
                    ]}
                    value={selectedAccountType2}
                    onChange={(v) => setSelectedAccountType2(v || "")}
                    clearable
                  />
                )}
                {selectedAccountType1 === "5300" && (
                  <Select
                    label="Account Type (Level 2)"
                    placeholder="Select subaccount of Financial Charges"
                    data={[
                      { value: "5310", label: "5310 - Bank Charges" },
                      { value: "5320", label: "5320 - Interest Expense" },
                    ]}
                    value={selectedAccountType2}
                    onChange={(v) => setSelectedAccountType2(v || "")}
                    clearable
                  />
                )}
                {selectedAccountType1 === "5400" && (
                  <Select
                    label="Account Type (Level 2)"
                    placeholder="Select subaccount of Other Charges"
                    data={[{ value: "5410", label: "5410 - Miscellaneous" }]}
                    value={selectedAccountType2}
                    onChange={(v) => setSelectedAccountType2(v || "")}
                    clearable
                  />
                )}
              </>
            )}
          </Group>
          <Group grow>
            <TextInput
              label="Account Name"
              placeholder="Account Name"
              value={accountName}
              onChange={(e) => setAccountName(e.currentTarget.value)}
            />
          </Group>
          <Group grow>
            <TextInput
              label="Address"
              placeholder="Address"
              value={address}
              onChange={(e) => setAddress(e.currentTarget.value)}
            />
            <TextInput
              label="Phone No"
              placeholder="Phone No"
              value={phoneNo}
              onChange={(e) => setPhoneNo(e.currentTarget.value)}
              type="number"
            />
          </Group>
          <Group grow>
            <TextInput
              label="STRN"
              placeholder="STRN"
              value={strn}
              onChange={(e) => setStrn(e.currentTarget.value)}
              type="number"
            />
            <TextInput
              label="NTN"
              placeholder="NTN"
              value={ntn}
              onChange={(e) => setNtn(e.currentTarget.value)}
              type="number"
            />
          </Group>
          <Group justify="flex-end" mt="md">
            <Tooltip
              label={
                formError ||
                (!accountName || !accountCode
                  ? "Fill all required fields"
                  : "") ||
                undefined
              }
              disabled={!formError && !!accountName && !!accountCode}
            >
              <Button
                color="#0A6802"
                onClick={handleCreateOrUpdate}
                disabled={
                  loading || !accountName || !accountCode || !!formError
                }
                leftSection={
                  loading ? <Loader size={18} color="white" /> : null
                }
              >
                {editing ? "Update Account" : "Create Account"}
              </Button>
            </Tooltip>
          </Group>
        </Stack>
      </Modal>
      <Modal
        opened={!!deleteId}
        onClose={() => setDeleteId(null)}
        title={<strong>Delete Account</strong>}
        centered
      >
        <Text mb="md">Are you sure you want to delete this account?</Text>
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

type AccountType = "Asset" | "Liability" | "Equity" | "Revenue" | "Expense";
type AccountGroupType = "Group" | "Detail";
type FlattenedAccount = {
  acc: AccountNode;
  parent: string | null;
  subaccount: string | null;
  path: string;
};

function flattenAccounts(
  accounts: AccountNode[],
  allAccounts: AccountNode[],
): FlattenedAccount[] {
  const result: FlattenedAccount[] = [];
  function walk(nodes: AccountNode[]) {
    for (const acc of nodes) {
      let parent = null;
      if (acc.parentAccount) {
        const parts = acc.parentAccount.split("-");
        if (parts.length > 1) {
          parent = parts.slice(1).join("-");
        }
      }
      let subaccount = null;
      if (acc.children && acc.children.length > 0) {
        subaccount = acc.children.map((child) => child.accountName).join(", ");
      }
      const path = getAccountPath(allAccounts, acc.selectedCode);
      result.push({ acc, parent, subaccount, path });
      if (acc.children) walk(acc.children);
    }
  }
  walk(accounts);
  return result;
}

function getAccountPath(accounts: AccountNode[], code: string): string {
  let result: string[] = [];
  function dfs(nodes: AccountNode[], target: string, curr: string[]): boolean {
    for (const acc of nodes) {
      const next = [...curr, acc.accountName];
      if (acc.selectedCode === target) {
        result = next;
        return true;
      }
      if (acc.children && dfs(acc.children, target, next)) return true;
    }
    return false;
  }
  dfs(accounts, code, []);
  return result.length > 0 ? result.join(" > ") : "";
}

function countAccountsByParentCode(
  accounts: AccountNode[],
  parentCode: string,
): number {
  let count = 0;
  function walk(nodes: AccountNode[]) {
    for (const acc of nodes) {
      if (
        acc.parentAccount &&
        acc.parentAccount.split("-")[0].trim() === parentCode
      ) {
        count++;
      }
      if (acc.children) walk(acc.children);
    }
  }
  walk(accounts);
  return count;
}

async function fetchAccounts(setAccounts: (accs: AccountNode[]) => void) {
  try {
    const res = await api.get("/chart-of-account");
    if (Array.isArray(res.data)) {
      setAccounts(res.data);
    }
  } catch (err) {
    console.error("Failed to fetch accounts", err);
  }
}

function renderAccountsTable(
  accounts: AccountNode[],
  allAccounts: AccountNode[],
  onEdit: (acc: AccountNode) => void,
  onDelete: (code: string) => void,
): JSX.Element {
  const flat = flattenAccounts(accounts, allAccounts);
  const level1Map: Record<string, string> = {
    "1100": "Current Assets",
    "1200": "Fixed Assets",
    "1300": "Inventories",
    "1400": "Receivables",
    "1500": "Advances & Commissions",
    "2100": "Captial",
    "2200": "Current Liabilities",
    "2300": "Other",
    "2400": "Salesman Account",
    "2500": "Bismillah",
    "4100": "Sales Control Account",
    "5100": "Administrative Expenses",
    "5200": "Selling Expenses",
    "5300": "Financial Charges",
    "5400": "Other Charges",
    "Share Capital": "Share Capital",
  };
  const level2Map: Record<string, string> = {
    "1110": "Cash",
    "1120": "Bank Accounts",
    "1130": "Other Current Assets",
    "1410": "Receivables Accounts",
    "1510": "Salesman Account",
    "1520": "Staff Account",
    "2210": "Purchase Party",
    "2220": "Advance Exp.",
    "2230": "Loan",
    "4110": "Sales",
    "5110": "Salaries",
    "5120": "Rent",
    "5130": "Utilities",
    "5140": "Depreciation",
    "5210": "Advertising",
    "5220": "Sales Commission",
    "5310": "Bank Charges",
    "5320": "Interest Expense",
    "5410": "Miscellaneous",
    "1121": "Meezan Bank",
  };
  const parentMap: Record<string, string> = {
    "1000": "Assets",
    "2000": "Liabilities",
    "3000": "Equity",
    "4000": "Revenue",
    "5000": "Expenses",
  };
  const typeColor: Record<string, string> = {
    Asset: "#e6f4ea",
    Liability: "#fbeee6",
    Equity: "#e6f0fb",
    Revenue: "#e6f9fb",
    Expense: "#fff6e6",
  };
  return (
    <table style={{ width: "100%", borderCollapse: "collapse" }}>
      <thead>
        <tr>
          <th style={{ textAlign: "left", padding: 4 }}>Sr No</th>
          <th style={{ textAlign: "left", padding: 4 }}>Account Code</th>
          <th style={{ textAlign: "left", padding: 4 }}>Account Name</th>
          <th style={{ textAlign: "left", padding: 4 }}>Level 1 Type</th>
          <th style={{ textAlign: "left", padding: 4 }}>Level 2 Type</th>
          <th style={{ textAlign: "left", padding: 4 }}>Parent</th>
          <th style={{ textAlign: "left", padding: 4 }}>Subaccount(s)</th>
          <th style={{ textAlign: "left", padding: 4 }}>Actions</th>
        </tr>
      </thead>
      <tbody>
        {flat.map(({ acc, parent, subaccount }, idx) => {
          const rowColor = typeColor[acc.accountType as string] || "white";
          const level1Label =
            acc.selectedAccountType1 && level1Map[acc.selectedAccountType1]
              ? level1Map[acc.selectedAccountType1]
              : acc.selectedAccountType1 || "-";
          const level2Label =
            acc.selectedAccountType2 && level2Map[acc.selectedAccountType2]
              ? level2Map[acc.selectedAccountType2]
              : acc.selectedAccountType2 || "-";
          let parentLabel = "-";
          if (parent) {
            const parentAcc = allAccounts.find(
              (a) => a.selectedCode === parent,
            );
            if (parentAcc && parentAcc.accountName) {
              parentLabel = parentAcc.accountName;
            } else {
              parentLabel =
                parentMap[parent] ||
                level1Map[parent] ||
                level2Map[parent] ||
                parent;
            }
          }
          return (
            <tr
              key={`${acc.selectedCode}-${idx}`}
              style={{ borderBottom: "1px solid #eee", background: rowColor }}
            >
              <td style={{ padding: 4 }}>{idx + 1}</td>
              <td style={{ padding: 4 }}>{acc.accountCode}</td>
              <td
                style={{
                  padding: 4,
                  fontWeight: 600,
                  textTransform: "uppercase",
                }}
              >
                <Tooltip label={getAccountPath(allAccounts, acc.selectedCode)}>
                  <span>{acc.accountName}</span>
                </Tooltip>
              </td>
              <td style={{ padding: 4 }}>{level1Label}</td>
              <td style={{ padding: 4 }}>{level2Label}</td>
              <td style={{ padding: 4 }}>{parentLabel}</td>
              <td style={{ padding: 4 }}>{subaccount || "-"}</td>
              <td style={{ padding: 4 }}>
                <Tooltip label="Edit this account">
                  <ActionIcon
                    variant="subtle"
                    color="blue"
                    onClick={() => onEdit(acc)}
                    title="Edit Account"
                  >
                    <IconEdit size={16} />
                  </ActionIcon>
                </Tooltip>
                <Tooltip label="Delete this account">
                  <ActionIcon
                    variant="subtle"
                    color="red"
                    onClick={() => acc._id && onDelete(acc._id)}
                    title="Delete Account"
                  >
                    <IconTrash size={16} />
                  </ActionIcon>
                </Tooltip>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

export default ChartOfAccounts;
