"use client";

import * as React from "react";
import {
  Box,
  Button,
  Chip,
  IconButton,
  Paper,
  Skeleton,
  Stack,
  Typography,
  Divider,
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import { getAdminOrders, type KitchenOrder, type OrderStatus, updateAdminOrderStatus } from "@/lib/api";
import { useAppSnackbar } from "@/components/common/SnackBar";
import { safeError } from "@/lib/safeError";

const statusOptions: OrderStatus[] = ["pending", "confirmed", "preparing", "ready", "served", "cancelled"];
const lockedStatuses: OrderStatus[] = ["served", "cancelled"];
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
    default:
      return { color: "#374151", bgcolor: "#f3f4f6" };
  }
};

const statusLabel = (status: OrderStatus) =>
  status.charAt(0).toUpperCase() + status.slice(1);

const isLocked = (status: OrderStatus) => lockedStatuses.includes(status);

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
  const { showSnackbar } = useAppSnackbar();

  const fetchOrders = React.useCallback(async () => {
    try {
      const data = await getAdminOrders();
      setOrders(data);
    } catch (error) {
      console.error("Failed to fetch orders:", error);
      showSnackbar(safeError(error, "Failed to fetch orders."), "error");
    } finally {
      setLoading(false);
    }
  }, []);

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

  const visibleOrders = React.useMemo(() => {
    if (filter === "all") return orders;
    if (filter === "active") return orders.filter((order) => !isLocked(order.status));
    return orders.filter((order) => order.status === filter);
  }, [filter, orders]);

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

      <Stack
        direction="row"
        spacing={1}
        sx={{
          position: { xs: "sticky", md: "static" },
          top: { xs: 90, md: "auto" },
          zIndex: 2,
          mx: 0,
          px: { xs: 0.7, md: 0 },
          py: { xs: 0.7, md: 0 },
          pb: { xs: 1, md: 0 },
          mb: { xs: 1.5, md: 4 },
          borderRadius: { xs: "18px", md: 0 },
          overflowX: "auto",
          overflowY: "hidden",
          flexWrap: "nowrap",
          backgroundColor: { xs: "var(--background)", md: "transparent" },
          scrollbarWidth: "none",
          "&::-webkit-scrollbar": { display: "none" },
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
          <Paper sx={{ p: { xs: 3, md: 8 }, textAlign: "center", gridColumn: "1 / -1", borderRadius: { xs: "18px", md: 4 }, border: "1px solid var(--border)", backgroundColor: "var(--card)" }}>
            <Typography variant="h6" sx={{ color: "var(--muted-foreground)" }}>No orders in this view</Typography>
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
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="h5" fontWeight={900} sx={{ fontSize: { xs: "1.2rem", md: "1.5rem" }, lineHeight: 1.1 }}>
                      Table {order.tableNo}
                    </Typography>
                    <Typography variant="body2" sx={{ color: "var(--muted-foreground)", overflowWrap: "anywhere", fontSize: { xs: "0.78rem", md: "0.875rem" }, mt: 0.45 }}>
                      #{order.id} - {new Date(order.createdAt).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                    </Typography>
                  </Box>

                  <Stack spacing={0.75} alignItems="flex-end" sx={{ flexShrink: 0 }}>
                    <Chip label={statusLabel(order.status)} sx={{ height: 30, fontWeight: 900, color: statusStyle.color, bgcolor: statusStyle.bgcolor }} />
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
                      alignItems="flex-start"
                      spacing={2}
                      sx={{
                        p: 1.2,
                        minWidth: 0,
                        borderRadius: "14px",
                        backgroundColor: "var(--card)",
                      }}
                    >
                      <Typography fontWeight={700} sx={{ minWidth: 0, flex: 1, overflowWrap: "anywhere" }}>
                        {item.quantity}x {item.name}
                      </Typography>
                      <Typography sx={{ color: "var(--muted-foreground)", flexShrink: 0 }}>Rs. {item.price}</Typography>
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
                        border: `1px solid ${statusStyle.color}22`,
                        backgroundColor: statusStyle.bgcolor,
                      }}
                    >
                      <Typography sx={{ fontWeight: 800, color: statusStyle.color }}>
                        {statusLabel(order.status)}
                      </Typography>
                    </Paper>
                  ) : (
                    <Stack
                      direction={{ xs: "column", sm: "row" }}
                      spacing={1}
                      sx={{ width: "100%" }}
                    >
                      {nextAction ? (
                        <Button
                          fullWidth
                          variant="contained"
                          disabled={isUpdating}
                          onClick={() => handleStatusChange(order.id, nextAction.status)}
                          sx={{
                            minHeight: 44,
                            borderRadius: "14px",
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
                        variant="outlined"
                        color="error"
                        disabled={isUpdating}
                        onClick={() => handleStatusChange(order.id, "cancelled")}
                        sx={{
                          minHeight: 44,
                          borderRadius: "14px",
                          fontWeight: 850,
                          textTransform: "none",
                        }}
                      >
                        Cancel Order
                      </Button>
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
    </Box>
  );
}
