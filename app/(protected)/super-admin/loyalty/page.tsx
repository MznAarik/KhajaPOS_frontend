"use client";

import * as React from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  MenuItem,
  Paper,
  Stack,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import { useAppSnackbar } from "@/components/common/SnackBar";
import { safeError } from "@/lib/safeError";
import {
  getSuperAdminLoyaltyAuditLogs,
  getSuperAdminLoyaltyMemberships,
  getSuperAdminLoyaltyPrograms,
  getSuperAdminLoyaltyRewards,
  type SuperAdminPagination,
} from "@/lib/api";

type TabKey = "programs" | "memberships" | "rewards" | "audit";

const defaultPagination = (): SuperAdminPagination => ({
  current_page: 1,
  last_page: 1,
  per_page: 20,
  total: 0,
});

const fmtDate = (v?: string | null) => (v ? new Date(v).toLocaleString() : "—");
const fmtShort = (v?: string | null) => (v ? new Date(v).toLocaleDateString() : "—");

function StatusChip({ value }: { value?: string | null }) {
  const v = String(value || "unknown").toLowerCase();
  const color: "success" | "warning" | "error" | "default" | "info" =
    v === "available" || v === "active" || v === "redeemed" ? "success" :
    v === "expired" || v === "revoked" || v === "inactive" || v === "suspended" ? "warning" :
    v === "cancelled" || v === "failed" ? "error" : "default";
  return <Chip size="small" label={v} color={color === "default" ? undefined : color} variant={v === "available" ? "filled" : "outlined"} sx={{ textTransform: "capitalize", fontWeight: 700 }} />;
}

