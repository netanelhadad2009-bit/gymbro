/**
 * Utilities for handling numeric macro inputs with 4-character max constraint.
 * Used for calories, protein, fat, carbs inputs throughout the app.
 */

import { useCallback, useState } from "react";

/**
 * Sanitizes raw input to only contain up to 4 digits (0-9).
 * @param raw - Raw input string
 * @returns Object with sanitized text and overflow flag
 */
export function sanitizeNumeric4(raw: string): {
  text: string;
  overflow: boolean;
} {
  const digits = (raw ?? "").replace(/\D+/g, "");
  const text = digits.slice(0, 4);
  const overflow = digits.length > 4 || /\D/.test(raw ?? "");

  if (
    process.env.NEXT_PUBLIC_DEBUG_INPUTS === "1" &&
    overflow &&
    typeof window !== "undefined"
  ) {
    console.debug("[numeric4] Overflow detected:", { raw, digits, text });
  }

  return { text, overflow };
}

/**
 * Normalizes the input on blur by removing leading zeros.
 * Empty string remains empty. "0" remains "0". "0007" becomes "7".
 * @param text - The current input text
 * @returns Normalized text
 */
export function normalizeOnBlur(text: string): string {
  if (!text) return "";
  if (/^0+$/.test(text)) return "0";
  return text.replace(/^0+/, "") || "0";
}

/**
 * Hook for managing numeric input with 4-character max constraint.
 * Handles sanitization, overflow detection, paste events, and blur normalization.
 *
 * @param initial - Initial value (string or number)
 * @returns Object with value, overflow state, and event handlers
 *
 * @example
 * const { value, overflow, onChange, onPaste, onBlur } = useNumeric4("123");
 */
export function useNumeric4(initial: string | number = "") {
  const [value, setValue] = useState<string>(() => {
    const str = String(initial ?? "");
    return str.replace(/\D+/g, "").slice(0, 4);
  });
  const [overflow, setOverflow] = useState(false);

  const apply = useCallback((raw: string) => {
    const { text, overflow } = sanitizeNumeric4(raw);
    setOverflow(overflow);
    setValue(text);
  }, []);

  const onChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      apply(e.target.value);
    },
    [apply]
  );

  const onPaste = useCallback(
    (e: React.ClipboardEvent<HTMLInputElement>) => {
      e.preventDefault();
      const data = e.clipboardData.getData("text");
      apply(data);
    },
    [apply]
  );

  const onBlur = useCallback(() => {
    setValue((v) => normalizeOnBlur(v));
    setOverflow(false); // Clear overflow state on blur
  }, []);

  return { value, overflow, onChange, onPaste, onBlur, setValue };
}
