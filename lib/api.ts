import axios from "axios";
const API_BASE = process.env.NEXT_PUBLIC_API_URL;

export const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

const getAuthTokenFromStorage = (): {
  token: string | null;
  type: string;
} | null => {
  if (typeof document === "undefined") return null;
  const fromStorage = window.localStorage.getItem("authToken");
  const type = window.localStorage.getItem("authTokenType") ?? "Bearer";
  if (fromStorage) return { token: fromStorage, type };
  const match = document.cookie.match(/(?:^|; )authToken=([^;]+)/);
  return { token: match ? decodeURIComponent(match[1]) : null, type };
};

api.interceptors.request.use((config) => {
  config.headers = config.headers ?? {};
  config.headers.Accept = "application/json";

  const auth = getAuthTokenFromStorage();

  if (auth?.token) {
    config.headers.Authorization = `${auth.type} ${auth.token}`;
  }

  return config;
});

export async function apiFetch(url: string, options: RequestInit = {}) {
  const res = await fetch(url, {
    ...options,
    credentials: "include",
  });

  if (res.status === 401) {
    window.location.href = "/auth/login?message=Session expired";
    return;
  }

  return res;
}

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
  isActive: boolean;
  createdAt: string;
};

type CategoryResponse = {
  id: number;
  name: string;
  is_active?: boolean | null;
  created_at: string;
};

type CategoryListResponse = {
  status: number;
  data: CategoryResponse[];
};

type CategoryDetailResponse = {
  status: number;
  data?: CategoryResponse;
  category?: CategoryResponse;
};

export type AdminTable = {
  id: number;
  tableNo: string;
  qrCode: string;
  isActive: boolean;
  createdAt: string;
};

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "preparing"
  | "ready"
  | "served"
  | "cancelled";

export const isOrderLocked = (status: OrderStatus) =>
  status === "served" || status === "cancelled";

export const canCustomerConfirmOrder = (status: OrderStatus) =>
  status === "pending";

export const canCustomerCancelOrder = (status: OrderStatus) =>
  status === "pending";

export type KitchenOrder = {
  id: number;
  tableId: number;
  tableNo: string;
  sessionToken: string;
  status: OrderStatus;
  totalAmount: string;
  remarks: string;
  createdAt: string;
  items: Array<{
    id: number;
    menuItemId: number;
    name: string;
    quantity: number;
    price: string;
  }>;
};

export type PublicMenuItem = {
  id: number;
  name: string;
  description: string;
  price: string;
  foodType: MenuRow["foodType"];
  imageUrl: string | null;
};

export type PublicMenuCategory = {
  id: number;
  name: string;
  description: string;
  items: PublicMenuItem[];
};

export type PublicTableMenu = {
  table: AdminTable;
  categories: PublicMenuCategory[];
};

