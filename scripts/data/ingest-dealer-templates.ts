/**
 * scripts/data/ingest-dealer-templates.ts
 *
 * v2 — Patches appliqués :
 *   1. year imputation : year=2025 quand condition='new' ET year IS NULL
 *      (avec flag year_imputed=true, log explicite)
 *   2. Dédoublonnage sur (source_file, brand, model, version, year, mileage_km, price_listing)
 *   3. Sémantique prix v1_neuf : price_listing_mga = Prix_net (TTC, prix client final)
 *      price_excl_tax_mga = Prix_affiche (HTVA, traçabilité)
 *      Confirmé par OceanTrade : "j'ai mis prix HTVA sur affiche et net TTC"
 *
 * Ingère les fichiers XLSX dealer/expert depuis data/dealer-templates/
 * vers un CSV unifié data/dealer-templates/_compiled.csv.
 *
 * Gère 3 formats :
 *  - v1_neuf       : template officiel onglet "Neuf" (OceanTrade, CT Motors, Sodiama)
 *  - v1_occasion   : template officiel onglet "Occasion"
 *  - v0_ts         : template ami expert (occasion ts.xlsx) — avec forward-fill
 *
 * Usage :
 *   npx tsx scripts/data/ingest-dealer-templates.ts
 */

import XLSX from "xlsx";
import * as fs from "fs";
import * as path from "path";

// ---------- Config ----------

const DEALER_DIR = path.resolve(process.cwd(), "data/dealer-templates");
const OUTPUT_CSV = path.join(DEALER_DIR, "_compiled.csv");
const DEALER_STOCK_YEAR_DEFAULT = 2025;

// ---------- Normalisations ----------

const BRAND_NORM: Record<string, string> = {
  mazda: "Mazda",
  kaiyi: "Kaiyi",
  haval: "Haval",
  greatwall: "GreatWall",
  "great wall": "GreatWall",
  vw: "Volkswagen",
  volkswagen: "Volkswagen",
  enranger: "Enranger",
  brilliance: "Brilliance",
  jetta: "Jetta",
  isuzu: "Isuzu",
  mahindra: "Mahindra",
  mercedes: "Mercedes-Benz",
  "mercedes-benz": "Mercedes-Benz",
  "mercedes benz": "Mercedes-Benz",
  bmw: "BMW",
  audi: "Audi",
  toyota: "Toyota",
  nissan: "Nissan",
  suzuki: "Suzuki",
  kia: "Kia",
  hyundai: "Hyundai",
  peugeot: "Peugeot",
  renault: "Renault",
  citroen: "Citroen",
  citroën: "Citroen",
  ford: "Ford",
  chevrolet: "Chevrolet",
  mitsubishi: "Mitsubishi",
  "land rover": "Land Rover",
  porsche: "Porsche",
  jeep: "Jeep",
  honda: "Honda",
  mini: "Mini",
  jac: "JAC",
  ssangyong: "SsangYong",
  chery: "Chery",
};

const FUEL_MAP: Record<string, string | null> = {
  essence: "petrol",
  petrol: "petrol",
  diesel: "diesel",
  gasoil: "diesel",
  hybride: "hybrid",
  hybrid: "hybrid",
  électrique: "electric",
  electrique: "electric",
  electric: "electric",
  gpl: "lpg",
  autre: "other",
  nc: null,
  "": null,
};

const TRANS_MAP: Record<string, string | null> = {
  automatique: "automatic",
  auto: "automatic",
  bva: "automatic",
  manuelle: "manual",
  manual: "manual",
  bvm: "manual",
  cvt: "automatic",
  "semi-automatique": "automatic",
  autre: null,
  nc: null,
};

const BODY_MAP: Record<string, string | null> = {
  suv: "suv",
  "4x4": "suv",
  "station wagon": "suv",
  berline: "sedan",
  sedan: "sedan",
  pickup: "pickup",
  "pick-up": "pickup",
  hatchback: "hatchback",
  van: "van",
  "van/minibus": "van",
  minibus: "van",
  coupé: "coupe",
  coupe: "coupe",
  cabriolet: "convertible",
  break: "wagon",
  autre: null,
  nc: null,
};

// ---------- Helpers ----------

function normStr(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s.length > 0 ? s : null;
}

function normBrand(v: unknown): string | null {
  const s = normStr(v);
  if (!s) return null;
  return BRAND_NORM[s.toLowerCase()] ?? s;
}

function mapOrNull(v: unknown, mapping: Record<string, string | null>): string | null {
  const s = normStr(v);
  if (!s) return null;
  return mapping[s.toLowerCase()] ?? null;
}

