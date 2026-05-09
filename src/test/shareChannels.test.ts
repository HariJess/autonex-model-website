import { describe, expect, it } from "vitest";
import { SHARE_CHANNELS } from "@/components/listing/ShareButton/shareChannels";

const params = {
  url: "https://autonex.mg/annonce/abc-123",
  title: "Audi A2 TDI 2004 - 13M Ar",
  text: "🚗 Audi A2 TDI 2004 - 13M Ar\n📍 Ampitatafika\n👉 https://autonex.mg/annonce/abc-123\n\nVu sur AutoNex 🌟",
  emailSubject: "Une voiture qui pourrait t'intéresser sur AutoNex",
  emailBody: "Hello\n\nVoir : https://autonex.mg/annonce/abc-123",
};

function findChannel(id: string) {
  const channel = SHARE_CHANNELS.find((c) => c.id === id);
  if (!channel) throw new Error(`Channel ${id} not found`);
  return channel;
}

describe("SHARE_CHANNELS", () => {
  it("exposes the four expected canonical channels", () => {
    expect(SHARE_CHANNELS.map((c) => c.id)).toEqual(["whatsapp", "messenger", "copy", "email"]);
  });

  it("builds a wa.me URL with URL-encoded text including the emojis", () => {
    const url = findChannel("whatsapp").buildUrl(params);
    expect(url.startsWith("https://wa.me/?text=")).toBe(true);
    expect(url).toContain(encodeURIComponent("🚗"));
    expect(url).toContain(encodeURIComponent("https://autonex.mg/annonce/abc-123"));
  });

  it("builds a Facebook sharer URL with URL-encoded canonical url", () => {
    const url = findChannel("messenger").buildUrl(params);
    expect(url.startsWith("https://www.facebook.com/sharer/sharer.php?u=")).toBe(true);
    expect(url).toContain(encodeURIComponent("https://autonex.mg/annonce/abc-123"));
  });

  it("returns the raw canonical url for the copy channel", () => {
    const url = findChannel("copy").buildUrl(params);
    expect(url).toBe("https://autonex.mg/annonce/abc-123");
  });

  it("builds a mailto without recipient and with encoded subject + body", () => {
    const url = findChannel("email").buildUrl(params);
    expect(url.startsWith("mailto:?subject=")).toBe(true);
    expect(url).toContain("subject=" + encodeURIComponent(params.emailSubject));
    expect(url).toContain("body=" + encodeURIComponent(params.emailBody));
  });
});
