"use client";

import * as React from "react";
import {
    Box,
    Button,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    IconButton,
    Stack,
    Typography,
    capitalize,
} from "@mui/material";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import ImageOutlinedIcon from "@mui/icons-material/ImageOutlined";
import { getFoodTypeLabel, resolveMenuImageUrl, type MenuRow } from "@/lib/api";

type MenuViewDialogProps = {
    open: boolean;
    item: MenuRow | null;
    onClose: () => void;
};

const DetailTile = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <Box
        sx={{
            minWidth: 0,
            p: 1.5,
            borderRadius: "14px",
            border: "1px solid var(--border)",
            backgroundColor: "color-mix(in srgb, var(--muted) 45%, transparent)",
        }}
    >
        <Typography
            sx={{
                fontSize: "0.68rem",
                fontWeight: 800,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "var(--muted-foreground)",
            }}
        >
            {label}
        </Typography>
        <Typography sx={{ mt: 0.4, fontWeight: 800, color: "var(--foreground)", overflowWrap: "anywhere" }}>
            {value}
        </Typography>
    </Box>
);

export const foodTypeTone: Record<MenuRow["foodType"], string> = {
    veg: "var(--food-veg)",
    vegan: "var(--food-vegan)",
    egg: "var(--food-egg)",
    "non-veg": "var(--food-nonveg)",
};

