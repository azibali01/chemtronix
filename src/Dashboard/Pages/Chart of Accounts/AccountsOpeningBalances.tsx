import React, { useMemo, useState } from "react";
import api from "../../../api_configuration/api";
import {
  Table,
  Button,
  TextInput,
  NumberInput,
  Group,
  Text,
  Card,
  ScrollArea,
  Divider,
  Modal,
  Stack,
} from "@mantine/core";
import { useChartOfAccounts } from "../../Context/ChartOfAccountsContext";
import { useAccountsOpeningBalances } from "../../Context/AccountsOpeningbalancesContext";
import type { AccountNode } from "../../Context/ChartOfAccountsContext";

/** Mantine NumberInput often emits `string` while typing; never coerce non-numbers to 0 or amounts drift to the wrong side. */
function parseNumberInputValue(
  val: string | number | null | undefined
): number {
  if (val === null || val === undefined || val === "") return 0;
  if (typeof val === "number")
    return Number.isFinite(val) ? val : 0;
  const n = Number(String(val).replace(/,/g, ""));
  return Number.isFinite(n) ? n : 0;
}

const flattenAccounts = (
  nodes: AccountNode[],
  level: number = 0
): { code: string; name: string; id: string }[] => {
  const result: { code: string; name: string; id: string }[] = [];

  nodes.forEach((n) => {
    // Add current account with indentation
    const indent = "  ".repeat(level); // Indentation for nested levels
    result.push({
      id: n._id || `${n.accountCode}-${Math.random()}`, // Unique ID
      code: String(n.accountCode || n.selectedCode || ""), // Use accountCode first (specific code)
      name: `${indent}${n.accountName}`,
    });

    // Recursively add all children at deeper levels
    if (n.children && n.children.length > 0) {
      result.push(...flattenAccounts(n.children, level + 1));
    }
  });

  return result;
};

