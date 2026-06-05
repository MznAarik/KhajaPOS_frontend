"use client";

import * as React from "react";
import { ThemeProvider, CssBaseline } from "@mui/material";
import { createAppTheme } from "../../app/src/theme";
import { usePathname } from "next/navigation";

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

const getThemeStorageKey = (pathname: string | null) => {
    if (pathname?.startsWith("/admin") || pathname?.startsWith("/user")) {
        return "adminTheme";
    }

    if (pathname?.startsWith("/order")) {
        return "customerTheme";
    }

    return "theme";
};

const getPreferredThemeMode = (): "light" | "dark" => {
    if (typeof window === "undefined") return "light";

    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
};

const readStoredThemeMode = (storageKey: string): "light" | "dark" | null => {
    if (typeof window === "undefined") return null;

    const saved = window.localStorage.getItem(storageKey);

    return saved === "light" || saved === "dark" ? saved : null;
};

const applyThemeMode = (nextMode: "light" | "dark", storageKey?: string) => {
    if (typeof document === "undefined") return;

    const root = document.documentElement;

    root.classList.remove("light", "dark");
    root.classList.add(nextMode);
    root.setAttribute("data-theme", nextMode);
    root.style.colorScheme = nextMode;

    if (storageKey && typeof window !== "undefined") {
        window.localStorage.setItem(storageKey, nextMode);
    }
};

export default function ThemeRegistry({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const storageKey = React.useMemo(() => getThemeStorageKey(pathname), [pathname]);
    const [mode, setMode] = React.useState<"light" | "dark">("light");

    React.useEffect(() => {
        const nextMode = readStoredThemeMode(storageKey) ?? getPreferredThemeMode();

        setMode(nextMode);
        applyThemeMode(nextMode);
    }, [storageKey]);

    React.useEffect(() => {
        applyThemeMode(mode, storageKey);
    }, [mode, storageKey]);

    const toggleMode = React.useCallback(() => {
        setMode((prev) => {
            const nextMode = prev === "light" ? "dark" : "light";
            applyThemeMode(nextMode, storageKey);
            return nextMode;
        });
    }, [storageKey]);

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
