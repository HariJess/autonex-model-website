/**
 * Vehicle catalog architecture contract (Estimation feature).
 *
 * Source of truth for visible make/model selection:
 * - src/data/vehicleUiCatalog.ts (curated, UI-safe passenger brands/models)
 *
 * Runtime behavior:
 * - loadVehicleCatalog() serves the curated UI catalog only.
 * - Estimation input selection is intentionally decoupled from raw DB imports.
 *
 * DB catalog role (supporting/tooling, not current runtime source):
 * - public.vehicle_catalog_makes
 * - public.vehicle_catalog_models
 * - public.vehicle_catalog_aliases
 * These tables are maintained via scripts/catalog/* for enrichment, quality, and future expansion.
 */
export const ESTIMATION_UI_CATALOG_SOURCE = "vehicleUiCatalog.ts" as const;

/** Visible runtime source identifier returned by loadVehicleCatalog(). */
export const ESTIMATION_UI_CATALOG_RUNTIME_SOURCE = "ui-curated" as const;

