"use client";

import { getPrefersReducedMotion } from "./reduced";

type StartViewTransition = (cb: () => void | Promise<void>) => { finished: Promise<void> };

/** Progressive View Transitions API wrapper (instant fallback / reduced-motion safe). */
export function withViewTransition(update: () => void | Promise<void>): Promise<void> {
  if (typeof document === "undefined" || getPrefersReducedMotion()) {
    return Promise.resolve(update());
  }
  const start = (document as Document & { startViewTransition?: StartViewTransition }).startViewTransition;
  if (typeof start !== "function") {
    return Promise.resolve(update());
  }
  try {
    return start.call(document, update).finished.catch(() => {
      // Ignore transition interruption/cancellation.
    });
  } catch {
    return Promise.resolve(update());
  }
}

export function supportsViewTransitions(): boolean {
  if (typeof document === "undefined") return false;
  return typeof (document as Document & { startViewTransition?: unknown }).startViewTransition === "function";
}

/** Safe, unique-enough view-transition-name for a given entity (no collisions via prefix+id). */
export function vtName(prefix: string, id: string | number): string {
  const safe = String(id).replace(/[^a-zA-Z0-9_-]/g, "-");
  return `${prefix}-${safe}`;
}
