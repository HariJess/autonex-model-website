import { useMemo } from "react";
import { useYasContext } from "@/features/yas-app/hooks/useYasContext";
import { buildYasUrl } from "@/features/yas-app/lib/buildYasUrl";

/**
 * URL "Accueil" cohérente avec le contexte YAS :
 * - mode embedded → `/yas-app?source=yas&embedded=true[&platform=...&entry_point=...]`
 * - sinon → `/`
 *
 * Utilisé par les breadcrumbs des pages destination (SearchPage, ListingDetail,
 * BlogPages, SeoLandingPage) et par YasBackButton pour qu'un clic « Accueil »
 * en WebView YAS ramène vers la mini-app, pas vers la home AutoNex.
 */
export function useYasHomeUrl(): string {
  const { isEmbedded, source, platform, entryPoint } = useYasContext();
  return useMemo(() => {
    if (!isEmbedded) return "/";
    return buildYasUrl("/yas-app", {
      source: source ?? "yas",
      embedded: "true",
      platform,
      entry_point: entryPoint,
    });
  }, [isEmbedded, source, platform, entryPoint]);
}
