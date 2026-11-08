"use client";

import * as React from "react";
import {
  Box, Button, Chip, IconButton, MenuItem, Paper, Skeleton, Stack, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography,
} from "@mui/material";
import { motion } from "motion/react";
import RefreshIcon from "@mui/icons-material/Refresh";
import DoneAllRoundedIcon from "@mui/icons-material/DoneAllRounded";
import NotificationsNoneRoundedIcon from "@mui/icons-material/NotificationsNoneRounded";
import {
  getSuperAdminNotifications, markSuperAdminNotificationsRead, type SuperAdminNotificationItem,
} from "@/lib/api";
import { useAppSnackbar } from "@/components/common/SnackBar";
import { safeError } from "@/lib/safeError";
import { spring, useReducedMotion } from "@/lib/motion";

const MotionButton = motion.create(Button);

const fmtDate = (v?: string | null) => (v ? new Date(v).toLocaleString([], { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—");

function SevChip({ severity }: { severity: string }) {
  const s = (severity || "").toLowerCase();
  const tone = s === "critical" ? ["#991b1b", "#fee2e2"] : s === "warning" ? ["#92400e", "#fef3c7"] : ["#1d4ed8", "#dbeafe"];
  return <Chip size="small" label={severity} sx={{ height: 24, fontWeight: 800, fontSize: "0.72rem", color: tone[0], backgroundColor: tone[1], textTransform: "capitalize" }} />;
}

export default function SuperAdminNotificationsPage() {
  const reducedMotion = useReducedMotion();
  const [loading, setLoading] = React.useState(true);
  const [items, setItems] = React.useState<SuperAdminNotificationItem[]>([]);
  const [counts, setCounts] = React.useState<any>({});
  const [unreadOnly, setUnreadOnly] = React.useState("all");
  const [severity, setSeverity] = React.useState("all");
  const [saving, setSaving] = React.useState(false);
  const { showSnackbar } = useAppSnackbar();

  const load = React.useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const params: any = {};
      if (unreadOnly === "unread") params.unread = "1";
      if (severity !== "all") params.severity = severity;
      const data = await getSuperAdminNotifications(params);
      setItems(data.items ?? []);
      setCounts(data.counts ?? {});
    } catch (e) {
      showSnackbar(safeError(e, "Failed to load notifications."), "error");
    } finally {
      setLoading(false);
    }
  }, [showSnackbar, unreadOnly, severity]);

  React.useEffect(() => { void load(); }, [load]);

  const markAllRead = async () => {
    setSaving(true);
    try {
      await markSuperAdminNotificationsRead([]);
      showSnackbar("Notifications marked as read.", "success");
      await load(true);
    } catch (e) { showSnackbar(safeError(e, "Failed to update notifications."), "error"); } finally { setSaving(false); }
  };

  const markOneRead = async (id: number) => {
    try {
      await markSuperAdminNotificationsRead([id]);
      await load(true);
    } catch (e) { showSnackbar(safeError(e, "Failed to mark notification as read."), "error"); }
  };

  return (
    <Box sx={{ display: "grid", gap: 2, minWidth: 0 }}>
      <Paper elevation={0} sx={{ p: { xs: 1.75, md: 2.5 }, borderRadius: "22px", border: "1px solid var(--border)", backgroundColor: "var(--card)", boxShadow: "0 16px 40px rgba(31, 42, 43, 0.08)" }}>
        <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" spacing={1.5} alignItems={{ xs: "stretch", sm: "center" }}>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Box sx={{ width: 44, height: 44, borderRadius: "14px", display: "grid", placeItems: "center", color: "var(--chart-1)", backgroundColor: "color-mix(in srgb, var(--chart-1) 16%, transparent)", border: "1px solid color-mix(in srgb, var(--chart-1) 34%, transparent)" }}><NotificationsNoneRoundedIcon /></Box>
            <Box>
              <Typography sx={{ fontSize: { xs: "1.25rem", md: "1.5rem" }, fontWeight: 900, lineHeight: 1.1 }}>Notifications</Typography>
              <Typography sx={{ color: "var(--muted-foreground)", fontWeight: 650, fontSize: "0.85rem" }}>System alerts for payments, subscriptions, quotas, backups, and operational events</Typography>
            </Box>
          </Stack>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ width: { xs: "100%", sm: "auto" } }}>
            <MotionButton whileTap={reducedMotion ? undefined : { scale: 0.98 }} transition={spring.press} variant="outlined" startIcon={<RefreshIcon />} onClick={() => void load(true)} sx={{ borderRadius: "12px", textTransform: "none", fontWeight: 800, flex: { xs: "1 1 auto", sm: "0 0 auto" } }}>Refresh</MotionButton>
            <MotionButton whileTap={reducedMotion ? undefined : { scale: 0.98 }} transition={spring.press} variant="contained" startIcon={<DoneAllRoundedIcon />} onClick={markAllRead} disabled={saving} sx={{ borderRadius: "12px", textTransform: "none", fontWeight: 800, flex: { xs: "1 1 auto", sm: "0 0 auto" } }}>Mark all read</MotionButton>
          </Stack>
        </Stack>
        <Stack direction="row" spacing={1.25} sx={{ mt: 2 }} flexWrap="wrap" useFlexGap>
          {[{ label: "Total", value: counts.total ?? 0 }, { label: "Unread", value: counts.unread ?? 0 }, { label: "Critical unread", value: counts.critical ?? 0 }].map((k) => (
            <Paper key={k.label} elevation={0} sx={{ px: 1.5, py: 1, borderRadius: "14px", border: "1px solid var(--border)", backgroundColor: "var(--background)" }}>
              <Typography component="span" sx={{ fontSize: "0.72rem", fontWeight: 850, color: "var(--muted-foreground)", mr: 1 }}>{k.label}</Typography>
              <Typography component="span" sx={{ fontWeight: 900 }}>{k.value}</Typography>
            </Paper>
          ))}
          <TextField select size="small" label="Status" value={unreadOnly} onChange={(e) => setUnreadOnly(e.target.value)} sx={{ minWidth: 140 }}>
            <MenuItem value="all">All</MenuItem><MenuItem value="unread">Unread only</MenuItem>
          </TextField>
          <TextField select size="small" label="Severity" value={severity} onChange={(e) => setSeverity(e.target.value)} sx={{ minWidth: 150 }}>
            <MenuItem value="all">All severities</MenuItem><MenuItem value="info">Info</MenuItem><MenuItem value="warning">Warning</MenuItem><MenuItem value="critical">Critical</MenuItem>
          </TextField>
        </Stack>
      </Paper>

      {loading ? <Skeleton variant="rounded" height={220} sx={{ borderRadius: "22px" }} /> : (
        <Paper elevation={0} sx={{ borderRadius: "22px", border: "1px solid var(--border)", backgroundColor: "var(--card)", overflow: "hidden" }}>
          <Box sx={{ overflowX: "auto" }}>
            <Table size="small">
              <TableHead><TableRow>{["Severity", "Title / Message", "Business", "Type", "Created", "Status", "Action"].map((h) => <TableCell key={h} sx={{ fontWeight: 850 }}>{h}</TableCell>)}</TableRow></TableHead>
              <TableBody>
                {items.map((n) => (
                  <TableRow
                    key={n.id}
                    component={motion.tr}
                    initial={reducedMotion ? false : { opacity: 0.72 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.22 }}
                    hover
                    sx={!n.is_read ? { backgroundColor: "rgba(59,130,246,0.04)" } : undefined}
                  >
                    <TableCell><SevChip severity={n.severity} /></TableCell>
                    <TableCell sx={{ minWidth: 320 }}>
                      <Typography sx={{ fontWeight: n.is_read ? 750 : 900, fontSize: "0.88rem" }}>{n.title}</Typography>
                      <Typography sx={{ fontSize: "0.78rem", color: "var(--muted-foreground)" }}>{n.message}</Typography>
                    </TableCell>
                    <TableCell>{n.business?.name ?? (n.business_id ? `#${n.business_id}` : "Platform")}</TableCell>
                    <TableCell sx={{ fontSize: "0.78rem", textTransform: "capitalize" }}>{(n.type || "").replace(/_/g, " ")}</TableCell>
                    <TableCell sx={{ fontSize: "0.78rem", whiteSpace: "nowrap" }}>{fmtDate(n.created_at)}</TableCell>
                    <TableCell>{n.is_read ? <Chip size="small" label="Read" sx={{ height: 22, fontWeight: 800 }} /> : <Chip size="small" label="Unread" color="primary" sx={{ height: 22, fontWeight: 800 }} />}</TableCell>
                    <TableCell>{!n.is_read ? <MotionButton whileTap={reducedMotion ? undefined : { scale: 0.98 }} transition={spring.press} size="small" onClick={() => void markOneRead(n.id)} sx={{ textTransform: "none", fontWeight: 800 }}>Mark read</MotionButton> : "—"}</TableCell>
                  </TableRow>
                ))}
                {items.length === 0 ? <TableRow><TableCell colSpan={7} sx={{ py: 6, textAlign: "center", color: "var(--muted-foreground)" }}>No notifications for the selected filters.</TableCell></TableRow> : null}
              </TableBody>
            </Table>
          </Box>
        </Paper>
      )}
    </Box>
  );
}
