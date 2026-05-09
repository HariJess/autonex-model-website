import { describe, expect, it } from "vitest";
import { mapApplyBoostErrorToI18nKey } from "@/hooks/boosts/useApplyBoost";

/**
 * PROMPT 6 — error code → i18n key mapping pour la RPC apply_boost.
 * Chaque cas correspond à un RAISE EXCEPTION côté SQL. Couverture exhaustive
 * pour éviter qu'un RAISE EXCEPTION renvoie un toast i18n "generic".
 */

describe("mapApplyBoostErrorToI18nKey (PROMPT 6)", () => {
  it.each([
    ["insufficient_credits", "boost.errors.insufficientCredits"],
    ["bump_cooldown_active: next_available_at=2026-05-07T...", "boost.errors.cooldown"],
    ["not_owner", "boost.errors.notOwner"],
    ["listing_not_boostable: status=expired", "boost.errors.notBoostable"],
    ["listing_not_found", "boost.errors.notFound"],
    ["invalid_boost_type: foo", "boost.errors.invalidType"],
    ["auth_required", "boost.errors.notAuthenticated"],
    ["not_authenticated", "boost.errors.notAuthenticated"],
  ])("maps `%s` → `%s`", (msg, expected) => {
    expect(mapApplyBoostErrorToI18nKey(msg)).toBe(expected);
  });

  it("falls back to generic for unknown errors", () => {
    expect(mapApplyBoostErrorToI18nKey("Some unexpected DB error")).toBe(
      "boost.errors.generic",
    );
  });

  it("is case-insensitive (handles UPPERCASE PG codes)", () => {
    expect(mapApplyBoostErrorToI18nKey("INSUFFICIENT_CREDITS")).toBe(
      "boost.errors.insufficientCredits",
    );
  });
});
