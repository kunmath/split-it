"use client";

import { useUser } from "@clerk/nextjs";
import { useConvexAuth, useMutation } from "convex/react";
import { useEffect, useRef } from "react";

import { api } from "@/convex/_generated/api";

export function CurrentUserSync() {
  const { isLoading, isAuthenticated } = useConvexAuth();
  const { isLoaded, user } = useUser();
  const lastSyncedKeyRef = useRef<string | null>(null);
  const storeCurrentUser = useMutation(api.users.storeCurrentUser);
  const userId = user?.id ?? null;
  const fullName = user?.fullName ?? "";
  const emailAddress = user?.primaryEmailAddress?.emailAddress ?? "";
  const imageUrl = user?.imageUrl ?? "";

  useEffect(() => {
    if (!isAuthenticated) {
      lastSyncedKeyRef.current = null;
      return;
    }

    if (isLoading || !isLoaded || !userId) {
      return;
    }

    const syncKey = [userId, fullName, emailAddress, imageUrl].join("::");

    if (lastSyncedKeyRef.current === syncKey) {
      return;
    }

    let cancelled = false;

    void storeCurrentUser()
      .then(() => {
        if (!cancelled) {
          lastSyncedKeyRef.current = syncKey;
        }
      })
      .catch(() => {
        if (!cancelled) {
          lastSyncedKeyRef.current = null;
        }
      });

    return () => {
      cancelled = true;
    };
  }, [emailAddress, fullName, imageUrl, isAuthenticated, isLoaded, isLoading, storeCurrentUser, userId]);

  return null;
}
