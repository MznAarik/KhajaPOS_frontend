/**
 * Motion tokens (350–500ms primary interaction budget).
 * Keep non-essential motion subtle and respect prefers-reduced-motion.
 */
export const motionDuration = {
  instant: 0,
  fast: 180,
  base: 260,
  enter: 360,
  emphasis: 460,
  slow: 500,
} as const;

export const motionEase = {
  standard: [0.2, 0, 0, 1] as const,
  decelerate: [0, 0, 0, 1] as const,
  accelerate: [0.3, 0, 1, 1] as const,
  // Smooth, responsive (used for shell/page continuity).
  continuity: [0.22, 1, 0.36, 1] as const,
} as const;

export const motionDistance = {
  pressScale: 0.95,
  hoverLift: -1,
  pageY: 16,
} as const;
