"use client";

import { ClerkProvider } from "@clerk/nextjs";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import { createContext, useContext, useState, type ReactNode } from "react";

import { ConvexClerkProvider } from "@/components/providers/convex-clerk-provider";
import { clerkGlobalAppearance } from "@/components/auth/clerk-appearance";
import { CurrentUserSync } from "@/components/providers/current-user-sync";
import { DEFAULT_AUTH_REDIRECT_PATH, SIGN_IN_PATH, SIGN_UP_PATH } from "@/lib/auth-redirect";
import type { PlaceholderMode } from "@/lib/env";

type PlaceholderContextValue = {
  mode: PlaceholderMode;
  isClerkConfigured: boolean;
  isConvexConfigured: boolean;
};

const PlaceholderModeContext = createContext<PlaceholderContextValue>({
  mode: "mock",
  isClerkConfigured: false,
  isConvexConfigured: false,
});

type AppProvidersProps = {
  children: ReactNode;
  clerkPublishableKey?: string;
  convexUrl?: string;
  mode: PlaceholderMode;
  isClerkConfigured: boolean;
  isConvexConfigured: boolean;
  isAuthBridgeConfigured: boolean;
};

export function AppProviders({
  children,
  clerkPublishableKey,
  convexUrl,
  mode,
  isClerkConfigured,
  isConvexConfigured,
  isAuthBridgeConfigured,
}: AppProvidersProps) {
  const [convexClient] = useState(() => {
    return convexUrl ? new ConvexReactClient(convexUrl) : null;
  });
  const shouldUseAuthBridge = Boolean(convexClient && isAuthBridgeConfigured && clerkPublishableKey);

  let tree = (
    <PlaceholderModeContext.Provider value={{ mode, isClerkConfigured, isConvexConfigured }}>
      {children}
    </PlaceholderModeContext.Provider>
  );

  if (convexClient && !shouldUseAuthBridge) {
    tree = <ConvexProvider client={convexClient}>{tree}</ConvexProvider>;
  }

  if (clerkPublishableKey) {
    const clerkTree = shouldUseAuthBridge && convexClient
      ? (
          <ConvexClerkProvider client={convexClient}>
            <CurrentUserSync />
            {tree}
          </ConvexClerkProvider>
        )
      : tree;

    tree = (
      <ClerkProvider
        appearance={clerkGlobalAppearance}
        publishableKey={clerkPublishableKey}
        signInFallbackRedirectUrl={DEFAULT_AUTH_REDIRECT_PATH}
        signInUrl={SIGN_IN_PATH}
        signUpFallbackRedirectUrl={DEFAULT_AUTH_REDIRECT_PATH}
        signUpUrl={SIGN_UP_PATH}
      >
        {clerkTree}
      </ClerkProvider>
    );
  }

  return tree;
}

export function usePlaceholderMode() {
  return useContext(PlaceholderModeContext);
}
