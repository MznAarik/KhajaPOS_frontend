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
import { useRouter } from "next/navigation";
import { useAppSnackbar } from "@/components/common/SnackBar";
import {
  canCustomerConfirmOrder,
  confirmPublicOrder,
  getOrderTypeLabel,
  getPublicTableOrders,
  isOrderLocked,
  type KitchenOrder,
  type OrderStatus,
} from "@/lib/api";

type RecentOrderSummary = {
  sessionToken: string;
  orderId: number;
  tableId: number;
  tableNo: string;
  tableCode: string;
  createdAt: string;
};

const ORDER_LIFETIME_MS = 24 * 60 * 60 * 1000;
const STATUS_FLOW: OrderStatus[] = ["pending", "confirmed", "preparing", "ready", "served"];

const toSummary = (order: KitchenOrder, tableCode: string): RecentOrderSummary => ({
  sessionToken: order.sessionToken,
  orderId: order.id,
  tableId: order.tableId,
  tableNo: order.tableNo,
  tableCode,
  createdAt: order.createdAt,
});

const statusLabel = (status: OrderStatus) => {
  switch (status) {
    case "pending":
      return "Awaiting confirmation";
    case "confirmed":
      return "Confirmed";
    case "preparing":
      return "Preparing";
    case "ready":
      return "Ready to serve";
    case "served":
      return "Served";
    case "cancelled":
      return "Cancelled";
    default:
      return status;
  }
};

const statusColor = (
  status: OrderStatus
): "warning" | "info" | "success" | "error" | "default" => {
  switch (status) {
    case "pending":
      return "warning";
    case "confirmed":
    case "preparing":
      return "info";
    case "ready":
    case "served":
      return "success";
    case "cancelled":
      return "error";
    default:
      return "default";
  }
};

const timeAgo = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(diff)) return "";
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  return new Date(iso).toLocaleString();
};

