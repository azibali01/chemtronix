"use client";
import { createContext, useContext, useState } from "react";
import type { ReactNode } from "react";
interface Company {
  name: string;
  address: string;
  email: string;
  phone: string;
  users: number;
  status: "active" | "inactive";
  created: string;
}

interface CompanyContextType {
  companies: Company[];
  addCompany: (company: Company) => void;
  updateCompany: (index: number, company: Company) => void;
  deleteCompany: (index: number) => void;
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined);

export const useCompanyContext = (): CompanyContextType => {
  const ctx = useContext(CompanyContext);
  if (!ctx) {
    throw new Error("useCompanyContext must be used inside CompanyProvider");
  }
  return ctx;
};


export const CompanyProvider = ({ children }: { children: ReactNode }) => {
  const [companies, setCompanies] = useState<Company[]>([]);

  const addCompany = (company: Company) => {
    setCompanies((prev) => [...prev, company]);
  };

  const updateCompany = (index: number, company: Company) => {
    setCompanies((prev) => prev.map((c, i) => (i === index ? company : c)));
  };

  const deleteCompany = (index: number) => {
    setCompanies((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <CompanyContext.Provider
      value={{ companies, addCompany, updateCompany, deleteCompany }}
    >
      {children}
    </CompanyContext.Provider>
  );
};
