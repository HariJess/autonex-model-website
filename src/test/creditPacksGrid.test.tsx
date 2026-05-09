import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { CreditPackRow } from "@/lib/creditPacks";
import { CreditPacksGrid } from "@/pages/credits/components/CreditPacksGrid";

/**
 * Tests pour CreditPacksGrid (PROMPT 3.8 — final).
 *
 * Couvre :
 *   - Les 6 packs sont rendus simultanément en grid (pas de toggle, pas de footer)
 *   - Order canonical : discover → standard → pro → power → business → enterprise
 *   - Pro mis en avant via border-primary + shadow-lg + label "Recommandé" + bouton primary
 *   - Standard / autres en bouton outline
 *   - Tous les chiffres affichés avec NBSP (U+00A0) comme séparateur
 *   - Discover (sans bonus) garde une ligne bonus vide pour préserver hauteur uniforme
 *   - HoverCard contient ≈ N annonces / prix unitaire / économie (si ≥ 50k)
 *   - HoverCard exclut la ligne économie sur Standard (12,5k < seuil)
 */

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (_key: string, fallback?: string | { defaultValue?: string }, opts?: Record<string, unknown>) => {
      const dv = typeof fallback === "string" ? fallback : fallback?.defaultValue ?? "";
      if (!opts) return dv;
      return Object.entries(opts).reduce<string>(
        (acc, [k, v]) => acc.replace(new RegExp(`{{${k}}}`, "g"), String(v)),
        dv,
      );
    },
  }),
}));

const PACKS: CreditPackRow[] = [
  { id: "discover", name: "Pack Découverte", credits_amount: 25_000, bonus_credits: 0, price_mga: 25_000, sort_order: 1 },
  { id: "standard", name: "Pack Standard", credits_amount: 75_000, bonus_credits: 12_500, price_mga: 75_000, sort_order: 2 },
  { id: "pro", name: "Pack Pro", credits_amount: 150_000, bonus_credits: 50_000, price_mga: 150_000, sort_order: 3 },
  { id: "power", name: "Pack Power", credits_amount: 300_000, bonus_credits: 150_000, price_mga: 300_000, sort_order: 4 },
  { id: "business", name: "Pack Business", credits_amount: 750_000, bonus_credits: 450_000, price_mga: 750_000, sort_order: 5 },
  { id: "enterprise", name: "Pack Enterprise", credits_amount: 1_500_000, bonus_credits: 1_000_000, price_mga: 1_500_000, sort_order: 6 },
];

const NBSP = " ";

function renderGrid(opts: { selectedPackId?: string; onSelectPack?: (id: string) => void; forceHoverOpen?: boolean } = {}) {
  return render(
    <CreditPacksGrid
      creditPacks={PACKS}
      selectedPackId={opts.selectedPackId ?? ""}
      onSelectPack={opts.onSelectPack ?? vi.fn()}
      forceHoverOpen={opts.forceHoverOpen}
    />,
  );
}

