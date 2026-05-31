"use client";

import * as React from "react";
import {
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
import { useAppSnackbar } from "@/components/common/SnackBar";

const statusSteps: OrderStatus[] = ["pending", "confirmed", "preparing", "ready", "served"];
type RecentOrderSummary = {
  sessionToken: string;
  orderId: number;
  tableId: number;
  tableNo: string;
  tableCode: string;
  createdAt: string;
};
const getLatestOrderStorageKey = (tableId: number) => `khajapos-latest-order:${tableId}`;
const getRecentOrderStorageKey = (tableId: number) => `khajapos-recent-order:${tableId}`;
const getOrderListStorageKey = (tableId: number | string) => `khajapos-order-list:${tableId}`;
const getOrderSessionTableCodeKey = (sessionToken: string) => `khajapos-order-session-table:${sessionToken}`;
const ORDER_LIFETIME_MS = 24 * 60 * 60 * 1000;

const statusCopy: Record<OrderStatus, string> = {
  pending: "Your order is waiting for restaurant confirmation.",
  confirmed: "Your order has been confirmed and sent to the kitchen queue.",
  preparing: "Your order is being prepared.",
  ready: "Your order is ready.",
  served: "Your order has been served.",
  cancelled: "This order has been cancelled.",
};

const parseRecentOrders = (raw: string | null): RecentOrderSummary[] => {
  if (!raw) return [];

  const parsed = JSON.parse(raw) as RecentOrderSummary | RecentOrderSummary[];
  return Array.isArray(parsed) ? parsed : [parsed];
};

const findStoredTableCode = (sessionToken: string, tableId?: number) => {
  if (typeof window === "undefined") return "";

  const direct = window.localStorage.getItem(getOrderSessionTableCodeKey(sessionToken));
  if (direct) return direct;

  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index);
    if (!key || !key.startsWith("khajapos-order-list:")) continue;

    try {
      const orders = parseRecentOrders(window.localStorage.getItem(key));
      const match = orders.find(
        (item) =>
          item.sessionToken === sessionToken &&
          (!tableId || item.tableId === tableId) &&
          item.tableCode
      );

      if (match?.tableCode) return match.tableCode;
    } catch {
      continue;
    }
  }

  return "";
};

