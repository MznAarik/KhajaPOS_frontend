import axios from "axios";
const API_BASE = process.env.NEXT_PUBLIC_API_URL;

export const api = axios.create({
  baseURL: API_BASE,
  headers: {
    "Content-Type": "application/json",
  },
});

const getAuthTokenFromStorage = (): { token: string | null; type: string } => {
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
  name: string;
  description: string;
  category: string;
  price: string;
  prep: string;
  veg: boolean;
  isAvailable: boolean;
  foodType: "veg" | "non-veg";
  imageUrl: string | null;
  createdAt: string;
};

type MenuCategoryResponse = {
  id: number;
  name: string;
  description: string | null;
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
  foodType: "veg" | "non-veg";
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

export const getMenus = async (): Promise<MenuRow[]> => {
  const res = await api.get<GetMenusResponse>("/admin/menus");

  return res.data.data.flatMap((category) =>
    category.items.map((item) => {
      const isAvailable = parseAvailability(item.is_available ?? item.is_active ?? false);

      return {
        id: item.id,
        categoryId: category.id,
        name: item.name,
        description: item.description ?? category.description ?? "",
        category: category.name,
        price: item.price,
        prep: "N/A",
        veg: item.food_type === "veg",
        isAvailable,
        foodType: item.food_type === "veg" ? "veg" : "non-veg",
        imageUrl: item.image_url ?? null,
        createdAt: item.created_at,
      };
    })
  );
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
