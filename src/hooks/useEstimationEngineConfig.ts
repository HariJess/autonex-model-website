// Hook React Query : lit le feature flag `estimation_engine_version` depuis
// `public.app_config` pour décider si une requête d'estimation passe par le
// moteur legacy (calcul client) ou v2 (Edge Function `compute-estimation`).
//
// Mode :
//   - "legacy" : tout le monde reste sur le moteur client (défaut sécurisé)
//   - "v2"     : tout le monde sur Edge Function
//   - "rollout": un pourcentage du trafic part en v2, déterminé par hash stable
//                du requestId — un même requestId tombera toujours du même côté.
//                Une liste explicite `v2_enabled_for_users` permet de forcer
//                certains user IDs (canary, test interne).
//
// La table `app_config` n'apparaît pas encore dans `Database` (les types sont
// regénérés après application de la migration). On caste le client au minimum
// pour éviter une erreur TypeScript bloquante. Une fois les types regénérés,
// ces casts pourront être retirés.

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type EstimationEngineMode = "legacy" | "v2" | "rollout";

export interface EstimationEngineConfig {
  mode: EstimationEngineMode;
  rollout_pct: number;
  v2_enabled_for_users: string[];
}

const DEFAULT_CONFIG: EstimationEngineConfig = {
  mode: "legacy",
  rollout_pct: 0,
  v2_enabled_for_users: [],
};

const APP_CONFIG_KEY = "estimation_engine_version";

export const ESTIMATION_ENGINE_CONFIG_QUERY_KEY = ["app_config", APP_CONFIG_KEY] as const;

export function useEstimationEngineConfig() {
  return useQuery<EstimationEngineConfig>({
    queryKey: ESTIMATION_ENGINE_CONFIG_QUERY_KEY,
    queryFn: async () => {
      // Cast minimal : `app_config` n'existe pas encore dans `Database`.
      const { data, error } = await (
        supabase as unknown as {
          from: (table: string) => {
            select: (cols: string) => {
              eq: (col: string, val: string) => {
                maybeSingle: () => Promise<{
                  data: { value: Partial<EstimationEngineConfig> } | null;
                  error: { message: string } | null;
                }>;
              };
            };
          };
        }
      )
        .from("app_config")
        .select("value")
        .eq("key", APP_CONFIG_KEY)
        .maybeSingle();
      if (error || !data) return DEFAULT_CONFIG;
      return { ...DEFAULT_CONFIG, ...(data.value ?? {}) } as EstimationEngineConfig;
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: 1,
  });
}

/**
 * Détermine si une requête doit passer par v2 selon la config courante.
 * Le requestId fournit une répartition pseudo-aléatoire mais déterministe
 * pour un mode rollout (utile pour reproductibilité côté QA).
 */
export function shouldUseV2Engine(
  config: EstimationEngineConfig,
  userId: string | null,
  requestId: string,
): boolean {
  if (config.mode === "legacy") return false;
  if (config.mode === "v2") return true;
  // mode "rollout"
  if (userId && config.v2_enabled_for_users.includes(userId)) return true;
  if (config.rollout_pct <= 0) return false;
  if (config.rollout_pct >= 100) return true;
  const hash = simpleHash(requestId);
  return hash % 100 < config.rollout_pct;
}

function simpleHash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}
