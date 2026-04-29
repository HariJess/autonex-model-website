/**
 * Lot 9.9 — Garde-fous de cohérence entre Zod et les règles DB
 * (`validate_listing_content()` — migration `20260420180000_moderation_helpers.sql`).
 *
 * Chaque test couvre une règle de la RPC DB. Si un de ces tests casse, le
 * frontend laissera passer une valeur que la DB rejettera → toast rouge en
 * prod, 4 étapes gaspillées pour l'utilisateur.
 */

import { describe, it, expect } from "vitest";
import {
  vehicleDescriptionSubSchema,
  vehicleAttrsSubSchema,
  PRICE_MIN_MGA,
  PRICE_MAX_MGA,
} from "@/pages/publish/publishFormSchema";
import { parseSupabaseError } from "@/lib/parseSupabaseError";

const BASE_DESCRIPTION_VALUES = {
  title: "",
  description: "",
  priceMga: "",
  negotiable: false,
};

const BASE_ATTRS_VALUES = {
  vehicleMake: "",
  vehicleModel: "",
  vehicleYear: "",
  vehicleFuel: "",
  vehicleTransmission: "",
  vehicleDrivetrain: "",
  vehicleCondition: "",
  vehicleSellerType: "",
  vehicleRentalMode: "",
  vehicleBodyStyle: "",
  vehicleDoors: "",
  vehicleSeats: "",
  vehicleExteriorColor: "",
  vehicleEngineDisplacement: "",
  vehicleInteriorColor: "",
  vehicleAvailabilityStatus: "",
  vehicleWhatsappPhone: "",
  vehicleIsElectric: false,
  vehicleIsHybrid: false,
};

function parseDescription(overrides: Partial<typeof BASE_DESCRIPTION_VALUES>) {
  return vehicleDescriptionSubSchema.safeParse({ ...BASE_DESCRIPTION_VALUES, ...overrides });
}

function parseAttrs(overrides: Partial<typeof BASE_ATTRS_VALUES>) {
  return vehicleAttrsSubSchema.safeParse({ ...BASE_ATTRS_VALUES, ...overrides });
}

describe("publishFormSchema — title", () => {
  it("empty string is allowed (draft state)", () => {
    expect(parseDescription({ title: "" }).success).toBe(true);
  });

  it("4 chars after trim → rejected (DB min 5)", () => {
    const result = parseDescription({ title: "abcd" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("publish.validation.title.minLength");
    }
  });

  it("5 chars exactly → OK", () => {
    expect(parseDescription({ title: "abcde" }).success).toBe(true);
  });

  it("120 chars exactly → OK", () => {
    expect(parseDescription({ title: "a".repeat(120) }).success).toBe(true);
  });

  it("121 chars → rejected (DB max 120)", () => {
    const result = parseDescription({ title: "a".repeat(121) });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("publish.validation.title.maxLength");
    }
  });

  it("« ___ab___ » (8 chars mais trim = 2) → rejected (trim counts)", () => {
    const result = parseDescription({ title: "   ab   " });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("publish.validation.title.minLength");
    }
  });
});

describe("publishFormSchema — description", () => {
  it("empty string is allowed (draft state)", () => {
    expect(parseDescription({ description: "" }).success).toBe(true);
  });

  it("39 chars after trim → rejected (DB min 40)", () => {
    const result = parseDescription({ description: "a".repeat(39) });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("publish.validation.description.minLength");
    }
  });

  it("40 chars exactly → OK", () => {
    expect(parseDescription({ description: "a".repeat(40) }).success).toBe(true);
  });

  it("« 20 chars » (ancien seuil Zod bogué) → rejected (garde-fou régression)", () => {
    const result = parseDescription({ description: "blahblahblahblahblah" }); // 20 chars
    expect(result.success).toBe(false);
  });
});

