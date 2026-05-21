/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect } from "react";
import type { ReactNode } from "react";
import api from "../../api_configuration/api";

export type AccountType =
  | "1000-Assets"
  | "1100-Current-Assets"
  | "1110-Cash"
  | "1120-Bank Accounts"
  | "1130-Other Current Assets"
  | "1200-Fixed Assets"
  | "1300-Inventories"
  | "1400-Receivables"
  | "1410-Receivables Accounts"
  | "1500-Advances & Commissions"
  | "1510-Salesman Account"
  | "1220-Furniture & Fixtures"
  | "2000-Liabilities"
  | "2100-Capital"
  | "2200-Current Liabilities"
  | "2210-Purchase Party"
  | "2220-Advance Exp."
  | "2300-Other"
  | "2400-Salesman Account"
  | "2500-Bismillah"
  | "3100-Share Capital"
  | "2110-AccountsPayable"
  | "2120-AccuredExpenses"
  | "2200-Long-Term Liabilites"
  | "2210-Bank Loan"
  | "3000-Equity"
  | "3100-Owner's Equity"
  | "3200-Retained Earnings"
  | "4000-Revenue"
  | "4100-Sales Control Account"
  | "4110-Sales"
  | "4200-Service Revenue"
  | "5000-Expenses"
  | "5100-Operating Expenses"
  | "5110-Salaries"
  | "5120-Rent"
  | "5130-Utilities"
  | "5140-Depreciation"
  | "5100-Administrative Expenses"
  | "5200-Selling Expenses"
  | "5210-Advertising"
  | "5220-Sales Commission"
  | "5300-Financial Charges"
  | "5320-Interest Charges"
  | "5310-Bank Charges"
  | "5400-Other Charges"
  | "5500-Miscellaneous";

/* eslint-disable react-refresh/only-export-components */

// Types

export type AccountGroupType = "Group" | "Detail";
export type ParentAccount =
  | "Asset"
  | "Liability"
  | "Equity"
  | "Revenue"
  | "Expense";

export interface AccountNode {
  _id: string;
  code: string | number;
  name: string;
  selectedCode: string;
  selectedAccountType1?: string;
  selectedAccountType2?: string;
  accountCode: string;
  level: string;
  accountName: string;
  accountType: AccountType;
  parentAccount: ParentAccount | string;
  type: AccountGroupType;
  isParty: boolean;
  address?: string;
  phoneNo?: string;
  strn?: string;
  ntn?: string;
  icon?: ReactNode;
  children?: AccountNode[];
  openingBalance?: {
    debit: number;
    credit: number;
  };
}

interface ChartOfAccountsContextType {
  accounts: AccountNode[];
  setAccounts: React.Dispatch<React.SetStateAction<AccountNode[]>>;
  expanded: Record<string, boolean>;
  setExpanded: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
}

const ChartOfAccountsContext = createContext<
  ChartOfAccountsContextType | undefined
>(undefined);

export const useChartOfAccounts = () => {
  const context = useContext(ChartOfAccountsContext);
  if (!context)
    throw new Error(
      "useChartOfAccounts must be used within ChartOfAccountsProvider",
    );
  return context;
};

export const ChartOfAccountsProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [accounts, setAccounts] = useState<AccountNode[]>([]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        const res = await api.get("/chart-of-account");
        console.log("API response:", res.data);

        if (Array.isArray(res.data)) {
          setAccounts(res.data);
        } else {
          console.warn("Unexpected API shape:", res.data);
        }

        const data = Array.isArray(res.data)
          ? res.data
          : Array.isArray(res.data?.data)
            ? res.data.data
            : [];

        setAccounts(data);
      } catch (err) {
        console.error("Failed to fetch accounts:", err);
        setAccounts([]);
      }
    };

    fetchAccounts();
  }, []);

  return (
    <ChartOfAccountsContext.Provider
      value={{ accounts, setAccounts, expanded, setExpanded }}
    >
      {children}
    </ChartOfAccountsContext.Provider>
  );
};
