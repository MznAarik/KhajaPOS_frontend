"use client";

import * as React from "react";
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Paper,
  Skeleton,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  Divider,
} from "@mui/material";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import RefreshIcon from "@mui/icons-material/Refresh";
import {
  FOOD_FILTER_LABELS,
  FOOD_FILTER_ORDER,
  getAdminOrderDays,
  getAdminOrders,
  getOrderTypeLabel,
  matchesFoodFilter,
  updateAdminOrder,
  updateAdminOrderStatus,
  type FoodFilterKey,
  type KitchenOrder,
  type OrderStatus,
  type OrderType,
} from "@/lib/api";
import { useAppSnackbar } from "@/components/common/SnackBar";
import { safeError } from "@/lib/safeError";

const statusOptions: OrderStatus[] = ["pending", "confirmed", "preparing", "ready", "served", "cancelled", "closed"];
const lockedStatuses: OrderStatus[] = ["served", "cancelled", "closed"];
const MAX_ORDER_QUANTITY = 50;
type OrderFilter = "active" | "all" | OrderStatus;

const getStatusStyle = (status: OrderStatus) => {
  switch (status) {
    case "pending":
      return { color: "#d97706", bgcolor: "#fef3c7" };
    case "confirmed":
      return { color: "#2563eb", bgcolor: "#dbeafe" };
    case "preparing":
      return { color: "#6b21a8", bgcolor: "#f3e8ff" };
    case "ready":
      return { color: "#166534", bgcolor: "#dcfce7" };
    case "served":
      return { color: "#374151", bgcolor: "#f3f4f6" };
    case "cancelled":
      return { color: "#b91c1c", bgcolor: "#fee2e2" };
    case "closed":
      return { color: "#475569", bgcolor: "#e2e8f0" };
    default:
      return { color: "#374151", bgcolor: "#f3f4f6" };
  }
};

const statusLabel = (status: OrderStatus) =>
  status.charAt(0).toUpperCase() + status.slice(1);

const isLocked = (status: OrderStatus) => lockedStatuses.includes(status);

const timeAgo = (iso: string) => {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const minutes = Math.floor((Date.now() - then) / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
};

const formatDayLabel = (date: string, today: string) => {
  if (!date) return "";
  if (date === today) return "Today";

  if (today) {
    const prev = new Date(`${today}T00:00:00`);
    prev.setDate(prev.getDate() - 1);
    const yesterday = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, "0")}-${String(prev.getDate()).padStart(2, "0")}`;
    if (date === yesterday) return "Yesterday";
  }

  const parsed = new Date(`${date}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString([], { month: "short", day: "numeric" });
};

const StatusChip = ({ status, size = "md" }: { status: OrderStatus; size?: "sm" | "md" }) => {
  const { color, bgcolor } = getStatusStyle(status);
  const dot = size === "sm" ? 6 : 7;
  return (
    <Box
      component="span"
      sx={{
        display: "inline-flex",
        alignItems: "center",
        gap: size === "sm" ? "5px" : "6px",
        height: size === "sm" ? 24 : 28,
        px: size === "sm" ? 0.9 : 1.15,
        borderRadius: "999px",
        backgroundColor: bgcolor,
        color,
        fontSize: size === "sm" ? "0.72rem" : "0.76rem",
        fontWeight: 900,
        lineHeight: 1,
        whiteSpace: "nowrap",
      }}
    >
      <Box component="span" sx={{ width: dot, height: dot, borderRadius: "50%", flexShrink: 0, backgroundColor: color }} />
      {statusLabel(status)}
    </Box>
  );
};

const getNextOrderAction = (
  status: OrderStatus,
): { label: string; status: OrderStatus } | null => {
  switch (status) {
    case "pending":
      return { label: "Confirm Order", status: "confirmed" };
    case "confirmed":
      return { label: "Start Preparing", status: "preparing" };
    case "preparing":
      return { label: "Mark Ready", status: "ready" };
    case "ready":
      return { label: "Mark Served", status: "served" };
    default:
      return null;
  }
};

