"use client";

import * as React from "react";
import {
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  AppBar,
  Toolbar,
  Typography,
  Stack,
  TextField,
  InputAdornment,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import HomeOutlinedIcon from "@mui/icons-material/HomeOutlined";
import PersonOutlineRoundedIcon from "@mui/icons-material/PersonOutlineRounded";
import RestaurantMenuOutlinedIcon from "@mui/icons-material/RestaurantMenuOutlined";
import ReceiptLongOutlinedIcon from "@mui/icons-material/ReceiptLongOutlined";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import EmailOutlinedIcon from "@mui/icons-material/EmailOutlined";
import PhoneOutlinedIcon from "@mui/icons-material/PhoneOutlined";
import BusinessCenterOutlinedIcon from "@mui/icons-material/BusinessCenterOutlined";
import { usePathname, useRouter } from "next/navigation";
import { clearAuthSession } from "@/lib/api";
import ThemeToggle from "@/components/common/ThemeToggle";
import ProfileComponent from "@/components/common/ProfileComponent";

const drawerWidth = 280;

const navItems = [
  { label: "Dashboard", href: "/admin/dashboard", icon: HomeOutlinedIcon },
  { label: "Profile", href: "/user", icon: PersonOutlineRoundedIcon },
  { label: "Menu", href: "/admin/menu", icon: RestaurantMenuOutlinedIcon },
  { label: "Orders", href: "/admin/orders", icon: ReceiptLongOutlinedIcon },
];

const profileStats = [
  { label: "Orders placed", value: "24" },
  { label: "Active sessions", value: "1" },
  { label: "Saved tables", value: "3" },
];

export default function UserProfilePage() {
  const router = useRouter();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [form, setForm] = React.useState({
    name: "KhajaPOS User",
    email: "user@example.com",
    phone: "9800000000",
    businessName: "Khaja POS",
  });

  const handleChange =
    (key: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement>) => {
      setForm((current) => ({ ...current, [key]: event.target.value }));
    };

  const handleSave = async () => {
    setSaving(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 650));
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await clearAuthSession();
    router.push("/auth/login");
  };

  const drawer = (
    <Box sx={{ px: 2, py: { xs: 2, sm: 15 } }}>
      <Box
        sx={{
          p: 2,
          borderRadius: "20px",
          border: "1px solid var(--sidebar-border)",
          backgroundColor: "color-mix(in srgb, var(--sidebar) 82%, white 18%)",
          mb: 2,
        }}
      >
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Avatar sx={{ bgcolor: "var(--primary)", color: "var(--primary-foreground)" }}>
            <PersonOutlineRoundedIcon />
          </Avatar>
          <Box>
            <Typography sx={{ fontWeight: 800 }}>KhajaPOS</Typography>
            <Typography sx={{ fontSize: "0.85rem", color: "var(--muted-foreground)" }}>
              Account center
            </Typography>
          </Box>
        </Stack>
      </Box>

      <List sx={{ display: "grid", gap: 1 }}>
        {navItems.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;

          return (
            <ListItemButton
              key={item.href}
              onClick={() => {
                router.push(item.href);
                setMobileOpen(false);
              }}
              sx={{
                px: 1.5,
                py: 1.25,
                borderRadius: "16px",
                minHeight: 52,
                border: "1px solid",
                borderColor: active ? "var(--primary)" : "var(--sidebar-border)",
                backgroundColor: active ? "rgba(79, 139, 255, 0.12)" : "transparent",
              }}
            >
              <ListItemIcon sx={{ minWidth: 38 }}>
                <Icon fontSize="small" />
              </ListItemIcon>
              <ListItemText
                primary={item.label}
                primaryTypographyProps={{ fontWeight: active ? 800 : 600 }}
              />
            </ListItemButton>
          );
        })}
      </List>

      <Button
        fullWidth
        variant="outlined"
        startIcon={<LogoutRoundedIcon />}
        onClick={handleLogout}
        sx={{ mt: 2.5, borderRadius: "14px" }}
      >
        Logout
      </Button>
    </Box>
  );

  return (
    <Box sx={{ minHeight: "100vh", backgroundColor: "var(--background)" }}>
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          bgcolor: "color-mix(in srgb, var(--card) 88%, transparent)",
          backdropFilter: "blur(16px)",
          borderBottom: "1px solid var(--border)",
          color: "var(--foreground)",
          zIndex: (theme) => theme.zIndex.drawer + 1,
        }}
      >
        <Toolbar sx={{ minHeight: { xs: 64, md: 76 }, gap: { xs: 1, md: 1.5 }, px: { xs: 1.5, md: 2 } }}>
          <IconButton
            onClick={() => setMobileOpen(true)}
            sx={{ display: { xs: "inline-flex", md: "none" }, mr: 0.5 }}
          >
            <MenuIcon />
          </IconButton>

          <Box sx={{ flex: 1 }}>
            <Typography sx={{ fontWeight: 800 }}>Profile</Typography>
            <Typography sx={{ fontSize: "0.82rem", color: "var(--muted-foreground)" }}>
              Manage your account, session, and preferences
            </Typography>
          </Box>

          <ThemeToggle />
          <ProfileComponent />
        </Toolbar>
      </AppBar>

      <Drawer
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        variant="temporary"
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: "block", md: "none" },
          "& .MuiDrawer-paper": {
            width: drawerWidth,
            bgcolor: "var(--sidebar)",
          },
        }}
      >
        {drawer}
      </Drawer>

      <Drawer
        variant="permanent"
        sx={{
          display: { xs: "none", md: "block" },
          "& .MuiDrawer-paper": {
            width: drawerWidth,
            boxSizing: "border-box",
            bgcolor: "var(--sidebar)",
            borderRight: "1px solid var(--sidebar-border)",
          },
        }}
        open
      >
        {drawer}
      </Drawer>

      <Box
        component="main"
        sx={{
          ml: { md: `${drawerWidth}px` },
          pt: { xs: "76px", md: "92px" },
          px: { xs: 1.5, sm: 2, md: 3 },
          pb: 3,
          maxWidth: "100%",
        }}
      >
        <Stack spacing={3} sx={{ maxWidth: 1200, mx: "auto" }}>
          <Card sx={{ borderRadius: "24px", border: "1px solid var(--border)", backgroundColor: "var(--card)" }}>
            <CardContent sx={{ p: { xs: 2.5, md: 4 } }}>
              <Stack direction={{ xs: "column", md: "row" }} spacing={3} alignItems={{ xs: "flex-start", md: "center" }}>
                <Avatar sx={{ width: 84, height: 84, bgcolor: "var(--primary)", color: "var(--primary-foreground)" }}>
                  <PersonOutlineRoundedIcon fontSize="large" />
                </Avatar>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="h4" sx={{ fontWeight: 800 }}>
                    Profile
                  </Typography>
                  <Typography sx={{ color: "var(--muted-foreground)", mt: 0.5 }}>
                    Manage your account details and session from one place.
                  </Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 2 }}>
                    {profileStats.map((item) => (
                      <Card key={item.label} variant="outlined" sx={{ borderRadius: "16px", minWidth: 140 }}>
                        <CardContent sx={{ py: 1.5, px: 2 }}>
                          <Typography sx={{ fontSize: "0.8rem", color: "var(--muted-foreground)" }}>
                            {item.label}
                          </Typography>
                          <Typography sx={{ fontWeight: 800, fontSize: "1.1rem" }}>
                            {item.value}
                          </Typography>
                        </CardContent>
                      </Card>
                    ))}
                  </Stack>
                </Box>
              </Stack>
            </CardContent>
          </Card>

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", lg: "1.4fr 0.9fr" },
              gap: 3,
            }}
          >
            <Card sx={{ borderRadius: "24px", border: "1px solid var(--border)", backgroundColor: "var(--card)" }}>
              <CardContent sx={{ p: { xs: 2.5, md: 4 } }}>
                <Typography variant="h6" sx={{ fontWeight: 800 }}>
                  Account Details
                </Typography>
                <Typography sx={{ color: "var(--muted-foreground)", mt: 0.5, mb: 3 }}>
                  Keep your contact and business information up to date.
                </Typography>

                <Stack spacing={2}>
                  <TextField label="Full Name" value={form.name} onChange={handleChange("name")} fullWidth />
                  <TextField
                    label="Email"
                    value={form.email}
                    onChange={handleChange("email")}
                    fullWidth
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <EmailOutlinedIcon sx={{ color: "var(--muted-foreground)" }} />
                        </InputAdornment>
                      ),
                    }}
                  />
                  <TextField
                    label="Phone"
                    value={form.phone}
                    onChange={handleChange("phone")}
                    fullWidth
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <PhoneOutlinedIcon sx={{ color: "var(--muted-foreground)" }} />
                        </InputAdornment>
                      ),
                    }}
                  />
                  <TextField
                    label="Business Name"
                    value={form.businessName}
                    onChange={handleChange("businessName")}
                    fullWidth
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <BusinessCenterOutlinedIcon sx={{ color: "var(--muted-foreground)" }} />
                        </InputAdornment>
                      ),
                    }}
                  />
                </Stack>

                <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ mt: 3 }}>
                  <Button variant="contained" onClick={handleSave} disabled={saving} sx={{ borderRadius: "14px" }}>
                    {saving ? "Saving..." : "Save Changes"}
                  </Button>
                  <Button variant="outlined" onClick={handleLogout} sx={{ borderRadius: "14px" }}>
                    Logout
                  </Button>
                </Stack>
              </CardContent>
            </Card>

            <Stack spacing={3}>
              <Card sx={{ borderRadius: "24px", border: "1px solid var(--border)", backgroundColor: "var(--card)" }}>
                <CardContent sx={{ p: { xs: 2.5, md: 4 } }}>
                  <Typography variant="h6" sx={{ fontWeight: 800 }}>
                    Session
                  </Typography>
                  <Typography sx={{ color: "var(--muted-foreground)", mt: 0.5 }}>
                    Your login session is managed automatically. When it expires, you will be redirected to sign in again.
                  </Typography>

                  <Divider sx={{ my: 2.5 }} />

                  <Stack spacing={1.5}>
                    <Typography sx={{ fontSize: "0.92rem" }}>
                      - Orders and admin access use the current auth token.
                    </Typography>
                    <Typography sx={{ fontSize: "0.92rem" }}>
                      - Session expiry now triggers logout automatically.
                    </Typography>
                    <Typography sx={{ fontSize: "0.92rem" }}>
                      - You can safely edit your profile on mobile or desktop.
                    </Typography>
                  </Stack>
                </CardContent>
              </Card>
            </Stack>
          </Box>
        </Stack>
      </Box>
    </Box>
  );
}
