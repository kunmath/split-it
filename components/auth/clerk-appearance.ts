import type { ComponentProps } from "react";

import { ClerkProvider } from "@clerk/nextjs";

type ClerkAppearance = NonNullable<ComponentProps<typeof ClerkProvider>["appearance"]>;

const authElements = {
  rootBox: "w-full",
  cardBox: "w-full",
  card: "w-full border-0 bg-transparent p-0 shadow-none",
  headerTitle: "font-headline text-[2.15rem] font-extrabold tracking-[-0.04em] text-on-surface sm:text-4xl",
  headerSubtitle: "text-sm leading-6 text-on-surface-variant sm:text-[0.96rem]",
  socialButtons: "space-y-3",
  socialButtonsBlockButton:
    "flex min-h-15 items-center justify-center gap-3 rounded-[1.1rem] border border-white/5 px-5 text-[0.98rem] font-semibold transition duration-200 bg-white text-[#121212] shadow-[0_14px_35px_rgba(255,255,255,0.08)] hover:bg-white/92 md:bg-surface-container-high md:text-on-surface md:hover:bg-surface-bright disabled:pointer-events-none disabled:opacity-60",
  socialButtonsBlockButtonText: "font-headline text-[0.98rem] font-semibold",
  dividerLine: "bg-white/8",
  dividerText: "text-[0.64rem] font-semibold uppercase tracking-[0.28em] text-on-surface-variant/70",
  formFieldLabel: "mb-2 text-[0.64rem] font-semibold uppercase tracking-[0.24em] text-on-surface-variant/78",
  formFieldInput:
    "min-h-14 rounded-[1.15rem] border border-white/6 bg-surface-container px-4 text-[0.98rem] text-on-surface shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] transition outline-none placeholder:text-on-surface-variant/42 hover:border-white/10 focus:border-primary/45 focus:ring-0",
  formFieldInputShowPasswordButton: "text-on-surface-variant transition hover:text-on-surface",
  formFieldErrorText: "mt-2 text-sm text-error",
  formButtonPrimary:
    "min-h-15 rounded-[1.15rem] border-0 bg-primary text-[1.02rem] font-extrabold text-on-primary shadow-[0_22px_55px_rgba(78,222,163,0.16)] transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:opacity-60",
  footer: "bg-transparent px-0 pb-0 pt-7",
  footerAction: "mt-0 text-center text-sm text-on-surface-variant",
  footerActionText: "text-on-surface-variant",
  footerActionLink: "font-headline font-bold text-primary transition hover:text-primary/80",
  alert: "rounded-[1.35rem] border border-white/6 bg-white/[0.03] px-4 py-3 text-sm leading-6 text-on-surface-variant",
  alertText: "text-inherit",
  formResendCodeLink: "font-headline font-semibold text-primary transition hover:text-primary/80",
  otpCodeFieldInput: "h-14 rounded-[1rem] border border-white/6 bg-surface-container text-on-surface",
  identityPreviewText: "text-on-surface-variant",
  captcha: "rounded-[1.15rem] border border-white/6 bg-surface-container-low",
} satisfies Record<string, string>;

const authComponentAppearance: ClerkAppearance = {
  elements: authElements,
  options: {
    socialButtonsPlacement: "top",
    socialButtonsVariant: "blockButton",
  },
};

export const clerkGlobalAppearance: ClerkAppearance = {
  cssLayerName: "clerk",
  theme: "simple",
  variables: {
    borderRadius: "1.15rem",
    colorBackground: "#131313",
    colorDanger: "#ffb4ab",
    colorInputBackground: "#201f1f",
    colorInputText: "#e5e2e1",
    colorNeutral: "#3c4a42",
    colorPrimary: "#4edea3",
    colorSuccess: "#4edea3",
    colorText: "#e5e2e1",
    colorTextSecondary: "#bbcabf",
    fontFamily: "var(--font-body), sans-serif",
    fontFamilyButtons: "var(--font-headline), var(--font-body), sans-serif",
  },
};

export const signInAppearance: ClerkAppearance = {
  ...authComponentAppearance,
};

export const signUpAppearance: ClerkAppearance = {
  ...authComponentAppearance,
};
