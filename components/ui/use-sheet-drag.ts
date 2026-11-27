"use client";

import { useRef, type PointerEvent as ReactPointerEvent, type RefObject } from "react";

const DISMISS_DISTANCE = 80;
const FLICK_VELOCITY = 0.5; // px per ms
const START_THRESHOLD = 6;

type DragState = {
  pointerId: number;
  startY: number;
  lastY: number;
  lastTime: number;
  velocity: number;
  dragging: boolean;
};

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Drag-down-to-dismiss for a bottom sheet (mobile only). Spread the returned handlers on the
 * handle/header area; the panel follows the finger and closes past 80px or on a quick flick.
 */
export function useSheetDrag(panelRef: RefObject<HTMLElement | null>, onDismiss: () => void) {
  const drag = useRef<DragState | null>(null);

  function setOffset(offset: number, transition: string) {
    const panel = panelRef.current;
    if (!panel) {
      return;
    }

    panel.style.transition = transition;
    panel.style.transform = offset === 0 ? "" : `translateY(${offset}px)`;
  }

  function finish(event: ReactPointerEvent<HTMLElement>, cancelled: boolean) {
    const state = drag.current;
    if (!state || state.pointerId !== event.pointerId) {
      return;
    }

    drag.current = null;
    if (!state.dragging) {
      return;
    }

    const distance = event.clientY - state.startY;
    const reduceMotion = prefersReducedMotion();
    const shouldDismiss =
      !cancelled && (distance > DISMISS_DISTANCE || (state.velocity > FLICK_VELOCITY && distance > 24));

    if (!shouldDismiss) {
      setOffset(0, reduceMotion ? "none" : "transform 200ms cubic-bezier(0.2, 0.8, 0.2, 1)");
      return;
    }

    const panel = panelRef.current;
    const resetIfStillOpen = () => {
      // The owner may keep the sheet open (e.g. while saving); put it back in place.
      requestAnimationFrame(() => {
        if (panel?.isConnected) {
          setOffset(0, "none");
        }
      });
    };

    if (reduceMotion || !panel) {
      onDismiss();
      resetIfStillOpen();
      return;
    }

    setOffset(panel.offsetHeight + 40, "transform 160ms ease-in");
    window.setTimeout(() => {
      onDismiss();
      resetIfStillOpen();
    }, 150);
  }

  return {
    onPointerDown(event: ReactPointerEvent<HTMLElement>) {
      if (event.pointerType === "mouse" && event.button !== 0) {
        return;
      }

      if (!window.matchMedia("(max-width: 767px)").matches) {
        return;
      }

      if ((event.target as HTMLElement).closest("button, a, input, textarea, select")) {
        return;
      }

      drag.current = {
        pointerId: event.pointerId,
        startY: event.clientY,
        lastY: event.clientY,
        lastTime: event.timeStamp,
        velocity: 0,
        dragging: false,
      };
    },
    onPointerMove(event: ReactPointerEvent<HTMLElement>) {
      const state = drag.current;
      if (!state || state.pointerId !== event.pointerId) {
        return;
      }

      const distance = event.clientY - state.startY;

      if (!state.dragging) {
        if (distance < -START_THRESHOLD) {
          drag.current = null;
          return;
        }

        if (distance < START_THRESHOLD) {
          return;
        }

        state.dragging = true;
        event.currentTarget.setPointerCapture(event.pointerId);
      }

      const elapsed = event.timeStamp - state.lastTime;
      if (elapsed > 0) {
        state.velocity = (event.clientY - state.lastY) / elapsed;
      }
      state.lastY = event.clientY;
      state.lastTime = event.timeStamp;
      setOffset(Math.max(0, distance), "none");
    },
    onPointerUp(event: ReactPointerEvent<HTMLElement>) {
      finish(event, false);
    },
    onPointerCancel(event: ReactPointerEvent<HTMLElement>) {
      finish(event, true);
    },
  };
}
