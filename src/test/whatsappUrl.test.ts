import { describe, expect, it } from "vitest";
import { buildWhatsAppUrl } from "@/lib/whatsappUrl";

describe("buildWhatsAppUrl", () => {
  it("returns wa.me URL for valid E.164", () => {
    const u = buildWhatsAppUrl("+33612345678", "Hello");
    expect(u).toBe("https://wa.me/33612345678?text=Hello");
  });

  it("URL-encodes prefilled text", () => {
    const u = buildWhatsAppUrl("+261341234567", "Bonjour, ça va ?");
    expect(u).toContain("text=Bonjour%2C%20%C3%A7a%20va%20%3F");
    expect(u).toMatch(/^https:\/\/wa\.me\/261341234567\?text=/);
  });

  it("returns null for invalid phone", () => {
    expect(buildWhatsAppUrl("abc", "x")).toBeNull();
  });
});
