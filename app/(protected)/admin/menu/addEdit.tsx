"use client";

import * as React from "react";
import {
    Box,
    Button,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    IconButton,
    InputAdornment,
    MenuItem,
    Slider,
    Stack,
    TextField,
    Typography,
} from "@mui/material";
import Cropper from "react-easy-crop";
import CloudUploadOutlinedIcon from "@mui/icons-material/CloudUploadOutlined";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import {
    createCategory,
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
    onCategoryCreated?: () => Promise<void> | void;
};

const NEW_CATEGORY_VALUE = "__create_new_category__";

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

type CropArea = {
    x: number;
    y: number;
    width: number;
    height: number;
};

const createImage = (url: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
        const image = new Image();
        image.addEventListener("load", () => resolve(image));
        image.addEventListener("error", (error) => reject(error));
        image.setAttribute("crossOrigin", "anonymous");
        image.src = url;
    });

const getCroppedImg = async (imageSrc: string, pixelCrop: CropArea, fileName: string): Promise<File> => {
    const image = await createImage(imageSrc);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    if (!ctx) {
        throw new Error("Failed to create canvas context");
    }

    canvas.width = pixelCrop.width;
    canvas.height = pixelCrop.height;

    ctx.drawImage(
        image,
        pixelCrop.x,
        pixelCrop.y,
        pixelCrop.width,
        pixelCrop.height,
        0,
        0,
        pixelCrop.width,
        pixelCrop.height,
    );

    return new Promise((resolve, reject) => {
        canvas.toBlob((blob) => {
            if (!blob) {
                reject(new Error("Failed to crop image"));
                return;
            }
            const file = new File([blob], fileName, { type: blob.type || "image/jpeg" });
            resolve(file);
        }, "image/jpeg", 0.9);
    });
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

const fieldSx = {
    "& .MuiOutlinedInput-root": {
        borderRadius: "14px",
        backgroundColor: "var(--background)",
    },
};

export default function AddEditMenuDialog({
    open,
    onClose,
    onSaved,
    initialData,
    onCategoryCreated,
}: MenuEditDialogProps) {
    const [form, setForm] = React.useState<FormState>(() => createInitialState(initialData));
    const [categories, setCategories] = React.useState<CategoryOption[]>([]);
    const [saving, setSaving] = React.useState(false);
    const [error, setError] = React.useState<string>("");
    const [creatingCategory, setCreatingCategory] = React.useState(false);
    const [newCategoryName, setNewCategoryName] = React.useState("");
    const [creatingCategoryBusy, setCreatingCategoryBusy] = React.useState(false);
    const imageInputRef = React.useRef<HTMLInputElement | null>(null);
    const { showSnackbar } = useAppSnackbar();
    const [cropOpen, setCropOpen] = React.useState(false);
    const [cropImageSrc, setCropImageSrc] = React.useState<string | null>(null);
    const [crop, setCrop] = React.useState({ x: 0, y: 0 });
    const [zoom, setZoom] = React.useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = React.useState<CropArea | null>(null);
    const [originalFileName, setOriginalFileName] = React.useState("menu-image.jpg");
    const [cropping, setCropping] = React.useState(false);

    React.useEffect(() => {
        if (open) {
            setForm(createInitialState(initialData));
            setError("");
            setCreatingCategory(false);
            setNewCategoryName("");
            setCropOpen(false);
            setCropImageSrc(null);
            setCrop({ x: 0, y: 0 });
            setZoom(1);
            setCroppedAreaPixels(null);
            setCropping(false);
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
        const file = event.target.files?.[0];
        if (!file) {
            event.target.value = "";
            return;
        }
        setOriginalFileName(file.name || "menu-image.jpg");
        const reader = new FileReader();
        reader.onload = () => {
            if (typeof reader.result === "string") {
                setCropImageSrc(reader.result);
                setCrop({ x: 0, y: 0 });
                setZoom(1);
                setCroppedAreaPixels(null);
                setCropOpen(true);
            }
        };
        reader.readAsDataURL(file);
        event.target.value = "";
    };

    const onCropComplete = React.useCallback((_croppedArea: CropArea, croppedAreaPixels: CropArea) => {
        setCroppedAreaPixels(croppedAreaPixels);
    }, []);

    const handleCropCancel = () => {
        setCropOpen(false);
        setCropImageSrc(null);
        setCrop({ x: 0, y: 0 });
        setZoom(1);
        setCroppedAreaPixels(null);
    };

    const handleCropApply = async () => {
        if (!cropImageSrc || !croppedAreaPixels) {
            showSnackbar("Adjust the crop and try again.", "error");
            return;
        }
        setCropping(true);
        try {
            const croppedFile = await getCroppedImg(cropImageSrc, croppedAreaPixels, originalFileName.replace(/\.[^/.]+$/, "") + ".jpg");
            handleFieldChange("imageFile")(croppedFile);
            handleFieldChange("imageUrl")(null);
            setCropOpen(false);
            setCropImageSrc(null);
        } catch (cropError) {
            console.error("Failed to crop image:", cropError);
            showSnackbar(safeError(cropError, "Failed to crop image."), "error");
        } finally {
            setCropping(false);
        }
    };

    const cancelCategoryCreate = () => {
        setCreatingCategory(false);
        setNewCategoryName("");
    };

    const renderCategoryValue = (value: unknown) => {
        const option = categories.find(
            (category) => String(category.id) === String(value),
        );

        if (option) return option.name;

        return (
            <Box component="span" sx={{ color: "var(--muted-foreground)" }}>
                Select a category
            </Box>
        );
    };

    const handleCategoryChange = (value: string) => {
        if (value === NEW_CATEGORY_VALUE) {
            setNewCategoryName("");
            setCreatingCategory(true);
            return;
        }
        handleFieldChange("categoryId")(value);
    };

    const handleCreateCategory = async () => {
        const name = newCategoryName.trim();
        if (!name || creatingCategoryBusy) return;

        const existing = categories.find(
            (category) => category.name.trim().toLowerCase() === name.toLowerCase(),
        );

        if (existing) {
            handleFieldChange("categoryId")(String(existing.id));
            cancelCategoryCreate();
            showSnackbar(`"${existing.name}" already exists — it has been selected.`, "info");
            return;
        }

        setCreatingCategoryBusy(true);
        setError("");

        try {
            const created = await createCategory({ name });
            const refreshed = await getCategories();
            setCategories(refreshed);

            const match =
                refreshed.find((category) => category.id === created.id) ??
                refreshed.find(
                    (category) => category.name.toLowerCase() === name.toLowerCase(),
                );

            if (match) {
                handleFieldChange("categoryId")(String(match.id));
            }

            setCreatingCategory(false);
            setNewCategoryName("");
            showSnackbar(`Category "${match?.name ?? name}" created.`, "success");
            await onCategoryCreated?.();
        } catch (createError) {
            console.error("Failed to create category:", createError);
            const message = safeError(
                createError,
                "Failed to create category. It may already exist.",
            );
            setError(message);
            showSnackbar(message, "error");
        } finally {
            setCreatingCategoryBusy(false);
        }
    };

    const handleSubmit = async () => {
        const selectedCategory = categories.find((category) => String(category.id) === form.categoryId);
        const categoryName = initialData?.category ?? selectedCategory?.name ?? "";
        const categoryId = initialData?.categoryId ?? selectedCategory?.id;

        if (!categoryName.trim() || !form.name.trim() || !form.price.trim()) {
            const message = "Choose or create a category, then enter the menu name and price.";
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
                maxWidth="sm"
                PaperProps={{
                    sx: {
                        borderRadius: "22px",
                        overflow: "hidden",
                        display: "flex",
                        flexDirection: "column",
                        width: { xs: "calc(100% - 24px)", sm: "100%" },
                        m: { xs: "12px", sm: "32px" },
                        maxHeight: { xs: "calc(100dvh - 24px)", sm: "min(90dvh, 780px)" },
                        height: "auto",
                        border: "1px solid var(--border)",
                        backgroundColor: "var(--card)",
                        backgroundImage:
                            "radial-gradient(420px 200px at 90% 0%, color-mix(in srgb, var(--primary) 14%, transparent), transparent 65%)",
                        boxShadow: "0 24px 60px rgba(31, 42, 43, 0.22)",
                        zIndex: (theme) => theme.zIndex.modal + 2,
                    },
                }}
            >
                <DialogTitle
                    sx={{
                        flexShrink: 0,
                        px: { xs: 2, sm: 3 },
                        pt: { xs: 2, sm: 2.5 },
                        pb: 1.75,
                    }}
                >
                    <Typography component="div" sx={{ fontSize: { xs: "1.15rem", sm: "1.3rem" }, fontWeight: 900 }}>
                        {initialData ? "Update Menu Item" : "Add Menu Item"}
                    </Typography>
                    <Typography sx={{ mt: 0.5, color: "var(--muted-foreground)", fontSize: "0.9rem" }}>
                        {initialData
                            ? "Update menu details, availability, and image."
                            : "Pick a category, or create one on the spot, then add the menu item."}
                    </Typography>
                </DialogTitle>
                <DialogContent
                    sx={{
                        px: { xs: 2, sm: 3 },
                        pt: { xs: 2, sm: 2.5 },
                        pb: 2,
                        borderTop: "1px solid var(--border)",
                        overflowY: "auto",
                        flex: 1,
                        minHeight: 0,
                    }}
                >
                    <Stack spacing={2.25}>
                        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                            {creatingCategory ? (
                                <TextField
                                    fullWidth
                                    autoFocus
                                    sx={fieldSx}
                                    label="New category name"
                                    value={newCategoryName}
                                    disabled={creatingCategoryBusy}
                                    onChange={(event) => setNewCategoryName(event.target.value)}
                                    onKeyDown={(event) => {
                                        if (event.key === "Enter") {
                                            event.preventDefault();
                                            void handleCreateCategory();
                                        }
                                        if (event.key === "Escape") {
                                            event.preventDefault();
                                            cancelCategoryCreate();
                                        }
                                    }}
                                    InputProps={{
                                        endAdornment: (
                                            <InputAdornment position="end">
                                                <IconButton
                                                    edge="end"
                                                    size="small"
                                                    aria-label="Create category"
                                                    disabled={
                                                        creatingCategoryBusy || !newCategoryName.trim()
                                                    }
                                                    onClick={() => void handleCreateCategory()}
                                                    sx={{ color: "var(--primary)" }}
                                                >
                                                    {creatingCategoryBusy ? (
                                                        <CircularProgress size={18} />
                                                    ) : (
                                                        <AddRoundedIcon fontSize="small" />
                                                    )}
                                                </IconButton>
                                            </InputAdornment>
                                        ),
                                    }}
                                    helperText="Press Enter to create · Esc to go back"
                                />
                            ) : (
                                <TextField
                                    select
                                    fullWidth
                                    disabled={Boolean(initialData)}
                                    sx={fieldSx}
                                    label="Category"
                                    value={form.categoryId}
                                    InputLabelProps={{ shrink: true }}
                                    onChange={(event) => handleCategoryChange(event.target.value)}
                                    SelectProps={{
                                        displayEmpty: true,
                                        renderValue: renderCategoryValue,
                                    }}
                                    helperText={
                                        categories.length === 0
                                            ? "No categories yet — create one below."
                                            : undefined
                                    }
                                >
                                    {categories.map((category) => (
                                        <MenuItem key={category.id} value={String(category.id)}>
                                            {category.name}
                                        </MenuItem>
                                    ))}
                                    {!initialData && (
                                        <MenuItem
                                            value={NEW_CATEGORY_VALUE}
                                            sx={{ color: "var(--primary)", fontWeight: 700 }}
                                        >
                                            <AddRoundedIcon fontSize="small" sx={{ mr: 1 }} />
                                            Create new category
                                        </MenuItem>
                                    )}
                                </TextField>
                            )}
                            <TextField
                                select
                                fullWidth
                                sx={fieldSx}
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

                        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                            <TextField
                                label="Menu Name"
                                value={form.name}
                                onChange={(e) => handleFieldChange("name")(e.target.value)}
                                fullWidth
                                sx={fieldSx}
                            />

                            <TextField
                                label="Price"
                                type="number"
                                value={form.price}
                                onChange={(e) => handleFieldChange("price")(e.target.value)}
                                fullWidth
                                sx={fieldSx}
                            />
                        </Stack>

                        <TextField
                            label="Menu Description"
                            value={form.description}
                            onChange={(e) => handleFieldChange("description")(e.target.value)}
                            fullWidth
                            multiline
                            minRows={3}
                            sx={fieldSx}
                        />

                        <Box
                            sx={{
                                border: "1px dashed var(--border)",
                                borderRadius: "18px",
                                p: { xs: 1.5, sm: 2 },
                                backgroundColor: "color-mix(in srgb, var(--background) 70%, transparent)",
                            }}
                        >
                            <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ xs: "stretch", sm: "center" }}>
                                <Box
                                    sx={{
                                        width: { xs: "100%", sm: 112 },
                                        height: { xs: 180, sm: 112 },
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
                                <Stack spacing={0.75} sx={{ flex: 1, minWidth: 0 }}>
                                    <Typography sx={{ fontWeight: 800 }}>Menu Image</Typography>
                                    <Typography sx={{ fontSize: "0.83rem", color: "var(--muted-foreground)" }}>
                                        Square crop works best. PNG, JPG, or JPEG.
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
                                            mt: 0.5,
                                            alignSelf: { xs: "stretch", sm: "flex-start" },
                                            borderRadius: "12px",
                                            minHeight: 44,
                                            px: 2,
                                            borderColor: "var(--border)",
                                            color: "var(--foreground)",
                                            fontWeight: 700,
                                            textTransform: "none",
                                        }}
                                    >
                                        Choose Image
                                    </Button>
                                </Stack>
                            </Stack>
                        </Box>

                        {error ? (
                            <Box
                                sx={{
                                    px: 1.5,
                                    py: 1,
                                    borderRadius: "12px",
                                    border: "1px solid color-mix(in srgb, var(--status-inactive-fg) 35%, transparent)",
                                    backgroundColor: "color-mix(in srgb, var(--status-inactive-bg) 60%, transparent)",
                                }}
                            >
                                <Typography sx={{ color: "var(--status-inactive-fg)", fontSize: "0.88rem", fontWeight: 600 }}>
                                    {error}
                                </Typography>
                            </Box>
                        ) : null}
                    </Stack>
                </DialogContent>
                <DialogActions
                    sx={{
                        px: { xs: 2, sm: 3 },
                        py: 2,
                        gap: 1,
                        flexShrink: 0,
                        borderTop: "1px solid var(--border)",
                        backgroundColor: "var(--card)",
                    }}
                >
                    <Button
                        variant="outlined"
                        onClick={onClose}
                        disabled={saving}
                        sx={{
                            borderRadius: "12px",
                            borderColor: "var(--border)",
                            color: "var(--foreground)",
                            flex: { xs: 1, sm: "0 0 auto" },
                            minHeight: 44,
                            textTransform: "none",
                            fontWeight: 700,
                        }}
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
                            flex: { xs: 1, sm: "0 0 auto" },
                            minHeight: 44,
                            textTransform: "none",
                            fontWeight: 800,
                            "&:hover": { backgroundColor: "var(--primary)" },
                        }}
                    >
                        {saving ? "Saving..." : initialData ? "Update Menu" : "Add Menu"}
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog
                open={cropOpen}
                onClose={handleCropCancel}
                maxWidth="sm"
                fullWidth
                PaperProps={{
                    sx: {
                        borderRadius: "20px",
                        overflow: "hidden",
                        backgroundColor: "var(--card)",
                        border: "1px solid var(--border)",
                        width: { xs: "calc(100% - 24px)", sm: "100%" },
                        m: { xs: "12px", sm: "32px" },
                        maxHeight: { xs: "calc(100dvh - 24px)", sm: "min(90dvh, 720px)" },
                        height: "auto",
                        display: "flex",
                        flexDirection: "column",
                    },
                }}
            >
                <DialogTitle sx={{ flexShrink: 0, fontWeight: 900, px: { xs: 2, sm: 3 }, pt: { xs: 2, sm: 2.5 }, pb: 1.5 }}>
                    Crop Image
                    <Typography sx={{ mt: 0.5, color: "var(--muted-foreground)", fontSize: "0.86rem" }}>
                        Drag to reposition and pinch or use the slider to zoom.
                    </Typography>
                </DialogTitle>
                <DialogContent sx={{ p: 0, flex: 1, minHeight: 0, borderTop: "1px solid var(--border)" }}>
                    <Box
                        sx={{
                            position: "relative",
                            width: "100%",
                            height: { xs: "min(44vh, 300px)", sm: 380 },
                            backgroundColor: "#000",
                        }}
                    >
                        {cropImageSrc ? (
                            <Cropper
                                image={cropImageSrc}
                                crop={crop}
                                zoom={zoom}
                                aspect={1}
                                cropShape="rect"
                                showGrid
                                onCropChange={setCrop}
                                onZoomChange={setZoom}
                                onCropComplete={onCropComplete}
                            />
                        ) : null}
                    </Box>
                    <Box sx={{ px: { xs: 2, sm: 3 }, py: 2 }}>
                        <Typography sx={{ fontSize: "0.85rem", color: "var(--muted-foreground)", mb: 1 }}>Zoom</Typography>
                        <Slider value={zoom} min={1} max={3} step={0.01} onChange={(_, value) => setZoom(value as number)} />
                    </Box>
                </DialogContent>
                <DialogActions
                    sx={{
                        px: { xs: 2, sm: 3 },
                        py: 2,
                        gap: 1,
                        flexShrink: 0,
                        borderTop: "1px solid var(--border)",
                        backgroundColor: "var(--card)",
                    }}
                >
                    <Button
                        onClick={handleCropCancel}
                        disabled={cropping}
                        sx={{
                            borderRadius: "12px",
                            borderColor: "var(--border)",
                            color: "var(--foreground)",
                            flex: { xs: 1, sm: "0 0 auto" },
                            minHeight: 44,
                            textTransform: "none",
                            fontWeight: 700,
                        }}
                    >
                        Cancel
                    </Button>
                    <Button
                        variant="contained"
                        onClick={handleCropApply}
                        disabled={cropping || !croppedAreaPixels}
                        sx={{
                            borderRadius: "12px",
                            backgroundColor: "var(--primary)",
                            color: "var(--primary-foreground)",
                            flex: { xs: 1, sm: "0 0 auto" },
                            minHeight: 44,
                            textTransform: "none",
                            fontWeight: 800,
                            "&:hover": { backgroundColor: "var(--primary)" },
                        }}
                    >
                        {cropping ? "Cropping..." : "Apply Crop"}
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
}
