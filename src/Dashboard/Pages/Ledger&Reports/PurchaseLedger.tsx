"use client";
import { useState } from "react";
import {
  Card,
  Text,
  Grid,
  TextInput,
  Select,
  Button,
  Table,
  Group,
  Badge,
  Stack,
  Pagination,
} from "@mantine/core";

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { RowInput } from "jspdf-autotable";

import { Download, Filter } from "lucide-react";
import {
  IconAlertCircle,
  IconArrowDownRight,
  IconClock,
} from "@tabler/icons-react";

interface PurchaseEntry {
  date: string;
  vendor: string;
  invoice: string;
  description: string;
  purchaseAmount: number;
  paid: number;
  balance: number;
  dueDate: string;
  status: "paid" | "partial" | "pending" | "overdue";
  terms: string;
}

const initialData: PurchaseEntry[] = [
  {
    date: "2024-01-03",
    vendor: "ABC Suppliers",
    invoice: "PI-001",
    description: "Raw Materials Purchase",
    purchaseAmount: 30000,
    paid: 30000,
    balance: 0,
    dueDate: "2024-01-18",
    status: "paid",
    terms: "Net 15",
  },
  {
    date: "2024-01-06",
    vendor: "XYZ Trading",
    invoice: "PI-002",
    description: "Office Supplies",
    purchaseAmount: 15000,
    paid: 7500,
    balance: 7500,
    dueDate: "2024-01-21",
    status: "partial",
    terms: "Net 15",
  },
  {
    date: "2024-01-09",
    vendor: "Tech Equipment Co",
    invoice: "PI-003",
    description: "Computer Hardware",
    purchaseAmount: 95000,
    paid: 0,
    balance: 95000,
    dueDate: "2024-01-24",
    status: "pending",
    terms: "Net 15",
  },
  {
    date: "2024-01-11",
    vendor: "Service Provider Ltd",
    invoice: "PI-004",
    description: "Maintenance Services",
    purchaseAmount: 25000,
    paid: 0,
    balance: 25000,
    dueDate: "2024-01-16",
    status: "overdue",
    terms: "Net 5",
  },
  {
    date: "2024-01-13",
    vendor: "ABC Suppliers",
    invoice: "PI-005",
    description: "Additional Materials",
    purchaseAmount: 18000,
    paid: 18000,
    balance: 0,
    dueDate: "2024-01-28",
    status: "paid",
    terms: "Net 15",
  },
];

