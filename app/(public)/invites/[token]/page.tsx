import { InviteAcceptance } from "@/components/invites/invite-acceptance";
import { AuthShell } from "@/components/auth/auth-shell";

type InvitePageProps = {
  params: Promise<{ token: string }>;
};

export default async function InvitePage({ params }: InvitePageProps) {
  const { token } = await params;
  const tokenPreview = token.length > 12 ? `${token.slice(0, 6)}…${token.slice(-4)}` : token;

  return (
    <AuthShell
      mode="invite"
      footer={
        <p className="text-[0.68rem] uppercase tracking-[0.24em] text-on-surface-variant">
          secure token · {tokenPreview}
        </p>
      }
    >
      <InviteAcceptance token={token} />
    </AuthShell>
  );
}
