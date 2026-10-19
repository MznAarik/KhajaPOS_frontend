"use client";

import * as React from "react";
import {
    Avatar,
    Box,
    Button,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Divider,
    IconButton,
    Paper,
    Skeleton,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    TablePagination,
    TextField,
    Typography,
} from "@mui/material";
import AddRounded from "@mui/icons-material/AddRounded";
import EditOutlined from "@mui/icons-material/EditOutlined";
import DeleteOutlineOutlined from "@mui/icons-material/DeleteOutlineOutlined";
import Search from "@mui/icons-material/Search";
import PeopleAltOutlinedIcon from "@mui/icons-material/PeopleAltOutlined";
import {
    createSuperAdminUser,
    deleteSuperAdminUser,
    getSuperAdminUsers,
    updateSuperAdminUser,
    USER_ROLES,
    USER_ROLE_META,
    type SuperAdminUser,
    type SuperAdminUserPayload,
    type UserRole,
} from "@/lib/api";
import { useAppSnackbar } from "@/components/common/SnackBar";
import { safeError } from "@/lib/safeError";

type FilterRole = UserRole | "";

type DialogState = {
    id?: number;
    name: string;
    email: string;
    password: string;
    role: UserRole;
    businessName: string;
    businessType: string;
    businessPhone: string;
    businessEmail: string;
    businessAddress: string;
};

const createInitialState = (): DialogState => ({
    name: "",
    email: "",
    password: "",
    role: "user",
    businessName: "",
    businessType: "Restaurant",
    businessPhone: "",
    businessEmail: "",
    businessAddress: "",
});

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const formatDate = (value: string) =>
    value ? new Date(value).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" }) : "—";

