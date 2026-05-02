import { describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import type { ReactNode } from "react";
import PublishPage from "@/pages/PublishPage";

// YasProvider non monté dans ce smoke test : mock plat pour Header / Footer.
vi.mock("@/features/yas-app/hooks/useYasContext", () => ({
  useYasContext: () => ({
    isEmbedded: false,
    source: null,
    platform: null,
    entryPoint: null,
    sessionId: "test-session",
  }),
  readYasContextFromStorage: () => ({
    isEmbedded: false,
    source: null,
    platform: null,
    entryPoint: null,
    sessionId: "test-session",
  }),
  YasProvider: ({ children }: { children: ReactNode }) => children,
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (_key: string, fallback?: string) => fallback ?? _key,
  }),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: null,
    profile: null,
    refreshProfile: vi.fn(),
  }),
}));

vi.mock("@tanstack/react-query", () => ({
  useQuery: () => ({ data: [], isPending: false }),
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
}));

vi.mock("@/hooks/useCreditsBalance", () => ({
  useCreditsBalance: () => ({ data: 0, isPending: false }),
}));

vi.mock("sonner", () => ({
  toast: Object.assign(vi.fn(), { error: vi.fn(), success: vi.fn() }),
}));

vi.mock("@/components/Header", () => ({ default: () => <div>Header</div> }));
vi.mock("@/components/Footer", () => ({ default: () => <div>Footer</div> }));
vi.mock("@/pages/publish/components/PublishPageHeader", () => ({
  PublishPageHeader: () => <div>PublishPageHeader</div>,
}));
vi.mock("@/pages/publish/components/PublishProgressSteps", () => ({
  PublishProgressSteps: () => <div>PublishProgressSteps</div>,
}));
vi.mock("@/pages/publish/components/PublishStepErrors", () => ({
  PublishStepErrors: () => null,
}));
vi.mock("@/pages/publish/components/PublishBasicInfoSection", () => ({
  PublishBasicInfoSection: () => <div>PublishBasicInfoSection</div>,
}));
vi.mock("@/pages/publish/components/PublishDetailsSection", () => ({
  PublishDetailsSection: () => <div>PublishDetailsSection</div>,
}));
vi.mock("@/pages/publish/components/PublishMediaSection", () => ({
  PublishMediaSection: () => <div>PublishMediaSection</div>,
}));
vi.mock("@/pages/publish/components/PublishStepNav", () => ({
  PublishStepNav: () => <div>PublishStepNav</div>,
}));
vi.mock("@/components/publish/PublishStepVisibility", () => ({
  default: () => <div>PublishStepVisibility</div>,
}));

describe("PublishPage regression", () => {
  it("renders without selectedFeaturesWithVehicleMeta initialization crash", () => {
    expect(() =>
      render(
        <HelmetProvider>
          <MemoryRouter initialEntries={["/publier"]}>
            <Routes>
              <Route path="/publier" element={<PublishPage />} />
            </Routes>
          </MemoryRouter>
        </HelmetProvider>,
      ),
    ).not.toThrow();
  });
});
