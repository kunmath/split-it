import { ChevronRight, type LucideIcon } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/** Titled group of settings rows, rendered as one rounded list with subtle dividers. */
export function SettingsSection({
  title,
  description,
  action,
  children,
  className,
  tone = "default",
}: {
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  tone?: "default" | "danger";
}) {
  return (
    <section className={cn("space-y-2", className)} aria-label={title}>
      <div className="flex items-end justify-between gap-3 px-1">
        <h2
          className={cn(
            "text-sm font-semibold",
            tone === "danger" ? "text-secondary" : "text-on-surface-variant",
          )}
        >
          {title}
        </h2>
        {action}
      </div>
      <div
        className={cn(
          "overflow-hidden rounded-3xl bg-surface-container-low",
          tone === "danger" && "ring-1 ring-secondary/15",
        )}
      >
        <div className="divide-y divide-white/[0.06]">{children}</div>
      </div>
      {description ? <p className="px-1 text-xs leading-5 text-on-surface-variant">{description}</p> : null}
    </section>
  );
}

type SettingsRowBaseProps = {
  icon?: LucideIcon;
  /** Custom leading element (avatar, etc.); takes precedence over `icon`. */
  leading?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  /** Right-aligned content (value, badge, button). */
  trailing?: ReactNode;
  /** `muted` marks an informational row that can't be acted on right now. */
  tone?: "default" | "danger" | "primary" | "muted";
  className?: string;
};

type SettingsRowProps = SettingsRowBaseProps &
  (
    | { href: string; onClick?: never; disabled?: never; external?: boolean }
    | { onClick: () => void; href?: never; disabled?: boolean; external?: never }
    | { href?: never; onClick?: never; disabled?: never; external?: never }
  );

const rowClass =
  "flex min-h-14 w-full items-center gap-3 px-4 py-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/60";

export function SettingsRow(props: SettingsRowProps) {
  const { icon: Icon, leading, title, description, trailing, tone = "default", className } = props;
  const isInteractive = props.href !== undefined || props.onClick !== undefined;

  const content = (
    <>
      {leading ??
        (Icon ? (
          <span
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
              tone === "danger" && "bg-secondary/12 text-secondary",
              tone === "primary" && "bg-primary/12 text-primary",
              (tone === "default" || tone === "muted") && "bg-white/[0.05] text-on-surface-variant",
            )}
          >
            <Icon className="h-[1.15rem] w-[1.15rem]" aria-hidden="true" />
          </span>
        ) : null)}
      <span className="min-w-0 flex-1">
        <span
          className={cn(
            "block text-[0.95rem] font-semibold leading-6",
            tone === "danger" && "text-secondary",
            tone === "muted" && "text-on-surface-variant",
            (tone === "default" || tone === "primary") && "text-on-surface",
          )}
        >
          {title}
        </span>
        {description ? (
          <span className="block text-xs leading-5 text-on-surface-variant">{description}</span>
        ) : null}
      </span>
      {trailing ? <span className="flex shrink-0 items-center gap-2">{trailing}</span> : null}
      {isInteractive ? (
        <ChevronRight className="h-4 w-4 shrink-0 text-on-surface-variant" aria-hidden="true" />
      ) : null}
    </>
  );

  if (props.href !== undefined) {
    return (
      <Link
        href={props.href}
        className={cn(rowClass, "hover:bg-white/[0.04]", className)}
        {...(props.external ? { target: "_blank", rel: "noreferrer" } : {})}
      >
        {content}
      </Link>
    );
  }

  if (props.onClick !== undefined) {
    return (
      <button
        type="button"
        onClick={props.onClick}
        disabled={props.disabled}
        className={cn(
          rowClass,
          "hover:bg-white/[0.04] active:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-transparent",
          className,
        )}
      >
        {content}
      </button>
    );
  }

  return <div className={cn(rowClass, className)}>{content}</div>;
}

/** Extra classes for a destructive `<Button variant="secondary">`. */
export const dangerButtonClass = "border-secondary/30 bg-secondary/12 text-secondary hover:bg-secondary/20";

/** Small inline status message used under settings sections and inside sheets. */
export function SettingsNotice({
  children,
  tone = "neutral",
  className,
}: {
  children: ReactNode;
  tone?: "error" | "neutral" | "success";
  className?: string;
}) {
  return (
    <div
      role={tone === "error" ? "alert" : tone === "success" ? "status" : undefined}
      className={cn(
        "rounded-2xl px-4 py-3 text-sm leading-6",
        tone === "error" && "bg-error/10 text-error",
        tone === "success" && "bg-primary/10 text-on-surface",
        tone === "neutral" && "bg-white/[0.04] text-on-surface-variant",
        className,
      )}
    >
      {children}
    </div>
  );
}
