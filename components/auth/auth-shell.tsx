import Link from "next/link";
import { LockKeyhole, ShieldCheck } from "lucide-react";
import type { ReactNode } from "react";

type AuthShellMode = "sign-in" | "sign-up" | "callback" | "invite" | "onboarding";

type AuthShellProps = {
  children: ReactNode;
  footer?: ReactNode;
  mode: AuthShellMode;
};

const sideCopyByMode: Record<AuthShellMode, string> = {
  "callback": "Securely handing your session back to the ledger workspace.",
  "invite": "Invite access stays deliberate: one secure link, one new member, one clean path into the group.",
  "onboarding": "Choose the display identity that will follow you through every shared balance, group, and expense thread.",
  "sign-in": "Personal debt and shared expenses treated with the visual gravity of a premium lifestyle brand.",
  "sign-up": "Open a shared-expense workspace with the same editorial restraint as the product itself.",
};

export function AuthShell({ children, footer, mode }: AuthShellProps) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-surface">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-10%] top-[-8%] h-72 w-72 rounded-full bg-primary/10 blur-[140px]" />
        <div className="absolute bottom-[-14%] right-[-12%] h-96 w-96 rounded-full bg-secondary/8 blur-[160px]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(78,222,163,0.06),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(255,181,158,0.05),transparent_34%)]" />
      </div>

      <div className="relative mx-auto flex min-h-screen w-full max-w-[1440px] flex-col px-5 pb-8 pt-6 sm:px-6 lg:px-8">
        <header className="flex items-center justify-between lg:hidden">
          <Link href="/" className="font-headline text-[1.9rem] font-black tracking-[-0.06em] text-primary">
            split-it
          </Link>
        </header>

        <main className="relative flex flex-1 items-center justify-center py-10 sm:py-12 lg:py-16">
          <div className="pointer-events-none absolute bottom-8 right-0 hidden max-w-xs text-right xl:block">
            <p className="font-headline text-6xl font-black tracking-[-0.08em] text-white/5">SPLIT-IT</p>
            <p className="mt-3 text-xs leading-6 text-on-surface-variant/30">
              {sideCopyByMode[mode]}
            </p>
          </div>

          <div className="w-full max-w-[32rem]">
            <div className="mb-8 hidden flex-col items-center gap-3 lg:flex">
              <Link href="/" className="font-headline text-[2.65rem] font-black tracking-[-0.08em] text-primary">
                Split-It
              </Link>
              <div className="h-px w-14 bg-primary/40" />
            </div>

            <section className="rounded-[2.4rem] border border-white/5 bg-[linear-gradient(180deg,rgba(28,27,27,0.94),rgba(19,19,19,0.985))] px-6 py-8 shadow-[0_28px_120px_rgba(0,0,0,0.4)] ring-1 ring-white/4 sm:px-8 sm:py-10">
              {children}
              {footer ? <div className="mt-10 text-center text-sm text-on-surface-variant">{footer}</div> : null}
            </section>

            <div className="mt-7 space-y-6 text-[0.64rem] uppercase tracking-[0.22em] text-on-surface-variant/42 sm:mt-8">
              <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
                <span className="inline-flex items-center gap-2">
                  <LockKeyhole className="h-3.5 w-3.5" />
                  AES-256 encrypted
                </span>
                <span className="inline-flex items-center gap-2">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Trusted partners
                </span>
              </div>

              <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
                <p>© 2026 split-it architectural finance</p>
                <div className="flex items-center gap-5">
                  <span>Terms</span>
                  <span>Cookies</span>
                  <span>Contact</span>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
