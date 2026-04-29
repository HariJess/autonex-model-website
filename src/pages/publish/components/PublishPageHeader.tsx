import { Button } from "@/components/ui/button";
import { Cloud, FilePlus2, Loader2, Shield } from "lucide-react";

type PublishPageHeaderProps = {
  moderationText: string;
  publishCreditCost: number;
  title: string;
  showNewButton: boolean;
  newListingLabel: string;
  onNewListing: () => void;
  showDraftStatus: boolean;
  saveStatus: "idle" | "saving" | "saved" | "error";
  lastSavedAt: string | null;
  saveError: string | null;
  labels: {
    saving: string;
    draftSaved: string;
    draftSaveFailed: string;
    draftAuto: string;
    lastSaved: string;
  };
};

export function PublishPageHeader({
  moderationText,
  publishCreditCost,
  title,
  showNewButton,
  newListingLabel,
  onNewListing,
  showDraftStatus,
  saveStatus,
  lastSavedAt,
  saveError,
  labels,
}: PublishPageHeaderProps) {
  return (
    <>
      <div className="flex items-start gap-3 mb-5 rounded-2xl border-2 border-border/90 bg-secondary/40 p-4 shadow-sm">
        <Shield className="h-5 w-5 text-primary shrink-0 mt-0.5" />
        <p className="text-[14px] md:text-sm text-muted-foreground font-sans leading-relaxed">{moderationText.replace("{cost}", String(publishCreditCost))}</p>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
        <h1 className="font-sans text-3xl font-bold">{title}</h1>
        {showNewButton && (
          <Button type="button" variant="outline" size="sm" className="font-sans shrink-0" onClick={onNewListing}>
            <FilePlus2 className="h-4 w-4 mr-2" />
            {newListingLabel}
          </Button>
        )}
      </div>

      {showDraftStatus && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mb-5 text-sm font-sans">
          <span className="inline-flex items-center gap-1.5 text-foreground">
            {saveStatus === "saving" && (
              <>
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                {labels.saving}
              </>
            )}
            {saveStatus === "saved" && (
              <>
                <Cloud className="h-4 w-4 text-primary" />
                {labels.draftSaved}
              </>
            )}
            {saveStatus === "error" && <span className="text-destructive">{labels.draftSaveFailed}</span>}
            {saveStatus === "idle" && (
              <>
                <Cloud className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">{labels.draftAuto}</span>
              </>
            )}
          </span>
          <span className="text-muted-foreground">
            {labels.lastSaved.replace(
              "{{time}}",
              lastSavedAt
                ? new Date(lastSavedAt).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })
                : "—",
            )}
          </span>
          {saveError && <span className="text-destructive text-[13px]">{saveError}</span>}
        </div>
      )}
    </>
  );
}

