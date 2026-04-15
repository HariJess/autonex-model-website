import { describe, expect, it } from "vitest";
import {
  buildListingMaterialSnapshotFromForm,
  shouldSendPublishedListingToReview,
  isEditablePublishedListingStatus,
} from "@/lib/publishDraft";

const baseForm = {
  transaction: "vente" as const,
  listingType: "appartement" as const,
  isNewProgram: false,
  internalRef: "",
  ville: "Antananarivo",
  arrondissement: "",
  quartier: "",
  quartierLibre: "",
  pinLat: -18.88,
  pinLng: 47.52,
  title: "Bel appartement centre-ville",
  description: "Description suffisamment longue pour les validations du formulaire de publication.",
  priceMga: "100000000",
  surface: "80",
  rooms: "3",
  bathrooms: "2",
  toilets: "",
  selectedFeatures: ["Bluetooth", "Camera de recul"],
  videoUrl: "",
  virtualTourUrl: "",
};

describe("isEditablePublishedListingStatus", () => {
  it("allows active and paused", () => {
    expect(isEditablePublishedListingStatus("active")).toBe(true);
    expect(isEditablePublishedListingStatus("paused")).toBe(true);
  });

  it("rejects draft and payment-pending", () => {
    expect(isEditablePublishedListingStatus("draft")).toBe(false);
    expect(isEditablePublishedListingStatus("pending_payment")).toBe(false);
  });
});

describe("shouldSendPublishedListingToReview", () => {
  it("returns false when snapshot unchanged", () => {
    const snap = buildListingMaterialSnapshotFromForm(baseForm, ["a", "b"], 0);
    expect(
      shouldSendPublishedListingToReview({
        moderationStatus: "active",
        baselineSnapshot: snap,
        currentSnapshot: snap,
      }),
    ).toBe(false);
  });

  it("returns true for active listing when title changes", () => {
    const a = buildListingMaterialSnapshotFromForm(baseForm, ["p1"], 0);
    const b = buildListingMaterialSnapshotFromForm({ ...baseForm, title: "Autre titre" }, ["p1"], 0);
    expect(
      shouldSendPublishedListingToReview({
        moderationStatus: "active",
        baselineSnapshot: a,
        currentSnapshot: b,
      }),
    ).toBe(true);
  });

  it("returns false for draft-like status even if content changes", () => {
    const a = buildListingMaterialSnapshotFromForm(baseForm, ["p1"], 0);
    const b = buildListingMaterialSnapshotFromForm({ ...baseForm, title: "X" }, ["p1"], 0);
    expect(
      shouldSendPublishedListingToReview({
        moderationStatus: "draft",
        baselineSnapshot: a,
        currentSnapshot: b,
      }),
    ).toBe(false);
  });
});
