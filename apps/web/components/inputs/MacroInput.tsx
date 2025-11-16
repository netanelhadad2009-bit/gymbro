"use client";

import * as React from "react";
import { useNumeric4 } from "@/lib/forms/numeric4";

export type MacroInputProps = {
  /** Current value (string or number) */
  value?: string | number;
  /** Callback when value changes */
  onChange: (v: string) => void;
  /** Optional label displayed above input */
  label?: string;
  /** ARIA label for accessibility */
  ariaLabel?: string;
  /** Auto focus on mount */
  autoFocus?: boolean;
  /** Additional CSS classes for the wrapper div */
  className?: string;
  /** Additional CSS classes for the input element */
  inputClassName?: string;
  /** Additional CSS classes for the label element */
  labelClassName?: string;
  /** Placeholder text */
  placeholder?: string;
  /** Optional ID for the input */
  id?: string;
};

/**
 * MacroInput - A controlled input component for macro values (calories, protein, fat, carbs).
 *
 * Features:
 * - Strictly numeric (0-9 only)
 * - Max 4 characters
 * - Mobile-optimized numeric keyboard
 * - Paste sanitization
 * - Leading zero normalization on blur
 * - Overflow warning
 *
 * @example
 * <MacroInput
 *   value={calories}
 *   onChange={setCalories}
 *   label="Calories"
 *   ariaLabel="Enter calories"
 * />
 */
export default function MacroInput({
  value = "",
  onChange,
  label,
  ariaLabel,
  autoFocus,
  className,
  inputClassName,
  labelClassName,
  placeholder,
  id,
}: MacroInputProps) {
  const {
    value: v,
    overflow,
    onChange: ch,
    onPaste,
    onBlur,
    setValue,
  } = useNumeric4(String(value ?? ""));

  // Track the previous internal value to detect actual changes
  const prevValueRef = React.useRef(v);

  // Sync external value changes (when parent updates the value)
  React.useEffect(() => {
    const normalized = String(value ?? "");
    // Only update internal state if the external value differs from our internal value
    if (normalized !== v && normalized !== prevValueRef.current) {
      setValue(normalized);
    }
  }, [value, v, setValue]);

  // Bubble up changes to parent (only when internal value actually changes)
  React.useEffect(() => {
    if (v !== prevValueRef.current) {
      prevValueRef.current = v;
      onChange(v);
    }
  }, [v]);  // Intentionally omit onChange to prevent infinite loops

  return (
    <div className={className}>
      {label && (
        <label
          htmlFor={id}
          className={
            labelClassName || "block text-xs text-muted-foreground mb-1"
          }
        >
          {label}
        </label>
      )}
      <input
        id={id}
        type="text"
        inputMode="numeric"
        pattern="\d*"
        maxLength={4}
        value={v}
        onChange={ch}
        onPaste={onPaste}
        onBlur={onBlur}
        aria-label={ariaLabel ?? label}
        aria-invalid={overflow || undefined}
        className={
          inputClassName ||
          "w-full rounded-xl bg-muted px-3 py-2 text-right outline-none active:translate-y-0.5 transition-transform duration-75"
        }
        autoFocus={autoFocus}
        placeholder={placeholder}
      />
      {overflow && (
        <p className="mt-1 text-[11px] text-muted-foreground">
          Max 4 digits (0-9999).
        </p>
      )}
    </div>
  );
}
