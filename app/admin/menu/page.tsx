"use client";

import * as React from "react";
import {
  Box,
  Button,
  Paper,
  Typography,
  TextField,
  InputAdornment,
  Select,
  MenuItem,
  TablePagination,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Skeleton,
  capitalize,
  Stack,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import FileDownloadOutlinedIcon from "@mui/icons-material/FileDownloadOutlined";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import DeleteOutlineOutlinedIcon from "@mui/icons-material/DeleteOutlineOutlined";
import { deleteMenu, getCategories, getFoodTypeLabel, getMenus, resolveMenuImageUrl, type CategoryOption, type MenuRow, updateMenuAvailability } from "@/lib/api";
import AddEditMenuDialog from "./addEdit";
import MenuViewDialog from "./view";

type MenuItemType = MenuRow & {
  tag?: string;
  oldPrice?: string;
};

const getAvailabilityLabel = (isAvailable: boolean) =>
  isAvailable ? "Available" : "Unavailable";

const MenuThumb = ({ item }: { item: MenuItemType }) => {
  const imageSrc = resolveMenuImageUrl(item.imageUrl);

  if (imageSrc) {
    return (
      <Box
        component="img"
        src={imageSrc}
        alt={item.name}
        sx={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          display: "block",
        }}
      />
    );
  }

  return <>{item.veg ? "V" : "NV"}</>;
};