export default function OrdersPage() {
  const [orders, setOrders] = React.useState<KitchenOrder[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [updatingId, setUpdatingId] = React.useState<number | null>(null);
  const [filter, setFilter] = React.useState<OrderFilter>("active");
  const [selectedDate, setSelectedDate] = React.useState<string>("");
  const [foodFilter, setFoodFilter] = React.useState<FoodFilterKey>("all");
  const [availableDays, setAvailableDays] = React.useState<string[]>([]);
  const [editingOrder, setEditingOrder] = React.useState<KitchenOrder | null>(null);
  const [editRemarks, setEditRemarks] = React.useState("");
  const [editOrderType, setEditOrderType] = React.useState<OrderType>("dine_in");
  const [editItems, setEditItems] = React.useState<Array<{ id: number; name: string; quantity: number; price: string }>>([]);
  const [editSaving, setEditSaving] = React.useState(false);
  const { showSnackbar } = useAppSnackbar();

  const fetchOrders = React.useCallback(async () => {
    try {
      const data = await getAdminOrders(selectedDate || undefined);
      setOrders(data.orders);
      if (!selectedDate && data.date) {
        setSelectedDate(data.date);
      }
    } catch (error) {
      console.error("Failed to fetch orders:", error);
      showSnackbar(safeError(error, "Failed to fetch orders."), "error");
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  const fetchDays = React.useCallback(async () => {
    try {
      setAvailableDays(await getAdminOrderDays());
    } catch (error) {
      console.error("Failed to fetch order days:", error);
    }
  }, []);

  React.useEffect(() => {
    fetchDays();
    const daysInterval = setInterval(fetchDays, 60000);
    return () => clearInterval(daysInterval);
  }, [fetchDays]);

  React.useEffect(() => {
    setLoading(true);
    fetchOrders();

    const interval = setInterval(fetchOrders, 15000);
    return () => clearInterval(interval);
  }, [fetchOrders]);

  const handleStatusChange = async (orderId: number, nextStatus: OrderStatus) => {
    const order = orders.find((item) => item.id === orderId);
    if (!order || isLocked(order.status)) return;

    setUpdatingId(orderId);
    try {
      const updatedOrder = await updateAdminOrderStatus(orderId, nextStatus);
      setOrders((current) =>
        current.map((item) => (item.id === orderId ? updatedOrder : item))
      );
      showSnackbar(`Order #${orderId} has been moved to ${nextStatus}.`, "success");
    } catch (error) {
      console.error("Failed to update order status:", error);
      showSnackbar(safeError(error, "Failed to update order status."), "error");
    } finally {
      setUpdatingId(null);
    }
  };

  const openEditDialog = (order: KitchenOrder) => {
    if (isLocked(order.status)) return;

    setEditingOrder(order);
    setEditRemarks(order.remarks ?? "");
    setEditOrderType(order.orderType);
    setEditItems(order.items.map((item) => ({
      id: item.id,
      name: item.name,
      quantity: item.quantity,
      price: item.price,
    })));
  };

  const closeEditDialog = () => {
    if (editSaving) return;

    setEditingOrder(null);
    setEditRemarks("");
    setEditOrderType("dine_in");
    setEditItems([]);
  };

  const updateEditItemQuantity = (itemId: number, quantity: number) => {
    setEditItems((current) =>
      current.map((item) =>
        item.id === itemId
          ? { ...item, quantity: Math.max(1, Math.min(MAX_ORDER_QUANTITY, quantity || 1)) }
          : item,
      ),
    );
  };

  const handleOrderSave = async () => {
    if (!editingOrder) return;

    setEditSaving(true);
    try {
      const updatedOrder = await updateAdminOrder({
        id: editingOrder.id,
        remarks: editRemarks,
        orderType: editOrderType,
        items: editItems.map((item) => ({ id: item.id, quantity: item.quantity })),
      });

      setOrders((current) =>
        current.map((item) => (item.id === updatedOrder.id ? updatedOrder : item)),
      );
      showSnackbar(`Order #${updatedOrder.id} updated successfully.`, "success");
      setEditingOrder(null);
      setEditRemarks("");
      setEditOrderType("dine_in");
      setEditItems([]);
    } catch (error) {
      console.error("Failed to update order:", error);
      showSnackbar(safeError(error, "Failed to update order."), "error");
    } finally {
      setEditSaving(false);
    }
  };

  const foodFilteredOrders = React.useMemo(() => {
    if (foodFilter === "all") return orders;
    return orders.filter((order) =>
      order.items.some((item) => matchesFoodFilter(item.foodType, foodFilter)),
    );
  }, [foodFilter, orders]);

  const foodFilterCounts: Record<FoodFilterKey, number> = React.useMemo(() => {
    const counts: Record<FoodFilterKey, number> = {
      all: orders.length,
      veg: 0,
      "non-veg": 0,
      others: 0,
    };
    FOOD_FILTER_ORDER.forEach((key) => {
      if (key === "all") return;
      counts[key] = orders.filter((order) =>
        order.items.some((item) => matchesFoodFilter(item.foodType, key)),
      ).length;
    });
    return counts;
  }, [orders]);

  const visibleOrders = React.useMemo(() => {
    if (filter === "all") return foodFilteredOrders;
    if (filter === "active") return foodFilteredOrders.filter((order) => !isLocked(order.status));
    return foodFilteredOrders.filter((order) => order.status === filter);
  }, [filter, foodFilteredOrders]);

  const filterOptions: Array<{ value: OrderFilter; label: string; count: number }> = [
    { value: "active", label: "Active", count: orders.filter((order) => !isLocked(order.status)).length },
    { value: "all", label: "All", count: orders.length },
    ...statusOptions.map((status) => ({
      value: status,
      label: statusLabel(status),
      count: orders.filter((order) => order.status === status).length,
    })),
  ];

  const activeOrders = orders.filter((order) => !isLocked(order.status)).length;
  const readyOrders = orders.filter((order) => order.status === "ready").length;

  const today = availableDays[0] ?? selectedDate;
  const dayOptions = availableDays.length ? availableDays : selectedDate ? [selectedDate] : [];
  const viewingPastDay = Boolean(selectedDate && selectedDate !== today);

  return (
    <Box sx={{ width: "100%", minWidth: 0, overflow: "hidden", p: { xs: 0, md: 3 }, maxWidth: 1600, mx: "auto" }}>
      <Paper
        elevation={0}
        sx={{
          position: { xs: "fixed", md: "static" },
          top: { xs: 74, md: "auto" },
          left: { xs: 12, md: "auto" },
          right: { xs: 12, md: "auto" },
          zIndex: (theme) => theme.zIndex.appBar,
          mb: { xs: 0, md: 4 },
          p: { xs: 1.25, md: 0 },
          borderRadius: { xs: "18px", md: 0 },
          border: { xs: "1px solid var(--border)", md: "none" },
          borderTop: 0,
          backgroundColor: { xs: "color-mix(in srgb, var(--card) 88%, transparent)", md: "transparent" },
          backdropFilter: { xs: "blur(18px)", md: "none" },
          boxShadow: { xs: "0 12px 30px rgba(31, 42, 43, 0.12)", md: "none" },
        }}
      >
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          spacing={1.5}
        >
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="h4" fontWeight={900} sx={{ fontSize: { xs: "1.18rem", md: "2.125rem" }, lineHeight: 1.05 }}>
              Kitchen Orders
            </Typography>
            <Typography sx={{ color: "var(--muted-foreground)", fontSize: { xs: "0.76rem", md: "1rem" }, mt: 0.3, fontWeight: 650 }}>
              Live kitchen queue
            </Typography>
          </Box>
          <IconButton
            aria-label="refresh orders"
            onClick={fetchOrders}
            disabled={loading}
            sx={{
              display: { xs: "inline-flex", md: "none" },
              width: 40,
              height: 40,
              flexShrink: 0,
              borderRadius: "13px",
              border: "1px solid var(--border)",
              backgroundColor: "color-mix(in srgb, var(--background) 82%, black 18%)",
              color: "var(--foreground)",
            }}
          >
            <RefreshIcon />
          </IconButton>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={fetchOrders}
            disabled={loading}
            size="medium"
            sx={{ display: { xs: "none", md: "inline-flex" }, borderRadius: "14px" }}
          >
            Refresh
          </Button>
        </Stack>

        <Box
          sx={{
            display: { xs: "grid", md: "none" },
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 0.75,
            mt: 1.1,
          }}
        >
          {[
            { label: "Active", value: activeOrders },
            { label: "Ready", value: readyOrders },
            { label: "Total", value: orders.length },
          ].map((item) => (
            <Paper
              key={item.label}
              elevation={0}
              sx={{
                px: 0.75,
                py: 0.85,
                borderRadius: "13px",
                border: "1px solid var(--border)",
                backgroundColor: "color-mix(in srgb, var(--background) 82%, black 18%)",
                textAlign: "center",
                minWidth: 0,
              }}
            >
              <Typography sx={{ fontWeight: 900, fontSize: "0.98rem", lineHeight: 1, color: "var(--foreground)" }}>
                {item.value}
              </Typography>
              <Typography sx={{ color: "var(--muted-foreground)", fontSize: "0.66rem", fontWeight: 850, mt: 0.3 }}>
                {item.label}
              </Typography>
            </Paper>
          ))}
        </Box>
      </Paper>

      <Box sx={{ display: { xs: "block", md: "none" }, height: 132 }} />

      <Box
        sx={{
          position: { xs: "sticky", md: "static" },
          top: { xs: 90, md: "auto" },
          zIndex: 2,
          px: { xs: 0.7, md: 0 },
          py: { xs: 0.7, md: 0 },
          borderRadius: { xs: "18px", md: 0 },
          backgroundColor: { xs: "var(--background)", md: "transparent" },
          mb: { xs: 1.5, md: 4 },
        }}
      >
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
            gap: { xs: 1, md: 2 },
            alignItems: "stretch",
            minWidth: 0,
            mb: { xs: 1, md: 1.25 },
          }}
        >
          <Box sx={{ minWidth: 0 }}>
            <Typography
              sx={{
                fontWeight: 850,
                color: "var(--muted-foreground)",
                fontSize: { xs: "0.72rem", md: "0.8rem" },
                mb: 0.75,
              }}
            >
              Kitchen day
            </Typography>
            <Stack
              direction="row"
              spacing={1}
              alignItems="center"
              sx={{
                overflowX: "auto",
                overflowY: "hidden",
                flexWrap: "nowrap",
                scrollbarWidth: "none",
                "&::-webkit-scrollbar": { display: "none" },
                pb: { xs: 0.75, md: 1 },
                minWidth: 0,
              }}
            >
              {dayOptions.map((day) => {
                const selected = day === selectedDate;
                return (
                  <Chip
                    key={day}
                    label={formatDayLabel(day, today)}
                    onClick={() => setSelectedDate(day)}
                    sx={{
                      flexShrink: 0,
                      height: { xs: 32, md: 34 },
                      borderRadius: "999px",
                      fontWeight: 850,
                      fontSize: { xs: "0.74rem", md: "0.82rem" },
                      color: selected ? "var(--primary-foreground)" : "var(--foreground)",
                      backgroundColor: selected ? "var(--primary)" : "var(--card)",
                      border: "1px solid var(--border)",
                    }}
                  />
                );
              })}
            </Stack>
          </Box>

          <Box
            sx={{
              minWidth: 0,
              borderLeft: { xs: "none", sm: "1px dashed var(--border)" },
              pl: { xs: 0, sm: 2 },
            }}
          >
            <Typography
              sx={{
                fontWeight: 850,
                color: "var(--muted-foreground)",
                fontSize: { xs: "0.72rem", md: "0.8rem" },
                mb: 0.75,
              }}
            >
              Diet
            </Typography>
            <Stack
              direction="row"
              alignItems="center"
              sx={{
                overflowX: "auto",
                overflowY: "hidden",
                flexWrap: "nowrap",
                scrollbarWidth: "none",
                "&::-webkit-scrollbar": { display: "none" },
                pb: { xs: 0.75, md: 1 },
                minWidth: 0,
              }}
            >
              <ToggleButtonGroup
                exclusive
                size="small"
                aria-label="Filter orders by food type"
                value={foodFilter}
                onChange={(_event, next: FoodFilterKey | null) => {
                  if (next) setFoodFilter(next);
                }}
                sx={{
                  flexShrink: 0,
                  "& .MuiToggleButtonGroup-grouped": {
                    border: "1px solid var(--border) !important",
                    borderRadius: "9px !important",
                    margin: "0 6px 0 0 !important",
                    px: { xs: 1, md: 1.35 },
                    py: 0.4,
                    fontSize: { xs: "0.74rem", md: "0.78rem" },
                    fontWeight: 900,
                    textTransform: "none",
                    whiteSpace: "nowrap",
                    color: "var(--muted-foreground)",
                    backgroundColor: "var(--card)",
                    transition: "background-color 140ms ease, color 140ms ease",
                    "&:hover": {
                      color: "var(--foreground)",
                      backgroundColor: "color-mix(in srgb, var(--primary) 10%, var(--card))",
                    },
                    "&.Mui-selected": {
                      backgroundColor: "var(--primary) !important",
                      color: "var(--primary-foreground) !important",
                      borderColor: "var(--primary) !important",
                    },
                    "&:last-of-type": { marginRight: "0 !important" },
                  },
                }}
              >
                {FOOD_FILTER_ORDER.map((key) => (
                  <ToggleButton key={key} value={key} aria-pressed={foodFilter === key}>
                    {FOOD_FILTER_LABELS[key]}
                    <Box
                      component="span"
                      sx={{ ml: 0.35, fontWeight: 800, opacity: foodFilter === key ? 0.85 : 0.65 }}
                    >
                      {foodFilterCounts[key]}
                    </Box>
                  </ToggleButton>
                ))}
              </ToggleButtonGroup>
            </Stack>
          </Box>
        </Box>

        <Stack
          direction="row"
          spacing={1}
          sx={{
            overflowX: "auto",
            overflowY: "hidden",
            flexWrap: "nowrap",
            scrollbarWidth: "none",
            "&::-webkit-scrollbar": { display: "none" },
            width: "100%",
            mt: { xs: 0.5, md: 0.75 },
            pb: { xs: 0.75, md: 1 },
          }}
        >
          {filterOptions.map((option) => {
            const selected = filter === option.value;
            return (
              <Chip
                key={option.value}
                label={`${option.label} ${option.count}`}
                onClick={() => setFilter(option.value)}
                sx={{
                  flexShrink: 0,
                  height: { xs: 36, md: 38 },
                  borderRadius: "999px",
                  px: { xs: 0.35, md: 0.5 },
                  fontWeight: 800,
                  fontSize: { xs: "0.78rem", md: "0.875rem" },
                  color: selected ? "var(--primary-foreground)" : "var(--foreground)",
                  backgroundColor: selected ? "var(--primary)" : "var(--card)",
                  border: "1px solid var(--border)",
                }}
              />
            );
          })}
        </Stack>
      </Box>

      {viewingPastDay ? (
        <Paper
          elevation={0}
          sx={{
            mb: { xs: 1.5, md: 2 },
            px: 2,
            py: 1.25,
            borderRadius: "14px",
            border: "1px solid var(--border)",
            backgroundColor: "var(--card)",
          }}
        >
          <Typography sx={{ fontSize: { xs: "0.78rem", md: "0.85rem" }, color: "var(--muted-foreground)" }}>
            Viewing <strong>{formatDayLabel(selectedDate, today)}</strong> ({selectedDate}). Orders not finished that
            day are marked <strong>Closed</strong>.
          </Typography>
        </Paper>
      ) : null}

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", lg: "repeat(2, 1fr)" },
          gap: { xs: 1.5, md: 3 },
          minWidth: 0,
        }}
      >
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Paper key={i} sx={{ p: { xs: 2, md: 3 }, borderRadius: { xs: "18px", md: 4 }, border: "1px solid", borderColor: "divider", minWidth: 0 }}>
              <Skeleton variant="text" width="45%" height={30} />
              <Skeleton variant="text" width="65%" height={20} sx={{ mt: 0.5 }} />
              <Skeleton variant="rounded" height={150} sx={{ mt: 2, borderRadius: 3 }} />
            </Paper>
          ))
        ) : visibleOrders.length === 0 ? (
          <Paper sx={{ p: { xs: 4, md: 8 }, textAlign: "center", gridColumn: "1 / -1", borderRadius: { xs: "18px", md: 4 }, border: "1px solid var(--border)", backgroundColor: "var(--card)" }}>
            <Stack spacing={1} alignItems="center">
              <Typography sx={{ fontSize: "2rem", lineHeight: 1 }}>🍳</Typography>
              <Typography variant="h6" sx={{ fontWeight: 800 }}>No orders in this view</Typography>
              <Typography sx={{ color: "var(--muted-foreground)", maxWidth: 360 }}>
                New orders will appear here automatically.
              </Typography>
              {foodFilter !== "all" ? (
                <Button
                  variant="outlined"
                  onClick={() => setFoodFilter("all")}
                  sx={{ borderRadius: "12px", fontWeight: 800, mt: 0.5 }}
                >
                  Show all diets
                </Button>
              ) : null}
            </Stack>
          </Paper>
        ) : (
          visibleOrders.map((order) => {
            const locked = isLocked(order.status);
            const statusStyle = getStatusStyle(order.status);
            const nextAction = getNextOrderAction(order.status);
            const isUpdating = updatingId === order.id;

            return (
              <Paper
                key={order.id}
                elevation={0}
                sx={{
                  p: { xs: 2, md: 3 },
                  width: "100%",
                  minWidth: 0,
                  overflow: "hidden",
                  borderRadius: { xs: "22px", md: 4 },
                  border: "1px solid",
                  borderColor: locked ? "rgba(148, 163, 184, 0.24)" : "divider",
                  borderLeft: `5px solid ${statusStyle.color}`,
                  backgroundColor: "var(--background)",
                  transition: locked ? "none" : "all 0.25s ease",
                  opacity: locked ? 0.82 : 1,
                  "&:hover": locked
                    ? {
                      borderColor: "rgba(148, 163, 184, 0.24)",
                      transform: "none",
                      boxShadow: "none",
                    }
                    : {
                      borderColor: "primary.main",
                      transform: "translateY(-4px)",
                      boxShadow: 3,
                    },
                }}
              >
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1.25}>
                  <Stack direction="row" spacing={1.25} alignItems="center" sx={{ minWidth: 0 }}>
                    <Box
                      sx={{
                        flexShrink: 0,
                        minWidth: 66,
                        px: 1.1,
                        py: 0.7,
                        borderRadius: "16px",
                        textAlign: "center",
                        backgroundColor: `color-mix(in srgb, ${statusStyle.color} 14%, transparent)`,
                        border: `1px solid color-mix(in srgb, ${statusStyle.color} 40%, transparent)`,
                      }}
                    >
                      <Typography sx={{ fontSize: "0.56rem", fontWeight: 900, letterSpacing: "0.12em", color: statusStyle.color, lineHeight: 1 }}>
                        ORDER
                      </Typography>
                      <Typography sx={{ fontWeight: 900, fontSize: { xs: "1.25rem", md: "1.45rem" }, color: statusStyle.color, lineHeight: 1.15 }}>
                        #{order.id}
                      </Typography>
                    </Box>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="h5" fontWeight={900} sx={{ fontSize: { xs: "1.2rem", md: "1.5rem" }, lineHeight: 1.1 }}>
                        Table {order.tableNo}
                      </Typography>
                      <Typography variant="body2" sx={{ color: "var(--muted-foreground)", overflowWrap: "anywhere", fontSize: { xs: "0.78rem", md: "0.875rem" }, mt: 0.35 }}>
                        <Box component="span" sx={{ fontWeight: 800, color: "var(--foreground)" }}>
                          {timeAgo(order.createdAt)}
                        </Box>
                        {" · "}
                        {new Date(order.createdAt).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                      </Typography>
                    </Box>
                  </Stack>

                  <Stack spacing={0.75} alignItems="flex-end" sx={{ flexShrink: 0 }}>
                    <StatusChip status={order.status} />
                    <Chip
                      label={getOrderTypeLabel(order.orderType)}
                      variant="outlined"
                      size="small"
                      sx={{ fontWeight: 900, height: 26 }}
                    />
                    <Typography sx={{ fontWeight: 900, fontSize: { xs: "1rem", md: "1.1rem" }, whiteSpace: "nowrap" }}>
                      Rs. {order.totalAmount}
                    </Typography>
                  </Stack>
                </Stack>

                {order.remarks ? (
                  <Typography sx={{ mt: 1.5, p: 1.25, borderRadius: "14px", backgroundColor: "rgba(251, 191, 36, 0.14)", fontWeight: 700, color: "#d97706", overflowWrap: "anywhere", fontSize: "0.88rem" }}>
                    Note: {order.remarks}
                  </Typography>
                ) : null}

                <Divider sx={{ my: { xs: 1.75, md: 2.5 } }} />

                <Stack spacing={0.75} sx={{ mb: { xs: 2, md: 3 } }}>
                  {order.items.map((item) => (
                    <Stack
                      key={item.id}
                      direction="row"
                      justifyContent="space-between"
                      alignItems="center"
                      spacing={1.5}
                      sx={{
                        p: 1.1,
                        minWidth: 0,
                        borderRadius: "12px",
                        backgroundColor: "var(--card)",
                      }}
                    >
                      <Stack direction="row" spacing={1.1} alignItems="center" sx={{ minWidth: 0, flex: 1 }}>
                        <Box
                          sx={{
                            flexShrink: 0,
                            minWidth: 30,
                            height: 30,
                            px: 0.75,
                            borderRadius: "9px",
                            display: "grid",
                            placeItems: "center",
                            backgroundColor: "color-mix(in srgb, var(--primary) 14%, transparent)",
                            color: "var(--primary)",
                            fontWeight: 900,
                            fontSize: "0.85rem",
                          }}
                        >
                          {item.quantity}×
                        </Box>
                        <Typography fontWeight={700} sx={{ minWidth: 0, overflowWrap: "anywhere", fontSize: "0.9rem" }}>
                          {item.name}
                        </Typography>
                      </Stack>
                      <Typography sx={{ color: "var(--muted-foreground)", flexShrink: 0, fontWeight: 700, fontSize: "0.85rem" }}>
                        Rs. {(Number.parseFloat(item.price) * item.quantity).toFixed(2)}
                      </Typography>
                    </Stack>
                  ))}
                </Stack>

                <Stack spacing={1}>
                  <Typography sx={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--muted-foreground)" }}>
                    Update Status
                  </Typography>
                  {locked ? (
                    <Paper
                      elevation={0}
                      sx={{
                        px: 2,
                        py: 1.5,
                        borderRadius: 3,
                        border: "1px solid var(--border)",
                        backgroundColor: "var(--card)",
                      }}
                    >
                      <StatusChip status={order.status} />
                    </Paper>
                  ) : (
                    <Stack
                      direction="row"
                      spacing={1}
                      sx={{ width: "100%" }}
                    >
                      {nextAction ? (
                        <Button
                          fullWidth
                          size="small"
                          variant="contained"
                          disabled={isUpdating}
                          onClick={() => handleStatusChange(order.id, nextAction.status)}
                          sx={{
                            minHeight: { xs: 38, sm: 44 },
                            px: { xs: 1, sm: 2 },
                            borderRadius: { xs: "12px", sm: "14px" },
                            fontSize: { xs: "0.76rem", sm: "0.875rem" },
                            fontWeight: 850,
                            textTransform: "none",
                            backgroundColor: order.status === "ready" ? "#166534" : "var(--primary)",
                            color: order.status === "ready" ? "#ffffff" : "var(--primary-foreground)",
                          }}
                        >
                          {isUpdating ? "Updating..." : nextAction.label}
                        </Button>
                      ) : null}
                      <Button
                        fullWidth
                        size="small"
                        variant="outlined"
                        color="error"
                        disabled={isUpdating}
                        onClick={() => handleStatusChange(order.id, "cancelled")}
                        sx={{
                          minHeight: { xs: 38, sm: 44 },
                          px: { xs: 1, sm: 2 },
                          borderRadius: { xs: "12px", sm: "14px" },
                          fontSize: { xs: "0.76rem", sm: "0.875rem" },
                          fontWeight: 850,
                          textTransform: "none",
                        }}
                      >
                        Cancel
                      </Button>
                      <IconButton
                        aria-label={`edit order ${order.id}`}
                        disabled={isUpdating}
                        onClick={() => openEditDialog(order)}
                        sx={{
                          width: { xs: 38, sm: 44 },
                          height: { xs: 38, sm: 44 },
                          flexShrink: 0,
                          borderRadius: { xs: "12px", sm: "14px" },
                          border: "1px solid var(--border)",
                          color: "var(--primary)",
                          backgroundColor: "var(--card)",
                        }}
                      >
                        <EditOutlinedIcon fontSize="small" />
                      </IconButton>
                    </Stack>
                  )}
                  {locked ? (
                    <Typography sx={{ fontSize: "0.82rem", color: "var(--muted-foreground)" }}>
                      This order is locked because it has already been {order.status}.
                    </Typography>
                  ) : null}
                </Stack>
              </Paper>
            );
          })
        )}
      </Box>

      <Dialog open={Boolean(editingOrder)} onClose={closeEditDialog} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: 900 }}>
          Edit Order {editingOrder ? `#${editingOrder.id}` : ""}
          <Typography sx={{ mt: 0.5, color: "var(--muted-foreground)", fontSize: "0.86rem", fontWeight: 600 }}>
            Quantity is limited to {MAX_ORDER_QUANTITY} per item.
          </Typography>
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2.25} sx={{ pt: 1 }}>
            {editItems.map((item) => (
              <Paper
                key={item.id}
                elevation={0}
                sx={{
                  p: 1.5,
                  borderRadius: "16px",
                  border: "1px solid var(--border)",
                  backgroundColor: "var(--background)",
                }}
              >
                <Stack direction="row" spacing={1.5} alignItems="center" justifyContent="space-between">
                  <Box sx={{ minWidth: 0 }}>
                    <Typography sx={{ fontWeight: 850, overflowWrap: "anywhere" }}>
                      {item.name}
                    </Typography>
                    <Typography sx={{ color: "var(--muted-foreground)", fontSize: "0.86rem" }}>
                      Rs. {item.price} each
                    </Typography>
                  </Box>
                  <TextField
                    label="Qty"
                    type="number"
                    value={item.quantity}
                    onChange={(event) => updateEditItemQuantity(item.id, Number(event.target.value))}
                    inputProps={{ min: 1, max: MAX_ORDER_QUANTITY }}
                    helperText={`Max ${MAX_ORDER_QUANTITY}`}
                    sx={{ width: { xs: 86, sm: 96 } }}
                  />
                </Stack>
              </Paper>
            ))}

            <Box>
              <Typography sx={{ fontWeight: 800, mb: 1 }}>Order type</Typography>
              <ToggleButtonGroup
                exclusive
                fullWidth
                size="small"
                value={editOrderType}
                onChange={(_event, next: OrderType | null) => {
                  if (next) setEditOrderType(next);
                }}
                sx={{ borderRadius: "12px" }}
              >
                <ToggleButton value="dine_in" sx={{ fontWeight: 800, textTransform: "none" }}>
                  Dine Here
                </ToggleButton>
                <ToggleButton value="takeaway" sx={{ fontWeight: 800, textTransform: "none" }}>
                  Takeaway
                </ToggleButton>
              </ToggleButtonGroup>
            </Box>

            <TextField
              label="Remarks"
              value={editRemarks}
              onChange={(event) => setEditRemarks(event.target.value)}
              multiline
              minRows={3}
              fullWidth
              inputProps={{ maxLength: 500 }}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={closeEditDialog} disabled={editSaving} sx={{ borderRadius: "12px" }}>
            Cancel
          </Button>
          <Button variant="contained" onClick={handleOrderSave} disabled={editSaving} sx={{ borderRadius: "12px" }}>
            {editSaving ? "Saving..." : "Save Changes"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