export default function SuperAdminLoyaltyOversightPage() {
  const { showSnackbar } = useAppSnackbar();
  const [tab, setTab] = React.useState<TabKey>("programs");
  const [loading, setLoading] = React.useState(false);

  const [businessId, setBusinessId] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [status, setStatus] = React.useState("all");
  const [action, setAction] = React.useState("");

  const [programs, setPrograms] = React.useState<Record<string, unknown>[]>([]);
  const [programsPg, setProgramsPg] = React.useState<SuperAdminPagination>(defaultPagination());
  const [memberships, setMemberships] = React.useState<Record<string, unknown>[]>([]);
  const [membershipsPg, setMembershipsPg] = React.useState<SuperAdminPagination>(defaultPagination());
  const [rewards, setRewards] = React.useState<Record<string, unknown>[]>([]);
  const [rewardsPg, setRewardsPg] = React.useState<SuperAdminPagination>(defaultPagination());
  const [audits, setAudits] = React.useState<Record<string, unknown>[]>([]);
  const [auditsPg, setAuditsPg] = React.useState<SuperAdminPagination>(defaultPagination());

  const currentPage =
    tab === "programs" ? programsPg.current_page :
    tab === "memberships" ? membershipsPg.current_page :
    tab === "rewards" ? rewardsPg.current_page : auditsPg.current_page;

  const load = React.useCallback(async (opts?: {
    page?: number;
    tab?: TabKey;
    businessId?: string;
    search?: string;
    status?: string;
    action?: string;
  }) => {
    const activeTab = opts?.tab ?? tab;
    const biz = (opts?.businessId ?? businessId).trim();
    const q = (opts?.search ?? search).trim();
    const st = opts?.status ?? status;
    const act = (opts?.action ?? action).trim();
    setLoading(true);
    try {
      const page = opts?.page ?? 1;
      const common = {
        business_id: biz || undefined,
        search: q || undefined,
        page,
        per_page: 20,
      };
      if (activeTab === "programs") {
        const data = await getSuperAdminLoyaltyPrograms(common);
        setPrograms(data.items ?? []);
        setProgramsPg(data.pagination ?? defaultPagination());
      } else if (activeTab === "memberships") {
        const data = await getSuperAdminLoyaltyMemberships(common);
        setMemberships(data.items ?? []);
        setMembershipsPg(data.pagination ?? defaultPagination());
      } else if (activeTab === "rewards") {
        const data = await getSuperAdminLoyaltyRewards({ ...common, status: st !== "all" ? st : undefined });
        setRewards(data.items ?? []);
        setRewardsPg(data.pagination ?? defaultPagination());
      } else {
        const data = await getSuperAdminLoyaltyAuditLogs({ ...common, action: act || undefined });
        setAudits(data.items ?? []);
        setAuditsPg(data.pagination ?? defaultPagination());
      }
    } catch (error) {
      showSnackbar(safeError(error, "Failed to load loyalty oversight data"), "error");
    } finally {
      setLoading(false);
    }
  }, [tab, businessId, search, status, action, showSnackbar]);

  const drillToBusiness = React.useCallback((id: number | string, nextTab: TabKey = "memberships") => {
    const idStr = String(id);
    setBusinessId(idStr);
    setTab(nextTab);
    void load({ page: 1, tab: nextTab, businessId: idStr });
  }, [load]);

  React.useEffect(() => {
    const t = setTimeout(() => { void load({ page: 1 }); }, 0);
    return () => clearTimeout(t);
  }, [tab]); // eslint-disable-line react-hooks/exhaustive-deps

  const pg =
    tab === "programs" ? programsPg :
    tab === "memberships" ? membershipsPg :
    tab === "rewards" ? rewardsPg : auditsPg;

  const canPrev = pg.current_page > 1;
  const canNext = pg.current_page < pg.last_page;

  return (
    <Box sx={{ display: "grid", gap: 2 }}>
      <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" alignItems={{ xs: "flex-start", md: "center" }} spacing={1.5}>
        <Stack spacing={0.5}>
          <Typography sx={{ fontWeight: 900, fontSize: "1.35rem" }}>Loyalty Oversight</Typography>
          <Typography sx={{ color: "var(--muted-foreground)" }}>
            Read-only platform visibility into restaurant loyalty configurations, customer progress/rewards, and audit logs. No customer accounts are modified here.
          </Typography>
        </Stack>
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" startIcon={<RefreshRoundedIcon />} onClick={() => void load({ page: currentPage })} disabled={loading} sx={{ textTransform: "none", borderRadius: "12px" }}>
            Refresh
          </Button>
        </Stack>
      </Stack>

      <Alert severity="info" sx={{ borderRadius: "12px" }}>
        Oversight is read-only by default. Use filters to inspect a specific business. Reward attribution and counting remain server-validated and tenant-scoped.
      </Alert>

      <Paper sx={{ p: 1, borderRadius: "16px", border: "1px solid var(--border)", backgroundColor: "var(--card)" }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" allowScrollButtonsMobile>
          <Tab value="programs" label="Programs & Configs" />
          <Tab value="memberships" label="Customer Progress" />
          <Tab value="rewards" label="Rewards" />
          <Tab value="audit" label="Audit Logs" />
        </Tabs>
      </Paper>

      <Paper sx={{ p: 1.5, borderRadius: "16px", border: "1px solid var(--border)", backgroundColor: "var(--card)" }}>
        <Stack direction={{ xs: "column", md: "row" }} spacing={1.25} alignItems={{ xs: "stretch", md: "center" }}>
          <TextField size="small" label="Business ID" value={businessId} onChange={(e) => setBusinessId(e.target.value)} placeholder="e.g. 12" sx={{ width: { xs: "100%", md: 160 } }} />
          <TextField
            size="small"
            label={tab === "rewards" ? "Search reward/customer/business" : tab === "audit" ? "Search action/target/business/customer" : "Search business/customer"}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            InputProps={{ startAdornment: <SearchRoundedIcon fontSize="small" sx={{ mr: 0.75, color: "var(--muted-foreground)" }} /> }}
            sx={{ flex: 1, minWidth: 220 }}
          />
          {tab === "rewards" ? (
            <TextField select size="small" label="Status" value={status} onChange={(e) => setStatus(e.target.value)} sx={{ width: { xs: "100%", md: 180 } }}>
              <MenuItem value="all">All</MenuItem>
              <MenuItem value="available">Available</MenuItem>
              <MenuItem value="redeemed">Redeemed</MenuItem>
              <MenuItem value="expired">Expired</MenuItem>
              <MenuItem value="revoked">Revoked</MenuItem>
            </TextField>
          ) : null}
          {tab === "audit" ? (
            <TextField size="small" label="Action contains" value={action} onChange={(e) => setAction(e.target.value)} placeholder="e.g. redeem" sx={{ width: { xs: "100%", md: 200 } }} />
          ) : null}
          <Button variant="contained" onClick={() => void load({ page: 1 })} disabled={loading} sx={{ textTransform: "none", borderRadius: "10px", fontWeight: 700 }}>
            Apply
          </Button>
          <Button
            variant="outlined"
            onClick={() => {
              setBusinessId("");
              setSearch("");
              setStatus("all");
              setAction("");
              void load({ page: 1, businessId: "", search: "", status: "all", action: "" });
            }}
            disabled={loading}
            sx={{ textTransform: "none", borderRadius: "10px", fontWeight: 700 }}
          >
            Clear
          </Button>
        </Stack>
      </Paper>

      <Paper sx={{ p: { xs: 1.25, md: 2 }, borderRadius: "18px", border: "1px solid var(--border)", backgroundColor: "var(--card)", minHeight: 240 }}>
        {loading ? (
          <Box sx={{ display: "grid", placeItems: "center", minHeight: 220 }}>
            <CircularProgress size={28} sx={{ color: "var(--primary)" }} />
          </Box>
        ) : (
          <>
            {tab === "programs" ? (
              <Box sx={{ overflowX: "auto" }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 800 }}>Business</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>Program</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>Policy / Eligibility</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>Tiers</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>Counts</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>Updated</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {programs.length === 0 ? (
                      <TableRow><TableCell colSpan={6}><Typography sx={{ color: "var(--muted-foreground)" }}>No loyalty programs found.</Typography></TableCell></TableRow>
                    ) : programs.map((p) => (
                      <TableRow key={String(p.id)} hover>
                        <TableCell>
                          <Stack spacing={0.5} alignItems="flex-start">
                            <Tooltip title="Filter oversight by this business">
                              <Button size="small" onClick={() => drillToBusiness(p.business_id as number | string, "memberships")} sx={{ p: 0, minWidth: 0, textTransform: "none", fontWeight: 700, justifyContent: "flex-start", color: "var(--primary)" }}>
                                {String((p.business as Record<string, unknown> | undefined)?.name || `Business #${String(p.business_id)}`)}
                              </Button>
                            </Tooltip>
                            <Typography sx={{ fontSize: "0.78rem", color: "var(--muted-foreground)" }}>ID: {String(p.business_id)}{(p.business as Record<string, unknown> | undefined)?.email ? ` • ${String((p.business as Record<string, unknown> | undefined)?.email)}` : ""}</Typography>
                            <Stack direction="row" spacing={0.5} useFlexGap flexWrap="wrap">
                              <Chip size="small" variant="outlined" clickable label="Progress" onClick={() => drillToBusiness(p.business_id as number | string, "memberships")} />
                              <Chip size="small" variant="outlined" clickable label="Rewards" onClick={() => drillToBusiness(p.business_id as number | string, "rewards")} />
                              <Chip size="small" variant="outlined" clickable label="Audit" onClick={() => drillToBusiness(p.business_id as number | string, "audit")} />
                            </Stack>
                          </Stack>
                        </TableCell>
                        <TableCell>
                          <Stack spacing={0.5} alignItems="flex-start">
                            <StatusChip value={p.is_enabled ? "active" : "inactive"} />
                            <Typography sx={{ fontSize: "0.78rem", color: "var(--muted-foreground)" }}>Program #{String(p.id)}</Typography>
                          </Stack>
                        </TableCell>
                        <TableCell>
                          <Typography sx={{ fontSize: "0.85rem", fontWeight: 600, textTransform: "capitalize" }}>{String(p.progress_policy || "—").replace(/_/g, " ")}</Typography>
                          <Typography sx={{ fontSize: "0.78rem", color: "var(--muted-foreground)" }}>
                            Statuses: {((p.eligible_order_statuses as unknown[] | undefined) || []).join(", ") || "—"}
                          </Typography>
                          <Typography sx={{ fontSize: "0.78rem", color: "var(--muted-foreground)" }}>
                            Types: {((p.eligible_order_types as unknown[] | undefined) || []).length ? ((p.eligible_order_types as unknown[] | undefined) || []).join(", ") : "all"} · Stacking: {p.allow_reward_stacking ? "yes" : "no"}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ minWidth: 260 }}>
                          <Typography sx={{ fontWeight: 700, mb: 0.5 }}>{String(p.tiers_count ?? ((p.tiers as unknown[] | undefined)?.length ?? 0))} tier(s)</Typography>
                          <Stack direction="row" spacing={0.5} useFlexGap flexWrap="wrap">
                            {((p.tiers as Record<string, unknown>[] | undefined) || []).slice(0, 6).map((t: Record<string, unknown>) => (
                              <Chip key={String(t.id)} size="small" variant="outlined" label={`${String(t.name)} @ ${String(t.threshold_orders)}`} sx={{ fontWeight: 600 }} />
                            ))}
                            {((p.tiers as unknown[] | undefined) || []).length > 6 ? <Chip size="small" label={`+${((p.tiers as unknown[] | undefined) || []).length - 6} more`} /> : null}
                          </Stack>
                        </TableCell>
                        <TableCell>
                          <Typography sx={{ fontSize: "0.85rem" }}>Members: <b>{String(p.memberships_count ?? 0)}</b></Typography>
                          <Typography sx={{ fontSize: "0.85rem" }}>Rewards: <b>{String(p.rewards_total ?? 0)}</b></Typography>
                          <Typography sx={{ fontSize: "0.78rem", color: "var(--muted-foreground)" }}>Available {String(p.rewards_available ?? 0)} • Redeemed {String(p.rewards_redeemed ?? 0)}</Typography>
                        </TableCell>
                        <TableCell>{fmtDate(String(p.updated_at ?? ""))}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Box>
            ) : null}

            {tab === "memberships" ? (
              <Box sx={{ overflowX: "auto" }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 800 }}>Customer</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>Business</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>Progress</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>Rewards</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>Status / Activity</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {memberships.length === 0 ? (
                      <TableRow><TableCell colSpan={5}><Typography sx={{ color: "var(--muted-foreground)" }}>No memberships found.</Typography></TableCell></TableRow>
                    ) : memberships.map((m) => (
                      <TableRow key={String(m.id)} hover>
                        <TableCell>
                          <Typography sx={{ fontWeight: 700 }}>{String((m.customer as Record<string, unknown> | undefined)?.name || `Customer #${String(m.customer_id)}`)}</Typography>
                          <Typography sx={{ fontSize: "0.78rem", color: "var(--muted-foreground)" }}>{String((m.customer as Record<string, unknown> | undefined)?.email || (m.customer as Record<string, unknown> | undefined)?.phone || "—")}</Typography>
                          <Typography sx={{ fontSize: "0.75rem", color: "var(--muted-foreground)" }}>ID: {String(m.customer_id)} • Membership #{String(m.id)}</Typography>
                        </TableCell>
                        <TableCell>
                          <Stack spacing={0.25} alignItems="flex-start">
                            <Button size="small" onClick={() => drillToBusiness(m.business_id as number | string, "memberships")} sx={{ p: 0, minWidth: 0, textTransform: "none", fontWeight: 600, justifyContent: "flex-start" }}>
                              {String(m.business_name || `#${String(m.business_id)}`)}
                            </Button>
                            <Typography sx={{ fontSize: "0.78rem", color: "var(--muted-foreground)" }}>Business ID: {String(m.business_id)}</Typography>
                            <Stack direction="row" spacing={0.5} sx={{ mt: 0.25 }}>
                              <Chip size="small" variant="outlined" clickable label="Rewards" onClick={() => drillToBusiness(m.business_id as number | string, "rewards")} />
                              <Chip size="small" variant="outlined" clickable label="Audit" onClick={() => drillToBusiness(m.business_id as number | string, "audit")} />
                            </Stack>
                          </Stack>
                        </TableCell>
                        <TableCell>
                          <Typography sx={{ fontWeight: 700 }}>Progress: {String(m.progress_orders ?? 0)} orders</Typography>
                          <Typography sx={{ fontSize: "0.8rem", color: "var(--muted-foreground)" }}>Lifetime: {String(m.lifetime_orders ?? 0)} • Counted: {String(m.orders_count ?? 0)}</Typography>
                          {m.current_tier_reached != null ? <Typography sx={{ fontSize: "0.78rem", color: "var(--muted-foreground)" }}>Tier reached: {String(m.current_tier_reached)}</Typography> : null}
                        </TableCell>
                        <TableCell>
                          <Typography sx={{ fontSize: "0.85rem" }}>Total: <b>{String(m.rewards_total ?? 0)}</b></Typography>
                          <Typography sx={{ fontSize: "0.8rem", color: "var(--muted-foreground)" }}>Available {String(m.rewards_available ?? 0)} • Redeemed {String(m.rewards_redeemed ?? 0)}</Typography>
                        </TableCell>
                        <TableCell>
                          <Stack spacing={0.5} alignItems="flex-start">
                            <StatusChip value={String(m.status ?? "")} />
                            <Typography sx={{ fontSize: "0.78rem", color: "var(--muted-foreground)" }}>Last order: {fmtShort(m.last_order_at as string | null | undefined)}</Typography>
                            <Typography sx={{ fontSize: "0.78rem", color: "var(--muted-foreground)" }}>Last reward: {fmtShort(m.last_reward_at as string | null | undefined)}</Typography>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Box>
            ) : null}

            {tab === "rewards" ? (
              <Box sx={{ overflowX: "auto" }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 800 }}>Reward</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>Customer</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>Business / Tier</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>Value</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>Status</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>Dates</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {rewards.length === 0 ? (
                      <TableRow><TableCell colSpan={6}><Typography sx={{ color: "var(--muted-foreground)" }}>No rewards found.</Typography></TableCell></TableRow>
                    ) : rewards.map((r) => (
                      <TableRow key={String(r.id)} hover>
                        <TableCell>
                          <Typography sx={{ fontWeight: 800, fontFamily: "monospace" }}>{String(r.reward_code || `#${String(r.id)}`)}</Typography>
                          <Typography sx={{ fontSize: "0.78rem", color: "var(--muted-foreground)" }}>Reward #{String(r.id)}</Typography>
                          {r.reward_description ? <Typography sx={{ fontSize: "0.78rem", color: "var(--muted-foreground)" }}>{String(r.reward_description)}</Typography> : null}
                        </TableCell>
                        <TableCell>
                          <Typography sx={{ fontWeight: 700 }}>{String((r.customer as Record<string, unknown> | undefined)?.name || `Customer #${String(r.customer_id)}`)}</Typography>
                          <Typography sx={{ fontSize: "0.78rem", color: "var(--muted-foreground)" }}>{String((r.customer as Record<string, unknown> | undefined)?.email || (r.customer as Record<string, unknown> | undefined)?.phone || "—")}</Typography>
                        </TableCell>
                        <TableCell>
                          <Stack spacing={0.25} alignItems="flex-start">
                            <Button size="small" onClick={() => drillToBusiness(r.business_id as number | string, "rewards")} sx={{ p: 0, minWidth: 0, textTransform: "none", fontWeight: 600, justifyContent: "flex-start" }}>
                                {String(r.business_name || `#${String(r.business_id)}`)}
                              </Button>
                            <Typography sx={{ fontSize: "0.78rem", color: "var(--muted-foreground)" }}>Tier: {String((r.tier as Record<string, unknown> | undefined)?.name || "—")}</Typography>
                            <Stack direction="row" spacing={0.5} sx={{ mt: 0.25 }}>
                              <Chip size="small" variant="outlined" clickable label="Progress" onClick={() => drillToBusiness(r.business_id as number | string, "memberships")} />
                              <Chip size="small" variant="outlined" clickable label="Audit" onClick={() => drillToBusiness(r.business_id as number | string, "audit")} />
                            </Stack>
                          </Stack>
                        </TableCell>
                        <TableCell>
                          <Typography sx={{ fontWeight: 700, textTransform: "capitalize" }}>{String(r.reward_type || "—").replace(/_/g, " ")}</Typography>
                          <Typography sx={{ fontSize: "0.8rem", color: "var(--muted-foreground)" }}>Value: {String(r.reward_value ?? "—")}</Typography>
                        </TableCell>
                        <TableCell>
                          <Stack spacing={0.5} alignItems="flex-start">
                            <StatusChip value={String(r.effective_status || r.status || "")} />
                            {r.status !== r.effective_status ? <Typography sx={{ fontSize: "0.75rem", color: "var(--muted-foreground)" }}>Stored: {String(r.status ?? "")}</Typography> : null}
                            {r.revocation_reason ? <Typography sx={{ fontSize: "0.75rem", color: "var(--muted-foreground)" }}>Reason: {String(r.revocation_reason)}</Typography> : null}
                          </Stack>
                        </TableCell>
                        <TableCell>
                          <Typography sx={{ fontSize: "0.78rem", color: "var(--muted-foreground)" }}>Issued: {fmtShort(r.issued_at as string | null | undefined)}</Typography>
                          <Typography sx={{ fontSize: "0.78rem", color: "var(--muted-foreground)" }}>Expires: {fmtShort(r.expires_at as string | null | undefined)}</Typography>
                          <Typography sx={{ fontSize: "0.78rem", color: "var(--muted-foreground)" }}>
                            Redeemed: {fmtShort(r.redeemed_at as string | null | undefined)}
                            {r.redeemed_order_id || (r.redemption as Record<string, unknown> | undefined)?.order_id ? ` • Order #${String(r.redeemed_order_id || (r.redemption as Record<string, unknown> | undefined)?.order_id)}` : ""}
                          </Typography>
                          {(r.redemption as Record<string, unknown> | undefined)?.discount_amount != null ? (
                            <Typography sx={{ fontSize: "0.78rem", color: "var(--muted-foreground)" }}>
                              Discount: Rs. {Number((r.redemption as Record<string, unknown>).discount_amount).toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                            </Typography>
                          ) : null}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Box>
            ) : null}

            {tab === "audit" ? (
              <Box sx={{ overflowX: "auto" }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 800 }}>When / Actor</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>Action</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>Business / Customer</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>Target / Reason</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>Details</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {audits.length === 0 ? (
                      <TableRow><TableCell colSpan={5}><Typography sx={{ color: "var(--muted-foreground)" }}>No audit logs found.</Typography></TableCell></TableRow>
                    ) : audits.map((a) => (
                      <TableRow key={String(a.id)} hover>
                        <TableCell sx={{ minWidth: 180 }}>
                          <Typography sx={{ fontWeight: 700, fontSize: "0.85rem" }}>{fmtDate(String(a.created_at ?? ""))}</Typography>
                          <Typography sx={{ fontSize: "0.78rem", color: "var(--muted-foreground)" }}>Actor: {String(a.actor_role || "—")} {a.actor_id != null ? `(ID ${String(a.actor_id)})` : ""}</Typography>
                        </TableCell>
                        <TableCell>
                          <Chip size="small" label={String(a.action || "—")} variant="outlined" sx={{ fontWeight: 700, maxWidth: 260 }} />
                        </TableCell>
                        <TableCell>
                          {a.business_id ? (
                            <Stack spacing={0.25} alignItems="flex-start">
                              <Button size="small" onClick={() => drillToBusiness(a.business_id as number | string, "audit")} sx={{ p: 0, minWidth: 0, textTransform: "none", fontWeight: 600, justifyContent: "flex-start" }}>
                                {String(a.business_name || `Business #${String(a.business_id)}`)}
                              </Button>
                              <Stack direction="row" spacing={0.5}>
                                <Chip size="small" variant="outlined" clickable label="Progress" onClick={() => drillToBusiness(a.business_id as number | string, "memberships")} />
                                <Chip size="small" variant="outlined" clickable label="Rewards" onClick={() => drillToBusiness(a.business_id as number | string, "rewards")} />
                              </Stack>
                            </Stack>
                          ) : (
                            <Typography sx={{ fontWeight: 600 }}>—</Typography>
                          )}
                          <Typography sx={{ fontSize: "0.78rem", color: "var(--muted-foreground)", mt: 0.25 }}>{a.customer_name ? `Customer: ${a.customer_name}` : (a.customer_id ? `Customer #${a.customer_id}` : "Customer: —")}</Typography>
                        </TableCell>
                        <TableCell sx={{ minWidth: 220 }}>
                          <Typography sx={{ fontSize: "0.82rem" }}>{String(a.target_type || "—")}{a.target_id != null ? ` #${String(a.target_id)}` : ""}</Typography>
                          {a.reason ? <Typography sx={{ fontSize: "0.78rem", color: "var(--muted-foreground)" }}>{String(a.reason)}</Typography> : null}
                        </TableCell>
                        <TableCell sx={{ minWidth: 260 }}>
                          <Typography sx={{ fontSize: "0.75rem", color: "var(--muted-foreground)", whiteSpace: "pre-wrap", wordBreak: "break-word", maxWidth: 420 }}>
                            {a.metadata ? JSON.stringify(a.metadata) : (a.after || a.before ? JSON.stringify({ before: a.before ?? undefined, after: a.after ?? undefined }) : "—")}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Box>
            ) : null}

            <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ xs: "flex-start", sm: "center" }} spacing={1} sx={{ mt: 1.5 }}>
              <Typography sx={{ fontSize: "0.85rem", color: "var(--muted-foreground)" }}>
                Page {pg.current_page} of {pg.last_page} · {pg.total} total
              </Typography>
              <Stack direction="row" spacing={1}>
                <Button size="small" variant="outlined" disabled={!canPrev || loading} onClick={() => void load({ page: pg.current_page - 1 })} sx={{ textTransform: "none" }}>Previous</Button>
                <Button size="small" variant="outlined" disabled={!canNext || loading} onClick={() => void load({ page: pg.current_page + 1 })} sx={{ textTransform: "none" }}>Next</Button>
              </Stack>
            </Stack>
          </>
        )}
      </Paper>
    </Box>
  );
}
