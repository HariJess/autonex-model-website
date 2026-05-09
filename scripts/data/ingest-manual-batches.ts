/**
 * Validation et stats sur le corpus de batches manuels (`data/manual-reference-batches/`).
 *
 * Lance:
 *   npx tsx scripts/data/ingest-manual-batches.ts
 *
 * Ce script ne touche PAS au pipeline d'estimation en runtime ni aux profils
 * SQL existants. Il sert uniquement à :
 *   - charger tous les `manual_batch*_YYYY-MM-DD.csv` du dossier
 *   - vérifier que chaque fichier respecte le schéma documenté dans le README
 *   - dédoublonner sur (brand, model, year, mileage_km, price_ar, sellerName)
 *   - imprimer un rapport agrégé : volume par seller_type, par marque, par
 *     condition, fourchettes de prix, marques sous-représentées, anomalies.
 *
 * Aucune écriture de fichier en sortie pour l'instant : tout est imprimé.
 * Quand le seuil cible (200-500 annonces) sera atteint, ce script servira de
 * porte d'entrée au sprint patch passe 8 (régénération des reference profiles
 * avec coefficients seller_type différenciés).
 */
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseCsv } from "./lib/parse";

// ---------- Types ----------

const SELLER_TYPES = ["private", "reseller", "dealer"] as const;
type SellerType = (typeof SELLER_TYPES)[number];

const FUEL_TYPES = ["petrol", "diesel", "hybrid", "electric"] as const;
type FuelType = (typeof FUEL_TYPES)[number];

const TRANSMISSIONS = ["manual", "automatic", "cvt"] as const;
type Transmission = (typeof TRANSMISSIONS)[number];

const BODY_STYLES = [
  "sedan",
  "suv",
  "hatchback",
  "pickup",
  "van",
  "coupe",
  "wagon",
  "other",
] as const;
type BodyStyle = (typeof BODY_STYLES)[number];

const CONDITIONS = ["new", "excellent", "good", "fair"] as const;
type Condition = (typeof CONDITIONS)[number];

interface ManualBatchRow {
  facebookUrl: string;
  time: string;
  sellerName: string;
  seller_type: SellerType;
  brand: string;
  model: string;
  year: number;
  mileage_km: number;
  price_ar: number;
  currency_original: string;
  fuel_type: FuelType;
  transmission: Transmission;
  body_style: BodyStyle;
  condition: Condition;
  city: string;
  confidence: number;
  notes: string;
  // tracking
  _sourceFile: string;
  _rowIndex: number;
}

interface ValidationError {
  file: string;
  rowIndex: number;
  field: string;
  value: string;
  reason: string;
}

// ---------- Constants ----------

const REQUIRED_HEADERS = [
  "facebookUrl",
  "time",
  "sellerName",
  "seller_type",
  "brand",
  "model",
  "year",
  "mileage_km",
  "price_ar",
  "currency_original",
  "fuel_type",
  "transmission",
  "body_style",
  "condition",
  "city",
  "confidence",
  "notes",
] as const;

// Marques que nous voulons sur-représenter — utilisé pour le rapport
// "marques sous-représentées" en bas du output.
const PRIORITY_BRANDS_TO_HUNT = [
  "Honda",
  "Mercedes-Benz",
  "Land Rover",
  "Subaru",
  "Lexus",
  "Volvo",
  "Toyota", // pour Corolla/Camry/RAV4/Yaris spécifiquement
  "Suzuki", // pour Vitara/Swift spécifiquement
] as const;

const DEALER_KEYWORDS = [
  "madauto",
  "sodiama",
  "sicam",
  "materauto",
  "bamada",
  "ct_motors",
  "ct motors",
] as const;

// ---------- Path resolution ----------

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// scripts/data/ → repo root → data/manual-reference-batches/
const BATCHES_DIR = resolve(__dirname, "..", "..", "data", "manual-reference-batches");

// ---------- File discovery ----------

