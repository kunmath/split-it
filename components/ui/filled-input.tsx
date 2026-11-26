import type { InputHTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/utils";

type FilledInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "prefix"> & {
  label: string;
  hint?: string;
  error?: string;
  prefix?: ReactNode;
  suffix?: ReactNode;
  labelAction?: ReactNode;
  wrapperClassName?: string;
};

export function FilledInput({
  label,
  hint,
  error,
  prefix,
  suffix,
  labelAction,
  className,
  wrapperClassName,
  ...props
}: FilledInputProps) {
  return (
    <label className={cn("block space-y-1.5", wrapperClassName)}>
      <span className="flex items-center justify-between gap-3">
        <span className="block text-sm font-medium text-on-surface">{label}</span>
        {labelAction ? <span className="shrink-0">{labelAction}</span> : null}
      </span>
      <span
        className={cn(
          "flex min-h-12 items-center gap-3 rounded-2xl bg-surface-container-lowest px-4 text-on-surface ring-1 ring-white/10 transition focus-within:ring-2 focus-within:ring-primary/60",
          error && "ring-error/60 focus-within:ring-error/70",
        )}
      >
        {prefix ? <span className="text-on-surface-variant">{prefix}</span> : null}
        <input
          className={cn(
            "min-h-11 w-full border-none bg-transparent text-base text-on-surface placeholder:text-on-surface-variant/70 focus:outline-none",
            className,
          )}
          aria-invalid={error ? "true" : undefined}
          {...props}
        />
        {suffix ? <span className="text-on-surface-variant">{suffix}</span> : null}
      </span>
      {error ? <span className="block text-xs leading-5 text-error">{error}</span> : null}
      {!error && hint ? <span className="block text-xs leading-5 text-on-surface-variant">{hint}</span> : null}
    </label>
  );
}
