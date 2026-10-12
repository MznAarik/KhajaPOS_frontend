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
  Divider,
  Paper,
  Skeleton,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import { useParams, useRouter } from "next/navigation";
import {
  canCustomerConfirmOrder,
  confirmPublicOrder,
  getFoodTypeLabel,
  getOrderTypeLabel,
  getPublicMenu,
  getPublicTableOrders,
  isOrderLocked,
  placePublicOrder,
  resolveMenuImageUrl,
  type KitchenOrder,
  type OrderType,
  type PublicMenuItem,
  type PublicTableMenu,
} from "@/lib/api";
import ThemeToggle from "@/components/common/ThemeToggle";
import { useAppSnackbar } from "@/components/common/SnackBar";

type CartState = Record<number, number>;

type RecentOrderSummary = {
  sessionToken: string;
  orderId: number;
  tableId: number;
  tableNo: string;
  tableCode: string;
  createdAt: string;
};

const getCartStorageKey = (tableCode: string) => `khajapos-cart:${tableCode}`;
const getLatestOrderStorageKey = (tableId: number | string) => `khajapos-latest-order:${tableId}`;
const getOrderListStorageKey = (tableId: number | string) => `khajapos-order-list:${tableId}`;
const getRecentOrderStorageKey = (tableId: number | string) => `khajapos-recent-order:${tableId}`;
const getOrderSessionTableCodeKey = (sessionToken: string) => `khajapos-order-session-table:${sessionToken}`;
const getOrderTypeStorageKey = (tableCode: string) => `khajapos-order-type:${tableCode}`;
const MAX_ORDER_QUANTITY = 10;

const formatOrderStatusLabel = (status: string) =>
  status
    .replace(/_/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());


