import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type { CreditBalanceSnapshot } from "@/features/credits/hooks/useCreditBalance";

/**
 * Tests pour CreditWelcomeBanner — affichage conditionnel + dismiss.
 * Mock le hook useCreditBalance + clear localStorage entre tests.
 */

const mockSnapshot = vi.hoisted(() => ({
  current: null as CreditBalanceSnapshot | null,
}));

vi.mock("@/features/credits/hooks/useCreditBalance", () => ({
  useCreditBalance: (): CreditBalanceSnapshot => mockSnapshot.current!,
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    // Mock i18n qui gère 2 patterns react-i18next :
    //   - t("key", "fallback", { ...opts })
    //   - t("key", { defaultValue: "...", ...opts })  (utilisé par CreditWelcomeBanner)
    t: (_key: string, fallback?: string | Record<string, unknown>, opts?: Record<string, unknown>) => {
      let dv: string;
      let interpolation: Record<string, unknown> | undefined;
      if (typeof fallback === "string") {
        dv = fallback;
        interpolation = opts;
      } else if (fallback && typeof fallback === "object") {
        dv = (fallback.defaultValue as string | undefined) ?? "";
        // Extrait toutes les autres props comme opts d'interpolation
        const { defaultValue: _dv, ...rest } = fallback;
        void _dv;
        interpolation = rest as Record<string, unknown>;
      } else {
        dv = "";
        interpolation = opts;
      }
      if (!interpolation || Object.keys(interpolation).length === 0) return dv;
      return Object.entries(interpolation).reduce<string>(
        (acc, [k, v]) => acc.replace(new RegExp(`{{${k}}}`, "g"), String(v)),
        dv,
      );
    },
  }),
}));

const STORAGE_KEY = "autonex.welcomeBannerDismissed";

async function importBanner() {
  return await import("@/features/credits/components/CreditWelcomeBanner");
}

describe("CreditWelcomeBanner", () => {
  beforeEach(() => {
    window.localStorage.clear();
    mockSnapshot.current = null;
  });

  it("ne rend rien si granted = 0", async () => {
    mockSnapshot.current = {
      total: 5_000,
      paid: 5_000,
      granted: 0,
      grantedReceived: 0,
      grantedExpiresAt: null,
      isLoading: false,
      error: null,
    };
    const { CreditWelcomeBanner } = await importBanner();
    const { container } = render(
      <MemoryRouter>
        <CreditWelcomeBanner />
      </MemoryRouter>,
    );
    expect(container.firstChild).toBeNull();
  });

  it("ne rend rien si granted < 80 000 (user a déjà commencé à dépenser)", async () => {
    mockSnapshot.current = {
      total: 70_000,
      paid: 0,
      granted: 70_000,
      grantedReceived: 70_000,
      grantedExpiresAt: new Date(Date.now() + 30 * 86_400_000).toISOString(),
      isLoading: false,
      error: null,
    };
    const { CreditWelcomeBanner } = await importBanner();
    const { container } = render(
      <MemoryRouter>
        <CreditWelcomeBanner />
      </MemoryRouter>,
    );
    expect(container.firstChild).toBeNull();
  });

  it("rend la bannière si granted >= 80 000", async () => {
    mockSnapshot.current = {
      total: 100_000,
      paid: 0,
      granted: 100_000,
      grantedReceived: 100_000,
      grantedExpiresAt: new Date(Date.now() + 90 * 86_400_000).toISOString(),
      isLoading: false,
      error: null,
    };
    const { CreditWelcomeBanner } = await importBanner();
    render(
      <MemoryRouter>
        <CreditWelcomeBanner />
      </MemoryRouter>,
    );
    expect(screen.getByText(/Bienvenue sur AutoNex/i)).toBeInTheDocument();
    expect(screen.getByText(/Publier ma première annonce/i)).toBeInTheDocument();
  });

  it("ne rend rien après dismiss localStorage", async () => {
    window.localStorage.setItem(STORAGE_KEY, "true");
    mockSnapshot.current = {
      total: 100_000,
      paid: 0,
      granted: 100_000,
      grantedReceived: 100_000,
      grantedExpiresAt: new Date(Date.now() + 90 * 86_400_000).toISOString(),
      isLoading: false,
      error: null,
    };
    const { CreditWelcomeBanner } = await importBanner();
    const { container } = render(
      <MemoryRouter>
        <CreditWelcomeBanner />
      </MemoryRouter>,
    );
    expect(container.firstChild).toBeNull();
  });

  // PROMPT 4.3 — Logique adaptative reçu vs restant

  it("PROMPT 4.3 : granted = grantedReceived → renderise bodyInitial (premier login)", async () => {
    mockSnapshot.current = {
      total: 100_000,
      paid: 0,
      granted: 100_000,
      grantedReceived: 100_000,
      grantedExpiresAt: new Date(Date.now() + 60 * 86_400_000).toISOString(),
      isLoading: false,
      error: null,
    };
    const { CreditWelcomeBanner } = await importBanner();
    render(
      <MemoryRouter>
        <CreditWelcomeBanner />
      </MemoryRouter>,
    );
    // Title : "Bienvenue sur AutoNex !" (initial)
    expect(screen.getByText(/Bienvenue sur AutoNex/i)).toBeInTheDocument();
    // Body : "Vous avez reçu" (pattern initial), pas "Il vous reste"
    expect(screen.getByText(/Vous avez reçu/i)).toBeInTheDocument();
    expect(screen.queryByText(/Il vous reste/i)).toBeNull();
    // Bug "crédits crédits" : la string "crédits crédits" ne doit JAMAIS apparaître
    expect(screen.queryByText(/crédits crédits/i)).toBeNull();
  });

  it("PROMPT 4.3 : granted < grantedReceived → renderise bodyRemaining avec remaining + received", async () => {
    mockSnapshot.current = {
      total: 85_000,
      paid: 0,
      granted: 85_000,
      grantedReceived: 100_000,
      grantedExpiresAt: new Date(Date.now() + 60 * 86_400_000).toISOString(),
      isLoading: false,
      error: null,
    };
    const { CreditWelcomeBanner } = await importBanner();
    render(
      <MemoryRouter>
        <CreditWelcomeBanner />
      </MemoryRouter>,
    );
    // Title : "Vos crédits offerts" (remaining)
    expect(screen.getByText(/Vos crédits offerts/i)).toBeInTheDocument();
    // Body : "Il vous reste {{remaining}}" + "(sur {{received}} reçus)"
    const body = screen.getByText(/Il vous reste/i);
    expect(body).toBeInTheDocument();
    // Vérifie que remaining=85k apparaît et received=100k apparaît
    expect(body.textContent).toMatch(/85/);
    expect(body.textContent).toMatch(/100/);
    expect(body.textContent).toMatch(/reçus/);
    // Bug "crédits crédits" toujours absent
    expect(screen.queryByText(/crédits crédits/i)).toBeNull();
  });

  it("click sur [×] persiste le dismiss", async () => {
    mockSnapshot.current = {
      total: 100_000,
      paid: 0,
      granted: 100_000,
      grantedReceived: 100_000,
      grantedExpiresAt: new Date(Date.now() + 90 * 86_400_000).toISOString(),
      isLoading: false,
      error: null,
    };
    const { CreditWelcomeBanner } = await importBanner();
    render(
      <MemoryRouter>
        <CreditWelcomeBanner />
      </MemoryRouter>,
    );
    const dismissButton = screen.getByLabelText(/Fermer/i);
    fireEvent.click(dismissButton);
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe("true");
  });
});
