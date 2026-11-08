"use client";

import * as React from "react";

export type OriginStyle = { transformOrigin: string };

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

/** Directional transform-origin derived from a trigger element (viewport-aware, dialog-safe approximation). */
export function originFromElement(el: Element | null | undefined): OriginStyle {
  if (typeof window === "undefined" || !el || typeof (el as HTMLElement).getBoundingClientRect !== "function") {
    return { transformOrigin: "center center" };
  }
  const r = (el as HTMLElement).getBoundingClientRect();
  const cx = r.left + r.width / 2;
  const cy = r.top + r.height / 2;
  const x = clamp((cx / Math.max(window.innerWidth, 1)) * 100, 8, 92);
  const y = clamp((cy / Math.max(window.innerHeight, 1)) * 100, 8, 92);
  return { transformOrigin: `${x.toFixed(1)}% ${y.toFixed(1)}%` };
}

export function originFromEvent(e: React.SyntheticEvent | Event): OriginStyle {
  const current = (e as React.SyntheticEvent).currentTarget as Element | null | undefined;
  return originFromElement(current);
}

/** Capture a dialog/menu origin from the triggering event. Resets when closed (optional). */
export function useOrigin(initial: OriginStyle = { transformOrigin: "center center" }) {
  const [origin, setOrigin] = React.useState<OriginStyle>(initial);
  const capture = React.useCallback((e: React.SyntheticEvent | Event) => {
    setOrigin(originFromEvent(e));
  }, []);
  const reset = React.useCallback(() => setOrigin({ transformOrigin: "center center" }), []);
  return { origin, setOrigin, capture, reset };
}
