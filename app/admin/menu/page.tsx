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
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import FileDownloadOutlinedIcon from "@mui/icons-material/FileDownloadOutlined";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import DeleteOutlineOutlinedIcon from "@mui/icons-material/DeleteOutlineOutlined";

const menuItems = [
  {
    name: "Margherita Pizza",
    category: "Pizza",
    price: "$10.99",
    oldPrice: "$12.99",
    prep: "15 min",
    status: "Active",
    tag: "Bestseller",
    veg: true,
  },
  {
    name: "Caesar Salad",
    category: "Salads",
    price: "$8.99",
    oldPrice: null,
    prep: "8 min",
    status: "Active",
    tag: null,
    veg: true,
  },
  {
    name: "Chicken Tikka Masala",
    category: "Main Course",
    price: "$15.99",
    oldPrice: null,
    prep: "25 min",
    status: "Active",
    tag: "Bestseller",
    veg: false,
  },
];

export default function MenuManagementPage() {
  const searchId = React.useId();
  return (
    <Box sx={{ p: { xs: 2, md: 3 }, display: "grid", gap: 3 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700, mt: 0.5 }}>
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

        <Table>
          <TableHead>
            <TableRow sx={{ backgroundColor: "var(--background)" }}>
              <TableCell padding="checkbox" />
              <TableCell>Image</TableCell>
              <TableCell>Menu Name</TableCell>
              <TableCell>Category</TableCell>
              <TableCell>Price</TableCell>
              <TableCell>Prep Time</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {menuItems.length != 0 ? menuItems.map((item) => (
              <TableRow key={item.name}>
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
                      fontSize: "1.2rem",
                    }}
                  >
                    {item.veg ? "??" : "??"}
                  </Box>
                </TableCell>
                <TableCell>
                  <Typography sx={{ fontWeight: 600 }}>{item.name}</Typography>
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
                <TableCell>{item.category}</TableCell>
                <TableCell>
                  <Typography sx={{ fontWeight: 600 }}>{item.price}</Typography>
                  {item.oldPrice && (
                    <Typography sx={{ fontSize: "0.8rem", color: "var(--muted-foreground)" }}>
                      {item.oldPrice}
                    </Typography>
                  )}
                </TableCell>
                <TableCell>{item.prep}</TableCell>
                <TableCell>
                  <Chip
                    label={item.status}
                    size="small"
                    sx={{
                      backgroundColor: "rgba(46, 230, 166, 0.12)",
                      color: "#2EE6A6",
                      fontWeight: 600,
                    }}
                  />
                </TableCell>
                <TableCell align="center">
                  <IconButton size="small" sx={{ color: "var(--muted-foreground)" }}>
                    <VisibilityOutlinedIcon />
                  </IconButton>
                  <IconButton size="small" sx={{ color: "var(--primary)" }}>
                    <EditOutlinedIcon />
                  </IconButton>
                  <IconButton size="small" sx={{ color: "#FF5A7A" }}>
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
