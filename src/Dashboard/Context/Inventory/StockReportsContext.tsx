import React, {
  createContext,
  useContext,
  useState,
  type ReactNode,
} from "react";

// Types for stock report items
export interface StockReportItem {
  id: string;
  productCode: string;
  productName: string;
  category: string;
  stock: number;
  minStock: number;
  unitPrice: number;
  lastUpdated: string;
}

export interface CategoryReportItem {
  category: string;
  totalStock: number;
  totalValue: number;
}

interface StockReportsContextType {
  lowStockReports: StockReportItem[];
  setLowStockReports: React.Dispatch<React.SetStateAction<StockReportItem[]>>;
  categoryReports: CategoryReportItem[];
  setCategoryReports: React.Dispatch<
    React.SetStateAction<CategoryReportItem[]>
  >;
  frequency: "Weekly" | "Monthly";
  setFrequency: (f: "Weekly" | "Monthly") => void;
  loading: boolean;
  setLoading: (l: boolean) => void;
  fetchReports: () => void;
  // Add all UI states from StockReports.tsx
  lowSearch: string;
  setLowSearch: (s: string) => void;
  catSearch: string;
  setCatSearch: (s: string) => void;
  lowPage: number;
  setLowPage: (n: number) => void;
  catPage: number;
  setCatPage: (n: number) => void;
  pageSize: number;
}

const StockReportsContext = createContext<StockReportsContextType | undefined>(
  undefined
);

export const StockReportsProvider = ({ children }: { children: ReactNode }) => {
  const [lowStockReports, setLowStockReports] = useState<StockReportItem[]>([]);
  const [categoryReports, setCategoryReports] = useState<CategoryReportItem[]>(
    []
  );
  const [frequency, setFrequency] = useState<"Weekly" | "Monthly">("Weekly");
  const [loading, setLoading] = useState(false);

  // UI states moved from StockReports.tsx
  const [lowSearch, setLowSearch] = useState("");
  const [catSearch, setCatSearch] = useState("");
  const [lowPage, setLowPage] = useState(1);
  const [catPage, setCatPage] = useState(1);
  const pageSize = 5;

  // Example fetch function (replace with actual API logic)
  const fetchReports = () => {
    setLoading(true);
    setTimeout(() => {
      // Dummy data for demonstration
      setLowStockReports([
        {
          id: "1",
          productCode: "101",
          productName: 'Filter Water 40"',
          category: "Chemicals",
          stock: 5,
          minStock: 10,
          unitPrice: 300,
          lastUpdated: "2025-09-17",
        },
      ]);
      setCategoryReports([
        {
          category: "Chemicals",
          totalStock: 50,
          totalValue: 15000,
        },
        {
          category: "Equipments",
          totalStock: 20,
          totalValue: 8000,
        },
      ]);
      setLoading(false);
    }, 1000);
  };

  return (
    <StockReportsContext.Provider
      value={{
        lowStockReports,
        setLowStockReports,
        categoryReports,
        setCategoryReports,
        frequency,
        setFrequency,
        loading,
        setLoading,
        fetchReports,
        lowSearch,
        setLowSearch,
        catSearch,
        setCatSearch,
        lowPage,
        setLowPage,
        catPage,
        setCatPage,
        pageSize,
      }}
    >
      {children}
    </StockReportsContext.Provider>
  );
};

export const useStockReports = () => {
  const context = useContext(StockReportsContext);
  if (!context) {
    throw new Error(
      "useStockReports must be used within a StockReportsProvider"
    );
  }
  return context;
};
