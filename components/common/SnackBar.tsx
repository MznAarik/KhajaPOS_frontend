"use client";

import React, { createContext, useContext, useMemo, useState } from 'react';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import IconButton from '@mui/material/IconButton';
import Slide, { SlideProps } from '@mui/material/Slide';
import Zoom from '@mui/material/Zoom';
import { alpha } from '@mui/material/styles';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import { useThemeToggle } from "./ThemeRegistry";

export type Severity = 'success' | 'error' | 'warning' | 'info';

interface SnackbarContextType {
    showSnackbar: (message: string, severity?: Severity) => void;
}

const SnackbarContext = createContext<SnackbarContextType>({
    showSnackbar: () => { },
});

function SlideTransition(props: SlideProps) {
    return <Slide {...props} direction="right" />;
}

export const SnackbarProviderCustom = ({
    children,
}: {
    children: React.ReactNode;
}) => {
    const { mode } = useThemeToggle();
    const [open, setOpen] = useState(false);
    const [message, setMessage] = useState('');
    const [severity, setSeverity] = useState<Severity>('info');
    const showSnackbar = (
        msg: string,
        type: Severity = 'info'
    ) => {
        setMessage(msg);
        setSeverity(type);
        setOpen(true);
    };

    const palette = useMemo(() => {
        const base =
            mode === "dark"
                ? {
                    surface: "rgba(18, 24, 30, 0.82)",
                    border: "rgba(255,255,255,0.12)",
                    text: "#f7fbfa",
                    shadow: "0 18px 40px rgba(0,0,0,0.38)",
                }
                : {
                    surface: "rgba(255,255,255,0.92)",
                    border: "rgba(31, 42, 43, 0.10)",
                    text: "#1f2a2b",
                    shadow: "0 18px 40px rgba(31,42,43,0.14)",
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

    return (
        <SnackbarContext.Provider value={{ showSnackbar }}>
            {children}

            <Snackbar
                open={open}
                autoHideDuration={4200}
                onClose={(_, reason) => {
                    if (reason === 'clickaway') return;
                    setOpen(false);
                }}
                anchorOrigin={{
                    vertical: 'top',
                    horizontal: 'right',
                }}
                TransitionComponent={Zoom}
                sx={{
                    top: { xs: 10, sm: 48 },
                    right: { xs: 10, sm: 18 },
                    left: "auto",
                    width: { xs: "calc(100vw - 20px)", sm: "auto" },
                    maxWidth: { xs: "calc(100vw - 20px)", sm: 520 },
                }}
            >
                <Alert
                    severity={severity}
                    icon={false}
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
                    sx={{
                        width: "100%",
                        alignItems: "center",
                        display: "flex",
                        justifyContent: "space-between",
                        borderRadius: { xs: 2, sm: 3 },
                        border: `1px solid ${palette.border}`,
                        background:
                            `linear-gradient(135deg, ${palette.surface}, ${palette.accentSoft})`,
                        color: palette.text,
                        boxShadow: palette.shadow,
                        backdropFilter: "blur(18px)",
                        minWidth: 0,
                        gap: 1,
                        px: { xs: 1.25, sm: 2 },
                        py: { xs: 1, sm: 1.35 },
                        "& .MuiAlert-message": {
                            flex: 1,
                            fontWeight: 500,
                            fontSize: { xs: "0.88rem", sm: "0.95rem" },
                            lineHeight: 1.45,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            minWidth: 0,
                            pr: 1,
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
                            py: 0.25,
                            mr: 1,
                            alignSelf: "center",
                        },
                        "& .MuiAlert-message": {
                            alignSelf: "center",
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
                    }}
                >
                    {message}
                </Alert>
            </Snackbar>
        </SnackbarContext.Provider>
    );
};

export const useAppSnackbar = () => useContext(SnackbarContext);
