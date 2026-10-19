"use client";

import * as React from "react";
import { ThemeProvider, CssBaseline, Box } from "@mui/material";
import { createPortal } from "react-dom";
import { createAppTheme } from "../../app/src/theme";
import { usePathname } from "next/navigation";

type ThemeMode = "light" | "dark";

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

const getThemeStorageKey = (pathname: string | null) => {
    if (pathname?.startsWith("/admin") || pathname?.startsWith("/user")) {
        return "adminTheme";
    }

    if (pathname?.startsWith("/order")) {
        return "customerTheme";
    }

    return "theme";
};

const getPreferredThemeMode = (): ThemeMode => {
    if (typeof window === "undefined") return "light";

    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
};

const readStoredThemeMode = (storageKey: string): ThemeMode | null => {
    if (typeof window === "undefined") return null;

    const saved = window.localStorage.getItem(storageKey);

    return saved === "light" || saved === "dark" ? saved : null;
};

const applyThemeMode = (nextMode: ThemeMode, storageKey?: string) => {
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

const DROP_EXPAND_MS = 850;
const DROP_FADE_DELAY_MS = 1000;
const DROP_TOTAL_MS = 1500;

export default function ThemeRegistry({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const storageKey = React.useMemo(() => getThemeStorageKey(pathname), [pathname]);
    const [mode, setMode] = React.useState<ThemeMode>("light");
    const [droplet, setDroplet] = React.useState<DropletState | null>(null);
    const timersRef = React.useRef<number[]>([]);
    const busyRef = React.useRef(false);

    React.useEffect(() => {
        const nextMode = readStoredThemeMode(storageKey) ?? getPreferredThemeMode();

        setMode(nextMode);
        applyThemeMode(nextMode);
    }, [storageKey]);

    React.useEffect(() => {
        applyThemeMode(mode, storageKey);
    }, [mode, storageKey]);

    const clearTimers = React.useCallback(() => {
        timersRef.current.forEach((id) => window.clearTimeout(id));
        timersRef.current = [];
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
                data-phase={droplet.phase}
                sx={{
                    position: "fixed",
                    inset: 0,
                    zIndex: 13000,
                    overflow: "hidden",
                    pointerEvents: "none",
                    opacity: droplet.phase === "fade" ? 0 : 1,
                    transition: "opacity 440ms ease",
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
                        backgroundImage: `radial-gradient(circle at 34% 26%, color-mix(in srgb, ${droplet.background} 64%, transparent), color-mix(in srgb, ${droplet.background} 46%, transparent) 55%, color-mix(in srgb, ${droplet.background} 24%, transparent))`,
                        backdropFilter: "blur(6px) saturate(1.4)",
                        WebkitBackdropFilter: "blur(6px) saturate(1.4)",
                        transform: droplet.phase === "start" ? "scale(0)" : "scale(1)",
                        transition: `transform ${DROP_EXPAND_MS}ms cubic-bezier(0.3, 0.65, 0.2, 1)`,
                        boxShadow: `inset 0 0 0 1.5px color-mix(in srgb, ${droplet.glow} 55%, transparent), inset 0 0 130px color-mix(in srgb, ${droplet.glow} 24%, transparent), 0 0 90px 18px color-mix(in srgb, ${droplet.glow} 22%, transparent)`,
                    }}
                >
                    <Box
                        sx={{
                            position: "absolute",
                            left: "16%",
                            top: "12%",
                            width: "36%",
                            height: "26%",
                            borderRadius: "50%",
                            background:
                                "linear-gradient(140deg, rgba(255, 255, 255, 0.8), rgba(255, 255, 255, 0))",
                            filter: "blur(14px)",
                            opacity: droplet.phase === "start" ? 0 : 0.9,
                            transition: "opacity 520ms ease 220ms",
                        }}
                    />
                </Box>
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
                        transition:
                            "transform 1250ms cubic-bezier(0.16, 1, 0.3, 1), opacity 700ms ease 450ms",
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
