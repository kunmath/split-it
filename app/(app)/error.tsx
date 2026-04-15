"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { PageContainer } from "@/components/shell/page-container";
import { buttonVariants } from "@/components/ui/button";
import { ScreenState } from "@/components/ui/screen-state";

export default function AppError({
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
    <PageContainer className="space-y-6">
      <ScreenState
        state="error"
        title="Something went wrong"
        description="Split-It hit an unexpected issue while loading this screen. Retry the route or head back to the dashboard."
        actions={
          <>
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
            <Link href="/dashboard" className={buttonVariants({ variant: "ghost", size: "lg" })}>
              Dashboard
            </Link>
          </>
        }
      />
    </PageContainer>
  );
}
