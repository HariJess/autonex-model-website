import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { getOrCreateSessionId } from "@/lib/sessionId";

/**
 * Contexte de la mini-app YAS & Moi.
 *
 * - Lit les query params au mount (`source`, `embedded`, `platform`,
 *   `entry_point`).
 * - Persiste l'état "embedded" dans `sessionStorage` pour qu'il survive aux
 *   navigations internes (depuis `/yas-app` → `/recherche` → `/annonce/:id`,
 *   les query params YAS finissent par disparaître après plusieurs Links).
 * - Ré-utilise `getOrCreateSessionId()` du projet (sessionStorage UUID) pour
 *   ne pas dupliquer la logique de session.
 *
 * `isEmbedded` est vrai si `embedded=true` OU `source=yas` est détecté
 * (à n'importe quel moment de la session).
 *
 * Architecture (post-Plan 2/4) :
 * - `<YasProvider>` est monté UNE SEULE FOIS dans `App.tsx` (à l'intérieur
 *   de `<BrowserRouter>` car la logique utilise `useLocation()`).
 * - `useYasContext()` est devenu un consumer pur qui lit le Context partagé.
 * - L'API publique reste strictement identique : signature, type retour
 *   `YasContext`, et l'export `readYasContextFromStorage` restent inchangés.
 *   Aucun des 30+ imports existants ne nécessite de modification.
 */

const STORAGE_KEY = "autonex.yas.context";
const PLATFORMS = ["android", "ios"] as const;
type Platform = (typeof PLATFORMS)[number];

export type YasContext = {
  isEmbedded: boolean;
  source: string | null;
  platform: Platform | null;
  entryPoint: string | null;
  /**
   * `document.referrer` capturé au tout 1er mount du Provider, persisté en
   * sessionStorage. Permet d'observer en analytics d'où viennent vraiment les
   * requêtes YAS (vrais users WebView vs URL partagées vs bookmarks). `null`
   * si le navigateur ne l'expose pas (lien direct, restrictions Referrer-Policy).
   */
  referrer: string | null;
  sessionId: string;
};

type StoredYasContext = Omit<YasContext, "sessionId">;

const EMPTY: StoredYasContext = {
  isEmbedded: false,
  source: null,
  platform: null,
  entryPoint: null,
  referrer: null,
};

function readStored(): StoredYasContext {
  if (typeof window === "undefined" || !window.sessionStorage) return EMPTY;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as Partial<StoredYasContext>;
    return {
      isEmbedded: Boolean(parsed.isEmbedded),
      source: typeof parsed.source === "string" ? parsed.source : null,
      platform:
        parsed.platform && (PLATFORMS as readonly string[]).includes(parsed.platform)
          ? (parsed.platform as Platform)
          : null,
      entryPoint: typeof parsed.entryPoint === "string" ? parsed.entryPoint : null,
      referrer: typeof parsed.referrer === "string" ? parsed.referrer : null,
    };
  } catch {
    return EMPTY;
  }
}

function writeStored(value: StoredYasContext): void {
  if (typeof window === "undefined" || !window.sessionStorage) return;
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch {
    /* sessionStorage may throw in private mode — silent */
  }
}

function clearStored(): void {
  if (typeof window === "undefined" || !window.sessionStorage) return;
  try {
    window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* silent — same private-mode caveat */
  }
}

function parseFromQuery(search: string): StoredYasContext | null {
  if (!search) return null;
  const params = new URLSearchParams(search);
  const embeddedParam = params.get("embedded");
  const sourceParam = params.get("source");
  const platformParam = params.get("platform");
  const entryParam = params.get("entry_point");

  const hasYasSignal = embeddedParam === "true" || sourceParam === "yas";
  if (!hasYasSignal) return null;

  return {
    isEmbedded: true,
    source: sourceParam ?? "yas",
    platform:
      platformParam && (PLATFORMS as readonly string[]).includes(platformParam)
        ? (platformParam as Platform)
        : null,
    entryPoint: entryParam ?? null,
    referrer: null, // referrer capturé séparément au mount, pas via URL
  };
}

/**
 * Lit `document.referrer` une seule fois (au tout 1er mount du Provider).
 * Si jsdom ou environnement sans `document`, retourne `null`. Si le browser
 * ne l'expose pas (ex. Referrer-Policy strict), retourne aussi `null`.
 */
function readInitialReferrer(): string | null {
  if (typeof document === "undefined") return null;
  const ref = document.referrer;
  return ref && ref.length > 0 ? ref : null;
}

const YasContextInternal = createContext<YasContext | null>(null);

