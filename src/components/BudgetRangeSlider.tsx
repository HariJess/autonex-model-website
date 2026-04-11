import { useState, useEffect } from "react";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const EXCHANGE_RATE = 5050;

const RANGES: Record<string, { max: number; step: number }> = {
  vente: { max: 5_000_000_000, step: 10_000_000 },
  location: { max: 10_000_000, step: 100_000 },
  location_vacances: { max: 1_000_000, step: 10_000 },
};

const PRESETS_MGA: Record<string, { label: string; min: number; max: number }[]> = {
  vente: [
    { label: "< 50M", min: 0, max: 50_000_000 },
    { label: "50-150M", min: 50_000_000, max: 150_000_000 },
    { label: "150-300M", min: 150_000_000, max: 300_000_000 },
    { label: "300-500M", min: 300_000_000, max: 500_000_000 },
    { label: "500M+", min: 500_000_000, max: 5_000_000_000 },
  ],
  location: [
    { label: "< 300k", min: 0, max: 300_000 },
    { label: "300-600k", min: 300_000, max: 600_000 },
    { label: "600k-1M", min: 600_000, max: 1_000_000 },
    { label: "1-2M", min: 1_000_000, max: 2_000_000 },
    { label: "2M+", min: 2_000_000, max: 10_000_000 },
  ],
  location_vacances: [
    { label: "< 100k", min: 0, max: 100_000 },
    { label: "100-200k", min: 100_000, max: 200_000 },
    { label: "200-500k", min: 200_000, max: 500_000 },
    { label: "500k+", min: 500_000, max: 1_000_000 },
  ],
};

const PRESETS_EUR: Record<string, { label: string; min: number; max: number }[]> = {
  vente: [
    { label: "< 10k€", min: 0, max: 50_500_000 },
    { label: "10-30k€", min: 50_500_000, max: 151_500_000 },
    { label: "30-60k€", min: 151_500_000, max: 303_000_000 },
    { label: "60-100k€", min: 303_000_000, max: 505_000_000 },
    { label: "100k€+", min: 505_000_000, max: 5_000_000_000 },
  ],
  location: [
    { label: "< 60€", min: 0, max: 303_000 },
    { label: "60-120€", min: 303_000, max: 606_000 },
    { label: "120-200€", min: 606_000, max: 1_010_000 },
    { label: "200-400€", min: 1_010_000, max: 2_020_000 },
    { label: "400€+", min: 2_020_000, max: 10_000_000 },
  ],
  location_vacances: [
    { label: "< 20€", min: 0, max: 101_000 },
    { label: "20-40€", min: 101_000, max: 202_000 },
    { label: "40-100€", min: 202_000, max: 505_000 },
    { label: "100€+", min: 505_000, max: 1_000_000 },
  ],
};

const formatNum = (n: number): string =>
  new Intl.NumberFormat("fr-FR").format(n);

const parseInput = (s: string): number =>
  Number(s.replace(/\s/g, "").replace(/,/g, "")) || 0;

interface BudgetRangeSliderProps {
  transaction: string;
  minValue: number;
  maxValue: number;
  onMinChange: (v: number) => void;
  onMaxChange: (v: number) => void;
  onClose?: () => void;
}

