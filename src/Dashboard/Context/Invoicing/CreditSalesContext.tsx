import React, { createContext, useContext, useState } from "react";

export type CreditSaleItem = {
  code: string;
  productName: string;
  description: string;
  quantity: number;
  rate: number;
  amount: number;
  discount: number;
  netAmount: number;
};

export type CreditSale = {
  id: string;
  date: string;
  customer: string;
  customerTitle: string;
  saleAccount: string;
  saleTitle: string;
  salesman: string;
  items: CreditSaleItem[];
};

type CreditSalesContextType = {
  sales: CreditSale[];
  setSales: React.Dispatch<React.SetStateAction<CreditSale[]>>;
  addSale: (sale: CreditSale) => void;
  updateSale: (sale: CreditSale) => void;
  deleteSale: (id: string) => void;
};

const CreditSalesContext = createContext<CreditSalesContextType | undefined>(
  undefined
);

export const useCreditSales = () => {
  const context = useContext(CreditSalesContext);
  if (!context)
    throw new Error("useCreditSales must be used within CreditSalesProvider");
  return context;
};

export const CreditSalesProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [sales, setSales] = useState<CreditSale[]>([]);

  const addSale = (sale: CreditSale) => {
    setSales((prev) => [...prev, sale]);
  };

  const updateSale = (sale: CreditSale) => {
    setSales((prev) => prev.map((s) => (s.id === sale.id ? sale : s)));
  };

  const deleteSale = (id: string) => {
    setSales((prev) => prev.filter((s) => s.id !== id));
  };

  return (
    <CreditSalesContext.Provider
      value={{ sales, setSales, addSale, updateSale, deleteSale }}
    >
      {children}
    </CreditSalesContext.Provider>
  );
};
