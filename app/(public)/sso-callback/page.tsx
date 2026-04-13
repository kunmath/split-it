import { AuthShell } from "@/components/auth/auth-shell";
import { OAuthCallback } from "@/components/auth/oauth-callback";

export default function SsoCallbackPage() {
  return (
    <AuthShell mode="callback">
      <OAuthCallback />
    </AuthShell>
  );
}
