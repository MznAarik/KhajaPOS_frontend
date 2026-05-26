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
import { useRouter, useSearchParams } from "next/navigation";
import { useAppSnackbar } from "@/components/common/SnackBar";
import { getPublicOrder, type KitchenOrder } from "@/lib/api";

type RecentOrderSummary = {
  sessionToken: string;
  orderId: number;
  tableId: number;
  tableNo: string;
  tableCode: string;
  createdAt: string;
};

const getOrderListStorageKey = (tableId: number) => `khajapos-order-list:${tableId}`;

export default function RecentOrderPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showSnackbar } = useAppSnackbar();
  const tableCode = searchParams.get("tableCode") ?? "";

  const [orders, setOrders] = React.useState<RecentOrderSummary[]>([]);
  const [statuses, setStatuses] = React.useState<Record<string, KitchenOrder | null>>({});
  const [loading, setLoading] = React.useState(true);

  const loadOrders = React.useCallback(() => {
    if (!tableCode) {
      setOrders([]);
      setStatuses({});
      setLoading(false);
      return;
    }

    const summaries: RecentOrderSummary[] = [];

    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index);
      if (!key || !key.startsWith("khajapos-order-list:")) continue;

      const raw = window.localStorage.getItem(key);
      if (!raw) continue;

      try {
        const parsed = JSON.parse(raw) as RecentOrderSummary[];
        for (const item of parsed) {
          if (item.tableCode === tableCode || String(item.tableId) === tableCode) {
            summaries.push(item);
          }
        }
      } catch {
        continue;
      }
    }

    const unique = Array.from(
      new Map(summaries.map((item) => [item.sessionToken, item])).values()
    ).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    setOrders(unique);

    if (!unique.length) {
      setStatuses({});
      setLoading(false);
      showSnackbar(`No recent order found for table ${tableCode}.`, "warning");
      return;
    }

    Promise.all(
      unique.map(async (item) => {
        try {
          const current = await getPublicOrder(item.sessionToken);
          return [item.sessionToken, current] as const;
        } catch {
          return [item.sessionToken, null] as const;
        }
      })
    )
      .then((pairs) => {
        setStatuses(Object.fromEntries(pairs));
      })
      .catch((error) => {
        console.error("Failed to load recent orders:", error);
        showSnackbar("We couldn't refresh recent orders right now.", "error");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [showSnackbar, tableCode]);

  React.useEffect(() => {
    setLoading(true);
    loadOrders();
  }, [loadOrders]);

  React.useEffect(() => {
    const sync = () => loadOrders();
    const interval = window.setInterval(sync, 5000);
    window.addEventListener("storage", sync);
    return () => {
      window.clearInterval(interval);
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
