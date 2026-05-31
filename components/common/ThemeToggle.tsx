"use client";

import * as React from "react";
import { Box } from "@mui/material";
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
        <Box sx={{ display: "flex", justifyContent: "flex-end", position: "relative", zIndex: 20 }}>
            <Box
                component="button"
                type="button"
                aria-label={`Switch to ${mode === "light" ? "dark" : "light"} mode`}
                aria-pressed={mode === "dark"}
                onPointerUp={handlePointerUp}
                onClick={handleClick}
                sx={{
                    position: "relative",
                    zIndex: 20,
                    width: 44,
                    height: 44,
                    p: 0,
                    m: 0,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    appearance: "none",
                    WebkitAppearance: "none",
                    borderRadius: "999px",
                    pointerEvents: "auto",
                    border: "1px solid var(--sidebar-border)",
                    backgroundImage:
                        "linear-gradient(135deg, rgba(79, 139, 255, 0.18), rgba(18, 214, 255, 0.05))",
                    backgroundColor: "color-mix(in oklab, var(--sidebar-accent) 90%, black)",
                    color: "var(--primary)",
                    boxShadow: "0 12px 26px rgba(79, 139, 255, 0.2)",
                    cursor: "pointer",
                    userSelect: "none",
                    touchAction: "manipulation",
                    transition: "all 200ms ease",
                    "&:hover": {
                        backgroundColor: "color-mix(in oklab, var(--sidebar-accent) 80%, black)",
                        color: "var(--primary)",
                        boxShadow: "0 12px 26px rgba(79, 139, 255, 0.2)",
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
            </Box>
        </Box>
    );
}
