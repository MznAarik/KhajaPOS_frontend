export type ThemeMode = "light" | "dark";

export const THEME_STORAGE_KEYS = {
    admin: "adminTheme:choice",
    customer: "customerTheme:choice",
    public: "theme:choice",
} as const;

export const getThemeStorageKey = (pathname: string | null | undefined) => {
    if (pathname?.startsWith("/admin") || pathname?.startsWith("/user")) {
        return THEME_STORAGE_KEYS.admin;
    }

    if (pathname?.startsWith("/order")) {
        return THEME_STORAGE_KEYS.customer;
    }

    return THEME_STORAGE_KEYS.public;
};

export const getDeviceThemeMode = (): ThemeMode => {
    if (typeof window === "undefined") return "light";

    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
};

export const readStoredThemeChoice = (storageKey: string): ThemeMode | null => {
    if (typeof window === "undefined") return null;

    try {
        const saved = window.localStorage.getItem(storageKey);

        return saved === "light" || saved === "dark" ? saved : null;
    } catch {
        return null;
    }
};

/**
 * An explicit in-app choice wins; otherwise follow the device theme.
 */
export const resolveThemeMode = (storageKey: string): ThemeMode =>
    readStoredThemeChoice(storageKey) ?? getDeviceThemeMode();

export const applyThemeMode = (nextMode: ThemeMode, storageKey?: string) => {
    if (typeof document === "undefined") return;

    const root = document.documentElement;

    root.classList.remove("light", "dark");
    root.classList.add(nextMode);
    root.setAttribute("data-theme", nextMode);
    root.style.colorScheme = nextMode;

    if (storageKey && typeof window !== "undefined") {
        try {
            window.localStorage.setItem(storageKey, nextMode);
        } catch {
            // private mode / blocked storage: keep the in-memory choice only
        }
    }
};

/**
 * Runs before React hydrates so the first paint already matches the device
 * theme (or the user's explicit choice) instead of flashing light mode.
 */
export const THEME_INIT_SCRIPT = `(function () {
  try {
    var path = window.location.pathname || "";
    var key =
      path.indexOf("/admin") === 0 || path.indexOf("/user") === 0
        ? "${THEME_STORAGE_KEYS.admin}"
        : path.indexOf("/order") === 0
          ? "${THEME_STORAGE_KEYS.customer}"
          : "${THEME_STORAGE_KEYS.public}";
    var saved = null;
    try {
      saved = window.localStorage.getItem(key);
    } catch (error) {}
    var mode =
      saved === "light" || saved === "dark"
        ? saved
        : window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light";
    var root = document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(mode);
    root.setAttribute("data-theme", mode);
    root.style.colorScheme = mode;
  } catch (error) {}
})();`;
