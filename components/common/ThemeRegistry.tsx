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

    // Load saved mode
    React.useEffect(() => {
        const saved = localStorage.getItem("theme");
        if (saved === "light" || saved === "dark") setMode(saved);
    }, []);

    // Sync CSS variables and theme class
    React.useEffect(() => {
        const root = document.documentElement;
        root.setAttribute("data-theme", mode);

        if (mode === "dark") {
            root.classList.add("dark");
        } else {
            root.classList.remove("dark");
        }
    }, [mode]);

    const toggleMode = () => {
        setMode((prev) => {
            const next = prev === "light" ? "dark" : "light";
            localStorage.setItem("theme", next);
            return next;
        });
    };

    const theme = React.useMemo(
        () => createAppTheme(mode),
        [mode]
    );

    return (
        <ThemeContext.Provider value={{ toggleMode, mode }}>
            <ThemeProvider theme={theme}>
                <CssBaseline />
                {children}
            </ThemeProvider>
        </ThemeContext.Provider>
    );
}
