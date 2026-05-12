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

const statusOptions: OrderStatus[] = ["pending", "preparing", "ready", "served", "cancelled"];

const getStatusStyle = (status: OrderStatus) => {
  switch (status) {
    case "pending":
      return { color: "#d97706", bgcolor: "#fef3c7" };     // Orange
    case "preparing":
      return { color: "#6b21a8", bgcolor: "#f3e8ff" };     // Purple
    case "ready":
      return { color: "#166534", bgcolor: "#dcfce7" };     // Green
    case "served":
      return { color: "#374151", bgcolor: "#f3f4f6" };     // Gray
    case "cancelled":
      return { color: "#b91c1c", bgcolor: "#fee2e2" };     // Red
    default:
      return { color: "#374151", bgcolor: "#f3f4f6" };
  }
};
const statusLabel = (status: OrderStatus) =>
  status.charAt(0).toUpperCase() + status.slice(1);

export default function OrdersPage() {
  const [orders, setOrders] = React.useState<KitchenOrder[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [updatingId, setUpdatingId] = React.useState<number | null>(null);

  const fetchOrders = React.useCallback(async () => {
    try {
      const data = await getAdminOrders();
      setOrders(data);
    } catch (error) {
      console.error("Failed to fetch orders:", error);
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

  React.useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleStatusChange = async (orderId: number, nextStatus: OrderStatus) => {
    setUpdatingId(orderId);
    try {
      const updatedOrder = await updateAdminOrderStatus(orderId, nextStatus);
      setOrders((current) =>
        current.map((order) => (order.id === orderId ? updatedOrder : order))
      );
    } catch (error) {
      console.error("Failed to update order status:", error);
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1600, mx: "auto" }}>
      {/* Header */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={4}>
        <Box>
          <Typography variant="h4" fontWeight={700} gutterBottom>
            Kitchen Orders
          </Typography>
          <Typography color="text.secondary">
            Real-time table orders for kitchen & cashier
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

      {/* Stats */}
      <Stack direction="row" spacing={2} mb={4}>
        <Chip label={`${orders.length} Total Orders`} sx={{ fontWeight: 700, px: 3, py: 1.5 }} />
        <Chip
          label={`${orders.filter((o) => o.status === "pending").length} Pending`}
          color="warning"
          sx={{ fontWeight: 700, px: 3, py: 1.5 }}
        />
      </Stack>

      {/* Orders Grid - 2 Columns on Desktop, 1 on Mobile */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "repeat(2, 1fr)" },
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
            <Typography variant="h6" color="text.secondary">No orders available</Typography>
          </Paper>
        ) : (
          orders.map((order) => (
            <Paper
              key={order.id}
              elevation={0}
              sx={{
                p: 3,
                borderRadius: 4,
                border: "1px solid",
                borderColor: "divider",
                transition: "all 0.25s ease",
                "&:hover": {
                  borderColor: "primary.main",
                  transform: "translateY(-4px)",
                  boxShadow: 3,
                },
              }}
            >
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                <Box>
                  <Typography variant="h5" fontWeight={800}>
                    Table {order.tableNo}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Order #{order.id} • {new Date(order.createdAt).toLocaleString()}
                  </Typography>
                </Box>

                <Chip
                  label={`Rs. ${order.totalAmount}`}
                  sx={{ fontWeight: 700, fontSize: "1.1rem" }}
                />
              </Stack>

              {order.remarks && (
                <Typography sx={{ mt: 2, fontStyle: "italic", color: "#d97706" }}>
                  Note: {order.remarks}
                </Typography>
              )}

              <Divider sx={{ my: 2.5 }} />

              <Stack spacing={1.5} sx={{ mb: 3 }}>
                {order.items.map((item) => (
                  <Stack key={item.id} direction="row" justifyContent="space-between">
                    <Typography fontWeight={600}>
                      {item.quantity}x {item.name}
                    </Typography>
                    <Typography color="text.secondary">Rs. {item.price}</Typography>
                  </Stack>
                ))}
              </Stack>

              {/* Status Selector */}
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
                    py: 1.5
                  },
                }}
              >
                {statusOptions.map((status) => (
                  <MenuItem key={status} value={status}>
                    <Box sx={{ color: getStatusStyle(status).color, bgcolor: getStatusStyle(status).bgcolor, fontWeight: 600, px: 2, py: 1, borderRadius: 2 }}>
                      {statusLabel(status)}
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </Paper>
          ))
        )}
      </Box>
    </Box>
  );
}