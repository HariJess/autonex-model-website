import { beforeEach, describe, expect, it } from "vitest";
import { getOrCreateSessionId } from "@/lib/sessionId";

describe("getOrCreateSessionId", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it("returns the same id on repeated calls in the same session", () => {
    const a = getOrCreateSessionId();
    const b = getOrCreateSessionId();
    expect(a).toBe(b);
    expect(a.length).toBeGreaterThanOrEqual(8);
  });

  it("persists the id in sessionStorage under the expected key", () => {
    const id = getOrCreateSessionId();
    expect(sessionStorage.getItem("autonex.session.id")).toBe(id);
  });

  it("regenerates a fresh id if sessionStorage is cleared between calls", () => {
    const a = getOrCreateSessionId();
    sessionStorage.clear();
    const b = getOrCreateSessionId();
    expect(a).not.toBe(b);
  });
});
