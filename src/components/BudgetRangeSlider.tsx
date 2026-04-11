import { useState, useEffect } from "react";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useCurrency } from "@/contexts/CurrencyContext";

interface BudgetRangeSliderProps {
  transaction: string;
  minValue: number;
  maxValue: number;
  onMinChange: (v: number) => void;
  onMaxChange: (v: number) => void;
}

const formatNumber = (n: number): string => {
  if (n === 0) return "0";
  return n.toLocaleString("fr-FR");
};

const parseFormattedNumber = (s: string): number => {
  return Number(s.replace(/\s/g, "").replace(/,/g, "")) || 0;
};

const PRESETS_VENTE = [
  { label: "< 50M", min: 0, max: 50_000_000 },
  { label: "50-150M", min: 50_000_000, max: 150_000_000 },
  { label: "150-300M", min: 150_000_000, max: 300_000_000 },
  { label: "300-500M", min: 300_000_000, max: 500_000_000 },
  { label: "500M+", min: 500_000_000, max: 5_000_000_000 },
];

const PRESETS_LOCATION = [
  { label: "< 500k", min: 0, max: 500_000 },
  { label: "500k-1M", min: 500_000, max: 1_000_000 },
  { label: "1-3M", min: 1_000_000, max: 3_000_000 },
  { label: "3-5M", min: 3_000_000, max: 5_000_000 },
  { label: "5M+", min: 5_000_000, max: 10_000_000 },
];

const BudgetRangeSlider = ({
  transaction,
  minValue,
  maxValue,
  onMinChange,
  onMaxChange,
}: BudgetRangeSliderProps) => {
  const { currency } = useCurrency();
  const isVente = transaction === "vente" || !transaction;
  const sliderMax = isVente ? 5_000_000_000 : 10_000_000;
  const step = isVente ? 10_000_000 : 100_000;
  const presets = isVente ? PRESETS_VENTE : PRESETS_LOCATION;

  const clampedMin = Math.min(minValue, sliderMax);
  const clampedMax = Math.min(maxValue || sliderMax, sliderMax);

  const handleSliderChange = (values: number[]) => {
    onMinChange(values[0]);
    onMaxChange(values[1]);
  };

  const suffix = currency === "MGA" ? " Ar" : " €";

  return (
    <div className="space-y-4">
      <Slider
        min={0}
        max={sliderMax}
        step={step}
        value={[clampedMin, clampedMax]}
        onValueChange={handleSliderChange}
        className="w-full"
      />
      <div className="flex gap-2">
        <div className="flex-1">
          <label className="text-xs text-muted-foreground font-sans mb-1 block">Min</label>
          <Input
            type="text"
            value={formatNumber(minValue)}
            onChange={(e) => onMinChange(parseFormattedNumber(e.target.value))}
            className="font-sans text-sm"
            placeholder="0"
          />
        </div>
        <div className="flex-1">
          <label className="text-xs text-muted-foreground font-sans mb-1 block">Max</label>
          <Input
            type="text"
            value={maxValue ? formatNumber(maxValue) : ""}
            onChange={(e) => onMaxChange(parseFormattedNumber(e.target.value))}
            className="font-sans text-sm"
            placeholder="Illimité"
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
    </div>
  );
};

export default BudgetRangeSlider;
