import React, { createContext, useContext, useState } from "react";
import type { ReactNode } from "react";
import api from "../../../api_configuration/api";
import { notifications } from "@mantine/notifications";

type Item = {
  id: number;
  code: number;
  hsCode: string; // <-- Add this line
  product: string;
  description: string;
  unit: string;
  qty: number;
  rate: number;
};

type Invoice = {
  id: number;
  number: string;
  date: string;
  supplierNo?: string;
  supplierTitle?: string;
  purchaseAccount?: string;
  purchaseTitle?: string;
  items?: Item[];
  notes?: string;
  gst?: boolean;
  amount?: number;
  ntnNo?: string; // <-- Add this line
  partyBillNo?: string; // <-- Add this line
  partyBillDate?: string; // <-- Add this line
};

type PurchaseInvoiceContextType = {
  invoices: Invoice[];
  setInvoices: React.Dispatch<React.SetStateAction<Invoice[]>>;
  selectedInvoice: Invoice | null;
  setSelectedInvoice: React.Dispatch<React.SetStateAction<Invoice | null>>;
  isLoading: boolean;
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
  search: (searchTerm: string) => Promise<void>;
};

const PurchaseInvoiceContext = createContext<
  PurchaseInvoiceContextType | undefined
>(undefined);

export const PurchaseInvoiceProvider = ({
  children,
}: {
  children: ReactNode;
}) => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Search method using new API endpoint
  const search = async (searchTerm: string): Promise<void> => {
    try {
      setIsLoading(true);
      if (!searchTerm.trim()) {
        return;
      }
      const response = await api.get("/purchase-invoice/search", {
        params: { q: searchTerm },
      });
      setInvoices(response.data);
    } catch (error) {
      const err = error as { response?: { data?: { message?: string } } };
      const errorMsg =
        err.response?.data?.message || "Failed to search invoices";
      notifications.show({
        title: "Search Error",
        message: errorMsg,
        color: "red",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <PurchaseInvoiceContext.Provider
      value={{
        invoices,
        setInvoices,
        selectedInvoice,
        setSelectedInvoice,
        isLoading,
        setIsLoading,
        search,
      }}
    >
      {children}
    </PurchaseInvoiceContext.Provider>
  );
};

// Move this to a separate file if you want to share it between components
export const usePurchaseInvoice = () => {
  const context = useContext(PurchaseInvoiceContext);
  if (!context) {
    throw new Error(
      "usePurchaseInvoice must be used within a PurchaseInvoiceProvider",
    );
  }
  return context;
};
