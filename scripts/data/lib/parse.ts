/**
 * Parsers utilitaires pour le pipeline d'ingestion reference profiles.
 * Pas de dépendance externe (papaparse absent du package.json).
 */

/**
 * Parser CSV RFC-4180 minimaliste mais robuste :
 * - gère les champs entre guillemets contenant virgules / nouvelles lignes / guillemets échappés ("")
 * - tolère les fins de ligne CRLF / LF
 * - retourne un tableau d'objets indexés par les en-têtes
 */
export function parseCsv(content: string): Record<string, string>[] {
  const rows = parseCsvRaw(content);
  if (rows.length === 0) return [];
  const headers = rows[0].map((h) => h.trim());
  const out: Record<string, string>[] = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (row.length === 1 && row[0].trim() === "") continue; // ligne vide
    const obj: Record<string, string> = {};
    for (let j = 0; j < headers.length; j++) {
      obj[headers[j]] = (row[j] ?? "").trim();
    }
    out.push(obj);
  }
  return out;
}

function parseCsvRaw(input: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  let i = 0;
  while (i < input.length) {
    const c = input[i];
    if (inQuotes) {
      if (c === '"') {
        if (input[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      field += c;
      i++;
      continue;
    }
    if (c === '"') {
      inQuotes = true;
      i++;
      continue;
    }
    if (c === ",") {
      row.push(field);
      field = "";
      i++;
      continue;
    }
    if (c === "\r") {
      // CRLF ou CR seul
      row.push(field);
      field = "";
      rows.push(row);
      row = [];
      if (input[i + 1] === "\n") i += 2;
      else i++;
      continue;
    }
    if (c === "\n") {
      row.push(field);
      field = "";
      rows.push(row);
      row = [];
      i++;
      continue;
    }
    field += c;
    i++;
  }
  // Dernier champ / ligne
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

/**
 * Parser de prix tolérant. Accepte :
 * - "5000000" → 5000000 Ar (devise par défaut: AR si currency_detected="AR" ou non spécifié)
 * - "100M Fmg" → 100_000_000 FMG → 20_000_000 Ar (ratio 1 Ar = 5 FMG)
 * - "12 500 000" → 12500000
 * - "12,500,000" → 12500000
 * - "12.5M" → 12_500_000
 * Retourne le prix en Ariary (arrondi entier) + currency détecté.
 */
export function parsePriceToAriary(
  raw: string | number | null | undefined,
  declaredCurrency: string | null | undefined,
): { price_ar: number | null; currency_detected: "AR" | "FMG" | "AR_DEFAULT" } {
  if (raw === null || raw === undefined || raw === "") {
    return { price_ar: null, currency_detected: "AR_DEFAULT" };
  }

  let str = String(raw).trim();
  const lower = str.toLowerCase();

  // Détection devise
  let currency: "AR" | "FMG" | "AR_DEFAULT" = "AR_DEFAULT";
  if (declaredCurrency) {
    const dc = declaredCurrency.trim().toUpperCase();
    if (dc === "AR" || dc === "ARIARY" || dc === "MGA") currency = "AR";
    else if (dc === "FMG" || dc === "FRANC") currency = "FMG";
  }
  if (lower.includes("fmg")) currency = "FMG";
  else if (lower.includes("ariary") || /\bar\b/i.test(str) || lower.includes("mga")) currency = "AR";

  // Multiplicateur "M" / "K" (cas "12.5M", "100M", "500K")
  let multiplier = 1;
  if (/[\d\s.,]m\b/i.test(lower)) multiplier = 1_000_000;
  else if (/[\d\s.,]k\b/i.test(lower)) multiplier = 1_000;

  // Nettoyage: garder chiffres, point, virgule
  str = str.replace(/[^\d.,]/g, "");
  if (!str) return { price_ar: null, currency_detected: currency };

  // Heuristique: si contient virgule + point, le point est milliers, virgule = décimales (format FR)
  // sinon on retire les espaces et virgules de millier
  let numericStr = str;
  if (str.includes(",") && str.includes(".")) {
    // FR: "12.500.000,50"
    numericStr = str.replace(/\./g, "").replace(",", ".");
  } else if (str.includes(",")) {
    // ambigu: "12,500" — si > 3 chiffres après virgule => séparateur milliers, sinon décimal
    const parts = str.split(",");
    if (parts.length > 1 && parts.every((p, idx) => idx === 0 || p.length === 3)) {
      numericStr = str.replace(/,/g, "");
    } else if (parts.length === 2 && parts[1].length <= 2) {
      numericStr = str.replace(",", ".");
    } else {
      numericStr = str.replace(/,/g, "");
    }
  }
  const num = Number.parseFloat(numericStr);
  if (!Number.isFinite(num)) return { price_ar: null, currency_detected: currency };

  let value = num * multiplier;
  if (currency === "FMG") value = value / 5; // 1 Ar = 5 FMG

  return { price_ar: Math.round(value), currency_detected: currency };
}

/**
 * Parser année tolérant: accepte "2018", "2018.0", "2018-2019" (prend le premier).
 */
export function parseYear(raw: string | number | null | undefined): number | null {
  if (raw === null || raw === undefined || raw === "") return null;
  const str = String(raw).trim();
  const m = str.match(/(19|20)\d{2}/);
  if (!m) return null;
  const n = Number.parseInt(m[0], 10);
  return Number.isFinite(n) ? n : null;
}

/**
 * Parser kilométrage. Accepte "85000", "85 000 km", "85k", "85.000".
 */
export function parseKm(raw: string | number | null | undefined): number | null {
  if (raw === null || raw === undefined || raw === "") return null;
  const str = String(raw).trim().toLowerCase();
  if (!str) return null;
  let multiplier = 1;
  if (/\dk\b/i.test(str)) multiplier = 1_000;
  const cleaned = str.replace(/[^\d.,]/g, "").replace(/\s/g, "");
  if (!cleaned) return null;
  const numericStr = cleaned.includes(",") && cleaned.includes(".")
    ? cleaned.replace(/\./g, "").replace(",", ".")
    : cleaned.replace(/,/g, "");
  const n = Number.parseFloat(numericStr);
  if (!Number.isFinite(n)) return null;
  return Math.round(n * multiplier);
}

/**
 * Tente de parser une date ISO ou un timestamp générique. Retourne null si impossible.
 */
export function parseObservedAt(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const str = String(raw).trim();
  if (!str) return null;
  const d = new Date(str);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}
