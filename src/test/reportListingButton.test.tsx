import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ReportListingButton } from "@/components/listing/ReportListingButton";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (_key: string, fallback?: string) => fallback ?? _key,
  }),
}));

let mockedUser: { id: string } | null = null;

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: mockedUser, isAdmin: false }),
}));

vi.mock("sonner", () => ({
  toast: Object.assign(vi.fn(), { info: vi.fn(), error: vi.fn(), success: vi.fn() }),
}));

// Prevent the modal from mounting (it needs QueryClient / supabase)
vi.mock("@/components/listing/ReportListingModal", () => ({
  ReportListingModal: () => null,
}));

function renderButton(props: Partial<Parameters<typeof ReportListingButton>[0]> = {}) {
  const defaults = {
    listingId: "listing-1",
    ownerId: "owner-1",
    listingStatus: "active" as const,
  };
  return render(
    <MemoryRouter>
      <ReportListingButton {...defaults} {...props} />
    </MemoryRouter>,
  );
}

describe("ReportListingButton", () => {
  it("renders when user is a visitor (not logged in) and listing is active", () => {
    mockedUser = null;
    renderButton();
    expect(screen.getByRole("button", { name: /Signaler/i })).toBeInTheDocument();
  });

  it("renders when an authenticated user visits a listing that's not theirs", () => {
    mockedUser = { id: "viewer-1" };
    renderButton({ ownerId: "owner-xyz" });
    expect(screen.getByRole("button", { name: /Signaler/i })).toBeInTheDocument();
  });

  it("hides when the authenticated user is the listing owner", () => {
    mockedUser = { id: "owner-same" };
    renderButton({ ownerId: "owner-same" });
    expect(screen.queryByRole("button", { name: /Signaler/i })).not.toBeInTheDocument();
  });

  it("hides when the listing is not active", () => {
    mockedUser = { id: "viewer-1" };
    renderButton({ listingStatus: "pending_review" });
    expect(screen.queryByRole("button", { name: /Signaler/i })).not.toBeInTheDocument();
  });

  it("hides when the listing was rejected", () => {
    mockedUser = { id: "viewer-1" };
    renderButton({ listingStatus: "rejected" });
    expect(screen.queryByRole("button", { name: /Signaler/i })).not.toBeInTheDocument();
  });
});
