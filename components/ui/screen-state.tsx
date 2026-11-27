import {
  AlertTriangle,
  FolderOpen,
  LoaderCircle,
  SearchX,
} from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

import { SurfaceCard } from "./surface-card";

type ScreenStateKind = "loading" | "empty" | "unavailable" | "error";

type ScreenStateProps = {
  actions?: ReactNode;
  align?: "center" | "left";
  className?: string;
  description: string;
  eyebrow?: string;
  icon?: ReactNode;
  state: ScreenStateKind;
  title: string;
};

const stateStyles = {
  loading: {
    Icon: LoaderCircle,
    iconClassName: "animate-spin text-primary",
    iconWrapClassName: "bg-primary/10 text-primary",
  },
  empty: {
    Icon: FolderOpen,
    iconClassName: "text-primary",
    iconWrapClassName: "bg-primary/10 text-primary",
  },
  unavailable: {
    Icon: SearchX,
    iconClassName: "text-secondary",
    iconWrapClassName: "bg-secondary/10 text-secondary",
  },
  error: {
    Icon: AlertTriangle,
    iconClassName: "text-error",
    iconWrapClassName: "bg-error/12 text-error",
  },
} as const;

export function ScreenState({
  actions,
  align = "center",
  className,
  description,
  eyebrow,
  icon,
  state,
  title,
}: ScreenStateProps) {
  const config = stateStyles[state];
  const DefaultIcon = config.Icon;

  return (
    <SurfaceCard
      variant="low"
      role={state === "loading" ? "status" : state === "error" ? "alert" : undefined}
      className={cn(
        "mx-auto max-w-xl space-y-4 rounded-3xl p-6 sm:p-8",
        align === "center" && "text-center",
        className,
      )}
    >
      <div
        className={cn(
          "flex h-12 w-12 items-center justify-center rounded-2xl [&_svg]:h-6 [&_svg]:w-6",
          align === "center" ? "mx-auto" : "mx-0",
          config.iconWrapClassName,
        )}
        aria-hidden="true"
      >
        {icon ?? <DefaultIcon className={config.iconClassName} />}
      </div>

      <div className="space-y-1.5">
        {eyebrow ? <p className="text-xs font-semibold text-on-surface-variant">{eyebrow}</p> : null}
        <h1 className="font-headline text-xl font-bold tracking-tight text-on-surface sm:text-2xl">
          {title}
        </h1>
        <p
          className={cn(
            "text-sm leading-6 text-on-surface-variant",
            align === "center" && "mx-auto max-w-sm",
          )}
        >
          {description}
        </p>
      </div>

      {actions ? (
        <div
          className={cn(
            "flex flex-wrap gap-3 pt-1",
            align === "center" ? "justify-center" : "justify-start",
          )}
        >
          {actions}
        </div>
      ) : null}
    </SurfaceCard>
  );
}