describe("CreditPacksGrid (PROMPT 3.8 — final grid 3×2)", () => {
  // ─── Présence des 6 packs ─────────────────────────────────────────

  it("rend les 6 packs simultanément (pas de toggle, pas de footer)", () => {
    renderGrid();
    expect(screen.getByTestId("pack-discover")).toBeTruthy();
    expect(screen.getByTestId("pack-standard")).toBeTruthy();
    expect(screen.getByTestId("pack-pro")).toBeTruthy();
    expect(screen.getByTestId("pack-power")).toBeTruthy();
    expect(screen.getByTestId("pack-business")).toBeTruthy();
    expect(screen.getByTestId("pack-enterprise")).toBeTruthy();
  });

  it("DiscoverFooter et VolumeToggle ne sont plus rendus", () => {
    renderGrid();
    expect(screen.queryByTestId("discover-footer")).toBeNull();
    expect(screen.queryByTestId("volume-toggle-trigger")).toBeNull();
    expect(screen.queryByTestId("volume-packs-grid")).toBeNull();
  });

  it("ordre canonique : discover, standard, pro, power, business, enterprise", () => {
    const { container } = renderGrid();
    const cards = Array.from(container.querySelectorAll("[data-testid^='pack-']")).filter((el) =>
      /^pack-(discover|standard|pro|power|business|enterprise)$/.test(
        el.getAttribute("data-testid") ?? "",
      ),
    );
    const ids = cards.map((c) => c.getAttribute("data-testid"));
    expect(ids).toEqual([
      "pack-discover",
      "pack-standard",
      "pack-pro",
      "pack-power",
      "pack-business",
      "pack-enterprise",
    ]);
  });

  // ─── Format chiffres NBSP (fix critique PROMPT 3.8) ───────────────

  it("totaux crédits : NBSP comme séparateur (U+00A0)", () => {
    renderGrid();
    expect(screen.getByTestId("pack-discover-credits").textContent).toBe(`25${NBSP}000`);
    expect(screen.getByTestId("pack-standard-credits").textContent).toBe(`87${NBSP}500`);
    expect(screen.getByTestId("pack-pro-credits").textContent).toBe(`200${NBSP}000`);
    expect(screen.getByTestId("pack-power-credits").textContent).toBe(`450${NBSP}000`);
    expect(screen.getByTestId("pack-business-credits").textContent).toBe(`1${NBSP}200${NBSP}000`);
    expect(screen.getByTestId("pack-enterprise-credits").textContent).toBe(`2${NBSP}500${NBSP}000`);
  });

  it("prix Ar : NBSP comme séparateur + suffixe ' Ar'", () => {
    renderGrid();
    expect(screen.getByTestId("pack-standard-price").textContent).toBe(`75${NBSP}000 Ar`);
    expect(screen.getByTestId("pack-business-price").textContent).toBe(`750${NBSP}000 Ar`);
    expect(screen.getByTestId("pack-enterprise-price").textContent).toBe(`1${NBSP}500${NBSP}000 Ar`);
  });

  it("bonus '+X bonus' avec NBSP pour les packs avec bonus", () => {
    renderGrid();
    expect(screen.getByTestId("pack-standard-bonus").textContent).toBe(`+12${NBSP}500 bonus`);
    expect(screen.getByTestId("pack-pro-bonus").textContent).toBe(`+50${NBSP}000 bonus`);
    expect(screen.getByTestId("pack-enterprise-bonus").textContent).toBe(`+1${NBSP}000${NBSP}000 bonus`);
  });

  it("Discover (bonus = 0) : ligne bonus rendue mais vide (préserve hauteur)", () => {
    renderGrid();
    const discoverBonus = screen.getByTestId("pack-discover-bonus");
    // L'élément existe (différent du PROMPT 3.7 où il était omis)
    expect(discoverBonus).toBeTruthy();
    // Mais son texte ne contient pas "bonus"
    expect(discoverBonus.textContent).not.toMatch(/bonus/i);
    // Et le min-h est appliqué pour préserver l'espace vertical
    expect(discoverBonus.className).toMatch(/min-h-/);
  });

  // ─── Pro recommandé : élévation pas couleur ──────────────────────

  it("Pro a la classe border-primary (highlighted via élévation)", () => {
    renderGrid();
    const pro = screen.getByTestId("pack-pro");
    expect(pro.className).toMatch(/border-primary/);
    expect(pro.className).toMatch(/shadow-lg/);
  });

  it("Standard et Power n'ont PAS la classe border-primary", () => {
    renderGrid();
    expect(screen.getByTestId("pack-standard").className).not.toMatch(/border-primary/);
    expect(screen.getByTestId("pack-power").className).not.toMatch(/border-primary/);
    expect(screen.getByTestId("pack-business").className).not.toMatch(/border-primary/);
  });

  it("Label 'Recommandé' présent sur Pro, absent ailleurs", () => {
    renderGrid();
    expect(screen.getByTestId("pack-pro-recommended").textContent).toMatch(/Recommandé/);
    expect(screen.queryByTestId("pack-discover-recommended")).toBeNull();
    expect(screen.queryByTestId("pack-standard-recommended")).toBeNull();
    expect(screen.queryByTestId("pack-power-recommended")).toBeNull();
    expect(screen.queryByTestId("pack-business-recommended")).toBeNull();
    expect(screen.queryByTestId("pack-enterprise-recommended")).toBeNull();
  });

  it("Pro a un bouton variant primary, autres ont variant outline", () => {
    renderGrid();
    const proCta = screen.getByTestId("pack-pro-cta");
    const standardCta = screen.getByTestId("pack-standard-cta");
    const enterpriseCta = screen.getByTestId("pack-enterprise-cta");
    expect(proCta.className).toMatch(/bg-primary/);
    expect(standardCta.className).toMatch(/border|bg-background/);
    expect(enterpriseCta.className).toMatch(/border|bg-background/);
  });

  // ─── HoverCard contenu (forceHoverOpen) ──────────────────────────

  it("HoverCard contient ≈ N annonces, prix unitaire, économie pour Pro", () => {
    renderGrid({ forceHoverOpen: true });
    expect(screen.getByTestId("pack-pro-tooltip-listings").textContent).toMatch(/8/);
    expect(screen.getByTestId("pack-pro-tooltip-unit-price").textContent).toMatch(/0,75/);
    expect(screen.getByTestId("pack-pro-tooltip-savings").textContent).toMatch(/50/);
  });

  it("HoverCard EXCLUT la ligne économie sur Standard (12,5k < seuil 50k)", () => {
    renderGrid({ forceHoverOpen: true });
    expect(screen.getByTestId("pack-standard-tooltip-listings")).toBeTruthy();
    expect(screen.getByTestId("pack-standard-tooltip-unit-price")).toBeTruthy();
    expect(screen.queryByTestId("pack-standard-tooltip-savings")).toBeNull();
  });

  it("HoverCard EXCLUT la ligne économie sur Discover (économie = 0)", () => {
    renderGrid({ forceHoverOpen: true });
    expect(screen.getByTestId("pack-discover-tooltip-listings")).toBeTruthy();
    expect(screen.queryByTestId("pack-discover-tooltip-savings")).toBeNull();
  });

  // ─── Interactions ────────────────────────────────────────────────

  it("appelle onSelectPack au click sur une card", () => {
    const onSelect = vi.fn();
    renderGrid({ onSelectPack: onSelect });
    fireEvent.click(screen.getByTestId("pack-pro"));
    expect(onSelect).toHaveBeenCalledWith("pro");
  });

  it("click sur Discover sélectionne discover", () => {
    const onSelect = vi.fn();
    renderGrid({ onSelectPack: onSelect });
    fireEvent.click(screen.getByTestId("pack-discover"));
    expect(onSelect).toHaveBeenCalledWith("discover");
  });

  it("click sur Enterprise sélectionne enterprise (plus de toggle requis)", () => {
    const onSelect = vi.fn();
    renderGrid({ onSelectPack: onSelect });
    fireEvent.click(screen.getByTestId("pack-enterprise"));
    expect(onSelect).toHaveBeenCalledWith("enterprise");
  });

  it("marque le pack sélectionné via aria-pressed", () => {
    renderGrid({ selectedPackId: "pro" });
    expect(screen.getByTestId("pack-pro").getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByTestId("pack-standard").getAttribute("aria-pressed")).toBe("false");
  });
});
