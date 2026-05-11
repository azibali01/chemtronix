import React, { createContext, useContext, useState } from "react";

export type DeliveryItemCompany2 = {
  amount: number;
  sr: number;
  itemCode: string;
  particulars: string;
  unit: string;
  length: string;
  width: string;
  qty: string;
};

export type DeliveryChallanCompany2 = {
  id: string;
  poNo: string;
  poDate: string;
  partyName: string;
  partyAddress: string;
  date: string;
  deliveryDate: string;
  status: "Delivered" | "In Transit" | "Pending";
  items: DeliveryItemCompany2[];
};

type DeliveryChallanContextTypeCompany2 = {
  challans: DeliveryChallanCompany2[];
  setChallans: React.Dispatch<React.SetStateAction<DeliveryChallanCompany2[]>>;
  addChallan: (challan: DeliveryChallanCompany2) => void;
  updateChallan: (challan: DeliveryChallanCompany2) => void;
  deleteChallan: (id: string) => void;
};

const DeliveryChallanContextCompany2 = createContext<
  DeliveryChallanContextTypeCompany2 | undefined
>(undefined);

export const useDeliveryChallanCompany2 = () => {
  const context = useContext(DeliveryChallanContextCompany2);
  if (!context)
    throw new Error(
      "useDeliveryChallanCompany2 must be used within DeliveryChallanProviderCompany2"
    );
  return context;
};

export const DeliveryChallanProviderCompany2: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const [challans, setChallans] = useState<DeliveryChallanCompany2[]>([]);

  const addChallan = (challan: DeliveryChallanCompany2) => {
    setChallans((prev) => [challan, ...prev]);
  };

  const updateChallan = (challan: DeliveryChallanCompany2) => {
    setChallans((prev) => prev.map((c) => (c.id === challan.id ? challan : c)));
  };

  const deleteChallan = (id: string) => {
    setChallans((prev) => prev.filter((c) => c.id !== id));
  };

  return (
    <DeliveryChallanContextCompany2.Provider
      value={{
        challans,
        setChallans,
        addChallan,
        updateChallan,
        deleteChallan,
      }}
    >
      {children}
    </DeliveryChallanContextCompany2.Provider>
  );
};
