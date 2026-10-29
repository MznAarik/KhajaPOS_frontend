"use client";

import * as React from "react";
import { Box, Button, Rating, Stack, TextField, Typography } from "@mui/material";
import { submitReview } from "@/lib/reviews";
// import { useSnackbar } from "notistack";

type ReviewFormProps = {
  businessId: number;
  orderId?: number;
  customerName?: string;
  customerEmail?: string;
  onSuccess?: () => void;
};

export default function ReviewForm({
  businessId,
  orderId,
  customerName,
  customerEmail,
  onSuccess,
}: ReviewFormProps) {
  const [rating, setRating] = React.useState<number | null>(5);
  const [comment, setComment] = React.useState("");
  const [name, setName] = React.useState(customerName ?? "");
  const [email, setEmail] = React.useState(customerEmail ?? "");
  const [submitting, setSubmitting] = React.useState(false);
  const showSnackbar = (message: string, options?: any) => {
    if (typeof window !== "undefined") {
      console.log(message);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rating) {
      showSnackbar("Please select a rating", { severity: "warning" });
      return;
    }
    setSubmitting(true);
    try {
      await submitReview({
        business_id: businessId,
        order_id: orderId,
        rating,
        comment: comment.trim() || undefined,
        customer_name: name.trim() || undefined,
        customer_email: email.trim() || undefined,
      });
      showSnackbar("Review submitted successfully", { severity: "success" });
      setComment("");
      if (onSuccess) onSuccess();
    } catch (err: any) {
      const msg = err?.response?.data?.message || "Failed to submit review";
      showSnackbar(msg, { severity: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit}>
      <Stack spacing={2}>
        <Box>
          <Typography sx={{ fontWeight: 800, mb: 0.5 }}>Rate your experience</Typography>
          <Rating
            value={rating}
            onChange={(_, value) => setRating(value)}
            size="large"
          />
        </Box>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
          <TextField
            label="Name (optional)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            fullWidth
          />
          <TextField
            label="Email (optional)"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            fullWidth
          />
        </Stack>
        <TextField
          label="Comment (optional)"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          multiline
          minRows={3}
          placeholder="Tell us about your experience..."
          fullWidth
        />
        <Button type="submit" variant="contained" disabled={submitting} sx={{ alignSelf: "flex-start", borderRadius: "12px", fontWeight: 800 }}>
          {submitting ? "Submitting..." : "Submit review"}
        </Button>
      </Stack>
    </Box>
  );
}
