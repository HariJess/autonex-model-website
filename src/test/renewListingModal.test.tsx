import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { CreditBalanceSnapshot } from "@/features/credits/hooks/useCreditBalance";
import { RenewListingModal } from "@/features/listings/components/RenewListingModal";
import type { MyListingRow } from "@/features/listings/hooks/useMyListings";

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

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const balanceState = vi.hoisted(() => ({
  current: { total: 100_000, paid: 0, granted: 100_000, grantedExpiresAt: null, isLoading: false, error: null } as CreditBalanceSnapshot,
}));

vi.mock("@/features/credits/hooks/useCreditBalance", () => ({
  useCreditBalance: () => balanceState.current,
}));

const rpcMock = vi.hoisted(() => ({ rpc: vi.fn(async () => ({ data: { ok: true }, error: null })) }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { rpc: rpcMock.rpc },
}));

const TEST_LISTING: MyListingRow = {
  id: "lst-1", title: "Toyota RAV4", price_mga: 35_000_000, cover_url: null,
  ville: "Antananarivo", type: null, status: "expired",
  expires_at: new Date(Date.now() - 86_400_000).toISOString(),
  published_at: new Date(Date.now() - 31 * 86_400_000).toISOString(),
  sold_at: null, sold_price: null,
  views_count: 247, contact_count: 8, favorite_count: 14, renewal_count: 0,
  created_at: new Date(Date.now() - 31 * 86_400_000).toISOString(),
  updated_at: new Date().toISOString(),
  transaction: "vente",
  last_bumped_at: null,
  featured_until: null,
  top_ad_until: null,
  deal_active: null,
  deal_discount_percent: null,
  deal_ends_at: null,
  deal_original_price_mga: null,
};

function renderModal(listing: MyListingRow | null = TEST_LISTING) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <MemoryRouter>
      <QueryClientProvider client={qc}>
        <RenewListingModal open={true} onOpenChange={vi.fn()} listing={listing} />
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

describe("RenewListingModal", () => {
  beforeEach(() => {
    rpcMock.rpc.mockClear();
    balanceState.current = {
      total: 100_000, paid: 0, granted: 100_000, grantedReceived: 100_000, grantedExpiresAt: null,
      isLoading: false, error: null,
    };
  });

  it("affiche coût (15 000) + solde actuel + solde après", () => {
    renderModal();
    expect(screen.getByTestId("renew-modal-cost").textContent).toMatch(/15/);
    expect(screen.getByTestId("renew-modal-balance-current").textContent).toMatch(/100/);
    expect(screen.getByTestId("renew-modal-balance-after").textContent).toMatch(/85/);
  });

  it("solde insuffisant : bouton désactivé + message + lien Recharger", () => {
    balanceState.current = {
      total: 5_000, paid: 0, granted: 5_000, grantedReceived: 5_000, grantedExpiresAt: null,
      isLoading: false, error: null,
    };
    renderModal();
    expect(screen.getByTestId("renew-modal-insufficient")).toBeTruthy();
    const confirmBtn = screen.getByTestId("renew-modal-confirm") as HTMLButtonElement;
    expect(confirmBtn.disabled).toBe(true);
  });

  it("solde suffisant : bouton actif", () => {
    renderModal();
    const confirmBtn = screen.getByTestId("renew-modal-confirm") as HTMLButtonElement;
    expect(confirmBtn.disabled).toBe(false);
  });

  it("click Confirmer → appel RPC renew_listing avec le bon listing_id", async () => {
    renderModal();
    fireEvent.click(screen.getByTestId("renew-modal-confirm"));
    await waitFor(() => {
      expect(rpcMock.rpc).toHaveBeenCalledWith("renew_listing", { p_listing_id: "lst-1" });
    });
  });
});
