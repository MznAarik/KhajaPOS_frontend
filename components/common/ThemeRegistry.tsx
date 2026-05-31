"use client";

import * as React from "react";
import { ThemeProvider, CssBaseline } from "@mui/material";
import { createAppTheme } from "../../app/src/theme";

interface ThemeContextType {
    toggleMode: () => void;
    mode: "light" | "dark";
}

export const ThemeContext = React.createContext<ThemeContextType>({
    toggleMode: () => { },
    mode: "light",
});

export function useThemeToggle() {
    return React.useContext(ThemeContext);
}

const applyThemeMode = (nextMode: "light" | "dark") => {
    if (typeof document === "undefined") return;

    const root = document.documentElement;

    root.classList.remove("light", "dark");
    root.classList.add(nextMode);
    root.setAttribute("data-theme", nextMode);
    root.style.colorScheme = nextMode;

    window.localStorage.setItem("theme", nextMode);
};

export default function ThemeRegistry({ children }: { children: React.ReactNode }) {
    const [mode, setMode] = React.useState<"light" | "dark">("light");

    // Load saved theme
    React.useEffect(() => {
        const saved = localStorage.getItem("theme") as "light" | "dark" | null;
        if (saved) {
            setMode(saved);
            applyThemeMode(saved);
        } else {
            // Optional: respect system preference
            const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
            const preferredMode = prefersDark ? "dark" : "light";
            setMode(preferredMode);
            applyThemeMode(preferredMode);
        }
    }, []);

    // Apply theme changes
    React.useEffect(() => {
        applyThemeMode(mode);
    }, [mode]);

    const toggleMode = React.useCallback(() => {
        setMode((prev) => {
            const nextMode = prev === "light" ? "dark" : "light";
            applyThemeMode(nextMode);
            return nextMode;
        });
    }, []);

    const theme = React.useMemo(() => createAppTheme(mode), [mode]);

    return (
        <ThemeContext.Provider value={{ toggleMode, mode }}>
            <ThemeProvider theme={theme}>
                <CssBaseline />
                {children}
            </ThemeProvider>
        </ThemeContext.Provider>
    );
}
