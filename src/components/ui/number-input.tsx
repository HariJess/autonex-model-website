import { forwardRef, useCallback, type InputHTMLAttributes } from "react";
import { Input } from "@/components/ui/input";

/**
 * NumberInput — integer input with live French-locale thousands-separator
 * formatting ("10000000" → "10 000 000") while keeping a digits-only string
 * as the controlled value exposed via onChange.
 *
 * Cursor management: digits-only index is computed before re-formatting, then
 * mapped back to a character position in the formatted string. Editing in the
 * middle stays stable.
 *
 * Consumer stores the raw digits string in its form state. At submit time,
 * Number(raw) gives the numeric value for DB persistence.
 */

const formatWithSpaces = (digits: string): string => {
  if (!digits) return "";
  // Insert a non-breaking narrow space every 3 digits from the right
  // (regular spaces render fine on current browsers; keep ASCII for form value).
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
};

const digitsOnly = (raw: string): string => raw.replace(/\D+/g, "");

type NumberInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "value" | "onChange" | "type" | "inputMode"
> & {
  /** Controlled value — digits-only string (e.g. "10000000"). Empty for blank. */
  value: string;
  /** Receives the digits-only value (e.g. "10000000"), never the formatted string. */
  onChange: (digits: string) => void;
  /** Optional max digits to cap (default 15 — 999 trillion, safely under MAX_SAFE_INTEGER). */
  maxDigits?: number;
};

export const NumberInput = forwardRef<HTMLInputElement, NumberInputProps>(
  function NumberInput({ value, onChange, maxDigits = 15, className, ...rest }, ref) {
    const handleChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        const input = e.currentTarget;
        const beforeStr = input.value;
        const selectionStart = input.selectionStart ?? beforeStr.length;

        // Count digits before the caret (ignore spaces).
        let digitsBeforeCaret = 0;
        for (let i = 0; i < selectionStart && i < beforeStr.length; i++) {
          if (/\d/.test(beforeStr[i])) digitsBeforeCaret++;
        }

        const rawDigits = digitsOnly(beforeStr).slice(0, maxDigits);
        const formatted = formatWithSpaces(rawDigits);

        onChange(rawDigits);

        // Map the digit index back to a character offset in the formatted string.
        let newCaret = 0;
        let seen = 0;
        while (newCaret < formatted.length && seen < digitsBeforeCaret) {
          if (/\d/.test(formatted[newCaret])) seen++;
          newCaret++;
        }

        // Defer so React has written the new value first.
        requestAnimationFrame(() => {
          try {
            input.setSelectionRange(newCaret, newCaret);
          } catch {
            // Some inputs throw when selection is not applicable; safe to ignore.
          }
        });
      },
      [onChange, maxDigits],
    );

    return (
      <Input
        ref={ref}
        type="text"
        inputMode="numeric"
        value={formatWithSpaces(digitsOnly(value))}
        onChange={handleChange}
        className={className}
        {...rest}
      />
    );
  },
);

export default NumberInput;
