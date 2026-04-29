import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const { mockUser, mockState, mockCancelCalls } = vi.hoisted(() => ({
  mockUser: { id: "user-1", email: "a@b.c" },
  mockState: {
    status: null as
      | null
      | { is_pending: boolean; is_anonymized: boolean; deletion_scheduled_for: Date | null; deletion_requested_at: Date | null; deletion_email_sent_at: Date | null; deletion_email_error: string | null },
    cancelDelay: 0,
  },
  mockCancelCalls: [] as number[],
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: mockUser, session: { user: mockUser } }),
}));

vi.mock("@/hooks/useAccountDeletion", () => ({
  useDeletionStatus: () => ({ data: mockState.status, isLoading: false }),
  useCancelDeletion: () => ({
    mutate: () => {
      mockCancelCalls.push(Date.now());
    },
    isPending: false,
  }),
}));

import { DeletionPendingBanner } from "@/components/settings/DeletionPendingBanner";

function renderBanner() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <DeletionPendingBanner />
    </QueryClientProvider>,
  );
}

describe("DeletionPendingBanner", () => {
  beforeEach(() => {
    mockState.status = null;
    mockCancelCalls.length = 0;
  });

  it("renders nothing when status is null", () => {
    const { container } = renderBanner();
    expect(container.firstChild).toBeNull();
  });

  it("renders nothing in the normal state (no pending, no anonymized)", () => {
    mockState.status = {
      is_pending: false,
      is_anonymized: false,
      deletion_scheduled_for: null,
      deletion_requested_at: null,
      deletion_email_sent_at: null,
      deletion_email_error: null,
    };
    const { container } = renderBanner();
    expect(container.firstChild).toBeNull();
  });

  it("renders the pending banner with the scheduled date and a cancel button", () => {
    mockState.status = {
      is_pending: true,
      is_anonymized: false,
      deletion_scheduled_for: new Date("2026-05-21T00:00:00Z"),
      deletion_requested_at: new Date("2026-04-21T10:00:00Z"),
      deletion_email_sent_at: null,
      deletion_email_error: null,
    };
    renderBanner();
    expect(screen.getByTestId("deletion-pending-banner")).toBeInTheDocument();
    // The mock returns the i18n key when t() is called with an interpolation
    // object (it can't synthesize the FR string). Assert the key + the cancel
    // button label (which has a fallback so the FR text still surfaces).
    expect(screen.getByText("account.deletionBanner.pendingTitleWithDate")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Annuler la suppression/i })).toBeInTheDocument();
  });

  it("clicking the cancel button triggers the cancel mutation", async () => {
    mockState.status = {
      is_pending: true,
      is_anonymized: false,
      deletion_scheduled_for: new Date("2026-05-21T00:00:00Z"),
      deletion_requested_at: new Date("2026-04-21T10:00:00Z"),
      deletion_email_sent_at: null,
      deletion_email_error: null,
    };
    renderBanner();
    fireEvent.click(screen.getByRole("button", { name: /Annuler la suppression/i }));
    await waitFor(() => expect(mockCancelCalls.length).toBe(1));
  });

  it("renders a distinct anonymized banner without a cancel button", () => {
    mockState.status = {
      is_pending: false,
      is_anonymized: true,
      deletion_scheduled_for: null,
      deletion_requested_at: null,
      deletion_email_sent_at: null,
      deletion_email_error: null,
    };
    renderBanner();
    expect(screen.getByText(/Compte anonymisé/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Annuler la suppression/i })).toBeNull();
  });
});