function discoverBatchFiles(): string[] {
  if (!existsSync(BATCHES_DIR)) {
    throw new Error(
      `Dossier introuvable: ${BATCHES_DIR}\n` +
        `Crée-le et dépose les CSV avant de relancer.`,
    );
  }
  const files = readdirSync(BATCHES_DIR)
    .filter((f) => /^manual_batch\d+_\d{4}-\d{2}-\d{2}\.csv$/i.test(f))
    .sort();
  if (files.length === 0) {
    throw new Error(
      `Aucun fichier 'manual_batchN_YYYY-MM-DD.csv' trouvé dans ${BATCHES_DIR}`,
    );
  }
  return files.map((f) => resolve(BATCHES_DIR, f));
}

// ---------- Parsing & validation ----------

function isOneOf<T extends readonly string[]>(
  value: string,
  allowed: T,
): value is T[number] {
  return (allowed as readonly string[]).includes(value);
}

function validateRow(
  raw: Record<string, string>,
  file: string,
  rowIndex: number,
  errors: ValidationError[],
): ManualBatchRow | null {
  const push = (field: string, value: string, reason: string) => {
    errors.push({ file, rowIndex, field, value, reason });
  };

  // Champs textuels obligatoires
  const facebookUrl = raw.facebookUrl ?? "";
  const time = raw.time ?? "";
  const sellerName = raw.sellerName ?? "";
  const brand = raw.brand ?? "";
  const model = raw.model ?? "";
  const currency_original = raw.currency_original ?? "";
  const city = raw.city ?? "";
  const notes = raw.notes ?? "";

  if (!facebookUrl) push("facebookUrl", facebookUrl, "vide");
  if (!sellerName) push("sellerName", sellerName, "vide");
  if (!brand) push("brand", brand, "vide");
  if (!model) push("model", model, "vide");
  if (!city) push("city", city, "vide");

  // Date ISO
  if (!/^\d{4}-\d{2}-\d{2}$/.test(time)) {
    push("time", time, "format attendu YYYY-MM-DD");
  }

  // Enums
  const seller_type = raw.seller_type ?? "";
  if (!isOneOf(seller_type, SELLER_TYPES)) {
    push("seller_type", seller_type, `attendu: ${SELLER_TYPES.join("|")}`);
  }
  const fuel_type = raw.fuel_type ?? "";
  if (!isOneOf(fuel_type, FUEL_TYPES)) {
    push("fuel_type", fuel_type, `attendu: ${FUEL_TYPES.join("|")}`);
  }
  const transmission = raw.transmission ?? "";
  if (!isOneOf(transmission, TRANSMISSIONS)) {
    push("transmission", transmission, `attendu: ${TRANSMISSIONS.join("|")}`);
  }
  const body_style = raw.body_style ?? "";
  if (!isOneOf(body_style, BODY_STYLES)) {
    push("body_style", body_style, `attendu: ${BODY_STYLES.join("|")}`);
  }
  const condition = raw.condition ?? "";
  if (!isOneOf(condition, CONDITIONS)) {
    push("condition", condition, `attendu: ${CONDITIONS.join("|")}`);
  }

  // Numériques
  const year = Number(raw.year);
  if (!Number.isInteger(year) || year < 1980 || year > 2030) {
    push("year", raw.year ?? "", "entier 1980..2030");
  }
  const mileage_km = Number(raw.mileage_km);
  if (!Number.isInteger(mileage_km) || mileage_km < 0 || mileage_km > 1_000_000) {
    push("mileage_km", raw.mileage_km ?? "", "entier 0..1_000_000");
  }
  const price_ar = Number(raw.price_ar);
  if (!Number.isInteger(price_ar) || price_ar <= 0) {
    push("price_ar", raw.price_ar ?? "", "entier > 0");
  }
  const confidence = Number(raw.confidence);
  if (!Number.isFinite(confidence) || confidence < 0 || confidence > 1) {
    push("confidence", raw.confidence ?? "", "float 0..1");
  }

  // Cohérence: condition=new ⇒ mileage_km=0
  if (condition === "new" && mileage_km > 0) {
    push("mileage_km", String(mileage_km), "incohérence: condition=new mais mileage>0");
  }

  // Si on a accumulé des erreurs sur cette ligne, on l'écarte
  if (errors.some((e) => e.file === file && e.rowIndex === rowIndex)) {
    return null;
  }

  return {
    facebookUrl,
    time,
    sellerName,
    seller_type: seller_type as SellerType,
    brand,
    model,
    year,
    mileage_km,
    price_ar,
    currency_original,
    fuel_type: fuel_type as FuelType,
    transmission: transmission as Transmission,
    body_style: body_style as BodyStyle,
    condition: condition as Condition,
    city,
    confidence,
    notes,
    _sourceFile: file,
    _rowIndex: rowIndex,
  };
}

