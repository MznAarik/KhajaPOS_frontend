import axios from "axios";
import { safeError } from "./safeError";
const API_BASE = "/api/svc";

if (typeof window !== "undefined") {
  // Older builds kept the access token in localStorage. Purge it on sight.
  window.localStorage.removeItem("authToken");
  window.localStorage.removeItem("authTokenType");
}

export const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

export const clearAuthSession = async () => {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);
    await fetch("/api/auth/session", {
      method: "DELETE",
      signal: controller.signal,
      credentials: "same-origin",
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

  return config;
});

export type PlatformStatusAlert = {
  code: "MAINTENANCE_MODE" | "BUSINESS_SUSPENDED" | string;
  message: string;
  data?: unknown;
};

const emitPlatformStatus = (alert: PlatformStatusAlert | null) => {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("khajapos:platform-status", { detail: alert }));
};

api.interceptors.response.use(
  (response) => {
    if (
      response.data &&
      typeof response.data === "object" &&
      "status" in response.data &&
      Number(response.data.status) === 0
    ) {
      const responseData = response.data as Record<string, unknown> | undefined;
      const code = typeof responseData?.code === "string" ? responseData.code : undefined;
      if (code === "MAINTENANCE_MODE" || code === "BUSINESS_SUSPENDED") {
        emitPlatformStatus({
          code,
          message: (typeof responseData?.message === "string" ? responseData.message : null) || "Service is temporarily unavailable.",
          data: response.data,
        });
      }
      const apiError = new Error(safeError({ response }, "Request failed."));
      Object.assign(apiError, { response });
      return Promise.reject(apiError);
    }

    return response;
  },
  async (error) => {
    const data = error?.response?.data;
    const code = data?.code;
    if (code === "MAINTENANCE_MODE" || code === "BUSINESS_SUSPENDED") {
      emitPlatformStatus({
        code,
        message: data?.message || "Service is temporarily unavailable.",
        data,
      });
    }
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
  foodType: "veg" | "non-veg" | "egg" | "vegan" | "beverage";
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
    case "beverage":
      return "Beverage";
    default:
      return foodType;
  }
};

export type FoodFilterKey = "all" | "veg" | "non-veg" | "beverage" | "drinks" | "others";

export const FOOD_FILTER_LABELS: Record<FoodFilterKey, string> = {
  all: "All",
  veg: "Veg",
  "non-veg": "Non-Veg",
  beverage: "Beverage",
  drinks: "Drinks",
  others: "Others",
};

