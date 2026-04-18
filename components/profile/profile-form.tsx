"use client";

import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { startTransition, useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { usePlaceholderMode } from "@/components/providers/app-providers";
import { Button } from "@/components/ui/button";
import { FilledInput } from "@/components/ui/filled-input";
import { ScreenState } from "@/components/ui/screen-state";
import { SurfaceCard } from "@/components/ui/surface-card";
import { UserAvatar } from "@/components/ui/user-avatar";
import { api } from "@/convex/_generated/api";
import { AVATAR_OPTIONS, isAvatarKey, type AvatarKey } from "@/lib/avatar-options";
import { cn } from "@/lib/utils";
import { getPostAuthRedirectPath } from "@/lib/auth-redirect";

type ProfileFormMode = "account" | "onboarding";

type ProfileFormProps = {
  mode: ProfileFormMode;
  redirectPath?: string | null;
};

function sanitizeDisplayName(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function getValidationError(displayName: string, avatarKey: AvatarKey | null) {
  const normalizedDisplayName = sanitizeDisplayName(displayName);

  if (normalizedDisplayName.length < 2) {
    return "Display name must be at least 2 characters.";
  }

  if (normalizedDisplayName.length > 40) {
    return "Display name must be 40 characters or fewer.";
  }

  if (avatarKey === null) {
    return "Choose an avatar to continue.";
  }

  return null;
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Unable to save your profile right now.";
}

function SyncingProfileState({
  description,
  title,
}: {
  description: string;
  title: string;
}) {
  return (
    <ScreenState
      state="loading"
      title={title}
      description={description}
      className="max-w-none rounded-[2rem] p-7 sm:p-8"
    />
  );
}

function MissingProfileState({
  description,
  isConvexAuthenticated,
}: {
  description: string;
  isConvexAuthenticated: boolean;
}) {
  return (
    <ScreenState
      state="unavailable"
      title="Workspace profile unavailable"
      description={
        isConvexAuthenticated
          ? description
          : "Clerk sign-in succeeded, but Convex did not receive a valid auth token for this session yet."
      }
      className="max-w-none rounded-[2rem] p-7 sm:p-8"
    />
  );
}

function ProfileFormBody({
  avatarKey,
  displayName,
  errorMessage,
  isSaving,
  mode,
  onAvatarSelect,
  onDisplayNameChange,
  onSubmit,
  showValidationErrors,
  successMessage,
}: {
  avatarKey: AvatarKey | null;
  displayName: string;
  errorMessage: string | null;
  isSaving: boolean;
  mode: ProfileFormMode;
  onAvatarSelect: (value: AvatarKey) => void;
  onDisplayNameChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  showValidationErrors: boolean;
  successMessage: string | null;
}) {
  const normalizedDisplayName = sanitizeDisplayName(displayName);
  const selectedAvatar = avatarKey ? AVATAR_OPTIONS.find((option) => option.key === avatarKey) ?? null : null;
  const validationError = getValidationError(displayName, avatarKey);
  const showInlineError = errorMessage ?? (showValidationErrors ? validationError : null);
  const submitLabel = mode === "onboarding" ? "Enter workspace" : "Save profile";

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <p className="text-xs uppercase tracking-[0.24em] text-primary">
          {mode === "onboarding" ? "Final step" : "Profile"}
        </p>
        <h1 className="font-headline text-3xl font-extrabold tracking-tight text-on-surface sm:text-4xl">
          {mode === "onboarding" ? "Choose the identity your groups will see." : "Edit your display profile."}
        </h1>
        <p className="max-w-2xl text-sm leading-7 text-on-surface-variant">
          {mode === "onboarding"
            ? "Your email stays unique behind the scenes. This name and avatar are what other people will see across shared groups, balances, and expenses."
            : "This is the name and avatar shown everywhere inside the app. Your email remains the unique account identifier."}
        </p>
      </div>

      <form className="space-y-6" onSubmit={onSubmit}>
        <FilledInput
          autoComplete="nickname"
          error={showInlineError?.includes("Display name") ? showInlineError : undefined}
          hint="2 to 40 characters. This name is for display only and does not need to be unique."
          label="Display name"
          maxLength={40}
          onChange={(event) => onDisplayNameChange(event.target.value)}
          placeholder="Alex Rivera"
          value={displayName}
        />

        <div className="space-y-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-on-surface-variant">Avatar</p>
            <p className="mt-1 text-sm text-on-surface-variant">Pick one of the curated app avatars.</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {AVATAR_OPTIONS.map((option) => {
              const isSelected = option.key === avatarKey;

              return (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => onAvatarSelect(option.key)}
                  className={cn(
                    "flex min-h-40 items-center justify-center rounded-[1.75rem] border border-white/6 bg-surface-container-low p-4 transition hover:border-primary/40 hover:bg-surface-container",
                    isSelected && "border-primary/55 bg-primary/8 ring-1 ring-primary/35",
                  )}
                  aria-pressed={isSelected}
                  aria-label={option.label}
                  title={option.label}
                >
                  <UserAvatar imageUrl={option.src} name={option.label} size="xl" />
                </button>
              );
            })}
          </div>
          {showInlineError?.includes("avatar") || showInlineError === "Choose an avatar to continue." ? (
            <p className="text-xs text-error">{showInlineError}</p>
          ) : null}
        </div>

        {successMessage ? (
          <div className="flex items-center gap-2 rounded-[1.35rem] border border-primary/20 bg-primary/10 px-4 py-3 text-sm text-primary">
            <CheckCircle2 className="h-4.5 w-4.5" />
            <span>{successMessage}</span>
          </div>
        ) : null}

        {errorMessage && !showInlineError?.includes("Display name") && !showInlineError?.includes("avatar") ? (
          <p className="text-sm text-error">{errorMessage}</p>
        ) : null}

        <Button
          type="submit"
          size="lg"
          fullWidth
          disabled={Boolean(validationError) || isSaving}
          className="min-h-15 rounded-[1.15rem] text-[1.02rem] font-extrabold"
        >
          {submitLabel}
          <ArrowRight className="h-4.5 w-4.5" />
        </Button>
      </form>

      <div className="rounded-[1.75rem] border border-white/6 bg-surface-container-low px-4 py-3">
        <div className="flex items-center gap-3">
          <UserAvatar
            imageUrl={selectedAvatar?.src}
            name={normalizedDisplayName || "Your display name"}
            size="lg"
          />
          <div className="space-y-1">
            <p className="font-headline text-base font-bold text-on-surface">
              {normalizedDisplayName || "Your display name"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function LiveProfileForm({ mode, redirectPath }: ProfileFormProps) {
  const router = useRouter();
  const { isLoading: isConvexAuthLoading, isAuthenticated: isConvexAuthenticated } = useConvexAuth();
  const currentUser = useQuery(api.users.current);
  const saveProfile = useMutation(api.users.saveProfile);
  const [displayName, setDisplayName] = useState("");
  const [avatarKey, setAvatarKey] = useState<AvatarKey | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const initializedUserIdRef = useRef<string | null>(null);
  const redirectingRef = useRef(false);

  useEffect(() => {
    if (currentUser === undefined || currentUser === null) {
      return;
    }

    if (initializedUserIdRef.current === currentUser._id) {
      return;
    }

    initializedUserIdRef.current = currentUser._id;
    setDisplayName(currentUser.name);
    setAvatarKey(currentUser.avatarKey && isAvatarKey(currentUser.avatarKey) ? currentUser.avatarKey : null);
    setErrorMessage(null);
  }, [currentUser]);

  useEffect(() => {
    if (mode !== "onboarding" || currentUser === undefined || currentUser === null || !currentUser.profileCompletedAt) {
      return;
    }

    if (redirectingRef.current) {
      return;
    }

    redirectingRef.current = true;
    startTransition(() => {
      router.replace(getPostAuthRedirectPath(redirectPath));
    });
  }, [currentUser, mode, redirectPath, router]);

  if (currentUser === undefined) {
    return (
      <SyncingProfileState
        title={mode === "onboarding" ? "Preparing your profile step" : "Loading account profile"}
        description={
          mode === "onboarding"
            ? "We’re finishing the secure handoff from Clerk and preparing your workspace profile."
            : "Pulling your current display identity and avatar choices into view."
        }
      />
    );
  }

  if (currentUser === null) {
    return (
      <MissingProfileState
        isConvexAuthenticated={isConvexAuthenticated}
        description={
          isConvexAuthLoading
            ? "Your account is authenticated, but the workspace record is still finishing setup."
            : "Your account is authenticated, but the workspace profile record was not found in Convex."
        }
      />
    );
  }

  if (mode === "onboarding" && currentUser.profileCompletedAt) {
    return (
      <ScreenState
        state="loading"
        title="Opening your workspace"
        description="Your profile is already complete, so we’re sending you to the next destination."
        className="max-w-none rounded-[2rem] p-7 sm:p-8"
      />
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const validationError = getValidationError(displayName, avatarKey);
    setHasAttemptedSubmit(true);
    if (validationError) {
      setErrorMessage(validationError);
      setSuccessMessage(null);
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await saveProfile({
        avatarKey: avatarKey!,
        displayName: sanitizeDisplayName(displayName),
      });

      if (mode === "onboarding") {
        startTransition(() => {
          router.replace(getPostAuthRedirectPath(redirectPath));
        });
        return;
      }

      setSuccessMessage("Profile updated.");
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  }

  return (
      <ProfileFormBody
      avatarKey={avatarKey}
      displayName={displayName}
      errorMessage={errorMessage}
      isSaving={isSaving}
      mode={mode}
      onAvatarSelect={(value) => {
        setAvatarKey(value);
        setErrorMessage(null);
        setSuccessMessage(null);
      }}
      onDisplayNameChange={(value) => {
        setDisplayName(value);
        setErrorMessage(null);
        setSuccessMessage(null);
      }}
      onSubmit={handleSubmit}
      showValidationErrors={hasAttemptedSubmit}
      successMessage={successMessage}
    />
  );
}

export function OnboardingProfileForm({ redirectPath }: { redirectPath?: string | null }) {
  const { mode } = usePlaceholderMode();

  if (mode === "mock") {
    return (
      <ScreenState
        state="unavailable"
        title="Profile onboarding unavailable"
        description="Configure Clerk and Convex together before using the live onboarding flow."
        className="max-w-none rounded-[2rem] p-7 sm:p-8"
      />
    );
  }

  return <LiveProfileForm mode="onboarding" redirectPath={redirectPath} />;
}

export function AccountProfileForm() {
  const { mode } = usePlaceholderMode();

  if (mode === "mock") {
    return (
      <SurfaceCard variant="high" className="space-y-4 rounded-[2rem] p-7 sm:p-8">
        <p className="text-xs uppercase tracking-[0.24em] text-primary">Profile</p>
        <h1 className="font-headline text-3xl font-extrabold tracking-tight text-on-surface">Live profile editing needs auth.</h1>
        <p className="text-sm leading-7 text-on-surface-variant">
          The account editor becomes active when Clerk and Convex are configured together. In mock mode, navigation stays available but profile changes are disabled.
        </p>
      </SurfaceCard>
    );
  }

  return (
    <SurfaceCard variant="high" className="rounded-[2rem] p-7 sm:p-8">
      <LiveProfileForm mode="account" />
    </SurfaceCard>
  );
}