describe("publishFormSchema — priceMga", () => {
  it("empty string is allowed (draft state)", () => {
    expect(parseDescription({ priceMga: "" }).success).toBe(true);
  });

  it("99_999 → rejected (price_too_low)", () => {
    const result = parseDescription({ priceMga: "99999" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("publish.validation.price.min");
    }
  });

  it("100_000 → OK (borne basse)", () => {
    expect(parseDescription({ priceMga: String(PRICE_MIN_MGA) }).success).toBe(true);
  });

  it("10_000_000_000 → OK (borne haute)", () => {
    expect(parseDescription({ priceMga: String(PRICE_MAX_MGA) }).success).toBe(true);
  });

  it("10_000_000_001 → rejected (price_too_high)", () => {
    const result = parseDescription({ priceMga: String(PRICE_MAX_MGA + 1) });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("publish.validation.price.max");
    }
  });
});

describe("publishFormSchema — vehicleWhatsappPhone (E.164)", () => {
  it("empty is OK (optionnel)", () => {
    expect(parseAttrs({ vehicleWhatsappPhone: "" }).success).toBe(true);
  });

  it("« +261341234567 » (E.164 sans espaces) → OK", () => {
    expect(parseAttrs({ vehicleWhatsappPhone: "+261341234567" }).success).toBe(true);
  });

  it("avec espaces → rejected (DB regex refuse les espaces)", () => {
    const result = parseAttrs({ vehicleWhatsappPhone: "+261 34 12 34 567" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("publish.validation.whatsapp.format");
    }
  });

  it("« 261341234567 » (pas de +) → rejected", () => {
    expect(parseAttrs({ vehicleWhatsappPhone: "261341234567" }).success).toBe(false);
  });

  it("« 0341234567 » (format local) → rejected", () => {
    expect(parseAttrs({ vehicleWhatsappPhone: "0341234567" }).success).toBe(false);
  });

  it("« +0341234567 » (commence par 0 après +) → rejected", () => {
    expect(parseAttrs({ vehicleWhatsappPhone: "+0341234567" }).success).toBe(false);
  });
});

describe("parseSupabaseError — DB codes alignment", () => {
  it("title_too_short → message FR aligné DB (5 caractères)", () => {
    const msg = parseSupabaseError({ code: "P0001", message: "title_too_short" });
    expect(msg).toBe("Le titre doit faire au moins 5 caractères.");
  });

  it("title_too_long → message FR aligné DB (120 caractères)", () => {
    const msg = parseSupabaseError({ code: "P0001", message: "title_too_long" });
    expect(msg).toBe("Le titre ne peut pas dépasser 120 caractères.");
  });

  it("description_too_short → 40 caractères (PAS 20)", () => {
    const msg = parseSupabaseError({ code: "P0001", message: "description_too_short" });
    expect(msg).toBe("La description doit faire au moins 40 caractères.");
    // REGRESSION GUARD explicite : le message bogué parlait de 20.
    expect(msg).not.toMatch(/20 caractères/);
  });

  it("price_too_low → 100 000 Ar", () => {
    const msg = parseSupabaseError({ code: "P0001", message: "price_too_low" });
    expect(msg).toBe("Le prix doit être au moins 100 000 Ar.");
  });

  it("price_too_high → 10 milliards", () => {
    const msg = parseSupabaseError({ code: "P0001", message: "price_too_high" });
    expect(msg).toBe("Le prix ne peut pas dépasser 10 milliards d'Ariary.");
  });

  it("whatsapp_invalid → format international", () => {
    const msg = parseSupabaseError({ code: "P0001", message: "whatsapp_invalid" });
    expect(msg).toMatch(/international/);
  });

  it("rate_limit_exceeded → message dédié", () => {
    const msg = parseSupabaseError({ code: "P0001", message: "rate_limit_exceeded" });
    expect(msg).toMatch(/20 annonces/);
  });

  it("blacklisted_term → message dédié", () => {
    const msg = parseSupabaseError({ code: "P0001", message: "blacklisted_term" });
    expect(msg).toMatch(/terme non autorisé/);
  });

  it("needle reconnue même via CHECK constraint 23514", () => {
    const msg = parseSupabaseError({
      code: "23514",
      message: "new row violates check constraint \"description_too_short\"",
    });
    expect(msg).toBe("La description doit faire au moins 40 caractères.");
  });
});