export const FOOD_FILTER_ORDER: FoodFilterKey[] = ["all", "veg", "non-veg", "beverage", "drinks", "others"];

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
  if (filter === "beverage") return foodType === "beverage";
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
    categoryId: number | null;
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
  topProducts: TopProduct[];
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
      category_id?: number | null;
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
    topProducts?: TopProduct[];
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

  let data: unknown = null;

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

  return data as T;
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

  const normalizedPath = imageUrl.replace(/^\/+/, "").replace(/^storage\//, "");

  return `/media/${normalizedPath}`;
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
    normalizedFoodType === "vegan" ||
    normalizedFoodType === "beverage"
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
  foodType: "veg" | "non-veg" | "egg" | "vegan" | "beverage";
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

export const releaseAdminTable = async (id: number) => {
  const res = await api.patch(`/admin/tables/${id}/release`);

  return unwrapApiData(res.data);
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
    categoryId: item.menu_item?.category_id ?? null,
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

const publicMenuRequests = new Map<string, Promise<PublicTableMenu>>();

export const getPublicMenu = async (
  tableCode: string,
): Promise<PublicTableMenu> => {
  const existingRequest = publicMenuRequests.get(tableCode);
  if (existingRequest) return existingRequest;

  const request = (async (): Promise<PublicTableMenu> => {
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
    topProducts: (payload.topProducts ?? []).map((product) => ({
      ...product,
      name: toTitleCase(product.name),
      category: toTitleCase(product.category),
      foodType: normalizeFoodType(product.foodType),
    })),
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
  })();

  publicMenuRequests.set(tableCode, request);
  try {
    return await request;
  } finally {
    if (publicMenuRequests.get(tableCode) === request) {
      publicMenuRequests.delete(tableCode);
    }
  }
};

export const placePublicOrder = async (payload: {
  tableId: number;
  remarks?: string;
  items: Array<{ menuItemId: number; quantity: number }>;
  sessionToken?: string;
  orderType?: OrderType;
}) => {
  const customerToken = getStoredCustomerToken();
  const res = await api.post<PlaceOrderResponse>(
    "/public/orders",
    {
      table_id: payload.tableId,
      remarks: payload.remarks?.trim() ?? "",
      items: payload.items.map((item) => ({
        menu_item_id: item.menuItemId,
        quantity: item.quantity,
      })),
      ...(payload.orderType ? { order_type: payload.orderType } : {}),
      ...(payload.sessionToken ? { session_token: payload.sessionToken } : {}),
    },
    customerToken ? { headers: { Authorization: `Bearer ${customerToken}` } } : undefined,
  );

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
  occupiedTables: number;
  inactiveTables: number;
  totalTables: number;
  totalMenuItems: number;
};

export type RecentOrderSummary = {
  id: number;
  tableNo: string | null;
  orderType: "dine_in" | "takeaway";
  status: OrderStatus;
  total: number;
  itemCount: number;
  createdAt: string;
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
  recentOrders: RecentOrderSummary[];
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
    kpis: {
      ...data.kpis,
      occupiedTables: data.kpis?.occupiedTables ?? 0,
      inactiveTables: data.kpis?.inactiveTables ?? 0,
    },
    topProducts: (data.topProducts ?? []).map((product) => ({
      ...product,
      name: toTitleCase(product.name),
      category: toTitleCase(product.category),
      foodType: normalizeFoodType(product.foodType),
    })),
    salesTrend: data.salesTrend ?? [],
    statusBreakdown: data.statusBreakdown ?? {},
    recentOrders: data.recentOrders ?? [],
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

export type UserRole =
  | "user"
  | "admin"
  | "super_admin"
  | "manager"
  | "cashier"
  | "kitchen_staff";

export const USER_ROLES: UserRole[] = [
  "user",
  "admin",
  "super_admin",
  "manager",
  "cashier",
  "kitchen_staff",
];

export const BUSINESS_STAFF_ROLES: UserRole[] = ["manager", "cashier", "kitchen_staff"];

export const USER_ROLE_META: Record<
  UserRole,
  { label: string; color: string; bg: string; hint: string }
> = {
  super_admin: {
    label: "Super Admin",
    color: "#7c3aed",
    bg: "#f3e8ff",
    hint: "Full access to platform management",
  },
  admin: {
    label: "Business Admin",
    color: "#2563eb",
    bg: "#dbeafe",
    hint: "Owns and manages a restaurant workspace",
  },
  manager: {
    label: "Manager",
    color: "#0f766e",
    bg: "#ccfbf1",
    hint: "Restaurant operations manager with delegated capabilities",
  },
  cashier: {
    label: "Cashier",
    color: "#b45309",
    bg: "#fef3c7",
    hint: "Handles orders, payments, and customer/reward validation",
  },
  kitchen_staff: {
    label: "Kitchen Staff",
    color: "#b91c1c",
    bg: "#fee2e2",
    hint: "Handles kitchen/order preparation workflow",
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
    phone: string;
    email: string;
    address: string;
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
  suspendedAt?: string | null;
  suspensionReason?: string | null;
  reactivatedAt?: string | null;
  menuItemsCount: number;
  tablesCount: number;
  ordersCount: number;
  owner: { id: number; name: string; email: string; role: UserRole } | null;
};

export type SuperAdminBusinessCounts = {
  total: number;
  active: number;
  inactive: number;
  suspended?: number;
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
    phone?: string | null;
    email?: string | null;
    address?: string | null;
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
  suspended_at?: string | null;
  suspension_reason?: string | null;
  reactivated_at?: string | null;
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
        phone: raw.business.phone ?? "",
        email: raw.business.email ?? "",
        address: raw.business.address ?? "",
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
  suspendedAt: raw.suspended_at ?? null,
  suspensionReason: raw.suspension_reason ?? null,
  reactivatedAt: raw.reactivated_at ?? null,
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

/* -------------------------------------------------------------------------- */
/* Superadmin: platform growth & usage analytics                               */
/* -------------------------------------------------------------------------- */

export type AnalyticsTrendValue = "businesses" | "users" | "orders" | "revenue";

export type AnalyticsGrowth = {
  current: number;
  previous: number;
  percent: number;
};

export type AnalyticsMonthlyPoint = {
  key: string;
  label: string;
  businesses: number;
  users: number;
  orders: number;
  revenue: number;
};

export type AnalyticsBusinessType = {
  label: string;
  count: number;
};

export type AnalyticsTopBusiness = {
  id: number;
  name: string;
  businessType: string;
  isActive: boolean;
  orders: number;
  revenue: number;
  menuItems: number;
  tables?: number;
  categories?: number;
  users?: number;
  resourceScore?: number;
};

export type AnalyticsTrafficPoint = {
  key: string;
  at?: string;
  label: string;
  requests: number;
  errors: number;
};

export type AnalyticsRoute = {
  method: string;
  path: string;
  requests: number;
  avgMs: number;
  errors: number;
};

export type PlatformAnalytics = {
  generatedAt: string;
  overview: {
    totals: {
      users: number;
      customers: number;
      owners: number;
      superAdmins: number;
      businesses: number;
      activeBusinesses: number;
      inactiveBusinesses: number;
      orders: number;
      revenue: number;
      menuItems: number;
      categories: number;
      tables: number;
    };
    growth: Record<AnalyticsTrendValue, AnalyticsGrowth>;
    monthly: AnalyticsMonthlyPoint[];
    daily: SalesTrendPoint[];
    businessTypes: AnalyticsBusinessType[];
    topBusinesses: AnalyticsTopBusiness[];
  };
  usage: {
    requestsPerMinute: AnalyticsTrafficPoint[];
    requestsPerHour: AnalyticsTrafficPoint[];
    last24h: {
      requests: number;
      errors: number;
      errorRate: number;
      avgLatencyMs: number;
      p95LatencyMs: number;
      uniqueUsers: number;
      peakPerMinute: number;
      currentPerMinute: number;
    };
    routes: AnalyticsRoute[];
    statusCodes: Array<{ code: number; count: number }>;
  };
  data: {
    businessScoped?: boolean;
    database: {
      name: string;
      sizeBytes: number;
    };
    storage: {
      sizeBytes: number;
    };
    image_storage?: {
      scope: "business" | "platform";
      business_id?: number;
      available: boolean;
      reason?: string;
      total_images?: number;
      known_bytes?: number;
      known_mb?: number;
      unknown_images?: number;
      missing_images?: number;
      fully_known?: boolean;
      breakdown?: Record<string, unknown>;
      note?: string;
    };
    tables: Array<{
      name: string;
      rows: number;
      sizeBytes: number;
    }>;
  };
};

export const getPlatformAnalytics = async (businessId?: number): Promise<PlatformAnalytics> => {
  const res = await api.get("/superadmin/analytics", {
    params: businessId ? { business_id: businessId } : undefined,
  });
  return unwrapApiData<PlatformAnalytics>(res.data);
};

/* Super-admin loyalty oversight (read-only) */
export type SuperAdminPagination = { current_page: number; last_page: number; per_page: number; total: number };
export type SuperAdminLoyaltyProgramsResponse = { items: Record<string, unknown>[]; pagination: SuperAdminPagination };
export type SuperAdminLoyaltyMembershipsResponse = { items: Record<string, unknown>[]; pagination: SuperAdminPagination };
export type SuperAdminLoyaltyRewardsResponse = { items: Record<string, unknown>[]; pagination: SuperAdminPagination };
export type SuperAdminLoyaltyAuditLogsResponse = { items: Record<string, unknown>[]; pagination: SuperAdminPagination };

export const getSuperAdminLoyaltyPrograms = async (params?: { business_id?: number | string; search?: string; page?: number; per_page?: number }) => {
  const res = await api.get("/superadmin/loyalty/programs", { params });
  return unwrapApiData<SuperAdminLoyaltyProgramsResponse>(res.data);
};
export const getSuperAdminLoyaltyMemberships = async (params?: { business_id?: number | string; search?: string; page?: number; per_page?: number }) => {
  const res = await api.get("/superadmin/loyalty/memberships", { params });
  return unwrapApiData<SuperAdminLoyaltyMembershipsResponse>(res.data);
};
export const getSuperAdminLoyaltyRewards = async (params?: { business_id?: number | string; status?: string; search?: string; page?: number; per_page?: number }) => {
  const res = await api.get("/superadmin/loyalty/rewards", { params });
  return unwrapApiData<SuperAdminLoyaltyRewardsResponse>(res.data);
};
export const getSuperAdminLoyaltyAuditLogs = async (params?: { business_id?: number | string; action?: string; search?: string; page?: number; per_page?: number }) => {
  const res = await api.get("/superadmin/loyalty/audit-logs", { params });
  return unwrapApiData<SuperAdminLoyaltyAuditLogsResponse>(res.data);
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

/* -------------------------------------------------------------------------- */
/* Customer auth (QR loyalty / rewards)                                        */
/* -------------------------------------------------------------------------- */

export const CUSTOMER_TOKEN_STORAGE_KEY = "khajapos_customer_token";

export type CustomerProfile = {
  id: number;
  name: string;
  phone: string;
  phone_verified_at: string | null;
  email: string | null;
  email_verified_at: string | null;
  status: string;
  last_login_at: string | null;
  created_at?: string | null;
};

export type CustomerAuthResponse = {
  customer?: CustomerProfile;
  token?: string;
  token_type?: string;
  expires_at?: string | null;
  verification_required?: boolean;
  message?: string;
  memberships?: Record<string, unknown>[];
};

export const getStoredCustomerToken = (): string | null => {
  if (typeof window === "undefined") return null;
  const token = window.localStorage.getItem(CUSTOMER_TOKEN_STORAGE_KEY);
  return token && token.trim() ? token.trim() : null;
};

export const setStoredCustomerToken = (token: string) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(CUSTOMER_TOKEN_STORAGE_KEY, token);
};

export const clearStoredCustomerToken = () => {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(CUSTOMER_TOKEN_STORAGE_KEY);
};

const customerAuthHeaders = () => {
  const token = getStoredCustomerToken();
  return token ? { Authorization: `Bearer ${token}` } : undefined;
};

export const customerRegister = async (payload: {
  name: string;
  email: string;
  phone?: string;
  password?: string;
}): Promise<CustomerAuthResponse> => {
  const res = await api.post("/customer/auth/register", payload);
  return unwrapApiData<CustomerAuthResponse>(res.data);
};

export const customerRequestOtp = async (payload: {
  email: string;
  purpose?: "login" | "registration";
}): Promise<CustomerAuthResponse> => {
  const res = await api.post("/customer/auth/request-otp", payload);
  return unwrapApiData<CustomerAuthResponse>(res.data);
};

export const customerVerifyOtp = async (payload: {
  email: string;
  code: string;
  name?: string;
  password?: string;
}): Promise<CustomerAuthResponse> => {
  const res = await api.post("/customer/auth/verify-otp", payload);
  const data = unwrapApiData<CustomerAuthResponse>(res.data);
  if (data?.token) setStoredCustomerToken(data.token);
  return data;
};

export const customerLogin = async (payload: {
  email: string;
  password: string;
}): Promise<CustomerAuthResponse> => {
  const res = await api.post("/customer/auth/login", payload);
  const data = unwrapApiData<CustomerAuthResponse>(res.data);
  if (data?.token) setStoredCustomerToken(data.token);
  return data;
};

export const getCustomerMe = async (): Promise<CustomerAuthResponse> => {
  const res = await api.get("/customer/auth/me", { headers: customerAuthHeaders() });
  return unwrapApiData<CustomerAuthResponse>(res.data);
};

export const customerLogout = async (): Promise<void> => {
  try {
    await api.post("/customer/auth/logout", null, { headers: customerAuthHeaders() });
  } finally {
    clearStoredCustomerToken();
  }
};

/* -------------------------------------------------------------------------- */
/* Superadmin: SaaS platform management                                        */
/* -------------------------------------------------------------------------- */

export type SuperAdminSaasOverview = SuperAdminOverview & {
  generatedAt?: string;
  kpis?: {
    totalBusinesses: number;
    activeBusinesses: number;
    suspendedBusinesses: number;
    totalUsers: number;
    totalOrders: number;
    orderRevenue: number;
    paidRevenueThisMonth: number;
    mrr: number;
    arr: number;
    overduePayments: number;
    failedPayments30d: number;
    pastDueSubscriptions: number;
    expiringSubscriptions14d: number;
    openAlerts: number;
  };
  growth?: {
    businesses: AnalyticsGrowth;
    orderRevenue: AnalyticsGrowth;
    paidRevenue: AnalyticsGrowth;
  };
  monthly?: Array<{ key: string; label: string; businesses: number; orders: number; orderRevenue: number; paidRevenue: number }>;
  health?: Record<string, unknown>;
};

export type SubscriptionPlan = {
  id: number;
  name: string;
  slug: string;
  description?: string | null;
  price: number | string;
  currency: string;
  billing_cycle: string;
  trial_days: number;
  is_active: boolean;
  is_default: boolean;
  features?: string[] | Record<string, unknown> | null;
  limits?: Record<string, number> | null;
  subscriptions_count?: number;
};

export type BusinessSubscription = {
  id: number;
  business_id: number;
  plan_id?: number | null;
  status: string;
  starts_at?: string | null;
  ends_at?: string | null;
  trial_ends_at?: string | null;
  renews_at?: string | null;
  grace_ends_at?: string | null;
  auto_renew: boolean;
  notes?: string | null;
  business?: { id: number; name: string; email?: string; is_active?: boolean } | null;
  plan?: { id: number; name: string; slug?: string; price?: number | string; currency?: string; billing_cycle?: string; limits?: Record<string, number> } | null;
};

export type SubscriptionPayment = {
  id: number;
  business_id: number;
  subscription_id?: number | null;
  plan_id?: number | null;
  amount: number | string;
  currency: string;
  status: string;
  payment_method?: string | null;
  reference?: string | null;
  due_at?: string | null;
  paid_at?: string | null;
  failed_at?: string | null;
  failure_reason?: string | null;
  notes?: string | null;
  created_at?: string;
  business?: { id: number; name: string; email?: string } | null;
  plan?: { id: number; name: string } | null;
  subscription?: { id: number; status: string } | null;
};

export type SuperAdminNotificationItem = {
  id: number;
  type: string;
  severity: string;
  title: string;
  message: string;
  business_id?: number | null;
  is_read: boolean;
  read_at?: string | null;
  data?: Record<string, unknown> | null;
  created_at: string;
  business?: { id: number; name: string } | null;
};

export type BusinessUsageItem = {
  business: { id: number; name: string; is_active: boolean };
  plan?: { id: number; name: string } | null;
  subscription_status?: string | null;
  metrics: Record<string, number>;
  limits: Record<string, number>;
  warnings: Array<{ metric: string; message: string; severity: string; percent?: number; value?: number; limit?: number }>;
  storage_instrumented?: boolean;
  storage?: {
    total_images?: number;
    known_bytes?: number;
    known_mb?: number;
    unknown_images?: number;
    missing_images?: number;
    fully_known?: boolean;
    breakdown?: {
      logo?: { images?: number; known_bytes?: number; known_mb?: number; unknown_images?: number; missing_images?: number };
      menu_items?: { images?: number; known_bytes?: number; known_mb?: number; unknown_images?: number; missing_images?: number };
    };
    note?: string;
  };
};

export type BackupRecordItem = {
  id: number;
  name: string;
  type: string;
  status: string;
  source: string;
  path?: string | null;
  size_bytes?: number | null;
  started_at?: string | null;
  completed_at?: string | null;
  verified_at?: string | null;
  notes?: string | null;
  created_at: string;
};

export const getSuperAdminSaasOverview = async (): Promise<SuperAdminSaasOverview> => {
  const res = await api.get("/superadmin/overview");
  return unwrapApiData<SuperAdminSaasOverview>(res.data);
};

export const getSuperAdminBusinessDetails = async (id: number) => {
  const res = await api.get(`/superadmin/businesses/${id}/details`);
  return unwrapApiData<Record<string, unknown>>(res.data);
};

export const suspendSuperAdminBusiness = async (id: number, payload: { confirm: boolean; reason: string }) => {
  const res = await api.post(`/superadmin/businesses/${id}/suspend`, payload);
  return unwrapApiData<Record<string, unknown>>(res.data);
};

export const reactivateSuperAdminBusiness = async (id: number, payload: { confirm: boolean; reason?: string }) => {
  const res = await api.post(`/superadmin/businesses/${id}/reactivate`, payload);
  return unwrapApiData<Record<string, unknown>>(res.data);
};

export const getSuperAdminBusinessAnalytics = async (id: number) => {
  const res = await api.get(`/superadmin/businesses/${id}/analytics`);
  return unwrapApiData<Record<string, unknown>>(res.data);
};

export const getSuperAdminPlans = async (): Promise<{ items: SubscriptionPlan[] }> => {
  const res = await api.get("/superadmin/plans");
  return unwrapApiData(res.data);
};

export const saveSuperAdminPlan = async (payload: Record<string, unknown>, id?: number) => {
  const res = id ? await api.put(`/superadmin/plans/${id}`, payload) : await api.post("/superadmin/plans", payload);
  return unwrapApiData<Record<string, unknown>>(res.data);
};

export const getSuperAdminSubscriptions = async (params?: Record<string, unknown>): Promise<{ items: BusinessSubscription[]; counts: Record<string, unknown> }> => {
  const res = await api.get("/superadmin/subscriptions", { params });
  return unwrapApiData(res.data);
};

export const assignSuperAdminSubscription = async (businessId: number, payload: Record<string, unknown>) => {
  const res = await api.post(`/superadmin/businesses/${businessId}/subscription`, payload);
  return unwrapApiData<Record<string, unknown>>(res.data);
};

export const getSuperAdminPayments = async (params?: Record<string, unknown>): Promise<{ items: SubscriptionPayment[]; counts: Record<string, unknown> }> => {
  const res = await api.get("/superadmin/payments", { params });
  return unwrapApiData(res.data);
};

export const recordSuperAdminPayment = async (payload: Record<string, unknown>) => {
  const res = await api.post("/superadmin/payments", payload);
  return unwrapApiData<Record<string, unknown>>(res.data);
};

export const getSuperAdminNotifications = async (params?: Record<string, unknown>): Promise<{ items: SuperAdminNotificationItem[]; counts: Record<string, unknown> }> => {
  const res = await api.get("/superadmin/notifications", { params });
  return unwrapApiData(res.data);
};

export const markSuperAdminNotificationsRead = async (ids?: number[]) => {
  const res = await api.post("/superadmin/notifications/read", { ids: ids ?? [] });
  return unwrapApiData<Record<string, unknown>>(res.data);
};

export const getAdminNotifications = async (params?: Record<string, unknown>): Promise<{ items: SuperAdminNotificationItem[]; counts: Record<string, unknown> }> => {
  const res = await api.get("/admin/notifications", { params });
  return unwrapApiData(res.data);
};

export const markAdminNotificationsRead = async (ids?: number[]) => {
  const res = await api.post("/admin/notifications/read", { ids: ids ?? [] });
  return unwrapApiData<Record<string, unknown>>(res.data);
};

export const getSuperAdminUsage = async (): Promise<{ summary: Record<string, unknown>; items: BusinessUsageItem[] }> => {
  const res = await api.get("/superadmin/usage");
  return unwrapApiData(res.data);
};

export const getSuperAdminOperations = async () => {
  const res = await api.get("/superadmin/operations");
  return unwrapApiData<Record<string, unknown>>(res.data);
};

export const setSuperAdminMaintenance = async (payload: { enabled: boolean; message?: string; allow_super_admin?: boolean }) => {
  const res = await api.post("/superadmin/operations/maintenance", payload);
  return unwrapApiData<Record<string, unknown>>(res.data);
};

export const getSuperAdminBackups = async (): Promise<{ items: BackupRecordItem[]; summary: Record<string, unknown> }> => {
  const res = await api.get("/superadmin/backups");
  return unwrapApiData(res.data);
};

export const recordSuperAdminBackup = async (payload: Record<string, unknown>) => {
  const res = await api.post("/superadmin/backups", payload);
  return unwrapApiData<Record<string, unknown>>(res.data);
};

/* -------------------------------------------------------------------------- */
/* Loyalty (business admin/staff)                                              */
/* -------------------------------------------------------------------------- */

export type LoyaltyTier = {
  id: number;
  loyalty_program_id?: number;
  business_id?: number;
  name: string | null;
  threshold_orders: number;
  reward_type: "percentage_discount" | "fixed_discount" | "free_item" | "free_drink" | "custom" | string;
  reward_value: string | number | null;
  reward_description: string | null;
  validity_days: number | null;
  min_order_amount: string | number | null;
  applicable_order_types: string[] | null;
  is_active: boolean;
  is_stackable?: boolean;
  sort_order?: number;
  metadata?: Record<string, unknown> | null;
};

export type LoyaltyProgram = {
  id?: number;
  business_id?: number;
  is_enabled: boolean;
  progress_policy: "reset" | "accumulate" | "rolling" | string;
  eligible_order_types: string[] | null;
  eligible_order_statuses: string[] | null;
  allow_reward_stacking: boolean;
  settings?: Record<string, unknown> | null;
  tiers: LoyaltyTier[];
};

export const getLoyaltyProgram = async (): Promise<LoyaltyProgram> => {
  const res = await api.get("/admin/loyalty/program");
  return unwrapApiData<LoyaltyProgram>(res.data);
};

export const saveLoyaltyProgram = async (payload: Partial<LoyaltyProgram>): Promise<LoyaltyProgram> => {
  const res = await api.put("/admin/loyalty/program", payload);
  return unwrapApiData<LoyaltyProgram>(res.data);
};

export const createLoyaltyTier = async (payload: Partial<LoyaltyTier>): Promise<LoyaltyTier> => {
  const res = await api.post("/admin/loyalty/tiers", payload);
  return unwrapApiData<LoyaltyTier>(res.data);
};

export const updateLoyaltyTier = async (id: number, payload: Partial<LoyaltyTier>): Promise<LoyaltyTier> => {
  const res = await api.put(`/admin/loyalty/tiers/${id}`, payload);
  return unwrapApiData<LoyaltyTier>(res.data);
};

export const deleteLoyaltyTier = async (id: number): Promise<void> => {
  await api.delete(`/admin/loyalty/tiers/${id}`);
};

export const getLoyaltyMemberships = async (params?: { search?: string }): Promise<Record<string, unknown>[]> => {
  const res = await api.get("/admin/loyalty/memberships", { params });
  return unwrapApiData<Record<string, unknown>[]>(res.data);
};

export const getLoyaltyRewards = async (params?: { status?: string; customer_id?: number; reward_code?: string }): Promise<Record<string, unknown>[]> => {
  const res = await api.get("/admin/loyalty/rewards", { params });
  return unwrapApiData<Record<string, unknown>[]>(res.data);
};

export const lookupLoyaltyReward = async (code: string): Promise<{ reward: Record<string, unknown>; redeemable: boolean; effective_status: string }> => {
  const res = await api.get("/admin/loyalty/rewards/lookup", { params: { code } });
  return unwrapApiData(res.data);
};

export const redeemLoyaltyReward = async (payload: { reward_code: string; order_id?: number; discount_amount?: number; metadata?: Record<string, unknown> }) => {
  const res = await api.post("/admin/loyalty/rewards/redeem", payload);
  return unwrapApiData<Record<string, unknown>>(res.data);
};

export const revokeLoyaltyReward = async (id: number, reason: string) => {
  const res = await api.post(`/admin/loyalty/rewards/${id}/revoke`, { reason });
  return unwrapApiData<Record<string, unknown>>(res.data);
};

export const getLoyaltyMembership = async (customerId: number) => {
  const res = await api.get("/admin/loyalty/membership", { params: { customer_id: customerId } });
  return unwrapApiData<Record<string, unknown>>(res.data);
};

export type LoyaltyBusinessSummary = {
  program: {
    id?: number;
    is_enabled: boolean;
    progress_policy?: string | null;
    eligible_order_statuses?: string[] | null;
    eligible_order_types?: string[] | null;
  } | null;
  members: {
    total: number;
    active: number;
    with_progress: number;
    with_available_rewards: number;
    lifetime_eligible_orders: number;
  };
  rewards: {
    issued: number;
    available: number;
    redeemed: number;
    expired: number;
    revoked: number;
  };
  recent_redemptions: Array<{
    id: number;
    status?: string | null;
    discount_amount?: string | number | null;
    processed_role?: string | null;
    created_at?: string | null;
    reward?: { id: number; reward_code?: string; reward_type?: string; reward_value?: string | number | null; reward_description?: string | null; status?: string | null } | null;
    customer?: { id: number; name?: string | null; email?: string | null; phone?: string | null } | null;
    order?: { id: number; table_no?: string | null; order_type?: string | null; total_amount?: string | number | null; order_status?: string | null } | null;
  }>;
};

export const getLoyaltySummary = async (): Promise<LoyaltyBusinessSummary> => {
  const res = await api.get("/admin/loyalty/summary");
  return unwrapApiData<LoyaltyBusinessSummary>(res.data);
};

export type LoyaltyAuditLogItem = {
  id: number;
  actor_id?: number | null;
  actor_role?: string | null;
  action: string;
  target_type?: string | null;
  target_id?: number | null;
  business_id?: number | null;
  customer_id?: number | null;
  customer_name?: string | null;
  customer_email?: string | null;
  reason?: string | null;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
  created_at?: string | null;
};

export type LoyaltyAuditLogsResponse = {
  items: LoyaltyAuditLogItem[];
  pagination: { current_page: number; per_page: number; total: number; last_page: number };
};

export const getLoyaltyAuditLogs = async (params?: {
  action?: string;
  search?: string;
  customer_id?: number;
  target_type?: string;
  target_id?: number;
  date_from?: string;
  date_to?: string;
  page?: number;
  per_page?: number;
}): Promise<LoyaltyAuditLogsResponse> => {
  const res = await api.get("/admin/loyalty/audit-logs", { params });
  return unwrapApiData<LoyaltyAuditLogsResponse>(res.data);
};

export type LoyaltyTrendsResponse = {
  range_days: number;
  from: string;
  to: string;
  totals: { issued: number; available: number; redeemed: number; revoked: number; expired: number };
  series: Array<{ date: string; issued: number; redeemed: number; revoked: number; expired: number }>;
  top_tiers: Array<{ tier_id: number | null; tier_name: string; issued_count: number }>;
  top_reasons: Array<{ reason: string; count: number }>;
};

export const getLoyaltyTrends = async (params?: { days?: number }): Promise<LoyaltyTrendsResponse> => {
  const res = await api.get("/admin/loyalty/trends", { params });
  return unwrapApiData<LoyaltyTrendsResponse>(res.data);
};

/* -------------------------------------------------------------------------- */
/* Staff management (business admin)                                           */
/* -------------------------------------------------------------------------- */

export type StaffPermissionOverride = {
  permission_key: string;
  is_granted: boolean;
  expires_at?: string | null;
};

export type StaffMember = {
  id: number;
  business_id: number;
  user_id: number;
  role: string;
  status: string;
  is_primary?: boolean;
  joined_at?: string | null;
  last_access_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  user?: {
    id: number;
    name: string;
    email: string;
    role: string;
    is_active?: boolean;
    email_verified_at?: string | null;
    created_at?: string | null;
  } | null;
  permission_overrides?: StaffPermissionOverride[];
};

export type StaffPermissionsCatalog = {
  permissions: Array<{ key: string; name: string; group?: string | null; description?: string | null; sort_order?: number }>;
  role_defaults: Record<string, string[]>;
  staff_roles: string[];
};

export const getStaffMembers = async (): Promise<StaffMember[]> => {
  const res = await api.get("/admin/staff");
  return unwrapApiData<StaffMember[]>(res.data);
};

export const getStaffPermissionsCatalog = async (): Promise<StaffPermissionsCatalog> => {
  const res = await api.get("/admin/staff/permissions");
  return unwrapApiData<StaffPermissionsCatalog>(res.data);
};

export const createStaffMember = async (payload: { name: string; email: string; password: string; role: string; status?: string }): Promise<{ member: StaffMember }> => {
  const res = await api.post("/admin/staff", payload);
  return unwrapApiData(res.data);
};

export const updateStaffMember = async (memberId: number, payload: { name?: string; role?: string; status?: string; is_active?: boolean }): Promise<{ member: StaffMember }> => {
  const res = await api.put(`/admin/staff/${memberId}`, payload);
  return unwrapApiData(res.data);
};

export const updateStaffMemberPermissions = async (memberId: number, overrides: StaffPermissionOverride[]): Promise<{ member_id: number; user_id: number; permission_overrides: StaffPermissionOverride[] }> => {
  const res = await api.put(`/admin/staff/${memberId}/permissions`, { overrides });
  return unwrapApiData(res.data);
};

export const removeStaffMember = async (memberId: number): Promise<void> => {
  await api.delete(`/admin/staff/${memberId}`);
};
