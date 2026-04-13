"use client";

import { useSignIn } from "@clerk/nextjs/legacy";
import { ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { AuthDivider, AuthHeader, AuthNotice, OAuthGoogleButton } from "@/components/auth/auth-primitives";
import { parseClerkError } from "@/components/auth/clerk-error";
import { usePlaceholderMode } from "@/components/providers/app-providers";
import { Button } from "@/components/ui/button";
import { FilledInput } from "@/components/ui/filled-input";

type SignInValues = {
  email: string;
  password: string;
};

export function SignInForm() {
  const { isClerkConfigured } = usePlaceholderMode();

  if (!isClerkConfigured) {
    return <DisabledSignInForm />;
  }

  return <LiveSignInForm />;
}

function DisabledSignInForm() {
  return (
    <div className="space-y-6">
      <AuthHeader title="Welcome back" subtitle="Access your editorial ledger." />
      <AuthNotice>
        Add `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` to enable live sign-in and route protection.
      </AuthNotice>
      <OAuthGoogleButton disabled />
      <AuthDivider />
      <div className="space-y-5">
        <FilledInput disabled label="Email Address" placeholder="ledger@split-it.com" type="email" />
        <FilledInput disabled label="Password" placeholder="••••••••" type="password" />
      </div>
      <Button className="min-h-15 rounded-[1.15rem] text-[1.02rem] font-extrabold" disabled fullWidth size="lg">
        Sign In <ArrowRight className="h-4.5 w-4.5" />
      </Button>
    </div>
  );
}

function LiveSignInForm() {
  const router = useRouter();
  const { isLoaded, setActive, signIn } = useSignIn();
  const [values, setValues] = useState<SignInValues>({ email: "", password: "" });
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGooglePending, setIsGooglePending] = useState(false);

  function updateValue<K extends keyof SignInValues>(key: K, value: SignInValues[K]) {
    setValues((current) => ({ ...current, [key]: value }));
    setFieldErrors((current) => ({ ...current, [key]: "" }));
    setFormError(null);
  }

  async function handleEmailPasswordSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!isLoaded) {
      return;
    }

    setIsSubmitting(true);
    setFormError(null);
    setFieldErrors({});

    try {
      const result = await signIn.create({
        identifier: values.email.trim(),
        password: values.password,
        strategy: "password",
      });

      if (result.status !== "complete" || !result.createdSessionId) {
        setFormError("Additional verification is required for this account. Use a password-enabled account for this flow.");
        return;
      }

      await setActive({ session: result.createdSessionId });
      router.replace("/dashboard");
      router.refresh();
    } catch (error) {
      const parsed = parseClerkError(error);
      setFormError(parsed.formError);
      setFieldErrors(parsed.fieldErrors);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleGoogleSignIn() {
    if (!isLoaded) {
      return;
    }

    setIsGooglePending(true);
    setFormError(null);
    setFieldErrors({});

    try {
      await signIn.authenticateWithRedirect({
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

  return (
    <div className="space-y-6">
      <AuthHeader title="Welcome back" subtitle="Access your editorial ledger." />

      {formError ? <AuthNotice tone="error">{formError}</AuthNotice> : null}

      <OAuthGoogleButton disabled={!isLoaded || isSubmitting} onClick={handleGoogleSignIn} pending={isGooglePending} />

      <AuthDivider />

      <form className="space-y-5" onSubmit={handleEmailPasswordSubmit}>
        <FilledInput
          autoComplete="email"
          error={fieldErrors.email}
          label="Email Address"
          onChange={(event) => updateValue("email", event.target.value)}
          placeholder="ledger@split-it.com"
          type="email"
          value={values.email}
        />
        <FilledInput
          autoComplete="current-password"
          error={fieldErrors.password}
          label="Password"
          labelAction={
            <span className="text-[0.64rem] font-semibold uppercase tracking-[0.22em] text-primary/75">
              Clerk secured
            </span>
          }
          onChange={(event) => updateValue("password", event.target.value)}
          placeholder="••••••••"
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
          {isSubmitting ? "Signing In..." : "Sign In"} <ArrowRight className="h-4.5 w-4.5" />
        </Button>
      </form>
    </div>
  );
}
