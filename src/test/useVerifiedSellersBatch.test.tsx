import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

const supabaseMock = vi.hoisted(() => ({
  from: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: supabaseMock,
}));

function makeWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
}

describe("useVerifiedSellersBatch (PROMPT 7)", () => {
  beforeEach(() => {
    supabaseMock.from.mockReset();
  });

  it("ownerIds vide → query disabled (pas d'appel)", async () => {
    const { useVerifiedSellersBatch } = await import(
      "@/hooks/verification/useVerifiedSellersBatch"
    );
    const Wrapper = makeWrapper();
    renderHook(() => useVerifiedSellersBatch([]), { wrapper: Wrapper });
    // disabled → Supabase pas appelé
    expect(supabaseMock.from).not.toHaveBeenCalled();
  });

  it("retourne Set des user_id retournés par la VIEW", async () => {
    const inMock = vi.fn().mockResolvedValue({
      data: [{ user_id: "u1" }, { user_id: "u3" }],
      error: null,
    });
    const selectMock = vi.fn(() => ({ in: inMock }));
    supabaseMock.from.mockReturnValue({ select: selectMock });

    const { useVerifiedSellersBatch } = await import(
      "@/hooks/verification/useVerifiedSellersBatch"
    );
    const Wrapper = makeWrapper();
    const { result } = renderHook(() => useVerifiedSellersBatch(["u1", "u2", "u3"]), {
      wrapper: Wrapper,
    });

    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(result.current.data?.has("u1")).toBe(true);
    expect(result.current.data?.has("u2")).toBe(false);
    expect(result.current.data?.has("u3")).toBe(true);
  });
});
