import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, renderHook } from "@testing-library/react";

const { toastWarning, toastError } = vi.hoisted(() => ({
  toastWarning: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: Object.assign(vi.fn(), {
    warning: toastWarning,
    error: toastError,
    success: vi.fn(),
    info: vi.fn(),
  }),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (_key: string, options?: unknown) => {
      if (options && typeof options === "object" && "count" in options) {
        return `max-photos-warning:${(options as { count: number }).count}`;
      }
      return _key;
    },
  }),
}));

vi.mock("@/lib/publishDraft", () => ({
  deleteListingPhotoRow: vi.fn(),
  fetchListingPhotos: vi.fn(),
  setPhotoCoverFirst: vi.fn(),
  uploadListingPhoto: vi.fn(),
}));

import { usePublishMedia } from "@/hooks/publish/usePublishMedia";

function makeFiles(n: number): File[] {
  return Array.from({ length: n }, (_, i) =>
    new File([new Blob(["x"])], `photo-${i}.jpg`, { type: "image/jpeg" }),
  );
}

function fireSelect(handler: (e: React.ChangeEvent<HTMLInputElement>) => void, files: File[]) {
  // FileList-like minimal stub. The hook does Array.from(e.target.files) and
  // also `e.target.value = ""` for the M-INPUT-RESET fix — we expose `value`
  // as a string property and return the target so callers can inspect it.
  const fileList = files as unknown as FileList;
  const target = { files: fileList, value: "non-empty-initial" } as unknown as
    HTMLInputElement;
  handler({ target } as unknown as React.ChangeEvent<HTMLInputElement>);
  return target;
}

beforeEach(() => {
  toastWarning.mockClear();
  toastError.mockClear();
  // jsdom does not implement URL.createObjectURL / revokeObjectURL.
  if (typeof URL.createObjectURL !== "function") {
    (URL as unknown as { createObjectURL: (file: File) => string }).createObjectURL =
      (file: File) => `blob:mock/${file.name}`;
  }
  if (typeof URL.revokeObjectURL !== "function") {
    (URL as unknown as { revokeObjectURL: (url: string) => void }).revokeObjectURL =
      () => {};
  }
});

describe("usePublishMedia — handlePhotoSelect 10-photos cap (M-PHOTOS-CAP)", () => {
  it("3 in pending + select 5 new → 8 in pending, NO toast", () => {
    const { result } = renderHook(() => usePublishMedia(null, null));

    act(() => {
      fireSelect(result.current.handlePhotoSelect, makeFiles(3));
    });
    expect(result.current.pendingPhotos).toHaveLength(3);
    expect(toastWarning).not.toHaveBeenCalled();

    act(() => {
      fireSelect(result.current.handlePhotoSelect, makeFiles(5));
    });
    expect(result.current.pendingPhotos).toHaveLength(8);
    expect(toastWarning).not.toHaveBeenCalled();
  });

  it("8 in pending + select 5 new → 10 in pending, toast count=3", () => {
    const { result } = renderHook(() => usePublishMedia(null, null));

    act(() => {
      fireSelect(result.current.handlePhotoSelect, makeFiles(8));
    });
    expect(result.current.pendingPhotos).toHaveLength(8);

    act(() => {
      fireSelect(result.current.handlePhotoSelect, makeFiles(5));
    });
    expect(result.current.pendingPhotos).toHaveLength(10);
    expect(toastWarning).toHaveBeenCalledTimes(1);
    expect(toastWarning).toHaveBeenCalledWith("max-photos-warning:3");
  });

  it("10 in pending + select 1 new → still 10 in pending, toast count=1", () => {
    const { result } = renderHook(() => usePublishMedia(null, null));

    act(() => {
      fireSelect(result.current.handlePhotoSelect, makeFiles(10));
    });
    expect(result.current.pendingPhotos).toHaveLength(10);
    expect(toastWarning).not.toHaveBeenCalled();

    act(() => {
      fireSelect(result.current.handlePhotoSelect, makeFiles(1));
    });
    expect(result.current.pendingPhotos).toHaveLength(10);
    expect(toastWarning).toHaveBeenCalledTimes(1);
    expect(toastWarning).toHaveBeenCalledWith("max-photos-warning:1");
  });

  it("0 in pending + select 11 → 10 in pending, toast count=1", () => {
    const { result } = renderHook(() => usePublishMedia(null, null));

    act(() => {
      fireSelect(result.current.handlePhotoSelect, makeFiles(11));
    });
    expect(result.current.pendingPhotos).toHaveLength(10);
    expect(toastWarning).toHaveBeenCalledTimes(1);
    expect(toastWarning).toHaveBeenCalledWith("max-photos-warning:1");
  });
});

describe("usePublishMedia — handlePhotoSelect input reset (M-INPUT-RESET)", () => {
  it("resets input.value after a normal add (so re-selecting same files re-fires onChange)", () => {
    const { result } = renderHook(() => usePublishMedia(null, null));

    let target!: HTMLInputElement;
    act(() => {
      target = fireSelect(result.current.handlePhotoSelect, makeFiles(2));
    });
    expect(result.current.pendingPhotos).toHaveLength(2);
    expect(target.value).toBe("");
  });

  it("resets input.value even when ALL files are rejected (already at 10)", () => {
    const { result } = renderHook(() => usePublishMedia(null, null));

    act(() => {
      fireSelect(result.current.handlePhotoSelect, makeFiles(10));
    });
    expect(result.current.pendingPhotos).toHaveLength(10);

    let target!: HTMLInputElement;
    act(() => {
      target = fireSelect(result.current.handlePhotoSelect, makeFiles(3));
    });
    expect(result.current.pendingPhotos).toHaveLength(10);
    expect(toastWarning).toHaveBeenCalledWith("max-photos-warning:3");
    // The reset must happen BEFORE the early return — without this, the user
    // re-selecting the same 3 rejected files would see no toast / no event.
    expect(target.value).toBe("");
  });
});
