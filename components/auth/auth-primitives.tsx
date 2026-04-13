import type { ReactNode } from "react";
import { AlertCircle, CheckCircle2 } from "lucide-react";

import { GoogleMark } from "@/components/auth/google-mark";
import { cn } from "@/lib/utils";

type AuthHeaderProps = {
  title: string;
  subtitle: string;
};

type AuthNoticeProps = {
  children: ReactNode;
  tone?: "error" | "neutral" | "success";
};

type OAuthGoogleButtonProps = {
  disabled?: boolean;
  label?: string;
  pending?: boolean;
  onClick?: () => void | Promise<void>;
};

export function AuthHeader({ title, subtitle }: AuthHeaderProps) {
  return (
    <header className="mb-8 space-y-3 text-center md:mb-10">
      <h1 className="font-headline text-[2.15rem] font-extrabold tracking-[-0.04em] text-on-surface sm:text-4xl">
        {title}
      </h1>
      <p className="text-sm leading-6 text-on-surface-variant sm:text-[0.96rem]">
        {subtitle}
      </p>
    </header>
  );
}

export function AuthNotice({ children, tone = "neutral" }: AuthNoticeProps) {
  const Icon = tone === "error" ? AlertCircle : CheckCircle2;

  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-[1.35rem] border px-4 py-3 text-sm leading-6",
        tone === "error" && "border-error/20 bg-error/8 text-error",
        tone === "success" && "border-primary/20 bg-primary/10 text-on-surface",
        tone === "neutral" && "border-white/6 bg-white/3 text-on-surface-variant",
      )}
    >
      <Icon className={cn("mt-0.5 h-4.5 w-4.5 shrink-0", tone === "error" ? "text-error" : "text-primary")} />
      <div>{children}</div>
    </div>
  );
}

export function AuthDivider() {
  return (
    <div className="flex items-center gap-4 py-1">
      <div className="h-px flex-1 bg-white/8" />
      <span className="text-[0.64rem] font-semibold uppercase tracking-[0.28em] text-on-surface-variant/70">
        Or email
      </span>
      <div className="h-px flex-1 bg-white/8" />
    </div>
  );
}

export function OAuthGoogleButton({
  disabled,
  label = "Continue with Google",
  pending,
  onClick,
}: OAuthGoogleButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled || pending}
      onClick={onClick}
      className={cn(
        "flex min-h-15 w-full items-center justify-center gap-3 rounded-[1.1rem] border border-white/5 px-5 text-[0.98rem] font-semibold transition duration-200",
        "bg-white text-[#121212] shadow-[0_14px_35px_rgba(255,255,255,0.08)] hover:bg-white/92 md:bg-surface-container-high md:text-on-surface md:hover:bg-surface-bright",
        "disabled:pointer-events-none disabled:opacity-60",
      )}
    >
      <GoogleMark />
      <span className="font-headline">{pending ? "Redirecting..." : label}</span>
    </button>
  );
}
