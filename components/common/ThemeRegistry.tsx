"use client";

import * as React from "react";
import { ThemeProvider, CssBaseline, Box } from "@mui/material";
import { createPortal } from "react-dom";
import { createAppTheme } from "../../app/src/theme";
import { usePathname } from "next/navigation";
import {
    applyThemeMode,
    getThemeStorageKey,
    readStoredThemeChoice,
    resolveThemeMode,
    type ThemeMode,
} from "./theme-mode";

const useIsomorphicLayoutEffect =
    typeof window === "undefined" ? React.useEffect : React.useLayoutEffect;

interface ThemeOrigin {
    x: number;
    y: number;
}

interface ThemeContextType {
    toggleMode: (origin?: ThemeOrigin) => void;
    mode: ThemeMode;
}

export const ThemeContext = React.createContext<ThemeContextType>({
    toggleMode: () => { },
    mode: "light",
});

export function useThemeToggle() {
    return React.useContext(ThemeContext);
}

const readThemeVar = (name: string, mode: ThemeMode, fallback: string) => {
    if (typeof document === "undefined") return fallback;

    const root = document.documentElement;
    const hadDark = root.classList.contains("dark");
    const needsDark = mode === "dark";
    let value = fallback;

    if (hadDark !== needsDark) {
        root.classList.toggle("dark", needsDark);
        value = getComputedStyle(root).getPropertyValue(name).trim() || fallback;
        root.classList.toggle("dark", hadDark);
    } else {
        value = getComputedStyle(root).getPropertyValue(name).trim() || fallback;
    }

    return value;
};

const prefersReducedMotion = () =>
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

type DropletPhase = "start" | "expand" | "fade";

interface DropletState {
    id: number;
    x: number;
    y: number;
    radius: number;
    background: string;
    glow: string;
    phase: DropletPhase;
}

const DROP_EXPAND_MS = 700;
const DROP_FADE_DELAY_MS = 850;
const DROP_TOTAL_MS = 1150;

