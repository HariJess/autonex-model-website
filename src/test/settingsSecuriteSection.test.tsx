import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const { mockToast, mockUser, mockState } = vi.hoisted(() => ({
  mockToast: { success: vi.fn(), error: vi.fn() },
  mockUser: { id: "user-1", email: "alice@example.com", last_sign_in_at: "2026-04-21T10:34:00Z" },
  mockState: {
    updateError: null as string | null,
    updateCalls: [] as { password?: string }[],
  },
}));

vi.mock("sonner", () => ({
  toast: Object.assign(vi.fn(), mockToast),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: mockUser, session: { user: mockUser } }),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      updateUser: async (payload: { password?: string }) => {
        mockState.updateCalls.push(payload);
        return mockState.updateError
          ? { data: null, error: new Error(mockState.updateError) }
          : { data: { user: mockUser }, error: null };
      },
    },
  },
}));

import { SecuriteSection } from "@/components/settings/sections/SecuriteSection";

function renderSection() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <SecuriteSection />
    </QueryClientProvider>,
  );
}

function fill(label: string, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}

function submitForm() {
  const form = screen.getByRole("button", { name: /Modifier/i }).closest("form");
  if (!form) throw new Error("no form");
  fireEvent.submit(form);
}

describe("SecuriteSection", () => {
  beforeEach(() => {
    mockState.updateError = null;
    mockState.updateCalls.length = 0;
    mockToast.success.mockClear();
    mockToast.error.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("renders the last sign-in formatted in French", () => {
    renderSection();
    const dd = screen.getByTestId("last-sign-in");
    expect(dd.textContent).toMatch(/avril/i);
    expect(dd.textContent).toMatch(/2026/);
  });

  it("rejects a password below 8 characters", async () => {
    renderSection();
    fill("Nouveau mot de passe", "Ab1");
    fill("Confirmer le mot de passe", "Ab1");
    submitForm();
    await waitFor(() => expect(screen.getByText("auth.passwordRuleMin8")).toBeInTheDocument());
    expect(mockState.updateCalls.length).toBe(0);
  });

  it("rejects a password missing uppercase", async () => {
    renderSection();
    fill("Nouveau mot de passe", "abcdefg1");
    fill("Confirmer le mot de passe", "abcdefg1");
    submitForm();
    await waitFor(() => expect(screen.getByText("auth.passwordRuleUppercase")).toBeInTheDocument());
    expect(mockState.updateCalls.length).toBe(0);
  });

  it("rejects a password missing a digit", async () => {
    renderSection();
    fill("Nouveau mot de passe", "Abcdefgh");
    fill("Confirmer le mot de passe", "Abcdefgh");
    submitForm();
    await waitFor(() => expect(screen.getByText("auth.passwordRuleDigit")).toBeInTheDocument());
    expect(mockState.updateCalls.length).toBe(0);
  });

  it("flags a confirm-password mismatch", async () => {
    renderSection();
    fill("Nouveau mot de passe", "Abcdef12");
    fill("Confirmer le mot de passe", "Abcdef13");
    submitForm();
    await waitFor(() =>
      expect(screen.getByText("auth.passwordMismatch")).toBeInTheDocument(),
    );
    expect(mockState.updateCalls.length).toBe(0);
  });

  it("calls supabase.auth.updateUser and toasts success on a valid submit", async () => {
    renderSection();
    fill("Nouveau mot de passe", "Abcdef12");
    fill("Confirmer le mot de passe", "Abcdef12");
    fireEvent.click(screen.getByRole("button", { name: /Modifier/i }));
    await waitFor(() => expect(mockToast.success).toHaveBeenCalledWith("Mot de passe modifié"));
    expect(mockState.updateCalls.at(-1)?.password).toBe("Abcdef12");
  });

  it("shows a toast error when supabase rejects the update", async () => {
    mockState.updateError = "password too weak";
    renderSection();
    fill("Nouveau mot de passe", "Abcdef12");
    fill("Confirmer le mot de passe", "Abcdef12");
    fireEvent.click(screen.getByRole("button", { name: /Modifier/i }));
    await waitFor(() => expect(mockToast.error).toHaveBeenCalled());
  });
});
