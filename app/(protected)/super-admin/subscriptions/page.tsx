"use client";

import * as React from "react";
import {
  Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Divider,
  FormControl, Grow, Fade, InputLabel, MenuItem, Paper, Select, Skeleton, Stack, Tab, Tabs,
  Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography, useMediaQuery,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { AnimatePresence, motion } from "motion/react";
import { shakeKeyframes, shakeTransition, spring, useOrigin, useReducedMotion } from "@/lib/motion";

const MotionButton = motion.create(Button);
import RefreshIcon from "@mui/icons-material/Refresh";
import AddRounded from "@mui/icons-material/AddRounded";
import PaymentsOutlinedIcon from "@mui/icons-material/PaymentsOutlined";
import SubscriptionsOutlinedIcon from "@mui/icons-material/SubscriptionsOutlined";
import BusinessOutlinedIcon from "@mui/icons-material/BusinessOutlined";
import ReceiptLongOutlinedIcon from "@mui/icons-material/ReceiptLongOutlined";
import {
  assignSuperAdminSubscription, getSuperAdminBusinesses, getSuperAdminPayments, getSuperAdminPlans, getSuperAdminSubscriptions,
  recordSuperAdminPayment, saveSuperAdminPlan,
  type BusinessSubscription, type SubscriptionPayment, type SubscriptionPlan, type SuperAdminBusiness,
} from "@/lib/api";
import { useAppSnackbar } from "@/components/common/SnackBar";
import { safeError } from "@/lib/safeError";
import { cardTopRightAccentFor, cardTopRightAccentSoft } from "@/lib/ui";

const fmtMoney = (v: number | string, currency = "NPR") =>
  `${currency} ${Number(v ?? 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
const fmtDate = (v?: string | null) =>
  v ? new Date(v).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" }) : "—";

function StatusChip({ status, onClick, disabled }: { status: string; onClick?: () => void; disabled?: boolean }) {
  const s = (status || "").toLowerCase();
  const tone =
    s === "paid" || s === "active"
      ? { fg: "#166534", bg: "#dcfce7", bd: "#bbf7d0" }
      : s === "failed" || s === "expired" || s === "overdue" || s === "suspended"
        ? { fg: "#991b1b", bg: "#fee2e2", bd: "#fecaca" }
        : s === "past_due" || s === "pending" || s === "trial" || s === "cancelled"
          ? { fg: "#92400e", bg: "#fef3c7", bd: "#fde68a" }
          : { fg: "#374151", bg: "#f3f4f6", bd: "#e5e7eb" };
  return (
    <Chip
      size="small"
      clickable={!!onClick}
      onClick={onClick}
      disabled={disabled}
      label={(status || "—").replace(/_/g, " ")}
      sx={{ height: 24, fontWeight: 800, fontSize: "0.72rem", color: tone.fg, backgroundColor: tone.bg, border: `1px solid ${tone.bd}`, textTransform: "capitalize", ...(onClick ? { cursor: "pointer", "&:hover": { filter: "brightness(0.97)" } } : {}) }}
    />
  );
}

function MetaRow({ label, value, strong }: { label: string; value: React.ReactNode; strong?: boolean }) {
  if (value == null || value === "" || value === "—") return null;
  return (
    <Box sx={{ minWidth: 0 }}>
      <Typography component="span" sx={{ fontSize: "0.7rem", fontWeight: 800, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.04em", mr: 0.75 }}>
        {label}
      </Typography>
      <Typography component="span" sx={{ fontSize: "0.8rem", fontWeight: strong ? 850 : 650, color: "var(--foreground)", wordBreak: "break-word" }}>
        {value}
      </Typography>
    </Box>
  );
}

function MobileCard({ children, highlight, accent }: { children: React.ReactNode; highlight?: boolean; accent?: string }) {
  const glow = highlight ? "#f59e0b" : accent;
  return (
    <Paper
      elevation={0}
      sx={{
        p: 1.4,
        borderRadius: "16px",
        border: `1px solid ${highlight ? "rgba(245,158,11,0.45)" : glow ? `color-mix(in srgb, ${glow} 22%, var(--border))` : "var(--border)"}`,
        backgroundColor: highlight ? "rgba(245,158,11,0.05)" : "var(--background)",
        position: "relative",
        overflow: "hidden",
        ...(glow
          ? {
              "&::after": {
                content: '""',
                position: "absolute",
                inset: 0,
                backgroundImage: `radial-gradient(130px 110px at 100% 0%, color-mix(in srgb, ${glow} 20%, transparent), transparent 70%)`,
                pointerEvents: "none",
              },
            }
          : {}),
      }}
    >
      <Box sx={{ position: "relative", zIndex: 1, minWidth: 0 }}>{children}</Box>
    </Paper>
  );
}

export default function SuperAdminSubscriptionsPage() {
  const theme = useTheme();
  const fullScreenDialog = useMediaQuery(theme.breakpoints.down("sm"));
  const reducedMotion = useReducedMotion();
  const { origin: dialogOrigin, capture: captureDialogOrigin } = useOrigin();
  const [shakePlan, setShakePlan] = React.useState(0);
  const [shakeAssign, setShakeAssign] = React.useState(0);
  const [shakePay, setShakePay] = React.useState(0);

  const [tab, setTab] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [plans, setPlans] = React.useState<SubscriptionPlan[]>([]);
  const [subs, setSubs] = React.useState<BusinessSubscription[]>([]);
  const [subCounts, setSubCounts] = React.useState<any>({});
  const [payments, setPayments] = React.useState<SubscriptionPayment[]>([]);
  const [payCounts, setPayCounts] = React.useState<any>({});
  const [businesses, setBusinesses] = React.useState<SuperAdminBusiness[]>([]);
  const [planDialog, setPlanDialog] = React.useState<{ open: boolean; id?: number; name: string; price: string; currency: string; billing_cycle: string; trial_days: string; description: string; is_active: boolean; is_default: boolean; limitsText: string }>({ open: false, name: "", price: "0", currency: "NPR", billing_cycle: "monthly", trial_days: "0", description: "", is_active: true, is_default: false, limitsText: '{"orders_per_month":1000,"menu_items":200,"tables":30,"users":5}' });
  const [assignDialog, setAssignDialog] = React.useState<{ open: boolean; business_id: string; plan_id: string; status: string; auto_renew: boolean; notes: string }>({ open: false, business_id: "", plan_id: "", status: "active", auto_renew: true, notes: "" });
  const [payDialog, setPayDialog] = React.useState<{ open: boolean; business_id: string; amount: string; currency: string; status: string; payment_method: string; reference: string; due_at: string; notes: string }>({ open: false, business_id: "", amount: "", currency: "NPR", status: "paid", payment_method: "", reference: "", due_at: "", notes: "" });
  const [saving, setSaving] = React.useState(false);
  const [togglingPlanId, setTogglingPlanId] = React.useState<number | null>(null);
  const { showSnackbar } = useAppSnackbar();

  const load = React.useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const [p, s, pay, b] = await Promise.all([getSuperAdminPlans(), getSuperAdminSubscriptions(), getSuperAdminPayments(), getSuperAdminBusinesses()]);
      setPlans(p.items ?? []);
      setSubs(s.items ?? []);
      setSubCounts(s.counts ?? {});
      setPayments(pay.items ?? []);
      setPayCounts(pay.counts ?? {});
      setBusinesses(b.items ?? []);
    } catch (e) {
      showSnackbar(safeError(e, "Failed to load subscriptions/payments."), "error");
    } finally {
      setLoading(false);
    }
  }, [showSnackbar]);

  React.useEffect(() => { void load(); }, [load]);

  const savePlan = async () => {
    if (!planDialog.name.trim()) {
      setShakePlan((k) => k + 1);
      return showSnackbar("Plan name is required.", "error");
    }
    setSaving(true);
    try {
      let limits: any = {};
      try { limits = planDialog.limitsText ? JSON.parse(planDialog.limitsText) : {}; } catch { setShakePlan((k) => k + 1); throw new Error("Limits must be valid JSON."); }
      await saveSuperAdminPlan({ name: planDialog.name, price: Number(planDialog.price || 0), currency: planDialog.currency, billing_cycle: planDialog.billing_cycle, trial_days: Number(planDialog.trial_days || 0), description: planDialog.description, is_active: planDialog.is_active, is_default: planDialog.is_default, limits }, planDialog.id);
      setPlanDialog((d) => ({ ...d, open: false }));
      showSnackbar(planDialog.id ? "Plan updated." : "Plan created.", "success");
      await load(true);
    } catch (e) { setShakePlan((k) => k + 1); showSnackbar(safeError(e, "Failed to save plan."), "error"); } finally { setSaving(false); }
  };

  const saveAssignment = async () => {
    if (!assignDialog.business_id || !assignDialog.plan_id) { setShakeAssign((k) => k + 1); return showSnackbar("Select a business and plan.", "error"); }
    setSaving(true);
    try {
      await assignSuperAdminSubscription(Number(assignDialog.business_id), { plan_id: Number(assignDialog.plan_id), status: assignDialog.status, auto_renew: assignDialog.auto_renew, notes: assignDialog.notes || undefined });
      setAssignDialog((d) => ({ ...d, open: false }));
      showSnackbar("Subscription assigned.", "success");
      await load(true);
    } catch (e) { setShakeAssign((k) => k + 1); showSnackbar(safeError(e, "Failed to assign subscription."), "error"); } finally { setSaving(false); }
  };

  const savePayment = async () => {
    if (!payDialog.business_id || !payDialog.amount) { setShakePay((k) => k + 1); return showSnackbar("Business and amount are required.", "error"); }
    setSaving(true);
    try {
      await recordSuperAdminPayment({ business_id: Number(payDialog.business_id), amount: Number(payDialog.amount), currency: payDialog.currency, status: payDialog.status, payment_method: payDialog.payment_method || undefined, reference: payDialog.reference || undefined, due_at: payDialog.due_at || undefined, notes: payDialog.notes || undefined });
      setPayDialog((d) => ({ ...d, open: false, amount: "", reference: "", notes: "" }));
      showSnackbar("Payment recorded.", "success");
      await load(true);
    } catch (e) { setShakePay((k) => k + 1); showSnackbar(safeError(e, "Failed to record payment."), "error"); } finally { setSaving(false); }
  };

  const overdue = payments.filter((p) => (p.status === "pending" || p.status === "overdue") && p.due_at && new Date(p.due_at) < new Date());
  const isOverduePayment = (p: SubscriptionPayment) => (p.status === "pending" || p.status === "overdue") && !!p.due_at && new Date(p.due_at) < new Date();

  const togglePlanActive = async (plan: SubscriptionPlan) => {
    if (!plan?.id || togglingPlanId) return;
    const nextActive = !plan.is_active;
    setTogglingPlanId(plan.id);
    try {
      await saveSuperAdminPlan({
        name: plan.name,
        price: Number(plan.price ?? 0),
        currency: plan.currency || "NPR",
        billing_cycle: plan.billing_cycle || "monthly",
        trial_days: Number(plan.trial_days ?? 0),
        description: plan.description || "",
        is_active: nextActive,
        is_default: !!plan.is_default,
        limits: plan.limits ?? {},
      }, plan.id);
      setPlans((prev) => prev.map((p) => (p.id === plan.id ? { ...p, is_active: nextActive } : p)));
      showSnackbar(nextActive ? "Plan activated." : "Plan deactivated.", "success");
    } catch (e) {
      showSnackbar(safeError(e, "Failed to update plan status."), "error");
    } finally {
      setTogglingPlanId(null);
    }
  };

  const dialogPaperSx = { borderRadius: fullScreenDialog ? 0 : "20px", m: fullScreenDialog ? 0 : undefined };

  return (
    <Box sx={{ display: "grid", gap: 2, minWidth: 0 }}>
      <Paper elevation={0} sx={{ p: { xs: 1.5, md: 2.5 }, borderRadius: "22px", border: "1px solid var(--border)", backgroundColor: "var(--card)", backgroundImage: cardTopRightAccentFor("var(--chart-1)", "medium"), boxShadow: "0 16px 40px rgba(31, 42, 43, 0.08)", minWidth: 0, overflow: "hidden" }}>
        <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" spacing={1.5} alignItems={{ xs: "stretch", sm: "center" }}>
          <Stack direction="row" spacing={1.25} alignItems="center" sx={{ minWidth: 0 }}>
            <Box sx={{ width: 46, height: 46, borderRadius: "14px", display: "grid", placeItems: "center", color: "var(--chart-1)", backgroundColor: "color-mix(in srgb, var(--chart-1) 16%, transparent)", border: "1px solid color-mix(in srgb, var(--chart-1) 34%, transparent)", flexShrink: 0 }}>
              <SubscriptionsOutlinedIcon />
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ fontSize: { xs: "1.2rem", md: "1.5rem" }, fontWeight: 900, lineHeight: 1.15 }}>Subscriptions & Payments</Typography>
              <Typography sx={{ color: "var(--muted-foreground)", fontWeight: 650, fontSize: "0.84rem", mt: 0.2 }}>
                Manage plans, tenant subscriptions, payment records, and overdue reminders
              </Typography>
            </Box>
          </Stack>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ width: { xs: "100%", sm: "auto" }, justifyContent: { xs: "stretch", sm: "flex-end" } }}>
            <MotionButton whileTap={reducedMotion ? undefined : { scale: 0.98 }} transition={spring.press} variant="outlined" startIcon={<RefreshIcon />} onClick={() => void load(true)} sx={{ borderRadius: "12px", textTransform: "none", fontWeight: 800, flex: { xs: "1 1 0", sm: "0 0 auto" }, minWidth: 0 }}>Refresh</MotionButton>
            {tab === 0 ? <MotionButton whileTap={reducedMotion ? undefined : { scale: 0.98 }} transition={spring.press} variant="contained" startIcon={<AddRounded />} onClick={(e) => { captureDialogOrigin(e); setPlanDialog({ open: true, name: "", price: "0", currency: "NPR", billing_cycle: "monthly", trial_days: "0", description: "", is_active: true, is_default: false, limitsText: '{"orders_per_month":1000,"menu_items":200,"tables":30,"users":5}' }); }} sx={{ borderRadius: "12px", textTransform: "none", fontWeight: 800, flex: { xs: "1 1 0", sm: "0 0 auto" } }}>New plan</MotionButton> : null}
            {tab === 1 ? <MotionButton whileTap={reducedMotion ? undefined : { scale: 0.98 }} transition={spring.press} variant="contained" startIcon={<AddRounded />} onClick={(e) => { captureDialogOrigin(e); setAssignDialog({ open: true, business_id: "", plan_id: plans[0]?.id ? String(plans[0].id) : "", status: "active", auto_renew: true, notes: "" }); }} sx={{ borderRadius: "12px", textTransform: "none", fontWeight: 800, flex: { xs: "1 1 0", sm: "0 0 auto" } }}>Assign plan</MotionButton> : null}
            {tab === 2 ? <MotionButton whileTap={reducedMotion ? undefined : { scale: 0.98 }} transition={spring.press} variant="contained" startIcon={<PaymentsOutlinedIcon />} onClick={(e) => { captureDialogOrigin(e); setPayDialog({ open: true, business_id: "", amount: "", currency: "NPR", status: "paid", payment_method: "", reference: "", due_at: "", notes: "" }); }} sx={{ borderRadius: "12px", textTransform: "none", fontWeight: 800, flex: { xs: "1 1 0", sm: "0 0 auto" } }}>Record payment</MotionButton> : null}
          </Stack>
        </Stack>

        <Box sx={{ mt: 2, display: "grid", gridTemplateColumns: { xs: "repeat(2,minmax(0,1fr))", sm: "repeat(3,minmax(0,1fr))", lg: "repeat(5,minmax(0,1fr))" }, gap: 1 }}>
          {[
            { label: "Plans", value: plans.length, accent: "var(--chart-1)" },
            { label: "Active subs", value: subCounts.active ?? 0, accent: "#16a34a" },
            { label: "Past due", value: subCounts.past_due ?? 0, accent: (subCounts.past_due ?? 0) > 0 ? "#f59e0b" : "var(--chart-2)", warn: (subCounts.past_due ?? 0) > 0 },
            { label: "Overdue payments", value: payCounts.overdue ?? overdue.length, accent: (payCounts.overdue ?? overdue.length) > 0 ? "#dc2626" : "var(--chart-3)", warn: (payCounts.overdue ?? overdue.length) > 0 },
            { label: "Paid revenue", value: fmtMoney(payCounts.revenue ?? 0), accent: "var(--chart-4, #0ea5e9)" },
          ].map((k, idx) => (
            <Paper
              key={k.label}
              elevation={0}
              sx={{
                p: 1.2,
                borderRadius: "14px",
                border: `1px solid color-mix(in srgb, ${k.accent} ${k.warn ? "38%" : "22%"}, var(--border))`,
                backgroundColor: k.warn ? `color-mix(in srgb, ${k.accent} 6%, var(--background))` : "var(--background)",
                minWidth: 0,
                position: "relative",
                overflow: "hidden",
                gridColumn: { xs: idx === 4 ? "1 / -1" : "auto", sm: "auto" },
                "&::after": {
                  content: '""',
                  position: "absolute",
                  inset: 0,
                  backgroundImage: `radial-gradient(120px 100px at 100% 0%, color-mix(in srgb, ${k.accent} 24%, transparent), transparent 70%)`,
                  pointerEvents: "none",
                },
              }}
            >
              <Typography sx={{ position: "relative", zIndex: 1, fontSize: "0.66rem", fontWeight: 850, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--muted-foreground)" }}>{k.label}</Typography>
              <Typography sx={{ position: "relative", zIndex: 1, fontSize: { xs: "1rem", sm: "1.12rem" }, fontWeight: 900, mt: 0.15, lineHeight: 1.2, wordBreak: "break-word", color: k.warn ? k.accent : undefined }}>
                {typeof k.value === "number" ? k.value.toLocaleString("en-IN") : k.value}
              </Typography>
            </Paper>
          ))}
        </Box>

        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          sx={{ mt: 1.75, minHeight: 42, "& .MuiTab-root": { minHeight: 42, textTransform: "none", fontWeight: 800, fontSize: { xs: "0.8rem", sm: "0.875rem" } } }}
          variant="scrollable"
          allowScrollButtonsMobile
        >
          <Tab label={`Plans (${plans.length})`} />
          <Tab label={`Subscriptions (${subs.length})`} />
          <Tab label={`Payments (${payments.length})`} />
        </Tabs>
      </Paper>

      {loading ? <Skeleton variant="rounded" height={260} sx={{ borderRadius: "22px" }} /> : (
        <Paper
          elevation={0}
          sx={{
            borderRadius: "22px",
            border: "1px solid var(--border)",
            backgroundColor: "var(--card)",
            backgroundImage: cardTopRightAccentFor(tab === 0 ? "var(--chart-1)" : tab === 1 ? "var(--chart-2)" : "var(--chart-4, #0ea5e9)", "soft"),
            overflow: "hidden",
          }}
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={tab}
              initial={reducedMotion ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reducedMotion ? undefined : { opacity: 0, y: -4, transition: { duration: 0.16 } }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            >
          {/* Plans */}
          {tab === 0 && (
            <>
              <Box sx={{ display: { xs: "grid", md: "none" }, gap: 1, p: 1.25 }}>
                {plans.length === 0 ? <Typography sx={{ py: 4, textAlign: "center", color: "var(--muted-foreground)", fontWeight: 650 }}>No plans found. Create a plan to get started.</Typography> : plans.map((p) => (
                  <MobileCard key={p.id} accent="var(--chart-1)">
                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography sx={{ fontWeight: 900, fontSize: "0.95rem", lineHeight: 1.2 }}>{p.name}</Typography>
                        {p.description || p.slug ? <Typography sx={{ fontSize: "0.76rem", color: "var(--muted-foreground)", mt: 0.2 }}>{p.description || p.slug}</Typography> : null}
                      </Box>
                      <StatusChip status={p.is_active ? "active" : "inactive"} onClick={() => void togglePlanActive(p)} disabled={togglingPlanId === p.id} />
                    </Stack>
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 1 }}>
                      <Chip size="small" label={fmtMoney(p.price, p.currency)} sx={{ fontWeight: 850 }} />
                      <Chip size="small" label={`${p.billing_cycle}`} sx={{ textTransform: "capitalize" }} />
                      <Chip size="small" label={`${p.trial_days}d trial`} />
                      <Chip size="small" label={`${p.subscriptions_count ?? 0} subs`} />
                      {p.is_default ? <Chip size="small" label="Default" color="primary" /> : null}
                    </Stack>
                    {p.limits ? (
                      <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap sx={{ mt: 1 }}>
                        {Object.entries(p.limits).slice(0, 6).map(([k, v]) => (
                          <Typography key={k} component="span" sx={{ fontSize: "0.72rem", px: 0.75, py: 0.2, borderRadius: "8px", bgcolor: "color-mix(in srgb, var(--muted) 55%, transparent)", color: "var(--muted-foreground)", fontWeight: 700 }}>
                            {k.replace(/_/g, " ")}: {String(v)}
                          </Typography>
                        ))}
                      </Stack>
                    ) : null}
                    <Button size="small" variant="outlined" onClick={(e) => { captureDialogOrigin(e); setPlanDialog({ open: true, id: p.id, name: p.name, price: String(p.price ?? 0), currency: p.currency || "NPR", billing_cycle: p.billing_cycle || "monthly", trial_days: String(p.trial_days ?? 0), description: p.description || "", is_active: !!p.is_active, is_default: !!p.is_default, limitsText: JSON.stringify(p.limits ?? {}, null, 0) }); }} sx={{ mt: 1.25, borderRadius: "10px", textTransform: "none", fontWeight: 800, alignSelf: "flex-start" }}>
                      Edit plan
                    </Button>
                  </MobileCard>
                ))}
              </Box>
              <Box sx={{ display: { xs: "none", md: "block" }, overflowX: "auto" }}>
                <Table size="small">
                  <TableHead><TableRow>{["Plan", "Price", "Cycle", "Trial", "Limits", "Subscriptions", "Status", "Action"].map((h) => <TableCell key={h} sx={{ fontWeight: 850, whiteSpace: "nowrap" }}>{h}</TableCell>)}</TableRow></TableHead>
                  <TableBody>
                    {plans.map((p) => (
                      <TableRow key={p.id} hover>
                        <TableCell><Typography sx={{ fontWeight: 850 }}>{p.name}</Typography><Typography sx={{ fontSize: "0.76rem", color: "var(--muted-foreground)" }}>{p.description || p.slug}</Typography></TableCell>
                        <TableCell sx={{ whiteSpace: "nowrap" }}>{fmtMoney(p.price, p.currency)}</TableCell>
                        <TableCell sx={{ textTransform: "capitalize" }}>{p.billing_cycle}</TableCell>
                        <TableCell>{p.trial_days} days</TableCell>
                        <TableCell sx={{ fontSize: "0.76rem", maxWidth: 320 }}>{p.limits ? Object.entries(p.limits).map(([k, v]) => `${k.replace(/_/g, " ")}: ${v}`).join(" · ") : "—"}</TableCell>
                        <TableCell>{p.subscriptions_count ?? 0}</TableCell>
                        <TableCell><StatusChip status={p.is_active ? "active" : "inactive"} onClick={() => void togglePlanActive(p)} disabled={togglingPlanId === p.id} /></TableCell>
                        <TableCell><Button size="small" onClick={(e) => { captureDialogOrigin(e); setPlanDialog({ open: true, id: p.id, name: p.name, price: String(p.price ?? 0), currency: p.currency || "NPR", billing_cycle: p.billing_cycle || "monthly", trial_days: String(p.trial_days ?? 0), description: p.description || "", is_active: !!p.is_active, is_default: !!p.is_default, limitsText: JSON.stringify(p.limits ?? {}, null, 0) }); }} sx={{ textTransform: "none", fontWeight: 800 }}>Edit</Button></TableCell>
                      </TableRow>
                    ))}
                    {plans.length === 0 ? <TableRow><TableCell colSpan={8} sx={{ py: 5, textAlign: "center", color: "var(--muted-foreground)" }}>No plans found.</TableCell></TableRow> : null}
                  </TableBody>
                </Table>
              </Box>
            </>
          )}

          {/* Subscriptions */}
          {tab === 1 && (
            <>
              <Box sx={{ display: { xs: "grid", md: "none" }, gap: 1, p: 1.25 }}>
                {subs.length === 0 ? <Typography sx={{ py: 4, textAlign: "center", color: "var(--muted-foreground)", fontWeight: 650 }}>No subscriptions assigned yet.</Typography> : subs.map((s) => (
                  <MobileCard key={s.id} accent="var(--chart-2)">
                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
                      <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0, flex: 1, overflow: "hidden" }}>
                        <BusinessOutlinedIcon sx={{ fontSize: 18, color: "var(--muted-foreground)", flexShrink: 0 }} />
                        <Box sx={{ minWidth: 0, overflow: "hidden" }}>
                          <Typography sx={{ fontWeight: 900, fontSize: "0.92rem", lineHeight: 1.2 }} noWrap>{s.business?.name ?? `#${s.business_id}`}</Typography>
                          <Typography sx={{ fontSize: "0.76rem", color: "var(--muted-foreground)" }} noWrap>{s.plan?.name ?? "—"}</Typography>
                        </Box>
                      </Stack>
                      <StatusChip status={s.status} />
                    </Stack>
                    {!s.business?.is_active ? <Alert severity="warning" variant="outlined" sx={{ mt: 1, py: 0, borderRadius: "10px", "& .MuiAlert-message": { fontSize: "0.76rem", fontWeight: 700 } }}>Business suspended</Alert> : null}
                    <Stack spacing={0.5} sx={{ mt: 1 }}>
                      <MetaRow label="Period" value={`${fmtDate(s.starts_at)} → ${fmtDate(s.ends_at)}`} />
                      <MetaRow label="Renews/Ends" value={fmtDate(s.renews_at || s.ends_at)} />
                      <MetaRow label="Auto renew" value={s.auto_renew ? "Yes" : "No"} />
                      {s.notes ? <MetaRow label="Notes" value={s.notes} /> : null}
                    </Stack>
                  </MobileCard>
                ))}
              </Box>
              <Box sx={{ display: { xs: "none", md: "block" }, overflowX: "auto" }}>
                <Table size="small">
                  <TableHead><TableRow>{["Business", "Plan", "Status", "Period", "Renews/Ends", "Auto renew", "Notes"].map((h) => <TableCell key={h} sx={{ fontWeight: 850, whiteSpace: "nowrap" }}>{h}</TableCell>)}</TableRow></TableHead>
                  <TableBody>
                    {subs.map((s) => (
                      <TableRow key={s.id} hover>
                        <TableCell><Typography sx={{ fontWeight: 800 }}>{s.business?.name ?? `#${s.business_id}`}</Typography>{!s.business?.is_active ? <Typography sx={{ fontSize: "0.72rem", color: "#b45309", fontWeight: 700 }}>Business suspended</Typography> : null}</TableCell>
                        <TableCell>{s.plan?.name ?? "—"}</TableCell>
                        <TableCell><StatusChip status={s.status} /></TableCell>
                        <TableCell sx={{ fontSize: "0.78rem", whiteSpace: "nowrap" }}>{fmtDate(s.starts_at)} → {fmtDate(s.ends_at)}</TableCell>
                        <TableCell sx={{ fontSize: "0.78rem", whiteSpace: "nowrap" }}>{fmtDate(s.renews_at || s.ends_at)}</TableCell>
                        <TableCell>{s.auto_renew ? "Yes" : "No"}</TableCell>
                        <TableCell sx={{ fontSize: "0.76rem", maxWidth: 220 }}>{s.notes || "—"}</TableCell>
                      </TableRow>
                    ))}
                    {subs.length === 0 ? <TableRow><TableCell colSpan={7} sx={{ py: 5, textAlign: "center", color: "var(--muted-foreground)" }}>No subscriptions assigned yet.</TableCell></TableRow> : null}
                  </TableBody>
                </Table>
              </Box>
            </>
          )}

          {/* Payments */}
          {tab === 2 && (
            <Box>
              {overdue.length > 0 ? (
                <Alert severity="warning" sx={{ m: { xs: 1.25, md: 1.5 }, borderRadius: "12px", alignItems: "flex-start" }}>
                  <strong>{overdue.length}</strong> payment{overdue.length === 1 ? "" : "s"} overdue or pending past due date. Review and follow up.
                </Alert>
              ) : null}
              <Box sx={{ display: { xs: "grid", md: "none" }, gap: 1, p: 1.25, pt: overdue.length > 0 ? 0 : 1.25 }}>
                {payments.length === 0 ? <Typography sx={{ py: 4, textAlign: "center", color: "var(--muted-foreground)", fontWeight: 650 }}>No payment records yet.</Typography> : payments.map((p) => {
                  const od = isOverduePayment(p);
                  return (
                    <MobileCard key={p.id} highlight={od} accent="var(--chart-4, #0ea5e9)">
                      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
                        <Box sx={{ minWidth: 0, flex: 1, overflow: "hidden" }}>
                          <Stack direction="row" spacing={0.75} alignItems="center" sx={{ minWidth: 0 }}>
                            <ReceiptLongOutlinedIcon sx={{ fontSize: 17, color: od ? "#b45309" : "var(--muted-foreground)", flexShrink: 0 }} />
                            <Typography sx={{ fontWeight: 900, fontSize: "0.92rem", lineHeight: 1.2 }} noWrap>{p.business?.name ?? `#${p.business_id}`}</Typography>
                          </Stack>
                          <Typography sx={{ fontSize: "1rem", fontWeight: 900, mt: 0.35, wordBreak: "break-word" }}>{fmtMoney(p.amount, p.currency)}</Typography>
                        </Box>
                        <StatusChip status={od ? "overdue" : p.status} />
                      </Stack>
                      <Stack spacing={0.5} sx={{ mt: 1 }}>
                        <MetaRow label="Due" value={fmtDate(p.due_at)} strong={od} />
                        <MetaRow label="Paid" value={fmtDate(p.paid_at)} />
                        <MetaRow label="Method / Ref" value={[p.payment_method, p.reference].filter(Boolean).join(" · ") || "—"} />
                        {p.failure_reason ? <MetaRow label="Failure" value={p.failure_reason} /> : null}
                        {p.notes ? <MetaRow label="Notes" value={p.notes} /> : null}
                      </Stack>
                    </MobileCard>
                  );
                })}
              </Box>
              <Box sx={{ display: { xs: "none", md: "block" }, overflowX: "auto" }}>
                <Table size="small">
                  <TableHead><TableRow>{["Business", "Amount", "Status", "Due", "Paid", "Method / Ref", "Notes"].map((h) => <TableCell key={h} sx={{ fontWeight: 850, whiteSpace: "nowrap" }}>{h}</TableCell>)}</TableRow></TableHead>
                  <TableBody>
                    {payments.map((p) => {
                      const od = isOverduePayment(p);
                      return (
                        <TableRow key={p.id} hover sx={od ? { backgroundColor: "rgba(245,158,11,0.06)" } : undefined}>
                          <TableCell sx={{ fontWeight: 800 }}>{p.business?.name ?? `#${p.business_id}`}</TableCell>
                          <TableCell sx={{ whiteSpace: "nowrap", fontWeight: 800 }}>{fmtMoney(p.amount, p.currency)}</TableCell>
                          <TableCell><StatusChip status={od ? "overdue" : p.status} /></TableCell>
                          <TableCell sx={{ whiteSpace: "nowrap" }}>{fmtDate(p.due_at)}</TableCell>
                          <TableCell sx={{ whiteSpace: "nowrap" }}>{fmtDate(p.paid_at)}</TableCell>
                          <TableCell sx={{ fontSize: "0.78rem" }}>{[p.payment_method, p.reference].filter(Boolean).join(" · ") || "—"}</TableCell>
                          <TableCell sx={{ fontSize: "0.76rem", maxWidth: 220 }}>{p.failure_reason || p.notes || "—"}</TableCell>
                        </TableRow>
                      );
                    })}
                    {payments.length === 0 ? <TableRow><TableCell colSpan={7} sx={{ py: 5, textAlign: "center", color: "var(--muted-foreground)" }}>No payment records yet.</TableCell></TableRow> : null}
                  </TableBody>
                </Table>
              </Box>
            </Box>
          )}
            </motion.div>
          </AnimatePresence>
        </Paper>
      )}

      {/* Plan dialog */}
      <Dialog
        open={planDialog.open}
        onClose={saving ? undefined : () => setPlanDialog((d) => ({ ...d, open: false }))}
        fullScreen={fullScreenDialog}
        fullWidth
        maxWidth="sm"
        slots={{ transition: reducedMotion || fullScreenDialog ? Fade : Grow }}
        slotProps={{ transition: reducedMotion ? { timeout: 1 } : { timeout: 360, style: dialogOrigin } }}
        PaperProps={{ sx: dialogPaperSx }}
      >
        <DialogTitle sx={{ fontWeight: 900, pb: 1 }}>{planDialog.id ? "Edit plan" : "New plan"}</DialogTitle>
        <DialogContent dividers sx={{ pt: 2, overflowX: "hidden" }}>
          <motion.div key={shakePlan} animate={reducedMotion || shakePlan === 0 ? { x: 0 } : shakeKeyframes} transition={shakeTransition}>
            <Stack spacing={1.5}>
          <TextField label="Name" value={planDialog.name} onChange={(e) => setPlanDialog((d) => ({ ...d, name: e.target.value }))} fullWidth autoFocus={!fullScreenDialog} />
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
            <TextField label="Price" type="number" value={planDialog.price} onChange={(e) => setPlanDialog((d) => ({ ...d, price: e.target.value }))} fullWidth />
            <TextField label="Currency" value={planDialog.currency} onChange={(e) => setPlanDialog((d) => ({ ...d, currency: e.target.value }))} fullWidth />
          </Stack>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
            <TextField select label="Billing cycle" value={planDialog.billing_cycle} onChange={(e) => setPlanDialog((d) => ({ ...d, billing_cycle: e.target.value }))} fullWidth>
              <MenuItem value="monthly">Monthly</MenuItem><MenuItem value="yearly">Yearly</MenuItem><MenuItem value="quarterly">Quarterly</MenuItem>
            </TextField>
            <TextField label="Trial days" type="number" value={planDialog.trial_days} onChange={(e) => setPlanDialog((d) => ({ ...d, trial_days: e.target.value }))} fullWidth />
          </Stack>
          <TextField label="Description" value={planDialog.description} onChange={(e) => setPlanDialog((d) => ({ ...d, description: e.target.value }))} fullWidth multiline minRows={2} />
          <TextField label="Limits (JSON)" value={planDialog.limitsText} onChange={(e) => setPlanDialog((d) => ({ ...d, limitsText: e.target.value }))} fullWidth multiline minRows={3} helperText="Example keys: orders_per_month, menu_items, tables, users" />
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Chip label={planDialog.is_active ? "Active" : "Inactive"} onClick={() => setPlanDialog((d) => ({ ...d, is_active: !d.is_active }))} color={planDialog.is_active ? "success" : "default"} sx={{ fontWeight: 800 }} />
            <Chip label={planDialog.is_default ? "Default plan" : "Not default"} onClick={() => setPlanDialog((d) => ({ ...d, is_default: !d.is_default }))} color={planDialog.is_default ? "primary" : "default"} sx={{ fontWeight: 800 }} />
          </Stack>
            </Stack>
          </motion.div>
        </DialogContent>
        <DialogActions sx={{ px: { xs: 2, sm: 3 }, py: 1.5, gap: 1 }}>
          <MotionButton whileTap={reducedMotion ? undefined : { scale: 0.98 }} transition={spring.press} onClick={() => setPlanDialog((d) => ({ ...d, open: false }))} disabled={saving} sx={{ borderRadius: "10px", textTransform: "none", fontWeight: 700 }}>Cancel</MotionButton>
          <MotionButton whileTap={reducedMotion ? undefined : { scale: 0.98 }} transition={spring.press} variant="contained" onClick={savePlan} disabled={saving || !planDialog.name.trim()} sx={{ fontWeight: 800, borderRadius: "10px", textTransform: "none" }}>{saving ? "Saving..." : "Save plan"}</MotionButton>
        </DialogActions>
      </Dialog>

      {/* Assign dialog */}
      <Dialog
        open={assignDialog.open}
        onClose={saving ? undefined : () => setAssignDialog((d) => ({ ...d, open: false }))}
        fullScreen={fullScreenDialog}
        fullWidth
        maxWidth="sm"
        slots={{ transition: reducedMotion || fullScreenDialog ? Fade : Grow }}
        slotProps={{ transition: reducedMotion ? { timeout: 1 } : { timeout: 360, style: dialogOrigin } }}
        PaperProps={{ sx: dialogPaperSx }}
      >
        <DialogTitle sx={{ fontWeight: 900, pb: 1 }}>Assign subscription</DialogTitle>
        <DialogContent dividers sx={{ pt: 2, overflowX: "hidden" }}>
          <motion.div key={shakeAssign} animate={reducedMotion || shakeAssign === 0 ? { x: 0 } : shakeKeyframes} transition={shakeTransition}>
            <Stack spacing={1.5}>
              <FormControl fullWidth><InputLabel>Business</InputLabel><Select label="Business" value={assignDialog.business_id} onChange={(e) => setAssignDialog((d) => ({ ...d, business_id: e.target.value }))}>{businesses.map((b) => <MenuItem key={b.id} value={String(b.id)}>{b.name}{!b.isActive ? " (suspended)" : ""}</MenuItem>)}</Select></FormControl>
              <FormControl fullWidth><InputLabel>Plan</InputLabel><Select label="Plan" value={assignDialog.plan_id} onChange={(e) => setAssignDialog((d) => ({ ...d, plan_id: e.target.value }))}>{plans.map((p) => <MenuItem key={p.id} value={String(p.id)}>{p.name} · {fmtMoney(p.price, p.currency)}/{p.billing_cycle}</MenuItem>)}</Select></FormControl>
              <FormControl fullWidth><InputLabel>Status</InputLabel><Select label="Status" value={assignDialog.status} onChange={(e) => setAssignDialog((d) => ({ ...d, status: e.target.value }))}>{["trial","active","past_due","cancelled","expired","suspended"].map((s) => <MenuItem key={s} value={s}>{s.replace(/_/g, " ")}</MenuItem>)}</Select></FormControl>
              <TextField label="Notes (optional)" value={assignDialog.notes} onChange={(e) => setAssignDialog((d) => ({ ...d, notes: e.target.value }))} fullWidth multiline minRows={2} />
            </Stack>
          </motion.div>
        </DialogContent>
        <DialogActions sx={{ px: { xs: 2, sm: 3 }, py: 1.5, gap: 1 }}>
          <MotionButton whileTap={reducedMotion ? undefined : { scale: 0.98 }} transition={spring.press} onClick={() => setAssignDialog((d) => ({ ...d, open: false }))} disabled={saving} sx={{ borderRadius: "10px", textTransform: "none", fontWeight: 700 }}>Cancel</MotionButton>
          <MotionButton whileTap={reducedMotion ? undefined : { scale: 0.98 }} transition={spring.press} variant="contained" onClick={saveAssignment} disabled={saving} sx={{ fontWeight: 800, borderRadius: "10px", textTransform: "none" }}>{saving ? "Saving..." : "Assign"}</MotionButton>
        </DialogActions>
      </Dialog>

      {/* Payment dialog */}
      <Dialog
        open={payDialog.open}
        onClose={saving ? undefined : () => setPayDialog((d) => ({ ...d, open: false }))}
        fullScreen={fullScreenDialog}
        fullWidth
        maxWidth="sm"
        slots={{ transition: reducedMotion || fullScreenDialog ? Fade : Grow }}
        slotProps={{ transition: reducedMotion ? { timeout: 1 } : { timeout: 360, style: dialogOrigin } }}
        PaperProps={{ sx: dialogPaperSx }}
      >
        <DialogTitle sx={{ fontWeight: 900, pb: 1 }}>Record payment</DialogTitle>
        <DialogContent dividers sx={{ pt: 2, overflowX: "hidden" }}>
          <motion.div key={shakePay} animate={reducedMotion || shakePay === 0 ? { x: 0 } : shakeKeyframes} transition={shakeTransition}>
            <Stack spacing={1.5}>
              <FormControl fullWidth><InputLabel>Business</InputLabel><Select label="Business" value={payDialog.business_id} onChange={(e) => setPayDialog((d) => ({ ...d, business_id: e.target.value }))}>{businesses.map((b) => <MenuItem key={b.id} value={String(b.id)}>{b.name}</MenuItem>)}</Select></FormControl>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                <TextField label="Amount" type="number" value={payDialog.amount} onChange={(e) => setPayDialog((d) => ({ ...d, amount: e.target.value }))} fullWidth />
                <TextField label="Currency" value={payDialog.currency} onChange={(e) => setPayDialog((d) => ({ ...d, currency: e.target.value }))} fullWidth />
              </Stack>
              <FormControl fullWidth><InputLabel>Status</InputLabel><Select label="Status" value={payDialog.status} onChange={(e) => setPayDialog((d) => ({ ...d, status: e.target.value }))}>{["pending","paid","failed","overdue","refunded","cancelled"].map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}</Select></FormControl>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                <TextField label="Payment method (optional)" value={payDialog.payment_method} onChange={(e) => setPayDialog((d) => ({ ...d, payment_method: e.target.value }))} fullWidth />
                <TextField label="Reference (optional)" value={payDialog.reference} onChange={(e) => setPayDialog((d) => ({ ...d, reference: e.target.value }))} fullWidth />
              </Stack>
              <TextField label="Due date" type="date" value={payDialog.due_at} onChange={(e) => setPayDialog((d) => ({ ...d, due_at: e.target.value }))} fullWidth InputLabelProps={{ shrink: true }} helperText="Set a due date to track overdue payments and reminders." />
              <TextField label="Notes (optional)" value={payDialog.notes} onChange={(e) => setPayDialog((d) => ({ ...d, notes: e.target.value }))} fullWidth multiline minRows={2} />
            </Stack>
          </motion.div>
        </DialogContent>
        <DialogActions sx={{ px: { xs: 2, sm: 3 }, py: 1.5, gap: 1 }}>
          <MotionButton whileTap={reducedMotion ? undefined : { scale: 0.98 }} transition={spring.press} onClick={() => setPayDialog((d) => ({ ...d, open: false }))} disabled={saving} sx={{ borderRadius: "10px", textTransform: "none", fontWeight: 700 }}>Cancel</MotionButton>
          <MotionButton whileTap={reducedMotion ? undefined : { scale: 0.98 }} transition={spring.press} variant="contained" onClick={savePayment} disabled={saving} sx={{ fontWeight: 800, borderRadius: "10px", textTransform: "none" }}>{saving ? "Saving..." : "Record payment"}</MotionButton>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
