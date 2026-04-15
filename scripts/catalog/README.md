# Catalog Tooling Scope

This folder contains **supporting DB tooling**, not the live visible runtime source for Estimation UI selectors.

## Runtime vs tooling

- **Visible Estimation make/model runtime source:** `src/data/vehicleUiCatalog.ts`
- **Runtime loader:** `src/lib/estimation/vehicleCatalog.ts`
- **DB/import scripts role:** enrich, clean, canonicalize, and validate raw catalog data for internal support and future evolution.

## DB tables managed by these scripts

- `vehicle_catalog_makes`
- `vehicle_catalog_models`
- `vehicle_catalog_aliases`

## Important constraint

Do not wire raw imported manufacturer feeds directly into visible UI selectors without a curated UI-facing layer.

