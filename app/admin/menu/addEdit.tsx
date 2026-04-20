"use client";

import * as React from "react";
import {
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControl,
    InputLabel,
    MenuItem,
    Select,
    Stack,
    Switch,
    TextField,
    Typography,
    useMediaQuery,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import CloudUploadOutlinedIcon from "@mui/icons-material/CloudUploadOutlined";
import { createMenu, type MenuEditorPayload, type MenuRow, resolveMenuImageUrl, updateMenu } from "@/lib/api";

type MenuEditDialogProps = {
    open: boolean;
    onClose: () => void;
    onSaved: () => Promise<void> | void;
    initialData?: MenuRow | null;
};

type FormState = {
    categoryName: string;
    name: string;
    description: string;
    price: string;
    foodType: "veg" | "non-veg";
    isAvailable: boolean;
    imageFile: File | null;
    imageUrl: string | null;
};

const createInitialState = (initialData?: MenuRow | null): FormState => ({
    categoryName: initialData?.category ?? "",
    name: initialData?.name ?? "",
    description: initialData?.description ?? "",
    price: initialData?.price ?? "",
    foodType: initialData?.foodType ?? "veg",
    isAvailable: initialData?.isAvailable ?? true,
    imageFile: null,
    imageUrl: initialData?.imageUrl ?? null,
});

export default function AddEditMenuDialog({
    open,
    onClose,
    onSaved,
    initialData,
}: MenuEditDialogProps) {
    const theme = useTheme();
    const fullScreen = useMediaQuery(theme.breakpoints.down("sm"));
    const [form, setForm] = React.useState<FormState>(() => createInitialState(initialData));
    const [saving, setSaving] = React.useState(false);
    const [error, setError] = React.useState<string>("");

    React.useEffect(() => {
        if (open) {
            setForm(createInitialState(initialData));
            setError("");
        }
    }, [initialData, open]);

    const previewUrl = React.useMemo(() => {
        if (form.imageFile) {
            return URL.createObjectURL(form.imageFile);
        }
        return resolveMenuImageUrl(form.imageUrl);
    }, [form.imageFile, form.imageUrl]);

    React.useEffect(() => {
        return () => {
            if (previewUrl && form.imageFile) {
                URL.revokeObjectURL(previewUrl);
            }
        };
    }, [previewUrl, form.imageFile]);

    const handleFieldChange =
        <K extends keyof FormState>(key: K) =>
            (value: FormState[K]) => {
                setForm((current) => ({ ...current, [key]: value }));
            };

    const handleSubmit = async () => {
        if (!form.categoryName.trim() || !form.name.trim() || !form.price.trim()) {
            setError("Category, menu name, and price are required.");
            return;
        }

        setSaving(true);
        setError("");

        const payload: MenuEditorPayload = {
            categoryId: initialData?.categoryId,
            itemId: initialData?.id,
            categoryName: form.categoryName.trim(),
            name: form.name.trim(),
            description: form.description.trim(),
            price: form.price.trim(),
            foodType: form.foodType,
            isAvailable: form.isAvailable,
            imageFile: form.imageFile,
            imageUrl: form.imageUrl,
        };

        try {
            if (initialData) {
                await updateMenu(payload);
            } else {
                await createMenu(payload);
            }
            await onSaved();
            onClose();
        } catch (submitError) {
            console.error("Failed to save menu item:", submitError);
            setError("Failed to save menu. Please verify the values and try again.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog
            open={open}
            onClose={saving ? undefined : onClose}
            fullWidth
            fullScreen={fullScreen}
            maxWidth="sm"
            PaperProps={{
                sx: {
                    borderRadius: fullScreen ? 0 : "22px",
                    overflow: "hidden",
                },
            }}
        >
            <DialogTitle sx={{ mb:1 }}>
                {initialData ? "Update Menu Item" : "Add Menu Item"}
                <Typography sx={{ mt: 0.5, color: "var(--muted-foreground)", fontSize: "0.92rem" }}>
                    {initialData
                        ? "Update menu details, availability, and image."
                        : "Create a new category and menu item from this popup."}
                </Typography>
            </DialogTitle>
            <DialogContent sx={{ pt: 2, zIndex: 1 }}>
                <Stack spacing={2.25}>
                    <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                        <TextField
                            label="Category"
                            value={form.categoryName}
                            onChange={(e) => handleFieldChange("categoryName")(e.target.value)}
                            fullWidth
                        />
                        <FormControl fullWidth>
                            <InputLabel id="food-type-label">Food Type</InputLabel>
                            <Select
                                labelId="food-type-label"
                                label="Food Type"
                                value={form.foodType}
                                onChange={(e) => handleFieldChange("foodType")(e.target.value as "veg" | "non-veg")}
                            >
                                <MenuItem value="veg">Veg</MenuItem>
                                <MenuItem value="non-veg">Non-Veg</MenuItem>
                            </Select>
                        </FormControl>
                    </Stack>


                    <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                        <TextField
                            label="Menu Name"
                            value={form.name}
                            onChange={(e) => handleFieldChange("name")(e.target.value)}
                            fullWidth
                        />

                        <TextField
                            label="Price"
                            type="number"
                            value={form.price}
                            onChange={(e) => handleFieldChange("price")(e.target.value)}
                            fullWidth
                        />
                    </Stack>

                    <TextField
                        label="Menu Description"
                        value={form.description}
                        onChange={(e) => handleFieldChange("description")(e.target.value)}
                        fullWidth
                        multiline
                        minRows={3}
                    />

                    <Box
                        sx={{
                            border: "1px dashed var(--border)",
                            borderRadius: "18px",
                            p: 2,
                            backgroundColor: "var(--background)",
                        }}
                    >
                        <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ xs: "stretch", sm: "center" }}>
                            <Box
                                sx={{
                                    width: { xs: "100%", sm: 108 },
                                    height: 108,
                                    borderRadius: "16px",
                                    backgroundColor: "var(--card)",
                                    border: "1px solid var(--border)",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    overflow: "hidden",
                                    flexShrink: 0,
                                }}
                            >
                                {previewUrl ? (
                                    <Box component="img" src={previewUrl} alt="Menu preview" sx={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                ) : (
                                    <Typography sx={{ fontSize: "0.82rem", color: "var(--muted-foreground)" }}>No image</Typography>
                                )}
                            </Box>
                            <Stack spacing={1} sx={{ flex: 1 }}>
                                <Typography sx={{ fontWeight: 600 }}>Menu Image</Typography>
                                <Typography sx={{ fontSize: "0.85rem", color: "var(--muted-foreground)" }}>
                                    Upload a new image for this menu item. [png, jpg, jpeg formats supported]
                                </Typography>
                                <Button
                                    component="label"
                                    variant="outlined"
                                    startIcon={<CloudUploadOutlinedIcon />}
                                    sx={{ alignSelf: "flex-start", borderRadius: "12px" }}
                                >
                                    Choose Image
                                    <input
                                        hidden
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => handleFieldChange("imageFile")(e.target.files?.[0] ?? null)}
                                    />
                                </Button>
                            </Stack>
                        </Stack>
                    </Box>

                    {error ? (
                        <Typography sx={{ color: "#FF5A7A", fontSize: "0.9rem" }}>{error}</Typography>
                    ) : null}
                </Stack>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 3, pt: 1 }}>
                <Button
                    variant="outlined"
                    onClick={onClose}
                    disabled={saving}
                    sx={{ borderRadius: "12px", borderColor: "var(--border)", color: "var(--foreground)" }}
                >
                    Cancel
                </Button>
                <Button
                    variant="contained"
                    onClick={handleSubmit}
                    disabled={saving}
                    sx={{
                        borderRadius: "12px",
                        backgroundColor: "var(--primary)",
                        color: "var(--primary-foreground)",
                    }}
                >
                    {saving ? "Saving..." : initialData ? "Update Menu" : "Add Menu"}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
