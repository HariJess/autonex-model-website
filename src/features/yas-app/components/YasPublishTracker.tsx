import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useYasContext } from "@/features/yas-app/hooks/useYasContext";
import { trackYasEvent } from "@/features/yas-app/lib/yasTracking";

/**
 * Tracker route-listener pour le flow `PublishPage` qui ne touche PAS au
 * composant lui-même (garde-fou strict du Plan 3/4 : `src/pages/PublishPage.tsx`,
 * `src/pages/publish/*`, `src/components/publish/*` sont intouchables).
 *
 * Détecte via les changements de pathname / search :
 * - mount sur `/publier` → `yas_publish_started`
 * - navigation vers `/dashboard?published=...` → `yas_publish_completed`
 *   (PublishPage redirige vers `/dashboard?published=true` après succès — cf.
 *   `PublishPage.tsx:839, 939`).
 *
 * Monté UNE FOIS dans `App.tsx` à l'intérieur du `<YasProvider>`. Retourne
 * `null` (composant invisible). Gated sur `isEmbedded` : aucun event ne fire
 * pour les utilisateurs hors WebView YAS.
 *
 * Ref-based "fired once per pathname" : protège contre les re-renders et
 * garantit qu'on ne fire pas plusieurs `yas_publish_started` si la route
 * `/publier` est re-rendue (ex. updates de filters internes).
 */
export function YasPublishTracker(): null {
  const yas = useYasContext();
  const location = useLocation();
  const startedFiredRef = useRef(false);
  const completedFiredRef = useRef(false);

  useEffect(() => {
    if (!yas.isEmbedded) return;

    if (location.pathname === "/publier") {
      if (!startedFiredRef.current) {
        startedFiredRef.current = true;
        trackYasEvent("yas_publish_started", yas);
      }
      return;
    }

    // Successful publication redirects to /dashboard?published=true (or any
    // truthy value) — see PublishPage.tsx success handler.
    if (location.pathname === "/dashboard") {
      const params = new URLSearchParams(location.search);
      const published = params.get("published");
      if (published && !completedFiredRef.current) {
        completedFiredRef.current = true;
        trackYasEvent("yas_publish_completed", yas, { published_status: published });
      }
    }
  }, [location.pathname, location.search, yas]);

  return null;
}
