"use client";

import * as React from "react";
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  Menu,
  MenuItem,
  Paper,
  Skeleton,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";

import AddRoundedIcon from "@mui/icons-material/AddRounded";
import ContentCopyOutlinedIcon from "@mui/icons-material/ContentCopyOutlined";
import DeleteOutlineOutlinedIcon from "@mui/icons-material/DeleteOutlineOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import QrCode2OutlinedIcon from "@mui/icons-material/QrCode2Outlined";
import KeyboardArrowDownRoundedIcon from "@mui/icons-material/KeyboardArrowDownRounded";
import { useAppSnackbar } from "@/components/common/SnackBar";
import { safeError } from "@/lib/safeError";

import {
  buildTableOrderUrl,
  buildTableQrPreviewUrl,
  createAdminTable,
  deleteAdminTable,
  getAdminTables,
  releaseAdminTable,
  type AdminTable,
  updateAdminTable,
} from "@/lib/api";

type DialogState = {
  id?: number;
  tableNo: string;
  qrCode: string;
  isActive: boolean;
};

const createInitialState = (tableNo = ""): DialogState => ({
  tableNo,
  qrCode: "",
  isActive: true,
});

const shortToken = (value: string) =>
  value.length > 16 ? `${value.slice(0, 8)}...${value.slice(-6)}` : value;