export default function RecentOrderClient({ tableCode: initialTableCode }: { tableCode: string }) {
  const router = useRouter();
  const { showSnackbar } = useAppSnackbar();
  const [tableCode, setTableCode] = React.useState(initialTableCode);

  const [orders, setOrders] = React.useState<RecentOrderSummary[]>([]);
  const [statuses, setStatuses] = React.useState<Record<string, KitchenOrder | null>>({});
  const [loading, setLoading] = React.useState(true);
  const [confirming, setConfirming] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (initialTableCode) return;

    const search = new URLSearchParams(window.location.search);
    const nextTableCode = search.get("tableCode") ?? "";
    setTableCode(nextTableCode);
  }, [initialTableCode]);

  const loadOrders = React.useCallback(async () => {
    if (!tableCode) {
      setOrders([]);
      setStatuses({});
      setLoading(false);
      return false;
    }

    try {
      const tableOrders = await getPublicTableOrders(tableCode);
      const activeOrders = tableOrders.filter(
        (order) => Date.now() - new Date(order.createdAt).getTime() <= ORDER_LIFETIME_MS
      );
      const summaries = activeOrders.map((order) => toSummary(order, tableCode));

      setOrders(summaries);
      setStatuses(
        Object.fromEntries(activeOrders.map((order) => [order.sessionToken, order]))
      );

      if (!summaries.length) {
        return false;
      }

      window.localStorage.setItem(
        `khajapos-order-list:${activeOrders[0].tableId}`,
        JSON.stringify(summaries)
      );
      window.localStorage.setItem(
        `khajapos-order-list:${tableCode}`,
        JSON.stringify(summaries)
      );

      return activeOrders.some((order) => !isOrderLocked(order.status));
    } catch (error) {
      console.error("Failed to load recent orders:", error);
      showSnackbar("We couldn't refresh recent orders right now.", "error");
      return true;
    } finally {
      setLoading(false);
    }
  }, [showSnackbar, tableCode]);

  React.useEffect(() => {
    let timeout: number | undefined;
    let isCancelled = false;

    const sync = async () => {
      const shouldKeepPolling = await loadOrders();

      if (!isCancelled && shouldKeepPolling) {
        timeout = window.setTimeout(sync, 5000);
      }
    };

    setLoading(true);
    sync();
    window.addEventListener("storage", sync);
    return () => {
      isCancelled = true;
      if (timeout) {
        window.clearTimeout(timeout);
      }
      window.removeEventListener("storage", sync);
    };
  }, [loadOrders]);

  const handleConfirm = async (sessionToken: string) => {
    if (confirming) return;

    setConfirming(sessionToken);
    try {
      const updated = await confirmPublicOrder(sessionToken);
      setStatuses((current) => ({ ...current, [sessionToken]: updated }));
      showSnackbar("Order confirmed. The kitchen has been notified.", "success");
    } catch (error) {
      console.error("Failed to confirm order:", error);
      showSnackbar("This order can no longer be confirmed.", "warning");
    } finally {
      setConfirming(null);
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        backgroundColor: "transparent",
        backgroundImage: "none",
        color: "var(--foreground)",
        display: "flex",
        p: { xs: 1.25, md: 3 },
      }}
    >
      <Paper
        sx={{
          m: "auto",
          width: "100%",
          maxWidth: 760,
          p: { xs: 2, md: 3.5 },
          borderRadius: { xs: "20px", md: "26px" },
          border: "1px solid var(--border)",
          backgroundColor: "var(--card)",
          boxShadow: "0 18px 44px color-mix(in srgb, var(--foreground) 8%, transparent)",
        }}
      >
        <Stack spacing={2.25}>
          <Stack
            direction={{ xs: "column", sm: "row" }}
            justifyContent="space-between"
            alignItems={{ xs: "flex-start", sm: "center" }}
            spacing={1.25}
          >
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="h5" sx={{ fontWeight: 900, fontSize: { xs: "1.3rem", md: "1.6rem" } }}>
                Your Orders
              </Typography>
              <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mt: 0.5 }}>
                <Box
                  component="span"
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    backgroundColor: "var(--accent)",
                    animation: "khajapos-recent-pulse 2s infinite",
                    "@keyframes khajapos-recent-pulse": {
                      "0%": { boxShadow: "0 0 0 0 color-mix(in srgb, var(--accent) 55%, transparent)" },
                      "70%": { boxShadow: "0 0 0 7px color-mix(in srgb, var(--accent) 0%, transparent)" },
                      "100%": { boxShadow: "0 0 0 0 color-mix(in srgb, var(--accent) 0%, transparent)" },
                    },
                  }}
                />
                <Typography sx={{ color: "var(--muted-foreground)", fontSize: "0.82rem", fontWeight: 700 }}>
                  Live status · updates automatically
                </Typography>
              </Stack>
            </Box>
            <Chip
              label={`Table ${tableCode || "N/A"}`}
              sx={{ width: "fit-content", fontWeight: 800, borderRadius: "999px" }}
            />
          </Stack>

          {loading ? (
            <Stack spacing={1.5}>
              {Array.from({ length: 2 }, (_, index) => (
                <Paper
                  key={`recent-skeleton-${index}`}
                  sx={{
                    p: 2,
                    borderRadius: "18px",
                    border: "1px solid var(--border)",
                    backgroundColor: "var(--background)",
                  }}
                >
                  <Stack spacing={1.25}>
                    <Skeleton variant="text" width="45%" height={28} />
                    <Skeleton variant="rounded" height={8} />
                    <Skeleton variant="text" width="70%" />
                  </Stack>
                </Paper>
              ))}
            </Stack>
          ) : orders.length ? (
            <Stack spacing={1.5}>
              {orders.map((order) => {
                const current = statuses[order.sessionToken];
                const status: OrderStatus = current?.status ?? "pending";
                const flowIndex = STATUS_FLOW.indexOf(status);
                const isCancelled = status === "cancelled";

                return (
                  <Paper
                    key={order.sessionToken}
                    sx={{
                      p: { xs: 1.75, md: 2.25 },
                      borderRadius: "18px",
                      border: "1px solid var(--border)",
                      backgroundColor: "var(--background)",
                    }}
                  >
                    <Stack spacing={1.5}>
                      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1.25}>
                        <Box sx={{ minWidth: 0 }}>
                          <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap" useFlexGap>
                            <Typography sx={{ fontWeight: 900, fontSize: { xs: "1rem", md: "1.1rem" } }}>
                              Order #{order.orderId}
                            </Typography>
                            <Chip
                              size="small"
                              label={statusLabel(status)}
                              color={statusColor(status)}
                              sx={{ fontWeight: 800 }}
                            />
                            {current ? (
                              <Chip
                                size="small"
                                variant="outlined"
                                label={getOrderTypeLabel(current.orderType)}
                                sx={{ fontWeight: 800 }}
                              />
                            ) : null}
                          </Stack>
                          <Typography sx={{ color: "var(--muted-foreground)", fontSize: "0.8rem", mt: 0.5 }}>
                            Placed {timeAgo(order.createdAt)}
                          </Typography>
                        </Box>
                        {current ? (
                          <Typography sx={{ fontWeight: 900, color: "var(--primary)", whiteSpace: "nowrap" }}>
                            Rs. {Number.parseFloat(current.totalAmount).toFixed(2)}
                          </Typography>
                        ) : null}
                      </Stack>

                      {!isCancelled ? (
                        <Stack direction="row" spacing={0.5}>
                          {STATUS_FLOW.map((step, index) => {
                            const reached = flowIndex >= index;
                            return (
                              <Box key={step} sx={{ flex: 1, minWidth: 0 }}>
                                <Box
                                  sx={{
                                    height: 5,
                                    borderRadius: "999px",
                                    backgroundColor: reached ? "var(--primary)" : "var(--border)",
                                    transition: "background-color 200ms ease",
                                  }}
                                />
                                <Typography
                                  sx={{
                                    mt: 0.5,
                                    fontSize: { xs: "0.6rem", md: "0.68rem" },
                                    fontWeight: reached ? 800 : 600,
                                    color: reached ? "var(--primary)" : "var(--muted-foreground)",
                                    textAlign: "center",
                                    whiteSpace: "nowrap",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                  }}
                                >
                                  {statusLabel(step)}
                                </Typography>
                              </Box>
                            );
                          })}
                        </Stack>
                      ) : (
                        <Typography sx={{ color: "var(--destructive)", fontWeight: 700, fontSize: "0.85rem" }}>
                          This order was cancelled.
                        </Typography>
                      )}

                      {current?.items?.length ? (
                        <Box>
                          <Divider sx={{ mb: 1 }} />
                          <Stack spacing={0.5}>
                            {current.items.map((item) => (
                              <Stack key={item.id} direction="row" justifyContent="space-between" spacing={1.5}>
                                <Typography sx={{ fontSize: "0.85rem", fontWeight: 700, minWidth: 0, overflowWrap: "anywhere" }}>
                                  {item.quantity}× {item.name}
                                </Typography>
                                <Typography sx={{ fontSize: "0.85rem", color: "var(--muted-foreground)", flexShrink: 0 }}>
                                  Rs. {(Number.parseFloat(item.price) * item.quantity).toFixed(2)}
                                </Typography>
                              </Stack>
                            ))}
                          </Stack>
                        </Box>
                      ) : null}

                      <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                        {current && canCustomerConfirmOrder(current.status) ? (
                          <Button
                            variant="contained"
                            disabled={confirming === order.sessionToken}
                            onClick={() => handleConfirm(order.sessionToken)}
                            sx={{ borderRadius: "14px", textTransform: "none", fontWeight: 800 }}
                          >
                            {confirming === order.sessionToken ? "Confirming..." : "Confirm Order"}
                          </Button>
                        ) : null}
                        <Button
                          variant="outlined"
                          onClick={() => router.push(`/order/track/${order.sessionToken}`)}
                          sx={{ borderRadius: "14px", textTransform: "none", fontWeight: 800 }}
                        >
                          Track Order
                        </Button>
                      </Stack>
                    </Stack>
                  </Paper>
                );
              })}
            </Stack>
          ) : (
            <Stack spacing={1.25} alignItems="center" sx={{ textAlign: "center", py: { xs: 3, md: 4 } }}>
              <Typography sx={{ fontSize: "2.4rem", lineHeight: 1 }}>🧾</Typography>
              <Typography sx={{ fontWeight: 800, fontSize: "1.05rem" }}>No recent orders</Typography>
              <Typography sx={{ color: "var(--muted-foreground)", maxWidth: 380 }}>
                Orders you place from this table will appear here with their live status.
              </Typography>
              <Button
                variant="contained"
                onClick={() =>
                  router.push(tableCode ? `/order/${encodeURIComponent(tableCode)}` : "/")
                }
                sx={{ borderRadius: "14px", textTransform: "none", fontWeight: 800, mt: 0.5 }}
              >
                Browse Menu
              </Button>
            </Stack>
          )}

          <Button
            variant="text"
            onClick={() =>
              router.push(tableCode ? `/order/${encodeURIComponent(tableCode)}` : "/")
            }
            sx={{ alignSelf: { xs: "stretch", sm: "flex-start" }, textTransform: "none", fontWeight: 800 }}
          >
            ← Back to Menu
          </Button>
        </Stack>
      </Paper>
    </Box>
  );
}
