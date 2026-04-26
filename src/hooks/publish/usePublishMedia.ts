import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { User } from "@supabase/supabase-js";
import { toast } from "sonner";
import {
  deleteListingPhotoRow,
  fetchListingPhotos,
  setPhotoCoverFirst,
  uploadListingPhoto,
  type ServerPhoto,
} from "@/lib/publishDraft";

/**
 * Photos serveur + fichiers locaux en attente, uploads et réordonnancement couverture.
 * Isolé pour garder `PublishPage` lisible ; comportement aligné sur l’implémentation précédente.
 */
export function usePublishMedia(draftListingId: string | null, user: User | null) {
  const { t } = useTranslation();
  const [serverPhotos, setServerPhotos] = useState<ServerPhoto[]>([]);
  const [pendingPhotos, setPendingPhotos] = useState<{ file: File; preview: string }[]>([]);
  const serverPhotosRef = useRef<ServerPhoto[]>([]);
  const pendingUploadInFlightRef = useRef(false);

  useEffect(() => {
    serverPhotosRef.current = serverPhotos;
  }, [serverPhotos]);

  useEffect(() => {
    return () => {
      pendingPhotos.forEach((p) => URL.revokeObjectURL(p.preview));
    };
  }, [pendingPhotos]);

  const flushPendingPhotosToServer = useCallback(async (): Promise<{ uploaded: number; failed: number }> => {
    if (!draftListingId || pendingPhotos.length === 0) return { uploaded: 0, failed: 0 };
    if (pendingUploadInFlightRef.current) return { uploaded: 0, failed: 0 };

    pendingUploadInFlightRef.current = true;
    const batch = [...pendingPhotos];
    const successPreviews = new Set<string>();
    let failed = 0;
    let nextPosition = serverPhotosRef.current.length;

    try {
      for (const row of batch) {
        try {
          const photo = await uploadListingPhoto(draftListingId, row.file, nextPosition);
          nextPosition += 1;
          successPreviews.add(row.preview);
          serverPhotosRef.current = [...serverPhotosRef.current, photo];
          setServerPhotos((prev) => [...prev, photo]);
        } catch {
          failed += 1;
        }
      }
    } finally {
      setPendingPhotos((prev) => prev.filter((row) => !successPreviews.has(row.preview)));
      successPreviews.forEach((preview) => URL.revokeObjectURL(preview));
      pendingUploadInFlightRef.current = false;
    }

    return { uploaded: successPreviews.size, failed };
  }, [draftListingId, pendingPhotos]);

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const all = Array.from(e.target.files);
    // Audit fix M-PHOTOS-CAP : on cap sur le TOTAL (déjà sélectionnées +
    // nouvelles), pas seulement la batch courante. Sans ça, un user qui fait
    // 8 puis 5 finit avec 13 photos même si l'i18n promet "max 10 par annonce".
    const remaining = Math.max(0, 10 - pendingPhotos.length);
    const files = all.slice(0, remaining);
    const rejectedCount = all.length - files.length;
    if (rejectedCount > 0) {
      toast.warning(t("publish.maxPhotosWarning", { count: rejectedCount }));
    }
    // Audit fix M-INPUT-RESET : sans ce reset, re-sélectionner les MÊMES
    // fichiers ne déclenche pas onChange (la value de l'input n'a pas
    // changé). Posé AVANT l'early return pour couvrir aussi le cas
    // "déjà 10 photos, tout rejeté" — sinon le bug persiste pile dans le
    // scénario qui motive ce fix.
    e.target.value = "";
    if (files.length === 0) return;
    setPendingPhotos((prev) => [
      ...prev,
      ...files.map((file) => ({ file, preview: URL.createObjectURL(file) })),
    ]);
  };

  const removePhotoAt = async (globalIndex: number) => {
    const nServer = serverPhotos.length;
    if (globalIndex < nServer) {
      const ph = serverPhotos[globalIndex];
      try {
        await deleteListingPhotoRow(ph.id, ph.url);
        setServerPhotos((s) => s.filter((x) => x.id !== ph.id));
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Erreur");
      }
    } else {
      const pi = globalIndex - nServer;
      setPendingPhotos((prev) => {
        const row = prev[pi];
        if (row) URL.revokeObjectURL(row.preview);
        return prev.filter((_, i) => i !== pi);
      });
    }
  };

  const makeCoverAtIndex = async (globalIndex: number) => {
    if (!draftListingId || globalIndex <= 0) return;
    const nServer = serverPhotos.length;
    if (globalIndex < nServer) {
      try {
        await setPhotoCoverFirst(draftListingId, serverPhotos, globalIndex);
        const next = await fetchListingPhotos(draftListingId);
        setServerPhotos(next);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Erreur");
      }
    } else {
      const pendingIdx = globalIndex - nServer;
      setPendingPhotos((prev) => {
        if (pendingIdx <= 0) return prev;
        const n = [...prev];
        const [x] = n.splice(pendingIdx, 1);
        n.unshift(x);
        return n;
      });
    }
  };

  useEffect(() => {
    if (!draftListingId || pendingPhotos.length === 0 || !user) return;
    let cancelled = false;
    void (async () => {
      const { failed } = await flushPendingPhotosToServer();
      if (!cancelled && failed > 0) {
        toast.error(t("publish.uploadRetryNeeded", "Certaines photos n'ont pas pu être envoyées. Réessayez."));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [draftListingId, pendingPhotos.length, user, flushPendingPhotosToServer, t]);

  const isUploading = pendingPhotos.length > 0 && !!draftListingId && !!user;

  return {
    serverPhotos,
    setServerPhotos,
    pendingPhotos,
    serverPhotosRef,
    flushPendingPhotosToServer,
    handlePhotoSelect,
    removePhotoAt,
    makeCoverAtIndex,
    isUploading,
  };
}