export default function TablesPage() {
  const [tables, setTables] = React.useState<AdminTable[]>([]);
  const [loading, setLoading] = React.useState(true);

  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [dialogState, setDialogState] =
    React.useState<DialogState>(createInitialState());

  const [selectedTable, setSelectedTable] =
    React.useState<AdminTable | null>(null);
  const [qrPreviewTable, setQrPreviewTable] =
    React.useState<AdminTable | null>(null);

  const [deleteOpen, setDeleteOpen] = React.useState(false);

  const [releaseTarget, setReleaseTarget] =
    React.useState<AdminTable | null>(null);
  const [releaseOpen, setReleaseOpen] = React.useState(false);

  const [saving, setSaving] = React.useState(false);
  const [releasing, setReleasing] = React.useState(false);

  const [error, setError] = React.useState("");

  const [page, setPage] = React.useState(0);

  const [rowsPerPage, setRowsPerPage] = React.useState(10);

  const [updatingTables, setUpdatingTables] = React.useState<Set<number>>(
    new Set()
  );
  const [statusMenu, setStatusMenu] = React.useState<{
    anchor: HTMLElement;
    table: AdminTable;
  } | null>(null);
  const { showSnackbar } = useAppSnackbar();

  const fetchTables = React.useCallback(async (options?: { silent?: boolean }) => {
    const silent = options?.silent ?? false;

    if (!silent) setLoading(true);

    try {
      const data = await getAdminTables();
      setTables(data);
    } catch (loadError) {
      if (silent) return;

      console.error("Failed to load tables:", loadError);
      const message = safeError(loadError, "Unable to load tables right now.");
      setError(message);
      showSnackbar(message, "error");
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchTables();
  }, [fetchTables]);

  React.useEffect(() => {
    const POLL_INTERVAL_MS = 15000;

    const poll = () => {
      if (document.visibilityState === "visible") {
        void fetchTables({ silent: true });
      }
    };

    const timer = window.setInterval(poll, POLL_INTERVAL_MS);
    document.addEventListener("visibilitychange", poll);

    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", poll);
    };
  }, [fetchTables]);

  const visibleTables = React.useMemo(() => {
    const start = page * rowsPerPage;
    return tables.slice(start, start + rowsPerPage);
  }, [page, rowsPerPage, tables]);

  const openCreateDialog = () => {
    const numericNumbers = tables
      .map((table) => Number(table.tableNo))
      .filter((value) => Number.isInteger(value) && value > 0);
    const nextNumber = numericNumbers.length
      ? String(Math.max(...numericNumbers) + 1)
      : "1";

    setDialogState(createInitialState(nextNumber));
    setError("");
    setDialogOpen(true);
  };

  const openEditDialog = (table: AdminTable) => {
    setDialogState({
      id: table.id,
      tableNo: table.tableNo,
      qrCode: table.qrCode,
      isActive: table.isActive,
    });

    setError("");
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!dialogState.tableNo.trim()) {
      setError("Table number is required.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      if (dialogState.id) {
        await updateAdminTable({
          id: dialogState.id,
          tableNo: dialogState.tableNo,
          qrCode: dialogState.qrCode,
          isActive: dialogState.isActive,
        });
      } else {
        await createAdminTable({
          tableNo: dialogState.tableNo,
          isActive: dialogState.isActive,
        });
      }

      await fetchTables();

      setDialogOpen(false);
      setDialogState(createInitialState());
      showSnackbar(
        dialogState.id
          ? `Table ${dialogState.tableNo} has been updated successfully.`
          : `Table ${dialogState.tableNo} has been created successfully.`,
        "success"
      );
    } catch (saveError) {
      console.error("Failed to save table:", saveError);
      const message = safeError(saveError, "Failed to save table. Please try again.");
      setError(message);
      showSnackbar(message, "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedTable) return;

    setSaving(true);
    setError("");

    try {
      await deleteAdminTable(selectedTable.id);

      await fetchTables();

      setDeleteOpen(false);
      setSelectedTable(null);
      showSnackbar(`Table ${selectedTable.tableNo} has been deleted successfully.`, "success");
    } catch (deleteError) {
      console.error("Failed to delete table:", deleteError);
      const message = safeError(deleteError, "Failed to delete table. Please try again.");
      setError(message);
      showSnackbar(message, "error");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (table: AdminTable) => {
    setStatusMenu(null);
    setUpdatingTables((prev) => {
      const next = new Set(prev);
      next.add(table.id);
      return next;
    });

    try {
      await updateAdminTable({
        id: table.id,
        tableNo: table.tableNo,
        qrCode: table.qrCode,
        isActive: !table.isActive,
      });

      await fetchTables();
      showSnackbar(
        `Ordering for Table ${table.tableNo} has been ${table.isActive ? "disabled" : "enabled"}.`,
        "warning"
      );
    } catch (toggleError) {
      console.error("Failed to toggle active state:", toggleError);
      const message = safeError(toggleError, "Failed to update table status. Please try again.");
      setError(message);
      showSnackbar(message, "error");
    } finally {
      setUpdatingTables((prev) => {
        const next = new Set(prev);
        next.delete(table.id);
        return next;
      });
    }
  };

  const openReleaseDialog = (table: AdminTable) => {
    setStatusMenu(null);
    setReleaseTarget(table);
    setError("");
    setReleaseOpen(true);
  };

  const handleRelease = async () => {
    if (!releaseTarget) return;

    setReleasing(true);
    setError("");

    try {
      await releaseAdminTable(releaseTarget.id);
      await fetchTables();
      setReleaseOpen(false);
      showSnackbar(`Table ${releaseTarget.tableNo} is now available.`, "success");
      setReleaseTarget(null);
    } catch (releaseError) {
      console.error("Failed to release table:", releaseError);
      const message = safeError(releaseError, "Failed to free table. Please try again.");
      setError(message);
      showSnackbar(message, "error");
    } finally {
      setReleasing(false);
    }
  };

  const copyTableUrl = async (table: AdminTable) => {
    await navigator.clipboard.writeText(buildTableOrderUrl(table.qrCode));
    showSnackbar(`Order URL for table ${table.tableNo} copied.`, "success");
  };

  const copyTableToken = async (table: AdminTable) => {
    await navigator.clipboard.writeText(table.qrCode);
    showSnackbar(`Secure token for table ${table.tableNo} copied.`, "success");
  };

  const getTableStatus = (table: AdminTable) => ({
    label: !table.isActive
      ? "Unavailable"
      : table.occupied
        ? table.stale
          ? "Likely left"
          : "Occupied"
        : "Available",
    backgroundColor: !table.isActive
      ? "var(--status-inactive-bg)"
      : table.occupied
        ? table.stale
          ? "var(--status-pending-bg)"
          : "color-mix(in srgb, var(--primary) 16%, transparent)"
        : "var(--status-active-bg)",
    color: !table.isActive
      ? "var(--status-inactive-fg)"
      : table.occupied
        ? table.stale
          ? "var(--status-pending-fg)"
          : "var(--primary)"
        : "var(--status-active-fg)",
    borderColor: !table.isActive
      ? "var(--status-inactive-border)"
      : table.occupied
        ? table.stale
          ? "var(--status-pending-border)"
          : "color-mix(in srgb, var(--primary) 40%, transparent)"
        : "var(--status-active-border)",
  });

  const renderStatusControl = (table: AdminTable) => {
    const status = getTableStatus(table);
    const busy = updatingTables.has(table.id);

    return (
      <Button
        size="small"
        variant="outlined"
        disabled={busy}
        aria-haspopup="menu"
        aria-label={`Table ${table.tableNo} status: ${status.label}. Open status actions`}
        onClick={(event) => setStatusMenu({ anchor: event.currentTarget, table })}
        endIcon={<KeyboardArrowDownRoundedIcon />}
        sx={{
          borderRadius: "999px",
          textTransform: "none",
          fontWeight: 800,
          px: 1.25,
          py: 0.35,
          minHeight: 34,
          color: status.color,
          backgroundColor: status.backgroundColor,
          borderColor: status.borderColor,
          "&:hover": { backgroundColor: status.backgroundColor, borderColor: status.borderColor, filter: "brightness(0.96)" },
          "& .MuiButton-endIcon": { ml: 0.35 },
        }}
      >
        {busy ? "Saving..." : status.label}
      </Button>
    );
  };

  return (
    <Box sx={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: 2, minWidth: 0, overflow: "hidden" }}>
      {/* HEADER */}

      <Paper
        elevation={0}
        sx={{
          p: { xs: 1.75, md: 2.75 },
          borderRadius: "22px",
          border: "1px solid var(--border)",
          backgroundColor: "var(--card)",
          backgroundImage:
            "radial-gradient(420px 200px at 88% 0%, color-mix(in srgb, var(--primary) 16%, transparent), transparent 65%)",
          boxShadow: "0 18px 40px rgba(31, 42, 43, 0.08)",
        }}
      >
        <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ xs: "stretch", sm: "center" }} spacing={{ xs: 1.5, sm: 2 }}>
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontSize: "0.78rem", fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--muted-foreground)" }}>
              Dining Tables
            </Typography>
            <Typography sx={{ fontSize: { xs: "1.25rem", md: "2rem" }, fontWeight: 900, mt: 0.4, lineHeight: 1.1 }}>
              Table Management
            </Typography>
            <Typography sx={{ color: "var(--muted-foreground)", fontSize: { xs: "0.82rem", md: "0.95rem" }, mt: 0.5, fontWeight: 650 }}>
              {"Manage tables and their ordering QR codes"}
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<AddRoundedIcon />}
            onClick={openCreateDialog}
            sx={{
              borderRadius: "14px",
              backgroundColor: "var(--primary)",
              color: "var(--primary-foreground)",
              boxShadow: "0 12px 24px color-mix(in srgb, var(--primary) 24%, transparent)",
              width: { xs: "100%", sm: "auto" },
              minWidth: { xs: 0, sm: "auto" },
              flexShrink: 0,
              px: { xs: 2, sm: 2.5 },
              minHeight: 48,
            }}
          >
            Add Table
          </Button>
        </Stack>
      </Paper>

      {/* TABLE CARD */}

      <Paper
        sx={{
          borderRadius: "22px",
          border: "1px solid var(--border)",
          backgroundColor: "var(--card)",
          overflow: "hidden",
        }}
      >
        {/* TOP */}

        <Box
          sx={{
            p: { xs: 1.75, md: 2.5 },
            borderBottom: "1px solid var(--border)",
          }}
        >
          <Stack
            direction={{ xs: "column", md: "row" }}
            justifyContent="space-between"
            spacing={2}
            alignItems={{ xs: "flex-start", md: "center" }}
          >
            <Box>
              <Typography sx={{ fontWeight: 900, fontSize: { xs: "1rem", md: "1.05rem" } }}>
                Tables
              </Typography>

              <Typography
                sx={{
                  color: "var(--muted-foreground)",
                  fontSize: "0.9rem",
                  mt: 0.4,
                  fontWeight: 650,
                }}
              >
                See table status and manage ordering access.
              </Typography>
            </Box>

          </Stack>
        </Box>

        <Box sx={{ display: { xs: "grid", lg: "none" }, gap: 1.5, p: { xs: 1.25, sm: 1.75 } }}>
          {loading ? (
            Array.from({ length: 4 }, (_, index) => (
              <Paper key={`mobile-table-skeleton-${index}`} sx={{ p: 2, borderRadius: "16px", border: "1px solid var(--border)" }}>
                <Skeleton variant="text" width="55%" height={28} />
                <Skeleton variant="text" width="80%" />
                <Skeleton variant="rounded" width={110} height={26} sx={{ borderRadius: "999px", mt: 1 }} />
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 2 }}>
                  <Skeleton variant="rounded" width={78} height={34} sx={{ borderRadius: "12px" }} />
                  <Skeleton variant="rounded" width={78} height={34} sx={{ borderRadius: "12px" }} />
                  <Skeleton variant="rounded" width={78} height={34} sx={{ borderRadius: "12px" }} />
                </Stack>
              </Paper>
            ))
          ) : visibleTables.length ? (
            visibleTables.map((table) => (
              <Paper key={table.id} sx={{ p: { xs: 1.5, sm: 2 }, borderRadius: "18px", border: "1px solid var(--border)", backgroundColor: "var(--card)", minWidth: 0, overflow: "hidden", boxShadow: "0 10px 30px rgba(31,42,43,0.06)" }}>
                <Stack spacing={1.25}>
                  <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ xs: "stretch", sm: "flex-start" }} spacing={1.25}>
                    <Box sx={{ minWidth: 0 }}>
                      <Stack direction="row" alignItems="center" spacing={1} useFlexGap sx={{ flexWrap: "wrap", minWidth: 0 }}>
                        <Typography sx={{ fontWeight: 900, fontSize: "1.08rem", overflowWrap: "anywhere" }}>
                          Table {table.tableNo}
                        </Typography>
                        {renderStatusControl(table)}
                      </Stack>
                      <Typography sx={{ color: "var(--muted-foreground)", fontSize: "0.82rem", mt: 0.25 }}>
                        QR code ready for contactless ordering
                      </Typography>
                    </Box>
                  </Stack>

                  <Paper
                    elevation={0}
                    sx={{
                      p: 1.25,
                      borderRadius: "14px",
                      border: "1px solid var(--border)",
                      backgroundColor: "var(--card)",
                      display: "grid",
                      gap: 0.75,
                    }}
                  >
                    <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
                      <Typography sx={{ color: "var(--muted-foreground)", fontSize: "0.78rem", fontWeight: 800 }}>
                        Token
                      </Typography>
                      <Button size="small" onClick={() => copyTableToken(table)} sx={{ minWidth: 0, px: 1, borderRadius: "10px" }}>
                        Copy
                      </Button>
                    </Stack>
                    <Typography
                      sx={{
                        fontFamily: "monospace",
                        fontSize: "0.82rem",
                        color: "var(--foreground)",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {shortToken(table.qrCode)}
                    </Typography>
                  </Paper>

                  <Stack direction="row" spacing={0.75} useFlexGap alignItems="center" sx={{ minWidth: 0, flexWrap: "wrap" }}>
                    <Button size="small" variant="contained" onClick={() => setQrPreviewTable(table)} startIcon={<QrCode2OutlinedIcon sx={{ fontSize: "16px !important" }} />} sx={{ borderRadius: "12px", fontWeight: 800, textTransform: "none", minHeight: 40 }}>
                      View QR
                    </Button>
                    <Button size="small" variant="outlined" onClick={() => copyTableUrl(table)} sx={{ borderRadius: "12px", fontWeight: 800, textTransform: "none", minHeight: 40 }}>Copy link</Button>
                    <IconButton aria-label={`Edit table ${table.tableNo}`} onClick={() => openEditDialog(table)} sx={{ width: 40, height: 40, border: "1px solid var(--border)", borderRadius: "10px", color: "var(--primary)" }}>
                      <EditOutlinedIcon fontSize="small" />
                    </IconButton>
                    <IconButton aria-label={`Delete table ${table.tableNo}`} onClick={() => { setSelectedTable(table); setDeleteOpen(true); }} sx={{ width: 40, height: 40, border: "1px solid var(--border)", borderRadius: "10px", color: "var(--status-inactive-fg)" }}>
                      <DeleteOutlineOutlinedIcon fontSize="small" />
                    </IconButton>
                  </Stack>
                </Stack>
              </Paper>
            ))
          ) : (
            <Typography sx={{ textAlign: "center", color: "var(--muted-foreground)" }}>No tables found.</Typography>
          )}
        </Box>

        <Box sx={{ display: { xs: "none", lg: "block" }, overflowX: "auto" }}>
        <Table sx={{ width: "100%", minWidth: 0, tableLayout: "fixed" }}>
          <colgroup>
            <col style={{ width: "9%" }} />
            <col style={{ width: "16%" }} />
            <col style={{ width: "30%" }} />
            <col style={{ width: "17%" }} />
            <col style={{ width: "28%" }} />
          </colgroup>
          <TableHead>
            <TableRow sx={{ backgroundColor: "color-mix(in srgb, var(--muted) 55%, var(--card))", "& .MuiTableCell-root": { py: 1.75, px: 2, whiteSpace: "nowrap", fontSize: "0.76rem", letterSpacing: "0.055em", textTransform: "uppercase", color: "var(--muted-foreground)", fontWeight: 900, borderBottom: "1px solid var(--border)" } }}>
              <TableCell>Table</TableCell>
              <TableCell>QR token</TableCell>
              <TableCell>Order link</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {loading ? (
              Array.from({ length: 5 }, (_, index) => (
                <TableRow key={`skeleton-${index}`}>
                  <TableCell>
                    <Skeleton width="70%" />
                  </TableCell>

                  <TableCell>
                    <Skeleton width="70%" />
                  </TableCell>

                  <TableCell>
                    <Skeleton width="100%" />
                  </TableCell>

                  <TableCell>
                    <Skeleton
                      variant="rounded"
                      width={100}
                      height={30}
                    />
                  </TableCell>

                  <TableCell>
                    <Stack direction="row" spacing={1}>
                      <Skeleton
                        variant="circular"
                        width={30}
                        height={30}
                      />
                      <Skeleton
                        variant="circular"
                        width={30}
                        height={30}
                      />
                      <Skeleton
                        variant="circular"
                        width={30}
                        height={30}
                      />
                    </Stack>
                  </TableCell>
                </TableRow>
              ))
            ) : visibleTables.length ? (
              visibleTables.map((table) => (
                <TableRow key={table.id}>
                  {/* TABLE */}

                  <TableCell>
                    <Typography sx={{ fontWeight: 700 }}>
                      {table.tableNo}
                    </Typography>
                  </TableCell>

                  {/* QR */}

                  <TableCell>
                    <Typography noWrap sx={{ minWidth: 0, maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {table.qrCode}
                    </Typography>
                  </TableCell>

                  {/* URL */}

                  <TableCell>
                    <Typography
                      sx={{
                        maxWidth: "100%",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {buildTableOrderUrl(table.qrCode)}
                    </Typography>
                  </TableCell>

                  {/* STATUS */}

                  <TableCell>
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ flexWrap: "wrap" }}>
                      {renderStatusControl(table)}
                    </Stack>
                  </TableCell>

                  {/* ACTIONS */}

                  <TableCell align="center" sx={{ px: 0.75, whiteSpace: "nowrap" }}>
                    <Stack direction="row" spacing={0.5} justifyContent="center" alignItems="center" flexWrap="nowrap">
                      <IconButton size="small" aria-label={`Show QR code for table ${table.tableNo}`} onClick={() => setQrPreviewTable(table)} sx={{ border: "1px solid var(--border)", borderRadius: "9px", width: 34, height: 34, flexShrink: 0 }}>
                        <QrCode2OutlinedIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" aria-label={`Copy order link for table ${table.tableNo}`} onClick={() => copyTableUrl(table)} sx={{ border: "1px solid var(--border)", borderRadius: "9px", width: 34, height: 34, flexShrink: 0 }}>
                        <ContentCopyOutlinedIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" aria-label={`Edit table ${table.tableNo}`} onClick={() => openEditDialog(table)} sx={{ color: "var(--primary)", border: "1px solid var(--border)", borderRadius: "9px", width: 34, height: 34, flexShrink: 0 }}>
                        <EditOutlinedIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" aria-label={`Delete table ${table.tableNo}`} onClick={() => { setSelectedTable(table); setDeleteOpen(true); }} sx={{ color: "var(--status-inactive-fg)", border: "1px solid var(--border)", borderRadius: "9px", width: 34, height: 34, flexShrink: 0 }}>
                        <DeleteOutlineOutlinedIcon fontSize="small" />
                      </IconButton>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={5}
                  sx={{
                    textAlign: "center",
                    py: 5,
                  }}
                >
                  <Typography
                    sx={{
                      color: "var(--muted-foreground)",
                    }}
                  >
                    No data found
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        </Box>

        {/* PAGINATION */}

        <TablePagination
          component="div"
          count={tables.length}
          page={page}
          onPageChange={(_, nextPage) => setPage(nextPage)}
          rowsPerPage={rowsPerPage}
          rowsPerPageOptions={[5, 10, 15]}
          onRowsPerPageChange={(event) => {
            setRowsPerPage(Number(event.target.value));
            setPage(0);
          }}
          labelRowsPerPage="Rows per page"
          sx={{
            borderTop: "1px solid var(--border)",
            backgroundColor: "var(--card)",
            ".MuiTablePagination-toolbar": { minHeight: 64, px: { xs: 1, sm: 2 }, flexWrap: { xs: "wrap", sm: "nowrap" }, justifyContent: { xs: "center", sm: "flex-end" } },
            ".MuiTablePagination-spacer": { display: { xs: "none", sm: "block" } },
            ".MuiTablePagination-selectLabel, .MuiTablePagination-displayedRows": { my: { xs: 0.5, sm: 2 } },
          }}
        />
      </Paper>

      <Menu
        anchorEl={statusMenu?.anchor ?? null}
        open={Boolean(statusMenu)}
        onClose={() => setStatusMenu(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        transformOrigin={{ vertical: "top", horizontal: "left" }}
        slotProps={{ paper: { sx: { minWidth: 190, borderRadius: "14px", border: "1px solid var(--border)", mt: 0.5 } } }}
      >
        {statusMenu ? (
          <>
            <MenuItem onClick={() => void handleToggleActive(statusMenu.table)}>
              {statusMenu.table.isActive ? "Mark as unavailable" : "Mark as available"}
            </MenuItem>
            {statusMenu.table.occupied ? (
              <MenuItem
                onClick={() => openReleaseDialog(statusMenu.table)}
                sx={{ color: "var(--primary)", fontWeight: 700 }}
              >
                Free table…
              </MenuItem>
            ) : null}
          </>
        ) : null}
      </Menu>

      {/* CREATE / EDIT DIALOG */}

      <Dialog
        open={dialogOpen}
        onClose={saving ? undefined : () => setDialogOpen(false)}
        fullWidth
        maxWidth="sm"
        PaperProps={{
          sx: {
            width: { xs: "calc(100% - 16px)", sm: "100%" },
            m: { xs: "8px", sm: "32px" },
            borderRadius: { xs: "20px", sm: "24px" },
            overflow: "hidden",
            border: "1px solid var(--border)",
            backgroundColor: "var(--card)",
            backgroundImage:
              "radial-gradient(460px 220px at 92% 0%, color-mix(in srgb, var(--primary) 16%, transparent), transparent 70%)",
            boxShadow: "0 30px 70px rgba(15, 23, 42, 0.28)",
          },
        }}
      >
        <DialogTitle
          sx={{
            px: { xs: 2, sm: 3 },
            pt: { xs: 2.25, sm: 3 },
            pb: 1.75,
          }}
        >
          <Typography component="div" sx={{ fontSize: { xs: "1.2rem", sm: "1.4rem" }, fontWeight: 900, letterSpacing: "-0.01em" }}>
            {dialogState.id ? "Edit Table" : "Add New Table"}
          </Typography>
          <Typography sx={{ mt: 0.6, color: "var(--muted-foreground)", fontSize: "0.92rem", fontWeight: 650 }}>
            {dialogState.id
              ? "Update table details, availability, or free an occupied table in one place."
              : "Create a table and get a ready-to-use QR code for contactless ordering."}
          </Typography>
        </DialogTitle>

        <DialogContent
          sx={{
            px: { xs: 2, sm: 3 },
            pt: { xs: 2, sm: 2.5 },
            pb: 2,
            borderTop: "1px solid var(--border)",
          }}
        >
          <Stack spacing={2}>
            <TextField
              label="Table Number / Name"
              placeholder="e.g. 1, A1, VIP-01"
              value={dialogState.tableNo}
              onChange={(event) =>
                setDialogState((current) => ({
                  ...current,
                  tableNo: event.target.value,
                }))
              }
              fullWidth
              autoFocus
              InputLabelProps={{ sx: { fontWeight: 700 } }}
            />

            <TextField
              label="Secure QR Token"
              helperText="Auto-generated and unique per table. Use the QR/URL on the list to share with customers."
              value={dialogState.qrCode || "Will be generated on save"}
              disabled
              fullWidth
              InputLabelProps={{ sx: { fontWeight: 700 } }}
            />

            {dialogState.id ? (
              (() => {
                const editingTable = tables.find((t) => t.id === dialogState.id);
                const statusLabel = !dialogState.isActive ? "Inactive" : editingTable?.occupied ? (editingTable.stale ? "Likely left" : "Occupied") : "Available";
                const statusColor = !dialogState.isActive ? "var(--status-inactive-fg)" : editingTable?.occupied ? (editingTable.stale ? "var(--status-pending-fg)" : "var(--primary)") : "var(--status-active-fg)";
                const statusBg = !dialogState.isActive ? "var(--status-inactive-bg)" : editingTable?.occupied ? (editingTable.stale ? "var(--status-pending-bg)" : "color-mix(in srgb, var(--primary) 16%, transparent)") : "var(--status-active-bg)";
                const statusBorder = !dialogState.isActive ? "var(--status-inactive-border)" : editingTable?.occupied ? (editingTable.stale ? "var(--status-pending-border)" : "color-mix(in srgb, var(--primary) 40%, transparent)") : "var(--status-active-border)";
                return (
                  <Paper
                    elevation={0}
                    sx={{
                      p: { xs: 1.5, sm: 2 },
                      borderRadius: "18px",
                      border: "1px solid var(--border)",
                      backgroundColor: "color-mix(in srgb, var(--muted) 28%, transparent)",
                      display: "grid",
                      gap: 1.5,
                    }}
                  >
                    <Stack direction={{ xs: "column", sm: "row" }} alignItems={{ xs: "flex-start", sm: "center" }} justifyContent="space-between" spacing={1.5}>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography sx={{ fontWeight: 900 }}>Current status</Typography>
                        <Typography sx={{ mt: 0.25, color: "var(--muted-foreground)", fontSize: "0.88rem", fontWeight: 650 }}>
                          Live state based on orders and availability settings.
                        </Typography>
                      </Box>
                      <Chip
                        label={statusLabel}
                        sx={{
                          fontWeight: 800,
                          borderRadius: "999px",
                          color: statusColor,
                          backgroundColor: statusBg,
                          border: "1px solid",
                          borderColor: statusBorder,
                        }}
                      />
                    </Stack>

                    <Paper
                      elevation={0}
                      sx={{
                        p: 1.5,
                        borderRadius: "14px",
                        border: "1px solid var(--border)",
                        backgroundColor: "var(--card)",
                      }}
                    >
                      <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
                        <Box sx={{ minWidth: 0 }}>
                          <Typography sx={{ fontWeight: 800 }}>Allow ordering</Typography>
                          <Typography sx={{ mt: 0.25, color: "var(--muted-foreground)", fontSize: "0.86rem" }}>
                            When disabled, this table won't be available for new orders.
                          </Typography>
                        </Box>
                        <FormControlLabel
                          label={dialogState.isActive ? "Enabled" : "Disabled"}
                          labelPlacement="start"
                          sx={{
                            m: 0,
                            gap: 1,
                            "& .MuiFormControlLabel-label": {
                              fontWeight: 800,
                              color: dialogState.isActive ? "var(--status-active-fg)" : "var(--status-inactive-fg)",
                            },
                          }}
                          control={
                            <Switch
                              checked={dialogState.isActive}
                              onChange={(event) =>
                                setDialogState((current) => ({
                                  ...current,
                                  isActive: event.target.checked,
                                }))
                              }
                              color="success"
                              slotProps={{ input: { "aria-label": "Toggle table ordering" } }}
                            />
                          }
                        />
                      </Stack>
                    </Paper>

                    {editingTable?.occupied ? (
                      <Paper
                        elevation={0}
                        sx={{
                          p: 1.5,
                          borderRadius: "14px",
                          border: "1px solid color-mix(in srgb, var(--primary) 40%, transparent)",
                          backgroundColor: "color-mix(in srgb, var(--primary) 10%, transparent)",
                        }}
                      >
                        <Stack direction={{ xs: "column", sm: "row" }} alignItems={{ xs: "flex-start", sm: "center" }} justifyContent="space-between" spacing={1.5}>
                          <Box sx={{ minWidth: 0 }}>
                            <Typography sx={{ fontWeight: 900 }}>Free up this table</Typography>
                            <Typography sx={{ mt: 0.25, color: "var(--muted-foreground)", fontSize: "0.86rem" }}>
                              Close all open orders for this table to make it available again.
                            </Typography>
                          </Box>
                          <Button
                            variant="contained"
                            size="small"
                            disabled={releasing}
                            onClick={() => {
                              if (editingTable) {
                                setDialogOpen(false);
                                openReleaseDialog(editingTable);
                              }
                            }}
                            sx={{ borderRadius: "12px", fontWeight: 800, textTransform: "none", flexShrink: 0, px: 2 }}
                          >
                            {releasing ? "Freeing..." : "Free table"}
                          </Button>
                        </Stack>
                      </Paper>
                    ) : null}
                  </Paper>
                );
              })()
            ) : (
              <Paper
                elevation={0}
                sx={{
                  p: 1.5,
                  borderRadius: "14px",
                  border: "1px dashed var(--border)",
                  backgroundColor: "var(--background)",
                }}
              >
                <Typography sx={{ fontWeight: 800 }}>Quick setup</Typography>
                <Typography sx={{ mt: 0.25, color: "var(--muted-foreground)", fontSize: "0.88rem" }}>
                  New tables are enabled by default. You can disable or free them later from this screen.
                </Typography>
              </Paper>
            )}

            {error ? (
              <Typography
                sx={{
                  color: "var(--status-inactive-fg)",
                  fontSize: "0.9rem",
                }}
              >
                {error}
              </Typography>
            ) : null}
          </Stack>
        </DialogContent>

        <DialogActions
          sx={{
            px: { xs: 2, sm: 3 },
            py: { xs: 1.75, sm: 2 },
            borderTop: "1px solid var(--border)",
            gap: 1,
          }}
        >
          <Button
            onClick={() => setDialogOpen(false)}
            disabled={saving}
            sx={{ borderRadius: "12px", fontWeight: 700, color: "var(--muted-foreground)" }}
          >
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
              boxShadow: "none",
              "&:hover": { backgroundColor: "var(--primary)", boxShadow: "none", filter: "brightness(0.96)" },
            }}
          >
            {saving
              ? "Saving..."
              : dialogState.id
                ? "Update Table"
                : "Save Table"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* DELETE DIALOG */}

      <Dialog
        open={deleteOpen}
        onClose={saving ? undefined : () => setDeleteOpen(false)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Delete Table</DialogTitle>

        <DialogContent sx={{ pt: 2.5 }}>
          <Typography sx={{ color: "var(--muted-foreground)" }}>
            Delete{" "}
            <strong>
              {selectedTable?.tableNo ?? "this table"}
            </strong>
            ?
          </Typography>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button
            onClick={() => setDeleteOpen(false)}
            disabled={saving}
          >
            Cancel
          </Button>

          <Button
            color="error"
            variant="contained"
            onClick={handleDelete}
            disabled={saving}
          >
            {saving ? "Deleting..." : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={releaseOpen}
        onClose={
          releasing
            ? undefined
            : () => {
                setReleaseOpen(false);
                setReleaseTarget(null);
              }
        }
        fullWidth
        maxWidth="xs"
        sx={{ "& .MuiDialog-container": { alignItems: { xs: "flex-end", sm: "center" } } }}
        PaperProps={{
          sx: {
            borderRadius: { xs: "22px 22px 0 0", sm: "22px" },
            width: { xs: "100%", sm: "100%" },
            m: { xs: 0, sm: "32px" },
            border: "1px solid var(--border)",
            backgroundColor: "var(--card)",
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 900, px: { xs: 2, sm: 3 }, pt: { xs: 2, sm: 2.5 }, pb: 1 }}>
          Free table
        </DialogTitle>
        <DialogContent sx={{ px: { xs: 2, sm: 3 }, pt: "12px !important" }}>
          <Typography sx={{ color: "var(--muted-foreground)" }}>
            Free <strong>Table {releaseTarget?.tableNo ?? ""}</strong>? Any open orders for this
            table will be closed, and customers will need to start a new order.
          </Typography>
          {error ? (
            <Typography sx={{ color: "#dc2626", fontSize: "0.88rem", fontWeight: 700, mt: 1.5 }}>
              {error}
            </Typography>
          ) : null}
        </DialogContent>
        <DialogActions
          sx={{
            px: { xs: 2, sm: 3 },
            pt: 2,
            pb: { xs: "calc(16px + env(safe-area-inset-bottom))", sm: 2 },
            gap: 1,
          }}
        >
          <Button
            onClick={() => {
              setReleaseOpen(false);
              setReleaseTarget(null);
            }}
            disabled={releasing}
            sx={{
              borderRadius: "12px",
              flex: { xs: 1, sm: "0 0 auto" },
              minHeight: 44,
              textTransform: "none",
              fontWeight: 700,
              color: "var(--muted-foreground)",
            }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleRelease}
            disabled={releasing}
            sx={{
              borderRadius: "12px",
              fontWeight: 800,
              flex: { xs: 1, sm: "0 0 auto" },
              minHeight: 44,
              textTransform: "none",
            }}
          >
            {releasing ? "Freeing..." : "Free table"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={Boolean(qrPreviewTable)}
        onClose={() => setQrPreviewTable(null)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>
          Table {qrPreviewTable?.tableNo ?? ""} QR
        </DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          {qrPreviewTable ? (
            <Stack spacing={2} alignItems="center">
              <Paper
                elevation={0}
                sx={{
                  p: 2,
                  borderRadius: "18px",
                  border: "1px solid var(--border)",
                  backgroundColor: "#fff",
                }}
              >
                <Box
                  component="img"
                  src={buildTableQrPreviewUrl(qrPreviewTable.qrCode)}
                  alt={`QR code for table ${qrPreviewTable.tableNo}`}
                  sx={{
                    width: 220,
                    height: 220,
                    display: "block",
                  }}
                />
              </Paper>
              <Typography
                sx={{
                  width: "100%",
                  color: "var(--muted-foreground)",
                  fontSize: "0.82rem",
                  textAlign: "center",
                  overflowWrap: "anywhere",
                }}
              >
                {buildTableOrderUrl(qrPreviewTable.qrCode)}
              </Typography>
            </Stack>
          ) : null}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setQrPreviewTable(null)}>
            Close
          </Button>
          {qrPreviewTable ? (
            <Button
              variant="contained"
              onClick={() => copyTableUrl(qrPreviewTable)}
            >
              Copy URL
            </Button>
          ) : null}
        </DialogActions>
      </Dialog>
    </Box>
  );
}

