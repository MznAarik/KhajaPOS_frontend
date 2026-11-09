"use client";

import * as React from "react";
import { motion, useAnimation, useReducedMotion, type Variants } from "motion/react";
import { cn } from "@/lib/utils";

export interface AnimatedIconHandle {
  startAnimation: () => void;
  stopAnimation: () => void;
}

type LucideLike = React.ComponentType<{
  size?: number | string;
  className?: string;
  strokeWidth?: number | string;
  color?: string;
  "aria-hidden"?: boolean;
}>;

type Opts = {
  name: string;
  hover?: Variants;
  tap?: Variants;
};

const smooth: [number, number, number, number] = [0.22, 1, 0.36, 1];

export function createAnimatedLucideIcon(Icon: LucideLike, opts: Opts) {
  const hover: Variants = opts.hover ?? {
    normal: { scale: 1, rotate: 0, y: 0 },
    animate: {
      scale: [1, 1.14, 1],
      rotate: [0, -4, 2, 0],
      y: [0, -1.5, 0],
      transition: { duration: 0.55, ease: smooth },
    },
  };

  const Comp = React.forwardRef<
    AnimatedIconHandle,
    {
      size?: number;
      className?: string;
      color?: string;
      isAnimated?: boolean;
      duration?: number;
      onMouseEnter?: React.MouseEventHandler<HTMLDivElement>;
      onMouseLeave?: React.MouseEventHandler<HTMLDivElement>;
    } & Omit<React.HTMLAttributes<HTMLDivElement>, "color">
  >(function AnimatedLucide(
    {
      size = 24,
      className,
      color,
      isAnimated = true,
      onMouseEnter,
      onMouseLeave,
      ...props
    },
    ref,
  ) {
    const controls = useAnimation();
    const reduced = useReducedMotion();
    const controlled = React.useRef(false);

    React.useImperativeHandle(ref, () => {
      controlled.current = true;
      return {
        startAnimation: () => (reduced ? controls.start("normal") : controls.start("animate")),
        stopAnimation: () => controls.start("normal"),
      };
    });

    const handleEnter = React.useCallback(
      (e: React.MouseEvent<HTMLDivElement>) => {
        if (!isAnimated || reduced) return;
        if (!controlled.current) void controls.start("animate");
        onMouseEnter?.(e);
      },
      [controls, isAnimated, onMouseEnter, reduced],
    );

    const handleLeave = React.useCallback(
      (e: React.MouseEvent<HTMLDivElement>) => {
        if (!controlled.current) void controls.start("normal");
        onMouseLeave?.(e);
      },
      [controls, onMouseLeave],
    );

    return (
      <motion.div
        className={cn("inline-flex items-center justify-center", className)}
        onMouseEnter={handleEnter}
        onMouseLeave={handleLeave}
        animate={controls}
        initial="normal"
        variants={hover}
        style={{ color }}
        {...(props as any)}
      >
        <Icon size={size} strokeWidth={2} aria-hidden />
      </motion.div>
    );
  });

  Comp.displayName = opts.name;
  return Comp;
}
