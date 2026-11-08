"use client";

import * as React from "react";
import {
    Alert,
    Badge,
    Box,
    Button,
    Chip,
    CircularProgress,
    Divider,
    Drawer,
    Fade,
    Grow,
    IconButton,
    List,
    ListItemText,
    Popover,
    Toolbar,
    Typography,
    Breadcrumbs,
    Link as MuiLink,
    AppBar,
    ListItemButton,
    Stack,
    Paper,
    BottomNavigation,
    BottomNavigationAction,
} from "@mui/material";
import { AnimatePresence, motion } from "motion/react";
import { DashboardIcon, type DashboardIconHandle } from "@/components/ui/dashboard-icon";
import { spring, useReducedMotion, withViewTransition } from "@/lib/motion";

const MotionIconButton = motion.create(IconButton);
import ThemeToggle from "@/components/common/ThemeToggle";
import { ShoppingCartIcon, type ShoppingCartIconHandle } from "@/components/ui/shopping-cart-icon";
import { LayoutListIcon, type LayoutListIconHandle } from "@/components/ui/layout-list-icon";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import ProfileComponent from "@/components/common/ProfileComponent";
import { CoffeeIcon, type CoffeeIconHandle } from "@/components/ui/coffee-icon";
import { HouseIcon, type HouseIconHandle } from "@/components/ui/house-icon";
import PeopleAltOutlinedIcon from "@mui/icons-material/PeopleAltOutlined";
import StorefrontOutlinedIcon from "@mui/icons-material/StorefrontOutlined";
import InsightsOutlinedIcon from "@mui/icons-material/InsightsOutlined";
import RateReviewOutlinedIcon from "@mui/icons-material/RateReviewOutlined";
import NotificationsNoneRoundedIcon from "@mui/icons-material/NotificationsNoneRounded";
import DoneAllRoundedIcon from "@mui/icons-material/DoneAllRounded";

import { AuthProvider, useAuth, type SessionUser } from "@/lib/auth-context";
import RoleGate from "@/components/admin/RoleGate";
import {
    getAdminNotifications,
    getAdminOrders,
    getBusinessSettings,
    getSuperAdminNotifications,
    markAdminNotificationsRead,
    markSuperAdminNotificationsRead,
    resolveMenuImageUrl,
    type PlatformStatusAlert,
    type SuperAdminNotificationItem,
} from "@/lib/api";

const drawerWidth = 260;

type NavIconHandle = { startAnimation: () => void; stopAnimation: () => void };

type NavItem = {
    text: string;
    href: string;
    icon: React.ElementType;
    ref?: React.RefObject<NavIconHandle | null>;
};

const withNavIcon = (Component: React.ComponentType<any>) =>
    React.forwardRef<SVGSVGElement, { size?: number; className?: string }>(
        function NavIcon({ size = 20, className }, ref) {
            return <Component ref={ref} className={className} sx={{ fontSize: size }} />;
        },
    );

const UsersNavIcon = withNavIcon(PeopleAltOutlinedIcon);
const RestaurantsNavIcon = withNavIcon(StorefrontOutlinedIcon);
const AnalyticsNavIcon = withNavIcon(InsightsOutlinedIcon);
const ReviewsNavIcon = withNavIcon(RateReviewOutlinedIcon);

export default function SideNavLayout({
    children,
    initialUser,
}: {
    children: React.ReactNode;
    initialUser?: SessionUser | null;
}) {
    return (
        <AuthProvider initialUser={initialUser}>
            <SideNavShell>{children}</SideNavShell>
        </AuthProvider>
    );
}

