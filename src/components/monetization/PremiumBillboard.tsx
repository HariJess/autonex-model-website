import { cn } from "@/lib/utils";
import { SponsoredPill } from "./MonetizationLabels";
import { usePartnerCampaign } from "@/hooks/usePartnerCampaign";

interface PremiumBillboardProps {
  className?: string;
  enabled?: boolean;
}

/** Zone type billboard (emplacement média) sous le hero. */
export function PremiumBillboard({ className, enabled = true }: PremiumBillboardProps) {
  const { data: campaign } = usePartnerCampaign("homeBillboard", enabled);
  if (!enabled || !campaign) return null;

  return (
    <section className={cn("container mx-auto", className)}>
      <div className="relative overflow-hidden rounded-3xl border border-border bg-card min-h-[140px] md:min-h-[180px] flex flex-col items-center justify-center text-center px-6 py-10 md:py-14 shadow-sm">
        <img
          src={campaign.image_url}
          alt={campaign.advertiser_name}
          className="absolute inset-0 h-full w-full object-cover opacity-30"
          loading="lazy"
          decoding="async"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.06] via-transparent to-accent/[0.08]" aria-hidden />
        <SponsoredPill className="relative mb-3" label="Grande visibilité" />
        <h3 className="relative font-serif text-xl md:text-2xl font-bold text-foreground max-w-2xl">
          {campaign.advertiser_name}
        </h3>
        {campaign.destination_url ? (
          <a
            href={campaign.destination_url}
            target="_blank"
            rel="noopener noreferrer"
            className="relative mt-6 inline-flex rounded-xl border border-primary/30 bg-primary/5 px-6 py-2.5 text-sm font-sans font-medium text-primary hover:bg-primary/10 transition-colors"
          >
            {campaign.cta_label?.trim() || "Découvrir"}
          </a>
        ) : null}
      </div>
    </section>
  );
}
