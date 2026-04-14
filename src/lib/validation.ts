import { parsePhoneNumberFromString, type CountryCode } from "libphonenumber-js";
import { z } from "zod";

const EMAIL_MAX = 255;
const NAME_MAX = 100;
const PHONE_MAX = 30;
const MESSAGE_MAX = 1000;

/** Pays par défaut pour les numéros saisis au format national (ex. 034…). */
const DEFAULT_PHONE_COUNTRY: CountryCode = "MG";

const PHONE_INVALID_MSG =
  "Numéro invalide. Utilisez le format international avec indicatif (+261…, +33…, etc.) ou un numéro local à Madagascar.";

const nonEmptyTrimmed = (max: number) =>
  z
    .string()
    .transform((v) => v.trim())
    .refine((v) => v.length > 0, { message: "Champ requis" })
    .refine((v) => v.length <= max, { message: "Valeur trop longue" });

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email("Email invalide")
  .max(EMAIL_MAX, "Email invalide");

function parseToE164(raw: string): string | null {
  const trimmed = raw.trim();
  if (trimmed.length === 0) return null;
  if (trimmed.length > PHONE_MAX) return null;
  const parsed = parsePhoneNumberFromString(trimmed, DEFAULT_PHONE_COUNTRY);
  if (!parsed?.isValid()) return null;
  const e164 = parsed.format("E.164");
  if (e164.length > PHONE_MAX) return null;
  return e164;
}

/** Téléphone obligatoire — saisie libre (espaces, tirets), normalisé en E.164 si valide. */
export const mgPhoneSchema = z
  .string()
  .transform((v) => v.trim())
  .refine((v) => v.length > 0, { message: "Champ requis" })
  .refine((v) => parseToE164(v) !== null, { message: PHONE_INVALID_MSG })
  .transform((v) => parseToE164(v)!);

/** Téléphone optionnel (WhatsApp, etc.) — chaîne vide acceptée, sinon validation internationale. */
export const optionalMgPhoneSchema = z
  .string()
  .transform((v) => v.trim())
  .refine((v) => v.length === 0 || parseToE164(v) !== null, { message: PHONE_INVALID_MSG })
  .transform((v) => (v.length === 0 ? "" : parseToE164(v)!));

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(8, "Le mot de passe doit contenir au moins 8 caractères"),
});

export const signupCommonSchema = z.object({
  email: emailSchema,
  phone: mgPhoneSchema,
  password: z.string().min(8, "Le mot de passe doit contenir au moins 8 caractères"),
  passwordConfirm: z.string().min(8, "Le mot de passe doit contenir au moins 8 caractères"),
});

export const contactLeadSchema = z
  .object({
    name: z.string().trim().max(NAME_MAX, "Nom trop long"),
    email: z.string().trim(),
    phone: z.string().trim(),
    message: z.string().trim().max(MESSAGE_MAX, "Message trop long"),
  })
  .superRefine((val, ctx) => {
    if (!val.name && !val.email && !val.phone) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Renseignez au moins un contact (nom, email ou téléphone).",
        path: ["name"],
      });
    }
    if (val.email) {
      const parsed = emailSchema.safeParse(val.email);
      if (!parsed.success) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Email invalide",
          path: ["email"],
        });
      }
    }
    if (val.phone) {
      const parsed = optionalMgPhoneSchema.safeParse(val.phone);
      if (!parsed.success) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: PHONE_INVALID_MSG,
          path: ["phone"],
        });
      }
    }
  })
  .transform((val) => {
    if (!val.phone) return val;
    const e164 = parseToE164(val.phone);
    return e164 ? { ...val, phone: e164 } : val;
  });

export const agencyFormSchema = z.object({
  agencyName: nonEmptyTrimmed(120),
  agencyAddress: nonEmptyTrimmed(500),
  commercialContact: nonEmptyTrimmed(100),
  nif: nonEmptyTrimmed(64),
  stat: nonEmptyTrimmed(64),
  regCommerce: nonEmptyTrimmed(64),
});
