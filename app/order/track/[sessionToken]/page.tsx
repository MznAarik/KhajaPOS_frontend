"use client";

import * as React from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  Paper,
  Skeleton,
  Stack,
  Typography,
} from "@mui/material";
import { useParams, useRouter } from "next/navigation";
import {
  cancelPublicOrder,
  canCustomerCancelOrder,
  canCustomerConfirmOrder,
  confirmPublicOrder,
  getPublicOrder,
  isOrderLocked,
  type KitchenOrder,
  type OrderStatus,
} from "@/lib/api";

const statusSteps: OrderStatus[] = ["pending", "confirmed", "preparing", "ready", "served"];

const statusCopy: Record<OrderStatus, string> = {
  pending: "Your order is waiting for restaurant confirmation.",
  confirmed: "Your order has been confirmed and sent to the kitchen queue.",
  preparing: "Your order is being prepared.",
  ready: "Your order is ready.",
  served: "Your order has been served.",
  cancelled: "This order has been cancelled.",
};

export default function TrackOrderPage() {
  const params = useParams<{ sessionToken: string }>();
  const router = useRouter();
  const sessionToken = params.sessionToken;

  const [order, setOrder] = React.useState<KitchenOrder | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [confirming, setConfirming] = React.useState(false);
  const [cancelling, setCancelling] = React.useState(false);
  const [message, setMessage] = React.useState("");
  const [error, setError] = React.useState("");

  const loadOrder = React.useCallback(async () => {
    try {
      const data = await getPublicOrder(sessionToken);
      setOrder(data);
      setError("");
    } catch (loadError) {
      console.error("Failed to load order:", loadError);
      setError("We couldn't load this order right now.");
    } finally {
      setLoading(false);
    }
  }, [sessionToken]);

  React.useEffect(() => {
    setLoading(true);
    loadOrder();

    const interval = window.setInterval(() => {
      loadOrder();
    }, 10000);

    return () => window.clearInterval(interval);
  }, [loadOrder]);

  const handleConfirm = async () => {
    if (!order) return;

    setConfirming(true);
    setMessage("");
    setError("");

    try {
      const updatedOrder = await confirmPublicOrder(order.sessionToken);
      setOrder(updatedOrder);
      setMessage("Your order has been confirmed.");
    } catch (confirmError) {
      console.error("Failed to confirm order:", confirmError);
      setError("This order can no longer be confirmed.");
    } finally {
      setConfirming(false);
    }
  };

  const handleCancel = async () => {
    if (!order) return;

    setCancelling(true);
    setMessage("");
    setError("");

    try {
      const updatedOrder = await cancelPublicOrder(order.sessionToken);
      setOrder(updatedOrder);
      setMessage("Your order has been cancelled.");
    } catch (cancelError) {
      console.error("Failed to cancel order:", cancelError);
      setError("This order can no longer be cancelled.");
    } finally {
      setCancelling(false);
    }
  };

  const activeStepIndex = order ? statusSteps.indexOf(order.status) : -1;

  return (
    <Box sx={{ minHeight: "100vh", backgroundColor: "var(--background)", color: "var(--foreground)", p: { xs: 2, md: 3 }, display: "grid", gap: 2 }}>
      <Paper sx={{ p: { xs: 2, md: 3 }, borderRadius: "24px", border: "1px solid var(--border)", backgroundColor: "var(--card)" }}>
        <Stack spacing={1}>
          <Typography variant="h4" sx={{ fontWeight: 800 }}>
            Track Your Order
          </Typography>
          <Typography sx={{ color: "var(--muted-foreground)" }}>
            Follow the live status of your table order. You can confirm or cancel only while it is still pending.
          </Typography>
        </Stack>
      </Paper>

      {message ? <Alert severity="success">{message}</Alert> : null}
      {error ? <Alert severity="error">{error}</Alert> : null}

      <Paper sx={{ p: { xs: 2, md: 3 }, borderRadius: "24px", border: "1px solid var(--border)", backgroundColor: "var(--card)" }}>
        {loading ? (
          <Stack spacing={2}>
            <Skeleton variant="text" width="40%" height={36} />
            <Skeleton variant="rounded" width="100%" height={120} sx={{ borderRadius: "18px" }} />
          </Stack>
        ) : order ? (
          <Stack spacing={3}>
            <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={2}>
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 800 }}>
                  Table {order.tableNo}
                </Typography>
                <Typography sx={{ color: "var(--muted-foreground)" }}>
                  Order #{order.id} ? {new Date(order.createdAt).toLocaleString()}
                </Typography>
              </Box>
              <Chip label={`Rs. ${order.totalAmount}`} sx={{ fontWeight: 800, width: "fit-content" }} />
            </Stack>

            <Paper sx={{ p: 2, borderRadius: "18px", backgroundColor: "var(--background)", border: "1px solid var(--border)" }}>
              <Typography sx={{ fontWeight: 700, mb: 1 }}>Current Status</Typography>
              <Typography sx={{ color: "var(--muted-foreground)", mb: 2 }}>
                {statusCopy[order.status]}
              </Typography>
              <Stack direction={{ xs: "column", md: "row" }} spacing={1.25}>
                {statusSteps.map((step, index) => {
                  const isComplete = activeStepIndex >= index;
                  const isCurrent = order.status === step;
                  return (
                    <Chip
                      key={step}
                      label={step.charAt(0).toUpperCase() + step.slice(1)}
                      sx={{
                        fontWeight: 700,
                        backgroundColor: isComplete
                          ? isCurrent
                            ? "var(--primary)"
                            : "rgba(79, 139, 255, 0.14)"
                          : "rgba(148, 163, 184, 0.14)",
                        color: isComplete
                          ? isCurrent
                            ? "var(--primary-foreground)"
                            : "var(--primary)"
                          : "var(--muted-foreground)",
                      }}
                    />
                  );
                })}
                {order.status === "cancelled" ? (
                  <Chip label="Cancelled" sx={{ fontWeight: 700, backgroundColor: "rgba(255, 90, 122, 0.12)", color: "#FF5A7A" }} />
                ) : null}
              </Stack>
            </Paper>

            <Stack spacing={1.25}>
              <Typography sx={{ fontWeight: 700 }}>Order Items</Typography>
              {order.items.map((item) => (
                <Stack key={item.id} direction="row" justifyContent="space-between">
                  <Typography>{item.quantity}x {item.name}</Typography>
                  <Typography sx={{ fontWeight: 700 }}>Rs. {item.price}</Typography>
                </Stack>
              ))}
            </Stack>

            {order.remarks ? (
              <>
                <Divider />
                <Box>
                  <Typography sx={{ fontWeight: 700 }}>Remarks</Typography>
                  <Typography sx={{ color: "var(--muted-foreground)", mt: 0.5 }}>{order.remarks}</Typography>
                </Box>
              </>
            ) : null}

            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25}>
              <Button variant="outlined" onClick={() => router.back()} sx={{ borderRadius: "14px" }}>
                Back to Menu
              </Button>
              <Button
                variant="contained"
                disabled={!canCustomerConfirmOrder(order.status) || confirming || isOrderLocked(order.status)}
                onClick={handleConfirm}
                sx={{ borderRadius: "14px" }}
              >
                {confirming ? "Confirming..." : canCustomerConfirmOrder(order.status) ? "Confirm Order" : "Confirmation Locked"}
              </Button>
              <Button
                variant="contained"
                color="error"
                disabled={!canCustomerCancelOrder(order.status) || cancelling || isOrderLocked(order.status)}
                onClick={handleCancel}
                sx={{ borderRadius: "14px" }}
              >
                {cancelling ? "Cancelling..." : canCustomerCancelOrder(order.status) ? "Cancel Order" : "Cancellation Locked"}
              </Button>
            </Stack>
          </Stack>
        ) : (
          <Typography sx={{ color: "var(--muted-foreground)" }}>Order not found.</Typography>
        )}
      </Paper>
    </Box>
  );
}

