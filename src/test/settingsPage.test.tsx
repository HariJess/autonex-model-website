import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import SettingsPage from "@/pages/SettingsPage";
import { SETTINGS_SECTIONS } from "@/components/settings/settingsSections";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (_key: string, fallback?: string) => fallback ?? _key,
    i18n: { changeLanguage: vi.fn() },
  }),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: "u1", email: "a@b.c" }, isAdmin: false, signOut: vi.fn() }),
}));

vi.mock("@/contexts/CurrencyContext", () => ({
  useCurrency: () => ({ currency: "MGA", setCurrency: vi.fn(), formatPrice: (v: number) => `${v} Ar`, formatPriceSecondary: () => "" }),
}));

vi.mock("@/components/Header", () => ({ default: () => <header>Header</header> }));
vi.mock("@/components/Footer", () => ({ default: () => <footer>Footer</footer> }));

function renderPage(initialHash = "") {
  return render(
    <HelmetProvider>
      <MemoryRouter initialEntries={[`/settings${initialHash}`]}>
        <Routes>
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </MemoryRouter>
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

  it("shows the default Profil section when no hash is present", () => {
    renderPage();
    expect(screen.getByRole("heading", { level: 2, name: /Profil/i })).toBeInTheDocument();
  });

  it("lists the four navigation sections in the sidebar", () => {
    renderPage();
    for (const section of SETTINGS_SECTIONS) {
      // the label appears in the sidebar button (and active section main heading
      // when it matches). getAllByText covers both occurrences safely.
      expect(screen.getAllByText(section.label).length).toBeGreaterThan(0);
    }
  });

  it("switches to Zone de danger when the hash is set on mount", () => {
    window.location.hash = "#zone-danger";
    renderPage("#zone-danger");
    expect(screen.getByRole("heading", { level: 2, name: /Zone de danger/i })).toBeInTheDocument();
  });

  it("reacts to hashchange events after mount", () => {
    renderPage();
    expect(screen.getByRole("heading", { level: 2, name: /Profil/i })).toBeInTheDocument();
    act(() => {
      window.location.hash = "#notifications";
      window.dispatchEvent(new HashChangeEvent("hashchange"));
    });
    expect(screen.getByRole("heading", { level: 2, name: /Notifications/i })).toBeInTheDocument();
  });

  it("falls back to Profil for an unknown hash fragment", () => {
    renderPage("#unknown-section");
    expect(screen.getByRole("heading", { level: 2, name: /Profil/i })).toBeInTheDocument();
  });
});