export default function SuperAdminUsersPage() {
    const [users, setUsers] = React.useState<SuperAdminUser[]>([]);
    const [counts, setCounts] = React.useState({ total: 0, super_admin: 0, admin: 0, user: 0 });
    const [loading, setLoading] = React.useState(true);
    const [search, setSearch] = React.useState("");
    const [roleFilter, setRoleFilter] = React.useState<FilterRole>("");
    const [page, setPage] = React.useState(0);
    const [rowsPerPage, setRowsPerPage] = React.useState(10);

    const [dialogOpen, setDialogOpen] = React.useState(false);
    const [dialogState, setDialogState] = React.useState<DialogState>(createInitialState());
    const [selectedUser, setSelectedUser] = React.useState<SuperAdminUser | null>(null);
    const [deleteOpen, setDeleteOpen] = React.useState(false);
    const [saving, setSaving] = React.useState(false);
    const [error, setError] = React.useState("");

    const { showSnackbar } = useAppSnackbar();

    const fetchUsers = React.useCallback(async () => {
        setLoading(true);
        try {
            const data = await getSuperAdminUsers();
            setUsers(data.items);
            setCounts(data.counts);
        } catch (loadError) {
            const message = safeError(loadError, "Unable to load users right now.");
            showSnackbar(message, "error");
        } finally {
            setLoading(false);
        }
    }, [showSnackbar]);

    React.useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    const visibleUsers = React.useMemo(() => {
        const term = search.trim().toLowerCase();

        return users.filter((user) => {
            const matchesRole = roleFilter === "" || user.role === roleFilter;
            const matchesSearch =
                !term ||
                user.name.toLowerCase().includes(term) ||
                user.email.toLowerCase().includes(term) ||
                (user.business?.name ?? "").toLowerCase().includes(term);
            return matchesRole && matchesSearch;
        });
    }, [users, roleFilter, search]);

    const pagedUsers = React.useMemo(() => {
        const start = page * rowsPerPage;
        return visibleUsers.slice(start, start + rowsPerPage);
    }, [page, rowsPerPage, visibleUsers]);

    React.useEffect(() => {
        setPage(0);
    }, [search, roleFilter]);

    const openCreateDialog = () => {
        setDialogState(createInitialState());
        setError("");
        setDialogOpen(true);
    };

    const openEditDialog = (user: SuperAdminUser) => {
        setDialogState({
            id: user.id,
            name: user.name,
            email: user.email,
            password: "",
            role: user.role,
            businessName: user.business?.name ?? "",
            businessType: user.business?.businessType ?? "Restaurant",
            businessPhone: "",
            businessEmail: "",
            businessAddress: "",
        });
        setError("");
        setDialogOpen(true);
    };

    const handleSave = async () => {
        const name = dialogState.name.trim();
        const email = dialogState.email.trim();
        const password = dialogState.password.trim();

        if (!name) {
            setError("Name is required.");
            return;
        }
        if (!EMAIL_PATTERN.test(email)) {
            setError("Enter a valid email address.");
            return;
        }
        if (!dialogState.id && password.length < 8) {
            setError("Password must be at least 8 characters.");
            return;
        }
        if (dialogState.id && password && password.length < 8) {
            setError("Password must be at least 8 characters.");
            return;
        }

        setSaving(true);
        setError("");

        const payload: SuperAdminUserPayload = {
            name,
            email,
            role: dialogState.role,
            ...(password ? { password } : {}),
            ...(dialogState.businessName.trim()
                ? {
                    businessName: dialogState.businessName.trim(),
                    businessType: dialogState.businessType.trim(),
                    businessPhone: dialogState.businessPhone.trim(),
                    businessEmail: dialogState.businessEmail.trim(),
                    businessAddress: dialogState.businessAddress.trim(),
                }
                : {}),
        };

        try {
            if (dialogState.id) {
                await updateSuperAdminUser({ id: dialogState.id, ...payload });
            } else {
                await createSuperAdminUser(payload);
            }
            await fetchUsers();
            setDialogOpen(false);
            setDialogState(createInitialState());
            showSnackbar(
                dialogState.id
                    ? `${name} has been updated successfully.`
                    : `${name} has been created successfully.`,
                "success",
            );
        } catch (saveError) {
            const message = safeError(saveError, "Failed to save user. Please try again.");
            setError(message);
            showSnackbar(message, "error");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!selectedUser) return;
        setSaving(true);
        setError("");
        try {
            await deleteSuperAdminUser(selectedUser.id);
            await fetchUsers();
            setDeleteOpen(false);
            setSelectedUser(null);
            showSnackbar(`${selectedUser.name} has been deleted successfully.`, "success");
        } catch (deleteError) {
            const message = safeError(deleteError, "Failed to delete user. Please try again.");
            setError(message);
            showSnackbar(message, "error");
        } finally {
            setSaving(false);
        }
    };

    const isOwner = dialogState.role === "admin";

    const roleChips: Array<{ key: FilterRole; label: string; count: number }> = [
        { key: "", label: "All", count: counts.total },
        { key: "admin", label: "Owners", count: counts.admin },
        { key: "user", label: "Users", count: counts.user },
        { key: "super_admin", label: "Super Admins", count: counts.super_admin },
    ];

    return (
        <Box sx={{ display: "grid", gap: 2, minWidth: 0 }}>
            <Paper
                elevation={0}
                sx={{
                    p: { xs: 1.75, md: 2.5 },
                    borderRadius: "22px",
                    border: "1px solid var(--border)",
                    backgroundColor: "var(--card)",
                    backgroundImage:
                        "radial-gradient(360px 160px at 90% 0%, color-mix(in srgb, var(--chart-3) 20%, transparent), transparent 65%)",
                    boxShadow: "0 16px 40px rgba(31, 42, 43, 0.08)",
                }}
            >
                <Stack
                    direction={{ xs: "column", sm: "row" }}
                    justifyContent="space-between"
                    alignItems={{ xs: "stretch", sm: "flex-start" }}
                    spacing={1.5}
                >
                    <Stack direction="row" spacing={1.5} alignItems="center" sx={{ minWidth: 0 }}>
                        <Box
                            sx={{
                                width: 44,
                                height: 44,
                                borderRadius: "14px",
                                display: "grid",
                                placeItems: "center",
                                flexShrink: 0,
                                color: "var(--chart-3)",
                                backgroundColor: "color-mix(in srgb, var(--chart-3) 16%, transparent)",
                                border: "1px solid color-mix(in srgb, var(--chart-3) 34%, transparent)",
                            }}
                        >
                            <PeopleAltOutlinedIcon sx={{ fontSize: 24 }} />
                        </Box>
                        <Box sx={{ minWidth: 0 }}>
                            <Typography sx={{ fontSize: { xs: "1.25rem", md: "1.5rem" }, fontWeight: 900, lineHeight: 1.1 }}>
                                Users &amp; Owners
                            </Typography>
                            <Typography sx={{ fontSize: { xs: "0.78rem", md: "0.85rem" }, color: "var(--muted-foreground)", fontWeight: 650 }}>
                                Create, edit and remove platform accounts and their restaurants
                            </Typography>
                        </Box>
                    </Stack>

                    <Button
                        variant="contained"
                        startIcon={<AddRounded />}
                        onClick={openCreateDialog}
                        sx={{
                            borderRadius: "14px",
                            fontWeight: 800,
                            textTransform: "none",
                            backgroundColor: "var(--primary)",
                            color: "var(--primary-foreground)",
                            px: 2.25,
                            alignSelf: { xs: "stretch", sm: "flex-start" },
                            "&:hover": { backgroundColor: "color-mix(in srgb, var(--primary) 86%, black 14%)" },
                        }}
                    >
                        Add user
                    </Button>
                </Stack>

                <Divider sx={{ my: 2 }} />

                <Stack direction="row" spacing={1} sx={{ overflowX: "auto", pb: 0.5 }}>
                    {roleChips.map((tab) => (
                        <Chip
                            key={tab.key || "all"}
                            label={`${tab.label} · ${tab.count}`}
                            onClick={() => setRoleFilter(tab.key)}
                            sx={{
                                flexShrink: 0,
                                height: 32,
                                fontWeight: 800,
                                fontSize: "0.8rem",
                                border: "1px solid var(--border)",
                                color: roleFilter === tab.key ? "var(--primary-foreground)" : "var(--muted-foreground)",
                                backgroundColor:
                                    roleFilter === tab.key
                                        ? "var(--primary)"
                                        : "color-mix(in srgb, var(--muted) 55%, transparent)",
                                "&:hover": {
                                    backgroundColor:
                                        roleFilter === tab.key
                                            ? "var(--primary)"
                                            : "color-mix(in srgb, var(--muted) 85%, transparent)",
                                },
                            }}
                        />
                    ))}
                </Stack>
            </Paper>

            <Paper
                elevation={0}
                sx={{
                    borderRadius: "22px",
                    border: "1px solid var(--border)",
                    backgroundColor: "var(--card)",
                    overflow: "hidden",
                    minWidth: 0,
                }}
            >
                <Stack
                    direction="row"
                    spacing={1.5}
                    alignItems="center"
                    sx={{ p: { xs: 1.5, md: 2.25 }, pb: { xs: 1, md: 1.5 } }}
                >
                    <TextField
                        size="small"
                        fullWidth
                        placeholder="Search by name, email or restaurant"
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        slotProps={{
                            input: {
                                startAdornment: <Search sx={{ color: "var(--muted-foreground)", mr: 1, fontSize: 18 }} />,
                            },
                        }}
                        sx={{
                            maxWidth: { sm: 420 },
                            "& .MuiOutlinedInput-root": { borderRadius: "12px" },
                        }}
                    />
                    <Typography
                        sx={{
                            ml: "auto",
                            whiteSpace: "nowrap",
                            fontWeight: 750,
                            fontSize: "0.82rem",
                            color: "var(--muted-foreground)",
                            display: { xs: "none", sm: "block" },
                        }}
                    >
                        {visibleUsers.length} {visibleUsers.length === 1 ? "account" : "accounts"}
                    </Typography>
                </Stack>

                {loading ? (
                    <Stack sx={{ px: { xs: 1.5, md: 2.25 }, pb: 2 }} spacing={1}>
                        {Array.from({ length: 5 }).map((_, index) => (
                            <Skeleton key={index} variant="rounded" height={54} sx={{ borderRadius: "12px" }} />
                        ))}
                    </Stack>
                ) : visibleUsers.length === 0 ? (
                    <Box sx={{ py: 7, px: 3, textAlign: "center", color: "var(--muted-foreground)" }}>
                        <Typography sx={{ fontSize: "1.9rem", lineHeight: 1 }}>👥</Typography>
                        <Typography sx={{ fontWeight: 800, mt: 1 }}>
                            {search || roleFilter ? "No matching accounts" : "No users yet"}
                        </Typography>
                        <Typography sx={{ fontSize: "0.85rem" }}>
                            {search || roleFilter
                                ? "Try a different search or filter."
                                : "Add your first owner or user to get started."}
                        </Typography>
                    </Box>
                ) : (
                    <>
                        {/* Desktop table */}
                        <Table sx={{ display: { xs: "none", md: "table" }, minWidth: 720 }}>
                            <TableHead>
                                <TableRow>
                                    {["Account", "Role", "Restaurant", "Joined", "Actions"].map((heading) => (
                                        <TableCell
                                            key={heading}
                                            sx={{
                                                fontWeight: 850,
                                                fontSize: "0.76rem",
                                                textTransform: "uppercase",
                                                letterSpacing: "0.05em",
                                                color: "var(--muted-foreground)",
                                                backgroundColor: "color-mix(in srgb, var(--muted) 60%, transparent)",
                                                borderBottom: "1px solid var(--border)",
                                                whiteSpace: "nowrap",
                                                ...(heading === "Actions" ? { textAlign: "right", pr: 3 } : {}),
                                            }}
                                        >
                                            {heading}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {pagedUsers.map((user) => {
                                    const meta = USER_ROLE_META[user.role];
                                    return (
                                        <TableRow key={user.id} hover>
                                            <TableCell sx={{ borderBottom: "1px solid var(--border)" }}>
                                                <Stack direction="row" spacing={1.25} alignItems="center" sx={{ minWidth: 0 }}>
                                                    <Avatar
                                                        sx={{
                                                            width: 36,
                                                            height: 36,
                                                            fontWeight: 900,
                                                            fontSize: "0.82rem",
                                                            color: meta.color,
                                                            backgroundColor: meta.bg,
                                                        }}
                                                    >
                                                        {user.name.trim().charAt(0).toUpperCase() || "?"}
                                                    </Avatar>
                                                    <Box sx={{ minWidth: 0 }}>
                                                        <Typography sx={{ fontWeight: 800, fontSize: "0.92rem", lineHeight: 1.2 }}>
                                                            {user.name}
                                                        </Typography>
                                                        <Typography sx={{ fontSize: "0.78rem", color: "var(--muted-foreground)", fontWeight: 650 }}>
                                                            {user.email}
                                                        </Typography>
                                                    </Box>
                                                </Stack>
                                            </TableCell>
                                            <TableCell sx={{ borderBottom: "1px solid var(--border)" }}>
                                                <Chip
                                                    label={meta.label}
                                                    size="small"
                                                    sx={{
                                                        height: 26,
                                                        fontWeight: 800,
                                                        fontSize: "0.74rem",
                                                        color: meta.color,
                                                        backgroundColor: meta.bg,
                                                    }}
                                                />
                                            </TableCell>
                                            <TableCell sx={{ borderBottom: "1px solid var(--border)" }}>
                                                {user.business ? (
                                                    <Box>
                                                        <Typography sx={{ fontWeight: 750, fontSize: "0.88rem" }}>
                                                            {user.business.name}
                                                        </Typography>
                                                        <Typography sx={{ fontSize: "0.74rem", color: "var(--muted-foreground)" }}>
                                                            {user.business.businessType}
                                                        </Typography>
                                                    </Box>
                                                ) : (
                                                    <Typography sx={{ color: "var(--muted-foreground)", fontSize: "0.85rem" }}>
                                                        —
                                                    </Typography>
                                                )}
                                            </TableCell>
                                            <TableCell sx={{ borderBottom: "1px solid var(--border)", whiteSpace: "nowrap" }}>
                                                <Typography sx={{ fontSize: "0.85rem", color: "var(--muted-foreground)", fontWeight: 650 }}>
                                                    {formatDate(user.createdAt)}
                                                </Typography>
                                            </TableCell>
                                            <TableCell sx={{ borderBottom: "1px solid var(--border)", textAlign: "right", pr: 3 }}>
                                                <IconButton
                                                    aria-label={`Edit ${user.name}`}
                                                    size="small"
                                                    onClick={() => openEditDialog(user)}
                                                    sx={{
                                                        color: "var(--primary)",
                                                        border: "1px solid var(--border)",
                                                        borderRadius: "10px",
                                                        mr: 1,
                                                    }}
                                                >
                                                    <EditOutlined fontSize="small" />
                                                </IconButton>
                                                <IconButton
                                                    aria-label={`Delete ${user.name}`}
                                                    size="small"
                                                    onClick={() => {
                                                        setSelectedUser(user);
                                                        setError("");
                                                        setDeleteOpen(true);
                                                    }}
                                                    sx={{
                                                        color: "#dc2626",
                                                        border: "1px solid var(--border)",
                                                        borderRadius: "10px",
                                                    }}
                                                >
                                                    <DeleteOutlineOutlined fontSize="small" />
                                                </IconButton>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>

                        {/* Mobile cards */}
                        <Stack
                            spacing={1.25}
                            sx={{
                                display: { xs: "flex", md: "none" },
                                px: 1.5,
                                pb: 2,
                            }}
                        >
                            {pagedUsers.map((user) => {
                                const meta = USER_ROLE_META[user.role];
                                return (
                                    <Box
                                        key={user.id}
                                        sx={{
                                            border: "1px solid var(--border)",
                                            borderRadius: "16px",
                                            p: 1.5,
                                            backgroundColor: "var(--background)",
                                        }}
                                    >
                                        <Stack direction="row" spacing={1.25} alignItems="flex-start">
                                            <Avatar
                                                sx={{
                                                    width: 38,
                                                    height: 38,
                                                    fontWeight: 900,
                                                    fontSize: "0.85rem",
                                                    color: meta.color,
                                                    backgroundColor: meta.bg,
                                                }}
                                            >
                                                {user.name.trim().charAt(0).toUpperCase() || "?"}
                                            </Avatar>
                                            <Box sx={{ minWidth: 0, flex: 1 }}>
                                                <Typography sx={{ fontWeight: 850, fontSize: "0.95rem", lineHeight: 1.2 }}>
                                                    {user.name}
                                                </Typography>
                                                <Typography sx={{ fontSize: "0.78rem", color: "var(--muted-foreground)", fontWeight: 650, wordBreak: "break-word" }}>
                                                    {user.email}
                                                </Typography>
                                            </Box>
                                            <Chip
                                                label={meta.label}
                                                size="small"
                                                sx={{
                                                    height: 24,
                                                    fontWeight: 800,
                                                    fontSize: "0.7rem",
                                                    color: meta.color,
                                                    backgroundColor: meta.bg,
                                                    flexShrink: 0,
                                                }}
                                            />
                                        </Stack>

                                        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 1.25, gap: 1 }}>
                                            <Typography sx={{ fontSize: "0.78rem", color: "var(--muted-foreground)", fontWeight: 650 }}>
                                                {user.business ? user.business.name : "No restaurant"} · {formatDate(user.createdAt)}
                                            </Typography>
                                            <Stack direction="row" spacing={0.75}>
                                                <IconButton
                                                    aria-label={`Edit ${user.name}`}
                                                    size="small"
                                                    onClick={() => openEditDialog(user)}
                                                    sx={{ color: "var(--primary)", border: "1px solid var(--border)", borderRadius: "9px", width: 32, height: 32 }}
                                                >
                                                    <EditOutlined fontSize="small" />
                                                </IconButton>
                                                <IconButton
                                                    aria-label={`Delete ${user.name}`}
                                                    size="small"
                                                    onClick={() => {
                                                        setSelectedUser(user);
                                                        setError("");
                                                        setDeleteOpen(true);
                                                    }}
                                                    sx={{ color: "#dc2626", border: "1px solid var(--border)", borderRadius: "9px", width: 32, height: 32 }}
                                                >
                                                    <DeleteOutlineOutlined fontSize="small" />
                                                </IconButton>
                                            </Stack>
                                        </Stack>
                                    </Box>
                                );
                            })}
                        </Stack>
                    </>
                )}

                {visibleUsers.length > 0 && (
                    <TablePagination
                        component="div"
                        count={visibleUsers.length}
                        page={page}
                        onPageChange={(_, nextPage) => setPage(nextPage)}
                        rowsPerPage={rowsPerPage}
                        onRowsPerPageChange={(event) => {
                            setRowsPerPage(Number(event.target.value));
                            setPage(0);
                        }}
                        rowsPerPageOptions={[5, 10, 25, 50]}
                        sx={{ borderTop: "1px solid var(--border)" }}
                    />
                )}
            </Paper>

            {/* Create / edit dialog */}
            <Dialog
                open={dialogOpen}
                onClose={saving ? undefined : () => setDialogOpen(false)}
                fullWidth
                maxWidth="sm"
            >
                <DialogTitle sx={{ fontWeight: 900 }}>
                    {dialogState.id ? "Edit account" : "Create account"}
                </DialogTitle>
                <DialogContent sx={{ pt: "20px !important" }}>
                    <Stack spacing={2}>
                        <TextField
                            label="Full name"
                            value={dialogState.name}
                            onChange={(event) => setDialogState((current) => ({ ...current, name: event.target.value }))}
                            fullWidth
                            autoFocus
                        />
                        <TextField
                            label="Email address"
                            type="email"
                            value={dialogState.email}
                            onChange={(event) => setDialogState((current) => ({ ...current, email: event.target.value }))}
                            fullWidth
                        />
                        <TextField
                            label={dialogState.id ? "New password (optional)" : "Password"}
                            type="password"
                            value={dialogState.password}
                            onChange={(event) => setDialogState((current) => ({ ...current, password: event.target.value }))}
                            fullWidth
                            helperText={dialogState.id ? "Leave blank to keep the current password." : "At least 8 characters."}
                        />

                        <Box>
                            <Typography sx={{ fontSize: "0.78rem", fontWeight: 800, color: "var(--muted-foreground)", mb: 0.75, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                                Role
                            </Typography>
                            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                                {USER_ROLES.map((role) => {
                                    const meta = USER_ROLE_META[role];
                                    const active = dialogState.role === role;
                                    return (
                                        <Chip
                                            key={role}
                                            label={meta.label}
                                            onClick={() => setDialogState((current) => ({ ...current, role }))}
                                            sx={{
                                                fontWeight: 800,
                                                height: 32,
                                                border: `1px solid ${active ? meta.color : "var(--border)"}`,
                                                color: active ? meta.color : "var(--muted-foreground)",
                                                backgroundColor: active ? meta.bg : "transparent",
                                            }}
                                        />
                                    );
                                })}
                            </Stack>
                            <Typography sx={{ fontSize: "0.76rem", color: "var(--muted-foreground)", mt: 0.75 }}>
                                {USER_ROLE_META[dialogState.role].hint}
                            </Typography>
                        </Box>

                        <Divider sx={{ borderStyle: "dashed" }} />

                        <Stack spacing={1.5}>
                            <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
                                <Typography sx={{ fontWeight: 850, fontSize: "0.95rem" }}>Restaurant (owner only)</Typography>
                                <Chip
                                    label={isOwner ? "Enabled" : "Disabled"}
                                    size="small"
                                    sx={{
                                        height: 24,
                                        fontWeight: 800,
                                        fontSize: "0.7rem",
                                        color: isOwner ? "var(--status-active-fg)" : "var(--muted-foreground)",
                                        backgroundColor: isOwner ? "var(--status-active-bg)" : "color-mix(in srgb, var(--muted) 70%, transparent)",
                                    }}
                                />
                            </Stack>
                            <Typography sx={{ fontSize: "0.76rem", color: "var(--muted-foreground)", mt: -0.5 }}>
                                Assign a restaurant now, or leave it blank to create the owner without one yet.
                            </Typography>
                            <TextField
                                label="Restaurant name"
                                value={dialogState.businessName}
                                onChange={(event) => setDialogState((current) => ({ ...current, businessName: event.target.value }))}
                                fullWidth
                                disabled={!isOwner}
                            />
                            {isOwner && (
                                <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                                    <TextField
                                        label="Cuisine / type"
                                        value={dialogState.businessType}
                                        onChange={(event) => setDialogState((current) => ({ ...current, businessType: event.target.value }))}
                                        fullWidth
                                    />
                                    <TextField
                                        label="Phone"
                                        value={dialogState.businessPhone}
                                        onChange={(event) => setDialogState((current) => ({ ...current, businessPhone: event.target.value }))}
                                        fullWidth
                                    />
                                </Stack>
                            )}
                            {isOwner && (
                                <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                                    <TextField
                                        label="Restaurant email"
                                        type="email"
                                        value={dialogState.businessEmail}
                                        onChange={(event) => setDialogState((current) => ({ ...current, businessEmail: event.target.value }))}
                                        fullWidth
                                    />
                                    <TextField
                                        label="Address"
                                        value={dialogState.businessAddress}
                                        onChange={(event) => setDialogState((current) => ({ ...current, businessAddress: event.target.value }))}
                                        fullWidth
                                    />
                                </Stack>
                            )}
                        </Stack>

                        {error ? (
                            <Typography sx={{ color: "#dc2626", fontSize: "0.88rem", fontWeight: 700 }}>{error}</Typography>
                        ) : null}
                    </Stack>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 3 }}>
                    <Button onClick={() => setDialogOpen(false)} disabled={saving} sx={{ borderRadius: "12px" }}>
                        Cancel
                    </Button>
                    <Button
                        variant="contained"
                        onClick={handleSave}
                        disabled={saving}
                        sx={{
                            borderRadius: "12px",
                            fontWeight: 800,
                            backgroundColor: "var(--primary)",
                            color: "var(--primary-foreground)",
                        }}
                    >
                        {saving ? "Saving..." : dialogState.id ? "Update account" : "Create account"}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Delete dialog */}
            <Dialog
                open={deleteOpen}
                onClose={saving ? undefined : () => setDeleteOpen(false)}
                fullWidth
                maxWidth="xs"
            >
                <DialogTitle sx={{ fontWeight: 900 }}>Delete account</DialogTitle>
                <DialogContent sx={{ pt: "20px !important" }}>
                    <Typography sx={{ color: "var(--muted-foreground)" }}>
                        Delete <strong>{selectedUser?.name ?? "this account"}</strong>?
                        {selectedUser?.business
                            ? " Their restaurant will be removed with them."
                            : " This action can be reversed by an admin."}
                    </Typography>
                    {error ? (
                        <Typography sx={{ color: "#dc2626", fontSize: "0.88rem", fontWeight: 700, mt: 1.5 }}>
                            {error}
                        </Typography>
                    ) : null}
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 3 }}>
                    <Button onClick={() => setDeleteOpen(false)} disabled={saving} sx={{ borderRadius: "12px" }}>
                        Cancel
                    </Button>
                    <Button
                        color="error"
                        variant="contained"
                        onClick={handleDelete}
                        disabled={saving}
                        sx={{ borderRadius: "12px", fontWeight: 800 }}
                    >
                        {saving ? "Deleting..." : "Delete"}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