function toNumber(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : Number(String(v).replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : null;
}

// ---------- Types ----------

interface Record {
  source_file: string;
  source_sheet: string;
  source_kind: "dealer_official" | "expert_curated";
  source_quality_weight: number;
  condition: "new" | "used";
  dealer_name: string | null;
  brand: string;
  model: string;
  version: string | null;
  year: number | null;
  year_imputed: boolean;
  mileage_km: number | null;
  fuel_type: string | null;
  transmission: string | null;
  body_style: string | null;
  price_listing_mga: number | null;
  price_excl_tax_mga: number | null;
  price_negotiable_mga: number | null;
  forward_filled: boolean;
}

// ---------- Détection format ----------

type Format = "v1_neuf" | "v1_occasion" | "v0_ts" | null;

function detectFormat(headers: string[]): Format {
  const h = new Set(headers.filter(Boolean));
  if (h.has("Annee_modele") && h.has("Concessionnaire")) return "v1_neuf";
  if (h.has("Annee") && h.has("Vendeur_Concessionnaire")) return "v1_occasion";
  if (h.has("Modèle") && h.has("Année")) return "v0_ts";
  return null;
}

function findHeaderRow(rows: unknown[][]): { idx: number; headers: string[] } | null {
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if ((row as unknown[]).some((c) => typeof c === "string" && c.trim().toLowerCase() === "marque")) {
      return { idx: i, headers: (row as unknown[]).map((c) => (c ? String(c).trim() : "")) };
    }
  }
  return null;
}

// ---------- Parser ----------

interface ParseStats {
  forward_filled: number;
  no_price: number;
  no_brand: number;
  price_out_of_range: number;
  year_imputed: number;
  duplicates_removed: number;
  used_no_year_kept: number;
}

