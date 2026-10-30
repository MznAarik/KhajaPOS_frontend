"use client";

import * as React from "react";
import {
  Box,
  Button,
  Chip,
  capitalize,
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
import DeleteOutlineOutlinedIcon from "@mui/icons-material/DeleteOutlineOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import { createCategory, deleteCategory, getCategories, type CategoryOption, updateCategory, updateCategoryAvailability } from "@/lib/api";
import { useAppSnackbar } from "@/components/common/SnackBar";
import { safeError } from "@/lib/safeError";

type CategoryDialogState = {
  id?: number;
  name: string;
};

const createInitialDialogState = (): CategoryDialogState => ({
  name: "",
});

const formatCreatedAt = (value: string) => {
  const date = new Date(value);

  return `${date.toLocaleDateString()} • ${date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
};

const floatingFieldSx = {
  mt: 1,
  "& .MuiInputLabel-root": {
    backgroundColor: "transparent",
    px: 0.75,
    borderRadius: "6px",
    lineHeight: 1.15,
    overflow: "visible",
  },
  "& .MuiInputLabel-root.MuiInputLabel-shrink": {
    transform: "translate(10px, -7px) scale(0.75)",
  },
  "& .MuiOutlinedInput-root": {
    overflow: "visible",
  },
  "& .MuiOutlinedInput-notchedOutline legend": {
    height: 12,
  },
};

export default function CategoryManagementPage() {
  const [categories, setCategories] = React.useState<CategoryOption[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [dialogState, setDialogState] = React.useState<CategoryDialogState>(createInitialDialogState());
  const [selectedCategory, setSelectedCategory] = React.useState<CategoryOption | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const [availabilityUpdatingId, setAvailabilityUpdatingId] = React.useState<number | null>(null);
  const [error, setError] = React.useState("");
  const [page, setPage] = React.useState(0);
  const [rowsPerPage, setRowsPerPage] = React.useState(10);
  const skeletonRows = Array.from({ length: 5 }, (_, index) => index);
  const { showSnackbar } = useAppSnackbar();

  const fetchCategories = React.useCallback(async () => {
    setLoading(true);
    try {
      const data = await getCategories();
      setCategories(data);
    } catch (loadError) {
      console.error("Failed to fetch categories:", loadError);
      showSnackbar(safeError(loadError, "Unable to load categories."), "error");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const paginatedCategories = React.useMemo(() => {
    const start = page * rowsPerPage;
    return categories.slice(start, start + rowsPerPage);
  }, [categories, page, rowsPerPage]);

  const openCreateDialog = () => {
    setDialogState(createInitialDialogState());
    setError("");
    setDialogOpen(true);
  };

  const openEditDialog = (category: CategoryOption) => {
    setDialogState({
      id: category.id,
      name: category.name,
    });
    setError("");
    setDialogOpen(true);
  };

  const openDeleteDialog = (category: CategoryOption) => {
    setSelectedCategory(category);
    setDeleteDialogOpen(true);
    setError("");
  };

  const handleSave = async () => {
    const trimmedName = dialogState.name.trim();

    if (!trimmedName) {
      setError("Category name is required.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      if (dialogState.id) {
        const existingCategory = categories.find((category) => category.id === dialogState.id);
        await updateCategory({
          id: dialogState.id,
          name: trimmedName,
          isActive: existingCategory?.isActive ?? true,
        });
      } else {
        await createCategory({
          name: trimmedName,
          isActive: true,
        });
      }

      await fetchCategories();
      setPage(0);
      setDialogOpen(false);
      setDialogState(createInitialDialogState());
      const categoryLabel = trimmedName || "Category";
      showSnackbar(
        dialogState.id
          ? `${categoryLabel} has been updated successfully.`
          : `${categoryLabel} has been created successfully.`,
        "success"
      );
    } catch (saveError) {
      console.error("Failed to save category:", saveError);
      const message = safeError(saveError, "Failed to save category. Please try again.");
      setError(message);
      showSnackbar(message, "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedCategory) return;
    setDeleting(true);
    try {
      await deleteCategory(selectedCategory.id);
      const updatedCategories = categories.filter(c => c.id !== selectedCategory.id);
      setCategories(updatedCategories);

      const totalPages = Math.ceil(updatedCategories.length / rowsPerPage);
      if (page >= totalPages && page > 0) {
        setPage(page - 1);
      }

      setDeleteDialogOpen(false);
      showSnackbar(`${selectedCategory.name} has been deleted successfully.`, "success");
    } catch (err) {
      const message = safeError(err, "Failed to delete.");
      setError(message);
      showSnackbar(message, "error");
    } finally {
      setDeleting(false);
    }
  };

  const handleAvailabilityToggle = async (category: CategoryOption) => {
    const nextAvailability = !category.isActive;
    setAvailabilityUpdatingId(category.id);

    try {
      await updateCategoryAvailability(category, nextAvailability);
      setCategories((current) =>
        current.map((item) =>
          item.id === category.id ? { ...item, isActive: nextAvailability } : item
        )
      );
      showSnackbar(
        `${category.name} has been ${nextAvailability ? "activated" : "disabled"}.`,
        "warning"
      );
    } catch (updateError) {
      console.error("Failed to update category availability:", updateError);
      const message = safeError(updateError, "Failed to update category availability. Please try again.");
      setError(message);
      showSnackbar(message, "error");
    } finally {
      setAvailabilityUpdatingId(null);
    }
  };

  return (
    <Box sx={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: 2, minWidth: 0 }}>
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
              Menu Structure
            </Typography>
            <Typography sx={{ fontSize: { xs: "1.25rem", md: "2rem" }, fontWeight: 900, mt: 0.4, lineHeight: 1.1 }}>
              Category Management
            </Typography>
            <Typography sx={{ color: "var(--muted-foreground)", fontSize: { xs: "0.88rem", md: "0.95rem" }, mt: 0.5, fontWeight: 650 }}>
              Create, update, or disable categories used across your menu.
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
            Add Category
          </Button>
        </Stack>
      </Paper>

      <Paper
        sx={{
          borderRadius: "22px",
          border: "1px solid var(--border)",
          backgroundColor: "var(--card)",
          overflow: "hidden",
        }}
      >
        <Box sx={{ p: { xs: 1.5, md: 2.25 }, borderBottom: "1px solid var(--border)" }}>
          <Stack
            direction={{ xs: "column", md: "row" }}
            spacing={1.5}
            alignItems={{ xs: "stretch", md: "center" }}
            justifyContent="space-between"
          >
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ fontWeight: 900, fontSize: { xs: "0.95rem", md: "1rem" } }}>Categories</Typography>
              <Typography sx={{ color: "var(--muted-foreground)", fontSize: { xs: "0.82rem", md: "0.88rem" }, mt: 0.25, fontWeight: 650 }}>
                Structure, naming, and quick availability control
              </Typography>
            </Box>
            <Stack direction="row" spacing={1} flexWrap="nowrap" useFlexGap justifyContent={{ xs: "flex-start", md: "flex-end" }} sx={{ width: { xs: "100%", md: "auto" }, overflowX: "auto", pb: { xs: 0.25, md: 0 } }}>
              <Chip
                label={`${categories.length} Total`}
                sx={{
                  borderRadius: "999px",
                  height: 32,
                  flexShrink: 0,
                  backgroundColor: "var(--card)",
                  border: "1px solid var(--border)",
                  color: "var(--foreground)",
                  fontWeight: 850,
                }}
              />
              <Chip
                label={`${categories.filter((category) => category.isActive).length} Active`}
                sx={{
                  borderRadius: "999px",
                  height: 32,
                  flexShrink: 0,
                  backgroundColor: "var(--status-active-bg)",
                  color: "var(--status-active-fg)",
                  border: "1px solid color-mix(in srgb, var(--status-active-fg) 35%, transparent)",
                  fontWeight: 850,
                }}
              />
            </Stack>
          </Stack>
        </Box>

        <Box sx={{ display: { xs: "grid", md: "none" }, gap: 1, p: 0.75 }}>
          {loading ? (
            skeletonRows.map((row) => (
                <Paper key={`mobile-category-skeleton-${row}`} sx={{ p: 2, borderRadius: "18px", border: "1px solid var(--border)" }}>
                <Skeleton variant="text" width="60%" height={28} />
                <Skeleton variant="text" width="90%" height={22} />
                <Skeleton variant="rounded" width={96} height={26} sx={{ borderRadius: "999px", mt: 1 }} />
                <Box sx={{ display: "flex", gap: 1, mt: 1.5 }}>
                  <Skeleton variant="rounded" width={92} height={36} sx={{ borderRadius: "12px" }} />
                  <Skeleton variant="rounded" width={92} height={36} sx={{ borderRadius: "12px" }} />
                </Box>
              </Paper>
            ))
          ) : paginatedCategories.length ? (
            paginatedCategories.map((category) => (
              <Paper key={category.id} sx={{ p: 1.1, borderRadius: "18px", border: "1px solid var(--border)", backgroundColor: "var(--background)", minWidth: 0, overflow: "hidden" }}>
                <Stack spacing={1.35}>
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1.25}>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography sx={{ fontWeight: 850, fontSize: "1.05rem", overflowWrap: "anywhere" }}>
                        {capitalize(category.name)}
                      </Typography>
                      <Typography sx={{ color: "var(--muted-foreground)", fontSize: "0.82rem" }}>
                        Menu group
                      </Typography>
                    </Box>
                    <Chip
                      clickable={availabilityUpdatingId !== category.id}
                      disabled={availabilityUpdatingId === category.id}
                      label={availabilityUpdatingId === category.id ? "Updating" : category.isActive ? "Active" : "Off"}
                      onClick={() => availabilityUpdatingId !== category.id && handleAvailabilityToggle(category)}
                      sx={{
                        flexShrink: 0,
                        backgroundColor: category.isActive
                          ? "var(--status-active-bg)"
                          : "var(--status-inactive-bg)",
                        color: category.isActive ? "var(--status-active-fg)" : "var(--status-inactive-fg)",
                        border: "1px solid",
                        borderColor: category.isActive
                          ? "var(--status-active-border)"
                          : "var(--status-inactive-border)",
                        fontWeight: 800,
                        cursor: availabilityUpdatingId === category.id ? "wait" : "pointer",
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
                    }}
                  >
                    <Typography sx={{ color: "var(--muted-foreground)", fontSize: "0.78rem", fontWeight: 800 }}>
                      Created
                    </Typography>
                    <Typography sx={{ fontWeight: 750, mt: 0.35 }}>
                      {formatCreatedAt(category.createdAt)}
                    </Typography>
                  </Paper>

                  <Stack direction="row" spacing={1} alignItems="center">
                    <Button variant="outlined" onClick={() => openEditDialog(category)} sx={{ borderRadius: "12px", flex: 1, minWidth: 0, minHeight: 38 }}>
                      Edit
                    </Button>
                    <Button
                      variant="outlined"
                      color="error"
                      onClick={() => openDeleteDialog(category)}
                      startIcon={<DeleteOutlineOutlinedIcon fontSize="small" />}
                      sx={{ borderRadius: "12px", flex: 1, minWidth: 0, minHeight: 38 }}
                    >
                      Delete
                    </Button>
                    <IconButton color="error" onClick={() => openDeleteDialog(category)} sx={{ display: "none" }}>
                      <DeleteOutlineOutlinedIcon fontSize="small" />
                    </IconButton>
                  </Stack>
                </Stack>
              </Paper>
            ))
          ) : (
            <Typography sx={{ textAlign: "center", color: "var(--muted-foreground)" }}>No categories found.</Typography>
          )}
        </Box>

        <Table sx={{ display: { xs: "none", md: "table" } }}>
          <TableHead>
            <TableRow sx={{ backgroundColor: "var(--background)" }}>
              <TableCell>Name</TableCell>
              <TableCell>Is Available</TableCell>
              <TableCell>Created At</TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              skeletonRows.map((row) => (
                <TableRow key={`desktop-category-skeleton-${row}`}>
                  <TableCell><Skeleton variant="text" width="70%" height={28} /></TableCell>
                  <TableCell><Skeleton variant="rounded" width={98} height={26} sx={{ borderRadius: "999px" }} /></TableCell>
                  <TableCell><Skeleton variant="text" width="55%" height={24} /></TableCell>
                  <TableCell align="center">
                    <Box sx={{ display: "flex", justifyContent: "center", gap: 1 }}>
                      <Skeleton variant="circular" width={28} height={28} />
                      <Skeleton variant="circular" width={28} height={28} />
                    </Box>
                  </TableCell>
                </TableRow>
              ))
            ) : paginatedCategories.length ? (
              paginatedCategories.map((category) => (
                <TableRow key={category.id}>
                  <TableCell>
                    <Typography sx={{ fontWeight: 600 }}>{capitalize(category.name)}</Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      clickable={availabilityUpdatingId !== category.id}
                      disabled={availabilityUpdatingId === category.id}
                      label={availabilityUpdatingId === category.id ? "Updating..." : category.isActive ? "Available" : "Unavailable"}
                      onClick={() => availabilityUpdatingId !== category.id && handleAvailabilityToggle(category)}
                      sx={{
                        backgroundColor: category.isActive
                          ? "var(--status-active-bg)"
                          : "var(--status-inactive-bg)",
                        color: category.isActive ? "var(--status-active-fg)" : "var(--status-inactive-fg)",
                        border: "1px solid",
                        borderColor: category.isActive
                          ? "var(--status-active-border)"
                          : "var(--status-inactive-border)",
                        fontWeight: 700,
                        cursor: availabilityUpdatingId === category.id ? "wait" : "pointer",
                        opacity: 1,
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography sx={{ fontWeight: 600 }}>
                      {formatCreatedAt(category.createdAt)}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <IconButton size="small" sx={{ color: "var(--primary)" }} onClick={() => openEditDialog(category)}>
                      <EditOutlinedIcon />
                    </IconButton>
                    <IconButton size="small" sx={{ color: "var(--status-inactive-fg)" }} onClick={() => openDeleteDialog(category)}>
                      <DeleteOutlineOutlinedIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} sx={{ textAlign: "center", py: 4 }}>
                  <Typography>No categories found.</Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        <TablePagination
          component="div"
          count={categories.length}
          page={page}
          onPageChange={(_event, nextPage) => setPage(nextPage)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(event) => {
            setRowsPerPage(Number(event.target.value));
            setPage(0);
          }}
          rowsPerPageOptions={[5, 10, 15]}
          labelRowsPerPage="Rows per page"
          sx={{
            borderTop: "1px solid var(--border)",
            backgroundColor: "var(--card)",
          }}
        />
      </Paper>

      <Dialog
        open={dialogOpen}
        onClose={saving ? undefined : () => setDialogOpen(false)}
        fullWidth
        maxWidth="xs"
        PaperProps={{
          sx: {
            borderRadius: "20px",
          },
        }}
      >
        <DialogTitle>{dialogState.id ? "Edit Category" : "Add Category"}</DialogTitle>
        <DialogContent sx={{ pt: 3.25 }}>
          <Stack spacing={2}>
            <TextField
              label="Category Name"
              value={dialogState.name}
              onChange={(event) => setDialogState((current) => ({ ...current, name: event.target.value }))}
              fullWidth
              autoFocus
              sx={floatingFieldSx}
            />
            <Typography sx={{ color: "var(--muted-foreground)", fontSize: "0.9rem" }}>
              Keep category names short and reusable. You can update availability directly from the table whenever needed.
            </Typography>
            {error ? <Typography sx={{ color: "var(--status-inactive-fg)", fontSize: "0.9rem" }}>{error}</Typography> : null}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button
            variant="outlined"
            onClick={() => setDialogOpen(false)}
            disabled={saving}
            sx={{ borderRadius: "12px", borderColor: "var(--border)", color: "var(--foreground)" }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={saving}
            sx={{
              borderRadius: "12px",
              backgroundColor: "var(--primary)",
              color: "var(--primary-foreground)",
            }}
          >
            {saving ? "Saving..." : dialogState.id ? "Update Category" : "Save Category"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={deleteDialogOpen}
        onClose={deleting ? undefined : () => setDeleteDialogOpen(false)}
        fullWidth
        maxWidth="xs"
        PaperProps={{
          sx: {
            borderRadius: "20px",
          },
        }}
      >
        <DialogTitle>Delete Category</DialogTitle>
        <DialogContent sx={{ pt: 2.5 }}>
          <Stack spacing={1.5}>
            <Typography sx={{ color: "var(--muted-foreground)" }}>
              This will soft-delete <strong>{selectedCategory?.name ?? "this category"}</strong>. Existing menu records should remain intact, but the category will no longer appear for new assignment.
            </Typography>
            {error ? <Typography sx={{ color: "var(--status-inactive-fg)", fontSize: "0.9rem" }}>{error}</Typography> : null}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button
            variant="outlined"
            onClick={() => setDeleteDialogOpen(false)}
            disabled={deleting}
            sx={{ borderRadius: "12px", borderColor: "var(--border)", color: "var(--foreground)" }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleDelete}
            disabled={deleting}
            sx={{ borderRadius: "12px" }}
          >
            {deleting ? "Deleting..." : "Delete Category"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

