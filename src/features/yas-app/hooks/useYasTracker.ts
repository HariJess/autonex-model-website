import { useEffect, useRef } from "react";
import { useYasContext } from "@/features/yas-app/hooks/useYasContext";
import {
  trackYasEvent,
  type YasEventName,
  type YasEventPayload,
} from "@/features/yas-app/lib/yasTracking";

/**
 * Helper pour les pages destination qui veulent tracker un event au mount,
 * UNIQUEMENT en mode embedded YAS, et UNE SEULE FOIS par mount.
 *
 * Usage typique dans une page :
 *   useYasTrackerOnMount("yas_listing_view", { listing_id: id });
 *
 * Le payload peut être null/undefined si pas de data à attacher.
 * Si `!isEmbedded`, le hook ne fire rien.
 *
 * Ref-based "fired once" : protège contre les re-renders et StrictMode
 * double-mount en dev. Le payload initial est figé via une ref pour éviter
 * que le hook re-fire si la prop change après le 1er render (race rare,
 * mais on veut un event unique au mount logique).
 */
export function useYasTrackerOnMount(
  eventName: YasEventName,
  payload?: YasEventPayload | null,
): void {
  const yas = useYasContext();
  const fired = useRef(false);
  const payloadRef = useRef(payload);
  payloadRef.current = payload;

  useEffect(() => {
    if (!yas.isEmbedded) return;
    if (fired.current) return;
    fired.current = true;
    trackYasEvent(eventName, yas, payloadRef.current ?? {});
    // Volontairement avec deps figées : le tracker fire UNE FOIS au mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

/**
 * Helper pour fire un event tracking imperative (sur clic, submit, etc.)
 * en mode embedded YAS uniquement. Si `!isEmbedded`, no-op safe.
 *
 * Retourne une fonction qui prend un payload optionnel.
 *
 * Usage :
 *   const trackContact = useYasTracker("yas_seller_contact_click");
 *   onClick={() => trackContact({ listing_id: id })}
 */
export function useYasTracker(
  eventName: YasEventName,
): (payload?: YasEventPayload | null) => void {
  const yas = useYasContext();
  return (payload?: YasEventPayload | null): void => {
    if (!yas.isEmbedded) return;
    trackYasEvent(eventName, yas, payload ?? {});
  };
}
