import { api, unwrapApiData } from "./api";

export type Review = {
  id: number;
  business_id: number;
  user_id?: number | null;
  order_id?: number | null;
  customer_name?: string | null;
  customer_email?: string | null;
  rating: number;
  comment?: string | null;
  is_approved: boolean;
  created_at?: string;
  updated_at?: string;
};

export const submitReview = async (payload: {
  business_id: number;
  order_id?: number;
  rating: number;
  comment?: string;
  customer_name?: string;
  customer_email?: string;
}): Promise<Review> => {
  const res = await api.post("/reviews", payload);
  return unwrapApiData<Review>(res.data);
};

export const getBusinessReviews = async (businessId: number): Promise<Review[]> => {
  const res = await api.get(`/businesses/${businessId}/reviews`);
  const data = unwrapApiData<Review[]>(res.data);
  return Array.isArray(data) ? data : [];
};

export const getAdminReviews = async (): Promise<Review[]> => {
  const res = await api.get("/admin/reviews");
  const data = unwrapApiData<Review[]>(res.data);
  return Array.isArray(data) ? data : [];
};
