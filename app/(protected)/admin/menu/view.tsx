"use client";

import * as React from "react";
import {
    Box,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Divider,
    Button,
    Stack,
    Typography,
    useMediaQuery,
    capitalize,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { getFoodTypeLabel, resolveMenuImageUrl, type MenuRow } from "@/lib/api";

type MenuViewDialogProps = {
    open: boolean;
    item: MenuRow | null;
    onClose: () => void;
};

const DetailRow = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <Stack spacing={0.5}>
        <Typography sx={{ fontSize: "0.8rem", letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--muted-foreground)" }}>
            {label}
        </Typography>
        <Typography sx={{ fontWeight: 700, color: "var(--foreground)", wordBreak: "break-word" }}>{value}</Typography>
    </Stack>
);

export default function MenuViewDialog({ open, item, onClose }: MenuViewDialogProps) {
    const theme = useTheme();
    const fullScreen = useMediaQuery(theme.breakpoints.down("sm"));
    const imageSrc = resolveMenuImageUrl(item?.imageUrl ?? null);

    return (
        <Dialog
            open={open}
            onClose={onClose}
            fullWidth
            fullScreen={fullScreen}
            maxWidth="sm"
            scroll="paper"
            PaperProps={{
                sx: {
                    borderRadius: fullScreen ? 0 : "24px",
                    overflow: "hidden",
                    background:
                        "linear-gradient(145deg, color-mix(in srgb, var(--card) 96%, transparent), color-mix(in srgb, var(--accent) 12%, var(--card)))",
                    maxHeight: fullScreen ? "100dvh" : "min(88dvh, 820px)",
                },
            }}
        >
            <DialogTitle sx={{ px: { xs: 2.25, sm: 3 }, pt: { xs: 2.25, sm: 3 }, pb: 1.5 }}>
                <Typography component="div" variant="h5" sx={{ fontWeight: 900, color: "var(--foreground)" }}>
                    Product Details
                </Typography>
                <Typography sx={{ mt: 0.75, color: "var(--muted-foreground)", fontSize: "0.95rem", lineHeight: 1.55 }}>
                    Menu image, availability, pricing, and category information.
                </Typography>
            </DialogTitle>
            <DialogContent
                dividers
                sx={{
                    p: { xs: 2.25, sm: 3 },
                    overflowX: "visible",
                    overflowY: "auto",
                    scrollbarWidth: "thin",
                    "&::-webkit-scrollbar": {
                        width: 8,
                    },
                    "&::-webkit-scrollbar-thumb": {
                        backgroundColor: "color-mix(in srgb, var(--border) 80%, transparent)",
                        borderRadius: 999,
                    },
                }}
            >
                {item ? (
                    <Stack spacing={3}>
                        <Box
                            sx={{
                                display: "grid",
                                gridTemplateColumns: { xs: "1fr", sm: "minmax(190px, 0.9fr) minmax(0, 1fr)" },
                                gap: { xs: 2, sm: 2.5 },
                                alignItems: "stretch",
                                p: { xs: 1.25, sm: 1.5 },
                                borderRadius: "24px",
                                border: "1px solid var(--border)",
                                background:
                                    "linear-gradient(135deg, color-mix(in srgb, var(--accent) 18%, transparent), color-mix(in srgb, var(--card) 92%, transparent))",
                                boxShadow: "var(--soft-shadow)",
                            }}
                        >
                            <Box
                                sx={{
                                    minHeight: { xs: 230, sm: 260 },
                                    borderRadius: "20px",
                                    overflow: "hidden",
                                    backgroundColor: "color-mix(in srgb, var(--muted) 60%, transparent)",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                }}
                            >
                                {imageSrc ? (
                                    <Box
                                        component="img"
                                        src={imageSrc}
                                        alt={item.name}
                                        sx={{
                                            width: "100%",
                                            height: "100%",
                                            minHeight: { xs: 230, sm: 260 },
                                            objectFit: "cover",
                                            display: "block",
                                        }}
                                    />
                                ) : (
                                    <Typography sx={{ color: "var(--muted-foreground)", fontWeight: 700 }}>No image uploaded</Typography>
                                )}
                            </Box>

                            <Stack spacing={2} sx={{ p: { xs: 0.5, sm: 1 }, minWidth: 0, justifyContent: "space-between" }}>
                                <Stack spacing={1}>
                                    <Typography variant="h5" sx={{ fontWeight: 900, color: "var(--foreground)", lineHeight: 1.2 }}>
                                        {capitalize(item.name)}
                                    </Typography>
                                    <Typography sx={{ color: "var(--muted-foreground)", lineHeight: 1.65 }}>
                                        {item.description || "No description available for this product."}
                                    </Typography>
                                </Stack>

                                <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                                    <Chip
                                        label={item.isAvailable ? "Available" : "Unavailable"}
                                        sx={{
                                            backgroundColor: item.isAvailable
                                                ? "var(--status-active-bg)"
                                                : "var(--status-inactive-bg)",
                                            color: item.isAvailable ? "var(--status-active-fg)" : "var(--status-inactive-fg)",
                                            fontWeight: 800,
                                        }}
                                    />
                                    <Chip
                                        label={getFoodTypeLabel(item.foodType)}
                                        sx={{
                                            backgroundColor: "color-mix(in srgb, var(--accent) 45%, transparent)",
                                            color: "var(--foreground)",
                                            fontWeight: 800,
                                        }}
                                    />
                                    <Chip
                                        label={capitalize(item.category)}
                                        sx={{
                                            backgroundColor: "color-mix(in srgb, var(--secondary) 70%, transparent)",
                                            color: "var(--foreground)",
                                            fontWeight: 800,
                                        }}
                                    />
                                </Stack>

                                <Box
                                    sx={{
                                        p: 1.75,
                                        borderRadius: "18px",
                                        border: "1px solid var(--border)",
                                        backgroundColor: "color-mix(in srgb, var(--background) 50%, transparent)",
                                    }}
                                >
                                    <Typography sx={{ color: "var(--muted-foreground)", fontSize: "0.8rem", fontWeight: 700 }}>
                                        Price
                                    </Typography>
                                    <Typography sx={{ mt: 0.25, color: "var(--foreground)", fontSize: "1.45rem", fontWeight: 900 }}>
                                        Rs. {item.price}
                                    </Typography>
                                </Box>
                            </Stack>
                        </Box>

                        <Divider />

                        <Box
                            sx={{
                                display: "grid",
                                gap: 2,
                                gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
                            }}
                        >
                            <DetailRow label="Category" value={capitalize(item.category)} />
                            <DetailRow label="Food Type" value={getFoodTypeLabel(item.foodType)} />
                            <DetailRow label="Created At" value={new Date(item.createdAt).toLocaleString()} />
                        </Box>
                    </Stack>
                ) : null}
            </DialogContent>
            <DialogActions sx={{ px: { xs: 2.25, sm: 3 }, pb: { xs: 2.25, sm: 3 }, pt: 1.5 }}>
                <Button
                    variant="contained"
                    onClick={onClose}
                    sx={{
                        borderRadius: "12px",
                        backgroundColor: "var(--primary)",
                        color: "var(--primary-foreground)",
                    }}
                >
                    Close
                </Button>
            </DialogActions>
        </Dialog>
    );
}

