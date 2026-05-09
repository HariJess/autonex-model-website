import { describe, expect, it } from "vitest";
import { buildShareParams, formatPriceMga } from "@/components/listing/ShareButton/buildShareParams";

describe("formatPriceMga", () => {
  it("formats round millions without decimals", () => {
    expect(formatPriceMga(13_000_000)).toBe("13M Ar");
  });

  it("formats non-round millions with one decimal", () => {
    expect(formatPriceMga(31_600_000)).toBe("31.6M Ar");
  });

  it("formats sub-million amounts with grouped digits", () => {
    // Node's fr-FR locale uses U+202F (narrow non-breaking space) as the
    // thousands separator. Normalise whitespace to make the assertion robust.
    expect(formatPriceMga(950_000).replace(/\s+/g, " ")).toBe("950 000 Ar");
  });

  it("returns fallback when price is zero or negative", () => {
    expect(formatPriceMga(0)).toBe("Prix non précisé");
    expect(formatPriceMga(-1)).toBe("Prix non précisé");
  });

  it("returns fallback when price is NaN", () => {
    expect(formatPriceMga(Number.NaN)).toBe("Prix non précisé");
  });
});

describe("buildShareParams", () => {
  const baseListing = {
    id: "abc-123",
    title: "Audi A2 TDI 2004",
    url: "https://autonex.mg/annonce/abc-123",
    priceMga: 13_000_000,
    location: "Antananarivo, Ampitatafika",
  };

  it("builds the WhatsApp text with all the emojis when location is present", () => {
    const params = buildShareParams(baseListing);
    expect(params.text).toContain("🚗 Audi A2 TDI 2004 - 13M Ar");
    expect(params.text).toContain("📍 Antananarivo, Ampitatafika");
    expect(params.text).toContain("👉 https://autonex.mg/annonce/abc-123");
    expect(params.text).toContain("Vu sur AutoNex 🌟");
  });

  it("omits the 📍 line when location is null", () => {
    const params = buildShareParams({ ...baseListing, location: null });
    expect(params.text).not.toContain("📍");
    expect(params.text).toContain("🚗");
    expect(params.text).toContain("👉");
  });

  it("omits the 📍 line when location is undefined", () => {
    const { location: _drop, ...withoutLocation } = baseListing;
    void _drop;
    const params = buildShareParams(withoutLocation);
    expect(params.text).not.toContain("📍");
  });

  it("uses 'Prix non précisé' fallback when priceMga is 0", () => {
    const params = buildShareParams({ ...baseListing, priceMga: 0 });
    expect(params.title).toContain("Prix non précisé");
    expect(params.text).toContain("Prix non précisé");
  });

  it("builds an email subject and body that include the title and url", () => {
    const params = buildShareParams(baseListing);
    expect(params.emailSubject).toBe("Une voiture qui pourrait t'intéresser sur AutoNex");
    expect(params.emailBody).toContain("Audi A2 TDI 2004");
    expect(params.emailBody).toContain("Prix : 13M Ar");
    expect(params.emailBody).toContain("Localisation : Antananarivo, Ampitatafika");
    expect(params.emailBody).toContain("https://autonex.mg/annonce/abc-123");
  });

  it("omits the localisation line in the email body when location is missing", () => {
    const params = buildShareParams({ ...baseListing, location: null });
    expect(params.emailBody).not.toContain("Localisation");
  });
});
