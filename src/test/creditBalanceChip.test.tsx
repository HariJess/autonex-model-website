import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type { CreditBalanceSnapshot } from "@/features/credits/hooks/useCreditBalance";

/**
 * Tests pour CreditBalanceChip — affichage solde + tooltip + variants.
 * Mock le hook useCreditBalance pour contrôler le snapshot retourné.
 */

const mockSnapshot = vi.hoisted(() => ({
  current: null as CreditBalanceSnapshot | null,
}));

vi.mock("@/features/credits/hooks/useCreditBalance", () => ({
  useCreditBalance: (): CreditBalanceSnapshot => mockSnapshot.current!,
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (_key: string, fallback?: string | { defaultValue?: string }, opts?: Record<string, unknown>) => {
      const dv = typeof fallback === "string" ? fallback : fallback?.defaultValue ?? "";
      if (!opts) return dv;
      return Object.entries(opts).reduce<string>(
        (acc, [k, v]) => acc.replace(new RegExp(`{{${k}}}`, "g"), String(v)),
        dv,
      );
    },
  }),
}));

async function importChip() {
  return await import("@/features/credits/components/CreditBalanceChip");
}

describe("CreditBalanceChip", () => {
  beforeEach(() => {
    mockSnapshot.current = null;
  });

  it("affiche le solde formaté quand total > 0", async () => {
    mockSnapshot.current = {
      total: 127_500,
      paid: 27_500,
      granted: 100_000,
      grantedReceived: 100_000,
      grantedExpiresAt: null,
      isLoading: false,
      error: null,
    };
    const { CreditBalanceChip } = await importChip();
    render(
      <MemoryRouter>
        <CreditBalanceChip />
      </MemoryRouter>,
    );
    // Format fr-MG : 127 500 (espace fine ou normale selon version Node)
    expect(screen.getByText(/127.?500/)).toBeInTheDocument();
  });

  it("variant 'Recharger' si total === 0", async () => {
    mockSnapshot.current = {
      total: 0,
      paid: 0,
      granted: 0,
      grantedReceived: 0,
      grantedExpiresAt: null,
      isLoading: false,
      error: null,
    };
    const { CreditBalanceChip } = await importChip();
    render(
      <MemoryRouter>
        <CreditBalanceChip />
      </MemoryRouter>,
    );
    expect(screen.getByText(/Recharger/i)).toBeInTheDocument();
  });

  it("affiche un skeleton pendant le chargement", async () => {
    mockSnapshot.current = {
      total: 0,
      paid: 0,
      granted: 0,
      grantedReceived: 0,
      grantedExpiresAt: null,
      isLoading: true,
      error: null,
    };
    const { CreditBalanceChip } = await importChip();
    const { container } = render(
      <MemoryRouter>
        <CreditBalanceChip />
      </MemoryRouter>,
    );
    expect(container.querySelector(".animate-pulse")).not.toBeNull();
  });

  it("link cible /credits", async () => {
    mockSnapshot.current = {
      total: 100,
      paid: 100,
      granted: 0,
      grantedReceived: 0,
      grantedExpiresAt: null,
      isLoading: false,
      error: null,
    };
    const { CreditBalanceChip } = await importChip();
    const { container } = render(
      <MemoryRouter>
        <CreditBalanceChip />
      </MemoryRouter>,
    );
    const link = container.querySelector("a[href='/credits']");
    expect(link).not.toBeNull();
  });
});
