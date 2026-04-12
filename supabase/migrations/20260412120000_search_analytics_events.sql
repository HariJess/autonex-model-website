-- Anonymized search signals for market intelligence (quartiers, no-result, etc.)
CREATE TABLE IF NOT EXISTS public.search_analytics_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  session_id text,
  ville text,
  quartiers text[],
  quartier_libre text,
  transaction_type text,
  property_types text[],
  price_min bigint,
  price_max bigint,
  surface_min integer,
  surface_max integer,
  rooms integer[],
  bathrooms integer[],
  equipments text[],
  exact_result_count integer NOT NULL DEFAULT 0,
  had_zero_exact boolean NOT NULL DEFAULT false,
  showed_similar_fallback boolean NOT NULL DEFAULT false,
  showed_also_like boolean NOT NULL DEFAULT false,
  path text
);

CREATE INDEX IF NOT EXISTS idx_search_analytics_created_at ON public.search_analytics_events (created_at DESC);

ALTER TABLE public.search_analytics_events ENABLE ROW LEVEL SECURITY;

-- Inserts: anonymous + logged-in users (session_id is not PII by itself)
CREATE POLICY "search_analytics_insert_anon_auth"
  ON public.search_analytics_events
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Reads: admins only (back-office / future BI)
CREATE POLICY "search_analytics_select_admin"
  ON public.search_analytics_events
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles pr
      WHERE pr.id = auth.uid() AND pr.role = 'admin'
    )
  );

COMMENT ON TABLE public.search_analytics_events IS 'Product analytics: search filters and outcome counts (no personal data).';
