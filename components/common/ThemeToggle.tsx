"use client";

import * as React from "react";
import { IconButton } from "@mui/material";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import LightModeIcon from "@mui/icons-material/LightMode";
import { motion } from "motion/react";
import { useThemeToggle } from "./ThemeRegistry";
import { spring, useReducedMotion } from "@/lib/motion";

const MotionIconButton = motion.create(IconButton);

export default function ThemeToggle() {
    const { toggleMode, mode } = useThemeToggle();
    const suppressNextClick = React.useRef(false);
    const reducedMotion = useReducedMotion();

    const originFrom = (element: HTMLElement | null) => {
        if (!element) return undefined;

        const rect = element.getBoundingClientRect();

        return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    };

    const handlePointerUp = (event: React.PointerEvent<HTMLButtonElement>) => {
        if (event.pointerType === "mouse") return;

        event.preventDefault();
        event.stopPropagation();
        suppressNextClick.current = true;
        toggleMode(originFrom(event.currentTarget));
    };

    const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
        event.preventDefault();
        event.stopPropagation();

        if (suppressNextClick.current) {
            suppressNextClick.current = false;
            return;
        }

        toggleMode(originFrom(event.currentTarget));
    };

    return (
        <MotionIconButton
            type="button"
            aria-label={`Switch to ${mode === "light" ? "dark" : "light"} mode`}
            aria-pressed={mode === "dark"}
            onPointerUp={handlePointerUp}
            onClick={handleClick}
            whileTap={reducedMotion ? undefined : { scale: 0.95 }}
            transition={spring.press}
            sx={{
                width: 44,
                height: 44,
                borderRadius: "999px",
                pointerEvents: "auto",
                border: "1px solid var(--sidebar-border)",
                backgroundImage:
                    "linear-gradient(135deg, color-mix(in srgb, var(--primary) 22%, transparent), color-mix(in srgb, var(--accent) 10%, transparent))",
                backgroundColor: "color-mix(in srgb, var(--card) 84%, transparent)",
                color: "var(--primary)",
                boxShadow: "0 12px 26px color-mix(in srgb, var(--primary) 18%, transparent)",
                transition: "background-color 200ms ease, color 200ms ease, box-shadow 200ms ease, border-color 200ms ease",
                "&:hover": {
                    backgroundColor: "color-mix(in srgb, var(--primary) 16%, var(--card))",
                    color: "var(--primary)",
                    boxShadow: "0 14px 30px color-mix(in srgb, var(--primary) 24%, transparent)",
                },
                "&:active": {
                    transform: "none",
                },
                "&:focus-visible": {
                    outline: "3px solid color-mix(in srgb, var(--ring) 45%, transparent)",
                    outlineOffset: "3px",
                },
            }}
        >
            {mode === "light" ? <DarkModeIcon /> : <LightModeIcon />}
        </MotionIconButton>
    );
}
