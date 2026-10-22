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
  CircularProgress,
} from "@mui/material";

import SearchIcon from "@mui/icons-material/Search";
import FileDownloadOutlinedIcon from "@mui/icons-material/FileDownloadOutlined";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import DeleteOutlineOutlinedIcon from "@mui/icons-material/DeleteOutlineOutlined";

import {
  deleteMenu,
  getCategories,
  getFoodTypeLabel,
  getMenus,
  resolveMenuImageUrl,
  type CategoryOption,
  type MenuRow,
  updateMenuAvailability,
} from "@/lib/api";
import { useAppSnackbar } from "@/components/common/SnackBar";
import { safeError } from "@/lib/safeError";

import AddEditMenuDialog from "./addEdit";
import MenuViewDialog, { foodTypeTone } from "./view";

type MenuItemType = MenuRow & {
  tag?: string;
  oldPrice?: string;
};

const getAvailabilityLabel = (isAvailable: boolean) =>
  isAvailable ? "Available" : "Unavailable";

const FoodTypeBadge = ({
  foodType,
  size = "md",
}: {
  foodType: MenuRow["foodType"];
  size?: "sm" | "md";
}) => {
  const tone = foodTypeTone[foodType];
  const dot = size === "sm" ? 6 : 7;

  return (
    <Box
      component="span"
      sx={{
        display: "inline-flex",
        alignItems: "center",
        gap: size === "sm" ? "4px" : "5px",
        height: size === "sm" ? 22 : 24,
        px: size === "sm" ? 0.7 : 0.85,
        borderRadius: "999px",
        backgroundColor: `color-mix(in srgb, ${tone} 14%, transparent)`,
        border: `1px solid color-mix(in srgb, ${tone} 55%, transparent)`,
        color: tone,
        fontSize: size === "sm" ? "0.7rem" : "0.74rem",
        fontWeight: 850,
        lineHeight: 1,
        whiteSpace: "nowrap",
      }}
    >
      <Box
        component="span"
        sx={{ width: dot, height: dot, borderRadius: "50%", flexShrink: 0, backgroundColor: tone }}
      />
      {getFoodTypeLabel(foodType)}
    </Box>
  );
};

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

