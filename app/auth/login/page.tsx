"use client";

import * as React from "react";
import {
    Alert,
    Box,
    Button,
    Link,
    Paper,
    TextField,
    Typography,
} from "@mui/material";

import { useAppSnackbar } from "@/components/common/SnackBar";
import { apiRequest } from "@/lib/api";
import { safeError } from "@/lib/safeError";
import { useRouter } from "next/navigation";

const API_BASE = process.env.NEXT_PUBLIC_API_URL;

export default function AuthPage() {
    const [email, setEmail] = React.useState("");
    const [password, setPassword] = React.useState("");
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

            window.setTimeout(() => {
                const params = new URLSearchParams(window.location.search);
                const redirectTo = params.get("redirect");
                router.push(redirectTo?.startsWith("/admin") ? redirectTo : "/admin/dashboard");
            }, 700);
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
                display: "grid",
                placeItems: "center",
            }}
        >
            <Paper
                component="form"
                onSubmit={handleSubmit}
                sx={{
                    p: 3,
                    width: 420,
                    display: "grid",
                    gap: 2,
                }}
            >
                <Typography variant="h5">
                    Sign in
                </Typography>

                {hasSession && !error && (
                    <Alert severity="success">
                        Session detected
                    </Alert>
                )}

                {error && (
                    <Alert severity="error">
                        {error}
                    </Alert>
                )}

                <TextField
                    label="Email"
                    value={email}
                    onChange={(e) =>
                        setEmail(e.target.value)
                    }
                    fullWidth
                    required
                />

                <TextField
                    label="Password"
                    type="password"
                    value={password}
                    onChange={(e) =>
                        setPassword(e.target.value)
                    }
                    fullWidth
                    required
                />

                <Button
                    type="submit"
                    fullWidth
                    variant="contained"
                    disabled={loading}
                >
                    {loading
                        ? "Signing in..."
                        : "Sign in"}
                </Button>

                <Typography>
                    Don't have an account?{" "}
                    <Link href="/auth/register">
                        Sign up
                    </Link>
                </Typography>
            </Paper>
        </Box>
    );
}
