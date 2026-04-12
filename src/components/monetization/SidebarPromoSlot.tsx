import { Link } from "react-router-dom";
import { Coins } from "lucide-react";
import { MONETIZATION_PLACEMENTS } from "@/config/monetization";
import { SponsoredPill } from "./MonetizationLabels";

export function SidebarPromoSlot() {
  if (!MONETIZATION_PLACEMENTS.searchSidebar) return null;

  return (
    <div className="mt-6 rounded-2xl border border-border bg-card p-4 space-y-2">
      <SponsoredPill />
      <div className="flex items-center gap-2">
        <Coins className="h-5 w-5 text-amber-600 shrink-0" />
        <p className="font-serif font-semibold text-sm">Crédits & visibilité</p>
      </div>
      <p className="text-xs text-muted-foreground font-sans leading-relaxed">
        Publiez et boostez vos annonces avec des packs en Ariary. Paiement manuel vérifié par l’équipe.
      </p>
      <Link
        to="/publier"
        className="inline-flex w-full justify-center rounded-xl border border-primary/30 bg-primary/5 py-2 text-xs font-sans font-medium text-primary hover:bg-primary/10"
      >
        Acheter des crédits
      </Link>
    </div>
  );
}
