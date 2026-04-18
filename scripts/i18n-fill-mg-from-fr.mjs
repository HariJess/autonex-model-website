/**
 * Ensure mg.json contains every key from fr.json; missing keys use FR string as placeholder.
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

const fr = JSON.parse(fs.readFileSync(path.join(root, "src/i18n/fr.json"), "utf8"));
const mgPath = path.join(root, "src/i18n/mg.json");
const mg = JSON.parse(fs.readFileSync(mgPath, "utf8"));
const frFlat = flatten2(fr);
const mgFlat = flatten2(mg);

let added = 0;
for (const k of Object.keys(frFlat)) {
  if (mgFlat[k] !== undefined) continue;
  mgFlat[k] = frFlat[k];
  added++;
}

fs.writeFileSync(mgPath, JSON.stringify(unflatten(mgFlat), null, 2) + "\n", "utf8");
console.log("Added", added, "keys to mg.json from fr.json");
