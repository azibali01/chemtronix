import React, { createContext, useContext, useEffect, useState } from "react";

export type BrandType = "chemtronics" | "hydroworx";

interface BrandContextType {
  brand: BrandType;
  setBrand: (brand: BrandType) => void;
}

const BrandContext = createContext<BrandContextType | undefined>(undefined);

export const BrandProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [brand, setBrand] = useState<BrandType>(() => {
    return (localStorage.getItem("brand") as BrandType) || "chemtronics";
  });

  useEffect(() => {
    localStorage.setItem("brand", brand);
  }, [brand]);

  return (
    <BrandContext.Provider value={{ brand, setBrand }}>
      {children}
    </BrandContext.Provider>
  );
};

export const useBrand = (): BrandContextType => {
  const context = useContext(BrandContext);
  if (!context) {
    throw new Error("useBrand must be used within a BrandProvider");
  }
  return context;
};
