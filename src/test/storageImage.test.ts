import { describe, expect, it } from "vitest";
import { getOptimizedStorageUrl, getOptimizedSrcSet } from "@/lib/storageImage";

const SUPABASE_BASE = "https://wtkedamrmtvdoippqanc.supabase.co";
const SAMPLE_OBJECT = `${SUPABASE_BASE}/storage/v1/object/public/listing-photos/abc-123/0-1700000000.jpg`;
const EXPECTED_RENDER_BASE = `${SUPABASE_BASE}/storage/v1/render/image/public/listing-photos/abc-123/0-1700000000.jpg`;

describe("getOptimizedStorageUrl", () => {
  it("rewrites a public Supabase Storage URL with width and quality params", () => {
    const out = getOptimizedStorageUrl(SAMPLE_OBJECT, { width: 800, quality: 75 });
    expect(out).toBe(`${EXPECTED_RENDER_BASE}?width=800&quality=75`);
  });

  it("supports the resize parameter", () => {
    const out = getOptimizedStorageUrl(SAMPLE_OBJECT, { width: 400, resize: "cover" });
    expect(out).toBe(`${EXPECTED_RENDER_BASE}?width=400&resize=cover`);
  });

  it("returns the rewritten URL with no query when opts is empty", () => {
    const out = getOptimizedStorageUrl(SAMPLE_OBJECT);
    expect(out).toBe(EXPECTED_RENDER_BASE);
  });

  it("leaves a non-Supabase external URL unchanged", () => {
    const url = "https://cdn.example.com/agency-logo.png";
    expect(getOptimizedStorageUrl(url, { width: 200 })).toBe(url);
  });

  it("leaves a local asset path unchanged", () => {
    expect(getOptimizedStorageUrl("/placeholder.svg", { width: 800 })).toBe("/placeholder.svg");
    expect(getOptimizedStorageUrl("/brand-logos/toyota.svg")).toBe("/brand-logos/toyota.svg");
  });

  it("returns empty string for null / undefined / empty input", () => {
    expect(getOptimizedStorageUrl(null)).toBe("");
    expect(getOptimizedStorageUrl(undefined)).toBe("");
    expect(getOptimizedStorageUrl("")).toBe("");
  });

  it("strips a pre-existing query string from the input path", () => {
    const out = getOptimizedStorageUrl(`${SAMPLE_OBJECT}?token=abc`, { width: 600 });
    expect(out).toBe(`${EXPECTED_RENDER_BASE}?width=600`);
  });
});

describe("getOptimizedSrcSet", () => {
  it("emits one entry per width separated by ', '", () => {
    const out = getOptimizedSrcSet(SAMPLE_OBJECT, [400, 800, 1200]);
    expect(out).toBe(
      [
        `${EXPECTED_RENDER_BASE}?width=400&quality=75 400w`,
        `${EXPECTED_RENDER_BASE}?width=800&quality=75 800w`,
        `${EXPECTED_RENDER_BASE}?width=1200&quality=75 1200w`,
      ].join(", "),
    );
  });

  it("honours the custom quality argument", () => {
    const out = getOptimizedSrcSet(SAMPLE_OBJECT, [400], 60);
    expect(out).toBe(`${EXPECTED_RENDER_BASE}?width=400&quality=60 400w`);
  });

  it("returns empty string for null / undefined / empty input", () => {
    expect(getOptimizedSrcSet(null, [400, 800])).toBe("");
    expect(getOptimizedSrcSet(undefined, [400, 800])).toBe("");
    expect(getOptimizedSrcSet("", [400, 800])).toBe("");
  });

  it("falls back to the original URL per width entry when given a non-Supabase URL", () => {
    const url = "https://cdn.example.com/img.jpg";
    const out = getOptimizedSrcSet(url, [400, 800]);
    expect(out).toBe(`${url} 400w, ${url} 800w`);
  });
});
