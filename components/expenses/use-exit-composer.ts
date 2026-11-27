"use client";

import { useRouter } from "next/navigation";
import { startTransition, useCallback, useContext } from "react";

import { InAppHistoryContext } from "@/components/shell/mobile-top-bar";
import { releaseHistoryLayers } from "@/components/ui/use-history-layer";

/**
 * Leaves the composer: back to wherever the user came from, else replace with the group page.
 * Our sheet/draft-guard history entries are removed first so Back history stays clean.
 */
export function useExitComposer(groupId: string) {
  const router = useRouter();
  const hasInAppHistory = useContext(InAppHistoryContext);

  return useCallback(() => {
    releaseHistoryLayers(() => {
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
