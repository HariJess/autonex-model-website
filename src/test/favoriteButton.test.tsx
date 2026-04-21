import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const { mockAuthState, mockToast, mockNavigate, mockState } = vi.hoisted(() => ({
  mockAuthState: {
    user: { id: "user-1", email: "alice@example.com" } as { id: string; email: string } | null,
  },
  mockToast: { info: vi.fn(), success: vi.fn(), error: vi.fn() },
  mockNavigate: vi.fn(),
  mockState: {
    favoriteRows: [] as Array<{ listing_id: string }>,
    toggleCallCount: 0,
  },
}));

vi.mock("sonner", () => ({
  toast: Object.assign(vi.fn(), mockToast),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: mockAuthState.user }),
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: async () => ({ data: mockState.favoriteRows, error: null }),
      }),
    }),
    rpc: async () => {
      mockState.toggleCallCount += 1;
      return {
        data: [
          {
            fav_listing_id: "lst-1",
            fav_user_id: "user-1",
            fav_created_at: new Date().toISOString(),
            fav_is_favorite: true,
          },
        ],
        error: null,
      };
    },
  },
}));

import { FavoriteButton } from "@/components/FavoriteButton";

function renderButton(listingId = "lst-1") {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={["/annonce/lst-1"]}>
        <FavoriteButton listingId={listingId} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("FavoriteButton", () => {
  beforeEach(() => {
    mockState.favoriteRows = [];
    mockState.toggleCallCount = 0;
    mockAuthState.user = { id: "user-1", email: "alice@example.com" };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("renders with aria-pressed=false when the listing is not favorited", async () => {
    renderButton();
    const btn = screen.getByRole("button");
    expect(btn).toHaveAttribute("aria-pressed", "false");
    expect(btn).toHaveAttribute("aria-label", "favorites.button.addAria");
  });

  it("renders with aria-pressed=true when the listing is already favorited", async () => {
    mockState.favoriteRows = [{ listing_id: "lst-1" }];
    renderButton();
    await waitFor(() => {
      const btn = screen.getByRole("button");
      expect(btn).toHaveAttribute("aria-pressed", "true");
      expect(btn).toHaveAttribute("aria-label", "favorites.button.removeAria");
    });
  });

  it("calls the toggle RPC when authenticated", async () => {
    renderButton();
    fireEvent.click(screen.getByRole("button"));
    await waitFor(() => expect(mockState.toggleCallCount).toBe(1));
    expect(mockToast.success).toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("redirects anonymous users to /login with the redirect param", async () => {
    mockAuthState.user = null;
    renderButton();
    fireEvent.click(screen.getByRole("button"));
    expect(mockState.toggleCallCount).toBe(0);
    expect(mockToast.info).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith(expect.stringMatching(/^\/login\?redirect=/));
  });
});
