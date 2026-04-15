export function normalizeCatalogName(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^\p{L}\p{N}\s-]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function slugify(value) {
  return normalizeCatalogName(value)
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export function titleCasePreserveAcronyms(value) {
  return String(value ?? "")
    .trim()
    .split(/\s+/)
    .map((token) => {
      if (token.length <= 3 && token === token.toUpperCase()) return token;
      return token.charAt(0).toUpperCase() + token.slice(1).toLowerCase();
    })
    .join(" ");
}

export const MADAGASCAR_MODEL_ALIASES = [
  { make: "mazda", canonicalModel: "Mazda 2", alias: "Demio" },
  { make: "toyota", canonicalModel: "Yaris", alias: "Vitz" },
  { make: "honda", canonicalModel: "Jazz", alias: "Fit" },
  { make: "toyota", canonicalModel: "Corolla", alias: "Corolla Axio" },
  { make: "toyota", canonicalModel: "Prado", alias: "Land Cruiser Prado" },
  { make: "toyota", canonicalModel: "Hilux", alias: "Hilux Revo" },
];
