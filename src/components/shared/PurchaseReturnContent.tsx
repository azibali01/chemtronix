import React from "react";
import { Table, Group, Stack } from "@mantine/core";

export interface PurchaseReturnPrintData {
  id: string;
  invoice: string;
  date: string;
  referenceNumber: string;
  referenceDate: string;
  supplierNumber: string;
  supplierTitle: string;
  purchaseAccount: string;
  purchaseTitle: string;
  items: {
    code: string;
    product: string;
    unit: string;
    quantity: number;
    rate: number;
    amount: number;
    discount: number;
    netAmount: number;
  }[];
  notes: string;
  amount: number;
}

interface PurchaseReturnContentProps {
  data: PurchaseReturnPrintData;
}

/**
 * PurchaseReturnContent Component
 *
 * Renders the printable purchase return content.
 * Used by PrintLayout to display the actual document details.
 *
 * This component is responsible only for rendering the content,
 * not for managing print logic or window operations.
 */
export const PurchaseReturnContent: React.FC<PurchaseReturnContentProps> = ({
  data,
}) => {
  const subtotal = data.items.reduce((s, it) => s + (it.amount || 0), 0);
  const netTotal = data.items.reduce((s, it) => s + (it.netAmount || 0), 0);

  return (
    <>
      {/* Document Header Section */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: "12px",
          gap: "12px",
        }}
      >
        <div
          style={{
            border: "1px solid #222",
            padding: "8px",
            flex: 1,
          }}
        >
          <Stack gap="xs">
            <div>
              <strong>Supplier Title:</strong> {data.supplierTitle || ""}
            </div>
            <div>
              <strong>Supplier No:</strong> {data.supplierNumber || ""}
            </div>
            <div>
              <strong>Purchase Account:</strong> {data.purchaseAccount || ""}
            </div>
            <div>
              <strong>Purchase Title:</strong> {data.purchaseTitle || ""}
            </div>
          </Stack>
        </div>

        <div
          style={{
            width: "320px",
            border: "1px solid #222",
            padding: "8px",
          }}
        >
          <Stack gap="xs">
            <div>
              <strong>Return No:</strong> {data.invoice || data.id || ""}
            </div>
            <div>
              <strong>Date:</strong> {data.date || ""}
            </div>
            <div>
              <strong>Reference No:</strong> {data.referenceNumber || ""}
            </div>
            <div>
              <strong>Reference Date:</strong> {data.referenceDate || ""}
            </div>
          </Stack>
        </div>
      </div>

      {/* Items Table */}
      <Table striped highlightOnHover withColumnBorders>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>SR No</Table.Th>
            <Table.Th>Code</Table.Th>
            <Table.Th>Product</Table.Th>
            <Table.Th>Unit</Table.Th>
            <Table.Th>Quantity</Table.Th>
            <Table.Th>Rate</Table.Th>
            <Table.Th>Amount</Table.Th>
            <Table.Th>Discount %</Table.Th>
            <Table.Th>Net Amount</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {data.items.map((item, idx) => (
            <Table.Tr key={idx}>
              <Table.Td>{idx + 1}</Table.Td>
              <Table.Td>{item.code}</Table.Td>
              <Table.Td>{item.product}</Table.Td>
              <Table.Td>{item.unit}</Table.Td>
              <Table.Td>{item.quantity.toFixed(2)}</Table.Td>
              <Table.Td>{item.rate.toFixed(2)}</Table.Td>
              <Table.Td>{item.amount.toFixed(2)}</Table.Td>
              <Table.Td>{item.discount || 0}%</Table.Td>
              <Table.Td>{item.netAmount.toFixed(2)}</Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>

      {/* Totals Section */}
      <Group justify="flex-end" mt="md" mb="md">
        <div
          style={{
            width: "360px",
            border: "1px solid #222",
            padding: "12px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <div>Gross Total:</div>
            <div>{subtotal.toFixed(2)}</div>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <div>Discount:</div>
            <div>{(subtotal - netTotal).toFixed(2)}</div>
          </div>
          <hr />
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontWeight: "bold",
            }}
          >
            <div>Net Total:</div>
            <div>{netTotal.toFixed(2)}</div>
          </div>
        </div>
      </Group>

      {/* Notes Section */}
      {data.notes && (
        <div style={{ marginTop: "12px", fontSize: "12px" }}>
          <strong>Notes:</strong> {data.notes}
        </div>
      )}

      {/* Print Footer Text */}
      <div style={{ marginTop: "8px", fontSize: "12px", color: "#666" }}>
        *Computer generated invoice. No need for signature
      </div>
    </>
  );
};

export default PurchaseReturnContent;
