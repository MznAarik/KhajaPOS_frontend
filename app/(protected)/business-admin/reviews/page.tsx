"use client";

import * as React from "react";
import {
  Box,
  Button,
  Chip,
  Paper,
  Rating,
  Skeleton,
  Stack,
  Typography,
} from "@mui/material";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import { getAdminReviews, type Review } from "@/lib/reviews";
import { useAppSnackbar } from "@/components/common/SnackBar";

const formatReviewDate = (value?: string) => {
  if (!value) return "Recently";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Recently"
    : date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
};

export default function AdminReviewsPage() {
  const [reviews, setReviews] = React.useState<Review[]>([]);
  const [loading, setLoading] = React.useState(true);
  const { showSnackbar } = useAppSnackbar();

  const loadReviews = React.useCallback(async () => {
    setLoading(true);
    try {
      setReviews(await getAdminReviews());
    } catch (error) {
      console.error("Failed to load business reviews:", error);
      showSnackbar("Could not load reviews. Please try again.", "error");
    } finally {
      setLoading(false);
    }
  }, [showSnackbar]);

  React.useEffect(() => {
    void loadReviews();
  }, [loadReviews]);

  const average = reviews.length
    ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
    : 0;

  return (
    <Box sx={{ display: "grid", gap: 2, minWidth: 0 }}>
      <Paper
        elevation={0}
        sx={{
          p: { xs: 1.75, md: 2.75 },
          borderRadius: "22px",
          border: "1px solid var(--border)",
          backgroundColor: "var(--card)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 2,
        }}
      >
        <Box>
          <Typography sx={{ fontSize: { xs: "1.2rem", md: "1.8rem" }, fontWeight: 900 }}>
            Customer Reviews
          </Typography>
          <Typography sx={{ mt: 0.4, color: "var(--muted-foreground)", fontSize: { xs: "0.84rem", md: "0.94rem" } }}>
            Reviews submitted from your restaurant&apos;s table menu.
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={<RefreshRoundedIcon />}
          onClick={() => void loadReviews()}
          disabled={loading}
          sx={{ minHeight: 42, borderRadius: "12px", textTransform: "none", fontWeight: 800, flexShrink: 0 }}
        >
          <Box component="span" sx={{ display: { xs: "none", sm: "inline" } }}>Refresh</Box>
        </Button>
      </Paper>

      <Paper
        elevation={0}
        sx={{
          p: { xs: 1.75, md: 2.5 },
          borderRadius: "20px",
          border: "1px solid var(--border)",
          backgroundColor: "var(--card)",
        }}
      >
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} alignItems={{ xs: "flex-start", sm: "center" }}>
          <Rating value={average} precision={0.1} readOnly />
          <Typography sx={{ fontWeight: 900, fontSize: "1.15rem" }}>{reviews.length ? average.toFixed(1) : "—"}</Typography>
          <Chip size="small" label={`${reviews.length} ${reviews.length === 1 ? "review" : "reviews"}`} sx={{ fontWeight: 800 }} />
        </Stack>
      </Paper>

      {loading ? (
        <Stack spacing={1.25}>
          {Array.from({ length: 3 }, (_, index) => (
            <Paper key={`review-skeleton-${index}`} sx={{ p: 2, borderRadius: "18px", border: "1px solid var(--border)" }}>
              <Skeleton width="35%" />
              <Skeleton width="22%" />
              <Skeleton width="85%" />
            </Paper>
          ))}
        </Stack>
      ) : reviews.length ? (
        <Stack spacing={1.25}>
          {reviews.map((review) => (
            <Paper
              key={review.id}
              elevation={0}
              sx={{ p: { xs: 1.75, md: 2.25 }, borderRadius: "18px", border: "1px solid var(--border)", backgroundColor: "var(--card)" }}
            >
              <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ xs: "flex-start", sm: "center" }} spacing={1}>
                <Box sx={{ minWidth: 0 }}>
                  <Typography sx={{ fontWeight: 900 }}>{review.customer_name?.trim() || "Guest"}</Typography>
                  {review.customer_email ? (
                    <Typography sx={{ color: "var(--muted-foreground)", fontSize: "0.78rem", overflowWrap: "anywhere" }}>
                      {review.customer_email}
                    </Typography>
                  ) : null}
                </Box>
                <Typography sx={{ color: "var(--muted-foreground)", fontSize: "0.78rem", flexShrink: 0 }}>
                  {formatReviewDate(review.created_at)}
                </Typography>
              </Stack>
              <Rating value={review.rating} readOnly size="small" sx={{ mt: 0.75 }} />
              <Typography sx={{ mt: 0.75, color: review.comment ? "var(--foreground)" : "var(--muted-foreground)", lineHeight: 1.6 }}>
                {review.comment?.trim() || "No written comment."}
              </Typography>
            </Paper>
          ))}
        </Stack>
      ) : (
        <Paper sx={{ p: { xs: 3, md: 5 }, textAlign: "center", borderRadius: "20px", border: "1px solid var(--border)", backgroundColor: "var(--card)" }}>
          <Typography sx={{ fontWeight: 900 }}>No reviews yet</Typography>
          <Typography sx={{ mt: 0.5, color: "var(--muted-foreground)" }}>
            Customer reviews from your table ordering page will appear here.
          </Typography>
        </Paper>
      )}
    </Box>
  );
}
