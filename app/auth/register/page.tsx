"use client";

import { useState } from "react";
import axios from "axios";

import {
    Box,
    Button,
    Card,
    CardContent,
    Divider,
    Grid,
    IconButton,
    InputAdornment,
    MenuItem,
    Stack,
    TextField,
    Typography,
} from "@mui/material";

import {
    Visibility,
    VisibilityOff,
    StorefrontRounded,
} from "@mui/icons-material";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAppSnackbar } from "@/components/common/SnackBar";
import { safeError } from "@/lib/safeError";

const businessTypes = [
    "restaurant",
    "hotel",
    "cafe",
    "bakery",
    "dhaba",
    "bar",
    "fast-food",
];

export default function RegisterPage() {
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);

    const [formData, setFormData] = useState({
        name: "",
        email: "",
        password: "",
        role: "admin",

        business: {
            name: "",
            business_type: "",
            phone: "",
            email: "",
            address: "",
        },
    });

    const router = useRouter();
    const { showSnackbar } = useAppSnackbar();
    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
    ) => {
        const { name, value } = e.target;

        if (name.startsWith("business.")) {
            const field = name.split(".")[1];

            setFormData((prev) => ({
                ...prev,
                business: {
                    ...prev.business,
                    [field]: value,
                },
            }));
        } else {
            setFormData((prev) => ({
                ...prev,
                [name]: value,
            }));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            setLoading(true);
debugger    
            const res = await axios.post(
                `${process.env.NEXT_PUBLIC_API_URL}/register`,
                formData
            );
            
            debugger
            showSnackbar("Registration successful", "success");

            router.push("/auth/login");

        } catch (error: any) {
            console.error(error?.response?.data || error);
            const message = safeError(error, "Registration failed");
            showSnackbar(message, "error");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box
            sx={{
                minHeight: "100vh",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                px: 2,
                py: 4,
                backgroundColor: "var(--background)",
                backgroundImage:
                    "radial-gradient(circle at top right, color-mix(in srgb, var(--accent) 18%, transparent), transparent 40%)",
            }}
        >
            <Card
                sx={{
                    width: "100%",
                    maxWidth: 1150,
                    borderRadius: "32px",
                    overflow: "hidden",
                    backgroundColor: "var(--card)",
                    color: "var(--card-foreground)",
                    border: "1px solid var(--border)",
                    boxShadow: "0 20px 60px rgba(0,0,0,0.12)",
                }}
            >
                <Grid container>
                    {/* LEFT SIDE */}
                    <Grid
                        size={{ xs: 12, md: 5 }}
                        sx={{
                            background:
                                "linear-gradient(160deg, var(--sidebar), color-mix(in srgb, var(--sidebar-accent) 38%, var(--sidebar)))",
                            color: "var(--sidebar-foreground)",
                            p: { xs: 4, md: 6 },
                            display: "flex",
                            flexDirection: "column",
                            justifyContent: "center",
                            borderRight: {
                                xs: "none",
                                md: "1px solid var(--sidebar-border)",
                            },
                        }}
                    >
                        <Box
                            sx={{
                                width: 72,
                                height: 72,
                                borderRadius: "20px",
                                backgroundColor:
                                    "color-mix(in srgb, var(--sidebar-primary) 18%, transparent)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                border: "1px solid var(--sidebar-border)",
                                mb: 3,
                            }}
                        >
                            <StorefrontRounded
                                sx={{
                                    fontSize: 38,
                                    color: "var(--sidebar-primary)",
                                }}
                            />
                        </Box>

                        <Typography
                            sx={{
                                fontSize: {
                                    xs: "2rem",
                                    md: "3rem",
                                },
                                fontWeight: 800,
                                lineHeight: 1.1,
                            }}
                        >
                            KhajaPOS
                        </Typography>

                        <Typography
                            sx={{
                                mt: 2,
                                color: "var(--muted-foreground)",
                                lineHeight: 1.8,
                            }}
                        >
                            Smart restaurant and hotel management platform with
                            QR ordering, kitchen tracking, menu management, and
                            multi-role staff access.
                        </Typography>

                        <Stack spacing={1.5} sx={{ mt: 5 }}>
                            {[
                                "QR based ordering",
                                "Kitchen live order tracking",
                                "Menu management system",
                                "Multi-business architecture",
                            ].map((item) => (
                                <Box
                                    key={item}
                                    sx={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 1.5,
                                    }}
                                >
                                    <Box
                                        sx={{
                                            width: 8,
                                            height: 8,
                                            borderRadius: "999px",
                                            backgroundColor:
                                                "var(--sidebar-primary)",
                                        }}
                                    />
                                    <Typography
                                        sx={{
                                            color:
                                                "var(--sidebar-foreground)",
                                        }}
                                    >
                                        {item}
                                    </Typography>
                                </Box>
                            ))}
                            <Typography sx={{ mt: 3, color: "var(--muted-foreground)", fontSize: "0.9rem" }}>
                                Get Back to
                                <Link href="/auth/login"><b> Login!</b></Link>
                            </Typography>
                        </Stack>
                    </Grid>

                    {/* RIGHT SIDE */}
                    <Grid size={{ xs: 12, md: 7 }}>
                        <CardContent
                            sx={{
                                p: {
                                    xs: 3,
                                    sm: 4,
                                    md: 5,
                                },
                            }}
                        >
                            <Typography
                                sx={{
                                    fontSize: {
                                        xs: "1.8rem",
                                        md: "2.2rem",
                                    },
                                    fontWeight: 800,
                                    color: "var(--foreground)",
                                }}
                            >
                                Register Business
                            </Typography>

                            <Typography
                                sx={{
                                    mt: 1,
                                    color: "var(--muted-foreground)",
                                }}
                            >
                                Create your admin account and business workspace
                            </Typography>

                            <Divider
                                sx={{
                                    my: 4,
                                    borderColor: "var(--border)",
                                }}
                            />

                            <form onSubmit={handleSubmit}>
                                <Stack spacing={4}>
                                    {/* USER */}
                                    <Box>
                                        <Typography
                                            sx={{
                                                fontWeight: 700,
                                                mb: 2,
                                                fontSize: "1rem",
                                            }}
                                        >
                                            User Information
                                        </Typography>

                                        <Grid container spacing={2}>
                                            <Grid size={{ xs: 12, sm: 6 }}>
                                                <TextField
                                                    fullWidth
                                                    label="Full Name"
                                                    name="name"
                                                    value={formData.name}
                                                    onChange={handleChange}
                                                />
                                            </Grid>

                                            <Grid size={{ xs: 12, sm: 6 }}>
                                                <TextField
                                                    fullWidth
                                                    label="Email"
                                                    type="email"
                                                    name="email"
                                                    value={formData.email}
                                                    onChange={handleChange}
                                                />
                                            </Grid>

                                            <Grid size={{ xs: 12 }}>
                                                <TextField
                                                    fullWidth
                                                    label="Password"
                                                    type={
                                                        showPassword
                                                            ? "text"
                                                            : "password"
                                                    }
                                                    name="password"
                                                    value={formData.password}
                                                    onChange={handleChange}
                                                    InputProps={{
                                                        endAdornment: (
                                                            <InputAdornment position="end">
                                                                <IconButton
                                                                    onClick={() =>
                                                                        setShowPassword(
                                                                            !showPassword
                                                                        )
                                                                    }
                                                                >
                                                                    {showPassword ? (
                                                                        <VisibilityOff />
                                                                    ) : (
                                                                        <Visibility />
                                                                    )}
                                                                </IconButton>
                                                            </InputAdornment>
                                                        ),
                                                    }}
                                                />
                                            </Grid>
                                        </Grid>
                                    </Box>

                                    {/* BUSINESS */}
                                    <Box>
                                        <Typography
                                            sx={{
                                                fontWeight: 700,
                                                mb: 2,
                                                fontSize: "1rem",
                                            }}
                                        >
                                            Business Information
                                        </Typography>

                                        <Grid container spacing={2}>
                                            <Grid size={{ xs: 12, sm: 6 }}>
                                                <TextField
                                                    fullWidth
                                                    label="Business Name"
                                                    name="business.name"
                                                    value={
                                                        formData.business.name
                                                    }
                                                    onChange={handleChange}
                                                />
                                            </Grid>

                                            <Grid size={{ xs: 12, sm: 6 }}>
                                                <TextField
                                                    select
                                                    fullWidth
                                                    label="Business Type"
                                                    name="business.business_type"
                                                    value={
                                                        formData.business
                                                            .business_type
                                                    }
                                                    onChange={handleChange}
                                                >
                                                    {businessTypes.map(
                                                        (type) => (
                                                            <MenuItem
                                                                key={type}
                                                                value={type}
                                                            >
                                                                {type}
                                                            </MenuItem>
                                                        )
                                                    )}
                                                </TextField>
                                            </Grid>

                                            <Grid size={{ xs: 12, sm: 6 }}>
                                                <TextField
                                                    fullWidth
                                                    label="Business Email"
                                                    type="email"
                                                    name="business.email"
                                                    value={
                                                        formData.business.email
                                                    }
                                                    onChange={handleChange}
                                                />
                                            </Grid>

                                            <Grid size={{ xs: 12, sm: 6 }}>
                                                <TextField
                                                    fullWidth
                                                    label="Phone Number"
                                                    name="business.phone"
                                                    value={
                                                        formData.business.phone
                                                    }
                                                    onChange={handleChange}
                                                />
                                            </Grid>

                                            <Grid size={{ xs: 12 }}>
                                                <TextField
                                                    fullWidth
                                                    multiline
                                                    minRows={3}
                                                    label="Address"
                                                    name="business.address"
                                                    value={
                                                        formData.business
                                                            .address
                                                    }
                                                    onChange={handleChange}
                                                />
                                            </Grid>
                                        </Grid>
                                    </Box>

                                    <Button
                                        type="submit"
                                        disabled={loading}
                                        sx={{
                                            borderRadius: "16px",
                                            backgroundColor: "var(--primary)",
                                            color: "var(--primary-foreground)",
                                            py: 1.5,
                                            fontWeight: 700,
                                            fontSize: "1rem",
                                            textTransform: "none",
                                            transition: "all 200ms ease",

                                            "&:hover": {
                                                backgroundColor:
                                                    "var(--primary)",
                                                opacity: 0.92,
                                                transform:
                                                    "translateY(-1px)",
                                            },

                                            "&:disabled": {
                                                opacity: 0.6,
                                                color: "var(--primary-foreground)",
                                            },
                                        }}
                                    >
                                        {loading
                                            ? "Creating Account..."
                                            : "Create Account"}
                                    </Button>
                                </Stack>
                            </form>
                        </CardContent>
                    </Grid>
                </Grid>
            </Card>
        </Box>
    );
}
