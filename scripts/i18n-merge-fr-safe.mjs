/**
 * Merge missing translation keys into fr.json:
 * 1) Prefer French strings extracted from single-line t("key", "default") calls in src.
 * 2) Else copy English from en.json (explicit fallback; reviewer can translate FR later).
 *
 * Does NOT corrupt JSON with multiline captures.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

function flatten2(obj, prefix = "", out = {}) {
  if (obj !== null && typeof obj === "object" && !Array.isArray(obj)) {
    for (const k of Object.keys(obj)) {
      const p = prefix ? `${prefix}.${k}` : k;
      flatten2(obj[k], p, out);
    }
  } else out[prefix] = obj;
  return out;
}

function unflatten(flat) {
  const rootObj = {};
  for (const key of Object.keys(flat).sort()) {
    const parts = key.split(".");
    let cur = rootObj;
    for (let i = 0; i < parts.length - 1; i++) {
      cur[parts[i]] ??= {};
      cur = cur[parts[i]];
    }
    cur[parts[parts.length - 1]] = flat[key];
  }
  return rootObj;
}

/** Single-line only: t("a.b", "default") or t('a.b', 'default') */
function extractDefaultsFromLine(line) {
  const out = [];
  const reDouble = /\bt\(\s*"([^"]+)"\s*,\s*"([^"]*)"\s*\)/g;
  const reSingle = /\bt\(\s*'([^']+)'\s*,\s*'([^']*)'\s*\)/g;
  let m;
  while ((m = reDouble.exec(line))) out.push([m[1], m[2]]);
  while ((m = reSingle.exec(line))) out.push([m[1], m[2]]);
  return out;
}

const defaultMap = new Map();
function walkDir(dir, cb) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) {
      if (name !== "node_modules") walkDir(p, cb);
    } else cb(p);
  }
}

walkDir(path.join(root, "src"), (file) => {
  if (!/\.(tsx|ts)$/.test(file) || file.includes(".test.")) return;
  const lines = fs.readFileSync(file, "utf8").split(/\r?\n/);
  for (const line of lines) {
    for (const [k, v] of extractDefaultsFromLine(line)) {
      if (!defaultMap.has(k)) defaultMap.set(k, v);
    }
  }
});

const frPath = path.join(root, "src/i18n/fr.json");
const en = JSON.parse(fs.readFileSync(path.join(root, "src/i18n/en.json"), "utf8"));
const fr = JSON.parse(fs.readFileSync(frPath, "utf8"));
const frFlat = flatten2(fr);
const enFlat = flatten2(en);

let fromDefault = 0;
let fromEn = 0;
for (const k of Object.keys(enFlat)) {
  if (frFlat[k] !== undefined) continue;
  if (defaultMap.has(k)) {
    frFlat[k] = defaultMap.get(k);
    fromDefault++;
  } else {
    frFlat[k] = enFlat[k];
    fromEn++;
  }
}

fs.writeFileSync(frPath, JSON.stringify(unflatten(frFlat), null, 2) + "\n", "utf8");
console.log(
  JSON.stringify({
    addedFromCodeDefaultsFr: fromDefault,
    addedFromEnFallback: fromEn,
    totalAdded: fromDefault + fromEn,
  }),
);
