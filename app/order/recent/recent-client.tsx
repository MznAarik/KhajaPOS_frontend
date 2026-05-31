"use client";

import * as React from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import { useRouter } from "next/navigation";
import { useAppSnackbar } from "@/components/common/SnackBar";
import { getPublicTableOrders, isOrderLocked, type KitchenOrder } from "@/lib/api";

type RecentOrderSummary = {
  sessionToken: string;
  orderId: number;
  tableId: number;
  tableNo: string;
  tableCode: string;
  createdAt: string;
};

const ORDER_LIFETIME_MS = 24 * 60 * 60 * 1000;

const toSummary = (order: KitchenOrder, tableCode: string): RecentOrderSummary => ({
  sessionToken: order.sessionToken,
  orderId: order.id,
  tableId: order.tableId,
  tableNo: order.tableNo,
  tableCode,
  createdAt: order.createdAt,
});

export default function RecentOrderClient({ tableCode: initialTableCode }: { tableCode: string }) {
  const router = useRouter();
  const { showSnackbar } = useAppSnackbar();
  const [tableCode, setTableCode] = React.useState(initialTableCode);

  const [orders, setOrders] = React.useState<RecentOrderSummary[]>([]);
  const [statuses, setStatuses] = React.useState<Record<string, KitchenOrder | null>>({});
  const [loading, setLoading] = React.useState(true);

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
        showSnackbar(`No recent order found for table ${tableCode}.`, "warning");
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

  return (
    <Box
      sx={{
        minHeight: "100vh",
        backgroundColor: "var(--background)",
        color: "var(--foreground)",
        p: { xs: 2, md: 3 },
        display: "grid",
        placeItems: "center",
      }}
    >
      <Paper
        sx={{
          width: "100%",
          maxWidth: 920,
          p: { xs: 2.5, md: 4 },
          borderRadius: "24px",
          border: "1px solid var(--border)",
          backgroundColor: "var(--card)",
        }}
      >
        <Stack spacing={2.25}>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 800 }}>
              Latest Order Status
            </Typography>
            <Typography sx={{ color: "var(--muted-foreground)", mt: 0.5 }}>
              All orders for this table stay in one live view.
            </Typography>
          </Box>

          <Chip label={`Table ${tableCode || "N/A"}`} sx={{ width: "fit-content", fontWeight: 800 }} />

          {loading ? (
            <Alert severity="info">Loading recent orders...</Alert>
          ) : orders.length ? (
            <Stack spacing={1.5}>
              {orders.map((order) => {
                const current = statuses[order.sessionToken];
                return (
                  <Paper
                    key={order.sessionToken}
                    sx={{
                      p: { xs: 1.75, md: 2 },
                      borderRadius: "18px",
                      border: "1px solid var(--border)",
                      backgroundColor: "var(--background)",
                    }}
                  >
                    <Stack
                      direction={{ xs: "column", sm: "row" }}
                      justifyContent="space-between"
                      alignItems={{ xs: "flex-start", sm: "center" }}
                      spacing={1.5}
                    >
                      <Box sx={{ minWidth: 0 }}>
                        <Typography sx={{ fontWeight: 800 }}>
                          Order #{order.orderId}
                        </Typography>
                        <Typography sx={{ color: "var(--muted-foreground)" }}>
                          Placed at {new Date(order.createdAt).toLocaleString()}
                        </Typography>
                        <Typography sx={{ color: "var(--muted-foreground)" }}>
                          Status: {current?.status ?? "pending"}
                        </Typography>
                      </Box>

                      <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25} sx={{ width: { xs: "100%", sm: "auto" } }}>
                        <Button
                          variant="contained"
                          onClick={() => router.push(`/order/track/${order.sessionToken}`)}
                          sx={{ borderRadius: "14px" }}
                        >
                          Open Live Status
                        </Button>
                        <Button
                          variant="outlined"
                          onClick={() => router.push(`/order/${encodeURIComponent(tableCode)}`)}
                          sx={{ borderRadius: "14px" }}
                        >
                          Back to Menu
                        </Button>
                      </Stack>
                    </Stack>
                  </Paper>
                );
              })}
            </Stack>
          ) : null}
        </Stack>
      </Paper>
    </Box>
  );
}
