"use client";

import * as React from "react";
import {
    Drawer,
    List,
    ListItemText,
    Box,
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
import { DashboardIcon, type DashboardIconHandle } from "@/components/ui/dashboard-icon";
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
import { AuthProvider, useAuth, type SessionUser } from "@/lib/auth-context";
import RoleGate from "@/components/admin/RoleGate";
import { getBusinessSettings, resolveMenuImageUrl } from "@/lib/api";

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
    const [hoveredItem, setHoveredItem] = React.useState<string | null>(null);
    const [brand, setBrand] = React.useState<{ name: string; logo: string | null } | null>(null);
    const dashboardIconRef = React.useRef<HouseIconHandle | null>(null);
    const categoryIconRef = React.useRef<ShoppingCartIconHandle | null>(null);
    const productsIconRef = React.useRef<LayoutListIconHandle | null>(null);
    const tablesIconRef = React.useRef<CoffeeIconHandle | null>(null);
    const ordersIconRef = React.useRef<DashboardIconHandle | null>(null);
    const mainRef = React.useRef<HTMLDivElement | null>(null);

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

    const navItems: NavItem[] = isSuperAdmin
        ? [
            { text: "Users", href: "/admin/users", icon: UsersNavIcon },
            { text: "Restaurants", href: "/admin/restaurants", icon: RestaurantsNavIcon },
        ]
        : [
            { text: "Home", href: "/admin/dashboard", icon: HouseIcon, ref: dashboardIconRef },
            { text: "Category", href: "/admin/category", icon: ShoppingCartIcon, ref: categoryIconRef },
            { text: "Menu", href: "/admin/menu", icon: LayoutListIcon, ref: productsIconRef },
            { text: "Tables", href: "/admin/tables", icon: CoffeeIcon, ref: tablesIconRef },
            { text: "Orders", href: "/admin/orders", icon: DashboardIcon, ref: ordersIconRef },
        ];

    const segmentLabels: Record<string, string> = {
        dashboard: "Home",
        menu: "Menu",
        category: "Category",
        tables: "Tables",
        products: "Products",
        items: "Items",
        orders: "Orders",
        users: "Users",
        restaurants: "Restaurants",
        settings: "Settings",
    };

    const lastSegment = pathname.split("/").filter(Boolean).slice(-1)[0] ?? "dashboard";
    const pageTitle = segmentLabels[lastSegment] ?? `${lastSegment.charAt(0).toUpperCase()}${lastSegment.slice(1)}`;
    const isActive = (href: string) => pathname.startsWith(href);
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

    const drawer = (
        <Box sx={{ px: 2, py: { xs: 2, sm: 15 } }}>
            <Link href="/admin/dashboard" style={{ textDecoration: "none" }}>
                <Box
                    sx={{
                        mb: 3,
                        border: "2px solid var(--sidebar-border)",
                        borderRadius: "24px",
                        px: 2.25,
                        py: 2.25,
                        backgroundImage:
                            "linear-gradient(145deg, color-mix(in srgb, var(--sidebar-primary) 18%, transparent), color-mix(in srgb, var(--sidebar-accent) 34%, transparent) 52%, color-mix(in srgb, var(--sidebar) 86%, black 14%))",
                        boxShadow: "0 16px 34px rgba(56, 75, 78, 0.18)",
                        pointerEvents: "none",
                    }}
                >
                    <Typography
                        sx={{
                            fontSize: "0.75rem",
                            letterSpacing: "0.18em",
                            textTransform: "uppercase",
                            color: "var(--sidebar-foreground)",
                            opacity: 0.7,
                            mb: 0.5,
                        }}
                    >
                        Workspace
                    </Typography>
                    <Typography sx={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--sidebar-foreground)" }}>
                        {isSuperAdmin
                            ? "KhajaPOS Super Admin"
                            : brand?.name
                                ? brand.name
                                : "KhajaPOS Admin"}
                    </Typography>
                    <Typography sx={{ fontSize: "0.9rem", color: "var(--sidebar-foreground)", opacity: 0.8 }}>
                        {isSuperAdmin
                            ? "Manage platform users, owners and restaurants"
                            : "Manage food items, orders, and reporting"}
                    </Typography>
                </Box>
            </Link>
            <List sx={{ display: "grid", gap: 1 }}>
                {navItems.map((item) => {
                    const active = isActive(item.href);
                    return (
                        <ListItemButton
                            key={item.text}
                            disableRipple={false}
                            disableTouchRipple={false}
                            TouchRippleProps={{ center: false }}
                            onClick={() => {
                                router.push(item.href);
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

                                backgroundColor: active
                                    ? "color-mix(in srgb, var(--sidebar-primary) 18%, transparent)"
                                    : hoveredItem === item.text
                                        ? "color-mix(in srgb, var(--sidebar-accent) 62%, transparent)"
                                        : "transparent",

                                boxShadow: active
                                    ? "0 14px 28px rgba(56, 75, 78, 0.25)"
                                    : hoveredItem === item.text
                                        ? "0 14px 28px rgba(56, 75, 78, 0.14)"
                                        : "none",

                                "& .MuiListItemText-primary": {
                                    color: active ? "var(--sidebar-primary)" : "inherit",
                                    fontWeight: active ? 700 : 400,
                                    transition: "all 200ms ease",
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
                                            href="/admin/dashboard"
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
                            overflowY: "hidden",
                            pt: "0px",
                            backgroundColor: "var(--sidebar)",
                            backgroundImage:
                                "linear-gradient(180deg, color-mix(in srgb, var(--sidebar) 96%, white 4%), color-mix(in srgb, var(--sidebar-accent) 42%, var(--sidebar) 58%) 52%, color-mix(in srgb, var(--sidebar) 88%, black 12%))",
                            borderRight: "1px solid var(--sidebar-border)",
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
                    p: { xs: 1.5, sm: 3 },
                    width: { xs: "100%", sm: "auto" },
                    mt: { xs: "64px", sm: "92px" },
                    mb: { xs: 0, sm: 2 },
                    mx: { xs: 0, sm: 2 },
                    pb: { xs: "calc(env(safe-area-inset-bottom) + 92px)", sm: 3 },
                    height: { xs: "auto", sm: "calc(100dvh - 108px)" },
                    boxSizing: "border-box",
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
                <BottomNavigation
                    showLabels
                    value={navItems.find((item) => isActive(item.href))?.href ?? "/admin/dashboard"}
                    onChange={(_, value) => router.push(value)}
                    sx={{
                        height: 66,
                        backgroundColor: "transparent",
                        "& .MuiBottomNavigationAction-root": {
                            minWidth: 0,
                            flex: "1 1 0",
                            maxWidth: "none",
                            px: 0.25,
                            py: 0.65,
                            color: "var(--muted-foreground)",
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
                        "& .Mui-selected": {
                            color: "var(--primary)",
                        },
                    }}
                >
                    {navItems.map((item) => (
                        <BottomNavigationAction
                            key={item.href}
                            label={item.text}
                            value={item.href}
                            icon={
                                <Box sx={{ height: 22, display: "grid", placeItems: "center" }}>
                                    <item.icon size={20} />
                                </Box>
                            }
                        />
                    ))}
                </BottomNavigation>
            </Paper>
        </Box>
    );
}
