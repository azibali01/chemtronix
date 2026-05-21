import React, { createContext, useContext, useState } from "react";

export interface JournalVoucher {
  voucherNo: string;
  date: string;
  account: string;
  title: string;
  debit: number;
  credit: number;
  description: string;
}

type JournalVouchersContextType = {
  vouchers: JournalVoucher[];
  setVouchers: React.Dispatch<React.SetStateAction<JournalVoucher[]>>;
  addVoucher: (voucher: JournalVoucher) => void;
  updateVoucher: (voucher: JournalVoucher) => void;
  deleteVoucher: (voucherNo: string) => void;
};

const JournalVouchersContext = createContext<
  JournalVouchersContextType | undefined
>(undefined);

export const useJournalVouchers = () => {
  const context = useContext(JournalVouchersContext);
  if (!context)
    throw new Error(
      "useJournalVouchers must be used within JournalVouchersProvider"
    );
  return context;
};

export const JournalVouchersProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const [vouchers, setVouchers] = useState<JournalVoucher[]>([]);

  const addVoucher = (voucher: JournalVoucher) => {
    setVouchers((prev) => [...prev, voucher]);
  };

  const updateVoucher = (voucher: JournalVoucher) => {
    setVouchers((prev) =>
      prev.map((v) => (v.voucherNo === voucher.voucherNo ? voucher : v))
    );
  };

  const deleteVoucher = (voucherNo: string) => {
    setVouchers((prev) => prev.filter((v) => v.voucherNo !== voucherNo));
  };

  return (
    <JournalVouchersContext.Provider
      value={{
        vouchers,
        setVouchers,
        addVoucher,
        updateVoucher,
        deleteVoucher,
      }}
    >
      {children}
    </JournalVouchersContext.Provider>
  );
};
