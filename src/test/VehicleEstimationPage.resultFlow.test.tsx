import { describe, expect, it, vi, beforeEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import VehicleEstimationPage from "@/pages/VehicleEstimationPage";
import type { EstimationRunResult } from "@/types/estimation";

const runVehicleEstimationMock = vi.fn();

vi.mock("@/components/Header", () => ({ default: () => <div>Header</div> }));
vi.mock("@/components/Footer", () => ({ default: () => <div>Footer</div> }));
vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: null }),
}));
vi.mock("@/lib/estimation/repository", () => ({
  insertEstimationEvent: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@/lib/estimation/vehicleCatalog", () => ({
  loadVehicleCatalog: vi.fn().mockResolvedValue({
    source: "ui-curated",
    entries: [
      { make: "Toyota", models: ["Corolla", "Yaris"] },
      { make: "Nissan", models: ["X-Trail"] },
    ],
  }),
}));
vi.mock("@/lib/estimation/api", () => ({
  runVehicleEstimation: (...args: unknown[]) => runVehicleEstimationMock(...args),
}));
vi.mock("@/components/estimation/VehicleCatalogCombobox", () => ({
  default: ({
    value,
    options,
    onSelect,
    placeholder,
    disabled,
  }: {
    value: string;
    options: string[];
    onSelect: (value: string) => void;
    placeholder?: string;
    disabled?: boolean;
  }) => (
    <select
      data-testid={placeholder ?? "combobox"}
      disabled={disabled}
      value={value}
      onChange={(e) => onSelect(e.target.value)}
    >
      <option value="">--</option>
      {options.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  ),
}));

function makeResult(overrides?: Partial<EstimationRunResult["outputV2"]>): EstimationRunResult {
  return {
    requestId: "req-1",
    resultId: "res-1",
    output: {
      marketBasePrice: 50_000_000,
      adjustedPrice: 52_000_000,
      lowRangePrice: 49_000_000,
      highRangePrice: 55_000_000,
      recommendedListingPrice: 53_000_000,
      quickSalePrice: 50_000_000,
      confidenceScore: 74,
      confidenceLabel: "medium",
      positiveFactors: [],
      negativeFactors: [],
      comparables: [],
      hasComparables: false,
      usedReferenceProfile: false,
    },
    outputV2: {
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
        comparableCountCandidate: 20,
        comparableCountAfterQualityFilter: 10,
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
        disclaimers: [{ id: "d1", category: "disclaimer", code: "DISC", label: "Lecture indicative recommandée.", severity: "warning" }],
      },
      uiGovernance: {
        allowedMarketClaim: false,
        mustShowIndicativeLabel: false,
        shouldDeEmphasizePrecision: false,
        shouldHideExactConfidenceScore: false,
        allowedRangeTightness: "standard",
        recommendedPrimaryCTAStyle: "normal",
        requiredBadges: ["partially_market_backed"],
      },
      ...overrides,
    },
  };
}

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <VehicleEstimationPage />
        </MemoryRouter>
      </QueryClientProvider>
    </HelmetProvider>,
  );
}

async function completeToResult(result: EstimationRunResult) {
  runVehicleEstimationMock.mockResolvedValueOnce(result);
  renderPage();
  fireEvent.click(screen.getByText("Commencer l'estimation"));

  await waitFor(() => expect(screen.getByText("Identité du véhicule")).toBeInTheDocument());
  fireEvent.change(screen.getByTestId("Sélectionner une marque"), { target: { value: "Toyota" } });
  fireEvent.change(screen.getByTestId("Sélectionner un modèle"), { target: { value: "Corolla" } });
  fireEvent.change(screen.getByTestId("Sélectionner une ville / région"), { target: { value: "Antananarivo" } });

  fireEvent.click(screen.getByText("Continuer"));
  await waitFor(() => expect(screen.getByText("État et historique")).toBeInTheDocument());
  fireEvent.click(screen.getByText("Voir mon estimation"));
}

