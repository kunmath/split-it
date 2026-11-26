"use client";

import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { ArrowRight, Check, CheckCircle2 } from "lucide-react";
import { startTransition, useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { usePlaceholderMode } from "@/components/providers/app-providers";
import { Button } from "@/components/ui/button";
import { FilledInput } from "@/components/ui/filled-input";
import { ScreenState } from "@/components/ui/screen-state";
import { SkeletonBlock } from "@/components/ui/skeletons";
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
      className="max-w-none"
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
      className="max-w-none"
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

  const isOnboarding = mode === "onboarding";

  return (
    <div className="space-y-6">
      {isOnboarding ? (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-primary">Final step</p>
          <h1 className="font-headline text-2xl font-bold tracking-tight text-on-surface sm:text-3xl">
            Choose how your groups see you
          </h1>
          <p className="max-w-2xl text-sm leading-6 text-on-surface-variant">
            Your email stays private. This name and avatar appear across shared groups, balances, and expenses.
          </p>
        </div>
      ) : null}

      <form className="space-y-6" onSubmit={onSubmit} noValidate>
        <FilledInput
          autoComplete="nickname"
          error={showInlineError?.includes("Display name") ? showInlineError : undefined}
          hint="2 to 40 characters. Doesn't need to be unique."
          label="Display name"
          maxLength={40}
          onChange={(event) => onDisplayNameChange(event.target.value)}
          placeholder="Alex Rivera"
          value={displayName}
        />

        <fieldset className="space-y-2">
          <legend className="text-sm font-medium text-on-surface">Avatar</legend>
          <div className="grid grid-cols-5 gap-2 sm:gap-3">
            {AVATAR_OPTIONS.map((option) => {
              const isSelected = option.key === avatarKey;

              return (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => onAvatarSelect(option.key)}
                  className={cn(
                    "relative flex aspect-square items-center justify-center rounded-2xl bg-surface-container-lowest p-1.5 ring-1 ring-white/8 transition hover:ring-primary/40",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70",
                    isSelected && "bg-primary/10 ring-2 ring-primary",
                  )}
                  aria-pressed={isSelected}
                  aria-label={option.label}
                  title={option.label}
                >
                  <UserAvatar imageUrl={option.src} name={option.label} size="md" className="h-full max-h-14 w-full max-w-14" />
                  {isSelected ? (
                    <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-on-primary">
                      <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden="true" />
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
          {showInlineError?.includes("avatar") ? (
            <p className="text-xs text-error">{showInlineError}</p>
          ) : null}
        </fieldset>

        {successMessage ? (
          <div role="status" className="flex items-center gap-2 rounded-2xl bg-primary/10 px-4 py-3 text-sm text-on-surface">
            <CheckCircle2 className="h-4.5 w-4.5 text-primary" aria-hidden="true" />
            <span>{successMessage}</span>
          </div>
        ) : null}

        {errorMessage && !showInlineError?.includes("Display name") && !showInlineError?.includes("avatar") ? (
          <p role="alert" className="text-sm text-error">{errorMessage}</p>
        ) : null}

        <Button
          type="submit"
          size="lg"
          fullWidth
          disabled={Boolean(validationError) || isSaving}
          className={cn(!isOnboarding && "sm:w-auto sm:min-w-44")}
        >
          {isSaving ? "Saving…" : submitLabel}
          {isOnboarding ? <ArrowRight className="h-4.5 w-4.5" aria-hidden="true" /> : null}
        </Button>
      </form>

      {isOnboarding ? (
        <div className="flex items-center gap-3 rounded-2xl bg-surface-container-low px-4 py-3">
          <UserAvatar
            imageUrl={selectedAvatar?.src}
            name={normalizedDisplayName || "Your display name"}
            size="lg"
          />
          <div className="min-w-0">
            <p className="text-xs text-on-surface-variant">Preview</p>
            <p className="truncate font-headline text-base font-bold text-on-surface">
              {normalizedDisplayName || "Your display name"}
            </p>
          </div>
        </div>
      ) : null}
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

  if (currentUser === undefined && mode === "account") {
    return <ProfileFormSkeleton />;
  }

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
        className="max-w-none"
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
        className="max-w-none"
      />
    );
  }

  return <LiveProfileForm mode="onboarding" redirectPath={redirectPath} />;
}

/** Live-only profile editor for the account screen. Renders nothing in mock mode. */
export function AccountProfileForm() {
  const { mode } = usePlaceholderMode();

  if (mode === "mock") {
    return null;
  }

  return <LiveProfileForm mode="account" />;
}

function ProfileFormSkeleton() {
  return (
    <div role="status" aria-label="Loading profile" className="space-y-6">
      <div className="space-y-2">
        <SkeletonBlock className="h-4 w-28 rounded-md" />
        <SkeletonBlock className="h-12 w-full" />
      </div>
      <div className="space-y-2">
        <SkeletonBlock className="h-4 w-16 rounded-md" />
        <div className="grid grid-cols-5 gap-2 sm:gap-3">
          {Array.from({ length: 10 }, (_, index) => (
            <SkeletonBlock key={index} className="aspect-square" />
          ))}
        </div>
      </div>
      <SkeletonBlock className="h-14 w-full rounded-full sm:w-44" />
    </div>
  );
}
