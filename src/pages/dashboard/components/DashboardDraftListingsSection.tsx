import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { FileEdit } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type Listing = Tables<"listings">;

type DashboardDraftListingsSectionProps = {
  draftListings: Listing[];
  title: string;
  hint: string;
  draftStepLabel: string;
  draftUpdatedLabel: string;
  resumeLabel: string;
  deleteLabel: string;
  deleteTitle: string;
  deleteDescription: string;
  cancelLabel: string;
  onDelete: (id: string) => void;
};

export function DashboardDraftListingsSection({
  draftListings,
  title,
  hint,
  draftStepLabel,
  draftUpdatedLabel,
  resumeLabel,
  deleteLabel,
  deleteTitle,
  deleteDescription,
  cancelLabel,
  onDelete,
}: DashboardDraftListingsSectionProps) {
  if (draftListings.length === 0) return null;

  return (
    <Card className="rounded-2xl border-2 border-dashed border-primary/35 bg-muted/20">
      <CardContent className="p-6 space-y-4">
        <div className="flex items-center gap-2">
          <FileEdit className="h-5 w-5 text-primary" />
          <h2 className="font-sans text-lg font-bold">{title}</h2>
        </div>
        <p className="text-sm text-muted-foreground font-sans">{hint}</p>
        <ul className="space-y-3">
          {draftListings.map((d) => (
            <li
              key={d.id}
              className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl border border-border bg-card p-4 font-sans text-sm"
            >
              <div>
                <p className="font-medium text-foreground line-clamp-1">{d.title || "—"}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {d.ville ? `${d.ville} · ` : ""}
                  {draftStepLabel.replace("{{n}}", String((d.draft_step ?? 0) + 1))}
                  {d.updated_at
                    ? ` · ${draftUpdatedLabel} ${new Date(d.updated_at).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}`
                    : ""}
                </p>
              </div>
              <div className="flex flex-wrap gap-2 shrink-0">
                <Link to={`/publier?draft=${d.id}`}>
                  <Button
                    type="button"
                    size="sm"
                    variant="default"
                    className="font-sans gradient-primary border-0"
                    style={{ color: "#FAFAFA" }}
                  >
                    {resumeLabel}
                  </Button>
                </Link>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button type="button" size="sm" variant="outline" className="font-sans text-destructive border-destructive/40">
                      {deleteLabel}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>{deleteTitle}</AlertDialogTitle>
                      <AlertDialogDescription className="font-sans">{deleteDescription}</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel className="font-sans">{cancelLabel}</AlertDialogCancel>
                      <AlertDialogAction
                        className="font-sans bg-destructive text-destructive-foreground"
                        onClick={() => onDelete(d.id)}
                      >
                        {deleteLabel}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

