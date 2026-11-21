"use client";

import * as React from "react";
import Link from "next/link";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  FormControlLabel,
  IconButton,
  InputLabel,
  MenuItem,
  Pagination,
  Paper,
  Select,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import { useAppSnackbar } from "@/components/common/SnackBar";
import {
  createLoyaltyTier,
  deleteLoyaltyTier,
  getLoyaltyAuditLogs,
  getLoyaltyProgram,
  getLoyaltyTrends,
  saveLoyaltyProgram,
  updateLoyaltyTier,
  type LoyaltyAuditLogItem,
  type LoyaltyProgram,
  type LoyaltyTier,
  type LoyaltyTrendsResponse,
} from "@/lib/api";
import { safeError } from "@/lib/safeError";

const STATUS_OPTIONS = ["pending", "confirmed", "preparing", "ready", "served", "closed"];
const ORDER_TYPE_OPTIONS = ["dine_in", "takeaway"];
const POLICY_OPTIONS: Array<{ value: LoyaltyProgram["progress_policy"]; label: string; hint: string }> = [
  { value: "accumulate", label: "Accumulate", hint: "Progress keeps building across milestones." },
  { value: "reset", label: "Reset", hint: "Progress resets after a reward milestone is issued." },
  { value: "rolling", label: "Rolling", hint: "Tracks progress continuously (advanced behavior)." },
];
const REWARD_TYPE_OPTIONS: Array<{ value: LoyaltyTier["reward_type"]; label: string }> = [
  { value: "percentage_discount", label: "Percentage discount" },
  { value: "fixed_discount", label: "Fixed discount" },
  { value: "free_item", label: "Free item" },
  { value: "free_drink", label: "Free drink" },
  { value: "custom", label: "Custom" },
];

type TierFormState = {
  id?: number;
  name: string;
  threshold_orders: string;
  reward_type: LoyaltyTier["reward_type"];
  reward_value: string;
  reward_description: string;
  validity_days: string;
  min_order_amount: string;
  applicable_order_types: string[];
  is_active: boolean;
};

const emptyTierForm = (): TierFormState => ({
  name: "",
  threshold_orders: "5",
  reward_type: "percentage_discount",
  reward_value: "",
  reward_description: "",
  validity_days: "",
  min_order_amount: "",
  applicable_order_types: [],
  is_active: true,
});

const tierToForm = (tier: LoyaltyTier): TierFormState => ({
  id: tier.id,
  name: tier.name ?? "",
  threshold_orders: String(tier.threshold_orders ?? ""),
  reward_type: tier.reward_type ?? "custom",
  reward_value: tier.reward_value == null ? "" : String(tier.reward_value),
  reward_description: tier.reward_description ?? "",
  validity_days: tier.validity_days == null ? "" : String(tier.validity_days),
  min_order_amount: tier.min_order_amount == null ? "" : String(tier.min_order_amount),
  applicable_order_types: Array.isArray(tier.applicable_order_types) ? tier.applicable_order_types : [],
  is_active: tier.is_active !== false,
});

