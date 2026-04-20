"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Alert, Box, Button, Paper, TextField, Typography } from "@mui/material";

const API_BASE = process.env.NEXT_PUBLIC_API_URL;

export default function AuthPage() {
    const router = useRouter();
    const [email, setEmail] = React.useState("");
    const [password, setPassword] = React.useState("");
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);

  const [hasSession, setHasSession] = React.useState(false);

  React.useEffect(() => {
    setHasSession(document.cookie.includes("authToken="));
  }, []);

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setError(null);
        setLoading(true);

        try {
            if (!API_BASE) {
                throw new Error("Missing NEXT_PUBLIC_API_URL");
            }

            const url = `${API_BASE.replace(/\/$/, "")}/login`;
            const res = await fetch(url, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ email, password }),
            });

            if (!res.ok) {
                const text = await res.text();
                throw new Error(text || "Login failed");
            }

            const data = (await res.json()) as {
                data?: { access_token?: string; token_type?: string };
            };
            const token = data?.data?.access_token;
            const tokenType = data?.data?.token_type ?? "Bearer";
            if (!token) {
                throw new Error("No access token returned from server");
            }

            const cookieRes = await fetch("/api/auth-cookie", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ token }),
            });

            if (!cookieRes.ok) {
                throw new Error("Unable to set auth cookie");
            }

            window.localStorage.setItem("authToken", token);
            window.localStorage.setItem("authTokenType", tokenType);
            window.location.href = "/admin/dashboard";
        } catch (err) {
            setError(err instanceof Error ? err.message : "Login failed");
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
                backgroundColor: "var(--background)",
                color: "var(--foreground)",
                p: 3,
            }}
        >
            <Paper
                component="form"
                onSubmit={handleSubmit}
                sx={{
                    width: "100%",
                    maxWidth: 420,
                    p: 3,
                    borderRadius: "16px",
                    border: "1px solid var(--border)",
                    backgroundColor: "var(--card)",
                    boxShadow: "0 16px 32px rgba(0, 0, 0, 0.12)",
                    display: "grid",
                    gap: 2,
                }}
            >
                <Box>
                    <Typography variant="h5" sx={{ fontWeight: 700 }}>
                        Sign in
                    </Typography>
                    <Typography sx={{ color: "var(--muted-foreground)", mt: 0.5 }}>
                        Please sign in to access the admin panel.
                    </Typography>
                </Box>

        {hasSession && !error && (
          <Alert severity="success">Session detected. You can continue to the dashboard.</Alert>
        )}
        {error && <Alert severity="error">{error}</Alert>}

                <TextField
                    label="Email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    fullWidth
                />
                <TextField
                    label="Password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    fullWidth
                />

        <Button
          type="submit"
          variant="contained"
          disabled={loading}
                    sx={{
                        borderRadius: "12px",
                        backgroundColor: "var(--primary)",
                        color: "var(--primary-foreground)",
                        py: 1.2,
                    }}
                >
          {loading ? "Signing in..." : "Sign in"}
        </Button>
        {hasSession && (
          <Button
            variant="outlined"
            type="button"
            onClick={() => (window.location.href = "/admin/dashboard")}
            sx={{ borderRadius: "12px", borderColor: "var(--border)", color: "var(--foreground)" }}
          >
            Go to Dashboard
          </Button>
        )}
      </Paper>
        </Box>
    );
}
