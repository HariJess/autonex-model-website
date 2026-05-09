/**
 * Cache disque hash-based pour l'extraction LLM.
 * Clé = sha256(text trimé) tronqué à 16 hex chars.
 *
 * Sémantique :
 *   - getFromCache → undefined  : rien en cache pour ce texte
 *   - getFromCache → null       : LLM a déjà été interrogé et a renvoyé null
 *                                  (tool_use absent, post non-véhicule, etc.) — ne PAS rappeler
 *   - getFromCache → ExtractedVehicle : extraction valide en cache
 *
 * Le cache est sérialisé en JSON pretty pour faciliter inspection / diff.
 */

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

import type { ExtractedVehicle } from "./llm-extract";

type CacheEntry = {
  textHash: string;
  extracted: ExtractedVehicle | null;
  cachedAt: string;
};
type Cache = Record<string, CacheEntry>;

const DEFAULT_CACHE_PATH = "scripts/data/output/llm_cache.json";

let cachePath = DEFAULT_CACHE_PATH;
let cache: Cache | null = null;

/**
 * Permet aux tests d'écrire dans un fichier temporaire au lieu du chemin
 * par défaut. Réinitialise le cache mémoire.
 */
export function setCachePath(path: string): void {
  cachePath = path;
  cache = null;
}

export function getCachePath(): string {
  return cachePath;
}

/**
 * Réinitialise le cache mémoire (tests uniquement). Ne touche pas au disque.
 */
export function __resetCacheForTests(): void {
  cache = null;
  cachePath = DEFAULT_CACHE_PATH;
}

function hashText(text: string): string {
  return createHash("sha256").update(text.trim()).digest("hex").slice(0, 16);
}

function loadCache(): Cache {
  if (cache) return cache;
  if (!existsSync(cachePath)) {
    cache = {};
    return cache;
  }
  try {
    cache = JSON.parse(readFileSync(cachePath, "utf-8")) as Cache;
  } catch {
    // Cache corrompu → on repart de zéro plutôt que crasher le batch.
    cache = {};
  }
  return cache;
}

export function getFromCache(text: string): ExtractedVehicle | null | undefined {
  const c = loadCache();
  return c[hashText(text)]?.extracted;
}

export function setInCache(text: string, extracted: ExtractedVehicle | null): void {
  const c = loadCache();
  const hash = hashText(text);
  c[hash] = { textHash: hash, extracted, cachedAt: new Date().toISOString() };
}

export function persistCache(): void {
  if (!cache) return;
  mkdirSync(dirname(cachePath), { recursive: true });
  writeFileSync(cachePath, JSON.stringify(cache, null, 2), "utf-8");
}

export function cacheSize(): number {
  return Object.keys(loadCache()).length;
}
