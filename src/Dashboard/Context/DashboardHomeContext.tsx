import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import type { ReactNode } from "react";
import api from "../../api_configuration/api";
import { useBrand } from "./BrandContext";

export interface TopProduct {
  code: number;
  productName: string;
  totalRevenue: number;
  totalQtySold: number;
}

export interface LowStockProduct {
  code: number;
  productName: string;
  quantity: number;
  minimumStockLevel: number;
}

export interface MonthlySales {
  month: string;
  total: number;
}

export interface DashboardStats {
  currentMonthSales: number;
  lastMonthSales: number;
  totalReceivables: number;
  totalPayables: number;
  topProducts: TopProduct[];
  lowStockProducts: LowStockProduct[];
  monthlySalesTrend: MonthlySales[];
}

interface DashboardHomeContextType {
  stats: DashboardStats;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

const defaultStats: DashboardStats = {
  currentMonthSales: 0,
  lastMonthSales: 0,
  totalReceivables: 0,
  totalPayables: 0,
  topProducts: [],
  lowStockProducts: [],
  monthlySalesTrend: [],
};

const DashboardHomeContext = createContext<
  DashboardHomeContextType | undefined
>(undefined);

export const useDashboardHome = () => {
  const context = useContext(DashboardHomeContext);
  if (!context)
    throw new Error(
      "useDashboardHome must be used within DashboardHomeProvider",
    );
  return context;
};

export const DashboardHomeProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [stats, setStats] = useState<DashboardStats>(defaultStats);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { brand } = useBrand();

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get("/reports/dashboard-stats");
      setStats(res.data);
    } catch (err: any) {
      setError(
        err?.response?.data?.message ?? "Failed to load dashboard stats",
      );
    } finally {
      setLoading(false);
    }
  }, [brand]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return (
    <DashboardHomeContext.Provider
      value={{ stats, loading, error, refetch: fetchStats }}
    >
      {children}
    </DashboardHomeContext.Provider>
  );
};
