import { useEffect, useState } from "react";
import {
  Paper,
  Text,
  Group,
  TextInput,
  Select,
  Badge,
  Table,
  Loader,
  Alert,
  Pagination,
  Stack,
} from "@mantine/core";
import { IconSearch, IconInfoCircle } from "@tabler/icons-react";
import api from "../../../api_configuration/api";

interface AuditEntry {
  _id: string;
  userId: string;
  userName: string;
  brand: string;
  action: string;
  module: string;
  description: string;
  timestamp: string;
}

const actionColors: Record<string, string> = {
  CREATE: "green",
  DELETE: "red",
  UPDATE: "blue",
  LOGIN: "cyan",
};

export default function AuditLogs() {
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState<string | null>(null);
  const [moduleFilter, setModuleFilter] = useState<string | null>(null);

  const limit = 20;

  useEffect(() => {
    const fetchLogs = async () => {
      setLoading(true);
      setError(null);
      try {
        const params: Record<string, string | number> = {
          skip: (page - 1) * limit,
          limit,
        };
        if (actionFilter) params.action = actionFilter;
        if (moduleFilter) params.module = moduleFilter;

        const res = await api.get("/audit-logs", { params });
        const body = res.data as { total?: number; data?: unknown } | unknown[];
        const rows = Array.isArray(body)
          ? body
          : Array.isArray((body as { data?: unknown }).data)
            ? ((body as { data: AuditEntry[] }).data)
            : [];
        const totalCount = Array.isArray(body)
          ? body.length
          : typeof (body as { total?: number }).total === "number"
            ? (body as { total: number }).total
            : rows.length;
        setLogs(rows as AuditEntry[]);
        setTotal(totalCount);
      } catch (err: any) {
        setError(err?.response?.data?.message ?? "Failed to load audit logs");
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();
  }, [page, actionFilter, moduleFilter]);

  const logList = Array.isArray(logs) ? logs : [];
  const filteredLogs = search
    ? logList.filter(
        (l) =>
          (l.userName ?? "").toLowerCase().includes(search.toLowerCase()) ||
          (l.description ?? "").toLowerCase().includes(search.toLowerCase()),
      )
    : logList;

  return (
    <div style={{ padding: "24px" }}>
      <Group justify="space-between" mb="md">
        <Text fw={600} fz="xl">
          Audit Logs
        </Text>
      </Group>

      <Paper
        shadow="sm"
        radius="md"
        p="lg"
        withBorder
        style={{ backgroundColor: "#f6fff6" }}
      >
        <Text fw={500} mb={4}>
          Activity History
        </Text>
        <Text fz="sm" c="dimmed" mb="md">
          System-wide audit trail of all user actions
        </Text>

        <Group mb="md" gap="md">
          <TextInput
            placeholder="Search user or description..."
            leftSection={<IconSearch size={16} />}
            value={search}
            onChange={(e) => setSearch(e.currentTarget.value)}
          />
          <Select
            placeholder="All Actions"
            data={["CREATE", "DELETE", "UPDATE", "LOGIN"]}
            value={actionFilter}
            onChange={setActionFilter}
            clearable
          />
          <Select
            placeholder="All Modules"
            data={["SaleInvoice", "PurchaseInvoice", "Auth", "Product"]}
            value={moduleFilter}
            onChange={setModuleFilter}
            clearable
          />
        </Group>

        {loading ? (
          <Group justify="center" py="xl">
            <Loader color="#0A6802" />
          </Group>
        ) : error ? (
          <Alert icon={<IconInfoCircle size={16} />} color="red" mb="md">
            {error}
          </Alert>
        ) : (
          <Stack gap="md">
            <Table highlightOnHover withTableBorder>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Timestamp</Table.Th>
                  <Table.Th>User</Table.Th>
                  <Table.Th>Action</Table.Th>
                  <Table.Th>Module</Table.Th>
                  <Table.Th>Description</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {filteredLogs.length > 0 ? (
                  filteredLogs.map((log) => (
                    <Table.Tr key={log._id}>
                      <Table.Td
                        style={{
                          fontSize: 12,
                          color: "#6b7280",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {new Date(log.timestamp).toLocaleString("en-GB")}
                      </Table.Td>
                      <Table.Td>
                        <Text fw={500} fz="sm">
                          {log.userName}
                        </Text>
                        <Text fz={11} c="dimmed">
                          {log.brand}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <Badge
                          color={actionColors[log.action] ?? "gray"}
                          variant="light"
                        >
                          {log.action}
                        </Badge>
                      </Table.Td>
                      <Table.Td>
                        <Badge variant="outline" color="gray">
                          {log.module}
                        </Badge>
                      </Table.Td>
                      <Table.Td style={{ maxWidth: 360 }}>
                        <Text fz="sm" lineClamp={2}>
                          {log.description}
                        </Text>
                      </Table.Td>
                    </Table.Tr>
                  ))
                ) : (
                  <Table.Tr>
                    <Table.Td colSpan={5}>
                      <Text ta="center" c="dimmed">
                        No audit log entries found
                      </Text>
                    </Table.Td>
                  </Table.Tr>
                )}
              </Table.Tbody>
            </Table>

            {total > limit && (
              <Group justify="center">
                <Pagination
                  value={page}
                  onChange={setPage}
                  total={Math.ceil(total / limit)}
                  color="#0A6802"
                />
              </Group>
            )}
          </Stack>
        )}
      </Paper>
    </div>
  );
}
