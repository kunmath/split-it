"use client";

import { ClerkProvider, useAuth } from "@clerk/nextjs";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { createContext, useContext, useState, type ReactNode } from "react";

import { CurrentUserSync } from "@/components/providers/current-user-sync";
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
          <ConvexProviderWithClerk client={convexClient} useAuth={useAuth}>
            <CurrentUserSync />
            {tree}
          </ConvexProviderWithClerk>
        )
      : tree;

    tree = (
      <ClerkProvider publishableKey={clerkPublishableKey}>{clerkTree}</ClerkProvider>
    );
  }

  return tree;
}

export function usePlaceholderMode() {
  return useContext(PlaceholderModeContext);
}
