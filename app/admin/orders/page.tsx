"use client";

import { Box, Paper, Typography } from "@mui/material";

export default function OrdersPage() {
  return (
    <Box sx={{ p: { xs: 1, md: 2 } }}>
      <Paper
        sx={{
          p: 3,
          borderRadius: "22px",
          border: "1px solid var(--border)",
          backgroundColor: "var(--card)",
          boxShadow: "0 18px 40px rgba(7, 11, 22, 0.12)",
        }}
      >
        <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
          Orders
        </Typography>
        <Typography sx={{ color: "var(--muted-foreground)" }}>
          Orders page is ready for the next step.
        </Typography>
      </Paper>
    </Box>
  );
}
