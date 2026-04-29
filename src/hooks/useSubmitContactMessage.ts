import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type ContactSubject = "general" | "technical" | "dealers" | "partnerships" | "other";

export type SubmitContactMessageInput = {
  fullName: string;
  email: string;
  whatsappPhone?: string;
  subject: ContactSubject;
  message: string;
  consentGiven: boolean;
};

export type SubmitContactErrorCode =
  | "consent_required"
  | "invalid_subject"
  | "rate_limit_exceeded"
  | "unknown";

export class SubmitContactError extends Error {
  code: SubmitContactErrorCode;
  constructor(code: SubmitContactErrorCode, message?: string) {
    super(message ?? code);
    this.code = code;
  }
}

const KNOWN_CODES: readonly SubmitContactErrorCode[] = [
  "consent_required",
  "invalid_subject",
  "rate_limit_exceeded",
];

export function normalizeSubmitContactError(raw: unknown): SubmitContactError {
  const message = raw instanceof Error ? raw.message : String(raw ?? "");
  const hit = KNOWN_CODES.find((code) => message.includes(code));
  return new SubmitContactError(hit ?? "unknown", message);
}

type ContactErrorTFn = (key: string, defaultValue: string) => string;
const passthroughContactT: ContactErrorTFn = (_k, defaultValue) => defaultValue;

export function submitContactErrorMessage(
  code: SubmitContactErrorCode,
  t: ContactErrorTFn = passthroughContactT,
): string {
  switch (code) {
    case "consent_required":
      return t("contact.errors.consentRequired", "Vous devez accepter la politique de confidentialité.");
    case "invalid_subject":
      return t("contact.errors.invalidSubject", "Sujet invalide.");
    case "rate_limit_exceeded":
      return t("contact.errors.rateLimitExceeded", "Vous avez soumis trop de messages récemment. Merci de patienter une heure avant de réessayer.");
    default:
      return t("contact.errors.unknown", "Une erreur est survenue. Veuillez réessayer.");
  }
}

/**
 * Fire-and-forget call to the send-contact-email Edge Function. A delivery
 * failure never propagates to the user — the message is already persisted
 * in contact_messages and Ali can check it manually. The Edge Function is
 * expected at the standard Supabase path `/functions/v1/send-contact-email`.
 */
async function triggerContactEmail(messageId: string): Promise<void> {
  try {
    await supabase.functions.invoke("send-contact-email", {
      body: { message_id: messageId },
    });
  } catch {
    /* silent */
  }
}

export function useSubmitContactMessage() {
  return useMutation<{ messageId: string }, SubmitContactError, SubmitContactMessageInput>({
    mutationFn: async (input) => {
      const { data, error } = await supabase.rpc("submit_contact_message", {
        p_full_name: input.fullName,
        p_email: input.email,
        p_subject: input.subject,
        p_message: input.message,
        p_consent_given: input.consentGiven,
        p_whatsapp_phone: input.whatsappPhone?.trim() ? input.whatsappPhone.trim() : undefined,
      });
      if (error) throw normalizeSubmitContactError(error);

      const payload = (data ?? {}) as { success?: boolean; message_id?: string };
      const messageId = payload.message_id;
      if (!messageId) {
        throw normalizeSubmitContactError(new Error("missing_message_id"));
      }

      void triggerContactEmail(messageId);
      return { messageId };
    },
  });
}
