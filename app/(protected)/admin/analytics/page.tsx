"use client";

import * as React from "react";
import {
  Box,
  Button,
  Chip,
  Divider,
  IconButton,
  Paper,
  Skeleton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import PaymentsOutlinedIcon from "@mui/icons-material/PaymentsOutlined";
import ReceiptLongOutlinedIcon from "@mui/icons-material/ReceiptLongOutlined";
import PeopleAltOutlinedIcon from "@mui/icons-material/PeopleAltOutlined";
import StorefrontOutlinedIcon from "@mui/icons-material/StorefrontOutlined";
import SpeedOutlinedIcon from "@mui/icons-material/SpeedOutlined";
import StorageOutlinedIcon from "@mui/icons-material/StorageOutlined";
import InsightsOutlinedIcon from "@mui/icons-material/InsightsOutlined";
import useMeasure from "react-use-measure";
import {
  getPlatformAnalytics,
  getRestaurants,
  type AnalyticsGrowth,
  type AnalyticsTrafficPoint,
  type AnalyticsTrendValue,
  type PlatformAnalytics,
  type Restaurant,
} from "@/lib/api";
import { FormControl, InputLabel, MenuItem, Select } from "@mui/material";
import SalesLineChart from "@/components/admin/SalesLineChart";
import { useAppSnackbar } from "@/components/common/SnackBar";
import { safeError } from "@/lib/safeError";

/* -------------------------------------------------------------------------- */
/* Formatting helpers                                                          */
/* -------------------------------------------------------------------------- */

const formatNumber = (value: number) => Math.round(Number(value ?? 0)).toLocaleString("en-IN");

const formatCurrency = (value: number, fractionDigits = 0) =>
  `Rs. ${Number(value ?? 0).toLocaleString("en-IN", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  })}`;

const formatBytes = (bytes: number) => {
  const value = Number(bytes ?? 0);
  if (value <= 0) return "0 B";

  const units = ["B", "KB", "MB", "GB", "TB"];
  const exponent = Math.min(Math.floor(Math.log(value) / Math.log(1024)), units.length - 1);
  const size = value / 1024 ** exponent;

  return `${size.toLocaleString("en-IN", { maximumFractionDigits: size >= 10 ? 0 : 1 })} ${units[exponent]}`;
};

const formatClock = (iso: string) => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "just now";

  return date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
};

const formatTrafficTime = (point: AnalyticsTrafficPoint) => {
  if (point.at) {
    const date = new Date(point.at);
    if (!Number.isNaN(date.getTime())) {
      return date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false });
    }
  }

  return point.label;
};

const titleCase = (value: string) =>
  value
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase())
    .trim();

const niceMax = (value: number) => {
  if (value <= 0) return 1;

  const exponent = Math.floor(Math.log10(value));
  const magnitude = 10 ** exponent;
  const normalized = value / magnitude;
  const step =
    normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 2.5 ? 2.5 : normalized <= 5 ? 5 : 10;

  return step * magnitude;
};

/* -------------------------------------------------------------------------- */
/* Shared presentational pieces                                                */
/* -------------------------------------------------------------------------- */

const SectionCard = ({ children, sx }: { children: React.ReactNode; sx?: object }) => (
  <Paper
    elevation={0}
    sx={{
      p: { xs: 1.75, md: 2.5 },
      borderRadius: "22px",
      border: "1px solid var(--border)",
      backgroundColor: "var(--card)",
      minWidth: 0,
      boxShadow: "0 18px 40px rgba(31, 42, 43, 0.08)",
      ...sx,
    }}
  >
    {children}
  </Paper>
);

function GrowthBadge({ growth, suffix = "vs last month" }: { growth: AnalyticsGrowth; suffix?: string }) {
  const up = growth.percent > 0;
  const down = growth.percent < 0;

  const bgColor = up
    ? "var(--status-active-bg)"
    : down
      ? "var(--status-inactive-bg)"
      : "var(--status-closed-bg)";
  const fgColor = up
    ? "var(--status-active-fg)"
    : down
      ? "var(--status-inactive-fg)"
      : "var(--status-closed-fg)";

  return (
    <Stack direction="row" spacing={0.75} alignItems="center" sx={{ minWidth: 0 }}>
      <Box
        component="span"
        sx={{
          display: "inline-flex",
          alignItems: "center",
          gap: 0.3,
          px: 0.75,
          py: "1px",
          borderRadius: "999px",
          backgroundColor: bgColor,
          color: fgColor,
          fontSize: { xs: "0.6rem", md: "0.7rem" },
          fontWeight: 900,
          whiteSpace: "nowrap",
        }}
      >
        {up ? "▲" : down ? "▼" : "•"} {growth.percent > 0 ? "+" : ""}
        {growth.percent}%
      </Box>
      <Typography
        sx={{
          fontSize: { xs: "0.64rem", md: "0.74rem" },
          fontWeight: 700,
          color: "var(--muted-foreground)",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {growth.previous === 0 && growth.current === 0 ? "No activity yet" : suffix}
      </Typography>
    </Stack>
  );
}

type KpiCardProps = {
  label: string;
  value: string;
  helper: string;
  icon: React.ElementType;
  accent: string;
  growth: AnalyticsGrowth;
};

const KpiCard = ({ label, value, helper, icon: Icon, accent, growth }: KpiCardProps) => (
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
    <Stack
      direction="row"
      spacing={{ xs: 1, md: 1.25 }}
      alignItems="center"
      sx={{ position: "relative", zIndex: 1, minWidth: 0 }}
    >
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
        <Typography
          sx={{
            fontSize: { xs: "1.15rem", md: "1.55rem" },
            fontWeight: 900,
            mt: 0.25,
            lineHeight: 1.1,
            overflowWrap: "anywhere",
          }}
        >
          {value}
        </Typography>
      </Box>
    </Stack>
    <Typography
      sx={{
        position: "relative",
        zIndex: 1,
        fontSize: { xs: "0.66rem", md: "0.78rem" },
        color: "var(--muted-foreground)",
        fontWeight: 650,
      }}
    >
      {helper}
    </Typography>
    <Box sx={{ position: "relative", zIndex: 1 }}>
      <GrowthBadge growth={growth} />
    </Box>
  </Paper>
);

function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <Box sx={{ py: 5, px: 2, textAlign: "center", color: "var(--muted-foreground)" }}>
      <InsightsOutlinedIcon sx={{ fontSize: 34, opacity: 0.55 }} />
      <Typography sx={{ fontWeight: 850, mt: 0.5 }}>{title}</Typography>
      {hint ? (
        <Typography sx={{ fontSize: "0.8rem", fontWeight: 650, mt: 0.25, maxWidth: 420, mx: "auto" }}>
          {hint}
        </Typography>
      ) : null}
    </Box>
  );
}

