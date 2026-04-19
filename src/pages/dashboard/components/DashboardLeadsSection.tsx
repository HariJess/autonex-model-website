import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type LeadRow = Tables<"leads"> & { listings?: { title: string } | null };

type DashboardLeadsSectionProps = {
  title: string;
  leadsLoading: boolean;
  recentLeads: LeadRow[];
  labels: {
    noLeads: string;
    visitor: string;
    listing: string;
  };
};

export function DashboardLeadsSection({
  title,
  leadsLoading,
  recentLeads,
  labels,
}: DashboardLeadsSectionProps) {
  return (
    <div>
      <h2 className="font-serif text-xl font-bold mb-4">{title}</h2>
      {leadsLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : recentLeads.length === 0 ? (
        <p className="text-muted-foreground font-sans text-center py-8">{labels.noLeads}</p>
      ) : (
        <div className="space-y-3">
          {recentLeads.map((lead) => (
            <Card key={lead.id} className="rounded-2xl">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-sans font-semibold">{lead.visitor_name || labels.visitor}</p>
                    <p className="text-xs text-muted-foreground font-sans mb-2">
                      ✉️ Message • {lead.listings?.title ?? labels.listing}
                    </p>
                    {lead.message && <p className="text-sm text-muted-foreground font-sans">{lead.message}</p>}
                    {lead.visitor_email && <p className="text-xs text-primary font-sans mt-1">{lead.visitor_email}</p>}
                    {lead.visitor_phone && <p className="text-xs text-muted-foreground font-sans">{lead.visitor_phone}</p>}
                  </div>
                  <span className="text-xs text-muted-foreground font-sans flex-shrink-0">
                    {lead.created_at ? new Date(lead.created_at).toLocaleDateString("fr-FR") : ""}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