function SideNavShell({ children }: { children: React.ReactNode }) {
    const { isSuperAdmin } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const reducedMotion = useReducedMotion();
    const [hoveredItem, setHoveredItem] = React.useState<string | null>(null);
    const [brand, setBrand] = React.useState<{ name: string; logo: string | null } | null>(null);
    const dashboardIconRef = React.useRef<HouseIconHandle | null>(null);
    const categoryIconRef = React.useRef<ShoppingCartIconHandle | null>(null);
    const productsIconRef = React.useRef<LayoutListIconHandle | null>(null);
    const tablesIconRef = React.useRef<CoffeeIconHandle | null>(null);
    const ordersIconRef = React.useRef<DashboardIconHandle | null>(null);
    const mainRef = React.useRef<HTMLDivElement | null>(null);
    const [notifAnchor, setNotifAnchor] = React.useState<HTMLElement | null>(null);
    const [notifLoading, setNotifLoading] = React.useState(false);
    const [notifItems, setNotifItems] = React.useState<SuperAdminNotificationItem[]>([]);
    const [notifCounts, setNotifCounts] = React.useState<{ unread?: number; total?: number; critical?: number }>({});
    const [notifSaving, setNotifSaving] = React.useState(false);
    const [notifShowAll, setNotifShowAll] = React.useState(false);
    const notifHasLoadedRef = React.useRef(false);
    const lastMaxOrderIdRef = React.useRef<number | null>(null);
    const audioCtxRef = React.useRef<AudioContext | null>(null);
    const [platformStatus, setPlatformStatus] = React.useState<PlatformStatusAlert | null>(null);

    React.useEffect(() => {
        const onPlatformStatus = (event: Event) => {
            const detail = (event as CustomEvent<PlatformStatusAlert | null>).detail ?? null;
            if (!detail || (detail.code !== "MAINTENANCE_MODE" && detail.code !== "BUSINESS_SUSPENDED")) return;
            setPlatformStatus(detail);
        };
        window.addEventListener("khajapos:platform-status", onPlatformStatus as EventListener);
        return () => window.removeEventListener("khajapos:platform-status", onPlatformStatus as EventListener);
    }, []);

    const playNewOrderSound = React.useCallback(() => {
        try {
            const Ctx = (window.AudioContext || (window as any).webkitAudioContext);
            if (!Ctx) return;
            if (!audioCtxRef.current) audioCtxRef.current = new Ctx();
            const ctx = audioCtxRef.current;
            if (ctx.state === "suspended") void ctx.resume().catch(() => undefined);
            const now = ctx.currentTime;
            [880, 1174.66].forEach((freq, i) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = "sine";
                osc.frequency.setValueAtTime(freq, now + i * 0.12);
                gain.gain.setValueAtTime(0.0001, now + i * 0.12);
                gain.gain.exponentialRampToValueAtTime(0.12, now + i * 0.12 + 0.02);
                gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.12 + 0.18);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(now + i * 0.12);
                osc.stop(now + i * 0.12 + 0.2);
            });
        } catch {
            // ignore autoplay/audio failures
        }
    }, []);

    React.useEffect(() => {
        mainRef.current?.scrollTo({ top: 0 });
    }, [pathname]);

    React.useEffect(() => {
        if (isSuperAdmin) return;

        let active = true;

        getBusinessSettings()
            .then((data) => {
                if (!active) return;
                setBrand({ name: data.name, logo: resolveMenuImageUrl(data.logo) });
            })
            .catch(() => {
                // Keep default KhajaPOS branding when no business profile is available.
            });

        return () => {
            active = false;
        };
    }, [isSuperAdmin]);

    const navItems: NavItem[] = React.useMemo(
        () =>
            isSuperAdmin
                ? [
                    { text: "Dashboard", href: "/super-admin/dashboard", icon: HouseIcon },
                    { text: "Businesses", href: "/super-admin/businesses", icon: RestaurantsNavIcon },
                    { text: "Analytics", href: "/super-admin/analytics", icon: AnalyticsNavIcon },
                    { text: "Subscriptions & Payments", href: "/super-admin/subscriptions", icon: ShoppingCartIcon },
                    { text: "Usage & Operations", href: "/super-admin/usage-operations", icon: LayoutListIcon },
                    { text: "Users", href: "/super-admin/users", icon: UsersNavIcon },
                ]
                : [
                    { text: "Home", href: "/business-admin/dashboard", icon: HouseIcon, ref: dashboardIconRef },
                    { text: "Category", href: "/business-admin/category", icon: ShoppingCartIcon, ref: categoryIconRef },
                    { text: "Menu", href: "/business-admin/menu", icon: LayoutListIcon, ref: productsIconRef },
                    { text: "Tables", href: "/business-admin/tables", icon: CoffeeIcon, ref: tablesIconRef },
                    { text: "Orders", href: "/business-admin/orders", icon: DashboardIcon, ref: ordersIconRef },
                    { text: "Reviews", href: "/business-admin/reviews", icon: ReviewsNavIcon },
                ],
        [isSuperAdmin]
    );

    const segmentLabels: Record<string, string> = {
        dashboard: "Home",
        menu: "Menu",
        category: "Category",
        tables: "Tables",
        products: "Products",
        items: "Items",
        orders: "Orders",
        users: "Users",
        restaurants: "Businesses",
        businesses: "Businesses",
        analytics: "Analytics",
        "platform-analytics": "Analytics",
        subscriptions: "Subscriptions & Payments",
        "usage-operations": "Usage & Operations",
        notifications: "Notifications",
        reviews: "Reviews",
        settings: "Settings",
    };

    const lastSegment = pathname.split("/").filter(Boolean).slice(-1)[0] ?? "dashboard";
    const pageTitle = segmentLabels[lastSegment] ?? `${lastSegment.charAt(0).toUpperCase()}${lastSegment.slice(1)}`;
    const isActive = (href: string) => pathname.startsWith(href);
    const activeHref = React.useMemo(() => {
        const matches = navItems.filter((item) => pathname.startsWith(item.href));
        return (matches.sort((a, b) => b.href.length - a.href.length)[0]?.href) ?? null;
    }, [navItems, pathname]);
    const navListRef = React.useRef<HTMLUListElement | null>(null);
    const navItemRefs = React.useRef<Record<string, HTMLDivElement | null>>({});
    const [navIndicator, setNavIndicator] = React.useState({ y: 0, h: 0, w: 0, visible: false });

    React.useLayoutEffect(() => {
        const update = () => {
            if (!activeHref || !navListRef.current) {
                setNavIndicator((s) => (s.visible ? { ...s, visible: false } : s));
                return;
            }
            const el = navItemRefs.current[activeHref];
            if (!el) {
                setNavIndicator((s) => (s.visible ? { ...s, visible: false } : s));
                return;
            }
            const list = navListRef.current;
            const listRect = list.getBoundingClientRect();
            const rect = el.getBoundingClientRect();
            const next = {
                y: rect.top - listRect.top,
                h: rect.height,
                w: rect.width,
                visible: rect.height > 0,
            };
            setNavIndicator((s) =>
                s.visible === next.visible && s.y === next.y && s.h === next.h && s.w === next.w ? s : next
            );
        };
        update();
        window.addEventListener("resize", update);
        return () => window.removeEventListener("resize", update);
    }, [activeHref, navItems]);

    const startItemAnimation = (item: NavItem) => {
        setHoveredItem(item.text);
        item.ref?.current?.startAnimation();
    };
    const stopItemAnimation = (item: NavItem) => {
        setHoveredItem((current) => (current === item.text ? null : current));
        item.ref?.current?.stopAnimation();
    };

    React.useEffect(() => {
        document.title = `${pageTitle} - KhajaPOS Admin`;
    }, [pageTitle]);

    const fetchNotifications = React.useCallback(async (opts?: { quiet?: boolean; limit?: number; showAll?: boolean }) => {
        const quiet = opts?.quiet ?? false;
        const showAll = opts?.showAll ?? notifShowAll;
        const limit = showAll ? 200 : (opts?.limit ?? 20);
        if (!quiet) setNotifLoading(true);
        try {
            const params: any = { limit };
            const data = isSuperAdmin ? await getSuperAdminNotifications(params) : await getAdminNotifications(params);
            setNotifItems(data.items ?? []);
            setNotifCounts(data.counts ?? {});
            notifHasLoadedRef.current = true;
        } catch {
            if (!quiet && !notifHasLoadedRef.current) {
                setNotifItems([]);
            }
        } finally {
            if (!quiet) setNotifLoading(false);
        }
    }, [isSuperAdmin, notifShowAll]);

    React.useEffect(() => {
        let active = true;
        const loadCounts = async () => {
            try {
                const data = isSuperAdmin
                    ? await getSuperAdminNotifications({ unread: "1", limit: 1, skip_alerts: "1" })
                    : await getAdminNotifications({ unread: "1", limit: 1, skip_alerts: "1" });
                if (active) setNotifCounts((prev) => ({ ...prev, ...(data.counts ?? {}) }));
            } catch {
                // silent
            }
        };
        void loadCounts();
        void fetchNotifications({ quiet: true, limit: 20 });
        const t = window.setInterval(() => { if (document.visibilityState === "visible") void loadCounts(); }, 45000);
        return () => { active = false; window.clearInterval(t); };
    }, [isSuperAdmin, fetchNotifications]);

    React.useEffect(() => {
        if (isSuperAdmin) return;
        let active = true;
        const pollOrders = async () => {
            try {
                const data = await getAdminOrders();
                if (!active) return;
                const orders = data?.orders ?? [];
                const maxId = orders.reduce((m, o) => Math.max(m, Number(o?.id) || 0), 0);
                if (lastMaxOrderIdRef.current === null) {
                    lastMaxOrderIdRef.current = maxId;
                    return;
                }
                if (maxId > (lastMaxOrderIdRef.current ?? 0)) {
                    // Detect genuinely new arrivals (not initial load). Any newly seen higher ID triggers sound.
                    playNewOrderSound();
                    lastMaxOrderIdRef.current = maxId;
                    // refresh notification badge context lightly
                    getAdminNotifications({ unread: "1" }).then((d) => { if (active) setNotifCounts((p) => ({ ...p, ...(d.counts ?? {}) })); }).catch(() => undefined);
                }
            } catch {
                // silent
            }
        };
        void pollOrders();
        const t = window.setInterval(() => { if (document.visibilityState === "visible") void pollOrders(); }, 20000);
        return () => { active = false; window.clearInterval(t); };
    }, [isSuperAdmin, playNewOrderSound]);

    const openNotif = (e: React.MouseEvent<HTMLElement>) => {
        setNotifAnchor(e.currentTarget);
        if (notifHasLoadedRef.current || notifItems.length > 0) {
            void fetchNotifications({ quiet: true, limit: notifShowAll ? 200 : 20, showAll: notifShowAll });
        } else {
            void fetchNotifications({ quiet: false, limit: 20, showAll: false });
        }
    };
    const closeNotif = () => setNotifAnchor(null);
    const handleSeeAllNotifications = () => {
        if (isSuperAdmin) {
            closeNotif();
            router.push("/super-admin/notifications");
            return;
        }
        const next = !notifShowAll;
        setNotifShowAll(next);
        void fetchNotifications({ quiet: true, limit: next ? 200 : 20, showAll: next });
    };
    const markNotifRead = async (ids?: number[]) => {
        setNotifSaving(true);
        try {
            if (isSuperAdmin) await markSuperAdminNotificationsRead(ids ?? []);
            else await markAdminNotificationsRead(ids ?? []);
            await fetchNotifications({ quiet: true, limit: notifShowAll ? 200 : 20, showAll: notifShowAll });
        } catch {
            // ignore
        } finally {
            setNotifSaving(false);
        }
    };

    const drawer = (
        <Box
            sx={{
                px: 2,
                pt: { xs: 2, sm: 10 },
                pb: 2,
                minHeight: "100%",
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                boxSizing: "border-box",
            }}
        >
            <List ref={navListRef} sx={{ display: "grid", gap: 1, width: "100%", position: "relative" }}>
                {navIndicator.visible ? (
                    <Box
                        component={motion.div}
                        aria-hidden
                        initial={false}
                        animate={reducedMotion ? { y: navIndicator.y, height: navIndicator.h, opacity: 1 } : { y: navIndicator.y, height: navIndicator.h, opacity: 1 }}
                        transition={reducedMotion ? { duration: 0 } : spring.indicator}
                        sx={{
                            position: "absolute",
                            top: 0,
                            left: 0,
                            right: 0,
                            borderRadius: "16px",
                            border: "2px solid var(--sidebar-border)",
                            backgroundColor: "color-mix(in srgb, var(--sidebar-primary) 18%, transparent)",
                            boxShadow: "0 14px 28px rgba(56, 75, 78, 0.25)",
                            zIndex: 0,
                            pointerEvents: "none",
                        }}
                    />
                ) : null}
                {navItems.map((item) => {
                    const active = item.href === activeHref || isActive(item.href);
                    return (
                        <ListItemButton
                            key={item.text}
                            ref={(el) => {
                                navItemRefs.current[item.href] = el;
                            }}
                            disableRipple={false}
                            disableTouchRipple={false}
                            TouchRippleProps={{ center: false }}
                            onClick={() => {
                                void withViewTransition(() => router.push(item.href));
                            }}
                            onPointerEnter={() => startItemAnimation(item)}
                            onPointerLeave={() => stopItemAnimation(item)}
                            onMouseEnter={() => startItemAnimation(item)}
                            onMouseLeave={() => stopItemAnimation(item)}
                            onFocus={() => startItemAnimation(item)}
                            onBlur={() => stopItemAnimation(item)}
                            sx={{
                                border: "2px solid var(--sidebar-border)",
                                color: "var(--sidebar-foreground)",
                                borderRadius: "16px",
                                cursor: "pointer",
                                position: "relative",
                                overflow: "hidden",
                                zIndex: 1,

                                backgroundColor: !active && hoveredItem === item.text
                                    ? "color-mix(in srgb, var(--sidebar-accent) 62%, transparent)"
                                    : "transparent",

                                boxShadow: !active && hoveredItem === item.text
                                    ? "0 14px 28px rgba(56, 75, 78, 0.14)"
                                    : "none",

                                "& .MuiListItemText-primary": {
                                    color: active ? "var(--sidebar-primary)" : "inherit",
                                    fontWeight: active ? 700 : 400,
                                    transition: "color 200ms ease, font-weight 200ms ease",
                                },

                                "& .nav-icon svg": {
                                    color: active ? "var(--sidebar-primary)" : "inherit",
                                },

                            }}
                        >
                            <Box
                                className="nav-icon"
                                sx={{
                                    width: 32,
                                    height: 32,
                                    display: "grid",
                                    placeItems: "center",
                                    borderRadius: "10px",
                                    flexShrink: 0,
                                    pointerEvents: "none",
                                    transform:
                                        hoveredItem === item.text
                                            ? "translateY(-2px) scale(1.14) rotate(-4deg)"
                                            : "translateY(0) scale(1) rotate(0deg)",
                                    transition: "transform 180ms ease, background-color 180ms ease",
                                    backgroundColor:
                                        hoveredItem === item.text || active
                                            ? "color-mix(in srgb, var(--sidebar-primary) 14%, transparent)"
                                            : "transparent",
                                    willChange: "transform",
                                }}
                            >
                                <item.icon
                                    ref={item.ref}
                                    size={20}
                                    className={hoveredItem === item.text ? "text--primary" : ""}
                                />
                            </Box>
                            <ListItemText primary={item.text} sx={{ pl: 1.5 }} />
                        </ListItemButton>
                    );
                })}
            </List>
        </Box>
    );

    return (
        <Box
            sx={{
                display: "flex",
                minHeight: "100vh",
                height: { xs: "auto", sm: "100dvh" },
                position: "relative",
                overflowX: "clip",
                overflowY: { xs: "visible", sm: "hidden" },
                backgroundColor: "var(--background)",
                backgroundImage:
                    "radial-gradient(circle at 82% 8%, color-mix(in srgb, var(--primary) 22%, transparent), transparent 28%), radial-gradient(circle at 14% 18%, color-mix(in srgb, var(--accent) 30%, transparent), transparent 32%), radial-gradient(circle at 68% 86%, color-mix(in srgb, var(--sidebar-primary) 16%, transparent), transparent 34%), linear-gradient(135deg, color-mix(in srgb, var(--background) 94%, white 6%) 0%, var(--background) 46%, color-mix(in srgb, var(--background) 88%, black 12%) 100%)",
            }}
        >
            <AppBar
                position="fixed"
                sx={{
                    zIndex: (theme) => theme.zIndex.drawer + 1,
                    px: { xs: 1, sm: 2 },
                    color: "var(--foreground)",
                    backgroundColor: "color-mix(in srgb, var(--card) 84%, transparent)",
                    backgroundImage:
                        "linear-gradient(180deg, color-mix(in srgb, var(--card) 97%, transparent), color-mix(in srgb, var(--card) 78%, transparent) 70%, color-mix(in srgb, var(--accent) 8%, var(--card) 92%))",
                    backdropFilter: "blur(24px) saturate(180%)",
                    WebkitBackdropFilter: "blur(24px) saturate(180%)",
                    borderBottom: "1px solid color-mix(in srgb, var(--border) 78%, transparent)",
                    boxShadow:
                        "0 14px 36px rgba(31, 42, 43, 0.10), inset 0 1px 0 color-mix(in srgb, var(--foreground) 6%, transparent)",
                    "&::after": {
                        content: '""',
                        position: "absolute",
                        left: 0,
                        right: 0,
                        bottom: 0,
                        height: "2px",
                        background:
                            "linear-gradient(90deg, var(--primary), color-mix(in srgb, var(--primary) 55%, var(--accent)) 45%, var(--accent))",
                        opacity: 0.75,
                    },
                }}
            >
                <Toolbar sx={{ display: "flex", justifyContent: "space-between", gap: { xs: 1, sm: 2 }, minHeight: { xs: 64, sm: 76 } }}>
                    <Stack direction="row" spacing={{ xs: 1, sm: 2 }} alignItems="center" sx={{ minWidth: 0 }}>
                        <Stack
                            direction="row"
                            spacing={1}
                            alignItems="center"
                            sx={{
                                display: { xs: "none", sm: "flex" },
                                pr: { sm: 1.5 },
                                mr: { sm: 0.5 },
                                height: 40,
                                borderRight: { sm: "1px solid var(--border)" },
                                flexShrink: 0,
                            }}
                        >
                            {brand?.logo ? (
                                <Box
                                    component="img"
                                    src={brand.logo}
                                    alt=""
                                    sx={{
                                        width: 34,
                                        height: 34,
                                        borderRadius: "11px",
                                        objectFit: "cover",
                                        border: "1px solid var(--border)",
                                        boxShadow: "0 8px 18px color-mix(in srgb, var(--primary) 25%, transparent)",
                                    }}
                                />
                            ) : (
                                <Box
                                    sx={{
                                        width: 34,
                                        height: 34,
                                        borderRadius: "11px",
                                        display: "grid",
                                        placeItems: "center",
                                        backgroundImage:
                                            "linear-gradient(145deg, var(--primary), color-mix(in srgb, var(--primary) 55%, var(--accent)))",
                                        color: "var(--primary-foreground)",
                                        fontWeight: 900,
                                        fontSize: "0.95rem",
                                        boxShadow: "0 8px 18px color-mix(in srgb, var(--primary) 35%, transparent)",
                                    }}
                                >
                                    K
                                </Box>
                            )}
                            {brand?.name ? (
                                <Box sx={{ minWidth: 0, maxWidth: 150 }}>
                                    <Typography noWrap sx={{ fontSize: "0.92rem", fontWeight: 900, color: "var(--foreground)" }}>
                                        {brand.name}
                                    </Typography>
                                    <Typography
                                        sx={{
                                            fontSize: "0.62rem",
                                            fontWeight: 900,
                                            letterSpacing: "0.2em",
                                            textTransform: "uppercase",
                                            color: "var(--muted-foreground)",
                                        }}
                                    >
                                        POS
                                    </Typography>
                                </Box>
                            ) : (
                                <Box sx={{ minWidth: 0, lineHeight: 1.1 }}>
                                    <Typography
                                        sx={{
                                            fontSize: "0.62rem",
                                            fontWeight: 900,
                                            letterSpacing: "0.2em",
                                            textTransform: "uppercase",
                                            color: "var(--muted-foreground)",
                                        }}
                                    >
                                        Khaja
                                    </Typography>
                                    <Typography sx={{ fontSize: "0.92rem", fontWeight: 900, color: "var(--foreground)" }}>
                                        POS
                                    </Typography>
                                </Box>
                            )}
                        </Stack>
                        <Box sx={{ minWidth: 0 }}>
                            <Typography
                                sx={{
                                    display: { xs: "block", sm: "none" },
                                    fontWeight: 850,
                                    fontSize: "1.05rem",
                                    color: "var(--foreground)",
                                }}
                            >
                                {pageTitle}
                            </Typography>
                            <Breadcrumbs separator=">" aria-label="breadcrumb" sx={{ display: { xs: "none", sm: "block" } }}>
                                {lastSegment === "dashboard"
                                    ? [
                                        <Typography key="dashboard" sx={{ color: "var(--foreground)", fontWeight: 700 }}>
                                            Home
                                        </Typography>,
                                    ]
                                    : [
                                        <MuiLink
                                            key="dashboard-link"
                                            component={Link}
                                            underline="hover"
                                            color="inherit"
                                            href={isSuperAdmin ? "/super-admin/dashboard" : "/business-admin/dashboard"}
                                            sx={{ color: "var(--muted-foreground)" }}
                                        >
                                            Home
                                        </MuiLink>,
                                        <Typography key="page-title" sx={{ color: "var(--foreground)", fontWeight: 600 }}>
                                            {pageTitle}
                                        </Typography>,
                                    ]}
                            </Breadcrumbs>
                        </Box>
                    </Stack>
                    <Stack
                        direction="row"
                        spacing={{ xs: 1, sm: 2 }}
                        alignItems="center"
                        sx={{ position: "relative", zIndex: (theme) => theme.zIndex.drawer + 3, pointerEvents: "auto" }}
                    >
                        <MotionIconButton
                            aria-label="Notifications"
                            onClick={openNotif}
                            whileTap={reducedMotion ? undefined : { scale: 0.95 }}
                            transition={spring.press}
                            sx={{
                                width: 40,
                                height: 40,
                                borderRadius: "12px",
                                border: "1px solid var(--border)",
                                backgroundColor: "color-mix(in srgb, var(--card) 70%, transparent)",
                                color: "var(--foreground)",
                            }}
                        >
                            <Badge badgeContent={notifCounts.unread ?? 0} color="error" max={99}>
                                <NotificationsNoneRoundedIcon />
                            </Badge>
                        </MotionIconButton>
                        <Popover
                            open={Boolean(notifAnchor)}
                            anchorEl={notifAnchor}
                            onClose={closeNotif}
                            anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                            transformOrigin={{ vertical: "top", horizontal: "right" }}
                            slots={{
                                transition: reducedMotion ? Fade : Grow,
                            }}
                            slotProps={{
                                transition: reducedMotion ? { timeout: 1 } : { timeout: 360 },
                                paper: {
                                    sx: {
                                        mt: 1,
                                        width: { xs: "min(92vw, 380px)", sm: 420 },
                                        maxHeight: "min(70vh, 520px)",
                                        borderRadius: "16px",
                                        border: "1px solid var(--border)",
                                        backgroundColor: "var(--card)",
                                        boxShadow: "0 18px 50px rgba(31,42,43,0.18)",
                                        overflow: "hidden",
                                        display: "flex",
                                        flexDirection: "column",
                                    },
                                },
                            }}
                        >
                            <Box sx={{ p: 1.5, borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
                                <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
                                    <Box sx={{ minWidth: 0 }}>
                                        <Typography sx={{ fontWeight: 900, fontSize: "0.98rem", lineHeight: 1.2 }}>Notifications</Typography>
                                        <Typography sx={{ fontSize: "0.72rem", color: "var(--muted-foreground)", fontWeight: 650 }}>
                                            {isSuperAdmin ? "Platform notifications and alerts" : "Updates from Super Admin and system alerts"}
                                        </Typography>
                                    </Box>
                                    <Button
                                        size="small"
                                        startIcon={<DoneAllRoundedIcon />}
                                        onClick={() => void markNotifRead([])}
                                        disabled={notifSaving || (notifCounts.unread ?? 0) === 0}
                                        sx={{ textTransform: "none", fontWeight: 800, borderRadius: "10px", flexShrink: 0, whiteSpace: "nowrap" }}
                                    >
                                        Read all
                                    </Button>
                                </Stack>
                            </Box>
                            <Box sx={{ overflowY: "auto", p: 1, flex: 1, minHeight: 0 }}>
                                {notifLoading && notifItems.length === 0 ? (
                                    <Box sx={{ display: "grid", placeItems: "center", py: 4 }}><CircularProgress size={22} /></Box>
                                ) : notifItems.length === 0 ? (
                                    <Typography sx={{ py: 4, textAlign: "center", color: "var(--muted-foreground)", fontSize: "0.84rem", fontWeight: 650 }}>
                                        No notifications yet.
                                    </Typography>
                                ) : (
                                    <Stack spacing={0.75}>
                                        <AnimatePresence initial={false}>
                                            {notifItems.map((n) => {
                                                const sev = (n.severity || "info").toLowerCase();
                                                const tone = sev === "critical"
                                                    ? { fg: "#991b1b", bg: "#fee2e2", border: "#fecaca" }
                                                    : sev === "warning"
                                                        ? { fg: "#92400e", bg: "#fef3c7", border: "#fde68a" }
                                                        : { fg: "#1d4ed8", bg: "#dbeafe", border: "#bfdbfe" };
                                                const primaryText = n.message || n.title || "Notification";
                                                const secondaryText = n.message && n.title && n.title !== n.message ? n.title : null;
                                                return (
                                                    <Box
                                                        key={n.id}
                                                        component={motion.div}
                                                        layout={!reducedMotion}
                                                        initial={reducedMotion ? false : { opacity: 0, y: 6 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        exit={reducedMotion ? undefined : { opacity: 0, y: -4, transition: { duration: 0.18 } }}
                                                        transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
                                                        sx={{
                                                            p: 1.1,
                                                            borderRadius: "12px",
                                                            border: `1px solid ${n.is_read ? "var(--border)" : tone.border}`,
                                                            backgroundColor: n.is_read ? "var(--background)" : `color-mix(in srgb, ${tone.bg} 45%, var(--card))`,
                                                        }}
                                                    >
                                                        <Stack direction="row" spacing={0.75} alignItems="flex-start" justifyContent="space-between">
                                                            <Box sx={{ minWidth: 0, flex: 1 }}>
                                                                <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap" useFlexGap sx={{ mb: 0.35 }}>
                                                                    <Chip
                                                                        size="small"
                                                                        label={(n.severity || "info").toUpperCase()}
                                                                        sx={{ height: 20, fontSize: "0.62rem", fontWeight: 900, letterSpacing: "0.02em", color: tone.fg, bgcolor: tone.bg, border: `1px solid ${tone.border}`, flexShrink: 0 }}
                                                                    />
                                                                    <Typography
                                                                        component="span"
                                                                        sx={{
                                                                            fontWeight: n.is_read ? 750 : 900,
                                                                            fontSize: "0.84rem",
                                                                            lineHeight: 1.3,
                                                                            color: "var(--foreground)",
                                                                            wordBreak: "break-word",
                                                                        }}
                                                                    >
                                                                        {primaryText}
                                                                    </Typography>
                                                                </Stack>
                                                                {secondaryText ? (
                                                                    <Typography sx={{ fontSize: "0.74rem", color: "var(--muted-foreground)", fontWeight: 700, lineHeight: 1.3, mb: 0.15 }}>
                                                                        {secondaryText}
                                                                    </Typography>
                                                                ) : null}
                                                                <Typography sx={{ fontSize: "0.68rem", color: "var(--muted-foreground)", fontWeight: 650 }}>
                                                                    {n.created_at ? new Date(n.created_at).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : ""}
                                                                    {n.type ? ` · ${(n.type || "").replace(/_/g, " ")}` : ""}
                                                                </Typography>
                                                            </Box>
                                                            {!n.is_read ? (
                                                                <Button size="small" onClick={() => void markNotifRead([n.id])} sx={{ minWidth: 0, px: 0.75, fontSize: "0.7rem", fontWeight: 800, textTransform: "none", flexShrink: 0, mt: -0.25 }}>Read</Button>
                                                            ) : null}
                                                        </Stack>
                                                    </Box>
                                                );
                                            })}
                                        </AnimatePresence>
                                    </Stack>
                                )}
                            </Box>
                            <Box sx={{ p: 1, borderTop: "1px solid var(--border)", flexShrink: 0, backgroundColor: "color-mix(in srgb, var(--card) 92%, var(--background))" }}>
                                <Button
                                    fullWidth
                                    size="small"
                                    onClick={handleSeeAllNotifications}
                                    sx={{ textTransform: "none", fontWeight: 850, borderRadius: "10px", color: "var(--primary)", py: 0.75 }}
                                >
                                    {isSuperAdmin ? "See all notifications" : notifShowAll ? "Show fewer notifications" : "See all notifications"}
                                </Button>
                            </Box>
                        </Popover>
                        <ThemeToggle />
                        <ProfileComponent showSettings={!isSuperAdmin} logoSrc={brand?.logo ?? null} />
                    </Stack>
                </Toolbar>
            </AppBar>

            <Box component="nav" sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 }, display: { xs: "none", sm: "block" } }}>
                <Drawer
                    variant="permanent"
                    sx={{
                        "& .MuiDrawer-paper": {
                            width: drawerWidth,
                            display: "flex",
                            flexDirection: "column",
                            overflowX: "hidden",
                            overflowY: "auto",
                            overscrollBehavior: "contain",
                            pt: "0px",
                            backgroundColor: "var(--sidebar)",
                            backgroundImage:
                                "linear-gradient(180deg, color-mix(in srgb, var(--sidebar) 96%, white 4%), color-mix(in srgb, var(--sidebar-accent) 42%, var(--sidebar) 58%) 52%, color-mix(in srgb, var(--sidebar) 88%, black 12%))",
                            borderRight: "1px solid var(--sidebar-border)",
                            scrollbarWidth: "thin",
                            scrollbarColor: "color-mix(in srgb, var(--sidebar-foreground) 28%, transparent) transparent",
                            "&::-webkit-scrollbar": { width: 8 },
                            "&::-webkit-scrollbar-thumb": {
                                backgroundColor: "color-mix(in srgb, var(--sidebar-foreground) 28%, transparent)",
                                borderRadius: "999px",
                            },
                        },
                    }}
                    open
                >
                    {drawer}
                </Drawer>
            </Box>

            <Paper
                component="main"
                ref={mainRef}
                sx={{
                    position: "relative",
                    flexGrow: 1,
                    minWidth: 0,
                    maxWidth: "100%",
                    p: { xs: 1.5, sm: 3 },
                    width: { xs: "100%", sm: "auto" },
                    mt: { xs: "64px", sm: "92px" },
                    mb: { xs: 0, sm: 2 },
                    mx: { xs: 0, sm: 2 },
                    pb: { xs: "calc(env(safe-area-inset-bottom) + 110px)", sm: 3 },
                    height: { xs: "auto", sm: "calc(100dvh - 108px)" },
                    boxSizing: "border-box",
                    overflowX: "clip",
                    overflowY: { xs: "visible", sm: "auto" },
                    overscrollBehavior: { sm: "contain" },
                    scrollbarWidth: "thin",
                    scrollbarColor: "color-mix(in srgb, var(--muted-foreground) 45%, transparent) transparent",
                    "&::-webkit-scrollbar": { width: 10, height: 10 },
                    "&::-webkit-scrollbar-thumb": {
                        backgroundColor: "color-mix(in srgb, var(--muted-foreground) 45%, transparent)",
                        borderRadius: "999px",
                        border: "3px solid transparent",
                        backgroundClip: "padding-box",
                    },
                    "&::-webkit-scrollbar-thumb:hover": {
                        backgroundColor: "color-mix(in srgb, var(--muted-foreground) 70%, transparent)",
                    },
                    "&::-webkit-scrollbar-track": { backgroundColor: "transparent" },
                    background:
                        "linear-gradient(145deg, color-mix(in srgb, var(--card) 92%, transparent), color-mix(in srgb, var(--background) 82%, transparent) 48%, color-mix(in srgb, var(--accent) 10%, var(--background) 90%))",
                    backdropFilter: "blur(14px)",
                    border: { xs: "none", sm: "1px solid color-mix(in srgb, var(--border) 70%, transparent)" },
                    borderRadius: { xs: 0, sm: "26px" },
                    boxShadow: {
                        xs: "none",
                        sm: "0 22px 60px rgba(31, 42, 43, 0.14)",
                    },
                }}
            >
                <RoleGate>
                    {(() => {
                        if (isSuperAdmin) {
                            return platformStatus ? (
                                <Alert
                                    severity={platformStatus.code === "MAINTENANCE_MODE" ? "warning" : "error"}
                                    variant="filled"
                                    onClose={() => setPlatformStatus(null)}
                                    sx={{ mb: 2, borderRadius: "14px", alignItems: "flex-start", boxShadow: "0 10px 24px rgba(15,23,42,0.12)", "& .MuiAlert-message": { width: "100%" } }}
                                >
                                    <Typography sx={{ fontWeight: 900, fontSize: "0.92rem", lineHeight: 1.25 }}>
                                        {platformStatus.code === "MAINTENANCE_MODE" ? "Platform maintenance" : "Business access restricted"}
                                    </Typography>
                                    <Typography sx={{ mt: 0.35, fontSize: "0.84rem", fontWeight: 650, opacity: 0.96 }}>
                                        {platformStatus.message || "Service is temporarily unavailable."}
                                    </Typography>
                                </Alert>
                            ) : null;
                        }
                        const latestMaintenance = notifItems.find((n) => /maintenance mode/i.test(n.title || ""));
                        const maintenanceActive = platformStatus?.code === "MAINTENANCE_MODE"
                            || (latestMaintenance ? /enabled/i.test(latestMaintenance.title || "") : false);
                        const maintenanceMessage = platformStatus?.code === "MAINTENANCE_MODE"
                            ? (platformStatus.message || latestMaintenance?.message)
                            : latestMaintenance?.message;
                        const suspensionBlock = platformStatus?.code === "BUSINESS_SUSPENDED" ? platformStatus : null;
                        return (
                            <>
                                {maintenanceActive ? (
                                    <Alert
                                        severity="warning"
                                        variant="filled"
                                        sx={{ mb: 2, borderRadius: "14px", alignItems: "flex-start", boxShadow: "0 10px 24px rgba(15,23,42,0.12)", "& .MuiAlert-message": { width: "100%" } }}
                                    >
                                        <Typography sx={{ fontWeight: 900, fontSize: "0.95rem", lineHeight: 1.25 }}>
                                            Maintenance mode
                                        </Typography>
                                        <Typography sx={{ mt: 0.35, fontSize: "0.84rem", fontWeight: 650, opacity: 0.96 }}>
                                            {maintenanceMessage || "The platform is temporarily under maintenance. Some features may be unavailable."}
                                        </Typography>
                                    </Alert>
                                ) : null}
                                {suspensionBlock ? (
                                    <Alert
                                        severity="error"
                                        variant="filled"
                                        onClose={() => setPlatformStatus(null)}
                                        sx={{ mb: 2, borderRadius: "14px", alignItems: "flex-start", boxShadow: "0 10px 24px rgba(15,23,42,0.12)", "& .MuiAlert-message": { width: "100%" } }}
                                    >
                                        <Typography sx={{ fontWeight: 900, fontSize: "0.95rem", lineHeight: 1.25 }}>
                                            Business access restricted
                                        </Typography>
                                        <Typography sx={{ mt: 0.35, fontSize: "0.84rem", fontWeight: 650, opacity: 0.96 }}>
                                            {suspensionBlock.message || "Service is temporarily unavailable."}
                                        </Typography>
                                    </Alert>
                                ) : null}
                            </>
                        );
                    })()}
                    <Box
                        key={pathname}
                        sx={{
                            animation: "khajapos-page-in 460ms cubic-bezier(0.22, 1, 0.36, 1)",
                            "@keyframes khajapos-page-in": {
                                from: { opacity: 0, transform: "translateY(16px)" },
                                to: { opacity: 1, transform: "translateY(0)" },
                            },
                            "@media (prefers-reduced-motion: reduce)": {
                                animation: "none",
                            },
                        }}
                    >
                        {children}
                    </Box>
                </RoleGate>
            </Paper>

            <Paper
                elevation={0}
                sx={{
                    display: { xs: "block", sm: "none" },
                    position: "fixed",
                    left: "max(8px, env(safe-area-inset-left))",
                    right: "max(8px, env(safe-area-inset-right))",
                    bottom: "calc(env(safe-area-inset-bottom) + 8px)",
                    zIndex: (theme) => theme.zIndex.drawer + 2,
                    borderRadius: "20px",
                    border: "1px solid var(--border)",
                    backgroundColor: "color-mix(in srgb, var(--card) 92%, transparent)",
                    backdropFilter: "blur(18px)",
                    overflow: "hidden",
                    maxWidth: "calc(100vw - 16px)",
                    boxShadow: "0 18px 42px rgba(31, 42, 43, 0.2)",
                }}
            >
                <Box sx={{ position: "relative", height: 66 }}>
                    {(() => {
                        const mobileActiveIndex = activeHref ? navItems.findIndex((item) => item.href === activeHref) : -1;
                        const count = Math.max(1, navItems.length);
                        const pct = 100 / count;
                        return mobileActiveIndex >= 0 && navItems.length > 0 ? (
                            <Box
                                component={motion.div}
                                aria-hidden
                                initial={false}
                                animate={
                                    reducedMotion
                                        ? { x: `${mobileActiveIndex * 100}%` }
                                        : { x: `${mobileActiveIndex * 100}%` }
                                }
                                transition={reducedMotion ? { duration: 0 } : spring.indicator}
                                sx={{
                                    position: "absolute",
                                    top: 5,
                                    bottom: 5,
                                    left: 0,
                                    width: `${pct}%`,
                                    px: 0.35,
                                    zIndex: 0,
                                    pointerEvents: "none",
                                }}
                            >
                                <Box
                                    sx={{
                                        width: "100%",
                                        height: "100%",
                                        borderRadius: "14px",
                                        backgroundColor: "color-mix(in srgb, var(--primary) 14%, transparent)",
                                        border: "1px solid color-mix(in srgb, var(--primary) 22%, transparent)",
                                    }}
                                />
                            </Box>
                        ) : null;
                    })()}
                    <BottomNavigation
                        showLabels
                        value={navItems.find((item) => isActive(item.href))?.href ?? (isSuperAdmin ? "/super-admin/dashboard" : "/business-admin/dashboard")}
                        onChange={(_, value) => void withViewTransition(() => router.push(String(value)))}
                        sx={{
                            position: "relative",
                            zIndex: 1,
                            height: 66,
                            backgroundColor: "transparent",
                            "& .MuiBottomNavigationAction-root": {
                                minWidth: 0,
                                flex: "1 1 0",
                                maxWidth: "none",
                                px: 0.25,
                                py: 0.65,
                                color: "var(--muted-foreground)",
                                transition: "color 180ms ease",
                            },
                            "& .MuiBottomNavigationAction-label": {
                                fontSize: "0.68rem",
                                fontWeight: 700,
                                lineHeight: 1.1,
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                maxWidth: "100%",
                            },
                            "& .Mui-selected, & .Mui-selected svg": {
                                color: "var(--primary)",
                            },
                        }}
                    >
                        {navItems.map((item) => {
                            const shortLabel: Record<string, string> = {
                                "Dashboard": "Home",
                                "Home": "Home",
                                "Businesses": "Biz",
                                "Analytics": "Stats",
                                "Subscriptions & Payments": "Plans",
                                "Usage & Operations": "Usage",
                                "Users": "Users",
                                "Category": "Category",
                                "Menu": "Menu",
                                "Tables": "Tables",
                                "Orders": "Orders",
                                "Reviews": "Reviews",
                            };
                            return (
                                <BottomNavigationAction
                                    key={item.href}
                                    label={shortLabel[item.text] ?? item.text}
                                    value={item.href}
                                    icon={
                                        <Box sx={{ height: 22, display: "grid", placeItems: "center" }}>
                                            <item.icon size={18} />
                                        </Box>
                                    }
                                />
                            );
                        })}
                    </BottomNavigation>
                </Box>
            </Paper>
        </Box>
    );
}
