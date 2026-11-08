"use client";

import * as React from "react";
import {
    Alert,
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
    MenuItem,
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
    Tooltip,
    Typography,
} from "@mui/material";
import AddRounded from "@mui/icons-material/AddRounded";
import EditOutlined from "@mui/icons-material/EditOutlined";
import DeleteOutlineOutlined from "@mui/icons-material/DeleteOutlineOutlined";
import Search from "@mui/icons-material/Search";
import StorefrontOutlinedIcon from "@mui/icons-material/StorefrontOutlined";
import PauseCircleOutlineIcon from "@mui/icons-material/PauseCircleOutline";
import PlayCircleOutlineIcon from "@mui/icons-material/PlayCircleOutline";
import {
    createSuperAdminBusiness,
    deleteSuperAdminBusiness,
    getSuperAdminBusinesses,
    getSuperAdminUsers,
    reactivateSuperAdminBusiness,
    suspendSuperAdminBusiness,
    updateSuperAdminBusiness,
    type SuperAdminBusiness,
    type SuperAdminBusinessPayload,
    type SuperAdminUser,
} from "@/lib/api";
import { useAppSnackbar } from "@/components/common/SnackBar";
import { safeError } from "@/lib/safeError";
import { cardTopRightAccentFor } from "@/lib/ui";

type FilterStatus = "all" | "active" | "inactive";

type DialogState = {
    id?: number;
    userId: number;
    name: string;
    businessType: string;
    phone: string;
    email: string;
    address: string;
    isActive: boolean;
};

type AccessAction = { type: "suspend" | "reactivate"; business: SuperAdminBusiness } | null;

const createInitialState = (ownerId: number): DialogState => ({
    userId: ownerId,
    name: "",
    businessType: "Restaurant",
    phone: "",
    email: "",
    address: "",
    isActive: true,
});

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const formatDate = (value: string) =>
    value ? new Date(value).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" }) : "—";