function parseSheet(
  fileName: string,
  sheetName: string,
  rows: unknown[][],
  parseStats: ParseStats
): Record[] {
  const records: Record[] = [];
  const found = findHeaderRow(rows);
  if (!found) return records;

  const fmt = detectFormat(found.headers);
  if (!fmt) return records;

  const colIdx: Record<string, number> = {};
  found.headers.forEach((h, i) => {
    if (h) colIdx[h] = i;
  });

  const dataRows = rows.slice(found.idx + 1);

  let lastBrand: unknown = null;
  let lastModel: unknown = null;

  for (const rRaw of dataRows) { const r = rRaw as unknown[];
    if (!r.some((c) => c !== null && c !== undefined && c !== "")) continue;

    const rec: Partial<Record> = {
      source_file: fileName,
      source_sheet: sheetName,
      forward_filled: false,
      year_imputed: false,
      price_listing_mga: null,
      price_excl_tax_mga: null,
      price_negotiable_mga: null,
    };

    let brandRaw: unknown;
    let modelRaw: unknown;

    if (fmt === "v1_neuf") {
      rec.source_kind = "dealer_official";
      rec.source_quality_weight = 1.0;
      rec.condition = "new";
      rec.dealer_name = normStr(r[colIdx.Concessionnaire ?? 1]);
      brandRaw = r[colIdx.Marque];
      modelRaw = r[colIdx.Modele];
      rec.version = normStr(r[colIdx.Version_Finition]);
      rec.year = toNumber(r[colIdx.Annee_modele]);
      rec.mileage_km = 0;
      rec.fuel_type = mapOrNull(r[colIdx.Carburant], FUEL_MAP);
      rec.transmission = mapOrNull(r[colIdx.Transmission], TRANS_MAP);
      rec.body_style = mapOrNull(r[colIdx.Carrosserie], BODY_MAP);

      // PATCH 3: TTC = prix client final → price_listing
      //          HTVA = prix de base → price_excl_tax
      const htva = toNumber(r[colIdx.Prix_affiche_MGA]);
      const ttc = toNumber(r[colIdx.Prix_net_MGA]);
      rec.price_excl_tax_mga = htva;
      rec.price_listing_mga = ttc ?? htva;
    } else if (fmt === "v1_occasion") {
      rec.source_kind = "dealer_official";
      rec.source_quality_weight = 1.0;
      rec.condition = "used";
      rec.dealer_name = normStr(r[colIdx.Vendeur_Concessionnaire ?? 1]);
      brandRaw = r[colIdx.Marque];
      modelRaw = r[colIdx.Modele];
      rec.version = normStr(r[colIdx.Version_Finition]);
      rec.year = toNumber(r[colIdx.Annee]);
      rec.mileage_km = toNumber(r[colIdx.Kilometrage_km]);
      rec.fuel_type = mapOrNull(r[colIdx.Carburant], FUEL_MAP);
      rec.transmission = mapOrNull(r[colIdx.Transmission], TRANS_MAP);
      rec.body_style = mapOrNull(r[colIdx.Carrosserie], BODY_MAP);
      rec.price_listing_mga =
        toNumber(r[colIdx.Prix_affiche_MGA]) ?? toNumber(r[colIdx.Prix_net_MGA]);
    } else if (fmt === "v0_ts") {
      rec.source_kind = "expert_curated";
      rec.source_quality_weight = 0.95;
      rec.condition = "used";
      rec.dealer_name = normStr(r[colIdx["Contact / Source"] ?? 1]);

      const rawB = r[colIdx.Marque];
      const rawM = r[colIdx["Modèle"]];
      if (rawB !== null && rawB !== undefined && rawB !== "") {
        lastBrand = rawB;
        brandRaw = rawB;
      } else {
        brandRaw = lastBrand;
        if (lastBrand !== null) {
          rec.forward_filled = true;
          parseStats.forward_filled += 1;
        }
      }
      if (rawM !== null && rawM !== undefined && rawM !== "") {
        lastModel = rawM;
        modelRaw = rawM;
      } else {
        modelRaw = lastModel;
      }

      rec.version = normStr(r[colIdx["Version / Finition"]]);
      rec.year = toNumber(r[colIdx["Année"]]);
      rec.mileage_km = toNumber(r[colIdx["Kilométrage"]]);
      rec.fuel_type = mapOrNull(r[colIdx.Carburant], FUEL_MAP);
      rec.transmission = mapOrNull(r[colIdx.Transmission], TRANS_MAP);
      rec.body_style = mapOrNull(r[colIdx.Carrosserie], BODY_MAP);
      rec.price_listing_mga = toNumber(r[colIdx["Prix affiché (MGA)"]]);
      rec.price_negotiable_mga = toNumber(r[colIdx["Prix négocié estimé (MGA)"]]);
    }

    rec.brand = normBrand(brandRaw) ?? "";
    rec.model = normStr(modelRaw) ?? "";
    if (!rec.brand || !rec.model) {
      parseStats.no_brand += 1;
      continue;
    }

    if (rec.price_listing_mga === null || rec.price_listing_mga === undefined) {
      parseStats.no_price += 1;
      continue;
    }

    if (rec.price_listing_mga < 1_000_000 || rec.price_listing_mga > 2_000_000_000) {
      parseStats.price_out_of_range += 1;
      continue;
    }

    // PATCH 1: imputation year=2025 si new + pas d'année
    if (rec.condition === "new" && rec.year === null) {
      rec.year = DEALER_STOCK_YEAR_DEFAULT;
      rec.year_imputed = true;
      parseStats.year_imputed += 1;
    } else if (rec.condition === "used" && rec.year === null) {
      parseStats.used_no_year_kept += 1;
    }

    records.push(rec as Record);
  }

  return records;
}

// ---------- Dédup (PATCH 2) ----------

function deduplicateRecords(records: Record[], stats: ParseStats): Record[] {
  const seen = new Set<string>();
  const out: Record[] = [];

  for (const r of records) {
    const key = [
      r.source_file,
      r.brand,
      r.model,
      r.version ?? "",
      r.year ?? "",
      r.mileage_km ?? "",
      r.price_listing_mga ?? "",
    ].join("|");

    if (seen.has(key)) {
      stats.duplicates_removed += 1;
      continue;
    }
    seen.add(key);
    out.push(r);
  }
  return out;
}

// ---------- Main ----------

