import { createContext, useContext, useState, type ReactNode } from "react";
import { formatMGA, formatEUR, mgaToEur } from "@/config/currency";

type Currency = "MGA" | "EUR";

interface CurrencyContextType {
  currency: Currency;
  setCurrency: (c: Currency) => void;
  formatPrice: (mga: number) => string;
  formatPriceSecondary: (mga: number) => string;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export const CurrencyProvider = ({ children }: { children: ReactNode }) => {
  const [currency, setCurrency] = useState<Currency>("MGA");

  const formatPrice = (mga: number) =>
    currency === "MGA" ? formatMGA(mga) : formatEUR(mgaToEur(mga));

  const formatPriceSecondary = (mga: number) =>
    currency === "MGA" ? formatEUR(mgaToEur(mga)) : formatMGA(mga);

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, formatPrice, formatPriceSecondary }}>
      {children}
    </CurrencyContext.Provider>
  );
};

export const useCurrency = () => {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error("useCurrency must be used within CurrencyProvider");
  return ctx;
};
