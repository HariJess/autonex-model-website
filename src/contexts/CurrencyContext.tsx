import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { formatMGA, formatEUR, mgaToEur } from "@/config/currency";
import { AUTONEX_STORAGE_KEYS, LEGACY_IMMONEX_STORAGE_KEYS } from "@/lib/localStorageLegacyKeys";

type Currency = "MGA" | "EUR";

interface CurrencyContextType {
  currency: Currency;
  setCurrency: (c: Currency) => void;
  formatPrice: (mga: number) => string;
  formatPriceSecondary: (mga: number) => string;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

function readStoredCurrency(): Currency {
  try {
    if (typeof window === "undefined") return "MGA";
    let stored = window.localStorage.getItem(AUTONEX_STORAGE_KEYS.currency);
    if (!stored) {
      const legacy = window.localStorage.getItem(LEGACY_IMMONEX_STORAGE_KEYS.currency);
      if (legacy === "EUR" || legacy === "MGA") {
        stored = legacy;
        window.localStorage.setItem(AUTONEX_STORAGE_KEYS.currency, legacy);
        window.localStorage.removeItem(LEGACY_IMMONEX_STORAGE_KEYS.currency);
      }
    }
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
        window.localStorage.setItem(AUTONEX_STORAGE_KEYS.currency, currency);
        window.localStorage.removeItem(LEGACY_IMMONEX_STORAGE_KEYS.currency);
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
