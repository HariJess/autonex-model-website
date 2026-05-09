import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type { RateLimitStatus } from "@/hooks/useMyRateLimitStatus";

/**
 * PROMPT 8 — RateLimitStatusCard 4 variants :
 *   1. allowed=true → variant 'normal' (compteurs)
 *   2. rate_limit_active_listings → variant exceeded + CTA upgrade si non-verified
 *   3. rate_limit_publish_24h → variant exceeded sans CTA
 *   4. rate_limit_cooldown → variant cooldown + countdown
 *   + admin sentinel (limit=999) → null (pas de render)
 */

const dataMock = vi.hoisted(() => ({
  data: null as RateLimitStatus | null,
  isPending: false,
}));

vi.mock("@/hooks/useMyRateLimitStatus", () => ({
  useMyRateLimitStatus: () => dataMock,
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

async function renderCard() {
  const { RateLimitStatusCard } = await import("@/components/dashboard/RateLimitStatusCard");
  return render(
    <MemoryRouter>
      <RateLimitStatusCard />
    </MemoryRouter>,
  );
}

describe("RateLimitStatusCard variants (PROMPT 8)", () => {
  beforeEach(() => {
    dataMock.data = null;
    dataMock.isPending = false;
  });

  it("variant 'normal' affiche compteurs annonces actives + 24h", async () => {
    dataMock.data = {
      allowed: true,
      reason: null,
      active_listings_count: 2,
      active_listings_limit: 3,
      publishes_24h_count: 1,
      publishes_24h_limit: 3,
      cooldown_remaining_seconds: 0,
    };
    await renderCard();
    const card = screen.getByTestId("rate-limit-card");
    expect(card.getAttribute("data-variant")).toBe("normal");
    expect(screen.getByTestId("rate-limit-active-count").textContent).toContain("2 / 3");
  });

  it("variant 'rate_limit_active_listings' affiche CTA upgrade si non-verified (limit=3)", async () => {
    dataMock.data = {
      allowed: false,
      reason: "rate_limit_active_listings",
      active_listings_count: 3,
      active_listings_limit: 3,
      publishes_24h_count: 0,
      publishes_24h_limit: 3,
      cooldown_remaining_seconds: 0,
    };
    await renderCard();
    const card = screen.getByTestId("rate-limit-card");
    expect(card.getAttribute("data-variant")).toBe("rate_limit_active_listings");
    expect(screen.getByText(/Devenir vendeur vérifié/)).toBeTruthy();
  });

  it("variant 'rate_limit_active_listings' SANS CTA si verified (limit=5)", async () => {
    dataMock.data = {
      allowed: false,
      reason: "rate_limit_active_listings",
      active_listings_count: 5,
      active_listings_limit: 5,
      publishes_24h_count: 0,
      publishes_24h_limit: 3,
      cooldown_remaining_seconds: 0,
    };
    await renderCard();
    expect(screen.queryByText(/Devenir vendeur vérifié/)).toBeNull();
  });

  it("variant 'rate_limit_publish_24h' affiche limite quotidienne", async () => {
    dataMock.data = {
      allowed: false,
      reason: "rate_limit_publish_24h",
      active_listings_count: 1,
      active_listings_limit: 3,
      publishes_24h_count: 3,
      publishes_24h_limit: 3,
      cooldown_remaining_seconds: 0,
    };
    await renderCard();
    expect(screen.getByTestId("rate-limit-card").getAttribute("data-variant")).toBe(
      "rate_limit_publish_24h",
    );
    expect(screen.getByText(/Limite quotidienne atteinte/)).toBeTruthy();
  });

  it("variant 'rate_limit_cooldown' affiche countdown", async () => {
    dataMock.data = {
      allowed: false,
      reason: "rate_limit_cooldown",
      active_listings_count: 1,
      active_listings_limit: 3,
      publishes_24h_count: 1,
      publishes_24h_limit: 3,
      cooldown_remaining_seconds: 22,
    };
    await renderCard();
    expect(screen.getByTestId("rate-limit-card").getAttribute("data-variant")).toBe(
      "rate_limit_cooldown",
    );
    expect(screen.getByTestId("rate-limit-cooldown-countdown").textContent).toMatch(/22/);
  });

  it("admin sentinel (limit=999) → pas de render", async () => {
    dataMock.data = {
      allowed: true,
      reason: null,
      active_listings_count: 0,
      active_listings_limit: 999,
      publishes_24h_count: 0,
      publishes_24h_limit: 999,
      cooldown_remaining_seconds: 0,
    };
    await renderCard();
    expect(screen.queryByTestId("rate-limit-card")).toBeNull();
  });
});
