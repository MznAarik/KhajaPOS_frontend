"use client";

import * as React from "react";
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

  FormControl,
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
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import TuneRoundedIcon from "@mui/icons-material/TuneRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import { useAppSnackbar } from "@/components/common/SnackBar";
import { useAuth } from "@/lib/auth-context";
import {
  createStaffMember,
  getStaffMembers,
  getStaffPermissionsCatalog,
  removeStaffMember,
  updateStaffMember,
  updateStaffMemberPermissions,
  type StaffMember,
  type StaffPermissionOverride,
  type StaffPermissionsCatalog,
} from "@/lib/api";
import { safeError } from "@/lib/safeError";

const ROLE_LABELS: Record<string, string> = {
  manager: "Manager",
  cashier: "Cashier",
  kitchen_staff: "Kitchen staff",
};

type StaffFormState = {
  name: string;
  email: string;
  password: string;
  role: string;
  status: string;
};

const emptyCreateForm = (): StaffFormState => ({
  name: "",
  email: "",
  password: "",
  role: "cashier",
  status: "active",
});

type OverrideMode = "default" | "grant" | "deny";

export default function BusinessAdminStaffPage() {
  const { role: myRole, hasPermission } = useAuth();
  const { showSnackbar } = useAppSnackbar();
  const isOwnerAdmin = myRole === "admin";
  const canManageStaff = isOwnerAdmin || hasPermission("staff.manage") || myRole === "manager";

  const [loading, setLoading] = React.useState(true);
  const [members, setMembers] = React.useState<StaffMember[]>([]);
  const [catalog, setCatalog] = React.useState<StaffPermissionsCatalog | null>(null);

  const [createOpen, setCreateOpen] = React.useState(false);
  const [createForm, setCreateForm] = React.useState<StaffFormState>(emptyCreateForm());
  const [createSubmitting, setCreateSubmitting] = React.useState(false);

  const [editOpen, setEditOpen] = React.useState(false);
  const [editMember, setEditMember] = React.useState<StaffMember | null>(null);
  const [editForm, setEditForm] = React.useState<{ name: string; role: string; status: string }>({ name: "", role: "cashier", status: "active" });
  const [editSubmitting, setEditSubmitting] = React.useState(false);

  const [permOpen, setPermOpen] = React.useState(false);
  const [permMember, setPermMember] = React.useState<StaffMember | null>(null);
  const [permModes, setPermModes] = React.useState<Record<string, OverrideMode>>({});
  const [permSubmitting, setPermSubmitting] = React.useState(false);

  const loadData = React.useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const [m, c] = await Promise.all([getStaffMembers(), getStaffPermissionsCatalog()]);
      setMembers(Array.isArray(m) ? m : []);
      setCatalog(c ?? null);
    } catch (error) {
      showSnackbar(safeError(error, "Failed to load staff data"), "error");
    } finally {
      if (!quiet) setLoading(false);
    }
  }, [showSnackbar]);

  React.useEffect(() => {
    const t = setTimeout(() => { void loadData(); }, 0);
    return () => clearTimeout(t);
  }, [loadData]);

  const staffRoles = catalog?.staff_roles?.length ? catalog.staff_roles : ["manager", "cashier", "kitchen_staff"];

  const openCreate = () => {
    setCreateForm(emptyCreateForm());
    setCreateOpen(true);
  };

  const submitCreate = async () => {
    if (!createForm.name.trim() || !createForm.email.trim() || !createForm.password) {
      showSnackbar("Name, email, and password are required.", "warning");
      return;
    }
    if (createForm.password.length < 8) {
      showSnackbar("Password must be at least 8 characters.", "warning");
      return;
    }
    setCreateSubmitting(true);
    try {
      await createStaffMember({
        name: createForm.name.trim(),
        email: createForm.email.trim(),
        password: createForm.password,
        role: createForm.role,
        status: createForm.status,
      });
      showSnackbar("Staff member created.", "success");
      setCreateOpen(false);
      await loadData(true);
    } catch (error) {
      showSnackbar(safeError(error, "Failed to create staff member"), "error");
    } finally {
      setCreateSubmitting(false);
    }
  };

  const openEdit = (member: StaffMember) => {
    setEditMember(member);
    setEditForm({
      name: member.user?.name ?? "",
      role: member.role ?? "cashier",
      status: member.status ?? "active",
    });
    setEditOpen(true);
  };

  const submitEdit = async () => {
    if (!editMember) return;
    setEditSubmitting(true);
    try {
      await updateStaffMember(editMember.id, {
        name: editForm.name.trim() || undefined,
        role: editForm.role,
        status: editForm.status,
      });
      showSnackbar("Staff member updated.", "success");
      setEditOpen(false);
      await loadData(true);
    } catch (error) {
      showSnackbar(safeError(error, "Failed to update staff member"), "error");
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleRemove = async (member: StaffMember) => {
    if (!window.confirm(`Remove ${member.user?.name || member.user?.email || "this staff member"} from the business?`)) return;
    try {
      await removeStaffMember(member.id);
      showSnackbar("Staff member removed.", "success");
      await loadData(true);
    } catch (error) {
      showSnackbar(safeError(error, "Failed to remove staff member"), "error");
    }
  };

  const openPermissions = (member: StaffMember) => {
    const modes: Record<string, OverrideMode> = {};
    const overrides = member.permission_overrides || [];
    for (const ov of overrides) {
      modes[ov.permission_key] = ov.is_granted ? "grant" : "deny";
    }
    setPermMember(member);
    setPermModes(modes);
    setPermOpen(true);
  };

  const cyclePermMode = (key: string) => {
    setPermModes((prev) => {
      const current = prev[key] ?? "default";
      const next: OverrideMode = current === "default" ? "grant" : current === "grant" ? "deny" : "default";
      const copy = { ...prev };
      if (next === "default") delete copy[key];
      else copy[key] = next;
      return copy;
    });
  };

  const submitPermissions = async () => {
    if (!permMember) return;
    const overrides: StaffPermissionOverride[] = Object.entries(permModes).map(([permission_key, mode]) => ({
      permission_key,
      is_granted: mode === "grant",
    }));
    setPermSubmitting(true);
    try {
      await updateStaffMemberPermissions(permMember.id, overrides);
      showSnackbar("Permission overrides updated.", "success");
      setPermOpen(false);
      await loadData(true);
    } catch (error) {
      showSnackbar(safeError(error, "Failed to update permissions"), "error");
    } finally {
      setPermSubmitting(false);
    }
  };

  const roleDefaultHas = (role: string, key: string) => {
    const defaults = catalog?.role_defaults?.[role] || [];
    return defaults.includes(key);
  };

  const groupedPermissions = React.useMemo(() => {
    const perms = catalog?.permissions || [];
    const groups: Record<string, typeof perms> = {};
    for (const p of perms) {
      const g = (p.group || "other").toString();
      if (!groups[g]) groups[g] = [];
      groups[g].push(p);
    }
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [catalog]);

  if (loading) {
    return (
      <Box sx={{ display: "grid", placeItems: "center", minHeight: "50vh" }}>
        <CircularProgress sx={{ color: "var(--primary)" }} />
      </Box>
    );
  }

  return (
    <Box sx={{ display: "grid", gap: 2.5 }}>
      <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ xs: "flex-start", sm: "center" }} spacing={1.5}>
        <Stack spacing={0.75}>
          <Typography sx={{ fontWeight: 900, fontSize: "1.35rem" }}>Staff & Access</Typography>
          <Typography sx={{ color: "var(--muted-foreground)" }}>
            Manage staff accounts for your restaurant and control access with roles and permission overrides. Actions are scoped to your business and enforced server-side.
          </Typography>
        </Stack>
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" startIcon={<RefreshRoundedIcon />} onClick={() => void loadData(true)} sx={{ borderRadius: "12px", textTransform: "none" }}>
            Refresh
          </Button>
          {canManageStaff ? (
            <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={openCreate} sx={{ borderRadius: "12px", textTransform: "none", fontWeight: 700 }}>
              Add staff
            </Button>
          ) : null}
        </Stack>
      </Stack>

      {!isOwnerAdmin ? (
        <Alert severity="info" sx={{ borderRadius: "12px" }}>
          Staff management actions are available based on your role and delegated permissions. Server-side checks apply to every change.
        </Alert>
      ) : null}

      <Paper sx={{ p: { xs: 2, md: 3 }, borderRadius: "22px", border: "1px solid var(--border)", backgroundColor: "var(--card)" }}>
        {members.length === 0 ? (
          <Typography sx={{ color: "var(--muted-foreground)" }}>No staff members yet.</Typography>
        ) : (
          <Box sx={{ overflowX: "auto" }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 800 }}>Staff member</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Role</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Overrides</TableCell>
                  <TableCell sx={{ fontWeight: 800 }} align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {members.map((member) => (
                  <TableRow key={member.id} hover>
                    <TableCell>
                      <Typography sx={{ fontWeight: 700 }}>{member.user?.name || "—"}</Typography>
                      <Typography sx={{ fontSize: "0.82rem", color: "var(--muted-foreground)" }}>{member.user?.email || "—"}</Typography>
                    </TableCell>
                    <TableCell>
                      <Chip size="small" label={ROLE_LABELS[member.role] || member.role} variant="outlined" sx={{ fontWeight: 700 }} />
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={0.75} alignItems="center">
                        <Chip
                          size="small"
                          label={String(member.status || "unknown")}
                          color={member.status === "active" && member.user?.is_active !== false ? "success" : "default"}
                          variant={member.status === "active" ? "filled" : "outlined"}
                          sx={{ textTransform: "capitalize", fontWeight: 700 }}
                        />
                        {member.user?.email_verified_at ? <Chip size="small" label="Verified" variant="outlined" /> : <Chip size="small" label="Unverified" color="warning" variant="outlined" />}
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Typography sx={{ fontWeight: 700 }}>{member.permission_overrides?.length ?? 0}</Typography>
                      <Typography sx={{ fontSize: "0.78rem", color: "var(--muted-foreground)" }}>custom rules</Typography>
                    </TableCell>
                    <TableCell align="right">
                      {canManageStaff ? (
                        <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                          <Button size="small" startIcon={<EditOutlinedIcon fontSize="small" />} onClick={() => openEdit(member)} sx={{ textTransform: "none" }}>Edit</Button>
                          <Button size="small" startIcon={<TuneRoundedIcon fontSize="small" />} onClick={() => openPermissions(member)} sx={{ textTransform: "none" }}>Permissions</Button>
                          <Button size="small" color="error" startIcon={<DeleteOutlineRoundedIcon fontSize="small" />} onClick={() => void handleRemove(member)} sx={{ textTransform: "none" }}>Remove</Button>
                        </Stack>
                      ) : (
                        <Typography sx={{ fontSize: "0.8rem", color: "var(--muted-foreground)" }}>View only</Typography>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        )}
      </Paper>

      <Dialog open={createOpen} onClose={() => !createSubmitting && setCreateOpen(false)} fullWidth maxWidth="sm" PaperProps={{ sx: { borderRadius: "18px" } }}>
        <DialogTitle sx={{ fontWeight: 800 }}>Add staff member</DialogTitle>
        <DialogContent>
          <Stack spacing={1.5} sx={{ pt: 1 }}>
            <Alert severity="info" sx={{ borderRadius: "12px" }}>
              This creates a staff login for your business. Share the credentials securely with the staff member.
            </Alert>
            <TextField label="Name" value={createForm.name} onChange={(e) => setCreateForm((p) => ({ ...p, name: e.target.value }))} fullWidth size="small" autoComplete="off" />
            <TextField label="Email" type="email" value={createForm.email} onChange={(e) => setCreateForm((p) => ({ ...p, email: e.target.value }))} fullWidth size="small" autoComplete="off" />
            <TextField label="Temporary password" type="password" value={createForm.password} onChange={(e) => setCreateForm((p) => ({ ...p, password: e.target.value }))} fullWidth size="small" helperText="Minimum 8 characters." autoComplete="new-password" />
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
              <FormControl fullWidth size="small">
                <InputLabel id="staff-role-label">Role</InputLabel>
                <Select labelId="staff-role-label" label="Role" value={createForm.role} onChange={(e) => setCreateForm((p) => ({ ...p, role: e.target.value }))}>
                  {staffRoles.map((r) => <MenuItem key={r} value={r}>{ROLE_LABELS[r] || r}</MenuItem>)}
                </Select>
              </FormControl>
              <FormControl fullWidth size="small">
                <InputLabel id="staff-status-label">Status</InputLabel>
                <Select labelId="staff-status-label" label="Status" value={createForm.status} onChange={(e) => setCreateForm((p) => ({ ...p, status: e.target.value }))}>
                  <MenuItem value="active">Active</MenuItem>
                  <MenuItem value="inactive">Inactive</MenuItem>
                  <MenuItem value="suspended">Suspended</MenuItem>
                </Select>
              </FormControl>
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setCreateOpen(false)} disabled={createSubmitting} sx={{ textTransform: "none" }}>Cancel</Button>
          <Button variant="contained" onClick={() => void submitCreate()} disabled={createSubmitting} sx={{ textTransform: "none", fontWeight: 700 }}>
            {createSubmitting ? "Creating…" : "Create staff"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={editOpen} onClose={() => !editSubmitting && setEditOpen(false)} fullWidth maxWidth="sm" PaperProps={{ sx: { borderRadius: "18px" } }}>
        <DialogTitle sx={{ fontWeight: 800 }}>Edit staff member</DialogTitle>
        <DialogContent>
          <Stack spacing={1.5} sx={{ pt: 1 }}>
            <TextField label="Name" value={editForm.name} onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))} fullWidth size="small" />
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
              <FormControl fullWidth size="small">
                <InputLabel id="edit-staff-role-label">Role</InputLabel>
                <Select labelId="edit-staff-role-label" label="Role" value={editForm.role} onChange={(e) => setEditForm((p) => ({ ...p, role: e.target.value }))}>
                  {staffRoles.map((r) => <MenuItem key={r} value={r}>{ROLE_LABELS[r] || r}</MenuItem>)}
                </Select>
              </FormControl>
              <FormControl fullWidth size="small">
                <InputLabel id="edit-staff-status-label">Status</InputLabel>
                <Select labelId="edit-staff-status-label" label="Status" value={editForm.status} onChange={(e) => setEditForm((p) => ({ ...p, status: e.target.value }))}>
                  <MenuItem value="active">Active</MenuItem>
                  <MenuItem value="inactive">Inactive</MenuItem>
                  <MenuItem value="suspended">Suspended</MenuItem>
                  <MenuItem value="invited">Invited</MenuItem>
                </Select>
              </FormControl>
            </Stack>
            <Typography sx={{ fontSize: "0.85rem", color: "var(--muted-foreground)" }}>
              Email: {editMember?.user?.email || "—"} (email changes are not managed here)
            </Typography>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setEditOpen(false)} disabled={editSubmitting} sx={{ textTransform: "none" }}>Cancel</Button>
          <Button variant="contained" onClick={() => void submitEdit()} disabled={editSubmitting} sx={{ textTransform: "none", fontWeight: 700 }}>
            {editSubmitting ? "Saving…" : "Save changes"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={permOpen} onClose={() => !permSubmitting && setPermOpen(false)} fullWidth maxWidth="md" PaperProps={{ sx: { borderRadius: "18px" } }}>
        <DialogTitle sx={{ fontWeight: 800 }}>
          Permission overrides
          {permMember?.user?.name ? ` · ${permMember.user.name}` : ""}
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            <Alert severity="info" sx={{ borderRadius: "12px" }}>
              Click a permission to cycle: <strong>Default</strong> → <strong>Grant</strong> → <strong>Deny</strong> → Default. Overrides take precedence over role defaults and are enforced server-side.
            </Alert>
            {groupedPermissions.length === 0 ? (
              <Typography sx={{ color: "var(--muted-foreground)" }}>No permissions available.</Typography>
            ) : groupedPermissions.map(([group, perms]) => (
              <Box key={group}>
                <Typography sx={{ fontWeight: 800, textTransform: "capitalize", mb: 1 }}>{group.replace(/_/g, " ")}</Typography>
                <Stack spacing={0.75}>
                  {perms.map((perm) => {
                    const mode = permModes[perm.key] ?? "default";
                    const roleDefault = permMember ? roleDefaultHas(permMember.role, perm.key) : false;
                    const effectiveGranted = mode === "default" ? roleDefault : mode === "grant";
                    return (
                      <Paper
                        key={perm.key}
                        variant="outlined"
                        onClick={() => cyclePermMode(perm.key)}
                        sx={{
                          p: 1.25,
                          borderRadius: "12px",
                          cursor: "pointer",
                          borderColor: mode === "grant" ? "success.main" : mode === "deny" ? "error.main" : "var(--border)",
                          backgroundColor: mode === "default" ? "transparent" : mode === "grant" ? "rgba(46,125,50,0.06)" : "rgba(211,47,47,0.06)",
                        }}
                      >
                        <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ xs: "flex-start", sm: "center" }} spacing={1}>
                          <Box>
                            <Typography sx={{ fontWeight: 700, fontSize: "0.95rem" }}>{perm.name}</Typography>
                            <Typography sx={{ fontSize: "0.8rem", color: "var(--muted-foreground)" }}>{perm.key}{perm.description ? ` · ${perm.description}` : ""}</Typography>
                          </Box>
                          <Stack direction="row" spacing={0.75} alignItems="center" useFlexGap flexWrap="wrap">
                            <Chip size="small" label={roleDefault ? "Role default: allow" : "Role default: deny"} variant="outlined" />
                            <Chip
                              size="small"
                              label={mode === "default" ? "Using default" : mode === "grant" ? "Override: grant" : "Override: deny"}
                              color={mode === "default" ? "default" : mode === "grant" ? "success" : "error"}
                              sx={{ fontWeight: 700 }}
                            />
                            <Chip size="small" label={effectiveGranted ? "Effective: allow" : "Effective: deny"} color={effectiveGranted ? "success" : "default"} variant={effectiveGranted ? "filled" : "outlined"} />
                          </Stack>
                        </Stack>
                      </Paper>
                    );
                  })}
                </Stack>
              </Box>
            ))}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 1.5 }}>
          <Button onClick={() => setPermOpen(false)} disabled={permSubmitting} sx={{ textTransform: "none" }}>Cancel</Button>
          <Button variant="contained" onClick={() => void submitPermissions()} disabled={permSubmitting} sx={{ textTransform: "none", fontWeight: 700 }}>
            {permSubmitting ? "Saving…" : "Save overrides"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
