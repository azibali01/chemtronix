import React, { createContext, useContext, useState } from "react";
import type { ReactNode } from "react";
type ReturnItem = {
  product: string;
  quantity: number;
  rate: number;
  amount: number;
  code: string;
  unit: string;
  discount?: number; // <-- Add this line
  netAmount?: number; // <-- Add this line
};

type ReturnEntry = {
  id: string;
  invoice: string;
  date: string;
  referenceNumber: string;
  referenceDate: string;
  amount: number;
  notes: string;
  items: ReturnItem[];
  supplierNumber: string;
  supplierTitle: string;
  purchaseAccount: string;
  purchaseTitle: string;
};

type PurchaseReturnsContextType = {
  returns: ReturnEntry[];
  setReturns: React.Dispatch<React.SetStateAction<ReturnEntry[]>>;
  selectedReturn: ReturnEntry | null;
  setSelectedReturn: React.Dispatch<React.SetStateAction<ReturnEntry | null>>;
};

const PurchaseReturnsContext = createContext<
  PurchaseReturnsContextType | undefined
>(undefined);

export const usePurchaseReturns = () => {
  const context = useContext(PurchaseReturnsContext);
  if (!context) {
    throw new Error(
      "usePurchaseReturns must be used within a PurchaseReturnsProvider"
    );
  }
  return context;
};

export const PurchaseReturnsProvider = ({
  children,
}: {
  children: ReactNode;
}) => {
  const [returns, setReturns] = useState<ReturnEntry[]>([]);
  const [selectedReturn, setSelectedReturn] = useState<ReturnEntry | null>(
    null
  );

  return (
    <PurchaseReturnsContext.Provider
      value={{
        returns,
        setReturns,
        selectedReturn,
        setSelectedReturn,
      }}
    >
      {children}
    </PurchaseReturnsContext.Provider>
  );
};
