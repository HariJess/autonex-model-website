import { describe, expect, it, vi, beforeEach } from "vitest";
import type { EstimationInput, EstimationOutputV2 } from "@/types/estimation";
import { EstimationAppError } from "@/lib/estimation/errors";
import { runVehicleEstimation } from "@/lib/estimation/api";
import * as repo from "@/lib/estimation/repository";
import * as engine from "@/lib/estimation/engine";

vi.mock("@/lib/estimation/repository", () => ({
  createVehicleEstimationRequest: vi.fn(),
  recordVehicleEstimationResult: vi.fn(),
  recordVehicleEstimationEvent: vi.fn(),
}));

vi.mock("@/lib/estimation/engine", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/estimation/engine")>();
  return {
    ...actual,
    computeVehicleEstimationV2: vi.fn(),
  };
});

const INPUT: EstimationInput = {
  makeName: "Toyota",
  modelName: "Corolla",
  year: 2020,
  city: "Antananarivo",
  mileage: 70_000,
  fuelType: "diesel",
  transmissionType: "manual",
  bodyType: "sedan",
  conditionLabel: "good",
  accidentDeclared: false,
  maintenanceLevel: "partial",
  ownerCountLabel: "2",
  usageType: "personal",
};

/** Minimal tree so `buildEstimationAuditSnapshot` + `toLegacyEstimationFromV2` paths succeed. */
const OUTPUT_V2 = {
  tierDecision: {
    tier: "B_MODERATE_MARKET",
    tierReasonCode: "MODERATE_COMPARABLE_SET",
    tierReasonSummary: "Moderate",
  },
  modeGovernance: {
    pricingMode: "partially_market_backed",
    claimMode: "ALLOW_LIMITED_MARKET_CLAIM",
    precisionMode: "medium",
    rangeWidthMode: "standard",
  },
  evidence: {
    comparableCountCandidate: 18,
    comparableCountAfterQualityFilter: 8,
    comparableCountUsed: 5,
    comparableCountStrong: 3,
    comparableSimilarityAvg: 62,
    comparableSimilarityMedian: 60,
    comparableRecencyScore: 68,
    comparableDispersionScore: 63,
    comparableLocationStrength: "mixed",
    canonicalModelCertainty: 79,
    referenceProfileUsed: true,
    referenceProfileStrength: 75,
    fallbackUsed: false,
    fallbackType: null,
  },
  anchors: {
    comparableMarketAnchor: 50_000_000,
    referenceAnchor: 49_500_000,
    heuristicAnchor: null,
    finalBaseAnchor: 50_200_000,
    adjustedMarketEstimate: 52_000_000,
    anchorBlendMode: "comparables_plus_reference",
  },
  adjustments: {
    mileageAdjustment: { factor: 1, deltaPct: 0, bounded: true },
    conditionAdjustment: { factor: 1, deltaPct: 0, bounded: true },
    maintenanceAdjustment: { factor: 1, deltaPct: 0, bounded: true },
    accidentAdjustment: { factor: 1, deltaPct: 0, bounded: true },
    ownershipAdjustment: { factor: 1, deltaPct: 0, bounded: true },
    usageAdjustment: { factor: 1, deltaPct: 0, bounded: true },
    totalAdjustmentFactor: 1,
    totalDeltaPct: 0,
    adjustmentCapApplied: false,
  },
  confidence: {
    confidenceScore: 74,
    confidenceBand: "medium",
    confidenceCeiling: 82,
    confidenceBeforeCeiling: 76,
    confidenceCapped: true,
    drivers: [],
    explanationMode: "summary_only",
  },
  values: {
    estimatedValue: 52_000_000,
    lowEstimate: 49_000_000,
    highEstimate: 55_000_000,
    quickSalePrice: 50_000_000,
    recommendedListingPrice: 53_000_000,
    roundingStepApplied: 250_000,
  },
  comparables: [],
  insights: {
    pricingFactorsPositive: [],
    pricingFactorsNegative: [],
    evidenceNotes: [],
    disclaimers: [],
  },
  uiGovernance: {
    allowedMarketClaim: false,
    mustShowIndicativeLabel: false,
    shouldDeEmphasizePrecision: false,
    shouldHideExactConfidenceScore: false,
    allowedRangeTightness: "standard",
    recommendedPrimaryCTAStyle: "normal",
    requiredBadges: [],
  },
} satisfies EstimationOutputV2;

