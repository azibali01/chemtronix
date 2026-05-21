/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState } from "react";
import type { ReactNode } from "react";
import api from "../../../api_configuration/api";
import { notifications } from "@mantine/notifications";

type InvoiceItem = {
  id: string;
  code: string; // <-- string, not number
  product: string;
  hsCode: string;
  description: string;
  qty: number;
  rate: number;
  exGSTRate: number;
  exGSTAmount: number;
};

type Invoice = {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  deliveryNumber?: string; // <-- changed
  deliveryDate?: string;
  poNumber?: string; // <-- changed
  poDate?: string;
  accountNumber?: string; // <-- changed
  accountTitle: string;
  saleAccount?: string;
  saleAccountTitle?: string;
  ntnNumber?: string; // <-- changed
  strnNumber?: string;
  amount: number;
  netAmount?: number;
  items?: InvoiceItem[];
  isChallanGenerated?: boolean;
};

type SalesInvoiceContextType = {
  invoices: Invoice[];
  setInvoices: React.Dispatch<React.SetStateAction<Invoice[]>>;
  selectedInvoice: Invoice | null;
  setSelectedInvoice: React.Dispatch<React.SetStateAction<Invoice | null>>;
  isLoading: boolean;
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
  search: (searchTerm: string) => Promise<void>;
};

const SalesInvoiceContext = createContext<SalesInvoiceContextType | undefined>(
  undefined,
);

export const SalesInvoiceProvider = ({ children }: { children: ReactNode }) => {
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
      const response = await api.get("/sale-invoice/search", {
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
    <SalesInvoiceContext.Provider
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
    </SalesInvoiceContext.Provider>
  );
};

export const useSalesInvoice = () => {
  const context = useContext(SalesInvoiceContext);
  if (!context) {
    throw new Error(
      "useSalesInvoice must be used within a SalesInvoiceProvider",
    );
  }
  return context;
};
