"use client";

import { useUser } from "@clerk/nextjs";
import { useConvexAuth, useMutation } from "convex/react";
import { useEffect, useRef, useState } from "react";

import { api } from "@/convex/_generated/api";

export function CurrentUserSync() {
  const { isLoading, isAuthenticated } = useConvexAuth();
  const { user } = useUser();
  const lastSyncedKeyRef = useRef<string | null>(null);
  const inFlightSyncKeyRef = useRef<string | null>(null);
  const storeCurrentUser = useMutation(api.users.storeCurrentUser);
  const [retryNonce, setRetryNonce] = useState(0);
  const syncKey = user?.id ?? "__current_user__";

  useEffect(() => {
    if (isLoading) {
      return;
    }

    if (!isAuthenticated) {
      lastSyncedKeyRef.current = null;
      inFlightSyncKeyRef.current = null;
      return;
    }

    if (lastSyncedKeyRef.current === syncKey || inFlightSyncKeyRef.current === syncKey) {
      return;
    }

    let cancelled = false;
    let retryTimeoutId: ReturnType<typeof setTimeout> | null = null;
    inFlightSyncKeyRef.current = syncKey;

    void storeCurrentUser({})
      .then(() => {
        if (!cancelled) {
          lastSyncedKeyRef.current = syncKey;
          inFlightSyncKeyRef.current = null;
        }
      })
      .catch(() => {
        if (!cancelled) {
          inFlightSyncKeyRef.current = null;
          retryTimeoutId = setTimeout(() => {
            setRetryNonce((value) => value + 1);
          }, 1500);
        }
      });

    return () => {
      cancelled = true;
      if (retryTimeoutId !== null) {
        clearTimeout(retryTimeoutId);
      }
    };
  }, [
    isAuthenticated,
    isLoading,
    retryNonce,
    syncKey,
    storeCurrentUser,
  ]);

  return null;
}
