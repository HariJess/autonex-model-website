import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Upload un fichier vers le bucket privé `verifications`.
 *
 * Convention path : `{user_id}/{session_id}/{doc_type}.{ext}` — alignée
 * avec les RLS storage policies (`name LIKE auth.uid()::text || '/%'`).
 *
 * `session_id` est un UUID généré client-side AVANT submit (persisté dans
 * localStorage pour resume après refresh navigateur). Permet de regrouper
 * les 3 docs d'une même submission dans un sous-dossier dédié.
 *
 * `upsert: true` autorise l'utilisateur à re-uploader le même doc s'il
 * change d'avis avant submit. Cleanup orphans = backlog V2.
 */

export type VerificationDocType = "cin_front" | "cin_back" | "selfie";

export type UploadVerificationFileInput = {
  file: File;
  sessionId: string;
  docType: VerificationDocType;
  userId: string;
};

export type UploadVerificationFileResult = {
  path: string;
};

const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
]);

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

export function validateVerificationFile(file: File): string | null {
  if (!ALLOWED_MIME.has(file.type)) return "verification.errors.fileType";
  if (file.size > MAX_BYTES) return "verification.errors.fileSize";
  return null;
}

function extFromFile(file: File): string {
  const fromName = file.name.split(".").pop()?.toLowerCase();
  if (fromName && /^[a-z0-9]+$/.test(fromName)) return fromName;
  if (file.type === "image/jpeg") return "jpg";
  if (file.type === "image/png") return "png";
  if (file.type === "image/webp") return "webp";
  if (file.type === "application/pdf") return "pdf";
  return "bin";
}

export function useUploadVerificationFile() {
  return useMutation<UploadVerificationFileResult, Error, UploadVerificationFileInput>({
    mutationFn: async ({ file, sessionId, docType, userId }) => {
      const validationKey = validateVerificationFile(file);
      if (validationKey) throw new Error(validationKey);
      const ext = extFromFile(file);
      const path = `${userId}/${sessionId}/${docType}.${ext}`;
      const { error } = await supabase.storage
        .from("verifications")
        .upload(path, file, { upsert: true, cacheControl: "3600" });
      if (error) {
        // Privacy : pas de path complet dans le message remonté à Sentry.
        // Le useMutation onError consumer mappe vers `verification.errors.uploadFailed`.
        throw new Error("verification.errors.uploadFailed");
      }
      return { path };
    },
  });
}