export default function ThemeRegistry({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const storageKey = React.useMemo(() => getThemeStorageKey(pathname), [pathname]);
    const [mode, setMode] = React.useState<ThemeMode>("light");
    const [droplet, setDroplet] = React.useState<DropletState | null>(null);
    const timersRef = React.useRef<number[]>([]);
    const busyRef = React.useRef(false);

    // Device preference decides the first load; an explicit in-app choice wins.
    // The inline script in the root layout already applied it before paint, so
    // sync React state before the browser paints the hydrated tree.
    useIsomorphicLayoutEffect(() => {
        const nextMode = resolveThemeMode(storageKey);

        setMode(nextMode);
        applyThemeMode(nextMode);
    }, [storageKey]);

    // Follow live device theme changes until the user picks a mode manually.
    React.useEffect(() => {
        if (typeof window === "undefined") return;

        const media = window.matchMedia("(prefers-color-scheme: dark)");
        const handleDeviceThemeChange = (event: MediaQueryListEvent) => {
            if (readStoredThemeChoice(storageKey)) return;

            const nextMode: ThemeMode = event.matches ? "dark" : "light";

            setMode(nextMode);
            applyThemeMode(nextMode);
        };

        media.addEventListener("change", handleDeviceThemeChange);

        return () => media.removeEventListener("change", handleDeviceThemeChange);
    }, [storageKey]);

    const clearTimers = React.useCallback(() => {
        timersRef.current.forEach((id) => window.clearTimeout(id));
        timersRef.current = [];
        if (typeof document !== "undefined") {
            document.documentElement.classList.remove("theme-switching");
        }
    }, []);

    React.useEffect(() => clearTimers, [clearTimers]);

    const toggleMode = React.useCallback(
        (origin?: ThemeOrigin) => {
            const nextMode: ThemeMode = mode === "light" ? "dark" : "light";

            if (prefersReducedMotion() || busyRef.current) {
                setMode(nextMode);
                applyThemeMode(nextMode, storageKey);
                return;
            }

            busyRef.current = true;
            clearTimers();

            document.documentElement.classList.add("theme-switching");

            setMode(nextMode);
            applyThemeMode(nextMode, storageKey);

            const vw = window.innerWidth;
            const vh = window.innerHeight;
            const x = origin?.x ?? vw / 2;
            const y = origin?.y ?? vh / 2;
            const radius = Math.hypot(Math.max(x, vw - x), Math.max(y, vh - y)) * 1.1;

            const background = readThemeVar(
                "--background",
                nextMode,
                nextMode === "dark" ? "#0b100c" : "#faf6f0"
            );
            const glow = readThemeVar("--primary", nextMode, nextMode === "dark" ? "#e08061" : "#b45309");

            setDroplet({ id: Date.now(), x, y, radius, background, glow, phase: "start" });

            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    setDroplet((prev) => (prev ? { ...prev, phase: "expand" } : prev));
                });
            });

            timersRef.current.push(
                window.setTimeout(() => {
                    setDroplet((prev) => (prev ? { ...prev, phase: "fade" } : prev));
                }, DROP_FADE_DELAY_MS),
                window.setTimeout(() => {
                    setDroplet(null);
                    busyRef.current = false;
                    document.documentElement.classList.remove("theme-switching");
                }, DROP_TOTAL_MS)
            );
        },
        [mode, storageKey, clearTimers]
    );

    const theme = React.useMemo(() => createAppTheme(mode), [mode]);

    const overlay =
        droplet === null ? null : (
            <Box
                aria-hidden="true"
                data-theme-droplet="true"
                data-phase={droplet.phase}
                sx={{
                    position: "fixed",
                    inset: 0,
                    zIndex: 13000,
                    overflow: "hidden",
                    pointerEvents: "none",
                    opacity: droplet.phase === "fade" ? 0 : 1,
                    transition: "opacity 320ms ease",
                }}
            >
                <Box
                    key={`${droplet.id}-body`}
                    sx={{
                        position: "absolute",
                        left: droplet.x - droplet.radius,
                        top: droplet.y - droplet.radius,
                        width: droplet.radius * 2,
                        height: droplet.radius * 2,
                        borderRadius: "50%",
                        backgroundColor: droplet.background,
                        border: `1.5px solid color-mix(in srgb, ${droplet.glow} 55%, transparent)`,
                        transform: droplet.phase === "start" ? "translateZ(0) scale(0.001)" : "translateZ(0) scale(1)",
                        willChange: "transform",
                        backfaceVisibility: "hidden",
                        WebkitBackfaceVisibility: "hidden",
                        transition: `transform ${DROP_EXPAND_MS}ms cubic-bezier(0.22, 0.85, 0.25, 1)`,
                    }}
                />
                <Box
                    key={`${droplet.id}-ripple`}
                    sx={{
                        position: "absolute",
                        left: droplet.x - droplet.radius,
                        top: droplet.y - droplet.radius,
                        width: droplet.radius * 2,
                        height: droplet.radius * 2,
                        borderRadius: "50%",
                        border: `2px solid color-mix(in srgb, ${droplet.glow} 70%, transparent)`,
                        transform: droplet.phase === "start" ? "scale(0.08)" : "scale(1.2)",
                        opacity: droplet.phase === "start" ? 0.95 : 0,
                        backfaceVisibility: "hidden",
                        WebkitBackfaceVisibility: "hidden",
                        transition:
                            "transform 950ms cubic-bezier(0.16, 1, 0.3, 1), opacity 450ms ease 350ms",
                    }}
                />
                <Box
                    key={`${droplet.id}-halo`}
                    sx={{
                        position: "absolute",
                        left: droplet.x - 42,
                        top: droplet.y - 42,
                        width: 84,
                        height: 84,
                        borderRadius: "50%",
                        background: `radial-gradient(circle, color-mix(in srgb, ${droplet.glow} 45%, transparent) 0%, transparent 70%)`,
                        transform: droplet.phase === "start" ? "scale(0.4)" : "scale(3.2)",
                        opacity: droplet.phase === "start" ? 1 : 0,
                        transition:
                            "transform 650ms ease-out, opacity 550ms ease 180ms",
                    }}
                />
            </Box>
        );

    return (
        <ThemeContext.Provider value={{ toggleMode, mode }}>
            <ThemeProvider theme={theme}>
                <CssBaseline />
                {children}
                {typeof document === "undefined" ? null : createPortal(overlay, document.body)}
            </ThemeProvider>
        </ThemeContext.Provider>
    );
}
