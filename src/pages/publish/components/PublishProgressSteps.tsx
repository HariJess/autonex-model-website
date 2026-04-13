import { Progress } from "@/components/ui/progress";
import { Check } from "lucide-react";

type PublishProgressStepsProps = {
  steps: string[];
  step: number;
  progress: number;
};

export function PublishProgressSteps({ steps, step, progress }: PublishProgressStepsProps) {
  return (
    <div className="mb-6 md:mb-8">
      <div className="flex justify-between mb-3 gap-1 overflow-x-auto pb-1">
        {steps.map((s, i) => (
          <div key={s} className="flex flex-col items-center min-w-[4.75rem]">
            <div
              className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-sans font-semibold transition-all border-2 ${
                i === step
                  ? "gradient-primary border-transparent ring-2 ring-primary/35 ring-offset-2 ring-offset-background text-[#FAFAFA] shadow-md"
                  : i < step
                    ? "gradient-primary border-transparent text-[#FAFAFA] shadow-sm"
                    : "bg-card border-border text-muted-foreground shadow-sm"
              }`}
            >
              {i < step ? <Check className="h-4 w-4 text-[#FAFAFA]" strokeWidth={2.5} /> : i + 1}
            </div>
            <span
              className={`text-[10px] md:text-xs font-sans mt-1.5 text-center max-w-[5.5rem] leading-tight ${
                i === step ? "text-foreground font-semibold" : i < step ? "text-primary font-medium" : "text-muted-foreground"
              }`}
            >
              {s}
            </span>
          </div>
        ))}
      </div>
      <Progress value={progress} className="h-2" />
    </div>
  );
}

