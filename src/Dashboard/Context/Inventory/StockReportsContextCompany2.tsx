import React, {
  createContext,
  useContext,
  useState,
  type ReactNode,
} from "react";

// Types for stock report items
export interface StockReportItemCompany2 {
  id: string;
  productCode: string;
  productName: string;
  category: string;
  stock: number;
  minStock: number;
  unitPrice: number;
  lastUpdated: string;
}

export interface CategoryReportItemCompany2 {
  category: string;
  totalStock: number;
  totalValue: number;
}

interface StockReportsContextTypeCompany2 {
  lowStockReports: StockReportItemCompany2[];
  setLowStockReports: React.Dispatch<
    React.SetStateAction<StockReportItemCompany2[]>
  >;
  categoryReports: CategoryReportItemCompany2[];
  setCategoryReports: React.Dispatch<
    React.SetStateAction<CategoryReportItemCompany2[]>
  >;
  frequency: "Weekly" | "Monthly";
  setFrequency: (f: "Weekly" | "Monthly") => void;
  loading: boolean;
  setLoading: (l: boolean) => void;
  fetchReports: () => void;
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

const StockReportsContextCompany2 = createContext<
  StockReportsContextTypeCompany2 | undefined
>(undefined);

export const StockReportsProviderCompany2 = ({
  children,
}: {
  children: ReactNode;
}) => {
  const [lowStockReports, setLowStockReports] = useState<
    StockReportItemCompany2[]
  >([]);
  const [categoryReports, setCategoryReports] = useState<
    CategoryReportItemCompany2[]
  >([]);
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
          productCode: "201",
          productName: 'Hydroworx Filter 20"',
          category: "Water Treatment",
          stock: 8,
          minStock: 15,
          unitPrice: 400,
          lastUpdated: "2025-09-17",
        },
      ]);
      setCategoryReports([
        {
          category: "Water Treatment",
          totalStock: 80,
          totalValue: 32000,
        },
        {
          category: "Pumps",
          totalStock: 30,
          totalValue: 12000,
        },
      ]);
      setLoading(false);
    }, 1000);
  };

  return (
    <StockReportsContextCompany2.Provider
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
    </StockReportsContextCompany2.Provider>
  );
};

export const useStockReportsCompany2 = () => {
  const context = useContext(StockReportsContextCompany2);
  if (!context) {
    throw new Error(
      "useStockReportsCompany2 must be used within a StockReportsProviderCompany2"
    );
  }
  return context;
};
