/**
 * Anti-régression Sentry issue ee5c93534c2a4a808aa06838962a2c77 (Lot 10.1 hotfix #2).
 *
 * Bug prod : sur /notifications, le useEffect Realtime plantait avec
 *   « Error: cannot add postgres_changes callbacks after subscribe() »
 * Cause : le nom de channel déterministe (`notifications:${userId}`) entrait
 * en collision avec le registre interne supabase-js au remount ; l'appel
 * `.on()` sur un channel déjà-subscribed throw synchronement → l'erreur
 * remonte à l'ErrorBoundary global.
 *
 * Fix couvert par les tests ci-dessous :
 *  1. Nom de channel unique par montage (`…:${Date.now()}`) — le mock du
 *     registre ci-dessous refait matcher ce comportement.
 *  2. try/catch défensif autour de `.on().subscribe()`.
 *  3. Cleanup `removeChannel` appelé au unmount.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// useNotifications utilise désormais @tanstack/react-query (useQuery + useMutation).
// renderHook(...) sans QueryClientProvider ancestral throw « No QueryClient set ».
// Wrapper avec QueryClient frais par test pour préserver l'isolation.
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });
  return ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);
}

const { mockAuthState, mockState } = vi.hoisted(() => ({
  mockAuthState: {
    user: { id: "user-1", email: "alice@example.com" } as null | { id: string; email: string },
  },
  mockState: {
    // Registre interne simulant supabase-js : même nom = même channel, et
    // appeler `.on()` sur un channel déjà-subscribed throw (reproduit le
    // bug Sentry).
    registry: new Map<string, { subscribed: boolean }>(),
    createdChannelNames: [] as string[],
    removedChannelNames: [] as string[],
    fromCalls: [] as string[],
    forceOnThrow: false,
  },
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: mockAuthState.user }),
}));

vi.mock("@/integrations/supabase/client", () => {
  const MARKER = Symbol("supabase-self");
  type SupabaseMock = {
    [k: symbol]: unknown;
    from: (this: SupabaseMock | undefined, table: string) => unknown;
    channel: (this: SupabaseMock | undefined, name: string) => unknown;
    removeChannel: (this: SupabaseMock | undefined, ch: { _name: string }) => Promise<void>;
    rpc: (this: SupabaseMock | undefined, name: string, args?: unknown) => Promise<{ data: unknown; error: null }>;
  };

  const emptyBuilder = () => {
    const rows: unknown[] = [];
    const builder: Record<string, unknown> = {};
    builder.select = () => builder;
    builder.eq = () => builder;
    builder.is = () => builder;
    builder.order = () => builder;
    builder.limit = async () => ({ data: rows, error: null });
    return builder;
  };

  const supabaseMock: SupabaseMock = {
    [MARKER]: true,
    from(this: SupabaseMock | undefined, table: string) {
      if (!this || this[MARKER] !== true) {
        throw new TypeError("Cannot read properties of undefined (reading 'rest')");
      }
      mockState.fromCalls.push(table);
      return emptyBuilder();
    },
    channel(this: SupabaseMock | undefined, name: string) {
      if (!this || this[MARKER] !== true) {
        throw new TypeError("Cannot read properties of undefined (reading 'rest')");
      }
      mockState.createdChannelNames.push(name);
      // Si le channel existe DÉJÀ et est subscribed, supabase-js retourne
      // l'instance fantôme. C'est exactement ce qui causait le bug Sentry.
      const existing = mockState.registry.get(name);
      const entry = existing ?? { subscribed: false };
      if (!existing) mockState.registry.set(name, entry);

      const chanRef: { _name: string } = { _name: name };
      const chan = {
        ...chanRef,
        on(_event: string, _opts: unknown, _cb: () => void) {
          if (mockState.forceOnThrow) {
            throw new Error("cannot add postgres_changes callbacks after subscribe()");
          }
          if (entry.subscribed) {
            // Reproduit l'erreur Sentry : on ne peut pas ajouter un listener
            // sur un channel déjà subscribed.
            throw new Error("cannot add postgres_changes callbacks after subscribe()");
          }
          return chan;
        },
        subscribe() {
          entry.subscribed = true;
          return chan;
        },
      };
      return chan;
    },
    async removeChannel(this: SupabaseMock | undefined, ch: { _name: string }) {
      if (!this || this[MARKER] !== true) {
        throw new TypeError("Cannot read properties of undefined (reading 'rest')");
      }
      mockState.removedChannelNames.push(ch._name);
      // Volontairement async : on NE supprime PAS du registre immédiatement,
      // pour reproduire la race condition observée en prod.
      // Un test peut appeler `flushRegistry()` pour simuler le GC différé.
    },
    async rpc() {
      return { data: 0, error: null };
    },
  };
  return { supabase: supabaseMock };
});

import { useNotifications } from "@/hooks/useNotifications";

beforeEach(() => {
  mockState.registry.clear();
  mockState.createdChannelNames = [];
  mockState.removedChannelNames = [];
  mockState.fromCalls = [];
  mockState.forceOnThrow = false;
  mockAuthState.user = { id: "user-1", email: "alice@example.com" };
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("useNotifications — Realtime subscription (Sentry ee5c9353)", () => {
  it("mount / unmount / remount : ne throw jamais sur `.on()`", async () => {
    const wrapper = createWrapper();
    // Premier mount
    const { result: r1, unmount: u1 } = renderHook(() => useNotifications(), { wrapper });
    await waitFor(() => expect(r1.current.loading).toBe(false));
    expect(mockState.createdChannelNames).toHaveLength(1);

    // Unmount : `removeChannel` est appelé mais le registre garde le channel
    // (comportement supabase-js en prod — async cleanup).
    u1();
    expect(mockState.removedChannelNames).toHaveLength(1);

    // Re-mount : sans le fix, on re-utilise le même nom de channel fantôme,
    // `.on()` throw. Avec le fix (suffixe Date.now()), un nouveau channel est
    // créé → aucun throw.
    await act(async () => {
      await new Promise((r) => setTimeout(r, 2)); // garantit un Date.now() différent
    });
    const { result: r2 } = renderHook(() => useNotifications(), { wrapper });
    await waitFor(() => expect(r2.current.loading).toBe(false));

    expect(mockState.createdChannelNames).toHaveLength(2);
    // Les deux noms doivent être distincts (preuve que le suffixe unique est actif).
    const [first, second] = mockState.createdChannelNames;
    expect(first).not.toBe(second);
    // Pas d'erreur propagée — le hook est fonctionnel.
    expect(r2.current.notifications).toEqual([]);
  });

  it("try/catch défensif : si `.on()` throw, le hook ne crash pas", async () => {
    mockState.forceOnThrow = true;
    const { result } = renderHook(() => useNotifications(), { wrapper: createWrapper() });

    // Le fetch REST initial fonctionne toujours, le hook reste utilisable.
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.notifications).toEqual([]);
    expect(result.current.unreadCount).toBe(0);

    // Aucun throw n'est remonté au test (sinon renderHook aurait lancé).
    // La fonction `markAllAsRead` reste accessible (pas d'exception non-catched).
    expect(typeof result.current.markAllAsRead).toBe("function");
  });

  it("cleanup : removeChannel est appelé avec le channel créé", async () => {
    const { result, unmount } = renderHook(() => useNotifications(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(mockState.createdChannelNames).toHaveLength(1);
    const createdName = mockState.createdChannelNames[0];

    unmount();
    expect(mockState.removedChannelNames).toEqual([createdName]);
  });

  it("nom de channel : contient bien un suffixe unique par mount (Date.now)", async () => {
    const wrapper = createWrapper();
    const { result, unmount } = renderHook(() => useNotifications(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    unmount();

    await act(async () => {
      await new Promise((r) => setTimeout(r, 2));
    });

    const { result: result2, unmount: unmount2 } = renderHook(() => useNotifications(), { wrapper });
    await waitFor(() => expect(result2.current.loading).toBe(false));
    unmount2();

    expect(mockState.createdChannelNames).toHaveLength(2);
    const [a, b] = mockState.createdChannelNames;
    // Format : `notifications:<user-id>:<timestamp>`
    expect(a).toMatch(/^notifications:user-1:\d+$/);
    expect(b).toMatch(/^notifications:user-1:\d+$/);
    expect(a).not.toBe(b);
  });
});
