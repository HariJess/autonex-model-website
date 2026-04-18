import type { MutableRefObject } from "react";
import { useEffect } from "react";
import { useDebouncedCallback } from "@/hooks/useDebouncedCallback";

export type PublishDraftLifecycleOptions = {
  persistDraft: (stepOverride?: number) => Promise<boolean>;
  draftHydrated: boolean;
  draftListingId: string | null;
  userId: string | undefined;
  isPublishedListingEdit: boolean;
  progressFingerprint: string;
  fingerprintInitializedRef: MutableRefObject<boolean>;
  lastPersistedFingerprintRef: MutableRefObject<string>;
  /** Objet mémoïsé : tout changement déclenche l’autosave debouncé (équivalent aux deps listées individuellement avant refactor). */
  draftAutosaveSignal: unknown;

  hasUnsavedMeaningfulChanges: boolean;
  onBeforeUnloadBackup: () => void;

  exitBypassRef: MutableRefObject<boolean>;
  userIdForCleanup: string | undefined;
  draftListingIdForCleanup: string | null;
  isPublishedListingEditForCleanup: boolean;
  hasMeaningfulDraftProgress: boolean;
  deleteCurrentDraft: () => Promise<boolean>;
};

/**
 * Autosave debouncé, initialisation fingerprint « dernier état sauvé », flush à la fermeture d’onglet,
 * backup avant `beforeunload`, suppression brouillon vide au démontage si sans contenu.
 */
export function usePublishDraftLifecycle(opts: PublishDraftLifecycleOptions): void {
  const {
    persistDraft,
    draftHydrated,
    draftListingId,
    userId,
    isPublishedListingEdit,
    progressFingerprint,
    fingerprintInitializedRef,
    lastPersistedFingerprintRef,
    draftAutosaveSignal,
    hasUnsavedMeaningfulChanges,
    onBeforeUnloadBackup,
    exitBypassRef,
    userIdForCleanup,
    draftListingIdForCleanup,
    isPublishedListingEditForCleanup,
    hasMeaningfulDraftProgress,
    deleteCurrentDraft,
  } = opts;

  const debouncedPersist = useDebouncedCallback(() => {
    void persistDraft();
  }, 1000);

  useEffect(() => {
    if (!draftHydrated || !draftListingId || !userId) return;
    if (isPublishedListingEdit) return;
    debouncedPersist();
  }, [
    debouncedPersist,
    draftHydrated,
    draftListingId,
    userId,
    isPublishedListingEdit,
    draftAutosaveSignal,
  ]);

  useEffect(() => {
    if (!draftHydrated || !draftListingId || !userId) return;
    if (fingerprintInitializedRef.current) return;
    lastPersistedFingerprintRef.current = progressFingerprint;
    fingerprintInitializedRef.current = true;
  }, [draftHydrated, draftListingId, userId, progressFingerprint]);

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === "hidden" && draftListingId && userId) {
        void persistDraft();
      }
    };
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (hasUnsavedMeaningfulChanges) {
        event.preventDefault();
        event.returnValue = "";
      }
      if (draftListingId && userId) {
        try {
          onBeforeUnloadBackup();
        } catch {
          /* ignore */
        }
      }
    };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("beforeunload", onBeforeUnload);
    };
  }, [
    draftListingId,
    userId,
    hasUnsavedMeaningfulChanges,
    persistDraft,
    onBeforeUnloadBackup,
  ]);

  useEffect(() => {
    return () => {
      if (exitBypassRef.current) return;
      if (!userIdForCleanup || !draftListingIdForCleanup || isPublishedListingEditForCleanup) return;
      if (hasMeaningfulDraftProgress) return;
      void deleteCurrentDraft();
    };
  }, [
    exitBypassRef,
    userIdForCleanup,
    draftListingIdForCleanup,
    isPublishedListingEditForCleanup,
    hasMeaningfulDraftProgress,
    deleteCurrentDraft,
  ]);
}
