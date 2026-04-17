const FIARAKODIA_BASE_URL = "https://www.fiarakodia.mg";
const DEFAULT_TIMEOUT_MS = 15000;
const DEFAULT_USER_AGENT =
  "AutoNexMarketCollector/1.0 (+https://autonex.mg; manual-test-script)";

function decodeHtmlEntities(input) {
  return String(input ?? "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function stripHtml(input) {
  return decodeHtmlEntities(
    String(input ?? "")
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim(),
  );
}

function extractMetaContent(html, key) {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(
    `<meta[^>]+(?:property|name)=["']${escaped}["'][^>]+content=["']([^"']+)["'][^>]*>`,
    "i",
  );
  const match = html.match(pattern);
  if (!match) return null;
  return decodeHtmlEntities(match[1]).trim() || null;
}

function findByKeywordInHtml(html, keywordRegex) {
  const pattern = new RegExp(
    `(?:<[^>]*>)?\\s*(${keywordRegex.source})\\s*(?:<[^>]*>)?\\s*[:\\-]?\\s*(?:<[^>]*>)?\\s*([^<\\n\\r]{1,120})`,
    "i",
  );
  const match = html.match(pattern);
  if (!match) return null;
  return stripHtml(match[2]) || null;
}

function normalizeListingUrl(rawHref, baseUrl = FIARAKODIA_BASE_URL) {
  if (!rawHref) return null;
  let href = rawHref.trim();
  if (!href) return null;
  if (href.startsWith("//")) href = `https:${href}`;
  if (href.startsWith("/")) href = `${baseUrl}${href}`;
  if (!/^https?:\/\//i.test(href)) return null;
  if (!/fiarakodia\.mg/i.test(href)) return null;
  try {
    const url = new URL(href);
    url.hash = "";
    const looksLikeDetail =
      /\/annonce\//i.test(url.pathname) ||
      /\/voiture-occasion\//i.test(url.pathname) ||
      /\/auto\//i.test(url.pathname);
    if (!looksLikeDetail) return null;
    return url.toString();
  } catch {
    return null;
  }
}

async function fetchHtml(url, options = {}) {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const userAgent = options.userAgent ?? DEFAULT_USER_AGENT;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      headers: {
        "user-agent": userAgent,
        accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} on ${url}`);
    }
    return await response.text();
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchFiarakodiaListingPageHtml(
  listingPageUrl,
  options = {},
) {
  return fetchHtml(listingPageUrl, options);
}

export function extractFiarakodiaListingUrlsFromHtml(
  html,
  options = {},
) {
  const baseUrl = options.baseUrl ?? FIARAKODIA_BASE_URL;
  const hrefRegex = /<a[^>]+href=["']([^"']+)["'][^>]*>/gi;
  const urls = new Set();
  let match;
  while ((match = hrefRegex.exec(html)) !== null) {
    const normalized = normalizeListingUrl(match[1], baseUrl);
    if (normalized) urls.add(normalized);
  }
  return [...urls];
}

export async function fetchFiarakodiaListingUrls(
  listingPageUrl,
  options = {},
) {
  const html = await fetchFiarakodiaListingPageHtml(listingPageUrl, options);
  return extractFiarakodiaListingUrlsFromHtml(html, options);
}

function extractJsonLdProduct(html) {
  const scripts = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  for (const script of scripts) {
    const raw = script[1]?.trim();
    if (!raw) continue;
    try {
      const parsed = JSON.parse(raw);
      const nodes = Array.isArray(parsed) ? parsed : [parsed];
      for (const node of nodes) {
        const type = String(node?.["@type"] ?? "").toLowerCase();
        if (type.includes("product") || type.includes("car")) {
          return node;
        }
      }
    } catch {
      // Ignore invalid json-ld blocks.
    }
  }
  return null;
}

export async function fetchFiarakodiaDetail(
  detailUrl,
  options = {},
) {
  const html = await fetchHtml(detailUrl, options);
  const title =
    extractMetaContent(html, "og:title") ??
    stripHtml((html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) ?? [])[1] ?? "") ??
    null;
  const description =
    extractMetaContent(html, "og:description") ??
    findByKeywordInHtml(html, /description|d[eé]tails?|annonce/i);

  const jsonLdProduct = extractJsonLdProduct(html);

  const priceFromMeta =
    extractMetaContent(html, "product:price:amount") ??
    findByKeywordInHtml(html, /prix|price/i);
  const currencyFromMeta =
    extractMetaContent(html, "product:price:currency") ??
    findByKeywordInHtml(html, /devise|currency/i);

  const cityRaw = findByKeywordInHtml(html, /ville|lieu|localisation|city/i);
  const postedAtRaw = findByKeywordInHtml(html, /publi[eé] le|date de publication|posted/i);
  const yearRaw = findByKeywordInHtml(html, /ann[eé]e|year|mill[eé]sime/i);
  const mileageRaw = findByKeywordInHtml(html, /kilom[eé]trage|km|mileage/i);
  const fuelTypeRaw = findByKeywordInHtml(html, /carburant|fuel/i);
  const transmissionRaw = findByKeywordInHtml(html, /bo[iî]te|transmission|gearbox/i);
  const bodyStyleRaw = findByKeywordInHtml(html, /carrosserie|body style|silhouette/i);
  const sellerNameRaw = findByKeywordInHtml(html, /vendeur|seller|contact/i);
  const sellerTypeRaw = findByKeywordInHtml(html, /professionnel|particulier|dealer|owner/i);

  return {
    source: "fiarakodia",
    sourceUrl: detailUrl,
    title: title || null,
    descriptionRaw: description || null,
    priceRaw: priceFromMeta || null,
    currencyRaw: currencyFromMeta || null,
    cityRaw: cityRaw || null,
    postedAtRaw: postedAtRaw || null,
    yearRaw: yearRaw || null,
    mileageRaw: mileageRaw || null,
    fuelTypeRaw: fuelTypeRaw || null,
    transmissionRaw: transmissionRaw || null,
    bodyStyleRaw: bodyStyleRaw || null,
    sellerNameRaw: sellerNameRaw || null,
    sellerTypeRaw: sellerTypeRaw || null,
    payload: {
      provider: "fiarakodia",
      parsed_at: new Date().toISOString(),
      json_ld_product: jsonLdProduct ?? null,
      raw_meta: {
        og_title: extractMetaContent(html, "og:title"),
        og_description: extractMetaContent(html, "og:description"),
        price_amount: extractMetaContent(html, "product:price:amount"),
        price_currency: extractMetaContent(html, "product:price:currency"),
      },
    },
    htmlSnapshot: null,
  };
}

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

