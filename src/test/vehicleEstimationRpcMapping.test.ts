import { describe, expect, it } from "vitest";
import { mapEstimationRpcError } from "@/lib/estimation/repository";

describe("mapEstimationRpcError", () => {
  it("maps estimation request missing", () => {
    expect(
      mapEstimationRpcError('error: ESTIMATION_REQUEST_NOT_FOUND'),
    ).toBe("ESTIMATION_REQUEST_NOT_FOUND");
  });

  it("maps cross-user write denial", () => {
    expect(mapEstimationRpcError("ESTIMATION_WRITE_FORBIDDEN")).toBe("ESTIMATION_WRITE_FORBIDDEN");
  });

  it("maps duplicate result attempts", () => {
    expect(mapEstimationRpcError("... ESTIMATION_RESULT_ALREADY_EXISTS ...")).toBe(
      "ESTIMATION_RESULT_ALREADY_EXISTS",
    );
  });

  it("maps invalid telemetry event types", () => {
    expect(mapEstimationRpcError('ESTIMATION_EVENT_TYPE_INVALID')).toBe(
      "ESTIMATION_EVENT_TYPE_INVALID",
    );
  });

  it("returns unknown for unrelated messages", () => {
    expect(mapEstimationRpcError("network failure")).toBe("unknown");
  });
});
