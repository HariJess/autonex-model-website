import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ShareButton } from "@/components/listing/ShareButton";
import { setCookieConsent, clearCookieConsent } from "@/lib/analytics/cookieConsentStorage";

const { mockToast } = vi.hoisted(() => ({
  mockToast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("sonner", () => ({
  toast: Object.assign(vi.fn(), mockToast),
}));

const baseListing = {
  id: "abc-123",
  title: "Audi A2 TDI 2004",
  url: "https://autonex.mg/annonce/abc-123",
  priceMga: 13_000_000,
  location: "Antananarivo, Ampitatafika",
};

function setMatchMedia(matchesMobile: boolean) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string) => ({
      matches: matchesMobile && query.includes("max-width: 767px"),
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => {},
    }),
  });
}

function setNavigatorShare(impl: ((data: ShareData) => Promise<void>) | undefined) {
  if (impl === undefined) {
    delete (navigator as unknown as { share?: unknown }).share;
    return;
  }
  Object.defineProperty(navigator, "share", {
    configurable: true,
    writable: true,
    value: impl,
  });
}

function setClipboard(impl: ((text: string) => Promise<void>) | undefined) {
  if (impl === undefined) {
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: undefined });
    return;
  }
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText: impl },
  });
}

describe("<ShareButton />", () => {
  beforeEach(() => {
    setCookieConsent({ analytics: true, functional: true });
    window.dataLayer = [];
    setMatchMedia(false);
    setNavigatorShare(undefined);
    setClipboard(vi.fn(async () => {}));
    mockToast.success.mockReset();
    mockToast.error.mockReset();
  });

  afterEach(() => {
    clearCookieConsent();
    window.dataLayer = undefined;
  });

  it("renders the trigger button with the correct aria-label", () => {
    render(<ShareButton listing={baseListing} />);
    expect(screen.getByRole("button", { name: /Partager cette annonce/i })).toBeInTheDocument();
  });

  it("opens the modal on desktop click", async () => {
    render(<ShareButton listing={baseListing} />);
    fireEvent.click(screen.getByRole("button", { name: /Partager cette annonce/i }));
    expect(await screen.findByText(/Partager cette annonce$/)).toBeInTheDocument();
    expect(screen.getByLabelText("Partager via WhatsApp")).toBeInTheDocument();
    expect(screen.getByLabelText("Partager via Messenger")).toBeInTheDocument();
    expect(screen.getByLabelText("Partager via Copier le lien")).toBeInTheDocument();
    expect(screen.getByLabelText("Partager via Email")).toBeInTheDocument();
  });

  it("calls navigator.share with the right params on mobile when supported", async () => {
    setMatchMedia(true);
    const shareSpy = vi.fn<(data: ShareData) => Promise<void>>(async () => {});
    setNavigatorShare(shareSpy);

    render(<ShareButton listing={baseListing} />);
    fireEvent.click(screen.getByRole("button", { name: /Partager cette annonce/i }));

    await waitFor(() => expect(shareSpy).toHaveBeenCalledTimes(1));
    const arg = shareSpy.mock.calls[0]?.[0];
    expect(arg?.title).toContain("Audi A2 TDI 2004");
    expect(arg?.url).toBe("https://autonex.mg/annonce/abc-123");
    expect(arg?.text).toContain("🚗");
  });

  it("stays silent when the user aborts the native share (AbortError)", async () => {
    setMatchMedia(true);
    const abortError = Object.assign(new Error("aborted"), { name: "AbortError" });
    setNavigatorShare(vi.fn(async () => { throw abortError; }));

    render(<ShareButton listing={baseListing} />);
    fireEvent.click(screen.getByRole("button", { name: /Partager cette annonce/i }));

    await waitFor(() => expect(window.dataLayer ?? []).toHaveLength(0));
    expect(screen.queryByText(/Partager cette annonce$/)).not.toBeInTheDocument();
  });

  it("falls back to the modal on a real native share error", async () => {
    setMatchMedia(true);
    setNavigatorShare(vi.fn(async () => { throw new Error("Permission denied"); }));

    render(<ShareButton listing={baseListing} />);
    fireEvent.click(screen.getByRole("button", { name: /Partager cette annonce/i }));

    expect(await screen.findByText(/Partager cette annonce$/)).toBeInTheDocument();
    const tracked = (window.dataLayer ?? []) as Array<[string, string, Record<string, unknown>]>;
    expect(tracked[0][1]).toBe("listing_share_clicked");
    expect(tracked[0][2].channel).toBe("native");
    expect(tracked[0][2].success).toBe(false);
  });

  it("copies the URL and triggers a sonner success toast on copy", async () => {
    const writeText = vi.fn(async () => {});
    setClipboard(writeText);

    render(<ShareButton listing={baseListing} />);
    fireEvent.click(screen.getByRole("button", { name: /Partager cette annonce/i }));
    fireEvent.click(await screen.findByLabelText("Partager via Copier le lien"));

    await waitFor(() => expect(writeText).toHaveBeenCalledWith("https://autonex.mg/annonce/abc-123"));
    expect(mockToast.success).toHaveBeenCalledWith("Lien copié dans le presse-papiers !");
    const tracked = (window.dataLayer ?? []) as Array<[string, string, Record<string, unknown>]>;
    expect(tracked.some((e) => e[1] === "listing_share_clicked" && e[2].channel === "copy" && e[2].success === true)).toBe(true);
  });

  it("does not push to dataLayer when analytics consent is missing", async () => {
    clearCookieConsent();
    render(<ShareButton listing={baseListing} />);
    fireEvent.click(screen.getByRole("button", { name: /Partager cette annonce/i }));
    fireEvent.click(await screen.findByLabelText("Partager via Copier le lien"));

    await waitFor(() => expect(mockToast.success).toHaveBeenCalled());
    expect(window.dataLayer ?? []).toHaveLength(0);
  });

  it("opens external channels in a new tab and tracks the click", async () => {
    const openSpy = vi.spyOn(window, "open").mockImplementation(() => null);

    render(<ShareButton listing={baseListing} />);
    fireEvent.click(screen.getByRole("button", { name: /Partager cette annonce/i }));
    fireEvent.click(await screen.findByLabelText("Partager via WhatsApp"));

    await waitFor(() => expect(openSpy).toHaveBeenCalledTimes(1));
    const call = openSpy.mock.calls[0];
    expect(call).toBeDefined();
    expect(String(call?.[0]).startsWith("https://wa.me/?text=")).toBe(true);
    expect(call?.[1]).toBe("_blank");
    expect(call?.[2]).toBe("noopener,noreferrer");

    const tracked = (window.dataLayer ?? []) as Array<[string, string, Record<string, unknown>]>;
    expect(tracked.some((e) => e[2].channel === "whatsapp" && e[2].success === true)).toBe(true);

    openSpy.mockRestore();
  });
});
