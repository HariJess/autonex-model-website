import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

/**
 * HOTFIX 2 PROMPT 7 — VerificationFlow.handleClearUpload comportement :
 *   - reset state local (paths[docType] = null) → la dropzone redevient vide
 *   - tente storage.remove() en best-effort (graceful si throw)
 *   - reset input.value pour autoriser re-pick du même filename
 */

const removeMock = vi.hoisted(() => vi.fn());

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getSession: vi.fn(async () => ({
        data: { session: { user: { id: "user-1" } } },
        error: null,
      })),
    },
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn(async () => ({ data: { path: "p" }, error: null })),
        remove: removeMock,
      })),
    },
    from: vi.fn(),
  },
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: "user-1" } }),
}));

vi.mock("@/hooks/useCreditsBalance", () => ({
  useCreditsBalance: () => ({ data: 200_000, isPending: false }),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (
      _k: string,
      fallback?: string | { defaultValue?: string },
      opts?: Record<string, unknown>,
    ) => {
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
  toast: { error: vi.fn(), success: vi.fn() },
}));

// Light mock du hook submit pour ne pas le déclencher.
vi.mock("@/hooks/verification/useSubmitVerification", () => ({
  useSubmitVerification: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

function makeWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  );
}

async function renderFlow() {
  const { VerificationFlow } = await import(
    "@/components/verification/VerificationFlow"
  );
  const Wrapper = makeWrapper();
  return render(
    <Wrapper>
      <VerificationFlow />
    </Wrapper>,
  );
}

describe("VerificationFlow clear upload (HOTFIX 2)", () => {
  beforeEach(() => {
    removeMock.mockReset();
    if (typeof window !== "undefined") {
      window.localStorage.clear();
    }
  });

  it("après upload réussi puis clear : storage.remove appelé + state local reset", async () => {
    // Pre-seed un draft uploadé pour passer directement à l'état "uploaded"
    // sans passer par l'upload réel (testing du clear handler isolément).
    const sessionId = "sess-test";
    window.localStorage.setItem("autonex.verificationSessionId", sessionId);
    window.localStorage.setItem(
      "autonex.verificationDraft." + sessionId,
      JSON.stringify({
        paths: {
          cin_front: "user-1/sess-test/cin_front.jpg",
          cin_back: null,
          selfie: null,
        },
        metadata: { full_name: "", cin_number: "", date_of_birth: "" },
      }),
    );

    removeMock.mockResolvedValue({ data: [], error: null });

    await renderFlow();

    // Step intro initial. Click consent → Commencer pour aller au step cin_front.
    fireEvent.click(screen.getByTestId("verification-flow-consent"));
    fireEvent.click(screen.getByTestId("verification-flow-next"));

    // On est maintenant au step cin_front avec doc déjà uploadé (depuis draft).
    const clearBtn = await screen.findByTestId("verification-flow-clear-cin_front");
    expect(clearBtn).toBeTruthy();

    await act(async () => {
      fireEvent.click(clearBtn);
    });

    // storage.remove appelé avec le path du draft
    await waitFor(() => {
      expect(removeMock).toHaveBeenCalledWith(["user-1/sess-test/cin_front.jpg"]);
    });

    // Bouton clear disparaît (currentPath nullé)
    await waitFor(() => {
      expect(screen.queryByTestId("verification-flow-clear-cin_front")).toBeNull();
    });
  });

  it("storage.remove throw → state local reset quand même (graceful)", async () => {
    const sessionId = "sess-test-2";
    window.localStorage.setItem("autonex.verificationSessionId", sessionId);
    window.localStorage.setItem(
      "autonex.verificationDraft." + sessionId,
      JSON.stringify({
        paths: {
          cin_front: "user-1/sess-test-2/cin_front.jpg",
          cin_back: null,
          selfie: null,
        },
        metadata: { full_name: "", cin_number: "", date_of_birth: "" },
      }),
    );

    removeMock.mockRejectedValue(new Error("RLS denied"));

    await renderFlow();

    fireEvent.click(screen.getByTestId("verification-flow-consent"));
    fireEvent.click(screen.getByTestId("verification-flow-next"));

    const clearBtn = await screen.findByTestId("verification-flow-clear-cin_front");

    await act(async () => {
      fireEvent.click(clearBtn);
    });

    // Bouton clear disparaît même si remove a throw → graceful degradation
    await waitFor(() => {
      expect(screen.queryByTestId("verification-flow-clear-cin_front")).toBeNull();
    });
    expect(removeMock).toHaveBeenCalled();
  });
});
