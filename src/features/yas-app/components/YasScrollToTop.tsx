import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useYasContext } from "@/features/yas-app/hooks/useYasContext";

/**
 * Scroll-to-top automatique en mode embedded YAS uniquement.
 *
 * React Router v6 ne reset pas le scroll au changement de route ; le site
 * normal compte sur ce comportement (filtres recherche qui préservent la
 * position, etc.) donc on ne touche pas au site normal. En mode embedded,
 * l'utilisateur YAS qui scrolle sur `/yas-app` puis clique « Acheter » doit
 * arriver en haut de `/recherche`, pas à mi-hauteur. Idem pour `#deals` qui
 * fait son propre `scrollIntoView` (l'effet ici ne déclenche pas pour les
 * ancres de la même URL : `pathname` ne change pas).
 */
export function YasScrollToTop() {
  const { pathname } = useLocation();
  const { isEmbedded } = useYasContext();

  useEffect(() => {
    if (!isEmbedded) return;
    try {
      window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });
    } catch {
      // jsdom (tests) ne supporte pas scrollTo — fallback silencieux.
    }
  }, [pathname, isEmbedded]);

  return null;
}
