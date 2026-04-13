import { z } from "zod";

const EMAIL_MAX = 255;
const NAME_MAX = 100;
const PHONE_MAX = 30;
const MESSAGE_MAX = 1000;

const mgPhoneRegex = /^(?:\+?261|0)\s*3[2-9](?:[\s.-]?\d){7}$/;

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

export const mgPhoneSchema = z
  .string()
  .transform((v) => v.trim())
  .refine((v) => mgPhoneRegex.test(v), {
    message: "Numéro invalide (format Madagascar attendu)",
  });

export const optionalMgPhoneSchema = z
  .string()
  .transform((v) => v.trim())
  .refine((v) => v.length === 0 || mgPhoneRegex.test(v), {
    message: "Numéro invalide (format Madagascar attendu)",
  });

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
          message: "Numéro invalide (format Madagascar attendu)",
          path: ["phone"],
        });
      }
    }
  });

export const agencyFormSchema = z.object({
  agencyName: nonEmptyTrimmed(120),
  agencyAddress: nonEmptyTrimmed(500),
  commercialContact: nonEmptyTrimmed(100),
  nif: nonEmptyTrimmed(64),
  stat: nonEmptyTrimmed(64),
  regCommerce: nonEmptyTrimmed(64),
});

