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
    IconButton,
    AppBar,
    ListItemButton,
    Stack,
    Paper,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import { DashboardIcon, type DashboardIconHandle } from "@/components/ui/dashboard-icon";
import ThemeToggle from "@/components/common/ThemeToggle";
import { ShoppingCartIcon, type ShoppingCartIconHandle } from "@/components/ui/shopping-cart-icon";
import { LayoutListIcon, LayoutListIconHandle } from "@/components/ui/layout-list-icon";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import ProfileComponent from "@/components/common/ProfileComponent";
import { CoffeeIcon, CoffeeIconHandle } from "@/components/ui/coffee-icon";
import { HouseIcon } from "@/components/ui/house-icon";

const drawerWidth = 260;

export default function SideNavLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const [mobileOpen, setMobileOpen] = React.useState(false);
    const [hoveredItem, setHoveredItem] = React.useState<string | null>(null);
    const handleDrawerToggle = () => setMobileOpen(!mobileOpen);
    const dashboardIconRef = React.useRef<DashboardIconHandle | null>(null);
    const categoryIconRef = React.useRef<ShoppingCartIconHandle | null>(null);
    const productsIconRef = React.useRef<LayoutListIconHandle | null>(null);
    const tablesIconRef = React.useRef<LayoutListIconHandle | null>(null);
    const ordersIconRef = React.useRef<CoffeeIconHandle | null>(null);

    const navItems = [
        { text: "Dashboard", href: "/admin/dashboard", icon: HouseIcon, ref: dashboardIconRef },
        { text: "Category", href: "/admin/category", icon: ShoppingCartIcon, ref: categoryIconRef },
        { text: "Menu", href: "/admin/menu", icon: LayoutListIcon, ref: productsIconRef },
        { text: "Tables", href: "/admin/tables", icon: CoffeeIcon, ref: tablesIconRef },
        { text: "Orders", href: "/admin/orders", icon: DashboardIcon, ref: ordersIconRef },
    ];

    const segmentLabels: Record<string, string> = {
        dashboard: "Dashboard",
        menu: "Menu",
        category: "Category",
        tables: "Tables",
        products: "Products",
        items: "Items",
        orders: "Orders",
    };

    const lastSegment = pathname.split("/").filter(Boolean).slice(-1)[0] ?? "dashboard";
    const pageTitle = segmentLabels[lastSegment] ?? `${lastSegment.charAt(0).toUpperCase()}${lastSegment.slice(1)}`;
    const isActive = (href: string) => pathname.startsWith(href);

    React.useEffect(() => {
        document.title = `${pageTitle} - KhajaPOS Admin`;
    }, [pageTitle]);

    const drawer = (
        <Box sx={{ px: 2, py: 15 }}>
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
                        KhajaPOS Admin
                    </Typography>
                    <Typography sx={{ fontSize: "0.9rem", color: "var(--sidebar-foreground)", opacity: 0.8 }}>
                        Manage food items, orders, and reporting
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
                                setMobileOpen(false);
                                router.push(item.href);
                            }}
                            onMouseEnter={() => {
                                setHoveredItem(item.text);
                                item.ref.current?.startAnimation();
                            }}
                            onMouseLeave={() => {
                                setHoveredItem((current) => (current === item.text ? null : current));
                                item.ref.current?.stopAnimation();
                            }}
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
                            <Box className="nav-icon">
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
                backgroundColor: "var(--background)",
                backgroundImage:
                    "radial-gradient(1200px 620px at 100% 0%, color-mix(in srgb, var(--accent) 28%, transparent), transparent 58%), radial-gradient(900px 520px at 0% 10%, color-mix(in srgb, var(--sidebar-accent) 18%, transparent), transparent 55%), linear-gradient(180deg, color-mix(in srgb, var(--background) 96%, white 4%), var(--background))",
            }}
        >
            <AppBar
                position="fixed"
                sx={{
                    zIndex: (theme) => theme.zIndex.drawer + 1,
                    px: { xs: 1, sm: 2 },
                }}
            >
                <Toolbar sx={{ display: "flex", justifyContent: "space-between", gap: 2 }}>
                    <Stack direction="row" spacing={2} alignItems="center">
                        <IconButton
                            aria-label="open drawer"
                            edge="start"
                            onClick={handleDrawerToggle}
                            sx={{ display: { sm: "none" } }}
                        >
                            <MenuIcon />
                        </IconButton>
                        <Box>
                            <Breadcrumbs separator=">" aria-label="breadcrumb">
                                {lastSegment === "dashboard"
                                    ? [
                                        <Typography key="dashboard" sx={{ color: "var(--muted-foreground)" }}>
                                            Dashboard
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
                                            Dashboard
                                        </MuiLink>,
                                        <Typography key="page-title" sx={{ color: "var(--foreground)", fontWeight: 600 }}>
                                            {pageTitle}
                                        </Typography>,
                                    ]}
                            </Breadcrumbs>
                        </Box>
                    </Stack>
                    <Stack direction="row" spacing={2} alignItems="center">
                        <ThemeToggle />
                        <ProfileComponent />
                    </Stack>
                </Toolbar>
            </AppBar>

            <Box component="nav" sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}>
                <Drawer
                    variant="temporary"
                    open={mobileOpen}
                    onClose={handleDrawerToggle}
                    ModalProps={{ keepMounted: true }}
                    sx={{
                        display: { xs: "block", sm: "none" },
                        "& .MuiDrawer-paper": {
                            width: drawerWidth,
                            pt: "76px",
                            backgroundColor: "var(--sidebar)",
                            backgroundImage:
                                "linear-gradient(180deg, color-mix(in srgb, var(--sidebar) 96%, white 4%), color-mix(in srgb, var(--sidebar-accent) 42%, var(--sidebar) 58%) 52%, color-mix(in srgb, var(--sidebar) 88%, black 12%))",
                            borderRight: "1px solid var(--sidebar-border)",
                        },
                    }}
                >
                    {drawer}
                </Drawer>

                <Drawer
                    variant="permanent"
                    sx={{
                        display: { xs: "none", sm: "block" },
                        "& .MuiDrawer-paper": {
                            width: drawerWidth,
                            pt: { xs: "76px", sm: "0px" },
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
                sx={{
                    flexGrow: 1,
                    p: { xs: 2, sm: 3 },
                    width: { sm: `calc(100% - ${drawerWidth}px)` },
                    mt: { xs: "76px", sm: "76px" },
                    background:
                        "linear-gradient(180deg, color-mix(in srgb, var(--card) 68%, transparent), color-mix(in srgb, var(--background) 88%, transparent))",
                    borderTopLeftRadius: { sm: "70%" },
                    boxShadow: { sm: "inset 0 1px 0 rgba(255,255,255,0.08)" },
                }}
            >
                {children}
            </Paper>
        </Box>
    );
}
