"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { PublicShell } from "@/components/shell/public-shell";
import { buttonVariants } from "@/components/ui/button";

export default function PublicError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <PublicShell
      eyebrow="Route Error"
      title="This page hit an unexpected problem"
      subtitle="Retry the route or head back to a stable Split-It surface."
      footer={
        <div className="text-center text-xs uppercase tracking-[0.2em] text-on-surface-variant">
          fallback surface
        </div>
      }
    >
      <div className="space-y-6">
        <p className="text-sm leading-7 text-on-surface-variant">
          The current page could not finish rendering. This is usually recoverable with a retry.
        </p>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={reset}
            className={buttonVariants({ variant: "primary", size: "lg" })}
          >
            Try Again
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className={buttonVariants({ variant: "ghost", size: "lg" })}
          >
            Go Back
          </button>
          <Link href="/" className={buttonVariants({ variant: "ghost", size: "lg" })}>
            Home
          </Link>
        </div>
      </div>
    </PublicShell>
  );
}
