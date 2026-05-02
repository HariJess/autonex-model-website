import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import autonexLogo from "@/assets/autonex-logo-dark.png";
import yasMoiLogo from "@/assets/yas-moi-logo.svg";
import { useYasContext } from "@/features/yas-app/hooks/useYasContext";
import { useYasHomeUrl } from "@/features/yas-app/hooks/useYasHomeUrl";

/**
 * Mini-header sticky affiché en mode embedded YAS sur les pages destination
 * (`/recherche`, `/estimation`, `/annonce/:id`, etc.) pour préserver le
 * co-branding `AutoNex × YAS&Moi` qui n'apparaît sinon QUE sur `/yas-app`.
 *
 * Comportement :
 * - Affiché si `isEmbedded === true` ET `pathname !== "/yas-app"`
 *   (la home a son propre `YasHero`, pas besoin du mini-header redondant).
 * - Cliquer sur le lockup ramène vers `/yas-app?source=yas&embedded=true...`
 *   (URL fournie par `useYasHomeUrl` qui propage les params YAS).
 * - Hauteur 48 px (h-12), sticky top, glassmorphisme léger via `backdrop-blur`
 *   avec fallback `supports-[backdrop-filter]` pour vieux browsers.
 * - Pas de boutons additionnels (settings, search, etc.) — minimal pour ne pas
 *   surcharger l'UI mobile en WebView.
 *
 * Position dans l'arbre : monté au niveau `App.tsx`, à l'intérieur du
 * `<YasProvider>` mais à l'extérieur de `<BetaLockGate>` + `<Routes>`, pour
 * qu'il soit affiché AVANT chaque page destination. Le composant retourne
 * `null` quand pas applicable, donc impact zéro sur le site normal.
 */
export function YasMiniHeader() {
  const { t } = useTranslation();
  const { isEmbedded } = useYasContext();
  const homeUrl = useYasHomeUrl();
  const location = useLocation();

  if (!isEmbedded) return null;
  // La home YAS a son propre YasHero — pas de duplication co-branding.
  if (location.pathname === "/yas-app") return null;

  return (
    <header
      className="sticky top-0 z-40 flex h-12 items-center border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 px-[max(1rem,env(safe-area-inset-left))]"
      aria-label={t("yas.miniHeader.aria", "Navigation AutoNex × YAS & Moi")}
    >
      <Link
        to={homeUrl}
        className="flex min-h-11 items-center gap-1.5"
        aria-label={t("yas.backToYasApp", "Retour à AutoNex")}
      >
        <img src={autonexLogo} alt="AutoNex" className="h-5 w-auto" />
        <span className="text-xs text-muted-foreground" aria-hidden>
          ×
        </span>
        <img
          src={yasMoiLogo}
          alt={t("yas.partnerLogoAlt", "YAS & Moi")}
          className="h-4 w-auto"
        />
      </Link>
    </header>
  );
}
