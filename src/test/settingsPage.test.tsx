import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

// YasProvider non monté dans ce smoke test : mock plat pour Header / Footer.
vi.mock("@/features/yas-app/hooks/useYasContext", () => ({
  useYasContext: () => ({
    isEmbedded: false,
    source: null,
    platform: null,
    entryPoint: null,
    sessionId: "test-session",
  }),
  readYasContextFromStorage: () => ({
    isEmbedded: false,
    source: null,
    platform: null,
    entryPoint: null,
    sessionId: "test-session",
  }),
  YasProvider: ({ children }: { children: ReactNode }) => children,
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (_key: string, fallback?: string) => fallback ?? _key,
    i18n: { changeLanguage: vi.fn() },
  }),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: { id: "u1", email: "a@b.c", last_sign_in_at: "2026-04-21T10:34:00Z" },
    session: { user: { id: "u1", email: "a@b.c", last_sign_in_at: "2026-04-21T10:34:00Z" } },
    isAdmin: false,
    signOut: vi.fn(),
  }),
}));

vi.mock("@/contexts/CurrencyContext", () => ({
  useCurrency: () => ({ currency: "MGA", setCurrency: vi.fn(), formatPrice: (v: number) => `${v} Ar`, formatPriceSecondary: () => "" }),
}));

vi.mock("@/components/Header", () => ({ default: () => <header>Header</header> }));
vi.mock("@/components/Footer", () => ({ default: () => <footer>Footer</footer> }));

// Stub supabase so the ProfilSection's useQuery resolves without hitting the
// network. Return a minimal profile row so the form can hydrate.
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          single: async () => ({
            data: {
              id: "u1",
              full_name: "Test User",
              phone: null,
              whatsapp_phone: null,
              role: "particulier",
              created_at: "2025-06-15T12:00:00Z",
              deletion_requested_at: null,
              deletion_scheduled_for: null,
              is_anonymized: false,
            },
            error: null,
          }),
        }),
      }),
    }),
    auth: { updateUser: async () => ({ data: null, error: null }) },
  },
}));

import SettingsPage from "@/pages/SettingsPage";
import { SETTINGS_SECTIONS } from "@/components/settings/settingsSections";

function renderPage(initialHash = "") {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <HelmetProvider>
      <QueryClientProvider client={qc}>
        <MemoryRouter initialEntries={[`/settings${initialHash}`]}>
          <Routes>
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    </HelmetProvider>,
  );
}

describe("SettingsPage", () => {
  beforeEach(() => {
    // jsdom shares a single window across tests — reset hash so one test
    // doesn't leak state into the next.
    window.location.hash = "";
  });
  afterEach(() => {
    window.location.hash = "";
  });

  it("renders without crashing and shows the Paramètres title", () => {
    renderPage();
    // sidebar title (desktop) + mobile header both say "Paramètres"
    expect(screen.getAllByText(/Paramètres/i).length).toBeGreaterThan(0);
  });

  it("shows the default Profil section when no hash is present", async () => {
    renderPage();
    expect(await screen.findByRole("heading", { level: 2, name: /Profil/i })).toBeInTheDocument();
  });

  it("lists the four navigation sections in the sidebar", () => {
    renderPage();
    for (const section of SETTINGS_SECTIONS) {
      // the label appears in the sidebar button (and active section main heading
      // when it matches). getAllByText covers both occurrences safely.
      // Tests run with the i18next test config (returns the key as fallback),
      // so we match against the labelKey directly.
      expect(screen.getAllByText(section.labelKey).length).toBeGreaterThan(0);
    }
  });

  it("switches to Zone de danger when the hash is set on mount", () => {
    window.location.hash = "#zone-danger";
    renderPage("#zone-danger");
    expect(screen.getByRole("heading", { level: 2, name: /Zone de danger/i })).toBeInTheDocument();
  });

  it("reacts to hashchange events after mount", async () => {
    renderPage();
    expect(await screen.findByRole("heading", { level: 2, name: /Profil/i })).toBeInTheDocument();
    act(() => {
      window.location.hash = "#notifications";
      window.dispatchEvent(new HashChangeEvent("hashchange"));
    });
    expect(screen.getByRole("heading", { level: 2, name: /Notifications/i })).toBeInTheDocument();
  });

  it("falls back to Profil for an unknown hash fragment", async () => {
    renderPage("#unknown-section");
    expect(await screen.findByRole("heading", { level: 2, name: /Profil/i })).toBeInTheDocument();
  });
});
