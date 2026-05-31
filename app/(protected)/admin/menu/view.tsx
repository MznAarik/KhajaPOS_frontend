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
        <Typography sx={{ fontWeight: 600, color: "var(--foreground)" }}>{value}</Typography>
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
                    maxHeight: fullScreen ? "100dvh" : "min(88dvh, 820px)",
                },
            }}
        >
            <DialogTitle sx={{ pb: 1 }}>
                View Product
                <Typography sx={{ mt: 0.5, color: "var(--muted-foreground)", fontSize: "0.92rem" }}>
                    Review menu details, pricing, availability, and product image.
                </Typography>
            </DialogTitle>
            <DialogContent
                dividers
                sx={{
                    pt: 2.5,
                    overflowX: "visible",
                    overflowY: "auto",
                    pr: 1.5,
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
                    <Stack spacing={2.5}>
                        <Box
                            sx={{
                                width: "100%",
                                padding: "1rem 0",
                                minHeight: { xs: 220, sm: 280 },
                                borderRadius: "20px",
                                gap: 4,
                                overflow: "hidden",
                                border: "1px solid var(--border)",
                                background:
                                    "linear-gradient(135deg, color-mix(in srgb, var(--accent) 30%, transparent), color-mix(in srgb, var(--card) 90%, transparent))",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                            }}
                        >
                            {imageSrc ? (
                                <Box component="img" src={imageSrc} alt={item.name} sx={{ width: "70%", height: "100%", objectFit: "cover", borderRadius: "15px" }} />
                            ) : (
                                <Typography sx={{ color: "var(--muted-foreground)" }}>No image uploaded</Typography>
                            )}
                            <Stack direction={{ xs: "column", sm: "column" }} spacing={1.25} useFlexGap flexWrap="wrap">
                                <Chip
                                    label={item.isAvailable ? "Available" : "Unavailable"}
                                    sx={{
                                        backgroundColor: item.isAvailable
                                            ? "var(--status-active-bg)"
                                            : "var(--status-inactive-bg)",
                                        color: item.isAvailable ? "var(--status-active-fg)" : "var(--status-inactive-fg)",
                                        fontWeight: 700,
                                    }}
                                />
                                <Chip
                                    label={getFoodTypeLabel(item.foodType)}
                                    sx={{
                                        backgroundColor: "color-mix(in srgb, var(--accent) 45%, transparent)",
                                        color: "var(--foreground)",
                                        fontWeight: 700,
                                    }}
                                />
                                <Chip
                                    label={capitalize(item.category)}
                                    sx={{
                                        backgroundColor: "color-mix(in srgb, var(--secondary) 70%, transparent)",
                                        color: "var(--foreground)",
                                        fontWeight: 700,
                                    }}
                                />
                            </Stack>
                        </Box>


                        <Stack spacing={0.75}>
                            <Typography variant="h5" sx={{ fontWeight: 800 }}>
                                {capitalize(item.name)}
                            </Typography>
                            <Typography sx={{ color: "var(--muted-foreground)", lineHeight: 1.7 }}>
                                {item.description || "No description available for this product."}
                            </Typography>
                        </Stack>

                        <Divider />

                        <Box
                            sx={{
                                display: "grid",
                                gap: 2,
                                gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
                            }}
                        >
                            <DetailRow label="Category" value={capitalize(item.category)} />
                            <DetailRow label="Price" value={`Rs. ${item.price}`} />
                            <DetailRow label="Food Type" value={getFoodTypeLabel(item.foodType)} />
                            <DetailRow label="Created At" value={new Date(item.createdAt).toLocaleString()} />
                        </Box>
                    </Stack>
                ) : null}
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 3, pt: 1 }}>
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

