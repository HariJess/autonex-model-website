-- =====================================================================
-- Sprint Estimation Engine v2 — Sprint 1 / Chantier 1
-- Table de configuration applicative (feature flags, kill switches, paramètres tunables).
-- Lecture publique (anon/auth), écriture admin uniquement.
--
-- Idempotente : ré-exécutable sans casser la table ni les policies.
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.app_config (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;

-- Policies idempotentes : DROP IF EXISTS puis CREATE.
DROP POLICY IF EXISTS "app_config_select_public" ON public.app_config;
CREATE POLICY "app_config_select_public" ON public.app_config
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "app_config_insert_admin" ON public.app_config;
CREATE POLICY "app_config_insert_admin" ON public.app_config
  FOR INSERT WITH CHECK (public.immonex_is_admin());

DROP POLICY IF EXISTS "app_config_update_admin" ON public.app_config;
CREATE POLICY "app_config_update_admin" ON public.app_config
  FOR UPDATE USING (public.immonex_is_admin())
  WITH CHECK (public.immonex_is_admin());

DROP POLICY IF EXISTS "app_config_delete_admin" ON public.app_config;
CREATE POLICY "app_config_delete_admin" ON public.app_config
  FOR DELETE USING (public.immonex_is_admin());

-- Trigger pour maintenir updated_at à jour.
CREATE OR REPLACE FUNCTION public.app_config_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS app_config_updated_at_trg ON public.app_config;
CREATE TRIGGER app_config_updated_at_trg
  BEFORE UPDATE ON public.app_config
  FOR EACH ROW
  EXECUTE FUNCTION public.app_config_set_updated_at();

COMMENT ON TABLE public.app_config IS
  'Feature flags / kill switches / paramètres tunables. Lecture publique, écriture admin (immonex_is_admin).';
COMMENT ON COLUMN public.app_config.key IS
  'Clé canonique du flag (ex: estimation_engine_version).';
COMMENT ON COLUMN public.app_config.value IS
  'Payload JSON du flag. Forme libre selon la clé — documenter dans docs/.';

-- Seed initial : feature flag estimation engine version, désactivé par défaut.
-- mode: legacy | v2 | rollout. rollout_pct: 0-100 si mode=rollout.
-- v2_enabled_for_users: liste explicite d'user IDs forcés en v2 (test interne / canary).
INSERT INTO public.app_config (key, value, description) VALUES
  ('estimation_engine_version',
   '{"mode":"legacy","rollout_pct":0,"v2_enabled_for_users":[]}'::jsonb,
   'Contrôle quel moteur d''estimation est utilisé. mode: legacy|v2|rollout. rollout_pct: 0-100 si mode=rollout. v2_enabled_for_users: liste explicite d''user IDs forcés en v2.')
ON CONFLICT (key) DO NOTHING;
