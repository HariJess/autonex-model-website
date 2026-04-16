import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEFAULT_SITE_URL = "https://autonex.mg";
const SITE_URL = (process.env.SITE_URL || DEFAULT_SITE_URL).replace(/\/+$/, "");
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || "";
const SUPABASE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || "";

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function stripTags(s) {
  return String(s).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function truncate(s, max = 160) {
  const v = stripTags(s);
  if (v.length <= max) return v;
  return `${v.slice(0, max - 1).trimEnd()}…`;
}

function ensureTag(html, tagName, attrs, content) {
  const headClose = html.indexOf("</head>");
  if (headClose === -1) return html;
  const tag = content == null
    ? `<${tagName}${attrs ? ` ${attrs}` : ""}>`
    : `<${tagName}${attrs ? ` ${attrs}` : ""}>${content}</${tagName}>`;
  return `${html.slice(0, headClose)}\n    ${tag}\n${html.slice(headClose)}`;
}

function upsertMeta(html, { title, description, canonical, ogImage }) {
  let out = html;

  out = out.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(title)}</title>`);

  // Description
  if (/<meta\s+name=["']description["']/i.test(out)) {
    out = out.replace(
      /<meta\s+name=["']description["'][^>]*>/i,
      `<meta name="description" content="${escapeHtml(description)}">`,
    );
  } else {
    out = ensureTag(out, "meta", `name="description" content="${escapeHtml(description)}"`, null);
  }

  // Canonical
  if (/<link\s+rel=["']canonical["']/i.test(out)) {
    out = out.replace(
      /<link\s+rel=["']canonical["'][^>]*>/i,
      `<link rel="canonical" href="${escapeHtml(canonical)}">`,
    );
  } else {
    out = ensureTag(out, "link", `rel="canonical" href="${escapeHtml(canonical)}"`, null);
  }

  // OG basics
  const upsertOg = (property, value) => {
    if (new RegExp(`<meta\\s+property=["']${property}["']`, "i").test(out)) {
      out = out.replace(
        new RegExp(`<meta\\s+property=["']${property}["'][^>]*>`, "i"),
        `<meta property="${property}" content="${escapeHtml(value)}">`,
      );
    } else {
      out = ensureTag(out, "meta", `property="${property}" content="${escapeHtml(value)}"`, null);
    }
  };
  upsertOg("og:type", "article");
  upsertOg("og:title", title);
  upsertOg("og:description", description);
  upsertOg("og:url", canonical);
  if (ogImage) upsertOg("og:image", ogImage);

  // Twitter basics
  const upsertTwitter = (name, value) => {
    if (new RegExp(`<meta\\s+name=["']${name}["']`, "i").test(out)) {
      out = out.replace(
        new RegExp(`<meta\\s+name=["']${name}["'][^>]*>`, "i"),
        `<meta name="${name}" content="${escapeHtml(value)}">`,
      );
    } else {
      out = ensureTag(out, "meta", `name="${name}" content="${escapeHtml(value)}"`, null);
    }
  };
  upsertTwitter("twitter:card", "summary_large_image");
  upsertTwitter("twitter:title", title);
  upsertTwitter("twitter:description", description);
  if (ogImage) upsertTwitter("twitter:image", ogImage);

  return out;
}

