/**
 * Anti-régression Sentry issue 5602e03b (Lot 10.1 hotfix).
 *
 * Bug prod : sur /settings/notifications, le hook `useNotificationPreferences`
 * levait « TypeError: Cannot read properties of undefined (reading 'rest') »
 * parce que `supabase.from` était extrait comme méthode détachée, perdant son
 * binding `this`.
 *
 * Ces tests gardent la bonne forme : le mock supabase-ci-dessous vérifie
 * que `.from()` est appelé AVEC le bon `this`. Si le hook régresse vers une
 * extraction détachée, tous les tests ci-dessous lèvent la même TypeError
 * que Sentry a capturée en prod.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";

const { mockAuthState, mockState } = vi.hoisted(() => ({
  mockAuthState: {
    user: { id: "user-1", email: "alice@example.com" } as null | { id: string; email: string },
  },
  mockState: {
    initialRow: null as null | Record<string, unknown>,
    insertedRow: null as null | Record<string, unknown>,
    updatedRow: null as null | Record<string, unknown>,
    readError: null as null | { message: string },
    insertError: null as null | { message: string },
    updateError: null as null | { message: string },
    fromCalls: [] as string[],
  },
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: mockAuthState.user }),
}));

// Mock client Supabase : son `from()` exige d'être appelé comme méthode (this
// === supabaseMock). Si le hook extrait `supabase.from` comme fonction
// détachée, `this` devient undefined et le mock lève la TypeError que Sentry
// a capturée — faisant échouer les tests.
vi.mock("@/integrations/supabase/client", () => {
  const MARKER = Symbol("supabase-self");
  type SupabaseMock = {
    [k: symbol]: unknown;
    from: (this: SupabaseMock | undefined, table: string) => unknown;
  };
  const supabaseMock: SupabaseMock = {
    [MARKER]: true,
    from(this: SupabaseMock | undefined, table: string) {
      if (!this || this[MARKER] !== true) {
        throw new TypeError("Cannot read properties of undefined (reading 'rest')");
      }
      mockState.fromCalls.push(table);
      return {
        select() {
          return {
            eq(_col: string, _val: string) {
              return {
                async maybeSingle() {
                  return { data: mockState.initialRow, error: mockState.readError };
                },
              };
            },
          };
        },
        insert(_payload: unknown) {
          return {
            select() {
              return {
                async single() {
                  return { data: mockState.insertedRow, error: mockState.insertError };
                },
              };
            },
          };
        },
        update(_patch: unknown) {
          return {
            eq(_col: string, _val: string) {
              return {
                select() {
                  return {
                    async single() {
                      return { data: mockState.updatedRow, error: mockState.updateError };
                    },
                  };
                },
              };
            },
          };
        },
      };
    },
  };
  return { supabase: supabaseMock };
});

import { useNotificationPreferences } from "@/hooks/useNotificationPreferences";

const ROW_DEFAULTS = {
  user_id: "user-1",
  listings_in_app: true,
  listings_email_immediate: true,
  listings_email_digest: true,
  payments_in_app: true,
  payments_email_immediate: true,
  payments_email_digest: false,
  activity_in_app: true,
  activity_email_immediate: false,
  activity_email_digest: true,
  searches_in_app: true,
  searches_email_immediate: false,
  searches_email_digest: true,
  system_in_app: true,
  system_email_immediate: false,
  system_email_digest: false,
  digest_frequency: "daily" as const,
  digest_time: "18:00:00",
  max_emails_per_day: 5,
};

beforeEach(() => {
  mockState.initialRow = null;
  mockState.insertedRow = null;
  mockState.updatedRow = null;
  mockState.readError = null;
  mockState.insertError = null;
  mockState.updateError = null;
  mockState.fromCalls = [];
  mockAuthState.user = { id: "user-1", email: "alice@example.com" };
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("useNotificationPreferences — anti-regression Sentry 5602e03b", () => {
  it("load() charge les preferences existantes (passe loading false)", async () => {
    mockState.initialRow = { ...ROW_DEFAULTS };
    const { result } = renderHook(() => useNotificationPreferences());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.preferences).not.toBeNull();
    expect(result.current.preferences?.userId).toBe("user-1");
    expect(result.current.preferences?.digestFrequency).toBe("daily");
    expect(mockState.fromCalls).toContain("notification_preferences");
  });

  it("insere les defaults quand la row est absente (fallback user pre-Lot 10.1)", async () => {
    mockState.initialRow = null;
    mockState.insertedRow = { ...ROW_DEFAULTS, digest_time: "20:00:00" };
    const { result } = renderHook(() => useNotificationPreferences());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.preferences?.digestTime).toBe("20:00:00");
    // Un SELECT + un INSERT sur la meme table.
    expect(mockState.fromCalls).toEqual([
      "notification_preferences",
      "notification_preferences",
    ]);
  });

  it("update() propage le patch et met a jour le state", async () => {
    mockState.initialRow = { ...ROW_DEFAULTS };
    const { result } = renderHook(() => useNotificationPreferences());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.preferences?.listingsEmailImmediate).toBe(true);

    mockState.updatedRow = { ...ROW_DEFAULTS, listings_email_immediate: false };
    await act(async () => {
      await result.current.update({ listingsEmailImmediate: false });
    });

    expect(result.current.preferences?.listingsEmailImmediate).toBe(false);
    expect(result.current.saving).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("sans utilisateur authentifie : loading false et preferences null", async () => {
    mockAuthState.user = null;

    const { result } = renderHook(() => useNotificationPreferences());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.preferences).toBeNull();
    // Aucun appel Supabase n'est fait sans user.
    expect(mockState.fromCalls).toEqual([]);
  });

  it("regression guard : `supabase.from` doit etre appele comme methode (this preserve)", async () => {
    // Ce test est redondant avec les precedents — le mock leve une TypeError
    // si `.from` est appele en mode detache. On le garde explicitement pour
    // que le titre de test fasse matcher la cause en cas de regression.
    mockState.initialRow = { ...ROW_DEFAULTS };
    const { result } = renderHook(() => useNotificationPreferences());
    await waitFor(() => expect(result.current.loading).toBe(false));
    // Si on arrive ici, le binding `this` est preserve — le mock n'a pas throw.
    expect(result.current.preferences).not.toBeNull();
    expect(result.current.error).toBeNull();
  });
});
