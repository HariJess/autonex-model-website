import { useEffect, useMemo, useState } from "react";
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
 */

const STORAGE_KEY = "autonex.yas.context";
const PLATFORMS = ["android", "ios"] as const;
type Platform = (typeof PLATFORMS)[number];

export type YasContext = {
  isEmbedded: boolean;
  source: string | null;
  platform: Platform | null;
  entryPoint: string | null;
  sessionId: string;
};

type StoredYasContext = Omit<YasContext, "sessionId">;

const EMPTY: StoredYasContext = {
  isEmbedded: false,
  source: null,
  platform: null,
  entryPoint: null,
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
  };
}

export function useYasContext(): YasContext {
  const location = useLocation();
  const [stored, setStored] = useState<StoredYasContext>(() => readStored());

  useEffect(() => {
    const fromQuery = parseFromQuery(location.search);
    if (!fromQuery) return;
    // Merge : ne pas perdre platform/entryPoint si l'URL courante ne les
    // contient plus mais la session les a déjà capturés.
    const merged: StoredYasContext = {
      isEmbedded: true,
      source: fromQuery.source ?? stored.source,
      platform: fromQuery.platform ?? stored.platform,
      entryPoint: fromQuery.entryPoint ?? stored.entryPoint,
    };
    writeStored(merged);
    setStored(merged);
  }, [location.search, stored.entryPoint, stored.platform, stored.source]);

  const sessionId = useMemo(() => getOrCreateSessionId(), []);

  return {
    isEmbedded: stored.isEmbedded,
    source: stored.source,
    platform: stored.platform,
    entryPoint: stored.entryPoint,
    sessionId,
  };
}

/**
 * Lecture *non-réactive* du contexte YAS depuis sessionStorage.
 * Utile dans les composants partagés (Header/Footer/CookieConsentBanner) où
 * on ne veut pas dépendre de useLocation (évite ré-renders parasites).
 */
export function readYasContextFromStorage(): YasContext {
  const stored = readStored();
  return {
    ...stored,
    sessionId: getOrCreateSessionId(),
  };
}
