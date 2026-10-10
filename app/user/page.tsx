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
  Breadcrumbs,
  Link as MuiLink,
  Toolbar,
  Typography,
  Stack,
  TextField,
  InputAdornment,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
} from "@mui/material";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import PersonOutlineRoundedIcon from "@mui/icons-material/PersonOutlineRounded";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import EmailOutlinedIcon from "@mui/icons-material/EmailOutlined";
import PhoneOutlinedIcon from "@mui/icons-material/PhoneOutlined";
import BusinessCenterOutlinedIcon from "@mui/icons-material/BusinessCenterOutlined";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { api, clearAuthSession, unwrapApiData } from "@/lib/api";
import ThemeToggle from "@/components/common/ThemeToggle";
import ProfileComponent from "@/components/common/ProfileComponent";
import { useAppSnackbar } from "@/components/common/SnackBar";
import { safeError } from "@/lib/safeError";
import { HouseIcon, type HouseIconHandle } from "@/components/ui/house-icon";
import { DashboardIcon, type DashboardIconHandle } from "@/components/ui/dashboard-icon";
import { LayoutListIcon, type LayoutListIconHandle } from "@/components/ui/layout-list-icon";
import { CoffeeIcon, type CoffeeIconHandle } from "@/components/ui/coffee-icon";

const drawerWidth = 280;

const businessTypes = [
  "restaurant",
  "hotel",
  "cafe",
  "bakery",
  "dhaba",
  "bar",
  "fast-food",
];

type CurrentUserResponse = {
  id: number;
  name: string;
  email: string;
  role?: string;
  phone?: string | null;
  business?: {
    id?: number;
    name?: string;
    business_type?: string;
    phone?: string;
    email?: string;
    address?: string;
  } | null;
};

