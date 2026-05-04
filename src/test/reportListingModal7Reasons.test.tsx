import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

/**
 * PROMPT 8 — ReportListingModal expose les 7 reasons V1 :
 *   scam, fake_photos, inappropriate, wrong_price, wrong_category, duplicate, other
 */

const mutationMock = vi.hoisted(() => ({
  mutate: vi.fn(),
  reset: vi.fn(),
  isPending: false,
}));

vi.mock("@/hooks/useCreateListingReport", () => ({
  useCreateListingReport: () => mutationMock,
  ListingReportError: class extends Error {
    code = "unknown";
  },
  normalizeListingReportError: (raw: unknown) =>
    raw instanceof Error ? raw : new Error(String(raw)),
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

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

describe("ReportListingModal 7 reasons (PROMPT 8)", () => {
  beforeEach(() => {
    mutationMock.mutate.mockReset();
    mutationMock.reset.mockReset();
    mutationMock.isPending = false;
  });

  it("rend les 7 radio options dans l'ordre V1", async () => {
    const { ReportListingModal } = await import(
      "@/components/listing/ReportListingModal"
    );
    render(<ReportListingModal listingId="listing-1" open={true} onOpenChange={() => {}} />);

    expect(document.getElementById("report-reason-scam")).toBeTruthy();
    expect(document.getElementById("report-reason-fake_photos")).toBeTruthy();
    expect(document.getElementById("report-reason-inappropriate")).toBeTruthy();
    expect(document.getElementById("report-reason-wrong_price")).toBeTruthy();
    expect(document.getElementById("report-reason-wrong_category")).toBeTruthy();
    expect(document.getElementById("report-reason-duplicate")).toBeTruthy();
    expect(document.getElementById("report-reason-other")).toBeTruthy();
  });

  it("submit avec reason='wrong_category' appelle mutate avec la bonne valeur", async () => {
    const { ReportListingModal } = await import(
      "@/components/listing/ReportListingModal"
    );
    render(<ReportListingModal listingId="listing-1" open={true} onOpenChange={() => {}} />);

    // Sélectionner wrong_category via click sur le label associé
    const radio = document.getElementById("report-reason-wrong_category") as HTMLElement;
    fireEvent.click(radio);

    // Click submit
    const submitBtn = screen.getByText(/Envoyer le signalement/);
    fireEvent.click(submitBtn);

    expect(mutationMock.mutate).toHaveBeenCalled();
    const callArg = mutationMock.mutate.mock.calls[0][0] as { reason: string };
    expect(callArg.reason).toBe("wrong_category");
  });

  it("submit avec reason='fake_photos' appelle mutate avec la bonne valeur", async () => {
    const { ReportListingModal } = await import(
      "@/components/listing/ReportListingModal"
    );
    render(<ReportListingModal listingId="listing-1" open={true} onOpenChange={() => {}} />);

    const radio = document.getElementById("report-reason-fake_photos") as HTMLElement;
    fireEvent.click(radio);

    const submitBtn = screen.getByText(/Envoyer le signalement/);
    fireEvent.click(submitBtn);

    expect(mutationMock.mutate).toHaveBeenCalled();
    const callArg = mutationMock.mutate.mock.calls[0][0] as { reason: string };
    expect(callArg.reason).toBe("fake_photos");
  });
});
