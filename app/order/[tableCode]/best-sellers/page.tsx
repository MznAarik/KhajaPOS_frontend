"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Box,
  Button,
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
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import RemoveRoundedIcon from "@mui/icons-material/RemoveRounded";
import ShoppingCartOutlinedIcon from "@mui/icons-material/ShoppingCartOutlined";
import {
  getOrderTypeLabel,
  getPublicMenu,
  placePublicOrder,
  resolveMenuImageUrl,
  type OrderType,
  type PublicTableMenu,
} from "@/lib/api";
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

const MAX_ORDER_QUANTITY = 10;
const getCartStorageKey = (tableCode: string) => `khajapos-cart:${tableCode}`;
const getLatestOrderStorageKey = (tableId: number | string) => `khajapos-latest-order:${tableId}`;
const getOrderListStorageKey = (tableId: number | string) => `khajapos-order-list:${tableId}`;
const getRecentOrderStorageKey = (tableId: number | string) => `khajapos-recent-order:${tableId}`;
const getOrderSessionTableCodeKey = (sessionToken: string) => `khajapos-order-session-table:${sessionToken}`;
const getOrderTypeStorageKey = (tableCode: string) => `khajapos-order-type:${tableCode}`;

export default function BestSellersPage() {
  const { tableCode } = useParams<{ tableCode: string }>();
  const router = useRouter();
  const { showSnackbar } = useAppSnackbar();
  const [menu, setMenu] = React.useState<PublicTableMenu | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [cart, setCart] = React.useState<CartState>({});
  const [cartLoaded, setCartLoaded] = React.useState(false);
  const [cartExpanded, setCartExpanded] = React.useState(false);
  const [placing, setPlacing] = React.useState(false);
  const [remarks, setRemarks] = React.useState("");
  const [orderType, setOrderType] = React.useState<OrderType>("dine_in");

  React.useEffect(() => {
    setCartLoaded(false);
    try {
      const savedCart = window.localStorage.getItem(getCartStorageKey(tableCode));
      setCart(savedCart ? JSON.parse(savedCart) as CartState : {});
      setOrderType(window.localStorage.getItem(getOrderTypeStorageKey(tableCode)) === "takeaway" ? "takeaway" : "dine_in");
    } catch {
      setCart({});
      setOrderType("dine_in");
    } finally {
      setCartLoaded(true);
    }
  }, [tableCode]);

  React.useEffect(() => {
    if (cartLoaded) window.localStorage.setItem(getCartStorageKey(tableCode), JSON.stringify(cart));
  }, [cart, cartLoaded, tableCode]);

  React.useEffect(() => {
    let active = true;
    void getPublicMenu(tableCode)
      .then((data) => {
        if (active) setMenu(data);
      })
      .catch((error) => {
        console.error("Failed to load best sellers:", error);
        if (active) showSnackbar("Could not load the best sellers. Please try again.", "error");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [tableCode, showSnackbar]);

  const menuItems = React.useMemo(
    () => new Map(menu?.categories.flatMap((category) => category.items).map((item) => [item.id, item]) ?? []),
    [menu],
  );
  const cartItems = React.useMemo(
    () => Object.entries(cart)
      .map(([id, quantity]) => {
        const item = menuItems.get(Number(id));
        return item && quantity > 0 ? { ...item, quantity } : null;
      })
      .filter((item): item is NonNullable<typeof item> => item !== null),
    [cart, menuItems],
  );
  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const cartTotal = cartItems.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0);

  const updateQuantity = (itemId: number, nextQuantity: number) => {
    setCart((current) => {
      if (nextQuantity <= 0) {
        const { [itemId]: _removed, ...rest } = current;
        return rest;
      }
      return { ...current, [itemId]: Math.min(nextQuantity, MAX_ORDER_QUANTITY) };
    });
  };

  const handlePlaceOrder = async () => {
    if (!menu || cartItems.length === 0 || placing) return;
    setPlacing(true);
    try {
      const order = await placePublicOrder({
        tableId: menu.table.id,
        remarks,
        orderType,
        items: cartItems.map((item) => ({ menuItemId: item.id, quantity: item.quantity })),
      });
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
          const saved = window.localStorage.getItem(getOrderListStorageKey(menu.table.id));
          return saved ? JSON.parse(saved) as RecentOrderSummary[] : [];
        } catch {
          return [];
        }
      })();
      const nextOrders = [summary, ...existingOrders.filter((item) => item.sessionToken !== order.sessionToken)].slice(0, 8);
      window.localStorage.setItem(getRecentOrderStorageKey(menu.table.id), JSON.stringify(summary));
      window.localStorage.setItem(getLatestOrderStorageKey(menu.table.id), JSON.stringify(summary));
      window.localStorage.setItem(getLatestOrderStorageKey(tableCode), JSON.stringify(summary));
      window.localStorage.setItem(getOrderListStorageKey(menu.table.id), JSON.stringify(nextOrders));
      window.localStorage.setItem(getOrderListStorageKey(tableCode), JSON.stringify(nextOrders));
      window.localStorage.setItem(getOrderSessionTableCodeKey(order.sessionToken), tableCode);
      window.localStorage.removeItem(getCartStorageKey(tableCode));
      setCart({});
      showSnackbar("Order placed. Confirm it whenever you are ready.", "success");
      router.push(`/order/${encodeURIComponent(tableCode)}`);
    } catch (error) {
      console.error("Failed to place order from best sellers:", error);
      showSnackbar("We couldn't place your order. Please try again.", "error");
    } finally {
      setPlacing(false);
    }
  };

  const cartContents = (
    <>
      <Stack direction="row" alignItems="center" spacing={1}>
        <ShoppingCartOutlinedIcon sx={{ color: "var(--primary)" }} />
        <Typography sx={{ fontWeight: 900, flex: 1 }}>Your cart</Typography>
        <Typography sx={{ color: "var(--muted-foreground)", fontWeight: 800, fontSize: "0.82rem" }}>{cartCount} items</Typography>
      </Stack>
      {cartItems.length ? (
        <>
          <Stack spacing={1} sx={{ mt: 1.5, maxHeight: { xs: 180, lg: 300 }, overflowY: "auto" }}>
            {cartItems.map((item) => (
              <Stack key={item.id} direction="row" spacing={1} alignItems="center">
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography sx={{ fontSize: "0.84rem", fontWeight: 800, overflowWrap: "anywhere" }}>{item.name}</Typography>
                  <Typography sx={{ color: "var(--muted-foreground)", fontSize: "0.75rem" }}>Rs. {(Number(item.price) * item.quantity).toFixed(2)}</Typography>
                </Box>
                <IconButton aria-label={`Remove one ${item.name}`} onClick={() => updateQuantity(item.id, item.quantity - 1)} size="small" sx={{ width: 34, height: 34, border: "1px solid var(--border)" }}><RemoveRoundedIcon fontSize="small" /></IconButton>
                <Typography aria-live="polite" sx={{ minWidth: 20, textAlign: "center", fontWeight: 850 }}>{item.quantity}</Typography>
                <IconButton aria-label={`Add one ${item.name}`} onClick={() => updateQuantity(item.id, item.quantity + 1)} disabled={item.quantity >= MAX_ORDER_QUANTITY} size="small" sx={{ width: 34, height: 34, border: "1px solid var(--border)" }}><AddRoundedIcon fontSize="small" /></IconButton>
              </Stack>
            ))}
          </Stack>
          <Divider sx={{ my: 1.5, borderColor: "var(--border)" }} />
          <Typography sx={{ mb: 0.75, fontSize: "0.78rem", fontWeight: 800 }}>Serving option</Typography>
          <ToggleButtonGroup
            exclusive
            fullWidth
            size="small"
            value={orderType}
            onChange={(_event, value: OrderType | null) => {
              if (!value) return;
              setOrderType(value);
              window.localStorage.setItem(getOrderTypeStorageKey(tableCode), value);
            }}
            aria-label="Serving option"
            sx={{ mb: 1.25, "& .MuiToggleButton-root": { textTransform: "none", fontWeight: 800, minHeight: 40 } }}
          >
            <ToggleButton value="dine_in">{getOrderTypeLabel("dine_in")}</ToggleButton>
            <ToggleButton value="takeaway">{getOrderTypeLabel("takeaway")}</ToggleButton>
          </ToggleButtonGroup>
          <TextField
            label="Remarks"
            size="small"
            multiline
            minRows={2}
            value={remarks}
            onChange={(event) => setRemarks(event.target.value)}
            placeholder="Less spicy, no onion, etc."
            fullWidth
            sx={{ "& .MuiOutlinedInput-root": { borderRadius: "12px" } }}
          />
          <Stack direction="row" justifyContent="space-between" sx={{ mt: 1.5 }}>
            <Typography sx={{ fontWeight: 800 }}>Total</Typography>
            <Typography sx={{ fontWeight: 900 }}>Rs. {cartTotal.toFixed(2)}</Typography>
          </Stack>
          <Button fullWidth variant="contained" onClick={handlePlaceOrder} disabled={placing || !menu || !cartItems.length} sx={{ mt: 1.5, minHeight: 48, borderRadius: "13px", fontWeight: 900, textTransform: "none" }}>
            {placing ? "Placing order..." : `Place order · Rs. ${cartTotal.toFixed(2)}`}
          </Button>
        </>
      ) : (
        <Typography sx={{ mt: 1, color: "var(--muted-foreground)", fontSize: "0.84rem" }}>Add a favorite to see it here.</Typography>
      )}
    </>
  );

  return (
    <Box sx={{ minHeight: "100dvh", p: { xs: 1.25, sm: 2.5, md: 4 }, pb: { xs: "calc(112px + env(safe-area-inset-bottom))", lg: 4 }, backgroundColor: "var(--background)", color: "var(--foreground)" }}>
      <Box sx={{ maxWidth: 1180, mx: "auto", display: "grid", gridTemplateColumns: { xs: "1fr", lg: "minmax(0, 1fr) 340px" }, alignItems: "start", gap: 2 }}>
        <Box sx={{ display: "grid", gap: 2, minWidth: 0 }}>
          <Button
            startIcon={<ArrowBackRoundedIcon />}
            onClick={() => router.push(`/order/${encodeURIComponent(tableCode)}`)}
            sx={{ justifySelf: "start", minHeight: 44, borderRadius: "12px", textTransform: "none", fontWeight: 800 }}
          >
            Back to menu
          </Button>

          <Paper elevation={0} sx={{ p: { xs: 2, sm: 3 }, borderRadius: "22px", border: "1px solid var(--border)", backgroundColor: "var(--card)" }}>
            <Typography sx={{ color: "var(--primary)", fontSize: "0.72rem", fontWeight: 900, letterSpacing: "0.14em", textTransform: "uppercase" }}>
              {menu?.business?.name ?? "Your restaurant"}
            </Typography>
            <Typography sx={{ mt: 0.5, fontSize: { xs: "1.45rem", sm: "2rem" }, fontWeight: 900 }}>Our best-selling foods</Typography>
            <Typography sx={{ mt: 0.5, color: "var(--muted-foreground)" }}>
              Guest favorites, ranked by how often they&apos;re ordered.
            </Typography>
          </Paper>

          {loading ? (
            <Stack spacing={1.25}>{[0, 1, 2].map((key) => <Skeleton key={key} variant="rounded" height={132} sx={{ borderRadius: "18px" }} />)}</Stack>
          ) : menu?.topProducts.length ? (
            <Stack spacing={1.25}>
              {menu.topProducts.map((product, index) => {
                const item = menuItems.get(product.menuItemId);
                const image = resolveMenuImageUrl(item?.imageUrl ?? product.imageUrl);
                const quantity = item ? cart[item.id] ?? 0 : 0;
                return (
                  <Paper key={product.menuItemId} elevation={0} sx={{ p: { xs: 1.25, sm: 1.75 }, borderRadius: "18px", border: quantity ? "1.5px solid color-mix(in srgb, var(--primary) 55%, var(--border))" : "1px solid var(--border)", backgroundColor: "var(--card)" }}>
                    <Stack direction="row" spacing={{ xs: 1.25, sm: 2 }} alignItems="center">
                      <Typography sx={{ color: "var(--primary)", fontWeight: 950, fontSize: { xs: "0.9rem", sm: "1.1rem" }, width: 28, flexShrink: 0 }}>#{index + 1}</Typography>
                      {image ? (
                        <Box component="img" src={image} alt={product.name} sx={{ width: { xs: 76, sm: 104 }, height: { xs: 76, sm: 104 }, objectFit: "cover", borderRadius: "14px", backgroundColor: "var(--muted)", flexShrink: 0 }} />
                      ) : null}
                      <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Typography sx={{ fontWeight: 900, fontSize: { xs: "0.95rem", sm: "1.12rem" }, overflowWrap: "anywhere" }}>{product.name}</Typography>
                        <Typography sx={{ color: "var(--muted-foreground)", fontSize: "0.8rem" }}>{product.category}</Typography>
                        {item?.description ? <Typography sx={{ display: { xs: "none", sm: "block" }, mt: 0.5, color: "var(--muted-foreground)", fontSize: "0.84rem" }}>{item.description}</Typography> : null}
                        <Typography sx={{ mt: 0.5, color: "var(--primary)", fontWeight: 850, fontSize: "0.78rem" }}>{product.quantity} ordered</Typography>
                      </Box>
                    </Stack>
                    {item ? (
                      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 1.25, pt: 1, borderTop: "1px solid var(--border)" }}>
                        <Typography sx={{ fontWeight: 900, whiteSpace: "nowrap" }}>Rs. {Number(item.price).toFixed(2)}</Typography>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <IconButton aria-label={`Remove one ${product.name}`} onClick={() => updateQuantity(item.id, quantity - 1)} disabled={!quantity} size="small" sx={{ width: 40, height: 40, border: "1px solid var(--border)" }}><RemoveRoundedIcon fontSize="small" /></IconButton>
                          <Typography aria-live="polite" sx={{ minWidth: 22, textAlign: "center", fontWeight: 850 }}>{quantity}</Typography>
                          <IconButton aria-label={`Add one ${product.name}`} onClick={() => updateQuantity(item.id, quantity + 1)} disabled={quantity >= MAX_ORDER_QUANTITY} size="small" sx={{ width: 40, height: 40, border: "1px solid var(--border)" }}><AddRoundedIcon fontSize="small" /></IconButton>
                        </Stack>
                      </Stack>
                    ) : null}
                  </Paper>
                );
              })}
            </Stack>
          ) : (
            <Paper sx={{ p: 3, borderRadius: "18px", border: "1px solid var(--border)", backgroundColor: "var(--card)", textAlign: "center" }}>
              <Typography sx={{ fontWeight: 850 }}>Best sellers will appear here</Typography>
              <Typography sx={{ mt: 0.5, color: "var(--muted-foreground)" }}>There are no completed item sales to rank yet.</Typography>
            </Paper>
          )}
        </Box>

        <Box sx={{ display: { xs: "none", lg: "block" }, position: "sticky", top: 24 }}>
          <Paper elevation={0} sx={{ p: 2, borderRadius: "20px", border: "1px solid var(--border)", backgroundColor: "var(--card)" }}>
            {cartContents}
          </Paper>
        </Box>
      </Box>

      {cartLoaded ? (
        <Box sx={{ display: { xs: "block", lg: "none" }, position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 30, px: 1.25, pb: "calc(env(safe-area-inset-bottom) + 10px)", pointerEvents: "none" }}>
          <Paper elevation={0} sx={{ pointerEvents: "auto", maxWidth: 720, mx: "auto", borderRadius: "20px", border: "1px solid var(--border)", backgroundColor: "color-mix(in srgb, var(--card) 96%, transparent)", backdropFilter: "blur(18px)", boxShadow: "0 18px 46px rgba(31, 42, 43, 0.22)", overflow: "hidden" }}>
            {cartExpanded ? <Box sx={{ p: 1.25, pb: 0 }}>{cartContents}</Box> : null}
            <Stack direction="row" spacing={1} alignItems="center" sx={{ p: 1 }}>
              <Button variant="outlined" onClick={() => setCartExpanded((expanded) => !expanded)} sx={{ minWidth: 0, flex: "0 0 42%", minHeight: 50, borderRadius: "14px", textTransform: "none", display: "grid", lineHeight: 1.05 }}>
                <Box component="span" sx={{ fontWeight: 900 }}>{cartCount ? `Rs. ${cartTotal.toFixed(2)}` : "Your cart"}</Box>
                <Box component="span" sx={{ fontSize: "0.7rem", color: "var(--muted-foreground)", fontWeight: 800 }}>{cartCount ? `${cartCount} items · ${cartExpanded ? "Hide cart" : "View cart"}` : cartExpanded ? "Hide cart" : "Cart is empty"}</Box>
              </Button>
              <Button variant="contained" onClick={cartExpanded ? handlePlaceOrder : () => setCartExpanded(true)} disabled={placing || !menu || cartCount === 0} sx={{ flex: 1, minHeight: 50, borderRadius: "14px", fontWeight: 900, textTransform: "none" }}>
                {placing ? "Placing..." : cartExpanded ? "Place order" : cartCount ? "Review cart" : "Add a favorite"}
              </Button>
            </Stack>
          </Paper>
        </Box>
      ) : null}
    </Box>
  );
}
