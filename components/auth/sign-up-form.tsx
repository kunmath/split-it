"use client";

import { useSignUp } from "@clerk/nextjs/legacy";
import { ArrowRight, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { AuthDivider, AuthHeader, AuthNotice, OAuthGoogleButton } from "@/components/auth/auth-primitives";
import { parseClerkError } from "@/components/auth/clerk-error";
import { usePlaceholderMode } from "@/components/providers/app-providers";
import { Button } from "@/components/ui/button";
import { FilledInput } from "@/components/ui/filled-input";
import { cn } from "@/lib/utils";

type SignUpValues = {
  code: string;
  email: string;
  firstName: string;
  lastName: string;
  password: string;
};

type SignUpPhase = "collect" | "verify";

export function SignUpForm() {
  const { isClerkConfigured } = usePlaceholderMode();

  if (!isClerkConfigured) {
    return <DisabledSignUpForm />;
  }

  return <LiveSignUpForm />;
}

function DisabledSignUpForm() {
  return (
    <div className="space-y-6">
      <AuthHeader title="Create access" subtitle="Start a premium shared-expense workspace." />
      <AuthNotice>
        Live sign-up stays disabled until Clerk server keys are present in `.env.local`.
      </AuthNotice>
      <OAuthGoogleButton disabled />
      <AuthDivider />
      <div className="grid gap-5 sm:grid-cols-2">
        <FilledInput disabled label="First Name" placeholder="Alex" />
        <FilledInput disabled label="Last Name" placeholder="Rivera" />
      </div>
      <FilledInput disabled label="Email Address" placeholder="name@domain.com" type="email" />
      <FilledInput disabled label="Password" placeholder="Choose a strong password" type="password" />
      <Button className="min-h-15 rounded-[1.15rem] text-[1.02rem] font-extrabold" disabled fullWidth size="lg">
        Create Access <ArrowRight className="h-4.5 w-4.5" />
      </Button>
    </div>
  );
}

function LiveSignUpForm() {
  const router = useRouter();
  const { isLoaded, setActive, signUp } = useSignUp();
  const [phase, setPhase] = useState<SignUpPhase>("collect");
  const [values, setValues] = useState<SignUpValues>({
    code: "",
    email: "",
    firstName: "",
    lastName: "",
    password: "",
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGooglePending, setIsGooglePending] = useState(false);
  const [isResendingCode, setIsResendingCode] = useState(false);

  function updateValue<K extends keyof SignUpValues>(key: K, value: SignUpValues[K]) {
    setValues((current) => ({ ...current, [key]: value }));
    setFieldErrors((current) => ({ ...current, [key]: "" }));
    setFormError(null);
  }

  async function completeSignUp(sessionId: string | null) {
    if (!sessionId) {
      setFormError("The account was created, but Clerk did not return an active session.");
      return;
    }

    if (!setActive) {
      setFormError("Clerk is still initializing. Please try again.");
      return;
    }

    await setActive({ session: sessionId });
    router.replace("/dashboard");
    router.refresh();
  }

  async function handleSignUpSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!isLoaded) {
      return;
    }

    setIsSubmitting(true);
    setFormError(null);
    setStatusMessage(null);
    setFieldErrors({});

    try {
      const result = await signUp.create({
        emailAddress: values.email.trim(),
        firstName: values.firstName.trim() || undefined,
        lastName: values.lastName.trim() || undefined,
        password: values.password,
      });

      if (result.status === "complete") {
        await completeSignUp(result.createdSessionId);
        return;
      }

      const supportedStrategies = result.verifications.emailAddress.supportedStrategies;

      if (!supportedStrategies.includes("email_code")) {
        setFormError("This Clerk instance does not support email-code verification for the custom sign-up flow.");
        return;
      }

      await result.prepareEmailAddressVerification({ strategy: "email_code" });
      setPhase("verify");
      setStatusMessage(`We sent a verification code to ${values.email.trim()}.`);
    } catch (error) {
      const parsed = parseClerkError(error);
      setFormError(parsed.formError);
      setFieldErrors(parsed.fieldErrors);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleVerificationSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!isLoaded) {
      return;
    }

    setIsSubmitting(true);
    setFormError(null);
    setFieldErrors({});

    try {
      const result = await signUp.attemptEmailAddressVerification({
        code: values.code.trim(),
      });

      if (result.status !== "complete") {
        setFormError("Verification is still incomplete. Check the code and try again.");
        return;
      }

      await completeSignUp(result.createdSessionId);
    } catch (error) {
      const parsed = parseClerkError(error);
      setFormError(parsed.formError);
      setFieldErrors(parsed.fieldErrors);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleGoogleSignUp() {
    if (!isLoaded) {
      return;
    }

    setIsGooglePending(true);
    setFormError(null);
    setStatusMessage(null);
    setFieldErrors({});

    try {
      await signUp.authenticateWithRedirect({
        redirectUrl: "/sso-callback",
        redirectUrlComplete: "/dashboard",
        strategy: "oauth_google",
      });
    } catch (error) {
      const parsed = parseClerkError(error);
      setFormError(parsed.formError);
      setFieldErrors(parsed.fieldErrors);
      setIsGooglePending(false);
    }
  }

  async function resendCode() {
    if (!isLoaded) {
      return;
    }

    setIsResendingCode(true);
    setFormError(null);

    try {
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      setStatusMessage(`A fresh verification code was sent to ${values.email.trim()}.`);
    } catch (error) {
      const parsed = parseClerkError(error);
      setFormError(parsed.formError);
    } finally {
      setIsResendingCode(false);
    }
  }

  return (
    <div className="space-y-6">
      <AuthHeader
        subtitle={
          phase === "collect"
            ? "Start a premium shared-expense workspace."
            : "Enter the verification code to finish activating your ledger."
        }
        title={phase === "collect" ? "Create access" : "Verify your email"}
      />

      {formError ? <AuthNotice tone="error">{formError}</AuthNotice> : null}
      {statusMessage ? <AuthNotice tone="success">{statusMessage}</AuthNotice> : null}

      {phase === "collect" ? (
        <>
          <OAuthGoogleButton disabled={!isLoaded || isSubmitting} label="Continue with Google" onClick={handleGoogleSignUp} pending={isGooglePending} />
          <AuthDivider />

          <form className="space-y-5" onSubmit={handleSignUpSubmit}>
            <div className="grid gap-5 sm:grid-cols-2">
              <FilledInput
                autoComplete="given-name"
                error={fieldErrors.firstName}
                label="First Name"
                onChange={(event) => updateValue("firstName", event.target.value)}
                placeholder="Alex"
                value={values.firstName}
              />
              <FilledInput
                autoComplete="family-name"
                error={fieldErrors.lastName}
                label="Last Name"
                onChange={(event) => updateValue("lastName", event.target.value)}
                placeholder="Rivera"
                value={values.lastName}
              />
            </div>

            <FilledInput
              autoComplete="email"
              error={fieldErrors.email}
              label="Email Address"
              onChange={(event) => updateValue("email", event.target.value)}
              placeholder="name@domain.com"
              type="email"
              value={values.email}
            />

            <FilledInput
              autoComplete="new-password"
              error={fieldErrors.password}
              hint="Use at least 8 characters."
              label="Password"
              onChange={(event) => updateValue("password", event.target.value)}
              placeholder="Choose a strong password"
              type="password"
              value={values.password}
            />

            <Button
              className="min-h-15 rounded-[1.15rem] text-[1.02rem] font-extrabold shadow-[0_22px_55px_rgba(78,222,163,0.16)]"
              disabled={!isLoaded || isSubmitting || isGooglePending}
              fullWidth
              size="lg"
              type="submit"
            >
              {isSubmitting ? "Creating Access..." : "Create Access"} <ArrowRight className="h-4.5 w-4.5" />
            </Button>
          </form>
        </>
      ) : (
        <form className="space-y-5" onSubmit={handleVerificationSubmit}>
          <div className="rounded-[1.45rem] border border-white/6 bg-white/[0.03] px-4 py-4 text-sm leading-6 text-on-surface-variant">
            The verification code was sent to <span className="text-on-surface">{values.email.trim()}</span>.
          </div>

          <FilledInput
            autoComplete="one-time-code"
            className="tracking-[0.38em]"
            error={fieldErrors.code}
            label="Verification Code"
            onChange={(event) => updateValue("code", event.target.value)}
            placeholder="123456"
            value={values.code}
          />

          <Button
            className="min-h-15 rounded-[1.15rem] text-[1.02rem] font-extrabold shadow-[0_22px_55px_rgba(78,222,163,0.16)]"
            disabled={!isLoaded || isSubmitting}
            fullWidth
            size="lg"
            type="submit"
          >
            {isSubmitting ? "Verifying..." : "Verify Email"} <ArrowRight className="h-4.5 w-4.5" />
          </Button>

          <div className="grid gap-3 sm:grid-cols-2">
            <button
              className={cn(
                "flex min-h-12 items-center justify-center gap-2 rounded-[1rem] border border-white/8 bg-transparent px-4 text-sm font-semibold text-on-surface-variant transition hover:bg-white/4 hover:text-on-surface",
                "disabled:pointer-events-none disabled:opacity-60",
              )}
              disabled={!isLoaded || isResendingCode}
              onClick={resendCode}
              type="button"
            >
              <RefreshCw className={cn("h-4 w-4", isResendingCode && "animate-spin")} />
              {isResendingCode ? "Resending..." : "Resend Code"}
            </button>

            <button
              className="flex min-h-12 items-center justify-center rounded-[1rem] border border-white/8 bg-transparent px-4 text-sm font-semibold text-on-surface-variant transition hover:bg-white/4 hover:text-on-surface"
              onClick={() => {
                setPhase("collect");
                setFormError(null);
                setStatusMessage(null);
                setFieldErrors({});
                setValues((current) => ({ ...current, code: "" }));
              }}
              type="button"
            >
              Edit Details
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
