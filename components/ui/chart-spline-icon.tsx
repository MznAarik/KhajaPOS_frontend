"use client";
import { ChartSpline } from "lucide-react";
import { createAnimatedLucideIcon, type AnimatedIconHandle } from "./animated-lucide";

export type ChartSplineIconHandle = AnimatedIconHandle;
export const ChartSplineIcon = createAnimatedLucideIcon(ChartSpline, { name: "ChartSplineIcon" });
export default ChartSplineIcon;
