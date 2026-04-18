import { ProfileCompletionGate } from "@/components/auth/profile-completion-gate";
import { AppShell } from "@/components/shell/app-shell";

export default function AuthenticatedLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ProfileCompletionGate>
      <AppShell>{children}</AppShell>
    </ProfileCompletionGate>
  );
}
