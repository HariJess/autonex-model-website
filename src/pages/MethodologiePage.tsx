import { ArrowLeft, BookOpen, Building2, Database, Gauge, Layers, ShieldCheck, Users, Wrench } from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useDataFreshness } from "@/lib/estimation/dataFreshnessHelper";

/**
 * PROMPT 10B — Page publique `/estimation/methodologie`.
 *
 * Page de transparence "documentation technique vulgarisée" exposant
 * comment l'engine V2 calcule une estimation. Pas auth-gated, lisible par
 * n'importe qui — c'est précisément ce qui distingue AutoNex d'un Le Bon
 * Coin Mada : on explique la méthode publiquement.
 *
 * Sections (cf. brief PROMPT_10B Tâche 5) :
 *   1. Hero
 *   2. Les 3 valeurs Argus
 *   3. La fourchette P10/P90
 *   4. Sources de données (avec freshness dynamique)
 *   5. Transaction factors
 *   6. Ajustements véhicule
 *   7. Tier de confiance A/B/C/D
 *   8. Limites & disclaimer
 *   9. Footer technique (version moteur)
 */

const ENGINE_VERSION = "v2_2026_05_11";
const PAGE_LAST_UPDATED = "11 mai 2026";

const FRENCH_MONTHS = [
  "janvier",
  "février",
  "mars",
  "avril",
  "mai",
  "juin",
  "juillet",
  "août",
  "septembre",
  "octobre",
  "novembre",
  "décembre",
];