describe("VehicleEstimationPage result flow", () => {
  beforeEach(() => {
    runVehicleEstimationMock.mockReset();
  });

  it("renders strong framing after successful estimation", async () => {
    await completeToResult(
      makeResult({
        tierDecision: { tier: "A_STRONG_MARKET", tierReasonCode: "STRONG_COMPARABLE_SET", tierReasonSummary: "Strong" },
        modeGovernance: { pricingMode: "market_backed", claimMode: "ALLOW_STRONG_MARKET_CLAIM", precisionMode: "tight", rangeWidthMode: "tight" },
        evidence: {
          comparableCountCandidate: 30,
          comparableCountAfterQualityFilter: 18,
          comparableCountUsed: 9,
          comparableCountStrong: 7,
          comparableSimilarityAvg: 75,
          comparableSimilarityMedian: 76,
          comparableRecencyScore: 80,
          comparableDispersionScore: 78,
          comparableLocationStrength: "same_city",
          canonicalModelCertainty: 86,
          referenceProfileUsed: true,
          referenceProfileStrength: 80,
          fallbackUsed: false,
          fallbackType: null,
        },
        comparables: [{ listingId: "1", title: "Toyota Corolla", price: 52_000_000, year: 2020, mileage: 70000, city: "Antananarivo", score: 84 }],
      }),
    );

    await waitFor(() => expect(screen.getByText("Analyse marché robuste")).toBeInTheDocument());
    expect(screen.getByText(/Appui marché solide/i)).toBeInTheDocument();
    expect(screen.getByText(/Publiez maintenant avec un positionnement assumé/i)).toBeInTheDocument();
  });

  it("forces indicative and confidence de-emphasis for weak governance", async () => {
    await completeToResult(
      makeResult({
        tierDecision: { tier: "D_HEURISTIC_ONLY", tierReasonCode: "NO_RELIABLE_COMPARABLES", tierReasonSummary: "Weak" },
        modeGovernance: { pricingMode: "heuristic_only", claimMode: "INDICATIVE_HEURISTIC_CLAIM_ONLY", precisionMode: "very_coarse", rangeWidthMode: "very_wide" },
        confidence: { confidenceScore: 32, confidenceBand: "low", confidenceCeiling: 45, confidenceBeforeCeiling: 32, confidenceCapped: false, drivers: [], explanationMode: "summary_only" },
        evidence: {
          comparableCountCandidate: 6,
          comparableCountAfterQualityFilter: 2,
          comparableCountUsed: 0,
          comparableCountStrong: 0,
          comparableSimilarityAvg: 0,
          comparableSimilarityMedian: 0,
          comparableRecencyScore: 30,
          comparableDispersionScore: 0,
          comparableLocationStrength: "weak",
          canonicalModelCertainty: 60,
          referenceProfileUsed: true,
          referenceProfileStrength: 70,
          fallbackUsed: true,
          fallbackType: "generic_heuristic",
        },
        uiGovernance: {
          allowedMarketClaim: false,
          mustShowIndicativeLabel: true,
          shouldDeEmphasizePrecision: true,
          shouldHideExactConfidenceScore: true,
          allowedRangeTightness: "very_wide",
          recommendedPrimaryCTAStyle: "cautious",
          requiredBadges: ["heuristic_only"],
        },
      }),
    );

    await waitFor(() => expect(screen.getByText("Estimation indicative exploratoire")).toBeInTheDocument());
    expect(screen.getByText(/Affichage prudent/i)).toBeInTheDocument();
    expect(screen.getByText(/Appui marché faible/i)).toBeInTheDocument();
  });

  it("keeps moderate-empty support state qualified and actionable", async () => {
    await completeToResult(
      makeResult({
        tierDecision: { tier: "B_MODERATE_MARKET", tierReasonCode: "MODERATE_COMPARABLE_SET", tierReasonSummary: "Moderate" },
        modeGovernance: { pricingMode: "partially_market_backed", claimMode: "ALLOW_LIMITED_MARKET_CLAIM", precisionMode: "medium", rangeWidthMode: "standard" },
        evidence: {
          comparableCountCandidate: 18,
          comparableCountAfterQualityFilter: 8,
          comparableCountUsed: 0,
          comparableCountStrong: 0,
          comparableSimilarityAvg: 0,
          comparableSimilarityMedian: 0,
          comparableRecencyScore: 55,
          comparableDispersionScore: 0,
          comparableLocationStrength: "mixed",
          canonicalModelCertainty: 78,
          referenceProfileUsed: true,
          referenceProfileStrength: 76,
          fallbackUsed: false,
          fallbackType: null,
        },
        comparables: [],
      }),
    );

    await waitFor(() => expect(screen.getByText("Analyse marché qualifiée")).toBeInTheDocument());
    expect(screen.getByText(/Comparaison marché en consolidation/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Le rapport reste utile pour cadrer votre décision avec prudence/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Publiez avec un positionnement calibré/i)).toBeInTheDocument();
    expect(screen.queryByText(/Appui marché solide/i)).not.toBeInTheDocument();
  });
});

