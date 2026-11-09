"use client";
import { CreditCard } from "lucide-react";
import { createAnimatedLucideIcon, type AnimatedIconHandle } from "./animated-lucide";

export type CreditCardIconHandle = AnimatedIconHandle;
export const CreditCardIcon = createAnimatedLucideIcon(CreditCard, { name: "CreditCardIcon" });
export default CreditCardIcon;
