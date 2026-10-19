"use client";

import * as React from "react";
import { Box, Button, CircularProgress, Paper, Stack, Typography } from "@mui/material";
import CheckCircleOutlineRoundedIcon from "@mui/icons-material/CheckCircleOutlineRounded";
import ErrorOutlineRoundedIcon from "@mui/icons-material/ErrorOutlineRounded";
import { useRouter } from "next/navigation";
import ThemeToggle from "@/components/common/ThemeToggle";
import { verifyEmail } from "@/lib/api";
import { safeError } from "@/lib/safeError";

export default function VerifyEmailPage() {
    const router = useRouter();
    const [status, setStatus] = React.useState<"verifying" | "success" | "error">("verifying");
    const [message, setMessage] = React.useState("Verifying your email...");

    React.useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const token = params.get("token");

        if (!token) {
            setStatus("error");
            setMessage("This verification link is missing its token. Please use the link from your email.");
            return;
        }

        let cancelled = false;

        verifyEmail(token)
            .then((result) => {
                if (cancelled) return;
                setStatus("success");
                setMessage(result);
            })
            .catch((error) => {
                if (cancelled) return;
                setStatus("error");
                setMessage(safeError(error, "Email verification failed. Please try again."));
            });

        return () => {
            cancelled = true;
        };
    }, []);

    return (
        <Box
            sx={{
                minHeight: "100vh",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                position: "relative",
                px: { xs: 1.5, sm: 2, md: 4 },
                py: { xs: 2, md: 4 },
                backgroundColor: "var(--background)",
                backgroundImage: "var(--page-gradient)",
            }}
        >
            <Box
                sx={{
                    position: "fixed",
                    top: { xs: 14, sm: 22 },
                    right: { xs: 14, sm: 22 },
                    zIndex: 20,
                }}
            >
                <ThemeToggle />
            </Box>

            <Paper
                sx={{
                    width: "min(100%, 460px)",
                    borderRadius: { xs: "24px", md: "28px" },
                    border: "1px solid var(--border)",
                    backgroundColor: "color-mix(in srgb, var(--card) 94%, transparent)",
                    backgroundImage: "var(--surface-gradient)",
                    boxShadow: "var(--soft-shadow)",
                    backdropFilter: "blur(14px)",
                    p: { xs: 3, sm: 4 },
                }}
            >
                <Stack spacing={2} alignItems="center" sx={{ textAlign: "center", py: 1.5 }}>
                    {status === "verifying" ? (
                        <>
                            <CircularProgress size={44} sx={{ color: "var(--primary)" }} />
                            <Typography sx={{ fontWeight: 800 }}>{message}</Typography>
                        </>
                    ) : (
                        <>
                            <Box
                                sx={{
                                    width: 64,
                                    height: 64,
                                    borderRadius: "20px",
                                    display: "grid",
                                    placeItems: "center",
                                    backgroundColor:
                                        status === "success"
                                            ? "color-mix(in srgb, var(--accent) 16%, transparent)"
                                            : "color-mix(in srgb, #fca5a5 16%, transparent)",
                                }}
                            >
                                {status === "success" ? (
                                    <CheckCircleOutlineRoundedIcon sx={{ fontSize: 34, color: "var(--accent)" }} />
                                ) : (
                                    <ErrorOutlineRoundedIcon sx={{ fontSize: 34, color: "#fca5a5" }} />
                                )}
                            </Box>
                            <Typography sx={{ fontWeight: 900, fontSize: "1.25rem" }}>
                                {status === "success" ? "Email verified!" : "Verification failed"}
                            </Typography>
                            <Typography sx={{ color: "var(--muted-foreground)", lineHeight: 1.7 }}>{message}</Typography>
                            <Button
                                variant="contained"
                                onClick={() => router.push("/auth/login")}
                                sx={{ mt: 1, borderRadius: "14px", fontWeight: 900, textTransform: "none", px: 4, minHeight: 46 }}
                            >
                                {status === "success" ? "Continue to login" : "Back to login"}
                            </Button>
                        </>
                    )}
                </Stack>
            </Paper>
        </Box>
    );
}
