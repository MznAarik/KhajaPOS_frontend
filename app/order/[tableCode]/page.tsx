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
  IconButton,
  Paper,
  Skeleton,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import RemoveRoundedIcon from "@mui/icons-material/RemoveRounded";
import { Rating } from "@mui/material";
import { MessageSquareQuote } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import {
  canCustomerCancelOrder,
  canCustomerConfirmOrder,
  cancelPublicOrder,
  completePublicOrder,
  confirmPublicOrder,
  touchPublicPresence,
  FOOD_FILTER_LABELS,
  FOOD_FILTER_ORDER,
  getFoodTypeLabel,
  getOrderTypeLabel,
  getPublicMenu,
  getPublicTableOrders,
  isOrderLocked,
  matchesFoodFilter,
  placePublicOrder,
  resolveMenuImageUrl,
  type FoodFilterKey,
  type KitchenOrder,
  type OrderStatus,
  type OrderType,
  type PublicMenuItem,
  type PublicTableMenu,
} from "@/lib/api";
import ThemeToggle from "@/components/common/ThemeToggle";
import { useAppSnackbar } from "@/components/common/SnackBar";
import { submitReview } from "@/lib/reviews";

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
const MAX_INLINE_ORDERS = 2;
const getLatestOrderStorageKey = (tableId: number | string) => `khajapos-latest-order:${tableId}`;
const getOrderListStorageKey = (tableId: number | string) => `khajapos-order-list:${tableId}`;
const getRecentOrderStorageKey = (tableId: number | string) => `khajapos-recent-order:${tableId}`;
const getOrderSessionTableCodeKey = (sessionToken: string) => `khajapos-order-session-table:${sessionToken}`;
const getOrderTypeStorageKey = (tableCode: string) => `khajapos-order-type:${tableCode}`;
const MAX_ORDER_QUANTITY = 10;
const MENU_REFRESH_INTERVAL = 120000;

const formatOrderStatusLabel = (status: string) =>
  status
    .replace(/_/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());

const ORDER_STATUS_FLOW: OrderStatus[] = ["pending", "confirmed", "preparing", "ready", "served"];

const orderStatusAccent = (status: OrderStatus) => {
  switch (status) {
    case "pending":
      return "var(--status-pending-fg)";
    case "confirmed":
      return "var(--status-confirmed-fg)";
    case "preparing":
      return "var(--status-preparing-fg)";
    case "ready":
      return "var(--status-ready-fg)";
    case "served":
      return "var(--status-served-fg)";
    case "cancelled":
      return "var(--status-cancelled-fg)";
    default:
      return "var(--muted-foreground)";
  }
};

function StatusChip({ status }: { status: OrderStatus }) {
  const accent = orderStatusAccent(status);
  return (
    <Box
      component="span"
      sx={{
        display: "inline-flex",
        alignItems: "center",
        gap: "5px",
        px: "9px",
        py: "2px",
        borderRadius: "999px",
        fontSize: "0.72rem",
        fontWeight: 800,
        letterSpacing: "0.02em",
        color: accent,
        backgroundColor: `color-mix(in srgb, ${accent} 14%, transparent)`,
        border: `1px solid color-mix(in srgb, ${accent} 42%, transparent)`,
        whiteSpace: "nowrap",
      }}
    >
      <Box component="span" sx={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: accent }} />
      {formatOrderStatusLabel(status)}
    </Box>
  );
}

function OrderStatusTimeline({ status }: { status: OrderStatus }) {
  if (status === "cancelled") {
    return (
      <Box
        sx={{
          px: 1.25,
          py: 0.75,
          borderRadius: "12px",
          fontSize: "0.78rem",
          fontWeight: 700,
        color: "var(--status-cancelled-fg)",
        backgroundColor: "color-mix(in srgb, var(--status-cancelled-fg) 10%, transparent)",
        border: "1px solid color-mix(in srgb, var(--status-cancelled-fg) 38%, transparent)",
        }}
      >
        This order was cancelled.
      </Box>
    );
  }

  const activeIndex = ORDER_STATUS_FLOW.indexOf(status);
  return (
    <Stack direction="row" spacing={0.75} alignItems="center" sx={{ flexWrap: "wrap", rowGap: 0.75 }}>
      {ORDER_STATUS_FLOW.map((step, index) => {
        const reached = index <= activeIndex;
        const accent = reached ? orderStatusAccent(step) : "var(--border)";
        const isCurrent = index === activeIndex;
        return (
          <Stack key={step} direction="row" spacing={0.75} alignItems="center">
            <Stack direction="row" spacing={0.5} alignItems="center">
              <Box
                component="span"
                sx={{
                  width: isCurrent ? 9 : 7,
                  height: isCurrent ? 9 : 7,
                  borderRadius: "50%",
                  backgroundColor: reached ? accent : "transparent",
                  border: `1.5px solid ${reached ? accent : "color-mix(in srgb, var(--muted-foreground) 40%, transparent)"}`,
                }}
              />
              <Typography
                sx={{
                  fontSize: "0.72rem",
                  fontWeight: reached ? 800 : 600,
                  color: reached ? accent : "var(--muted-foreground)",
                  whiteSpace: "nowrap",
                }}
              >
                {formatOrderStatusLabel(step)}
              </Typography>
            </Stack>
            {index < ORDER_STATUS_FLOW.length - 1 ? (
              <Box
                component="span"
                sx={{
                  width: { xs: 10, sm: 18 },
                  height: 2,
                  borderRadius: "2px",
                  backgroundColor:
                    index < activeIndex ? orderStatusAccent(ORDER_STATUS_FLOW[index + 1]) : "color-mix(in srgb, var(--muted-foreground) 28%, transparent)",
                }}
              />
            ) : null}
          </Stack>
        );
      })}
    </Stack>
  );
}

const formatPrice = (value: string | number) => {
  const numeric = typeof value === "number" ? value : Number.parseFloat(value || "0");
  return Number.isNaN(numeric) ? "0.00" : numeric.toFixed(2);
};

const vegMarkTone = {
  veg: { color: "var(--food-veg)", label: "Veg" },
  vegan: { color: "var(--food-vegan)", label: "Vegan" },
  egg: { color: "var(--food-egg)", label: "Egg" },
  "non-veg": { color: "var(--food-nonveg)", label: "Non-veg" },
} as const;