async function readJsonSafe(filePath, fallback) {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function normalizeRoute(route) {
  if (!route.startsWith("/")) return `/${route}`;
  return route;
}

function distPathForRoute(distDir, route) {
  const r = normalizeRoute(route);
  if (r === "/") return path.join(distDir, "index.html");
  const rel = r.replace(/^\/+/, "");
  return path.join(distDir, rel, "index.html");
}

function isListingRoute(route) {
  return /^\/annonce\/[0-9a-f-]{36}$/i.test(route);
}

function isAgencyRoute(route) {
  return /^\/agence\/[^/]+$/i.test(route);
}

async function fetchListingMeta(supabase, id) {
  const { data: listing, error } = await supabase
    .from("listings")
    .select("id,title,description,transaction,type,ville,region,price_mga,updated_at,created_at,status")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!listing) return null;

  const { data: photos } = await supabase
    .from("listing_photos")
    .select("url,position")
    .eq("listing_id", id)
    .order("position", { ascending: true })
    .limit(1);

  const title = listing.title ? `${listing.title} — AutoNex` : "Annonce — AutoNex";
  const location = listing.ville || listing.region || "Madagascar";
  const price = listing.price_mga ? `${Number(listing.price_mga).toLocaleString("fr-FR")} Ar` : "";
  const desc = truncate([price, location, listing.description || ""].filter(Boolean).join(" — "), 160);
  const image = photos?.[0]?.url ? (photos[0].url.startsWith("http") ? photos[0].url : `${SITE_URL}${photos[0].url}`) : undefined;

  return { title, description: desc, image };
}

async function fetchAgencyMeta(supabase, slug) {
  const { data: agency, error } = await supabase
    .from("agencies")
    .select("name,bio,slug,updated_at,logo_url,city,area")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw error;
  if (!agency) return null;

  const title = agency.name ? `${agency.name} — AutoNex` : "Concessionnaire — AutoNex";
  const loc = [agency.city, agency.area].filter(Boolean).join(", ");
  const desc = truncate([loc, agency.bio || ""].filter(Boolean).join(" — "), 160) || "Profil concessionnaire AutoNex.";
  const image = agency.logo_url ? (agency.logo_url.startsWith("http") ? agency.logo_url : `${SITE_URL}${agency.logo_url}`) : undefined;
  return { title, description: desc, image };
}

async function main() {
  const root = path.resolve(__dirname, "..", "..");
  const distDir = path.resolve(root, "dist");
  const publicDir = path.resolve(root, "public");

  const indexPath = path.join(distDir, "index.html");
  const baseHtml = await fs.readFile(indexPath, "utf8");

  const routesFile = path.join(publicDir, "sitemaps", "prerender-routes.json");
  const routes = await readJsonSafe(routesFile, ["/", "/recherche", "/agences", "/estimation", "/conseils"]);

  const hasSupabase = SUPABASE_URL.length > 0 && SUPABASE_KEY.length > 0;
  const supabase = hasSupabase
    ? createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
    : null;

  let written = 0;
  for (const rawRoute of routes) {
    const route = normalizeRoute(String(rawRoute || ""));
    if (!route || route === "/") continue;

    const canonical = `${SITE_URL}${route}`;
    let html = baseHtml;

    if (isListingRoute(route) && supabase) {
      const id = route.split("/").pop();
      const meta = await fetchListingMeta(supabase, id);
      if (meta) {
        html = upsertMeta(html, { title: meta.title, description: meta.description, canonical, ogImage: meta.image });
      }
    } else if (isAgencyRoute(route) && supabase) {
      const slug = route.split("/").pop();
      const meta = await fetchAgencyMeta(supabase, slug);
      if (meta) {
        html = upsertMeta(html, { title: meta.title, description: meta.description, canonical, ogImage: meta.image });
      }
    } else {
      // Static route shell: at least ensure canonical is stable.
      html = upsertMeta(html, {
        title: "AutoNex — la marketplace automobile de référence à Madagascar.",
        description: "AutoNex est la marketplace automobile de référence à Madagascar.",
        canonical,
        ogImage: undefined,
      });
    }

    const outPath = distPathForRoute(distDir, route);
    await fs.mkdir(path.dirname(outPath), { recursive: true });
    await fs.writeFile(outPath, html, "utf8");
    written += 1;
  }

  console.log(`[postbuild-prerender-shell] Wrote ${written} prerendered HTML shells.`);
}

main().catch((err) => {
  console.error("[postbuild-prerender-shell] Failed", err);
  process.exitCode = 1;
});