export default function TableOrderPage() {
  const params = useParams<{ tableCode: string }>();
  const router = useRouter();
  const { showSnackbar } = useAppSnackbar();
  const tableCode = params.tableCode;

  const [menu, setMenu] = React.useState<PublicTableMenu | null>(null);
  const [cart, setCart] = React.useState<CartState>({});
  const [remarks, setRemarks] = React.useState("");
  const [orderType, setOrderType] = React.useState<OrderType>("dine_in");
  const [loading, setLoading] = React.useState(true);
  const [placing, setPlacing] = React.useState(false);
  const [message, setMessage] = React.useState("");
  const [recentOrders, setRecentOrders] = React.useState<RecentOrderSummary[]>([]);
  const [recentOrderStatuses, setRecentOrderStatuses] = React.useState<Record<string, KitchenOrder | null>>({});
  const [orderRefreshKey, setOrderRefreshKey] = React.useState(0);
  const [mobileCartOpen, setMobileCartOpen] = React.useState(false);
  const [selectedItem, setSelectedItem] = React.useState<PublicMenuItem | null>(null);
  const [activeCategoryId, setActiveCategoryId] = React.useState<number | "all">("all");
  const [confirmingToken, setConfirmingToken] = React.useState<string | null>(null);
  const [mySessionTokens, setMySessionTokens] = React.useState<string[]>([]);
  const tableId = menu?.table.id ?? 0;

  React.useEffect(() => {
    const savedCart = window.localStorage.getItem(getCartStorageKey(tableCode));
    if (savedCart) {
      try {
        setCart(JSON.parse(savedCart) as CartState);
      } catch {
        window.localStorage.removeItem(getCartStorageKey(tableCode));
      }
    }
  }, [tableCode]);

  React.useEffect(() => {
    window.localStorage.setItem(getCartStorageKey(tableCode), JSON.stringify(cart));
  }, [cart, tableCode]);

  React.useEffect(() => {
    const savedType = window.localStorage.getItem(getOrderTypeStorageKey(tableCode));
    if (savedType === "dine_in" || savedType === "takeaway") {
      setOrderType(savedType);
    }
  }, [tableCode]);

  React.useEffect(() => {
    window.localStorage.setItem(getOrderTypeStorageKey(tableCode), orderType);
  }, [orderType, tableCode]);

  React.useEffect(() => {
    const loadMenu = async () => {
      setLoading(true);
      try {
        const data = await getPublicMenu(tableCode);
        setMenu(data);
      } catch (error) {
        console.error("Failed to load public menu:", error);
        setMessage("We couldn't load this table menu right now.");
      } finally {
        setLoading(false);
      }
    };

    loadMenu();
  }, [tableCode]);

  React.useEffect(() => {
    if (!tableId) {
      setRecentOrders([]);
      setRecentOrderStatuses({});
      return;
    }

    let timeout: number | undefined;
    let isCancelled = false;

    const refreshTableOrders = async () => {
      try {
        const orders = await getPublicTableOrders(tableCode);
        const summaries = orders.map((order) => ({
          sessionToken: order.sessionToken,
          orderId: order.id,
          tableId: order.tableId,
          tableNo: order.tableNo,
          tableCode,
          createdAt: order.createdAt,
        }));

        if (!summaries.length) {
          setRecentOrders([]);
          setRecentOrderStatuses({});
          window.localStorage.removeItem(getOrderListStorageKey(tableId));
          return true;
        }

        setRecentOrders(summaries);
        setRecentOrderStatuses(
          Object.fromEntries(orders.map((order) => [order.sessionToken, order]))
        );
        window.localStorage.setItem(getOrderListStorageKey(tableId), JSON.stringify(summaries));
        window.localStorage.setItem(getOrderListStorageKey(tableCode), JSON.stringify(summaries));
        return orders.some((order) => !isOrderLocked(order.status));
      } catch (error) {
        console.error("Failed to refresh table orders:", error);
        const saved = window.localStorage.getItem(getOrderListStorageKey(tableId));
        if (!saved) {
          setRecentOrders([]);
          setRecentOrderStatuses({});
          return true;
        }

        try {
          const parsed = JSON.parse(saved) as RecentOrderSummary[];
          const filtered = parsed.filter((item) => item.sessionToken && item.tableId === tableId);
          setRecentOrders(filtered);
        } catch {
          window.localStorage.removeItem(getOrderListStorageKey(tableId));
          setRecentOrders([]);
          setRecentOrderStatuses({});
        }
        return true;
      }
    };

    const refreshAndSchedule = async () => {
      const shouldKeepPolling = await refreshTableOrders();

      if (!isCancelled && shouldKeepPolling) {
        timeout = window.setTimeout(refreshAndSchedule, 10000);
      }
    };

    refreshAndSchedule();

    return () => {
      isCancelled = true;
      if (timeout) {
        window.clearTimeout(timeout);
      }
    };
  }, [orderRefreshKey, tableCode, tableId]);

  React.useEffect(() => {
    const syncOrders = () => {
      try {
        if (!tableId) {
          setRecentOrders([]);
          return;
        }
        const saved = window.localStorage.getItem(getOrderListStorageKey(tableId));
        const parsed = saved ? (JSON.parse(saved) as RecentOrderSummary[]) : [];
        const filtered = parsed.filter((item) => item.sessionToken && item.tableId === tableId);
        setRecentOrders(filtered);
      } catch {
        setRecentOrders([]);
      }
    };

    const onStorage = (event: StorageEvent) => {
      if (event.key === getOrderListStorageKey(tableId)) {
        syncOrders();
      }
    };

    window.addEventListener("storage", onStorage);
    const interval = window.setInterval(syncOrders, 5000);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.clearInterval(interval);
    };
  }, [tableId]);

  React.useEffect(() => {
    const prefix = "khajapos-order-session-table:";
    const tokens: string[] = [];
    try {
      for (let index = 0; index < window.localStorage.length; index += 1) {
        const key = window.localStorage.key(index);
        if (key && key.startsWith(prefix)) {
          const token = key.slice(prefix.length);
          if (window.localStorage.getItem(key) === tableCode) {
            tokens.push(token);
          }
        }
      }
    } catch {
      // ignore storage access errors
    }
    setMySessionTokens(tokens);
  }, [tableCode, recentOrders, recentOrderStatuses]);

  const flatItems = React.useMemo(
    () => menu?.categories.flatMap((category) => category.items) ?? [],
    [menu]
  );

  const visibleCategories = React.useMemo(() => {
    if (!menu) return [];
    if (activeCategoryId === "all") return menu.categories;
    return menu.categories.filter((category) => category.id === activeCategoryId);
  }, [activeCategoryId, menu]);

  const cartItems = React.useMemo(
    () =>
      flatItems
        .filter((item) => (cart[item.id] ?? 0) > 0)
        .map((item) => ({
          ...item,
          quantity: cart[item.id],
        })),
    [cart, flatItems]
  );

  const totalAmount = React.useMemo(
    () =>
      cartItems.reduce(
        (sum, item) => sum + Number.parseFloat(item.price) * item.quantity,
        0
      ),
    [cartItems]
  );

  const pendingOrder = React.useMemo(() => {
    const mine = recentOrders.filter((order) => mySessionTokens.includes(order.sessionToken));
    return (
      mine
        .map((order) => recentOrderStatuses[order.sessionToken])
        .filter((order): order is KitchenOrder => order?.status === "pending")
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )[0] ?? null
    );
  }, [mySessionTokens, recentOrderStatuses, recentOrders]);

  const orderedOrders = React.useMemo(() => {
    const rankOf = (status: string) => (status === "pending" ? 0 : 1);
    return [...recentOrders].sort((a, b) => {
      const statusA = recentOrderStatuses[a.sessionToken]?.status ?? "pending";
      const statusB = recentOrderStatuses[b.sessionToken]?.status ?? "pending";
      if (rankOf(statusA) !== rankOf(statusB)) {
        return rankOf(statusA) - rankOf(statusB);
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [recentOrders, recentOrderStatuses]);

  const cartActionLabel = pendingOrder ? "Add to Order" : "Place Order";
  const cartActionBusyLabel = pendingOrder ? "Adding..." : "Placing...";

  const updateQuantity = (itemId: number, nextQuantity: number) => {
    setCart((current) => {
      if (nextQuantity <= 0) {
        const { [itemId]: _removed, ...rest } = current;
        return rest;
      }

      if (nextQuantity > MAX_ORDER_QUANTITY) {
        setMessage(`You can order up to ${MAX_ORDER_QUANTITY} of one item at a time.`);
        return current;
      }

      return { ...current, [itemId]: Math.min(nextQuantity, MAX_ORDER_QUANTITY) };
    });
  };

  const handlePlaceOrder = async () => {
    if (!menu || cartItems.length === 0) return;

    setPlacing(true);
    setMessage("");

    const appendToToken = pendingOrder?.sessionToken;

    try {
      const order = await placePublicOrder({
        tableId: menu.table.id,
        remarks,
        items: cartItems.map((item) => ({
          menuItemId: item.id,
          quantity: item.quantity,
        })),
        sessionToken: appendToToken,
        orderType,
      });

      setCart({});
      setRemarks("");
        window.localStorage.removeItem(getCartStorageKey(tableCode));
        window.localStorage.setItem(
        getRecentOrderStorageKey(menu.table.id),
        JSON.stringify({
          sessionToken: order.sessionToken,
          orderId: order.id,
          tableId: menu.table.id,
          tableNo: menu.table.tableNo,
          tableCode,
          createdAt: order.createdAt ?? new Date().toISOString(),
        })
      );
      const summary: RecentOrderSummary = {
        sessionToken: order.sessionToken,
        orderId: order.id,
        tableId: menu.table.id,
        tableNo: menu.table.tableNo,
        tableCode,
        createdAt: order.createdAt ?? new Date().toISOString(),
      };
      const existingOrders = (() => {
        try {
          const raw = window.localStorage.getItem(getOrderListStorageKey(menu.table.id));
          return raw ? (JSON.parse(raw) as RecentOrderSummary[]) : [];
        } catch {
          return [];
        }
      })();
      const nextOrders = [summary, ...existingOrders.filter((item) => item.sessionToken !== order.sessionToken)].slice(0, 8);
      window.localStorage.setItem(getOrderListStorageKey(menu.table.id), JSON.stringify(nextOrders));
      window.localStorage.setItem(getLatestOrderStorageKey(menu.table.id), JSON.stringify(summary));
      window.localStorage.setItem(getLatestOrderStorageKey(tableCode), JSON.stringify(summary));
      window.localStorage.setItem(getOrderListStorageKey(tableCode), JSON.stringify(nextOrders));
      window.localStorage.setItem(getOrderSessionTableCodeKey(order.sessionToken), tableCode);
      setRecentOrders(nextOrders);
      setRecentOrderStatuses((current) => ({ ...current, [order.sessionToken]: order }));
      setOrderRefreshKey((current) => current + 1);
      showSnackbar(
        appendToToken
          ? "Items added to your order. Confirm whenever you are ready."
          : "Order placed. Confirm it whenever you are ready.",
        "success"
      );
      window.location.assign(`/order/track/${encodeURIComponent(order.sessionToken)}`);
      return;
    } catch (error) {
      console.error("Failed to place order:", error);
      const text = "We couldn't place your order. Please try again.";
      showSnackbar(text, "error");
      setMessage("");
    } finally {
      setPlacing(false);
    }
  };

  const handleConfirmPending = async (sessionToken: string) => {
    if (confirmingToken) return;

    setConfirmingToken(sessionToken);
    try {
      const updated = await confirmPublicOrder(sessionToken);
      setRecentOrderStatuses((current) => ({ ...current, [sessionToken]: updated }));
      showSnackbar("Order confirmed. The kitchen has been notified.", "success");
    } catch (error) {
      console.error("Failed to confirm order:", error);
      showSnackbar("This order can no longer be confirmed.", "warning");
    } finally {
      setConfirmingToken(null);
    }
  };

  const orderTypeSelector = (
    <Stack spacing={0.75}>
      <Typography sx={{ fontWeight: 800, fontSize: "0.9rem" }}>
        How would you like your order?
      </Typography>
      <ToggleButtonGroup
        exclusive
        fullWidth
        size="small"
        value={orderType}
        onChange={(_event, next: OrderType | null) => {
          if (next) setOrderType(next);
        }}
        sx={{ borderRadius: "14px" }}
      >
        <ToggleButton value="dine_in" sx={{ fontWeight: 800, textTransform: "none", py: 1 }}>
          Eat here
        </ToggleButton>
        <ToggleButton value="takeaway" sx={{ fontWeight: 800, textTransform: "none", py: 1 }}>
          Pack
        </ToggleButton>
      </ToggleButtonGroup>
      <Typography sx={{ color: "var(--muted-foreground)", fontSize: "0.78rem" }}>
        {orderType === "takeaway"
          ? "We will pack your order to take away."
          : "Your order will be served at the table."}
      </Typography>
    </Stack>
  );


  return (
    <Box
      sx={{
        minHeight: "100vh",
        backgroundColor: "transparent",
        backgroundImage: "none",
        color: "var(--foreground)",
        p: { xs: 1, md: 3 },
        pb: { xs: cartItems.length ? 12 : 1, lg: 3 },
        display: "grid",
        gap: { xs: 1.25, md: 2 },
      }}
    >
      <Paper
        sx={{
          p: { xs: 1.5, md: 3 },
          borderRadius: { xs: "18px", md: "24px" },
          border: "1px solid var(--border)",
          backgroundColor: "var(--card)",
          boxShadow: "0 14px 34px color-mix(in srgb, var(--foreground) 8%, transparent)",
        }}
      >
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
          {/* Left Side */}
          <Stack spacing={1} sx={{ flex: 1 }}>
            {loading ? (
              <Skeleton variant="rounded" width={124} height={32} sx={{ borderRadius: "999px" }} />
            ) : (
              <Chip
                label={"Table: " + (menu?.table?.tableNo ?? "No data found")}
                sx={{ width: "fit-content", fontWeight: 800 }}
              />
            )}

            <Typography variant="h4" sx={{ fontWeight: 800, fontSize: { xs: "1.28rem", md: "2.4rem" } }}>
              Order from your table
            </Typography>

            <Typography sx={{ color: "var(--muted-foreground)", maxWidth: 720, fontSize: { xs: "0.84rem", md: "1rem" } }}>
              {pendingOrder
                ? `Order #${pendingOrder.id} is waiting. Add more items, then confirm when you are ready.`
                : "Pick a category, add items, place order."}
            </Typography>
          </Stack>
          
          <ThemeToggle />
        </Stack>

        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25} sx={{ mt: { xs: 1.25, md: 2 } }}>
          <Button
            variant="outlined"
            onClick={() => router.push(`/order/recent?tableCode=${encodeURIComponent(tableCode)}`)}
            size="small"
            sx={{ borderRadius: "12px", width: { xs: "100%", sm: "fit-content" } }}
          >
            Recent Order Status
          </Button>
        </Stack>
      </Paper>

      {recentOrders.length ? (
        <Paper
          sx={{
            p: { xs: 2, md: 2.5 },
            borderRadius: "18px",
            border: "1px solid var(--border)",
            backgroundColor: "var(--card)",
          }}
        >
          <Stack spacing={2}>
            <Box>
              <Typography sx={{ fontWeight: 800 }}>
                Your Orders
              </Typography>
              <Typography sx={{ color: "var(--muted-foreground)" }}>
                {pendingOrder
                  ? "Add more items below, then confirm when you are ready."
                  : "Live status"}
              </Typography>
            </Box>

            <Stack spacing={1.5}>
              {orderedOrders.map((item) => {
                const current = recentOrderStatuses[item.sessionToken];
                const status = current?.status ?? "pending";
                const isPending = status === "pending";
                const canConfirm = current ? canCustomerConfirmOrder(current.status) : isPending;

                return (
                  <Paper
                    key={item.sessionToken}
                    sx={{
                      p: 2,
                      borderRadius: "16px",
                      border: isPending
                        ? "1.5px solid color-mix(in srgb, var(--primary) 55%, var(--border))"
                        : "1px solid var(--border)",
                      backgroundColor: "var(--background)",
                    }}
                  >
                    <Stack
                      direction={{ xs: "column", md: "row" }}
                      justifyContent="space-between"
                      alignItems={{ xs: "flex-start", md: "center" }}
                      spacing={1.25}
                    >
                      <Box sx={{ minWidth: 0 }}>
                        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                          <Typography sx={{ fontWeight: 800 }}>
                            Order #{item.orderId}
                          </Typography>
                          <Chip
                            size="small"
                            label={formatOrderStatusLabel(status)}
                            color={isPending ? "warning" : status === "served" ? "success" : "default"}
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
                        <Typography sx={{ color: "var(--muted-foreground)", fontSize: "0.82rem" }}>
                          Placed at {new Date(item.createdAt).toLocaleString()}
                        </Typography>
                        {current ? (
                          <Typography sx={{ color: "var(--muted-foreground)", fontSize: "0.82rem" }}>
                            {current.items.length} item{current.items.length === 1 ? "" : "s"} • Rs.{" "}
                            {Number.parseFloat(current.totalAmount).toFixed(2)}
                          </Typography>
                        ) : null}
                        {isPending ? (
                          <Typography sx={{ color: "var(--muted-foreground)", fontSize: "0.82rem" }}>
                            Not sent to the kitchen yet — you can still add items.
                          </Typography>
                        ) : null}
                      </Box>
                      <Stack direction="row" spacing={1} sx={{ flexShrink: 0 }}>
                        {canConfirm ? (
                          <Button
                            variant="contained"
                            disabled={confirmingToken === item.sessionToken}
                            onClick={() => handleConfirmPending(item.sessionToken)}
                            sx={{ borderRadius: "14px" }}
                          >
                            {confirmingToken === item.sessionToken ? "Confirming..." : "Confirm"}
                          </Button>
                        ) : null}
                        <Button
                          variant="outlined"
                          onClick={() => router.push(`/order/track/${item.sessionToken}`)}
                          sx={{ borderRadius: "14px" }}
                        >
                          Open
                        </Button>
                      </Stack>
                    </Stack>
                  </Paper>
                );
              })}
            </Stack>
          </Stack>
        </Paper>
      ) : null}
      {message ? (
        <Paper sx={{ p: 2, borderRadius: "18px", border: "1px solid var(--border)", backgroundColor: "var(--card)" }}>
          <Typography>{message}</Typography>
        </Paper>
      ) : null}

      <Box sx={{ display: "grid", gap: { xs: 1.25, md: 2 }, gridTemplateColumns: { xs: "1fr", lg: "minmax(0, 1fr) 360px" } }}>
        <Box sx={{ display: "grid", gap: { xs: 1.25, md: 2 }, minWidth: 0 }}>
          {loading ? (
            // Skeleton remains same
            Array.from({ length: 2 }, (_, categoryIndex) => (
              <Paper key={`menu-category-skeleton-${categoryIndex}`} sx={{ p: { xs: 2, md: 3 }, borderRadius: "22px", border: "1px solid var(--border)", backgroundColor: "var(--card)" }}>
                {/* Skeleton content unchanged */}
              </Paper>
            ))
          ) : !menu || menu.categories.length === 0 ? (
            <Paper sx={{ p: 3, borderRadius: "22px", border: "1px solid var(--border)", backgroundColor: "var(--card)" }}>
              <Typography sx={{ color: "var(--muted-foreground)" }}>No data found</Typography>
            </Paper>
          ) : null}

          {!loading && menu?.categories.length ? (
            <Paper
              elevation={0}
              sx={{
                position: { xs: "static", md: "sticky" },
                top: { md: 12 },
                zIndex: 5,
                p: { xs: 0.75, md: 1 },
                borderRadius: { xs: "16px", md: "18px" },
                border: "1px solid var(--border)",
                backgroundColor: "color-mix(in srgb, var(--card) 92%, transparent)",
                backdropFilter: "blur(10px)",
              }}
            >
              <Stack
                direction="row"
                spacing={0.75}
                useFlexGap
                flexWrap="wrap"
                sx={{
                  justifyContent: "flex-start",
                  maxHeight: { xs: 72, md: "none" },
                  overflowX: { xs: "auto", md: "visible" },
                  overflowY: "hidden",
                  alignContent: "flex-start",
                  scrollbarWidth: "none",
                  "&::-webkit-scrollbar": { display: "none" },
                }}
              >
                <Chip
                  clickable
                  label={`All (${flatItems.length})`}
                  onClick={() => setActiveCategoryId("all")}
                  sx={{
                    flexShrink: 0,
                    height: { xs: 32, md: 38 },
                    borderRadius: "999px",
                    fontWeight: 900,
                    fontSize: { xs: "0.76rem", md: "0.875rem" },
                    color: activeCategoryId === "all" ? "var(--primary-foreground)" : "var(--foreground)",
                    backgroundColor: activeCategoryId === "all" ? "var(--primary)" : "var(--background)",
                    border: "1px solid var(--border)",
                  }}
                />
                {menu.categories.map((category) => (
                  <Chip
                    key={category.id}
                    clickable
                    label={`${category.name} (${category.items.length})`}
                    onClick={() => setActiveCategoryId(category.id)}
                    sx={{
                      flexShrink: 0,
                      height: { xs: 32, md: 38 },
                      borderRadius: "999px",
                      fontWeight: 900,
                      fontSize: { xs: "0.76rem", md: "0.875rem" },
                      color: activeCategoryId === category.id ? "var(--primary-foreground)" : "var(--foreground)",
                      backgroundColor: activeCategoryId === category.id ? "var(--primary)" : "var(--background)",
                      border: "1px solid var(--border)",
                    }}
                  />
                ))}
              </Stack>
            </Paper>
          ) : null}

          {!loading &&
            visibleCategories.map((category) => (
              <Paper
                key={category.id}
                sx={{
                  p: { xs: 1.25, md: 3 },
                  borderRadius: { xs: "18px", md: "22px" },
                  border: "1px solid var(--border)",
                  backgroundColor: "var(--card)",
                  boxShadow: "0 10px 28px color-mix(in srgb, var(--foreground) 6%, transparent)",
                }}
              >
                <Stack spacing={{ xs: 1.25, md: 2 }}>
                  <Box>
                    <Typography variant="h5" sx={{ fontWeight: 800, fontSize: { xs: "1.05rem", md: "1.5rem" } }}>
                      {category.name}
                    </Typography>
                    {category.description && (
                      <Typography sx={{ color: "var(--muted-foreground)", mt: 0.35, fontSize: { xs: "0.82rem", md: "1rem" } }}>
                        {category.description}
                      </Typography>
                    )}
                  </Box>

                  {/* 2 Column Grid for Menu Items */}
                  <Box
                    sx={{
                      display: "grid",
                      gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)" },
                      gap: { xs: 1, md: 2 },
                    }}
                  >
                    {category.items.map((item) => {
                      const quantity = cart[item.id] ?? 0;
                      const imageSrc = resolveMenuImageUrl(item.imageUrl);

                      return (
                        <Paper
                          key={item.id}
                          sx={{
                            p: { xs: 1, md: 2 },
                            borderRadius: { xs: "15px", md: "18px" },
                            border: "1px solid var(--border)",
                            backgroundColor: "color-mix(in srgb, var(--card) 86%, var(--background) 14%)",
                          }}
                        >
                          <Stack direction="row" spacing={{ xs: 1, md: 2 }} alignItems="stretch">
                            <Box
                              component="button"
                              type="button"
                              onClick={() => setSelectedItem(item)}
                              aria-label={`View details for ${item.name}`}
                              sx={{
                                border: 0,
                                p: 0,
                                cursor: "pointer",
                                width: { xs: 82, sm: 108 },
                                minWidth: { xs: 82, sm: 108 },
                                height: { xs: 82, sm: 108 },
                                borderRadius: { xs: "13px", sm: "16px" },
                                overflow: "hidden",
                                backgroundColor: "var(--card)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                transition: "transform 180ms ease, box-shadow 180ms ease",
                                "&:hover": {
                                  transform: "translateY(-2px)",
                                  boxShadow: "0 12px 24px color-mix(in srgb, var(--foreground) 12%, transparent)",
                                },
                                "&:focus-visible": {
                                  outline: "3px solid color-mix(in srgb, var(--ring) 45%, transparent)",
                                  outlineOffset: "3px",
                                },
                              }}
                            >
                              {imageSrc ? (
                                <Box component="img" src={imageSrc} alt={item.name} sx={{ width: "100%", height: "100%", objectFit: "cover" }} />
                              ) : (
                                <Typography sx={{ color: "var(--muted-foreground)", fontWeight: 700 }}>
                                  {getFoodTypeLabel(item.foodType)}
                                </Typography>
                              )}
                            </Box>

                            <Stack flex={1} spacing={0.85} sx={{ minWidth: 0 }}>
                              <Stack direction="row" justifyContent="space-between" spacing={1}>
                                <Box sx={{ minWidth: 0 }}>
                                  <Typography sx={{ fontWeight: 800, fontSize: { xs: "0.92rem", md: "1rem" }, overflowWrap: "anywhere" }}>{item.name}</Typography>
                                  <Typography sx={{ color: "var(--muted-foreground)", fontSize: "0.82rem", mt: 0.25, display: { xs: "none", md: "block" } }}>
                                    {item.description || "Freshly prepared when ordered."}
                                  </Typography>
                                </Box>
                                <Typography sx={{ fontWeight: 900, fontSize: { xs: "0.86rem", md: "1rem" }, whiteSpace: "nowrap" }}>Rs. {item.price}</Typography>
                              </Stack>

                              <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
                                <Chip label={getFoodTypeLabel(item.foodType)} size="small" sx={{ fontWeight: 800, height: 26 }} />
                                <Stack direction="row" spacing={0.5} alignItems="center">
                                  <Button size="small" onClick={() => updateQuantity(item.id, quantity - 1)} sx={{ minWidth: 32, height: 32, borderRadius: "10px", px: 0 }}>
                                    -
                                  </Button>
                                  <Paper sx={{ px: 1, py: 0.55, borderRadius: "10px", minWidth: 34, textAlign: "center", fontWeight: 800 }}>
                                    {quantity}
                                  </Paper>
                                  <Button
                                    size="small"
                                    variant="contained"
                                    disabled={quantity >= MAX_ORDER_QUANTITY}
                                    onClick={() => updateQuantity(item.id, quantity + 1)}
                                    sx={{ minWidth: 32, height: 32, borderRadius: "10px", px: 0 }}
                                  >
                                    +
                                  </Button>
                                </Stack>
                              </Stack>
                            </Stack>
                          </Stack>
                        </Paper>
                      );
                    })}
                  </Box>
                </Stack>
              </Paper>
            ))}
        </Box>

        <Paper sx={{ display: { xs: "none", lg: "block" }, p: { xs: 2, md: 3 }, borderRadius: "22px", border: "1px solid var(--border)", backgroundColor: "var(--card)", height: "fit-content", position: { lg: "sticky" }, top: { lg: 24 } }}>
          <Stack spacing={2}>
            <Typography variant="h6" sx={{ fontWeight: 800 }}>
              Your Cart
            </Typography>
            {loading ? (
              <Stack spacing={1.25}>
                {Array.from({ length: 3 }, (_, index) => (
                  <Stack key={`cart-skeleton-${index}`} direction="row" justifyContent="space-between">
                    <Skeleton variant="text" width="55%" height={24} />
                    <Skeleton variant="text" width="25%" height={24} />
                  </Stack>
                ))}
              </Stack>
            ) : cartItems.length === 0 ? (
              <Typography sx={{ color: "var(--muted-foreground)" }}>No data found</Typography>
            ) : (
              <Stack spacing={1.25}>
                {cartItems.map((item) => (
                  <Stack key={item.id} direction="row" justifyContent="space-between">
                    <Typography>{item.quantity}x {item.name}</Typography>
                    <Typography sx={{ fontWeight: 700 }}>
                      Rs. {(Number.parseFloat(item.price) * item.quantity).toFixed(2)}
                    </Typography>
                  </Stack>
                ))}
              </Stack>
            )}

            <Divider />
            {orderTypeSelector}
            <TextField
              label="Remarks"
              multiline
              minRows={3}
              value={remarks}
              onChange={(event) => setRemarks(event.target.value)}
              placeholder="Less spicy, no onion, call waiter, etc."
            />
            <Stack direction="row" justifyContent="space-between">
              <Typography sx={{ fontWeight: 700 }}>Total</Typography>
              <Typography sx={{ fontWeight: 800 }}>Rs. {totalAmount.toFixed(2)}</Typography>
            </Stack>
            {pendingOrder ? (
              <Typography sx={{ color: "var(--muted-foreground)", fontSize: "0.82rem" }}>
                These items will be added to Order #{pendingOrder.id}.
              </Typography>
            ) : null}
            <Button
              variant="contained"
              disabled={placing || cartItems.length === 0}
              onClick={handlePlaceOrder}
              sx={{ borderRadius: "14px", py: 1.25 }}
            >
              {placing ? cartActionBusyLabel : cartActionLabel}
            </Button>
          </Stack>
        </Paper>
      </Box>

      {cartItems.length ? (
        <Box
          sx={{
            display: { xs: "block", lg: "none" },
            position: "fixed",
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 30,
            px: 1.25,
            pb: "calc(env(safe-area-inset-bottom) + 10px)",
            pointerEvents: "none",
          }}
        >
          <Paper
            elevation={0}
            sx={{
              pointerEvents: "auto",
              borderRadius: "22px",
              border: "1px solid var(--border)",
              backgroundColor: "color-mix(in srgb, var(--card) 96%, transparent)",
              backdropFilter: "blur(18px)",
              boxShadow: "0 18px 46px rgba(31, 42, 43, 0.22)",
              overflow: "hidden",
            }}
          >
            {mobileCartOpen ? (
              <Stack spacing={1.25} sx={{ p: 1.5, pb: 1 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Box>
                    <Typography sx={{ fontWeight: 900, fontSize: "1.05rem" }}>Your Cart</Typography>
                    <Typography sx={{ color: "var(--muted-foreground)", fontSize: "0.78rem" }}>
                      {cartItems.reduce((sum, item) => sum + item.quantity, 0)} items selected
                    </Typography>
                  </Box>
                  <Button size="small" onClick={() => setMobileCartOpen(false)} sx={{ borderRadius: "12px" }}>
                    Hide
                  </Button>
                </Stack>

                <Stack spacing={0.75} sx={{ maxHeight: 150, overflowY: "auto", pr: 0.5 }}>
                  {cartItems.map((item) => (
                    <Stack
                      key={item.id}
                      direction="row"
                      justifyContent="space-between"
                      spacing={1.5}
                      sx={{
                        p: 1,
                        borderRadius: "14px",
                        backgroundColor: "var(--background)",
                      }}
                    >
                      <Typography sx={{ fontWeight: 750, minWidth: 0, overflowWrap: "anywhere" }}>
                        {item.quantity}x {item.name}
                      </Typography>
                      <Typography sx={{ fontWeight: 800, flexShrink: 0 }}>
                        Rs. {(Number.parseFloat(item.price) * item.quantity).toFixed(2)}
                      </Typography>
                    </Stack>
                  ))}
                </Stack>

                {orderTypeSelector}

                <TextField
                  label="Remarks"
                  size="small"
                  multiline
                  minRows={2}
                  value={remarks}
                  onChange={(event) => setRemarks(event.target.value)}
                  placeholder="Less spicy, no onion, etc."
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      borderRadius: "14px",
                      backgroundColor: "var(--background)",
                    },
                  }}
                />
              </Stack>
            ) : null}

            <Stack
              direction="row"
              spacing={1}
              alignItems="center"
              sx={{
                p: 1,
                borderTop: mobileCartOpen ? "1px solid var(--border)" : "none",
              }}
            >
              <Button
                variant="outlined"
                onClick={() => setMobileCartOpen((current) => !current)}
                sx={{
                  minWidth: 0,
                  flex: "0 0 42%",
                  borderRadius: "16px",
                  minHeight: 50,
                  display: "grid",
                  lineHeight: 1.05,
                  textTransform: "none",
                }}
              >
                <Box component="span" sx={{ fontWeight: 900 }}>
                  Rs. {totalAmount.toFixed(2)}
                </Box>
                <Box component="span" sx={{ fontSize: "0.7rem", color: "var(--muted-foreground)", fontWeight: 800 }}>
                  View cart
                </Box>
              </Button>
              <Button
                variant="contained"
                disabled={placing || cartItems.length === 0}
                onClick={handlePlaceOrder}
                sx={{
                  flex: 1,
                  borderRadius: "16px",
                  minHeight: 50,
                  fontWeight: 900,
                  textTransform: "none",
                }}
              >
                {placing ? cartActionBusyLabel : cartActionLabel}
              </Button>
            </Stack>
          </Paper>
        </Box>
      ) : null}

      <Dialog
        open={Boolean(selectedItem)}
        onClose={() => setSelectedItem(null)}
        fullWidth
        maxWidth="sm"
        PaperProps={{
          sx: {
            borderRadius: "24px",
            overflow: "hidden",
            border: "1px solid var(--border)",
            backgroundColor: "var(--card)",
          },
        }}
      >
        {selectedItem ? (
          <>
            <DialogTitle sx={{ fontWeight: 900, pb: 1 }}>
              {selectedItem.name}
            </DialogTitle>
            <DialogContent sx={{ display: "grid", gap: 2, pt: 1 }}>
              <Box
                sx={{
                  minHeight: { xs: 240, sm: 340 },
                  maxHeight: { xs: "58vh", sm: "64vh" },
                  borderRadius: "20px",
                  overflow: "auto",
                  backgroundColor: "var(--background)",
                  display: "grid",
                  placeItems: "center",
                  border: "1px solid var(--border)",
                }}
              >
                {resolveMenuImageUrl(selectedItem.imageUrl) ? (
                  <Box
                    component="img"
                    src={resolveMenuImageUrl(selectedItem.imageUrl) ?? undefined}
                    alt={selectedItem.name}
                    sx={{
                      width: "100%",
                      height: "100%",
                      maxHeight: { xs: "58vh", sm: "64vh" },
                      objectFit: "contain",
                      display: "block",
                    }}
                  />
                ) : (
                  <Typography sx={{ color: "var(--muted-foreground)", fontWeight: 800 }}>
                    {getFoodTypeLabel(selectedItem.foodType)}
                  </Typography>
                )}
              </Box>

              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                <Chip label={getFoodTypeLabel(selectedItem.foodType)} sx={{ fontWeight: 800 }} />
                <Chip label={`Rs. ${selectedItem.price}`} color="primary" sx={{ fontWeight: 900 }} />
              </Stack>

              <Typography sx={{ color: "var(--muted-foreground)", lineHeight: 1.7 }}>
                {selectedItem.description || "Freshly prepared after you place the order."}
              </Typography>
            </DialogContent>
            <DialogActions sx={{ p: 2, pt: 0 }}>
              <Button onClick={() => setSelectedItem(null)} sx={{ borderRadius: "12px" }}>
                Close
              </Button>
              <Button
                variant="contained"
                disabled={(cart[selectedItem.id] ?? 0) >= MAX_ORDER_QUANTITY}
                onClick={() => {
                  updateQuantity(selectedItem.id, (cart[selectedItem.id] ?? 0) + 1);
                  setSelectedItem(null);
                }}
                sx={{ borderRadius: "12px" }}
              >
                Add to Cart
              </Button>
            </DialogActions>
          </>
        ) : null}
      </Dialog>
    </Box>
  );
}
