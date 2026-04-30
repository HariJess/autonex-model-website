import { Fragment } from "react";
import type { TFunction } from "i18next";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

type StepMetaItem = {
  id: string;
  labelKey: string;
  helperKey: string;
  labelDefault: string;
  helperDefault: string;
};

type EstimationProgressHeaderProps = {
  currentStepIndex: number;
  screen: "landing" | "vehicle" | "condition" | "result";
  steps: readonly StepMetaItem[];
  t: TFunction<"translation", undefined>;
};

/**
 * Stepper minimaliste style Linear / Stripe — appliqué partout (mode normal
 * et mode embedded). Trois pastilles numérotées avec connecteurs ; pastille
 * active = ring bleu clair, pastilles passées = check, pastilles à venir =
 * grisé. Bien plus léger que la précédente version "carte de progression".
 */
export default function EstimationProgressHeader({
  currentStepIndex,
  screen,
  steps,
  t,
}: EstimationProgressHeaderProps) {
  return (
    <nav
      aria-label={t("estimation.progress", "Progression estimation")}
      className="mb-6 flex items-center justify-between gap-2 px-2"
    >
      {steps.map((step, idx) => {
        const stepNumber = idx + 1;
        const currentIdx = Math.max(0, currentStepIndex - 1);
        const isActive = step.id === screen;
        const isDone = currentStepIndex > stepNumber;
        const isUpcoming = !isDone && !isActive;

        return (
          <Fragment key={step.id}>
            <div className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
              <div
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold transition-colors",
                  isDone && "bg-primary text-primary-foreground",
                  isActive && "bg-primary text-primary-foreground ring-4 ring-primary/15",
                  isUpcoming && "border border-border bg-muted text-muted-foreground",
                )}
                aria-current={isActive ? "step" : undefined}
              >
                {isDone ? <Check className="h-3.5 w-3.5" aria-hidden /> : stepNumber}
              </div>
              <span
                className={cn(
                  "w-full truncate text-center text-[11px] font-medium tracking-wide",
                  isUpcoming ? "text-muted-foreground" : "text-foreground",
                )}
              >
                {t(step.labelKey, step.labelDefault)}
              </span>
            </div>
            {idx < steps.length - 1 && (
              <div
                className={cn(
                  "-mt-5 h-px flex-1 transition-colors",
                  idx < currentIdx ? "bg-primary" : "bg-border",
                )}
                aria-hidden
              />
            )}
          </Fragment>
        );
      })}
    </nav>
  );
}