function VegMark({ foodType }: { foodType: PublicMenuItem["foodType"] }) {
  const tone = vegMarkTone[foodType] ?? vegMarkTone.veg;
  const isTriangle = foodType === "non-veg" || foodType === "egg";

  return (
    <Stack direction="row" spacing={0.6} alignItems="center" sx={{ minWidth: 0 }}>
      <Box
        aria-hidden
        sx={{
          width: 14,
          height: 14,
          flexShrink: 0,
          borderRadius: "3px",
          border: `1.5px solid ${tone.color}`,
          display: "grid",
          placeItems: "center",
        }}
      >
        {isTriangle ? (
          <Box
            sx={{
              width: 0,
              height: 0,
              borderLeft: "4px solid transparent",
              borderRight: "4px solid transparent",
              borderBottom: `7px solid ${tone.color}`,
            }}
          />
        ) : (
          <Box sx={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: tone.color }} />
        )}
      </Box>
      <Typography
        component="span"
        sx={{
          fontSize: "0.68rem",
          fontWeight: 800,
          letterSpacing: "0.05em",
          textTransform: "uppercase",
          color: tone.color,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {tone.label}
      </Typography>
    </Stack>
  );
}

const qtyBumpSx = {
  display: "inline-block",
  animation: "khajapos-qty-bump 280ms cubic-bezier(0.34, 1.56, 0.64, 1)",
  "@keyframes khajapos-qty-bump": {
    "0%": { transform: "scale(0.55)" },
    "60%": { transform: "scale(1.3)" },
    "100%": { transform: "scale(1)" },
  },
} as const;

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
  const [bestSellersOpen, setBestSellersOpen] = React.useState(false);
  const [reviewOpen, setReviewOpen] = React.useState(false);
  const [reviewRating, setReviewRating] = React.useState<number | null>(5);
  const [reviewName, setReviewName] = React.useState("");
  const [reviewEmail, setReviewEmail] = React.useState("");
  const [reviewComment, setReviewComment] = React.useState("");
  const [reviewSubmitting, setReviewSubmitting] = React.useState(false);
  const [reviewSubmitted, setReviewSubmitted] = React.useState(false);
  const [selectedItem, setSelectedItem] = React.useState<PublicMenuItem | null>(null);
  const [detailQty, setDetailQty] = React.useState(1);

  React.useEffect(() => {
    setDetailQty(1);
  }, [selectedItem]);
  const [activeCategoryId, setActiveCategoryId] = React.useState<number | "all">("all");
  const [foodFilter, setFoodFilter] = React.useState<FoodFilterKey>("all");
  const [confirmingToken, setConfirmingToken] = React.useState<string | null>(null);
  const [cancellingToken, setCancellingToken] = React.useState<string | null>(null);
  const [completingToken, setCompletingToken] = React.useState<string | null>(null);
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
    let isCancelled = false;
    let timeout: number | undefined;
    let lastMenuFetchAt = 0;
    let menuFetchInProgress: Promise<void> | null = null;

    const loadMenu = async (silent: boolean) => {
      if (menuFetchInProgress) return menuFetchInProgress;
      const request = (async () => {
        if (!silent) setLoading(true);
        try {
          const data = await getPublicMenu(tableCode);
          if (isCancelled) return;
          setMenu(data);
          setMessage("");
          lastMenuFetchAt = Date.now();
        } catch (error) {
          console.error("Failed to load public menu:", error);
          if (!silent && !isCancelled) {
            setMessage("We couldn't load this table menu right now.");
          }
        } finally {
          if (!silent && !isCancelled) setLoading(false);
          menuFetchInProgress = null;
        }
      })();
      menuFetchInProgress = request;
      return request;
    };

    const scheduleNext = () => {
      timeout = window.setTimeout(async () => {
        if (document.visibilityState === "visible") await loadMenu(true);
        if (!isCancelled) scheduleNext();
      }, MENU_REFRESH_INTERVAL);
    };

    loadMenu(false).then(() => {
      if (!isCancelled) scheduleNext();
    });

    const handleVisibility = () => {
      if (
        document.visibilityState === "visible" &&
        Date.now() - lastMenuFetchAt >= MENU_REFRESH_INTERVAL
      ) {
        void loadMenu(true);
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      isCancelled = true;
      if (timeout) window.clearTimeout(timeout);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [tableCode]);

  React.useEffect(() => {
    if (!tableId) {
      setRecentOrders([]);
      setRecentOrderStatuses({});
      return;
    }

    let timeout: number | undefined;
    let isCancelled = false;
    const ORDER_STATUS_POLL_MS = 15000;

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

    const scheduleNext = (delay: number) => {
      window.clearTimeout(timeout);
      if (!isCancelled) {
        timeout = window.setTimeout(tick, delay);
      }
    };

    const tick = async () => {
      if (isCancelled) return;

      if (document.visibilityState !== "visible") {
        scheduleNext(ORDER_STATUS_POLL_MS);
        return;
      }

      const shouldKeepPolling = await refreshTableOrders();
      if (isCancelled) return;
      if (shouldKeepPolling) scheduleNext(ORDER_STATUS_POLL_MS);
    };

    const onVisible = () => {
      if (document.visibilityState === "visible" && !isCancelled) {
        void tick();
      }
    };

    void tick();
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      isCancelled = true;
      window.clearTimeout(timeout);
      document.removeEventListener("visibilitychange", onVisible);
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

  const scopedCategories = React.useMemo(() => {
    if (!menu) return [];
    if (activeCategoryId === "all") return menu.categories;
    return menu.categories.filter((category) => category.id === activeCategoryId);
  }, [activeCategoryId, menu]);

  const visibleCategories = React.useMemo(() => {
    if (foodFilter === "all") return scopedCategories;
    return scopedCategories
      .map((category) => ({
        ...category,
        items: category.items.filter((item) =>
          matchesFoodFilter(item.foodType, foodFilter, { name: item.name, category: category.name }),
        ),
      }))
      .filter((category) => category.items.length > 0);
  }, [foodFilter, scopedCategories]);

  const foodFilterCounts: Record<FoodFilterKey, number> = React.useMemo(() => {
    const items = scopedCategories.flatMap((category) =>
      category.items.map((item) => ({ item, categoryName: category.name })),
    );
    return FOOD_FILTER_ORDER.reduce(
      (counts, key) => {
        counts[key] = items.filter(({ item, categoryName }) =>
          matchesFoodFilter(item.foodType, key, { name: item.name, category: categoryName }),
        ).length;
        return counts;
      },
      { all: items.length, veg: 0, "non-veg": 0, drinks: 0, others: 0 } as Record<FoodFilterKey, number>
    );
  }, [scopedCategories]);

  React.useEffect(() => {
    if (!menu) return;
    if (activeCategoryId !== "all" && !menu.categories.some((category) => category.id === activeCategoryId)) {
      setActiveCategoryId("all");
    }
  }, [menu, activeCategoryId]);

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

  const handleCancelPending = async (sessionToken: string) => {
    if (cancellingToken) return;

    setCancellingToken(sessionToken);
    try {
      const updated = await cancelPublicOrder(sessionToken);
      setRecentOrderStatuses((current) => ({ ...current, [sessionToken]: updated }));
      showSnackbar("Order cancelled.", "success");
    } catch (error) {
      console.error("Failed to cancel order:", error);
      showSnackbar("This order can no longer be cancelled.", "warning");
    } finally {
      setCancellingToken(null);
    }
  };

  const handleCompleteOrder = async (sessionToken: string) => {
    if (completingToken) return;

    setCompletingToken(sessionToken);
    try {
      const updated = await completePublicOrder(sessionToken);
      setRecentOrderStatuses((current) => ({ ...current, [sessionToken]: updated }));
      setOrderRefreshKey((current) => current + 1);
      showSnackbar("Thanks! Your table is now free.", "success");
    } catch (error) {
      console.error("Failed to complete order:", error);
      showSnackbar("This order cannot be completed yet.", "warning");
    } finally {
      setCompletingToken(null);
    }
  };

  const heartbeatKey = React.useMemo(
    () =>
      recentOrders
        .map((item) => {
          const status = recentOrderStatuses[item.sessionToken]?.status ?? "pending";
          return `${item.sessionToken}:${status}`;
        })
        .filter((entry) => {
          const status = entry.slice(entry.indexOf(":") + 1);
          return status !== "closed" && status !== "cancelled";
        })
        .join("|"),
    [recentOrders, recentOrderStatuses]
  );

  React.useEffect(() => {
    if (!heartbeatKey) return;

    const tokens = heartbeatKey
      .split("|")
      .map((entry) => entry.slice(0, entry.indexOf(":")));

    const beat = () => {
      tokens.forEach((token) => {
        touchPublicPresence(token).catch(() => undefined);
      });
    };

    beat();
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") beat();
    }, 45000);

    const onVisible = () => {
      if (document.visibilityState === "visible") {
        beat();
      }
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [heartbeatKey]);

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
        aria-label="Choose dine here or takeaway"
        sx={{ borderRadius: "14px" }}
      >
        <ToggleButton value="dine_in" sx={{ fontWeight: 800, textTransform: "none", py: 1 }}>
          Dine Here
        </ToggleButton>
        <ToggleButton value="takeaway" sx={{ fontWeight: 800, textTransform: "none", py: 1 }}>
          Takeaway
        </ToggleButton>
      </ToggleButtonGroup>
      <Typography sx={{ color: "var(--muted-foreground)", fontSize: "0.78rem" }}>
        {orderType === "takeaway"
          ? "Your order will be prepared for takeaway and packed to go."
          : "Your order will be freshly prepared and served at your table."}
      </Typography>
    </Stack>
  );

  const compactOrderTypeSelector = (
    <ToggleButtonGroup
      exclusive
      fullWidth
      size="small"
      value={orderType}
      onChange={(_event, next: OrderType | null) => {
        if (next) setOrderType(next);
      }}
      aria-label="Choose dine here or takeaway"
      sx={{
        borderRadius: "14px",
        gap: 0.75,
        "& .MuiToggleButtonGroup-grouped": {
          border: "1px solid var(--border) !important",
          borderRadius: "12px !important",
          flex: 1,
          py: 0.65,
          fontWeight: 900,
          textTransform: "none",
          color: "var(--foreground)",
          backgroundColor: "var(--background)",
        },
        "& .Mui-selected": {
          backgroundColor: "var(--primary) !important",
          color: "var(--primary-foreground) !important",
        },
      }}
    >
      <ToggleButton value="dine_in">Dine Here</ToggleButton>
      <ToggleButton value="takeaway">Takeaway</ToggleButton>
    </ToggleButtonGroup>
  );


  return (
    <Box
      sx={{
        minHeight: "100vh",
        backgroundColor: "transparent",
        backgroundImage: "none",
        color: "var(--foreground)",
        p: { xs: 1, md: 3 },
        pb: {
          xs: cartItems.length
            ? mobileCartOpen
              ? "calc(300px + env(safe-area-inset-bottom))"
              : "calc(190px + env(safe-area-inset-bottom))"
            : 1,
          lg: 3,
        },
        display: "grid",
        gridTemplateColumns: "minmax(0, 1fr)",
        alignContent: "start",
        width: "100%",
        maxWidth: "100%",
        gap: { xs: 1.25, md: 2 },
      }}
    >
      <Paper
        sx={{
          p: { xs: 1.5, md: 3 },
          borderRadius: { xs: "18px", md: "24px" },
          border: "1px solid var(--border)",
          backgroundColor: "var(--muted)",
          boxShadow: "0 14px 34px color-mix(in srgb, var(--foreground) 8%, transparent)",
        }}
      >
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
          {/* Left Side */}
          <Stack spacing={1} sx={{ flex: 1 }}>
            {loading ? (
              <Skeleton variant="rounded" width={140} height={14} sx={{ borderRadius: "999px" }} />
            ) : menu?.business?.name ? (
              <Stack direction="row" spacing={1.25} alignItems="center">
                {menu.business.logo ? (
                  <Box
                    component="img"
                    src={resolveMenuImageUrl(menu.business.logo) ?? undefined}
                    alt=""
                    sx={{
                      width: { xs: 26, md: 30 },
                      height: { xs: 26, md: 30 },
                      borderRadius: "8px",
                      objectFit: "cover",
                      border: "1px solid var(--border)",
                      flexShrink: 0,
                    }}
                  />
                ) : null}
                <Typography
                  sx={{
                    fontSize: { xs: "0.7rem", md: "0.78rem" },
                    fontWeight: 900,
                    letterSpacing: "0.2em",
                    textTransform: "uppercase",
                    color: "var(--primary)",
                  }}
                >
                  {menu.business.name}
                </Typography>
              </Stack>
            ) : null}
            {loading ? (
              <Skeleton variant="rounded" width={124} height={32} sx={{ borderRadius: "999px" }} />
            ) : (
              <Chip
                label={"Table: " + (menu?.table?.tableNo ?? "—")}
                sx={{ width: "fit-content", fontWeight: 800 }}
              />
            )}

            <Stack
              direction="row"
              spacing={1.5}
              alignItems={{ xs: "stretch", sm: "center" }}
              justifyContent="space-between"
              flexWrap="wrap"
              useFlexGap
            >
              <Typography variant="h4" sx={{ fontWeight: 800, fontSize: { xs: "1.28rem", md: "2.4rem" } }}>
                Order from your table
              </Typography>
            </Stack>

            <Typography sx={{ color: "var(--muted-foreground)", maxWidth: 720, fontSize: { xs: "0.84rem", md: "1rem" } }}>
              {pendingOrder
                ? `Order #${pendingOrder.id} is waiting. Add more items, then confirm when you are ready.`
                : "Pick a category, add items, place order."}
            </Typography>

            <Stack direction="row" spacing={0.75} alignItems="center">
              <Box
                component="span"
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  backgroundColor: "var(--accent)",
                  boxShadow: "0 0 0 0 color-mix(in srgb, var(--accent) 60%, transparent)",
                  animation: "khajapos-live-pulse 2s infinite",
                  "@keyframes khajapos-live-pulse": {
                    "0%": { boxShadow: "0 0 0 0 color-mix(in srgb, var(--accent) 55%, transparent)" },
                    "70%": { boxShadow: "0 0 0 7px color-mix(in srgb, var(--accent) 0%, transparent)" },
                    "100%": { boxShadow: "0 0 0 0 color-mix(in srgb, var(--accent) 0%, transparent)" },
                  },
                }}
              />
              <Typography sx={{ color: "var(--muted-foreground)", fontSize: { xs: "0.74rem", md: "0.82rem" }, fontWeight: 700 }}>
                Live menu — updates automatically
              </Typography>
            </Stack>
          </Stack>
          
          <ThemeToggle />
        </Stack>
      </Paper>

      <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
        {menu?.topProducts.length ? (
          <Button
            variant="outlined"
            size="small"
            onClick={() => {
              setMobileCartOpen(false);
              setBestSellersOpen(true);
            }}
            sx={{ minHeight: 42, borderRadius: "12px", px: 1.5, fontWeight: 850, textTransform: "none" }}
          >
            Our best-selling foods
          </Button>
        ) : null}
        {menu?.business?.id ? (
          <Button
            variant="outlined"
            size="small"
            startIcon={<MessageSquareQuote size={18} />}
            onClick={() => {
              setReviewSubmitted(false);
              setReviewOpen(true);
            }}
            sx={{ minHeight: 42, borderRadius: "12px", px: 1.5, fontWeight: 850, textTransform: "none" }}
          >
            Write a review
          </Button>
        ) : null}
      </Stack>

      {recentOrders.length ? (
        <Paper
          sx={{
            p: { xs: 2, md: 2.5 },
            borderRadius: "18px",
            border: "1px solid var(--border)",
            backgroundColor: "var(--muted)",
          }}
        >
          <Stack spacing={2}>
            <Box>
              <Typography sx={{ fontWeight: 800 }}>
                {pendingOrder ? "Your current order" : "Your orders"}
              </Typography>
              <Typography sx={{ color: "var(--muted-foreground)" }}>
                {pendingOrder
                  ? "Not sent to the kitchen yet — add more items below, then confirm when you are ready."
                  : "Live status updates automatically."}
              </Typography>
            </Box>

            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))" },
                gap: 1.5,
                alignContent: "start",
              }}
            >
              {orderedOrders.slice(0, MAX_INLINE_ORDERS).map((item) => {
                const current = recentOrderStatuses[item.sessionToken];
                const status: OrderStatus = current?.status ?? "pending";
                const accent = orderStatusAccent(status);
                const isPending = status === "pending";
                const isCancelled = status === "cancelled";
                const canConfirm = current ? canCustomerConfirmOrder(current.status) : isPending;
                const canCancel = current ? canCustomerCancelOrder(current.status) : isPending;
                const canComplete = status === "served";
                const isConfirming = confirmingToken === item.sessionToken;
                const isCancelling = cancellingToken === item.sessionToken;
                const isCompleting = completingToken === item.sessionToken;

                return (
                  <Paper
                    key={item.sessionToken}
                    sx={{
                      p: 2,
                      borderRadius: "16px",
                      border: "1px solid color-mix(in srgb, var(--border) 70%, transparent)",
                      borderLeft: `4px solid ${accent}`,
                      backgroundColor: "var(--muted)",
                      opacity: isCancelled ? 0.82 : 1,
                    }}
                  >
                    <Stack spacing={1.25}>
                      <Stack
                        direction={{ xs: "column", md: "row" }}
                        justifyContent="space-between"
                        alignItems={{ xs: "flex-start", md: "center" }}
                        spacing={1}
                      >
                        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                          <Typography sx={{ fontWeight: 800 }}>
                            Order #{item.orderId}
                          </Typography>
                          <StatusChip status={status} />
                          {current ? (
                            <Chip
                              size="small"
                              variant="outlined"
                              label={getOrderTypeLabel(current.orderType)}
                              sx={{ fontWeight: 800 }}
                            />
                          ) : null}
                        </Stack>
                        {current ? (
                          <Typography sx={{ fontWeight: 800, fontSize: "0.98rem" }}>
                            Rs. {formatPrice(current.totalAmount)}
                          </Typography>
                        ) : null}
                      </Stack>

                      <OrderStatusTimeline status={status} />

                      {current && current.items.length ? (
                        <Stack spacing={0.5}>
                          {current.items.map((orderItem, index) => (
                            <Stack
                              key={`${item.sessionToken}-${orderItem.id ?? index}`}
                              direction="row"
                              justifyContent="space-between"
                              spacing={1}
                            >
                              <Typography sx={{ fontSize: "0.82rem", color: "var(--muted-foreground)" }}>
                                {orderItem.quantity} × {orderItem.name}
                              </Typography>
                              <Typography sx={{ fontSize: "0.82rem", fontWeight: 700, flexShrink: 0 }}>
                                Rs. {formatPrice(Number.parseFloat(orderItem.price || "0") * orderItem.quantity)}
                              </Typography>
                            </Stack>
                          ))}
                        </Stack>
                      ) : null}

                      <Typography sx={{ color: "var(--muted-foreground)", fontSize: "0.78rem" }}>
                        Placed at {new Date(item.createdAt).toLocaleString()}
                      </Typography>

                      {(canConfirm || canCancel || canComplete) ? (
                        <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ pt: 0.25 }}>
                          {canConfirm ? (
                            <Button
                              variant="contained"
                              disabled={isConfirming || isCancelling || isCompleting}
                              onClick={() => handleConfirmPending(item.sessionToken)}
                              sx={{ borderRadius: "12px" }}
                            >
                              {isConfirming ? "Confirming..." : "Confirm order"}
                            </Button>
                          ) : null}
                          {canCancel ? (
                            <Button
                              variant="outlined"
                              color="error"
                              disabled={isConfirming || isCancelling || isCompleting}
                              onClick={() => handleCancelPending(item.sessionToken)}
                              sx={{ borderRadius: "12px" }}
                            >
                              {isCancelling ? "Cancelling..." : "Cancel order"}
                            </Button>
                          ) : null}
                          {canComplete ? (
                            <Button
                              variant="contained"
                              color="success"
                              disabled={isConfirming || isCancelling || isCompleting}
                              onClick={() => handleCompleteOrder(item.sessionToken)}
                              sx={{ borderRadius: "12px", fontWeight: 800 }}
                            >
                              {isCompleting ? "Finishing..." : "I'm done — free the table"}
                            </Button>
                          ) : null}
                        </Stack>
                      ) : null}
                    </Stack>
                  </Paper>
                );
              })}
            </Box>

            {orderedOrders.length > MAX_INLINE_ORDERS ? (
              <Button
                variant="outlined"
                onClick={() => router.push(`/order/recent?tableCode=${encodeURIComponent(tableCode)}`)}
                endIcon={
                  <Box component="span" sx={{ fontWeight: 900 }}>
                    →
                  </Box>
                }
                sx={{
                  alignSelf: { xs: "stretch", sm: "flex-start" },
                  borderRadius: "14px",
                  textTransform: "none",
                  fontWeight: 800,
                }}
              >
                Recent orders ({orderedOrders.length})
              </Button>
            ) : null}
          </Stack>
        </Paper>
      ) : null}
      {message ? (
        <Paper sx={{ p: 2, borderRadius: "18px", border: "1px solid var(--border)", backgroundColor: "var(--muted)" }}>
          <Typography>{message}</Typography>
        </Paper>
      ) : null}

      <Box sx={{ display: "grid", gap: { xs: 1.25, md: 2 }, alignContent: "start", gridTemplateColumns: { xs: "minmax(0, 1fr)", lg: "minmax(0, 1fr) 360px" } }}>
        <Box sx={{ display: "grid", gap: { xs: 1.25, md: 2 }, alignContent: "start", minWidth: 0, gridTemplateColumns: "minmax(0, 1fr)" }}>
          {loading ? (
            <Stack spacing={{ xs: 1.25, md: 2 }}>
              <Paper
                sx={{
                  p: { xs: 0.75, md: 1 },
                  borderRadius: { xs: "16px", md: "18px" },
                  border: "1px solid var(--border)",
                  backgroundColor: "var(--muted)",
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  flexWrap: "wrap",
                }}
              >
                <Skeleton variant="rounded" width={44} height={14} />
                <Stack direction="row" spacing={0.75}>
                  {[60, 54, 78, 64].map((width, index) => (
                    <Skeleton
                      key={`diet-skeleton-${index}`}
                      variant="rounded"
                      width={width}
                      height={30}
                      sx={{ borderRadius: "999px" }}
                    />
                  ))}
                </Stack>
              </Paper>

              <Paper
                sx={{
                  p: { xs: 0.75, md: 1 },
                  borderRadius: { xs: "16px", md: "18px" },
                  border: "1px solid var(--border)",
                  backgroundColor: "var(--muted)",
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  overflow: "hidden",
                }}
              >
                <Skeleton variant="rounded" width={48} height={14} />
                <Stack direction="row" spacing={0.75}>
                  {[66, 82, 74, 90, 62].map((width, index) => (
                    <Skeleton
                      key={`chip-skeleton-${index}`}
                      variant="rounded"
                      width={width}
                      height={32}
                      sx={{ borderRadius: "999px" }}
                    />
                  ))}
                </Stack>
              </Paper>

              {Array.from({ length: 2 }, (_, categoryIndex) => (
                <Paper
                  key={`menu-category-skeleton-${categoryIndex}`}
                  sx={{
                    p: { xs: 1.25, md: 3 },
                    borderRadius: { xs: "18px", md: "22px" },
                    border: "1px solid var(--border)",
                    backgroundColor: "var(--muted)",
                    boxShadow: "0 10px 28px color-mix(in srgb, var(--foreground) 6%, transparent)",
                  }}
                >
                  <Stack spacing={{ xs: 1.25, md: 2 }}>
                    <Stack direction="row" spacing={1.25} alignItems="center">
                      <Skeleton variant="circular" width={8} height={8} />
                      <Skeleton variant="rounded" sx={{ width: { xs: "48%", sm: "30%" } }} height={18} />
                      <Box sx={{ flex: 1, minWidth: 20, height: "1px", backgroundColor: "var(--border)" }} />
                      <Skeleton variant="rounded" width={54} height={12} />
                    </Stack>

                    <Box
                      sx={{
                        display: "grid",
                        gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)" },
                        gap: { xs: 1, md: 2 },
                      }}
                    >
                      {Array.from({ length: 4 }, (_, itemIndex) => (
                        <Paper
                          key={`item-skeleton-${categoryIndex}-${itemIndex}`}
                          sx={{
                            p: { xs: 1, md: 2 },
                            borderRadius: { xs: "15px", md: "18px" },
                            border: "1px solid var(--border)",
                            backgroundColor: "var(--muted)",
                          }}
                        >
                          <Stack direction="row" spacing={{ xs: 1, md: 2 }} alignItems="stretch">
                            <Skeleton
                              variant="rounded"
                              sx={{
                                width: { xs: 82, sm: 108 },
                                height: { xs: 82, sm: 108 },
                                borderRadius: { xs: "13px", sm: "16px" },
                                flexShrink: 0,
                              }}
                            />
                            <Stack spacing={0.75} sx={{ flex: 1, minWidth: 0, py: 0.25 }}>
                              <Skeleton variant="rounded" width="70%" height={16} />
                              <Skeleton variant="text" width="92%" height={13} />
                              <Skeleton variant="text" width="58%" height={13} />
                              <Stack
                                direction="row"
                                alignItems="center"
                                justifyContent="space-between"
                                sx={{ mt: "auto" }}
                              >
                                <Skeleton variant="rounded" width={66} height={16} />
                                <Skeleton variant="rounded" width={72} height={30} sx={{ borderRadius: "999px" }} />
                              </Stack>
                            </Stack>
                          </Stack>
                        </Paper>
                      ))}
                    </Box>
                  </Stack>
                </Paper>
              ))}
            </Stack>
          ) : !menu || menu.categories.length === 0 ? (
            <Paper sx={{ p: 4, borderRadius: "22px", border: "1px solid var(--border)", backgroundColor: "var(--muted)" }}>
              <Stack spacing={1} alignItems="center" sx={{ textAlign: "center" }}>
                <Typography sx={{ fontSize: "2rem", lineHeight: 1 }}>🍽️</Typography>
                <Typography sx={{ fontWeight: 800 }}>Menu coming soon</Typography>
                <Typography sx={{ color: "var(--muted-foreground)", maxWidth: 360 }}>
                  This table&apos;s menu isn&apos;t available yet. Please check back in a moment.
                </Typography>
              </Stack>
            </Paper>
          ) : null}

          {!loading && menu && flatItems.length > 0 ? (
            <Paper
              sx={{
                p: { xs: 0.75, md: 1 },
                borderRadius: { xs: "16px", md: "18px" },
                border: "1px solid var(--border)",
                backgroundColor: "var(--muted)",
                backdropFilter: "blur(10px)",
                mb: { xs: 1, md: 1.5 },
                display: "flex",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 1,
              }}
            >
              <Typography
                sx={{
                  color: "var(--muted-foreground)",
                  fontSize: "0.7rem",
                  fontWeight: 900,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                }}
              >
                Diet
              </Typography>
              <ToggleButtonGroup
                exclusive
                size="small"
                aria-label="Filter menu by food type"
                value={foodFilter}
                onChange={(_event, next: FoodFilterKey | null) => {
                  if (next) setFoodFilter(next);
                }}
                sx={{
                  "& .MuiToggleButtonGroup-grouped": {
                    border: "1px solid var(--border) !important",
                    borderRadius: "10px !important",
                    margin: "0 5px 0 0 !important",
                    px: { xs: 0.9, md: 1.15 },
                    py: 0.45,
                    fontSize: { xs: "0.74rem", md: "0.8rem" },
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
                  "& .MuiToggleButton-root[value='veg'].Mui-selected": {
                    backgroundColor: "color-mix(in srgb, var(--food-veg) 14%, var(--card)) !important",
                    color: "var(--food-veg) !important",
                    borderColor: "color-mix(in srgb, var(--food-veg) 55%, transparent) !important",
                  },
                  "& .MuiToggleButton-root[value='non-veg'].Mui-selected": {
                    backgroundColor: "color-mix(in srgb, var(--food-nonveg) 14%, var(--card)) !important",
                    color: "var(--food-nonveg) !important",
                    borderColor: "color-mix(in srgb, var(--food-nonveg) 55%, transparent) !important",
                  },
                  "& .MuiToggleButton-root[value='drinks'].Mui-selected": {
                    backgroundColor: "color-mix(in srgb, var(--food-drink) 14%, var(--card)) !important",
                    color: "var(--food-drink) !important",
                    borderColor: "color-mix(in srgb, var(--food-drink) 55%, transparent) !important",
                  },
                  "& .MuiToggleButton-root[value='others'].Mui-selected": {
                    backgroundColor: "color-mix(in srgb, var(--food-egg) 14%, var(--card)) !important",
                    color: "var(--food-egg) !important",
                    borderColor: "color-mix(in srgb, var(--food-egg) 55%, transparent) !important",
                  },
                }}
              >
                {FOOD_FILTER_ORDER.map((key) => (
                  <ToggleButton key={key} value={key} aria-pressed={foodFilter === key}>
                    {FOOD_FILTER_LABELS[key]}
                    <Box
                      component="span"
                      sx={{ ml: 0.4, fontWeight: 800, opacity: foodFilter === key ? 0.85 : 0.6 }}
                    >
                      {foodFilterCounts[key]}
                    </Box>
                  </ToggleButton>
                ))}
              </ToggleButtonGroup>
            </Paper>
          ) : null}

          {!loading && menu?.categories.length ? (
            <Paper
              elevation={0}
              sx={{
                position: "sticky",
                top: { xs: 8, md: 12 },
                zIndex: 5,
                minWidth: 0,
                maxWidth: "100%",
                p: { xs: 0.75, md: 1 },
                borderRadius: { xs: "16px", md: "18px" },
                border: "1px solid var(--border)",
                backgroundColor: "var(--muted)",
                backdropFilter: "blur(10px)",
                display: "flex",
                alignItems: "center",
                gap: { xs: 0.75, md: 1 },
              }}
            >
              <Typography
                sx={{
                  flexShrink: 0,
                  color: "var(--muted-foreground)",
                  fontSize: "0.7rem",
                  fontWeight: 900,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                }}
              >
                Menu
              </Typography>
              <Stack
                direction="row"
                spacing={0.75}
                useFlexGap
                flexWrap={{ xs: "nowrap", md: "wrap" }}
                sx={{
                  flex: 1,
                  justifyContent: "flex-start",
                  minWidth: 0,
                  maxWidth: "100%",
                  overflowX: "auto",
                  overflowY: "hidden",
                  scrollbarWidth: "none",
                  py: 0.25,
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
                  backgroundColor: "var(--muted)",
                  boxShadow: "0 10px 28px color-mix(in srgb, var(--foreground) 6%, transparent)",
                }}
              >
                <Stack spacing={{ xs: 1.25, md: 2 }}>
                  <Box>
                    <Stack
                      direction="row"
                      spacing={1.25}
                      alignItems="center"
                      justifyContent="space-between"
                      flexWrap="wrap"
                      useFlexGap
                    >
                      <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0, flex: 1 }}>
                        <Box sx={{ width: 5, height: 5, borderRadius: "50%", backgroundColor: "var(--primary)", flexShrink: 0 }} />
                        <Typography
                          variant="h5"
                          sx={{
                            fontWeight: 900,
                            textTransform: "uppercase",
                            letterSpacing: { xs: "0.06em", md: "0.1em" },
                            fontSize: { xs: "0.95rem", md: "1.15rem" },
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {category.name}
                        </Typography>
                        <Box sx={{ flex: 1, minWidth: 20, height: "1px", backgroundColor: "var(--border)" }} />
                      </Stack>
                      <Stack
                        direction="row"
                        spacing={1}
                        alignItems="center"
                        justifyContent="flex-end"
                        sx={{ flexShrink: 0, maxWidth: "100%" }}
                      >
                        <Typography
                          sx={{
                            color: "var(--muted-foreground)",
                            fontSize: "0.72rem",
                            fontWeight: 800,
                            letterSpacing: "0.04em",
                            whiteSpace: "nowrap",
                            flexShrink: 0,
                          }}
                        >
                          {category.items.length} {category.items.length === 1 ? "item" : "items"}
                        </Typography>
                      </Stack>
                    </Stack>
                    {category.description && (
                      <Typography sx={{ color: "var(--muted-foreground)", mt: 0.5, fontSize: { xs: "0.82rem", md: "1rem" } }}>
                        {category.description}
                      </Typography>
                    )}
                  </Box>

                  {/* Menu cards — 1 per row on phones, 2 per row on laptop/desktop */}
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
                            border:
                              quantity > 0
                                ? "1.5px solid color-mix(in srgb, var(--primary) 55%, var(--border))"
                                : "1px solid var(--border)",
                            backgroundColor:
                              quantity > 0
                                ? "color-mix(in srgb, var(--primary) 8%, var(--muted))"
                                : "var(--muted)",
                            boxShadow:
                              quantity > 0
                                ? "0 8px 20px color-mix(in srgb, var(--primary) 14%, transparent)"
                                : "none",
                            transition:
                              "border-color 180ms ease, background-color 180ms ease, box-shadow 180ms ease",
                          }}
                        >
                          <Stack direction="row" spacing={{ xs: 1, md: 2 }} alignItems="stretch">
                            <Box
                              component="button"
                              type="button"
                              onClick={() => setSelectedItem(item)}
                              aria-label={`View details for ${item.name}`}
                              sx={{
                                position: "relative",
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
                                "& img": { transition: "transform 260ms ease" },
                                "&:hover img": { transform: "scale(1.07)" },
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
                              {quantity > 0 ? (
                                <Box
                                  aria-hidden
                                  sx={{
                                    position: "absolute",
                                    top: 5,
                                    right: 5,
                                    minWidth: 22,
                                    height: 22,
                                    px: 0.6,
                                    borderRadius: "999px",
                                    backgroundColor: "var(--primary)",
                                    color: "var(--primary-foreground)",
                                    fontSize: "0.72rem",
                                    fontWeight: 900,
                                    lineHeight: 1,
                                    display: "grid",
                                    placeItems: "center",
                                    boxShadow: "0 4px 10px rgba(0,0,0,0.28)",
                                  }}
                                >
                                  {quantity}
                                </Box>
                              ) : null}
                            </Box>

                            <Box sx={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 0.85 }}>
                              <Stack direction="row" justifyContent="space-between" spacing={1}>
                                <Box sx={{ minWidth: 0 }}>
                                  <Typography sx={{ fontWeight: 800, fontSize: { xs: "0.92rem", md: "1rem" }, overflowWrap: "anywhere" }}>
                                    {item.name}
                                  </Typography>
                                  <Typography
                                    sx={{
                                      color: "var(--muted-foreground)",
                                      fontSize: { xs: "0.75rem", md: "0.82rem" },
                                      lineHeight: 1.4,
                                      mt: 0.25,
                                      display: "-webkit-box",
                                      WebkitLineClamp: 2,
                                      WebkitBoxOrient: "vertical",
                                      overflow: "hidden",
                                    }}
                                  >
                                    {item.description || "Freshly prepared when ordered."}
                                  </Typography>
                                </Box>
                                <Typography sx={{ fontWeight: 900, fontSize: { xs: "0.86rem", md: "1rem" }, whiteSpace: "nowrap" }}>
                                  Rs. {formatPrice(item.price)}
                                </Typography>
                              </Stack>

                              <Stack
                                direction="row"
                                justifyContent="space-between"
                                alignItems="center"
                                spacing={1}
                                sx={{ mt: "auto", pt: 0.25 }}
                              >
                                <VegMark foodType={item.foodType} />
                                {quantity === 0 ? (
                                  <Button
                                    size="small"
                                    variant="contained"
                                    onClick={() => updateQuantity(item.id, 1)}
                                    aria-label={`Add ${item.name} to cart`}
                                    sx={{
                                      minWidth: 74,
                                      height: 34,
                                      px: 1.5,
                                      flexShrink: 0,
                                      borderRadius: "10px",
                                      fontWeight: 900,
                                      fontSize: "0.86rem",
                                      textTransform: "none",
                                      backgroundColor: "var(--primary)",
                                      color: "var(--primary-foreground)",
                                      boxShadow: "none",
                                      "&:hover": {
                                        backgroundColor: "var(--primary)",
                                        boxShadow: "none",
                                      },
                                    }}
                                  >
                                    + Add
                                  </Button>
                                ) : (
                                  <Stack direction="row" spacing={0.5} alignItems="center" sx={{ flexShrink: 0 }}>
                                    <Button
                                      size="small"
                                      onClick={() => updateQuantity(item.id, quantity - 1)}
                                      aria-label={`Remove one ${item.name}`}
                                      sx={{
                                        minWidth: { xs: 44, sm: 40, md: 44 },
                                        height: 34,
                                        borderRadius: "10px",
                                        px: 0,
                                        fontSize: "1.2rem",
                                        fontWeight: 900,
                                        lineHeight: 1,
                                        color: "var(--primary)",
                                      }}
                                    >
                                      &minus;
                                    </Button>
                                    <Typography
                                      key={quantity}
                                      sx={{
                                        minWidth: 26,
                                        textAlign: "center",
                                        fontWeight: 900,
                                        fontSize: "0.92rem",
                                        color: "var(--primary)",
                                        ...qtyBumpSx,
                                      }}
                                    >
                                      {quantity}
                                    </Typography>
                                    <Button
                                      size="small"
                                      variant="contained"
                                      disabled={quantity >= MAX_ORDER_QUANTITY}
                                      onClick={() => updateQuantity(item.id, quantity + 1)}
                                      aria-label={`Add one ${item.name}`}
                                      sx={{
                                        minWidth: { xs: 44, sm: 40, md: 44 },
                                        height: 34,
                                        borderRadius: "10px",
                                        px: 0,
                                        fontSize: "1.2rem",
                                        fontWeight: 900,
                                        lineHeight: 1,
                                      }}
                                    >
                                      +
                                    </Button>
                                  </Stack>
                                )}
                              </Stack>
                            </Box>
                          </Stack>
                        </Paper>
                      );
                    })}
                  </Box>
                </Stack>
              </Paper>
            ))}

          {!loading &&
            menu &&
            visibleCategories.length === 0 &&
            flatItems.length > 0 ? (
            <Paper
              sx={{
                p: { xs: 2, md: 3 },
                borderRadius: { xs: "18px", md: "22px" },
                border: "1px dashed var(--border)",
                backgroundColor: "var(--muted)",
                textAlign: "center",
              }}
            >
              <Stack spacing={1} alignItems="center" sx={{ py: 1 }}>
                <Typography sx={{ fontWeight: 800, fontSize: "0.95rem" }}>
                  No {FOOD_FILTER_LABELS[foodFilter]} dishes right now
                </Typography>
                <Typography sx={{ color: "var(--muted-foreground)", fontSize: "0.85rem" }}>
                  Try another filter, or clear it to see the whole menu.
                </Typography>
                <Button
                  variant="outlined"
                  onClick={() => setFoodFilter("all")}
                  sx={{ borderRadius: "12px", mt: 0.5, fontWeight: 800 }}
                >
                  Show all {flatItems.length} items
                </Button>
              </Stack>
            </Paper>
          ) : null}
        </Box>

        <Paper sx={{ display: { xs: "none", lg: "block" }, p: { xs: 2, md: 3 }, borderRadius: "22px", border: "1px solid var(--border)", backgroundColor: "var(--muted)", height: "fit-content", position: { lg: "sticky" }, top: { lg: 24 } }}>
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
                <Box sx={{ height: "1px", backgroundColor: "var(--border)", my: 0.5 }} />
                <Stack direction="row" justifyContent="space-between">
                  <Skeleton variant="text" width="38%" height={26} />
                  <Skeleton variant="text" width="30%" height={26} />
                </Stack>
                <Skeleton variant="rounded" width="100%" height={44} sx={{ borderRadius: "14px", mt: 0.5 }} />
              </Stack>
            ) : cartItems.length === 0 ? (
              <Stack
                spacing={0.75}
                alignItems="center"
                sx={{ py: 3, textAlign: "center", color: "var(--muted-foreground)" }}
              >
                <Typography sx={{ fontSize: "1.6rem", lineHeight: 1 }}>🍽️</Typography>
                <Typography sx={{ fontWeight: 700 }}>Your cart is empty</Typography>
                <Typography sx={{ fontSize: "0.82rem" }}>
                  Tap <strong>Add</strong> on any dish to get started.
                </Typography>
              </Stack>
            ) : (
              <Stack spacing={1.25}>
                {cartItems.map((item) => (
                  <Stack key={item.id} direction="row" alignItems="center" spacing={0.75}>
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Typography sx={{ fontWeight: 750, overflowWrap: "anywhere" }}>{item.name}</Typography>
                      <Typography sx={{ color: "var(--muted-foreground)", fontSize: "0.78rem", fontWeight: 700 }}>
                        Rs. {(Number.parseFloat(item.price) * item.quantity).toFixed(2)}
                      </Typography>
                    </Box>
                    <IconButton aria-label={`Remove one ${item.name}`} onClick={() => updateQuantity(item.id, item.quantity - 1)} size="small" sx={{ width: 34, height: 34, border: "1px solid var(--border)" }}><RemoveRoundedIcon fontSize="small" /></IconButton>
                    <Typography aria-live="polite" sx={{ minWidth: 20, textAlign: "center", fontWeight: 850 }}>{item.quantity}</Typography>
                    <IconButton aria-label={`Add one ${item.name}`} onClick={() => updateQuantity(item.id, item.quantity + 1)} disabled={item.quantity >= MAX_ORDER_QUANTITY} size="small" sx={{ width: 34, height: 34, border: "1px solid var(--border)" }}><AddRoundedIcon fontSize="small" /></IconButton>
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
            zIndex: 2000,
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
              backgroundColor: "color-mix(in srgb, var(--muted) 96%, transparent)",
              backdropFilter: "blur(18px)",
              boxShadow: "0 18px 46px rgba(31, 42, 43, 0.22)",
              overflow: "hidden",
            }}
          >
            {bestSellersOpen && !mobileCartOpen ? null : (
              <Box sx={{ px: 1, pt: 1 }}>
                <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mb: 0.75, px: 0.5 }}>
                  <Typography sx={{ fontWeight: 800, fontSize: "0.78rem", color: "var(--muted-foreground)" }}>
                    Serving
                  </Typography>
                  <Typography sx={{ fontWeight: 900, fontSize: "0.78rem", color: "var(--primary)", ml: "auto" }}>
                    {getOrderTypeLabel(orderType)}
                  </Typography>
                </Stack>
                {compactOrderTypeSelector}
              </Box>
            )}

            {bestSellersOpen && !mobileCartOpen ? (
              <Stack spacing={0.25} sx={{ px: 1.5, pt: 0.5, pb: 0.5, maxHeight: 76, overflowY: "auto" }} aria-label="Cart contents">
                {cartItems.map((item) => (
                  <Stack key={item.id} direction="row" alignItems="center" spacing={0.5}>
                    <Typography sx={{ minWidth: 0, flex: 1, fontSize: "0.76rem", fontWeight: 750, overflowWrap: "anywhere" }}>
                      {item.name}
                    </Typography>
                    <IconButton aria-label={`Remove one ${item.name}`} onClick={() => updateQuantity(item.id, item.quantity - 1)} size="small" sx={{ width: 30, height: 30, border: "1px solid var(--border)" }}><RemoveRoundedIcon sx={{ fontSize: 16 }} /></IconButton>
                    <Typography aria-live="polite" sx={{ minWidth: 18, textAlign: "center", fontSize: "0.76rem", fontWeight: 850 }}>{item.quantity}</Typography>
                    <IconButton aria-label={`Add one ${item.name}`} onClick={() => updateQuantity(item.id, item.quantity + 1)} disabled={item.quantity >= MAX_ORDER_QUANTITY} size="small" sx={{ width: 30, height: 30, border: "1px solid var(--border)" }}><AddRoundedIcon sx={{ fontSize: 16 }} /></IconButton>
                    <Typography sx={{ width: 62, flexShrink: 0, textAlign: "right", fontSize: "0.72rem", fontWeight: 800 }}>
                      Rs. {(Number.parseFloat(item.price) * item.quantity).toFixed(2)}
                    </Typography>
                  </Stack>
                ))}
              </Stack>
            ) : null}

            {mobileCartOpen ? (
              <Stack spacing={1} sx={{ px: 1.5, pt: 1, pb: 0.75 }}>
                <Stack spacing={0.5} sx={{ maxHeight: 100, overflowY: "auto", pr: 0.5 }}>
                  {cartItems.map((item) => (
                    <Stack
                      key={item.id}
                      direction="row"
                      alignItems="center"
                      spacing={0.75}
                      sx={{
                        p: 1,
                        borderRadius: "14px",
                        backgroundColor: "var(--background)",
                      }}
                    >
                      <Typography sx={{ fontWeight: 750, minWidth: 0, flex: 1, overflowWrap: "anywhere" }}>
                        {item.name}
                      </Typography>
                      <IconButton aria-label={`Remove one ${item.name}`} onClick={() => updateQuantity(item.id, item.quantity - 1)} size="small" sx={{ width: 34, height: 34, border: "1px solid var(--border)" }}><RemoveRoundedIcon fontSize="small" /></IconButton>
                      <Typography aria-live="polite" sx={{ minWidth: 18, textAlign: "center", fontWeight: 850 }}>{item.quantity}</Typography>
                      <IconButton aria-label={`Add one ${item.name}`} onClick={() => updateQuantity(item.id, item.quantity + 1)} disabled={item.quantity >= MAX_ORDER_QUANTITY} size="small" sx={{ width: 34, height: 34, border: "1px solid var(--border)" }}><AddRoundedIcon fontSize="small" /></IconButton>
                      <Typography sx={{ fontWeight: 800, flexShrink: 0, fontSize: "0.78rem" }}>
                        Rs. {(Number.parseFloat(item.price) * item.quantity).toFixed(2)}
                      </Typography>
                    </Stack>
                  ))}
                </Stack>

                <TextField
                  label="Remarks"
                  size="small"
                  multiline
                  minRows={1}
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
                  flex: "0 0 40%",
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
                  {mobileCartOpen
                    ? "Hide"
                    : `${cartItems.reduce((sum, item) => sum + item.quantity, 0)} items · View cart`}
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
        open={bestSellersOpen}
        onClose={() => setBestSellersOpen(false)}
        disableEnforceFocus
        fullWidth
        maxWidth="md"
        scroll="paper"
        sx={{
          "& .MuiBackdrop-root": {
            backgroundColor: "rgba(13, 20, 20, 0.62)",
            backdropFilter: "blur(5px)",
          },
          "& .MuiDialog-container": {
            alignItems: "center",
            p: { xs: 1.25, sm: 3 },
          },
        }}
        PaperProps={{ sx: { display: "flex", flexDirection: "column", width: "100%", maxWidth: 780, maxHeight: { xs: "calc(100dvh - 20px)", sm: "min(820px, calc(100dvh - 96px))" }, m: 0, borderRadius: "24px", overflow: "hidden", border: "1px solid color-mix(in srgb, var(--border) 75%, white)", backgroundColor: "var(--card)", color: "var(--foreground)", boxShadow: "0 28px 90px rgba(0, 0, 0, 0.38)" } }}
      >
        <DialogTitle sx={{ px: { xs: 2, sm: 3 }, pt: { xs: 2, sm: 2.5 }, pb: 1 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
            <Box>
              <Typography sx={{ color: "var(--primary)", fontSize: "0.7rem", fontWeight: 900, letterSpacing: "0.12em", textTransform: "uppercase" }}>{menu?.business?.name ?? "Guest favorites"}</Typography>
              <Typography sx={{ mt: 0.35, fontSize: { xs: "1.2rem", sm: "1.45rem" }, fontWeight: 900 }}>Our best-selling foods</Typography>
            </Box>
            <IconButton onClick={() => setBestSellersOpen(false)} aria-label="Close best sellers" sx={{ width: 42, height: 42, border: "1px solid var(--border)", borderRadius: "12px" }}><CloseRoundedIcon /></IconButton>
          </Stack>
        </DialogTitle>
        <DialogContent sx={{ minHeight: 0, flex: "1 1 auto", overflowY: "auto", px: { xs: 1.5, sm: 3 }, pt: "8px !important", pb: { xs: cartItems.length ? mobileCartOpen ? "250px" : "190px" : 2, sm: 2.5 }, display: "grid", gap: 1 }}>
          <Typography sx={{ mb: 0.5, color: "var(--muted-foreground)", fontSize: "0.86rem" }}>Customer favorites, ranked by orders. Add them directly to your cart.</Typography>
          {menu?.topProducts.map((product, index) => {
            const item = flatItems.find((candidate) => candidate.id === product.menuItemId);
            if (!item) return null;
            const quantity = cart[item.id] ?? 0;
            const image = resolveMenuImageUrl(item.imageUrl ?? product.imageUrl);
            return (
              <Paper key={item.id} elevation={0} sx={{ p: { xs: 1, sm: 1.5 }, borderRadius: { xs: "15px", sm: "18px" }, border: quantity ? "1.5px solid color-mix(in srgb, var(--primary) 55%, var(--border))" : "1px solid var(--border)", backgroundColor: quantity ? "color-mix(in srgb, var(--primary) 8%, var(--muted))" : "var(--muted)" }}>
                <Stack direction="row" spacing={{ xs: 1, sm: 1.5 }} alignItems="center">
                  <Typography sx={{ color: "var(--primary)", width: 26, flexShrink: 0, fontWeight: 950 }}>#{index + 1}</Typography>
                  <Box sx={{ position: "relative", width: { xs: 72, sm: 88 }, height: { xs: 72, sm: 88 }, flexShrink: 0, overflow: "hidden", borderRadius: "13px", backgroundColor: "var(--card)", display: "grid", placeItems: "center" }}>
                    {image ? <Box component="img" src={image} alt={item.name} sx={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <Typography sx={{ fontSize: "0.65rem", color: "var(--muted-foreground)" }}>Food</Typography>}
                    {quantity > 0 ? <Box sx={{ position: "absolute", top: 4, right: 4, minWidth: 21, height: 21, borderRadius: "50%", px: 0.5, display: "grid", placeItems: "center", color: "var(--primary-foreground)", backgroundColor: "var(--primary)", fontSize: "0.7rem", fontWeight: 900 }}>{quantity}</Box> : null}
                  </Box>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Stack direction="row" justifyContent="space-between" spacing={1} alignItems="flex-start">
                      <Box sx={{ minWidth: 0 }}>
                        <Typography sx={{ fontWeight: 850, fontSize: { xs: "0.88rem", sm: "0.98rem" }, overflowWrap: "anywhere" }}>{item.name}</Typography>
                        <Typography sx={{ color: "var(--muted-foreground)", fontSize: "0.75rem", mt: 0.2 }}>{product.quantity} ordered · {product.category}</Typography>
                      </Box>
                      <Typography sx={{ flexShrink: 0, fontWeight: 900, fontSize: "0.85rem", whiteSpace: "nowrap" }}>Rs. {formatPrice(item.price)}</Typography>
                    </Stack>
                    <Stack direction="row" justifyContent="flex-end" alignItems="center" sx={{ mt: 0.5 }}>
                      <Button size="small" variant="contained" onClick={() => updateQuantity(item.id, quantity + 1)} disabled={quantity >= MAX_ORDER_QUANTITY} sx={{ minWidth: 74, minHeight: 34, borderRadius: "10px", fontWeight: 900, textTransform: "none" }}>Add</Button>
                    </Stack>
                  </Box>
                </Stack>
              </Paper>
            );
          })}
          {!menu?.topProducts.length ? <Typography sx={{ py: 4, color: "var(--muted-foreground)", textAlign: "center" }}>Best sellers will appear here as orders come in.</Typography> : null}
        </DialogContent>
        <DialogActions sx={{ p: { xs: 1.5, sm: 2.5 }, pt: 0, pb: { xs: "calc(12px + env(safe-area-inset-bottom))", sm: 2.5 } }}>
          <Button fullWidth variant="contained" disabled={placing || cartItems.length === 0} onClick={async () => {
            setBestSellersOpen(false);
            if (window.matchMedia("(max-width: 1023px)").matches) setMobileCartOpen(true);
            else await handlePlaceOrder();
          }} sx={{ minHeight: 52, borderRadius: "14px", fontWeight: 900, textTransform: "none" }}>
            {placing ? cartActionBusyLabel : cartItems.length ? `${cartActionLabel} · Rs. ${totalAmount.toFixed(2)}` : "Add a favorite to your cart"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={reviewOpen}
        onClose={() => !reviewSubmitting && setReviewOpen(false)}
        fullWidth
        maxWidth="sm"
        sx={{
          "& .MuiBackdrop-root": { backgroundColor: "rgba(13, 20, 20, 0.62)", backdropFilter: "blur(5px)" },
          "& .MuiDialog-container": { alignItems: "center", p: { xs: 1.25, sm: 3 } },
        }}
        PaperProps={{ sx: { width: "100%", maxHeight: { xs: "calc(100dvh - 20px)", sm: "min(760px, calc(100dvh - 96px))" }, m: 0, borderRadius: "24px", overflow: "hidden", border: "1px solid color-mix(in srgb, var(--border) 75%, white)", backgroundColor: "var(--card)", color: "var(--foreground)", boxShadow: "0 28px 90px rgba(0, 0, 0, 0.38)" } }}
      >
        {reviewSubmitted ? (
          <>
            <DialogContent sx={{ pt: 4, pb: 2, textAlign: "center" }}>
              <MessageSquareQuote size={48} color="var(--primary)" />
              <DialogTitle sx={{ px: 0, pt: 1, fontSize: "1.3rem", fontWeight: 900 }}>Thanks for your review!</DialogTitle>
              <Typography sx={{ color: "var(--muted-foreground)" }}>Your feedback has been shared with {menu?.business?.name ?? "the restaurant"}.</Typography>
            </DialogContent>
            <DialogActions sx={{ p: 2, pt: 0 }}><Button fullWidth variant="contained" onClick={() => setReviewOpen(false)} sx={{ minHeight: 48, borderRadius: "13px", fontWeight: 900, textTransform: "none" }}>Done</Button></DialogActions>
          </>
        ) : (
          <>
            <DialogTitle sx={{ px: 2.5, pt: 2.5, pb: 1, fontWeight: 900 }}>Write a review</DialogTitle>
            <DialogContent sx={{ display: "grid", gap: 2, pt: "8px !important" }}>
              <Typography sx={{ color: "var(--muted-foreground)" }}>How was your experience at {menu?.business?.name ?? "this restaurant"}?</Typography>
              <Box><Typography sx={{ mb: 0.5, fontSize: "0.86rem", fontWeight: 850 }}>Your rating</Typography><Rating value={reviewRating} onChange={(_event, value) => setReviewRating(value)} size="large" aria-label="Rate your experience from one to five stars" /></Box>
              <TextField label="Name (optional)" value={reviewName} onChange={(event) => setReviewName(event.target.value)} fullWidth inputProps={{ maxLength: 100 }} />
              <TextField label="Email (optional)" type="email" value={reviewEmail} onChange={(event) => setReviewEmail(event.target.value)} fullWidth inputProps={{ maxLength: 100 }} />
              <TextField label="Your review (optional)" value={reviewComment} onChange={(event) => setReviewComment(event.target.value)} multiline minRows={3} maxRows={7} fullWidth inputProps={{ maxLength: 1000 }} helperText={`${reviewComment.length}/1000`} />
              {message ? <Typography role="alert" sx={{ color: "var(--status-inactive-fg)", fontSize: "0.84rem", fontWeight: 700 }}>{message}</Typography> : null}
            </DialogContent>
            <DialogActions sx={{ p: 2.5, pt: 0, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1 }}>
              <Button onClick={() => setReviewOpen(false)} disabled={reviewSubmitting} sx={{ minHeight: 48, borderRadius: "13px", fontWeight: 850, textTransform: "none" }}>Cancel</Button>
              <Button variant="contained" disabled={reviewSubmitting || !menu?.business?.id || !reviewRating} onClick={async () => {
                if (!menu?.business?.id || !reviewRating || reviewSubmitting) return;
                setReviewSubmitting(true);
                setMessage("");
                try {
                  await submitReview({ business_id: menu.business.id, rating: reviewRating, customer_name: reviewName.trim() || undefined, customer_email: reviewEmail.trim() || undefined, comment: reviewComment.trim() || undefined });
                  setReviewSubmitted(true);
                } catch (error) {
                  console.error("Failed to submit customer review:", error);
                  setMessage("Your review couldn't be sent. Please check your connection and try again.");
                } finally {
                  setReviewSubmitting(false);
                }
              }} sx={{ minHeight: 48, borderRadius: "13px", fontWeight: 900, textTransform: "none" }}>{reviewSubmitting ? "Sending…" : "Submit review"}</Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      <Dialog
        open={Boolean(selectedItem)}
        onClose={() => setSelectedItem(null)}
        fullWidth
        maxWidth="md"
        scroll="paper"
        sx={{ "& .MuiDialog-container": { alignItems: { xs: "flex-end", sm: "center" } } }}
        PaperProps={{
          sx: {
            width: { xs: "100%", sm: "calc(100% - 48px)" },
            maxWidth: { xs: "100%", sm: 720 },
            maxHeight: { xs: "92dvh", sm: "calc(100% - 64px)" },
            m: { xs: 0, sm: 3 },
            borderRadius: { xs: "24px 24px 0 0", sm: "24px" },
            overflow: "hidden",
            border: "1px solid var(--border)",
            backgroundColor: "var(--card)",
          },
        }}
      >
        {selectedItem ? (
          <>
            <DialogTitle sx={{ px: { xs: 2, sm: 3 }, pt: { xs: 2, sm: 2.5 }, pb: 1 }}>
              <Stack direction="row" spacing={1.5} alignItems="center" justifyContent="space-between">
                <Box sx={{ minWidth: 0 }}>
                  <Typography sx={{ fontWeight: 900, fontSize: { xs: "1.1rem", sm: "1.35rem" }, overflowWrap: "anywhere" }}>
                    {selectedItem.name}
                  </Typography>
                  <Typography sx={{ color: "var(--muted-foreground)", fontSize: "0.8rem", mt: 0.25 }}>
                    Item details
                  </Typography>
                </Box>
                <IconButton
                  onClick={() => setSelectedItem(null)}
                  aria-label="Close item details"
                  sx={{ width: 42, height: 42, flexShrink: 0, border: "1px solid var(--border)", borderRadius: "12px" }}
                >
                  <CloseRoundedIcon />
                </IconButton>
              </Stack>
            </DialogTitle>
            <DialogContent sx={{ display: "grid", gap: { xs: 1.5, sm: 2 }, px: { xs: 2, sm: 3 }, pt: "8px !important", pb: 2 }}>
              <Box
                sx={{
                  height: { xs: "min(38dvh, 320px)", sm: 380 },
                  minHeight: { xs: 210, sm: 280 },
                  borderRadius: { xs: "17px", sm: "20px" },
                  overflow: "hidden",
                  backgroundColor: "var(--muted)",
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

              <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25} alignItems={{ xs: "stretch", sm: "center" }} justifyContent="space-between">
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap alignItems="center">
                  <Chip label={getFoodTypeLabel(selectedItem.foodType)} sx={{ fontWeight: 800 }} />
                  <Chip label={`Rs. ${formatPrice(selectedItem.price)}`} color="primary" sx={{ fontWeight: 900 }} />
                </Stack>
                <Stack
                  direction="row"
                  spacing={0.75}
                  alignItems="center"
                  justifyContent="space-between"
                  sx={{
                    border: "1px solid var(--border)",
                    borderRadius: "14px",
                    px: 0.75,
                    py: 0.4,
                    backgroundColor: "var(--background)",
                    minHeight: 48,
                    width: { xs: "100%", sm: 150 },
                  }}
                >
                  <Typography sx={{ pl: 0.75, fontSize: "0.84rem", fontWeight: 800 }}>Quantity</Typography>
                  <Button
                    size="small"
                    onClick={() => setDetailQty((current) => Math.max(1, current - 1))}
                    disabled={detailQty <= 1}
                    aria-label="Decrease quantity"
                    sx={{ minWidth: 40, height: 40, borderRadius: "11px", fontSize: "1.15rem", fontWeight: 900, color: "var(--primary)" }}
                  >
                    &minus;
                  </Button>
                  <Typography key={detailQty} sx={{ minWidth: 26, textAlign: "center", fontWeight: 900, ...qtyBumpSx }}>
                    {detailQty}
                  </Typography>
                  <Button
                    size="small"
                    onClick={() =>
                      setDetailQty((current) =>
                        Math.min(MAX_ORDER_QUANTITY, current + 1),
                      )
                    }
                    disabled={
                      (cart[selectedItem.id] ?? 0) + detailQty >= MAX_ORDER_QUANTITY
                    }
                    aria-label="Increase quantity"
                    sx={{ minWidth: 40, height: 40, borderRadius: "11px", fontSize: "1.15rem", fontWeight: 900, color: "var(--primary)" }}
                  >
                    +
                  </Button>
                </Stack>
              </Stack>

              <Typography sx={{ color: "var(--muted-foreground)", lineHeight: 1.65, fontSize: { xs: "0.9rem", sm: "0.96rem" } }}>
                {selectedItem.description || "Freshly prepared after you place the order."}
              </Typography>
            </DialogContent>
            <DialogActions sx={{ p: { xs: 2, sm: 3 }, pt: 0, pb: { xs: "calc(16px + env(safe-area-inset-bottom))", sm: 3 } }}>
              <Button
                variant="contained"
                fullWidth
                disabled={(cart[selectedItem.id] ?? 0) + detailQty > MAX_ORDER_QUANTITY}
                onClick={() => {
                  updateQuantity(
                    selectedItem.id,
                    Math.min(
                      MAX_ORDER_QUANTITY,
                      (cart[selectedItem.id] ?? 0) + detailQty,
                    ),
                  );
                  setSelectedItem(null);
                }}
                sx={{ borderRadius: "14px", px: 2.5, minHeight: 52, fontWeight: 900, fontSize: "0.95rem", textTransform: "none" }}
              >
                {(cart[selectedItem.id] ?? 0) > 0 ? `Add ${detailQty} more` : "Add to cart"} ·
                Rs. {formatPrice(Number.parseFloat(selectedItem.price) * detailQty)}
              </Button>
            </DialogActions>
          </>
        ) : null}
      </Dialog>
    </Box>
  );
}