export default function TrackOrderPage() {
  const params = useParams<{ sessionToken: string }>();
  const router = useRouter();
  const { showSnackbar } = useAppSnackbar();
  const sessionToken = params.sessionToken;

  const [order, setOrder] = React.useState<KitchenOrder | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [confirming, setConfirming] = React.useState(false);
  const [cancelling, setCancelling] = React.useState(false);
  const [returnTableCode, setReturnTableCode] = React.useState("");

  const loadOrder = React.useCallback(async () => {
    try {
      const data = await getPublicOrder(sessionToken);
      setOrder(data);
      if (typeof window !== "undefined") {
        try {
          const storedTableCode = findStoredTableCode(data.sessionToken, data.tableId);
          if (storedTableCode) {
            setReturnTableCode(storedTableCode);
          }
          const summary = {
            sessionToken: data.sessionToken,
            orderId: data.id,
            tableId: data.tableId,
            tableNo: data.tableNo,
            tableCode: storedTableCode,
            createdAt: data.createdAt,
          };
          const storedAt = new Date(data.createdAt).getTime();
          if (Date.now() - storedAt > ORDER_LIFETIME_MS) {
            return;
          }

          const existingRecent = parseRecentOrders(
            window.localStorage.getItem(getRecentOrderStorageKey(data.tableId))
          );
          const nextRecent = [summary, ...existingRecent.filter((item) => item.sessionToken !== data.sessionToken)].slice(0, 8);
          window.localStorage.setItem(getRecentOrderStorageKey(data.tableId), JSON.stringify(nextRecent));
          window.localStorage.setItem(getOrderListStorageKey(data.tableId), JSON.stringify(nextRecent));
          if (summary.tableCode) {
            window.localStorage.setItem(getOrderListStorageKey(summary.tableCode), JSON.stringify(nextRecent));
          }
          window.localStorage.setItem(getLatestOrderStorageKey(data.tableId), JSON.stringify(summary));
        } catch (cacheError) {
          console.error("Failed to update recent order cache:", cacheError);
        }
      }
    } catch (loadError) {
      console.error("Failed to load order:", loadError);
      showSnackbar("We couldn't load this order right now.", "error");
    } finally {
      setLoading(false);
    }
  }, [sessionToken, showSnackbar]);

  React.useEffect(() => {
    setLoading(true);
    loadOrder();
  }, [loadOrder]);

  React.useEffect(() => {
    if (!order || isOrderLocked(order.status)) {
      return;
    }

    const interval = window.setInterval(() => {
      loadOrder();
    }, 10000);

    return () => window.clearInterval(interval);
  }, [loadOrder, order?.status]);

  const handleConfirm = async () => {
    if (!order || confirming || cancelling) return;

    setConfirming(true);

    try {
      const updatedOrder = await confirmPublicOrder(order.sessionToken);
      setOrder(updatedOrder);
      showSnackbar("Your order has been confirmed.", "success");
    } catch (confirmError) {
      console.error("Failed to confirm order:", confirmError);
      showSnackbar("This order can no longer be confirmed.", "warning");
    } finally {
      setConfirming(false);
    }
  };

  const handleCancel = async () => {
    if (!order || confirming || cancelling) return;

    setCancelling(true);

    try {
      const updatedOrder = await cancelPublicOrder(order.sessionToken);
      setOrder(updatedOrder);
      showSnackbar("Your order has been cancelled.", "success");
    } catch (cancelError) {
      console.error("Failed to cancel order:", cancelError);
      showSnackbar("This order can no longer be cancelled.", "warning");
    } finally {
      setCancelling(false);
    }
  };

  const handleBackToMenu = React.useCallback(() => {
    if (returnTableCode) {
      window.location.assign(`/order/${encodeURIComponent(returnTableCode)}`);
      return;
    }

    router.back();
  }, [returnTableCode, router]);

  const activeStepIndex = order ? statusSteps.indexOf(order.status) : -1;
  const actionPending = confirming || cancelling;
  const locked = order ? isOrderLocked(order.status) : false;
  const canConfirm = order ? canCustomerConfirmOrder(order.status) && !locked : false;
  const canCancel = order ? canCustomerCancelOrder(order.status) && !locked : false;
  const showMobileActionPanel = Boolean(order);

  return (
    <Box sx={{ minHeight: "100vh", backgroundColor: "var(--background)", color: "var(--foreground)", p: { xs: 1.5, md: 3 }, pb: { xs: showMobileActionPanel ? 18 : 2, md: 3 }, display: "grid", gap: 2 }}>
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
                  Order #{order.id} - {new Date(order.createdAt).toLocaleString()}
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
                  <Chip label="Cancelled" sx={{ fontWeight: 700, backgroundColor: "var(--status-inactive-bg)", color: "var(--status-inactive-fg)" }} />
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

            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={1.25}
              sx={{
                display: { xs: "none", sm: "flex" },
                p: { xs: 1, sm: 0 },
                borderRadius: { xs: "18px", sm: 0 },
                border: { xs: "1px solid var(--border)", sm: "none" },
                backgroundColor: { xs: "var(--background)", sm: "transparent" },
              }}
            >
              <Button
                variant="outlined"
                onClick={handleBackToMenu}
                sx={{ borderRadius: "14px", minHeight: { xs: 46, sm: "auto" } }}
              >
                Back to Menu
              </Button>
              <Button
                variant="contained"
                disabled={!canConfirm || actionPending}
                onClick={handleConfirm}
                sx={{ borderRadius: "14px", minHeight: { xs: 48, sm: "auto" }, fontWeight: { xs: 850, sm: 600 } }}
              >
                {confirming ? "Confirming..." : canConfirm ? "Confirm Order" : "Confirmation Locked"}
              </Button>
              <Button
                variant="contained"
                color="error"
                disabled={!canCancel || actionPending}
                onClick={handleCancel}
                sx={{ borderRadius: "14px", minHeight: { xs: 48, sm: "auto" }, fontWeight: { xs: 850, sm: 600 } }}
              >
                {cancelling ? "Cancelling..." : canCancel ? "Cancel Order" : "Cancellation Locked"}
              </Button>
            </Stack>

            {showMobileActionPanel ? (
              <Box
                sx={{
                  display: { xs: "block", sm: "none" },
                  position: "fixed",
                  left: 0,
                  right: 0,
                  bottom: 0,
                  zIndex: 30,
                  px: 1.5,
                  pb: "calc(env(safe-area-inset-bottom) + 12px)",
                  pt: 1,
                  pointerEvents: "none",
                }}
              >
                <Paper
                  elevation={0}
                  sx={{
                    p: 1,
                    borderRadius: "20px",
                    border: "1px solid var(--border)",
                    backgroundColor: "color-mix(in srgb, var(--card) 94%, transparent)",
                    backdropFilter: "blur(18px)",
                    boxShadow: "0 18px 42px rgba(31, 42, 43, 0.22)",
                    pointerEvents: "auto",
                  }}
                >
                  <Stack spacing={1}>
                    {!locked ? (
                      <Button
                        fullWidth
                        variant="contained"
                        disabled={!canConfirm || actionPending}
                        onClick={handleConfirm}
                        sx={{ borderRadius: "14px", minHeight: 50, fontWeight: 850 }}
                      >
                        {confirming ? "Confirming..." : canConfirm ? "Confirm Order" : "Confirmation Locked"}
                      </Button>
                    ) : null}
                    <Stack direction="row" spacing={1}>
                      <Button
                        fullWidth
                        variant="outlined"
                        onClick={handleBackToMenu}
                        sx={{ borderRadius: "14px", minHeight: 44, fontWeight: 800 }}
                      >
                        Menu
                      </Button>
                      <Button
                        fullWidth
                        variant="outlined"
                        color="error"
                        disabled={!canCancel || actionPending}
                        onClick={handleCancel}
                        sx={{ display: locked ? "none" : "inline-flex", borderRadius: "14px", minHeight: 44, fontWeight: 850 }}
                      >
                        {cancelling ? "Cancelling..." : canCancel ? "Cancel Order" : "Cancellation Locked"}
                      </Button>
                    </Stack>
                  </Stack>
                </Paper>
              </Box>
            ) : null}
          </Stack>
        ) : (
          <Typography sx={{ color: "var(--muted-foreground)" }}>Order not found.</Typography>
        )}
      </Paper>
    </Box>
  );
}

