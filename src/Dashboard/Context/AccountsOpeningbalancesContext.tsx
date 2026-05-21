import React, { createContext, useContext, useState, useEffect } from "react";
import type { ReactNode } from "react";

// Define the shape of the context value

interface AccountsOpeningBalancesContextType {
  balances: Record<string, { debit: number; credit: number }>;
  setBalances: React.Dispatch<
    React.SetStateAction<Record<string, { debit: number; credit: number }>>
  >;
  loading: boolean;
  setLoading: React.Dispatch<React.SetStateAction<boolean>>;
}

// Create the context
const AccountsOpeningBalancesContext = createContext<
  AccountsOpeningBalancesContextType | undefined
>(undefined);

const STORAGE_KEY = "accountsOpeningBalances";

// Provider component
export const AccountsOpeningBalancesProvider = ({
  children,
}: {
  children: ReactNode;
}) => {
  // Load from localStorage on initial mount
  const [balances, setBalances] = useState<
    Record<string, { debit: number; credit: number }>
  >(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  const [loading, setLoading] = useState(false);

  // Save to localStorage whenever balances change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(balances));
    } catch (error) {
      console.error("Failed to save balances to localStorage:", error);
    }
  }, [balances]);

  const value: AccountsOpeningBalancesContextType = {
    balances,
    setBalances,
    loading,
    setLoading,
  };

  return (
    <AccountsOpeningBalancesContext.Provider value={value}>
      {children}
    </AccountsOpeningBalancesContext.Provider>
  );
};

// Custom hook for consuming the context
// Note: Fast Refresh warning is safe for context files and can be ignored for hooks/providers.
export function useAccountsOpeningBalances() {
  const context = useContext(AccountsOpeningBalancesContext);
  if (context === undefined) {
    throw new Error(
      "useAccountsOpeningBalances must be used within an AccountsOpeningBalancesProvider"
    );
  }
  return context;
}
