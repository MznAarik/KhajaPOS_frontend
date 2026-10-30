"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Paper, Rating, Skeleton, Stack, TextField, Typography } from "@mui/material";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import CheckCircleOutlineRoundedIcon from "@mui/icons-material/CheckCircleOutlineRounded";
import { getPublicMenu, type PublicTableMenu } from "@/lib/api";
import { submitReview } from "@/lib/reviews";

export default function CustomerReviewPage() {
  const { tableCode } = useParams<{ tableCode: string }>();
  const router = useRouter();
  const [menu, setMenu] = React.useState<PublicTableMenu | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [rating, setRating] = React.useState<number | null>(5);
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [comment, setComment] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [submitted, setSubmitted] = React.useState(false);
  const [successOpen, setSuccessOpen] = React.useState(false);
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    let active = true;
    void getPublicMenu(tableCode)
      .then((data) => {
        if (active) setMenu(data);
      })
      .catch(() => {
        if (active) setError("We couldn't load this restaurant. Please return to the menu and try again.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [tableCode]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!menu?.business?.id || !rating || submitting) return;

    setSubmitting(true);
    setError("");
    try {
      await submitReview({
        business_id: menu.business.id,
        rating,
        customer_name: name.trim() || undefined,
        customer_email: email.trim() || undefined,
        comment: comment.trim() || undefined,
      });
      setSubmitted(true);
      setSuccessOpen(true);
    } catch (submitError) {
      console.error("Failed to submit customer review:", submitError);
      setError("Your review couldn't be sent. Please check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box sx={{ minHeight: "100dvh", display: "grid", placeItems: { xs: "stretch", sm: "center" }, p: { xs: 0, sm: 2 }, backgroundColor: "var(--background)", color: "var(--foreground)" }}>
      <Box sx={{ width: "100%", maxWidth: 560 }}>
        <Button
          startIcon={<ArrowBackRoundedIcon />}
          onClick={() => router.push(`/order/${encodeURIComponent(tableCode)}`)}
          sx={{ mx: { xs: 1, sm: 0 }, mt: { xs: 1, sm: 0 }, mb: 1, minHeight: { xs: 52, sm: 48 }, px: { xs: 2.5, sm: 3 }, borderRadius: "14px", textTransform: "none", fontWeight: 800, fontSize: { xs: "1rem", sm: "1.05rem" } }}
        >
          Back to menu
        </Button>

        <Paper elevation={0} sx={{ p: { xs: 2.25, sm: 3.5 }, minHeight: { xs: "calc(100dvh - 64px)", sm: 0 }, borderRadius: { xs: "22px 22px 0 0", sm: "22px" }, border: "1px solid var(--border)", backgroundColor: "var(--card)" }}>
          {loading ? (
            <Stack spacing={2}>
              <Skeleton width="65%" height={38} />
              <Skeleton width={160} height={42} />
              <Skeleton variant="rounded" height={110} />
            </Stack>
          ) : (
            <Box component="form" onSubmit={handleSubmit}>
              <Typography sx={{ color: "var(--primary)", fontSize: "0.72rem", fontWeight: 900, letterSpacing: "0.14em", textTransform: "uppercase" }}>
                {menu?.business?.name ?? "Restaurant"}
              </Typography>
              <Typography sx={{ mt: 0.5, fontSize: { xs: "1.45rem", sm: "1.8rem" }, fontWeight: 900 }}>How was your experience?</Typography>
              <Typography sx={{ mt: 0.5, mb: 2.5, color: "var(--muted-foreground)" }}>Your feedback helps this restaurant serve you better.</Typography>

              <Stack spacing={2}>
                <Box>
                  <Typography sx={{ mb: 0.5, fontSize: "0.86rem", fontWeight: 850 }}>Your rating</Typography>
                  <Rating value={rating} onChange={(_event, value) => setRating(value)} size="large" aria-label="Rate your experience from one to five stars" />
                </Box>
                <TextField label="Name (optional)" value={name} onChange={(event) => setName(event.target.value)} fullWidth inputProps={{ maxLength: 100 }} />
                <TextField label="Email (optional)" type="email" value={email} onChange={(event) => setEmail(event.target.value)} fullWidth inputProps={{ maxLength: 100 }} />
                <TextField label="Your review (optional)" value={comment} onChange={(event) => setComment(event.target.value)} multiline minRows={4} maxRows={8} fullWidth inputProps={{ maxLength: 1000 }} helperText={`${comment.length}/1000`} />
                {error ? <Typography role="alert" sx={{ color: "var(--status-inactive-fg)", fontSize: "0.84rem", fontWeight: 700 }}>{error}</Typography> : null}
                <Button type="submit" variant="contained" disabled={submitting || submitted || loading || !menu?.business?.id || !rating} sx={{ minHeight: 52, borderRadius: "14px", fontWeight: 900, textTransform: "none" }}>
                  {submitting ? "Sending review…" : "Submit review"}
                </Button>
              </Stack>
            </Box>
          )}
        </Paper>
      </Box>
      <Dialog open={successOpen} onClose={() => setSuccessOpen(false)} fullWidth maxWidth="xs" PaperProps={{ sx: { borderRadius: "22px", backgroundColor: "var(--card)", color: "var(--foreground)" } }}>
        <DialogContent sx={{ pt: 4, pb: 2, textAlign: "center" }}>
          <CheckCircleOutlineRoundedIcon sx={{ fontSize: 56, color: "var(--status-active-fg)" }} />
          <DialogTitle sx={{ px: 0, pt: 1, fontSize: "1.3rem", fontWeight: 900 }}>Thanks for your review!</DialogTitle>
          <Typography sx={{ color: "var(--muted-foreground)" }}>Your feedback has been shared with {menu?.business?.name ?? "the restaurant"}.</Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 0, display: "grid" }}>
          <Button variant="contained" onClick={() => router.push(`/order/${encodeURIComponent(tableCode)}`)} sx={{ minHeight: 48, borderRadius: "13px", fontWeight: 900, textTransform: "none" }}>Return to menu</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
