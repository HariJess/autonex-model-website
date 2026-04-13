import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { SearchActiveChips } from "@/pages/search/components/SearchActiveChips";

describe("SearchActiveChips", () => {
  it("retire un filtre via un vrai bouton", () => {
    const onRemoveChip = vi.fn();

    render(
      <SearchActiveChips
        chips={[{ key: "ville", label: "Antananarivo" }]}
        clearAllLabel="Effacer tout"
        onRemoveChip={onRemoveChip}
        onClearAll={() => {}}
      />,
    );

    const removeButton = screen.getByRole("button", { name: /retirer le filtre antananarivo/i });
    fireEvent.click(removeButton);

    expect(onRemoveChip).toHaveBeenCalledWith("ville");
  });

  it("declenche l'action effacer tout", () => {
    const onClearAll = vi.fn();

    render(
      <SearchActiveChips
        chips={[{ key: "transaction", label: "Vente" }]}
        clearAllLabel="Effacer tout"
        onRemoveChip={() => {}}
        onClearAll={onClearAll}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /effacer tout/i }));
    expect(onClearAll).toHaveBeenCalledTimes(1);
  });
});

