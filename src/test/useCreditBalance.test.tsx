import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import type { User } from "@supabase/supabase-js";

/**
 * Tests pour useCreditBalance — snapshot riche du solde crédits.
 * Mock supabase.from + useAuth context pour isoler la logique d'agrégation.
 */

const userOf = (id: string): User =>
  ({ id, app_metadata: {}, user_metadata: {}, aud: "authenticated", created_at: "" } as User);

type LedgerRow = { delta: number; is_granted: boolean; granted_expires_at: string | null };

const mockState = vi.hoisted(() => {
  return {
    currentUser: null as User | null,
    ledgerRows: [] as LedgerRow[],
  };
});

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: mockState.currentUser }),
}));

vi.mock("@/integrations/supabase/client", () => {
  return {
    supabase: {
      from: vi.fn((table: string) => ({
        select: vi.fn(() => ({
          eq: vi.fn(async (_col: string, _val: string) => {
            if (table === "credits_ledger") {
              return { data: mockState.ledgerRows, error: null };
            }
            return { data: [], error: null };
          }),
        })),
      })),
      channel: vi.fn(() => ({
        on: vi.fn().mockReturnThis(),
        subscribe: vi.fn(() => ({})),
      })),
      removeChannel: vi.fn(),
    },
  };
});

// Lazy import APRÈS le mock setup
async function importHook() {
  return await import("@/features/credits/hooks/useCreditBalance");
}

function makeWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0, staleTime: 0 } },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe("useCreditBalance", () => {
  beforeEach(() => {
    mockState.currentUser = null;
    mockState.ledgerRows = [];
  });

  it("retourne le snapshot vide si pas authentifié", async () => {
    const { useCreditBalance } = await importHook();
    const { result } = renderHook(() => useCreditBalance(), { wrapper: makeWrapper() });
    expect(result.current.total).toBe(0);
    expect(result.current.paid).toBe(0);
    expect(result.current.granted).toBe(0);
    expect(result.current.grantedExpiresAt).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it("calcule total = SUM(delta) pour user authentifié", async () => {
    mockState.currentUser = userOf("u1");
    mockState.ledgerRows = [
      { delta: 100_000, is_granted: false, granted_expires_at: null },
      { delta: -25_000, is_granted: false, granted_expires_at: null },
      { delta: 50_000, is_granted: false, granted_expires_at: null },
    ];
    const { useCreditBalance } = await importHook();
    const { result } = renderHook(() => useCreditBalance(), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.total).toBe(125_000);
    expect(result.current.granted).toBe(0);
    expect(result.current.paid).toBe(125_000);
  });

  it("split granted / paid correctement (signup grant + paid pack)", async () => {
    mockState.currentUser = userOf("u2");
    const futureExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    mockState.ledgerRows = [
      // signup grant 100k actif
      { delta: 100_000, is_granted: true, granted_expires_at: futureExpiry },
      // pack acheté 27.5k
      { delta: 27_500, is_granted: false, granted_expires_at: null },
      // dépense 30k consommée FIFO depuis granted
      { delta: -30_000, is_granted: true, granted_expires_at: null },
    ];
    const { useCreditBalance } = await importHook();
    const { result } = renderHook(() => useCreditBalance(), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.total).toBe(97_500);
    expect(result.current.granted).toBe(70_000); // 100k - 30k consommé
    expect(result.current.paid).toBe(27_500);
    expect(result.current.grantedExpiresAt).toBe(futureExpiry);
  });

  it("PROMPT 4.3 : grantedReceived = sum des grants positifs actifs SANS soustraire consommations", async () => {
    mockState.currentUser = userOf("u4");
    const futureExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    mockState.ledgerRows = [
      // grant initial 100k
      { delta: 100_000, is_granted: true, granted_expires_at: futureExpiry },
      // dépense 15k consommée FIFO depuis granted
      { delta: -15_000, is_granted: true, granted_expires_at: null },
      // ajout pack payé 50k
      { delta: 50_000, is_granted: false, granted_expires_at: null },
    ];
    const { useCreditBalance } = await importHook();
    const { result } = renderHook(() => useCreditBalance(), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    // grantedReceived = 100k (initial), inchangé par les consommations
    expect(result.current.grantedReceived).toBe(100_000);
    // granted = 100k - 15k = 85k (ce qui reste après FIFO)
    expect(result.current.granted).toBe(85_000);
    expect(result.current.paid).toBe(50_000);
    expect(result.current.total).toBe(135_000);
  });

  it("ignore les grants expirés dans granted_available", async () => {
    mockState.currentUser = userOf("u3");
    const pastExpiry = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const futureExpiry = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString();
    mockState.ledgerRows = [
      // grant expiré 50k
      { delta: 50_000, is_granted: true, granted_expires_at: pastExpiry },
      // grant actif 30k
      { delta: 30_000, is_granted: true, granted_expires_at: futureExpiry },
      // pack 20k
      { delta: 20_000, is_granted: false, granted_expires_at: null },
    ];
    const { useCreditBalance } = await importHook();
    const { result } = renderHook(() => useCreditBalance(), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.total).toBe(100_000);
    expect(result.current.granted).toBe(30_000); // seul le grant actif compte
    expect(result.current.paid).toBe(70_000); // total - granted_active
    expect(result.current.grantedExpiresAt).toBe(futureExpiry);
  });
});
