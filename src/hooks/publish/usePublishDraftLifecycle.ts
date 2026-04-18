import type { MutableRefObject } from "react";
import { useEffect, useRef } from "react";
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

  // --- Abandoned-draft cleanup -------------------------------------------
  // Deletes the DB row on unmount IF the user left without contributing any
  // meaningful content. Prior to this refactor, the effect listed each of
  // these values as deps, so the cleanup re-fired on every transition —
  // critically when `hasMeaningfulDraftProgress` flipped from false to true
  // (e.g. user types the 4th character of the title). React fires the OLD
  // cleanup BEFORE the new effect registers, and that old cleanup captured
  // `hasMeaningfulDraftProgress=false` at its creation time. Result: the
  // draft was deleted the moment the user's title crossed the 4-char
  // threshold, and every subsequent autosave PATCH 406'd on a phantom id
  // while photo uploads FK-failed with 400.
  //
  // Fix: mirror each value into a ref updated every render, and run the
  // effect with an empty dep array so its cleanup fires only on real
  // unmount. The cleanup reads the refs, so it always sees the LATEST
  // values — not the stale ones captured on the render that registered it.
  // In React 18 StrictMode dev double-invoke, the initial unmount fires
  // before the async createDraftListing has resolved, so
  // draftListingIdForCleanup is still null and the cleanup correctly skips.
  const hasMeaningfulRef = useRef(hasMeaningfulDraftProgress);
  hasMeaningfulRef.current = hasMeaningfulDraftProgress;

  const deleteCurrentDraftRef = useRef(deleteCurrentDraft);
  deleteCurrentDraftRef.current = deleteCurrentDraft;

  const cleanupStateRef = useRef({
    exitBypassRef,
    userIdForCleanup,
    draftListingIdForCleanup,
    isPublishedListingEditForCleanup,
  });
  cleanupStateRef.current = {
    exitBypassRef,
    userIdForCleanup,
    draftListingIdForCleanup,
    isPublishedListingEditForCleanup,
  };

  useEffect(() => {
    return () => {
      const s = cleanupStateRef.current;
      if (s.exitBypassRef.current) return;
      if (!s.userIdForCleanup || !s.draftListingIdForCleanup || s.isPublishedListingEditForCleanup) return;
      if (hasMeaningfulRef.current) return;
      void deleteCurrentDraftRef.current();
    };
    // Intentional empty deps: we want cleanup to fire ONLY on real unmount,
    // and we read latest values via refs above. Listing the values as deps
    // would re-register the effect on every render and re-fire the cleanup
    // with stale closure values — the exact bug this refactor fixes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
