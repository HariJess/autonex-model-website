import { describe, expect, it } from "vitest";
import {
  describeEstimationErrorForUi,
  EstimationAppError,
  mapEstimationRpcError,
} from "@/lib/estimation/errors";

describe("mapEstimationRpcError", () => {
  it("maps estimation request missing", () => {
    expect(mapEstimationRpcError("error: ESTIMATION_REQUEST_NOT_FOUND")).toBe("ESTIMATION_REQUEST_NOT_FOUND");
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
    expect(mapEstimationRpcError("ESTIMATION_EVENT_TYPE_INVALID")).toBe("ESTIMATION_EVENT_TYPE_INVALID");
  });

  it("returns unknown for unrelated messages", () => {
    expect(mapEstimationRpcError("network failure")).toBe("unknown");
  });
});

describe("describeEstimationErrorForUi", () => {
  it("surfaces forbidden RPC as a stable French message", () => {
    const msg = describeEstimationErrorForUi(
      new EstimationAppError("ESTIMATION_WRITE_FORBIDDEN", "record_result", "rpc_forbidden", undefined, "ESTIMATION_WRITE_FORBIDDEN"),
    );
    expect(msg).toContain("accès refusé");
  });

  it("falls back for generic Error", () => {
    const msg = describeEstimationErrorForUi(new Error("oops"));
    expect(msg).toMatch(/oops/);
    expect(msg.toLowerCase()).toMatch(/réessayez/);
  });
});
