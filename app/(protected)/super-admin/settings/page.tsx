"use client";

import * as React from "react";
import {
  Alert, Box, Button, Chip, Divider, MenuItem, Paper, Skeleton, Stack, TextField, Typography,
} from "@mui/material";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import RefreshIcon from "@mui/icons-material/Refresh";
import { getSuperAdminOperations, setSuperAdminMaintenance } from "@/lib/api";
import { useAppSnackbar } from "@/components/common/SnackBar";
import { safeError } from "@/lib/safeError";

export default function SuperAdminSettingsPage() {
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [ops, setOps] = React.useState<any>(null);
  const [maintenance, setMaintenance] = React.useState({ enabled: false, message: "The platform is temporarily under maintenance. Please try again later.", allow_super_admin: true });
  const { showSnackbar } = useAppSnackbar();

  const load = React.useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const data = await getSuperAdminOperations();
      setOps(data);
      const m = data?.health?.maintenance ?? data?.settings?.maintenance_mode ?? {};
      setMaintenance({
        enabled: !!m.enabled,
        message: m.message || "The platform is temporarily under maintenance. Please try again later.",
        allow_super_admin: m.allow_super_admin !== false,
      });
    } catch (e) {
      showSnackbar(safeError(e, "Failed to load settings."), "error");
    } finally {
      setLoading(false);
    }
  }, [showSnackbar]);

  React.useEffect(() => { void load(); }, [load]);

  const save = async () => {
    setSaving(true);
    try {
      await setSuperAdminMaintenance(maintenance);
      showSnackbar("Platform settings saved.", "success");
      await load(true);
    } catch (e) { showSnackbar(safeError(e, "Failed to save settings."), "error"); } finally { setSaving(false); }
  };

  return (
    <Box sx={{ display: "grid", gap: 2, minWidth: 0 }}>
      <Paper elevation={0} sx={{ p: { xs: 1.75, md: 2.5 }, borderRadius: "22px", border: "1px solid var(--border)", backgroundColor: "var(--card)", boxShadow: "0 16px 40px rgba(31, 42, 43, 0.08)" }}>
        <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" spacing={1.5} alignItems={{ xs: "stretch", sm: "center" }}>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Box sx={{ width: 44, height: 44, borderRadius: "14px", display: "grid", placeItems: "center", color: "var(--chart-1)", backgroundColor: "color-mix(in srgb, var(--chart-1) 16%, transparent)", border: "1px solid color-mix(in srgb, var(--chart-1) 34%, transparent)" }}><SettingsOutlinedIcon /></Box>
            <Box>
              <Typography sx={{ fontSize: { xs: "1.25rem", md: "1.5rem" }, fontWeight: 900, lineHeight: 1.1 }}>Settings</Typography>
              <Typography sx={{ color: "var(--muted-foreground)", fontWeight: 650, fontSize: "0.85rem" }}>Platform controls and operational settings (server-enforced where applicable)</Typography>
            </Box>
          </Stack>
          <Button variant="outlined" startIcon={<RefreshIcon />} onClick={() => void load(true)} sx={{ borderRadius: "12px", textTransform: "none", fontWeight: 800 }}>Refresh</Button>
        </Stack>
      </Paper>

      {loading ? <Skeleton variant="rounded" height={180} sx={{ borderRadius: "22px" }} /> : (
        <Paper elevation={0} sx={{ p: { xs: 1.75, md: 2.25 }, borderRadius: "22px", border: "1px solid var(--border)", backgroundColor: "var(--card)" }}>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
            <Typography sx={{ fontWeight: 900, fontSize: "1.05rem" }}>Maintenance mode</Typography>
            <Chip size="small" label={maintenance.enabled ? "Enabled" : "Disabled"} sx={{ fontWeight: 800, color: maintenance.enabled ? "#92400e" : "#166534", backgroundColor: maintenance.enabled ? "#fef3c7" : "#dcfce7" }} />
          </Stack>
          <Alert severity={maintenance.enabled ? "warning" : "info"} sx={{ mb: 2, borderRadius: "12px" }}>
            Maintenance mode is a platform control. Public/business access is blocked with a clear notice when enforcement is active; super admins can retain access based on policy. Changes are audited.
          </Alert>
          <Stack spacing={1.5} sx={{ maxWidth: 720 }}>
            <TextField select label="Maintenance mode" value={maintenance.enabled ? "on" : "off"} onChange={(e) => setMaintenance((f) => ({ ...f, enabled: e.target.value === "on" }))} fullWidth>
              <MenuItem value="off">Off — normal operations</MenuItem>
              <MenuItem value="on">On — show maintenance notice / restrict access</MenuItem>
            </TextField>
            <TextField label="User-facing maintenance message" value={maintenance.message} onChange={(e) => setMaintenance((f) => ({ ...f, message: e.target.value }))} fullWidth multiline minRows={3} />
            <TextField select label="Allow super admin during maintenance" value={maintenance.allow_super_admin ? "yes" : "no"} onChange={(e) => setMaintenance((f) => ({ ...f, allow_super_admin: e.target.value === "yes" }))} fullWidth>
              <MenuItem value="yes">Yes (recommended)</MenuItem>
              <MenuItem value="no">No</MenuItem>
            </TextField>
            <Button variant="contained" onClick={save} disabled={saving} sx={{ alignSelf: "flex-start", borderRadius: "12px", textTransform: "none", fontWeight: 800, px: 2.5 }}>
              {saving ? "Saving..." : "Save settings"}
            </Button>
          </Stack>
          <Divider sx={{ my: 2.5 }} />
          <Typography sx={{ fontWeight: 900, mb: 0.75 }}>Operational status snapshot</Typography>
          <Typography sx={{ fontSize: "0.85rem", color: "var(--muted-foreground)" }}>
            Database: <strong>{ops?.health?.database?.ok ? "connected" : "issue"}</strong> · Queue failed jobs: <strong>{ops?.health?.queue?.failed_jobs ?? 0}</strong> · Cache: <strong>{ops?.health?.cache?.driver ?? "—"}</strong>
          </Typography>
          <Typography sx={{ fontSize: "0.78rem", color: "var(--muted-foreground)", mt: 1 }}>
            Additional platform settings can be added here as backend support is introduced. Usage/backup/notification controls are available in their dedicated modules.
          </Typography>
        </Paper>
      )}
    </Box>
  );
}
