"use client";

import * as React from "react";
import {
  Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Fade, Grow,
  InputAdornment, LinearProgress, MenuItem, Paper, Skeleton, Stack, Tab, Tabs,
  Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography, useMediaQuery,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { AnimatePresence, motion } from "motion/react";
import { shakeKeyframes, shakeTransition, spring, useReducedMotion } from "@/lib/motion";

const MotionButton = motion.create(Button);
import RefreshIcon from "@mui/icons-material/Refresh";
import SpeedOutlinedIcon from "@mui/icons-material/SpeedOutlined";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import BackupOutlinedIcon from "@mui/icons-material/BackupOutlined";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import {
  getSuperAdminBackups, getSuperAdminOperations, getSuperAdminUsage, recordSuperAdminBackup, setSuperAdminMaintenance,
  type BackupRecordItem, type BusinessUsageItem,
} from "@/lib/api";
import { useAppSnackbar } from "@/components/common/SnackBar";
import { safeError } from "@/lib/safeError";

const fmtDate = (v?: string | null) => (v ? new Date(v).toLocaleString([], { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—");
const fmtBytes = (v?: number | null) => {
  if (v == null || Number.isNaN(v)) return "—";
  if (v < 1024) return `${v} B`;
  if (v < 1024 * 1024) return `${(v / 1024).toFixed(1)} KB`;
  if (v < 1024 * 1024 * 1024) return `${(v / (1024 * 1024)).toFixed(1)} MB`;
  return `${(v / (1024 * 1024 * 1024)).toFixed(2)} GB`;
};

function SevChip({ severity, label }: { severity: string; label?: string }) {
  const s = (severity || "").toLowerCase();
  const tone = s === "critical" || s === "failed" ? ["#991b1b", "#fee2e2"] : s === "warning" || s === "past_due" ? ["#92400e", "#fef3c7"] : s === "success" || s === "paid" || s === "active" ? ["#166534", "#dcfce7"] : ["#374151", "#f3f4f6"];
  return <Chip size="small" label={label ?? severity} sx={{ height: 24, fontWeight: 800, fontSize: "0.72rem", color: tone[0], backgroundColor: tone[1], textTransform: "capitalize", maxWidth: "100%" }} />;
}

function MobileCard({ children }: { children: React.ReactNode }) {
  return (
    <Paper elevation={0} sx={{ p: 1.35, borderRadius: "16px", border: "1px solid var(--border)", backgroundColor: "var(--background)", minWidth: 0, overflow: "hidden" }}>
      {children}
    </Paper>
  );
}

function QuotaBar({ label, value, limit }: { label: string; value: number; limit?: number | null }) {
  const pct = limit ? Math.min(100, (value / limit) * 100) : null;
  return (
    <Box sx={{ minWidth: 0 }}>
      <Stack direction="row" justifyContent="space-between" spacing={1} alignItems="baseline">
        <Typography sx={{ fontSize: "0.68rem", fontWeight: 800, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</Typography>
        <Typography sx={{ fontSize: "0.76rem", fontWeight: 850 }}>{value}{limit ? ` / ${limit}` : ""}</Typography>
      </Stack>
      {pct != null ? <LinearProgress variant="determinate" value={pct} sx={{ mt: 0.35, height: 6, borderRadius: 999, backgroundColor: "var(--muted)", "& .MuiLinearProgress-bar": { backgroundColor: pct >= 100 ? "#dc2626" : pct >= 80 ? "#f59e0b" : "var(--primary)" } }} /> : <Typography sx={{ fontSize: "0.72rem", color: "var(--muted-foreground)" }}>No limit</Typography>}
    </Box>
  );
}

export default function SuperAdminUsageOperationsPage() {
  const theme = useTheme();
  const fullScreenDialog = useMediaQuery(theme.breakpoints.down("sm"));
  const reducedMotion = useReducedMotion();
  const [shakeMaintenance, setShakeMaintenance] = React.useState(0);
  const [shakeBackup, setShakeBackup] = React.useState(0);

  const [tab, setTab] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [usage, setUsage] = React.useState<{ summary: any; items: BusinessUsageItem[] }>({ summary: {}, items: [] });
  const [operations, setOperations] = React.useState<any>(null);
  const [backups, setBackups] = React.useState<{ items: BackupRecordItem[]; summary: any }>({ items: [], summary: {} });
  const [maintenanceDialog, setMaintenanceDialog] = React.useState(false);
  const [maintenanceForm, setMaintenanceForm] = React.useState({ enabled: false, message: "The platform is temporarily under maintenance. Please try again later.", allow_super_admin: true });
  const [backupDialog, setBackupDialog] = React.useState(false);
  const [backupForm, setBackupForm] = React.useState({ name: "", type: "database", status: "recorded", source: "manual_record", path: "", notes: "" });
  const [saving, setSaving] = React.useState(false);
  const [usageSearch, setUsageSearch] = React.useState("");
  const [usageStatus, setUsageStatus] = React.useState("all");
  const [usageWarnings, setUsageWarnings] = React.useState("all");
  const [usageStorage, setUsageStorage] = React.useState("all");
  const { showSnackbar } = useAppSnackbar();

  const load = React.useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const [u, o, b] = await Promise.all([getSuperAdminUsage(), getSuperAdminOperations(), getSuperAdminBackups()]);
      setUsage(u);
      setOperations(o);
      setBackups(b);
      const m = o?.health?.maintenance ?? o?.settings?.maintenance_mode ?? {};
      setMaintenanceForm({
        enabled: !!m.enabled,
        message: m.message || "The platform is temporarily under maintenance. Please try again later.",
        allow_super_admin: m.allow_super_admin !== false,
      });
    } catch (e) {
      showSnackbar(safeError(e, "Failed to load usage/operations."), "error");
    } finally {
      setLoading(false);
    }
  }, [showSnackbar]);

  React.useEffect(() => { void load(); }, [load]);

  const saveMaintenance = async () => {
    setSaving(true);
    try {
      await setSuperAdminMaintenance(maintenanceForm);
      showSnackbar(maintenanceForm.enabled ? "Maintenance mode enabled." : "Maintenance mode disabled.", "success");
      setMaintenanceDialog(false);
      await load(true);
    } catch (e) { setShakeMaintenance((k) => k + 1); showSnackbar(safeError(e, "Failed to update maintenance mode."), "error"); } finally { setSaving(false); }
  };

  const saveBackup = async () => {
    setSaving(true);
    try {
      await recordSuperAdminBackup({
        name: backupForm.name || undefined,
        type: backupForm.type,
        status: backupForm.status,
        source: backupForm.source,
        path: backupForm.path || undefined,
        notes: backupForm.notes || undefined,
      });
      showSnackbar("Backup record saved.", "success");
      setBackupDialog(false);
      setBackupForm({ name: "", type: "database", status: "recorded", source: "manual_record", path: "", notes: "" });
      await load(true);
    } catch (e) { setShakeBackup((k) => k + 1); showSnackbar(safeError(e, "Failed to record backup."), "error"); } finally { setSaving(false); }
  };

  const health = operations?.health ?? {};
  const db = health.database ?? {};
  const queue = health.queue ?? {};
  const requests = health.requests ?? {};
  const maintenance = health.maintenance ?? {};

  const filteredUsage = React.useMemo(() => {
    const q = usageSearch.trim().toLowerCase();
    return (usage.items ?? []).filter((row) => {
      if (q && !`${row.business?.name ?? ""} ${row.plan?.name ?? ""}`.toLowerCase().includes(q)) return false;
      if (usageStatus === "active" && !row.business?.is_active) return false;
      if (usageStatus === "suspended" && row.business?.is_active) return false;
      const hasWarnings = (row.warnings?.length ?? 0) > 0;
      const hasCritical = (row.warnings ?? []).some((w) => w.severity === "critical");
      if (usageWarnings === "with_warnings" && !hasWarnings) return false;
      if (usageWarnings === "critical" && !hasCritical) return false;
      if (usageWarnings === "none" && hasWarnings) return false;
      const imgs = row.storage?.total_images ?? row.metrics?.image_count ?? 0;
      const unknown = row.storage?.unknown_images ?? 0;
      const missing = row.storage?.missing_images ?? 0;
      if (usageStorage === "has_images" && imgs <= 0) return false;
      if (usageStorage === "no_images" && imgs > 0) return false;
      if (usageStorage === "unknown_or_missing" && unknown === 0 && missing === 0) return false;
      if (usageStorage === "fully_known" && (imgs === 0 || unknown > 0)) return false;
      return true;
    });
  }, [usage.items, usageSearch, usageStatus, usageWarnings, usageStorage]);

  const dialogPaperSx = { borderRadius: fullScreenDialog ? 0 : "20px", m: fullScreenDialog ? 0 : undefined };

  return (
    <Box sx={{ display: "grid", gap: 2, minWidth: 0, maxWidth: "100%", overflow: "hidden" }}>
      <Paper elevation={0} sx={{ p: { xs: 1.5, md: 2.5 }, borderRadius: "22px", border: "1px solid var(--border)", backgroundColor: "var(--card)", boxShadow: "0 16px 40px rgba(31, 42, 43, 0.08)", minWidth: 0, overflow: "hidden" }}>
        <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" spacing={1.5} alignItems={{ xs: "stretch", sm: "center" }} sx={{ minWidth: 0 }}>
          <Stack direction="row" spacing={1.25} alignItems="center" sx={{ minWidth: 0 }}>
            <Box sx={{ width: 44, height: 44, borderRadius: "14px", display: "grid", placeItems: "center", color: "var(--chart-1)", backgroundColor: "color-mix(in srgb, var(--chart-1) 16%, transparent)", border: "1px solid color-mix(in srgb, var(--chart-1) 34%, transparent)", flexShrink: 0 }}><SpeedOutlinedIcon /></Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ fontSize: { xs: "1.2rem", md: "1.5rem" }, fontWeight: 900, lineHeight: 1.15 }}>Usage & Operations</Typography>
              <Typography sx={{ color: "var(--muted-foreground)", fontWeight: 650, fontSize: "0.84rem", mt: 0.2 }}>Quota tracking, platform health, maintenance, and backup monitoring</Typography>
            </Box>
          </Stack>
          <Stack direction="row" spacing={0.75} flexWrap={{ xs: "wrap", sm: "nowrap" }} useFlexGap sx={{ minWidth: 0, maxWidth: "100%", width: { xs: "100%", sm: "auto" } }}>
            <MotionButton whileTap={reducedMotion ? undefined : { scale: 0.98 }} transition={spring.press} variant="outlined" startIcon={<RefreshIcon />} onClick={() => void load(true)} sx={{ borderRadius: "12px", textTransform: "none", fontWeight: 800, whiteSpace: "nowrap", flex: { xs: "1 1 auto", sm: "0 0 auto" }, minHeight: 40 }}>Refresh</MotionButton>
            <MotionButton whileTap={reducedMotion ? undefined : { scale: 0.98 }} transition={spring.press} variant="outlined" startIcon={<SettingsOutlinedIcon />} onClick={() => setMaintenanceDialog(true)} sx={{ borderRadius: "12px", textTransform: "none", fontWeight: 800, whiteSpace: "nowrap", flex: { xs: "1 1 auto", sm: "0 0 auto" }, minHeight: 40 }}>Maintenance</MotionButton>
            <MotionButton whileTap={reducedMotion ? undefined : { scale: 0.98 }} transition={spring.press} variant="contained" startIcon={<BackupOutlinedIcon />} onClick={() => setBackupDialog(true)} sx={{ borderRadius: "12px", textTransform: "none", fontWeight: 800, whiteSpace: "nowrap", flex: { xs: "1 1 auto", sm: "0 0 auto" }, minHeight: 40 }}>Record backup</MotionButton>
          </Stack>
        </Stack>
        <Box sx={{ mt: 2, display: "grid", gridTemplateColumns: { xs: "repeat(2,minmax(0,1fr))", md: "repeat(4,minmax(0,1fr))", xl: "repeat(8,minmax(0,1fr))" }, gap: 1 }}>
          {[
            { label: "Usage warnings", value: usage.summary?.warnings ?? 0 },
            { label: "Critical quotas", value: usage.summary?.critical ?? 0 },
            { label: "Total images", value: usage.summary?.total_images ?? 0 },
            { label: "Known storage", value: fmtBytes(usage.summary?.known_storage_bytes ?? 0) },
            { label: "Unknown/missing", value: `${usage.summary?.unknown_images ?? 0} / ${usage.summary?.missing_images ?? 0}` },
            { label: "Database", value: db.ok ? "OK" : "Error" },
            { label: "Failed jobs", value: queue.failed_jobs ?? 0 },
            { label: "Maintenance", value: maintenance.enabled ? "On" : "Off" },
          ].map((k) => (
            <Paper key={k.label} elevation={0} sx={{ p: 1.15, borderRadius: "14px", border: "1px solid var(--border)", backgroundColor: "var(--background)", minWidth: 0 }}>
              <Typography sx={{ fontSize: "0.64rem", fontWeight: 850, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--muted-foreground)", lineHeight: 1.2 }}>{k.label}</Typography>
              <Typography sx={{ fontSize: { xs: "0.95rem", sm: "1.02rem" }, fontWeight: 900, wordBreak: "break-word", mt: 0.15, lineHeight: 1.2 }}>{typeof k.value === "number" ? k.value.toLocaleString("en-IN") : k.value}</Typography>
            </Paper>
          ))}
        </Box>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mt: 1.5, minHeight: 42, "& .MuiTab-root": { minHeight: 42, textTransform: "none", fontWeight: 800, fontSize: { xs: "0.78rem", sm: "0.875rem" }, px: { xs: 1, sm: 2 } } }} variant="scrollable" allowScrollButtonsMobile>
          <Tab label="Usage & quotas" /><Tab label="Operations" /><Tab label="Backups" />
        </Tabs>
      </Paper>

      {loading ? <Skeleton variant="rounded" height={260} sx={{ borderRadius: "22px" }} /> : (
        <Paper elevation={0} sx={{ borderRadius: "22px", border: "1px solid var(--border)", backgroundColor: "var(--card)", overflow: "hidden", minWidth: 0 }}>
          {tab === 0 && (
            <Box sx={{ minWidth: 0 }}>
              {usage.summary?.storage_instrumented === false ? (
                <Alert severity="info" sx={{ m: 1.25, borderRadius: "12px" }}>Per-business storage is not instrumented and is reported as unavailable (not fabricated).</Alert>
              ) : (usage.summary?.unknown_images ?? 0) > 0 || (usage.summary?.missing_images ?? 0) > 0 ? (
                <Alert severity="info" sx={{ m: 1.25, borderRadius: "12px" }}>
                  <strong>Per-business storage:</strong> known image bytes (logo + menu images). Unknown: <strong>{usage.summary?.unknown_images ?? 0}</strong>, missing: <strong>{usage.summary?.missing_images ?? 0}</strong> (not fabricated).
                </Alert>
              ) : (
                <Alert severity="success" sx={{ m: 1.25, borderRadius: "12px" }}>
                  <strong>Per-business storage:</strong> known image bytes (logo + menu images) shown by current filter. Unknown/missing reported, not fabricated.
                </Alert>
              )}
              <Stack direction={{ xs: "column", md: "row" }} spacing={1} sx={{ px: 1.25, pb: 1.25 }} flexWrap="wrap" useFlexGap>
                <TextField
                  size="small"
                  placeholder="Search business or plan"
                  value={usageSearch}
                  onChange={(e) => setUsageSearch(e.target.value)}
                  sx={{ minWidth: 0, width: { xs: "100%", md: 240 }, flex: { md: "0 0 auto" } }}
                  InputProps={{ startAdornment: <InputAdornment position="start"><SearchRoundedIcon fontSize="small" /></InputAdornment> }}
                />
                <TextField select size="small" label="Status" value={usageStatus} onChange={(e) => setUsageStatus(e.target.value)} sx={{ minWidth: 0, width: { xs: "100%", sm: "calc(50% - 4px)", md: 150 } }}>
                  <MenuItem value="all">All statuses</MenuItem><MenuItem value="active">Active</MenuItem><MenuItem value="suspended">Suspended</MenuItem>
                </TextField>
                <TextField select size="small" label="Warnings" value={usageWarnings} onChange={(e) => setUsageWarnings(e.target.value)} sx={{ minWidth: 0, width: { xs: "100%", sm: "calc(50% - 4px)", md: 170 } }}>
                  <MenuItem value="all">All warnings</MenuItem><MenuItem value="with_warnings">Has warnings</MenuItem><MenuItem value="critical">Critical only</MenuItem><MenuItem value="none">No warnings</MenuItem>
                </TextField>
                <TextField select size="small" label="Images/storage" value={usageStorage} onChange={(e) => setUsageStorage(e.target.value)} sx={{ minWidth: 0, width: { xs: "100%", sm: "calc(50% - 4px)", md: 190 } }}>
                  <MenuItem value="all">All image states</MenuItem><MenuItem value="has_images">Has images</MenuItem><MenuItem value="no_images">No images</MenuItem><MenuItem value="unknown_or_missing">Unknown/missing</MenuItem><MenuItem value="fully_known">Fully known</MenuItem>
                </TextField>
                <Typography sx={{ ml: { md: "auto" }, alignSelf: "center", fontSize: "0.78rem", color: "var(--muted-foreground)", fontWeight: 750 }}>
                  Showing {filteredUsage.length} of {usage.items.length}
                </Typography>
              </Stack>

              {/* Mobile cards */}
              <Box sx={{ display: { xs: "grid", lg: "none" }, gap: 1, p: 1.25, pt: 0 }}>
                {filteredUsage.length === 0 ? <Typography sx={{ py: 4, textAlign: "center", color: "var(--muted-foreground)", fontWeight: 650 }}>{usage.items.length === 0 ? "No businesses found." : "No businesses match the current filter."}</Typography> : (
                  <AnimatePresence initial={false}>
                    {filteredUsage.map((row) => {
                      const s = row.storage;
                      const logo = s?.breakdown?.logo;
                      const menuImgs = s?.breakdown?.menu_items;
                      return (
                        <motion.div
                          key={row.business.id}
                          layout={!reducedMotion}
                          initial={reducedMotion ? false : { opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={reducedMotion ? undefined : { opacity: 0, y: -6, transition: { duration: 0.16 } }}
                          transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
                        >
                          <MobileCard>
                            <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
                              <Box sx={{ minWidth: 0, flex: 1 }}>
                                <Typography sx={{ fontWeight: 900, fontSize: "0.94rem", lineHeight: 1.2 }} noWrap>{row.business.name}</Typography>
                                <Typography sx={{ fontSize: "0.76rem", color: "var(--muted-foreground)", mt: 0.15 }}>
                                  {row.plan?.name ?? "No plan"}{row.subscription_status ? ` · ${row.subscription_status}` : ""}
                                </Typography>
                              </Box>
                              {!row.business.is_active ? <Chip size="small" label="Suspended" sx={{ fontWeight: 800, color: "#92400e", bgcolor: "#fef3c7", flexShrink: 0 }} /> : null}
                            </Stack>
                            <Box sx={{ mt: 1, p: 1, borderRadius: "12px", bgcolor: "color-mix(in srgb, var(--card) 70%, transparent)", border: "1px solid var(--border)" }}>
                              <Stack direction="row" justifyContent="space-between" flexWrap="wrap" useFlexGap spacing={0.5}>
                                <Typography sx={{ fontSize: "0.78rem", fontWeight: 850 }}>Images: {s?.total_images ?? row.metrics?.image_count ?? 0}</Typography>
                                <Typography sx={{ fontSize: "0.78rem", fontWeight: 850 }}>Known: {fmtBytes(s?.known_bytes ?? 0)}</Typography>
                              </Stack>
                              <Typography sx={{ fontSize: "0.72rem", color: "var(--muted-foreground)", mt: 0.25 }}>Logo {logo?.images ?? 0} ({fmtBytes(logo?.known_bytes ?? 0)}) · Menu {menuImgs?.images ?? 0} ({fmtBytes(menuImgs?.known_bytes ?? 0)})</Typography>
                              {(s?.unknown_images ?? 0) > 0 || (s?.missing_images ?? 0) > 0 ? <Typography sx={{ fontSize: "0.72rem", color: "#92400e", fontWeight: 700, mt: 0.15 }}>Unknown {s?.unknown_images ?? 0} · Missing {s?.missing_images ?? 0}</Typography> : null}
                            </Box>
                            <Stack spacing={0.85} sx={{ mt: 1 }}>
                              <QuotaBar label="Orders / mo" value={row.metrics?.orders_per_month ?? 0} limit={row.limits?.orders_per_month} />
                              <QuotaBar label="Menu items" value={row.metrics?.menu_items ?? 0} limit={row.limits?.menu_items} />
                              <QuotaBar label="Tables" value={row.metrics?.tables ?? 0} limit={row.limits?.tables} />
                              <QuotaBar label="Users" value={row.metrics?.users ?? 0} limit={row.limits?.users} />
                            </Stack>
                            {row.warnings?.length ? (
                              <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap sx={{ mt: 1 }}>
                                {row.warnings.map((w, i) => <SevChip key={i} severity={w.severity} label={`${w.severity}: ${w.metric}`} />)}
                              </Stack>
                            ) : null}
                            {row.warnings?.length ? <Typography sx={{ mt: 0.5, fontSize: "0.74rem", color: "var(--muted-foreground)" }}>{row.warnings.map((w) => w.message).join(" ")}</Typography> : null}
                          </MobileCard>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                )}
              </Box>

              {/* Desktop table */}
              <Box sx={{ display: { xs: "none", lg: "block" }, overflowX: "auto" }}>
                <Table size="small">
                  <TableHead><TableRow>{["Business", "Plan", "Images", "Known storage", "Orders/mo", "Menu", "Tables", "Users", "Warnings / details"].map((h) => <TableCell key={h} sx={{ fontWeight: 850, whiteSpace: "nowrap" }}>{h}</TableCell>)}</TableRow></TableHead>
                  <TableBody>
                    {filteredUsage.map((row) => {
                      const s = row.storage;
                      const logo = s?.breakdown?.logo;
                      const menuImgs = s?.breakdown?.menu_items;
                      const details = [
                        ...(row.warnings?.map((w) => w.message) ?? []),
                        s ? `Images: logo ${logo?.images ?? 0} (${fmtBytes(logo?.known_bytes ?? 0)}), menu ${menuImgs?.images ?? 0} (${fmtBytes(menuImgs?.known_bytes ?? 0)}). Unknown ${s.unknown_images ?? 0}, missing ${s.missing_images ?? 0}.` : "Storage data unavailable.",
                      ].filter(Boolean).join(" ");
                      return (
                        <TableRow key={row.business.id} hover>
                          <TableCell><Typography sx={{ fontWeight: 850 }}>{row.business.name}</Typography>{!row.business.is_active ? <Typography sx={{ fontSize: "0.72rem", color: "#b45309", fontWeight: 700 }}>Suspended</Typography> : null}</TableCell>
                          <TableCell>{row.plan?.name ?? "—"}{row.subscription_status ? <Typography component="span" sx={{ fontSize: "0.72rem", color: "var(--muted-foreground)" }}> · {row.subscription_status}</Typography> : null}</TableCell>
                          <TableCell sx={{ minWidth: 110 }}><Typography sx={{ fontSize: "0.82rem", fontWeight: 850 }}>{s?.total_images ?? row.metrics?.image_count ?? 0}</Typography><Typography sx={{ fontSize: "0.72rem", color: "var(--muted-foreground)" }}>L {logo?.images ?? 0} · M {menuImgs?.images ?? 0}</Typography></TableCell>
                          <TableCell sx={{ minWidth: 140 }}><Typography sx={{ fontSize: "0.82rem", fontWeight: 850 }}>{fmtBytes(s?.known_bytes ?? 0)}</Typography>{(s?.unknown_images ?? 0) > 0 || (s?.missing_images ?? 0) > 0 ? <Typography sx={{ fontSize: "0.72rem", color: "#92400e", fontWeight: 700 }}>Unknown {s?.unknown_images ?? 0} · Missing {s?.missing_images ?? 0}</Typography> : <Typography sx={{ fontSize: "0.72rem", color: "var(--muted-foreground)" }}>{s?.fully_known ? "Fully known" : "—"}</Typography>}</TableCell>
                          {["orders_per_month", "menu_items", "tables", "users"].map((m) => {
                            const val = (row.metrics as any)?.[m] ?? 0;
                            const lim = (row.limits as any)?.[m];
                            const pct = lim ? Math.min(100, (val / lim) * 100) : null;
                            return (
                              <TableCell key={m} sx={{ minWidth: 100 }}>
                                <Typography sx={{ fontSize: "0.8rem", fontWeight: 800 }}>{val}{lim ? ` / ${lim}` : ""}</Typography>
                                {pct != null ? <LinearProgress variant="determinate" value={pct} sx={{ mt: 0.5, height: 6, borderRadius: 999, backgroundColor: "var(--muted)", "& .MuiLinearProgress-bar": { backgroundColor: pct >= 100 ? "#dc2626" : pct >= 80 ? "#f59e0b" : "var(--primary)" } }} /> : <Typography sx={{ fontSize: "0.72rem", color: "var(--muted-foreground)" }}>No limit</Typography>}
                              </TableCell>
                            );
                          })}
                          <TableCell sx={{ fontSize: "0.76rem", minWidth: 260, maxWidth: 420 }}>
                            {row.warnings?.length ? row.warnings.map((w, i) => <Box key={i} sx={{ mb: 0.5 }}><SevChip severity={w.severity} label={`${w.severity}: ${w.metric}`} /></Box>) : null}
                            <Typography sx={{ color: "var(--muted-foreground)" }}>{details || "Within limits / no configured limits."}</Typography>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {filteredUsage.length === 0 ? <TableRow><TableCell colSpan={9} sx={{ py: 5, textAlign: "center", color: "var(--muted-foreground)" }}>{usage.items.length === 0 ? "No businesses found." : "No businesses match the current filter."}</TableCell></TableRow> : null}
                  </TableBody>
                </Table>
              </Box>
            </Box>
          )}

          {tab === 1 && (
            <Box sx={{ p: { xs: 1.25, md: 2.25 }, display: "grid", gap: 1.25, minWidth: 0 }}>
              {maintenance.enabled ? <Alert severity="warning" icon={<WarningAmberRoundedIcon />} sx={{ borderRadius: "12px" }}>Maintenance mode is enabled: {maintenance.message}</Alert> : <Alert severity="success" sx={{ borderRadius: "12px" }}>Maintenance mode is off.</Alert>}
              <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(2,minmax(0,1fr))" }, gap: 1.25 }}>
                <Paper elevation={0} sx={{ p: 1.5, borderRadius: "14px", border: "1px solid var(--border)", backgroundColor: "var(--background)", minWidth: 0 }}>
                  <Typography sx={{ fontWeight: 900, mb: 1 }}>Database</Typography>
                  <SevChip severity={db.ok ? "success" : "critical"} label={db.ok ? "Connected" : "Error"} />
                  <Typography sx={{ fontSize: "0.82rem", color: "var(--muted-foreground)", mt: 1 }}>Name: {db.name || "—"}</Typography>
                  {db.error ? <Typography sx={{ fontSize: "0.78rem", color: "#dc2626", mt: 0.5, wordBreak: "break-word" }}>{db.error}</Typography> : null}
                </Paper>
                <Paper elevation={0} sx={{ p: 1.5, borderRadius: "14px", border: "1px solid var(--border)", backgroundColor: "var(--background)", minWidth: 0 }}>
                  <Typography sx={{ fontWeight: 900, mb: 1 }}>Queues / Jobs</Typography>
                  <Typography sx={{ fontSize: "0.85rem" }}>Pending: <strong>{queue.pending_jobs ?? 0}</strong> · Failed: <strong>{queue.failed_jobs ?? 0}</strong></Typography>
                  <Typography sx={{ fontSize: "0.78rem", color: "var(--muted-foreground)", mt: 0.75 }}>Instrumented: {String(!!queue.instrumented)}. {health.workers?.note}</Typography>
                </Paper>
                <Paper elevation={0} sx={{ p: 1.5, borderRadius: "14px", border: "1px solid var(--border)", backgroundColor: "var(--background)", minWidth: 0 }}>
                  <Typography sx={{ fontWeight: 900, mb: 1, lineHeight: 1.25 }}>API request health <Box component="span" sx={{ display: "block", mt: 0.15, fontSize: "0.78em", fontWeight: 800, color: "var(--muted-foreground)" }}>(15 min)</Box></Typography>
                  {requests.instrumented ? (
                    <>
                      <Typography sx={{ fontSize: "0.85rem" }}>Requests: <strong>{requests.requests}</strong> · Errors: <strong>{requests.errors}</strong> · Server errors: <strong>{requests.server_errors}</strong></Typography>
                      <Typography sx={{ fontSize: "0.85rem", mt: 0.5 }}>Error rate: <strong>{requests.error_rate}%</strong></Typography>
                    </>
                  ) : <Typography sx={{ fontSize: "0.82rem", color: "var(--muted-foreground)" }}>API request logging is not instrumented (`api_request_logs` unavailable).</Typography>}
                </Paper>
                <Paper elevation={0} sx={{ p: 1.5, borderRadius: "14px", border: "1px solid var(--border)", backgroundColor: "var(--background)", minWidth: 0 }}>
                  <Typography sx={{ fontWeight: 900, mb: 1 }}>Cache / Runtime</Typography>
                  <Typography sx={{ fontSize: "0.85rem" }}>Cache driver: <strong>{health.cache?.driver || "—"}</strong></Typography>
                  <Typography sx={{ fontSize: "0.78rem", color: "var(--muted-foreground)", mt: 0.75 }}>Worker heartbeats are not instrumented; queue table counts shown when available.</Typography>
                </Paper>
              </Box>
            </Box>
          )}

          {tab === 2 && (
            <Box sx={{ minWidth: 0 }}>
              <Box sx={{ display: { xs: "grid", md: "none" }, gap: 1, p: 1.25 }}>
                {backups.items.length === 0 ? <Typography sx={{ py: 4, textAlign: "center", color: "var(--muted-foreground)", fontWeight: 650 }}>No backup records yet. Record manual/integrated backup events to monitor them here.</Typography> : backups.items.map((b) => (
                  <MobileCard key={b.id}>
                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
                      <Typography sx={{ fontWeight: 900, fontSize: "0.92rem", lineHeight: 1.2, minWidth: 0, wordBreak: "break-word" }}>{b.name}</Typography>
                      <SevChip severity={b.status} />
                    </Stack>
                    <Typography sx={{ fontSize: "0.78rem", color: "var(--muted-foreground)", mt: 0.5 }}>{b.type} · {b.source} · {fmtBytes(b.size_bytes)}</Typography>
                    <Typography sx={{ fontSize: "0.74rem", color: "var(--muted-foreground)", mt: 0.25 }}>Completed: {fmtDate(b.completed_at)}{b.verified_at ? ` · Verified: ${fmtDate(b.verified_at)}` : ""}</Typography>
                    {b.notes || b.path ? <Typography sx={{ fontSize: "0.74rem", mt: 0.5, wordBreak: "break-word" }}>{b.notes || b.path}</Typography> : null}
                  </MobileCard>
                ))}
              </Box>
              <Box sx={{ display: { xs: "none", md: "block" }, overflowX: "auto" }}>
                <Table size="small">
                  <TableHead><TableRow>{["Name", "Type", "Status", "Source", "Size", "Completed", "Verified", "Notes"].map((h) => <TableCell key={h} sx={{ fontWeight: 850 }}>{h}</TableCell>)}</TableRow></TableHead>
                  <TableBody>
                    {backups.items.map((b) => (
                      <TableRow key={b.id} hover>
                        <TableCell sx={{ fontWeight: 800 }}>{b.name}</TableCell><TableCell>{b.type}</TableCell><TableCell><SevChip severity={b.status} /></TableCell><TableCell>{b.source}</TableCell><TableCell>{fmtBytes(b.size_bytes)}</TableCell><TableCell>{fmtDate(b.completed_at)}</TableCell><TableCell>{fmtDate(b.verified_at)}</TableCell><TableCell sx={{ fontSize: "0.76rem", maxWidth: 280 }}>{b.notes || b.path || "—"}</TableCell>
                      </TableRow>
                    ))}
                    {backups.items.length === 0 ? <TableRow><TableCell colSpan={8} sx={{ py: 5, textAlign: "center", color: "var(--muted-foreground)" }}>No backup records yet. Record manual/integrated backup events to monitor them here.</TableCell></TableRow> : null}
                  </TableBody>
                </Table>
              </Box>
              <Box sx={{ p: 1.25, pt: 1, borderTop: "1px solid var(--border)" }}>
                {backups.summary?.stale ? <Alert severity="warning" sx={{ borderRadius: "12px", mb: 1 }}>No recent successful backup detected. Last success: {fmtDate(backups.summary?.last_success_at)}.</Alert> : null}
                {backups.summary?.automated_verification === false ? <Alert severity="info" sx={{ borderRadius: "12px" }}>{backups.summary?.note || "Automated backup verification is not instrumented."}</Alert> : null}
              </Box>
            </Box>
          )}
        </Paper>
      )}

      <Dialog
        open={maintenanceDialog}
        onClose={saving ? undefined : () => setMaintenanceDialog(false)}
        fullScreen={fullScreenDialog}
        fullWidth
        maxWidth="sm"
        slots={{ transition: reducedMotion || fullScreenDialog ? Fade : Grow }}
        slotProps={{ transition: reducedMotion ? { timeout: 1 } : { timeout: 360 } }}
        PaperProps={{ sx: dialogPaperSx }}
      >
        <DialogTitle sx={{ fontWeight: 900, pb: 1 }}>Platform maintenance mode</DialogTitle>
        <DialogContent dividers sx={{ pt: 2, overflowX: "hidden" }}>
          <motion.div key={shakeMaintenance} animate={reducedMotion || shakeMaintenance === 0 ? { x: 0 } : shakeKeyframes} transition={shakeTransition}>
            <Alert severity={maintenanceForm.enabled ? "warning" : "info"} sx={{ mb: 2, borderRadius: "12px" }}>When enabled, public/business flows should be blocked with a clear maintenance notice. Super admin access can remain allowed.</Alert>
            <Stack spacing={1.5}>
              <TextField select label="Maintenance mode" value={maintenanceForm.enabled ? "on" : "off"} onChange={(e) => setMaintenanceForm((f) => ({ ...f, enabled: e.target.value === "on" }))} fullWidth><MenuItem value="off">Off</MenuItem><MenuItem value="on">On</MenuItem></TextField>
              <TextField label="User-facing message" value={maintenanceForm.message} onChange={(e) => setMaintenanceForm((f) => ({ ...f, message: e.target.value }))} fullWidth multiline minRows={3} />
              <TextField select label="Allow super admin during maintenance" value={maintenanceForm.allow_super_admin ? "yes" : "no"} onChange={(e) => setMaintenanceForm((f) => ({ ...f, allow_super_admin: e.target.value === "yes" }))} fullWidth><MenuItem value="yes">Yes</MenuItem><MenuItem value="no">No</MenuItem></TextField>
            </Stack>
          </motion.div>
        </DialogContent>
        <DialogActions sx={{ px: { xs: 2, sm: 3 }, py: 1.5 }}><MotionButton whileTap={reducedMotion ? undefined : { scale: 0.98 }} transition={spring.press} onClick={() => setMaintenanceDialog(false)} disabled={saving} sx={{ textTransform: "none", fontWeight: 700, borderRadius: "10px" }}>Cancel</MotionButton><MotionButton whileTap={reducedMotion ? undefined : { scale: 0.98 }} transition={spring.press} variant="contained" onClick={saveMaintenance} disabled={saving} sx={{ fontWeight: 800, textTransform: "none", borderRadius: "10px" }}>{saving ? "Saving..." : "Save"}</MotionButton></DialogActions>
      </Dialog>

      <Dialog
        open={backupDialog}
        onClose={saving ? undefined : () => setBackupDialog(false)}
        fullScreen={fullScreenDialog}
        fullWidth
        maxWidth="sm"
        slots={{ transition: reducedMotion || fullScreenDialog ? Fade : Grow }}
        slotProps={{ transition: reducedMotion ? { timeout: 1 } : { timeout: 360 } }}
        PaperProps={{ sx: dialogPaperSx }}
      >
        <DialogTitle sx={{ fontWeight: 900, pb: 1 }}>Record backup event</DialogTitle>
        <DialogContent dividers sx={{ pt: 2, overflowX: "hidden" }}>
          <motion.div key={shakeBackup} animate={reducedMotion || shakeBackup === 0 ? { x: 0 } : shakeKeyframes} transition={shakeTransition}>
            <Alert severity="info" sx={{ mb: 2, borderRadius: "12px" }}>Records backup metadata/status for monitoring. Automated execution/verification is disclosed as not fully instrumented unless integrated.</Alert>
            <Stack spacing={1.5}>
              <TextField label="Name" value={backupForm.name} onChange={(e) => setBackupForm((f) => ({ ...f, name: e.target.value }))} fullWidth placeholder="e.g. Nightly DB backup" />
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                <TextField label="Type" value={backupForm.type} onChange={(e) => setBackupForm((f) => ({ ...f, type: e.target.value }))} fullWidth />
                <TextField select label="Status" value={backupForm.status} onChange={(e) => setBackupForm((f) => ({ ...f, status: e.target.value }))} fullWidth>{["recorded", "running", "success", "failed", "verified"].map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}</TextField>
              </Stack>
              <TextField label="Source" value={backupForm.source} onChange={(e) => setBackupForm((f) => ({ ...f, source: e.target.value }))} fullWidth />
              <TextField label="Path (optional)" value={backupForm.path} onChange={(e) => setBackupForm((f) => ({ ...f, path: e.target.value }))} fullWidth />
              <TextField label="Notes" value={backupForm.notes} onChange={(e) => setBackupForm((f) => ({ ...f, notes: e.target.value }))} fullWidth multiline minRows={2} />
            </Stack>
          </motion.div>
        </DialogContent>
        <DialogActions sx={{ px: { xs: 2, sm: 3 }, py: 1.5 }}><MotionButton whileTap={reducedMotion ? undefined : { scale: 0.98 }} transition={spring.press} onClick={() => setBackupDialog(false)} disabled={saving} sx={{ textTransform: "none", fontWeight: 700, borderRadius: "10px" }}>Cancel</MotionButton><MotionButton whileTap={reducedMotion ? undefined : { scale: 0.98 }} transition={spring.press} variant="contained" onClick={saveBackup} disabled={saving} sx={{ fontWeight: 800, textTransform: "none", borderRadius: "10px" }}>{saving ? "Saving..." : "Record"}</MotionButton></DialogActions>
      </Dialog>
    </Box>
  );
}
