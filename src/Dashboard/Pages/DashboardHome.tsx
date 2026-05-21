import {
  Card,
  Group,
  Stack,
  Text,
  SimpleGrid,
  Badge,
  Table,
  Loader,
  Alert,
  ActionIcon,
  Tooltip,
  Center,
} from "@mantine/core";
import {
  IconTrendingUp,
  IconTrendingDown,
  IconAlertTriangle,
  IconArrowUpRight,
  IconArrowDownRight,
  IconRefresh,
  IconCurrencyDollar,
} from "@tabler/icons-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ReTooltip,
} from "recharts";
import { useDashboardHome } from "../Context/DashboardHomeContext";
import { useBrand } from "../Context/BrandContext";

function fmtNum(n: number) {
  return Math.round(n).toLocaleString("en-PK");
}

function pctChange(current: number, prior: number): number | null {
  if (prior === 0) return null;
  return ((current - prior) / prior) * 100;
}

export default function DashboardHome() {
  const { stats, loading, error, refetch } = useDashboardHome();
  const { brand } = useBrand();

  const salesDelta = pctChange(stats.currentMonthSales, stats.lastMonthSales);

  return (
    <Stack gap="lg" p="md">
      {/* Header */}
      <Group justify="space-between" align="center">
        <Stack gap={2}>
          <Text size="xl" fw={700} c="#0A6802">
            Dashboard
          </Text>
          <Text size="sm" c="dimmed" tt="capitalize">
            {brand} — overview for the current month
          </Text>
        </Stack>
        <Tooltip label="Refresh stats">
          <ActionIcon
            variant="light"
            color="#0A6802"
            size="lg"
            onClick={refetch}
            loading={loading}
          >
            <IconRefresh size={18} />
          </ActionIcon>
        </Tooltip>
      </Group>

      {error && (
        <Alert
          color="red"
          title="Error loading stats"
          icon={<IconAlertTriangle size={16} />}
        >
          {error}
        </Alert>
      )}

      {/* ── Stat Cards ─────────────────────────────────────────────────── */}
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="md">
        {/* Sales This Month */}
        <Card
          withBorder
          shadow="sm"
          radius="md"
          style={{ borderLeft: "4px solid #0A6802" }}
        >
          <Group justify="space-between" align="flex-start">
            <Stack gap={4} style={{ flex: 1 }}>
              <Text size="xs" fw={600} c="dimmed" tt="uppercase" lts={0.5}>
                Sales This Month
              </Text>
              {loading ? (
                <Loader size="sm" color="#0A6802" />
              ) : (
                <>
                  <Text size="xl" fw={800}>
                    Rs. {fmtNum(stats.currentMonthSales)}
                  </Text>
                  <Group gap={4}>
                    {salesDelta !== null ? (
                      <>
                        {salesDelta >= 0 ? (
                          <IconArrowUpRight size={14} color="green" />
                        ) : (
                          <IconArrowDownRight size={14} color="red" />
                        )}
                        <Text size="xs" c={salesDelta >= 0 ? "green" : "red"}>
                          {Math.abs(salesDelta).toFixed(1)}% vs last month
                        </Text>
                      </>
                    ) : (
                      <Text size="xs" c="dimmed">
                        No prior month data
                      </Text>
                    )}
                  </Group>
                </>
              )}
            </Stack>
            <IconCurrencyDollar size={28} color="#0A6802" opacity={0.5} />
          </Group>
        </Card>

        {/* Sales Last Month */}
        <Card
          withBorder
          shadow="sm"
          radius="md"
          style={{ borderLeft: "4px solid #819E00" }}
        >
          <Group justify="space-between" align="flex-start">
            <Stack gap={4}>
              <Text size="xs" fw={600} c="dimmed" tt="uppercase" lts={0.5}>
                Sales Last Month
              </Text>
              {loading ? (
                <Loader size="sm" color="#819E00" />
              ) : (
                <Text size="xl" fw={800}>
                  Rs. {fmtNum(stats.lastMonthSales)}
                </Text>
              )}
            </Stack>
            <IconCurrencyDollar size={28} color="#819E00" opacity={0.5} />
          </Group>
        </Card>

        {/* Receivables */}
        <Card
          withBorder
          shadow="sm"
          radius="md"
          style={{ borderLeft: "4px solid #1971c2" }}
        >
          <Group justify="space-between" align="flex-start">
            <Stack gap={4}>
              <Text size="xs" fw={600} c="dimmed" tt="uppercase" lts={0.5}>
                Total Receivables
              </Text>
              {loading ? (
                <Loader size="sm" color="blue" />
              ) : (
                <Text size="xl" fw={800}>
                  Rs. {fmtNum(stats.totalReceivables)}
                </Text>
              )}
              <Text size="xs" c="dimmed">
                Owed by customers
              </Text>
            </Stack>
            <IconTrendingUp size={28} color="#1971c2" opacity={0.5} />
          </Group>
        </Card>

        {/* Payables */}
        <Card
          withBorder
          shadow="sm"
          radius="md"
          style={{ borderLeft: "4px solid #c2255c" }}
        >
          <Group justify="space-between" align="flex-start">
            <Stack gap={4}>
              <Text size="xs" fw={600} c="dimmed" tt="uppercase" lts={0.5}>
                Total Payables
              </Text>
              {loading ? (
                <Loader size="sm" color="pink" />
              ) : (
                <Text size="xl" fw={800}>
                  Rs. {fmtNum(stats.totalPayables)}
                </Text>
              )}
              <Text size="xs" c="dimmed">
                Owed to suppliers
              </Text>
            </Stack>
            <IconTrendingDown size={28} color="#c2255c" opacity={0.5} />
          </Group>
        </Card>
      </SimpleGrid>

      {/* ── Chart + Top Products ──────────────────────────────────────── */}
      <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="md">
        {/* Sales Trend Line Chart */}
        <Card withBorder shadow="sm" radius="md">
          <Text fw={600} mb="md">
            Sales Trend — Last 6 Months
          </Text>
          {loading ? (
            <Center h={220}>
              <Loader color="#0A6802" />
            </Center>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart
                data={stats.monthlySalesTrend}
                margin={{ top: 4, right: 16, left: 0, bottom: 4 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v: number) =>
                    v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)
                  }
                />
                <ReTooltip
                  formatter={(value: number) => [
                    `Rs. ${fmtNum(value)}`,
                    "Sales",
                  ]}
                />
                <Line
                  type="monotone"
                  dataKey="total"
                  stroke="#0A6802"
                  strokeWidth={2.5}
                  dot={{ fill: "#0A6802", r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </Card>

        {/* Top 5 Selling Products */}
        <Card withBorder shadow="sm" radius="md">
          <Text fw={600} mb="md">
            Top 5 Selling Products
          </Text>
          {loading ? (
            <Center h={220}>
              <Loader color="#0A6802" />
            </Center>
          ) : (
            <Table highlightOnHover withTableBorder fz="sm">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>#</Table.Th>
                  <Table.Th>Product</Table.Th>
                  <Table.Th ta="right">Qty Sold</Table.Th>
                  <Table.Th ta="right">Revenue (Rs.)</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {stats.topProducts.length > 0 ? (
                  stats.topProducts.map((p, i) => (
                    <Table.Tr key={p.code ?? i}>
                      <Table.Td>
                        <Badge size="sm" color="#819E00" variant="light">
                          {i + 1}
                        </Badge>
                      </Table.Td>
                      <Table.Td>{p.productName}</Table.Td>
                      <Table.Td ta="right">{fmtNum(p.totalQtySold)}</Table.Td>
                      <Table.Td ta="right" fw={600}>
                        {fmtNum(p.totalRevenue)}
                      </Table.Td>
                    </Table.Tr>
                  ))
                ) : (
                  <Table.Tr>
                    <Table.Td colSpan={4} ta="center" c="dimmed">
                      No sales data yet
                    </Table.Td>
                  </Table.Tr>
                )}
              </Table.Tbody>
            </Table>
          )}
        </Card>
      </SimpleGrid>

      {/* ── Low Stock Alerts ─────────────────────────────────────────── */}
      <Card withBorder shadow="sm" radius="md">
        <Group justify="space-between" mb="md">
          <Text fw={600}>Low Stock Alerts</Text>
          <Badge
            color="red"
            variant="filled"
            leftSection={<IconAlertTriangle size={12} />}
          >
            {stats.lowStockProducts.length} item
            {stats.lowStockProducts.length !== 1 ? "s" : ""}
          </Badge>
        </Group>
        {loading ? (
          <Center py="md">
            <Loader color="red" />
          </Center>
        ) : (
          <Table highlightOnHover withTableBorder fz="sm">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Code</Table.Th>
                <Table.Th>Product</Table.Th>
                <Table.Th ta="right">In Stock</Table.Th>
                <Table.Th ta="right">Min Level</Table.Th>
                <Table.Th ta="right">Shortfall</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {stats.lowStockProducts.length > 0 ? (
                stats.lowStockProducts.map((p, i) => (
                  <Table.Tr key={p.code ?? i}>
                    <Table.Td>
                      <Text c="dimmed" fz="xs">
                        {p.code}
                      </Text>
                    </Table.Td>
                    <Table.Td fw={500}>{p.productName}</Table.Td>
                    <Table.Td ta="right">
                      <Badge color="red" variant="light">
                        {p.quantity}
                      </Badge>
                    </Table.Td>
                    <Table.Td ta="right">{p.minimumStockLevel}</Table.Td>
                    <Table.Td ta="right">
                      <Text c="red" fw={600}>
                        {p.minimumStockLevel - p.quantity}
                      </Text>
                    </Table.Td>
                  </Table.Tr>
                ))
              ) : (
                <Table.Tr>
                  <Table.Td colSpan={5} ta="center" c="dimmed">
                    All products are adequately stocked
                  </Table.Td>
                </Table.Tr>
              )}
            </Table.Tbody>
          </Table>
        )}
      </Card>
    </Stack>
  );
}
