"use client";

import * as React from "react";
import {
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    MenuItem,
    Stack,
    TextField,
    Typography,
    useMediaQuery,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import CloudUploadOutlinedIcon from "@mui/icons-material/CloudUploadOutlined";
import {
    createMenu,
    getFoodTypeLabel,
    getCategories,
    type CategoryOption,
    type MenuEditorPayload,
    type MenuRow,
    resolveMenuImageUrl,
    updateMenu,
} from "@/lib/api";
import { useAppSnackbar } from "@/components/common/SnackBar";
import { safeError } from "@/lib/safeError";

type MenuEditDialogProps = {
    open: boolean;
    onClose: () => void;
    onSaved: () => Promise<void> | void;
    initialData?: MenuRow | null;
};

type FormState = {
    categoryId: string;
    name: string;
    description: string;
    price: string;
    foodType: "veg" | "non-veg" | "egg" | "vegan";
    isAvailable: boolean;
    imageFile: File | null;
    imageUrl: string | null;
};

const createInitialState = (initialData?: MenuRow | null): FormState => ({
    categoryId: initialData?.categoryId ? String(initialData.categoryId) : "",
    name: initialData?.name ?? "",
    description: initialData?.description ?? "",
    price: initialData?.price ?? "",
    foodType: initialData?.foodType ?? "veg",
    isAvailable: initialData?.isAvailable ?? true,
    imageFile: null,
    imageUrl: initialData?.imageUrl ?? null,
});

const floatingFieldSx = {
    mt: 1.75,
    "& .MuiInputLabel-root": {
        backgroundColor: "transparent",
        px: 0.75,
        borderRadius: "6px",
        lineHeight: 1.15,
        overflow: "visible",
        zIndex: 2,
    },
    "& .MuiInputLabel-root.MuiInputLabel-shrink": {
        transform: "translate(11px, -7px) scale(0.75)",
    },
    "& .MuiOutlinedInput-root": {
        overflow: "visible",
    },
    "& .MuiOutlinedInput-notchedOutline legend": {
        height: 12,
    },
};

export default function AddEditMenuDialog({
    open,
    onClose,
    onSaved,
    initialData,
}: MenuEditDialogProps) {
    const theme = useTheme();
    const fullScreen = useMediaQuery(theme.breakpoints.down("sm"));
    const [form, setForm] = React.useState<FormState>(() => createInitialState(initialData));
    const [categories, setCategories] = React.useState<CategoryOption[]>([]);
    const [saving, setSaving] = React.useState(false);
    const [error, setError] = React.useState<string>("");
    const imageInputRef = React.useRef<HTMLInputElement | null>(null);
    const { showSnackbar } = useAppSnackbar();

    React.useEffect(() => {
        if (open) {
            setForm(createInitialState(initialData));
            setError("");
        }
    }, [initialData, open]);

    React.useEffect(() => {
        if (!open) return;

        const loadCategories = async () => {
            try {
                const data = await getCategories();
                setCategories(data);
            } catch (loadError) {
                console.error("Failed to load categories:", loadError);
                showSnackbar(safeError(loadError, "Failed to load categories."), "error");
            }
        };

        loadCategories();
    }, [open, showSnackbar]);

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

    const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        handleFieldChange("imageFile")(event.target.files?.[0] ?? null);
        event.target.value = "";
    };

    const handleSubmit = async () => {
        const selectedCategory = categories.find((category) => String(category.id) === form.categoryId);
        const categoryName = initialData?.category ?? selectedCategory?.name ?? "";
        const categoryId = initialData?.categoryId ?? selectedCategory?.id;

        if (!categoryName.trim() || !form.name.trim() || !form.price.trim()) {
            const message = "Category, menu name, and price are required.";
            setError(message);
            showSnackbar(message, "warning");
            return;
        }

        setSaving(true);
        setError("");

        const payload: MenuEditorPayload = {
            categoryId,
            itemId: initialData?.id,
            categoryName: categoryName.trim(),
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
            const message = safeError(submitError, "Failed to save menu. Please verify the values and try again.");
            setError(message);
            showSnackbar(message, "error");
        } finally {
            setSaving(false);
        }
    };



    return (
        <>
            <Dialog
                open={open}
                onClose={saving ? undefined : onClose}
                fullWidth
                fullScreen={fullScreen}
                maxWidth="sm"
                PaperProps={{
                    sx: {
                        borderRadius: fullScreen ? 0 : "22px",
                        overflow: "visible",
                        display: "flex",
                        flexDirection: "column",
                        maxHeight: fullScreen ? "100dvh" : "92vh",
                        height: fullScreen ? "100dvh" : "auto",
                        zIndex: (theme) => theme.zIndex.modal + 2,
                    },
                }}
            >
                <DialogTitle sx={{ mb: 1, flexShrink: 0 }}>
                    {initialData ? "Update Menu Item" : "Add Menu Item"}
                    <Typography sx={{ mt: 0.5, color: "var(--muted-foreground)", fontSize: "0.92rem" }}>
                        {initialData
                            ? "Update menu details, availability, and image."
                            : "Choose an existing category, then add the menu item."}
                    </Typography>
                </DialogTitle>
                <DialogContent
                    sx={{
                        pt: 4,
                        overflowY: "auto",
                        overflowX: "visible",
                        flex: 1,
                        minHeight: 0,
                    }}
                >
                    <Stack spacing={2.5} sx={{ pb: 1.5, overflow: "visible" }}>
                        <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ pt: 0.75, overflow: "visible" }}>
                            <TextField
                                select
                                fullWidth
                                disabled={Boolean(initialData)}
                                sx={floatingFieldSx}
                                SelectProps={{ displayEmpty: false }}
                                label="Category"
                                value={form.categoryId}
                                onChange={(e) => handleFieldChange("categoryId")(e.target.value)}
                            >
                                {categories.map((category) => (
                                    <MenuItem key={category.id} value={String(category.id)}>
                                        {category.name}
                                    </MenuItem>
                                ))}
                            </TextField>
                            <TextField
                                select
                                fullWidth
                                sx={floatingFieldSx}
                                label="Food Type"
                                value={form.foodType}
                                onChange={(e) => handleFieldChange("foodType")(e.target.value as FormState["foodType"])}
                            >
                                <MenuItem value="veg">Veg</MenuItem>
                                <MenuItem value="non-veg">Non-Veg</MenuItem>
                                <MenuItem value="egg">{getFoodTypeLabel("egg")}</MenuItem>
                                <MenuItem value="vegan">{getFoodTypeLabel("vegan")}</MenuItem>
                            </TextField>
                        </Stack>

                        <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ overflow: "visible" }}>
                            <TextField
                                label="Menu Name"
                                value={form.name}
                                onChange={(e) => handleFieldChange("name")(e.target.value)}
                                fullWidth
                                sx={floatingFieldSx}
                            />

                            <TextField
                                label="Price"
                                type="number"
                                value={form.price}
                                onChange={(e) => handleFieldChange("price")(e.target.value)}
                                fullWidth
                                sx={floatingFieldSx}
                            />
                        </Stack>

                        <TextField
                            label="Menu Description"
                            value={form.description}
                            onChange={(e) => handleFieldChange("description")(e.target.value)}
                            fullWidth
                            multiline
                            minRows={3}
                            sx={floatingFieldSx}
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
                                    <input
                                        ref={imageInputRef}
                                        type="file"
                                        accept="image/*"
                                        onChange={handleImageChange}
                                        style={{ display: "none" }}
                                    />
                                    <Button
                                        type="button"
                                        variant="outlined"
                                        startIcon={<CloudUploadOutlinedIcon />}
                                        onClick={() => imageInputRef.current?.click()}
                                        sx={{
                                            position: "relative",
                                            zIndex: 1,
                                            alignSelf: { xs: "stretch", sm: "flex-start" },
                                            borderRadius: "12px",
                                            minHeight: 48,
                                            pointerEvents: "auto",
                                            touchAction: "manipulation",
                                        }}
                                    >
                                        Choose Image
                                    </Button>
                                </Stack>
                            </Stack>
                        </Box>

                        {error ? (
                            <Typography sx={{ color: "var(--status-inactive-fg)", fontSize: "0.9rem" }}>{error}</Typography>
                        ) : null}
                    </Stack>
                </DialogContent>
                <DialogActions
                    sx={{
                        px: 3,
                        pb: 3,
                        pt: 1,
                        flexShrink: 0,
                        borderTop: "1px solid var(--border)",
                        backgroundColor: "var(--card)",
                    }}
                >
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
        </>
    );
}
