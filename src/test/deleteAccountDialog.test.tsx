import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const { mutationState, mockCalls, onSuccessCapture } = vi.hoisted(() => ({
  mutationState: { isPending: false, isError: false, errorMessage: "" as string | null },
  mockCalls: { count: 0 },
  onSuccessCapture: { fn: null as null | (() => void) },
}));

vi.mock("@/hooks/useAccountDeletion", () => ({
  useRequestDeletion: () => ({
    mutate: (_vars: unknown, opts?: { onSuccess?: () => void }) => {
      mockCalls.count += 1;
      onSuccessCapture.fn = opts?.onSuccess ?? null;
    },
    isPending: mutationState.isPending,
    isError: mutationState.isError,
    error: mutationState.errorMessage ? new Error(mutationState.errorMessage) : null,
    reset: () => {
      mutationState.isError = false;
      mutationState.errorMessage = null;
    },
  }),
}));

import { DeleteAccountDialog } from "@/components/settings/DeleteAccountDialog";

function renderDialog(open = true) {
  const onOpenChange = vi.fn();
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const utils = render(
    <QueryClientProvider client={qc}>
      <DeleteAccountDialog open={open} onOpenChange={onOpenChange} />
    </QueryClientProvider>,
  );
  return { ...utils, onOpenChange };
}

describe("DeleteAccountDialog", () => {
  beforeEach(() => {
    mutationState.isPending = false;
    mutationState.isError = false;
    mutationState.errorMessage = null;
    mockCalls.count = 0;
    onSuccessCapture.fn = null;
  });

  it("starts on the description step (bullet list + Continuer button)", () => {
    renderDialog();
    expect(screen.getByText(/Supprimer mon compte \?/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Continuer/i })).toBeInTheDocument();
    expect(screen.queryByTestId("delete-confirm-input")).toBeNull();
  });

  it("clicking Continuer advances to the confirmation step", () => {
    renderDialog();
    fireEvent.click(screen.getByRole("button", { name: /Continuer/i }));
    expect(screen.getByTestId("delete-confirm-input")).toBeInTheDocument();
  });

  it("disables confirm while the typed value doesn't exactly match SUPPRIMER", () => {
    renderDialog();
    fireEvent.click(screen.getByRole("button", { name: /Continuer/i }));
    const input = screen.getByTestId("delete-confirm-input") as HTMLInputElement;
    const confirmBtn = screen.getByTestId("delete-confirm-button") as HTMLButtonElement;

    expect(confirmBtn).toBeDisabled();

    fireEvent.change(input, { target: { value: "abc" } });
    expect(confirmBtn).toBeDisabled();
    expect(screen.getByText(/Veuillez taper exactement SUPPRIMER/i)).toBeInTheDocument();

    fireEvent.change(input, { target: { value: "supprimer" } });
    expect(confirmBtn).toBeDisabled();
  });

  it("enables confirm on exact match and triggers the request mutation", async () => {
    renderDialog();
    fireEvent.click(screen.getByRole("button", { name: /Continuer/i }));
    const input = screen.getByTestId("delete-confirm-input");
    fireEvent.change(input, { target: { value: "SUPPRIMER" } });
    const confirmBtn = screen.getByTestId("delete-confirm-button");
    expect(confirmBtn).not.toBeDisabled();
    fireEvent.click(confirmBtn);
    await waitFor(() => expect(mockCalls.count).toBe(1));
  });

  it("closes the dialog on successful mutation (onSuccess callback runs)", () => {
    const { onOpenChange } = renderDialog();
    fireEvent.click(screen.getByRole("button", { name: /Continuer/i }));
    const input = screen.getByTestId("delete-confirm-input");
    fireEvent.change(input, { target: { value: "SUPPRIMER" } });
    fireEvent.click(screen.getByTestId("delete-confirm-button"));
    // Simulate the mutation's onSuccess firing (captured via the mock).
    onSuccessCapture.fn?.();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("surfaces a destructive alert when the mutation errors out", () => {
    mutationState.isError = true;
    mutationState.errorMessage = "RPC failed: quota_exceeded";
    renderDialog();
    fireEvent.click(screen.getByRole("button", { name: /Continuer/i }));
    expect(screen.getByRole("alert")).toHaveTextContent(/quota_exceeded/i);
  });

  it("Retour button returns to the description step and clears the input", () => {
    renderDialog();
    fireEvent.click(screen.getByRole("button", { name: /Continuer/i }));
    fireEvent.change(screen.getByTestId("delete-confirm-input"), { target: { value: "SUPPRIMER" } });
    fireEvent.click(screen.getByRole("button", { name: /Retour/i }));
    expect(screen.queryByTestId("delete-confirm-input")).toBeNull();
    expect(screen.getByRole("button", { name: /Continuer/i })).toBeInTheDocument();
  });
});
