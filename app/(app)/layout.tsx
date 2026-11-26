import { Suspense } from "react";

import { ProfileCompletionGate } from "@/components/auth/profile-completion-gate";
import { AppShell } from "@/components/shell/app-shell";
import { ListSkeleton } from "@/components/ui/skeletons";

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
    <div className="px-4 py-6 sm:px-6 lg:px-10">
      <ListSkeleton />
    </div>
  );
}
