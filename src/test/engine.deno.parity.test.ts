/**
 * PROMPT 10E — Parité TS ↔ Deno pour modelProximity et sanityBounds.
 *
 * Les deux fichiers (TS bundle client + Deno Edge) doivent être strictement
 * identiques (à l'exception du commentaire d'en-tête mentionnant la parité).
 * Toute divergence ici signifie qu'une modification a été appliquée d'un
 * seul côté → risque de comportement engine V2 différent entre client
 * (heuristique non-bloquante) et Edge (réponse autoritaire).
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function load(path: string): string {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

/**
 * Normalise les deux fichiers pour comparaison :
 *   - Strip les commentaires d'en-tête /** ... *\/  spécifiques au mirroring
 *   - Trim les blancs en bord de ligne
 */
function normalizeForParity(content: string): string {
  // Strip le tout premier bloc de commentaire JSDoc (/** ... */) qui contient
  // la mention "PARITÉ STRICTE" différente entre les 2 fichiers.
  const trimmed = content.trimStart();
  const firstCommentEnd = trimmed.indexOf("*/");
  const afterFirstComment =
    trimmed.startsWith("/**") && firstCommentEnd > -1
      ? trimmed.slice(firstCommentEnd + 2).trimStart()
      : trimmed;
  return afterFirstComment.replace(/[ \t]+$/gm, "").trimEnd();
}

describe("PROMPT 10E — Parité TS ↔ Deno", () => {
  it("modelProximity.ts : TS et Deno strictement identiques (hors header)", () => {
    const ts = load("src/lib/estimation/modelProximity.ts");
    const deno = load("supabase/functions/compute-estimation/modelProximity.ts");
    expect(normalizeForParity(deno)).toBe(normalizeForParity(ts));
  });

  it("sanityBounds.ts : TS et Deno strictement identiques (hors header)", () => {
    const ts = load("src/lib/estimation/sanityBounds.ts");
    const deno = load("supabase/functions/compute-estimation/sanityBounds.ts");
    expect(normalizeForParity(deno)).toBe(normalizeForParity(ts));
  });

  it("MODEL_PROXIMITY exporte la même structure côté TS et Deno (signature)", () => {
    const ts = load("src/lib/estimation/modelProximity.ts");
    const deno = load("supabase/functions/compute-estimation/modelProximity.ts");
    // Compte le même nombre de clés (Toyota|..., Mitsubishi|..., etc.)
    const tsKeys = (ts.match(/^\s+"[^"]+\|[^"]+":/gm) ?? []).length;
    const denoKeys = (deno.match(/^\s+"[^"]+\|[^"]+":/gm) ?? []).length;
    expect(tsKeys).toBe(denoKeys);
    expect(tsKeys).toBeGreaterThan(10);
  });

  it("SANITY_BOUNDS exporte le même nombre de segments côté TS et Deno", () => {
    const ts = load("src/lib/estimation/sanityBounds.ts");
    const deno = load("supabase/functions/compute-estimation/sanityBounds.ts");
    const tsSegments = (ts.match(/segmentKey:\s+"/g) ?? []).length;
    const denoSegments = (deno.match(/segmentKey:\s+"/g) ?? []).length;
    expect(tsSegments).toBe(denoSegments);
    expect(tsSegments).toBeGreaterThan(5);
  });
});
