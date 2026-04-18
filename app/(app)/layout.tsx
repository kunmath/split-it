import { Suspense } from "react";

import { ProfileCompletionGate } from "@/components/auth/profile-completion-gate";
import { ScreenState } from "@/components/ui/screen-state";
import { AppShell } from "@/components/shell/app-shell";

export default function AuthenticatedLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <Suspense fallback={<AppLayoutFallback />}>
      <ProfileCompletionGate>
        <AppShell>{children}</AppShell>
      </ProfileCompletionGate>
    </Suspense>
  );
}

function AppLayoutFallback() {
  return (
    <div className="px-4 py-12 sm:px-6 lg:px-10">
      <ScreenState
        state="loading"
        title="Preparing your workspace"
        description="Loading the app shell and session state."
        className="rounded-[2rem] p-7 sm:p-8"
      />
    </div>
  );
}
