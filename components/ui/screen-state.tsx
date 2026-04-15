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
      variant="high"
      className={cn(
        "mx-auto max-w-2xl space-y-4 rounded-[2.2rem]",
        align === "center" && "text-center",
        className,
      )}
    >
      <div
        className={cn(
          "flex h-16 w-16 items-center justify-center rounded-full",
          align === "center" ? "mx-auto" : "mx-0",
          config.iconWrapClassName,
        )}
      >
        {icon ?? <DefaultIcon className={cn("h-7 w-7", config.iconClassName)} />}
      </div>

      <div className="space-y-3">
        {eyebrow ? (
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-on-surface-variant">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="font-headline text-3xl font-bold tracking-tight text-on-surface">
          {title}
        </h1>
        <p className="text-sm leading-7 text-on-surface-variant">{description}</p>
      </div>

      {actions ? (
        <div
          className={cn(
            "flex flex-wrap gap-3",
            align === "center" ? "justify-center" : "justify-start",
          )}
        >
          {actions}
        </div>
      ) : null}
    </SurfaceCard>
  );
}
