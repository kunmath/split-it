"use client";

import { useAuth } from "@clerk/nextjs";
import { ConvexProviderWithAuth, type ConvexReactClient } from "convex/react";
import { useCallback, useMemo, type ReactNode } from "react";

type ConvexClerkProviderProps = {
  children: ReactNode;
  client: ConvexReactClient;
};

type JwtPayload = {
  aud?: string | string[];
};

function parseJwtPayload(token: string): JwtPayload | null {
  const [, payloadSegment] = token.split(".");

  if (!payloadSegment) {
    return null;
  }

  try {
    const normalized = payloadSegment.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    const decoded = globalThis.atob(padded);

    return JSON.parse(decoded) as JwtPayload;
  } catch {
    return null;
  }
}

function tokenTargetsConvex(token: string | null) {
  if (!token) {
    return false;
  }

  const payload = parseJwtPayload(token);
  const audience = payload?.aud;

  if (typeof audience === "string") {
    return audience === "convex";
  }

  if (Array.isArray(audience)) {
    return audience.includes("convex");
  }

  return false;
}

function useConvexAuthFromClerk() {
  const { getToken, isLoaded, isSignedIn, orgId, orgRole } = useAuth();

  const fetchAccessToken = useCallback(
    async ({ forceRefreshToken }: { forceRefreshToken: boolean }) => {
      const defaultToken = await getToken({
        skipCache: forceRefreshToken,
      }).catch(() => null);

      if (tokenTargetsConvex(defaultToken)) {
        return defaultToken;
      }

      return getToken({
        template: "convex",
        skipCache: forceRefreshToken,
      }).catch(() => null);
    },
    // Recreate the fetcher when Clerk org context changes so Convex reauthenticates.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [getToken, orgId, orgRole],
  );

  return useMemo(
    () => ({
      isLoading: !isLoaded,
      isAuthenticated: isSignedIn ?? false,
      fetchAccessToken,
    }),
    [fetchAccessToken, isLoaded, isSignedIn],
  );
}

export function ConvexClerkProvider({ children, client }: ConvexClerkProviderProps) {
  return (
    <ConvexProviderWithAuth client={client} useAuth={useConvexAuthFromClerk}>
      {children}
    </ConvexProviderWithAuth>
  );
}
