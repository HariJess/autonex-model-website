import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

/**
 * PROMPT 6 — BoostModal UI tests.
 *  - Render des 3 boost cards (bump, featured, top_ad)
 *  - Sélection met à jour le coût affiché
 *  - Bump card disabled + countdown si lastBumpedAt < 24h
 *  - Bouton Confirmer disabled si solde insuffisant + lien Recharger visible
 */

const NBSP = " ";

const balanceMock = vi.hoisted(() => ({ value: 100_000, isPending: false }));

vi.mock("@/hooks/useCreditsBalance", () => ({
  useCreditsBalance: () => ({ data: balanceMock.value, isPending: balanceMock.isPending }),
}));

vi.mock("@/hooks/boosts/useApplyBoost", () => ({
  useApplyBoost: () => ({
    mutate: vi.fn(),
    isPending: false,
  }),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (
      _key: string,
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

async function importModal() {
  return await import("@/components/listings/BoostModal");
}

const baseProps = {
  listingId: "listing-1",
  listingTitle: "Mon annonce de test",
  lastBumpedAt: null,
  featuredUntil: null,
  topAdUntil: null,
  open: true,
  onOpenChange: vi.fn(),
};

describe("BoostModal (PROMPT 6)", () => {
  beforeEach(() => {
    balanceMock.value = 100_000;
    balanceMock.isPending = false;
  });

  it("rend les 3 boost cards (bump, featured, top_ad)", async () => {
    const { BoostModal } = await importModal();
    render(
      <MemoryRouter>
        <BoostModal {...baseProps} />
      </MemoryRouter>,
    );
    expect(screen.getByTestId("boost-card-bump")).toBeTruthy();
    expect(screen.getByTestId("boost-card-featured")).toBeTruthy();
    expect(screen.getByTestId("boost-card-top_ad")).toBeTruthy();
  });

  it("affiche les coûts NBSP-formatés sur chaque card", async () => {
    const { BoostModal } = await importModal();
    render(
      <MemoryRouter>
        <BoostModal {...baseProps} />
      </MemoryRouter>,
    );
    expect(screen.getByTestId("boost-card-bump-cost").textContent).toContain(`5${NBSP}000`);
    expect(screen.getByTestId("boost-card-featured-cost").textContent).toContain(`30${NBSP}000`);
    expect(screen.getByTestId("boost-card-top_ad-cost").textContent).toContain(`100${NBSP}000`);
  });

  it("Bump est disabled quand lastBumpedAt < 24h, countdown visible", async () => {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { BoostModal } = await importModal();
    render(
      <MemoryRouter>
        <BoostModal {...baseProps} lastBumpedAt={oneHourAgo} />
      </MemoryRouter>,
    );
    const bumpCard = screen.getByTestId("boost-card-bump") as HTMLButtonElement;
    expect(bumpCard.disabled).toBe(true);
    expect(screen.getByTestId("boost-card-bump-cooldown")).toBeTruthy();
  });

  it("sélection d'un boost met à jour le coût total", async () => {
    const { BoostModal } = await importModal();
    render(
      <MemoryRouter>
        <BoostModal {...baseProps} />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByTestId("boost-card-featured"));
    expect(screen.getByTestId("boost-modal-cost").textContent).toContain(`30${NBSP}000`);
  });

  it("solde insuffisant → bouton Confirmer disabled + lien Recharger visible", async () => {
    balanceMock.value = 1_000;
    const { BoostModal } = await importModal();
    render(
      <MemoryRouter>
        <BoostModal {...baseProps} />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByTestId("boost-card-featured")); // 30k > 1k
    const confirmBtn = screen.getByTestId("boost-modal-confirm") as HTMLButtonElement;
    expect(confirmBtn.disabled).toBe(true);
    expect(screen.getByTestId("boost-modal-recharge-link")).toBeTruthy();
  });

  it("disclaimer no-refund est rendu", async () => {
    const { BoostModal } = await importModal();
    render(
      <MemoryRouter>
        <BoostModal {...baseProps} />
      </MemoryRouter>,
    );
    expect(screen.getByTestId("boost-disclaimer").textContent).toMatch(/remboursés/i);
  });
});
