import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

type PageContainerProps = HTMLAttributes<HTMLDivElement> & {
  size?: "narrow" | "content" | "wide";
};

export function PageContainer({
  className,
  size = "wide",
  ...props
}: PageContainerProps) {
  return (
    <div
      className={cn(
        "mx-auto w-full",
        size === "narrow" && "max-w-3xl",
        size === "content" && "max-w-5xl",
        size === "wide" && "max-w-[1280px]",
        className,
      )}
      {...props}
    />
  );
}
