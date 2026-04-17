import { Check } from "lucide-react";

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
  t: (key: string, defaultValue?: string, options?: Record<string, unknown>) => string;
};

export default function EstimationProgressHeader({
  currentStepIndex,
  screen,
  steps,
  t,
}: EstimationProgressHeaderProps) {
  return (
    <div className="mb-5 rounded-3xl border border-border/65 bg-gradient-to-br from-background/95 via-background to-secondary/25 px-4 py-4 shadow-sm md:mb-8 md:px-6 md:py-5">
      <div className="mb-3.5 flex items-center justify-between md:mb-4">
        <p className="font-sans text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
          {t("estimation.progress", "Progression estimation")}
        </p>
        <div className="inline-flex items-center rounded-full border border-primary/30 bg-primary/[0.08] px-2.5 py-1">
          <p className="font-sans text-[11px] font-medium text-primary">
            {t("publish.stepCounter", "Étape {{current}} / {{total}}", {
              current: currentStepIndex,
              total: 3,
            })}
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <div className="h-1.5 rounded-full bg-secondary/60 p-[2px]">
          <div
            className="h-full rounded-full bg-gradient-to-r from-primary/70 via-primary/60 to-primary/45 transition-all duration-500 ease-out"
            style={{ width: `${Math.max(8, ((currentStepIndex - 1) / 2) * 100)}%` }}
          />
        </div>
        <div className="grid grid-cols-3 gap-2 md:gap-3">
          {steps.map((step, index) => {
            const stepNumber = index + 1;
            const isActive = step.id === screen;
            const isDone = currentStepIndex > stepNumber;
            const isUpcoming = !isDone && !isActive;
            return (
              <div
                key={step.id}
                className={`relative rounded-2xl border px-2.5 pb-2.5 pt-2.5 transition-all duration-200 md:px-4 md:pb-3 ${
                  isActive
                    ? "border-primary/45 bg-gradient-to-br from-primary/[0.14] via-primary/[0.08] to-background shadow-[0_14px_36px_rgba(25,78,134,0.2)]"
                    : isDone
                      ? "border-foreground/25 bg-foreground/[0.06]"
                      : "border-border/70 bg-background/85"
                }`}
              >
                <div className="mb-1.5 flex items-center gap-1.5 md:mb-2 md:gap-2">
                  <div
                    className={`flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-semibold md:h-8 md:w-8 md:text-xs ${
                      isActive
                        ? "bg-primary text-primary-foreground ring-4 ring-primary/20 shadow-[0_6px_16px_rgba(25,78,134,0.35)]"
                        : isDone
                          ? "bg-foreground/85 text-background"
                          : "bg-secondary text-secondary-foreground/80"
                    }`}
                  >
                    {isDone ? <Check className="h-3.5 w-3.5 md:h-4 md:w-4" /> : stepNumber}
                  </div>
                  <p
                    className={`font-sans text-sm ${
                      isActive
                        ? "font-semibold text-primary"
                        : isDone
                          ? "font-semibold text-foreground"
                          : "font-medium text-muted-foreground"
                    }`}
                  >
                    {t(step.labelKey, step.labelDefault)}
                  </p>
                </div>
                <p
                  className={`font-sans text-[11px] leading-snug md:text-xs ${
                    isUpcoming ? "text-muted-foreground/80" : "text-muted-foreground"
                  }`}
                >
                  {t(step.helperKey, step.helperDefault)}
                </p>
                {isActive && <div className="mt-2 h-0.5 w-10 rounded-full bg-primary/70" />}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
