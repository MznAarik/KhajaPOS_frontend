"use client";

import * as React from "react";
import {
    Box,
    Button,
    CircularProgress,
    Divider,
    FormControl,
    InputLabel,
    MenuItem,
    Paper,
    Select,
    Stack,
    TextField,
    Typography,
} from "@mui/material";
import CloudUploadOutlinedIcon from "@mui/icons-material/CloudUploadOutlined";
import StorefrontOutlinedIcon from "@mui/icons-material/StorefrontOutlined";
import { useAppSnackbar } from "@/components/common/SnackBar";
import {
    api,
    getBusinessSettings,
    resolveMenuImageUrl,
    unwrapApiData,
    updateBusinessSettings,
    type BusinessSettings,
} from "@/lib/api";
import { safeError } from "@/lib/safeError";

const MAX_LOGO_BYTES = 4 * 1024 * 1024;

const businessTypes = ["restaurant", "hotel", "cafe", "bakery", "dhaba", "bar", "fast-food"];

type ProfileResponse = {
    id: number;
    name: string;
    email: string;
    business?: {
        id?: number;
        name?: string;
        business_type?: string;
        phone?: string;
        email?: string;
        address?: string;
    } | null;
};

export default function BusinessSettingsPage() {
    const { showSnackbar } = useAppSnackbar();
    const fileInputRef = React.useRef<HTMLInputElement | null>(null);

    const [loading, setLoading] = React.useState(true);
    const [savingBranding, setSavingBranding] = React.useState(false);
    const [savingAccount, setSavingAccount] = React.useState(false);

    const [settings, setSettings] = React.useState<BusinessSettings | null>(null);
    const [name, setName] = React.useState("");
    const [logoUrl, setLogoUrl] = React.useState<string | null>(null);
    const [logoFile, setLogoFile] = React.useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);

    const [account, setAccount] = React.useState({
        name: "",
        email: "",
        businessType: "",
        businessEmail: "",
        businessPhone: "",
        businessAddress: "",
    });

    React.useEffect(() => {
        let active = true;

        Promise.allSettled([getBusinessSettings(), api.get("/user")])
            .then(([brandResult, profileResult]) => {
                if (!active) return;

                if (brandResult.status === "fulfilled") {
                    const data = brandResult.value;
                    setSettings(data);
                    setName(data.name);
                    setLogoUrl(resolveMenuImageUrl(data.logo));
                } else {
                    showSnackbar(safeError(brandResult.reason, "Failed to load business settings"), "error");
                }

                if (profileResult.status === "fulfilled") {
                    const profile = unwrapApiData<ProfileResponse>(profileResult.value.data);
                    setAccount({
                        name: profile.name ?? "",
                        email: profile.email ?? "",
                        businessType: profile.business?.business_type ?? "",
                        businessEmail: profile.business?.email ?? "",
                        businessPhone: profile.business?.phone ?? "",
                        businessAddress: profile.business?.address ?? "",
                    });
                } else {
                    showSnackbar(safeError(profileResult.reason, "Failed to load profile"), "error");
                }
            })
            .finally(() => {
                if (active) setLoading(false);
            });

        return () => {
            active = false;
        };
    }, [showSnackbar]);

    React.useEffect(() => {
        return () => {
            if (previewUrl) URL.revokeObjectURL(previewUrl);
        };
    }, [previewUrl]);

    const handleLogoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0] ?? null;
        event.target.value = "";

        if (!file) return;

        if (!file.type.startsWith("image/")) {
            showSnackbar("Please choose an image file (JPG, PNG or WebP).", "warning");
            return;
        }

        if (file.size > MAX_LOGO_BYTES) {
            showSnackbar("Logo must be smaller than 4 MB.", "warning");
            return;
        }

        setLogoFile(file);
        setPreviewUrl((previous) => {
            if (previous) URL.revokeObjectURL(previous);
            return URL.createObjectURL(file);
        });
    };

    const handleSaveBranding = async (event: React.FormEvent) => {
        event.preventDefault();

        if (!name.trim()) {
            showSnackbar("Business name is required.", "warning");
            return;
        }

        try {
            setSavingBranding(true);
            const updated = await updateBusinessSettings({ name, logoFile });
            setSettings(updated);
            setName(updated.name);
            setLogoUrl(resolveMenuImageUrl(updated.logo));
            setLogoFile(null);
            setPreviewUrl((previous) => {
                if (previous) URL.revokeObjectURL(previous);
                return null;
            });
            showSnackbar("Business branding updated.", "success");
        } catch (error) {
            showSnackbar(safeError(error, "Failed to update business branding"), "error");
        } finally {
            setSavingBranding(false);
        }
    };

    const handleSaveAccount = async (event: React.FormEvent) => {
        event.preventDefault();

        try {
            setSavingAccount(true);
            const response = await api.put("/user", {
                name: account.name.trim(),
                email: account.email.trim(),
                phone: "",
                business_name: name.trim() || account.name.trim(),
                business_type: account.businessType.trim(),
                business_email: account.businessEmail.trim(),
                business_phone: account.businessPhone.trim(),
                business_address: account.businessAddress.trim(),
            });

            const updated = unwrapApiData<ProfileResponse>(response.data);
            setAccount({
                name: updated.name ?? account.name,
                email: updated.email ?? account.email,
                businessType: updated.business?.business_type ?? account.businessType,
                businessEmail: updated.business?.email ?? account.businessEmail,
                businessPhone: updated.business?.phone ?? account.businessPhone,
                businessAddress: updated.business?.address ?? account.businessAddress,
            });

            if (updated.business?.name) {
                setName(updated.business.name);
                setSettings((previous) => (previous ? { ...previous, name: updated.business?.name ?? previous.name } : previous));
            }

            showSnackbar("Profile updated.", "success");
        } catch (error) {
            showSnackbar(safeError(error, "Failed to update profile"), "error");
        } finally {
            setSavingAccount(false);
        }
    };

    if (loading) {
        return (
            <Box sx={{ display: "grid", placeItems: "center", minHeight: "50vh" }}>
                <CircularProgress sx={{ color: "var(--primary)" }} />
            </Box>
        );
    }

    const displayLogo = previewUrl ?? logoUrl;

    return (
        <Box sx={{ maxWidth: { xs: 680, md: 1120 }, mx: "auto", px: { xs: 1, sm: 1.5 }, py: { xs: 2, sm: 3 } }}>
            <Stack spacing={1.5} sx={{ mb: 3 }}>
                <Typography sx={{ fontWeight: 900, fontSize: "1.35rem" }}>Settings</Typography>
                <Typography sx={{ color: "var(--muted-foreground)" }}>
                    Manage your brand and account details in one place.
                </Typography>
            </Stack>

            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 3, alignItems: "start" }}>
                <Paper
                    component="form"
                    onSubmit={handleSaveBranding}
                    sx={{
                        p: { xs: 2, md: 3 },
                        borderRadius: "22px",
                        border: "1px solid var(--border)",
                        backgroundColor: "var(--card)",
                        boxShadow: "0 10px 28px color-mix(in srgb, var(--foreground) 6%, transparent)",
                    }}
                >
                    <Stack spacing={3}>
                        <Box>
                            <Typography sx={{ fontWeight: 800, mb: 2 }}>Brand</Typography>
                            <Stack direction={{ xs: "column", sm: "row" }} spacing={2.5} alignItems={{ sm: "center" }}>
                                <Box
                                    sx={{
                                        width: 88,
                                        height: 88,
                                        borderRadius: "20px",
                                        border: "1px solid var(--border)",
                                        backgroundColor: "var(--muted)",
                                        display: "grid",
                                        placeItems: "center",
                                        overflow: "hidden",
                                        flexShrink: 0,
                                    }}
                                >
                                    {displayLogo ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <Box
                                            component="img"
                                            src={displayLogo}
                                            alt="Business logo"
                                            sx={{ width: "100%", height: "100%", objectFit: "cover" }}
                                        />
                                    ) : (
                                        <StorefrontOutlinedIcon sx={{ fontSize: 34, color: "var(--muted-foreground)" }} />
                                    )}
                                </Box>
                                <Stack spacing={1} sx={{ minWidth: 0 }}>
                                    <Typography sx={{ color: "var(--muted-foreground)", fontSize: "0.85rem" }}>
                                        JPG, PNG or WebP up to 4 MB. Shown on the admin top bar and customer menu header.
                                    </Typography>
                                    <Stack direction="row" spacing={1}>
                                        <Button
                                            type="button"
                                            variant="outlined"
                                            startIcon={<CloudUploadOutlinedIcon />}
                                            onClick={() => fileInputRef.current?.click()}
                                            sx={{ borderRadius: "12px", fontWeight: 800, textTransform: "none" }}
                                        >
                                            {displayLogo ? "Replace logo" : "Upload logo"}
                                        </Button>
                                        {logoFile && (
                                            <Typography sx={{ alignSelf: "center", color: "var(--accent)", fontWeight: 700, fontSize: "0.8rem" }}>
                                                New file selected
                                            </Typography>
                                        )}
                                    </Stack>
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="image/png,image/jpeg,image/webp"
                                        hidden
                                        onChange={handleLogoChange}
                                    />
                                </Stack>
                            </Stack>
                        </Box>

                        <Divider sx={{ borderColor: "var(--border)" }} />

                        <TextField
                            fullWidth
                            label="Business name"
                            value={name}
                            onChange={(event) => setName(event.target.value)}
                            required
                            sx={{
                                "& .MuiOutlinedInput-root": {
                                    borderRadius: "14px",
                                    backgroundColor: "var(--muted)",
                                },
                            }}
                        />

                        <Button
                            type="submit"
                            variant="contained"
                            disabled={savingBranding}
                            sx={{ alignSelf: "flex-start", borderRadius: "14px", fontWeight: 900, textTransform: "none", px: 4, minHeight: 46 }}
                        >
                            {savingBranding ? "Saving..." : "Save branding"}
                        </Button>
                    </Stack>
                </Paper>

                <Paper
                    component="form"
                    onSubmit={handleSaveAccount}
                    sx={{
                        p: { xs: 2, md: 3 },
                        borderRadius: "22px",
                        border: "1px solid var(--border)",
                        backgroundColor: "var(--card)",
                        boxShadow: "0 10px 28px color-mix(in srgb, var(--foreground) 6%, transparent)",
                    }}
                >
                    <Stack spacing={2.5}>
                        <Box>
                            <Typography sx={{ fontWeight: 800 }}>Account</Typography>
                            <Typography sx={{ color: "var(--muted-foreground)", fontSize: "0.85rem", mt: 0.5 }}>
                                Your login details and business contact information.
                            </Typography>
                        </Box>

                        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
                            <TextField
                                fullWidth
                                label="Full name"
                                value={account.name}
                                onChange={(event) => setAccount((current) => ({ ...current, name: event.target.value }))}
                                required
                                sx={{ "& .MuiOutlinedInput-root": { borderRadius: "14px", backgroundColor: "var(--muted)" } }}
                            />
                            <TextField
                                fullWidth
                                label="Email"
                                type="email"
                                value={account.email}
                                onChange={(event) => setAccount((current) => ({ ...current, email: event.target.value }))}
                                required
                                sx={{ "& .MuiOutlinedInput-root": { borderRadius: "14px", backgroundColor: "var(--muted)" } }}
                            />
                            <FormControl fullWidth sx={{ "& .MuiOutlinedInput-root": { borderRadius: "14px", backgroundColor: "var(--muted)" } }}>
                                <InputLabel id="business-type-label">Business type</InputLabel>
                                <Select
                                    labelId="business-type-label"
                                    label="Business type"
                                    value={account.businessType}
                                    onChange={(event) => setAccount((current) => ({ ...current, businessType: event.target.value }))}
                                >
                                    {businessTypes.map((type) => (
                                        <MenuItem key={type} value={type}>
                                            {type}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                            <TextField
                                fullWidth
                                label="Business email"
                                type="email"
                                value={account.businessEmail}
                                onChange={(event) => setAccount((current) => ({ ...current, businessEmail: event.target.value }))}
                                sx={{ "& .MuiOutlinedInput-root": { borderRadius: "14px", backgroundColor: "var(--muted)" } }}
                            />
                            <TextField
                                fullWidth
                                label="Business phone"
                                value={account.businessPhone}
                                onChange={(event) => setAccount((current) => ({ ...current, businessPhone: event.target.value }))}
                                sx={{ "& .MuiOutlinedInput-root": { borderRadius: "14px", backgroundColor: "var(--muted)" } }}
                            />
                            <TextField
                                fullWidth
                                label="Business address"
                                value={account.businessAddress}
                                onChange={(event) => setAccount((current) => ({ ...current, businessAddress: event.target.value }))}
                                sx={{ "& .MuiOutlinedInput-root": { borderRadius: "14px", backgroundColor: "var(--muted)" } }}
                            />
                        </Box>

                        <Button
                            type="submit"
                            variant="contained"
                            disabled={savingAccount}
                            sx={{ alignSelf: "flex-start", borderRadius: "14px", fontWeight: 900, textTransform: "none", px: 4, minHeight: 46 }}
                        >
                            {savingAccount ? "Saving..." : "Save account details"}
                        </Button>
                    </Stack>
                </Paper>
            </Box>
        </Box>
    );
}
