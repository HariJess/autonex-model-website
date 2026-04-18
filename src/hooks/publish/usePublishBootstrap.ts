import type { NavigateFunction } from "react-router-dom";
import type { MutableRefObject } from "react";
import type { TFunction } from "i18next";
import { useEffect } from "react";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";
import {
  createDraftListing,
  fetchDraftListingForOwner,
  fetchListingForOwnerEdit,
  fetchListingPhotos,
  buildListingMaterialSnapshotFromRow,
  type ServerPhoto,
} from "@/lib/publishDraft";
import { removeDraft } from "@/lib/draftStorage";

export const LISTING_ID_UUID_PARAM_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type PublishBootstrapDeps = {
  userId: string | undefined;
  /** `searchParams.get("new")` */
  spNew: string | null;
  /** `searchParams.get("draft")` */
  spDraft: string | null;
  /** `searchParams.get("edit")` */
  spEdit: string | null;
  navigate: NavigateFunction;
  t: TFunction;

  setDraftHydrated: (v: boolean) => void;
  setDraftBootLoading: (v: boolean) => void;
  setSaveError: (msg: string | null) => void;
  setDraftListingId: (id: string | null) => void;
  setStep: (n: number | ((prev: number) => number)) => void;
  setServerPhotos: (photos: ServerPhoto[]) => void;
  setIsPublishedListingEdit: (v: boolean) => void;
  setListingModerationStatus: (s: string | null) => void;
  setLastSavedAt: (iso: string | null) => void;

  applyListingRowToFormState: (row: Tables<"listings">) => void;
  setDraftMode: () => void;

  exitBypassRef: MutableRefObject<boolean>;
  fingerprintInitializedRef: MutableRefObject<boolean>;
  hydratingRef: MutableRefObject<boolean>;
  baselineMaterialSnapshotRef: MutableRefObject<string>;
};

/**
 * Hydratation initiale : `?new=1`, `?draft=`, `?edit=`, ou brouillon par défaut.
 * Comportement aligné sur l’implémentation historique de `PublishPage`.
 */
export function usePublishBootstrap(deps: PublishBootstrapDeps): void {
  const {
    userId,
    spNew,
    spDraft,
    spEdit,
    navigate,
    t,
    setDraftHydrated,
    setDraftBootLoading,
    setSaveError,
    setDraftListingId,
    setStep,
    setServerPhotos,
    setIsPublishedListingEdit,
    setListingModerationStatus,
    setLastSavedAt,
    applyListingRowToFormState,
    setDraftMode,
    exitBypassRef,
    fingerprintInitializedRef,
    hydratingRef,
    baselineMaterialSnapshotRef,
  } = deps;

  useEffect(() => {
    if (!userId) {
      setDraftHydrated(true);
      setDraftBootLoading(false);
      return;
    }
    let cancelled = false;
    const run = async () => {
      setDraftBootLoading(true);
      setSaveError(null);
      exitBypassRef.current = false;
      fingerprintInitializedRef.current = false;
      try {
        const wantNew = spNew === "1";
        const draftParam = spDraft;

        if (wantNew) {
          setDraftMode();
          const id = await createDraftListing(userId);
          if (cancelled) return;
          setDraftListingId(id);
          navigate(`/publier?draft=${id}`, { replace: true });
          setStep(0);
          setDraftHydrated(true);
          return;
        }

        if (spEdit) {
          if (!LISTING_ID_UUID_PARAM_RE.test(spEdit)) {
            toast.error(t("publish.editInvalidId", "Lien de modification invalide."));
            navigate("/dashboard");
            return;
          }
          const row = await fetchListingForOwnerEdit(spEdit, userId);
          if (cancelled) return;
          if (!row) {
            toast.error(t("publish.editNotFound", "Annonce introuvable ou non modifiable."));
            navigate("/dashboard");
            return;
          }
          applyListingRowToFormState(row);
          setIsPublishedListingEdit(true);
          setListingModerationStatus(row.status);
          const photos = await fetchListingPhotos(row.id);
          if (cancelled) return;
          setServerPhotos(photos);
          baselineMaterialSnapshotRef.current = buildListingMaterialSnapshotFromRow(
            row,
            photos.map((p) => p.id),
          );
          setLastSavedAt(row.updated_at ?? row.created_at ?? null);
          navigate(`/publier?edit=${row.id}`, { replace: true });
          queueMicrotask(() => {
            hydratingRef.current = false;
          });
          setDraftHydrated(true);
          return;
        }

        if (draftParam) {
          const row = await fetchDraftListingForOwner(draftParam, userId);
          if (cancelled) return;
          if (!row) {
            // Phantom UUID: backup kept a draft id whose row no longer
            // exists server-side. Drop the local entry so subsequent
            // autosave attempts don't 406-loop on a missing row.
            removeDraft(userId, draftParam);
            toast.error(t("publish.draftNotFound", "Brouillon introuvable."));
            navigate("/dashboard");
            return;
          }
          setDraftMode();
          applyListingRowToFormState(row);
          const photos = await fetchListingPhotos(row.id);
          if (cancelled) return;
          setServerPhotos(photos);
          setLastSavedAt(row.updated_at ?? row.created_at ?? null);
          queueMicrotask(() => {
            hydratingRef.current = false;
          });
          setDraftHydrated(true);
          return;
        }

        setDraftMode();
        const id = await createDraftListing(userId);
        if (cancelled) return;
        setDraftListingId(id);
        navigate(`/publier?draft=${id}`, { replace: true });
        setDraftHydrated(true);
      } catch (e) {
        if (!cancelled) {
          setSaveError(e instanceof Error ? e.message : "Erreur");
          toast.error(e instanceof Error ? e.message : "Erreur");
          setDraftHydrated(true);
        }
      } finally {
        if (!cancelled) setDraftBootLoading(false);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [userId, spNew, spDraft, spEdit, navigate, t, applyListingRowToFormState, setDraftMode]);
}
