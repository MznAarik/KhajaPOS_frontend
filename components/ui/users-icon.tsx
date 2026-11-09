"use client";
import { Users } from "lucide-react";
import { createAnimatedLucideIcon, type AnimatedIconHandle } from "./animated-lucide";

export type UsersIconHandle = AnimatedIconHandle;
export const UsersIcon = createAnimatedLucideIcon(Users, { name: "UsersIcon" });
export default UsersIcon;
