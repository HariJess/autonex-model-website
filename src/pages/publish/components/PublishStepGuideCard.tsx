type StepGuide = {
  title: string;
  subtitle: string;
  helper: string;
};

type PublishStepGuideCardProps = {
  stepGuide?: StepGuide;
  stepCounterLabel: string;
};

export function PublishStepGuideCard({
  stepGuide,
  stepCounterLabel,
}: PublishStepGuideCardProps) {
  return (
    <div className="rounded-2xl border border-border/70 bg-gradient-to-br from-background via-background to-secondary/20 px-4 py-4 md:px-5">
      <p className="font-sans text-xs uppercase tracking-[0.14em] text-muted-foreground">
        {stepCounterLabel}
      </p>
      <p className="mt-1 font-serif text-2xl text-foreground">{stepGuide?.title}</p>
      <p className="mt-1 font-sans text-[14px] md:text-sm font-medium text-foreground/85 leading-relaxed">
        {stepGuide?.subtitle}
      </p>
      <p className="mt-1 font-sans text-[14px] md:text-sm text-muted-foreground leading-relaxed">
        {stepGuide?.helper}
      </p>
    </div>
  );
}
