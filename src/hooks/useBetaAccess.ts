import { useCallback, useEffect, useState } from "react";

const COOKIE_NAME = "autonex_beta_access";
const COOKIE_MAX_AGE_SECONDS = 30 * 24 * 3600; // 30 days

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const target = `${name}=`;
  for (const part of document.cookie.split(";")) {
    const trimmed = part.trim();
    if (trimmed.startsWith(target)) return trimmed.slice(target.length);
  }
  return null;
}

function writeCookie(name: string, value: string, maxAgeSec: number): void {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=${value}; max-age=${maxAgeSec}; path=/; samesite=lax`;
}

function deleteCookie(name: string): void {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=; max-age=0; path=/; samesite=lax`;
}

/**
 * Beta lock client-side gate. Reads VITE_BETA_LOCK_ENABLED to decide
 * whether the gate is active and VITE_BETA_ACCESS_CODE for the secret
 * to compare against on unlock(). Cookie persists 30 days.
 *
 * Default: lock enabled when env var is missing (safer fallback).
 */
export function useBetaAccess() {
  const isLockEnabled =
    (import.meta.env.VITE_BETA_LOCK_ENABLED ?? "true").toString().toLowerCase() !== "false";

  const [isUnlocked, setIsUnlocked] = useState<boolean>(() => {
    if (!isLockEnabled) return true;
    return readCookie(COOKIE_NAME) === "unlocked";
  });

  useEffect(() => {
    if (!isLockEnabled) {
      setIsUnlocked(true);
      return;
    }
    setIsUnlocked(readCookie(COOKIE_NAME) === "unlocked");
  }, [isLockEnabled]);

  const unlock = useCallback(
    (candidate: string): boolean => {
      const expected = (import.meta.env.VITE_BETA_ACCESS_CODE ?? "").toString();
      if (import.meta.env.DEV) {
        console.log("[beta-access] unlock attempt", {
          isLockEnabled,
          hasExpected: expected.length > 0,
        });
      }
      if (expected.length === 0) return false;
      if (candidate.trim() !== expected) return false;
      writeCookie(COOKIE_NAME, "unlocked", COOKIE_MAX_AGE_SECONDS);
      setIsUnlocked(true);
      return true;
    },
    [isLockEnabled],
  );

  const lock = useCallback(() => {
    deleteCookie(COOKIE_NAME);
    setIsUnlocked(false);
  }, []);

  return { isUnlocked, unlock, lock, isLockEnabled };
}
