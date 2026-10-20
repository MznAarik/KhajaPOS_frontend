import axios from "axios";
import { safeError } from "./safeError";
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

export const clearAuthSession = async () => {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);
    await fetch("/api/auth-cookie", {
      method: "DELETE",
      signal: controller.signal,
    });
    clearTimeout(timeout);
  } catch {
    // ignore logout cleanup failures
  }

  if (typeof window !== "undefined") {
    window.localStorage.removeItem("authToken");
    window.localStorage.removeItem("authTokenType");
  }
};

let authRedirectStarted = false;

const redirectToLogin = async () => {
  if (typeof window === "undefined" || authRedirectStarted) return;

  authRedirectStarted = true;
  await clearAuthSession();

  const currentPath = `${window.location.pathname}${window.location.search}`;
  const loginPath = "/auth/login";

  if (window.location.pathname.startsWith(loginPath)) return;

  window.location.replace(`${loginPath}?message=Session%20expired&redirect=${encodeURIComponent(currentPath)}`);
};

export const toTitleCase = (value: string | null | undefined) =>
  (value ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) =>
      word
        .split("-")
        .map((part) =>
          part ? `${part.charAt(0).toUpperCase()}${part.slice(1).toLowerCase()}` : part,
        )
        .join("-"),
    )
    .join(" ");

