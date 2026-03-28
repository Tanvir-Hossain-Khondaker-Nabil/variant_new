import { Head, router } from "@inertiajs/react";
import {
  BarChart3,
  CalendarRange,
  CheckCircle2,
  DollarSign,
  FileText,
  MoreHorizontal,
  Package,
  Plus,
  ShoppingBag,
  TrendingUp,
  Users,
  X
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "../hooks/useTranslation";

export default function Dashboard({
   users = [],
  selectedUserId = null,
  selectedUserStats = null,
  totalSales = 0,
  totalPaid = 0,
  totalDue = 0,
  totalselas = 0,
  totalexpense = 0,
  totalExpense = 0,
  dashboardData = {},
  isShadowUser = false,
  



    isSuperAdmin = false,
  isAdmin = false,
  permissions = {},
}) {
  const { t, locale } = useTranslation();
  const [loading, setLoading] = useState(false);

const [selectedUser, setSelectedUser] = useState(selectedUserId || "");


const {
  plansView = false,
  subscriptionsView = false,
  usersView = false,
  depositsView = false,
} = permissions;




console.log("==== Dashboard Auth Info ====");
console.log("isSuperAdmin:", isSuperAdmin);
console.log("isAdmin:", isAdmin);
console.log("plansView:", plansView);
console.log("subscriptionsView:", subscriptionsView);
console.log("usersView:", usersView);
console.log("depositsView:", depositsView);

const handleUserChange = (e) => {
  const userId = e.target.value;
  setSelectedUser(userId);

  router.reload({
    data: {
      user_id: userId,
      timeRange: range,
      date_from: dateFrom || null,
      date_to: dateTo || null,
    },
    preserveScroll: true,
  });
};

  // ✅ Extract date range from backend response
  const {
    dateFrom: initialDateFrom = "",
    dateTo: initialDateTo = "",
    range = "year"
  } = dashboardData;

  const [dateFrom, setDateFrom] = useState(initialDateFrom);
  const [dateTo, setDateTo] = useState(initialDateTo);

  // ✅ Sync with backend response
  useEffect(() => {
    setDateFrom(initialDateFrom);
    setDateTo(initialDateTo);
  }, [initialDateFrom, initialDateTo]);

  const {
    periodSales = 0,
    prevPeriodSales = 0,
    salesGrowth = 0,

    periodPaid = 0,
    periodDue = 0,

    purchaseCost = 0,

    totalCustomers = 0,
    activeCustomers = 0,
    buyersThisPeriod = 0,
    conversionRate = 0,

    totalActiveSubscriptions = 0,
subscriptionValue = 0,
totalSubscriptionProfit = 0,
userTotalDeposit = 0,

    inventoryValue = 0,
    lowStockItems = 0,
    outOfStockItems = 0,

    profitMargin = 0,
    averageOrderValue = 0,

    orderAnalytics = {},
    donutPercentages = { completed: 0, processing: 0, returned: 0 },

    salesSeries = { labels: [], values: [] },
profitSeries = { labels: [], values: [] },
subscriberSeries = { labels: [], values: [] },
    topProducts = [],
    recentActivities = [],
  } = dashboardData;

  // ------------------ format helpers ------------------
  const formatCurrency = (amount) => {
    const numAmount = Number(amount || 0);
    return new Intl.NumberFormat("en-BD", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(numAmount);
  };

  // ------------------ time range buttons ------------------
  const timeRanges = [
    { id: "today", label: t("dashboard.today", "Today") },
    { id: "week", label: t("dashboard.this_week", "Week") },
    { id: "month", label: t("dashboard.this_month", "Month") },
    { id: "year", label: t("dashboard.this_year", "Year") },
  ];

  // ✅ Range change - Clear date range when changing range
  const handleTimeRangeChange = useCallback((r) => {
    setLoading(true);
    setDateFrom("");
    setDateTo("");

    router.reload({
      only: [
        "dashboardData",
        "totalSales",
        "totalPaid",
        "totalDue",
        "totalselas",
        "totalexpense",
        "isShadowUser",
      ],
      data: {
        timeRange: r,
        date_from: null,
        date_to: null,
      },
      preserveScroll: true,
      onFinish: () => setLoading(false),
    });
  }, []);

  // ✅ Refresh - Preserve current filters
  const refreshDashboard = useCallback(() => {
    setLoading(true);
    router.reload({
      only: [
        "dashboardData",
        "totalSales",
        "totalPaid",
        "totalDue",
        "totalselas",
        "totalexpense",
        "isShadowUser",
      ],
      data: {
        timeRange: range,
        date_from: dateFrom || null,
        date_to: dateTo || null,
      },
      preserveScroll: true,
      onFinish: () => setLoading(false),
    });
  }, [range, dateFrom, dateTo]);

  // ✅ Date range filter handler
  const handleDateRangeFilter = useCallback(() => {
    if (!dateFrom || !dateTo) {
      alert(t("dashboard.select_date_range", "Please select both from and to dates"));
      return;
    }

    setLoading(true);

    router.reload({
      only: [
        "dashboardData",
        "totalSales",
        "totalPaid",
        "totalDue",
        "totalselas",
        "totalexpense",
        "isShadowUser",
      ],
      data: {
        timeRange: "custom",
        date_from: dateFrom,
        date_to: dateTo,
      },
      preserveScroll: true,
      onFinish: () => setLoading(false),
    });
  }, [dateFrom, dateTo, t]);

  // ✅ Clear date range filter
  const clearDateRangeFilter = useCallback(() => {
    setDateFrom("");
    setDateTo("");

    // Revert to current range
    handleTimeRangeChange(range);
  }, [range, handleTimeRangeChange]);

  // Check if custom date range is active
  const isCustomRangeActive = dateFrom && dateTo;

  // ------------------ chart data ------------------
  const activeSeries = isSuperAdmin ? profitSeries : salesSeries;

  const labels = salesSeries?.labels || [];
  const values = (salesSeries?.values || []).map((v) => Number(v || 0));
  const totalSeriesValue = useMemo(() => values.reduce((a, b) => a + b, 0), [values]);

  const W = 520;
  const H = 220;
  const P = { top: 18, right: 18, bottom: 32, left: 18 };

  const maxVal = useMemo(() => Math.max(...values, 1), [values]);
  const minVal = useMemo(() => Math.min(...values, 0), [values]);

  const chartPoints = useMemo(() => {
    if (!labels.length || !values.length) return [];
    const span = maxVal - minVal || 1;

    return values.map((v, i) => {
      const x =
        labels.length === 1
          ? P.left
          : P.left + (i / (labels.length - 1)) * (W - P.left - P.right);

      const yRaw = P.top + (1 - (v - minVal) / span) * (H - P.top - P.bottom);
      const y = Math.max(P.top, Math.min(H - P.bottom, yRaw));
      return { x, y, v, label: labels[i], i };
    });
  }, [labels, values, maxVal, minVal]);

  const buildSmoothPath = useCallback((pts) => {
    if (!pts || pts.length === 0) {
      return `M${P.left},${H - P.bottom} L${W - P.right},${H - P.bottom}`;
    }
    if (pts.length === 1) {
      return `M${pts[0].x},${pts[0].y} L${pts[0].x + 0.01},${pts[0].y}`;
    }

    const path = [];
    path.push(`M ${pts[0].x} ${pts[0].y}`);

    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i - 1] || pts[i];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[i + 2] || p2;

      const t = 0.18;
      const cp1x = p1.x + (p2.x - p0.x) * t;
      const cp1y = p1.y + (p2.y - p0.y) * t;
      const cp2x = p2.x - (p3.x - p1.x) * t;
      const cp2y = p2.y - (p3.y - p1.y) * t;

      path.push(`C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`);
    }
    return path.join(" ");
  }, []);

  const linePath = useMemo(() => buildSmoothPath(chartPoints), [chartPoints, buildSmoothPath]);

  const areaPath = useMemo(() => {
    if (!chartPoints.length) return "";
    const baseY = H - P.bottom;
    return `${linePath} L ${chartPoints[chartPoints.length - 1].x} ${baseY} L ${chartPoints[0].x} ${baseY} Z`;
  }, [linePath, chartPoints]);

  const getTickIndexes = (n, mode) => {
    if (n <= 1) return [0];

    if (mode === "hour" && n === 24) return [0, 4, 8, 12, 16, 20, 23];
    if (mode === "year" && n <= 12) return Array.from({ length: n }, (_, i) => i);

    const desired = mode === "today" ? 6 : 7;
    const step = Math.ceil((n - 1) / (desired - 1));
    const idxs = [];
    for (let i = 0; i < n; i += step) idxs.push(i);
    if (idxs[idxs.length - 1] !== n - 1) idxs.push(n - 1);
    return idxs;
  };

  const effectiveRange = isCustomRangeActive ? "day" : range === "year" ? "year" : "day";
  const tickIndexes = useMemo(
    () => getTickIndexes(labels.length, effectiveRange),
    [labels.length, effectiveRange]
  );

  const [hoverIdx, setHoverIdx] = useState(null);
  const hoverPoint = hoverIdx === null ? null : chartPoints[hoverIdx];

  // Profit calculation
  const purchaseCostPeriod = Number(purchaseCost || 0);
  const netProfitPeriod = Number(periodSales || 0) - purchaseCostPeriod;

  // Paid + Due (period)
  const paidInPeriod = Number(periodPaid || 0);
  const dueInPeriod = Number(periodDue || 0);


console.log("isSuperAdmin:", isSuperAdmin);

  const quickStats = isSuperAdmin? [

      {
  title: t("dashboard.total_active_subscriptions", "Total Active Subscription"),
  value: Number(totalActiveSubscriptions).toLocaleString(),
  change: 0,
  icon: <CheckCircle2 className="w-5 h-5" />,
  description: t("dashboard.current_active_subscription_count", "Currently active subscriptions"),
},
{
  title: t("dashboard.subscription_value", "Subscription Value"),
  value: `৳${formatCurrency(subscriptionValue)}`,
  change: 0,
  icon: <DollarSign className="w-5 h-5" />,
  description: t("dashboard.subscription_plan_value", "Active subscription plan value"),
},
{
  title: t("dashboard.total_subscription_profit", "Total Profit Subscription"),
  value: `৳${formatCurrency(totalSubscriptionProfit)}`,
  change: 0,
  icon: <TrendingUp className="w-5 h-5" />,
  description: t("dashboard.subscription_received_amount", "Completed subscription received amount"),
},
{
  title: t("dashboard.user_total_deposit", "User Total Deposit"),
  value: `৳${formatCurrency(userTotalDeposit)}`,
  change: 0,
  icon: <Users className="w-5 h-5" />,
  description: t("dashboard.total_user_deposit_balance", "All user deposit balance"),
},



  ] :[
{
      title: t("dashboard.sales", "Sales"),
      value: `৳${formatCurrency(periodSales)}`,
      change: salesGrowth,
      icon: <TrendingUp className="w-5 h-5" />,
      description: isCustomRangeActive
        ? t("dashboard.date_range", "Date range")
        : t("dashboard.vs_previous_period", "vs previous period"),
    },
    {
      title: t("dashboard.total_expense", "Total Expense"),
      value: `৳${formatCurrency(totalexpense)}`,
      change: conversionRate,
      icon: <TrendingUp className="w-5 h-5" />,
      description: t("dashboard.buyers_in_period", `${buyersThisPeriod} buyers`),
    },
    {
      title: t("dashboard.inventory_value", "Inventory Value"),
      value:
        Number(inventoryValue) >= 1000000
          ? `৳${(Number(inventoryValue) / 1000000).toFixed(1)}M`
          : `৳${formatCurrency(inventoryValue)}`,
      change: 0,
      icon: <Package className="w-5 h-5" />,
      description: t("dashboard.stock_items", `${lowStockItems} low, ${outOfStockItems} out`)
        .replace(":low", String(lowStockItems))
        .replace(":out", String(outOfStockItems)),
    },
    {
      title: t("dashboard.net_profit", "Net Profit"),
      value: `৳${formatCurrency(netProfitPeriod)}`,
      change: profitMargin,
      icon: <DollarSign className="w-5 h-5" />,
      description: t("dashboard.profit_margin", "profit margin"),
    }
  ] 

  

const superAdmin = [
  {
    title: t("dashboard.sales", "Sales"),
    value: `৳${formatCurrency(periodSales)}`,
    sub: isCustomRangeActive
      ? t("dashboard.date_range", "Date range")
      : t("dashboard.vs_previous_period", "vs previous period"),
    icon: <TrendingUp className="w-16 h-16 opacity-10 rotate-12" />,
  },
  {
    title: t("dashboard.total_expense", "Total Expense"),
    value: `৳${formatCurrency(totalexpense)}`,
    sub: t("dashboard.buyers_in_period", `${buyersThisPeriod} buyers`),
    icon: <TrendingUp className="w-16 h-16 opacity-10 rotate-12" />,
  },
  {
    title: t("dashboard.inventory_value", "Inventory Value"),
    value:
      Number(inventoryValue) >= 1000000
        ? `৳${(Number(inventoryValue) / 1000000).toFixed(1)}M`
        : `৳${formatCurrency(inventoryValue)}`,
    sub: `${lowStockItems} low, ${outOfStockItems} out`,
    icon: <Package className="w-16 h-16 opacity-10 rotate-12" />,
  },
  {
    title: t("dashboard.net_profit", "Net Profit"),
    value: `৳${formatCurrency(netProfitPeriod)}`,
    sub: t("dashboard.profit_margin", "profit margin"),
    icon: <DollarSign className="w-16 h-16 opacity-10 rotate-12" />,
  },
];





const admin = [
  {
    title: isCustomRangeActive
      ? t("dashboard.sales_for_range", "Sales for Range")
      : t("dashboard.period_sales", "Period Sales"),
    value: `৳${formatCurrency(periodSales)}`,
    sub: `${t("dashboard.prev", "Prev")}: ৳${formatCurrency(prevPeriodSales)}`,
    icon: <BarChart3 className="w-16 h-16 opacity-10 rotate-12" />,
  },
  {
    title: t("dashboard.invoice_due", "Invoice Due (All Time)"),
    value: `৳${formatCurrency(totalDue)}`,
    sub: `${t("dashboard.paid", "Paid")}: ৳${formatCurrency(totalPaid)}`,
    icon: <FileText className="w-16 h-16 opacity-10 rotate-12" />,
  },
  {
    title: t("dashboard.net_profit", "Net Profit"),
    value: `৳${formatCurrency(netProfitPeriod)}`,
    sub: `${t("dashboard.purchase_cost", "Purchase Cost")}: ৳${formatCurrency(
      purchaseCostPeriod
    )}`,
    icon: <ShoppingBag className="w-16 h-16 opacity-10 rotate-12" />,
  },
  {
    title: t("dashboard.customers", "Customers Overview"),
    value: Number(totalCustomers).toLocaleString(),
    sub: `${t("dashboard.active", "Active")}: ${Number(
      activeCustomers
    ).toLocaleString()}`,
    icon: <Users className="w-16 h-16 opacity-10 rotate-12" />,
  },
];
  const stats = isSuperAdmin ? superAdmin: admin;



  const donut = {
    completed: Number(donutPercentages?.completed || 0),
    processing: Number(donutPercentages?.processing || 0),
    returned: Number(donutPercentages?.returned || 0),
  };

  const getChartTitle = () => {
  if (isSuperAdmin) {
    if (isCustomRangeActive) return t("dashboard.profit_trend_range", "Profit Trend (Date Range)");
    return range === "year"
      ? t("dashboard.profit_trend_monthly", "Profit Trend (Monthly)")
      : t("dashboard.profit_trend", "Profit Trend");
  }

  if (isCustomRangeActive) return t("dashboard.sales_trend_range", "Sales Trend (Date Range)");
  return range === "year"
    ? t("dashboard.sales_trend_monthly", "Sales Trend (Monthly)")
    : t("dashboard.sales_trend", "Sales Trend");
};

  const getChartSubTitle = () => {
  if (isSuperAdmin) {
    if (isCustomRangeActive) {
      return t("dashboard.daily_profit_data_for_range", `Daily profit data from ${dateFrom} to ${dateTo}`);
    }
    return range === "year"
      ? t("dashboard.monthly_profit_graph", "Monthly profit graph")
      : t("dashboard.profit_graph_selected_range", "Profit graph for selected range");
  }

  if (isCustomRangeActive) {
    return t("dashboard.daily_data_for_range", `Daily data from ${dateFrom} to ${dateTo}`);
  }
  return range === "year"
    ? t("dashboard.smooth_monthly_hint", "Smooth monthly graph (Jan–Dec)")
    : t("dashboard.simple_hint", "Clean line chart for selected range");
};

  const getRangeDisplayText = () => {
    if (isCustomRangeActive) {
      return `${t("dashboard.date_range", "Date range")}: ${dateFrom} ${t("dashboard.to", "to")} ${dateTo}`;
    }
    return `${t("dashboard.range", "Range")}: ${range === "year"
        ? t("dashboard.monthly_jan_dec", "Monthly (Jan–Dec)")
        : timeRanges.find((r) => r.id === range)?.label || range
      }`;
  };

  const chartTitle = getChartTitle();
  const chartSubTitle = getChartSubTitle();

  return (
    <div className={`space-y-8 pb-10 ${locale === "bn" ? "bangla-font" : ""}`}>
      <Head title={t("dashboard.title", "Dashboard")} />

      {/* ================= Header controls ================= */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-black text-slate-800">{t("dashboard.title", "Dashboard")}</h1>

          <p className="text-xs text-slate-500">
            {getRangeDisplayText()}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {timeRanges.map((r) => (
            <button
              key={r.id}
              onClick={() => handleTimeRangeChange(r.id)}
              className={`px-3 py-2 rounded-xl text-xs font-black border transition ${range === r.id && !isCustomRangeActive
                  ? "bg-[#1e4d2b] text-white border-[#1e4d2b]"
                  : "bg-white text-slate-700 border-slate-200 hover:border-[#1e4d2b]"
                } ${isCustomRangeActive ? "opacity-50 cursor-not-allowed" : ""}`}
              disabled={loading || isCustomRangeActive}
              title={isCustomRangeActive ? t("dashboard.clear_range_first", "Clear date range first") : ""}
            >
              {r.label}
            </button>
          ))}

          {/* Date Range Inputs */}
          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2">
            <CalendarRange className="w-4 h-4 text-slate-400 shrink-0" />
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="text-xs font-bold text-slate-700 outline-none bg-transparent cursor-pointer w-full sm:w-auto"
                disabled={loading}
                placeholder={t("dashboard.from_date", "From date")}
              />
              <span className="text-xs text-slate-400 hidden sm:inline">—</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="text-xs font-bold text-slate-700 outline-none bg-transparent cursor-pointer w-full sm:w-auto"
                disabled={loading}
                placeholder={t("dashboard.to_date", "To date")}
              />
            </div>

            {dateFrom && dateTo && (
              <button
                onClick={handleDateRangeFilter}
                className="text-[10px] font-black text-green-600 hover:text-green-700 px-2 py-1 hover:bg-green-50 rounded whitespace-nowrap"
                disabled={loading}
                title={t("dashboard.apply_range", "Apply date range")}
              >
                {t("dashboard.apply", "Apply")}
              </button>
            )}

            {isCustomRangeActive && (
              <button
                onClick={clearDateRangeFilter}
                className="text-[10px] font-black text-red-400 hover:text-red-700 px-2 py-1 hover:bg-red-50 rounded"
                disabled={loading}
                title={t("dashboard.clear_range_filter", "Clear date range filter")}
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          <button
            onClick={refreshDashboard}
            className="px-3 py-2 rounded-xl text-xs font-black bg-white border border-slate-200 hover:border-[#35a952] transition flex items-center gap-2"
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="animate-spin rounded-full h-3 w-3 border-b-2 border-[#35a952]"></span>
                {t("dashboard.syncing", "Syncing...")}
              </>
            ) : (
              t("dashboard.sync", "Sync")
            )}
          </button>
        </div>
      </div>

      {/* ================= Top stat cards ================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        {quickStats.map((stat, index) => (
          <div
            key={index}
            className="p-6 text-white relative overflow-hidden"
            style={{
              background: "linear-gradient(180deg, #1e4d2b 0%, #35a952 100%)",
              borderRadius: "20px",
              boxShadow: "0 10px 30px rgba(30, 77, 43, 0.12)",
            }}
          >
            <div className="absolute -top-10 -right-10 w-28 h-28 rounded-full bg-white/10" />
            <div className="absolute -bottom-14 -left-14 w-40 h-40 rounded-full bg-white/10" />

            <p className="text-[10px] font-bold opacity-80 uppercase tracking-widest relative z-10">
              {stat.title}
            </p>

            <div className="flex items-end justify-between mt-2 relative z-10">
              <h3 className="text-2xl lg:text-3xl font-black tracking-tight">{stat.value}</h3>
              <div className="p-2 rounded-xl bg-white/15">{stat.icon}</div>
            </div>

            <div className="mt-4 flex items-center gap-2 relative z-10">
              <span
                className={`text-[10px] bg-white/20 px-2 py-0.5 rounded-full font-bold ${Number(stat.change) >= 0 ? "text-white" : "text-red-100"
                  }`}
              >
                {Number(stat.change) >= 0 ? "+" : ""}
                {Number(stat.change).toFixed(1)}%
              </span>
              <span className="text-[9px] opacity-80">{stat.description}</span>
            </div>
          </div>
        ))}
      </div>

      {/* ================= Charts section ================= */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
        {/* -------- Sales Trend -------- */}
        <div className="bg-white p-6 lg:p-8 rounded-3xl shadow-sm border border-slate-100 flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="text-slate-800 font-black text-lg flex items-center gap-2">
                <span
                  className="w-2 h-6 rounded-full"
                  style={{ background: "linear-gradient(180deg, #1e4d2b 0%, #35a952 100%)" }}
                />
                {chartTitle}
              </h3>
              <p className="text-xs text-slate-500 mt-1">{chartSubTitle}</p>
            </div>

            <button className="p-2 hover:bg-slate-50 rounded-xl text-slate-400">
              <MoreHorizontal className="w-5 h-5" />
            </button>
          </div>

          {totalSeriesValue <= 0 ? (
            <div className="h-64 w-full flex items-center justify-center rounded-2xl border border-dashed border-slate-200 mt-4">
              <div className="text-center">
                <p className="text-sm font-black text-slate-700">
                  {t("dashboard.no_sales_data", "No sales data")}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  {isCustomRangeActive
                    ? t("dashboard.no_data_for_range", "No sales data for selected date range")
                    : t("dashboard.try_another_range", "Try another time range")}
                </p>
              </div>
            </div>
          ) : (
            <div className="mt-4 relative">
              <div className="relative rounded-2xl border border-slate-100 bg-gradient-to-b from-slate-50 to-white overflow-hidden">
                <svg
                  viewBox={`0 0 ${W} ${H}`}
                  className="w-full h-64"
                  preserveAspectRatio="none"
                  onMouseLeave={() => setHoverIdx(null)}
                >
                  <g>
                    {[0.25, 0.5, 0.75].map((p, i) => {
                      const y = P.top + p * (H - P.top - P.bottom);
                      return (
                        <line
                          key={i}
                          x1={P.left}
                          y1={y}
                          x2={W - P.right}
                          y2={y}
                          stroke="#e9eef5"
                          strokeWidth="1"
                        />
                      );
                    })}
                  </g>

                  <defs>
                    <linearGradient id="areaGrad" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="rgba(53,169,82,0.22)" />
                      <stop offset="100%" stopColor="rgba(53,169,82,0.00)" />
                    </linearGradient>
                    <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
                      <feGaussianBlur in="SourceAlpha" stdDeviation="2.5" result="blur" />
                      <feOffset dx="0" dy="2" result="off" />
                      <feComponentTransfer>
                        <feFuncA type="linear" slope="0.25" />
                      </feComponentTransfer>
                      <feMerge>
                        <feMergeNode />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                  </defs>

                  <path d={areaPath} fill="url(#areaGrad)" />

                  <path
                    d={linePath}
                    fill="none"
                    stroke="#1e4d2b"
                    strokeWidth="3.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    filter="url(#softShadow)"
                  />

                  {chartPoints.map((p) => (
                    <g key={p.i}>
                      <circle
                        cx={p.x}
                        cy={p.y}
                        r="10"
                        fill="transparent"
                        onMouseEnter={() => setHoverIdx(p.i)}
                      />
                      {hoverIdx === p.i ? (
                        <circle cx={p.x} cy={p.y} r="5" fill="#35a952" stroke="#ffffff" strokeWidth="2" />
                      ) : (
                        <circle cx={p.x} cy={p.y} r="2.5" fill="#1e4d2b" opacity="0.25" />
                      )}
                    </g>
                  ))}
                </svg>

                {hoverPoint && (
                  <div
                    className="absolute -translate-x-1/2 -translate-y-full px-3 py-2 rounded-xl bg-white shadow-lg border border-slate-100 text-xs"
                    style={{
                      left: `${(hoverPoint.x / W) * 100}%`,
                      top: `${(hoverPoint.y / H) * 100}%`,
                      zIndex: 100,
                    }}
                  >
                    <div className="font-black text-slate-800">{hoverPoint.label}</div>
                    <div className="text-slate-600">
  {isSuperAdmin
    ? t("dashboard.profit", "Profit")
    : t("dashboard.revenue", "Revenue")}:{" "}
  <span className="font-black text-[#1e4d2b]">৳{formatCurrency(hoverPoint.v)}</span>
</div>
                  </div>
                )}
              </div>

              <div className="flex mt-3 justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">
                {tickIndexes.map((i) => (
                  <span key={i}>{labels[i]}</span>
                ))}
              </div>
            </div>
          )}

          {/* Sale Report Section (Paid + Due) */}
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="text-center p-3 rounded-xl bg-green-50 border border-green-100">
              <p className="text-[10px] uppercase tracking-widest font-black text-green-700">
                {t("dashboard.avg_purchase", "Average Purchase")}
              </p>
              <p className="text-sm font-black text-green-800 mt-1">
                ৳{formatCurrency(averageOrderValue)}
              </p>
            </div>

            <div className="text-center p-3 rounded-xl bg-blue-50 border border-blue-100">
              <p className="text-[10px] uppercase tracking-widest font-black text-blue-700">
                {t("dashboard.paid", "Paid")}
              </p>
              <p className="text-sm font-black text-blue-800 mt-1">
                ৳{formatCurrency(paidInPeriod)}
              </p>
            </div>

            <div className="text-center p-3 rounded-xl bg-amber-50 border border-amber-100">
              <p className="text-[10px] uppercase tracking-widest font-black text-amber-700">
                {t("dashboard.due", "Due")}
              </p>
              <p className="text-sm font-black text-amber-800 mt-1">
                ৳{formatCurrency(dueInPeriod)}
              </p>
            </div>
          </div>
        </div>

       {/* -------- Purchase Analytics / Subscriber Analysis -------- */}
<div className="bg-white p-6 lg:p-8 rounded-3xl shadow-sm border border-slate-100 flex flex-col">
  <div className="flex items-center justify-between mb-2">
    <div>
      <h3 className="text-slate-800 font-black text-lg">
        {isSuperAdmin
          ? t("dashboard.subscriber_analysis", "Subscriber Analysis")
          : t("dashboard.purchase_analytics", "Purchase Analytics")}
      </h3>
      <p className="text-xs text-slate-500 mt-1">
        {isSuperAdmin
          ? t("dashboard.monthly_subscriber_overview", "Monthly subscriber overview")
          : isCustomRangeActive
            ? t("dashboard.orders_for_range", `Orders for selected range`)
            : t("dashboard.completed_processing_returned", "Completed / Processing / Returned")}
      </p>
    </div>
  </div>

  {isSuperAdmin ? (
    <div className="mt-6">
      <div className="grid grid-cols-12 gap-3 items-end h-72">
        {(subscriberSeries?.values || []).map((value, index) => {
          const maxSubscriber = Math.max(...(subscriberSeries?.values || [1]), 1);
          const height = value > 0 ? Math.max((value / maxSubscriber) * 100, 8) : 0;

          return (
            <div key={index} className="col-span-1 flex flex-col items-center justify-end h-full">
              <div className="text-[10px] text-slate-500 mb-2 font-bold">
                {value}
              </div>
              <div
                className="w-full rounded-t-xl"
                style={{
                  height: `${height}%`,
                  minHeight: value > 0 ? "12px" : "0px",
                  background: "linear-gradient(180deg, #1e4d2b 0%, #35a952 100%)",
                }}
                title={`${subscriberSeries?.labels?.[index]} : ${value}`}
              />
              <div className="text-[10px] text-slate-400 font-black mt-2 uppercase">
                {subscriberSeries?.labels?.[index]}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
        <div className="text-center p-3 rounded-xl bg-green-50 border border-green-100">
          <p className="text-[10px] uppercase tracking-widest font-black text-green-700">
            {t("dashboard.total_active_subscriptions", "Active Subscriptions")}
          </p>
          <p className="text-sm font-black text-green-800 mt-1">
            {Number(totalActiveSubscriptions).toLocaleString()}
          </p>
        </div>

        <div className="text-center p-3 rounded-xl bg-blue-50 border border-blue-100">
          <p className="text-[10px] uppercase tracking-widest font-black text-blue-700">
            {t("dashboard.subscription_value", "Subscription Value")}
          </p>
          <p className="text-sm font-black text-blue-800 mt-1">
            ৳{formatCurrency(subscriptionValue)}
          </p>
        </div>

        <div className="text-center p-3 rounded-xl bg-amber-50 border border-amber-100">
          <p className="text-[10px] uppercase tracking-widest font-black text-amber-700">
            {t("dashboard.total_subscription_profit", "Subscription Profit")}
          </p>
          <p className="text-sm font-black text-amber-800 mt-1">
            ৳{formatCurrency(totalSubscriptionProfit)}
          </p>
        </div>
      </div>
    </div>
  ) : (
    <div className="flex flex-col sm:flex-row items-center justify-around flex-1 gap-8 mt-6">
      <Donut
        completed={donut.completed}
        processing={donut.processing}
        returned={donut.returned}
        total={orderAnalytics?.totalOrders ?? 0}
        centerLabel={t("dashboard.total_purchases", "Total Purchases")}
      />

      <div className="space-y-4 w-full sm:w-auto">
        <LegendRow
          color="#1e4d2b"
          title={t("dashboard.completed_purchases", "Completed Purchases")}
          percent={donut.completed}
          count={orderAnalytics?.completedOrders ?? 0}
        />
        <LegendRow
          color="#35a952"
          title={t("dashboard.processing_purchases", "Processing Purchases")}
          percent={donut.processing}
          count={orderAnalytics?.activeProcessingOrders ?? 0}
        />
        <LegendRow
          color="#fbbf24"
          title={t("dashboard.returned_purchases", "Returned Purchases")}
          percent={donut.returned}
          count={orderAnalytics?.returnedOrders ?? 0}
        />
      </div>
    </div>
  )}
</div>
      </div>

      {/* Profit Highlight Section */}
      <div className="bg-white border border-slate-100 rounded-3xl shadow-sm p-6 flex flex-col sm:flex-row justify-between items-center gap-6">
        <div>
          <h3 className="text-lg font-black text-slate-800">
            {isCustomRangeActive
              ? t("dashboard.profit_for_range", `Profit Summary for Selected Range`)
              : t("dashboard.profit_highlight", "Profit Summary")}
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            {t("dashboard.profit_calculation", "Profit = Sales - Purchase Cost")}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-6">
          <div className="px-5 py-4 rounded-2xl bg-green-50 border border-green-100">
            <p className="text-[10px] uppercase tracking-widest font-black text-green-700">
              {t("dashboard.profit_margin", "Profit Margin")}
            </p>
            <h2 className="text-2xl font-black text-green-800 mt-1">
              {Number(profitMargin).toFixed(1)}%
            </h2>
          </div>

          <div className="px-5 py-4 rounded-2xl bg-[#1e4d2b] text-white shadow-lg">
            <p className="text-[10px] uppercase tracking-widest font-black opacity-80">
              {t("dashboard.net_profit", "Net Profit")}
            </p>
            <h2 className="text-2xl font-black mt-1">৳{formatCurrency(netProfitPeriod)}</h2>
          </div>

          <div className="px-5 py-4 rounded-2xl bg-amber-50 border border-amber-100">
            <p className="text-[10px] uppercase tracking-widest font-black text-amber-700">
              {t("dashboard.purchase_cost", "Purchase Cost")}
            </p>
            <h2 className="text-2xl font-black text-amber-800 mt-1">
              ৳{formatCurrency(purchaseCostPeriod)}
            </h2>
          </div>
        </div>
      </div>


 {isSuperAdmin && (
  <div className="bg-white border border-slate-100 rounded-3xl p-6 mt-6">
    <h3 className="text-lg font-black mb-4">
      {t("dashboard.select_user", "Select User")}
    </h3>

    <select
      value={selectedUser}
      onChange={handleUserChange}
      className="w-full border border-slate-200 rounded-xl p-3 text-sm font-bold"
    >
      <option value="">
        {t("dashboard.all_users", "All Users")}
      </option>

      {users.map((user) => (
        <option key={user.id} value={user.id}>
          {user.name}
        </option>
      ))}
    </select>
  </div>
)}


{isSuperAdmin && selectedUserId && selectedUserStats && (
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
  {[
    { label: t("dashboard.user_stats_sales", "Sales"), value: `৳${formatCurrency(selectedUserStats.sales)}` },
    { label: t("dashboard.user_stats_expense", "Total Expense"), value: `৳${formatCurrency(selectedUserStats.totalExpense)}` },
    { label: t("dashboard.user_stats_inventory", "Inventory Value"), value: `৳${formatCurrency(selectedUserStats.inventoryValue)}` },
    { label: t("dashboard.user_stats_profit", "Net Profit"), value: `৳${formatCurrency(selectedUserStats.netProfit)}` },
    { label: t("dashboard.user_stats_products", "Total Products"), value: selectedUserStats.totalProductQty },
    { label: t("dashboard.user_stats_thumbnails", "Thumbnails"), value: selectedUserStats.thumbnailCount },
    { label: t("dashboard.user_stats_account", "Account Value"), value: `৳${formatCurrency(selectedUserStats.accountValue)}` },
    { label: t("dashboard.user_stats_customers", "Total Customers"), value: selectedUserStats.totalCustomers },
  ].map((item, i) => (
    <div
      key={i}
      className="p-6 text-white relative overflow-hidden rounded-3xl"
    style={{
  background: "#1e4d2b",
  boxShadow: "0 10px 30px rgba(30, 77, 43, 0.12)",
}}
    >
      {/* background circle */}
      <div className="absolute -top-10 -right-10 w-28 h-28 rounded-full bg-white/10" />
      <div className="absolute -bottom-14 -left-14 w-40 h-40 rounded-full bg-white/10" />

      {/* label */}
      <p className="text-[10px] font-bold opacity-80 uppercase tracking-widest relative z-10">
        {item.label}
      </p>

      {/* value */}
      <div className="flex items-end justify-between mt-2 relative z-10">
        <h3 className="text-2xl lg:text-3xl font-black tracking-tight">
          {item.value}
        </h3>

        {/* icon placeholder */}
        <div className="p-2 rounded-xl bg-white/15">
        
        </div>
      </div>
    </div>
  ))}
</div>
)}


{!isSuperAdmin && (
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
  {stats.map((stat, index) => (
    <LowerStat
      key={index}
      title={stat.title}
      value={stat.value}
      sub={stat.sub}
      icon={stat.icon}
    />
  ))}
</div>

)}














      

      {/* ================= Sync banner ================= */}
      <div
        className="rounded-3xl p-4 lg:p-6 flex flex-col sm:flex-row items-center justify-between shadow-2xl gap-4"
        style={{
          background: "linear-gradient(180deg, #1e4d2b 0%, #35a952 100%)",
          boxShadow: "0 10px 30px rgba(30, 77, 43, 0.18)",
        }}
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-6 h-6 text-white" />
          </div>
          <div>
            <h4 className="text-white font-black text-sm">
              {isCustomRangeActive
                ? t("dashboard.summary_for_range", `Summary for Selected Range`)
                : t("dashboard.system_summary", "System Summary")}
            </h4>
            <p className="text-white/80 text-xs mt-0.5">
              {t("dashboard.detected", "Detected")} ৳{formatCurrency(periodSales)}{" "}
              {t("dashboard.from", "from")} {orderAnalytics?.totalOrders ?? 0}{" "}
              {t("dashboard.purchases", "purchases")}
            </p>
          </div>
        </div>

        <button
          onClick={refreshDashboard}
          className="w-full sm:w-auto bg-white text-[#1e4d2b] text-[11px] font-black px-8 py-3 rounded-2xl uppercase hover:scale-[1.02] transition-transform shadow-lg flex items-center gap-2"
          disabled={loading}
        >
          {loading ? (
            <>
              <span className="animate-spin rounded-full h-3 w-3 border-b-2 border-[#35a952]"></span>
              {t("dashboard.syncing", "Syncing...")}
            </>
          ) : (
            t("dashboard.sync_now", "Sync Now")
          )}
        </button>
      </div>

      {/* ================= Quick Actions ================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button
          onClick={() => router.visit(route("sales.create"))}
          className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-xl hover:border-[#1e4d2b] transition-all group"
        >
          <span className="text-xs font-black uppercase tracking-widest text-gray-700">
            {t("dashboard.new_sale", "New Sale")}
          </span>
          <Plus size={16} className="text-gray-300 group-hover:text-[#1e4d2b]" />
        </button>

        <button
          onClick={() => router.visit(route("warehouse.list"))}
          className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-xl hover:border-[#35a952] transition-all group"
        >
          <span className="text-xs font-black uppercase tracking-widest text-gray-700">
            {t("dashboard.inventory", "Inventory")}
          </span>
          <Package size={16} className="text-gray-300 group-hover:text-[#35a952]" />
        </button>
      </div>
    </div>
  );
}

/* ================= small components ================= */

function LegendRow({ color, title, percent, count }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
      <div className="flex flex-col">
        <span className="text-[10px] font-black text-slate-400 uppercase leading-none mb-1">
          {title}
        </span>
        <span className="text-sm font-black text-slate-700">{percent}%</span>
        <span className="text-[10px] text-slate-500">{count}</span>
      </div>
    </div>
  );
}

function Donut({ completed, processing, returned, total, centerLabel }) {
  const c = Number(completed || 0);
  const p = Number(processing || 0);
  const r = Number(returned || 0);

  const c2 = Math.max(0, Math.min(100, c));
  const p2 = Math.max(0, Math.min(100, p));
  const r2 = Math.max(0, Math.min(100, r));

  return (
    <div className="relative w-44 h-44 lg:w-52 lg:h-52">
      <svg viewBox="0 0 36 36" className="w-full h-full rotate-[-90deg]">
        <circle cx="18" cy="18" r="16" fill="none" stroke="#f1f5f9" strokeWidth="4" />

        <circle
          cx="18"
          cy="18"
          r="16"
          fill="none"
          stroke="#1e4d2b"
          strokeWidth="5"
          strokeDasharray={`${c2}, 100`}
          strokeLinecap="round"
        />
        <circle
          cx="18"
          cy="18"
          r="16"
          fill="none"
          stroke="#35a952"
          strokeWidth="5"
          strokeDasharray={`${p2}, 100`}
          strokeDashoffset={`-${c2}`}
          strokeLinecap="round"
        />
        <circle
          cx="18"
          cy="18"
          r="16"
          fill="none"
          stroke="#fbbf24"
          strokeWidth="5"
          strokeDasharray={`${r2}, 100`}
          strokeDashoffset={`-${c2 + p2}`}
          strokeLinecap="round"
        />
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-black text-slate-800 tracking-tighter">{total ?? 0}</span>
        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
          {centerLabel}
        </span>
      </div>
    </div>
  );
}

function LowerStat({ title, value, sub, icon }) {
  return (
    <div className="bg-[#1e4d2b] text-white p-6 rounded-3xl relative h-36 flex flex-col justify-between overflow-hidden">
      <div className="absolute -top-10 -right-10 w-28 h-28 rounded-full bg-white/10" />
      <div className="absolute -bottom-16 -left-16 w-44 h-44 rounded-full bg-white/10" />

      <div className="z-10">
        <h2 className="text-xl font-black">{value}</h2>
        <p className="text-[10px] font-black opacity-70 uppercase tracking-widest mt-1">{title}</p>
        <p className="text-[10px] opacity-80 mt-2">{sub}</p>
      </div>

      <div className="z-10 flex justify-end items-end">
        <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded-full">Details</span>
      </div>

      <div className="absolute right-4 bottom-2">{icon}</div>
    </div>
  );
}