function formatDateFr(iso: string | null): string {
  if (!iso) return "—";
  const ts = Date.parse(iso);
  if (!Number.isFinite(ts)) return "—";
  const d = new Date(ts);
  return `${d.getDate().toString().padStart(2, "0")} ${FRENCH_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export default function MethodologiePage() {
  const { t } = useTranslation();
  const { data: freshness } = useDataFreshness();
  const lastUpdate = formatDateFr(freshness?.lastUpdateIso ?? null);
  const totalCount = freshness?.comparableTotalCount ?? 0;

  return (
    <main
      className="min-h-screen bg-background py-8 md:py-12"
      data-testid="methodologie-page"
    >
      <div className="mx-auto w-full max-w-3xl px-4 md:px-6 space-y-10">
        {/* Back link */}
        <Link
          to="/estimation"
          className="inline-flex items-center gap-1.5 font-sans text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          {t("methodologie.back", "Retour à l'estimation")}
        </Link>

        {/* 1. Hero */}
        <section data-testid="methodologie-hero" className="space-y-3">
          <Badge variant="outline" className="font-sans normal-case">
            <BookOpen className="mr-1.5 h-3 w-3" aria-hidden />
            {t("methodologie.hero.label", "Méthodologie")}
          </Badge>
          <h1 className="font-sans text-3xl md:text-5xl tracking-tight font-bold">
            {t(
              "methodologie.hero.title",
              "Comment AutoNex estime votre voiture",
            )}
          </h1>
          <p className="font-sans text-base md:text-lg text-muted-foreground leading-relaxed">
            {t(
              "methodologie.hero.subtitle",
              "Notre estimation s'appuie sur des données réelles du marché Malgache : annonces particuliers, revendeurs, partenaires concession. Voici exactement comment elle est calculée — sans bullshit marketing.",
            )}
          </p>
        </section>

        {/* 2. Les 3 valeurs Argus */}
        <section
          data-testid="methodologie-3-valeurs"
          className="space-y-4"
          id="valeurs"
        >
          <h2 className="font-sans text-2xl md:text-3xl font-semibold">
            {t("methodologie.valeurs.title", "Pourquoi 3 valeurs et pas 1 ?")}
          </h2>
          <p className="font-sans text-sm md:text-base text-muted-foreground leading-relaxed">
            {t(
              "methodologie.valeurs.intro",
              "Une voiture n'a pas un seul prix : elle se vend différemment selon qui l'achète. Nous publions 3 valeurs distinctes pour vous donner une lecture honnête du marché.",
            )}
          </p>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <Card className="rounded-2xl border-border/60">
              <CardContent className="p-4 space-y-2">
                <Wrench className="h-5 w-5 text-muted-foreground" aria-hidden />
                <p className="font-sans text-sm font-semibold">
                  {t("methodologie.valeurs.tradeIn.title", "Reprise pro")}
                </p>
                <p className="font-sans text-xs text-muted-foreground">
                  × 0.78 — {t(
                    "methodologie.valeurs.tradeIn.desc",
                    "Prix typique payé par un concessionnaire en rachat. Inclut sa marge de revente et le risque pris.",
                  )}
                </p>
              </CardContent>
            </Card>
            <Card className="rounded-2xl border-2 border-primary/45 bg-primary/[0.06]">
              <CardContent className="p-4 space-y-2">
                <Users className="h-5 w-5 text-primary" aria-hidden />
                <p className="font-sans text-sm font-semibold text-primary">
                  {t("methodologie.valeurs.private.title", "Entre particuliers")}
                </p>
                <p className="font-sans text-xs text-muted-foreground">
                  × 1.00 — {t(
                    "methodologie.valeurs.private.desc",
                    "Prix attendu pour une vente directe entre particuliers. C'est notre valeur centrale, la plus représentative.",
                  )}
                </p>
              </CardContent>
            </Card>
            <Card className="rounded-2xl border-border/60">
              <CardContent className="p-4 space-y-2">
                <Building2 className="h-5 w-5 text-muted-foreground" aria-hidden />
                <p className="font-sans text-sm font-semibold">
                  {t("methodologie.valeurs.dealer.title", "En concession")}
                </p>
                <p className="font-sans text-xs text-muted-foreground">
                  × 1.15 — {t(
                    "methodologie.valeurs.dealer.desc",
                    "Prix retail typique en concession, avec garantie et services après-vente.",
                  )}
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* 3. La fourchette P10/P90 */}
        <section data-testid="methodologie-fourchette" className="space-y-3" id="fourchette">
          <h2 className="font-sans text-2xl md:text-3xl font-semibold">
            {t("methodologie.fourchette.title", "La fourchette : P10/P90 réels")}
          </h2>
          <p className="font-sans text-sm md:text-base text-muted-foreground leading-relaxed">
            {t(
              "methodologie.fourchette.intro",
              "La fourchette basse-haute n'est pas un ±10% arbitraire. Elle s'appuie sur la dispersion réelle des comparables :",
            )}
          </p>
          <ul className="space-y-2 font-sans text-sm">
            <li className="flex items-start gap-2">
              <Badge variant="outline" className="mt-0.5 font-sans text-[10px] normal-case">≥8 comps</Badge>
              <span className="text-muted-foreground">
                {t(
                  "methodologie.fourchette.p10p90",
                  "Percentiles 10 et 90 réels — 10% des comparables sont en-dessous de la borne basse, 10% au-dessus de la haute.",
                )}
              </span>
            </li>
            <li className="flex items-start gap-2">
              <Badge variant="outline" className="mt-0.5 font-sans text-[10px] normal-case">5-7 comps</Badge>
              <span className="text-muted-foreground">
                {t(
                  "methodologie.fourchette.p25p75",
                  "Percentiles 25 et 75 — fourchette resserrée pour ne pas extrapoler avec trop peu de données.",
                )}
              </span>
            </li>
            <li className="flex items-start gap-2">
              <Badge variant="outline" className="mt-0.5 font-sans text-[10px] normal-case">&lt;5 comps</Badge>
              <span className="text-muted-foreground">
                {t(
                  "methodologie.fourchette.synthetic",
                  "Fourchette synthétique adaptative — pas assez de signal pour des percentiles fiables.",
                )}
              </span>
            </li>
          </ul>
          <p className="font-sans text-sm text-muted-foreground italic">
            {t(
              "methodologie.fourchette.honest",
              "C'est plus honnête qu'un ±10% arbitraire — la fourchette reflète la réalité du marché.",
            )}
          </p>
        </section>

        {/* 4. Sources de données */}
        <section data-testid="methodologie-sources" className="space-y-3" id="sources">
          <h2 className="font-sans text-2xl md:text-3xl font-semibold">
            {t("methodologie.sources.title", "Les sources de données")}
          </h2>
          <ul className="space-y-2 font-sans text-sm">
            <li className="flex items-start gap-2">
              <Database className="mt-0.5 h-4 w-4 text-muted-foreground" aria-hidden />
              <span>
                <strong>{t("methodologie.sources.scrap.label", "Marché public")} </strong>
                <span className="text-muted-foreground">
                  {t(
                    "methodologie.sources.scrap.desc",
                    "annonces publiques observées (Facebook Marketplace, partenaires revendeurs).",
                  )}
                </span>
              </span>
            </li>
            <li className="flex items-start gap-2">
              <Database className="mt-0.5 h-4 w-4 text-muted-foreground" aria-hidden />
              <span>
                <strong>{t("methodologie.sources.autonex.label", "Annonces AutoNex actives")} </strong>
                <span className="text-muted-foreground">
                  {t(
                    "methodologie.sources.autonex.desc",
                    "annonces publiées par les utilisateurs sur autonex.mg.",
                  )}
                </span>
              </span>
            </li>
            <li className="flex items-start gap-2">
              <Database className="mt-0.5 h-4 w-4 text-muted-foreground" aria-hidden />
              <span>
                <strong>{t("methodologie.sources.profiles.label", "Profils de référence canoniques")} </strong>
                <span className="text-muted-foreground">
                  {t(
                    "methodologie.sources.profiles.desc",
                    "valeurs baseline calibrées par modèle/année (utilisées si peu de comparables).",
                  )}
                </span>
              </span>
            </li>
          </ul>
          <Card className="rounded-xl bg-secondary/15 border-border/60">
            <CardContent className="p-4 font-sans text-xs text-muted-foreground space-y-1">
              <p>
                <strong className="text-foreground">
                  {t("methodologie.sources.volume", "À ce jour")}
                  {" : "}
                </strong>
                <span data-testid="methodologie-total-count">{totalCount}</span>{" "}
                {t("methodologie.sources.comparablesIngested", "comparables actifs en base.")}
              </p>
              <p data-testid="methodologie-last-update">
                <strong className="text-foreground">
                  {t("methodologie.sources.lastUpdate", "Dernière mise à jour des données")}
                  {" : "}
                </strong>
                {lastUpdate}
              </p>
            </CardContent>
          </Card>
        </section>

        {/* 5. Transaction factors */}
        <section data-testid="methodologie-factors" className="space-y-3" id="factors">
          <h2 className="font-sans text-2xl md:text-3xl font-semibold">
            {t("methodologie.factors.title", "Les facteurs de transaction")}
          </h2>
          <p className="font-sans text-sm md:text-base text-muted-foreground leading-relaxed">
            {t(
              "methodologie.factors.intro",
              "Un prix affiché sur une annonce ≠ prix de vente réel. Les vendeurs négocient à la baisse. Pour chaque source, nous appliquons un facteur calibré qui transforme le prix demandé en prix transaction estimé :",
            )}
          </p>
          <div className="rounded-xl border border-border/60 overflow-hidden">
            <table className="w-full font-sans text-sm">
              <thead className="bg-secondary/30 text-foreground">
                <tr>
                  <th className="text-left px-3 py-2 font-medium">
                    {t("methodologie.factors.tableSource", "Source")}
                  </th>
                  <th className="text-right px-3 py-2 font-medium">
                    {t("methodologie.factors.tableFactor", "Facteur")}
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-border/60">
                  <td className="px-3 py-2">{t("methodologie.factors.fbParticulier", "Facebook particulier")}</td>
                  <td className="text-right px-3 py-2 tabular-nums">× 0.93</td>
                </tr>
                <tr className="border-t border-border/60">
                  <td className="px-3 py-2">{t("methodologie.factors.fbRevendeur", "Facebook revendeur")}</td>
                  <td className="text-right px-3 py-2 tabular-nums">× 0.87</td>
                </tr>
                <tr className="border-t border-border/60">
                  <td className="px-3 py-2">{t("methodologie.factors.autonexActive", "Annonces AutoNex actives")}</td>
                  <td className="text-right px-3 py-2 tabular-nums">× 0.96</td>
                </tr>
                <tr className="border-t border-border/60">
                  <td className="px-3 py-2">{t("methodologie.factors.concessionnaire", "Concessionnaire officiel")}</td>
                  <td className="text-right px-3 py-2 tabular-nums">× 0.97</td>
                </tr>
                <tr className="border-t border-border/60">
                  <td className="px-3 py-2">{t("methodologie.factors.txConfirmed", "Transaction confirmée (notaire)")}</td>
                  <td className="text-right px-3 py-2 tabular-nums">× 1.00</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="font-sans text-sm text-muted-foreground italic">
            {t(
              "methodologie.factors.outcome",
              "Tous les comparables sont normalisés en \"prix transaction estimé\" avant le calcul de la médiane.",
            )}
          </p>
        </section>

        {/* 6. Ajustements véhicule */}
        <section data-testid="methodologie-ajustements" className="space-y-3" id="ajustements">
          <h2 className="font-sans text-2xl md:text-3xl font-semibold">
            {t("methodologie.ajustements.title", "Les ajustements véhicule")}
          </h2>
          <p className="font-sans text-sm md:text-base text-muted-foreground leading-relaxed">
            {t(
              "methodologie.ajustements.intro",
              "Une fois la valeur médiane des comparables calculée, 6 ajustements sont appliqués pour refléter votre véhicule spécifique :",
            )}
          </p>
          <ul className="space-y-2 font-sans text-sm">
            <li className="flex items-center gap-2">
              <Gauge className="h-4 w-4 text-muted-foreground" aria-hidden />
              <span>{t("methodologie.ajustements.mileage", "Kilométrage : ±6%")}</span>
            </li>
            <li className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-muted-foreground" aria-hidden />
              <span>{t("methodologie.ajustements.condition", "État général : -10% à +4%")}</span>
            </li>
            <li className="flex items-center gap-2">
              <Wrench className="h-4 w-4 text-muted-foreground" aria-hidden />
              <span>{t("methodologie.ajustements.maintenance", "Entretien : 0% à +3%")}</span>
            </li>
            <li className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-muted-foreground" aria-hidden />
              <span>{t("methodologie.ajustements.accident", "Accident déclaré : -6% si oui")}</span>
            </li>
            <li className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" aria-hidden />
              <span>{t("methodologie.ajustements.ownership", "Nombre de propriétaires : -3% à +2%")}</span>
            </li>
            <li className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-muted-foreground" aria-hidden />
              <span>{t("methodologie.ajustements.usage", "Usage : -8% à 0% (pro/location/flotte)")}</span>
            </li>
          </ul>
          <p className="font-sans text-sm text-muted-foreground">
            {t(
              "methodologie.ajustements.cap",
              "Total cappé à ±20% (puis re-cappé en post-blend à ±12% par sécurité) pour rester réaliste face au marché.",
            )}
          </p>
        </section>

        {/* 7. Tier de confiance */}
        <section data-testid="methodologie-tier" className="space-y-3" id="tier">
          <h2 className="font-sans text-2xl md:text-3xl font-semibold">
            {t("methodologie.tier.title", "Le niveau de fiabilité (A / B / C / D)")}
          </h2>
          <ul className="space-y-2 font-sans text-sm">
            <li>
              <Badge variant="default" className="font-sans normal-case mr-2">A</Badge>
              <span className="text-muted-foreground">
                {t("methodologie.tier.a", "STRONG MARKET — ≥8 comparables forts. Estimation \"robuste\".")}
              </span>
            </li>
            <li>
              <Badge variant="secondary" className="font-sans normal-case mr-2">B</Badge>
              <span className="text-muted-foreground">
                {t("methodologie.tier.b", "MODERATE MARKET — 5+ comparables modérés. Estimation \"raisonnable\".")}
              </span>
            </li>
            <li>
              <Badge variant="outline" className="font-sans normal-case mr-2">C</Badge>
              <span className="text-muted-foreground">
                {t("methodologie.tier.c", "REFERENCE ASSISTED — peu de comparables, profil de référence utilisé. Estimation \"indicative\".")}
              </span>
            </li>
            <li>
              <Badge variant="outline" className="font-sans normal-case mr-2">D</Badge>
              <span className="text-muted-foreground">
                {t("methodologie.tier.d", "HEURISTIC ONLY — pas de comparables ni de profil. Estimation \"très approximative\".")}
              </span>
            </li>
          </ul>
        </section>

        {/* 8. Limites */}
        <section data-testid="methodologie-limites" className="space-y-3" id="limites">
          <h2 className="font-sans text-2xl md:text-3xl font-semibold">
            {t("methodologie.limites.title", "Limites & honnêteté")}
          </h2>
          <p className="font-sans text-sm md:text-base text-muted-foreground leading-relaxed">
            {t(
              "methodologie.limites.indicative",
              "L'estimation reste indicative. Un véhicule unique, un acheteur motivé, une condition de marché changeante peuvent décaler le prix réel.",
            )}
          </p>
          <p className="font-sans text-sm md:text-base text-muted-foreground leading-relaxed">
            {t(
              "methodologie.limites.evolving",
              "Cette méthodologie est en évolution. Elle s'améliore à mesure que la base de comparables grandit et que nous calibrons les facteurs sur des transactions confirmées.",
            )}
          </p>
          <p className="font-sans text-sm text-muted-foreground">
            {t(
              "methodologie.limites.feedback",
              "Une estimation vous paraît loin du marché réel ? Contactez-nous via le formulaire de support pour signaler le cas et nous aider à calibrer.",
            )}
          </p>
        </section>

        {/* 9. Footer technique */}
        <footer
          data-testid="methodologie-footer-tech"
          className="rounded-xl border border-border/60 bg-secondary/15 p-4 font-sans text-xs text-muted-foreground space-y-1"
        >
          <p>
            <strong className="text-foreground">
              {t("methodologie.footer.engineVersion", "Version du moteur")}
              {" : "}
            </strong>
            <code className="font-mono">{ENGINE_VERSION}</code>
          </p>
          <p>
            <strong className="text-foreground">
              {t("methodologie.footer.pageUpdated", "Page mise à jour")}
              {" : "}
            </strong>
            {PAGE_LAST_UPDATED}
          </p>
        </footer>
      </div>
    </main>
  );
}
