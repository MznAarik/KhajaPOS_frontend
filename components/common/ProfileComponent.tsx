"use client";

import * as React from "react";
import PersonOutlineRoundedIcon from "@mui/icons-material/PersonOutlineRounded";
import LoginRoundedIcon from "@mui/icons-material/LoginRounded";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import ManageAccountsRoundedIcon from "@mui/icons-material/ManageAccountsRounded";
import {
    Avatar,
    Box,
    CircularProgress,
    IconButton,
    ListItemIcon,
    Menu,
    MenuItem,
    Tooltip,
    Typography,
} from "@mui/material";
import { useRouter } from "next/navigation";

const getInitials = () => "KP";

export default function ProfileComponent() {
    const router = useRouter();
    const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
    const [isAuthenticated, setIsAuthenticated] = React.useState<boolean | null>(null);
    const [isLoggingOut, setIsLoggingOut] = React.useState(false);

    React.useEffect(() => {
        const hasCookie = document.cookie.includes("authToken=");
        const hasStorage = Boolean(window.localStorage.getItem("authToken"));
        setIsAuthenticated(hasCookie || hasStorage);
    }, []);

    const handleOpen = (event: React.MouseEvent<HTMLElement>) => {
        setAnchorEl(event.currentTarget);
    };

    const handleClose = () => {
        setAnchorEl(null);
    };

    const handleLogin = () => {
        handleClose();
        router.push("/auth");
    };

    const handleEditProfile = () => {
        handleClose();
        router.push("/user");
    };

    const handleLogout = async () => {
        setIsLoggingOut(true);

        try {
            await fetch("/api/auth-cookie", {
                method: "DELETE",
            });
        } catch (error) {
            console.error("Failed to clear auth cookie:", error);
        } finally {
            window.localStorage.removeItem("authToken");
            window.localStorage.removeItem("authTokenType");
            setIsAuthenticated(false);
            handleClose();
            setIsLoggingOut(false);
            router.push("/auth");
            router.refresh();
        }
    };

    if (isAuthenticated === null) {
        return (
            <Box
                sx={{
                    width: 42,
                    height: 42,
                    borderRadius: "999px",
                    border: "1px solid var(--sidebar-border)",
                    display: "grid",
                    placeItems: "center",
                    backgroundColor: "color-mix(in srgb, var(--card) 76%, transparent)",
                }}
            >
                <CircularProgress size={18} sx={{ color: "var(--primary)" }} />
            </Box>
        );
    }

    return (
        <>
            <Tooltip title={isAuthenticated ? "Account" : "Login"}>
                <IconButton
                    onClick={handleOpen}
                    size="small"
                    sx={{
                        p: 0.4,
                        border: "1px solid var(--sidebar-border)",
                        backgroundColor: "color-mix(in srgb, var(--card) 82%, transparent)",
                        boxShadow: "0 10px 24px rgba(31, 42, 43, 0.12)",
                        "&:hover": {
                            backgroundColor: "color-mix(in srgb, var(--sidebar-accent) 76%, transparent)",
                        },
                    }}
                >
                    {isAuthenticated ? (
                        <Avatar
                            sx={{
                                width: 34,
                                height: 34,
                                fontSize: "0.82rem",
                                fontWeight: 700,
                                backgroundColor: "var(--primary)",
                                color: "var(--primary-foreground)",
                            }}
                        >
                            {getInitials()}
                        </Avatar>
                    ) : (
                        <Avatar
                            sx={{
                                width: 34,
                                height: 34,
                                backgroundColor: "transparent",
                                color: "var(--foreground)",
                            }}
                        >
                            <PersonOutlineRoundedIcon fontSize="small" />
                        </Avatar>
                    )}
                </IconButton>
            </Tooltip>

            <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleClose}
                anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                transformOrigin={{ vertical: "top", horizontal: "right" }}
                PaperProps={{
                    sx: {
                        mt: 1,
                        minWidth: 220,
                        borderRadius: "18px",
                        border: "1px solid var(--border)",
                        backgroundColor: "var(--card)",
                        color: "var(--foreground)",
                        boxShadow: "0 20px 44px rgba(31, 42, 43, 0.18)",
                        overflow: "visible",
                    },
                }}
            >
                <Box sx={{ px: 2, pt: 1.75, pb: 1 }}>
                    <Typography sx={{ fontWeight: 700 }}>
                        {isAuthenticated ? "Account" : "Guest"}
                    </Typography>
                    <Typography sx={{ fontSize: "0.84rem", color: "var(--muted-foreground)" }}>
                        {isAuthenticated ? "Manage your profile and session" : "Sign in to access your dashboard"}
                    </Typography>
                </Box>

                {isAuthenticated ? (
                    [
                        <MenuItem key="edit-profile" onClick={handleEditProfile} sx={{ py: 1.2 }}>
                            <ListItemIcon>
                                <ManageAccountsRoundedIcon fontSize="small" sx={{ color: "var(--foreground)" }} />
                            </ListItemIcon>
                            Edit Profile
                        </MenuItem>,
                        <MenuItem
                            key="logout"
                            onClick={handleLogout}
                            disabled={isLoggingOut}
                            sx={{ py: 1.2, color: "#d64545" }}
                        >
                            <ListItemIcon>
                                <LogoutRoundedIcon fontSize="small" sx={{ color: "#d64545" }} />
                            </ListItemIcon>
                            {isLoggingOut ? "Logging out..." : "Logout"}
                        </MenuItem>,
                    ]
                ) : (
                    <MenuItem onClick={handleLogin} sx={{ py: 1.2 }}>
                        <ListItemIcon>
                            <LoginRoundedIcon fontSize="small" sx={{ color: "var(--foreground)" }} />
                        </ListItemIcon>
                        Login
                    </MenuItem>
                )}
            </Menu>
        </>
    );
}