export default function BusinessAdminLoyaltyPage() {
  const { showSnackbar } = useAppSnackbar();
  const [loading, setLoading] = React.useState(true);
  const [savingProgram, setSavingProgram] = React.useState(false);
  const [savingTier, setSavingTier] = React.useState(false);
  const [program, setProgram] = React.useState<LoyaltyProgram | null>(null);
  const [tierDialogOpen, setTierDialogOpen] = React.useState(false);
  const [tierForm, setTierForm] = React.useState<TierFormState>(emptyTierForm());
  const [auditLogs, setAuditLogs] = React.useState<LoyaltyAuditLogItem[]>([]);
  const [auditLoading, setAuditLoading] = React.useState(false);
  const [auditPage, setAuditPage] = React.useState(1);
  const [auditLastPage, setAuditLastPage] = React.useState(1);
  const [auditSearch, setAuditSearch] = React.useState("");
  const [auditAction, setAuditAction] = React.useState("");
  const [trends, setTrends] = React.useState<LoyaltyTrendsResponse | null>(null);
  const [trendsLoading, setTrendsLoading] = React.useState(false);
  const [forbidden, setForbidden] = React.useState(false);

  const loadProgram = React.useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const data = await getLoyaltyProgram();
      setProgram({
        ...data,
        eligible_order_statuses: Array.isArray(data.eligible_order_statuses) && data.eligible_order_statuses.length
          ? data.eligible_order_statuses
          : ["served"],
        eligible_order_types: Array.isArray(data.eligible_order_types) ? data.eligible_order_types : [],
        tiers: Array.isArray(data.tiers) ? data.tiers : [],
      });
      setForbidden(false);
    } catch (error: unknown) {
      const status = (error as { response?: { status?: number } })?.response?.status;
      if (status === 403) {
        setForbidden(true);
      } else {
        showSnackbar(safeError(error, "Failed to load loyalty settings"), "error");
      }
    } finally {
      if (!quiet) setLoading(false);
    }
  }, [showSnackbar]);

  React.useEffect(() => {
    void loadProgram();
  }, [loadProgram]);

  const loadAuditLogs = React.useCallback(async () => {
    if (forbidden) return;
    setAuditLoading(true);
    try {
      const data = await getLoyaltyAuditLogs({
        page: auditPage,
        per_page: 10,
        search: auditSearch.trim() || undefined,
        action: auditAction.trim() || undefined,
      });
      setAuditLogs(Array.isArray(data.items) ? data.items : []);
      setAuditLastPage(Math.max(1, Number(data.pagination?.last_page || 1)));
    } catch (error: unknown) {
      const status = (error as { response?: { status?: number } })?.response?.status;
      if (status === 403) {
        setForbidden(true);
      } else {
        showSnackbar(safeError(error, "Failed to load loyalty audit logs"), "error");
      }
    } finally {
      setAuditLoading(false);
    }
  }, [forbidden, auditPage, auditSearch, auditAction, showSnackbar]);

  React.useEffect(() => {
    void loadAuditLogs();
  }, [loadAuditLogs]);

  const loadTrends = React.useCallback(async () => {
    if (forbidden) return;
    setTrendsLoading(true);
    try {
      const data = await getLoyaltyTrends({ days: 30 });
      setTrends(data);
    } catch (error: unknown) {
      const status = (error as { response?: { status?: number } })?.response?.status;
      if (status === 403) {
        setForbidden(true);
      } else {
        showSnackbar(safeError(error, "Failed to load loyalty trends"), "error");
      }
    } finally {
      setTrendsLoading(false);
    }
  }, [forbidden, showSnackbar]);

  React.useEffect(() => {
    void loadTrends();
  }, [loadTrends]);

  const setProgramField = <K extends keyof LoyaltyProgram>(key: K, value: LoyaltyProgram[K]) => {
    setProgram((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  const toggleArrayValue = (arr: string[] | null | undefined, value: string) => {
    const current = Array.isArray(arr) ? arr : [];
    return current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
  };

  const handleSaveProgram = async () => {
    if (!program) return;
    setSavingProgram(true);
    try {
      const saved = await saveLoyaltyProgram({
        is_enabled: program.is_enabled,
        progress_policy: program.progress_policy,
        eligible_order_statuses: program.eligible_order_statuses ?? ["served"],
        eligible_order_types: (program.eligible_order_types && program.eligible_order_types.length) ? program.eligible_order_types : null,
        allow_reward_stacking: program.allow_reward_stacking,
        settings: program.settings ?? {},
      });
      setProgram({
        ...saved,
        eligible_order_statuses: Array.isArray(saved.eligible_order_statuses) && saved.eligible_order_statuses.length ? saved.eligible_order_statuses : ["served"],
        eligible_order_types: Array.isArray(saved.eligible_order_types) ? saved.eligible_order_types : [],
        tiers: Array.isArray(saved.tiers) ? saved.tiers : [],
      });
      showSnackbar("Loyalty program saved.", "success");
    } catch (error) {
      showSnackbar(safeError(error, "Failed to save loyalty program"), "error");
    } finally {
      setSavingProgram(false);
    }
  };

  const openNewTier = () => {
    setTierForm(emptyTierForm());
    setTierDialogOpen(true);
  };

  const openEditTier = (tier: LoyaltyTier) => {
    setTierForm(tierToForm(tier));
    setTierDialogOpen(true);
  };

  const closeTierDialog = () => {
    if (savingTier) return;
    setTierDialogOpen(false);
  };

  const handleSaveTier = async () => {
    const threshold = Number.parseInt(tierForm.threshold_orders, 10);
    if (!Number.isFinite(threshold) || threshold < 1) {
      showSnackbar("Threshold orders must be at least 1.", "warning");
      return;
    }
    if (!tierForm.reward_type) {
      showSnackbar("Select a reward type.", "warning");
      return;
    }

    const payload: any = {
      name: tierForm.name.trim() || null,
      threshold_orders: threshold,
      reward_type: tierForm.reward_type,
      reward_value: tierForm.reward_value.trim() === "" ? null : Number(tierForm.reward_value),
      reward_description: tierForm.reward_description.trim() || null,
      validity_days: tierForm.validity_days.trim() === "" ? null : Number.parseInt(tierForm.validity_days, 10),
      min_order_amount: tierForm.min_order_amount.trim() === "" ? null : Number(tierForm.min_order_amount),
      applicable_order_types: tierForm.applicable_order_types.length ? tierForm.applicable_order_types : null,
      is_active: tierForm.is_active,
    };

    setSavingTier(true);
    try {
      if (tierForm.id) {
        await updateLoyaltyTier(tierForm.id, payload);
        showSnackbar("Tier updated.", "success");
      } else {
        await createLoyaltyTier(payload);
        showSnackbar("Tier created.", "success");
      }
      setTierDialogOpen(false);
      await loadProgram(true);
    } catch (error) {
      showSnackbar(safeError(error, "Failed to save tier"), "error");
    } finally {
      setSavingTier(false);
    }
  };

  const handleDeleteTier = async (tier: LoyaltyTier) => {
    if (!window.confirm(`Delete tier "${tier.name || `${tier.threshold_orders} orders`}"? This cannot be undone.`)) return;
    try {
      await deleteLoyaltyTier(tier.id);
      showSnackbar("Tier deleted.", "success");
      await loadProgram(true);
    } catch (error) {
      showSnackbar(safeError(error, "Failed to delete tier"), "error");
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: "grid", placeItems: "center", minHeight: "50vh" }}>
        <CircularProgress sx={{ color: "var(--primary)" }} />
      </Box>
    );
  }

  if (forbidden) {
    return (
      <Paper sx={{ p: 3, borderRadius: "20px", border: "1px solid var(--border)" }}>
        <Typography sx={{ fontWeight: 800, mb: 1 }}>Loyalty settings</Typography>
        <Alert severity="warning" sx={{ borderRadius: "12px" }}>
          You do not have permission to view loyalty settings. This area is available to business admins and managers.
        </Alert>
      </Paper>
    );
  }

  if (!program) {
    return (
      <Paper sx={{ p: 3, borderRadius: "20px", border: "1px solid var(--border)" }}>
        <Typography sx={{ fontWeight: 800, mb: 1 }}>Loyalty</Typography>
        <Typography sx={{ color: "var(--muted-foreground)", mb: 2 }}>
          Could not load loyalty settings.
        </Typography>
        <Button variant="contained" onClick={() => void loadProgram()} sx={{ borderRadius: "12px", textTransform: "none" }}>
          Retry
        </Button>
      </Paper>
    );
  }

  const tiers = [...(program.tiers || [])].sort((a, b) => (a.threshold_orders - b.threshold_orders) || ((a.sort_order ?? 0) - (b.sort_order ?? 0)));

  return (
    <Box sx={{ display: "grid", gap: 2.5 }}>
      <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ xs: "flex-start", sm: "center" }} spacing={1.5}>
        <Stack spacing={0.75}>
          <Typography sx={{ fontWeight: 900, fontSize: "1.35rem" }}>Loyalty & Rewards</Typography>
          <Typography sx={{ color: "var(--muted-foreground)" }}>
            Configure how customers earn rewards at your restaurant. Eligible orders are counted server-side (idempotent) and only for verified, signed-in customers associated to orders.
          </Typography>
        </Stack>
        <Button
          component={Link}
          href="/business-admin/loyalty/rewards"
          variant="outlined"
          sx={{ borderRadius: "12px", textTransform: "none", fontWeight: 700, flexShrink: 0 }}
        >
          Customers & rewards
        </Button>
      </Stack>

      <Paper sx={{ p: { xs: 2, md: 3 }, borderRadius: "22px", border: "1px solid var(--border)", backgroundColor: "var(--card)" }}>
        <Stack spacing={2.5}>
          <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ xs: "flex-start", sm: "center" }} spacing={1.5}>
            <Box>
              <Typography sx={{ fontWeight: 800 }}>Program</Typography>
              <Typography sx={{ color: "var(--muted-foreground)", fontSize: "0.9rem" }}>
                Enable rewards and define when an order is eligible to count.
              </Typography>
            </Box>
            <FormControlLabel
              control={<Switch checked={!!program.is_enabled} onChange={(e) => setProgramField("is_enabled", e.target.checked)} />}
              label={program.is_enabled ? "Enabled" : "Disabled"}
              sx={{ m: 0, "& .MuiFormControlLabel-label": { fontWeight: 700 } }}
            />
          </Stack>

          <Divider />

          <Stack spacing={2}>
            <FormControl fullWidth size="small">
              <InputLabel id="loyalty-policy-label">Progress policy</InputLabel>
              <Select
                labelId="loyalty-policy-label"
                label="Progress policy"
                value={program.progress_policy || "accumulate"}
                onChange={(e) => setProgramField("progress_policy", e.target.value as LoyaltyProgram["progress_policy"])}
              >
                {POLICY_OPTIONS.map((opt) => (
                  <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <Typography sx={{ color: "var(--muted-foreground)", fontSize: "0.85rem", mt: -1 }}>
              {POLICY_OPTIONS.find((p) => p.value === program.progress_policy)?.hint ?? "Choose how progress behaves across milestones."}
            </Typography>

            <Box>
              <Typography sx={{ fontWeight: 700, fontSize: "0.95rem", mb: 1 }}>Eligible order statuses</Typography>
              <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                {STATUS_OPTIONS.map((status) => {
                  const selected = (program.eligible_order_statuses ?? []).includes(status);
                  return (
                    <FormControlLabel
                      key={status}
                      control={
                        <Checkbox
                          size="small"
                          checked={selected}
                          onChange={() => setProgramField("eligible_order_statuses", toggleArrayValue(program.eligible_order_statuses, status))}
                        />
                      }
                      label={status.replace(/_/g, " ")}
                      sx={{ mr: 1, "& .MuiFormControlLabel-label": { textTransform: "capitalize" } }}
                    />
                  );
                })}
              </Stack>
              <Alert severity="info" sx={{ mt: 1.25, borderRadius: "12px" }}>
                Default/recommended: <strong>served</strong>. Orders count only once, only when associated to a verified signed-in customer, and never for cancelled/unconfigured states.
              </Alert>
            </Box>

            <Box>
              <Typography sx={{ fontWeight: 700, fontSize: "0.95rem", mb: 1 }}>Eligible order types (optional)</Typography>
              <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                {ORDER_TYPE_OPTIONS.map((type) => {
                  const selected = (program.eligible_order_types ?? []).includes(type);
                  return (
                    <FormControlLabel
                      key={type}
                      control={
                        <Checkbox
                          size="small"
                          checked={selected}
                          onChange={() => setProgramField("eligible_order_types", toggleArrayValue(program.eligible_order_types, type))}
                        />
                      }
                      label={type === "dine_in" ? "Dine-in" : "Takeaway"}
                    />
                  );
                })}
              </Stack>
              <Typography sx={{ color: "var(--muted-foreground)", fontSize: "0.82rem", mt: 0.5 }}>
                Leave all unchecked to allow all order types.
              </Typography>
            </Box>

            <FormControlLabel
              control={<Switch checked={!!program.allow_reward_stacking} onChange={(e) => setProgramField("allow_reward_stacking", e.target.checked)} />}
              label="Allow reward stacking (where applicable)"
            />
          </Stack>

          <Stack direction="row" justifyContent="flex-end">
            <Button variant="contained" onClick={() => void handleSaveProgram()} disabled={savingProgram} sx={{ borderRadius: "12px", textTransform: "none", fontWeight: 800 }}>
              {savingProgram ? "Saving…" : "Save program"}
            </Button>
          </Stack>
        </Stack>
      </Paper>

      <Paper sx={{ p: { xs: 2, md: 3 }, borderRadius: "22px", border: "1px solid var(--border)", backgroundColor: "var(--card)" }}>
        <Stack spacing={2}>
          <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ xs: "flex-start", sm: "center" }} spacing={1}>
            <Box>
              <Typography sx={{ fontWeight: 800 }}>Reward tiers / milestones</Typography>
              <Typography sx={{ color: "var(--muted-foreground)", fontSize: "0.9rem" }}>
                Define thresholds (e.g. every 5 or 10 eligible orders) and the reward issued at each milestone.
              </Typography>
            </Box>
            <Button variant="outlined" startIcon={<AddRoundedIcon />} onClick={openNewTier} sx={{ borderRadius: "12px", textTransform: "none", fontWeight: 700 }}>
              Add tier
            </Button>
          </Stack>

          {tiers.length === 0 ? (
            <Typography sx={{ color: "var(--muted-foreground)" }}>No tiers yet. Add a milestone to start issuing rewards.</Typography>
          ) : (
            <Box sx={{ overflowX: "auto" }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 800 }}>Threshold</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Reward</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Validity</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Status</TableCell>
                    <TableCell sx={{ fontWeight: 800 }} align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {tiers.map((tier) => (
                    <TableRow key={tier.id} hover>
                      <TableCell>
                        <Typography sx={{ fontWeight: 700 }}>{tier.threshold_orders} orders</Typography>
                        {tier.name ? <Typography sx={{ fontSize: "0.82rem", color: "var(--muted-foreground)" }}>{tier.name}</Typography> : null}
                      </TableCell>
                      <TableCell>
                        <Typography sx={{ fontWeight: 700, textTransform: "capitalize" }}>{String(tier.reward_type || "").replace(/_/g, " ")}</Typography>
                        <Typography sx={{ fontSize: "0.82rem", color: "var(--muted-foreground)" }}>
                          {tier.reward_description || (tier.reward_value != null ? `Value: ${tier.reward_value}` : "No description")}
                        </Typography>
                      </TableCell>
                      <TableCell>{tier.validity_days ? `${tier.validity_days} days` : "No expiry"}</TableCell>
                      <TableCell>
                        <Chip size="small" label={tier.is_active ? "Active" : "Inactive"} color={tier.is_active ? "success" : "default"} variant={tier.is_active ? "filled" : "outlined"} />
                      </TableCell>
                      <TableCell align="right">
                        <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                          <IconButton size="small" onClick={() => openEditTier(tier)} aria-label="Edit tier"><EditOutlinedIcon fontSize="small" /></IconButton>
                          <IconButton size="small" color="error" onClick={() => void handleDeleteTier(tier)} aria-label="Delete tier"><DeleteOutlineRoundedIcon fontSize="small" /></IconButton>
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

      <Paper variant="outlined" sx={{ p: { xs: 2, md: 2.5 }, borderRadius: "18px", borderColor: "var(--border)", bgcolor: "var(--surface)" }}>
        <Stack spacing={1.5}>
          <Box>
            <Typography sx={{ fontWeight: 800, fontSize: "1rem" }}>Trends (30 days)</Typography>
            <Typography sx={{ color: "var(--muted-foreground)", fontSize: "0.88rem" }}>
              Tenant-scoped reward issuance/redemption activity over time.
            </Typography>
          </Box>

          {trendsLoading ? (
            <Box sx={{ py: 3, display: "grid", placeItems: "center" }}><CircularProgress size={24} /></Box>
          ) : trends ? (
            <Stack spacing={1.5}>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1} useFlexGap flexWrap="wrap">
                {[
                  { label: "Issued", value: trends.totals.issued },
                  { label: "Redeemed", value: trends.totals.redeemed },
                  { label: "Revoked", value: trends.totals.revoked },
                  { label: "Expired", value: trends.totals.expired },
                  { label: "Available", value: trends.totals.available },
                ].map((item) => (
                  <Paper key={item.label} variant="outlined" sx={{ p: 1.25, minWidth: 120, borderRadius: "12px" }}>
                    <Typography sx={{ fontSize: "0.75rem", color: "var(--muted-foreground)" }}>{item.label}</Typography>
                    <Typography sx={{ fontWeight: 800, fontSize: "1.2rem" }}>{item.value}</Typography>
                  </Paper>
                ))}
              </Stack>

              <Stack direction={{ xs: "column", md: "row" }} spacing={1.5}>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography sx={{ fontWeight: 700, fontSize: "0.9rem", mb: 0.75 }}>Top tiers (issued)</Typography>
                  {trends.top_tiers.length === 0 ? <Typography sx={{ fontSize: "0.85rem", color: "var(--muted-foreground)" }}>No data</Typography> : (
                    <Stack spacing={0.5}>
                      {trends.top_tiers.map((t) => (
                        <Stack key={`${t.tier_id}-${t.tier_name}`} direction="row" justifyContent="space-between" sx={{ fontSize: "0.85rem" }}>
                          <span>{t.tier_name}</span>
                          <strong>{t.issued_count}</strong>
                        </Stack>
                      ))}
                    </Stack>
                  )}
                </Box>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography sx={{ fontWeight: 700, fontSize: "0.9rem", mb: 0.75 }}>Top revocation reasons</Typography>
                  {trends.top_reasons.length === 0 ? <Typography sx={{ fontSize: "0.85rem", color: "var(--muted-foreground)" }}>No data</Typography> : (
                    <Stack spacing={0.5}>
                      {trends.top_reasons.map((r) => (
                        <Stack key={r.reason} direction="row" justifyContent="space-between" sx={{ fontSize: "0.85rem", gap: 1 }}>
                          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.reason}</span>
                          <strong>{r.count}</strong>
                        </Stack>
                      ))}
                    </Stack>
                  )}
                </Box>
              </Stack>

              <Box sx={{ overflowX: "auto" }}>
                <Typography sx={{ fontWeight: 700, fontSize: "0.9rem", mb: 0.75 }}>Daily activity (last 14 days)</Typography>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 800 }}>Date</TableCell>
                      <TableCell sx={{ fontWeight: 800 }} align="right">Issued</TableCell>
                      <TableCell sx={{ fontWeight: 800 }} align="right">Redeemed</TableCell>
                      <TableCell sx={{ fontWeight: 800 }} align="right">Revoked</TableCell>
                      <TableCell sx={{ fontWeight: 800 }} align="right">Expired</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {trends.series.slice(-14).reverse().map((row) => (
                      <TableRow key={row.date} hover>
                        <TableCell>{row.date}</TableCell>
                        <TableCell align="right">{row.issued}</TableCell>
                        <TableCell align="right">{row.redeemed}</TableCell>
                        <TableCell align="right">{row.revoked}</TableCell>
                        <TableCell align="right">{row.expired}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Box>
            </Stack>
          ) : (
            <Alert severity="info" variant="outlined">No trend data available.</Alert>
          )}
        </Stack>
      </Paper>

      <Paper variant="outlined" sx={{ p: { xs: 2, md: 2.5 }, borderRadius: "18px", borderColor: "var(--border)", bgcolor: "var(--surface)" }}>
        <Stack spacing={1.5}>
          <Box>
            <Typography sx={{ fontWeight: 800, fontSize: "1rem" }}>Audit logs</Typography>
            <Typography sx={{ color: "var(--muted-foreground)", fontSize: "0.88rem" }}>
              Tenant-scoped loyalty activity for this business (redemptions, revocations, config changes).
            </Typography>
          </Box>

          <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
            <TextField
              size="small"
              label="Search"
              value={auditSearch}
              onChange={(e) => { setAuditPage(1); setAuditSearch(e.target.value); }}
              placeholder="Action, reason, customer..."
              sx={{ minWidth: 220 }}
            />
            <TextField
              size="small"
              label="Action filter"
              value={auditAction}
              onChange={(e) => { setAuditPage(1); setAuditAction(e.target.value); }}
              placeholder="e.g. redeem, revoke"
              sx={{ minWidth: 180 }}
            />
          </Stack>

          {auditLoading ? (
            <Box sx={{ py: 3, display: "grid", placeItems: "center" }}><CircularProgress size={24} /></Box>
          ) : auditLogs.length === 0 ? (
            <Alert severity="info" variant="outlined">No audit logs found.</Alert>
          ) : (
            <Box sx={{ overflowX: "auto" }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 800 }}>Time</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Action</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Actor</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Customer</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Target</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Reason</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {auditLogs.map((log) => (
                    <TableRow key={log.id} hover>
                      <TableCell sx={{ whiteSpace: "nowrap" }}>{log.created_at ? new Date(log.created_at).toLocaleString() : "—"}</TableCell>
                      <TableCell>
                        <Typography sx={{ fontWeight: 700, fontSize: "0.85rem" }}>{log.action}</Typography>
                      </TableCell>
                      <TableCell>{log.actor_role || "—"}{log.actor_id ? ` (#${log.actor_id})` : ""}</TableCell>
                      <TableCell>{log.customer_name || log.customer_email || (log.customer_id ? `#${log.customer_id}` : "—")}</TableCell>
                      <TableCell>{log.target_type || "—"}{log.target_id ? ` #${log.target_id}` : ""}</TableCell>
                      <TableCell sx={{ maxWidth: 260 }}>{log.reason || "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          )}

          {auditLastPage > 1 ? (
            <Stack direction="row" justifyContent="flex-end">
              <Pagination
                size="small"
                page={auditPage}
                count={auditLastPage}
                onChange={(_, p) => setAuditPage(p)}
              />
            </Stack>
          ) : null}
        </Stack>
      </Paper>

      <Dialog open={tierDialogOpen} onClose={closeTierDialog} fullWidth maxWidth="sm" PaperProps={{ sx: { borderRadius: "18px" } }}>
        <DialogTitle sx={{ fontWeight: 800 }}>{tierForm.id ? "Edit tier" : "Add tier"}</DialogTitle>
        <DialogContent>
          <Stack spacing={1.5} sx={{ pt: 1 }}>
            <TextField
              label="Tier name (optional)"
              value={tierForm.name}
              onChange={(e) => setTierForm((p) => ({ ...p, name: e.target.value }))}
              fullWidth
              size="small"
            />
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
              <TextField
                label="Threshold orders"
                type="number"
                value={tierForm.threshold_orders}
                onChange={(e) => setTierForm((p) => ({ ...p, threshold_orders: e.target.value }))}
                fullWidth
                size="small"
                inputProps={{ min: 1 }}
                helperText="Eligible orders required to reach this reward."
              />
              <FormControl fullWidth size="small">
                <InputLabel id="tier-reward-type-label">Reward type</InputLabel>
                <Select
                  labelId="tier-reward-type-label"
                  label="Reward type"
                  value={tierForm.reward_type}
                  onChange={(e) => setTierForm((p) => ({ ...p, reward_type: e.target.value as LoyaltyTier["reward_type"] }))}
                >
                  {REWARD_TYPE_OPTIONS.map((opt) => (
                    <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Stack>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
              <TextField
                label="Reward value (optional)"
                type="number"
                value={tierForm.reward_value}
                onChange={(e) => setTierForm((p) => ({ ...p, reward_value: e.target.value }))}
                fullWidth
                size="small"
                helperText="e.g. 10 for 10% or fixed amount, depending on type."
              />
              <TextField
                label="Validity days (optional)"
                type="number"
                value={tierForm.validity_days}
                onChange={(e) => setTierForm((p) => ({ ...p, validity_days: e.target.value }))}
                fullWidth
                size="small"
                inputProps={{ min: 1 }}
              />
            </Stack>
            <TextField
              label="Reward description"
              value={tierForm.reward_description}
              onChange={(e) => setTierForm((p) => ({ ...p, reward_description: e.target.value }))}
              fullWidth
              size="small"
              placeholder="e.g. 10% off your next order"
            />
            <TextField
              label="Minimum order amount (optional)"
              type="number"
              value={tierForm.min_order_amount}
              onChange={(e) => setTierForm((p) => ({ ...p, min_order_amount: e.target.value }))}
              fullWidth
              size="small"
            />
            <Box>
              <Typography sx={{ fontWeight: 700, fontSize: "0.9rem", mb: 0.5 }}>Applicable order types (optional)</Typography>
              <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                {ORDER_TYPE_OPTIONS.map((type) => (
                  <FormControlLabel
                    key={type}
                    control={
                      <Checkbox
                        size="small"
                        checked={tierForm.applicable_order_types.includes(type)}
                        onChange={() =>
                          setTierForm((p) => ({
                            ...p,
                            applicable_order_types: p.applicable_order_types.includes(type)
                              ? p.applicable_order_types.filter((t) => t !== type)
                              : [...p.applicable_order_types, type],
                          }))
                        }
                      />
                    }
                    label={type === "dine_in" ? "Dine-in" : "Takeaway"}
                  />
                ))}
              </Stack>
            </Box>
            <FormControlLabel
              control={<Switch checked={tierForm.is_active} onChange={(e) => setTierForm((p) => ({ ...p, is_active: e.target.checked }))} />}
              label="Active"
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={closeTierDialog} disabled={savingTier} sx={{ textTransform: "none" }}>Cancel</Button>
          <Button variant="contained" onClick={() => void handleSaveTier()} disabled={savingTier} sx={{ textTransform: "none", fontWeight: 700 }}>
            {savingTier ? "Saving…" : tierForm.id ? "Save changes" : "Create tier"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
