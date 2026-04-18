import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, act, fireEvent } from "@testing-library/react";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import type { Session, User } from "@supabase/supabase-js";

function userOf(id: string): User {
  return {
    id,
    app_metadata: {},
    user_metadata: {},
    aud: "authenticated",
    created_at: "",
  } as User;
}

function sessionFor(userId: string): Session {
  return {
    access_token: "t",
    refresh_token: "r",
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    token_type: "bearer",
    user: userOf(userId),
  } as Session;
}

const mockSupabase = vi.hoisted(() => {
  let getSessionImpl = async () => ({ data: { session: null as Session | null } });
  const maybeSingleByUserId = vi.fn();

  const fromImpl = vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn((_col: string, userId: string) => ({
        maybeSingle: () => maybeSingleByUserId(userId),
      })),
    })),
  }));

  let authCallback: ((event: string, session: Session | null) => void) | null = null;

  return {
    getSessionImplAccessor: {
      set(fn: typeof getSessionImpl) {
        getSessionImpl = fn;
      },
    },
    maybeSingleByUserId,
    fromImpl,
    authCallbackAccessor: {
      get: () => authCallback,
      emit: (event: string, session: Session | null) => {
        authCallback?.(event, session);
      },
      /** Runs listener registration synchronously like Supabase does */
      captureFrom: (cb: typeof authCallback) => {
        authCallback = cb;
      },
    },
    mockClient: {
      auth: {
        getSession: () => getSessionImpl(),
        onAuthStateChange: (cb: (event: string, session: Session | null) => void) => {
          authCallback = cb;
          return {
            data: {
              subscription: {
                unsubscribe: vi.fn(),
              },
            },
          };
        },
        signOut: vi.fn(async () => {}),
      },
      from: fromImpl,
    },
  };
});

vi.mock("@/integrations/supabase/client", () => ({
  supabase: mockSupabase.mockClient,
}));

function Probe() {
  const { user, profile, loading } = useAuth();
  return (
    <div>
      <span data-testid="loading">{loading ? "1" : "0"}</span>
      <span data-testid="user">{user?.id ?? ""}</span>
      <span data-testid="role">{profile?.role ?? ""}</span>
    </div>
  );
}

describe("AuthProvider", () => {
  beforeEach(() => {
    mockSupabase.maybeSingleByUserId.mockReset();
    mockSupabase.fromImpl.mockClear();
    mockSupabase.getSessionImplAccessor.set(async () => ({ data: { session: null } }));
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("bootstrap sans session : loading fini, pas d’utilisateur", async () => {
    mockSupabase.getSessionImplAccessor.set(async () => ({ data: { session: null } }));

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("loading").textContent).toBe("0");
    });
    expect(screen.getByTestId("user").textContent).toBe("");
    expect(screen.getByTestId("role").textContent).toBe("");
  });

  it("bootstrap avec session : charge le profil puis loading false", async () => {
    mockSupabase.getSessionImplAccessor.set(async () => ({
      data: { session: sessionFor("user-1") },
    }));
    mockSupabase.maybeSingleByUserId.mockImplementation(async (userId: string) => ({
      data:
        userId === "user-1"
          ? {
              id: userId,
              role: "particulier",
              full_name: "A",
              phone: null,
              agency_id: null,
            }
          : null,
      error: null,
    }));

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("loading").textContent).toBe("0");
    });
    expect(screen.getByTestId("user").textContent).toBe("user-1");
    expect(screen.getByTestId("role").textContent).toBe("particulier");
  });

  it("réponse profil async dans le désordre : le dernier utilisateur gagne", async () => {
    mockSupabase.getSessionImplAccessor.set(async () => ({
      data: { session: sessionFor("slow-user") },
    }));

    let resolveSlow: (v: { data: unknown; error: null }) => void;
    const slowPromise = new Promise<{ data: unknown; error: null }>((resolve) => {
      resolveSlow = resolve;
    });

    mockSupabase.maybeSingleByUserId.mockImplementation(async (userId: string) => {
      if (userId === "slow-user") {
        return slowPromise;
      }
      if (userId === "fast-user") {
        return {
          data: {
            id: userId,
            role: "agence",
            full_name: "Fast",
            phone: null,
            agency_id: null,
          },
          error: null,
        };
      }
      return { data: null, error: null };
    });

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(mockSupabase.maybeSingleByUserId).toHaveBeenCalledWith("slow-user");
    });

    await act(async () => {
      mockSupabase.authCallbackAccessor.emit("SIGNED_IN", sessionFor("fast-user"));
    });

    await waitFor(() => {
      expect(screen.getByTestId("user").textContent).toBe("fast-user");
      expect(screen.getByTestId("role").textContent).toBe("agence");
    });

    await act(async () => {
      resolveSlow!({
        data: {
          id: "slow-user",
          role: "particulier",
          full_name: "Slow",
          phone: null,
          agency_id: null,
        },
        error: null,
      });
    });

    await waitFor(() => {
      expect(screen.getByTestId("user").textContent).toBe("fast-user");
      expect(screen.getByTestId("role").textContent).toBe("agence");
    });
  });

  it("erreur fetch profil : profil vide, pas de boucle loading", async () => {
    mockSupabase.getSessionImplAccessor.set(async () => ({
      data: { session: sessionFor("user-err") },
    }));
    mockSupabase.maybeSingleByUserId.mockResolvedValue({
      data: null,
      error: { message: "boom", details: "", hint: "", code: "" },
    });

    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("loading").textContent).toBe("0");
    });
    expect(screen.getByTestId("user").textContent).toBe("user-err");
    expect(screen.getByTestId("role").textContent).toBe("");
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it("refreshProfile recharge le profil courant", async () => {
    mockSupabase.getSessionImplAccessor.set(async () => ({
      data: { session: sessionFor("user-refresh") },
    }));

    let version = 0;
    mockSupabase.maybeSingleByUserId.mockImplementation(async (userId: string) => {
      if (userId !== "user-refresh") return { data: null, error: null };
      version += 1;
      return {
        data: {
          id: userId,
          role: version === 1 ? "particulier" : "agence",
          full_name: "X",
          phone: null,
          agency_id: null,
        },
        error: null,
      };
    });

    function RefreshProbe() {
      const { profile, loading, refreshProfile } = useAuth();
      return (
        <div>
          <span data-testid="loading">{loading ? "1" : "0"}</span>
          <span data-testid="role">{profile?.role ?? ""}</span>
          <button type="button" onClick={() => void refreshProfile()}>
            refresh
          </button>
        </div>
      );
    }

    render(
      <AuthProvider>
        <RefreshProbe />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("loading").textContent).toBe("0");
    });
    expect(screen.getByTestId("role").textContent).toBe("particulier");

    fireEvent.click(screen.getByRole("button", { name: "refresh" }));

    await waitFor(() => {
      expect(screen.getByTestId("role").textContent).toBe("agence");
    });
  });
});
