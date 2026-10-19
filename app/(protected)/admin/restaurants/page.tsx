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
    MenuItem,
    Paper,
    Select,
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
import StorefrontOutlinedIcon from "@mui/icons-material/StorefrontOutlined";
import {
    createSuperAdminBusiness,
    deleteSuperAdminBusiness,
    getSuperAdminBusinesses,
    getSuperAdminUsers,
    updateSuperAdminBusiness,
    type SuperAdminBusiness,
    type SuperAdminBusinessPayload,
    type SuperAdminUser,
} from "@/lib/api";
import { useAppSnackbar } from "@/components/common/SnackBar";
import { safeError } from "@/lib/safeError";

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

export default function SuperAdminRestaurantsPage() {
    const [businesses, setBusinesses] = React.useState<SuperAdminBusiness[]>([]);
    const [counts, setCounts] = React.useState({ total: 0, active: 0, inactive: 0 });
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
    const [toggling, setToggling] = React.useState<Set<number>>(new Set());

    const { showSnackbar } = useAppSnackbar();

    const fetchBusinesses = React.useCallback(async () => {
        setLoading(true);
        try {
            const data = await getSuperAdminBusinesses();
            setBusinesses(data.items);
            setCounts(data.counts);
        } catch (loadError) {
            const message = safeError(loadError, "Unable to load restaurants right now.");
            showSnackbar(message, "error");
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

    const freeOwners = React.useMemo(
        () => ownerOptions.filter((user) => !user.business),
        [ownerOptions],
    );

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

    const handleSave = async () => {
        const name = dialogState.name.trim();
        const email = dialogState.email.trim();

        if (!dialogState.userId) {
            setError("Choose an owner for this restaurant.");
            return;
        }
        if (!name) {
            setError("Restaurant name is required.");
            return;
        }
        if (!EMAIL_PATTERN.test(email)) {
            setError("Enter a valid email address.");
            return;
        }

        setSaving(true);
        setError("");

        const payload: SuperAdminBusinessPayload = {
            userId: dialogState.userId,
            name,
            businessType: dialogState.businessType.trim() || "Restaurant",
            phone: dialogState.phone.trim(),
            email,
            address: dialogState.address.trim(),
            isActive: dialogState.isActive,
        };

        try {
            if (dialogState.id) {
                await updateSuperAdminBusiness({ id: dialogState.id, ...payload });
            } else {
                await createSuperAdminBusiness(payload);
            }
            await Promise.all([fetchBusinesses(), fetchOwners()]);
            setDialogOpen(false);
            showSnackbar(
                dialogState.id
                    ? `${name} has been updated successfully.`
                    : `${name} has been created successfully.`,
                "success",
            );
        } catch (saveError) {
            const message = safeError(saveError, "Failed to save restaurant. Please try again.");
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
            const message = safeError(deleteError, "Failed to delete restaurant. Please try again.");
            setError(message);
            showSnackbar(message, "error");
        } finally {
            setSaving(false);
        }
    };

    const toggleStatus = async (business: SuperAdminBusiness) => {
        setToggling((current) => new Set(current).add(business.id));
        try {
            await updateSuperAdminBusiness({
                id: business.id,
                userId: business.userId,
                name: business.name,
                businessType: business.businessType,
                email: business.email,
                phone: business.phone,
                address: business.address,
                isActive: !business.isActive,
            });
            setBusinesses((current) =>
                current.map((item) => (item.id === business.id ? { ...item, isActive: !business.isActive } : item)),
            );
            setCounts((current) => ({
                ...current,
                active: current.active + (business.isActive ? -1 : 1),
                inactive: current.inactive + (business.isActive ? 1 : -1),
            }));
            showSnackbar(
                `${business.name} is now ${business.isActive ? "inactive" : "active"}.`,
                "success",
            );
        } catch (toggleError) {
            showSnackbar(safeError(toggleError, "Failed to update status."), "error");
        } finally {
            setToggling((current) => {
                const next = new Set(current);
                next.delete(business.id);
                return next;
            });
        }
    };

    const statusChips: Array<{ key: FilterStatus; label: string; count: number }> = [
        { key: "all", label: "All", count: counts.total },
        { key: "active", label: "Active", count: counts.active },
        { key: "inactive", label: "Inactive", count: counts.inactive },
    ];

    const statusChipStyle = (active: boolean) => ({
        height: 26,
        fontWeight: 800,
        fontSize: "0.74rem",
        cursor: "pointer",
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
                    sx={{
                        height: 24,
                        fontWeight: 750,
                        fontSize: "0.7rem",
                        color: "var(--muted-foreground)",
                        backgroundColor: "color-mix(in srgb, var(--muted) 65%, transparent)",
                    }}
                />
            ))}
        </Stack>
    );

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
                        "radial-gradient(360px 160px at 90% 0%, color-mix(in srgb, var(--chart-1) 20%, transparent), transparent 65%)",
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
                                color: "var(--chart-1)",
                                backgroundColor: "color-mix(in srgb, var(--chart-1) 16%, transparent)",
                                border: "1px solid color-mix(in srgb, var(--chart-1) 34%, transparent)",
                            }}
                        >
                            <StorefrontOutlinedIcon sx={{ fontSize: 24 }} />
                        </Box>
                        <Box sx={{ minWidth: 0 }}>
                            <Typography sx={{ fontSize: { xs: "1.25rem", md: "1.5rem" }, fontWeight: 900, lineHeight: 1.1 }}>
                                Restaurants
                            </Typography>
                            <Typography sx={{ fontSize: { xs: "0.78rem", md: "0.85rem" }, color: "var(--muted-foreground)", fontWeight: 650 }}>
                                Every restaurant on the platform, its owner and its activity
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
                        Add restaurant
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
                                flexShrink: 0,
                                height: 32,
                                fontWeight: 800,
                                fontSize: "0.8rem",
                                border: "1px solid var(--border)",
                                color: statusFilter === tab.key ? "var(--primary-foreground)" : "var(--muted-foreground)",
                                backgroundColor:
                                    statusFilter === tab.key
                                        ? "var(--primary)"
                                        : "color-mix(in srgb, var(--muted) 55%, transparent)",
                                "&:hover": {
                                    backgroundColor:
                                        statusFilter === tab.key
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
                <Stack direction="row" spacing={1.5} alignItems="center" sx={{ p: { xs: 1.5, md: 2.25 }, pb: { xs: 1, md: 1.5 } }}>
                    <TextField
                        size="small"
                        fullWidth
                        placeholder="Search by restaurant, email or owner"
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
                        {visible.length} {visible.length === 1 ? "restaurant" : "restaurants"}
                    </Typography>
                </Stack>

                {loading ? (
                    <Stack sx={{ px: { xs: 1.5, md: 2.25 }, pb: 2 }} spacing={1}>
                        {Array.from({ length: 5 }).map((_, index) => (
                            <Skeleton key={index} variant="rounded" height={54} sx={{ borderRadius: "12px" }} />
                        ))}
                    </Stack>
                ) : visible.length === 0 ? (
                    <Box sx={{ py: 7, px: 3, textAlign: "center", color: "var(--muted-foreground)" }}>
                        <Typography sx={{ fontSize: "1.9rem", lineHeight: 1 }}>🏪</Typography>
                        <Typography sx={{ fontWeight: 800, mt: 1 }}>
                            {search || statusFilter !== "all" ? "No matching restaurants" : "No restaurants yet"}
                        </Typography>
                        <Typography sx={{ fontSize: "0.85rem" }}>
                            {search || statusFilter !== "all"
                                ? "Try a different search or filter."
                                : "Create an owner in Users, then add their restaurant here."}
                        </Typography>
                    </Box>
                ) : (
                    <>
                        <Table sx={{ display: { xs: "none", md: "table" }, minWidth: 860 }}>
                            <TableHead>
                                <TableRow>
                                    {["Restaurant", "Owner", "Activity", "Status", "Joined", "Actions"].map((heading) => (
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
                                {paged.map((business) => (
                                    <TableRow key={business.id} hover>
                                        <TableCell sx={{ borderBottom: "1px solid var(--border)" }}>
                                            <Stack direction="row" spacing={1.25} alignItems="center" sx={{ minWidth: 0 }}>
                                                <Avatar
                                                    sx={{
                                                        width: 36,
                                                        height: 36,
                                                        fontWeight: 900,
                                                        fontSize: "0.82rem",
                                                        color: "var(--primary)",
                                                        backgroundColor: "color-mix(in srgb, var(--primary) 14%, transparent)",
                                                    }}
                                                >
                                                    {business.name.trim().charAt(0).toUpperCase() || "?"}
                                                </Avatar>
                                                <Box sx={{ minWidth: 0 }}>
                                                    <Typography sx={{ fontWeight: 800, fontSize: "0.92rem", lineHeight: 1.2 }}>
                                                        {business.name}
                                                    </Typography>
                                                    <Typography sx={{ fontSize: "0.76rem", color: "var(--muted-foreground)", fontWeight: 650 }}>
                                                        {business.businessType} · {business.email}
                                                    </Typography>
                                                </Box>
                                            </Stack>
                                        </TableCell>
                                        <TableCell sx={{ borderBottom: "1px solid var(--border)" }}>
                                            {business.owner ? (
                                                <Box>
                                                    <Typography sx={{ fontWeight: 750, fontSize: "0.88rem" }}>
                                                        {business.owner.name}
                                                    </Typography>
                                                    <Typography sx={{ fontSize: "0.74rem", color: "var(--muted-foreground)", wordBreak: "break-word" }}>
                                                        {business.owner.email}
                                                    </Typography>
                                                </Box>
                                            ) : (
                                                <Typography sx={{ color: "var(--muted-foreground)", fontSize: "0.85rem" }}>—</Typography>
                                            )}
                                        </TableCell>
                                        <TableCell sx={{ borderBottom: "1px solid var(--border)" }}>
                                            {renderStats(business)}
                                        </TableCell>
                                        <TableCell sx={{ borderBottom: "1px solid var(--border)" }}>
                                            <Chip
                                                label={business.isActive ? "Active" : "Inactive"}
                                                size="small"
                                                onClick={() => toggleStatus(business)}
                                                disabled={toggling.has(business.id)}
                                                sx={statusChipStyle(business.isActive)}
                                            />
                                        </TableCell>
                                        <TableCell sx={{ borderBottom: "1px solid var(--border)", whiteSpace: "nowrap" }}>
                                            <Typography sx={{ fontSize: "0.85rem", color: "var(--muted-foreground)", fontWeight: 650 }}>
                                                {formatDate(business.createdAt)}
                                            </Typography>
                                        </TableCell>
                                        <TableCell sx={{ borderBottom: "1px solid var(--border)", textAlign: "right", pr: 3 }}>
                                            <IconButton
                                                aria-label={`Edit ${business.name}`}
                                                size="small"
                                                onClick={() => openEditDialog(business)}
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
                                                aria-label={`Delete ${business.name}`}
                                                size="small"
                                                onClick={() => {
                                                    setSelected(business);
                                                    setError("");
                                                    setDeleteOpen(true);
                                                }}
                                                sx={{ color: "#dc2626", border: "1px solid var(--border)", borderRadius: "10px" }}
                                            >
                                                <DeleteOutlineOutlined fontSize="small" />
                                            </IconButton>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>

                        <Stack spacing={1.25} sx={{ display: { xs: "flex", md: "none" }, px: 1.5, pb: 2 }}>
                            {paged.map((business) => (
                                <Box
                                    key={business.id}
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
                                                color: "var(--primary)",
                                                backgroundColor: "color-mix(in srgb, var(--primary) 14%, transparent)",
                                            }}
                                        >
                                            {business.name.trim().charAt(0).toUpperCase() || "?"}
                                        </Avatar>
                                        <Box sx={{ minWidth: 0, flex: 1 }}>
                                            <Typography sx={{ fontWeight: 850, fontSize: "0.95rem", lineHeight: 1.2 }}>
                                                {business.name}
                                            </Typography>
                                            <Typography sx={{ fontSize: "0.78rem", color: "var(--muted-foreground)", fontWeight: 650, wordBreak: "break-word" }}>
                                                {business.businessType} · {business.owner?.name ?? "No owner"}
                                            </Typography>
                                        </Box>
                                        <Chip
                                            label={business.isActive ? "Active" : "Inactive"}
                                            size="small"
                                            onClick={() => toggleStatus(business)}
                                            disabled={toggling.has(business.id)}
                                            sx={{ ...statusChipStyle(business.isActive), flexShrink: 0, height: 24, fontSize: "0.7rem" }}
                                        />
                                    </Stack>

                                    <Box sx={{ mt: 1.25 }}>{renderStats(business)}</Box>

                                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 1.25 }}>
                                        <Typography sx={{ fontSize: "0.78rem", color: "var(--muted-foreground)", fontWeight: 650 }}>
                                            {formatDate(business.createdAt)}
                                        </Typography>
                                        <Stack direction="row" spacing={0.75}>
                                            <IconButton
                                                aria-label={`Edit ${business.name}`}
                                                size="small"
                                                onClick={() => openEditDialog(business)}
                                                sx={{ color: "var(--primary)", border: "1px solid var(--border)", borderRadius: "9px", width: 32, height: 32 }}
                                            >
                                                <EditOutlined fontSize="small" />
                                            </IconButton>
                                            <IconButton
                                                aria-label={`Delete ${business.name}`}
                                                size="small"
                                                onClick={() => {
                                                    setSelected(business);
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
                            ))}
                        </Stack>
                    </>
                )}

                {visible.length > 0 && (
                    <TablePagination
                        component="div"
                        count={visible.length}
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

            <Dialog
                open={dialogOpen}
                onClose={saving ? undefined : () => setDialogOpen(false)}
                fullWidth
                maxWidth="sm"
            >
                <DialogTitle sx={{ fontWeight: 900 }}>
                    {dialogState.id ? "Edit restaurant" : "Add restaurant"}
                </DialogTitle>
                <DialogContent sx={{ pt: "20px !important" }}>
                    <Stack spacing={2}>
                        {!dialogState.id ? (
                            <TextField
                                select
                                label="Owner"
                                value={dialogState.userId || ""}
                                onChange={(event) =>
                                    setDialogState((current) => ({ ...current, userId: Number(event.target.value) }))
                                }
                                fullWidth
                                disabled={freeOwners.length === 0}
                                helperText={
                                    freeOwners.length
                                        ? "Pick a user who does not own a restaurant yet."
                                        : "No unassigned owners available — create one in Users first."
                                }
                            >
                                {freeOwners.map((owner) => (
                                    <MenuItem key={owner.id} value={owner.id}>
                                        {owner.name} · {owner.email}
                                    </MenuItem>
                                ))}
                            </TextField>
                        ) : (
                            <TextField label="Owner" value={selectedOwnerLabel()} fullWidth disabled />
                        )}

                        <TextField
                            label="Restaurant name"
                            value={dialogState.name}
                            onChange={(event) => setDialogState((current) => ({ ...current, name: event.target.value }))}
                            fullWidth
                            autoFocus={!dialogState.id}
                        />

                        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                            <TextField
                                label="Cuisine / type"
                                value={dialogState.businessType}
                                onChange={(event) => setDialogState((current) => ({ ...current, businessType: event.target.value }))}
                                fullWidth
                            />
                            <TextField
                                label="Phone"
                                value={dialogState.phone}
                                onChange={(event) => setDialogState((current) => ({ ...current, phone: event.target.value }))}
                                fullWidth
                            />
                        </Stack>

                        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                            <TextField
                                label="Email address"
                                type="email"
                                value={dialogState.email}
                                onChange={(event) => setDialogState((current) => ({ ...current, email: event.target.value }))}
                                fullWidth
                            />
                            <TextField
                                label="Address"
                                value={dialogState.address}
                                onChange={(event) => setDialogState((current) => ({ ...current, address: event.target.value }))}
                                fullWidth
                            />
                        </Stack>

                        <Box>
                            <Typography sx={{ fontSize: "0.78rem", fontWeight: 800, color: "var(--muted-foreground)", mb: 0.75, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                                Status
                            </Typography>
                            <Stack direction="row" spacing={1}>
                                {[true, false].map((value) => (
                                    <Chip
                                        key={String(value)}
                                        label={value ? "Active" : "Inactive"}
                                        onClick={() => setDialogState((current) => ({ ...current, isActive: value }))}
                                        sx={{
                                            fontWeight: 800,
                                            height: 32,
                                            border: "1px solid var(--border)",
                                            color: dialogState.isActive === value ? (value ? "var(--status-active-fg)" : "var(--status-inactive-fg)") : "var(--muted-foreground)",
                                            backgroundColor:
                                                dialogState.isActive === value ? (value ? "var(--status-active-bg)" : "var(--status-inactive-bg)") : "transparent",
                                        }}
                                    />
                                ))}
                            </Stack>
                            <Typography sx={{ fontSize: "0.76rem", color: "var(--muted-foreground)", mt: 0.75 }}>
                                Inactive restaurants are hidden from customers scanning their QR code.
                            </Typography>
                        </Box>

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
                        {saving ? "Saving..." : dialogState.id ? "Update restaurant" : "Create restaurant"}
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog
                open={deleteOpen}
                onClose={saving ? undefined : () => setDeleteOpen(false)}
                fullWidth
                maxWidth="xs"
            >
                <DialogTitle sx={{ fontWeight: 900 }}>Delete restaurant</DialogTitle>
                <DialogContent sx={{ pt: "20px !important" }}>
                    <Typography sx={{ color: "var(--muted-foreground)" }}>
                        Delete <strong>{selected?.name ?? "this restaurant"}</strong>? Its menu, tables and orders will no
                        longer appear in the platform. The owner account is kept.
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
