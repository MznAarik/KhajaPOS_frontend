"use client";

import * as React from "react";
import Link from "next/link";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  InputAdornment,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import RedeemRoundedIcon from "@mui/icons-material/RedeemRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import BlockRoundedIcon from "@mui/icons-material/BlockRounded";
import { useAuth } from "@/lib/auth-context";
import { useAppSnackbar } from "@/components/common/SnackBar";
import {
  getLoyaltyMembership,
  getLoyaltyMemberships,
  getLoyaltyRewards,
  getLoyaltySummary,
  lookupLoyaltyReward,
  redeemLoyaltyReward,
  revokeLoyaltyReward,
  type LoyaltyBusinessSummary,
} from "@/lib/api";
import { safeError } from "@/lib/safeError";

type LookupResult = {
  reward: Record<string, unknown>;
  redeemable: boolean;
  effective_status: string;
};

const statusColor = (status?: string): "success" | "warning" | "error" | "default" | "info" => {
  switch (String(status || "").toLowerCase()) {
    case "available":
      return "success";
    case "redeemed":
      return "info";
    case "expired":
      return "warning";
    case "revoked":
      return "error";
    default:
      return "default";
  }
};

const formatDateTime = (value?: string | null) => {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
};

export default function BusinessAdminLoyaltyRewardsPage() {
  const { role, hasPermission } = useAuth();
  const { showSnackbar } = useAppSnackbar();
  const canManage = hasPermission("loyalty.manage") || role === "admin" || role === "manager";
  const canRedeem = hasPermission("loyalty.redeem") || role === "admin" || role === "manager" || role === "cashier";

  const [lookupCode, setLookupCode] = React.useState("");
  const [lookupLoading, setLookupLoading] = React.useState(false);
  const [lookupResult, setLookupResult] = React.useState<LookupResult | null>(null);
  const [lookupError, setLookupError] = React.useState("");
  const [redeeming, setRedeeming] = React.useState(false);
  const [redeemOrderId, setRedeemOrderId] = React.useState("");

  const [memberships, setMemberships] = React.useState<Record<string, unknown>[]>([]);
  const [membershipsLoading, setMembershipsLoading] = React.useState(false);
  const [membershipSearch, setMembershipSearch] = React.useState("");

  const [rewards, setRewards] = React.useState<Record<string, unknown>[]>([]);
  const [rewardsLoading, setRewardsLoading] = React.useState(false);
  const [rewardStatusFilter, setRewardStatusFilter] = React.useState<string>("");
  const [summary, setSummary] = React.useState<LoyaltyBusinessSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = React.useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = React.useState<number | null>(null);
  const [customerDetailOpen, setCustomerDetailOpen] = React.useState(false);
  const [customerDetailLoading, setCustomerDetailLoading] = React.useState(false);
  const [customerDetail, setCustomerDetail] = React.useState<Record<string, unknown> | null>(null);
  const [customerRewards, setCustomerRewards] = React.useState<Record<string, unknown>[]>([]);

  const [revokeDialog, setRevokeDialog] = React.useState<{ open: boolean; reward: Record<string, unknown> | null; reason: string; submitting: boolean }>({
    open: false,
    reward: null,
    reason: "",
    submitting: false,
  });

  const loadMemberships = React.useCallback(async () => {
    if (!canManage) return;
    setMembershipsLoading(true);
    try {
      const data = await getLoyaltyMemberships(membershipSearch.trim() ? { search: membershipSearch.trim() } : undefined);
      setMemberships(Array.isArray(data) ? data : []);
    } catch (error) {
      showSnackbar(safeError(error, "Failed to load customer memberships"), "error");
    } finally {
      setMembershipsLoading(false);
    }
  }, [canManage, membershipSearch, showSnackbar]);

  const loadRewards = React.useCallback(async () => {
    if (!canManage) return;
    setRewardsLoading(true);
    try {
      const params: { status?: string; customer_id?: number } = {};
      if (rewardStatusFilter) params.status = rewardStatusFilter;
      if (selectedCustomerId) params.customer_id = selectedCustomerId;
      const data = await getLoyaltyRewards(Object.keys(params).length ? params : undefined);
      setRewards(Array.isArray(data) ? data : []);
    } catch (error) {
      showSnackbar(safeError(error, "Failed to load rewards"), "error");
    } finally {
      setRewardsLoading(false);
    }
  }, [canManage, rewardStatusFilter, selectedCustomerId, showSnackbar]);

  const openCustomerDetail = React.useCallback(async (customerId: number) => {
    setSelectedCustomerId(customerId);
    setCustomerDetailOpen(true);
    setCustomerDetailLoading(true);
    setCustomerDetail(null);
    setCustomerRewards([]);
    try {
      const [detail, rewardsData] = await Promise.all([
        getLoyaltyMembership(customerId),
        getLoyaltyRewards({ customer_id: customerId }),
      ]);
      setCustomerDetail(detail);
      setCustomerRewards(Array.isArray(rewardsData) ? rewardsData : []);
    } catch (error) {
      showSnackbar(safeError(error, "Failed to load customer loyalty details"), "error");
    } finally {
      setCustomerDetailLoading(false);
    }
  }, [showSnackbar]);

  const closeCustomerDetail = () => {
    setCustomerDetailOpen(false);
  };

  const loadSummary = React.useCallback(async () => {
    if (!canManage) return;
    setSummaryLoading(true);
    try {
      const data = await getLoyaltySummary();
      setSummary(data);
    } catch (error) {
      showSnackbar(safeError(error, "Failed to load loyalty summary"), "error");
    } finally {
      setSummaryLoading(false);
    }
  }, [canManage, showSnackbar]);

  React.useEffect(() => {
    if (!canManage) return;
    const t = setTimeout(() => {
      void loadMemberships();
      void loadSummary();
    }, 0);
    return () => clearTimeout(t);
  }, [canManage, loadMemberships, loadSummary]);

  React.useEffect(() => {
    if (!canManage) return;
    const t = setTimeout(() => { void loadRewards(); }, 0);
    return () => clearTimeout(t);
  }, [canManage, loadRewards]);

  const handleLookup = async () => {
    const code = lookupCode.trim();
    if (!code) {
      setLookupError("Enter a reward code.");
      return;
    }
    setLookupLoading(true);
    setLookupError("");
    setLookupResult(null);
    setRedeemOrderId("");
    try {
      const result = await lookupLoyaltyReward(code);
      setLookupResult(result);
    } catch (error: unknown) {
      const status = (error as { response?: { status?: number } })?.response?.status;
      const msg = status === 404 ? "Reward not found." : safeError(error, "Failed to look up reward.");
      setLookupError(msg);
    } finally {
      setLookupLoading(false);
    }
  };

  const handleRedeem = async () => {
    if (!lookupResult?.reward?.reward_code) return;
    if (!lookupResult.redeemable) return;
    setRedeeming(true);
    try {
      const orderIdNum = redeemOrderId.trim() ? Number(redeemOrderId.trim()) : undefined;
      const res = await redeemLoyaltyReward({
        reward_code: String((lookupResult.reward as Record<string, unknown>).reward_code ?? ""),
        order_id: Number.isFinite(orderIdNum as number) ? (orderIdNum as number) : undefined,
        metadata: Number.isFinite(orderIdNum as number) ? { source: "rewards_page_cash_settlement", payment_mode: "cash" } : undefined,
      });
      showSnackbar(
        Number.isFinite(orderIdNum as number)
          ? `Reward redeemed and applied to Order #${orderIdNum} (cash).`
          : "Reward redeemed successfully.",
        "success",
      );
      setLookupResult({
        reward: (res?.reward ?? { ...(lookupResult.reward as Record<string, unknown>), status: "redeemed" }) as Record<string, unknown>,
        redeemable: false,
        effective_status: "redeemed",
      });
      setRedeemOrderId("");
      if (canManage) {
        void loadRewards();
        void loadMemberships();
        void loadSummary();
      }
    } catch (error) {
      showSnackbar(safeError(error, "Failed to redeem reward"), "error");
    } finally {
      setRedeeming(false);
    }
  };

  const openRevoke = (reward: Record<string, unknown>) => {
    setRevokeDialog({ open: true, reward, reason: "", submitting: false });
  };

  const closeRevoke = () => {
    if (revokeDialog.submitting) return;
    setRevokeDialog({ open: false, reward: null, reason: "", submitting: false });
  };

  const submitRevoke = async () => {
    if (!revokeDialog.reward?.id) return;
    const reason = revokeDialog.reason.trim();
    if (!reason) {
      showSnackbar("Please provide a reason for revoking this reward.", "warning");
      return;
    }
    setRevokeDialog((p) => ({ ...p, submitting: true }));
    try {
      await revokeLoyaltyReward(Number((revokeDialog.reward as Record<string, unknown>).id), reason);
      showSnackbar("Reward revoked.", "success");
      closeRevoke();
      await loadRewards();
      await loadMemberships();
      await loadSummary();
      if (lookupResult?.reward?.id === revokeDialog.reward.id) {
        setLookupResult((prev) => prev ? { ...prev, redeemable: false, effective_status: "revoked", reward: { ...prev.reward, status: "revoked" } } : prev);
      }
    } catch (error) {
      showSnackbar(safeError(error, "Failed to revoke reward"), "error");
      setRevokeDialog((p) => ({ ...p, submitting: false }));
    }
  };

  const totalMembers = memberships.length;
  const totalAvailableRewards = memberships.reduce((sum, m) => sum + (Number(m.available_rewards_count) || 0), 0);
  const totalLifetimeOrders = memberships.reduce((sum, m) => sum + (Number(m.lifetime_eligible_orders) || 0), 0);

  return (
    <Box sx={{ display: "grid", gap: 2.5 }}>
      <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ xs: "flex-start", sm: "center" }} spacing={1.5}>
        <Stack spacing={0.75}>
          <Typography sx={{ fontWeight: 900, fontSize: "1.35rem" }}>Loyalty Rewards & Customers</Typography>
          <Typography sx={{ color: "var(--muted-foreground)" }}>
            {canManage
              ? "Look up and redeem rewards, and review customer progress and issued rewards for your restaurant."
              : "Look up reward codes and redeem eligible rewards for customers."}
          </Typography>
        </Stack>
        {canManage ? (
          <Button component={Link} href="/business-admin/loyalty" variant="outlined" sx={{ borderRadius: "12px", textTransform: "none", fontWeight: 700 }}>
            Loyalty settings
          </Button>
        ) : null}
      </Stack>

      <Paper sx={{ p: { xs: 2, md: 3 }, borderRadius: "22px", border: "1px solid var(--border)", backgroundColor: "var(--card)" }}>
        <Stack spacing={2}>
          <Stack direction="row" spacing={1} alignItems="center">
            <RedeemRoundedIcon sx={{ color: "var(--primary)" }} />
            <Typography sx={{ fontWeight: 800 }}>Reward lookup & redemption</Typography>
          </Stack>
          <Typography sx={{ color: "var(--muted-foreground)", fontSize: "0.9rem" }}>
            Enter the customer’s reward code to verify eligibility and redeem it. Redemption is validated server-side and can only be used once.
          </Typography>

          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} alignItems={{ xs: "stretch", sm: "flex-start" }}>
            <TextField
              label="Reward code"
              value={lookupCode}
              onChange={(e) => setLookupCode(e.target.value.toUpperCase())}
              onKeyDown={(e) => { if (e.key === "Enter") void handleLookup(); }}
              fullWidth
              size="small"
              placeholder="e.g. ABCD1234"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchRoundedIcon fontSize="small" />
                  </InputAdornment>
                ),
              }}
              sx={{ maxWidth: { sm: 420 } }}
            />
            <Button
              variant="contained"
              onClick={() => void handleLookup()}
              disabled={lookupLoading}
              sx={{ borderRadius: "12px", textTransform: "none", fontWeight: 700, minWidth: 140 }}
            >
              {lookupLoading ? "Looking up…" : "Look up"}
            </Button>
          </Stack>

          {lookupError ? <Alert severity="error" sx={{ borderRadius: "12px" }}>{lookupError}</Alert> : null}

          {lookupResult ? (
            <Paper variant="outlined" sx={{ p: 2, borderRadius: "16px", borderColor: "var(--border)", backgroundColor: "var(--background)" }}>
              <Stack spacing={1.5}>
                <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ xs: "flex-start", sm: "center" }} spacing={1}>
                  <Stack direction="row" spacing={1} alignItems="center" useFlexGap flexWrap="wrap">
                    <Typography sx={{ fontWeight: 800, fontSize: "1.05rem" }}>
                      {String((lookupResult.reward as Record<string, unknown> | undefined)?.reward_code || "Reward")}
                    </Typography>
                    <Chip
                      size="small"
                      label={String(lookupResult.effective_status || (lookupResult.reward as Record<string, unknown> | undefined)?.status || "unknown").replace(/_/g, " ")}
                      color={statusColor(String((lookupResult.effective_status || (lookupResult.reward as Record<string, unknown> | undefined)?.status) ?? ""))}
                      sx={{ fontWeight: 700, textTransform: "capitalize" }}
                    />
                    {lookupResult.redeemable ? <Chip size="small" label="Redeemable" color="success" variant="outlined" /> : null}
                  </Stack>                  {canRedeem ? (
                    <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ xs: "stretch", sm: "center" }}>
                      <TextField
                        label="Order ID (cash settlement, optional)"
                        value={redeemOrderId}
                        onChange={(e) => setRedeemOrderId(e.target.value.replace(/[^0-9]/g, ""))}
                        size="small"
                        placeholder="e.g. 123"
                        disabled={!lookupResult.redeemable || redeeming}
                        sx={{ width: { xs: "100%", sm: 230 } }}
                      />
                      <Button
                        variant="contained"
                        color="success"
                        onClick={() => void handleRedeem()}
                        disabled={!lookupResult.redeemable || redeeming}
                        sx={{ borderRadius: "12px", textTransform: "none", fontWeight: 800, whiteSpace: "nowrap" }}
                      >
                        {redeeming ? "Redeeming…" : redeemOrderId.trim() ? "Apply to order (cash)" : "Redeem reward"}
                      </Button>
                    </Stack>
                  ) : null}
                </Stack>

                <Divider />

                <Stack direction={{ xs: "column", md: "row" }} spacing={2} useFlexGap flexWrap="wrap">
                  <Box sx={{ minWidth: 220, flex: 1 }}>
                    <Typography sx={{ fontSize: "0.78rem", color: "var(--muted-foreground)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em" }}>Customer</Typography>
                    <Typography sx={{ fontWeight: 700 }}>
                      {String(((lookupResult.reward as Record<string, unknown> | undefined)?.customer as Record<string, unknown> | undefined)?.name || "Customer")}
                    </Typography>
                    <Typography sx={{ color: "var(--muted-foreground)", fontSize: "0.9rem" }}>
                      {String(((lookupResult.reward as Record<string, unknown> | undefined)?.customer as Record<string, unknown> | undefined)?.email || ((lookupResult.reward as Record<string, unknown> | undefined)?.customer as Record<string, unknown> | undefined)?.phone || "—")}
                    </Typography>
                  </Box>
                  <Box sx={{ minWidth: 220, flex: 1 }}>
                    <Typography sx={{ fontSize: "0.78rem", color: "var(--muted-foreground)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em" }}>Reward</Typography>
                    <Typography sx={{ fontWeight: 700, textTransform: "capitalize" }}>
                      {String((lookupResult.reward as Record<string, unknown> | undefined)?.reward_type || "Reward").replace(/_/g, " ")}
                      {(lookupResult.reward as Record<string, unknown> | undefined)?.reward_value != null ? ` (${String((lookupResult.reward as Record<string, unknown> | undefined)?.reward_value ?? "")})` : ""}
                    </Typography>
                    <Typography sx={{ color: "var(--muted-foreground)", fontSize: "0.9rem" }}>
                      {String((lookupResult.reward as Record<string, unknown> | undefined)?.reward_description || ((lookupResult.reward as Record<string, unknown> | undefined)?.tier as Record<string, unknown> | undefined)?.reward_description || "—")}
                    </Typography>
                  </Box>
                  <Box sx={{ minWidth: 180 }}>
                    <Typography sx={{ fontSize: "0.78rem", color: "var(--muted-foreground)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em" }}>Validity</Typography>
                    <Typography sx={{ fontWeight: 700 }}>
                      {(lookupResult.reward as Record<string, unknown> | undefined)?.expires_at ? `Expires ${formatDateTime(String((lookupResult.reward as Record<string, unknown> | undefined)?.expires_at ?? ""))}` : "No expiry"}
                    </Typography>
                    <Typography sx={{ color: "var(--muted-foreground)", fontSize: "0.85rem" }}>
                      Issued {formatDateTime(String((lookupResult.reward as Record<string, unknown> | undefined)?.issued_at ?? ""))}
                    </Typography>
                  </Box>
                </Stack>

                {!lookupResult.redeemable && lookupResult.effective_status !== "redeemed" ? (
                  <Alert severity="warning" sx={{ borderRadius: "12px" }}>
                    This reward cannot be redeemed ({String(lookupResult.effective_status || "unavailable").replace(/_/g, " ")}).
                  </Alert>
                ) : null}
                {lookupResult.effective_status === "redeemed" ? (
                  <Alert severity="info" sx={{ borderRadius: "12px" }}>
                    Redeemed {formatDateTime(String((lookupResult.reward as Record<string, unknown> | undefined)?.redeemed_at ?? ""))}.
                  </Alert>
                ) : null}
              </Stack>
            </Paper>
          ) : null}
        </Stack>
      </Paper>

      {canManage ? (
        <>
          <Paper sx={{ p: { xs: 2, md: 3 }, borderRadius: "22px", border: "1px solid var(--border)", backgroundColor: "var(--card)" }}>
            <Stack spacing={2}>
              <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ xs: "flex-start", sm: "center" }} spacing={1.5}>
                <Box>
                  <Typography sx={{ fontWeight: 800 }}>Loyalty analytics</Typography>
                  <Typography sx={{ color: "var(--muted-foreground)", fontSize: "0.9rem" }}>
                    Tenant-scoped overview of members, rewards, and recent redemptions.
                  </Typography>
                </Box>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<RefreshRoundedIcon />}
                  onClick={() => { void loadSummary(); void loadMemberships(); void loadRewards(); }}
                  disabled={summaryLoading}
                  sx={{ borderRadius: "10px", textTransform: "none" }}
                >
                  Refresh
                </Button>
              </Stack>

              <Stack direction={{ xs: "column", md: "row" }} spacing={1} useFlexGap flexWrap="wrap">
                <Chip label={`Members: ${summary?.members.total ?? totalMembers}`} variant="outlined" />
                <Chip label={`Active: ${summary?.members.active ?? 0}`} variant="outlined" />
                <Chip label={`With progress: ${summary?.members.with_progress ?? 0}`} variant="outlined" />
                <Chip label={`Members w/ rewards: ${summary?.members.with_available_rewards ?? 0}`} color={(summary?.members.with_available_rewards ?? 0) > 0 ? "success" : "default"} variant="outlined" />
                <Chip label={`Lifetime eligible orders: ${summary?.members.lifetime_eligible_orders ?? totalLifetimeOrders}`} variant="outlined" />
              </Stack>
              <Stack direction={{ xs: "column", md: "row" }} spacing={1} useFlexGap flexWrap="wrap">
                <Chip label={`Issued: ${summary?.rewards.issued ?? rewards.length}`} variant="outlined" />
                <Chip label={`Available: ${summary?.rewards.available ?? totalAvailableRewards}`} color={(summary?.rewards.available ?? totalAvailableRewards) > 0 ? "success" : "default"} variant={(summary?.rewards.available ?? totalAvailableRewards) > 0 ? "filled" : "outlined"} />
                <Chip label={`Redeemed: ${summary?.rewards.redeemed ?? 0}`} color="info" variant="outlined" />
                <Chip label={`Expired: ${summary?.rewards.expired ?? 0}`} color="warning" variant="outlined" />
                <Chip label={`Revoked: ${summary?.rewards.revoked ?? 0}`} color="error" variant="outlined" />
              </Stack>
              {summary?.program ? (
                <Typography sx={{ fontSize: "0.85rem", color: "var(--muted-foreground)" }}>
                  Program: {summary.program.is_enabled ? "Enabled" : "Disabled"} · Policy: {String(summary.program.progress_policy || "—")} · Eligible statuses: {(summary.program.eligible_order_statuses || []).join(", ") || "—"}
                </Typography>
              ) : null}

              <Divider />
              <Box>
                <Typography sx={{ fontWeight: 800, mb: 1 }}>Recent redemptions</Typography>
                {summaryLoading && !summary ? (
                  <Box sx={{ display: "grid", placeItems: "center", py: 2 }}><CircularProgress size={22} /></Box>
                ) : (summary?.recent_redemptions?.length ?? 0) === 0 ? (
                  <Typography sx={{ color: "var(--muted-foreground)", fontSize: "0.9rem" }}>No redemptions recorded yet.</Typography>
                ) : (
                  <Box sx={{ overflowX: "auto" }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 800 }}>When</TableCell>
                          <TableCell sx={{ fontWeight: 800 }}>Customer</TableCell>
                          <TableCell sx={{ fontWeight: 800 }}>Reward</TableCell>
                          <TableCell sx={{ fontWeight: 800 }}>Order</TableCell>
                          <TableCell sx={{ fontWeight: 800 }}>Discount</TableCell>
                          <TableCell sx={{ fontWeight: 800 }}>By</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {summary!.recent_redemptions.map((r) => (
                          <TableRow key={String(r.id)} hover>
                            <TableCell sx={{ whiteSpace: "nowrap" }}>{formatDateTime(r.created_at || undefined)}</TableCell>
                            <TableCell>{r.customer?.name || r.customer?.email || r.customer?.phone || "—"}</TableCell>
                            <TableCell>
                              <Typography sx={{ fontWeight: 700, fontFamily: "monospace", fontSize: "0.85rem" }}>{r.reward?.reward_code || "—"}</Typography>
                              <Typography sx={{ fontSize: "0.78rem", color: "var(--muted-foreground)" }}>{r.reward?.reward_description || (r.reward?.reward_type ? String(r.reward.reward_type).replace(/_/g, " ") : "—")}</Typography>
                            </TableCell>
                            <TableCell>{r.order?.id ? `#${r.order.id}${r.order.order_type ? ` · ${String(r.order.order_type).replace(/_/g, " ")}` : ""}` : "—"}</TableCell>
                            <TableCell>{r.discount_amount != null && r.discount_amount !== "" ? `Rs. ${Number(r.discount_amount).toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}` : "—"}</TableCell>
                            <TableCell sx={{ textTransform: "capitalize" }}>{String(r.processed_role || "—").replace(/_/g, " ")}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </Box>
                )}
              </Box>
            </Stack>
          </Paper>

          <Paper sx={{ p: { xs: 2, md: 3 }, borderRadius: "22px", border: "1px solid var(--border)", backgroundColor: "var(--card)" }}>
            <Stack spacing={2}>
              <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ xs: "flex-start", sm: "center" }} spacing={1.5}>
                <Box>
                  <Typography sx={{ fontWeight: 800 }}>Customers & progress</Typography>
                  <Typography sx={{ color: "var(--muted-foreground)", fontSize: "0.9rem" }}>
                    Verified customers enrolled in this restaurant’s loyalty program and their current progress.
                  </Typography>
                </Box>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<RefreshRoundedIcon />}
                    onClick={() => void loadMemberships()}
                    disabled={membershipsLoading}
                    sx={{ borderRadius: "10px", textTransform: "none" }}
                  >
                    Refresh
                  </Button>
                </Stack>
              </Stack>

              <Stack direction={{ xs: "column", sm: "row" }} spacing={1} useFlexGap flexWrap="wrap">
                <Chip label={`${totalMembers} members (loaded)`} variant="outlined" />
                <Chip label={`${totalAvailableRewards} available rewards (loaded)`} color={totalAvailableRewards > 0 ? "success" : "default"} variant="outlined" />
                <Chip label={`${totalLifetimeOrders} lifetime eligible orders (loaded)`} variant="outlined" />
              </Stack>

              <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                <TextField
                  label="Search customers"
                  value={membershipSearch}
                  onChange={(e) => setMembershipSearch(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") void loadMemberships(); }}
                  size="small"
                  placeholder="Name, email, or phone"
                  sx={{ minWidth: { sm: 280 } }}
                />
                <Button variant="contained" onClick={() => void loadMemberships()} disabled={membershipsLoading} sx={{ borderRadius: "12px", textTransform: "none", fontWeight: 700 }}>
                  {membershipsLoading ? "Loading…" : "Search"}
                </Button>
              </Stack>

              {membershipsLoading && memberships.length === 0 ? (
                <Box sx={{ display: "grid", placeItems: "center", py: 4 }}><CircularProgress size={24} /></Box>
              ) : memberships.length === 0 ? (
                <Typography sx={{ color: "var(--muted-foreground)" }}>No loyalty members found yet. Members appear after verified customers place eligible orders.</Typography>
              ) : (
                <Box sx={{ overflowX: "auto" }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 800 }}>Customer</TableCell>
                        <TableCell sx={{ fontWeight: 800 }}>Progress</TableCell>
                        <TableCell sx={{ fontWeight: 800 }}>Next reward</TableCell>
                        <TableCell sx={{ fontWeight: 800 }}>Lifetime</TableCell>
                        <TableCell sx={{ fontWeight: 800 }}>Available</TableCell>
                        <TableCell sx={{ fontWeight: 800 }}>Last activity</TableCell>
                        <TableCell sx={{ fontWeight: 800 }} align="right">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {memberships.map((m) => (
                        <TableRow key={String(m.id)} hover>
                          <TableCell>
                            <Typography sx={{ fontWeight: 700 }}>{String((m.customer as Record<string, unknown> | undefined)?.name || "Customer")}</Typography>
                            <Typography sx={{ fontSize: "0.82rem", color: "var(--muted-foreground)" }}>
                              {String((m.customer as Record<string, unknown> | undefined)?.email || (m.customer as Record<string, unknown> | undefined)?.phone || "—")}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography sx={{ fontWeight: 700 }}>{Number(m.current_progress_count) || 0}</Typography>
                            <Typography sx={{ fontSize: "0.78rem", color: "var(--muted-foreground)" }}>current cycle</Typography>
                          </TableCell>
                          <TableCell>
                            {m.next_tier ? (
                              <>
                                <Typography sx={{ fontWeight: 700 }}>{String((m.next_tier as Record<string, unknown>).threshold_orders ?? "")} orders</Typography>
                                <Typography sx={{ fontSize: "0.82rem", color: "var(--muted-foreground)" }}>
                                  {String((m.progress_to_next as Record<string, unknown> | undefined)?.remaining ?? 0)} more to go
                                  {(m.next_tier as Record<string, unknown>).reward_description ? ` • ${String((m.next_tier as Record<string, unknown>).reward_description)}` : ""}
                                </Typography>
                              </>
                            ) : (
                              <Typography sx={{ color: "var(--muted-foreground)", fontSize: "0.85rem" }}>—</Typography>
                            )}
                          </TableCell>
                          <TableCell>{Number(m.lifetime_eligible_orders) || 0}</TableCell>
                          <TableCell>
                            <Chip size="small" label={Number(m.available_rewards_count) || 0} color={(Number(m.available_rewards_count) || 0) > 0 ? "success" : "default"} variant={(Number(m.available_rewards_count) || 0) > 0 ? "filled" : "outlined"} />
                          </TableCell>
                          <TableCell sx={{ whiteSpace: "nowrap" }}>{formatDateTime(String(m.last_reward_issued_at || m.updated_at || ""))}</TableCell>
                          <TableCell align="right">
                            <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                              <Button size="small" variant="text" onClick={() => void openCustomerDetail(Number(m.customer_id || (m.customer as Record<string, unknown> | undefined)?.id))} sx={{ textTransform: "none", fontWeight: 700 }}>
                                View
                              </Button>
                              <Button
                                size="small"
                                variant={selectedCustomerId === Number(m.customer_id || (m.customer as Record<string, unknown> | undefined)?.id) ? "contained" : "outlined"}
                                onClick={() => setSelectedCustomerId((prev) => {
                                  const id = Number(m.customer_id || (m.customer as Record<string, unknown> | undefined)?.id);
                                  return prev === id ? null : id;
                                })}
                                sx={{ textTransform: "none", fontWeight: 700 }}
                              >
                                {selectedCustomerId === Number(m.customer_id || (m.customer as Record<string, unknown> | undefined)?.id) ? "Filtered" : "History"}
                              </Button>
                            </Stack>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Box>
              )}
            </Stack>
          </Paper>

          <Paper sx={{ p: { xs: 2, md: 3 }, borderRadius: "22px", border: "1px solid var(--border)", backgroundColor: "var(--card)" }}>
            <Stack spacing={2}>
              <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ xs: "flex-start", sm: "center" }} spacing={1.5}>
                <Box>
                  <Typography sx={{ fontWeight: 800 }}>Issued rewards</Typography>
                  <Typography sx={{ color: "var(--muted-foreground)", fontSize: "0.9rem" }}>
                    Track issued, redeemed, expired, and revoked rewards. You can revoke an unused reward with a reason.
                  </Typography>
                  {selectedCustomerId ? (
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }} useFlexGap flexWrap="wrap">
                      <Chip size="small" color="primary" label={`Filtered to customer #${selectedCustomerId}`} />
                      <Button size="small" variant="text" onClick={() => setSelectedCustomerId(null)} sx={{ textTransform: "none", fontWeight: 700 }}>
                        Clear filter
                      </Button>
                      <Button size="small" variant="text" onClick={() => void openCustomerDetail(selectedCustomerId)} sx={{ textTransform: "none", fontWeight: 700 }}>
                        View details
                      </Button>
                    </Stack>
                  ) : null}
                </Box>
                <Stack direction="row" spacing={1} alignItems="center">
                  <FormControl size="small" sx={{ minWidth: 160 }}>
                    <InputLabel id="reward-status-filter-label">Status</InputLabel>
                    <Select
                      labelId="reward-status-filter-label"
                      label="Status"
                      value={rewardStatusFilter}
                      onChange={(e) => setRewardStatusFilter(e.target.value)}
                    >
                      <MenuItem value="">All</MenuItem>
                      <MenuItem value="available">Available</MenuItem>
                      <MenuItem value="redeemed">Redeemed</MenuItem>
                      <MenuItem value="expired">Expired</MenuItem>
                      <MenuItem value="revoked">Revoked</MenuItem>
                    </Select>
                  </FormControl>
                  <Button variant="outlined" size="small" startIcon={<RefreshRoundedIcon />} onClick={() => void loadRewards()} disabled={rewardsLoading} sx={{ borderRadius: "10px", textTransform: "none" }}>
                    Refresh
                  </Button>
                </Stack>
              </Stack>

              {rewardsLoading && rewards.length === 0 ? (
                <Box sx={{ display: "grid", placeItems: "center", py: 4 }}><CircularProgress size={24} /></Box>
              ) : rewards.length === 0 ? (
                <Typography sx={{ color: "var(--muted-foreground)" }}>No rewards found for the selected filter.</Typography>
              ) : (
                <Box sx={{ overflowX: "auto" }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 800 }}>Code</TableCell>
                        <TableCell sx={{ fontWeight: 800 }}>Customer</TableCell>
                        <TableCell sx={{ fontWeight: 800 }}>Reward</TableCell>
                        <TableCell sx={{ fontWeight: 800 }}>Status</TableCell>
                        <TableCell sx={{ fontWeight: 800 }}>History</TableCell>
                        <TableCell sx={{ fontWeight: 800 }} align="right">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {rewards.map((r) => (
                        <TableRow key={String(r.id)} hover>
                          <TableCell sx={{ fontWeight: 700, fontFamily: "monospace" }}>{String(r.reward_code ?? "")}</TableCell>
                          <TableCell>
                            <Typography sx={{ fontWeight: 700 }}>{String((r.customer as Record<string, unknown> | undefined)?.name || "Customer")}</Typography>
                            <Typography sx={{ fontSize: "0.82rem", color: "var(--muted-foreground)" }}>{String((r.customer as Record<string, unknown> | undefined)?.email || (r.customer as Record<string, unknown> | undefined)?.phone || "—")}</Typography>
                          </TableCell>
                          <TableCell>
                            <Typography sx={{ fontWeight: 700, textTransform: "capitalize" }}>{String(r.reward_type || "").replace(/_/g, " ")}</Typography>
                            <Typography sx={{ fontSize: "0.82rem", color: "var(--muted-foreground)" }}>{String(r.reward_description || "—")}</Typography>
                          </TableCell>
                          <TableCell>
                            <Chip size="small" label={String(r.status || "unknown")} color={statusColor(String(r.status ?? ""))} sx={{ textTransform: "capitalize", fontWeight: 700 }} />
                          </TableCell>
                          <TableCell sx={{ minWidth: 220 }}>
                            <Typography sx={{ fontSize: "0.85rem" }}>Issued: {formatDateTime(String(r.issued_at ?? ""))}</Typography>
                            <Typography sx={{ fontSize: "0.78rem", color: "var(--muted-foreground)" }}>
                              {r.expires_at ? `Expires: ${formatDateTime(String(r.expires_at ?? ""))}` : "No expiry"}
                            </Typography>
                            {r.status === "redeemed" ? (
                              <Typography sx={{ fontSize: "0.78rem", color: "var(--muted-foreground)" }}>
                                Redeemed: {formatDateTime(String(r.redeemed_at ?? ""))}
                                {r.redeemed_order_id || (r.redemption as Record<string, unknown> | undefined)?.order_id ? ` • Order #${String(r.redeemed_order_id || (r.redemption as Record<string, unknown> | undefined)?.order_id)}` : ""}
                                {(r.redemption as Record<string, unknown> | undefined)?.discount_amount != null ? ` • Rs. ${Number((r.redemption as Record<string, unknown>).discount_amount).toLocaleString("en-IN", { maximumFractionDigits: 2 })}` : ""}
                              </Typography>
                            ) : null}
                            {r.status === "revoked" && r.revocation_reason ? (
                              <Typography sx={{ fontSize: "0.78rem", color: "var(--muted-foreground)" }}>
                                Reason: {String(r.revocation_reason)}
                              </Typography>
                            ) : null}
                          </TableCell>
                          <TableCell align="right">
                            {r.status === "available" ? (
                              <Button
                                size="small"
                                color="error"
                                variant="text"
                                startIcon={<BlockRoundedIcon fontSize="small" />}
                                onClick={() => openRevoke(r)}
                                sx={{ textTransform: "none", fontWeight: 700 }}
                              >
                                Revoke
                              </Button>
                            ) : (
                              <Typography sx={{ fontSize: "0.8rem", color: "var(--muted-foreground)" }}>—</Typography>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Box>
              )}
            </Stack>
          </Paper>
        </>
      ) : null}

      <Dialog open={revokeDialog.open} onClose={closeRevoke} fullWidth maxWidth="xs" PaperProps={{ sx: { borderRadius: "16px" } }}>
        <DialogTitle sx={{ fontWeight: 800 }}>Revoke reward</DialogTitle>
        <DialogContent>
          <Stack spacing={1.5} sx={{ pt: 1 }}>
            <Typography sx={{ color: "var(--muted-foreground)", fontSize: "0.9rem" }}>
              Revoking prevents this reward from being redeemed. This action is recorded in the audit log.
            </Typography>
            <TextField
              label="Reason"
              value={revokeDialog.reason}
              onChange={(e) => setRevokeDialog((p) => ({ ...p, reason: e.target.value }))}
              fullWidth
              size="small"
              multiline
              minRows={2}
              autoFocus
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={closeRevoke} disabled={revokeDialog.submitting} sx={{ textTransform: "none" }}>Cancel</Button>
          <Button color="error" variant="contained" onClick={() => void submitRevoke()} disabled={revokeDialog.submitting} sx={{ textTransform: "none", fontWeight: 700 }}>
            {revokeDialog.submitting ? "Revoking…" : "Revoke"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={customerDetailOpen} onClose={closeCustomerDetail} fullWidth maxWidth="md" PaperProps={{ sx: { borderRadius: "16px" } }}>
        <DialogTitle sx={{ fontWeight: 800 }}>Customer loyalty details</DialogTitle>
        <DialogContent dividers>
          {customerDetailLoading ? (
            <Box sx={{ display: "grid", placeItems: "center", py: 4 }}><CircularProgress size={24} /></Box>
          ) : !customerDetail ? (
            <Typography sx={{ color: "var(--muted-foreground)" }}>No details available.</Typography>
          ) : (
            <Stack spacing={2}>
              <Paper variant="outlined" sx={{ p: 1.5, borderRadius: "12px", borderColor: "var(--border)" }}>
                <Stack direction={{ xs: "column", md: "row" }} spacing={2} useFlexGap flexWrap="wrap">
                  <Box sx={{ minWidth: 220, flex: 1 }}>
                    <Typography sx={{ fontSize: "0.78rem", color: "var(--muted-foreground)", fontWeight: 700, textTransform: "uppercase" }}>Customer</Typography>
                    <Typography sx={{ fontWeight: 800 }}>{String((customerDetail.membership as Record<string, unknown> | undefined)?.customer ? ((customerDetail.membership as Record<string, unknown>).customer as Record<string, unknown>).name : "") || "Customer"}</Typography>
                    <Typography sx={{ color: "var(--muted-foreground)", fontSize: "0.9rem" }}>{String(((customerDetail.membership as Record<string, unknown> | undefined)?.customer as Record<string, unknown> | undefined)?.email || ((customerDetail.membership as Record<string, unknown> | undefined)?.customer as Record<string, unknown> | undefined)?.phone || "—")}</Typography>
                  </Box>
                  <Box sx={{ minWidth: 180 }}>
                    <Typography sx={{ fontSize: "0.78rem", color: "var(--muted-foreground)", fontWeight: 700, textTransform: "uppercase" }}>Progress</Typography>
                    <Typography sx={{ fontWeight: 800 }}>{Number((customerDetail.membership as Record<string, unknown> | undefined)?.current_progress_count) || 0} current</Typography>
                    <Typography sx={{ color: "var(--muted-foreground)", fontSize: "0.9rem" }}>Lifetime eligible orders: {Number((customerDetail.membership as Record<string, unknown> | undefined)?.lifetime_eligible_orders) || 0}</Typography>
                    <Typography sx={{ color: "var(--muted-foreground)", fontSize: "0.85rem" }}>Available rewards: {Array.isArray(customerDetail.available_rewards) ? customerDetail.available_rewards.length : 0}</Typography>
                  </Box>
                  <Box sx={{ minWidth: 220, flex: 1 }}>
                    <Typography sx={{ fontSize: "0.78rem", color: "var(--muted-foreground)", fontWeight: 700, textTransform: "uppercase" }}>Next reward</Typography>
                    {customerDetail.next_tier ? (
                      <>
                        <Typography sx={{ fontWeight: 700 }}>{String((customerDetail.next_tier as Record<string, unknown>).threshold_orders ?? "")} orders</Typography>
                        <Typography sx={{ color: "var(--muted-foreground)", fontSize: "0.9rem" }}>{String((customerDetail.next_tier as Record<string, unknown>).reward_description || (customerDetail.next_tier as Record<string, unknown>).name || "Reward tier")}</Typography>
                      </>
                    ) : (
                      <Typography sx={{ color: "var(--muted-foreground)" }}>No upcoming tier</Typography>
                    )}
                  </Box>
                </Stack>
              </Paper>
              <Box>
                <Typography sx={{ fontWeight: 800, mb: 1 }}>Reward history</Typography>
                {customerRewards.length === 0 ? (
                  <Typography sx={{ color: "var(--muted-foreground)" }}>No rewards found for this customer.</Typography>
                ) : (
                  <Box sx={{ overflowX: "auto" }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 800 }}>Code</TableCell>
                          <TableCell sx={{ fontWeight: 800 }}>Reward</TableCell>
                          <TableCell sx={{ fontWeight: 800 }}>Status</TableCell>
                          <TableCell sx={{ fontWeight: 800 }}>History</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {customerRewards.map((r) => (
                          <TableRow key={String(r.id)} hover>
                            <TableCell sx={{ fontFamily: "monospace", fontWeight: 700 }}>{String(r.reward_code || `#${String(r.id)}`)}</TableCell>
                            <TableCell>
                              <Typography sx={{ fontWeight: 700, textTransform: "capitalize" }}>{String(r.reward_type || "").replace(/_/g, " ")}</Typography>
                              <Typography sx={{ fontSize: "0.82rem", color: "var(--muted-foreground)" }}>{String(r.reward_description || "—")}</Typography>
                            </TableCell>
                            <TableCell><Chip size="small" label={String(r.status || "unknown")} color={statusColor(String(r.status ?? ""))} sx={{ textTransform: "capitalize", fontWeight: 700 }} /></TableCell>
                            <TableCell>
                              <Typography sx={{ fontSize: "0.85rem" }}>Issued: {formatDateTime(String(r.issued_at ?? ""))}</Typography>
                              {r.redeemed_at ? (
                                <Typography sx={{ fontSize: "0.78rem", color: "var(--muted-foreground)" }}>
                                  Redeemed: {formatDateTime(String(r.redeemed_at))}{r.redeemed_order_id || (r.redemption as Record<string, unknown> | undefined)?.order_id ? ` • Order #${String(r.redeemed_order_id || (r.redemption as Record<string, unknown> | undefined)?.order_id)}` : ""}{(r.redemption as Record<string, unknown> | undefined)?.discount_amount != null ? ` • Rs. ${Number((r.redemption as Record<string, unknown>).discount_amount).toLocaleString("en-IN", { maximumFractionDigits: 2 })}` : ""}
                                </Typography>
                              ) : null}
                              {r.revocation_reason ? <Typography sx={{ fontSize: "0.78rem", color: "var(--muted-foreground)" }}>Reason: {String(r.revocation_reason)}</Typography> : null}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </Box>
                )}
              </Box>
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}><Button onClick={closeCustomerDetail} sx={{ textTransform: "none" }}>Close</Button></DialogActions>
      </Dialog>
    </Box>
  );
}
