import axios from "axios";
const API_BASE = process.env.NEXT_PUBLIC_API_URL;

export const api = axios.create({
  baseURL: API_BASE,
  headers: {
    "Content-Type": "application/json",
  },
});

const getAuthTokenFromStorage = (): { token: string | null; type: string } | null => {
  if (typeof document === "undefined") return null;
  const fromStorage = window.localStorage.getItem("authToken");
  const type = window.localStorage.getItem("authTokenType") ?? "Bearer";
  if (fromStorage) return { token: fromStorage, type };
  const match = document.cookie.match(/(?:^|; )authToken=([^;]+)/);
  return { token: match ? decodeURIComponent(match[1]) : null, type };
};

api.interceptors.request.use((config) => {
  const auth = getAuthTokenFromStorage();
  if (auth?.token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `${auth.type} ${auth.token}`;
    config.headers.Accept = "application/json";
  }
  return config;
});

export type MenuRow = {
  id: number;
  categoryId: number;
  categoryIsActive: boolean;
  name: string;
  description: string;
  category: string;
  price: string;
  prep: string;
  veg: boolean;
  isAvailable: boolean;
  foodType: "veg" | "non-veg" | "egg" | "vegan";
  imageUrl: string | null;
  createdAt: string;
};

export const getFoodTypeLabel = (foodType: MenuRow["foodType"]) => {
  switch (foodType) {
    case "veg":
      return "Veg";
    case "non-veg":
      return "Non-Veg";
    case "egg":
      return "Egg";
    case "vegan":
      return "Vegan";
    default:
      return foodType;
  }
};

export type CategoryOption = {
  id: number;
  name: string;
  description: string;
  isActive: boolean;
  createdAt: string;
};

type MenuCategoryResponse = {
  id: number;
  name: string;
  description: string | null;
  is_active?: boolean | null;
  created_at: string;
  items: Array<{
    id: number;
    category_id: number;
    name: string;
    description: string | null;
    price: string;
    food_type: string;
    is_available?: boolean | null;
    is_active?: boolean | null;
    image_url?: string | null;
    created_at: string;
  }>;
};

type GetMenusResponse = {
  status: number;
  data: MenuCategoryResponse[];
  meta?: {
    current_page: number;
    per_page: number;
    total: number;
    last_page: number;
  };
};

type MenuCategoryDetailResponse = {
  status: number;
  data: MenuCategoryResponse;
};

const parseAvailability = (value: unknown): boolean => {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    return normalized === "1" || normalized === "true";
  }
  return false;
};