describe("runVehicleEstimation", () => {
  beforeEach(() => {
    vi.mocked(repo.createVehicleEstimationRequest).mockReset();
    vi.mocked(repo.recordVehicleEstimationResult).mockReset();
    vi.mocked(repo.recordVehicleEstimationEvent).mockReset();
    vi.mocked(engine.computeVehicleEstimationV2).mockReset();

    vi.mocked(repo.createVehicleEstimationRequest).mockResolvedValue({
      requestId: "req-flow-1",
      submissionSecret: "00000000-0000-4000-8000-000000000099",
    });
    vi.mocked(repo.recordVehicleEstimationResult).mockResolvedValue("res-flow-1");
    vi.mocked(repo.recordVehicleEstimationEvent).mockResolvedValue(undefined);
    vi.mocked(engine.computeVehicleEstimationV2).mockResolvedValue(OUTPUT_V2);
  });

  it("runs create → telemetry → compute → record result → telemetry and returns payload", async () => {
    const out = await runVehicleEstimation(INPUT, null);

    expect(out.requestId).toBe("req-flow-1");
    expect(out.resultId).toBe("res-flow-1");
    expect(out.submissionSecret).toBe("00000000-0000-4000-8000-000000000099");

    expect(repo.createVehicleEstimationRequest).toHaveBeenCalledTimes(1);
    expect(engine.computeVehicleEstimationV2).toHaveBeenCalledWith(INPUT);
    expect(repo.recordVehicleEstimationResult).toHaveBeenCalledTimes(1);

    expect(repo.recordVehicleEstimationEvent).toHaveBeenCalled();
    const eventCalls = vi.mocked(repo.recordVehicleEstimationEvent).mock.calls;
    expect(eventCalls.some((c) => c[2] === "estimation_started")).toBe(true);
    expect(eventCalls.some((c) => c[2] === "estimation_completed")).toBe(true);
  });

  it("propagates failure when request creation fails", async () => {
    vi.mocked(repo.createVehicleEstimationRequest).mockRejectedValueOnce(
      EstimationAppError.fromSupabaseLike({ message: "fail" }, "create_request"),
    );

    await expect(runVehicleEstimation(INPUT, null)).rejects.toThrow(EstimationAppError);
    expect(repo.recordVehicleEstimationResult).not.toHaveBeenCalled();
  });

  it("propagates failure when recording result fails", async () => {
    vi.mocked(repo.recordVehicleEstimationResult).mockRejectedValueOnce(
      EstimationAppError.fromSupabaseLike({ message: "ESTIMATION_WRITE_FORBIDDEN" }, "record_result"),
    );

    await expect(runVehicleEstimation(INPUT, null)).rejects.toThrow(EstimationAppError);
  });

  it("still completes when telemetry RPC fails (non-blocking)", async () => {
    vi.mocked(repo.recordVehicleEstimationEvent)
      .mockRejectedValueOnce(new Error("telemetry down"))
      .mockResolvedValue(undefined);

    await expect(runVehicleEstimation(INPUT, null)).resolves.toMatchObject({
      requestId: "req-flow-1",
      resultId: "res-flow-1",
    });

    expect(repo.recordVehicleEstimationResult).toHaveBeenCalledTimes(1);
  });

  it("does not record result twice when guarded by successful first run", async () => {
    await runVehicleEstimation(INPUT, null);
    expect(repo.recordVehicleEstimationResult).toHaveBeenCalledTimes(1);
  });
});
