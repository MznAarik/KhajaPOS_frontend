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
  IconButton,
  Paper,
  Skeleton,
  Stack,
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
import { useAppSnackbar } from "@/components/common/SnackBar";
import { safeError } from "@/lib/safeError";

import {
  buildTableOrderUrl,
  buildTableQrPreviewUrl,
  createAdminTable,
  deleteAdminTable,
  getAdminTables,
  type AdminTable,
  updateAdminTable,
} from "@/lib/api";

type DialogState = {
  id?: number;
  tableNo: string;
  qrCode: string;
  isActive: boolean;
};

const createInitialState = (): DialogState => ({
  tableNo: "",
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

  const [saving, setSaving] = React.useState(false);

  const [error, setError] = React.useState("");

  const [page, setPage] = React.useState(0);

  const [rowsPerPage, setRowsPerPage] = React.useState(10);

  const [updatingTables, setUpdatingTables] = React.useState<Set<number>>(
    new Set()
  );
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
    setDialogState(createInitialState());
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
        `Table ${table.tableNo} has been ${table.isActive ? "disabled" : "enabled"}.`,
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

  const copyTableUrl = async (table: AdminTable) => {
    await navigator.clipboard.writeText(buildTableOrderUrl(table.qrCode));
    showSnackbar(`Order URL for table ${table.tableNo} copied.`, "success");
  };

  const copyTableToken = async (table: AdminTable) => {
    await navigator.clipboard.writeText(table.qrCode);
    showSnackbar(`Secure token for table ${table.tableNo} copied.`, "success");
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
        <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" alignItems={{ xs: "flex-start", md: "center" }} spacing={1.5}>
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontSize: "0.78rem", fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--muted-foreground)" }}>
              Dining Tables
            </Typography>
            <Typography sx={{ fontSize: { xs: "1.25rem", md: "2rem" }, fontWeight: 900, mt: 0.4, lineHeight: 1.1 }}>
              Table Management
            </Typography>
            <Typography sx={{ color: "var(--muted-foreground)", fontSize: { xs: "0.88rem", md: "0.95rem" }, mt: 0.5, fontWeight: 650 }}>
              Generate QR codes per table for contactless ordering
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
              flexShrink: 0,
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
              <Typography sx={{ fontWeight: 700 }}>
                QR-ready Tables
              </Typography>

              <Typography
                sx={{
                  color: "var(--muted-foreground)",
                  fontSize: "0.92rem",
                  mt: 0.6,
                }}
              >
                Each QR code points to a table-specific order page.
              </Typography>
            </Box>

            <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
              <Chip
                label={`${tables.length} Total`}
                sx={{ fontWeight: 700 }}
              />

              <Chip
                label={`${tables.filter((table) => table.isActive && !table.occupied).length
                  } Available`}
                sx={{
                  backgroundColor: "var(--status-active-bg)",
                  color: "var(--status-active-fg)",
                  fontWeight: 700,
                }}
              />

              <Chip
                label={`${tables.filter((table) => table.isActive && table.occupied).length
                  } Occupied`}
                sx={{
                  backgroundColor: "color-mix(in srgb, var(--primary) 16%, transparent)",
                  color: "var(--primary)",
                  border: "1px solid color-mix(in srgb, var(--primary) 40%, transparent)",
                  fontWeight: 700,
                }}
              />
            </Stack>
          </Stack>
        </Box>

        <Box sx={{ display: { xs: "grid", md: "none" }, gap: 1.5, p: 1.5 }}>
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
              <Paper key={table.id} sx={{ p: 1.75, borderRadius: "18px", border: "1px solid var(--border)", backgroundColor: "var(--background)", minWidth: 0, overflow: "hidden" }}>
                <Stack spacing={1.5}>
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1.25}>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography sx={{ fontWeight: 850, fontSize: "1.05rem", overflowWrap: "anywhere" }}>
                        Table {table.tableNo}
                      </Typography>
                      <Typography sx={{ color: "var(--muted-foreground)", fontSize: "0.82rem" }}>
                        Secure QR enabled
                      </Typography>
                      <Chip
                        size="small"
                        label={
                          !table.isActive
                            ? "Unavailable"
                            : table.occupied
                              ? table.stale
                                ? "Likely left"
                                : "Occupied"
                              : "Available"
                        }
                        sx={{
                          mt: 1,
                          fontWeight: 800,
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
                          border: "1px solid",
                          borderColor: !table.isActive
                            ? "var(--status-inactive-border)"
                            : table.occupied
                              ? table.stale
                                ? "var(--status-pending-border)"
                                : "color-mix(in srgb, var(--primary) 40%, transparent)"
                              : "var(--status-active-border)",
                        }}
                      />
                    </Box>
                    <Chip
                      clickable={!updatingTables.has(table.id)}
                      disabled={updatingTables.has(table.id)}
                      label={updatingTables.has(table.id) ? "Updating" : table.isActive ? "Active" : "Off"}
                      onClick={() => !updatingTables.has(table.id) && handleToggleActive(table)}
                      sx={{
                        flexShrink: 0,
                        backgroundColor: updatingTables.has(table.id) ? "rgba(128,128,128,0.12)" : table.isActive ? "var(--status-active-bg)" : "var(--status-inactive-bg)",
                        color: updatingTables.has(table.id) ? "#808080" : table.isActive ? "var(--status-active-fg)" : "var(--status-inactive-fg)",
                        border: "1px solid",
                        borderColor: updatingTables.has(table.id)
                          ? "var(--status-neutral-border)"
                          : table.isActive
                            ? "var(--status-active-border)"
                            : "var(--status-inactive-border)",
                        fontWeight: 800,
                        cursor: updatingTables.has(table.id) ? "wait" : "pointer",
                        opacity: 1,
                      }}
                    />
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

                  <Stack direction="row" spacing={0.75} alignItems="center" sx={{ minWidth: 0 }}>
                    <IconButton size="small" onClick={() => setQrPreviewTable(table)} sx={{ width: 36, height: 36, border: "1px solid var(--border)", borderRadius: "12px", backgroundColor: "var(--primary)", color: "var(--primary-foreground)" }}>
                      <QrCode2OutlinedIcon fontSize="small" />
                    </IconButton>
                    <Button size="small" variant="outlined" onClick={() => copyTableUrl(table)} sx={{ borderRadius: "12px", flex: 1, minWidth: 0, px: 1 }}>Copy URL</Button>
                    <IconButton size="small" onClick={() => openEditDialog(table)} sx={{ width: 36, height: 36, border: "1px solid var(--border)", borderRadius: "12px", color: "var(--primary)" }}>
                      <EditOutlinedIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" color="error" onClick={() => { setSelectedTable(table); setDeleteOpen(true); }} sx={{ width: 36, height: 36, border: "1px solid var(--border)", borderRadius: "12px" }}>
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

        <Box sx={{ display: { xs: "none", md: "block" }, overflowX: "auto" }}>
        <Table sx={{ minWidth: 900, tableLayout: "fixed" }}>
          <TableHead>
            <TableRow sx={{ backgroundColor: "var(--background)" }}>
              <TableCell sx={{ width: 90 }}>Table</TableCell>
              <TableCell>QR Code</TableCell>
              <TableCell sx={{ width: "30%" }}>Order URL</TableCell>
              <TableCell sx={{ width: 140 }}>Status</TableCell>
              <TableCell align="center" sx={{ width: 170 }}>Actions</TableCell>
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
                    <Typography noWrap sx={{ minWidth: 0 }}>
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
                    <Chip
                      label={
                        !table.isActive
                          ? "Unavailable"
                          : table.occupied
                            ? table.stale
                              ? "Likely left"
                              : "Occupied"
                            : "Available"
                      }
                      sx={{
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

                        fontWeight: 700,

                        border: "1px solid",

                        borderColor: !table.isActive
                          ? "var(--status-inactive-border)"
                          : table.occupied
                            ? table.stale
                              ? "var(--status-pending-border)"
                              : "color-mix(in srgb, var(--primary) 40%, transparent)"
                            : "var(--status-active-border)",

                        opacity: 1,
                      }}
                    />
                  </TableCell>

                  {/* ACTIONS */}

                  <TableCell align="center">
                    <IconButton
                      size="small"
                      onClick={() =>
                        setQrPreviewTable(table)
                      }
                    >
                      <QrCode2OutlinedIcon />
                    </IconButton>

                    <IconButton
                      size="small"
                      onClick={() =>
                        copyTableUrl(table)
                      }
                    >
                      <ContentCopyOutlinedIcon />
                    </IconButton>

                    <IconButton
                      size="small"
                      sx={{ color: "var(--primary)" }}
                      onClick={() => openEditDialog(table)}
                    >
                      <EditOutlinedIcon />
                    </IconButton>

                    <IconButton
                      size="small"
                      sx={{ color: "var(--status-inactive-fg)" }}
                      onClick={() => {
                        setSelectedTable(table);
                        setDeleteOpen(true);
                      }}
                    >
                      <DeleteOutlineOutlinedIcon />
                    </IconButton>
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
          }}
        />
      </Paper>

      {/* CREATE / EDIT DIALOG */}

      <Dialog
        open={dialogOpen}
        onClose={saving ? undefined : () => setDialogOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>
          {dialogState.id ? "Edit Table" : "Add Table"}
        </DialogTitle>

        <DialogContent sx={{ pt: 2.5 }}>
          <Stack spacing={2}>
            <TextField
              label="Table Name / Number"
              value={dialogState.tableNo}
              onChange={(event) =>
                setDialogState((current) => ({
                  ...current,
                  tableNo: event.target.value,
                }))
              }
              fullWidth
              autoFocus
            />

            <TextField
              label="Secure QR Token"
              helperText="Generated automatically. Share only the QR code or copied order URL with customers."
              value={dialogState.qrCode}
              disabled
              fullWidth
            />

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

        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button
            onClick={() => setDialogOpen(false)}
            disabled={saving}
          >
            Cancel
          </Button>

          <Button
            variant="contained"
            onClick={handleSave}
            disabled={saving}
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

