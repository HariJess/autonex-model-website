import { Button } from "@/components/ui/button";

type PublishStepNavProps = {
  step: number;
  maxStep: number;
  prevLabel: string;
  nextLabel: string;
  onPrev: () => void;
  onNext: () => void;
};

export function PublishStepNav({
  step,
  maxStep,
  prevLabel,
  nextLabel,
  onPrev,
  onNext,
}: PublishStepNavProps) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 sm:static sm:z-auto border-t border-border bg-background/95 backdrop-blur-md sm:border-0 sm:bg-transparent sm:backdrop-blur-0 px-4 sm:px-0 pt-3 sm:pt-0 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:pb-0">
      <div className="container mx-auto max-w-3xl sm:max-w-none flex justify-between mt-0 sm:mt-8 gap-3 sm:gap-4 max-sm:flex-col-reverse">
        <Button
          type="button"
          variant="outline"
          onClick={onPrev}
          disabled={step === 0}
          className="font-sans min-h-12 touch-manipulation w-full sm:w-auto"
        >
          {prevLabel}
        </Button>
        {step < maxStep && (
          <Button
            type="button"
            onClick={onNext}
            className="gradient-primary border-0 font-sans min-h-12 touch-manipulation w-full sm:w-auto"
            style={{ color: "#FAFAFA" }}
          >
            {nextLabel}
          </Button>
        )}
      </div>
    </div>
  );
}

