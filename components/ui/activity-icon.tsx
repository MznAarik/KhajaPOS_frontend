"use client";
import { Activity } from "lucide-react";
import { createAnimatedLucideIcon, type AnimatedIconHandle } from "./animated-lucide";

export type ActivityIconHandle = AnimatedIconHandle;
export const ActivityIcon = createAnimatedLucideIcon(Activity, { name: "ActivityIcon" });
export default ActivityIcon;
