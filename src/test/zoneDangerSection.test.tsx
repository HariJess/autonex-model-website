import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const { mockStatus, mockExportCalls, mockRequestCalls } = vi.hoisted(() => ({
  mockStatus: { value: null as null | { is_pending: boolean; is_anonymized: boolean } },
  mockExportCalls: { count: 0 },
  mockRequestCalls: { count: 0 },
}));

vi.mock("@/hooks/useAccountDeletion", () => ({
  useDeletionStatus: () => ({ data: mockStatus.value, isLoading: false }),
  useExportData: () => ({
    mutate: () => {
      mockExportCalls.count += 1;
    },
    isPending: false,
  }),
  useRequestDeletion: () => ({
    mutate: () => {
      mockRequestCalls.count += 1;
    },
    isPending: false,
    isError: false,
    error: null,
    reset: () => {},
  }),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: "user-1", email: "a@b.c" } }),
}));

import { ZoneDangerSection } from "@/components/settings/sections/ZoneDangerSection";

function renderSection() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <ZoneDangerSection />
    </QueryClientProvider>,
  );
}

describe("ZoneDangerSection", () => {
  beforeEach(() => {
    mockStatus.value = { is_pending: false, is_anonymized: false };
    mockExportCalls.count = 0;
    mockRequestCalls.count = 0;
  });

  it("renders both cards (export + delete) in the normal state", () => {
    renderSection();
    expect(screen.getByRole("heading", { name: /Télécharger mes données/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Supprimer mon compte/i })).toBeInTheDocument();
    expect(screen.getByTestId("danger-export-button")).toBeInTheDocument();
    expect(screen.getByTestId("danger-delete-button")).toBeInTheDocument();
  });

  it("clicking the export button triggers the mutation", async () => {
    renderSection();
    fireEvent.click(screen.getByTestId("danger-export-button"));
    await waitFor(() => expect(mockExportCalls.count).toBe(1));
  });

  it("clicking the delete button opens the confirmation dialog", () => {
    renderSection();
    fireEvent.click(screen.getByTestId("danger-delete-button"));
    expect(screen.getByTestId("delete-account-dialog")).toBeInTheDocument();
  });

  it("hides both cards and shows the pending Alert when a deletion is pending", () => {
    mockStatus.value = { is_pending: true, is_anonymized: false };
    renderSection();
    expect(screen.getByText(/Demande de suppression en cours/i)).toBeInTheDocument();
    expect(screen.queryByTestId("danger-export-button")).toBeNull();
    expect(screen.queryByTestId("danger-delete-button")).toBeNull();
  });
});
