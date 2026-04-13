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
    <label className={cn("block space-y-2", wrapperClassName)}>
      <span className="flex items-center justify-between gap-3">
        <span className="block text-xs font-medium uppercase tracking-[0.2em] text-on-surface-variant">
          {label}
        </span>
        {labelAction ? <span className="shrink-0">{labelAction}</span> : null}
      </span>
      <span
        className={cn(
          "flex min-h-14 items-center gap-3 rounded-[1.25rem] bg-surface-container-lowest px-4 text-on-surface ring-1 ring-white/5 transition focus-within:ring-primary/40",
          error && "ring-error/50 focus-within:ring-error/60",
        )}
      >
        {prefix ? <span className="text-on-surface-variant">{prefix}</span> : null}
        <input
          className={cn(
            "w-full border-none bg-transparent text-sm text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none",
            className,
          )}
          aria-invalid={error ? "true" : undefined}
          {...props}
        />
        {suffix ? <span className="text-on-surface-variant">{suffix}</span> : null}
      </span>
      {error ? <span className="block text-xs text-error">{error}</span> : null}
      {!error && hint ? <span className="block text-xs text-on-surface-variant">{hint}</span> : null}
    </label>
  );
}
