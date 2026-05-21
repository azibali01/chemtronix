import React, { createContext, useContext, useState } from "react";

export type CreditSaleItemCompany2 = {
  code: string;
  productName: string;
  description: string;
  quantity: number;
  rate: number;
  amount: number;
  discount: number;
  netAmount: number;
};

export type CreditSaleCompany2 = {
  id: string;
  date: string;
  customer: string;
  customerTitle: string;
  saleAccount: string;
  saleTitle: string;
  salesman: string;
  items: CreditSaleItemCompany2[];
};

type CreditSalesContextTypeCompany2 = {
  sales: CreditSaleCompany2[];
  setSales: React.Dispatch<React.SetStateAction<CreditSaleCompany2[]>>;
  addSale: (sale: CreditSaleCompany2) => void;
  updateSale: (sale: CreditSaleCompany2) => void;
  deleteSale: (id: string) => void;
};

const CreditSalesContextCompany2 = createContext<
  CreditSalesContextTypeCompany2 | undefined
>(undefined);

export const useCreditSalesCompany2 = () => {
  const context = useContext(CreditSalesContextCompany2);
  if (!context)
    throw new Error(
      "useCreditSalesCompany2 must be used within CreditSalesProviderCompany2"
    );
  return context;
};

export const CreditSalesProviderCompany2: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const [sales, setSales] = useState<CreditSaleCompany2[]>([]);

  const addSale = (sale: CreditSaleCompany2) => {
    setSales((prev) => [...prev, sale]);
  };

  const updateSale = (sale: CreditSaleCompany2) => {
    setSales((prev) => prev.map((s) => (s.id === sale.id ? sale : s)));
  };

  const deleteSale = (id: string) => {
    setSales((prev) => prev.filter((s) => s.id !== id));
  };

  return (
    <CreditSalesContextCompany2.Provider
      value={{ sales, setSales, addSale, updateSale, deleteSale }}
    >
      {children}
    </CreditSalesContextCompany2.Provider>
  );
};