/**
 * Provider racine pour le contexte YAS & Moi.
 *
 * À monter UNE SEULE FOIS au niveau de `App.tsx` (entre `<BrowserRouter>` et le
 * reste de l'arbre, car la logique utilise `useLocation()`).
 *
 * Avant ce refactor (Plan 2/4 — INC #1), `useYasContext()` était un hook
 * standalone appelé 7+ fois dans l'arbre (Header, Footer, CookieConsentBanner,
 * YasBackButton, YasScrollToTop, YasWhySection, YasFeaturedDeals,
 * YasActionGrid, YasAppPage). Chaque appel créait son propre `useState +
 * useEffect + listener useLocation`. Conséquences : 7+ ré-évaluations de
 * `parseFromQuery` par navigation, risque de race conditions entre les setters
 * parallèles. Le Provider unifié résout ça avec un seul source-of-truth.
 */
export function YasProvider({ children }: { children: ReactNode }) {
  const location = useLocation();
  const [stored, setStored] = useState<StoredYasContext>(() => {
    // Au tout 1er mount, on capture document.referrer et on l'insert dans le
    // stored si pas déjà présent (sessionStorage hérite du dernier referrer
    // capturé en début de session — cf. SEC #2 du Plan 3/4).
    const initial = readStored();
    if (initial.referrer) return initial;
    const referrer = readInitialReferrer();
    if (!referrer) return initial;
    const enriched: StoredYasContext = { ...initial, referrer };
    writeStored(enriched);
    return enriched;
  });

  useEffect(() => {
    const fromQuery = parseFromQuery(location.search);
    if (fromQuery) {
      // Merge : ne pas perdre platform/entryPoint/referrer si l'URL courante
      // ne les contient plus mais la session les a déjà capturés.
      const merged: StoredYasContext = {
        isEmbedded: true,
        source: fromQuery.source ?? stored.source,
        platform: fromQuery.platform ?? stored.platform,
        entryPoint: fromQuery.entryPoint ?? stored.entryPoint,
        referrer: stored.referrer, // captured at first mount, kept across navs
      };
      writeStored(merged);
      setStored(merged);
      return;
    }
    // Atterrissage sur la home `/` SANS aucun signal YAS dans l'URL → on
    // considère que l'utilisateur sort du parcours partenaire (lien partagé,
    // bookmark, retour direct sur l'accueil normal). On purge le sessionStorage
    // pour éviter le leak (le site se comportait en mode embedded sur toutes
    // les pages tant que la session navigateur était ouverte).
    // Les pages internes YAS (`/recherche`, `/estimation`, `/login`...) gardent
    // l'embedded actif tant qu'elles sont ouvertes via un lien interne, même
    // après refresh : on ne purge QUE sur `/` sans params.
    if (location.pathname === "/" && stored.isEmbedded) {
      clearStored();
      setStored(EMPTY);
    }
  }, [
    location.pathname,
    location.search,
    stored.entryPoint,
    stored.isEmbedded,
    stored.platform,
    stored.source,
    stored.referrer,
  ]);

  const sessionId = useMemo(() => getOrCreateSessionId(), []);

  const value = useMemo<YasContext>(
    () => ({
      isEmbedded: stored.isEmbedded,
      source: stored.source,
      platform: stored.platform,
      entryPoint: stored.entryPoint,
      referrer: stored.referrer,
      sessionId,
    }),
    [stored.isEmbedded, stored.source, stored.platform, stored.entryPoint, stored.referrer, sessionId],
  );

  return <YasContextInternal.Provider value={value}>{children}</YasContextInternal.Provider>;
}

/**
 * Hook consumer du YasContext.
 *
 * DOIT être appelé à l'intérieur d'un `<YasProvider>` (monté dans `App.tsx`).
 * Throw une erreur explicite sinon, pour éviter les bugs silencieux.
 *
 * API publique strictement identique au hook standalone qui existait avant le
 * refactor INC #1 — aucun consommateur ne doit avoir besoin de modification.
 */
export function useYasContext(): YasContext {
  const ctx = useContext(YasContextInternal);
  if (!ctx) {
    throw new Error(
      "useYasContext must be used within a <YasProvider>. Check src/App.tsx.",
    );
  }
  return ctx;
}

/**
 * Lecture *non-réactive* du contexte YAS depuis sessionStorage.
 * Utile dans les composants partagés (Header/Footer/CookieConsentBanner) où
 * on ne veut pas dépendre de useLocation (évite ré-renders parasites).
 *
 * Reste exporté tel quel post-refactor : la fonction n'utilise pas le Provider
 * et peut donc être appelée n'importe où, y compris dans les composants montés
 * AVANT le Provider (ex. `BetaLockGate` qui détecte le YAS flow via storage).
 */
export function readYasContextFromStorage(): YasContext {
  const stored = readStored();
  return {
    ...stored,
    sessionId: getOrCreateSessionId(),
  };
}
