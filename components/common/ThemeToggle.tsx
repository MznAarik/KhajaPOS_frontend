"use client";

import * as React from "react";
import { IconButton } from "@mui/material";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import LightModeIcon from "@mui/icons-material/LightMode";
import { useThemeToggle } from "./ThemeRegistry";

export default function ThemeToggle() {
    const { toggleMode, mode } = useThemeToggle();
    const suppressNextClick = React.useRef(false);

    const handlePointerUp = (event: React.PointerEvent<HTMLButtonElement>) => {
        if (event.pointerType === "mouse") return;

        event.preventDefault();
        event.stopPropagation();
        suppressNextClick.current = true;
        toggleMode();
    };

    const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
        event.preventDefault();
        event.stopPropagation();

        if (suppressNextClick.current) {
            suppressNextClick.current = false;
            return;
        }

        toggleMode();
    };

    return (
        <IconButton
            type="button"
            aria-label={`Switch to ${mode === "light" ? "dark" : "light"} mode`}
            aria-pressed={mode === "dark"}
            onPointerUp={handlePointerUp}
            onClick={handleClick}
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
                transition: "all 200ms ease",
                "&:hover": {
                    backgroundColor: "color-mix(in srgb, var(--primary) 16%, var(--card))",
                    color: "var(--primary)",
                    boxShadow: "0 14px 30px color-mix(in srgb, var(--primary) 24%, transparent)",
                    transform: "translateY(-1px)",
                },
                "&:active": {
                    transform: "translateY(0px) scale(0.98)",
                },
                "&:focus-visible": {
                    outline: "3px solid color-mix(in srgb, var(--ring) 45%, transparent)",
                    outlineOffset: "3px",
                },
            }}
        >
            {mode === "light" ? <DarkModeIcon /> : <LightModeIcon />}
        </IconButton>
    );
}
