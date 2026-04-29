import { CheckCircle2, ShieldCheck, Sparkles } from "lucide-react";

type PublishGuidanceAsideProps = {
  overline: string;
  title: string;
  secureDraftTitle: string;
  secureDraftHint: string;
  moderationTitle: string;
  moderationHint: string;
  guidedFlowTitle: string;
  guidedFlowHint: string;
};

export function PublishGuidanceAside({
  overline,
  title,
  secureDraftTitle,
  secureDraftHint,
  moderationTitle,
  moderationHint,
  guidedFlowTitle,
  guidedFlowHint,
}: PublishGuidanceAsideProps) {
  return (
    <aside className="space-y-3 lg:sticky lg:top-24 lg:self-start">
      <div className="rounded-2xl border border-border/70 bg-gradient-to-br from-card via-card to-secondary/20 p-4">
        <p className="font-sans text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
          {overline}
        </p>
        <p className="mt-1 font-sans text-lg text-foreground">{title}</p>
        <div className="mt-3 space-y-2.5">
          <div className="rounded-xl border border-border/60 bg-background/75 px-3 py-2.5">
            <p className="inline-flex items-center gap-2 font-sans text-sm font-medium text-foreground">
              <ShieldCheck className="h-4 w-4 text-primary" />
              {secureDraftTitle}
            </p>
            <p className="mt-1 font-sans text-xs text-muted-foreground">
              {secureDraftHint}
            </p>
          </div>
          <div className="rounded-xl border border-border/60 bg-background/75 px-3 py-2.5">
            <p className="inline-flex items-center gap-2 font-sans text-sm font-medium text-foreground">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              {moderationTitle}
            </p>
            <p className="mt-1 font-sans text-xs text-muted-foreground">
              {moderationHint}
            </p>
          </div>
          <div className="rounded-xl border border-border/60 bg-background/75 px-3 py-2.5">
            <p className="inline-flex items-center gap-2 font-sans text-sm font-medium text-foreground">
              <Sparkles className="h-4 w-4 text-primary" />
              {guidedFlowTitle}
            </p>
            <p className="mt-1 font-sans text-xs text-muted-foreground">
              {guidedFlowHint}
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
