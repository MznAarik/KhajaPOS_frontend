import type { Transition } from "motion/react";
import { motionDuration } from "./tokens";

/** Tactile micro-interaction springs (physics-driven). */
export const spring = {
  /** Button press: sink to 95% then spring back with slight overshoot. */
  press: {
    type: "spring",
    stiffness: 400,
    damping: 15,
    mass: 0.7,
  } satisfies Transition,
  /** Toggle/mechanical switch: stretch/overshoot then settle. */
  toggle: {
    type: "spring",
    stiffness: 500,
    damping: 25,
    mass: 0.8,
  } satisfies Transition,
  /** Indicator pill / continuity glide. */
  indicator: {
    type: "spring",
    stiffness: 420,
    damping: 32,
    mass: 0.9,
  } satisfies Transition,
  /** Pop/burst emphasis. */
  pop: {
    type: "spring",
    stiffness: 520,
    damping: 18,
    mass: 0.6,
  } satisfies Transition,
} as const;

/** Error shake: communicates "no" before text is read. */
export const shakeTransition = {
  x: {
    duration: motionDuration.emphasis / 1000,
    ease: "easeInOut",
    times: [0, 0.16, 0.33, 0.5, 0.66, 0.83, 1],
  },
} satisfies Transition;

export const shakeKeyframes = {
  x: [0, -8, 7, -6, 4, -2, 0],
};