// ---------- Loading ----------

interface LoadResult {
  rows: ManualBatchRow[];
  errors: ValidationError[];
  perFileCount: Map<string, number>;
}

function loadAllBatches(files: string[]): LoadResult {
  const rows: ManualBatchRow[] = [];
  const errors: ValidationError[] = [];
  const perFileCount = new Map<string, number>();

  for (const file of files) {
    const content = readFileSync(file, "utf-8");
    const parsed = parseCsv(content);

    if (parsed.length === 0) {
      errors.push({ file, rowIndex: 0, field: "(file)", value: "", reason: "vide" });
      continue;
    }

    // Vérif headers (Object.keys de la première ligne)
    const headers = Object.keys(parsed[0]);
    const missing = REQUIRED_HEADERS.filter((h) => !headers.includes(h));
    if (missing.length > 0) {
      errors.push({
        file,
        rowIndex: 0,
        field: "(headers)",
        value: headers.join(","),
        reason: `headers manquants: ${missing.join(",")}`,
      });
      continue;
    }
    const extra = headers.filter(
      (h) => !(REQUIRED_HEADERS as readonly string[]).includes(h),
    );
    if (extra.length > 0) {
      errors.push({
        file,
        rowIndex: 0,
        field: "(headers)",
        value: extra.join(","),
        reason: `headers inattendus: ${extra.join(",")}`,
      });
      // on continue quand même : extra headers = warning, pas blocker
    }

    let kept = 0;
    parsed.forEach((raw, idx) => {
      const row = validateRow(raw, file, idx + 2, errors); // idx+2 = ligne réelle (header=1)
      if (row) {
        rows.push(row);
        kept++;
      }
    });
    perFileCount.set(file, kept);
  }

  return { rows, errors, perFileCount };
}

// ---------- Deduplication ----------

function dedupKey(r: ManualBatchRow): string {
  return [
    r.brand.toLowerCase().trim(),
    r.model.toLowerCase().trim(),
    r.year,
    r.mileage_km,
    r.price_ar,
    r.sellerName.toLowerCase().trim(),
  ].join("|");
}

function deduplicate(rows: ManualBatchRow[]): {
  unique: ManualBatchRow[];
  duplicates: { key: string; count: number; samples: ManualBatchRow[] }[];
} {
  const buckets = new Map<string, ManualBatchRow[]>();
  for (const r of rows) {
    const k = dedupKey(r);
    const arr = buckets.get(k) ?? [];
    arr.push(r);
    buckets.set(k, arr);
  }
  const unique: ManualBatchRow[] = [];
  const duplicates: { key: string; count: number; samples: ManualBatchRow[] }[] = [];
  for (const [key, arr] of buckets) {
    unique.push(arr[0]); // on garde la première occurrence
    if (arr.length > 1) {
      duplicates.push({ key, count: arr.length, samples: arr });
    }
  }
  return { unique, duplicates };
}

// ---------- Stats ----------

function countBy<K extends string>(
  rows: ManualBatchRow[],
  pick: (r: ManualBatchRow) => K,
): Map<K, number> {
  const m = new Map<K, number>();
  for (const r of rows) {
    const k = pick(r);
    m.set(k, (m.get(k) ?? 0) + 1);
  }
  return m;
}

