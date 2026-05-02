import imageCompression from "browser-image-compression";

/**
 * Browser-side image compression utility for the publish flow.
 *
 * Uploads from a phone gallery routinely weigh 3-5 MB per JPEG (4032×3024
 * iPhone capture, raw Android shot) which on Madagascar 4G means ~30-60 s
 * per photo and quickly bloats Supabase Storage. This helper compresses +
 * resizes a `File` in the browser (Web Worker by default, falls back to
 * the main thread on older Safari) before it ever leaves the device.
 *
 * Wraps `browser-image-compression` with three project-specific behaviours:
 * - **Pass-through for small files**: if the file is already under
 *   `maxSizeMB`, return it as-is. Avoids needless decode/re-encode round
 *   trips and preserves the original quality. Dimension-based pass-through
 *   is delegated to the underlying library when an explicit
 *   `maxWidthOrHeight` is requested.
 * - **EXIF orientation preserved**: `browser-image-compression` rotates
 *   the bitmap to match the EXIF orientation tag (so portrait iPhone
 *   photos do not appear rotated 90° after upload).
 * - **Failure-tolerant**: any throw from the underlying library is logged
 *   and the original file is returned. Compression must never block the
 *   user from publishing — degrading to "upload as-is" is acceptable.
 *
 * Output format inherits the input MIME (`image/jpeg` → JPEG, `image/png`
 * → PNG, etc.). HEIC files from iOS are converted to JPEG by the lib.
 *
 * The lib is intentionally NOT wired into `publishDraft.uploadListingPhoto`
 * yet — that integration belongs to a separate PR.
 */

export type CompressionOptions = {
  /** Soft target size for the output, in megabytes. Default 1 MB. */
  maxSizeMB?: number;
  /** Cap on the longest edge of the output image, in pixels. Default 1920. */
  maxWidthOrHeight?: number;
  /** Initial JPEG/WebP quality on the 0-1 scale. Default 0.85. */
  quality?: number;
  /** Run compression in a Web Worker when available. Default true. */
  useWebWorker?: boolean;
};

const DEFAULT_MAX_SIZE_MB = 1;
const DEFAULT_MAX_WIDTH_OR_HEIGHT = 1920;
const DEFAULT_QUALITY = 0.85;

export async function compressImage(
  file: File,
  opts: CompressionOptions = {},
): Promise<File> {
  const maxSizeMB = opts.maxSizeMB ?? DEFAULT_MAX_SIZE_MB;
  const maxBytes = maxSizeMB * 1024 * 1024;

  // Skip compression entirely when the file is already small enough and the
  // caller has not asked for an explicit dimension cap. We rely on file.size
  // alone here (cheap, sync) — when `maxWidthOrHeight` is set we always
  // delegate to the library so it can decode the image and trim the bitmap.
  if (file.size <= maxBytes && opts.maxWidthOrHeight === undefined) {
    return file;
  }

  try {
    const compressed = await imageCompression(file, {
      maxSizeMB,
      maxWidthOrHeight: opts.maxWidthOrHeight ?? DEFAULT_MAX_WIDTH_OR_HEIGHT,
      initialQuality: opts.quality ?? DEFAULT_QUALITY,
      useWebWorker: opts.useWebWorker ?? true,
    });
    return compressed;
  } catch (err) {
    // Compression failures must never block publishing. Log and fall back
    // to the original file so the user keeps a usable upload path.
    // eslint-disable-next-line no-console
    console.warn("[imageCompression] compression failed, returning original:", err);
    return file;
  }
}

export async function compressImages(
  files: File[],
  opts: CompressionOptions = {},
  onProgress?: (done: number, total: number) => void,
): Promise<File[]> {
  const total = files.length;
  const out: File[] = [];
  for (let i = 0; i < files.length; i++) {
    // `compressImage` already swallows its own errors and returns the
    // original file on failure, so this loop never aborts mid-batch.
    // eslint-disable-next-line no-await-in-loop
    const result = await compressImage(files[i], opts);
    out.push(result);
    onProgress?.(i + 1, total);
  }
  return out;
}
