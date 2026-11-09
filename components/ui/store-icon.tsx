"use client";
import { Store } from "lucide-react";
import { createAnimatedLucideIcon, type AnimatedIconHandle } from "./animated-lucide";

export type StoreIconHandle = AnimatedIconHandle;
export const StoreIcon = createAnimatedLucideIcon(Store, { name: "StoreIcon" });
export default StoreIcon;
