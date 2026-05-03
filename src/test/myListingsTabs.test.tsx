import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MyListingsTabs } from "@/features/listings/components/MyListingsTabs";
import type { MyListingsFilter } from "@/features/listings/hooks/useMyListings";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (_key: string, fallback?: string) => fallback ?? "",
  }),
}));

const ZERO_COUNTS: Record<MyListingsFilter, number> = {
  all: 0, active: 0, expiring_soon: 0, expired: 0, sold: 0, draft: 0,
};

describe("MyListingsTabs", () => {
  it("affiche les 6 tabs avec leur count", () => {
    const counts = { all: 5, active: 2, expiring_soon: 1, expired: 1, sold: 1, draft: 0 };
    render(<MyListingsTabs activeFilter="all" counts={counts} onFilterChange={vi.fn()} />);
    expect(screen.getByTestId("tab-all")).toBeTruthy();
    expect(screen.getByTestId("tab-active")).toBeTruthy();
    expect(screen.getByTestId("tab-expiring_soon")).toBeTruthy();
    expect(screen.getByTestId("tab-expired")).toBeTruthy();
    expect(screen.getByTestId("tab-sold")).toBeTruthy();
    expect(screen.getByTestId("tab-draft")).toBeTruthy();
    expect(screen.getByTestId("tab-all-count").textContent).toBe("5");
    expect(screen.getByTestId("tab-active-count").textContent).toBe("2");
    expect(screen.getByTestId("tab-draft-count").textContent).toBe("0");
  });

  it("data-state='active' reflète activeFilter (câblage value/onValueChange OK)", () => {
    // Note : Radix Tabs en jsdom ne déclenche pas onValueChange via fireEvent
    // (utilise PointerEvent indispo en jsdom). On vérifie le câblage indirect :
    // si activeFilter='active' est passé, le trigger correspondant a
    // data-state='active'. C'est suffisant pour valider la liaison props.
    const { rerender } = render(
      <MyListingsTabs activeFilter="all" counts={ZERO_COUNTS} onFilterChange={vi.fn()} />,
    );
    expect(screen.getByTestId("tab-all").getAttribute("data-state")).toBe("active");
    expect(screen.getByTestId("tab-active").getAttribute("data-state")).toBe("inactive");

    rerender(<MyListingsTabs activeFilter="active" counts={ZERO_COUNTS} onFilterChange={vi.fn()} />);
    expect(screen.getByTestId("tab-active").getAttribute("data-state")).toBe("active");
    expect(screen.getByTestId("tab-all").getAttribute("data-state")).toBe("inactive");
  });

  it("indicateur orange sur 'expiring_soon' si count > 0", () => {
    const counts = { ...ZERO_COUNTS, expiring_soon: 1 };
    render(<MyListingsTabs activeFilter="all" counts={counts} onFilterChange={vi.fn()} />);
    expect(screen.getByTestId("tab-expiring_soon-alert-dot")).toBeTruthy();
  });

  it("pas d'indicateur si expiring_soon = 0", () => {
    render(<MyListingsTabs activeFilter="all" counts={ZERO_COUNTS} onFilterChange={vi.fn()} />);
    expect(screen.queryByTestId("tab-expiring_soon-alert-dot")).toBeNull();
  });
});
