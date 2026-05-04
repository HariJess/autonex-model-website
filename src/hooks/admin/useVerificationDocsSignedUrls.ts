import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type VerificationDocPaths = {
  id: string;
  cin_front_path: string;
  cin_back_path: string;
  selfie_path: string;
};

export type VerificationSignedUrls = {
  cin_front: string | null;
  cin_back: string | null;
  selfie: string | null;
};

const SIGNED_URL_TTL_SEC = 3600; // 1h
const STALE_TIME_MS = 50 * 60_000; // 50min — refresh avant TTL expiry

/**
 * Génère 3 signed URLs pour le bucket privé `verifications`.
 * Admin-only via RLS storage policy `admins_read_all_verif_files`.
 *
 * Privacy : aucun path complet n'est journalisé. Si une URL fail, on
 * retourne null sur ce slot, le drawer affiche un placeholder broken.
 */
export function useVerificationDocsSignedUrls(verification: VerificationDocPaths | null) {
  return useQuery<VerificationSignedUrls>({
    queryKey: ["verification-signed-urls", verification?.id ?? null],
    enabled: !!verification,
    staleTime: STALE_TIME_MS,
    gcTime: STALE_TIME_MS,
    queryFn: async () => {
      if (!verification) {
        return { cin_front: null, cin_back: null, selfie: null };
      }
      const paths = [
        verification.cin_front_path,
        verification.cin_back_path,
        verification.selfie_path,
      ];
      const results = await Promise.all(
        paths.map((p) =>
          supabase.storage.from("verifications").createSignedUrl(p, SIGNED_URL_TTL_SEC),
        ),
      );
      return {
        cin_front: results[0]?.data?.signedUrl ?? null,
        cin_back: results[1]?.data?.signedUrl ?? null,
        selfie: results[2]?.data?.signedUrl ?? null,
      };
    },
  });
}
