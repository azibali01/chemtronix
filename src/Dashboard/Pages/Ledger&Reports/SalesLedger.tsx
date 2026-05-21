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
  IconArrowUpRight,
  IconClock,
} from "@tabler/icons-react";

interface SaleEntry {
  date: string;
  customer: string;
  invoice: string;
  description: string;
  saleAmount: number;
  received: number;
  balance: number;
  dueDate: string;
  status: "paid" | "partial" | "pending" | "overdue";
  terms: string;
}

const initialData: SaleEntry[] = [
  {
    date: "2024-01-02",
    customer: "ABC Company",
    invoice: "SI-001",
    description: "Product Sales - January",
    saleAmount: 50000,
    received: 50000,
    balance: 0,
    dueDate: "2024-01-17",
    status: "paid",
    terms: "Net 15",
  },
  {
    date: "2024-01-05",
    customer: "XYZ Industries",
    invoice: "SI-002",
    description: "Bulk Order - Electronics",
    saleAmount: 75000,
    received: 30000,
    balance: 45000,
    dueDate: "2024-01-20",
    status: "partial",
    terms: "Net 15",
  },
  {
    date: "2024-01-08",
    customer: "Tech Solutions Ltd",
    invoice: "SI-003",
    description: "Software License Sales",
    saleAmount: 120000,
    received: 0,
    balance: 120000,
    dueDate: "2024-01-23",
    status: "pending",
    terms: "Net 15",
  },
  {
    date: "2024-01-10",
    customer: "Global Corp",
    invoice: "SI-004",
    description: "Consulting Services",
    saleAmount: 85000,
    received: 0,
    balance: 85000,
    dueDate: "2024-01-15",
    status: "overdue",
    terms: "Net 5",
  },
  {
    date: "2024-01-12",
    customer: "ABC Company",
    invoice: "SI-005",
    description: "Additional Products",
    saleAmount: 35000,
    received: 35000,
    balance: 0,
    dueDate: "2024-01-27",
    status: "paid",
    terms: "Net 15",
  },
];

export default function SalesLedger() {
  const [data] = useState<SaleEntry[]>(initialData);
  const [search, setSearch] = useState("");
  const [customer, setCustomer] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const pageSize = 10;
  const start = (page - 1) * pageSize;

  const filteredData = data.filter((entry) => {
    const matchesSearch =
      entry.customer.toLowerCase().includes(search.toLowerCase()) ||
      entry.invoice.toLowerCase().includes(search.toLowerCase());
    const matchesCustomer = customer ? entry.customer === customer : true;
    const matchesStatus = status ? entry.status === status : true;
    return matchesSearch && matchesCustomer && matchesStatus;
  });

  const paginatedData = filteredData.slice(start, start + pageSize);

  const totalSales = data.reduce((sum, e) => sum + e.saleAmount, 0);
  const totalReceived = data.reduce((sum, e) => sum + e.received, 0);
  const totalOutstanding = data.reduce((sum, e) => sum + e.balance, 0);
  const totalOverdue = data
    .filter((e) => e.status === "overdue")
    .reduce((sum, e) => sum + e.balance, 0);

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.text("Sales Ledger Report", 14, 15);

    autoTable(doc, {
      head: [
        [
          "Date",
          "Customer",
          "Invoice",
          "Description",
          "Sale Amount",
          "Received",
          "Balance",
          "Due Date",
          "Status",
          "Terms",
        ],
      ],
      body: filteredData.map((e) => [
        e.date,
        e.customer,
        e.invoice,
        e.description,
        `₹${e.saleAmount.toLocaleString()}`,
        `₹${e.received.toLocaleString()}`,
        `₹${e.balance.toLocaleString()}`,
        e.dueDate,
        e.status,
        e.terms,
      ]) as RowInput[],
      startY: 20,
    });

    doc.save("sales_ledger.pdf");
  };

  const renderStatus = (status: SaleEntry["status"]) => {
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
            Sales Ledger
          </Text>
          <Text c="dimmed">Track customer transactions and receivables</Text>
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
              <IconArrowUpRight size={30} color="green" />
              <div>
                <Text>Total Sales</Text>
                <Text fw={700}>{totalSales.toLocaleString()}</Text>
              </div>
            </Group>
          </Card>
        </Grid.Col>
        <Grid.Col span={3}>
          <Card shadow="sm" p="md" withBorder bg={"#F1FCF0"}>
            <Group>
              <IconArrowUpRight size={30} color="blue" />
              <div>
                <Text>Amount Received</Text>
                <Text fw={700}>{totalReceived.toLocaleString()}</Text>
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
                <Text fw={700}>{totalOutstanding.toLocaleString()}</Text>
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

      <Card shadow="sm" p="md" mt="md" bg={"#F1FCF0"}>
        <Group grow>
          <TextInput
            label="Search"
            placeholder="Search customers..."
            value={search}
            onChange={(e) => setSearch(e.currentTarget.value)}
          />
          <Select
            label="Customer"
            placeholder="Customer"
            data={[...new Set(data.map((e) => e.customer))]}
            value={customer}
            onChange={setCustomer}
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
        <Text fw={700} mb="sm">
          Customer Transactions
        </Text>
        <Table striped highlightOnHover withTableBorder>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Date</Table.Th>
              <Table.Th>Customer</Table.Th>
              <Table.Th>Invoice No.</Table.Th>
              <Table.Th>Description</Table.Th>
              <Table.Th>Sale Amount</Table.Th>
              <Table.Th>Received</Table.Th>
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
                <Table.Td>{e.customer}</Table.Td>
                <Table.Td>{e.invoice}</Table.Td>
                <Table.Td>{e.description}</Table.Td>
                <Table.Td>₹{e.saleAmount.toLocaleString()}</Table.Td>
                <Table.Td c="#0A6802">₹{e.received.toLocaleString()}</Table.Td>
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

        <Group justify="center" mt="md">
          <Pagination
            total={Math.ceil(filteredData.length / pageSize)}
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
