"use client";

import { useRouter } from "next/navigation";
import { startTransition, useCallback, useContext, useEffect, useRef } from "react";

import { InAppHistoryContext } from "@/components/shell/mobile-top-bar";
import { releaseHistoryLayers } from "@/components/ui/use-history-layer";

/**
 * Leaves the composer: back to wherever the user came from, else replace with the group page.
 * Our sheet/draft-guard history entries are removed first so Back history stays clean.
 * Does nothing once unmounted, and ignores repeat calls while an exit is still queued.
 */
export function useExitComposer(groupId: string) {
  const router = useRouter();
  const hasInAppHistory = useContext(InAppHistoryContext);
  const mountedRef = useRef(false);
  const exitQueuedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  return useCallback(() => {
    if (!mountedRef.current || exitQueuedRef.current) {
      return;
    }

    exitQueuedRef.current = true;
    releaseHistoryLayers(() => {
      // Cleared once the navigation is issued, so a later Close can retry if it didn't leave.
      exitQueuedRef.current = false;

      if (!mountedRef.current) {
        return;
      }

      startTransition(() => {
        if (hasInAppHistory) {
          router.back();
        } else {
          router.replace(`/groups/${groupId}`);
        }
      });
    });
  }, [groupId, hasInAppHistory, router]);
}