export default function UserProfilePage() {
  const router = useRouter();
  const pathname = usePathname();
  const { showSnackbar } = useAppSnackbar();
  const dashboardIconRef = React.useRef<HouseIconHandle | null>(null);
  const profileIconRef = React.useRef<DashboardIconHandle | null>(null);
  const menuIconRef = React.useRef<LayoutListIconHandle | null>(null);
  const ordersIconRef = React.useRef<CoffeeIconHandle | null>(null);
  const [hoveredItem, setHoveredItem] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [user, setUser] = React.useState<CurrentUserResponse | null>(null);
  const [form, setForm] = React.useState({
    name: "",
    email: "",
    phone: "",
    businessName: "",
    businessType: "",
    businessEmail: "",
    businessPhone: "",
    businessAddress: "",
  });

  const handleChange =
    (key: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement>) => {
      setForm((current) => ({ ...current, [key]: event.target.value }));
    };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await api.put("/user", {
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        business_name: form.businessName.trim(),
        business_type: form.businessType.trim(),
        business_email: form.businessEmail.trim(),
        business_phone: form.businessPhone.trim(),
        business_address: form.businessAddress.trim(),
      });

      const updatedProfile = unwrapApiData<CurrentUserResponse>(response.data);
      setUser(updatedProfile);
      setForm({
        name: updatedProfile.name ?? "",
        email: updatedProfile.email ?? "",
        phone: updatedProfile.phone ?? updatedProfile.business?.phone ?? "",
        businessName: updatedProfile.business?.name ?? "",
        businessType: updatedProfile.business?.business_type ?? "",
        businessEmail: updatedProfile.business?.email ?? "",
        businessPhone: updatedProfile.business?.phone ?? "",
        businessAddress: updatedProfile.business?.address ?? "",
      });
      showSnackbar("Profile updated successfully.", "success");
    } catch (error) {
      showSnackbar(safeError(error, "Failed to update profile."), "error");
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await clearAuthSession();
    router.push("/auth/login");
  };

  const handleReturn = () => {
    if (window.history.length > 1) {
      router.back();
      return;
    }

    router.push("/admin/dashboard");
  };

  const navItems = [
    { label: "Home", href: "/admin/dashboard", icon: HouseIcon, ref: dashboardIconRef },
    { label: "Profile", href: "/user", icon: DashboardIcon, ref: profileIconRef },
    { label: "Menu", href: "/admin/menu", icon: LayoutListIcon, ref: menuIconRef },
    { label: "Orders", href: "/admin/orders", icon: CoffeeIcon, ref: ordersIconRef },
  ];

  React.useEffect(() => {
    const loadProfile = async () => {
      setLoading(true);
      try {
        const response = await api.get<{ status: number; message?: string; data: CurrentUserResponse }>("/user");
        const profile = unwrapApiData<CurrentUserResponse>(response.data);
        setUser(profile);
        setForm({
          name: profile.name ?? "",
          email: profile.email ?? "",
          phone: profile.phone ?? profile.business?.phone ?? "",
          businessName: profile.business?.name ?? "",
          businessType: profile.business?.business_type ?? "",
          businessEmail: profile.business?.email ?? "",
          businessPhone: profile.business?.phone ?? "",
          businessAddress: profile.business?.address ?? "",
        });
      } catch (error) {
        console.error("Failed to load profile:", error);
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, []);

  const drawer = (
    <Box
      sx={{
        px: { xs: 1.25, sm: 2 },
        py: { xs: 1.25, sm: 15 },
        minHeight: "100%",
        display: "flex",
        flexDirection: "column",
        color: "var(--sidebar-foreground)",
      }}
    >
      <Box
        sx={{
          p: { xs: 1.4, sm: 3 },
          borderRadius: { xs: "16px", sm: "20px" },
          border: "1px solid var(--sidebar-border)",
          backgroundColor: "color-mix(in srgb, var(--sidebar-accent) 72%, transparent)",
          mb: { xs: 1.25, sm: 2 },
        }}
      >
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Avatar sx={{ width: { xs: 38, sm: 40 }, height: { xs: 38, sm: 40 }, bgcolor: "var(--primary)", color: "var(--primary-foreground)" }}>
            <PersonOutlineRoundedIcon />
          </Avatar>
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontWeight: 850, color: "var(--sidebar-foreground)" }}>KhajaPOS</Typography>
            <Typography sx={{ fontSize: "0.78rem", color: "var(--sidebar-accent-foreground)" }}>
              Account center
            </Typography>
          </Box>
        </Stack>
      </Box>

      <List sx={{ display: "grid", gap: { xs: 0.65, sm: 1 }, flex: 1 }}>
        {navItems.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;

          return (
            <ListItemButton
              key={item.href}
              onClick={() => {
                router.push(item.href);
              }}
              onMouseEnter={() => {
                setHoveredItem(item.label);
                item.ref.current?.startAnimation();
              }}
              onMouseLeave={() => {
                setHoveredItem((current) => (current === item.label ? null : current));
                item.ref.current?.stopAnimation();
              }}
              sx={{
                px: { xs: 1.1, sm: 1.5 },
                py: { xs: 0.8, sm: 1.25 },
                borderRadius: { xs: "13px", sm: "16px" },
                minHeight: { xs: 44, sm: 52 },
                alignItems: "center",
                border: "1px solid",
                borderColor: active ? "var(--primary)" : "var(--sidebar-border)",
                color: active ? "var(--primary)" : "var(--sidebar-foreground)",
                backgroundColor: active ? "color-mix(in srgb, var(--primary) 14%, transparent)" : "transparent",
                "& .MuiListItemText-primary": {
                  whiteSpace: "normal",
                  lineHeight: 1.15,
                  fontSize: { xs: "0.9rem", sm: "1rem" },
                },
                "& .account-nav-icon svg": {
                  color: active ? "var(--primary)" : "inherit",
                },
              }}
            >
              <ListItemIcon
                className="account-nav-icon"
                sx={{
                  minWidth: 38,
                  width: { xs: 30, sm: 32 },
                  height: { xs: 30, sm: 32 },
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Box
                  sx={{
                    width: 32,
                    height: { xs: 30, sm: 32 },
                    display: "grid",
                    placeItems: "center",
                    borderRadius: "10px",
                    transform:
                      hoveredItem === item.label
                        ? "translateY(-2px) scale(1.14) rotate(-4deg)"
                        : "translateY(0) scale(1) rotate(0deg)",
                    transition: "transform 180ms ease, background-color 180ms ease",
                    backgroundColor:
                      hoveredItem === item.label || active
                        ? "color-mix(in srgb, var(--primary) 14%, transparent)"
                        : "transparent",
                  }}
                >
                  <Icon
                    ref={item.ref}
                    size={20}
                    className={hoveredItem === item.label ? "text--primary" : ""}
                  />
                </Box>
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
        sx={{
          mt: { xs: 1.5, sm: 2.5 },
          borderRadius: "14px",
          color: "var(--sidebar-foreground)",
          borderColor: "var(--sidebar-border)",
        }}
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
        <Toolbar
          sx={{
            minHeight: { xs: 64, md: 76 },
            gap: { xs: 1, md: 1.5 },
            px: { xs: 1.5, md: 2 },
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <IconButton
            aria-label="Back to dashboard"
            onClick={handleReturn}
            sx={{
              display: { xs: "inline-flex", md: "none" },
              mr: 0.5,
              width: 42,
              height: 42,
              borderRadius: "14px",
              border: "1px solid var(--border)",
              color: "var(--foreground)",
              backgroundColor: "color-mix(in srgb, var(--card) 72%, transparent)",
            }}
          >
            <ArrowBackRoundedIcon />
          </IconButton>

          <Box sx={{ flex: 1, minWidth: 0, pl: { xs: 0, sm: 1, md: 2 } }}>
            <Breadcrumbs separator=">" aria-label="breadcrumb" sx={{ display: { xs: "none", sm: "block" } }}>
              <MuiLink
                component={Link}
                underline="hover"
                color="inherit"
                href="/admin/dashboard"
                sx={{ color: "var(--muted-foreground)", fontWeight: 600 }}
              >
                Home
              </MuiLink>
              <Typography sx={{ color: "var(--foreground)", fontWeight: 800 }}>
                Profile
              </Typography>
            </Breadcrumbs>
            <Typography
              sx={{
                display: { xs: "block", sm: "none" },
                fontWeight: 850,
                fontSize: "1.05rem",
                color: "var(--foreground)",
              }}
            >
              Profile
            </Typography>
          </Box>

          <ThemeToggle />
          <ProfileComponent />
        </Toolbar>
      </AppBar>

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
          pt: { xs: "76px", md: "100px" },
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
                  <Typography sx={{ color: "var(--primary)", fontSize: "0.82rem", fontWeight: 850, letterSpacing: "0.08em", textTransform: "uppercase", mb: 0.75 }}>
                    Manage your account
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 800 }}>
                    {loading ? "Profile" : user?.name || "Profile"}
                  </Typography>
                  <Typography sx={{ color: "var(--muted-foreground)", mt: 0.5 }}>
                    {loading
                      ? "Loading profile..."
                      : `${user?.role ?? "user"} account${user?.business?.name ? ` • ${user.business.name}` : ""}`}
                  </Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 2 }}>
                    {[
                      { label: "Role", value: user?.role ?? "user" },
                      { label: "Email", value: user?.email ?? "—" },
                      { label: "Business", value: user?.business?.name ?? "—" },
                    ].map((item) => (
                      <Card key={item.label} variant="outlined" sx={{ borderRadius: "16px", minWidth: { xs: "100%", sm: 180 } }}>
                        <CardContent sx={{ py: 1.5, px: 2 }}>
                          <Typography sx={{ fontSize: "0.8rem", color: "var(--muted-foreground)" }}>
                            {item.label}
                          </Typography>
                          <Typography sx={{ fontWeight: 800, fontSize: "1rem", wordBreak: "break-word" }}>
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

                <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
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
                  <FormControl fullWidth>
                    <InputLabel id="business-type-label">Business Type</InputLabel>
                    <Select
                      labelId="business-type-label"
                      label="Business Type"
                      value={form.businessType}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          businessType: event.target.value,
                        }))
                      }
                    >
                      {businessTypes.map((type) => (
                        <MenuItem key={type} value={type}>
                          {type}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <TextField
                    label="Business Email"
                    value={form.businessEmail}
                    onChange={handleChange("businessEmail")}
                    fullWidth
                  />
                  <TextField
                    label="Business Phone"
                    value={form.businessPhone}
                    onChange={handleChange("businessPhone")}
                    fullWidth
                  />
                  <TextField
                    label="Business Address"
                    value={form.businessAddress}
                    onChange={handleChange("businessAddress")}
                    fullWidth
                    multiline
                    minRows={3}
                    sx={{ gridColumn: { xs: "auto", sm: "1 / -1" } }}
                  />
                </Box>

                <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ mt: 3 }}>
                  <Button variant="contained" onClick={handleSave} disabled={saving || loading} sx={{ borderRadius: "14px" }}>
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
                      - Logged in as {loading ? "..." : user?.email || "unknown"}.
                    </Typography>
                    <Typography sx={{ fontSize: "0.92rem" }}>
                      - Session expiry now triggers logout automatically.
                    </Typography>
                    <Typography sx={{ fontSize: "0.92rem" }}>
                      - Business: {loading ? "..." : user?.business?.business_type || "N/A"}.
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
