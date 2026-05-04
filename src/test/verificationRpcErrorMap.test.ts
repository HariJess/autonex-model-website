import { describe, expect, it } from "vitest";
import { mapSubmitVerificationErrorToI18nKey } from "@/hooks/verification/useSubmitVerification";
import { mapApproveVerificationErrorToI18nKey } from "@/hooks/admin/useApproveVerification";
import { mapRejectVerificationErrorToI18nKey } from "@/hooks/admin/useRejectVerification";

/**
 * PROMPT 7 — déterministe mapping codes RPC → i18n key.
 */
describe("submit_verification error map", () => {
  it.each([
    ["insufficient_credits", "verification.errors.insufficientCredits"],
    ["verification_already_active", "verification.errors.alreadyActive"],
    ["invalid_full_name", "verification.errors.invalidFullName"],
    ["invalid_cin_number", "verification.errors.invalidCinNumber"],
    ["missing_documents", "verification.errors.uploadFailed"],
    ["invalid_document_path", "verification.errors.uploadFailed"],
    // HOTFIX : auth_required + not_authenticated → notAuthenticated key
    ["auth_required", "verification.errors.notAuthenticated"],
    ["not_authenticated", "verification.errors.notAuthenticated"],
  ])("maps `%s` → `%s`", (msg, expected) => {
    expect(mapSubmitVerificationErrorToI18nKey(msg)).toBe(expected);
  });

  it("pass-through quand le message EST déjà une i18n key (cas upload hook)", () => {
    expect(
      mapSubmitVerificationErrorToI18nKey("verification.errors.notAuthenticated"),
    ).toBe("verification.errors.notAuthenticated");
    expect(
      mapSubmitVerificationErrorToI18nKey("verification.errors.uploadFailed"),
    ).toBe("verification.errors.uploadFailed");
  });

  it("falls back to generic for unknown errors", () => {
    expect(mapSubmitVerificationErrorToI18nKey("Some random DB error")).toBe(
      "verification.errors.generic",
    );
  });

  it("is case-insensitive", () => {
    expect(mapSubmitVerificationErrorToI18nKey("INSUFFICIENT_CREDITS")).toBe(
      "verification.errors.insufficientCredits",
    );
  });
});

describe("approve_verification error map", () => {
  it.each([
    ["admin_required", "admin.verifications.errors.adminRequired"],
    ["verification_not_found", "admin.verifications.errors.notFound"],
    ["verification_not_reviewable: status=approved", "admin.verifications.errors.notReviewable"],
  ])("maps `%s` → `%s`", (msg, expected) => {
    expect(mapApproveVerificationErrorToI18nKey(msg)).toBe(expected);
  });

  it("fallback generic", () => {
    expect(mapApproveVerificationErrorToI18nKey("xyz")).toBe(
      "admin.verifications.errors.generic",
    );
  });
});

describe("reject_verification error map", () => {
  it.each([
    ["rejection_reason_too_short", "admin.verifications.errors.reasonTooShort"],
    ["invalid_rejection_category", "admin.verifications.errors.invalidCategory"],
    ["admin_required", "admin.verifications.errors.adminRequired"],
    ["verification_not_found", "admin.verifications.errors.notFound"],
  ])("maps `%s` → `%s`", (msg, expected) => {
    expect(mapRejectVerificationErrorToI18nKey(msg)).toBe(expected);
  });
});
