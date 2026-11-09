"use client";
import { MessageSquare } from "lucide-react";
import { createAnimatedLucideIcon, type AnimatedIconHandle } from "./animated-lucide";

export type MessageSquareIconHandle = AnimatedIconHandle;
export const MessageSquareIcon = createAnimatedLucideIcon(MessageSquare, { name: "MessageSquareIcon" });
export default MessageSquareIcon;
