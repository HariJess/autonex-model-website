const DEFAULT_SITE_BASE_URL = "https://immonex.mg";

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

export const SITE_BASE_URL = trimTrailingSlash(
  (import.meta.env.VITE_SITE_URL as string | undefined) || DEFAULT_SITE_BASE_URL,
);

export function buildCanonicalUrl(pathname: string, search?: string): string {
  const normalizedPath = pathname.startsWith("/") ? pathname : `/${pathname}`;
  const query = search && search.trim() ? (search.startsWith("?") ? search : `?${search}`) : "";
  return `${SITE_BASE_URL}${normalizedPath}${query}`;
}

export function toAbsoluteUrl(urlOrPath?: string | null): string | undefined {
  if (!urlOrPath) return undefined;
  const normalizedInput = urlOrPath.trim();
  if (!normalizedInput) return undefined;
  if (/^https?:\/\//i.test(normalizedInput)) return normalizedInput;
  if (normalizedInput.startsWith("//")) return `https:${normalizedInput}`;
  const normalizedPath = normalizedInput.startsWith("/") ? normalizedInput : `/${normalizedInput}`;
  return `${SITE_BASE_URL}${normalizedPath}`;
}

export function truncateMetaDescription(input: string, maxLength = 160): string {
  const compact = input.replace(/\s+/g, " ").trim();
  if (compact.length <= maxLength) return compact;
  return `${compact.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
}

export function composePageTitle(pageTitle: string): string {
  return `${pageTitle} — ImmoNex`;
}
