import type { CSSProperties } from "react";

import { cn, getInitials } from "@/lib/utils";

type UserAvatarProps = {
  imageUrl?: string | null;
  name: string;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
};

const sizeClassName = {
  sm: "h-10 w-10 text-xs",
  md: "h-11 w-11 text-sm",
  lg: "h-14 w-14 text-base",
  xl: "h-20 w-20 text-xl",
} as const;

export function UserAvatar({ imageUrl, name, size = "md", className }: UserAvatarProps) {
  const trimmedImageUrl = imageUrl?.trim();
  const backgroundStyle =
    trimmedImageUrl
      ? ({
          backgroundImage: `url("${trimmedImageUrl}")`,
          backgroundPosition: "center",
          backgroundSize: "cover",
        } satisfies CSSProperties)
      : undefined;

  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full font-headline font-bold ring-1 ring-white/8",
        sizeClassName[size],
        backgroundStyle
          ? "bg-surface-container-high text-transparent"
          : "bg-[linear-gradient(135deg,rgba(78,222,163,0.35),rgba(255,181,158,0.25))] text-on-surface",
        className,
      )}
      style={backgroundStyle}
      aria-label={name}
      title={name}
    >
      {backgroundStyle ? null : getInitials(name)}
    </div>
  );
}