export default function SuperAdminBusinessesPage() {
    const [businesses, setBusinesses] = React.useState<SuperAdminBusiness[]>([]);
    const [counts, setCounts] = React.useState({ total: 0, active: 0, inactive: 0, suspended: 0 });
    const [ownerOptions, setOwnerOptions] = React.useState<SuperAdminUser[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [search, setSearch] = React.useState("");
    const [statusFilter, setStatusFilter] = React.useState<FilterStatus>("all");
    const [page, setPage] = React.useState(0);
    const [rowsPerPage, setRowsPerPage] = React.useState(10);

    const [dialogOpen, setDialogOpen] = React.useState(false);
    const [dialogState, setDialogState] = React.useState<DialogState>(createInitialState(0));
    const [selected, setSelected] = React.useState<SuperAdminBusiness | null>(null);
    const [deleteOpen, setDeleteOpen] = React.useState(false);
    const [saving, setSaving] = React.useState(false);
    const [error, setError] = React.useState("");

    const [accessAction, setAccessAction] = React.useState<AccessAction>(null);
    const [accessReason, setAccessReason] = React.useState("");
    const [accessConfirmed, setAccessConfirmed] = React.useState(false);
    const [accessSaving, setAccessSaving] = React.useState(false);
    const [accessError, setAccessError] = React.useState("");

    const { showSnackbar } = useAppSnackbar();

    const fetchBusinesses = React.useCallback(async () => {
        setLoading(true);
        try {
            const data = await getSuperAdminBusinesses();
            setBusinesses(data.items);
            setCounts({ ...data.counts, suspended: data.counts.suspended ?? 0 });
        } catch (loadError) {
            showSnackbar(safeError(loadError, "Unable to load businesses right now."), "error");
        } finally {
            setLoading(false);
        }
    }, [showSnackbar]);

    const fetchOwners = React.useCallback(async () => {
        try {
            const data = await getSuperAdminUsers();
            setOwnerOptions(data.items);
        } catch {
            setOwnerOptions([]);
        }
    }, []);

    React.useEffect(() => {
        fetchBusinesses();
        fetchOwners();
    }, [fetchBusinesses, fetchOwners]);

    const visible = React.useMemo(() => {
        const term = search.trim().toLowerCase();
        return businesses.filter((business) => {
            const matchesStatus =
                statusFilter === "all" ||
                (statusFilter === "active" && business.isActive) ||
                (statusFilter === "inactive" && !business.isActive);
            const matchesSearch =
                !term ||
                business.name.toLowerCase().includes(term) ||
                business.email.toLowerCase().includes(term) ||
                (business.owner?.name ?? "").toLowerCase().includes(term);
            return matchesStatus && matchesSearch;
        });
    }, [businesses, statusFilter, search]);

    const paged = React.useMemo(() => {
        const start = page * rowsPerPage;
        return visible.slice(start, start + rowsPerPage);
    }, [page, rowsPerPage, visible]);

    React.useEffect(() => {
        setPage(0);
    }, [search, statusFilter]);

    const freeOwners = React.useMemo(() => ownerOptions.filter((user) => !user.business), [ownerOptions]);

    const selectedOwnerLabel = () => {
        const owner = ownerOptions.find((user) => user.id === dialogState.userId);
        return owner ? `${owner.name} · ${owner.email}` : "—";
    };

    const openCreateDialog = () => {
        const firstFree = ownerOptions.find((user) => !user.business);
        setDialogState(createInitialState(firstFree?.id ?? 0));
        setError("");
        setDialogOpen(true);
    };

    const openEditDialog = (business: SuperAdminBusiness) => {
        setDialogState({
            id: business.id,
            userId: business.userId,
            name: business.name,
            businessType: business.businessType,
            phone: business.phone,
            email: business.email,
            address: business.address,
            isActive: business.isActive,
        });
        setError("");
        setDialogOpen(true);
    };

    const openAccessAction = (type: "suspend" | "reactivate", business: SuperAdminBusiness) => {
        setAccessAction({ type, business });
        setAccessReason("");
        setAccessConfirmed(false);
        setAccessError("");
    };

    const handleAccessSubmit = async () => {
        if (!accessAction) return;
        const { type, business } = accessAction;
        if (!accessConfirmed) {
            setAccessError(`Please confirm you want to ${type} this business.`);
            return;
        }
        if (type === "suspend" && accessReason.trim().length < 3) {
            setAccessError("A clear suspension reason is required (at least 3 characters).");
            return;
        }
        setAccessSaving(true);
        setAccessError("");
        try {
            if (type === "suspend") {
                await suspendSuperAdminBusiness(business.id, { confirm: true, reason: accessReason.trim() });
                showSnackbar(`${business.name} has been suspended. The owner will be blocked from POS access; data is preserved.`, "success");
            } else {
                await reactivateSuperAdminBusiness(business.id, { confirm: true, reason: accessReason.trim() || undefined });
                showSnackbar(`${business.name} has been reactivated.`, "success");
            }
            setAccessAction(null);
            await fetchBusinesses();
        } catch (err) {
            const message = safeError(err, `Failed to ${type} business.`);
            setAccessError(message);
            showSnackbar(message, "error");
        } finally {
            setAccessSaving(false);
        }
    };

    const handleSave = async () => {
        const name = dialogState.name.trim();
        const email = dialogState.email.trim();
        if (!dialogState.userId) return setError("Choose an owner for this business.");
        if (!name) return setError("Business name is required.");
        if (!EMAIL_PATTERN.test(email)) return setError("Enter a valid email address.");

        setSaving(true);
        setError("");
        const payload: SuperAdminBusinessPayload = {
            userId: dialogState.userId,
            name,
            businessType: dialogState.businessType.trim() || "Restaurant",
            phone: dialogState.phone.trim(),
            email,
            address: dialogState.address.trim(),
            // Preserve current suspension state on edit; use dedicated suspend/reactivate actions for access control.
            isActive: dialogState.id ? dialogState.isActive : true,
        };

        try {
            if (dialogState.id) await updateSuperAdminBusiness({ id: dialogState.id, ...payload });
            else await createSuperAdminBusiness(payload);
            await Promise.all([fetchBusinesses(), fetchOwners()]);
            setDialogOpen(false);
            showSnackbar(dialogState.id ? `${name} has been updated successfully.` : `${name} has been created successfully.`, "success");
        } catch (saveError) {
            const message = safeError(saveError, "Failed to save business. Please try again.");
            setError(message);
            showSnackbar(message, "error");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!selected) return;
        setSaving(true);
        setError("");
        try {
            await deleteSuperAdminBusiness(selected.id);
            await Promise.all([fetchBusinesses(), fetchOwners()]);
            setDeleteOpen(false);
            setSelected(null);
            showSnackbar(`${selected.name} has been deleted successfully.`, "success");
        } catch (deleteError) {
            const message = safeError(deleteError, "Failed to delete business. Please try again.");
            setError(message);
            showSnackbar(message, "error");
        } finally {
            setSaving(false);
        }
    };

    const statusChips: Array<{ key: FilterStatus; label: string; count: number }> = [
        { key: "all", label: "All", count: counts.total },
        { key: "active", label: "Active", count: counts.active },
        { key: "inactive", label: "Suspended/Inactive", count: counts.inactive },
    ];

    const statusChipStyle = (active: boolean) => ({
        height: 26,
        fontWeight: 800,
        fontSize: "0.74rem",
        color: active ? "var(--status-active-fg)" : "var(--status-inactive-fg)",
        backgroundColor: active ? "var(--status-active-bg)" : "var(--status-inactive-bg)",
    });

    const renderStats = (business: SuperAdminBusiness) => (
        <Stack direction="row" spacing={0.75} sx={{ flexWrap: "wrap", gap: 0.5 }}>
            {[
                { label: "menu", value: business.menuItemsCount },
                { label: "tables", value: business.tablesCount },
                { label: "orders", value: business.ordersCount },
            ].map((stat) => (
                <Chip
                    key={stat.label}
                    label={`${stat.value} ${stat.label}`}
                    size="small"
                    sx={{ height: 24, fontWeight: 750, fontSize: "0.7rem", color: "var(--muted-foreground)", backgroundColor: "color-mix(in srgb, var(--muted) 65%, transparent)" }}
                />
            ))}
        </Stack>
    );

    return (
        <Box sx={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: 2, minWidth: 0, overflowX: "clip" }}>
            <Paper
                elevation={0}
                sx={{
                    p: { xs: 1.75, md: 2.5 }, borderRadius: "22px", border: "1px solid var(--border)", backgroundColor: "var(--card)",
                    backgroundImage: "radial-gradient(360px 160px at 90% 0%, color-mix(in srgb, var(--chart-1) 20%, transparent), transparent 65%)",
                    boxShadow: "0 16px 40px rgba(31, 42, 43, 0.08)",
                }}
            >
                <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ xs: "stretch", sm: "flex-start" }} spacing={1.5}>
                    <Stack direction="row" spacing={1.5} alignItems="center" sx={{ minWidth: 0 }}>
                        <Box sx={{ width: 44, height: 44, borderRadius: "14px", display: "grid", placeItems: "center", flexShrink: 0, color: "var(--chart-1)", backgroundColor: "color-mix(in srgb, var(--chart-1) 16%, transparent)", border: "1px solid color-mix(in srgb, var(--chart-1) 34%, transparent)" }}>
                            <StorefrontOutlinedIcon sx={{ fontSize: 24 }} />
                        </Box>
                        <Box sx={{ minWidth: 0 }}>
                            <Typography sx={{ fontSize: { xs: "1.25rem", md: "1.5rem" }, fontWeight: 900, lineHeight: 1.1 }}>Businesses</Typography>
                            <Typography sx={{ fontSize: { xs: "0.78rem", md: "0.85rem" }, color: "var(--muted-foreground)", fontWeight: 650 }}>
                                Manage tenants, ownership, and suspension/reactivation (data preserved)
                            </Typography>
                        </Box>
                    </Stack>
                    <Button variant="contained" startIcon={<AddRounded />} onClick={openCreateDialog} sx={{ borderRadius: "14px", fontWeight: 800, textTransform: "none", backgroundColor: "var(--primary)", color: "var(--primary-foreground)", px: 2.25, alignSelf: { xs: "stretch", sm: "flex-start" } }}>
                        Add business
                    </Button>
                </Stack>
                <Divider sx={{ my: 2 }} />
                <Stack direction="row" spacing={1} sx={{ overflowX: "auto", pb: 0.5 }}>
                    {statusChips.map((tab) => (
                        <Chip
                            key={tab.key}
                            label={`${tab.label} · ${tab.count}`}
                            onClick={() => setStatusFilter(tab.key)}
                            sx={{
                                flexShrink: 0, height: 32, fontWeight: 800, fontSize: "0.8rem", border: "1px solid var(--border)",
                                color: statusFilter === tab.key ? "var(--primary-foreground)" : "var(--muted-foreground)",
                                backgroundColor: statusFilter === tab.key ? "var(--primary)" : "color-mix(in srgb, var(--muted) 55%, transparent)",
                            }}
                        />
                    ))}
                </Stack>
            </Paper>

            <Paper elevation={0} sx={{ borderRadius: "22px", border: "1px solid var(--border)", backgroundColor: "var(--card)", backgroundImage: cardTopRightAccentFor("var(--chart-1)", "soft"), overflow: "hidden", minWidth: 0 }}>
                <Stack direction="row" spacing={1.5} alignItems="center" sx={{ p: { xs: 1.5, md: 2.25 }, pb: { xs: 1, md: 1.5 } }}>
                    <TextField
                        size="small" fullWidth placeholder="Search by business, email or owner" value={search} onChange={(e) => setSearch(e.target.value)}
                        slotProps={{ input: { startAdornment: <Search sx={{ color: "var(--muted-foreground)", mr: 1, fontSize: 18 }} /> } }}
                        sx={{ maxWidth: { sm: 420 }, "& .MuiOutlinedInput-root": { borderRadius: "12px" } }}
                    />
                    <Typography sx={{ ml: "auto", whiteSpace: "nowrap", fontWeight: 750, fontSize: "0.82rem", color: "var(--muted-foreground)", display: { xs: "none", sm: "block" } }}>
                        {visible.length} {visible.length === 1 ? "business" : "businesses"}
                    </Typography>
                </Stack>

                {loading ? (
                    <Stack sx={{ px: { xs: 1.5, md: 2.25 }, pb: 2 }} spacing={1}>
                        {Array.from({ length: 5 }).map((_, index) => <Skeleton key={index} variant="rounded" height={54} sx={{ borderRadius: "12px" }} />)}
                    </Stack>
                ) : visible.length === 0 ? (
                    <Box sx={{ py: 7, px: 3, textAlign: "center", color: "var(--muted-foreground)" }}>
                        <Typography sx={{ fontSize: "1.9rem", lineHeight: 1 }}>🏪</Typography>
                        <Typography sx={{ fontWeight: 800, mt: 1 }}>{search || statusFilter !== "all" ? "No matching businesses" : "No businesses yet"}</Typography>
                        <Typography sx={{ fontSize: "0.85rem" }}>{search || statusFilter !== "all" ? "Try a different search or filter." : "Create an owner in Users, then add their business here."}</Typography>
                    </Box>
                ) : (
                    <>
                        <Table sx={{ display: { xs: "none", md: "table" }, minWidth: 940 }}>
                            <TableHead>
                                <TableRow>
                                    {["Business", "Owner", "Activity", "Access", "Joined", "Actions"].map((heading) => (
                                        <TableCell key={heading} sx={{ fontWeight: 850, fontSize: "0.76rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--muted-foreground)", backgroundColor: "color-mix(in srgb, var(--muted) 60%, transparent)", borderBottom: "1px solid var(--border)", whiteSpace: "nowrap", ...(heading === "Actions" ? { textAlign: "right", pr: 3 } : {}) }}>
                                            {heading}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {paged.map((business) => (
                                    <TableRow key={business.id} hover>
                                        <TableCell sx={{ borderBottom: "1px solid var(--border)" }}>
                                            <Stack direction="row" spacing={1.25} alignItems="center" sx={{ minWidth: 0 }}>
                                                <Avatar sx={{ width: 36, height: 36, fontWeight: 900, fontSize: "0.82rem", color: "var(--primary)", backgroundColor: "color-mix(in srgb, var(--primary) 14%, transparent)" }}>
                                                    {business.name.trim().charAt(0).toUpperCase() || "?"}
                                                </Avatar>
                                                <Box sx={{ minWidth: 0 }}>
                                                    <Typography sx={{ fontWeight: 800, fontSize: "0.92rem", lineHeight: 1.2 }}>{business.name}</Typography>
                                                    <Typography sx={{ fontSize: "0.76rem", color: "var(--muted-foreground)", fontWeight: 650 }}>{business.businessType} · {business.email}</Typography>
                                                    {!business.isActive && business.suspensionReason ? (
                                                        <Tooltip title={business.suspensionReason}>
                                                            <Typography sx={{ fontSize: "0.72rem", color: "#dc2626", fontWeight: 700, mt: 0.25, maxWidth: 320, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                                                Reason: {business.suspensionReason}
                                                            </Typography>
                                                        </Tooltip>
                                                    ) : null}
                                                </Box>
                                            </Stack>
                                        </TableCell>
                                        <TableCell sx={{ borderBottom: "1px solid var(--border)" }}>
                                            {business.owner ? (
                                                <Box>
                                                    <Typography sx={{ fontWeight: 750, fontSize: "0.88rem" }}>{business.owner.name}</Typography>
                                                    <Typography sx={{ fontSize: "0.74rem", color: "var(--muted-foreground)", wordBreak: "break-word" }}>{business.owner.email}</Typography>
                                                </Box>
                                            ) : <Typography sx={{ color: "var(--muted-foreground)", fontSize: "0.85rem" }}>—</Typography>}
                                        </TableCell>
                                        <TableCell sx={{ borderBottom: "1px solid var(--border)" }}>{renderStats(business)}</TableCell>
                                        <TableCell sx={{ borderBottom: "1px solid var(--border)" }}>
                                            <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap" useFlexGap>
                                                <Chip label={business.isActive ? "Active" : "Suspended"} size="small" sx={statusChipStyle(business.isActive)} />
                                                {business.isActive ? (
                                                    <Tooltip title="Suspend business (logical). Preserves data and blocks owner/public POS access.">
                                                        <IconButton aria-label={`Suspend ${business.name}`} size="small" onClick={() => openAccessAction("suspend", business)} sx={{ color: "#b45309", border: "1px solid var(--border)", borderRadius: "10px" }}>
                                                            <PauseCircleOutlineIcon fontSize="small" />
                                                        </IconButton>
                                                    </Tooltip>
                                                ) : (
                                                    <Tooltip title="Reactivate business access">
                                                        <IconButton aria-label={`Reactivate ${business.name}`} size="small" onClick={() => openAccessAction("reactivate", business)} sx={{ color: "#15803d", border: "1px solid var(--border)", borderRadius: "10px" }}>
                                                            <PlayCircleOutlineIcon fontSize="small" />
                                                        </IconButton>
                                                    </Tooltip>
                                                )}
                                            </Stack>
                                        </TableCell>
                                        <TableCell sx={{ borderBottom: "1px solid var(--border)", whiteSpace: "nowrap" }}>
                                            <Typography sx={{ fontSize: "0.85rem", color: "var(--muted-foreground)", fontWeight: 650 }}>{formatDate(business.createdAt)}</Typography>
                                        </TableCell>
                                        <TableCell sx={{ borderBottom: "1px solid var(--border)", textAlign: "right", pr: 3 }}>
                                            <IconButton aria-label={`Edit ${business.name}`} size="small" onClick={() => openEditDialog(business)} sx={{ color: "var(--primary)", border: "1px solid var(--border)", borderRadius: "10px", mr: 1 }}>
                                                <EditOutlined fontSize="small" />
                                            </IconButton>
                                            <IconButton aria-label={`Delete ${business.name}`} size="small" onClick={() => { setSelected(business); setError(""); setDeleteOpen(true); }} sx={{ color: "#dc2626", border: "1px solid var(--border)", borderRadius: "10px" }}>
                                                <DeleteOutlineOutlined fontSize="small" />
                                            </IconButton>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>

                        <Stack spacing={1.25} sx={{ display: { xs: "flex", md: "none" }, px: 1.5, pb: 2 }}>
                            {paged.map((business) => (
                                <Box key={business.id} sx={{ border: "1px solid var(--border)", borderRadius: "16px", p: 1.5, backgroundColor: "var(--background)" }}>
                                    <Stack direction="row" spacing={1.25} alignItems="flex-start">
                                        <Avatar sx={{ width: 38, height: 38, fontWeight: 900, fontSize: "0.85rem", color: "var(--primary)", backgroundColor: "color-mix(in srgb, var(--primary) 14%, transparent)" }}>
                                            {business.name.trim().charAt(0).toUpperCase() || "?"}
                                        </Avatar>
                                        <Box sx={{ minWidth: 0, flex: 1 }}>
                                            <Typography sx={{ fontWeight: 850, fontSize: "0.95rem", lineHeight: 1.2, overflowWrap: "anywhere" }}>{business.name}</Typography>
                                            <Typography sx={{ fontSize: "0.78rem", color: "var(--muted-foreground)", fontWeight: 650, wordBreak: "break-word" }}>{business.businessType} · {business.owner?.name ?? "No owner"}</Typography>
                                            {!business.isActive && business.suspensionReason ? <Typography sx={{ fontSize: "0.74rem", color: "#dc2626", mt: 0.25 }}>Reason: {business.suspensionReason}</Typography> : null}
                                        </Box>
                                        <Chip label={business.isActive ? "Active" : "Suspended"} size="small" sx={{ ...statusChipStyle(business.isActive), flexShrink: 0, height: 24, fontSize: "0.7rem" }} />
                                    </Stack>
                                    <Box sx={{ mt: 1.25 }}>{renderStats(business)}</Box>
                                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 1.25 }} flexWrap="wrap" gap={1}>
                                        <Typography sx={{ fontSize: "0.78rem", color: "var(--muted-foreground)", fontWeight: 650 }}>{formatDate(business.createdAt)}</Typography>
                                        <Stack direction="row" spacing={0.75}>
                                            {business.isActive ? (
                                                <Button size="small" variant="outlined" color="warning" onClick={() => openAccessAction("suspend", business)} sx={{ borderRadius: "9px", textTransform: "none", fontWeight: 800 }}>Suspend</Button>
                                            ) : (
                                                <Button size="small" variant="outlined" color="success" onClick={() => openAccessAction("reactivate", business)} sx={{ borderRadius: "9px", textTransform: "none", fontWeight: 800 }}>Reactivate</Button>
                                            )}
                                            <IconButton aria-label={`Edit ${business.name}`} size="small" onClick={() => openEditDialog(business)} sx={{ color: "var(--primary)", border: "1px solid var(--border)", borderRadius: "9px", width: 32, height: 32 }}><EditOutlined fontSize="small" /></IconButton>
                                            <IconButton aria-label={`Delete ${business.name}`} size="small" onClick={() => { setSelected(business); setError(""); setDeleteOpen(true); }} sx={{ color: "#dc2626", border: "1px solid var(--border)", borderRadius: "9px", width: 32, height: 32 }}><DeleteOutlineOutlined fontSize="small" /></IconButton>
                                        </Stack>
                                    </Stack>
                                </Box>
                            ))}
                        </Stack>
                    </>
                )}

                {visible.length > 0 && (
                    <TablePagination
                        component="div" count={visible.length} page={page} onPageChange={(_, nextPage) => setPage(nextPage)}
                        rowsPerPage={rowsPerPage} onRowsPerPageChange={(e) => { setRowsPerPage(Number(e.target.value)); setPage(0); }}
                        rowsPerPageOptions={[5, 10, 25, 50]} sx={{ borderTop: "1px solid var(--border)" }}
                    />
                )}
            </Paper>

            {/* Suspend / Reactivate dialog */}
            <Dialog open={!!accessAction} onClose={accessSaving ? undefined : () => setAccessAction(null)} fullWidth maxWidth="sm" PaperProps={{ sx: { borderRadius: "22px", border: "1px solid var(--border)", backgroundColor: "var(--card)" } }}>
                <DialogTitle sx={{ fontWeight: 900 }}>
                    {accessAction?.type === "suspend" ? "Suspend business (logical)" : "Reactivate business"}
                </DialogTitle>
                <DialogContent sx={{ pt: "12px !important" }}>
                    {accessAction?.type === "suspend" ? (
                        <Alert severity="warning" sx={{ mb: 2, borderRadius: "12px" }}>
                            This is a logical suspension: <strong>{accessAction.business.name}</strong>&apos;s data is preserved. The owner and public POS/QR flows will be blocked with a clear notice. Super admins retain access.
                        </Alert>
                    ) : (
                        <Alert severity="info" sx={{ mb: 2, borderRadius: "12px" }}>
                            Reactivating <strong>{accessAction?.business.name}</strong> restores owner and POS access (subject to subscription/platform state).
                        </Alert>
                    )}
                    <TextField
                        label={accessAction?.type === "suspend" ? "Suspension reason (required)" : "Reason (optional)"}
                        value={accessReason} onChange={(e) => setAccessReason(e.target.value)} fullWidth multiline minRows={3}
                        placeholder={accessAction?.type === "suspend" ? "Explain why this business is being suspended..." : "Optional note for this action"}
                        sx={{ mb: 1.5 }}
                    />
                    <Stack direction="row" spacing={1} alignItems="center">
                        <Chip
                            label={accessConfirmed ? "Confirmed" : "I confirm this action"}
                            onClick={() => setAccessConfirmed((v) => !v)}
                            color={accessConfirmed ? (accessAction?.type === "suspend" ? "warning" : "success") : "default"}
                            variant={accessConfirmed ? "filled" : "outlined"}
                            sx={{ fontWeight: 800 }}
                        />
                    </Stack>
                    {accessError ? <Typography sx={{ color: "#dc2626", fontSize: "0.88rem", fontWeight: 700, mt: 1.5 }}>{accessError}</Typography> : null}
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
                    <Button onClick={() => setAccessAction(null)} disabled={accessSaving} sx={{ borderRadius: "12px", textTransform: "none", fontWeight: 700 }}>Cancel</Button>
                    <Button variant="contained" color={accessAction?.type === "suspend" ? "warning" : "success"} onClick={handleAccessSubmit} disabled={accessSaving} sx={{ borderRadius: "12px", fontWeight: 800, textTransform: "none" }}>
                        {accessSaving ? "Saving..." : accessAction?.type === "suspend" ? "Suspend business" : "Reactivate business"}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Create/Edit dialog */}
            <Dialog open={dialogOpen} onClose={saving ? undefined : () => setDialogOpen(false)} fullWidth maxWidth="sm" PaperProps={{ sx: { borderRadius: "22px", border: "1px solid var(--border)", backgroundColor: "var(--card)" } }}>
                <DialogTitle sx={{ fontWeight: 900 }}>{dialogState.id ? "Edit business" : "Add business"}</DialogTitle>
                <DialogContent sx={{ pt: "12px !important" }}>
                    <Stack spacing={2}>
                        {!dialogState.id ? (
                            <TextField select label="Owner" value={dialogState.userId || ""} onChange={(e) => setDialogState((c) => ({ ...c, userId: Number(e.target.value) }))} fullWidth disabled={freeOwners.length === 0} helperText={freeOwners.length ? "Pick a user who does not own a business yet." : "No unassigned owners available — create one in Users first."}>
                                {freeOwners.map((owner) => <MenuItem key={owner.id} value={owner.id}>{owner.name} · {owner.email}</MenuItem>)}
                            </TextField>
                        ) : <TextField label="Owner" value={selectedOwnerLabel()} fullWidth disabled />}
                        <TextField label="Business name" value={dialogState.name} onChange={(e) => setDialogState((c) => ({ ...c, name: e.target.value }))} fullWidth />
                        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                            <TextField label="Cuisine / type" value={dialogState.businessType} onChange={(e) => setDialogState((c) => ({ ...c, businessType: e.target.value }))} fullWidth />
                            <TextField label="Phone" value={dialogState.phone} onChange={(e) => setDialogState((c) => ({ ...c, phone: e.target.value }))} fullWidth />
                        </Stack>
                        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                            <TextField label="Email address" type="email" value={dialogState.email} onChange={(e) => setDialogState((c) => ({ ...c, email: e.target.value }))} fullWidth />
                            <TextField label="Address" value={dialogState.address} onChange={(e) => setDialogState((c) => ({ ...c, address: e.target.value }))} fullWidth />
                        </Stack>
                        {dialogState.id ? (
                            <Alert severity="info" sx={{ borderRadius: "12px" }}>
                                Tenant access is managed via <strong>Suspend/Reactivate</strong> actions for auditability. This edit keeps the current access state.
                            </Alert>
                        ) : null}
                        {error ? <Typography sx={{ color: "#dc2626", fontSize: "0.88rem", fontWeight: 700 }}>{error}</Typography> : null}
                    </Stack>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
                    <Button onClick={() => setDialogOpen(false)} disabled={saving} sx={{ borderRadius: "12px", textTransform: "none", fontWeight: 700 }}>Cancel</Button>
                    <Button variant="contained" onClick={handleSave} disabled={saving} sx={{ borderRadius: "12px", fontWeight: 800, textTransform: "none" }}>{saving ? "Saving..." : dialogState.id ? "Update business" : "Create business"}</Button>
                </DialogActions>
            </Dialog>

            {/* Delete dialog */}
            <Dialog open={deleteOpen} onClose={saving ? undefined : () => setDeleteOpen(false)} fullWidth maxWidth="xs" PaperProps={{ sx: { borderRadius: "22px", border: "1px solid var(--border)", backgroundColor: "var(--card)" } }}>
                <DialogTitle sx={{ fontWeight: 900 }}>Delete business</DialogTitle>
                <DialogContent sx={{ pt: "12px !important" }}>
                    <Typography sx={{ color: "var(--muted-foreground)" }}>
                        Delete <strong>{selected?.name ?? "this business"}</strong>? Its menu, tables and orders will no longer appear in the platform. The owner account is kept.
                    </Typography>
                    {error ? <Typography sx={{ color: "#dc2626", fontSize: "0.88rem", fontWeight: 700, mt: 1.5 }}>{error}</Typography> : null}
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
                    <Button onClick={() => setDeleteOpen(false)} disabled={saving} sx={{ borderRadius: "12px", textTransform: "none", fontWeight: 700 }}>Cancel</Button>
                    <Button color="error" variant="contained" onClick={handleDelete} disabled={saving} sx={{ borderRadius: "12px", fontWeight: 800, textTransform: "none" }}>{saving ? "Deleting..." : "Delete"}</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