type MenuCategoryResponse = {
  id: number;
  name: string;
  description?: string | null;
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

type AdminTableResponse = {
  id: number;
  table_no: string;
  qr_code: string;
  is_active?: boolean | null;
  created_at: string;
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

type AdminTableListResponse = {
  status: number;
  data: AdminTableResponse[];
};

type AdminOrderResponse = {
  id: number;
  table_id: number;
  session_token: string;
  order_status: OrderStatus;
  total_amount: string;
  remarks: string | null;
  created_at: string;
  table: AdminTableResponse | null;
  items: Array<{
    id: number;
    menu_item_id: number;
    quantity: number;
    price: string;
    menu_item: {
      id: number;
      name: string;
    } | null;
  }>;
};

type AdminOrderListResponse = {
  status: number;
  data: AdminOrderResponse[];
};

type PublicMenuResponse = {
  status: number;
  data: {
    table: AdminTableResponse;
    categories: MenuCategoryResponse[];
  };
};

type PlaceOrderResponse = {
  status: number;
  message: string;
  data: AdminOrderResponse;
};

type PublicOrderResponse = {
  status: number;
  message?: string;
  data: AdminOrderResponse;
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

export async function apiRequest<T>(
  input: RequestInfo,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(input, init);

  let data: any = null;

  try {
    data = await res.json();
  } catch {
    // ignore JSON parse errors
  }

  if (!res.ok) {
    const message = data?.message || data?.error || "Something went wrong";

    throw new Error(message);
  }

  return data;
}

export const resolveMenuImageUrl = (imageUrl: string | null) => {
  if (!imageUrl) return null;
  if (/^https?:\/\//i.test(imageUrl)) return imageUrl;

  const normalizedPath = imageUrl.replace(/^\/+/, "");
  const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "";
  const siteBase =
    apiBase.replace(/\/api\/?$/i, "").replace(/\/+$/, "") ||
    (typeof window !== "undefined" ? window.location.origin : "");

  if (!siteBase)
    return normalizedPath.startsWith("storage/")
      ? `/${normalizedPath}`
      : `/storage/${normalizedPath}`;

  if (normalizedPath.startsWith("storage/")) {
    return `${siteBase}/${normalizedPath}`;
  }

  return `${siteBase}/storage/${normalizedPath}`;
};

const getSiteBaseUrl = () => {
  if (typeof window !== "undefined") {
    return window.location.origin;
  }

  return (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/+$/, "");
};

const normalizeFoodType = (foodType: string): MenuRow["foodType"] => {
  const normalizedFoodType = foodType?.toLowerCase();

  return normalizedFoodType === "veg" ||
    normalizedFoodType === "non-veg" ||
    normalizedFoodType === "egg" ||
    normalizedFoodType === "vegan"
    ? normalizedFoodType
    : "non-veg";
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

  if (payload.categoryId) {
    formData.append("category_id", String(payload.categoryId));
  }

  formData.append("name", payload.name);
  formData.append("description", payload.description);
  formData.append("price", payload.price);
  formData.append("food_type", payload.foodType);
  formData.append("is_available", payload.isAvailable ? "1" : "0");

  if (payload.imageUrl) {
    formData.append("image_url", payload.imageUrl);
  }

  if (payload.imageFile) {
    formData.append("image", payload.imageFile);
  }

  return formData;
};

export const getCategories = async (): Promise<CategoryOption[]> => {
  const res = await api.get<CategoryListResponse>("/admin/categories");

  return res.data.data.map((category) => ({
    id: category.id,
    name: category.name,
    isActive: parseAvailability(category.is_active ?? true),
    createdAt: category.created_at,
  }));
};

export const buildTableOrderUrl = (qrCode: string) => {
  return `${getSiteBaseUrl()}/order/${encodeURIComponent(qrCode)}`;
};

export const buildTableQrPreviewUrl = (qrCode: string) => {
  return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(buildTableOrderUrl(qrCode))}`;
};

export const getAdminTables = async (): Promise<AdminTable[]> => {
  const res = await api.get<AdminTableListResponse>("/admin/tables");

  return res.data.data.map((table) => ({
    id: table.id,
    tableNo: table.table_no,
    qrCode: table.qr_code,
    isActive: parseAvailability(table.is_active ?? true),
    createdAt: table.created_at,
  }));
};

export const createAdminTable = async (payload: {
  tableNo: string;
  qrCode?: string;
  isActive?: boolean;
}) => {
  const res = await api.post("/admin/tables", {
    table_no: payload.tableNo.trim(),
    qr_code: payload.qrCode?.trim() || undefined,
    is_active: payload.isActive ?? true,
  });

  return res.data;
};

export const updateAdminTable = async (payload: {
  id: number;
  tableNo: string;
  qrCode: string;
  isActive: boolean;
}) => {
  const res = await api.put(`/admin/tables/${payload.id}`, {
    table_no: payload.tableNo.trim(),
    qr_code: payload.qrCode.trim(),
    is_active: payload.isActive,
  });

  return res.data;
};

export const deleteAdminTable = async (id: number) => {
  await api.delete(`/admin/tables/${id}`);
};

const normalizeOrder = (order: AdminOrderResponse): KitchenOrder => ({
  id: order.id,
  tableId: order.table_id,
  tableNo: order.table?.table_no ?? `Table ${order.table_id}`,
  sessionToken: order.session_token,
  status: order.order_status,
  totalAmount: order.total_amount,
  remarks: order.remarks ?? "",
  createdAt: order.created_at,
  items: order.items.map((item) => ({
    id: item.id,
    menuItemId: item.menu_item_id,
    name: item.menu_item?.name ?? "Menu Item",
    quantity: item.quantity,
    price: item.price,
  })),
});

export const getAdminOrders = async (): Promise<KitchenOrder[]> => {
  const res = await api.get<AdminOrderListResponse>("/admin/orders");
  return res.data.data.map(normalizeOrder);
};

export const updateAdminOrderStatus = async (
  id: number,
  status: OrderStatus,
) => {
  const res = await api.patch<{ status: number; data: AdminOrderResponse }>(
    `/admin/orders/${id}/status`,
    {
      order_status: status,
    },
  );

  return normalizeOrder(res.data.data);
};

export const getPublicMenu = async (
  tableCode: string,
): Promise<PublicTableMenu> => {
  const res = await api.get<PublicMenuResponse>(
    `/public/menu/${encodeURIComponent(tableCode)}`,
  );

  return {
    table: {
      id: res.data.data.table.id,
      tableNo: res.data.data.table.table_no,
      qrCode: res.data.data.table.qr_code,
      isActive: parseAvailability(res.data.data.table.is_active ?? true),
      createdAt: res.data.data.table.created_at,
    },
    categories: res.data.data.categories.map((category) => ({
      id: category.id,
      name: category.name,
      description: category.description ?? "",
      items: category.items.map((item) => ({
        id: item.id,
        name: item.name,
        description: item.description ?? "",
        price: item.price,
        foodType: normalizeFoodType(item.food_type),
        imageUrl: item.image_url ?? null,
      })),
    })),
  };
};

export const placePublicOrder = async (payload: {
  tableId: number;
  remarks?: string;
  items: Array<{ menuItemId: number; quantity: number }>;
}) => {
  const res = await api.post<PlaceOrderResponse>("/public/orders", {
    table_id: payload.tableId,
    remarks: payload.remarks?.trim() ?? "",
    items: payload.items.map((item) => ({
      menu_item_id: item.menuItemId,
      quantity: item.quantity,
    })),
  });

  return normalizeOrder(res.data.data);
};

export const getPublicOrder = async (
  sessionToken: string,
): Promise<KitchenOrder> => {
  const res = await api.get<PublicOrderResponse>(
    `/public/orders/${encodeURIComponent(sessionToken)}`,
  );
  return normalizeOrder(res.data.data);
};

export const confirmPublicOrder = async (
  sessionToken: string,
): Promise<KitchenOrder> => {
  const res = await api.patch<PublicOrderResponse>(
    `/public/orders/${encodeURIComponent(sessionToken)}/confirm`,
  );
  return normalizeOrder(res.data.data);
};

export const cancelPublicOrder = async (
  sessionToken: string,
): Promise<KitchenOrder> => {
  const res = await api.patch<PublicOrderResponse>(
    `/public/orders/${encodeURIComponent(sessionToken)}/cancel`,
  );
  return normalizeOrder(res.data.data);
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

export const getMenus = async (
  params?: GetMenusParams,
): Promise<PaginatedMenusResult> => {
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
        const itemIsAvailable = parseAvailability(
          item.is_available ?? item.is_active ?? false,
        );
        const isAvailable = categoryIsActive && itemIsAvailable;
        const foodType = normalizeFoodType(item.food_type);

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
      }),
    )
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

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
  isAvailable: boolean,
): Promise<MenuRow> => {
  const detail = await api.get<MenuCategoryDetailResponse>(
    `/admin/menus/${row.categoryId}`,
  );
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
  const res = await api.post("/admin/menus/items", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return res.data;
};

export const createCategory = async (payload: {
  name: string;
  isActive?: boolean;
}) => {
  const res = await api.post<CategoryDetailResponse>("/admin/categories", {
    name: payload.name.trim(),
    is_active: payload.isActive ?? true,
  });

  return res.data;
};

export const updateCategory = async (payload: {
  id: number;
  name: string;
  isActive: boolean;
}) => {
  const res = await api.put<CategoryDetailResponse>(
    `/admin/categories/${payload.id}`,
    {
      name: payload.name.trim(),
      is_active: payload.isActive,
    },
  );

  return res.data;
};

export const updateCategoryAvailability = async (
  category: CategoryOption,
  isActive: boolean,
) => {
  return updateCategory({
    id: category.id,
    name: category.name,
    isActive,
  });
};

export const deleteCategory = async (id: number) => {
  await api.delete(`/admin/categories/${id}`);
};

export const updateMenu = async (payload: MenuEditorPayload) => {
  if (!payload.categoryId || !payload.itemId) {
    throw new Error("Category id and item id are required for update.");
  }

  const formData = buildMenuFormData(payload);
  formData.append("_method", "PUT");

  const res = await api.post(`/admin/menus/items/${payload.itemId}`, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return res.data;
};

export const deleteMenu = async (menuId: number) => {
  await api.delete(`/admin/menus/items/${menuId}`);
};
