"use client";

import { useState } from "react";
import axios from "axios";

import {
    Box,
    Button,
    Card,
    CardContent,
    Divider,
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
            const res = await axios.post(
                `${process.env.NEXT_PUBLIC_API_URL}/register`,
                formData
            );

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
                px: { xs: 1.5, sm: 2, md: 4 },
                py: { xs: 2, md: 4 },
                backgroundColor: "var(--background)",
                backgroundImage: "var(--page-gradient)",
            }}
        >
            <Card
                sx={{
                    width: "min(100%, 1120px)",
                    borderRadius: { xs: "24px", md: "32px" },
                    overflow: "hidden",
                    display: "grid",
                    gridTemplateColumns: { xs: "1fr", md: "0.88fr 1.12fr" },
                    backgroundColor: "color-mix(in srgb, var(--card) 94%, transparent)",
                    backgroundImage: "var(--surface-gradient)",
                    color: "var(--card-foreground)",
                    border: "1px solid var(--border)",
                    boxShadow: "var(--soft-shadow)",
                    backdropFilter: "blur(14px)",
                }}
            >
                    <Box
                        sx={{
                            background:
                                "radial-gradient(circle at 22% 10%, color-mix(in srgb, var(--sidebar-primary) 34%, transparent), transparent 34%), radial-gradient(circle at 88% 88%, color-mix(in srgb, var(--accent) 18%, transparent), transparent 38%), linear-gradient(160deg, var(--sidebar), color-mix(in srgb, var(--sidebar-accent) 52%, var(--sidebar)))",
                            color: "var(--sidebar-foreground)",
                            p: { xs: 3, sm: 4, md: 6 },
                            display: "flex",
                            flexDirection: "column",
                            justifyContent: "center",
                            minHeight: { xs: 280, md: 680 },
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
                                color: "color-mix(in srgb, var(--sidebar-foreground) 84%, var(--sidebar-primary) 16%)",
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
                                                "color-mix(in srgb, var(--sidebar-foreground) 92%, var(--sidebar-primary) 8%)",
                                        }}
                                    >
                                        {item}
                                    </Typography>
                                </Box>
                            ))}
                            <Typography component="div" sx={{ mt: 3, color: "color-mix(in srgb, var(--sidebar-foreground) 80%, var(--sidebar-primary) 20%)", fontSize: "0.9rem" }}>
                                Get Back to
                                <Link href="/auth/login" style={{ color: "var(--sidebar-primary)", fontWeight: 700, marginLeft: 4, textDecoration: "underline" }}>
                                    Login!
                                </Link>
                            </Typography>
                        </Stack>
                    </Box>

                    <Box>
                        <CardContent
                            sx={{
                                p: {
                                    xs: 2.25,
                                    sm: 4,
                                    md: 5,
                                },
                                backgroundColor: "color-mix(in srgb, var(--card) 74%, transparent)",
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

                                        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
                                            <Box>
                                                <TextField
                                                    fullWidth
                                                    label="Full Name"
                                                    name="name"
                                                    value={formData.name}
                                                    onChange={handleChange}
                                                    sx={{ "& .MuiOutlinedInput-root": { borderRadius: "14px", backgroundColor: "color-mix(in srgb, var(--background) 48%, transparent)" } }}
                                                />
                                            </Box>

                                            <Box>
                                                <TextField
                                                    fullWidth
                                                    label="Email"
                                                    type="email"
                                                    name="email"
                                                    value={formData.email}
                                                    onChange={handleChange}
                                                    sx={{ "& .MuiOutlinedInput-root": { borderRadius: "14px", backgroundColor: "color-mix(in srgb, var(--background) 48%, transparent)" } }}
                                                />
                                            </Box>

                                            <Box sx={{ gridColumn: "1 / -1" }}>
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
                                                    sx={{ "& .MuiOutlinedInput-root": { borderRadius: "14px", backgroundColor: "color-mix(in srgb, var(--background) 48%, transparent)" } }}
                                                    InputProps={{
                                                        endAdornment: (
                                                            <InputAdornment position="end">
                                                                <IconButton
                                                                    type="button"
                                                                    aria-label={showPassword ? "Hide password" : "Show password"}
                                                                    edge="end"
                                                                    onMouseDown={(event) => event.preventDefault()}
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
                                            </Box>
                                        </Box>
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

                                        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
                                            <Box>
                                                <TextField
                                                    fullWidth
                                                    label="Business Name"
                                                    name="business.name"
                                                    value={
                                                        formData.business.name
                                                    }
                                                    onChange={handleChange}
                                                    sx={{ "& .MuiOutlinedInput-root": { borderRadius: "14px", backgroundColor: "color-mix(in srgb, var(--background) 48%, transparent)" } }}
                                                />
                                            </Box>

                                            <Box>
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
                                                    sx={{ "& .MuiOutlinedInput-root": { borderRadius: "14px", backgroundColor: "color-mix(in srgb, var(--background) 48%, transparent)" } }}
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
                                            </Box>

                                            <Box>
                                                <TextField
                                                    fullWidth
                                                    label="Business Email"
                                                    type="email"
                                                    name="business.email"
                                                    value={
                                                        formData.business.email
                                                    }
                                                    onChange={handleChange}
                                                    sx={{ "& .MuiOutlinedInput-root": { borderRadius: "14px", backgroundColor: "color-mix(in srgb, var(--background) 48%, transparent)" } }}
                                                />
                                            </Box>

                                            <Box>
                                                <TextField
                                                    fullWidth
                                                    label="Phone Number"
                                                    name="business.phone"
                                                    value={
                                                        formData.business.phone
                                                    }
                                                    onChange={handleChange}
                                                    sx={{ "& .MuiOutlinedInput-root": { borderRadius: "14px", backgroundColor: "color-mix(in srgb, var(--background) 48%, transparent)" } }}
                                                />
                                            </Box>

                                            <Box sx={{ gridColumn: "1 / -1" }}>
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
                                                    sx={{ "& .MuiOutlinedInput-root": { borderRadius: "14px", backgroundColor: "color-mix(in srgb, var(--background) 48%, transparent)" } }}
                                                />
                                            </Box>
                                        </Box>
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
                    </Box>
            </Card>
        </Box>
    );
}
