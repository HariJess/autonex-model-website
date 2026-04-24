import { describe, it, expect } from "vitest";
import {
  SUPPORTED_EMAIL_MODES,
  getEmailCtaUrl,
  getEmailModeForPriority,
  getSingleTemplateForType,
  hasEmailQuotaRemaining,
} from "@/lib/emailRouting";

describe("getSingleTemplateForType", () => {
  it("mappe les 3 types supportés en single-send", () => {
    expect(getSingleTemplateForType("listing_published")).toBe("listing_published");
    expect(getSingleTemplateForType("listing_rejected")).toBe("listing_rejected");
    expect(getSingleTemplateForType("credits_purchased")).toBe("credits_purchased");
  });

  it("renvoie null pour les types sans template unitaire", () => {
    expect(getSingleTemplateForType("welcome")).toBeNull();
    expect(getSingleTemplateForType("listing_expiring_soon")).toBeNull();
    expect(getSingleTemplateForType("listing_expired")).toBeNull();
    expect(getSingleTemplateForType("credits_low")).toBeNull();
    expect(getSingleTemplateForType("admin_moderation_needed")).toBeNull();
    expect(getSingleTemplateForType("system")).toBeNull();
  });
});

describe("getEmailModeForPriority", () => {
  it("critical → immediate", () => {
    expect(getEmailModeForPriority("critical")).toBe("immediate");
  });

  it("high et normal → digest", () => {
    expect(getEmailModeForPriority("high")).toBe("digest");
    expect(getEmailModeForPriority("normal")).toBe("digest");
  });

  it("low → none (jamais d'email)", () => {
    expect(getEmailModeForPriority("low")).toBe("none");
  });
});

describe("getEmailCtaUrl", () => {
  const ORIGIN = "https://autonex.mg";

  it("préfère action_url absolue quand fournie", () => {
    expect(
      getEmailCtaUrl("listing_published", {}, "https://example.com/abc"),
    ).toBe("https://example.com/abc");
  });

  it("préfixe l'origin si action_url est relative", () => {
    expect(
      getEmailCtaUrl("listing_published", {}, "/annonce/xyz"),
    ).toBe("https://autonex.mg/annonce/xyz");
  });

  it("fallback listing_id pour listing_published", () => {
    expect(
      getEmailCtaUrl("listing_published", { listing_id: "abc-123" }, null),
    ).toBe(`${ORIGIN}/annonce/abc-123`);
  });

  it("fallback listing_id pour listing_rejected → /publier?draft", () => {
    expect(
      getEmailCtaUrl("listing_rejected", { listing_id: "abc-123" }, null),
    ).toBe(`${ORIGIN}/publier?draft=abc-123`);
  });

  it("credits_purchased pointe vers /dashboard", () => {
    expect(
      getEmailCtaUrl("credits_purchased", {}, null),
    ).toBe(`${ORIGIN}/dashboard`);
  });

  it("retourne null pour les types sans URL dérivable et sans action_url", () => {
    expect(getEmailCtaUrl("welcome", {}, null)).toBeNull();
    expect(getEmailCtaUrl("listing_expired", {}, null)).toBeNull();
  });

  it("metadata non-string ignorée (robustesse)", () => {
    expect(
      getEmailCtaUrl("listing_published", { listing_id: 42 } as Record<string, unknown>, null),
    ).toBeNull();
  });
});

describe("hasEmailQuotaRemaining", () => {
  it("true si sentToday < maxPerDay", () => {
    expect(hasEmailQuotaRemaining({ sentToday: 3, maxPerDay: 5 })).toBe(true);
  });

  it("false si sentToday === maxPerDay (saturation exacte)", () => {
    expect(hasEmailQuotaRemaining({ sentToday: 5, maxPerDay: 5 })).toBe(false);
  });

  it("false si sentToday > maxPerDay", () => {
    expect(hasEmailQuotaRemaining({ sentToday: 10, maxPerDay: 5 })).toBe(false);
  });

  it("gère maxPerDay=0 (désactivation totale)", () => {
    expect(hasEmailQuotaRemaining({ sentToday: 0, maxPerDay: 0 })).toBe(false);
  });
});

describe("SUPPORTED_EMAIL_MODES (garde-fou cron/function)", () => {
  it("expose immediate et digest — alignement avec pg_cron", () => {
    expect(SUPPORTED_EMAIL_MODES).toEqual(["immediate", "digest"]);
  });

  it("aucun mode inattendu introduit sans test correspondant", () => {
    expect(SUPPORTED_EMAIL_MODES).toHaveLength(2);
  });
});
