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
  getLoyaltyMemberships,
  getLoyaltyRewards,
  lookupLoyaltyReward,
  redeemLoyaltyReward,
  revokeLoyaltyReward,
} from "@/lib/api";
import { safeError } from "@/lib/safeError";

type LookupResult = {
  reward: any;
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
  const { role } = useAuth();
  const { showSnackbar } = useAppSnackbar();
  const canManage = role === "admin" || role === "manager";
  const canRedeem = role === "admin" || role === "manager" || role === "cashier";

  const [lookupCode, setLookupCode] = React.useState("");
  const [lookupLoading, setLookupLoading] = React.useState(false);
  const [lookupResult, setLookupResult] = React.useState<LookupResult | null>(null);
  const [lookupError, setLookupError] = React.useState("");
  const [redeeming, setRedeeming] = React.useState(false);
  const [redeemOrderId, setRedeemOrderId] = React.useState("");

  const [memberships, setMemberships] = React.useState<any[]>([]);
  const [membershipsLoading, setMembershipsLoading] = React.useState(false);
  const [membershipSearch, setMembershipSearch] = React.useState("");

  const [rewards, setRewards] = React.useState<any[]>([]);
  const [rewardsLoading, setRewardsLoading] = React.useState(false);
  const [rewardStatusFilter, setRewardStatusFilter] = React.useState<string>("");

  const [revokeDialog, setRevokeDialog] = React.useState<{ open: boolean; reward: any | null; reason: string; submitting: boolean }>({
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
      const data = await getLoyaltyRewards(rewardStatusFilter ? { status: rewardStatusFilter } : undefined);
      setRewards(Array.isArray(data) ? data : []);
    } catch (error) {
      showSnackbar(safeError(error, "Failed to load rewards"), "error");
    } finally {
      setRewardsLoading(false);
    }
  }, [canManage, rewardStatusFilter, showSnackbar]);

  React.useEffect(() => {
    if (canManage) {
      void loadMemberships();
      void loadRewards();
    }
  }, [canManage]); // eslint-disable-line react-hooks/exhaustive-deps

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
    } catch (error: any) {
      const msg = error?.response?.status === 404 ? "Reward not found." : safeError(error, "Failed to look up reward.");
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
        reward_code: lookupResult.reward.reward_code,
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
        reward: res?.reward ?? { ...lookupResult.reward, status: "redeemed" },
        redeemable: false,
        effective_status: "redeemed",
      });
      setRedeemOrderId("");
      if (canManage) {
        void loadRewards();
        void loadMemberships();
      }
    } catch (error) {
      showSnackbar(safeError(error, "Failed to redeem reward"), "error");
    } finally {
      setRedeeming(false);
    }
  };

  const openRevoke = (reward: any) => {
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
      await revokeLoyaltyReward(revokeDialog.reward.id, reason);
      showSnackbar("Reward revoked.", "success");
      closeRevoke();
      await loadRewards();
      await loadMemberships();
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
                      {lookupResult.reward?.reward_code || "Reward"}
                    </Typography>
                    <Chip
                      size="small"
                      label={String(lookupResult.effective_status || lookupResult.reward?.status || "unknown").replace(/_/g, " ")}
                      color={statusColor(lookupResult.effective_status || lookupResult.reward?.status)}
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
                      {lookupResult.reward?.customer?.name || "Customer"}
                    </Typography>
                    <Typography sx={{ color: "var(--muted-foreground)", fontSize: "0.9rem" }}>
                      {lookupResult.reward?.customer?.email || lookupResult.reward?.customer?.phone || "—"}
                    </Typography>
                  </Box>
                  <Box sx={{ minWidth: 220, flex: 1 }}>
                    <Typography sx={{ fontSize: "0.78rem", color: "var(--muted-foreground)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em" }}>Reward</Typography>
                    <Typography sx={{ fontWeight: 700, textTransform: "capitalize" }}>
                      {String(lookupResult.reward?.reward_type || "Reward").replace(/_/g, " ")}
                      {lookupResult.reward?.reward_value != null ? ` (${lookupResult.reward.reward_value})` : ""}
                    </Typography>
                    <Typography sx={{ color: "var(--muted-foreground)", fontSize: "0.9rem" }}>
                      {lookupResult.reward?.reward_description || lookupResult.reward?.tier?.reward_description || "—"}
                    </Typography>
                  </Box>
                  <Box sx={{ minWidth: 180 }}>
                    <Typography sx={{ fontSize: "0.78rem", color: "var(--muted-foreground)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em" }}>Validity</Typography>
                    <Typography sx={{ fontWeight: 700 }}>
                      {lookupResult.reward?.expires_at ? `Expires ${formatDateTime(lookupResult.reward.expires_at)}` : "No expiry"}
                    </Typography>
                    <Typography sx={{ color: "var(--muted-foreground)", fontSize: "0.85rem" }}>
                      Issued {formatDateTime(lookupResult.reward?.issued_at)}
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
                    Redeemed {formatDateTime(lookupResult.reward?.redeemed_at)}.
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
                <Chip label={`${totalMembers} members`} variant="outlined" />
                <Chip label={`${totalAvailableRewards} available rewards`} color={totalAvailableRewards > 0 ? "success" : "default"} variant="outlined" />
                <Chip label={`${totalLifetimeOrders} lifetime eligible orders`} variant="outlined" />
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
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {memberships.map((m) => (
                        <TableRow key={m.id} hover>
                          <TableCell>
                            <Typography sx={{ fontWeight: 700 }}>{m.customer?.name || "Customer"}</Typography>
                            <Typography sx={{ fontSize: "0.82rem", color: "var(--muted-foreground)" }}>
                              {m.customer?.email || m.customer?.phone || "—"}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography sx={{ fontWeight: 700 }}>{Number(m.current_progress_count) || 0}</Typography>
                            <Typography sx={{ fontSize: "0.78rem", color: "var(--muted-foreground)" }}>current cycle</Typography>
                          </TableCell>
                          <TableCell>
                            {m.next_tier ? (
                              <>
                                <Typography sx={{ fontWeight: 700 }}>{m.next_tier.threshold_orders} orders</Typography>
                                <Typography sx={{ fontSize: "0.82rem", color: "var(--muted-foreground)" }}>
                                  {m.progress_to_next?.remaining ?? 0} more to go
                                  {m.next_tier.reward_description ? ` · ${m.next_tier.reward_description}` : ""}
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
                          <TableCell sx={{ whiteSpace: "nowrap" }}>{formatDateTime(m.last_reward_issued_at || m.updated_at)}</TableCell>
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
                        <TableCell sx={{ fontWeight: 800 }}>Issued / Expires</TableCell>
                        <TableCell sx={{ fontWeight: 800 }} align="right">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {rewards.map((r) => (
                        <TableRow key={r.id} hover>
                          <TableCell sx={{ fontWeight: 700, fontFamily: "monospace" }}>{r.reward_code}</TableCell>
                          <TableCell>
                            <Typography sx={{ fontWeight: 700 }}>{r.customer?.name || "Customer"}</Typography>
                            <Typography sx={{ fontSize: "0.82rem", color: "var(--muted-foreground)" }}>{r.customer?.email || r.customer?.phone || "—"}</Typography>
                          </TableCell>
                          <TableCell>
                            <Typography sx={{ fontWeight: 700, textTransform: "capitalize" }}>{String(r.reward_type || "").replace(/_/g, " ")}</Typography>
                            <Typography sx={{ fontSize: "0.82rem", color: "var(--muted-foreground)" }}>{r.reward_description || "—"}</Typography>
                          </TableCell>
                          <TableCell>
                            <Chip size="small" label={String(r.status || "unknown")} color={statusColor(r.status)} sx={{ textTransform: "capitalize", fontWeight: 700 }} />
                          </TableCell>
                          <TableCell>
                            <Typography sx={{ fontSize: "0.85rem" }}>{formatDateTime(r.issued_at)}</Typography>
                            <Typography sx={{ fontSize: "0.78rem", color: "var(--muted-foreground)" }}>{r.expires_at ? `Expires ${formatDateTime(r.expires_at)}` : "No expiry"}</Typography>
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
    </Box>
  );
}
