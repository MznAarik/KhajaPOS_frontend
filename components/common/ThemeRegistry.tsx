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

export default function ThemeRegistry({ children }: { children: React.ReactNode }) {
    const [mode, setMode] = React.useState<"light" | "dark">("light");

    // Load saved theme
    React.useEffect(() => {
        const saved = localStorage.getItem("theme") as "light" | "dark" | null;
        if (saved) {
            setMode(saved);
        } else {
            // Optional: respect system preference
            const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
            setMode(prefersDark ? "dark" : "light");
        }
    }, []);

    // Apply theme changes
    React.useEffect(() => {
        const root = document.documentElement;

        root.classList.remove("light", "dark");
        root.classList.add(mode);
        root.setAttribute("data-theme", mode);

        localStorage.setItem("theme", mode);
    }, [mode]);

    const toggleMode = () => {
        setMode((prev) => (prev === "light" ? "dark" : "light"));
    };

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