function priceStats(rows: ManualBatchRow[]): {
  min: number;
  median: number;
  max: number;
} {
  if (rows.length === 0) return { min: 0, median: 0, max: 0 };
  const sorted = rows.map((r) => r.price_ar).sort((a, b) => a - b);
  return {
    min: sorted[0],
    median: sorted[Math.floor(sorted.length / 2)],
    max: sorted[sorted.length - 1],
  };
}

function detectMislabeledDealers(rows: ManualBatchRow[]): ManualBatchRow[] {
  return rows.filter((r) => {
    if (r.seller_type === "dealer") return false;
    const lower = r.sellerName.toLowerCase();
    return DEALER_KEYWORDS.some((kw) => lower.includes(kw));
  });
}

// ---------- Pretty printing ----------

function fmtAr(n: number): string {
  return n.toLocaleString("fr-FR") + " Ar";
}

function printHeader(title: string): void {
  console.log(`\n${"=".repeat(72)}`);
  console.log(title);
  console.log("=".repeat(72));
}

function printSubheader(title: string): void {
  console.log(`\n${title}`);
  console.log("-".repeat(title.length));
}

function basename(p: string): string {
  return p.split(/[\\/]/).pop() ?? p;
}

// ---------- Main ----------

function main(): void {
  printHeader("Manual reference batches — ingestion & validation");

  const files = discoverBatchFiles();
  console.log(`Dossier:  ${BATCHES_DIR}`);
  console.log(`Fichiers: ${files.length}`);
  files.forEach((f) => console.log(`  - ${basename(f)}`));

  const { rows, errors, perFileCount } = loadAllBatches(files);

  // Erreurs
  if (errors.length > 0) {
    printSubheader(`Erreurs de validation (${errors.length})`);
    errors.slice(0, 30).forEach((e) => {
      console.log(
        `  [${basename(e.file)}:${e.rowIndex}] ${e.field}="${e.value}" → ${e.reason}`,
      );
    });
    if (errors.length > 30) {
      console.log(`  … (${errors.length - 30} erreurs supplémentaires non affichées)`);
    }
  } else {
    console.log("\nAucune erreur de validation. ✓");
  }

  // Volume par fichier
  printSubheader("Lignes valides par fichier");
  for (const [file, count] of perFileCount) {
    console.log(`  ${basename(file).padEnd(40)} ${count}`);
  }
  console.log(`  ${"TOTAL".padEnd(40)} ${rows.length}`);

  // Dédoublonnage
  const { unique, duplicates } = deduplicate(rows);
  printSubheader(`Dédoublonnage`);
  console.log(`  Lignes valides:           ${rows.length}`);
  console.log(`  Lignes uniques:           ${unique.length}`);
  console.log(`  Doublons supprimés:       ${rows.length - unique.length}`);
  if (duplicates.length > 0) {
    console.log(`  Groupes dupliqués:        ${duplicates.length}`);
    duplicates.slice(0, 5).forEach((d) => {
      console.log(`    × ${d.count}  →  ${d.key}`);
    });
  }

  if (unique.length === 0) {
    console.log("\nAucune donnée à analyser. Stop.");
    process.exit(errors.length > 0 ? 1 : 0);
  }

  // Volume par seller_type
  printSubheader("Volume par seller_type");
  const bySeller = countBy(unique, (r) => r.seller_type);
  for (const t of SELLER_TYPES) {
    const n = bySeller.get(t) ?? 0;
    const pct = ((n / unique.length) * 100).toFixed(1);
    console.log(`  ${t.padEnd(10)} ${String(n).padStart(4)}  (${pct}%)`);
  }

  // Volume par condition
  printSubheader("Volume par condition");
  const byCond = countBy(unique, (r) => r.condition);
  for (const c of CONDITIONS) {
    const n = byCond.get(c) ?? 0;
    if (n > 0) console.log(`  ${c.padEnd(10)} ${String(n).padStart(4)}`);
  }

  // Volume par fuel_type
  printSubheader("Volume par fuel_type");
  const byFuel = countBy(unique, (r) => r.fuel_type);
  for (const f of FUEL_TYPES) {
    const n = byFuel.get(f) ?? 0;
    if (n > 0) console.log(`  ${f.padEnd(10)} ${String(n).padStart(4)}`);
  }

  // Volume par body_style
  printSubheader("Volume par body_style");
  const byBody = countBy(unique, (r) => r.body_style);
  for (const b of BODY_STYLES) {
    const n = byBody.get(b) ?? 0;
    if (n > 0) console.log(`  ${b.padEnd(12)} ${String(n).padStart(4)}`);
  }

  // Top marques
  printSubheader("Top 15 marques");
  const byBrand = countBy(unique, (r) => r.brand);
  const brandRanked = Array.from(byBrand.entries()).sort((a, b) => b[1] - a[1]);
  brandRanked.slice(0, 15).forEach(([brand, n]) => {
    console.log(`  ${brand.padEnd(20)} ${String(n).padStart(4)}`);
  });
  console.log(`  Marques distinctes:    ${byBrand.size}`);

  // Marques prioritaires sous-représentées
  printSubheader("Marques prioritaires à chasser");
  for (const wanted of PRIORITY_BRANDS_TO_HUNT) {
    const n = byBrand.get(wanted) ?? 0;
    const flag = n === 0 ? " ✗ ABSENTE" : n < 5 ? " ⚠ peu de data" : " ✓";
    console.log(`  ${wanted.padEnd(15)} ${String(n).padStart(3)}${flag}`);
  }

  // Stats prix global et par seller_type
  printSubheader("Statistiques de prix (Ar)");
  const ps = priceStats(unique);
  console.log(`  Global   min=${fmtAr(ps.min)}  median=${fmtAr(ps.median)}  max=${fmtAr(ps.max)}`);
  for (const t of SELLER_TYPES) {
    const sub = unique.filter((r) => r.seller_type === t);
    if (sub.length === 0) continue;
    const s = priceStats(sub);
    console.log(
      `  ${t.padEnd(8)} (n=${String(sub.length).padStart(3)})  min=${fmtAr(s.min)}  median=${fmtAr(s.median)}  max=${fmtAr(s.max)}`,
    );
  }

  // Détection dealers mal taggés
  const mislabeled = detectMislabeledDealers(unique);
  if (mislabeled.length > 0) {
    printSubheader(`Anomalies: vendeurs ressemblant à des dealers mais pas taggés 'dealer' (${mislabeled.length})`);
    mislabeled.slice(0, 10).forEach((r) => {
      console.log(
        `  [${basename(r._sourceFile)}:${r._rowIndex}] sellerName="${r.sellerName}" seller_type=${r.seller_type}`,
      );
    });
  }

  // Cible
  printSubheader("Progression cible");
  const TARGET_MIN = 200;
  const TARGET_MAX = 500;
  const pctMin = ((unique.length / TARGET_MIN) * 100).toFixed(1);
  console.log(`  Cible minimale (sprint passe 8): ${TARGET_MIN} annonces`);
  console.log(`  Cible idéale:                    ${TARGET_MAX} annonces`);
  console.log(`  Avancement:                      ${unique.length} / ${TARGET_MIN}  (${pctMin}%)`);
  if (unique.length < TARGET_MIN) {
    console.log(`  Reste à collecter:               ${TARGET_MIN - unique.length} annonces minimum`);
  } else {
    console.log(`  ✓ Seuil atteint — sprint passe 8 débloquable.`);
  }

  // Sortie process
  console.log("");
  if (errors.length > 0) {
    console.log(`Terminé avec ${errors.length} erreur(s) de validation. Exit 1.`);
    process.exit(1);
  }
  console.log("Terminé sans erreur. ✓");
}

main();
