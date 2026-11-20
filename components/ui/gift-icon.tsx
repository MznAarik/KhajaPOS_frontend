"use client";

import { cn } from "@/lib/utils";
import type { Variants } from "motion/react";
import {
  LazyMotion,
  domMin,
  m,
  useAnimation,
  useReducedMotion,
} from "motion/react";
import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useRef,
  type HTMLAttributes,
} from "react";

export interface GiftIconHandle {
  startAnimation: () => void;
  stopAnimation: () => void;
}

interface GiftIconProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  | "color"
  | "onDrag"
  | "onDragStart"
  | "onDragEnd"
  | "onAnimationStart"
  | "onAnimationEnd"
  | "onAnimationIteration"
> {
  size?: number;
  duration?: number;
  isAnimated?: boolean;
  color?: string;
}

const GiftIcon = forwardRef<GiftIconHandle, GiftIconProps>(
  (
    {
      onMouseEnter,
      onMouseLeave,
      className,
      size = 24,
      duration = 1,
      isAnimated = true,
      color,
      ...props
    },
    ref,
  ) => {
    const controls = useAnimation();
    const reduced = useReducedMotion();
    const isControlled = useRef(false);

    useImperativeHandle(ref, () => {
      isControlled.current = true;
      return {
        startAnimation: () =>
          reduced ? controls.start("normal") : controls.start("animate"),
        stopAnimation: () => controls.start("normal"),
      };
    });

    const handleEnter = useCallback(
      (e?: React.MouseEvent<HTMLDivElement>) => {
        if (!isAnimated || reduced) return;
        if (!isControlled.current) controls.start("animate");
        else onMouseEnter?.(e as any);
      },
      [controls, reduced, isAnimated, onMouseEnter],
    );

    const handleLeave = useCallback(
      (e: React.MouseEvent<HTMLDivElement>) => {
        if (!isControlled.current) {
          controls.start("normal");
        } else {
          onMouseLeave?.(e as any);
        }
      },
      [controls, onMouseLeave],
    );

    const lidVariants: Variants = {
      normal: { y: 0, rotate: 0 },
      animate: {
        y: [0, -2, 0],
        rotate: [0, -3, 0],
        transition: { duration: 0.5 * duration, ease: "easeInOut" },
      },
    };

    const boxVariants: Variants = {
      normal: { scale: 1 },
      animate: {
        scale: [1, 1.03, 1],
        transition: { duration: 0.5 * duration, ease: "easeInOut" },
      },
    };

    return (
      <LazyMotion features={domMin} strict>
        <m.div
          className={cn("inline-flex items-center justify-center", className)}
          onMouseEnter={handleEnter}
          onMouseLeave={handleLeave}
          {...props}
          style={{ color, ...props.style }}
        >
          <m.svg
            xmlns="http://www.w3.org/2000/svg"
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial="normal"
            animate={controls}
          >
            <m.rect variants={boxVariants} x="3" y="8" width="18" height="4" rx="1" />
            <m.path variants={boxVariants} d="M12 8v13" />
            <m.path variants={boxVariants} d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7" />
            <m.g variants={lidVariants} style={{ originX: "12px", originY: "8px" }}>
              <path d="M7.5 8a2.5 2.5 0 0 1 0-5A4.8 8 0 0 1 12 8a4.8 8 0 0 1 4.5-5 2.5 2.5 0 0 1 0 5" />
            </m.g>
          </m.svg>
        </m.div>
      </LazyMotion>
    );
  },
);

GiftIcon.displayName = "GiftIcon";
export { GiftIcon };
