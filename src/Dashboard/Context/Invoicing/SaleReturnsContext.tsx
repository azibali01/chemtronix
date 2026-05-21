import React, { createContext, useContext, useState } from "react";

export type SaleReturnItem = {
  code: string;
  productName: string;
  description: string;
  unit: string;
  quantity: number;
  rate: number;
  amount: number;
  discount?: number; // <-- Add this line
  netAmount?: number; // <-- Add this line
};

export type SaleReturn = {
  number: string;
  accountTitle: string; // Replace 'any' with 'string' or a specific type
  amount: number;
  id: string;
  date: string;
  customer: string;
  customerTitle: string;
  saleAccount: string;
  saleTitle: string;
  salesman: string;
  items: SaleReturnItem[];
  notes?: string; // <-- Add this line
};

type SaleReturnsContextType = {
  returns: SaleReturn[];
  setReturns: React.Dispatch<React.SetStateAction<SaleReturn[]>>;
  addReturn: (ret: SaleReturn) => void;
  updateReturn: (ret: SaleReturn) => void;
  deleteReturn: (id: string) => void;
};

const SaleReturnsContext = createContext<SaleReturnsContextType | undefined>(
  undefined
);

export const useSaleReturns = () => {
  const context = useContext(SaleReturnsContext);
  if (!context)
    throw new Error("useSaleReturns must be used within SaleReturnsProvider");
  return context;
};

export const SaleReturnsProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [returns, setReturns] = useState<SaleReturn[]>([]);

  const addReturn = (ret: SaleReturn) => {
    setReturns((prev) => [...prev, ret]);
  };

  const updateReturn = (ret: SaleReturn) => {
    setReturns((prev) => prev.map((r) => (r.id === ret.id ? ret : r)));
  };

  const deleteReturn = (id: string) => {
    setReturns((prev) => prev.filter((r) => r.id !== id));
  };

  return (
    <SaleReturnsContext.Provider
      value={{ returns, setReturns, addReturn, updateReturn, deleteReturn }}
    >
      {children}
    </SaleReturnsContext.Provider>
  );
};
