import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { SponsoredPill } from "./MonetizationLabels";

interface PremiumBillboardProps {
  className?: string;
  enabled?: boolean;
}

/** Zone type billboard (emplacement média) sous le hero. */
export function PremiumBillboard({ className, enabled = true }: PremiumBillboardProps) {
  if (!enabled) return null;

  return (
    <section className={cn("container mx-auto px-4", className)}>
      <div className="relative overflow-hidden rounded-3xl border border-border bg-card min-h-[140px] md:min-h-[180px] flex flex-col items-center justify-center text-center px-6 py-10 md:py-14 shadow-sm">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.06] via-transparent to-accent/[0.08]" aria-hidden />
        <SponsoredPill className="relative mb-3" label="Grande visibilité" />
        <h3 className="relative font-serif text-xl md:text-2xl font-bold text-foreground max-w-2xl">
          Billboard premium — votre marque au cœur du portail
        </h3>
        <p className="relative mt-2 text-sm text-muted-foreground font-sans max-w-lg">
          Emplacement réservé aux campagnes nationales et partenariats. Structure prête pour tracking et rotation.
        </p>
        <Link
          to="/dashboard"
          className="relative mt-6 inline-flex rounded-xl gradient-primary px-6 py-2.5 text-sm font-sans font-medium"
          style={{ color: "#FAFAFA" }}
        >
          Demander un média
        </Link>
      </div>
    </section>
  );
}
