import * as Sentry from "@sentry/react";
import { supabase } from "@/integrations/supabase/client";
import type { YasContext } from "@/features/yas-app/hooks/useYasContext";

/**
 * Tracking événements YAS — wrapper léger, *silencieux*.
 *
 * Pour le MVP, le scope est strictement les événements émis depuis `/yas-app`
 * lui-même (mount + clics CTA). L'instrumentation des pages destination
 * (recherche, listing, publish, payment) est différée à un sprint ultérieur.
 *
 * Comportement :
 * - En dev : `console.debug` pour vérification rapide.
 * - En prod : INSERT silencieux dans `yas_tracking_events` via Supabase. Si
 *   la table n'existe pas encore, le INSERT échoue silencieusement (try/catch
 *   no-op) → aucun blocage UI, aucune erreur visible côté utilisateur.
 *
 * SQL à appliquer manuellement (pas de migration auto-appliquée) :
 *
 *   CREATE TABLE IF NOT EXISTS public.yas_tracking_events (
 *     id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 *     event_name  text NOT NULL,
 *     source      text NOT NULL DEFAULT 'yas',
 *     medium      text NOT NULL DEFAULT 'app',
 *     campaign    text NOT NULL DEFAULT 'yas_moi_autonex',
 *     embedded    boolean NOT NULL DEFAULT false,
 *     platform    text,
 *     entry_point text,
 *     listing_id  uuid,
 *     user_id     uuid,
 *     session_id  text NOT NULL,
 *     payload     jsonb NOT NULL DEFAULT '{}'::jsonb,
 *     created_at  timestamptz NOT NULL DEFAULT now()
 *   );
 *
 *   ALTER TABLE public.yas_tracking_events ENABLE ROW LEVEL SECURITY;
 *
 *   -- INSERT permissif (anon + authenticated) : pas de PII sensible, fire-and-forget.
 *   DROP POLICY IF EXISTS "yas_tracking_events_insert_anyone" ON public.yas_tracking_events;
 *   CREATE POLICY "yas_tracking_events_insert_anyone"
 *     ON public.yas_tracking_events
 *     FOR INSERT
 *     TO anon, authenticated
 *     WITH CHECK (true);
 *
 *   -- Aucune policy SELECT : lecture réservée au service_role (bypasse RLS
 *   -- par défaut). Toute analyse admin se fait côté serveur ou via SQL Editor
 *   -- avec service role key. Pas d'accès public ni authenticated en lecture.
 *
 *   CREATE INDEX IF NOT EXISTS yas_tracking_events_event_name_idx
 *     ON public.yas_tracking_events (event_name);
 *   CREATE INDEX IF NOT EXISTS yas_tracking_events_created_at_idx
 *     ON public.yas_tracking_events (created_at DESC);
 */

export type YasEventName =
  | "yas_autonex_open"
  | "yas_action_buy_click"
  | "yas_action_sell_click"
  | "yas_action_estimate_click"
  | "yas_action_deals_click"
  | "yas_featured_deal_click"
  | "yas_publish_cta_click";

export type YasEventPayload = Record<string, string | number | boolean | null>;

const isDev =
  typeof import.meta !== "undefined" && import.meta.env && import.meta.env.DEV === true;

export function trackYasEvent(
  eventName: YasEventName,
  context: YasContext,
  extra: YasEventPayload = {},
): void {
  const row = {
    event_name: eventName,
    source: context.source ?? "yas",
    medium: "app",
    campaign: "yas_moi_autonex",
    embedded: context.isEmbedded,
    platform: context.platform,
    entry_point: context.entryPoint,
    session_id: context.sessionId,
    payload: extra as Record<string, unknown>,
  };

  if (isDev) {
    console.debug("[yas-tracking]", eventName, row);
  }

  // Fire-and-forget : aucune erreur ne doit remonter à l'UI. La table peut ne
  // pas exister encore — on swallow tout. Le cast `as never` désactive la
  // vérification de typegen Supabase pour cette table optionnelle (les types
  // seront régénérés une fois la table créée manuellement par Ali).
  try {
    void (supabase.from("yas_tracking_events" as never) as unknown as {
      insert: (r: typeof row) => Promise<unknown>;
    })
      .insert(row)
      .then(
        () => {
          /* silent success */
        },
        (error: unknown) => {
          // Visibilité observabilité : on ne casse pas l'UI mais on dépose un
          // breadcrumb Sentry pour pouvoir diagnostiquer post-launch (table
          // manquante, RLS bug, network down). En dev, on log en console pour
          // feedback immédiat. Si Sentry n'est pas init au runtime,
          // `addBreadcrumb` est no-op safe.
          if (isDev) {
            console.error("[yas-tracking] insert failed", { eventName, error });
          } else {
            Sentry.addBreadcrumb({
              category: "yas-tracking",
              level: "warning",
              message: "yas_tracking_events insert failed",
              data: {
                event_name: eventName,
                error_message: error instanceof Error ? error.message : String(error),
              },
            });
          }
        },
      );
  } catch {
    /* silent */
  }
}
