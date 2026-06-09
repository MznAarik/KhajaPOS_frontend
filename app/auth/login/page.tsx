"use client";

import * as React from "react";
import {
    Alert,
    Box,
    Button,
    IconButton,
    InputAdornment,
    Link,
    Paper,
    Stack,
    TextField,
    Typography,
} from "@mui/material";
import { Visibility, VisibilityOff } from "@mui/icons-material";

import { useAppSnackbar } from "@/components/common/SnackBar";
import { apiRequest } from "@/lib/api";
import { safeError } from "@/lib/safeError";
import { useRouter } from "next/navigation";

const API_BASE = process.env.NEXT_PUBLIC_API_URL;

export default function AuthPage() {
    const [email, setEmail] = React.useState("");
    const [password, setPassword] = React.useState("");
    const [showPassword, setShowPassword] = React.useState(false);
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);
    const [hasSession, setHasSession] = React.useState(false);

    const { showSnackbar } = useAppSnackbar();
    const router = useRouter();
    const handledQueryMessageRef = React.useRef(false);

    React.useEffect(() => {
        const sessionExists = document.cookie.includes("authToken=");
        setHasSession(sessionExists);

        if (sessionExists) {
            showSnackbar("Existing session detected", "info");
        }
    }, [showSnackbar]);

    React.useEffect(() => {
        if (handledQueryMessageRef.current) return;

        const params = new URLSearchParams(window.location.search);
        const message = params.get("message");

        if (message) {
            handledQueryMessageRef.current = true;
            showSnackbar(message, message.toLowerCase().includes("expired") ? "warning" : "info");
        }
    }, [showSnackbar]);

    const handleSubmit = async (
        e: React.FormEvent<HTMLFormElement>
    ) => {
        e.preventDefault();

        setLoading(true);
        setError(null);

        try {
            if (!API_BASE) {
                throw new Error("API URL is not configured");
            }

            const url = `${API_BASE.replace(/\/$/, "")}/login`;

            const data = await apiRequest<any>(url, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    email,
                    password,
                }),
            });

            const token = data?.data?.access_token;
            const tokenType =
                data?.data?.token_type || "Bearer";

            if (!token) {
                throw new Error("Login succeeded, but no token was returned");
            }

            await apiRequest("/api/auth-cookie", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ token }),
            });

            localStorage.setItem("authToken", token);
            localStorage.setItem(
                "authTokenType",
                tokenType
            );

            setError(null);
            showSnackbar("Login successful", "success");

            const params = new URLSearchParams(window.location.search);
            const redirectTo = params.get("redirect");
            router.replace(redirectTo?.startsWith("/admin") ? redirectTo : "/admin/dashboard");
        } catch (err) {
            const message = safeError(err, "Login failed");
            setError(message);
            const lowered = message.toLowerCase();
            const severity =
                lowered.includes("not configured") ||
                    lowered.includes("missing")
                    ? "warning"
                    : lowered.includes("session") ||
                        lowered.includes("succeeded, but no token")
                        ? "info"
                        : "error";
            showSnackbar(message, severity);
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
            <Paper
                sx={{
                    width: "min(100%, 980px)",
                    minHeight: { xs: "auto", md: 620 },
                    display: "grid",
                    gridTemplateColumns: { xs: "1fr", md: "0.95fr 1.05fr" },
                    overflow: "hidden",
                    borderRadius: { xs: "24px", md: "32px" },
                    border: "1px solid var(--border)",
                    backgroundColor: "color-mix(in srgb, var(--card) 94%, transparent)",
                    backgroundImage: "var(--surface-gradient)",
                    boxShadow: "var(--soft-shadow)",
                    backdropFilter: "blur(14px)",
                }}
            >
                <Box
                    sx={{
                        display: { xs: "none", md: "flex" },
                        flexDirection: "column",
                        justifyContent: "space-between",
                        p: 4,
                        color: "var(--sidebar-foreground)",
                        background:
                            "radial-gradient(circle at 22% 10%, color-mix(in srgb, var(--sidebar-primary) 34%, transparent), transparent 34%), radial-gradient(circle at 88% 88%, color-mix(in srgb, var(--accent) 18%, transparent), transparent 38%), linear-gradient(160deg, var(--sidebar), color-mix(in srgb, var(--sidebar-accent) 52%, var(--sidebar)))",
                    }}
                >
                    <Box>
                        <Typography sx={{ fontSize: "0.78rem", letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--sidebar-primary)", fontWeight: 900 }}>
                            KhajaPOS
                        </Typography>
                        <Typography sx={{ mt: 1.5, fontSize: "2.35rem", lineHeight: 1.08, fontWeight: 950 }}>
                            Run food orders with less waiting.
                        </Typography>
                        <Typography sx={{ mt: 2, color: "color-mix(in srgb, var(--sidebar-foreground) 84%, var(--sidebar-primary) 16%)", lineHeight: 1.7 }}>
                            Manage menus, tables, kitchen orders, and customer flow from one clean dashboard.
                        </Typography>
                    </Box>

                    <Stack spacing={1.25}>
                        {["Live order tracking", "Menu and table management", "Fast admin dashboard"].map((item) => (
                            <Box
                                key={item}
                                sx={{
                                    px: 2,
                                    py: 1.25,
                                    borderRadius: "16px",
                                    border: "1px solid color-mix(in srgb, var(--sidebar-primary) 24%, transparent)",
                                    backgroundColor: "color-mix(in srgb, var(--sidebar-accent) 68%, transparent)",
                                    color: "var(--sidebar-foreground)",
                                    fontWeight: 800,
                                }}
                            >
                                {item}
                            </Box>
                        ))}
                    </Stack>
                </Box>

                <Box
                    component="form"
                    onSubmit={handleSubmit}
                    sx={{
                        p: { xs: 2.25, sm: 3.5, md: 5 },
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "center",
                        gap: 2,
                        minWidth: 0,
                        backgroundColor: "color-mix(in srgb, var(--card) 74%, transparent)",
                    }}
                >
                    <Box>
                        <Typography sx={{ display: { xs: "block", md: "none" }, color: "var(--primary)", fontWeight: 950, letterSpacing: "0.08em", textTransform: "uppercase", fontSize: "0.78rem", mb: 1 }}>
                            KhajaPOS
                        </Typography>
                        <Typography variant="h4" sx={{ fontWeight: 950, fontSize: { xs: "1.75rem", sm: "2.15rem" } }}>
                            Welcome back
                        </Typography>
                        <Typography sx={{ color: "var(--muted-foreground)", mt: 0.75 }}>
                            Sign in to continue managing your restaurant.
                        </Typography>
                    </Box>

                    {hasSession && !error && (
                        <Alert severity="success" sx={{ borderRadius: "14px" }}>
                            Session detected. You can continue or sign in again.
                        </Alert>
                    )}

                    {error && (
                        <Alert severity="error" sx={{ borderRadius: "14px" }}>
                            {error}
                        </Alert>
                    )}

                    <TextField
                        label="Email"
                        type="email"
                        value={email}
                        onChange={(e) =>
                            setEmail(e.target.value)
                        }
                        fullWidth
                        required
                        autoComplete="email"
                        sx={{ "& .MuiOutlinedInput-root": { borderRadius: "14px", backgroundColor: "color-mix(in srgb, var(--background) 48%, transparent)" } }}
                    />

                    <TextField
                        label="Password"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) =>
                            setPassword(e.target.value)
                        }
                        fullWidth
                        required
                        autoComplete="current-password"
                        InputProps={{
                            endAdornment: (
                                <InputAdornment position="end">
                                    <IconButton
                                        type="button"
                                        aria-label={showPassword ? "Hide password" : "Show password"}
                                        edge="end"
                                        onMouseDown={(event) => event.preventDefault()}
                                        onClick={() => setShowPassword((current) => !current)}
                                    >
                                        {showPassword ? <VisibilityOff /> : <Visibility />}
                                    </IconButton>
                                </InputAdornment>
                            ),
                        }}
                        sx={{ "& .MuiOutlinedInput-root": { borderRadius: "14px", backgroundColor: "color-mix(in srgb, var(--background) 48%, transparent)" } }}
                    />

                    <Button
                        type="submit"
                        fullWidth
                        variant="contained"
                        disabled={loading}
                        sx={{ minHeight: 50, borderRadius: "14px", fontWeight: 900, mt: 0.5 }}
                    >
                        {loading
                            ? "Signing in..."
                            : "Sign in"}
                    </Button>

                    <Typography sx={{ textAlign: "center", color: "var(--muted-foreground)" }}>
                        Don't have an account?{" "}
                        <Link href="/auth/register" underline="hover" sx={{ color: "var(--primary)", fontWeight: 900 }}>
                            Sign up
                        </Link>
                    </Typography>
                </Box>
            </Paper>
        </Box>
    );
}
