import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("browser-image-compression", () => ({
  default: vi.fn(),
}));

import imageCompression from "browser-image-compression";
import { compressImage, compressImages } from "@/lib/imageCompression";

const mockImageCompression = imageCompression as unknown as ReturnType<typeof vi.fn>;

function makeFile(name: string, sizeBytes: number, type: string): File {
  // Build a Blob-backed File with controllable byte length.
  const buffer = new Uint8Array(sizeBytes);
  return new File([buffer], name, { type });
}

beforeEach(() => {
  mockImageCompression.mockReset();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("compressImage", () => {
  it("returns the original file when it is already smaller than maxSizeMB", async () => {
    const small = makeFile("photo.jpg", 500 * 1024, "image/jpeg"); // 500 KB
    const result = await compressImage(small, { maxSizeMB: 1 });
    expect(result).toBe(small);
    expect(mockImageCompression).not.toHaveBeenCalled();
  });

  it("delegates to browser-image-compression when the file exceeds maxSizeMB", async () => {
    const large = makeFile("photo.jpg", 4 * 1024 * 1024, "image/jpeg"); // 4 MB
    const compressed = makeFile("photo.jpg", 800 * 1024, "image/jpeg"); // 800 KB
    mockImageCompression.mockResolvedValueOnce(compressed);

    const result = await compressImage(large, { maxSizeMB: 1 });

    expect(result).toBe(compressed);
    expect(mockImageCompression).toHaveBeenCalledOnce();
  });

  it("forces compression when maxWidthOrHeight is set, even on a small file", async () => {
    const smallButHighRes = makeFile("photo.jpg", 200 * 1024, "image/jpeg");
    const compressed = makeFile("photo.jpg", 100 * 1024, "image/jpeg");
    mockImageCompression.mockResolvedValueOnce(compressed);

    const result = await compressImage(smallButHighRes, { maxSizeMB: 1, maxWidthOrHeight: 800 });

    expect(result).toBe(compressed);
    expect(mockImageCompression).toHaveBeenCalledOnce();
  });

  it("preserves the JPEG MIME type via the library output", async () => {
    const large = makeFile("photo.jpg", 3 * 1024 * 1024, "image/jpeg");
    const compressed = makeFile("photo.jpg", 600 * 1024, "image/jpeg");
    mockImageCompression.mockResolvedValueOnce(compressed);

    const result = await compressImage(large);
    expect(result.type).toBe("image/jpeg");
  });

  it("preserves the PNG MIME type via the library output", async () => {
    const large = makeFile("diagram.png", 3 * 1024 * 1024, "image/png");
    const compressed = makeFile("diagram.png", 700 * 1024, "image/png");
    mockImageCompression.mockResolvedValueOnce(compressed);

    const result = await compressImage(large);
    expect(result.type).toBe("image/png");
  });

  it("returns the original file and warns when the library throws", async () => {
    const large = makeFile("photo.jpg", 5 * 1024 * 1024, "image/jpeg");
    mockImageCompression.mockRejectedValueOnce(new Error("decode failed"));
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    const result = await compressImage(large);

    expect(result).toBe(large);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it("forwards default options (maxSizeMB=1, maxWidthOrHeight=1920, quality=0.85, useWebWorker=true) to the library", async () => {
    const large = makeFile("photo.jpg", 3 * 1024 * 1024, "image/jpeg");
    mockImageCompression.mockResolvedValueOnce(large);

    await compressImage(large);

    expect(mockImageCompression).toHaveBeenCalledWith(
      large,
      expect.objectContaining({
        maxSizeMB: 1,
        maxWidthOrHeight: 1920,
        initialQuality: 0.85,
        useWebWorker: true,
      }),
    );
  });

  it("forwards custom options to the library", async () => {
    const large = makeFile("photo.jpg", 5 * 1024 * 1024, "image/jpeg");
    mockImageCompression.mockResolvedValueOnce(large);

    await compressImage(large, {
      maxSizeMB: 2,
      maxWidthOrHeight: 2400,
      quality: 0.7,
      useWebWorker: false,
    });

    expect(mockImageCompression).toHaveBeenCalledWith(
      large,
      expect.objectContaining({
        maxSizeMB: 2,
        maxWidthOrHeight: 2400,
        initialQuality: 0.7,
        useWebWorker: false,
      }),
    );
  });
});

describe("compressImages", () => {
  it("compresses each file in the input array and returns an array of the same length", async () => {
    const f1 = makeFile("a.jpg", 3 * 1024 * 1024, "image/jpeg");
    const f2 = makeFile("b.jpg", 4 * 1024 * 1024, "image/jpeg");
    const c1 = makeFile("a.jpg", 700 * 1024, "image/jpeg");
    const c2 = makeFile("b.jpg", 800 * 1024, "image/jpeg");
    mockImageCompression.mockResolvedValueOnce(c1).mockResolvedValueOnce(c2);

    const result = await compressImages([f1, f2]);

    expect(result).toEqual([c1, c2]);
    expect(mockImageCompression).toHaveBeenCalledTimes(2);
  });

  it("invokes onProgress with (done, total) after each file", async () => {
    const f1 = makeFile("a.jpg", 3 * 1024 * 1024, "image/jpeg");
    const f2 = makeFile("b.jpg", 4 * 1024 * 1024, "image/jpeg");
    const f3 = makeFile("c.jpg", 5 * 1024 * 1024, "image/jpeg");
    mockImageCompression
      .mockResolvedValueOnce(f1)
      .mockResolvedValueOnce(f2)
      .mockResolvedValueOnce(f3);
    const onProgress = vi.fn();

    await compressImages([f1, f2, f3], {}, onProgress);

    expect(onProgress.mock.calls).toEqual([
      [1, 3],
      [2, 3],
      [3, 3],
    ]);
  });

  it("falls back to the original file for entries that fail and keeps processing the rest", async () => {
    const f1 = makeFile("a.jpg", 3 * 1024 * 1024, "image/jpeg");
    const f2 = makeFile("b.jpg", 4 * 1024 * 1024, "image/jpeg");
    const c2 = makeFile("b.jpg", 700 * 1024, "image/jpeg");
    mockImageCompression
      .mockRejectedValueOnce(new Error("worker exploded"))
      .mockResolvedValueOnce(c2);
    vi.spyOn(console, "warn").mockImplementation(() => {});

    const result = await compressImages([f1, f2]);

    expect(result).toHaveLength(2);
    expect(result[0]).toBe(f1); // original on failure
    expect(result[1]).toBe(c2); // compressed on success
  });

  it("passes through small files without invoking the library", async () => {
    const small1 = makeFile("a.jpg", 200 * 1024, "image/jpeg");
    const small2 = makeFile("b.jpg", 300 * 1024, "image/jpeg");

    const result = await compressImages([small1, small2], { maxSizeMB: 1 });

    expect(result).toEqual([small1, small2]);
    expect(mockImageCompression).not.toHaveBeenCalled();
  });
});