const BudgetRangeSlider = ({
  transaction,
  minValue,
  maxValue,
  onMinChange,
  onMaxChange,
  onClose,
}: BudgetRangeSliderProps) => {
  const [displayCurrency, setDisplayCurrency] = useState<"MGA" | "EUR">("MGA");

  const txKey = transaction && RANGES[transaction] ? transaction : "vente";
  const range = RANGES[txKey];
  const presets = displayCurrency === "MGA" ? (PRESETS_MGA[txKey] || PRESETS_MGA.vente) : (PRESETS_EUR[txKey] || PRESETS_EUR.vente);

  // Internal values are always MGA
  const sliderMin = Math.max(0, Math.min(minValue, range.max));
  const sliderMax = maxValue > 0 ? Math.min(maxValue, range.max) : range.max;

  const handleSliderChange = (values: number[]) => {
    onMinChange(values[0]);
    onMaxChange(values[1] >= range.max ? 0 : values[1]);
  };

  // Display values in selected currency
  const toDisplay = (mga: number) =>
    displayCurrency === "EUR" ? Math.round(mga / EXCHANGE_RATE) : mga;

  const fromDisplay = (val: number) =>
    displayCurrency === "EUR" ? val * EXCHANGE_RATE : val;

  const suffix = displayCurrency === "MGA" ? " Ar" : " €";

  const displayMin = toDisplay(minValue);
  const displayMax = maxValue > 0 ? toDisplay(maxValue) : 0;

  const handleReset = () => {
    onMinChange(0);
    onMaxChange(0);
  };

  return (
    <div className="space-y-4 w-full">
      <div className="flex items-center justify-between">
        <span className="font-serif font-semibold text-sm">Budget</span>
        <div className="flex items-center border border-border rounded-lg overflow-hidden">
          <button
            className={`px-3 py-1 text-xs font-sans font-medium transition-colors ${
              displayCurrency === "MGA" ? "gradient-primary text-white" : "hover:bg-muted"
            }`}
            onClick={() => setDisplayCurrency("MGA")}
          >
            MGA
          </button>
          <button
            className={`px-3 py-1 text-xs font-sans font-medium transition-colors ${
              displayCurrency === "EUR" ? "gradient-primary text-white" : "hover:bg-muted"
            }`}
            onClick={() => setDisplayCurrency("EUR")}
          >
            EUR
          </button>
        </div>
      </div>

      <Slider
        min={0}
        max={range.max}
        step={range.step}
        value={[sliderMin, sliderMax]}
        onValueChange={handleSliderChange}
        minStepsBetweenThumbs={1}
        className="w-full"
      />

      <div className="flex gap-2">
        <div className="flex-1">
          <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-sans mb-1 block">
            Min
          </label>
          <Input
            type="text"
            value={displayMin > 0 ? formatNum(displayMin) : ""}
            onChange={(e) => onMinChange(fromDisplay(parseInput(e.target.value)))}
            placeholder={`0${suffix}`}
            className="font-sans text-sm"
          />
        </div>
        <div className="flex-1">
          <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-sans mb-1 block">
            Max
          </label>
          <Input
            type="text"
            value={displayMax > 0 ? formatNum(displayMax) : ""}
            onChange={(e) => {
              const v = parseInput(e.target.value);
              onMaxChange(v > 0 ? fromDisplay(v) : 0);
            }}
            placeholder="Sans limite"
            className="font-sans text-sm"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {presets.map((p) => (
          <Button
            key={p.label}
            variant="outline"
            size="sm"
            className={`text-xs font-sans h-7 px-2.5 ${
              minValue === p.min && maxValue === p.max
                ? "border-primary bg-primary/10 text-primary"
                : ""
            }`}
            onClick={() => {
              onMinChange(p.min);
              onMaxChange(p.max);
            }}
          >
            {p.label}
          </Button>
        ))}
      </div>

      <div className="flex gap-2 pt-1">
        <Button
          variant="ghost"
          size="sm"
          className="flex-1 font-sans text-xs text-muted-foreground"
          onClick={handleReset}
        >
          Réinitialiser
        </Button>
        <Button
          size="sm"
          className="flex-1 gradient-primary border-0 font-sans text-xs text-white"
          onClick={onClose}
        >
          Appliquer
        </Button>
      </div>
    </div>
  );
};

export default BudgetRangeSlider;

export const formatBudgetLabel = (minValue: number, maxValue: number, currency: "MGA" | "EUR" = "MGA"): string => {
  if (!minValue && !maxValue) return "";
  const rate = currency === "EUR" ? EXCHANGE_RATE : 1;
  const suffix = currency === "MGA" ? " Ar" : " €";

  const compact = (n: number) => {
    const v = Math.round(n / rate);
    if (currency === "EUR") {
      if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M€`;
      if (v >= 1_000) return `${Math.round(v / 1_000)}k€`;
      return `${v}€`;
    }
    if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(1)} Md`;
    if (v >= 1_000_000) return `${Math.round(v / 1_000_000)} M`;
    if (v >= 1_000) return `${Math.round(v / 1_000)}k`;
    return `${v}`;
  };

  if (minValue && !maxValue) return `À partir de ${compact(minValue)}${suffix}`;
  if (!minValue && maxValue) return `Jusqu'à ${compact(maxValue)}${suffix}`;
  return `${compact(minValue)} - ${compact(maxValue)}${suffix}`;
};
