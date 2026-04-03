"use client";

import { IconButton } from "@mui/material";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import LightModeIcon from "@mui/icons-material/LightMode";
import { useThemeToggle } from "./ThemeRegistry";

export default function ThemeToggle() {
    const { toggleMode, mode } = useThemeToggle();
    return (
        <div className="flex justify-end">
            <IconButton
                onClick={toggleMode}
                sx={{
                    border: "1px solid var(--sidebar-border)",
                    backgroundImage:
                        "linear-gradient(135deg, rgba(79, 139, 255, 0.18), rgba(18, 214, 255, 0.05))",
                    backgroundColor: "color-mix(in oklab, var(--sidebar-accent) 90%, black)",
                    color: "var(--primary)",
                    boxShadow: "0 12px 26px rgba(79, 139, 255, 0.2)",
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
                }}
            >
                {mode === "light" ? <DarkModeIcon /> : <LightModeIcon />}
            </IconButton>
        </div>
    );
}
