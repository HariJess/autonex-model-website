import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MarkSoldModal } from "@/features/listings/components/MarkSoldModal";
import type { MyListingRow } from "@/features/listings/hooks/useMyListings";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (_key: string, fallback?: string | { defaultValue?: string }) =>
      typeof fallback === "string" ? fallback : fallback?.defaultValue ?? "",
  }),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const rpcMock = vi.hoisted(() => ({ rpc: vi.fn(async () => ({ data: { ok: true }, error: null })) }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { rpc: rpcMock.rpc },
}));

const TEST_LISTING: MyListingRow = {
  id: "lst-2", title: "Honda CR-V", price_mga: 28_000_000, cover_url: null,
  ville: "Tana", type: null, status: "active",
  expires_at: new Date(Date.now() + 10 * 86_400_000).toISOString(),
  published_at: new Date(Date.now() - 5 * 86_400_000).toISOString(),
  sold_at: null, sold_price: null,
  views_count: 50, contact_count: 3, favorite_count: 5, renewal_count: 0,
  created_at: new Date().toISOString(),
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

function renderModal() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MarkSoldModal open={true} onOpenChange={vi.fn()} listing={TEST_LISTING} />
    </QueryClientProvider>,
  );
}

describe("MarkSoldModal", () => {
  beforeEach(() => {
    rpcMock.rpc.mockClear();
  });

  it("affiche le warning irréversible + preview listing", () => {
    renderModal();
    expect(screen.getByTestId("mark-sold-modal-warning").textContent).toMatch(/irréversible/i);
    const preview = screen.getByTestId("mark-sold-modal-listing-preview");
    expect(preview.textContent).toMatch(/Honda CR-V/);
  });

  it("champ prix optionnel → click Confirmer sans saisie → RPC avec price=null", async () => {
    renderModal();
    fireEvent.click(screen.getByTestId("mark-sold-modal-confirm"));
    await waitFor(() => {
      expect(rpcMock.rpc).toHaveBeenCalledWith("mark_listing_sold", {
        p_listing_id: "lst-2",
        p_sold_price: null,
      });
    });
  });

  it("saisie prix valide → RPC avec price parsé", async () => {
    renderModal();
    const input = screen.getByTestId("mark-sold-modal-price-input") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "27000000" } });
    fireEvent.click(screen.getByTestId("mark-sold-modal-confirm"));
    await waitFor(() => {
      expect(rpcMock.rpc).toHaveBeenCalledWith("mark_listing_sold", {
        p_listing_id: "lst-2",
        p_sold_price: 27_000_000,
      });
    });
  });

  // PROMPT 4.1 — Format temps réel via formatNumber (NBSP U+00A0).
  // L'ancien test "saisie négative → erreur" est obsolète : le nouveau
  // handler strip tous les non-digits, donc "-1000" devient "1000" sans
  // passer par un état d'erreur. Le bouton n'est jamais désactivé pour cause
  // de chiffres invalides (validation côté server via mark_listing_sold RPC).

  it("PROMPT 4.1 : tape '110000000' → display contient '110\\u00A0000\\u00A0000' formaté NBSP", async () => {
    renderModal();
    const input = screen.getByTestId("mark-sold-modal-price-input") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "110000000" } });
    // Vérifie le formatting NBSP ( ) entre les groupes de 3 chiffres
    expect(input.value).toBe("110\u00A0000\u00A0000");
    // Submit → RPC reçoit le number natif (pas la string formatée)
    fireEvent.click(screen.getByTestId("mark-sold-modal-confirm"));
    await waitFor(() => {
      expect(rpcMock.rpc).toHaveBeenCalledWith("mark_listing_sold", {
        p_listing_id: "lst-2",
        p_sold_price: 110_000_000,
      });
    });
  });

  it("PROMPT 4.1 : copier-coller '110 000 000 Ar' → strip non-digits → display propre + RPC reçoit number", async () => {
    renderModal();
    const input = screen.getByTestId("mark-sold-modal-price-input") as HTMLInputElement;
    // Simule un copier-coller depuis une autre source (avec NBSP, espaces et " Ar")
    fireEvent.change(input, { target: { value: "110\u00A0000\u00A0000 Ar" } });
    // Le handler strip tout sauf les chiffres puis reformat
    expect(input.value).toBe("110\u00A0000\u00A0000");
    fireEvent.click(screen.getByTestId("mark-sold-modal-confirm"));
    await waitFor(() => {
      expect(rpcMock.rpc).toHaveBeenCalledWith("mark_listing_sold", {
        p_listing_id: "lst-2",
        p_sold_price: 110_000_000,
      });
    });
  });
});