export default function MenuViewDialog({ open, item, onClose }: MenuViewDialogProps) {
    const imageSrc = resolveMenuImageUrl(item?.imageUrl ?? null);
    const tone = item ? foodTypeTone[item.foodType] : "var(--muted-foreground)";

    return (
        <Dialog
            open={open}
            onClose={onClose}
            fullWidth
            maxWidth="md"
            PaperProps={{
                sx: {
                    width: { xs: "calc(100% - 20px)", sm: "100%" },
                    m: { xs: "10px", sm: "32px" },
                    borderRadius: "22px",
                    overflow: "hidden",
                    display: "flex",
                    flexDirection: "column",
                    maxHeight: { xs: "calc(100vh - 20px)", sm: "min(88vh, 780px)" },
                    "@supports (height: 100dvh)": {
                        maxHeight: { xs: "calc(100dvh - 20px)", sm: "min(88dvh, 780px)" },
                    },
                    border: "1px solid var(--border)",
                    backgroundColor: "var(--card)",
                    backgroundImage:
                        "radial-gradient(520px 260px at 92% -10%, color-mix(in srgb, var(--primary) 16%, transparent), transparent 65%)",
                    boxShadow: "0 24px 60px rgba(31, 42, 43, 0.24)",
                },
            }}
        >
            <DialogTitle
                component="div"
                sx={{
                    flexShrink: 0,
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    gap: 2,
                    px: { xs: 2, sm: 3 },
                    pt: { xs: 2, sm: 2.5 },
                    pb: 1.75,
                }}
            >
                <Box sx={{ minWidth: 0 }}>
                    <Typography
                        sx={{
                            fontSize: "0.7rem",
                            fontWeight: 800,
                            letterSpacing: "0.12em",
                            textTransform: "uppercase",
                            color: "var(--muted-foreground)",
                        }}
                    >
                        Menu item
                    </Typography>
                    <Typography
                        component="div"
                        sx={{ mt: 0.25, fontSize: { xs: "1.2rem", sm: "1.45rem" }, fontWeight: 900, lineHeight: 1.2 }}
                    >
                        Product details
                    </Typography>
                </Box>
                <IconButton
                    aria-label="Close product details"
                    onClick={onClose}
                    size="small"
                    sx={{
                        flexShrink: 0,
                        border: "1px solid var(--border)",
                        backgroundColor: "color-mix(in srgb, var(--card) 80%, transparent)",
                        color: "var(--foreground)",
                        "&:hover": { backgroundColor: "var(--muted)" },
                    }}
                >
                    <CloseRoundedIcon fontSize="small" />
                </IconButton>
            </DialogTitle>

            <DialogContent
                sx={{
                    px: { xs: 2, sm: 3 },
                    py: { xs: 2, sm: 2.5 },
                    flex: 1,
                    minHeight: 0,
                    borderTop: "1px solid var(--border)",
                    overflowY: "auto",
                    overflowX: "hidden",
                    scrollbarWidth: "thin",
                    "&::-webkit-scrollbar": { width: 8 },
                    "&::-webkit-scrollbar-thumb": {
                        backgroundColor: "color-mix(in srgb, var(--border) 80%, transparent)",
                        borderRadius: 999,
                    },
                }}
            >
                {item ? (
                    <Box
                        sx={{
                            display: "grid",
                            gridTemplateColumns: { xs: "minmax(0, 1fr)", md: "minmax(0, 0.92fr) minmax(0, 1.08fr)" },
                            gap: { xs: 2.25, md: 3 },
                            alignItems: "start",
                        }}
                    >
                        {/* Hero image with price + availability overlays */}
                        <Box
                            sx={{
                                position: "relative",
                                borderRadius: "20px",
                                overflow: "hidden",
                                border: "1px solid var(--border)",
                                backgroundColor: "color-mix(in srgb, var(--muted) 60%, transparent)",
                                aspectRatio: { xs: "16 / 10", md: "4 / 3.4" },
                                boxShadow: "var(--soft-shadow)",
                            }}
                        >
                            {imageSrc ? (
                                <Box
                                    component="img"
                                    src={imageSrc}
                                    alt={item.name}
                                    sx={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                                />
                            ) : (
                                <Stack
                                    spacing={1}
                                    alignItems="center"
                                    justifyContent="center"
                                    sx={{ width: "100%", height: "100%", color: "var(--muted-foreground)", p: 2 }}
                                >
                                    <ImageOutlinedIcon sx={{ fontSize: 34, opacity: 0.7 }} />
                                    <Typography sx={{ fontWeight: 700, fontSize: "0.9rem" }}>No image uploaded</Typography>
                                </Stack>
                            )}

                            <Box
                                sx={{
                                    position: "absolute",
                                    inset: 0,
                                    background:
                                        "linear-gradient(180deg, rgba(15, 23, 20, 0.32) 0%, transparent 34%, transparent 62%, rgba(15, 23, 20, 0.55) 100%)",
                                    pointerEvents: "none",
                                }}
                            />

                            <Stack
                                direction="row"
                                spacing={0.75}
                                alignItems="flex-start"
                                justifyContent="space-between"
                                sx={{ position: "absolute", top: 12, left: 12, right: 12, gap: 1 }}
                            >
                                <Chip
                                    size="small"
                                    label={item.isAvailable ? "Available" : "Unavailable"}
                                    icon={
                                        <Box
                                            component="span"
                                            sx={{
                                                width: 8,
                                                height: 8,
                                                ml: 1,
                                                borderRadius: "50%",
                                                backgroundColor: item.isAvailable ? "var(--status-active-fg)" : "var(--status-inactive-fg)",
                                            }}
                                        />
                                    }
                                    sx={{
                                        height: 26,
                                        fontWeight: 800,
                                        backgroundColor: item.isAvailable
                                            ? "var(--status-active-bg)"
                                            : "var(--status-inactive-bg)",
                                        color: item.isAvailable ? "var(--status-active-fg)" : "var(--status-inactive-fg)",
                                        "& .MuiChip-icon": { marginRight: "-2px" },
                                    }}
                                />
                                <Chip
                                    size="small"
                                    label={`Rs. ${item.price}`}
                                    sx={{
                                        height: 26,
                                        fontWeight: 900,
                                        backgroundColor: "color-mix(in srgb, var(--card) 88%, transparent)",
                                        color: "var(--foreground)",
                                        backdropFilter: "blur(6px)",
                                    }}
                                />
                            </Stack>
                        </Box>

                        {/* Details */}
                        <Stack spacing={2.25} sx={{ minWidth: 0 }}>
                            <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap">
                                <Chip
                                    size="small"
                                    label={capitalize(item.category)}
                                    sx={{
                                        fontWeight: 800,
                                        backgroundColor: "color-mix(in srgb, var(--secondary) 75%, transparent)",
                                        color: "var(--foreground)",
                                    }}
                                />
                                <Chip
                                    size="small"
                                    label={getFoodTypeLabel(item.foodType)}
                                    sx={{
                                        fontWeight: 800,
                                        backgroundColor: `color-mix(in srgb, ${tone} 14%, transparent)`,
                                        color: tone,
                                        border: `1px solid color-mix(in srgb, ${tone} 55%, transparent)`,
                                    }}
                                />
                            </Stack>

                            <Box sx={{ minWidth: 0 }}>
                                <Typography
                                    variant="h4"
                                    sx={{
                                        fontWeight: 900,
                                        color: "var(--foreground)",
                                        fontSize: { xs: "1.5rem", sm: "1.85rem" },
                                        lineHeight: 1.15,
                                        overflowWrap: "anywhere",
                                    }}
                                >
                                    {capitalize(item.name)}
                                </Typography>
                                <Typography sx={{ mt: 1, color: "var(--muted-foreground)", lineHeight: 1.7 }}>
                                    {item.description || "No description available for this product."}
                                </Typography>
                            </Box>

                            <Box
                                sx={{
                                    p: { xs: 1.75, sm: 2 },
                                    borderRadius: "18px",
                                    border: "1px solid color-mix(in srgb, var(--primary) 32%, var(--border))",
                                    background:
                                        "linear-gradient(135deg, color-mix(in srgb, var(--primary) 12%, transparent), color-mix(in srgb, var(--card) 70%, transparent))",
                                }}
                            >
                                <Typography
                                    sx={{
                                        fontSize: "0.68rem",
                                        fontWeight: 800,
                                        letterSpacing: "0.08em",
                                        textTransform: "uppercase",
                                        color: "var(--muted-foreground)",
                                    }}
                                >
                                    Selling price
                                </Typography>
                                <Typography
                                    sx={{
                                        mt: 0.25,
                                        fontSize: { xs: "1.6rem", sm: "1.9rem" },
                                        fontWeight: 900,
                                        lineHeight: 1.1,
                                        color: "var(--foreground)",
                                    }}
                                >
                                    Rs. {item.price}
                                </Typography>
                            </Box>

                            <Box
                                sx={{
                                    display: "grid",
                                    gridTemplateColumns: { xs: "1fr 1fr", sm: "repeat(3, minmax(0, 1fr))" },
                                    gap: 1.25,
                                }}
                            >
                                <DetailTile label="Category" value={capitalize(item.category)} />
                                <DetailTile
                                    label="Availability"
                                    value={
                                        <Box component="span" sx={{ color: item.isAvailable ? "var(--status-active-fg)" : "var(--status-inactive-fg)" }}>
                                            {item.isAvailable ? "Available" : "Unavailable"}
                                        </Box>
                                    }
                                />
                                <DetailTile
                                    label="Added on"
                                    value={new Date(item.createdAt).toLocaleDateString(undefined, {
                                        year: "numeric",
                                        month: "short",
                                        day: "numeric",
                                    })}
                                />
                            </Box>
                        </Stack>
                    </Box>
                ) : null}
            </DialogContent>

            <DialogActions
                sx={{
                    flexShrink: 0,
                    px: { xs: 2, sm: 3 },
                    py: { xs: 1.75, sm: 2 },
                    borderTop: "1px solid var(--border)",
                    gap: 1.5,
                }}
            >
                <Typography
                    sx={{
                        display: { xs: "none", sm: "block" },
                        mr: "auto",
                        color: "var(--muted-foreground)",
                        fontSize: "0.82rem",
                        fontWeight: 650,
                    }}
                >
                    Availability and pricing are managed from the menu editor.
                </Typography>
                <Button
                    variant="contained"
                    onClick={onClose}
                    fullWidth
                    sx={{
                        width: { xs: "100%", sm: "auto" },
                        minWidth: { sm: 130 },
                        borderRadius: "12px",
                        fontWeight: 800,
                        backgroundColor: "var(--primary)",
                        color: "var(--primary-foreground)",
                        boxShadow: "none",
                        "&:hover": { backgroundColor: "var(--primary)", boxShadow: "none", filter: "brightness(0.96)" },
                    }}
                >
                    Close
                </Button>
            </DialogActions>
        </Dialog>
    );
}
