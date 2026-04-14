import { parsePhoneNumberFromString, type CountryCode } from "libphonenumber-js";

const DEFAULT_REGION: CountryCode = "MG";

/**
 * Builds a https://wa.me link with optional prefilled text.
 * Returns null if the phone string cannot be parsed to a valid number.
 */
export function buildWhatsAppUrl(phone: string, prefilledText: string): string | null {
  const parsed = parsePhoneNumberFromString(phone.trim(), DEFAULT_REGION);
  if (!parsed?.isValid()) return null;
  const digits = parsed.format("E.164").replace(/\D/g, "");
  if (digits.length < 8) return null;
  const text = encodeURIComponent(prefilledText);
  return `https://wa.me/${digits}?text=${text}`;
}