export default function PurchaseLedger() {
  const [data] = useState<PurchaseEntry[]>(initialData);
  const [search, setSearch] = useState("");
  const [vendor, setVendor] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const [activePage, setActivePage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  const filteredData = data.filter((entry) => {
    const matchesSearch =
      entry.vendor.toLowerCase().includes(search.toLowerCase()) ||
      entry.invoice.toLowerCase().includes(search.toLowerCase());
    const matchesVendor = vendor ? entry.vendor === vendor : true;
    const matchesStatus = status ? entry.status === status : true;
    return matchesSearch && matchesVendor && matchesStatus;
  });

  const paginatedData = filteredData.slice(
    (activePage - 1) * pageSize,
    activePage * pageSize
  );

  const totalPurchases = data.reduce((sum, e) => sum + e.purchaseAmount, 0);
  const totalPaid = data.reduce((sum, e) => sum + e.paid, 0);
  const totalOutstanding = data.reduce((sum, e) => sum + e.balance, 0);
  const totalOverdue = data
    .filter((e) => e.status === "overdue")
    .reduce((sum, e) => sum + e.balance, 0);

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.text("Purchase Ledger Report", 14, 15);

    autoTable(doc, {
      head: [
        [
          "Date",
          "Vendor",
          "Invoice",
          "Description",
          "Purchase Amount",
          "Paid",
          "Balance",
          "Due Date",
          "Status",
          "Terms",
        ],
      ],
      body: filteredData.map((e) => [
        e.date,
        e.vendor,
        e.invoice,
        e.description,
        `₹${e.purchaseAmount.toLocaleString()}`,
        `₹${e.paid.toLocaleString()}`,
        `₹${e.balance.toLocaleString()}`,
        e.dueDate,
        e.status,
        e.terms,
      ]) as RowInput[],
      startY: 20,
    });

    doc.save("purchase_ledger.pdf");
  };

  const renderStatus = (status: PurchaseEntry["status"]) => {
    switch (status) {
      case "paid":
        return <Badge color="#0A6802">Paid</Badge>;
      case "partial":
        return <Badge color="yellow">Partial</Badge>;
      case "pending":
        return <Badge color="blue">Pending</Badge>;
      case "overdue":
        return <Badge color="red">Overdue</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="p-6">
      <Group justify="space-between" mb="md">
        <Stack gap={0}>
          <Text size="xl" fw={700} mb="md">
            Purchase Ledger
          </Text>
          <Text c="dimmed">Track vendor transactions and payables</Text>
        </Stack>
        <Button
          leftSection={<Download size={16} />}
          color="#0A6802"
          onClick={exportPDF}
        >
          Export Report
        </Button>
      </Group>

      <Grid>
        <Grid.Col span={3}>
          <Card shadow="sm" p="md" withBorder bg={"#F1FCF0"}>
            <Group>
              <IconArrowDownRight size={30} color="red" />
              <div>
                <Text>Total Purchases</Text>
                <Text fw={700}>₹{totalPurchases.toLocaleString()}</Text>
              </div>
            </Group>
          </Card>
        </Grid.Col>
        <Grid.Col span={3}>
          <Card shadow="sm" p="md" withBorder bg={"#F1FCF0"}>
            <Group>
              <IconArrowDownRight size={30} color="green" />
              <div>
                <Text>Amount Paid</Text>
                <Text fw={700}>₹{totalPaid.toLocaleString()}</Text>
              </div>
            </Group>
          </Card>
        </Grid.Col>
        <Grid.Col span={3}>
          <Card shadow="sm" p="md" withBorder bg={"#F1FCF0"}>
            <Group>
              <IconClock size={30} color="#D08700" />
              <div>
                <Text>Outstanding</Text>
                <Text fw={700}>₹{totalOutstanding.toLocaleString()}</Text>
              </div>
            </Group>
          </Card>
        </Grid.Col>
        <Grid.Col span={3}>
          <Card shadow="sm" p="md" withBorder bg={"#F1FCF0"}>
            <Group>
              <IconAlertCircle size={30} color="red" />
              <div>
                <Text>Overdue</Text>
                <Text fw={700} c="red">
                  ₹{totalOverdue.toLocaleString()}
                </Text>
              </div>
            </Group>
          </Card>
        </Grid.Col>
      </Grid>

      <Card shadow="sm" p="md" mt="md" bg={"#F1FCF0"} withBorder>
        <Group grow>
          <TextInput
            label="Search"
            placeholder="Search vendors..."
            value={search}
            onChange={(e) => setSearch(e.currentTarget.value)}
          />
          <Select
            label="Vendor"
            placeholder="Vendor"
            data={[...new Set(data.map((e) => e.vendor))]}
            value={vendor}
            onChange={setVendor}
            clearable
          />
          <Select
            label="Status"
            placeholder="Status"
            data={["paid", "partial", "pending", "overdue"]}
            value={status}
            onChange={setStatus}
            clearable
          />
          <TextInput type="date" placeholder="From Date" label="From Date" />
          <TextInput type="date" placeholder="To Date" label="To Date" />
          <Button
            mt={23}
            color="#0A6802"
            leftSection={<Filter size={16} color="#ffffffff" />}
          >
            Apply Filter
          </Button>
        </Group>
      </Card>

      <Card shadow="sm" p="md" mt="md" withBorder bg={"#F1FCF0"}>
        <Text fw={600} mb="sm">
          Vendor Transactions
        </Text>
        <Table striped highlightOnHover withTableBorder bg={"#F1FCF0"}>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Date</Table.Th>
              <Table.Th>Vendor</Table.Th>
              <Table.Th>Invoice No.</Table.Th>
              <Table.Th>Description</Table.Th>
              <Table.Th>Purchase Amount</Table.Th>
              <Table.Th>Paid</Table.Th>
              <Table.Th>Balance</Table.Th>
              <Table.Th>Due Date</Table.Th>
              <Table.Th>Status</Table.Th>
              <Table.Th>Terms</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {paginatedData.map((e, i) => (
              <Table.Tr key={i}>
                <Table.Td>{e.date}</Table.Td>
                <Table.Td>{e.vendor}</Table.Td>
                <Table.Td>{e.invoice}</Table.Td>
                <Table.Td>{e.description}</Table.Td>
                <Table.Td>₹{e.purchaseAmount.toLocaleString()}</Table.Td>
                <Table.Td c="#0A6802">₹{e.paid.toLocaleString()}</Table.Td>
                <Table.Td c={e.balance > 0 ? "red" : "#0A6802"}>
                  ₹{e.balance.toLocaleString()}
                </Table.Td>
                <Table.Td>{e.dueDate}</Table.Td>
                <Table.Td>{renderStatus(e.status)}</Table.Td>
                <Table.Td>{e.terms}</Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>

        <Group justify="space-between" mt="md">
          <Select
            label="Rows per page"
            data={["5", "10", "20"]}
            value={String(pageSize)}
            onChange={(value) => setPageSize(Number(value))}
            w={120}
          />
          <Pagination
            color="#0A6802"
            total={Math.ceil(filteredData.length / pageSize)}
            value={activePage}
            onChange={setActivePage}
          />
        </Group>
      </Card>
    </div>
  );
}
