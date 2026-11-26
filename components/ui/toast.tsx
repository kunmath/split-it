"use client";

import { CheckCircle2 } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const STORAGE_KEY = "split-it:toast";
const EVENT_NAME = "split-it:toast";

/**
 * Queue a short confirmation. It survives a client-side navigation (stored in
 * sessionStorage) so screens can confirm a save and then route back.
 */
export function showToast(message: string) {
  try {
    window.sessionStorage.setItem(STORAGE_KEY, message);
  } catch {
    // Storage can be unavailable (private mode); the in-page event still fires.
  }
  window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: message }));
}

/** Mounted once in the app shell. Announces via an aria-live region. */
export function Toaster() {
  const pathname = usePathname();
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const consume = () => {
      let stored: string | null = null;
      try {
        stored = window.sessionStorage.getItem(STORAGE_KEY);
        window.sessionStorage.removeItem(STORAGE_KEY);
      } catch {
        stored = null;
      }
      if (stored) {
        setMessage(stored);
      }
    };

    consume();
    window.addEventListener(EVENT_NAME, consume);
    return () => window.removeEventListener(EVENT_NAME, consume);
  }, [pathname]);

  useEffect(() => {
    if (!message) {
      return;
    }
    const timeout = window.setTimeout(() => setMessage(null), 3200);
    return () => window.clearTimeout(timeout);
  }, [message]);

  return (
    <div
      aria-live="polite"
      role="status"
      className="pointer-events-none fixed inset-x-0 bottom-[calc(4.5rem+env(safe-area-inset-bottom)+0.75rem)] z-50 flex justify-center px-4 lg:bottom-8 lg:left-72"
    >
      {message ? (
        <div className="pointer-events-auto flex max-w-md items-center gap-2.5 rounded-2xl bg-surface-container-highest px-4 py-3 text-sm font-medium text-on-surface shadow-[0_16px_40px_rgba(0,0,0,0.45)] ring-1 ring-white/8">
          <CheckCircle2 aria-hidden="true" className="h-5 w-5 shrink-0 text-primary" />
          <span>{message}</span>
        </div>
      ) : null}
    </div>
  );
}