const MenuMobileCard = ({
  item,
  onView,
  onEdit,
  onDelete,
  onToggleAvailability,
  updatingStatusId,
}: {
  item: MenuItemType;
  onView: (item: MenuItemType) => void;
  onEdit: (item: MenuItemType) => void;
  onDelete: (item: MenuItemType) => void;
  onToggleAvailability: (item: MenuItemType) => void;
  updatingStatusId: number | null;
}) => (
  <Paper
    sx={{
      p: 1.75,
      borderRadius: "18px",
      border: "1px solid var(--border)",
      backgroundColor: "var(--background)",
      minWidth: 0,
      overflow: "hidden",
    }}
  >
    <Stack spacing={1.5}>
      <Stack spacing={1}>
        <Stack direction="row" spacing={1.5} alignItems="flex-start">
          <Box
            sx={{
              width: 62,
              height: 62,
              borderRadius: "14px",
              overflow: "hidden",
              backgroundColor: "var(--background)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <MenuThumb item={item} />
          </Box>

          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography
              sx={{
                fontWeight: 850,
                fontSize: "1.02rem",
                lineHeight: 1.25,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
              title={item.name}
            >
              {capitalize(item.name)}
            </Typography>
            <Typography sx={{ fontSize: "0.82rem", color: "var(--muted-foreground)", mt: 0.25 }}>
              {capitalize(item.category)}
            </Typography>
          </Box>
        </Stack>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Box />
          <Chip
            clickable={updatingStatusId !== item.id}
            disabled={updatingStatusId === item.id}
            label={
              updatingStatusId === item.id
                ? "Updating"
                : item.isAvailable
                  ? "Active"
                  : "Off"
            }
            size="small"
            onClick={() => updatingStatusId !== item.id && onToggleAvailability(item)}
            sx={{
              flexShrink: 0,
              backgroundColor:
                updatingStatusId === item.id
                  ? "#e5e7eb"
                  : item.isAvailable
                    ? "var(--status-active-bg)"
                    : "var(--status-inactive-bg)",
              color:
                updatingStatusId === item.id
                  ? "#6b7280"
                  : item.isAvailable
                    ? "var(--status-active-fg)"
                    : "var(--status-inactive-fg)",
              border: "1px solid",
              borderColor:
                updatingStatusId === item.id
                  ? "var(--status-neutral-border)"
                  : item.isAvailable
                    ? "var(--status-active-border)"
                    : "var(--status-inactive-border)",
              fontWeight: 800,
              cursor: updatingStatusId === item.id ? "wait" : "pointer",
              opacity: 1,
            }}
          />
        </Stack>
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
        <Stack direction="row" justifyContent="space-between" spacing={1.5}>
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ color: "var(--muted-foreground)", fontSize: "0.78rem", fontWeight: 800, mb: 0.5 }}>
              Type
            </Typography>
            <FoodTypeBadge foodType={item.foodType} />
          </Box>
          <Box sx={{ textAlign: "right", flexShrink: 0 }}>
            <Typography sx={{ color: "var(--muted-foreground)", fontSize: "0.78rem", fontWeight: 800 }}>
              Price
            </Typography>
            <Typography sx={{ fontWeight: 850 }}>Rs. {item.price}</Typography>
          </Box>
        </Stack>
        <Typography
          sx={{
            fontSize: "0.86rem",
            color: "var(--muted-foreground)",
            lineHeight: 1.45,
            mt: 1,
            overflowWrap: "anywhere",
          }}
        >
          {item.description || "No description provided."}
        </Typography>
      </Paper>

      <Stack direction="row" spacing={0.75} alignItems="center">
        <Button variant="contained" size="small" onClick={() => onView(item)} sx={{ borderRadius: "12px", flex: 1, minWidth: 0 }}>
          View
        </Button>
        <IconButton size="small" onClick={() => onEdit(item)} sx={{ width: 36, height: 36, border: "1px solid var(--border)", borderRadius: "12px", color: "var(--primary)" }}>
          <EditOutlinedIcon fontSize="small" />
        </IconButton>
        <IconButton size="small" color="error" onClick={() => onDelete(item)} sx={{ width: 36, height: 36, border: "1px solid var(--border)", borderRadius: "12px" }}>
          <DeleteOutlineOutlinedIcon fontSize="small" />
        </IconButton>
      </Stack>
    </Stack>
  </Paper>
);

export default function MenuManagementPage() {
  const searchId = React.useId();

  const [searchTerm, setSearchTerm] = React.useState("");
  const deferredSearchTerm = React.useDeferredValue(searchTerm);

  const [availabilityFilter, setAvailabilityFilter] = React.useState<
    "all" | "available" | "unavailable"
  >("all");

  const [editorItem, setEditorItem] =
    React.useState<MenuItemType | null>(null);

  const [editorOpen, setEditorOpen] = React.useState(false);

  const [viewItem, setViewItem] =
    React.useState<MenuItemType | null>(null);

  const [statusItem, setStatusItem] =
    React.useState<MenuItemType | null>(null);
  const [statusSaving, setStatusSaving] = React.useState(false);
  const [updatingStatusId, setUpdatingStatusId] = React.useState<
    number | null
  >(null);
  const [menus, setMenus] = React.useState<MenuItemType[]>([]);
  const [categories, setCategories] = React.useState<CategoryOption[]>([]);
  const [loading, setLoading] = React.useState(true);

  const [categoryFilter, setCategoryFilter] =
    React.useState("All Categories");

  const [page, setPage] = React.useState(0);
  const [rowsPerPage, setRowsPerPage] = React.useState(10);
  const [totalRows, setTotalRows] = React.useState(0);
  const { showSnackbar } = useAppSnackbar();

  const skeletonRows = Array.from({ length: 5 }, (_, index) => index);

  const fetchMenus = React.useCallback(
    async (options?: {
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
        showSnackbar(safeError(error, "Unable to load menu items."), "error");
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const loadCategories = React.useCallback(async () => {
    try {
      const data = await getCategories();
      setCategories(data);
    } catch (error) {
      console.error("Error fetching categories:", error);
      showSnackbar(safeError(error, "Unable to load categories."), "warning");
    }
  }, [showSnackbar]);

  React.useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  React.useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      fetchMenus({
        search: deferredSearchTerm,
        categoryId:
          categoryFilter === "All Categories"
            ? undefined
            : Number(categoryFilter),
        availability: availabilityFilter,
        page: page + 1,
        perPage: rowsPerPage,
      });
    }, 350);

    return () => window.clearTimeout(timeoutId);
  }, [
    availabilityFilter,
    categoryFilter,
    deferredSearchTerm,
    fetchMenus,
    page,
    rowsPerPage,
  ]);

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

    const headers = [
      "Menu Name",
      "Category",
      "Availability",
      "Food Type",
      "Price",
      "Description",
      "Created At",
    ];

    const csvLines = [
      headers.join(","),
      ...rows.map((row) =>
        headers
          .map(
            (header) =>
              `"${String(
                row[header as keyof typeof row] ?? ""
              ).replace(/"/g, '""')}"`
          )
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

  // UPDATED
  const handleStatusChange = async (
    item: MenuItemType,
    nextAvailability: boolean
  ) => {
    setUpdatingStatusId(item.id);

    try {
      setMenus((prev) =>
        prev.map((menu) =>
          menu.id === item.id
            ? {
              ...menu,
              isAvailable: nextAvailability,
            }
            : menu
        )
      );

      await updateMenuAvailability(item, nextAvailability);
      showSnackbar(
        `${item.name} has been ${nextAvailability ? "marked available" : "marked unavailable"}.`,
        "warning"
      );

      await fetchMenus({
        search: deferredSearchTerm,
        categoryId:
          categoryFilter === "All Categories"
            ? undefined
            : Number(categoryFilter),
        availability: availabilityFilter,
        page: page + 1,
        perPage: rowsPerPage,
      });

      setStatusItem(null);
    } catch (error) {
      console.error("Error updating menu availability:", error);

      // rollback
      setMenus((prev) =>
        prev.map((menu) =>
          menu.id === item.id
            ? {
              ...menu,
              isAvailable: item.isAvailable,
            }
            : menu
        )
      );
    } finally {
      setUpdatingStatusId(null);
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
        categoryId:
          categoryFilter === "All Categories"
            ? undefined
            : Number(categoryFilter),
        availability: availabilityFilter,
        page: page + 1,
        perPage: rowsPerPage,
      });
      showSnackbar(`${item.name} has been deleted successfully.`, "success");
    } catch (error) {
      console.error("Error deleting menu:", error);
      showSnackbar(safeError(error, "Failed to delete menu item."), "error");
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
              Catalog
            </Typography>
            <Typography sx={{ fontSize: { xs: "1.25rem", md: "2rem" }, fontWeight: 900, mt: 0.4, lineHeight: 1.1 }}>
              Menu Management
            </Typography>
            <Typography sx={{ color: "var(--muted-foreground)", fontSize: { xs: "0.88rem", md: "0.95rem" }, mt: 0.5, fontWeight: 650 }}>
              Manage items, pricing, availability and categories
            </Typography>
          </Box>
          <Stack direction="row" spacing={1.25} sx={{ width: { xs: "100%", sm: "auto" } }}>
            <Button
              variant="outlined"
              startIcon={<FileDownloadOutlinedIcon />}
              onClick={handleExport}
              sx={{
                borderRadius: "14px",
                borderColor: "var(--border)",
                color: "var(--foreground)",
                backgroundColor: "var(--card)",
                flex: { xs: 1, sm: "initial" },
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
                boxShadow: "0 12px 24px color-mix(in srgb, var(--primary) 24%, transparent)",
                flex: { xs: 1, sm: "initial" },
              }}
            >
              Add Menu
            </Button>
          </Stack>
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
        <Box
          sx={{
            display: "grid",
            gap: 2,
              p: { xs: 1.25, md: 2 },
              borderBottom: "1px solid var(--border)",
            }}
          >
          <Box
            sx={{
              display: "grid",
              gap: { xs: 1, md: 1.5 },
              gridTemplateColumns: {
                xs: "repeat(2, minmax(0, 1fr))",
                sm: "repeat(2, minmax(0, 1fr))",
                lg: "2fr 1fr 1fr",
              },
              alignItems: "center",
            }}
          >
            <TextField
              id={searchId}
              placeholder="Search menu items..."
              size="small"
              value={searchTerm}
              onChange={(event) =>
                setSearchTerm(event.target.value)
              }
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon
                      sx={{
                        color: "var(--muted-foreground)",
                      }}
                    />
                  </InputAdornment>
                ),
              }}
              sx={{
                gridColumn: { xs: "1 / -1", sm: "1 / -1", lg: "auto" },
                "& .MuiOutlinedInput-root": {
                  borderRadius: "999px",
                  backgroundColor: "var(--background)",
                },
              }}
            />

            <Select
              size="small"
              value={categoryFilter}
              onChange={(event) =>
                setCategoryFilter(event.target.value)
              }
              displayEmpty
              sx={{ borderRadius: "999px", backgroundColor: "var(--background)" }}
            >
              <MenuItem value="All Categories">
                All Categories
              </MenuItem>

              {categories.map((category) => (
                <MenuItem
                  key={category.id}
                  value={String(category.id)}
                >
                  {category.name}
                </MenuItem>
              ))}
            </Select>

            <Select
              size="small"
              value={availabilityFilter}
              onChange={(event) =>
                setAvailabilityFilter(
                  event.target.value as
                  | "all"
                  | "available"
                  | "unavailable"
                )
              }
              displayEmpty
              sx={{ borderRadius: "999px", backgroundColor: "var(--background)" }}
            >
              <MenuItem value="all">
                All Availability
              </MenuItem>

              <MenuItem value="available">
                Available Items
              </MenuItem>

              <MenuItem value="unavailable">
                Unavailable Items
              </MenuItem>
            </Select>
          </Box>
        </Box>

        <Box
          sx={{
            display: { xs: "grid", md: "none" },
            gap: 1.5,
            p: 1.5,
          }}
        >
          {loading ? (
            skeletonRows.map((item) => (
              <Paper
                key={`mobile-menu-skeleton-${item}`}
                sx={{
                  p: 2,
                  borderRadius: "18px",
                  border: "1px solid var(--border)",
                }}
              >
                <Stack spacing={1.5}>
                  <Stack direction="row" spacing={1.5}>
                    <Skeleton variant="rounded" width={56} height={56} />
                    <Box sx={{ flex: 1 }}>
                      <Skeleton variant="text" width="60%" height={28} />
                      <Skeleton variant="text" width="40%" height={20} />
                      <Skeleton variant="text" width="35%" height={20} />
                    </Box>
                  </Stack>
                  <Skeleton variant="text" width="100%" height={22} />
                  <Skeleton variant="rounded" width={120} height={28} sx={{ borderRadius: "999px" }} />
                  <Stack direction="row" spacing={1}>
                    <Skeleton variant="rounded" width={72} height={34} sx={{ borderRadius: "12px" }} />
                    <Skeleton variant="rounded" width={72} height={34} sx={{ borderRadius: "12px" }} />
                    <Skeleton variant="rounded" width={72} height={34} sx={{ borderRadius: "12px" }} />
                  </Stack>
                </Stack>
              </Paper>
            ))
          ) : menus.length ? (
            menus.map((item) => (
              <MenuMobileCard
                key={item.id}
                item={item}
                onView={(menuItem) => setViewItem(menuItem)}
                onEdit={openEditDialog}
                onDelete={handleDelete}
                onToggleAvailability={async (menuItem) => {
                  try {
                    setUpdatingStatusId(menuItem.id);
                    await updateMenuAvailability(menuItem, !menuItem.isAvailable);
                    setMenus((prev) =>
                      prev.map((menu) =>
                        menu.id === menuItem.id
                          ? { ...menu, isAvailable: !menu.isAvailable }
                          : menu
                      )
                    );
                    showSnackbar(
                      `${menuItem.name} has been ${!menuItem.isAvailable ? "marked available" : "marked unavailable"
                      }.`,
                      "warning"
                    );
                  } catch (error) {
                    console.error("Error updating menu availability:", error);
                    showSnackbar(safeError(error, "Failed to update menu availability."), "error");
                  } finally {
                    setUpdatingStatusId(null);
                  }
                }}
                updatingStatusId={updatingStatusId}
              />
            ))
          ) : (
            <Typography sx={{ textAlign: "center", color: "var(--muted-foreground)" }}>
              No menu items found.
            </Typography>
          )}
        </Box>

        {/* DIALOGS */}
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
          onCategoryCreated={loadCategories}
        />

        <MenuViewDialog
          open={Boolean(viewItem)}
          item={viewItem}
          onClose={() => setViewItem(null)}
        />

        {/* STATUS DIALOG */}
        <Dialog
          open={Boolean(statusItem)}
          onClose={() =>
            statusSaving
              ? undefined
              : setStatusItem(null)
          }
          fullWidth
          maxWidth="xs"
        >
          <DialogTitle>
            Update Availability
          </DialogTitle>

          <DialogContent>
            <Typography
              sx={{
                color: "var(--muted-foreground)",
              }}
            >
              Choose whether{" "}
              <strong>
                {statusItem
                  ? capitalize(statusItem.name)
                  : "this item"}
              </strong>{" "}
              should be active.
            </Typography>
          </DialogContent>

          <DialogActions
            sx={{
              p: 2,
              pt: 0,
            }}
          >
            <Stack
              direction="row"
              spacing={1.25}
              sx={{ width: "100%" }}
            >
              <Button
                fullWidth
                variant="outlined"
                disabled={statusSaving}
                onClick={() =>
                  statusItem &&
                  handleStatusChange(statusItem, false)
                }
              >
                {statusSaving &&
                  statusItem &&
                  !statusItem.isAvailable ? (
                  <CircularProgress size={18} />
                ) : (
                  "Make Inactive"
                )}
              </Button>

              <Button
                fullWidth
                variant="contained"
                disabled={statusSaving}
                onClick={() =>
                  statusItem &&
                  handleStatusChange(statusItem, true)
                }
              >
                {statusSaving &&
                  statusItem &&
                  statusItem.isAvailable ? (
                  <CircularProgress
                    size={18}
                    sx={{ color: "#fff" }}
                  />
                ) : (
                  "Make Active"
                )}
              </Button>
            </Stack>
          </DialogActions>
        </Dialog>

        {/* TABLE */}
        <Table
          sx={{
            display: {
              xs: "none",
              md: "table",
            },
            tableLayout: "fixed",
          }}
        >
          <TableHead>
            <TableRow
              sx={{
                backgroundColor: "var(--background)",
              }}
            >
              <TableCell sx={{ width: 100 }}>Image</TableCell>
              <TableCell>Menu Name</TableCell>
              <TableCell sx={{ width: "18%" }}>Category</TableCell>
              <TableCell sx={{ width: "10%" }}>Price</TableCell>
              <TableCell sx={{ width: 140 }}>Status</TableCell>
              <TableCell align="center" sx={{ width: 160 }}>
                Actions
              </TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {loading ? (
              skeletonRows.map((item) => (
                <TableRow key={item}>
                  <TableCell>
                    <Skeleton
                      variant="rounded"
                      width={48}
                      height={48}
                    />
                  </TableCell>

                  <TableCell>
                    <Skeleton width="70%" />
                  </TableCell>

                  <TableCell>
                    <Skeleton width="50%" />
                  </TableCell>

                  <TableCell>
                    <Skeleton width="40%" />
                  </TableCell>

                  <TableCell>
                    <Skeleton
                      variant="rounded"
                      width={90}
                      height={28}
                    />
                  </TableCell>

                  <TableCell>
                    <Skeleton width="80%" />
                  </TableCell>
                </TableRow>
              ))
            ) : menus.length ? (
              menus.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <Box
                      sx={{
                        width: 62,
                        height: 62,
                        borderRadius: "14px",
                        overflow: "hidden",
                        backgroundColor:
                          "var(--background)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <MenuThumb item={item} />
                    </Box>
                  </TableCell>

                  <TableCell>
                    <Typography
                      sx={{ fontWeight: 600 }}
                    >
                      {capitalize(item.name)}
                    </Typography>

                    <Box sx={{ mt: 0.4 }}>
                      <FoodTypeBadge foodType={item.foodType} size="sm" />
                    </Box>
                  </TableCell>

                  <TableCell>
                    {capitalize(item.category)}
                  </TableCell>

                  <TableCell>
                    {item.price}
                  </TableCell>

                  <TableCell>
                    <Chip
                      clickable={updatingStatusId !== item.id}
                      label={
                        updatingStatusId === item.id
                          ? "Updating..."
                          : getAvailabilityLabel(item.isAvailable)
                      }
                      size="medium"
                      disabled={updatingStatusId === item.id}
                      onClick={async () => {
                        try {
                          setUpdatingStatusId(item.id);

                          await updateMenuAvailability(
                            item,
                            !item.isAvailable
                          );

                          setMenus((prev) =>
                            prev.map((menu) =>
                              menu.id === item.id
                                ? {
                                  ...menu,
                                  isAvailable: !menu.isAvailable,
                                }
                                : menu
                            )
                          );
                          showSnackbar(
                            `${item.name} has been ${!item.isAvailable ? "marked available" : "marked unavailable"
                            }.`,
                            "warning"
                          );
                        } catch (error) {
                          console.error(
                            "Error updating menu availability:",
                            error
                          );
                          showSnackbar(safeError(error, "Failed to update menu availability."), "error");
                        } finally {
                          setUpdatingStatusId(null);
                        }
                      }}
                      sx={
                        updatingStatusId === item.id
                          ? {
                            backgroundColor: "#e5e7eb",
                            color: "#6b7280",
                            fontWeight: 600,
                            cursor: "wait",
                          }
                          : item.isAvailable
                            ? {
                              backgroundColor:
                                "var(--status-active-bg)",
                              color: "var(--status-active-fg)",
                              border: "1px solid var(--status-active-border)",
                              fontWeight: 600,
                              cursor: "pointer",
                              opacity: 1,
                            }
                            : {
                              backgroundColor:
                                "var(--status-inactive-bg)",
                              color: "var(--status-inactive-fg)",
                              border: "1px solid var(--status-inactive-border)",
                              fontWeight: 600,
                              cursor: "pointer",
                              opacity: 1,
                            }
                      }
                    />
                  </TableCell>

                  <TableCell align="center">
                    <IconButton
                      size="small"
                      onClick={() =>
                        setViewItem(item)
                      }
                    >
                      <VisibilityOutlinedIcon />
                    </IconButton>

                    <IconButton
                      size="small"
                      onClick={() =>
                        openEditDialog(item)
                      }
                    >
                      <EditOutlinedIcon />
                    </IconButton>

                    <IconButton
                      size="small"
                      sx={{ color: "var(--status-inactive-fg)" }}
                      onClick={() =>
                        handleDelete(item)
                      }
                    >
                      <DeleteOutlineOutlinedIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={6}
                  sx={{
                    textAlign: "center",
                    py: 5,
                  }}
                >
                  No menu items found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        {/* PAGINATION */}
        <TablePagination
          component="div"
          count={totalRows}
          page={page}
          onPageChange={(_event, nextPage) =>
            setPage(nextPage)
          }
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(event) => {
            setRowsPerPage(
              Number(event.target.value)
            );

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

