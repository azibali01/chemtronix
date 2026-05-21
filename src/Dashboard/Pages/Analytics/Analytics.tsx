/* eslint-disable @typescript-eslint/no-explicit-any */
import { Card, Group, Button, Select, Tabs, Text } from "@mantine/core";
import { IconDownload } from "@tabler/icons-react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

const revenue = 510000;
const profit = 182000;
const gstSales = 328000;
const nonGstSales = 182000;

const salesAnalysis = [
  { month: "Jan", gst: 45000, nonGst: 22000 },
  { month: "Feb", gst: 52000, nonGst: 26000 },
  { month: "Mar", gst: 48000, nonGst: 31000 },
  { month: "Apr", gst: 61000, nonGst: 27000 },
  { month: "May", gst: 55000, nonGst: 35000 },
  { month: "Jun", gst: 67000, nonGst: 29000 },
];

const categoryData = [
  { label: "Electronics", value: 45, color: "#2196f3" },
  { label: "Furniture", value: 25, color: "#43a047" },
  { label: "Accessories", value: 20, color: "#ffb300" },
  { label: "Lighting", value: 10, color: "#ff7043" },
];

const stockMovement = [
  {
    product: "Wireless Headphones",
    inward: 50,
    outward: 35,
    balance: 45,
    status: "Good",
  },
  {
    product: "Office Chair",
    inward: 15,
    outward: 12,
    balance: 8,
    status: "Low",
  },
  {
    product: "Laptop Stand",
    inward: 25,
    outward: 22,
    balance: 3,
    status: "Critical",
  },
  {
    product: "Desk Lamp",
    inward: 40,
    outward: 15,
    balance: 25,
    status: "Good",
  },
  {
    product: "Wireless Mouse",
    inward: 30,
    outward: 28,
    balance: 2,
    status: "Critical",
  },
];

function getStatusColor(status: string) {
  if (status === "Good") return "#0A6802";
  if (status === "Low") return "#222";
  return "#d90429";
}

