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

  const [programs, setPrograms] = React.useState<any[]>([]);
  const [programsPg, setProgramsPg] = React.useState<SuperAdminPagination>(defaultPagination());
  const [memberships, setMemberships] = React.useState<any[]>([]);
  const [membershipsPg, setMembershipsPg] = React.useState<SuperAdminPagination>(defaultPagination());
  const [rewards, setRewards] = React.useState<any[]>([]);
  const [rewardsPg, setRewardsPg] = React.useState<SuperAdminPagination>(defaultPagination());
  const [audits, setAudits] = React.useState<any[]>([]);
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
    void load({ page: 1 });
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
                      <TableRow key={p.id} hover>
                        <TableCell>
                          <Stack spacing={0.5} alignItems="flex-start">
                            <Tooltip title="Filter oversight by this business">
                              <Button size="small" onClick={() => drillToBusiness(p.business_id, "memberships")} sx={{ p: 0, minWidth: 0, textTransform: "none", fontWeight: 700, justifyContent: "flex-start", color: "var(--primary)" }}>
                                {p.business?.name || `Business #${p.business_id}`}
                              </Button>
                            </Tooltip>
                            <Typography sx={{ fontSize: "0.78rem", color: "var(--muted-foreground)" }}>ID: {p.business_id}{p.business?.email ? ` · ${p.business.email}` : ""}</Typography>
                            <Stack direction="row" spacing={0.5} useFlexGap flexWrap="wrap">
                              <Chip size="small" variant="outlined" clickable label="Progress" onClick={() => drillToBusiness(p.business_id, "memberships")} />
                              <Chip size="small" variant="outlined" clickable label="Rewards" onClick={() => drillToBusiness(p.business_id, "rewards")} />
                              <Chip size="small" variant="outlined" clickable label="Audit" onClick={() => drillToBusiness(p.business_id, "audit")} />
                            </Stack>
                          </Stack>
                        </TableCell>
                        <TableCell>
                          <Stack spacing={0.5} alignItems="flex-start">
                            <StatusChip value={p.is_enabled ? "active" : "inactive"} />
                            <Typography sx={{ fontSize: "0.78rem", color: "var(--muted-foreground)" }}>Program #{p.id}</Typography>
                          </Stack>
                        </TableCell>
                        <TableCell>
                          <Typography sx={{ fontSize: "0.85rem", fontWeight: 600, textTransform: "capitalize" }}>{String(p.progress_policy || "—").replace(/_/g, " ")}</Typography>
                          <Typography sx={{ fontSize: "0.78rem", color: "var(--muted-foreground)" }}>
                            Statuses: {(p.eligible_order_statuses || []).join(", ") || "—"}
                          </Typography>
                          <Typography sx={{ fontSize: "0.78rem", color: "var(--muted-foreground)" }}>
                            Types: {(p.eligible_order_types || []).length ? (p.eligible_order_types || []).join(", ") : "all"} · Stacking: {p.allow_reward_stacking ? "yes" : "no"}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ minWidth: 260 }}>
                          <Typography sx={{ fontWeight: 700, mb: 0.5 }}>{p.tiers_count ?? (p.tiers?.length ?? 0)} tier(s)</Typography>
                          <Stack direction="row" spacing={0.5} useFlexGap flexWrap="wrap">
                            {(p.tiers || []).slice(0, 6).map((t: any) => (
                              <Chip key={t.id} size="small" variant="outlined" label={`${t.name} @ ${t.threshold_orders}`} sx={{ fontWeight: 600 }} />
                            ))}
                            {(p.tiers || []).length > 6 ? <Chip size="small" label={`+${(p.tiers || []).length - 6} more`} /> : null}
                          </Stack>
                        </TableCell>
                        <TableCell>
                          <Typography sx={{ fontSize: "0.85rem" }}>Members: <b>{p.memberships_count ?? 0}</b></Typography>
                          <Typography sx={{ fontSize: "0.85rem" }}>Rewards: <b>{p.rewards_total ?? 0}</b></Typography>
                          <Typography sx={{ fontSize: "0.78rem", color: "var(--muted-foreground)" }}>Available {p.rewards_available ?? 0} · Redeemed {p.rewards_redeemed ?? 0}</Typography>
                        </TableCell>
                        <TableCell>{fmtDate(p.updated_at)}</TableCell>
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
                      <TableRow key={m.id} hover>
                        <TableCell>
                          <Typography sx={{ fontWeight: 700 }}>{m.customer?.name || `Customer #${m.customer_id}`}</Typography>
                          <Typography sx={{ fontSize: "0.78rem", color: "var(--muted-foreground)" }}>{m.customer?.email || m.customer?.phone || "—"}</Typography>
                          <Typography sx={{ fontSize: "0.75rem", color: "var(--muted-foreground)" }}>ID: {m.customer_id} · Membership #{m.id}</Typography>
                        </TableCell>
                        <TableCell>
                          <Stack spacing={0.25} alignItems="flex-start">
                            <Button size="small" onClick={() => drillToBusiness(m.business_id, "memberships")} sx={{ p: 0, minWidth: 0, textTransform: "none", fontWeight: 600, justifyContent: "flex-start" }}>
                              {m.business_name || `#${m.business_id}`}
                            </Button>
                            <Typography sx={{ fontSize: "0.78rem", color: "var(--muted-foreground)" }}>Business ID: {m.business_id}</Typography>
                            <Stack direction="row" spacing={0.5} sx={{ mt: 0.25 }}>
                              <Chip size="small" variant="outlined" clickable label="Rewards" onClick={() => drillToBusiness(m.business_id, "rewards")} />
                              <Chip size="small" variant="outlined" clickable label="Audit" onClick={() => drillToBusiness(m.business_id, "audit")} />
                            </Stack>
                          </Stack>
                        </TableCell>
                        <TableCell>
                          <Typography sx={{ fontWeight: 700 }}>Progress: {m.progress_orders} orders</Typography>
                          <Typography sx={{ fontSize: "0.8rem", color: "var(--muted-foreground)" }}>Lifetime: {m.lifetime_orders} · Counted: {m.orders_count}</Typography>
                          {m.current_tier_reached != null ? <Typography sx={{ fontSize: "0.78rem", color: "var(--muted-foreground)" }}>Tier reached: {m.current_tier_reached}</Typography> : null}
                        </TableCell>
                        <TableCell>
                          <Typography sx={{ fontSize: "0.85rem" }}>Total: <b>{m.rewards_total ?? 0}</b></Typography>
                          <Typography sx={{ fontSize: "0.8rem", color: "var(--muted-foreground)" }}>Available {m.rewards_available ?? 0} · Redeemed {m.rewards_redeemed ?? 0}</Typography>
                        </TableCell>
                        <TableCell>
                          <Stack spacing={0.5} alignItems="flex-start">
                            <StatusChip value={m.status} />
                            <Typography sx={{ fontSize: "0.78rem", color: "var(--muted-foreground)" }}>Last order: {fmtShort(m.last_order_at)}</Typography>
                            <Typography sx={{ fontSize: "0.78rem", color: "var(--muted-foreground)" }}>Last reward: {fmtShort(m.last_reward_at)}</Typography>
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
                      <TableRow key={r.id} hover>
                        <TableCell>
                          <Typography sx={{ fontWeight: 800, fontFamily: "monospace" }}>{r.reward_code || `#${r.id}`}</Typography>
                          <Typography sx={{ fontSize: "0.78rem", color: "var(--muted-foreground)" }}>Reward #{r.id}</Typography>
                          {r.reward_description ? <Typography sx={{ fontSize: "0.78rem", color: "var(--muted-foreground)" }}>{r.reward_description}</Typography> : null}
                        </TableCell>
                        <TableCell>
                          <Typography sx={{ fontWeight: 700 }}>{r.customer?.name || `Customer #${r.customer_id}`}</Typography>
                          <Typography sx={{ fontSize: "0.78rem", color: "var(--muted-foreground)" }}>{r.customer?.email || r.customer?.phone || "—"}</Typography>
                        </TableCell>
                        <TableCell>
                          <Stack spacing={0.25} alignItems="flex-start">
                            <Button size="small" onClick={() => drillToBusiness(r.business_id, "rewards")} sx={{ p: 0, minWidth: 0, textTransform: "none", fontWeight: 600, justifyContent: "flex-start" }}>
                              {r.business_name || `#${r.business_id}`}
                            </Button>
                            <Typography sx={{ fontSize: "0.78rem", color: "var(--muted-foreground)" }}>Tier: {r.tier?.name || "—"}</Typography>
                            <Stack direction="row" spacing={0.5} sx={{ mt: 0.25 }}>
                              <Chip size="small" variant="outlined" clickable label="Progress" onClick={() => drillToBusiness(r.business_id, "memberships")} />
                              <Chip size="small" variant="outlined" clickable label="Audit" onClick={() => drillToBusiness(r.business_id, "audit")} />
                            </Stack>
                          </Stack>
                        </TableCell>
                        <TableCell>
                          <Typography sx={{ fontWeight: 700, textTransform: "capitalize" }}>{String(r.reward_type || "—").replace(/_/g, " ")}</Typography>
                          <Typography sx={{ fontSize: "0.8rem", color: "var(--muted-foreground)" }}>Value: {r.reward_value ?? "—"}</Typography>
                        </TableCell>
                        <TableCell>
                          <Stack spacing={0.5} alignItems="flex-start">
                            <StatusChip value={r.effective_status || r.status} />
                            {r.status !== r.effective_status ? <Typography sx={{ fontSize: "0.75rem", color: "var(--muted-foreground)" }}>Stored: {r.status}</Typography> : null}
                            {r.revocation_reason ? <Typography sx={{ fontSize: "0.75rem", color: "var(--muted-foreground)" }}>Reason: {r.revocation_reason}</Typography> : null}
                          </Stack>
                        </TableCell>
                        <TableCell>
                          <Typography sx={{ fontSize: "0.78rem", color: "var(--muted-foreground)" }}>Issued: {fmtShort(r.issued_at)}</Typography>
                          <Typography sx={{ fontSize: "0.78rem", color: "var(--muted-foreground)" }}>Expires: {fmtShort(r.expires_at)}</Typography>
                          <Typography sx={{ fontSize: "0.78rem", color: "var(--muted-foreground)" }}>Redeemed: {fmtShort(r.redeemed_at)}</Typography>
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
                      <TableRow key={a.id} hover>
                        <TableCell sx={{ minWidth: 180 }}>
                          <Typography sx={{ fontWeight: 700, fontSize: "0.85rem" }}>{fmtDate(a.created_at)}</Typography>
                          <Typography sx={{ fontSize: "0.78rem", color: "var(--muted-foreground)" }}>Actor: {a.actor_role || "—"} {a.actor_id != null ? `(ID ${a.actor_id})` : ""}</Typography>
                        </TableCell>
                        <TableCell>
                          <Chip size="small" label={a.action || "—"} variant="outlined" sx={{ fontWeight: 700, maxWidth: 260 }} />
                        </TableCell>
                        <TableCell>
                          {a.business_id ? (
                            <Stack spacing={0.25} alignItems="flex-start">
                              <Button size="small" onClick={() => drillToBusiness(a.business_id, "audit")} sx={{ p: 0, minWidth: 0, textTransform: "none", fontWeight: 600, justifyContent: "flex-start" }}>
                                {a.business_name || `Business #${a.business_id}`}
                              </Button>
                              <Stack direction="row" spacing={0.5}>
                                <Chip size="small" variant="outlined" clickable label="Progress" onClick={() => drillToBusiness(a.business_id, "memberships")} />
                                <Chip size="small" variant="outlined" clickable label="Rewards" onClick={() => drillToBusiness(a.business_id, "rewards")} />
                              </Stack>
                            </Stack>
                          ) : (
                            <Typography sx={{ fontWeight: 600 }}>—</Typography>
                          )}
                          <Typography sx={{ fontSize: "0.78rem", color: "var(--muted-foreground)", mt: 0.25 }}>{a.customer_name ? `Customer: ${a.customer_name}` : (a.customer_id ? `Customer #${a.customer_id}` : "Customer: —")}</Typography>
                        </TableCell>
                        <TableCell sx={{ minWidth: 220 }}>
                          <Typography sx={{ fontSize: "0.82rem" }}>{a.target_type || "—"}{a.target_id != null ? ` #${a.target_id}` : ""}</Typography>
                          {a.reason ? <Typography sx={{ fontSize: "0.78rem", color: "var(--muted-foreground)" }}>{a.reason}</Typography> : null}
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
