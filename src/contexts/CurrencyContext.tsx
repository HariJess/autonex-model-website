import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { formatMGA, formatEUR, mgaToEur } from "@/config/currency";

type Currency = "MGA" | "EUR";

interface CurrencyContextType {
  currency: Currency;
  setCurrency: (c: Currency) => void;
  formatPrice: (mga: number) => string;
  formatPriceSecondary: (mga: number) => string;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);
const CURRENCY_STORAGE_KEY = "immonex_currency";

function readStoredCurrency(): Currency {
  try {
    if (typeof window === "undefined") return "MGA";
    const stored = window.localStorage.getItem(CURRENCY_STORAGE_KEY);
    return stored === "EUR" || stored === "MGA" ? stored : "MGA";
  } catch {
    return "MGA";
  }
}

export const CurrencyProvider = ({ children }: { children: ReactNode }) => {
  const [currency, setCurrency] = useState<Currency>(() => readStoredCurrency());

  useEffect(() => {
    try {
      if (typeof window !== "undefined") {
        window.localStorage.setItem(CURRENCY_STORAGE_KEY, currency);
      }
    } catch {
      // Ignore storage write failures (private mode, blocked storage).
    }
  }, [currency]);

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
