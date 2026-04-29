import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Hoisted state + mocks: vi.mock factories run before the module body, so any
// reference they capture must be declared via vi.hoisted (or be a literal).
const { mockToast, mockUser, mockState } = vi.hoisted(() => {
  type MockProfile = {
    id: string;
    full_name: string | null;
    phone: string | null;
    whatsapp_phone: string | null;
    role: string;
    created_at: string | null;
    deletion_requested_at: string | null;
    deletion_scheduled_for: string | null;
    is_anonymized: boolean;
  };
  return {
    mockToast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
    mockUser: { id: "user-1", email: "alice@example.com", last_sign_in_at: "2026-04-21T10:34:00Z" },
    mockState: {
      profile: null as MockProfile | null,
      updateError: null as string | null,
      updatePayload: {} as Record<string, unknown>,
    },
  };
});

vi.mock("sonner", () => ({
  toast: Object.assign(vi.fn(), mockToast),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: mockUser, session: { user: mockUser } }),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (table: string) => {
      if (table !== "profiles") throw new Error(`unexpected table ${table}`);
      return {
        select: () => ({
          eq: () => ({
            single: async () =>
              mockState.profile
                ? { data: mockState.profile, error: null }
                : { data: null, error: new Error("no profile") },
          }),
        }),
        update: (values: Record<string, unknown>) => {
          Object.assign(mockState.updatePayload, values);
          return {
            eq: async () =>
              mockState.updateError ? { error: new Error(mockState.updateError) } : { error: null },
          };
        },
      };
    },
  },
}));

import { ProfilSection } from "@/components/settings/sections/ProfilSection";

const defaultProfile = {
  id: "user-1",
  full_name: "Alice Dupont",
  phone: "+261340000000",
  whatsapp_phone: "+261340000001",
  role: "particulier",
  created_at: "2025-06-15T12:00:00Z",
  deletion_requested_at: null,
  deletion_scheduled_for: null,
  is_anonymized: false,
};

function renderSection() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <ProfilSection />
    </QueryClientProvider>,
  );
}

function changeInput(input: HTMLElement, value: string) {
  fireEvent.change(input, { target: { value } });
}

describe("ProfilSection", () => {
  beforeEach(() => {
    mockState.profile = { ...defaultProfile };
    mockState.updateError = null;
    for (const k of Object.keys(mockState.updatePayload)) delete mockState.updatePayload[k];
    mockToast.success.mockClear();
    mockToast.error.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("renders readonly account info and pre-fills the form from the profile row", async () => {
    renderSection();
    await waitFor(() => expect(screen.getByDisplayValue("Alice Dupont")).toBeInTheDocument());
    expect(screen.getByText("alice@example.com")).toBeInTheDocument();
    // ROLE_LABEL_KEYS in ProfilSection maps "particulier" → "account.profile.roleIndividual";
    // the test mock returns the key when no fallback is provided.
    expect(screen.getByText("account.profile.roleIndividual")).toBeInTheDocument();
    expect(screen.getByDisplayValue("+261340000000")).toBeInTheDocument();
    expect(screen.getByDisplayValue("+261340000001")).toBeInTheDocument();
  });

  it("submits updated values and fires success toast", async () => {
    renderSection();
    const nameInput = await screen.findByDisplayValue("Alice Dupont");
    changeInput(nameInput, "Alice Martin");
    fireEvent.click(screen.getByRole("button", { name: /Enregistrer/i }));
    await waitFor(() => expect(mockToast.success).toHaveBeenCalledWith("Profil mis à jour"));
    expect(mockState.updatePayload.full_name).toBe("Alice Martin");
  });

  it("surfaces a toast error when the update RPC rejects", async () => {
    mockState.updateError = "something went wrong";
    renderSection();
    await screen.findByDisplayValue("Alice Dupont");
    fireEvent.click(screen.getByRole("button", { name: /Enregistrer/i }));
    await waitFor(() => expect(mockToast.error).toHaveBeenCalled());
  });

  it("disables the form and shows a deletion-in-progress banner when deletion_requested_at is set", async () => {
    mockState.profile = {
      ...defaultProfile,
      deletion_requested_at: "2026-04-20T08:00:00Z",
      deletion_scheduled_for: "2026-05-20T08:00:00Z",
    };
    renderSection();
    await screen.findByText("Suppression en cours");
    expect(screen.getByDisplayValue("Alice Dupont")).toBeDisabled();
    expect(screen.getByRole("button", { name: /Enregistrer/i })).toBeDisabled();
  });

  it("rejects a full_name shorter than 2 characters via Zod", async () => {
    renderSection();
    const nameInput = await screen.findByDisplayValue("Alice Dupont");
    changeInput(nameInput, "A");
    fireEvent.submit(nameInput.closest("form")!);
    await waitFor(() =>
      expect(screen.getByText("account.profile.errors.nameMin2")).toBeInTheDocument(),
    );
    expect(mockState.updatePayload.full_name).toBeUndefined();
  });

  it("rejects an invalid phone via the optional MG schema", async () => {
    renderSection();
    const phoneInput = await screen.findByDisplayValue("+261340000000");
    changeInput(phoneInput, "abc");
    fireEvent.submit(phoneInput.closest("form")!);
    await waitFor(() => expect(screen.getByText(/Numéro invalide/i)).toBeInTheDocument());
    expect(mockState.updatePayload.phone).toBeUndefined();
  });

  it("keeps the submit button enabled while the form is editable and mutation is idle", async () => {
    renderSection();
    await screen.findByDisplayValue("Alice Dupont");
    expect(screen.getByRole("button", { name: /Enregistrer/i })).not.toBeDisabled();
  });
});
