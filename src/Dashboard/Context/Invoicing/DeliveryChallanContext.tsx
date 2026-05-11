import React, { createContext, useContext, useState, useEffect } from "react";
import api from "../../../api_configuration/api";
import { notifications } from "@mantine/notifications";

export type DeliveryItem = {
  amount: number;
  sr: number;
  itemCode: string;
  particulars: string;
  unit: string;
  length: string;
  width: string;
  qty: string;
};

export type DeliveryChallan = {
  id: string;
  poNo: string;
  poDate: string;
  partyName: string;
  partyAddress: string;
  date: string;
  deliveryDate: string;
  status: "Delivered" | "In Transit" | "Pending";
  items: DeliveryItem[];
};

type DeliveryChallanContextType = {
  challans: DeliveryChallan[];
  isLoading: boolean;
  error: string | null;
  setChallans: React.Dispatch<React.SetStateAction<DeliveryChallan[]>>;
  addChallan: (challan: DeliveryChallan) => Promise<void>;
  updateChallan: (challan: DeliveryChallan) => Promise<void>;
  deleteChallan: (id: string) => Promise<void>;
  refetchChallans: () => Promise<void>;
  searchChallans: (term?: string, status?: string) => Promise<void>;
};

const DeliveryChallanContext = createContext<
  DeliveryChallanContextType | undefined
>(undefined);

export const useDeliveryChallan = () => {
  const context = useContext(DeliveryChallanContext);
  if (!context)
    throw new Error(
      "useDeliveryChallan must be used within DeliveryChallanProvider",
    );
  return context;
};

export const DeliveryChallanProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const [challans, setChallans] = useState<DeliveryChallan[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch all challans on mount
  const fetchChallans = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await api.get("/delivery-chalan");
      setChallans(response.data);
    } catch (err) {
      const error = err as { response?: { data?: { message?: string } } };
      const errorMsg =
        error.response?.data?.message || "Failed to fetch delivery challans";
      setError(errorMsg);
      notifications.show({
        title: "Error",
        message: errorMsg,
        color: "red",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchChallans();
  }, []);

  const addChallan = async (challan: DeliveryChallan) => {
    try {
      setError(null);
      const response = await api.post("/delivery-chalan", challan);

      if (response.status === 201) {
        setChallans((prev) => [response.data, ...prev]);
        notifications.show({
          title: "Success",
          message: "Delivery challan created successfully",
          color: "green",
        });
      }
    } catch (err) {
      const error = err as { response?: { data?: { message?: string } } };
      const errorMsg =
        error.response?.data?.message || "Failed to create delivery challan";
      setError(errorMsg);
      notifications.show({
        title: "Error",
        message: errorMsg,
        color: "red",
      });
      throw err;
    }
  };

  const updateChallan = async (challan: DeliveryChallan) => {
    try {
      setError(null);
      const response = await api.patch(
        `/delivery-chalan/${challan.id}`,
        challan,
      );

      setChallans((prev) =>
        prev.map((c) => (c.id === challan.id ? response.data : c)),
      );
      notifications.show({
        title: "Success",
        message: "Delivery challan updated successfully",
        color: "green",
      });
    } catch (err) {
      const error = err as { response?: { data?: { message?: string } } };
      const errorMsg =
        error.response?.data?.message || "Failed to update delivery challan";
      setError(errorMsg);
      notifications.show({
        title: "Error",
        message: errorMsg,
        color: "red",
      });
      throw err;
    }
  };

  const deleteChallan = async (id: string) => {
    try {
      setError(null);
      await api.delete(`/delivery-chalan/${id}`);

      setChallans((prev) => prev.filter((c) => c.id !== id));
      notifications.show({
        title: "Success",
        message: "Delivery challan deleted successfully",
        color: "green",
      });
    } catch (err) {
      const error = err as { response?: { data?: { message?: string } } };
      const errorMsg =
        error.response?.data?.message || "Failed to delete delivery challan";
      setError(errorMsg);
      notifications.show({
        title: "Error",
        message: errorMsg,
        color: "red",
      });
      throw err;
    }
  };

  const searchChallans = async (term?: string, status?: string) => {
    try {
      setIsLoading(true);
      setError(null);

      const params: Record<string, string> = {};
      if (term && term.trim()) params.term = term.trim();
      if (status && status.trim()) params.status = status.trim();

      const response = await api.get("/delivery-chalan/search", { params });
      setChallans(response.data);
    } catch (err) {
      const error = err as { response?: { data?: { message?: string } } };
      const errorMsg =
        error.response?.data?.message || "Failed to search delivery challans";
      setError(errorMsg);
      notifications.show({
        title: "Error",
        message: errorMsg,
        color: "red",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <DeliveryChallanContext.Provider
      value={{
        challans,
        isLoading,
        error,
        setChallans,
        addChallan,
        updateChallan,
        deleteChallan,
        refetchChallans: fetchChallans,
        searchChallans,
      }}
    >
      {children}
    </DeliveryChallanContext.Provider>
  );
};