/* -------------------------------------------------------------------------- */
/* Growth trend chart                                                          */
/* -------------------------------------------------------------------------- */

type TrendDatum = { label: string; value: number };

function TrendChart({
  points,
  color,
  formatValue,
  height = 230,
}: {
  points: TrendDatum[];
  color: string;
  formatValue: (value: number) => string;
  height?: number;
}) {
  const [measureRef, bounds] = useMeasure();
  const [activeIndex, setActiveIndex] = React.useState<number | null>(null);
  const gradientId = React.useId().replace(/[:]/g, "");

  const width = bounds.width;
  const compact = width > 0 && width < 480;
  const padTop = 26;
  const padRight = compact ? 18 : 30;
  const padBottom = 32;
  const padLeft = compact ? 42 : 58;

  const plotWidth = Math.max(width - padLeft - padRight, 0);
  const plotHeight = Math.max(height - padTop - padBottom, 0);

  const maxValue = niceMax(Math.max(...points.map((point) => point.value), 0));
  const stepX = points.length > 1 ? plotWidth / (points.length - 1) : 0;

  const coords = points.map((point, index) => ({
    x: padLeft + index * stepX,
    y: padTop + (1 - point.value / maxValue) * plotHeight,
  }));

  const linePath = coords.map((coord, index) => `${index === 0 ? "M" : "L"} ${coord.x} ${coord.y}`).join(" ");
  const areaPath =
    coords.length > 0
      ? `${linePath} L ${coords[coords.length - 1].x} ${padTop + plotHeight} L ${coords[0].x} ${padTop + plotHeight} Z`
      : "";

  const gridLines = [0, 0.25, 0.5, 0.75, 1];
  const labelInterval = Math.max(1, Math.ceil(points.length / (compact ? 4 : 7)));

  const handleMove = (event: React.MouseEvent<SVGSVGElement>) => {
    if (points.length === 0 || stepX === 0) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const offsetX = event.clientX - rect.left;
    const index = Math.round((offsetX - padLeft) / stepX);
    setActiveIndex(Math.min(Math.max(index, 0), points.length - 1));
  };

  const activePoint = activeIndex === null ? null : { coord: coords[activeIndex], datum: points[activeIndex] };

  return (
    <Box ref={measureRef} sx={{ position: "relative", width: "100%", height }}>
      {width > 0 ? (
        <svg
          width={width}
          height={height}
          role="img"
          aria-label="Platform growth trend"
          style={{ display: "block", overflow: "visible" }}
          onMouseMove={handleMove}
          onMouseLeave={() => setActiveIndex(null)}
        >
          <defs>
            <linearGradient id={`growth-area-${gradientId}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.36} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>

          {gridLines.map((ratio) => {
            const y = padTop + ratio * plotHeight;

            return (
              <g key={ratio}>
                <line
                  x1={padLeft}
                  y1={y}
                  x2={width - padRight}
                  y2={y}
                  stroke="var(--border)"
                  strokeWidth={1}
                  strokeDasharray={ratio === 1 ? "0" : "4 6"}
                  opacity={ratio === 1 ? 0.9 : 0.5}
                />
                <text
                  x={padLeft - 10}
                  y={y + 4}
                  textAnchor="end"
                  fontSize={compact ? 10 : 11}
                  fontWeight={700}
                  fill="var(--muted-foreground)"
                >
                  {formatValue(maxValue * (1 - ratio))}
                </text>
              </g>
            );
          })}

          {activePoint ? (
            <line
              x1={activePoint.coord.x}
              y1={padTop}
              x2={activePoint.coord.x}
              y2={padTop + plotHeight}
              stroke={color}
              strokeWidth={1.5}
              strokeDasharray="4 4"
              opacity={0.65}
            />
          ) : null}

          {areaPath ? <path d={areaPath} fill={`url(#growth-area-${gradientId})`} /> : null}

          {linePath ? (
            <path d={linePath} fill="none" stroke={color} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
          ) : null}

          {coords.map((coord, index) => {
            const isActive = index === activeIndex;

            return (
              <circle
                key={`${points[index].label}-${index}`}
                cx={coord.x}
                cy={coord.y}
                r={isActive ? 6 : 3.5}
                fill="var(--card)"
                stroke={color}
                strokeWidth={isActive ? 3 : 2}
              />
            );
          })}

          {points.map((point, index) =>
            index % labelInterval === 0 || index === points.length - 1 ? (
              <text
                key={`label-${point.label}-${index}`}
                x={coords[index].x}
                y={height - 8}
                textAnchor={index === points.length - 1 ? "end" : index === 0 ? "start" : "middle"}
                fontSize={compact ? 10 : 11}
                fontWeight={700}
                fill="var(--muted-foreground)"
              >
                {point.label}
              </text>
            ) : null,
          )}
        </svg>
      ) : null}

      {activePoint ? (
        <Box
          sx={{
            position: "absolute",
            top: 0,
            left: Math.min(Math.max(activePoint.coord.x - 70, 0), Math.max(width - 150, 0)),
            pointerEvents: "none",
            minWidth: 132,
            px: 1.25,
            py: 1,
            borderRadius: "14px",
            border: "1px solid var(--border)",
            backgroundColor: "var(--popover)",
            boxShadow: "0 16px 34px rgba(0,0,0,0.24)",
            zIndex: 2,
          }}
        >
          <Typography sx={{ fontSize: "0.72rem", fontWeight: 800, color: "var(--muted-foreground)" }}>
            {activePoint.datum.label}
          </Typography>
          <Typography sx={{ fontSize: "1rem", fontWeight: 900, color: "var(--foreground)" }}>
            {formatValue(activePoint.datum.value)}
          </Typography>
        </Box>
      ) : null}
    </Box>
  );
}

/* -------------------------------------------------------------------------- */
/* Requests-per-minute bars                                                    */
/* -------------------------------------------------------------------------- */

function RequestBars({ points, height = 150 }: { points: AnalyticsTrafficPoint[]; height?: number }) {
  const max = Math.max(...points.map((point) => point.requests), 1);

  if (points.length === 0) {
    return <EmptyState title="No request telemetry captured yet" hint="Traffic is recorded automatically once the API is used." />;
  }

  return (
    <Box sx={{ minWidth: 0 }}>
      <Box
        sx={{
          display: "flex",
          alignItems: "flex-end",
          gap: "2px",
          height,
          width: "100%",
          px: 0.25,
          pt: 1,
          borderBottom: "1px solid var(--border)",
        }}
      >
        {points.map((point) => {
          const ratio = point.requests / max;
          const isPeak = point.requests === max && point.requests > 0;
          const hasErrors = point.errors > 0;

          return (
            <Box
              key={point.key}
              title={`${formatTrafficTime(point)} · ${formatNumber(point.requests)} requests${hasErrors ? ` · ${formatNumber(point.errors)} errors` : ""}`}
              sx={{
                flex: "1 1 0",
                minWidth: "1px",
                height: `${Math.max(ratio * 100, point.requests > 0 ? 4 : 1.5)}%`,
                borderRadius: "3px 3px 1px 1px",
                backgroundColor: hasErrors
                  ? "var(--destructive)"
                  : isPeak
                    ? "var(--chart-2)"
                    : "color-mix(in srgb, var(--chart-2) 52%, transparent)",
                opacity: point.requests === 0 ? 0.28 : 1,
                transition: "height 320ms ease, background-color 220ms ease",
              }}
            />
          );
        })}
      </Box>
      <Stack direction="row" justifyContent="space-between" sx={{ mt: 0.6 }}>
        {[points[0], points[Math.floor(points.length / 2)], points[points.length - 1]].map((point, index) => (
          <Typography
            key={`${point.key}-${index}`}
            sx={{ fontSize: "0.68rem", fontWeight: 750, color: "var(--muted-foreground)" }}
          >
            {formatTrafficTime(point)}
          </Typography>
        ))}
      </Stack>
    </Box>
  );
}

/* -------------------------------------------------------------------------- */
/* Page                                                                        */
/* -------------------------------------------------------------------------- */

const metricMeta: Record<
  AnalyticsTrendValue,
  { label: string; color: string; format: (value: number) => string }
> = {
  businesses: { label: "Businesses", color: "var(--chart-2)", format: formatNumber },
  users: { label: "Users", color: "var(--chart-4)", format: formatNumber },
  orders: { label: "Orders", color: "var(--chart-3)", format: formatNumber },
  revenue: { label: "Revenue", color: "var(--chart-1)", format: (value) => formatCurrency(value) },
};

const methodColor = (method: string) => {
  switch (method.toUpperCase()) {
    case "GET":
      return "var(--chart-2)";
    case "POST":
      return "var(--chart-3)";
    case "PUT":
    case "PATCH":
      return "var(--chart-1)";
    case "DELETE":
      return "var(--destructive)";
    default:
      return "var(--chart-4)";
  }
};

const headCellSx = {
  fontSize: "0.66rem",
  fontWeight: 900,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "var(--muted-foreground)",
  whiteSpace: "nowrap",
  borderColor: "var(--border)",
} as const;

const bodyCellSx = {
  fontSize: "0.84rem",
  fontWeight: 700,
  borderColor: "var(--border)",
  whiteSpace: "nowrap",
} as const;

const toggleSx = {
  "& .MuiToggleButtonGroup-grouped": {
    border: "1px solid var(--border) !important",
    borderRadius: "10px !important",
    margin: "0 5px 0 0 !important",
    px: { xs: 1, md: 1.4 },
    py: 0.4,
    fontSize: { xs: "0.68rem", md: "0.76rem" },
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
} as const;

export default function AdminAnalyticsPage() {
  const [data, setData] = React.useState<PlatformAnalytics | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [failed, setFailed] = React.useState(false);
  const [metric, setMetric] = React.useState<AnalyticsTrendValue>("businesses");
  const [trendMode, setTrendMode] = React.useState<"monthly" | "cumulative">("monthly");
  const [trafficRange, setTrafficRange] = React.useState<"hour" | "day">("hour");
  const [businesses, setBusinesses] = React.useState<Restaurant[]>([]);
  const [selectedBusinessId, setSelectedBusinessId] = React.useState<string>("all");
  const { showSnackbar } = useAppSnackbar();

  const fetchAnalytics = React.useCallback(
    async (mode: "initial" | "manual" | "auto") => {
      if (mode === "manual") setRefreshing(true);

      try {
        const analytics = await getPlatformAnalytics();
        setData(analytics);
        setFailed(false);
      } catch (error) {
        console.error("Failed to fetch platform analytics:", error);
        setFailed(true);

        if (mode !== "auto") {
          showSnackbar(safeError(error, "Failed to load analytics."), "error");
        }
      } finally {
        if (mode === "initial") setLoading(false);
        if (mode === "manual") setRefreshing(false);
      }
    },
    [showSnackbar],
  );

  React.useEffect(() => {
    // Defer the initial request to a microtask so the fetch's state updates do
    // not cascade synchronously inside the effect.
    void Promise.resolve().then(() => fetchAnalytics("initial"));
    getRestaurants()
      .then((list) => setBusinesses(list))
      .catch(() => setBusinesses([]));
  }, [fetchAnalytics]);

  React.useEffect(() => {
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void fetchAnalytics("auto");
      }
    }, 30000);

    return () => window.clearInterval(interval);
  }, [fetchAnalytics]);

  const trendPoints = React.useMemo<TrendDatum[]>(() => {
    if (!data) return [];

    const monthly = data.overview.monthly;

    if (trendMode === "cumulative") {
      const totals: Record<AnalyticsTrendValue, number> = { businesses: 0, users: 0, orders: 0, revenue: 0 };

      return monthly.map((point) => {
        totals.businesses += point.businesses;
        totals.users += point.users;
        totals.orders += point.orders;
        totals.revenue += point.revenue;

        return { label: point.label, value: totals[metric] };
      });
    }

    return monthly.map((point) => ({ label: point.label, value: point[metric] }));
  }, [data, metric, trendMode]);

  const trafficPoints = React.useMemo<AnalyticsTrafficPoint[]>(() => {
    if (!data) return [];
    return trafficRange === "hour" ? data.usage.requestsPerMinute : data.usage.requestsPerHour;
  }, [data, trafficRange]);

  if (loading) {
    return (
      <Box sx={{ display: "grid", gap: 2, minWidth: 0 }}>
        <Skeleton variant="rounded" height={128} sx={{ borderRadius: "22px" }} />
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "repeat(2, 1fr)", md: "repeat(4, 1fr)" }, gap: 2 }}>
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} variant="rounded" height={142} sx={{ borderRadius: "18px" }} />
          ))}
        </Box>
        <Skeleton variant="rounded" height={320} sx={{ borderRadius: "22px" }} />
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1.6fr 1fr" }, gap: 2 }}>
          <Skeleton variant="rounded" height={300} sx={{ borderRadius: "22px" }} />
          <Skeleton variant="rounded" height={300} sx={{ borderRadius: "22px" }} />
        </Box>
      </Box>
    );
  }

  if (!data) {
    return (
      <SectionCard sx={{ textAlign: "center", py: 6 }}>
        <InsightsOutlinedIcon sx={{ fontSize: 42, color: "var(--muted-foreground)", opacity: 0.6 }} />
        <Typography sx={{ fontWeight: 900, fontSize: "1.1rem", mt: 1 }}>
          Platform analytics are unavailable right now
        </Typography>
        <Typography sx={{ color: "var(--muted-foreground)", fontWeight: 650, mt: 0.5 }}>
          {failed ? "The server could not build the report. Try again in a moment." : "No analytics data was returned."}
        </Typography>
        <Button
          onClick={() => void fetchAnalytics("manual")}
          disabled={refreshing}
          variant="contained"
          startIcon={<RefreshIcon />}
          sx={{ mt: 2.5, borderRadius: "12px" }}
        >
          {refreshing ? "Retrying..." : "Try again"}
        </Button>
      </SectionCard>
    );
  }

  const { totals, growth, daily, businessTypes, topBusinesses } = data.overview;
  const usage = data.usage;
  const footprint = data.data;

  const filteredBusiness = React.useMemo(() => {
    if (selectedBusinessId === "all") return null;
    return topBusinesses.find((b) => String(b.id) === selectedBusinessId) ?? null;
  }, [selectedBusinessId, topBusinesses]);

  const dailyRevenue = daily.reduce((sum, point) => sum + point.revenue, 0);
  const dailyOrders = daily.reduce((sum, point) => sum + point.orders, 0);
  const dailyPeak = daily.reduce<PlatformAnalytics["overview"]["daily"][number] | null>(
    (best, point) => (best === null || point.revenue > best.revenue ? point : best),
    null,
  );

  const businessMax = Math.max(...businessTypes.map((type) => type.count), 1);
  const tableSizeMax = Math.max(...footprint.tables.map((table) => table.sizeBytes), 1);
  const totalRows = footprint.tables.reduce((sum, table) => sum + table.rows, 0);

  const activeMeta = metricMeta[metric];
  const trafficPeak = Math.max(...trafficPoints.map((point) => point.requests), 0);
  const trafficCurrent = trafficPoints[trafficPoints.length - 1]?.requests ?? 0;

  return (
    <Box sx={{ display: "grid", gap: 2, minWidth: 0 }}>
      {/* Header ------------------------------------------------------------ */}
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
        <Stack
          direction={{ xs: "column", sm: "row" }}
          justifyContent="space-between"
          alignItems={{ xs: "flex-start", sm: "center" }}
          spacing={1.5}
        >
          <Box sx={{ minWidth: 0 }}>
            <Stack direction="row" spacing={0.75} alignItems="center" sx={{ flexWrap: "wrap", rowGap: 0.5 }}>
              <Typography
                sx={{
                  fontSize: "0.78rem",
                  fontWeight: 800,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  color: "var(--muted-foreground)",
                }}
              >
                Super admin · Platform insights
              </Typography>
              <Box
                component="span"
                sx={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 0.5,
                  px: 0.9,
                  py: "2px",
                  borderRadius: "999px",
                  backgroundColor: "var(--status-active-bg)",
                  color: "var(--status-active-fg)",
                  fontSize: "0.64rem",
                  fontWeight: 900,
                }}
              >
                <Box
                  component="span"
                  sx={{
                    width: 7,
                    height: 7,
                    borderRadius: "50%",
                    backgroundColor: "currentColor",
                    animation: "analytics-pulse 1.8s ease-in-out infinite",
                  }}
                />
                LIVE · 30s
              </Box>
            </Stack>
            <Typography sx={{ fontSize: { xs: "1.3rem", md: "2rem" }, fontWeight: 900, mt: 0.4, lineHeight: 1.1 }}>
              Platform growth &amp; usage
            </Typography>
            <Typography
              sx={{
                color: "var(--muted-foreground)",
                fontSize: { xs: "0.85rem", md: "0.95rem" },
                mt: 0.5,
                fontWeight: 650,
              }}
            >
              {formatNumber(totals.businesses)} businesses · {formatNumber(totals.orders)} orders ·{" "}
              {formatCurrency(totals.revenue)} lifetime revenue
            </Typography>
            <Typography sx={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--muted-foreground)", mt: 0.4 }}>
              Snapshot generated at {formatClock(data.generatedAt)} · auto-refreshes every 30 seconds
            </Typography>
          </Box>

          <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ xs: "stretch", sm: "center" }} sx={{ flexShrink: 0 }}>
            <FormControl size="small" sx={{ minWidth: { xs: "100%", sm: 220 } }}>
              <InputLabel id="analytics-business-filter">Business</InputLabel>
              <Select
                labelId="analytics-business-filter"
                value={selectedBusinessId}
                label="Business"
                onChange={(e) => setSelectedBusinessId(e.target.value)}
                sx={{ borderRadius: "12px" }}
              >
                <MenuItem value="all">All businesses</MenuItem>
                {businesses.map((b) => (
                  <MenuItem key={b.id} value={String(b.id)}>
                    {b.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Stack direction="row" spacing={1} alignItems="center">
              <IconButton
                aria-label="Refresh analytics"
                onClick={() => void fetchAnalytics("manual")}
                disabled={refreshing}
                sx={{
                  display: { xs: "inline-flex", sm: "none" },
                  width: 42,
                  height: 42,
                  borderRadius: "14px",
                  border: "1px solid var(--border)",
                  backgroundColor: "var(--card)",
                  color: "var(--primary)",
                }}
              >
                <RefreshIcon
                  sx={{
                    animation: refreshing ? "analytics-spin 900ms linear infinite" : "none",
                  }}
                />
              </IconButton>
              <Button
                variant="outlined"
                startIcon={
                  <RefreshIcon sx={{ animation: refreshing ? "analytics-spin 900ms linear infinite" : "none" }} />
                }
                onClick={() => void fetchAnalytics("manual")}
                disabled={refreshing}
                sx={{ display: { xs: "none", sm: "inline-flex" }, borderRadius: "14px" }}
              >
                {refreshing ? "Refreshing..." : "Refresh"}
              </Button>
            </Stack>
          </Stack>
        </Stack>
      </Paper>

      {filteredBusiness ? (
        <SectionCard>
          <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ xs: "flex-start", sm: "center" }} spacing={1}>
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ fontSize: { xs: "1.05rem", md: "1.2rem" }, fontWeight: 900 }}>{filteredBusiness.name} — business analytics</Typography>
              <Typography sx={{ color: "var(--muted-foreground)", fontWeight: 650, fontSize: "0.88rem" }}>
                {titleCase(filteredBusiness.businessType)} · {filteredBusiness.isActive ? "Active" : "Inactive"} · Focused view
              </Typography>
            </Box>
            <Button size="small" onClick={() => setSelectedBusinessId("all")} sx={{ borderRadius: "10px", fontWeight: 800 }}>
              View all businesses
            </Button>
          </Stack>
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "repeat(2, minmax(0, 1fr))", md: "repeat(4, minmax(0, 1fr))" }, gap: { xs: 1.5, md: 2 }, mt: 2 }}>
            <Paper elevation={0} sx={{ p: 1.5, borderRadius: "14px", border: "1px solid var(--border)" }}>
              <Typography sx={{ fontSize: "0.68rem", fontWeight: 850, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--muted-foreground)" }}>Orders</Typography>
              <Typography sx={{ fontSize: "1.25rem", fontWeight: 900 }}>{formatNumber(filteredBusiness.orders)}</Typography>
            </Paper>
            <Paper elevation={0} sx={{ p: 1.5, borderRadius: "14px", border: "1px solid var(--border)" }}>
              <Typography sx={{ fontSize: "0.68rem", fontWeight: 850, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--muted-foreground)" }}>Revenue</Typography>
              <Typography sx={{ fontSize: "1.25rem", fontWeight: 900 }}>{formatCurrency(filteredBusiness.revenue)}</Typography>
            </Paper>
            <Paper elevation={0} sx={{ p: 1.5, borderRadius: "14px", border: "1px solid var(--border)" }}>
              <Typography sx={{ fontSize: "0.68rem", fontWeight: 850, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--muted-foreground)" }}>Menu items</Typography>
              <Typography sx={{ fontSize: "1.25rem", fontWeight: 900 }}>{formatNumber(filteredBusiness.menuItems)}</Typography>
            </Paper>
            <Paper elevation={0} sx={{ p: 1.5, borderRadius: "14px", border: "1px solid var(--border)" }}>
              <Typography sx={{ fontSize: "0.68rem", fontWeight: 850, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--muted-foreground)" }}>Tables / Users</Typography>
              <Typography sx={{ fontSize: "1.25rem", fontWeight: 900 }}>{formatNumber(filteredBusiness.tables ?? 0)} / {formatNumber(filteredBusiness.users ?? 0)}</Typography>
            </Paper>
          </Box>
        </SectionCard>
      ) : (
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "repeat(2, minmax(0, 1fr))", md: "repeat(4, minmax(0, 1fr))" },
            gap: { xs: 1.5, md: 2 },
          }}
        >
          <KpiCard
            label="Businesses"
            value={formatNumber(totals.businesses)}
            helper={`${formatNumber(totals.activeBusinesses)} active · ${formatNumber(totals.inactiveBusinesses)} inactive`}
            icon={StorefrontOutlinedIcon}
            accent="var(--chart-2)"
            growth={growth.businesses}
          />
          <KpiCard
            label="Total users"
            value={formatNumber(totals.users)}
            helper={`${formatNumber(totals.customers)} customer${totals.customers === 1 ? "" : "s"} · ${formatNumber(totals.owners)} owner${totals.owners === 1 ? "" : "s"}`}
            icon={PeopleAltOutlinedIcon}
            accent="var(--chart-4)"
            growth={growth.users}
          />
          <KpiCard
            label="Orders"
            value={formatNumber(totals.orders)}
            helper="All-time, excluding cancelled"
            icon={ReceiptLongOutlinedIcon}
            accent="var(--chart-3)"
            growth={growth.orders}
          />
          <KpiCard
            label="Revenue"
            value={formatCurrency(totals.revenue)}
            helper="Lifetime non-cancelled revenue"
            icon={PaymentsOutlinedIcon}
            accent="var(--chart-1)"
            growth={growth.revenue}
          />
        </Box>
      )}

      {/* Quick footprint strip --------------------------------------------- */}
      <SectionCard sx={{ py: { xs: 1.5, md: 1.75 } }}>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "repeat(2, minmax(0, 1fr))", md: "repeat(4, minmax(0, 1fr))" },
            gap: { xs: 1.5, md: 2 },
          }}
        >
          {[
            { label: "Menu items", value: formatNumber(totals.menuItems) },
            { label: "Categories", value: formatNumber(totals.categories) },
            { label: "Tables", value: formatNumber(totals.tables) },
            { label: "Super admins", value: formatNumber(totals.superAdmins) },
          ].map((item) => (
            <Box key={item.label} sx={{ minWidth: 0 }}>
              <Typography
                sx={{
                  fontSize: "0.66rem",
                  fontWeight: 850,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: "var(--muted-foreground)",
                }}
              >
                {item.label}
              </Typography>
              <Typography sx={{ fontSize: { xs: "1.15rem", md: "1.35rem" }, fontWeight: 900, lineHeight: 1.2 }}>
                {item.value}
              </Typography>
            </Box>
          ))}
        </Box>
      </SectionCard>

      {/* Growth trend ------------------------------------------------------ */}
      <SectionCard>
        <Stack
          direction={{ xs: "column", md: "row" }}
          justifyContent="space-between"
          alignItems={{ xs: "flex-start", md: "center" }}
          spacing={1.5}
        >
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontSize: { xs: "1rem", md: "1.15rem" }, fontWeight: 900 }}>
              Growth trend
            </Typography>
            <Typography
              sx={{ fontSize: { xs: "0.76rem", md: "0.82rem" }, color: "var(--muted-foreground)", fontWeight: 650 }}
            >
              {trendMode === "monthly"
                ? `New ${activeMeta.label.toLowerCase()} per month · last 12 months`
                : `Cumulative ${activeMeta.label.toLowerCase()} within the last 12 months`}
            </Typography>
          </Box>
          <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", rowGap: 1 }}>
            <ToggleButtonGroup
              exclusive
              size="small"
              value={metric}
              onChange={(_event, value: AnalyticsTrendValue | null) => {
                if (value) setMetric(value);
              }}
              aria-label="Growth metric"
              sx={toggleSx}
            >
              <ToggleButton value="businesses">Businesses</ToggleButton>
              <ToggleButton value="users">Users</ToggleButton>
              <ToggleButton value="orders">Orders</ToggleButton>
              <ToggleButton value="revenue">Revenue</ToggleButton>
            </ToggleButtonGroup>
            <ToggleButtonGroup
              exclusive
              size="small"
              value={trendMode}
              onChange={(_event, value: "monthly" | "cumulative" | null) => {
                if (value) setTrendMode(value);
              }}
              aria-label="Trend mode"
              sx={toggleSx}
            >
              <ToggleButton value="monthly">Monthly</ToggleButton>
              <ToggleButton value="cumulative">Cumulative</ToggleButton>
            </ToggleButtonGroup>
          </Stack>
        </Stack>

        <Box sx={{ mt: 2 }}>
          {trendPoints.length > 0 && trendPoints.some((point) => point.value > 0) ? (
            <TrendChart points={trendPoints} color={activeMeta.color} formatValue={activeMeta.format} />
          ) : (
            <EmptyState
              title={`No ${activeMeta.label.toLowerCase()} growth recorded yet`}
              hint="The chart fills in automatically as new activity is created on the platform."
            />
          )}
        </Box>
      </SectionCard>

      {/* Revenue + business mix -------------------------------------------- */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "minmax(0, 1fr)", md: "minmax(0, 1.6fr) minmax(0, 1fr)" },
          gap: 2,
          minWidth: 0,
        }}
      >
        <SectionCard>
          <Stack
            direction={{ xs: "column", sm: "row" }}
            justifyContent="space-between"
            alignItems={{ xs: "flex-start", sm: "center" }}
            spacing={1}
          >
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ fontSize: { xs: "1rem", md: "1.15rem" }, fontWeight: 900 }}>
                Revenue · last 30 days
              </Typography>
              <Typography
                sx={{ fontSize: { xs: "0.76rem", md: "0.82rem" }, color: "var(--muted-foreground)", fontWeight: 650 }}
              >
                Daily order revenue across all businesses
              </Typography>
            </Box>
            <Box sx={{ textAlign: { xs: "left", sm: "right" }, flexShrink: 0 }}>
              <Typography sx={{ fontSize: { xs: "1.05rem", md: "1.3rem" }, fontWeight: 900 }}>
                {formatCurrency(dailyRevenue)}
              </Typography>
              <Typography sx={{ fontSize: "0.72rem", color: "var(--muted-foreground)", fontWeight: 700 }}>
                {formatNumber(dailyOrders)} orders
                {dailyPeak && dailyPeak.revenue > 0 ? ` · Peak ${dailyPeak.label}` : ""}
              </Typography>
            </Box>
          </Stack>

          <Box sx={{ mt: 2 }}>
            {dailyOrders > 0 ? (
              <SalesLineChart data={daily} height={250} />
            ) : (
              <EmptyState title="No orders in the last 30 days" hint="Revenue will appear here as businesses record orders." />
            )}
          </Box>
        </SectionCard>

        <SectionCard>
          <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ xs: "flex-start", sm: "center" }} spacing={1}>
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ fontSize: { xs: "1rem", md: "1.15rem" }, fontWeight: 900 }}>Per-business breakdown</Typography>
              <Typography sx={{ fontSize: { xs: "0.76rem", md: "0.82rem" }, color: "var(--muted-foreground)", fontWeight: 650 }}>
                Each business shown separately with its own usage, footprint &amp; activity
              </Typography>
            </Box>
            <Chip label={`${topBusinesses.length} businesses`} sx={{ fontWeight: 800, borderRadius: "999px" }} />
          </Stack>

          <Stack spacing={1.75} sx={{ mt: 2 }}>
            {topBusinesses.length > 0 ? (
              topBusinesses.map((business) => {
                const resourceScore = business.resourceScore ?? (business.menuItems * 2 + (business.tables ?? 0) * 1.5 + (business.categories ?? 0) + (business.users ?? 0) * 0.5);
                const maxScore = Math.max(...topBusinesses.map((b) => b.resourceScore ?? (b.menuItems * 2 + (b.tables ?? 0) * 1.5 + (b.categories ?? 0) + (b.users ?? 0) * 0.5)), 1);
                const share = Math.round((resourceScore / maxScore) * 100);

                return (
                  <Paper
                    key={business.id}
                    elevation={0}
                    sx={{
                      p: { xs: 1.5, md: 2 },
                      borderRadius: "18px",
                      border: "1px solid var(--border)",
                      backgroundColor: "var(--background)",
                      minWidth: 0,
                    }}
                  >
                    <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" alignItems={{ xs: "flex-start", md: "center" }} spacing={1.25}>
                      <Box sx={{ minWidth: 0 }}>
                        <Stack direction="row" spacing={0.75} alignItems="center" sx={{ flexWrap: "wrap" }}>
                          <Typography sx={{ fontSize: { xs: "1rem", md: "1.05rem" }, fontWeight: 900 }}>{business.name}</Typography>
                          <Chip
                            size="small"
                            label={business.isActive ? "Active" : "Inactive"}
                            sx={{
                              height: 20,
                              fontSize: "0.64rem",
                              fontWeight: 900,
                              borderRadius: "999px",
                              backgroundColor: business.isActive ? "var(--status-active-bg)" : "var(--status-inactive-bg)",
                              color: business.isActive ? "var(--status-active-fg)" : "var(--status-inactive-fg)",
                            }}
                          />
                          <Chip size="small" label={titleCase(business.businessType)} sx={{ height: 20, fontSize: "0.64rem", fontWeight: 800, borderRadius: "999px" }} />
                        </Stack>
                        <Typography sx={{ fontSize: "0.76rem", color: "var(--muted-foreground)", fontWeight: 650, mt: 0.3 }}>
                          Revenue {formatCurrency(business.revenue)} · {formatNumber(business.orders)} orders · Resource load {share}%
                        </Typography>
                      </Box>
                      <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ flexShrink: 0 }}>
                        {[{ label: "Menu", value: business.menuItems }, { label: "Tables", value: business.tables ?? 0 }, { label: "Categories", value: business.categories ?? 0 }, { label: "Users", value: business.users ?? 0 }].map((item) => (
                          <Box key={item.label} sx={{ px: 1.25, py: 0.6, borderRadius: "12px", border: "1px solid var(--border)", backgroundColor: "var(--card)", textAlign: "center", minWidth: 72 }}>
                            <Typography sx={{ fontSize: "0.64rem", fontWeight: 850, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{item.label}</Typography>
                            <Typography sx={{ fontWeight: 900 }}>{formatNumber(item.value)}</Typography>
                          </Box>
                        ))}
                      </Stack>
                    </Stack>

                    <Box sx={{ mt: 1.5, height: 8, borderRadius: "999px", backgroundColor: "color-mix(in srgb, var(--chart-1) 12%, transparent)", overflow: "hidden" }}>
                      <Box sx={{ height: "100%", width: `${Math.max(share, 8)}%`, borderRadius: "999px", background: "linear-gradient(90deg, var(--chart-1), var(--chart-3))" }} />
                    </Box>
                  </Paper>
                );
              })
            ) : (
              <EmptyState title="No businesses to show" hint="Businesses will appear here as they are created." />
            )}
          </Stack>

          {businessTypes.length > 0 ? (
            <>
              <Divider sx={{ my: 2, borderColor: "var(--border)" }} />
              <Typography sx={{ fontSize: "0.72rem", fontWeight: 850, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--muted-foreground)" }}>
                Businesses by type
              </Typography>
              <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ mt: 1 }}>
                {businessTypes.map((type, index) => {
                  const share = totals.businesses > 0 ? Math.round((type.count / totals.businesses) * 100) : 0;
                  return (
                    <Chip
                      key={`${type.label}-${index}`}
                      label={`${type.label} · ${formatNumber(type.count)} (${share}%)`}
                      sx={{ fontWeight: 800, borderRadius: "999px" }}
                    />
                  );
                })}
              </Stack>
            </>
          ) : null}
        </SectionCard>
      </Box>

      {/* API traffic ------------------------------------------------------- */}
      <SectionCard>
        <Stack
          direction={{ xs: "column", md: "row" }}
          justifyContent="space-between"
          alignItems={{ xs: "flex-start", md: "center" }}
          spacing={1.5}
        >
          <Box sx={{ minWidth: 0 }}>
            <Stack direction="row" spacing={1} alignItems="center">
              <SpeedOutlinedIcon sx={{ color: "var(--chart-2)" }} />
              <Typography sx={{ fontSize: { xs: "1rem", md: "1.15rem" }, fontWeight: 900 }}>API traffic</Typography>
            </Stack>
            <Typography
              sx={{ fontSize: { xs: "0.76rem", md: "0.82rem" }, color: "var(--muted-foreground)", fontWeight: 650 }}
            >
              {trafficRange === "hour" ? "Requests per minute · last 60 minutes" : "Requests per hour · last 24 hours"}
            </Typography>
          </Box>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ flexWrap: "wrap", rowGap: 1 }}>
            <Chip
              size="small"
              label={`Now · ${formatNumber(trafficCurrent)}/${trafficRange === "hour" ? "min" : "hr"}`}
              sx={{ fontWeight: 800, borderRadius: "9px", backgroundColor: "var(--status-active-bg)", color: "var(--status-active-fg)" }}
            />
            <Chip
              size="small"
              label={`Peak · ${formatNumber(trafficPeak)}${trafficRange === "hour" ? "/min" : "/hr"}`}
              sx={{ fontWeight: 800, borderRadius: "9px" }}
            />
            <ToggleButtonGroup
              exclusive
              size="small"
              value={trafficRange}
              onChange={(_event, value: "hour" | "day" | null) => {
                if (value) setTrafficRange(value);
              }}
              aria-label="Traffic range"
              sx={toggleSx}
            >
              <ToggleButton value="hour">1 hour</ToggleButton>
              <ToggleButton value="day">24 hours</ToggleButton>
            </ToggleButtonGroup>
          </Stack>
        </Stack>

        <Box sx={{ mt: 2 }}>
          <RequestBars points={trafficPoints} />
        </Box>

        <Divider sx={{ my: 2, borderColor: "var(--border)" }} />

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "repeat(2, minmax(0, 1fr))", md: "repeat(5, minmax(0, 1fr))" },
            gap: { xs: 1.5, md: 2 },
          }}
        >
          {[
            { label: "Requests · 24h", value: formatNumber(usage.last24h.requests) },
            { label: "Error rate", value: `${usage.last24h.errorRate}%` },
            { label: "Avg latency", value: `${formatNumber(usage.last24h.avgLatencyMs)} ms` },
            { label: "p95 latency", value: `${formatNumber(usage.last24h.p95LatencyMs)} ms` },
            { label: "Active API users", value: formatNumber(usage.last24h.uniqueUsers) },
          ].map((item) => (
            <Box key={item.label} sx={{ minWidth: 0 }}>
              <Typography
                sx={{
                  fontSize: "0.64rem",
                  fontWeight: 850,
                  letterSpacing: "0.07em",
                  textTransform: "uppercase",
                  color: "var(--muted-foreground)",
                }}
              >
                {item.label}
              </Typography>
              <Typography sx={{ fontSize: { xs: "1.02rem", md: "1.2rem" }, fontWeight: 900, lineHeight: 1.25 }}>
                {item.value}
              </Typography>
            </Box>
          ))}
        </Box>
      </SectionCard>

      {/* Endpoints + data footprint ---------------------------------------- */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "minmax(0, 1fr)", md: "minmax(0, 1.35fr) minmax(0, 1fr)" },
          gap: 2,
          minWidth: 0,
        }}
      >
        <SectionCard>
          <Typography sx={{ fontSize: { xs: "1rem", md: "1.15rem" }, fontWeight: 900 }}>Busiest endpoints</Typography>
          <Typography
            sx={{ fontSize: { xs: "0.76rem", md: "0.82rem" }, color: "var(--muted-foreground)", fontWeight: 650 }}
          >
            Top API routes over the last 24 hours
          </Typography>

          {usage.routes.length > 0 ? (
            <Box sx={{ overflowX: "auto", mt: 1.5 }}>
              <Table size="small" sx={{ minWidth: 460 }}>
                <TableHead>
                  <TableRow>
                    <TableCell sx={headCellSx}>Route</TableCell>
                    <TableCell sx={headCellSx} align="right">
                      Requests
                    </TableCell>
                    <TableCell sx={headCellSx} align="right">
                      Avg
                    </TableCell>
                    <TableCell sx={headCellSx} align="right">
                      Errors
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {usage.routes.map((route) => (
                    <TableRow key={`${route.method}-${route.path}`} hover>
                      <TableCell sx={bodyCellSx}>
                        <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0 }}>
                          <Box
                            component="span"
                            sx={{
                              px: 0.7,
                              py: "1px",
                              borderRadius: "6px",
                              fontSize: "0.62rem",
                              fontWeight: 900,
                              letterSpacing: "0.04em",
                              color: methodColor(route.method),
                              backgroundColor: `color-mix(in srgb, ${methodColor(route.method)} 14%, transparent)`,
                              border: `1px solid color-mix(in srgb, ${methodColor(route.method)} 32%, transparent)`,
                            }}
                          >
                            {route.method}
                          </Box>
                          <Box
                            component="span"
                            title={route.path}
                            sx={{
                              fontFamily: "var(--font-mono, ui-monospace, SFMono-Regular, Menlo, monospace)",
                              fontSize: "0.76rem",
                              fontWeight: 650,
                              maxWidth: { xs: 160, md: 260 },
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                              color: "var(--foreground)",
                            }}
                          >
                            {route.path}
                          </Box>
                        </Stack>
                      </TableCell>
                      <TableCell sx={{ ...bodyCellSx, textAlign: "right" }}>{formatNumber(route.requests)}</TableCell>
                      <TableCell sx={{ ...bodyCellSx, textAlign: "right", color: "var(--muted-foreground)" }}>
                        {formatNumber(route.avgMs)} ms
                      </TableCell>
                      <TableCell
                        sx={{
                          ...bodyCellSx,
                          textAlign: "right",
                          color: route.errors > 0 ? "var(--destructive)" : "var(--muted-foreground)",
                        }}
                      >
                        {formatNumber(route.errors)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          ) : (
            <EmptyState
              title="No endpoint traffic yet"
              hint="Requests are logged automatically as soon as clients call the API."
            />
          )}
        </SectionCard>

        <SectionCard>
          <Stack direction="row" spacing={1} alignItems="center">
            <StorageOutlinedIcon sx={{ color: "var(--chart-1)" }} />
            <Typography sx={{ fontSize: { xs: "1rem", md: "1.15rem" }, fontWeight: 900 }}>Data footprint</Typography>
          </Stack>
          <Typography
            sx={{ fontSize: { xs: "0.76rem", md: "0.82rem" }, color: "var(--muted-foreground)", fontWeight: 650 }}
          >
            Storage this platform currently consumes
          </Typography>

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
              gap: 1.5,
              mt: 1.75,
            }}
          >
            {[
              { label: "Database", value: formatBytes(footprint.database.sizeBytes), helper: footprint.database.name },
              { label: "File storage", value: formatBytes(footprint.storage.sizeBytes), helper: `${formatNumber(totalRows)} rows tracked` },
            ].map((item) => (
              <Box
                key={item.label}
                sx={{
                  p: 1.5,
                  borderRadius: "14px",
                  border: "1px solid var(--border)",
                  backgroundColor: "color-mix(in srgb, var(--chart-1) 6%, transparent)",
                  minWidth: 0,
                }}
              >
                <Typography
                  sx={{
                    fontSize: "0.64rem",
                    fontWeight: 850,
                    letterSpacing: "0.07em",
                    textTransform: "uppercase",
                    color: "var(--muted-foreground)",
                  }}
                >
                  {item.label}
                </Typography>
                <Typography sx={{ fontSize: { xs: "1rem", md: "1.2rem" }, fontWeight: 900, lineHeight: 1.25 }}>
                  {item.value}
                </Typography>
                <Typography
                  sx={{
                    fontSize: "0.7rem",
                    fontWeight: 700,
                    color: "var(--muted-foreground)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {item.helper}
                </Typography>
              </Box>
            ))}
          </Box>

          <Divider sx={{ my: 1.75, borderColor: "var(--border)" }} />

          <Stack spacing={1.25}>
            {footprint.tables.map((table) => (
              <Box key={table.name} sx={{ minWidth: 0 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
                  <Typography
                    sx={{
                      fontFamily: "var(--font-mono, ui-monospace, SFMono-Regular, Menlo, monospace)",
                      fontSize: "0.76rem",
                      fontWeight: 750,
                      minWidth: 0,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {table.name}
                  </Typography>
                  <Typography sx={{ fontSize: "0.74rem", fontWeight: 800, color: "var(--muted-foreground)", flexShrink: 0 }}>
                    {formatNumber(table.rows)} rows · {formatBytes(table.sizeBytes)}
                  </Typography>
                </Stack>
                <Box
                  sx={{
                    mt: 0.45,
                    height: 6,
                    borderRadius: "999px",
                    backgroundColor: "color-mix(in srgb, var(--chart-1) 10%, transparent)",
                    overflow: "hidden",
                  }}
                >
                  <Box
                    sx={{
                      height: "100%",
                      width: `${Math.max((table.sizeBytes / tableSizeMax) * 100, table.sizeBytes > 0 ? 4 : 0)}%`,
                      borderRadius: "999px",
                      backgroundColor: "var(--chart-1)",
                      opacity: 0.85,
                    }}
                  />
                </Box>
              </Box>
            ))}
          </Stack>
        </SectionCard>
      </Box>

      {/* Top businesses ---------------------------------------------------- */}
      <SectionCard>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          justifyContent="space-between"
          alignItems={{ xs: "flex-start", sm: "center" }}
          spacing={1}
        >
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontSize: { xs: "1rem", md: "1.15rem" }, fontWeight: 900 }}>Top businesses</Typography>
            <Typography
              sx={{ fontSize: { xs: "0.76rem", md: "0.82rem" }, color: "var(--muted-foreground)", fontWeight: 650 }}
            >
              Ranked by lifetime non-cancelled revenue
            </Typography>
          </Box>
          <Chip
            size="small"
            label={`${formatNumber(topBusinesses.length)} of ${formatNumber(totals.businesses)}`}
            sx={{ fontWeight: 800, borderRadius: "9px" }}
          />
        </Stack>

        {topBusinesses.length > 0 ? (
          <Box sx={{ overflowX: "auto", mt: 1.5 }}>
            <Table size="small" sx={{ minWidth: 620 }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={headCellSx}>Business</TableCell>
                  <TableCell sx={headCellSx}>Type</TableCell>
                  <TableCell sx={headCellSx}>Status</TableCell>
                  <TableCell sx={headCellSx} align="right">
                    Menu
                  </TableCell>
                  <TableCell sx={headCellSx} align="right">
                    Orders
                  </TableCell>
                  <TableCell sx={headCellSx} align="right">
                    Revenue
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {topBusinesses.map((business, index) => (
                  <TableRow key={business.id} hover>
                    <TableCell sx={bodyCellSx}>
                      <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0 }}>
                        <Box
                          component="span"
                          sx={{
                            width: 20,
                            height: 20,
                            borderRadius: "7px",
                            display: "grid",
                            placeItems: "center",
                            fontSize: "0.66rem",
                            fontWeight: 900,
                            flexShrink: 0,
                            color: "var(--muted-foreground)",
                            backgroundColor: "color-mix(in srgb, var(--chart-2) 12%, transparent)",
                          }}
                        >
                          {index + 1}
                        </Box>
                        <Box component="span" sx={{ fontWeight: 850, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis" }}>
                          {business.name}
                        </Box>
                      </Stack>
                    </TableCell>
                    <TableCell sx={{ ...bodyCellSx, color: "var(--muted-foreground)" }}>
                      {business.businessType === "—" ? "—" : titleCase(business.businessType)}
                    </TableCell>
                    <TableCell sx={bodyCellSx}>
                      <Box
                        component="span"
                        sx={{
                          px: 0.8,
                          py: "1px",
                          borderRadius: "999px",
                          fontSize: "0.66rem",
                          fontWeight: 900,
                          backgroundColor: business.isActive ? "var(--status-active-bg)" : "var(--status-inactive-bg)",
                          color: business.isActive ? "var(--status-active-fg)" : "var(--status-inactive-fg)",
                        }}
                      >
                        {business.isActive ? "Active" : "Inactive"}
                      </Box>
                    </TableCell>
                    <TableCell sx={{ ...bodyCellSx, textAlign: "right" }}>{formatNumber(business.menuItems)}</TableCell>
                    <TableCell sx={{ ...bodyCellSx, textAlign: "right" }}>{formatNumber(business.orders)}</TableCell>
                    <TableCell sx={{ ...bodyCellSx, textAlign: "right", fontWeight: 900 }}>
                      {formatCurrency(business.revenue)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        ) : (
          <EmptyState title="No business revenue recorded yet" hint="Top performers will appear after orders are placed." />
        )}
      </SectionCard>

      {/* Local keyframes --------------------------------------------------- */}
      <Box
        component="style"
        dangerouslySetInnerHTML={{
          __html: `
            @keyframes analytics-pulse {
              0%, 100% { opacity: 1; transform: scale(1); }
              50% { opacity: 0.35; transform: scale(0.82); }
            }
            @keyframes analytics-spin {
              from { transform: rotate(0deg); }
              to { transform: rotate(360deg); }
            }
          `,
        }}
      />
    </Box>
  );
}
