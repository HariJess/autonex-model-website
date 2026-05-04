import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useBumpCooldown } from "@/hooks/boosts/useBumpCooldown";

/**
 * PROMPT 6 — Hook useBumpCooldown : 24h cooldown post-bump.
 * - lastBumpedAt = null      → isOnCooldown false
 * - lastBumpedAt = now - 1h  → isOnCooldown true, ~23h restantes
 * - lastBumpedAt = now - 25h → isOnCooldown false
 */

describe("useBumpCooldown (PROMPT 6)", () => {
  const FIXED_NOW = new Date("2026-05-06T12:00:00Z").getTime();

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(FIXED_NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("lastBumpedAt = null → isOnCooldown false, remainingMs = 0", () => {
    const { result } = renderHook(() => useBumpCooldown(null));
    expect(result.current.isOnCooldown).toBe(false);
    expect(result.current.remainingMs).toBe(0);
    expect(result.current.nextAvailableAt).toBeNull();
    expect(result.current.formatted).toBe("—");
  });

  it("lastBumpedAt = now - 1h → isOnCooldown true, ~23h restantes", () => {
    const oneHourAgo = new Date(FIXED_NOW - 60 * 60 * 1000).toISOString();
    const { result } = renderHook(() => useBumpCooldown(oneHourAgo));
    expect(result.current.isOnCooldown).toBe(true);
    // ~23h en ms (allow ±1min tolerance)
    expect(result.current.remainingMs).toBeGreaterThan(22.9 * 60 * 60 * 1000);
    expect(result.current.remainingMs).toBeLessThanOrEqual(23 * 60 * 60 * 1000);
    expect(result.current.nextAvailableAt).toBeInstanceOf(Date);
    expect(result.current.formatted).toMatch(/\d+h/);
  });

  it("lastBumpedAt = now - 25h → cooldown expiré (>24h)", () => {
    const twentyFiveHoursAgo = new Date(FIXED_NOW - 25 * 60 * 60 * 1000).toISOString();
    const { result } = renderHook(() => useBumpCooldown(twentyFiveHoursAgo));
    expect(result.current.isOnCooldown).toBe(false);
    expect(result.current.remainingMs).toBe(0);
  });

  it("lastBumpedAt invalide (chaîne non-date) → isOnCooldown false", () => {
    const { result } = renderHook(() => useBumpCooldown("not-a-date"));
    expect(result.current.isOnCooldown).toBe(false);
    expect(result.current.remainingMs).toBe(0);
  });

  it("après 30s, le tick recompute le remainingMs", () => {
    const oneHourAgo = new Date(FIXED_NOW - 60 * 60 * 1000).toISOString();
    const { result } = renderHook(() => useBumpCooldown(oneHourAgo));
    const initial = result.current.remainingMs;

    act(() => {
      vi.setSystemTime(FIXED_NOW + 30_000);
      vi.advanceTimersByTime(30_000);
    });

    expect(result.current.remainingMs).toBeLessThan(initial);
    expect(result.current.remainingMs).toBeGreaterThan(0);
  });
});