function exportPDF() {
  const doc = new jsPDF("p", "pt", "a4");
  doc.setFontSize(16);
  doc.text("Chemtronix Engineering Solutions", 40, 30);
  doc.setFontSize(14);
  doc.text("Reports & Analytics", 40, 55);

  // KPIs
  autoTable(doc, {
    startY: 70,
    head: [["Total Revenue", "Total Profit", "GST Sales", "Non-GST Sales"]],
    body: [
      [
        `$${revenue.toLocaleString()}`,
        `$${profit.toLocaleString()}`,
        `$${gstSales.toLocaleString()}`,
        `$${nonGstSales.toLocaleString()}`,
      ],
    ],
    theme: "grid",
    headStyles: { fillColor: [10, 104, 2] },
    styles: { fontSize: 11 },
    margin: { left: 40, right: 40 },
  });

  // Sales Analysis Table
  autoTable(doc, {
    startY: (doc as any).lastAutoTable.finalY + 20,
    head: [["Month", "GST Sales", "Non-GST Sales"]],
    body: salesAnalysis.map((row) => [
      row.month,
      `$${row.gst.toLocaleString()}`,
      `$${row.nonGst.toLocaleString()}`,
    ]),
    theme: "grid",
    headStyles: { fillColor: [10, 104, 2] },
    styles: { fontSize: 11 },
    margin: { left: 40, right: 40 },
  });

  // Category Table
  autoTable(doc, {
    startY: (doc as any).lastAutoTable.finalY + 20,
    head: [["Category", "Sales %"]],
    body: categoryData.map((cat) => [cat.label, `${cat.value}%`]),
    theme: "grid",
    headStyles: { fillColor: [10, 104, 2] },
    styles: { fontSize: 11 },
    margin: { left: 40, right: 40 },
  });

  // Stock Movement Table
  autoTable(doc, {
    startY: (doc as any).lastAutoTable.finalY + 20,
    head: [["Product", "Inward", "Outward", "Balance", "Status"]],
    body: stockMovement.map((row) => [
      row.product,
      row.inward,
      row.outward,
      row.balance,
      row.status,
    ]),
    theme: "grid",
    headStyles: { fillColor: [10, 104, 2] },
    styles: { fontSize: 11 },
    margin: { left: 40, right: 40 },
  });

  // Footer
  const currentDate = new Date().toLocaleDateString();
  const pageCount = doc.getNumberOfPages();
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Date: ${currentDate}`, 40, doc.internal.pageSize.height - 30);
  doc.text(
    `Page ${doc.getCurrentPageInfo().pageNumber} of ${pageCount}`,
    480,
    doc.internal.pageSize.height - 30
  );

  doc.save("analytics_report.pdf");
}

export default function Analytics() {
  return (
    <div>
      <Group justify="space-between" mb="md">
        <Text fw={700} fz={28}>
          Reports & Analytics
        </Text>
        <Group>
          <Select
            data={["Last Month", "Last Quarter", "Last Year"]}
            defaultValue="Last Month"
            style={{ minWidth: 120 }}
          />
          <Button
            variant="outline"
            leftSection={<IconDownload size={16} />}
            onClick={exportPDF}
          >
            Export PDF
          </Button>
          <Button color="green">Generate Report</Button>
        </Group>
      </Group>

      <Group mb="md" gap="md">
        <Card
          shadow="sm"
          radius="md"
          bg="#F1FCF0"
          style={{ flex: 1 }}
          withBorder
        >
          <Text fz="sm" c="dimmed">
            Total Revenue
          </Text>
          <Text fw={700} fz={32} mt={8}>
            ${revenue.toLocaleString()}
          </Text>
          <Text c="green" fz="sm">
            +12.5% from last period
          </Text>
        </Card>
        <Card
          shadow="sm"
          radius="md"
          bg="#F1FCF0"
          style={{ flex: 1 }}
          withBorder
        >
          <Text fz="sm" c="dimmed">
            Total Profit
          </Text>
          <Text fw={700} fz={32} mt={8}>
            ${profit.toLocaleString()}
          </Text>
          <Text c="green" fz="sm">
            +8.2% from last period
          </Text>
        </Card>
        <Card
          shadow="sm"
          radius="md"
          bg="#F1FCF0"
          style={{ flex: 1 }}
          withBorder
        >
          <Text fz="sm" c="dimmed">
            GST Sales
          </Text>
          <Text fw={700} fz={32} mt={8}>
            ${gstSales.toLocaleString()}
          </Text>
          <Text c="dimmed" fz="sm">
            64.3% of total sales
          </Text>
        </Card>
        <Card
          shadow="sm"
          radius="md"
          bg="#F1FCF0"
          style={{ flex: 1 }}
          withBorder
        >
          <Text fz="sm" c="dimmed">
            Non-GST Sales
          </Text>
          <Text fw={700} fz={32} mt={8}>
            ${nonGstSales.toLocaleString()}
          </Text>
          <Text c="dimmed" fz="sm">
            35.7% of total sales
          </Text>
        </Card>
      </Group>

      <Tabs defaultValue="Sales Analysis" mb="md">
        <Tabs.List>
          <Tabs.Tab value="Sales Analysis">Sales Analysis</Tabs.Tab>
          <Tabs.Tab value="Stock Movement">Stock Movement</Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel value="Sales Analysis">
          <Card shadow="sm" radius="md" bg="#F1FCF0" mt="md">
            <Text fw={600} mb={4}>
              Sales Analysis Report
            </Text>
            <Text c="dimmed" fz="sm" mb={8}>
              Monthly GST and Non-GST sales breakdown
            </Text>
            <div style={{ overflowX: "auto" }}>
              <table
                style={{
                  width: "100%",
                  background: "#F8FFF6",
                  borderRadius: 8,
                }}
              >
                <thead>
                  <tr>
                    <th style={{ textAlign: "left", padding: "8px 12px" }}>
                      Month
                    </th>
                    <th style={{ textAlign: "left", padding: "8px 12px" }}>
                      GST Sales
                    </th>
                    <th style={{ textAlign: "left", padding: "8px 12px" }}>
                      Non-GST Sales
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {salesAnalysis.map((row) => (
                    <tr key={row.month}>
                      <td style={{ padding: "8px 12px" }}>{row.month}</td>
                      <td style={{ padding: "8px 12px", color: "#0A6802" }}>
                        ${row.gst.toLocaleString()}
                      </td>
                      <td style={{ padding: "8px 12px", color: "#d90429" }}>
                        ${row.nonGst.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </Tabs.Panel>
        <Tabs.Panel value="Stock Movement">
          <Card shadow="sm" radius="md" bg="#F1FCF0" mt="md">
            <Text fw={600} mb={4}>
              Stock Movement Report
            </Text>
            <Text c="dimmed" fz="sm" mb={8}>
              Inward, outward, and balance stock for each product
            </Text>
            <div style={{ overflowX: "auto" }}>
              <table
                style={{
                  width: "100%",
                  background: "#F8FFF6",
                  borderRadius: 8,
                }}
              >
                <thead>
                  <tr>
                    <th
                      style={{
                        textAlign: "left",
                        padding: "8px 12px",
                      }}
                    >
                      Product
                    </th>
                    <th
                      style={{
                        textAlign: "left",
                        padding: "8px 12px",
                      }}
                    >
                      Inward
                    </th>
                    <th
                      style={{
                        textAlign: "left",
                        padding: "8px 12px",
                      }}
                    >
                      Outward
                    </th>
                    <th
                      style={{
                        textAlign: "left",
                        padding: "8px 12px",
                      }}
                    >
                      Balance
                    </th>
                    <th
                      style={{
                        textAlign: "left",
                        padding: "8px 12px",
                      }}
                    >
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {stockMovement.map((row) => (
                    <tr key={row.product}>
                      <td style={{ padding: "8px 12px" }}>{row.product}</td>
                      <td style={{ padding: "8px 12px", color: "#0A6802" }}>
                        <span style={{ marginRight: 4 }}>↗</span>
                        {row.inward}
                      </td>
                      <td style={{ padding: "8px 12px", color: "#d90429" }}>
                        <span style={{ marginRight: 4 }}>↘</span>
                        {row.outward}
                      </td>
                      <td style={{ padding: "8px 12px" }}>{row.balance}</td>
                      <td style={{ padding: "8px 12px" }}>
                        <span
                          style={{
                            background: getStatusColor(row.status),
                            color: "#fff",
                            borderRadius: 6,
                            padding: "2px 12px",
                            fontSize: 13,
                            fontWeight: 600,
                            display: "inline-block",
                          }}
                        >
                          {row.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </Tabs.Panel>
      </Tabs>
    </div>
  );
}
