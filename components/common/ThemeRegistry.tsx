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

const DROP_EXPAND_MS = 1100;
const DROP_FADE_DELAY_MS = 1250;
const DROP_TOTAL_MS = 1650;

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

            const vw = window.innerWidth;
            const vh = window.innerHeight;
            const x = origin?.x ?? vw / 2;
            const y = origin?.y ?? vh / 2;
            const radius = Math.hypot(Math.max(x, vw - x), Math.max(y, vh - y)) * 1.12;

            const startVT = (document as Document & { startViewTransition?: (cb: () => void | Promise<void>) => { finished: Promise<void> } }).startViewTransition;
            if (typeof startVT === "function") {
                busyRef.current = true;
                const root = document.documentElement;
                root.style.setProperty("--theme-vt-x", `${x}px`);
                root.style.setProperty("--theme-vt-y", `${y}px`);
                root.style.setProperty("--theme-vt-r", `${radius}px`);
                root.dataset.themeVt = "reveal";
                root.classList.add("theme-switching");

                try {
                    const transition = startVT.call(document, () => {
                        setMode(nextMode);
                        applyThemeMode(nextMode, storageKey);
                    });
                    void transition.finished
                        .catch(() => {})
                        .finally(() => {
                            delete root.dataset.themeVt;
                            root.style.removeProperty("--theme-vt-x");
                            root.style.removeProperty("--theme-vt-y");
                            root.style.removeProperty("--theme-vt-r");
                            root.classList.remove("theme-switching");
                            busyRef.current = false;
                        });
                    return;
                } catch {
                    delete root.dataset.themeVt;
                    root.style.removeProperty("--theme-vt-x");
                    root.style.removeProperty("--theme-vt-y");
                    root.style.removeProperty("--theme-vt-r");
                    root.classList.remove("theme-switching");
                    busyRef.current = false;
                }
            }

            busyRef.current = true;
            clearTimers();

            document.documentElement.classList.add("theme-switching");

            setMode(nextMode);
            applyThemeMode(nextMode, storageKey);

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
                        border: `2px solid color-mix(in srgb, ${droplet.glow} 62%, transparent)`,
                        boxShadow: `0 0 0 1px color-mix(in srgb, ${droplet.glow} 18%, transparent), 0 0 40px color-mix(in srgb, ${droplet.glow} 22%, transparent)`,
                        transform: droplet.phase === "start" ? "translateZ(0) scale(0.015)" : "translateZ(0) scale(1)",
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
                        border: `2.5px solid color-mix(in srgb, ${droplet.glow} 78%, transparent)`,
                        boxShadow: `0 0 24px color-mix(in srgb, ${droplet.glow} 28%, transparent)`,
                        transform: droplet.phase === "start" ? "scale(0.04)" : "scale(1.15)",
                        opacity: droplet.phase === "start" ? 1 : 0,
                        backfaceVisibility: "hidden",
                        WebkitBackfaceVisibility: "hidden",
                        transition:
                            "transform 1150ms cubic-bezier(0.16, 1, 0.3, 1), opacity 520ms ease 380ms",
                    }}
                />
                <Box
                    key={`${droplet.id}-halo`}
                    sx={{
                        position: "absolute",
                        left: droplet.x - 56,
                        top: droplet.y - 56,
                        width: 112,
                        height: 112,
                        borderRadius: "50%",
                        background: `radial-gradient(circle, color-mix(in srgb, ${droplet.glow} 55%, transparent) 0%, color-mix(in srgb, ${droplet.glow} 18%, transparent) 45%, transparent 72%)`,
                        transform: droplet.phase === "start" ? "scale(0.55)" : "scale(3.6)",
                        opacity: droplet.phase === "start" ? 1 : 0,
                        transition:
                            "transform 780ms ease-out, opacity 620ms ease 220ms",
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
