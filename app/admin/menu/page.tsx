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
import { getMenus, resolveMenuImageUrl, type MenuRow, updateMenuAvailability, deleteMenu } from "@/lib/api";
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
  const [editorItem, setEditorItem] = React.useState<MenuItemType | null>(null);
  const [editorOpen, setEditorOpen] = React.useState(false);
  const [viewItem, setViewItem] = React.useState<MenuItemType | null>(null);
  const [statusItem, setStatusItem] = React.useState<MenuItemType | null>(null);
  const [statusSaving, setStatusSaving] = React.useState(false);
  const [menus, setMenus] = React.useState<MenuItemType[]>([]);
  const [loading, setLoading] = React.useState(true);
  const skeletonRows = Array.from({ length: 5 }, (_, index) => index);

  const fetchMenus = React.useCallback(async () => {
    setLoading(true);
    try {
      const data = await getMenus();
      setMenus(data);
    } catch (error) {
      console.error("Error fetching menus:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchMenus();
  }, [fetchMenus]);

  const handleStatusChange = async (nextAvailability: boolean) => {
    if (!statusItem) return;

    setStatusSaving(true);
    try {
      await updateMenuAvailability(statusItem, nextAvailability);
      const refreshedMenus = await getMenus();
      setMenus(refreshedMenus);
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
      const refreshedMenus = await getMenus();
      setMenus(refreshedMenus);
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
          <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", md: "1.6fr 1fr 1fr 1fr" } }}>
            <TextField
              id={searchId}
              placeholder="Search menu items..."
              size="small"
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
            <Select size="small" defaultValue="All Categories" sx={{ borderRadius: "12px" }}>
              <MenuItem value="All Categories">All Categories</MenuItem>
            </Select>
            <Select size="small" defaultValue="All Status" sx={{ borderRadius: "12px" }}>
              <MenuItem value="All Status">All Status</MenuItem>
            </Select>
            <Select size="small" defaultValue="All Availability" sx={{ borderRadius: "12px" }}>
              <MenuItem value="All Availability">All Availability</MenuItem>
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
          onSaved={fetchMenus}
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
            )) : menus.length != 0 ? menus.map((item) => (
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
                    {item.veg ? "Veg" : "Non-Veg"}
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
      </Paper>
    </Box>
  );
}
