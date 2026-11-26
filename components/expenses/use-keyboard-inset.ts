"use client";

import { useSyncExternalStore } from "react";

function subscribe(onChange: () => void) {
  const viewport = window.visualViewport;

  if (!viewport) {
    return () => {};
  }

  viewport.addEventListener("resize", onChange);
  viewport.addEventListener("scroll", onChange);

  return () => {
    viewport.removeEventListener("resize", onChange);
    viewport.removeEventListener("scroll", onChange);
  };
}

function getSnapshot() {
  const viewport = window.visualViewport;

  if (!viewport) {
    return 0;
  }

  return Math.max(0, Math.round(window.innerHeight - viewport.height - viewport.offsetTop));
}

function getServerSnapshot() {
  return 0;
}

/**
 * Height of the on-screen keyboard (or anything else shrinking the visual viewport) in px.
 * Lets a fixed bottom bar sit just above the keyboard on iOS Safari and Android Chrome,
 * which don't resize the layout viewport when the keyboard opens.
 */
export function useKeyboardInset() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
