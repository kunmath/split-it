"use client";

import { useEffect, useId, useRef, useState } from "react";

/**
 * Browser history entries for in-page layers (sheets, unsaved-draft guards), so system Back and
 * the iOS edge swipe close the top layer instead of leaving the page.
 *
 * Each active layer pushes one same-URL entry marked with a unique key; Back pops it and we call the
 * layer's onPop. A layer that closes any other way (X, Escape, a button) only marks its entry dead —
 * we never call history.back() ourselves at that moment, because the close may be followed by a
 * route change (`onClose(); router.push(...)`) and a traversal would cancel it. Dead entries are
 * stepped over lazily: when Back lands on one, or when a Back press only removed dead entries
 * (nothing visible happened), we go back once more on the user's behalf. Entries left under a new
 * page by a route change ("orphans") are skipped the same way.
 */

const MARK = "splitItLayer";
const SESSION = Math.random().toString(36).slice(2, 8);
const PATCHED_KEY = "__splitItHistoryLayers";

type LayerEntry = {
  key: string;
  owner: string;
  dead: boolean;
  onPop: () => void;
};

/** Our entries from the current page's own entry up to the current entry, bottom to top. */
let entries: LayerEntry[] = [];
let queuedPushes: LayerEntry[] = [];
let afterFlush: Array<() => void> = [];
const releasedOwners = new Set<string>();
let flushQueued = false;
let writingOwnState = false;
let autoBackPending = false;
let autoBackTimer: number | undefined;
/** One user Back press, followed through any entries we step over on its behalf. */
let backChain: { closedLayer: boolean; skippedDead: boolean; finishing: boolean } | null = null;
let counter = 0;

function readMark(state: unknown): string | null {
  if (state && typeof state === "object" && MARK in state) {
    const value = (state as Record<string, unknown>)[MARK];
    return typeof value === "string" ? value : null;
  }

  return null;
}

function writeOwnState(write: () => void) {
  writingOwnState = true;
  try {
    write();
  } finally {
    writingOwnState = false;
  }
}

type Installed = {
  listener: EventListener;
  onForeignWrite: (urlChanged: boolean, replacedMark?: string | null) => void;
};

/**
 * Another push/replace happened (a route change, or the router rewriting state). `replacedMark` is
 * the mark the current entry had before a replace; undefined for a push.
 */
function handleForeignWrite(urlChanged: boolean, replacedMark?: string | null) {
  if (replacedMark === undefined || urlChanged) {
    // Our entries now sit under a different entry (or were replaced away).
    entries = [];
    return;
  }

  const top = entries[entries.length - 1];
  if (top && replacedMark === top.key && readMark(window.history.state) !== top.key) {
    // The router rewrote the current entry's state; put our mark back.
    writeOwnState(() =>
      window.history.replaceState({ ...(window.history.state as object | null), [MARK]: top.key }, ""),
    );
  }
}

function install() {
  if (typeof window === "undefined") {
    return;
  }

  const globals = window as unknown as Record<string, Installed | undefined>;
  const previous = globals[PATCHED_KEY];
  if (previous) {
    // A hot-reloaded copy of this module: point the existing patches and listener at this copy.
    window.removeEventListener("popstate", previous.listener);
    previous.listener = handlePopState as EventListener;
    previous.onForeignWrite = handleForeignWrite;
    window.addEventListener("popstate", handlePopState);
    return;
  }

  const installed: Installed = { listener: handlePopState as EventListener, onForeignWrite: handleForeignWrite };
  globals[PATCHED_KEY] = installed;
  window.addEventListener("popstate", handlePopState);

  // Route changes push/replace entries too (Next.js goes through these), so watch them.
  const history = window.history;
  const pushState = history.pushState;
  const replaceState = history.replaceState;

  history.pushState = function patchedPushState(...args: Parameters<History["pushState"]>) {
    pushState.apply(history, args);
    if (!writingOwnState) {
      installed.onForeignWrite(true);
    }
  };

  history.replaceState = function patchedReplaceState(...args: Parameters<History["replaceState"]>) {
    const hrefBefore = window.location.href;
    const markBefore = readMark(history.state);
    replaceState.apply(history, args);
    if (!writingOwnState) {
      installed.onForeignWrite(window.location.href !== hrefBefore, markBefore);
    }
  };

  // A reload keeps the custom state of the entry we were on, but its layer is gone now.
  const state = history.state as Record<string, unknown> | null;
  if (readMark(state)) {
    const rest = { ...state };
    delete rest[MARK];
    writeOwnState(() => replaceState.call(history, rest, ""));
  }
}

