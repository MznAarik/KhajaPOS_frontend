"use client";

import * as React from "react";
import Link from "next/link";
import {
  Box,
  Button,
  Chip,
  Divider,
  IconButton,
  LinearProgress,
  Paper,
  Skeleton,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import PaymentsOutlinedIcon from "@mui/icons-material/PaymentsOutlined";
import ReceiptLongOutlinedIcon from "@mui/icons-material/ReceiptLongOutlined";
import LocalDiningOutlinedIcon from "@mui/icons-material/LocalDiningOutlined";
import TrendingUpOutlinedIcon from "@mui/icons-material/TrendingUpOutlined";
import RefreshIcon from "@mui/icons-material/Refresh";
import TableRestaurantOutlinedIcon from "@mui/icons-material/TableRestaurantOutlined";
import RestaurantMenuOutlinedIcon from "@mui/icons-material/RestaurantMenuOutlined";
import WhatshotOutlinedIcon from "@mui/icons-material/WhatshotOutlined";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import CategoryOutlinedIcon from "@mui/icons-material/CategoryOutlined";
import BusinessOutlinedIcon from "@mui/icons-material/BusinessOutlined";
import PeopleAltOutlinedIcon from "@mui/icons-material/PeopleAltOutlined";
import StorefrontOutlinedIcon from "@mui/icons-material/StorefrontOutlined";
import InsightsOutlinedIcon from "@mui/icons-material/InsightsOutlined";
import {
  getDashboardStats,
  getSuperAdminOverview,
  resolveMenuImageUrl,
  type DashboardPeriod,
  type DashboardStats,
  type OrderStatus,
  type RecentOrderSummary,
  type SuperAdminOverview,
  type TopProduct,
} from "@/lib/api";
import SalesLineChart from "@/components/admin/SalesLineChart";
import { useAppSnackbar } from "@/components/common/SnackBar";
import { safeError } from "@/lib/safeError";
import { useAuth } from "@/lib/auth-context";

const formatCurrency = (value: number, fractionDigits = 0) =>
  `Rs. ${Number(value ?? 0).toLocaleString("en-IN", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  })}`;

const statusMeta: Record<OrderStatus, { label: string; color: string; bg: string }> = {
  pending: { label: "Pending", color: "var(--status-pending-fg)", bg: "var(--status-pending-bg)" },
  confirmed: { label: "Confirmed", color: "var(--status-confirmed-fg)", bg: "var(--status-confirmed-bg)" },
  preparing: { label: "Preparing", color: "var(--status-preparing-fg)", bg: "var(--status-preparing-bg)" },
  ready: { label: "Ready", color: "var(--status-ready-fg)", bg: "var(--status-ready-bg)" },
  served: { label: "Served", color: "var(--status-served-fg)", bg: "var(--status-served-bg)" },
  cancelled: { label: "Cancelled", color: "var(--status-cancelled-fg)", bg: "var(--status-cancelled-bg)" },
  closed: { label: "Closed", color: "var(--status-closed-fg)", bg: "var(--status-closed-bg)" },
};

const statusOrder: OrderStatus[] = ["pending", "confirmed", "preparing", "ready", "served", "cancelled", "closed"];

const formatRelativeTime = (iso: string) => {
  const timestamp = new Date(iso).getTime();
  if (Number.isNaN(timestamp)) return "—";

  const minutes = Math.max(Math.floor((Date.now() - timestamp) / 60000), 0);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  return days === 1 ? "Yesterday" : `${days}d ago`;
};

const ProductThumb = ({ product, rank }: { product: TopProduct; rank: number }) => {
  const imageSrc = resolveMenuImageUrl(product.imageUrl);

  return (
    <Box
      sx={{
        position: "relative",
        width: { xs: 42, md: 48 },
        height: { xs: 42, md: 48 },
        flexShrink: 0,
        borderRadius: "14px",
        overflow: "hidden",
        border: "1px solid var(--border)",
        backgroundColor: "color-mix(in srgb, var(--primary) 12%, transparent)",
      }}
    >
      {imageSrc ? (
        <Box
          component="img"
          src={imageSrc}
          alt={product.name}
          loading="lazy"
          sx={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
        />
      ) : (
        <Box sx={{ width: "100%", height: "100%", display: "grid", placeItems: "center", color: "var(--primary)" }}>
          <RestaurantMenuOutlinedIcon sx={{ fontSize: { xs: 19, md: 21 } }} />
        </Box>
      )}
      <Box
        sx={{
          position: "absolute",
          top: 3,
          left: 3,
          minWidth: 18,
          height: 18,
          px: "4px",
          borderRadius: "999px",
          display: "grid",
          placeItems: "center",
          fontSize: "0.64rem",
          fontWeight: 900,
          color: "var(--primary-foreground)",
          backgroundColor: "var(--primary)",
          boxShadow: "0 2px 6px rgba(0, 0, 0, 0.28)",
        }}
      >
        {rank}
      </Box>
    </Box>
  );
};

const RecentOrderRow = ({ order }: { order: RecentOrderSummary }) => {
  const meta = statusMeta[order.status] ?? statusMeta.pending;

  return (
    <Stack
      direction="row"
      alignItems="center"
      spacing={1.25}
      sx={{ py: 1, minWidth: 0, borderBottom: "1px dashed var(--border)", "&:last-of-type": { borderBottom: "none" } }}
    >
      <Box
        sx={{
          width: 34,
          height: 34,
          flexShrink: 0,
          borderRadius: "11px",
          display: "grid",
          placeItems: "center",
          color: "var(--primary)",
          backgroundColor: "color-mix(in srgb, var(--primary) 12%, transparent)",
          fontWeight: 900,
          fontSize: "0.74rem",
        }}
      >
        #{order.id}
      </Box>
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Typography sx={{ fontWeight: 850, fontSize: "0.86rem", lineHeight: 1.2 }}>
          {order.tableNo ? `Table ${order.tableNo}` : order.orderType === "takeaway" ? "Takeaway" : "Dine-in"}
        </Typography>
        <Typography sx={{ fontSize: "0.7rem", color: "var(--muted-foreground)", fontWeight: 700 }}>
          {order.itemCount} {order.itemCount === 1 ? "item" : "items"} · {formatRelativeTime(order.createdAt)}
        </Typography>
      </Box>
      <Box sx={{ textAlign: "right", flexShrink: 0 }}>
        <Typography sx={{ fontWeight: 900, fontSize: "0.84rem", whiteSpace: "nowrap" }}>
          {formatCurrency(order.total)}
        </Typography>
        <Chip
          label={meta.label}
          size="small"
          sx={{
            mt: 0.25,
            height: 20,
            fontSize: "0.64rem",
            fontWeight: 800,
            color: meta.color,
            backgroundColor: meta.bg,
          }}
        />
      </Box>
    </Stack>
  );
};

type KpiCardProps = {
  label: string;
  value: string;
  helper?: string;
  icon: React.ElementType;
  accent: string;
};

const KpiCard = ({ label, value, helper, icon: Icon, accent }: KpiCardProps) => (
  <Paper
    elevation={0}
    sx={{
      p: { xs: 1.5, md: 2.25 },
      borderRadius: "18px",
      border: "1px solid var(--border)",
      backgroundColor: "var(--card)",
      position: "relative",
      overflow: "hidden",
      minWidth: 0,
      display: "flex",
      flexDirection: "column",
      gap: 1,
      boxShadow: "0 14px 32px rgba(31, 42, 43, 0.08)",
      "&::after": {
        content: '""',
        position: "absolute",
        inset: 0,
        backgroundImage: `radial-gradient(130px 130px at 100% 0%, color-mix(in srgb, ${accent} 26%, transparent), transparent 70%)`,
        pointerEvents: "none",
      },
    }}
  >
    <Stack direction="row" spacing={{ xs: 1, md: 1.25 }} alignItems="center" sx={{ position: "relative", zIndex: 1, minWidth: 0 }}>
      <Box
        sx={{
          width: { xs: 36, md: 46 },
          height: { xs: 36, md: 46 },
          borderRadius: "13px",
          display: "grid",
          placeItems: "center",
          flexShrink: 0,
          color: accent,
          backgroundColor: `color-mix(in srgb, ${accent} 16%, transparent)`,
          border: `1px solid color-mix(in srgb, ${accent} 34%, transparent)`,
        }}
      >
        <Icon sx={{ fontSize: { xs: 20, md: 24 } }} />
      </Box>
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Typography
          sx={{
            fontSize: { xs: "0.62rem", md: "0.76rem" },
            fontWeight: 800,
            color: "var(--muted-foreground)",
            textTransform: "uppercase",
            letterSpacing: { xs: "0.02em", md: "0.05em" },
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {label}
        </Typography>
        <Typography sx={{ fontSize: { xs: "1.15rem", md: "1.55rem" }, fontWeight: 900, mt: 0.25, lineHeight: 1.1, overflowWrap: "anywhere" }}>
          {value}
        </Typography>
      </Box>
    </Stack>
    {helper ? (
      <Typography sx={{ position: "relative", zIndex: 1, fontSize: { xs: "0.66rem", md: "0.78rem" }, color: "var(--muted-foreground)", fontWeight: 650 }}>
        {helper}
      </Typography>
    ) : null}
  </Paper>
);

export default function AdminDashboardPage() {
  const { isSuperAdmin, loading: authLoading } = useAuth();

  if (authLoading) {
    return (
      <Box sx={{ display: "grid", gap: 2, minWidth: 0 }}>
        <Skeleton variant="rounded" height={140} sx={{ borderRadius: "22px" }} />
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(3, minmax(0, 1fr))" }, gap: 2 }}>
          {[0, 1, 2].map((key) => <Skeleton key={key} variant="rounded" height={150} sx={{ borderRadius: "18px" }} />)}
        </Box>
      </Box>
    );
  }

  return isSuperAdmin ? <SuperAdminDashboard /> : <BusinessAdminDashboard />;
}

function SuperAdminDashboard() {
  const [overview, setOverview] = React.useState<SuperAdminOverview | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [failed, setFailed] = React.useState(false);
  const { showSnackbar } = useAppSnackbar();

  const fetchOverview = React.useCallback(async (quiet = false) => {
    if (!quiet) setRefreshing(true);
    try {
      const data = await getSuperAdminOverview();
      setOverview(data);
      setFailed(false);
    } catch (error) {
      console.error("Failed to fetch super-admin overview:", error);
      setFailed(true);
      if (!quiet) showSnackbar(safeError(error, "Failed to load platform overview."), "error");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [showSnackbar]);

  React.useEffect(() => {
    void fetchOverview(true);
  }, [fetchOverview]);

  React.useEffect(() => {
    const refreshQuietly = () => {
      if (document.visibilityState === "visible") void fetchOverview(true);
    };
    const interval = window.setInterval(refreshQuietly, 60_000);
    document.addEventListener("visibilitychange", refreshQuietly);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", refreshQuietly);
    };
  }, [fetchOverview]);

  if (loading) {
    return (
      <Box sx={{ display: "grid", gap: 2, minWidth: 0 }}>
        <Skeleton variant="rounded" height={142} sx={{ borderRadius: "22px" }} />
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(3, minmax(0, 1fr))" }, gap: 2 }}>
          {[0, 1, 2].map((key) => <Skeleton key={key} variant="rounded" height={150} sx={{ borderRadius: "18px" }} />)}
        </Box>
        <Skeleton variant="rounded" height={220} sx={{ borderRadius: "22px" }} />
      </Box>
    );
  }

  if (!overview) {
    return (
      <Paper elevation={0} sx={{ p: { xs: 3, md: 5 }, textAlign: "center", borderRadius: "22px", border: "1px solid var(--border)", backgroundColor: "var(--card)" }}>
        <Typography sx={{ fontSize: "1.1rem", fontWeight: 900 }}>Platform overview is unavailable</Typography>
        <Typography sx={{ mt: 0.5, color: "var(--muted-foreground)" }}>
          {failed ? "The server could not load the overview. Try again." : "No overview data was returned."}
        </Typography>
        <Button onClick={() => void fetchOverview(false)} disabled={refreshing} variant="contained" sx={{ mt: 2, borderRadius: "12px", textTransform: "none", fontWeight: 850 }}>
          {refreshing ? "Loading..." : "Try again"}
        </Button>
      </Paper>
    );
  }

  const summaries = [
    {
      label: "Businesses",
      value: overview.businesses.total,
      helper: `${overview.businesses.active} active · ${overview.businesses.inactive} inactive`,
      icon: BusinessOutlinedIcon,
      accent: "var(--chart-1)",
    },
    {
      label: "Active businesses",
      value: overview.businesses.active,
      helper: "Currently available on the platform",
      icon: StorefrontOutlinedIcon,
      accent: "var(--chart-2)",
    },
    {
      label: "User accounts",
      value: overview.users.total,
      helper: `${overview.users.admin} owners · ${overview.users.user} customers`,
      icon: PeopleAltOutlinedIcon,
      accent: "var(--chart-3)",
    },
  ];

  const destinations = [
    { title: "Businesses", detail: "Review business profiles and activation status.", href: "/super-admin/businesses", icon: StorefrontOutlinedIcon },
    { title: "Users", detail: "Manage owners, customers, and administrator accounts.", href: "/super-admin/users", icon: PeopleAltOutlinedIcon },
    { title: "Analytics", detail: "Explore growth, revenue, and API usage in detail.", href: "/super-admin/analytics", icon: InsightsOutlinedIcon },
  ];

  return (
    <Box sx={{ display: "grid", gap: { xs: 1.5, md: 2 }, minWidth: 0 }}>
      <Paper
        elevation={0}
        sx={{
          p: { xs: 2, md: 3 },
          borderRadius: "22px",
          border: "1px solid var(--border)",
          backgroundColor: "var(--card)",
          backgroundImage: "linear-gradient(120deg, color-mix(in srgb, var(--chart-2) 12%, transparent), transparent 58%)",
          boxShadow: "0 16px 36px rgba(31, 42, 43, 0.08)",
        }}
      >
        <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ xs: "stretch", sm: "center" }} spacing={2}>
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ color: "var(--muted-foreground)", fontSize: "0.72rem", fontWeight: 850, letterSpacing: "0.12em", textTransform: "uppercase" }}>
              Super admin · Platform
            </Typography>
            <Typography sx={{ mt: 0.4, fontSize: { xs: "1.5rem", md: "2rem" }, lineHeight: 1.1, fontWeight: 900 }}>
              Platform overview
            </Typography>
            <Typography sx={{ mt: 0.7, color: "var(--muted-foreground)", fontSize: { xs: "0.84rem", md: "0.92rem" }, maxWidth: 620 }}>
              A quick snapshot of businesses and accounts. Use Analytics for revenue trends and detailed platform activity.
            </Typography>
          </Box>
          <Stack direction="row" spacing={1}>
            <Button component={Link} href="/super-admin/analytics" variant="contained" endIcon={<ArrowForwardRoundedIcon />} sx={{ minHeight: 44, borderRadius: "12px", textTransform: "none", fontWeight: 850 }}>
              Open analytics
            </Button>
            <IconButton aria-label="Refresh platform overview" onClick={() => void fetchOverview(false)} disabled={refreshing} sx={{ width: 44, height: 44, borderRadius: "12px", border: "1px solid var(--border)" }}>
              <RefreshIcon />
            </IconButton>
          </Stack>
        </Stack>
      </Paper>

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(3, minmax(0, 1fr))" }, gap: { xs: 1.25, md: 2 }, minWidth: 0 }}>
        {summaries.map((item) => {
          const Icon = item.icon;
          return (
            <Paper key={item.label} elevation={0} sx={{ p: { xs: 1.75, md: 2.25 }, minWidth: 0, borderRadius: "18px", border: "1px solid var(--border)", backgroundColor: "var(--card)" }}>
              <Stack direction="row" alignItems="center" spacing={1.25}>
                <Box sx={{ width: 42, height: 42, display: "grid", placeItems: "center", flexShrink: 0, borderRadius: "13px", color: item.accent, backgroundColor: `color-mix(in srgb, ${item.accent} 14%, transparent)` }}>
                  <Icon />
                </Box>
                <Box sx={{ minWidth: 0 }}>
                  <Typography sx={{ color: "var(--muted-foreground)", fontSize: "0.7rem", fontWeight: 850, textTransform: "uppercase", letterSpacing: "0.05em" }}>{item.label}</Typography>
                  <Typography sx={{ mt: 0.15, fontSize: { xs: "1.45rem", md: "1.7rem" }, lineHeight: 1.1, fontWeight: 900 }}>{item.value.toLocaleString("en-IN")}</Typography>
                </Box>
              </Stack>
              <Typography sx={{ mt: 1.25, color: "var(--muted-foreground)", fontSize: "0.78rem", fontWeight: 650 }}>{item.helper}</Typography>
            </Paper>
          );
        })}
      </Box>

      <Paper elevation={0} sx={{ p: { xs: 1.75, md: 2.5 }, borderRadius: "22px", border: "1px solid var(--border)", backgroundColor: "var(--card)" }}>
        <Typography sx={{ fontSize: "1.05rem", fontWeight: 900 }}>Manage the platform</Typography>
        <Typography sx={{ mt: 0.35, color: "var(--muted-foreground)", fontSize: "0.82rem" }}>Go directly to the area you need.</Typography>
        <Box sx={{ mt: 1.75, display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(3, minmax(0, 1fr))" }, gap: 1.25 }}>
          {destinations.map((item) => {
            const Icon = item.icon;
            return (
              <Paper key={item.title} component={Link} href={item.href} elevation={0} sx={{ p: 1.5, minWidth: 0, display: "flex", alignItems: "center", gap: 1.25, textDecoration: "none", color: "inherit", borderRadius: "15px", border: "1px solid var(--border)", backgroundColor: "var(--background)", transition: "border-color 160ms ease, transform 160ms ease", "&:hover": { borderColor: "var(--primary)", transform: "translateY(-2px)" } }}>
                <Box sx={{ width: 38, height: 38, flexShrink: 0, display: "grid", placeItems: "center", borderRadius: "12px", color: "var(--primary)", backgroundColor: "color-mix(in srgb, var(--primary) 12%, transparent)" }}><Icon fontSize="small" /></Box>
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography sx={{ fontWeight: 850 }}>{item.title}</Typography>
                  <Typography sx={{ mt: 0.2, color: "var(--muted-foreground)", fontSize: "0.75rem", lineHeight: 1.4 }}>{item.detail}</Typography>
                </Box>
                <ArrowForwardRoundedIcon sx={{ color: "var(--muted-foreground)", fontSize: 18, flexShrink: 0 }} />
              </Paper>
            );
          })}
        </Box>
        <Divider sx={{ my: 2, borderColor: "var(--border)" }} />
        <Stack direction="row" useFlexGap flexWrap="wrap" spacing={{ xs: 1.5, sm: 3 }}>
          <Typography sx={{ color: "var(--muted-foreground)", fontSize: "0.78rem" }}><strong>{overview.users.super_admin}</strong> super admins</Typography>
          <Typography sx={{ color: "var(--muted-foreground)", fontSize: "0.78rem" }}><strong>{overview.users.admin}</strong> business owners</Typography>
          <Typography sx={{ color: "var(--muted-foreground)", fontSize: "0.78rem" }}><strong>{overview.users.user}</strong> customers</Typography>
        </Stack>
      </Paper>
    </Box>
  );
}

function BusinessAdminDashboard() {
  const [stats, setStats] = React.useState<DashboardStats | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [period, setPeriod] = React.useState<DashboardPeriod>("daily");
  const { showSnackbar } = useAppSnackbar();

  const fetchStats = React.useCallback(
    async (requestedPeriod: DashboardPeriod = "daily") => {
      try {
        const data = await getDashboardStats(requestedPeriod);
        setStats(data);
      } catch (error) {
        console.error("Failed to fetch dashboard:", error);
        showSnackbar(safeError(error, "Failed to load dashboard."), "error");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [showSnackbar],
  );

  React.useEffect(() => {
    fetchStats(period);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchStats]);

  // Keep the dashboard live: refresh every minute and whenever the tab returns.
  React.useEffect(() => {
    let active = true;

    const refreshQuietly = () => {
      if (document.hidden) return;

      getDashboardStats(period)
        .then((data) => {
          if (active) setStats(data);
        })
        .catch(() => {
          // Background refresh failures should not interrupt the operator.
        });
    };

    const interval = window.setInterval(refreshQuietly, 60_000);
    document.addEventListener("visibilitychange", refreshQuietly);

    return () => {
      active = false;
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", refreshQuietly);
    };
  }, [period]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchStats(period);
  };

  const handlePeriodChange = (
    _event: React.MouseEvent<HTMLElement>,
    next: DashboardPeriod | null,
  ) => {
    if (!next || next === period) return;
    setPeriod(next);
    setRefreshing(true);
    fetchStats(next);
  };

  if (loading) {
    return (
      <Box sx={{ p: { xs: 1, md: 2 }, display: "grid", gap: 2.5 }}>
        <Skeleton variant="rounded" height={64} sx={{ borderRadius: "20px" }} />
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "repeat(2, 1fr)", md: "repeat(4, 1fr)" }, gap: 2 }}>
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} variant="rounded" height={110} sx={{ borderRadius: "20px" }} />
          ))}
        </Box>
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1.7fr 1fr" }, gap: 2 }}>
          <Skeleton variant="rounded" height={340} sx={{ borderRadius: "22px" }} />
          <Skeleton variant="rounded" height={340} sx={{ borderRadius: "22px" }} />
        </Box>
      </Box>
    );
  }

  if (!stats) {
    return (
      <Box sx={{ p: 3 }}>
        <Paper sx={{ p: 5, textAlign: "center", borderRadius: "22px", border: "1px solid var(--border)" }}>
          <Typography sx={{ fontWeight: 800, color: "var(--muted-foreground)" }}>
            Dashboard data is unavailable right now.
          </Typography>
          <Button onClick={handleRefresh} sx={{ mt: 2, borderRadius: "12px" }} variant="contained">
            Try again
          </Button>
        </Paper>
      </Box>
    );
  }

  const { kpis, topProducts, salesTrend, statusBreakdown, recentOrders } = stats;
  const trendRevenue = salesTrend.reduce((total, point) => total + point.revenue, 0);
  const bestDay = salesTrend.reduce<DashboardStats["salesTrend"][number] | null>(
    (best, point) => (best === null || point.revenue > best.revenue ? point : best),
    null,
  );
  const maxTopQuantity = Math.max(...topProducts.map((product) => product.quantity), 1);
  const pipelineTotal = statusOrder.reduce((total, status) => total + (statusBreakdown[status] ?? 0), 0);

  return (
    <Box sx={{ display: "grid", gap: 2, minWidth: 0 }}>
      <Paper
        elevation={0}
        sx={{
          p: { xs: 1.75, md: 2.75 },
          borderRadius: "22px",
          border: "1px solid var(--border)",
          backgroundColor: "var(--card)",
          backgroundImage:
            "radial-gradient(420px 200px at 88% 0%, color-mix(in srgb, var(--chart-2) 22%, transparent), transparent 65%), linear-gradient(135deg, color-mix(in srgb, var(--chart-1) 12%, transparent), transparent 62%)",
          boxShadow: "0 18px 40px rgba(31, 42, 43, 0.1)",
        }}
      >
        <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1.5}>
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontSize: "0.78rem", fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--muted-foreground)" }}>
              {stats.businessType} · Overview
            </Typography>
            <Typography sx={{ fontSize: { xs: "1.3rem", md: "2rem" }, fontWeight: 900, mt: 0.4, lineHeight: 1.1 }}>
              Welcome back, {stats.ownerName}
            </Typography>
            <Typography sx={{ color: "var(--muted-foreground)", fontSize: { xs: "0.85rem", md: "0.95rem" }, mt: 0.5, fontWeight: 650 }}>
              {stats.businessName} · {kpis.totalOrders} orders · {kpis.itemsSold} items sold to date
            </Typography>
          </Box>
          <IconButton
            aria-label="refresh dashboard"
            onClick={handleRefresh}
            disabled={refreshing}
            sx={{
              display: { xs: "inline-flex", md: "none" },
              width: 42,
              height: 42,
              flexShrink: 0,
              borderRadius: "14px",
              border: "1px solid var(--border)",
              backgroundColor: "var(--card)",
              color: "var(--primary)",
            }}
          >
            <RefreshIcon />
          </IconButton>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={handleRefresh}
            disabled={refreshing}
            sx={{ display: { xs: "none", md: "inline-flex" }, flexShrink: 0, borderRadius: "14px" }}
          >
            {refreshing ? "Refreshing..." : "Refresh"}
          </Button>
        </Stack>
      </Paper>

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "repeat(2, 1fr)", md: "repeat(4, 1fr)" }, gap: { xs: 1.5, md: 2 } }}>
        <KpiCard
          label="Total Revenue"
          value={formatCurrency(kpis.totalRevenue)}
          helper="Excludes cancelled orders"
          icon={PaymentsOutlinedIcon}
          accent="var(--chart-1)"
        />
        <KpiCard
          label="Total Orders"
          value={kpis.totalOrders.toLocaleString("en-IN")}
          helper={`${statusBreakdown.cancelled ?? 0} cancelled`}
          icon={ReceiptLongOutlinedIcon}
          accent="var(--chart-2)"
        />
        <KpiCard
          label="Items Sold"
          value={kpis.itemsSold.toLocaleString("en-IN")}
          helper="Across all orders"
          icon={LocalDiningOutlinedIcon}
          accent="var(--chart-3)"
        />
        <KpiCard
          label="Avg Order Value"
          value={formatCurrency(kpis.avgOrderValue)}
          helper="Per completed order"
          icon={TrendingUpOutlinedIcon}
          accent="var(--chart-4)"
        />
      </Box>

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1.7fr 1fr" }, gap: 2, minWidth: 0 }}>
        <Paper
          elevation={0}
          sx={{
            p: { xs: 1.75, md: 2.75 },
            borderRadius: "22px",
            border: "1px solid var(--border)",
            backgroundColor: "var(--card)",
            minWidth: 0,
            boxShadow: "0 18px 40px rgba(31, 42, 43, 0.08)",
          }}
        >
          <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" alignItems={{ xs: "flex-start", md: "center" }} spacing={1}>
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ fontSize: { xs: "1rem", md: "1.15rem" }, fontWeight: 900 }}>Sales Overview</Typography>
              <Typography sx={{ fontSize: { xs: "0.76rem", md: "0.82rem" }, color: "var(--muted-foreground)", fontWeight: 650 }}>
                Revenue across the last {salesTrend.length}{" "}
                {period === "daily" ? "days" : period === "weekly" ? "weeks" : "months"}
              </Typography>
            </Box>
            <Box sx={{ textAlign: { xs: "left", md: "right" }, flexShrink: 0 }}>
              <Typography sx={{ fontSize: { xs: "1.05rem", md: "1.3rem" }, fontWeight: 900 }}>{formatCurrency(trendRevenue)}</Typography>
              {bestDay ? (
                <Typography sx={{ fontSize: "0.72rem", color: "var(--muted-foreground)", fontWeight: 700 }}>
                  Peak: {bestDay.label} · {formatCurrency(bestDay.revenue)}
                </Typography>
              ) : null}
            </Box>
          </Stack>

          <Stack direction="row" justifyContent="flex-end" sx={{ mt: 1.5 }}>
            <ToggleButtonGroup
              exclusive
              size="small"
              value={period}
              onChange={handlePeriodChange}
              aria-label="Sales overview period"
              sx={{
                "& .MuiToggleButtonGroup-grouped": {
                  border: "1px solid var(--border) !important",
                  borderRadius: "10px !important",
                  margin: "0 5px 0 0 !important",
                  px: { xs: 1, md: 1.4 },
                  py: 0.4,
                  fontSize: { xs: "0.7rem", md: "0.76rem" },
                  fontWeight: 800,
                  textTransform: "none",
                  color: "var(--muted-foreground)",
                  "&.Mui-selected": {
                    backgroundColor: "var(--primary) !important",
                    color: "var(--primary-foreground) !important",
                    borderColor: "var(--primary) !important",
                  },
                },
                "& .MuiToggleButtonGroup-grouped:not(:last-of-type)": {
                  borderTopRightRadius: "10px !important",
                  borderBottomRightRadius: "10px !important",
                },
                "& .MuiToggleButtonGroup-grouped:not(:first-of-type)": {
                  borderTopLeftRadius: "10px !important",
                  borderBottomLeftRadius: "10px !important",
                },
              }}
            >
              <ToggleButton value="daily">Daily</ToggleButton>
              <ToggleButton value="weekly">Weekly</ToggleButton>
              <ToggleButton value="monthly">Monthly</ToggleButton>
            </ToggleButtonGroup>
          </Stack>

          <Box sx={{ mt: 2 }}>
            {salesTrend.length > 0 ? (
              <SalesLineChart data={salesTrend} height={260} />
            ) : (
              <Box sx={{ height: 220, display: "grid", placeItems: "center", color: "var(--muted-foreground)" }}>
                <Typography sx={{ fontWeight: 700 }}>No sales recorded yet.</Typography>
              </Box>
            )}
          </Box>
        </Paper>

        <Paper
          elevation={0}
          sx={{
            p: { xs: 1.75, md: 2.75 },
            borderRadius: "22px",
            border: "1px solid var(--border)",
            backgroundColor: "var(--card)",
            minWidth: 0,
            boxShadow: "0 18px 40px rgba(31, 42, 43, 0.08)",
          }}
        >
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
            <WhatshotOutlinedIcon sx={{ color: "var(--chart-1)" }} />
            <Box>
              <Typography sx={{ fontSize: { xs: "1rem", md: "1.15rem" }, fontWeight: 900, lineHeight: 1.1 }}>
                Top Selling Items
              </Typography>
              <Typography sx={{ fontSize: "0.76rem", color: "var(--muted-foreground)", fontWeight: 650 }}>
                Best performers by quantity sold
              </Typography>
            </Box>
          </Stack>

          {topProducts.length === 0 ? (
            <Box sx={{ py: 6, textAlign: "center", color: "var(--muted-foreground)" }}>
              <Typography sx={{ fontWeight: 700 }}>No items sold yet.</Typography>
            </Box>
          ) : (
            <Stack spacing={1.5}>
              {topProducts.map((product, index) => (
                <Box key={product.menuItemId} sx={{ minWidth: 0 }}>
                  <Stack direction="row" alignItems="center" spacing={1.25} sx={{ minWidth: 0 }}>
                    <ProductThumb product={product} rank={index + 1} />
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Typography sx={{ fontWeight: 850, fontSize: { xs: "0.88rem", md: "0.95rem" }, overflowWrap: "anywhere", lineHeight: 1.2 }}>
                        {product.name}
                      </Typography>
                      <Typography sx={{ fontSize: "0.72rem", color: "var(--muted-foreground)", fontWeight: 700, textTransform: "capitalize" }}>
                        {product.category} · {product.foodType.replace("-", " ")}
                      </Typography>
                    </Box>
                    <Box sx={{ textAlign: "right", flexShrink: 0 }}>
                      <Typography sx={{ fontWeight: 900, fontSize: { xs: "0.88rem", md: "0.95rem" }, whiteSpace: "nowrap" }}>
                        {formatCurrency(product.revenue)}
                      </Typography>
                      <Typography sx={{ fontSize: "0.72rem", color: "var(--muted-foreground)", fontWeight: 750 }}>
                        {product.quantity} sold
                      </Typography>
                    </Box>
                  </Stack>
                  <LinearProgress
                    variant="determinate"
                    value={(product.quantity / maxTopQuantity) * 100}
                    sx={{
                      mt: 0.85,
                      height: 7,
                      borderRadius: 999,
                      backgroundColor: "color-mix(in srgb, var(--chart-1) 14%, transparent)",
                      "& .MuiLinearProgress-bar": {
                        borderRadius: 999,
                        backgroundImage: "linear-gradient(90deg, var(--chart-1), var(--chart-2))",
                      },
                    }}
                  />
                </Box>
              ))}
            </Stack>
          )}
        </Paper>
      </Box>

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1.4fr 1fr" }, gap: 2, minWidth: 0 }}>
        <Paper
          elevation={0}
          sx={{
            p: { xs: 1.75, md: 2.75 },
            borderRadius: "22px",
            border: "1px solid var(--border)",
            backgroundColor: "var(--card)",
            minWidth: 0,
            boxShadow: "0 18px 40px rgba(31, 42, 43, 0.08)",
          }}
        >
          <Typography sx={{ fontSize: { xs: "1rem", md: "1.15rem" }, fontWeight: 900 }}>Order Pipeline</Typography>
          <Typography sx={{ fontSize: "0.76rem", color: "var(--muted-foreground)", fontWeight: 650, mb: 0.5 }}>
            {pipelineTotal} orders by current status
          </Typography>
          <Stack spacing={1.25} sx={{ mt: 1.5 }}>
            {statusOrder.map((status) => {
              const count = statusBreakdown[status] ?? 0;
              const meta = statusMeta[status];
              const percent = pipelineTotal > 0 ? (count / pipelineTotal) * 100 : 0;

              return (
                <Stack key={status} direction="row" alignItems="center" spacing={1.5} sx={{ minWidth: 0 }}>
                  <Chip
                    label={meta.label}
                    size="small"
                    sx={{
                      width: 104,
                      height: 28,
                      flexShrink: 0,
                      fontWeight: 800,
                      fontSize: "0.74rem",
                      color: meta.color,
                      backgroundColor: meta.bg,
                    }}
                  />
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <LinearProgress
                      variant="determinate"
                      value={percent}
                      sx={{
                        height: 8,
                        borderRadius: 999,
                        backgroundColor: "color-mix(in srgb, var(--foreground) 8%, transparent)",
                        "& .MuiLinearProgress-bar": { borderRadius: 999, backgroundColor: meta.color },
                      }}
                    />
                  </Box>
                  <Typography sx={{ width: 34, textAlign: "right", fontWeight: 900, flexShrink: 0, fontSize: "0.88rem" }}>
                    {count}
                  </Typography>
                </Stack>
              );
            })}
          </Stack>
        </Paper>

        <Paper
          elevation={0}
          sx={{
            p: { xs: 1.75, md: 2.75 },
            borderRadius: "22px",
            border: "1px solid var(--border)",
            backgroundColor: "var(--card)",
            minWidth: 0,
            backgroundImage:
              "linear-gradient(140deg, color-mix(in srgb, var(--accent) 10%, transparent), transparent 60%)",
            boxShadow: "0 18px 40px rgba(31, 42, 43, 0.08)",
          }}
        >
          <Typography sx={{ fontSize: { xs: "1rem", md: "1.15rem" }, fontWeight: 900 }}>At a Glance</Typography>
          <Typography sx={{ fontSize: "0.76rem", color: "var(--muted-foreground)", fontWeight: 650, mb: 0.5 }}>
            Your restaurant snapshot
          </Typography>

          <Stack spacing={1.5} sx={{ mt: 1.5 }}>
            {[
              {
                icon: TableRestaurantOutlinedIcon,
                label: "Available Tables",
                value: `${kpis.activeTables} / ${kpis.totalTables}`,
                helper:
                  kpis.occupiedTables > 0
                    ? `${kpis.occupiedTables} occupied right now`
                    : "No occupied tables",
              },
              {
                icon: WhatshotOutlinedIcon,
                label: "Occupied Tables",
                value: `${kpis.occupiedTables}`,
                helper: kpis.inactiveTables > 0 ? `${kpis.inactiveTables} table(s) turned off` : undefined,
              },
              { icon: RestaurantMenuOutlinedIcon, label: "Menu Items", value: `${kpis.totalMenuItems}` },
              { icon: TrendingUpOutlinedIcon, label: "Best Day", value: bestDay ? `${bestDay.label} · ${formatCurrency(bestDay.revenue)}` : "—" },
            ].map((item) => (
              <Stack key={item.label} direction="row" alignItems="center" spacing={1.5} sx={{ minWidth: 0 }}>
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    flexShrink: 0,
                    borderRadius: "13px",
                    display: "grid",
                    placeItems: "center",
                    color: "var(--accent)",
                    backgroundColor: "color-mix(in srgb, var(--accent) 16%, transparent)",
                  }}
                >
                  <item.icon sx={{ fontSize: 21 }} />
                </Box>
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography sx={{ fontSize: "0.72rem", fontWeight: 800, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                    {item.label}
                  </Typography>
                  <Typography sx={{ fontWeight: 850, fontSize: "0.95rem", overflowWrap: "anywhere" }}>{item.value}</Typography>
                  {item.helper ? (
                    <Typography sx={{ fontSize: "0.7rem", color: "var(--muted-foreground)", fontWeight: 650 }}>
                      {item.helper}
                    </Typography>
                  ) : null}
                </Box>
              </Stack>
            ))}
          </Stack>

          <Divider sx={{ my: 2 }} />
          <Typography sx={{ fontSize: "0.72rem", fontWeight: 800, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
            Quick actions
          </Typography>
          <Stack direction="row" flexWrap="wrap" useFlexGap spacing={1} sx={{ mt: 1 }}>
            {[
              { label: "Orders", href: "/business-admin/orders", icon: ReceiptLongOutlinedIcon },
              { label: "Tables", href: "/business-admin/tables", icon: TableRestaurantOutlinedIcon },
              { label: "Menu", href: "/business-admin/menu", icon: RestaurantMenuOutlinedIcon },
              { label: "Categories", href: "/business-admin/category", icon: CategoryOutlinedIcon },
            ].map((action) => (
              <Button
                key={action.label}
                component={Link}
                href={action.href}
                size="small"
                variant="outlined"
                startIcon={<action.icon sx={{ fontSize: "16px !important" }} />}
                sx={{
                  borderRadius: "10px",
                  textTransform: "none",
                  fontWeight: 800,
                  minHeight: 34,
                  borderColor: "var(--border)",
                  color: "var(--foreground)",
                  "&:hover": { borderColor: "var(--primary)", color: "var(--primary)" },
                }}
              >
                {action.label}
              </Button>
            ))}
          </Stack>

          <Divider sx={{ my: 2 }} />
          <Typography sx={{ fontSize: "0.72rem", color: "var(--muted-foreground)", fontWeight: 650 }}>
            Last updated {new Date(stats.generatedAt).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
          </Typography>
        </Paper>
      </Box>

      <Paper
        elevation={0}
        sx={{
          p: { xs: 1.75, md: 2.75 },
          borderRadius: "22px",
          border: "1px solid var(--border)",
          backgroundColor: "var(--card)",
          minWidth: 0,
          boxShadow: "0 18px 40px rgba(31, 42, 43, 0.08)",
        }}
      >
        <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontSize: { xs: "1rem", md: "1.15rem" }, fontWeight: 900 }}>Recent Orders</Typography>
            <Typography sx={{ fontSize: "0.76rem", color: "var(--muted-foreground)", fontWeight: 650 }}>
              Latest activity across your tables
            </Typography>
          </Box>
          <Button
            component={Link}
            href="/business-admin/orders"
            size="small"
            endIcon={<ArrowForwardRoundedIcon />}
            sx={{ flexShrink: 0, borderRadius: "10px", fontWeight: 800, textTransform: "none" }}
          >
            View all
          </Button>
        </Stack>

        {recentOrders.length === 0 ? (
          <Box sx={{ py: 4, textAlign: "center", color: "var(--muted-foreground)" }}>
            <Typography sx={{ fontWeight: 700 }}>No orders yet.</Typography>
          </Box>
        ) : (
          <Stack sx={{ mt: 1 }}>
            {recentOrders.map((order) => (
              <RecentOrderRow key={order.id} order={order} />
            ))}
          </Stack>
        )}
      </Paper>
    </Box>
  );
}
