import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (_k: string, fallback?: string | { defaultValue?: string }) =>
      typeof fallback === "string" ? fallback : fallback?.defaultValue ?? "",
  }),
}));

async function importBadge() {
  return await import("@/components/verification/VerifiedBadge");
}

describe("VerifiedBadge (PROMPT 7)", () => {
  it("rend pill avec icône + label par défaut", async () => {
    const { VerifiedBadge } = await importBadge();
    render(<VerifiedBadge />);
    const el = screen.getByTestId("verified-badge");
    expect(el).toBeTruthy();
    expect(el.textContent).toMatch(/Vérifié/);
  });

  it("label={false} → icône seule (pas de texte visible)", async () => {
    const { VerifiedBadge } = await importBadge();
    render(<VerifiedBadge label={false} />);
    const el = screen.getByTestId("verified-badge");
    expect(el).toBeTruthy();
    expect(el.textContent?.trim()).toBe("");
  });

  it("size='md' applique classe différente que sm", async () => {
    const { VerifiedBadge } = await importBadge();
    const { container, rerender } = render(<VerifiedBadge size="sm" />);
    const elSm = container.querySelector("[data-testid='verified-badge']")!;
    const smClass = elSm.className;
    rerender(<VerifiedBadge size="md" />);
    const elMd = container.querySelector("[data-testid='verified-badge']")!;
    expect(elMd.className).not.toBe(smClass);
  });
});
