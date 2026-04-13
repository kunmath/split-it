import Link from "next/link";
import { Plus } from "lucide-react";

import { cn } from "@/lib/utils";

type FloatingActionButtonProps = {
  href: string;
  label: string;
  className?: string;
};

export function FloatingActionButton({
  href,
  label,
  className,
}: FloatingActionButtonProps) {
  return (
    <Link
      href={href}
      aria-label={label}
      className={cn(
        "fixed bottom-24 right-4 z-40 flex h-16 w-16 items-center justify-center rounded-full",
        "bg-[linear-gradient(135deg,var(--color-primary),var(--color-primary-container))] text-on-primary",
        "shadow-[0_16px_42px_rgba(78,222,163,0.22)] ring-1 ring-white/10 transition hover:scale-[1.03]",
        "lg:bottom-8 lg:right-8",
        className,
      )}
    >
      <Plus className="h-7 w-7" strokeWidth={2.25} />
    </Link>
  );
}