api.interceptors.request.use((config) => {
  config.headers = config.headers ?? {};
  config.headers.Accept = "application/json";

  const auth = getAuthTokenFromStorage();

  if (auth?.token) {
    config.headers.Authorization = `${auth.type} ${auth.token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => {
    if (
      response.data &&
      typeof response.data === "object" &&
      "status" in response.data &&
      Number(response.data.status) === 0
    ) {
      const apiError = new Error(safeError({ response }, "Request failed."));
      Object.assign(apiError, { response });
      return Promise.reject(apiError);
    }

    return response;
  },
  async (error) => {
    if (error?.response?.status === 401) {
      await redirectToLogin();
      return new Promise(() => {
        // Keep page-level catch handlers from rendering "Unauthenticated."
      });
    }

    return Promise.reject(error);
  },
);

export async function apiFetch(url: string, options: RequestInit = {}) {
  const res = await fetch(url, {
    ...options,
    credentials: "include",
  });

  if (res.status === 401) {
    await redirectToLogin();
    return new Promise(() => {
      // Keep callers from rendering the backend 401 body.
    });
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

export type FoodFilterKey = "all" | "veg" | "non-veg" | "drinks" | "others";

export const FOOD_FILTER_LABELS: Record<FoodFilterKey, string> = {
  all: "All",
  veg: "Veg",
  "non-veg": "Non-Veg",
  drinks: "Drinks",
  others: "Others",
};

export const FOOD_FILTER_ORDER: FoodFilterKey[] = ["all", "veg", "non-veg", "drinks", "others"];

const DRINK_KEYWORDS_PATTERN =
  /\b(?:drinks?|juices?|beverages?|sodas?|cola|cokes?|pepsi|sprite|fanta|limca|thums\s?up|teas?|coffees?|latte|cappuccino|mocha|espresso|shakes?|lassi|smoothies?|lemonades?|water|milk\w*|matcha|cold[\s-]?drinks?)\b/i;

export const matchesFoodFilter = (
  foodType: MenuRow["foodType"],
  filter: FoodFilterKey,
  ctx?: { name?: string | null; category?: string | null },
) => {
  if (filter === "all") return true;
  if (filter === "veg") return foodType === "veg" || foodType === "vegan";
  if (filter === "non-veg") return foodType === "non-veg";
  if (filter === "drinks") {
    return (
      DRINK_KEYWORDS_PATTERN.test(ctx?.category ?? "") ||
      DRINK_KEYWORDS_PATTERN.test(ctx?.name ?? "")
    );
  }
  return foodType === "egg";
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
  data?: CategoryResponse | { category?: CategoryResponse };
  category?: CategoryResponse;
};

const unwrapCategory = (res: { data: CategoryDetailResponse }): CategoryResponse => {
  const payload = unwrapApiData<unknown>(res.data);

  if (payload && typeof payload === "object" && "category" in payload) {
    const nested = (payload as { category?: CategoryResponse }).category;
    if (nested) return nested;
  }

  return payload as CategoryResponse;
};

export type AdminTable = {
  id: number;
  tableNo: string;
  qrCode: string;
  isActive: boolean;
  occupied: boolean;
  stale: boolean;
  createdAt: string;
};

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "preparing"
  | "ready"
  | "served"
  | "cancelled"
  | "closed";

export type OrderType = "dine_in" | "takeaway";

export const getOrderTypeLabel = (orderType: OrderType) =>
  orderType === "takeaway" ? "Takeaway" : "Dine Here";

export const isOrderLocked = (status: OrderStatus) =>
  status === "served" || status === "cancelled" || status === "closed";

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
  orderType: OrderType;
  totalAmount: string;
  remarks: string;
  createdAt: string;
  items: Array<{
    id: number;
    menuItemId: number;
    name: string;
    quantity: number;
    price: string;
    foodType: MenuRow["foodType"];
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
  business: { id: number; name: string; logo?: string | null } | null;
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
  occupied?: boolean | null;
  stale?: boolean | null;
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
  order_type: OrderType | null;
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
      food_type?: string;
    } | null;
  }>;
};

type AdminOrderIndexResponse = {
  status: number;
  data: {
    date: string;
    orders: AdminOrderResponse[];
  };
};

type PublicMenuResponse = {
  status: number;
  data: {
    table: AdminTableResponse;
    business?: { id: number; name: string; logo?: string | null } | null;
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

type PublicOrderListResponse = {
  status: number;
  message?: string;
  data: AdminOrderResponse[];
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
    const message = safeError(
      { response: { data } },
      res.status === 403
        ? "Access denied."
        : res.status >= 500
          ? "Server error. Please try again."
          : "Something went wrong.",
    );

    if (res.status === 401 && typeof window !== "undefined") {
      await redirectToLogin();
    }

    throw new Error(message);
  }

  if (
    data &&
    typeof data === "object" &&
    "status" in data &&
    Number(data.status) === 0
  ) {
    throw new Error(safeError({ response: { data } }, "Request failed."));
  }

  return data;
}

export const unwrapApiData = <T,>(payload: unknown): T => {
  if (payload && typeof payload === "object" && "data" in payload) {
    return (payload as { data: T }).data;
  }

  return payload as T;
};

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

  return unwrapApiData<CategoryResponse[]>(res.data).map((category) => ({
    id: category.id,
    name: toTitleCase(category.name),
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

  return unwrapApiData<AdminTableResponse[]>(res.data).map((table) => ({
    id: table.id,
    tableNo: table.table_no,
    qrCode: table.qr_code,
    isActive: parseAvailability(table.is_active ?? true),
    occupied: table.occupied ?? false,
    stale: table.stale ?? false,
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

  return unwrapApiData(res.data);
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
  orderType: order.order_type ?? "dine_in",
  totalAmount: order.total_amount,
  remarks: order.remarks ?? "",
  createdAt: order.created_at,
  items: order.items.map((item) => ({
    id: item.id,
    menuItemId: item.menu_item_id,
    name: toTitleCase(item.menu_item?.name ?? "Menu Item"),
    quantity: item.quantity,
    price: item.price,
    foodType: normalizeFoodType(item.menu_item?.food_type ?? "non-veg"),
  })),
});

export const getAdminOrders = async (
  date?: string,
): Promise<{ date: string; orders: KitchenOrder[] }> => {
  const res = await api.get<AdminOrderIndexResponse>("/admin/orders", {
    params: date ? { date } : undefined,
  });
  const payload = unwrapApiData<AdminOrderIndexResponse["data"]>(res.data);

  return {
    date: payload.date,
    orders: payload.orders.map(normalizeOrder),
  };
};

export const getAdminOrderDays = async (): Promise<string[]> => {
  const res = await api.get<{ status: number; data: string[] }>("/admin/orders/days");
  return unwrapApiData<string[]>(res.data);
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

  return normalizeOrder(unwrapApiData<AdminOrderResponse>(res.data));
};

export const updateAdminOrder = async (payload: {
  id: number;
  remarks: string;
  items: Array<{ id: number; quantity: number }>;
  orderType?: OrderType;
}) => {
  const res = await api.put<{ status: number; data: AdminOrderResponse }>(
    `/admin/orders/${payload.id}`,
    {
      remarks: payload.remarks.trim(),
      items: payload.items.map((item) => ({
        id: item.id,
        quantity: item.quantity,
      })),
      ...(payload.orderType ? { order_type: payload.orderType } : {}),
    },
  );

  return normalizeOrder(unwrapApiData<AdminOrderResponse>(res.data));
};

export const getPublicMenu = async (
  tableCode: string,
): Promise<PublicTableMenu> => {
  const res = await api.get<PublicMenuResponse>(
    `/public/menu/${encodeURIComponent(tableCode)}`,
  );
  const payload = unwrapApiData<PublicMenuResponse["data"]>(res.data);

  return {
    table: {
      id: payload.table.id,
      tableNo: payload.table.table_no,
      qrCode: payload.table.qr_code,
      isActive: parseAvailability(payload.table.is_active ?? true),
      occupied: payload.table.occupied ?? false,
      stale: payload.table.stale ?? false,
      createdAt: payload.table.created_at,
    },
    business: payload.business ?? null,
    categories: payload.categories.map((category) => ({
      id: category.id,
      name: toTitleCase(category.name),
      description: category.description ?? "",
      items: category.items.map((item) => ({
        id: item.id,
        name: toTitleCase(item.name),
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
  sessionToken?: string;
  orderType?: OrderType;
}) => {
  const res = await api.post<PlaceOrderResponse>("/public/orders", {
    table_id: payload.tableId,
    remarks: payload.remarks?.trim() ?? "",
    items: payload.items.map((item) => ({
      menu_item_id: item.menuItemId,
      quantity: item.quantity,
    })),
    ...(payload.orderType ? { order_type: payload.orderType } : {}),
    ...(payload.sessionToken ? { session_token: payload.sessionToken } : {}),
  });

  return normalizeOrder(unwrapApiData<PlaceOrderResponse["data"]>(res.data));
};

export const getPublicOrder = async (
  sessionToken: string,
): Promise<KitchenOrder> => {
  const res = await api.get<PublicOrderResponse>(
    `/public/orders/${encodeURIComponent(sessionToken)}`,
  );
  return normalizeOrder(unwrapApiData<PublicOrderResponse["data"]>(res.data));
};

export const getPublicTableOrders = async (
  tableCode: string,
): Promise<KitchenOrder[]> => {
  const res = await api.get<PublicOrderListResponse>(
    `/public/tables/${encodeURIComponent(tableCode)}/orders`,
  );
  return unwrapApiData<PublicOrderListResponse["data"]>(res.data).map(
    normalizeOrder,
  );
};

export const confirmPublicOrder = async (
  sessionToken: string,
): Promise<KitchenOrder> => {
  const res = await api.patch<PublicOrderResponse>(
    `/public/orders/${encodeURIComponent(sessionToken)}/confirm`,
  );
  return normalizeOrder(unwrapApiData<PublicOrderResponse["data"]>(res.data));
};

export const cancelPublicOrder = async (
  sessionToken: string,
): Promise<KitchenOrder> => {
  const res = await api.patch<PublicOrderResponse>(
    `/public/orders/${encodeURIComponent(sessionToken)}/cancel`,
  );
  return normalizeOrder(unwrapApiData<PublicOrderResponse["data"]>(res.data));
};

export const completePublicOrder = async (
  sessionToken: string,
): Promise<KitchenOrder> => {
  const res = await api.patch<PublicOrderResponse>(
    `/public/orders/${encodeURIComponent(sessionToken)}/complete`,
  );
  return normalizeOrder(unwrapApiData<PublicOrderResponse["data"]>(res.data));
};

export const touchPublicPresence = async (
  sessionToken: string,
): Promise<void> => {
  await api.patch(`/public/orders/${encodeURIComponent(sessionToken)}/presence`);
};

export type DashboardKpis = {
  totalRevenue: number;
  totalOrders: number;
  itemsSold: number;
  avgOrderValue: number;
  activeTables: number;
  totalTables: number;
  totalMenuItems: number;
};

export type TopProduct = {
  menuItemId: number;
  name: string;
  category: string;
  foodType: MenuRow["foodType"];
  imageUrl: string | null;
  quantity: number;
  revenue: number;
};

export type SalesTrendPoint = {
  date: string;
  label: string;
  orders: number;
  revenue: number;
};

export type DashboardStats = {
  ownerName: string;
  businessName: string;
  businessType: string;
  generatedAt: string;
  kpis: DashboardKpis;
  topProducts: TopProduct[];
  salesTrend: SalesTrendPoint[];
  statusBreakdown: Partial<Record<OrderStatus, number>>;
};

type DashboardResponse = {
  status: number;
  data: DashboardStats;
};

export type DashboardPeriod = "daily" | "weekly" | "monthly";

export const getDashboardStats = async (
  period: DashboardPeriod = "daily",
): Promise<DashboardStats> => {
  const res = await api.get<DashboardResponse>(
    `/admin/dashboard?period=${period}`,
  );
  const data = unwrapApiData<DashboardStats>(res.data);

  return {
    ...data,
    topProducts: (data.topProducts ?? []).map((product) => ({
      ...product,
      name: toTitleCase(product.name),
      category: toTitleCase(product.category),
      foodType: normalizeFoodType(product.foodType),
    })),
    salesTrend: data.salesTrend ?? [],
    statusBreakdown: data.statusBreakdown ?? {},
  };
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

  const menuCategories = unwrapApiData<GetMenusResponse["data"]>(res.data);
  const items = menuCategories
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
          name: toTitleCase(item.name),
          description: item.description ?? category.description ?? "",
          category: toTitleCase(category.name),
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
  const category = unwrapApiData<MenuCategoryResponse>(detail.data);

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
  return unwrapApiData(res.data);
};

export const createCategory = async (payload: {
  name: string;
  isActive?: boolean;
}) => {
  const res = await api.post<CategoryDetailResponse>("/admin/categories", {
    name: payload.name.trim(),
    is_active: payload.isActive ?? true,
  });

  return unwrapCategory(res);
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

  return unwrapCategory(res);
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
  return unwrapApiData(res.data);
};

export const deleteMenu = async (menuId: number) => {
  await api.delete(`/admin/menus/items/${menuId}`);
};

/* -------------------------------------------------------------------------- */
/* Superadmin: users, owners, restaurants + role-based access                  */
/* -------------------------------------------------------------------------- */

export type UserRole = "user" | "admin" | "super_admin";

export const USER_ROLES: UserRole[] = ["user", "admin", "super_admin"];

export const USER_ROLE_META: Record<
  UserRole,
  { label: string; color: string; bg: string; hint: string }
> = {
  super_admin: {
    label: "Super Admin",
    color: "#7c3aed",
    bg: "#f3e8ff",
    hint: "Full access to users, owners and restaurants",
  },
  admin: {
    label: "Owner",
    color: "#2563eb",
    bg: "#dbeafe",
    hint: "Owns one restaurant, full access to its admin panel",
  },
  user: {
    label: "User",
    color: "#475569",
    bg: "#e2e8f0",
    hint: "Basic account with no restaurant attached",
  },
};

export const getRoleLabel = (role: UserRole) =>
  USER_ROLE_META[role]?.label ?? role;

export type SuperAdminUser = {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  emailVerifiedAt: string | null;
  createdAt: string;
  business: {
    id: number;
    name: string;
    businessType: string;
    isActive: boolean;
  } | null;
};

export type SuperAdminCounts = {
  total: number;
  super_admin: number;
  admin: number;
  user: number;
};

export type SuperAdminUserPayload = {
  name: string;
  email: string;
  password?: string;
  role: UserRole;
  businessName?: string;
  businessType?: string;
  businessPhone?: string;
  businessEmail?: string;
  businessAddress?: string;
};

export type SuperAdminBusiness = {
  id: number;
  userId: number;
  name: string;
  businessType: string;
  phone: string;
  email: string;
  address: string;
  isActive: boolean;
  createdAt: string;
  menuItemsCount: number;
  tablesCount: number;
  ordersCount: number;
  owner: { id: number; name: string; email: string; role: UserRole } | null;
};

export type SuperAdminBusinessCounts = {
  total: number;
  active: number;
  inactive: number;
};

export type SuperAdminBusinessPayload = {
  userId?: number;
  name: string;
  businessType: string;
  phone?: string;
  email: string;
  address?: string;
  isActive?: boolean;
};

export type SuperAdminOverview = {
  users: SuperAdminCounts;
  businesses: SuperAdminBusinessCounts;
};

type RawSuperAdminUser = {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  email_verified_at?: string | null;
  created_at: string;
  business?: {
    id: number;
    name: string;
    business_type: string;
    is_active?: unknown;
  } | null;
};

type RawSuperAdminBusiness = {
  id: number;
  user_id: number;
  name: string;
  business_type: string;
  phone?: string | null;
  email: string;
  address?: string | null;
  is_active?: unknown;
  created_at: string;
  menu_items_count?: number;
  tables_count?: number;
  orders_count?: number;
  user?: { id: number; name: string; email: string; role: UserRole } | null;
};

const mapSuperAdminUser = (raw: RawSuperAdminUser): SuperAdminUser => ({
  id: raw.id,
  name: raw.name,
  email: raw.email,
  role: raw.role,
  emailVerifiedAt: raw.email_verified_at ?? null,
  createdAt: raw.created_at,
  business: raw.business
    ? {
        id: raw.business.id,
        name: raw.business.name,
        businessType: raw.business.business_type,
        isActive: parseAvailability(raw.business.is_active ?? true),
      }
    : null,
});

const mapSuperAdminBusiness = (raw: RawSuperAdminBusiness): SuperAdminBusiness => ({
  id: raw.id,
  userId: raw.user_id,
  name: raw.name,
  businessType: raw.business_type,
  phone: raw.phone ?? "",
  email: raw.email,
  address: raw.address ?? "",
  isActive: parseAvailability(raw.is_active ?? true),
  createdAt: raw.created_at,
  menuItemsCount: raw.menu_items_count ?? 0,
  tablesCount: raw.tables_count ?? 0,
  ordersCount: raw.orders_count ?? 0,
  owner: raw.user ?? null,
});

const toUserPayload = (payload: SuperAdminUserPayload) => ({
  name: payload.name.trim(),
  email: payload.email.trim(),
  role: payload.role,
  ...(payload.password ? { password: payload.password } : {}),
  ...(payload.businessName ? { business_name: payload.businessName.trim() } : {}),
  ...(payload.businessType ? { business_type: payload.businessType.trim() } : {}),
  ...(payload.businessPhone ? { business_phone: payload.businessPhone.trim() } : {}),
  ...(payload.businessEmail ? { business_email: payload.businessEmail.trim() } : {}),
  ...(payload.businessAddress ? { business_address: payload.businessAddress.trim() } : {}),
});

export const getSuperAdminOverview = async (): Promise<SuperAdminOverview> => {
  const res = await api.get("/superadmin/overview");
  return unwrapApiData<SuperAdminOverview>(res.data);
};

export const getSuperAdminUsers = async (params?: {
  q?: string;
  role?: UserRole | "";
  has_business?: boolean;
}): Promise<{ items: SuperAdminUser[]; counts: SuperAdminCounts }> => {
  const res = await api.get("/superadmin/users", {
    params: {
      q: params?.q?.trim() || undefined,
      role: params?.role || undefined,
      has_business: params?.has_business ? 1 : undefined,
    },
  });
  const data = unwrapApiData<{
    items: RawSuperAdminUser[];
    counts: SuperAdminCounts;
  }>(res.data);

  return {
    items: (data?.items ?? []).map(mapSuperAdminUser),
    counts: data?.counts ?? { total: 0, super_admin: 0, admin: 0, user: 0 },
  };
};

export const getSuperAdminUser = async (id: number): Promise<SuperAdminUser> => {
  const res = await api.get(`/superadmin/users/${id}`);
  const data = unwrapApiData<{ user: RawSuperAdminUser }>(res.data);
  return mapSuperAdminUser(data.user);
};

export const createSuperAdminUser = async (payload: SuperAdminUserPayload) => {
  const res = await api.post("/superadmin/users", toUserPayload(payload));
  const data = unwrapApiData<{ user: RawSuperAdminUser }>(res.data);
  return mapSuperAdminUser(data.user);
};

export const updateSuperAdminUser = async (payload: {
  id: number;
} & SuperAdminUserPayload) => {
  const res = await api.put(`/superadmin/users/${payload.id}`, toUserPayload(payload));
  const data = unwrapApiData<{ user: RawSuperAdminUser }>(res.data);
  return mapSuperAdminUser(data.user);
};

export const deleteSuperAdminUser = async (id: number) => {
  await api.delete(`/superadmin/users/${id}`);
};

export const getSuperAdminBusinesses = async (params?: {
  q?: string;
  is_active?: string;
}): Promise<{
  items: SuperAdminBusiness[];
  counts: SuperAdminBusinessCounts;
}> => {
  const res = await api.get("/superadmin/businesses", {
    params: {
      q: params?.q?.trim() || undefined,
      is_active: params?.is_active || undefined,
    },
  });
  const data = unwrapApiData<{
    items: RawSuperAdminBusiness[];
    counts: SuperAdminBusinessCounts;
  }>(res.data);

  return {
    items: (data?.items ?? []).map(mapSuperAdminBusiness),
    counts: data?.counts ?? { total: 0, active: 0, inactive: 0 },
  };
};

export const getSuperAdminBusiness = async (
  id: number,
): Promise<SuperAdminBusiness> => {
  const res = await api.get(`/superadmin/businesses/${id}`);
  const data = unwrapApiData<{ business: RawSuperAdminBusiness }>(res.data);
  return mapSuperAdminBusiness(data.business);
};

export const createSuperAdminBusiness = async (
  payload: SuperAdminBusinessPayload,
) => {
  const res = await api.post("/superadmin/businesses", {
    user_id: payload.userId,
    name: payload.name.trim(),
    business_type: payload.businessType.trim(),
    phone: payload.phone?.trim() || undefined,
    email: payload.email.trim(),
    address: payload.address?.trim() || undefined,
    is_active: payload.isActive ?? true,
  });
  const data = unwrapApiData<{ business: RawSuperAdminBusiness }>(res.data);
  return mapSuperAdminBusiness(data.business);
};

export const updateSuperAdminBusiness = async (payload: {
  id: number;
} & SuperAdminBusinessPayload) => {
  const res = await api.put(`/superadmin/businesses/${payload.id}`, {
    user_id: payload.userId,
    name: payload.name.trim(),
    business_type: payload.businessType.trim(),
    phone: payload.phone?.trim() || undefined,
    email: payload.email.trim(),
    address: payload.address?.trim() || undefined,
    is_active: payload.isActive ?? true,
  });
  const data = unwrapApiData<{ business: RawSuperAdminBusiness }>(res.data);
  return mapSuperAdminBusiness(data.business);
};

export const deleteSuperAdminBusiness = async (id: number) => {
  await api.delete(`/superadmin/businesses/${id}`);
};

export type BusinessSettings = {
  id: number;
  name: string;
  logo: string | null;
  business_type: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
};

export const getBusinessSettings = async (): Promise<BusinessSettings> => {
  const res = await api.get("/admin/business");
  return unwrapApiData<BusinessSettings>(res.data);
};

export const updateBusinessSettings = async (payload: {
  name: string;
  logoFile?: File | null;
}): Promise<BusinessSettings> => {
  const formData = new FormData();
  formData.append("name", payload.name.trim());
  if (payload.logoFile) {
    formData.append("logo", payload.logoFile);
  }

  const res = await api.post("/admin/business", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return unwrapApiData<BusinessSettings>(res.data);
};

export const verifyEmail = async (token: string): Promise<string> => {
  const res = await api.post("/verify-email", { token });
  const payload = res.data as { message?: string };
  return payload.message ?? "Email verified successfully.";
};

export const resendVerification = async (email: string): Promise<string> => {
  const res = await api.post("/resend-verification", { email });
  const payload = res.data as { message?: string };
  return payload.message ?? "Verification email sent.";
};
