"use client";

import * as React from "react";
import {
  Box,
  Button,
  Chip,
  MenuItem,
  Paper,
  Select,
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

export default function OrdersPage() {
  const [orders, setOrders] = React.useState<KitchenOrder[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [updatingId, setUpdatingId] = React.useState<number | null>(null);
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

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1600, mx: "auto" }}>
      <Stack
        direction={{ xs: "column", md: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "flex-start", md: "center" }}
        spacing={2}
        mb={4}
      >
        <Box>
          <Typography variant="h4" fontWeight={700} gutterBottom>
            Kitchen Orders
          </Typography>
          <Typography sx={{ color: "var(--muted-foreground)" }}>
            Real-time table orders for kitchen and cashier
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={fetchOrders}
          disabled={loading}
          size="large"
        >
          Refresh
        </Button>
      </Stack>

      <Stack direction="row" spacing={1.25} useFlexGap flexWrap="wrap" mb={4}>
        <Chip label={`${orders.length} Total Orders`} sx={{ fontWeight: 700, color: "var(--foreground)", backgroundColor: "var(--card)" }} />
        <Chip label={`${orders.filter((o) => o.status === "pending").length} Pending`} color="warning" sx={{ fontWeight: 700 }} />
        <Chip label={`${orders.filter((o) => o.status === "confirmed").length} Confirmed`} color="info" sx={{ fontWeight: 700 }} />
        <Chip label={`${orders.filter((o) => o.status === "preparing").length} Preparing`} color="warning" sx={{ fontWeight: 700 }} />
        <Chip label={`${orders.filter((o) => o.status === "ready").length} Ready`} color="success" sx={{ fontWeight: 700 }} />
        <Chip label={`${orders.filter((o) => o.status === "served").length} Served`} color="default" sx={{ fontWeight: 700 }} />
        <Chip label={`${orders.filter((o) => o.status === "cancelled").length} Cancelled`} color="error" sx={{ fontWeight: 700 }} />
      </Stack>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", lg: "repeat(2, 1fr)" },
          gap: 3,
        }}
      >
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Paper key={i} sx={{ p: 3, borderRadius: 4, border: "1px solid", borderColor: "divider" }}>
              <Skeleton variant="text" width="45%" height={36} />
              <Skeleton variant="text" width="65%" height={22} sx={{ mt: 1 }} />
              <Skeleton variant="rounded" height={220} sx={{ mt: 3, borderRadius: 3 }} />
            </Paper>
          ))
        ) : orders.length === 0 ? (
          <Paper sx={{ p: 8, textAlign: "center", gridColumn: "1 / -1", borderRadius: 4 }}>
            <Typography variant="h6" sx={{ color: "var(--muted-foreground)" }}>No orders available</Typography>
          </Paper>
        ) : (
          orders.map((order) => {
            const locked = isLocked(order.status);
            const statusStyle = getStatusStyle(order.status);

            return (
              <Paper
                key={order.id}
                elevation={0}
                sx={{
                  p: { xs: 2, md: 3 },
                  borderRadius: 4,
                  border: "1px solid",
                  borderColor: locked ? "rgba(148, 163, 184, 0.24)" : "divider",
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
                <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ xs: "flex-start", sm: "center" }} spacing={1.5}>
                  <Box>
                    <Typography variant="h5" fontWeight={800}>
                      Table {order.tableNo}
                    </Typography>
                    <Typography variant="body2" sx={{ color: "var(--muted-foreground)" }}>
                      Order #{order.id} ? {new Date(order.createdAt).toLocaleString()}
                    </Typography>
                  </Box>

                  <Stack direction="row" spacing={1} alignItems="center" useFlexGap flexWrap="wrap">
                    <Chip label={statusLabel(order.status)} sx={{ fontWeight: 800, color: statusStyle.color, bgcolor: statusStyle.bgcolor }} />
                    <Chip label={`Rs. ${order.totalAmount}`} sx={{ fontWeight: 700, fontSize: "1.05rem", color: "var(--foreground)", backgroundColor: "var(--card)" }} />
                  </Stack>
                </Stack>

                {order.remarks ? (
                  <Typography sx={{ mt: 2, fontStyle: "italic", color: "#d97706" }}>
                    Note: {order.remarks}
                  </Typography>
                ) : null}

                <Divider sx={{ my: 2.5 }} />

                <Stack spacing={1.5} sx={{ mb: 3 }}>
                  {order.items.map((item) => (
                    <Stack key={item.id} direction="row" justifyContent="space-between" spacing={2}>
                      <Typography fontWeight={600}>
                        {item.quantity}x {item.name}
                      </Typography>
                      <Typography sx={{ color: "var(--muted-foreground)" }}>Rs. {item.price}</Typography>
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
                    <Select
                      fullWidth
                      size="medium"
                      value={order.status}
                      disabled={updatingId === order.id}
                      onChange={(e) => handleStatusChange(order.id, e.target.value as OrderStatus)}
                      sx={{
                        borderRadius: 3,
                        "& .MuiSelect-select": {
                          fontWeight: 600,
                          py: 1.5,
                          color: "var(--foreground)",
                        },
                      }}
                      MenuProps={{ disableScrollLock: true }}
                    >
                      {statusOptions.map((status) => (
                        <MenuItem key={status} value={status}>
                          <Box sx={{ color: getStatusStyle(status).color, bgcolor: getStatusStyle(status).bgcolor, fontWeight: 600, px: 2, py: 1, borderRadius: 2 }}>
                            {statusLabel(status)}
                          </Box>
                        </MenuItem>
                      ))}
                    </Select>
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
