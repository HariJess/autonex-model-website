/**
 * Helpers to drive the Supabase Storage Image Transformations endpoint
 * (`/storage/v1/render/image/public/<bucket>/<path>?width=…&quality=…`).
 *
 * Detects URLs that point to a Supabase public-bucket object and rewrites
 * them to the render endpoint with the requested transformation params.
 * Non-Supabase URLs (external CDNs, local /placeholder.svg, brand assets)
 * are returned unchanged so callers can safely pipe any image src through.
 *
 * Storage Image Transformations is a Pro+ feature. When activated on the
 * project, the render endpoint additionally returns WebP automatically when
 * the client sends `Accept: image/webp` (modern browsers do by default).
 */

const PUBLIC_OBJECT_RE = /^(.+)\/storage\/v1\/object\/public\/(.+)$/;

export type StorageImageOpts = {
  width?: number;
  quality?: number;
  resize?: "cover" | "contain" | "fill";
};

export function getOptimizedStorageUrl(
  url: string | null | undefined,
  opts: StorageImageOpts = {},
): string {
  if (!url) return "";
  const match = url.match(PUBLIC_OBJECT_RE);
  if (!match) return url;

  const [, base, bucketAndPath] = match;
  // Strip any pre-existing query string from the path to avoid duplicates.
  const cleanPath = bucketAndPath.split("?")[0];

  const params = new URLSearchParams();
  if (opts.width !== undefined) params.set("width", String(opts.width));
  if (opts.quality !== undefined) params.set("quality", String(opts.quality));
  if (opts.resize) params.set("resize", opts.resize);

  const qs = params.toString();
  const renderUrl = `${base}/storage/v1/render/image/public/${cleanPath}`;
  return qs ? `${renderUrl}?${qs}` : renderUrl;
}

/**
 * Build a `srcset` string with one entry per width. Quality defaults to 75.
 * Returns "" when `url` is falsy so the attribute can be safely interpolated.
 */
export function getOptimizedSrcSet(
  url: string | null | undefined,
  widths: number[],
  quality: number = 75,
): string {
  if (!url) return "";
  return widths
    .map((w) => `${getOptimizedStorageUrl(url, { width: w, quality })} ${w}w`)
    .join(", ");
}
