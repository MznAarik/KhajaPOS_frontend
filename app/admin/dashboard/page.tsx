"use client";

import { Box, Typography, Paper, Stack } from "@mui/material";

const StatCard = ({ label, value, delta }: { label: string; value: string; delta: string }) => (
  <Paper
    sx={{
      p: 2,
      borderRadius: "18px",
      border: "1px solid var(--border)",
      backgroundColor: "var(--card)",
      backgroundImage:
        "linear-gradient(135deg, rgba(79, 139, 255, 0.18), rgba(12, 19, 38, 0) 60%)",
      boxShadow: "0 14px 32px rgba(7, 11, 22, 0.45)",
    }}
  >
    <Typography sx={{ fontSize: "0.8rem", color: "var(--muted-foreground)" }}>{label}</Typography>
    <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 1 }}>
      <Typography sx={{ fontSize: "1.35rem", fontWeight: 700 }}>{value}</Typography>
      <Typography sx={{ fontSize: "0.85rem", color: "#2EE6A6" }}>{delta}</Typography>
    </Stack>
  </Paper>
);

export default function AdminDashboardPage() {
  return (
    <Box sx={{ p: { xs: 2, md: 3}, display: "grid", gap: 3 }}>
      <Box className="flex justify-between not-sm:hidden">
        <Typography variant="h4" sx={{ fontWeight: 700, mt: 0.5 }}>
          Dashboard
        </Typography>
      </Box>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 2,
        }}
      >
        <StatCard label="Today's Money" value="$53,000" delta="+55%" />
        <StatCard label="Today's Users" value="2,300" delta="+5%" />
        <StatCard label="New Clients" value="+3,052" delta="+14%" />
        <StatCard label="Total Sales" value="$173,000" delta="+8%" />
      </Box>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "1.4fr 1fr" },
          gap: 2,
        }}
      >
        <Paper
          sx={{
            p: 3,
            borderRadius: "22px",
            border: "1px solid var(--border)",
            backgroundColor: "var(--card)",
            backgroundImage:
              "radial-gradient(380px 240px at 80% 20%, rgba(18, 214, 255, 0.2), transparent 60%), linear-gradient(135deg, rgba(79, 139, 255, 0.18), rgba(12, 19, 38, 0) 60%)",
            boxShadow: "0 18px 40px rgba(7, 11, 22, 0.5)",
            minHeight: 220,
          }}
        >
          <Typography sx={{ fontSize: "0.85rem", color: "var(--muted-foreground)" }}>
            Welcome back,
          </Typography>
          <Typography sx={{ fontSize: "1.5rem", fontWeight: 700, mt: 0.5 }}>
            Mark Johnson
          </Typography>
          <Typography sx={{ fontSize: "0.95rem", color: "var(--muted-foreground)", mt: 1 }}>
            Glad to see you again. Ask me anything.
          </Typography>
        </Paper>

        <Paper
          sx={{
            p: 3,
            borderRadius: "22px",
            border: "1px solid var(--border)",
            backgroundColor: "var(--card)",
            backgroundImage:
              "linear-gradient(135deg, rgba(18, 214, 255, 0.16), rgba(12, 19, 38, 0) 60%)",
            boxShadow: "0 18px 40px rgba(7, 11, 22, 0.5)",
            minHeight: 220,
          }}
        >
          <Typography sx={{ fontSize: "0.95rem", fontWeight: 600 }}>Satisfaction Rate</Typography>
          <Typography sx={{ fontSize: "0.8rem", color: "var(--muted-foreground)" }}>From all projects</Typography>
          <Box
            sx={{
              mt: 2,
              height: 120,
              borderRadius: "16px",
              border: "1px solid var(--border)",
              backgroundImage:
                "radial-gradient(120px 120px at 50% 50%, rgba(79, 139, 255, 0.35), transparent 60%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "2rem",
              fontWeight: 700,
            }}
          >
            95%
          </Box>
        </Paper>
      </Box>

      <Paper
        sx={{
          p: 3,
          borderRadius: "22px",
          border: "1px solid var(--border)",
          backgroundColor: "var(--card)",
          backgroundImage:
            "linear-gradient(135deg, rgba(79, 139, 255, 0.14), rgba(12, 19, 38, 0) 60%)",
          boxShadow: "0 18px 40px rgba(7, 11, 22, 0.5)",
          minHeight: 220,
        }}
      >
        <Typography sx={{ fontSize: "0.95rem", fontWeight: 600 }}>Sales Overview</Typography>
        <Typography sx={{ fontSize: "0.8rem", color: "var(--muted-foreground)" }}>(+5) more in 2024</Typography>
        <Box
          sx={{
            mt: 2,
            height: 140,
            borderRadius: "16px",
            border: "1px solid var(--border)",
            backgroundImage:
              "linear-gradient(180deg, rgba(79, 139, 255, 0.18), rgba(12, 19, 38, 0) 60%)",
          }}
        />
      </Paper>
    </Box>
  );
}