function scheduleFlush() {
  if (flushQueued) {
    return;
  }

  flushQueued = true;
  queueMicrotask(() => {
    flushQueued = false;
    flush();
  });
}

function flush() {
  if (autoBackPending) {
    // Pushing mid-traversal would land in the wrong place; the popstate handler flushes again.
    return;
  }

  for (const entry of queuedPushes) {
    if (releasedOwners.has(entry.owner)) {
      continue;
    }

    // Keep the router's own state (Next.js stores its tree here) and add our mark.
    writeOwnState(() =>
      window.history.pushState({ ...(window.history.state as object | null), [MARK]: entry.key }, ""),
    );
    entries.push(entry);
  }
  queuedPushes = [];

  const callbacks = afterFlush;
  afterFlush = [];
  callbacks.forEach((callback) => callback());
}

function autoBack() {
  autoBackPending = true;
  window.clearTimeout(autoBackTimer);
  // history.back() does nothing at the start of the session history; don't wait forever.
  autoBackTimer = window.setTimeout(() => {
    if (autoBackPending) {
      autoBackPending = false;
      backChain = null;
      flush();
    }
  }, 1000);
  window.history.back();
}

function handlePopState(event: PopStateEvent) {
  const isAuto = autoBackPending;
  autoBackPending = false;
  window.clearTimeout(autoBackTimer);
  if (!isAuto || !backChain) {
    backChain = { closedLayer: false, skippedDead: false, finishing: false };
  }
  const chain = backChain;

  const mark = readMark(event.state);
  const index = mark ? entries.findIndex((entry) => entry.key === mark) : -1;

  if (mark && index === -1) {
    // Left behind by a layer that no longer exists (e.g. the page changed): step over it.
    autoBack();
    return;
  }

  const popped = entries.slice(index + 1).reverse();
  entries = entries.slice(0, index + 1);
  for (const entry of popped) {
    if (entry.dead) {
      chain.skippedDead = true;
    } else {
      chain.closedLayer = true;
      entry.onPop();
    }
  }

  if (entries[entries.length - 1]?.dead) {
    autoBack();
    return;
  }

  if (chain.skippedDead && !chain.closedLayer && !chain.finishing) {
    // This press only removed closed layers' entries; nothing changed on screen, so carry on.
    chain.finishing = true;
    autoBack();
    return;
  }

  backChain = null;
  if (queuedPushes.length > 0 || afterFlush.length > 0) {
    scheduleFlush();
  }
}

function removeEntry(entry: LayerEntry) {
  const queuedIndex = queuedPushes.indexOf(entry);
  if (queuedIndex !== -1) {
    queuedPushes.splice(queuedIndex, 1);
    return;
  }

  entry.dead = true;
}

/**
 * Retires every layer entry (without calling onPop), then runs `then` — use it right before
 * leaving the page. Back steps over the retired entries; layers that were active won't push again.
 */
export function releaseHistoryLayers(then: () => void) {
  if (typeof window === "undefined") {
    then();
    return;
  }

  queuedPushes.forEach((entry) => releasedOwners.add(entry.owner));
  queuedPushes = [];
  entries.forEach((entry) => {
    entry.dead = true;
    releasedOwners.add(entry.owner);
  });
  afterFlush.push(then);
  scheduleFlush();
}

/**
 * While `active`, keeps a history entry so system Back calls `onPop` instead of leaving the page.
 * If the layer is still active after `onPop` (it chose to stay open), a new entry is pushed.
 */
export function useHistoryLayer(active: boolean, onPop: () => void) {
  const owner = useId();
  const onPopRef = useRef(onPop);
  const [generation, setGeneration] = useState(0);

  useEffect(() => {
    onPopRef.current = onPop;
  }, [onPop]);

  useEffect(() => {
    return () => {
      releasedOwners.delete(owner);
    };
  }, [owner]);

  useEffect(() => {
    if (!active) {
      return;
    }

    counter += 1;
    const entry: LayerEntry = {
      key: `${SESSION}-${counter}`,
      owner,
      dead: false,
      onPop: () => {
        setGeneration((current) => current + 1);
        onPopRef.current();
      },
    };
    queuedPushes.push(entry);
    scheduleFlush();

    return () => removeEntry(entry);
  }, [active, generation, owner]);
}

install();