const AccountsOpeningBalances: React.FC = () => {
  const { accounts } = useChartOfAccounts();
  const { balances, setBalances } = useAccountsOpeningBalances();
  const [search, setSearch] = React.useState("");

  // Modal state
  const [modalOpened, setModalOpened] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<{
    code: string;
    name: string;
    id: string;
  } | null>(null);
  const [modalDebit, setModalDebit] = useState<number>(0);
  const [modalCredit, setModalCredit] = useState<number>(0);
  const [updating, setUpdating] = useState(false);

  const allAccounts = useMemo(() => flattenAccounts(accounts), [accounts]);

  // Load opening balances from Chart of Accounts data
  React.useEffect(() => {
    if (accounts.length > 0) {
      const initialBalances: Record<string, { debit: number; credit: number }> =
        {};

      const loadBalancesFromNodes = (nodes: AccountNode[]) => {
        nodes.forEach((node) => {
          const code = String(node.accountCode || node.selectedCode || "");
          if (!code) return;
          // API stores opening on root `debit` / `credit`; some trees use nested `openingBalance`.
          const raw = node as AccountNode & {
            debit?: number;
            credit?: number;
          };
          const debit = Number(node.openingBalance?.debit ?? raw.debit ?? 0) || 0;
          const credit =
            Number(node.openingBalance?.credit ?? raw.credit ?? 0) || 0;
          initialBalances[code] = { debit, credit };
          if (node.children && node.children.length > 0) {
            loadBalancesFromNodes(node.children);
          }
        });
      };

      loadBalancesFromNodes(accounts);
      // Merge initial balances from chart with persisted balances so refresh doesn't clear user-entered values
      setBalances((prev) => ({ ...initialBalances, ...prev }));
    }
  }, [accounts, setBalances]);

  const filteredAccounts = useMemo(
    () =>
      allAccounts.filter(
        (a: { code?: string; name?: string; id?: string }) =>
          (a.name && a.name.toLowerCase().includes(search.toLowerCase())) ||
          (a.code && a.code.toLowerCase().includes(search.toLowerCase()))
      ),
    [allAccounts, search]
  );

  const handleChange = (
    code: string,
    field: "debit" | "credit",
    value: number
  ) => {
    setBalances((prev) => ({
      ...prev,
      [code]: { ...prev[code], [field]: value },
    }));
  };

  // Open modal for single account
  const openModal = (account: { code: string; name: string; id: string }) => {
    setSelectedAccount(account);
    setModalDebit(balances[account.code]?.debit || 0);
    setModalCredit(balances[account.code]?.credit || 0);
    setModalOpened(true);
  };

  // Update single account
  const handleSingleUpdate = async () => {
    if (!selectedAccount) return;

    setUpdating(true);

    const debit = parseNumberInputValue(modalDebit);
    const credit = parseNumberInputValue(modalCredit);
    const payload = { debit, credit };

    console.log("Updating single account:", {
      id: selectedAccount.id,
      ...payload,
    });

    try {
      const response = await api.put(
        `/chart-of-account/openingBalance/${selectedAccount.id}`,
        payload
      );
      console.log("Update successful:", response.data);

      // Update local state
      setBalances((prev) => ({
        ...prev,
        [selectedAccount.code]: { debit, credit },
      }));

      alert("Opening balance updated successfully!");
      setModalOpened(false);
    } catch (error) {
      console.error("Failed to update opening balance", error);
      alert("Failed to update. Check console for details.");
    }
    setUpdating(false);
  };

  const totalDebit = filteredAccounts.reduce(
    (sum: number, a: { code: string; name: string; id: string }) =>
      sum + (balances[a.code]?.debit || 0),
    0
  );
  const totalCredit = filteredAccounts.reduce(
    (sum: number, a: { code: string; name: string; id: string }) =>
      sum + (balances[a.code]?.credit || 0),
    0
  );

  return (
    <Card shadow="md" radius="md" p="lg" withBorder>
      <Group justify="space-between" mb="md">
        <Text fw={700} size="xl">
          Opening Balances
        </Text>
        <TextInput
          placeholder="Search for code or title.."
          value={search}
          onChange={(e) => setSearch(e.currentTarget.value)}
          style={{ width: 350 }}
        />
      </Group>
      <Divider mb="md" />
      <ScrollArea h={500} type="auto">
        <Table
          striped
          highlightOnHover
          withRowBorders
          withColumnBorders
          style={{ minWidth: 800, border: "1px solid #dee2e6" }}
        >
          <Table.Thead
            style={{
              position: "sticky",
              top: 0,
              background: "#f8f9fa",
              zIndex: 1,
            }}
          >
            <Table.Tr>
              <Table.Th style={{ border: "1px solid #dee2e6", padding: 8 }}>
                Account Code
              </Table.Th>
              <Table.Th
                style={{
                  border: "1px solid #dee2e6",
                  padding: 8,
                  minWidth: 400,
                }}
              >
                Title
              </Table.Th>
              <Table.Th style={{ border: "1px solid #dee2e6", padding: 8 }}>
                Debit
              </Table.Th>
              <Table.Th style={{ border: "1px solid #dee2e6", padding: 8 }}>
                Credit
              </Table.Th>
              <Table.Th style={{ border: "1px solid #dee2e6", padding: 8 }}>
                Action
              </Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {filteredAccounts.length === 0 ? (
              <Table.Tr>
                <Table.Td
                  colSpan={5}
                  style={{ textAlign: "center", padding: 24, color: "#888" }}
                >
                  No accounts found.
                </Table.Td>
              </Table.Tr>
            ) : (
              filteredAccounts.map(
                (row: { code: string; name: string; id: string }) => (
                  <Table.Tr
                    key={row.id}
                    style={{ border: "1px solid #dee2e6" }}
                  >
                    <Table.Td
                      style={{ border: "1px solid #dee2e6", padding: 8 }}
                    >
                      {row.code}
                    </Table.Td>
                    <Table.Td
                      style={{ border: "1px solid #dee2e6", padding: 8 }}
                    >
                      {row.name}
                    </Table.Td>
                    <Table.Td
                      style={{ border: "1px solid #dee2e6", padding: 8 }}
                    >
                      <NumberInput
                        value={balances[row.code]?.debit || 0}
                        min={0}
                        onChange={(val: number | string) =>
                          handleChange(
                            row.code,
                            "debit",
                            parseNumberInputValue(val)
                          )
                        }
                        hideControls={false}
                        disabled
                      />
                    </Table.Td>
                    <Table.Td
                      style={{ border: "1px solid #dee2e6", padding: 8 }}
                    >
                      <NumberInput
                        value={balances[row.code]?.credit || 0}
                        min={0}
                        onChange={(val: number | string) =>
                          handleChange(
                            row.code,
                            "credit",
                            parseNumberInputValue(val)
                          )
                        }
                        hideControls={false}
                        disabled
                      />
                    </Table.Td>
                    <Table.Td
                      style={{ border: "1px solid #dee2e6", padding: 8 }}
                    >
                      <Button
                        size="xs"
                        color="#0A6802"
                        onClick={() => openModal(row)}
                      >
                        Update
                      </Button>
                    </Table.Td>
                  </Table.Tr>
                )
              )
            )}
          </Table.Tbody>
        </Table>
      </ScrollArea>
      <Divider my="md" />
      <Group mt="md" justify="flex-end">
        <Group>
          <Text c="red" fw={700} size="md">
            Total Debit: {totalDebit}
          </Text>
          <Text c="red" fw={700} size="md">
            Total Credit: {totalCredit}
          </Text>
        </Group>
      </Group>

      {/* Modal for single account update */}
      <Modal
        opened={modalOpened}
        onClose={() => setModalOpened(false)}
        title={
          <Text fw={700} size="lg">
            Update Opening Balance
          </Text>
        }
        size="md"
      >
        {selectedAccount && (
          <Stack gap="md">
            <div>
              <Text size="sm" c="dimmed">
                Account Code
              </Text>
              <Text fw={600}>{selectedAccount.code}</Text>
            </div>
            <div>
              <Text size="sm" c="dimmed">
                Account Name
              </Text>
              <Text fw={600}>{selectedAccount.name.trim()}</Text>
            </div>
            <NumberInput
              label="Debit"
              value={modalDebit}
              onChange={(val) => setModalDebit(parseNumberInputValue(val))}
              min={0}
              placeholder="Enter debit amount"
            />
            <NumberInput
              label="Credit"
              value={modalCredit}
              onChange={(val) => setModalCredit(parseNumberInputValue(val))}
              min={0}
              placeholder="Enter credit amount"
            />
            <Group justify="flex-end" mt="md">
              <Button
                variant="outline"
                onClick={() => setModalOpened(false)}
                disabled={updating}
              >
                Cancel
              </Button>
              <Button
                color="#0A6802"
                onClick={handleSingleUpdate}
                loading={updating}
              >
                Update Balance
              </Button>
            </Group>
          </Stack>
        )}
      </Modal>
    </Card>
  );
};

export default AccountsOpeningBalances;
