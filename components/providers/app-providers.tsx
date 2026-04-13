"use client";

import { ClerkProvider } from "@clerk/nextjs";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import { createContext, useContext, useState, type ReactNode } from "react";

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
};

export function AppProviders({
  children,
  clerkPublishableKey,
  convexUrl,
  mode,
  isClerkConfigured,
  isConvexConfigured,
}: AppProvidersProps) {
  const [convexClient] = useState(() => {
    return convexUrl ? new ConvexReactClient(convexUrl) : null;
  });

  let tree = (
    <PlaceholderModeContext.Provider value={{ mode, isClerkConfigured, isConvexConfigured }}>
      {children}
    </PlaceholderModeContext.Provider>
  );

  if (convexClient) {
    tree = <ConvexProvider client={convexClient}>{tree}</ConvexProvider>;
  }

  if (clerkPublishableKey) {
    tree = <ClerkProvider publishableKey={clerkPublishableKey}>{tree}</ClerkProvider>;
  }

  return tree;
}

export function usePlaceholderMode() {
  return useContext(PlaceholderModeContext);
}