export default function MenuManagementPage() {
  const searchId = React.useId();
  const [searchTerm, setSearchTerm] = React.useState("");
  const deferredSearchTerm = React.useDeferredValue(searchTerm);
  const [availabilityFilter, setAvailabilityFilter] = React.useState<"all" | "available" | "unavailable">("all");
  const [editorItem, setEditorItem] = React.useState<MenuItemType | null>(null);
  const [editorOpen, setEditorOpen] = React.useState(false);
  const [viewItem, setViewItem] = React.useState<MenuItemType | null>(null);
  const [statusItem, setStatusItem] = React.useState<MenuItemType | null>(null);
  const [statusSaving, setStatusSaving] = React.useState(false);
  const [menus, setMenus] = React.useState<MenuItemType[]>([]);
  const [categories, setCategories] = React.useState<CategoryOption[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [categoryFilter, setCategoryFilter] = React.useState("All Categories");
  const [page, setPage] = React.useState(0);
  const [rowsPerPage, setRowsPerPage] = React.useState(10);
  const [totalRows, setTotalRows] = React.useState(0);
  const skeletonRows = Array.from({ length: 5 }, (_, index) => index);

  const fetchMenus = React.useCallback(async (options?: {
    search?: string;
    categoryId?: number;
    availability?: "all" | "available" | "unavailable";
    page?: number;
    perPage?: number;
  }) => {
    setLoading(true);
    try {
      const data = await getMenus(options);
      setMenus(data.items);
      setTotalRows(data.total);
    } catch (error) {
      console.error("Error fetching menus:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    const loadCategories = async () => {
      try {
        const data = await getCategories();
        setCategories(data);
      } catch (error) {
        console.error("Error fetching categories:", error);
      }
    };

    loadCategories();
  }, []);

  React.useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      fetchMenus({
        search: deferredSearchTerm,
        categoryId: categoryFilter === "All Categories" ? undefined : Number(categoryFilter),
        availability: availabilityFilter,
        page: page + 1,
        perPage: rowsPerPage,
      });
    }, 350);

    return () => window.clearTimeout(timeoutId);
  }, [availabilityFilter, categoryFilter, deferredSearchTerm, fetchMenus, page, rowsPerPage]);

  React.useEffect(() => {
    setPage(0);
  }, [availabilityFilter, categoryFilter, deferredSearchTerm]);

  const handleExport = () => {
    const rows = menus.map((item) => ({
      "Menu Name": item.name,
      Category: item.category,
      Availability: getAvailabilityLabel(item.isAvailable),
      "Food Type": getFoodTypeLabel(item.foodType),
      Price: item.price,
      Description: item.description,
      "Created At": new Date(item.createdAt).toLocaleString(),
    }));

    const headers = ["Menu Name", "Category", "Availability", "Food Type", "Price", "Description", "Created At"];
    const csvLines = [
      headers.join(","),
      ...rows.map((row) =>
        headers
          .map((header) => `"${String(row[header as keyof typeof row] ?? "").replace(/"/g, '""')}"`)
          .join(",")
      ),
    ];

    const blob = new Blob(["\uFEFF" + csvLines.join("\r\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const stamp = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.download = `menu-management-${stamp}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleStatusChange = async (nextAvailability: boolean) => {
    if (!statusItem) return;

    setStatusSaving(true);
    try {
      await updateMenuAvailability(statusItem, nextAvailability);
      await fetchMenus({
        search: deferredSearchTerm,
        categoryId: categoryFilter === "All Categories" ? undefined : Number(categoryFilter),
        availability: availabilityFilter,
        page: page + 1,
        perPage: rowsPerPage,
      });
      setStatusItem(null);
    } catch (error) {
      console.error("Error updating menu availability:", error);
    } finally {
      setStatusSaving(false);
    }
  };

  const openCreateDialog = () => {
    setEditorItem(null);
    setEditorOpen(true);
  };

  const openEditDialog = (item: MenuItemType) => {
    setEditorItem(item);
    setEditorOpen(true);
  };

  const handleDelete = async (item: MenuItemType) => {
    try {
      await deleteMenu(item.id);
      await fetchMenus({
        search: deferredSearchTerm,
        categoryId: categoryFilter === "All Categories" ? undefined : Number(categoryFilter),
        availability: availabilityFilter,
        page: page + 1,
        perPage: rowsPerPage,
      });
    } catch (error) {
      console.error("Error deleting menu:", error);
    }
  };



  return (
    <Box sx={{ p: { xs: 1, md: 2 }, display: "grid", gap: 3 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700, mt: 0.5, fontSize: { xs: "1.25rem", md: "2.125rem" } }}>
            Menu Management
          </Typography>
          <Typography sx={{ color: "var(--muted-foreground)", mt: 0.5 }}>
            Manage your restaurant menu items
          </Typography>
        </Box>
        <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap" }}>
          <Button
            variant="outlined"
            startIcon={<FileDownloadOutlinedIcon />}
            onClick={handleExport}
            sx={{
              borderRadius: "14px",
              borderColor: "var(--border)",
              color: "var(--foreground)",
              backgroundColor: "var(--card)",
            }}
          >
            Export
          </Button>
          <Button
            variant="contained"
            startIcon={<AddRoundedIcon />}
            onClick={openCreateDialog}
            sx={{
              borderRadius: "14px",
              backgroundColor: "var(--primary)",
              color: "var(--primary-foreground)",
              boxShadow: "0 12px 24px rgba(79, 139, 255, 0.25)",
            }}
          >
            Add New Menu
          </Button>
        </Box>
      </Box>

      <Paper
        sx={{
          borderRadius: "22px",
          border: "1px solid var(--border)",
          backgroundColor: "var(--card)",
          overflow: "hidden",
        }}
      >
        <Box sx={{ display: "grid", gap: 2, p: 2.5, borderBottom: "1px solid var(--border)" }}>
          <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", md: "1.8fr 1fr 1fr" } }}>
            <TextField
              id={searchId}
              placeholder="Search menu items..."
              size="small"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: "var(--muted-foreground)" }} />
                  </InputAdornment>
                ),
              }}
              sx={{
                "& .MuiOutlinedInput-root": {
                  borderRadius: "12px",
                  backgroundColor: "var(--background)",
                },
              }}
            />
            <Select
              size="small"
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value)}
              sx={{ borderRadius: "12px" }}
            >
              <MenuItem value="All Categories">All Categories</MenuItem>
              {categories.map((category) => (
                <MenuItem key={category.id} value={String(category.id)}>
                  {category.name}
                </MenuItem>
              ))}
            </Select>
            <Select
              size="small"
              value={availabilityFilter}
              onChange={(event) => setAvailabilityFilter(event.target.value as "all" | "available" | "unavailable")}
              sx={{ borderRadius: "12px" }}
            >
              <MenuItem value="all">All Availability</MenuItem>
              <MenuItem value="available">Available Items</MenuItem>
              <MenuItem value="unavailable">Unavailable Items</MenuItem>
            </Select>
          </Box>
        </Box>

        <Box sx={{ display: { xs: "grid", md: "none" }, gap: 2, p: 2.5 }}>
          {loading ? (
            skeletonRows.map((item) => (
              <Paper
                key={`mobile-skeleton-${item}`}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 2,
                  p: 2,
                  borderRadius: "16px",
                  border: "1px solid var(--border)",
                  backgroundColor: "var(--card)",
                }}
              >
                <Skeleton variant="rounded" width={44} height={44} sx={{ borderRadius: "12px" }} />
                <Box sx={{ flex: 1, display: "grid", gap: 1 }}>
                  <Skeleton variant="text" width="70%" height={28} />
                  <Skeleton variant="text" width="45%" height={20} />
                </Box>
                <Skeleton variant="circular" width={32} height={32} />
              </Paper>
            ))
          ) : menus.length !== 0 ? (
            menus.map((item) => (
              <Paper
                key={item.name}
                onClick={() => openEditDialog(item)}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 2,
                  p: 2,
                  borderRadius: "16px",
                  border: "1px solid var(--border)",
                  backgroundColor: "var(--card)",
                  cursor: "pointer",
                }}
              >
                <Box
                  sx={{
                    width: 44,
                    height: 44,
                    borderRadius: "12px",
                    backgroundColor: "var(--background)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "0.85rem",
                    fontWeight: 700,
                    color: "var(--foreground)",
                    overflow: "hidden",
                  }}
                >
                  <MenuThumb item={item} />
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography sx={{ fontWeight: 600 }}>{item.name}</Typography>
                  <Typography sx={{ fontSize: "0.8rem", color: "var(--muted-foreground)" }}>
                    {item.category}
                  </Typography>
                  <Chip
                    label={getAvailabilityLabel(item.isAvailable)}
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      setStatusItem(item);
                    }}
                    sx={{
                      mt: 0.75,
                      backgroundColor: item.isAvailable
                        ? "rgba(46, 230, 166, 0.12)"
                        : "rgba(255, 90, 122, 0.12)",
                      color: item.isAvailable ? "#2EE6A6" : "#FF5A7A",
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  />
                </Box>
                <IconButton
                  size="small"
                  sx={{ color: "#FF5A7A" }}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(item);
                  }}
                >
                  <DeleteOutlineOutlinedIcon />
                </IconButton>
              </Paper>
            ))
          ) : (
            <Typography sx={{ textAlign: "center", color: "var(--muted-foreground)" }}>
              No menu items found.
            </Typography>
          )}
        </Box>

        <AddEditMenuDialog
          open={editorOpen}
          initialData={editorItem}
          onClose={() => setEditorOpen(false)}
          onSaved={() =>
            fetchMenus({
              search: deferredSearchTerm,
              availability: availabilityFilter,
            })
          }
        />



        <MenuViewDialog
          open={Boolean(viewItem)}
          item={viewItem}
          onClose={() => setViewItem(null)}
        />

        <Dialog
          open={Boolean(statusItem)}
          onClose={() => (statusSaving ? undefined : setStatusItem(null))}
          fullWidth
          maxWidth="xs"
          PaperProps={{
            sx: {
              borderRadius: "18px",
            },
          }}
        >
          <DialogTitle>Update Availability</DialogTitle>
          <DialogContent>
            <Typography sx={{ color: "var(--muted-foreground)" }}>
              Choose whether <strong>{statusItem ? capitalize(statusItem.name) : "this item"}</strong> should be active.
            </Typography>
          </DialogContent>
          <DialogActions sx={{ p: 2, pt: 0 }}>
            <Stack direction="row" spacing={1.25} sx={{ width: "100%" }}>
              <Button
                fullWidth
                variant="outlined"
                disabled={statusSaving}
                sx={{ borderRadius: "12px", borderColor: "var(--border)", color: "#FF5A7A" }}
                onClick={() => handleStatusChange(false)}
              >
                Make Inactive
              </Button>
              <Button
                fullWidth
                variant="contained"
                disabled={statusSaving}
                sx={{
                  borderRadius: "12px",
                  backgroundColor: "var(--primary)",
                  color: "var(--primary-foreground)",
                }}
                onClick={() => handleStatusChange(true)}
              >
                Make Active
              </Button>
            </Stack>
          </DialogActions>
        </Dialog>

        <Table sx={{ display: { xs: "none", md: "table" } }}>
          <TableHead>
            <TableRow sx={{ backgroundColor: "var(--background)" }}>
              <TableCell padding="checkbox" />
              <TableCell>Image</TableCell>
              <TableCell>Menu Name</TableCell>
              <TableCell>Category</TableCell>
              <TableCell>Price</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? skeletonRows.map((item) => (
              <TableRow key={`desktop-skeleton-${item}`}>
                <TableCell padding="checkbox" />
                <TableCell>
                  <Skeleton variant="rounded" width={48} height={48} sx={{ borderRadius: "14px" }} />
                </TableCell>
                <TableCell>
                  <Skeleton variant="text" width="70%" height={28} />
                  <Skeleton variant="text" width="40%" height={20} />
                </TableCell>
                <TableCell>
                  <Skeleton variant="text" width="75%" height={24} />
                </TableCell>
                <TableCell>
                  <Skeleton variant="text" width="50%" height={24} />
                </TableCell>
                <TableCell>
                  <Skeleton variant="rounded" width={96} height={24} sx={{ borderRadius: "999px" }} />
                </TableCell>
                <TableCell align="center">
                  <Box sx={{ display: "flex", justifyContent: "center", gap: 1 }}>
                    <Skeleton variant="circular" width={28} height={28} />
                    <Skeleton variant="circular" width={28} height={28} />
                    <Skeleton variant="circular" width={28} height={28} />
                  </Box>
                </TableCell>
              </TableRow>
            )) : menus.length !== 0 ? menus.map((item) => (
              <TableRow key={capitalize(item.name)}>
                <TableCell padding="checkbox" />
                <TableCell>
                  <Box
                    sx={{
                      width: 48,
                      height: 48,
                      borderRadius: "14px",
                      backgroundColor: "var(--background)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "0.75rem",
                      fontWeight: 700,
                      color: "var(--foreground)",
                      overflow: "hidden",
                    }}
                  >
                    <MenuThumb item={item} />
                  </Box>
                </TableCell>
                <TableCell>
                  <Typography sx={{ fontWeight: 600 }}>{capitalize(item.name)}</Typography>
                  <Typography sx={{ fontSize: "0.8rem", color: "var(--muted-foreground)" }}>
                    {getFoodTypeLabel(item.foodType)}
                  </Typography>
                  {item.tag && (
                    <Chip
                      label={item.tag}
                      size="small"
                      sx={{
                        mt: 0.5,
                        backgroundColor: "rgba(79, 139, 255, 0.12)",
                        color: "var(--primary)",
                        fontWeight: 600,
                      }}
                    />
                  )}
                </TableCell>
                <TableCell>{capitalize(item.category)}</TableCell>
                <TableCell>
                  <Typography sx={{ fontWeight: 600 }}>{item.price}</Typography>
                  {item.oldPrice && (
                    <Typography sx={{ fontSize: "0.8rem", color: "var(--muted-foreground)" }}>
                      {item.oldPrice}
                    </Typography>
                  )}
                </TableCell>
                <TableCell>
                  <Chip
                    label={getAvailabilityLabel(item.isAvailable)}
                    size="small"
                    onClick={() => setStatusItem(item)}
                    sx={item.isAvailable ? {
                      backgroundColor: "rgba(46, 230, 166, 0.12)",
                      color: "#2EE6A6",
                      fontWeight: 600,
                      cursor: "pointer",
                    } : {
                      backgroundColor: "rgba(255, 90, 122, 0.12)",
                      color: "#FF5A7A",
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  />
                </TableCell>
                <TableCell align="center">
                  <IconButton size="small" sx={{ color: "var(--muted-foreground)" }} onClick={() => setViewItem(item)}>
                    <VisibilityOutlinedIcon />
                  </IconButton>
                  <IconButton size="small" sx={{ color: "var(--primary)" }} onClick={() => openEditDialog(item)}>
                    <EditOutlinedIcon />
                  </IconButton>
                  <IconButton size="small" sx={{ color: "#FF5A7A" }} onClick={() => handleDelete(item)}>
                    <DeleteOutlineOutlinedIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            )) : (
              <TableRow>
                <TableCell colSpan={8} sx={{ textAlign: "center", py: 4 }}>
                  <Typography>No menu items found.</Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        <TablePagination
          component="div"
          count={totalRows}
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
    </Box>
  );
}

