import type { InputHTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/utils";

type FilledInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "prefix"> & {
  label: string;
  hint?: string;
  prefix?: ReactNode;
  suffix?: ReactNode;
  wrapperClassName?: string;
};

export function FilledInput({
  label,
  hint,
  prefix,
  suffix,
  className,
  wrapperClassName,
  ...props
}: FilledInputProps) {
  return (
    <label className={cn("block space-y-2", wrapperClassName)}>
      <span className="block text-xs font-medium uppercase tracking-[0.2em] text-on-surface-variant">
        {label}
      </span>
      <span className="flex min-h-14 items-center gap-3 rounded-[1.25rem] bg-surface-container-lowest px-4 text-on-surface ring-1 ring-white/5 transition focus-within:ring-primary/40">
        {prefix ? <span className="text-on-surface-variant">{prefix}</span> : null}
        <input
          className={cn(
            "w-full border-none bg-transparent text-sm text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none",
            className,
          )}
          {...props}
        />
        {suffix ? <span className="text-on-surface-variant">{suffix}</span> : null}
      </span>
      {hint ? <span className="block text-xs text-on-surface-variant">{hint}</span> : null}
    </label>
  );
}
