import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const verifMock = vi.hoisted(() => ({ data: null as unknown, isPending: false }));
const badgeMock = vi.hoisted(() => ({ data: null as unknown, isPending: false }));

vi.mock("@/hooks/verification/useMyVerification", () => ({
  useMyVerification: () => verifMock,
}));
vi.mock("@/hooks/verification/useMySellerBadge", () => ({
  useMySellerBadge: () => badgeMock,
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
  const { VerificationStatusCard } = await import(
    "@/components/verification/VerificationStatusCard"
  );
  return render(
    <MemoryRouter>
      <VerificationStatusCard />
    </MemoryRouter>,
  );
}

describe("VerificationStatusCard variants (PROMPT 7)", () => {
  beforeEach(() => {
    verifMock.data = null;
    verifMock.isPending = false;
    badgeMock.data = null;
    badgeMock.isPending = false;
  });

  it("variant 'none' si aucune verification + aucun badge", async () => {
    await renderCard();
    expect(screen.getByTestId("verification-status-card").getAttribute("data-variant")).toBe(
      "none",
    );
  });

  it("variant 'pending' si verification.status='pending'", async () => {
    verifMock.data = {
      id: "v1",
      status: "pending",
      submitted_at: "2026-05-07T10:00:00Z",
      reviewed_at: null,
      expires_at: null,
      rejection_reason: null,
      rejection_category: null,
    };
    await renderCard();
    expect(screen.getByTestId("verification-status-card").getAttribute("data-variant")).toBe(
      "pending",
    );
  });

  it("variant 'rejected' si verification.status='rejected'", async () => {
    verifMock.data = {
      id: "v1",
      status: "rejected",
      submitted_at: "2026-05-01T10:00:00Z",
      reviewed_at: "2026-05-02T10:00:00Z",
      expires_at: null,
      rejection_reason: "Documents flous",
      rejection_category: "blurry",
    };
    await renderCard();
    expect(screen.getByTestId("verification-status-card").getAttribute("data-variant")).toBe(
      "rejected",
    );
    expect(screen.getByText(/Documents flous/)).toBeTruthy();
  });

  it("variant 'approved' si badge actif (expires_at futur)", async () => {
    badgeMock.data = {
      id: "b1",
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      granted_at: "2026-05-01T00:00:00Z",
    };
    await renderCard();
    expect(screen.getByTestId("verification-status-card").getAttribute("data-variant")).toBe(
      "approved",
    );
  });
});