function main() {
  if (!fs.existsSync(DEALER_DIR)) {
    console.error(`❌ Dossier introuvable : ${DEALER_DIR}`);
    process.exit(1);
  }

  const files = fs
    .readdirSync(DEALER_DIR)
    .filter((f) => f.toLowerCase().endsWith(".xlsx") && !f.startsWith("~"))
    .sort();

  if (files.length === 0) {
    console.error(`❌ Aucun fichier .xlsx dans ${DEALER_DIR}`);
    process.exit(1);
  }

  console.log(`\n📁 ${files.length} fichier(s) trouvé(s) dans ${DEALER_DIR}\n`);

  let allRecords: Record[] = [];
  const stats: ParseStats = {
    forward_filled: 0,
    no_price: 0,
    no_brand: 0,
    price_out_of_range: 0,
    year_imputed: 0,
    duplicates_removed: 0,
    used_no_year_kept: 0,
  };

  for (const fileName of files) {
    const filePath = path.join(DEALER_DIR, fileName);
    const wb = XLSX.readFile(filePath);

    for (const sheetName of wb.SheetNames) {
      if (sheetName === "Instructions" || sheetName === "Listes") continue;
      const ws = wb.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, raw: true, defval: null });
      const recs = parseSheet(fileName, sheetName, rows, stats);
      console.log(`  📄 ${fileName} [${sheetName}] → ${recs.length} records`);
      allRecords.push(...recs);
    }
  }

  // PATCH 2: dédup
  const before = allRecords.length;
  allRecords = deduplicateRecords(allRecords, stats);

  console.log(`\n${"=".repeat(70)}`);
  console.log(`✅ TOTAL : ${allRecords.length} records ingérés (avant dédup: ${before})`);
  console.log(`${"=".repeat(70)}`);

  console.log(`\n🔧 Forward-fills appliqués     : ${stats.forward_filled}`);
  console.log(`📅 Years imputées (new→2025)   : ${stats.year_imputed}`);
  console.log(`🗑️  Doublons retirés            : ${stats.duplicates_removed}`);
  console.log(`⚠️  Used sans année (gardés)    : ${stats.used_no_year_kept}`);
  console.log(`⚠️  Skipped no_price           : ${stats.no_price}`);
  console.log(`⚠️  Skipped no_brand           : ${stats.no_brand}`);
  console.log(`⚠️  Skipped price_out_of_range : ${stats.price_out_of_range}`);

  const byKind = allRecords.reduce<Record<string, number>>((acc, r) => {
    acc[r.source_kind] = (acc[r.source_kind] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  console.log(`\n📊 Par source_kind :`);
  Object.entries(byKind).forEach(([k, v]) => console.log(`   ${k}: ${v}`));

  const byCondition = allRecords.reduce<Record<string, number>>((acc, r) => {
    acc[r.condition] = (acc[r.condition] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  console.log(`\n📊 Par condition :`);
  Object.entries(byCondition).forEach(([k, v]) => console.log(`   ${k}: ${v}`));

  const byBrand: Record<string, number> = {};
  allRecords.forEach((r) => {
    byBrand[r.brand] = (byBrand[r.brand] ?? 0) + 1;
  });
  const sortedBrands = Object.entries(byBrand).sort((a, b) => b[1] - a[1]);
  console.log(`\n📊 Top marques (${sortedBrands.length} distinctes) :`);
  sortedBrands.slice(0, 25).forEach(([k, v]) => console.log(`   ${k}: ${v}`));

  const manualBrands = new Set([
    "BMW", "Porsche", "Mazda", "Toyota", "Renault", "Honda", "Chery", "Volkswagen",
    "Hyundai", "Ford", "Kia", "Mitsubishi", "Land Rover", "Suzuki", "Audi",
    "SsangYong", "Mini", "JAC", "Nissan", "Mercedes-Benz", "Jeep", "Peugeot",
    "Chevrolet",
  ]);
  const newBrands = sortedBrands
    .map(([b]) => b)
    .filter((b) => !manualBrands.has(b))
    .sort();
  if (newBrands.length > 0) {
    console.log(`\n🆕 Marques absentes du corpus Facebook manuel :`);
    console.log(`   ${newBrands.join(", ")}`);
    console.log(`   → Ces marques sont probablement absentes du catalogue UI aussi.`);
  }

  // ---------- Écriture CSV ----------

  const header = [
    "source_file",
    "source_sheet",
    "source_kind",
    "source_quality_weight",
    "condition",
    "dealer_name",
    "brand",
    "model",
    "version",
    "year",
    "year_imputed",
    "mileage_km",
    "fuel_type",
    "transmission",
    "body_style",
    "price_listing_mga",
    "price_excl_tax_mga",
    "price_negotiable_mga",
    "forward_filled",
  ];

  const csvLines = [header.join(",")];
  for (const r of allRecords) {
    const row = header.map((col) => {
      const v = (r as Record<string, unknown>)[col];
      if (v === null || v === undefined) return "";
      const s = String(v);
      if (s.includes(",") || s.includes('"') || s.includes("\n")) {
        return `"${s.replace(/"/g, '""')}"`;
      }
      return s;
    });
    csvLines.push(row.join(","));
  }

  fs.writeFileSync(OUTPUT_CSV, csvLines.join("\n"), "utf-8");
  console.log(`\n💾 CSV unifié écrit : ${OUTPUT_CSV}`);
  console.log(`   ${allRecords.length} records, ${header.length} colonnes\n`);
}

main();
