"use client";

import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import IconButton from '@mui/material/IconButton';
import Slide from '@mui/material/Slide';
import useMediaQuery from '@mui/material/useMediaQuery';
import { alpha } from '@mui/material/styles';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import ErrorRoundedIcon from '@mui/icons-material/ErrorRounded';
import InfoRoundedIcon from '@mui/icons-material/InfoRounded';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';
import { useThemeToggle } from "./ThemeRegistry";

export type Severity = 'success' | 'error' | 'warning' | 'info';

interface SnackbarContextType {
    showSnackbar: (message: string, severity?: Severity) => void;
}

const SnackbarContext = createContext<SnackbarContextType>({
    showSnackbar: () => { },
});

export const SnackbarProviderCustom = ({
    children,
}: {
    children: React.ReactNode;
}) => {
    const { mode } = useThemeToggle();
    const isMobile = useMediaQuery("(max-width:600px)");
    const [open, setOpen] = useState(false);
    const [message, setMessage] = useState('');
    const [severity, setSeverity] = useState<Severity>('info');
    const lastShownRef = useRef<{ key: string; shownAt: number } | null>(null);

    const showSnackbar = useCallback((
        msg: string,
        type: Severity = 'info'
    ) => {
        const key = `${type}:${msg}`;
        const now = Date.now();

        if (lastShownRef.current?.key === key && now - lastShownRef.current.shownAt < 1200) {
            return;
        }

        lastShownRef.current = { key, shownAt: now };
        setMessage(msg);
        setSeverity(type);
        setOpen(true);
    }, []);

    const palette = useMemo(() => {
        const base =
            mode === "dark"
                ? {
                    surface: "rgba(31, 44, 47, 0.94)",
                    border: "rgba(255,255,255,0.14)",
                    text: "#f7fbfa",
                    shadow: "0 18px 46px rgba(0,0,0,0.42)",
                }
                : {
                    surface: "rgba(255,255,255,0.96)",
                    border: "rgba(31, 42, 43, 0.10)",
                    text: "#1f2a2b",
                    shadow: "0 18px 44px rgba(31,42,43,0.16)",
                };

        const colorBySeverity = {
            success: "#2eaf6f",
            error: "#d64545",
            warning: "#fbbf24",
            info: "#2563eb",
        } as const;

        return {
            ...base,
            accent: colorBySeverity[severity],
            warningAccent: colorBySeverity.warning,
            accentSoft:
                severity === "success"
                    ? alpha(colorBySeverity.success, mode === "dark" ? 0.18 : 0.12)
                : severity === "error"
                        ? alpha(colorBySeverity.error, mode === "dark" ? 0.18 : 0.12)
                        : severity === "warning"
                            ? alpha(colorBySeverity.warning, mode === "dark" ? 0.42 : 0.28)
                            : alpha(colorBySeverity.info, mode === "dark" ? 0.18 : 0.12),
        };
    }, [mode, severity]);

    const alertSx = {
        width: "100%",
        alignItems: "center",
        display: "flex",
        justifyContent: "space-between",
        borderRadius: { xs: "18px", sm: "18px" },
        minHeight: { xs: 58, sm: 60 },
        border: `1px solid ${palette.border}`,
        background: `linear-gradient(135deg, ${palette.surface} 0%, ${palette.surface} 52%, ${palette.accentSoft} 100%)`,
        color: palette.text,
        boxShadow: palette.shadow,
        backdropFilter: "blur(20px)",
        minWidth: 0,
        gap: 1,
        px: { xs: 1.25, sm: 1.5 },
        py: { xs: 1.1, sm: 1.2 },
        position: "relative",
        overflow: "hidden",
        "&::before": {
            content: '""',
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            width: 5,
            backgroundColor: palette.accent,
        },
        "& .MuiAlert-message": {
            flex: 1,
            fontWeight: 750,
            fontSize: { xs: "0.9rem", sm: "0.95rem" },
            lineHeight: 1.3,
            overflowWrap: "anywhere",
            whiteSpace: "normal",
            minWidth: 0,
            pr: 1,
            alignSelf: "center",
        },
        "& .MuiAlert-action": {
            alignItems: "center",
            pt: 0,
            ml: "auto",
            mr: 0.5,
            mt: 0,
            flexShrink: 0,
        },
        "& .MuiAlert-icon": {
            display: "flex",
            width: 34,
            height: 34,
            borderRadius: "12px",
            alignItems: "center",
            justifyContent: "center",
            py: 0,
            mr: 0.75,
            alignSelf: "center",
            backgroundColor: alpha(palette.accent, mode === "dark" ? 0.16 : 0.1),
        },
        "& .MuiSvgIcon-root": {
            color: palette.accent,
        },
        "&.MuiAlert-standardWarning": {
            borderColor: alpha(palette.warningAccent, mode === "dark" ? 0.78 : 0.65),
            background:
                mode === "dark"
                    ? "linear-gradient(135deg, rgba(122, 92, 8, 0.98), rgba(57, 41, 8, 0.98))"
                    : "linear-gradient(135deg, rgba(255, 245, 186, 1), rgba(253, 224, 71, 0.96))",
            color: mode === "dark" ? "#fffdf2" : "#5f4300",
            boxShadow:
                mode === "dark"
                    ? "0 18px 42px rgba(0,0,0,0.44), inset 0 1px 0 rgba(255,255,255,0.08)"
                    : "0 18px 42px rgba(120,90,0,0.18), inset 0 1px 0 rgba(255,255,255,0.55)",
        },
    } as any;

    const severityIcon = {
        success: <CheckCircleRoundedIcon fontSize="small" />,
        error: <ErrorRoundedIcon fontSize="small" />,
        warning: <WarningAmberRoundedIcon fontSize="small" />,
        info: <InfoRoundedIcon fontSize="small" />,
    }[severity];

    const contextValue = useMemo(() => ({ showSnackbar }), [showSnackbar]);

    return (
        <SnackbarContext.Provider value={contextValue}>
            {children}

            <Snackbar
                open={open}
                autoHideDuration={4200}
                onClose={(_, reason) => {
                    if (reason === 'clickaway') return;
                    setOpen(false);
                }}
                anchorOrigin={{
                    vertical: isMobile ? 'bottom' : 'top',
                    horizontal: isMobile ? 'center' : 'right',
                }}
                TransitionComponent={(props) => (
                    <Slide {...props} direction={isMobile ? "up" : "down"} timeout={{ enter: 260, exit: 180 }} />
                )}
                sx={{
                    top: { sm: 18 },
                    right: { sm: 18 },
                    bottom: { xs: "calc(env(safe-area-inset-bottom) + 76px)", sm: "auto" },
                    left: { xs: 12, sm: "auto" },
                    width: { xs: "calc(100vw - 24px)", sm: "auto" },
                    maxWidth: { xs: "calc(100vw - 24px)", sm: 520 },
                }}
            >
                <Alert
                    severity={severity}
                    icon={severityIcon}
                    variant="outlined"
                    action={
                        <IconButton
                            aria-label="close snackbar"
                            size="small"
                            onClick={() => setOpen(false)}
                            sx={{
                                flexShrink: 0,
                                alignSelf: "center",
                                color: palette.accent,
                                backgroundColor: alpha(palette.accent, mode === "dark" ? 0.12 : 0.08),
                                border: `1px solid ${alpha(palette.accent, 0.2)}`,
                                "&:hover": {
                                    backgroundColor: alpha(palette.accent, mode === "dark" ? 0.2 : 0.12),
                                },
                            }}
                        >
                            <CloseRoundedIcon fontSize="small" />
                        </IconButton>
                    }
                    sx={alertSx}
                >
                    {message ? message.charAt(0).toUpperCase() + message.slice(1) : message}
                </Alert>
            </Snackbar>
        </SnackbarContext.Provider>
    );
};

export const useAppSnackbar = () => useContext(SnackbarContext);