export const resolveMenuImageUrl = (imageUrl: string | null) => {
  if (!imageUrl) return null;
  if (/^https?:\/\//i.test(imageUrl)) return imageUrl;

  const normalizedPath = imageUrl.replace(/^\/+/, "");
  const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "";
  const siteBase =
    apiBase.replace(/\/api\/?$/i, "").replace(/\/+$/, "") ||
    (typeof window !== "undefined" ? window.location.origin : "");

  if (!siteBase) return normalizedPath.startsWith("storage/")
    ? `/${normalizedPath}`
    : `/storage/${normalizedPath}`;

  if (normalizedPath.startsWith("storage/")) {
    return `${siteBase}/${normalizedPath}`;
  }

  return `${siteBase}/storage/${normalizedPath}`;
};

export type MenuEditorPayload = {
  categoryId?: number;
  itemId?: number;
  categoryName: string;
  name: string;
  description: string;
  price: string;
  foodType: "veg" | "non-veg" | "egg" | "vegan";
  isAvailable: boolean;
  imageFile?: File | null;
  imageUrl?: string | null;
};

const buildMenuFormData = (payload: MenuEditorPayload) => {
  const formData = new FormData();
  formData.append("name", payload.categoryName);
  formData.append("description", "");
  formData.append("is_active", "1");

  if (payload.itemId) {
    formData.append("items[0][id]", String(payload.itemId));
  }

  formData.append("items[0][name]", payload.name);
  formData.append("items[0][description]", payload.description);
  formData.append("items[0][price]", payload.price);
  formData.append("items[0][food_type]", payload.foodType);
  formData.append("items[0][is_available]", payload.isAvailable ? "1" : "0");

  if (payload.imageUrl) {
    formData.append("items[0][image_url]", payload.imageUrl);
  }

  if (payload.imageFile) {
    formData.append("items[0][image]", payload.imageFile);
  }

  return formData;
};

export const getCategories = async (): Promise<CategoryOption[]> => {
  const res = await api.get<GetMenusResponse>("/admin/menus");

  return res.data.data
    .map((category) => ({
      id: category.id,
      name: category.name,
      description: category.description ?? "",
      isActive: parseAvailability(category.is_active ?? true),
      createdAt: category.created_at,
    }))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
};

export type GetMenusParams = {
  search?: string;
  categoryId?: number;
  availability?: "all" | "available" | "unavailable";
  page?: number;
  perPage?: number;
};

export type PaginatedMenusResult = {
  items: MenuRow[];
  total: number;
  currentPage: number;
  perPage: number;
  lastPage: number;
};

export const getMenus = async (params?: GetMenusParams): Promise<PaginatedMenusResult> => {
  const search = params?.search?.trim() ?? "";
  const availability = params?.availability ?? "all";
  const categoryId = params?.categoryId;
  const page = params?.page ?? 1;
  const perPage = params?.perPage ?? 10;
  const res = await api.get<GetMenusResponse>("/admin/menus", {
    params: {
      ...(search ? { search } : {}),
      ...(categoryId ? { category_id: categoryId } : {}),
      ...(availability !== "all" ? { availability } : {}),
      page,
      per_page: perPage,
    },
  });

  const items = res.data.data
    .flatMap((category) =>
      category.items.map((item) => {
        const categoryIsActive = parseAvailability(category.is_active ?? true);
        const itemIsAvailable = parseAvailability(item.is_available ?? item.is_active ?? false);
        const isAvailable = categoryIsActive && itemIsAvailable;
        const normalizedFoodType = item.food_type?.toLowerCase();
        const foodType: MenuRow["foodType"] =
          normalizedFoodType === "veg" ||
          normalizedFoodType === "non-veg" ||
          normalizedFoodType === "egg" ||
          normalizedFoodType === "vegan"
            ? normalizedFoodType
            : "non-veg";

        return {
          id: item.id,
          categoryId: category.id,
          categoryIsActive,
          name: item.name,
          description: item.description ?? category.description ?? "",
          category: category.name,
          price: item.price,
          prep: "N/A",
          veg: foodType === "veg",
          isAvailable,
          foodType,
          imageUrl: item.image_url ?? null,
          createdAt: item.created_at,
        };
      })
    )
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return {
    items,
    total: res.data.meta?.total ?? items.length,
    currentPage: res.data.meta?.current_page ?? page,
    perPage: res.data.meta?.per_page ?? perPage,
    lastPage: res.data.meta?.last_page ?? 1,
  };
};

export const updateMenuAvailability = async (
  row: MenuRow,
  isAvailable: boolean
): Promise<MenuRow> => {
  const detail = await api.get<MenuCategoryDetailResponse>(`/admin/menus/${row.categoryId}`);
  const category = detail.data.data;

  await api.put(`/admin/menus/${row.categoryId}`, {
    name: category.name,
    description: category.description,
    is_active: true,
    items: category.items.map((item) => ({
      name: item.name,
      description: item.description,
      price: item.price,
      food_type: item.food_type,
      image_url: item.image_url ?? null,
      is_available: item.id === row.id ? isAvailable : item.is_available,
    })),
  });

  return {
    ...row,
    isAvailable,
  };
};

export const createMenu = async (payload: MenuEditorPayload) => {
  const formData = buildMenuFormData(payload);
  const res = await api.post("/admin/menus", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return res.data;
};

export const createCategory = async (payload: { name: string; description?: string; isActive?: boolean }) => {
  const res = await api.post("/admin/menus", {
    name: payload.name.trim(),
    description: payload.description?.trim() ?? "",
    is_active: payload.isActive ?? true,
  });

  return res.data as {
    status: number;
    category?: {
      id: number;
      name: string;
      description?: string | null;
      is_active?: boolean | null;
      created_at?: string;
    };
  };
};

export const updateCategory = async (payload: {
  id: number;
  name: string;
  description: string;
  isActive: boolean;
}) => {
  const detail = await api.get<MenuCategoryDetailResponse>(`/admin/menus/${payload.id}`);
  const category = detail.data.data;

  const res = await api.put(`/admin/menus/${payload.id}`, {
    name: payload.name.trim(),
    description: payload.description.trim(),
    is_active: payload.isActive,
    items: category.items.map((item) => ({
      id: item.id,
      name: item.name,
      description: item.description,
      price: item.price,
      food_type: item.food_type,
      image_url: item.image_url ?? null,
      is_available: item.is_available ?? item.is_active ?? false,
    })),
  });

  return res.data;
};

export const updateCategoryAvailability = async (category: CategoryOption, isActive: boolean) => {
  return updateCategory({
    id: category.id,
    name: category.name,
    description: category.description,
    isActive,
  });
};

export const deleteCategory = async (id: number) => {
  await api.delete(`/admin/menus/${id}`);
};

export const updateMenu = async (payload: MenuEditorPayload) => {
  if (!payload.categoryId) {
    throw new Error("Category id is required for update.");
  }

  const formData = buildMenuFormData(payload);
  const res = await api.post(`/admin/menus/${payload.categoryId}?_method=PUT`, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return res.data;
};

export const deleteMenu = async (categoryId: number) => {
  await api.delete(`/admin/menus/${categoryId}`);
};



