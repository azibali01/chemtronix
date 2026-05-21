import React, {
  createContext,
  useContext,
  useState,
  type ReactNode,
} from "react";
import api from "../../../api_configuration/api";
import { notifications } from "@mantine/notifications";

// Product type
export type Product = {
  id: string;
  code: string;
  productName: string;
  category: string;
  productDescription: string;
  quantity: number | "";
  openingQuantity: number;
  minimumStockLevel: number | "";
  unitPrice: number | "";
  costPrice: number | "";
  status: "active" | "inactive";
};
// Context value type
interface ProductsContextType {
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  categories: string[];
  setCategories: React.Dispatch<React.SetStateAction<string[]>>;
  query: string;
  setQuery: (q: string) => void;
  cat: string | null;
  setCat: (c: string | null) => void;
  statusFilter: "all" | "active" | "inactive";
  setStatusFilter: (s: "all" | "active" | "inactive") => void;
  page: number;
  setPage: (p: number) => void;
  opened: boolean;
  setOpened: (o: boolean) => void;
  editing: Product | null;
  setEditing: (p: Product | null) => void;
  delId: string | null;
  setDelId: (id: string | null) => void;
  catModal: boolean;
  setCatModal: (b: boolean) => void;
  productName: string;
  setProductName: (n: string) => void;
  code: string;
  setCode: (c: string) => void;
  category: string | null;
  setCategory: (c: string | null) => void;
  productDescription: string;
  setProductDescription: (d: string) => void;
  unitPrice: number | "";
  setUnitPrice: (v: number | "") => void;
  costPrice: number | "";
  setCostPrice: (v: number | "") => void;
  quantity: number | "";
  setQuantity: (v: number | "") => void;
  minimumStockLevel: number | "";
  setMinimumStockLevel: (v: number | "") => void;
  status: "active" | "inactive";
  setStatus: (s: "active" | "inactive") => void;
  newCategory: string;
  setNewCategory: (c: string) => void;
  loading: boolean;
  setLoading: (l: boolean) => void;
  search: (searchTerm: string) => Promise<void>;
}

const ProductsContext = createContext<ProductsContextType | undefined>(
  undefined,
);

export const ProductsProvider = ({ children }: { children: ReactNode }) => {
  // All states moved here
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([
    "Chemicals",
    "Equipments",
    "Service",
  ]);
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "inactive"
  >("all");
  const [page, setPage] = useState(1);
  const [opened, setOpened] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [delId, setDelId] = useState<string | null>(null);
  const [catModal, setCatModal] = useState(false);
  const [productName, setProductName] = useState("");
  const [code, setCode] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [productDescription, setProductDescription] = useState("");
  const [unitPrice, setUnitPrice] = useState<number | "">("");
  const [costPrice, setCostPrice] = useState<number | "">("");
  const [quantity, setQuantity] = useState<number | "">("");
  const [minimumStockLevel, setMinimumStockLevel] = useState<number | "">("");
  const [status, setStatus] = useState<"active" | "inactive">("active");
  const [newCategory, setNewCategory] = useState("");
  const [loading, setLoading] = useState(false);

  // Search method using new API endpoint
  const search = async (searchTerm: string): Promise<void> => {
    try {
      setLoading(true);
      if (!searchTerm.trim()) {
        return;
      }
      const response = await api.get("/products/search", {
        params: { q: searchTerm },
      });
      setProducts(response.data);
      setPage(1);
    } catch (error) {
      const err = error as { response?: { data?: { message?: string } } };
      const errorMsg =
        err.response?.data?.message || "Failed to search products";
      notifications.show({
        title: "Search Error",
        message: errorMsg,
        color: "red",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <ProductsContext.Provider
      value={{
        products,
        setProducts,
        categories,
        setCategories,
        query,
        setQuery,
        cat,
        setCat,
        statusFilter,
        setStatusFilter,
        page,
        setPage,
        opened,
        setOpened,
        editing,
        setEditing,
        delId,
        setDelId,
        catModal,
        setCatModal,
        productName,
        setProductName,
        code,
        setCode,
        category,
        setCategory,
        productDescription,
        setProductDescription,
        unitPrice,
        setUnitPrice,
        costPrice,
        setCostPrice,
        quantity,
        setQuantity,
        minimumStockLevel,
        setMinimumStockLevel,
        status,
        setStatus,
        newCategory,
        setNewCategory,
        loading,
        setLoading,
        search,
      }}
    >
      {children}
    </ProductsContext.Provider>
  );
};

export const useProducts = () => {
  const context = useContext(ProductsContext);
  if (!context) {
    throw new Error("useProducts must be used within a ProductsProvider");
  }
  return context;
};
