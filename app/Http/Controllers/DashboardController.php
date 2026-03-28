<?php

namespace App\Http\Controllers;

use App\Models\Expense;
use App\Models\Sale;
use App\Models\Customer;
use App\Models\Damage;
use App\Models\SaleItem;
use App\Models\Stock;
use App\Models\Purchase;
use App\Models\Subscription;
use App\Models\SubscriptionPayment;
use App\Models\User;
use App\Models\UserDeposit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class DashboardController extends Controller
{
    public function index(Request $request)
    {
        // Handle date range parameters
        $range = $request->get('timeRange', 'year');
        $dateFrom = $request->get('date_from');
        $dateTo = $request->get('date_to');

        $payload = $this->buildDashboardPayload($range, $dateFrom, $dateTo);

        return inertia('Dashboard', $payload);
    }

    public function data(Request $request, string $range)
    {
        $dateFrom = $request->get('date_from');
        $dateTo = $request->get('date_to');

        $payload = $this->buildDashboardPayload($range, $dateFrom, $dateTo);

        return response()->json([
            'success' => true,
            'dashboardData' => $payload['dashboardData'],
            'totalSales' => $payload['totalSales'],
            'totalPaid' => $payload['totalPaid'],
            'totalDue' => $payload['totalDue'],
            'totalselas' => $payload['totalselas'],
            'totalexpense' => $payload['totalexpense'],
            'isShadowUser' => $payload['isShadowUser'],
        ]);
    }

    private function buildDashboardPayload(string $range, ?string $dateFrom = null, ?string $dateTo = null): array
    {
       $user = Auth::user();
       $selectedUserId = request()->get('user_id');
$isShadowUser = ($user->type ?? null) === 'shadow';

// Role check
$isSuperAdmin = $user && $user->hasRole('Super Admin');
$isAdmin = $user && $user->hasRole('Admin');

// Permission check
$permissions = [
    'plansView' => $user && $user->can('plans.view'),
    'subscriptionsView' => $user && $user->can('subscriptions.view'),
    'usersView' => $user && $user->can('users.view'),
    'depositsView' => $user && $user->can('deposits.view'),
];



        // columns (sale)
        $salesTotalCol = $isShadowUser ? 'shadow_grand_total' : 'grand_total';
        $paidCol = $isShadowUser ? 'shadow_paid_amount' : 'paid_amount';
        $dueCol = $isShadowUser ? 'shadow_due_amount' : 'due_amount';

        // columns (purchase)
        $purchaseTotalCol = $isShadowUser ? 'shadow_grand_total' : 'grand_total';

        // stock purchase col
        $stockPurchaseCol = $isShadowUser ? 'shadow_purchase_price' : 'purchase_price';

        // ---------------- Resolve Date Range ----------------
        if ($dateFrom && $dateTo) {
            // Custom date range
            $from = Carbon::parse($dateFrom)->startOfDay();
            $to = Carbon::parse($dateTo)->endOfDay();

            // For previous period comparison (same length as selected range)
            $daysDiff = $from->diffInDays($to);
            $prevFrom = $from->copy()->subDays($daysDiff + 1);
            $prevTo = $from->copy()->subDay();

            $labelMode = 'day';
            $range = 'custom';
        } elseif ($dateFrom) {
            // Single date (backward compatibility)
            $from = Carbon::parse($dateFrom)->startOfDay();
            $to = Carbon::parse($dateFrom)->endOfDay();

            $prevFrom = $from->copy()->subDay();
            $prevTo = $to->copy()->subDay();

            $labelMode = 'hour';
            $range = 'today';
        } else {
            // Predefined range
            [$from, $to, $prevFrom, $prevTo, $labelMode] = $this->resolveRange($range);
        }

        // Rest of your existing code remains exactly the same...
        // =========================
        // SALES BASE
        // =========================
$salesBase = Sale::query()
    ->when($selectedUserId, function ($q) use ($selectedUserId) {
        $q->where('owner_id', $selectedUserId);
    })
    ->whereBetween('created_at', [$from, $to]);
$salesPrev = Sale::query()
    ->when($selectedUserId, function ($q) use ($selectedUserId) {
        $q->where('owner_id', $selectedUserId);
    })
    ->whereBetween('created_at', [$prevFrom, $prevTo]);
        // All-time (sales)
        $totalSales = (float) Sale::selectRaw("COALESCE(SUM($salesTotalCol),0) as total")->value('total');
        $totalPaid = (float) Sale::selectRaw("COALESCE(SUM($paidCol),0) as total")->value('total');
        $totalDue = (float) Sale::selectRaw("COALESCE(SUM($dueCol),0) as total")->value('total');
        $totalOrders = (int) Sale::count();

        // Period (sales)
        $periodSales = (float) $salesBase->clone()
            ->selectRaw("COALESCE(SUM($salesTotalCol),0) as total")
            ->value('total');

        $prevSales = (float) $salesPrev->clone()
            ->selectRaw("COALESCE(SUM($salesTotalCol),0) as total")
            ->value('total');

        $salesGrowth = $prevSales > 0 ? (($periodSales - $prevSales) / $prevSales) * 100 : 0;

        // FIXED: Period Paid + Due (Sale report)
        $periodPaid = (float) $salesBase->clone()
            ->selectRaw("COALESCE(SUM($paidCol),0) as total")
            ->value('total');

        $periodDue = (float) $salesBase->clone()
            ->selectRaw("COALESCE(SUM($dueCol),0) as total")
            ->value('total');

        // Sales series
        $salesSeries = $this->buildSalesSeries($labelMode, $from, $to, $salesTotalCol);
        // now
        // Profit series
$profitSeries = $this->buildProfitSeries($labelMode, $from, $to, $salesTotalCol, $stockPurchaseCol);

// Subscriber series
$subscriberSeries = $this->buildSubscriberSeries($labelMode, $from, $to);

        // Total expense for period
   $totalExpense = (float) Expense::query()
    ->when($selectedUserId, fn($q) => $q->where('owner_id', $selectedUserId))
    ->whereBetween('created_at', [$from, $to])
    ->selectRaw("COALESCE(SUM(amount),0) as total")
    ->value('total');

        // =========================
        // PURCHASE COST (COGS)
        // =========================
        $purchaseCost = (float) SaleItem::query()
            ->join('sales', 'sale_items.sale_id', '=', 'sales.id')
            ->leftJoin('stocks', 'sale_items.stock_id', '=', 'stocks.id')
            ->whereBetween('sales.created_at', [$from, $to])
            ->selectRaw('COALESCE(SUM(sale_items.quantity * stocks.' . $stockPurchaseCol . '),0) as total')
            ->value('total');

        // Profit Calculation
        $netProfit = $periodSales - $purchaseCost;
        $profitMargin = $periodSales > 0 ? (($netProfit) / $periodSales) * 100 : 0;

        // =========================
        // PURCHASE ANALYTICS
        // =========================
        $purchaseBase = Purchase::query()->whereBetween(
            'purchase_date',
            [$from->toDateString(), $to->toDateString()]
        );

        $purchasePeriodCount = (int) $purchaseBase->clone()->count();

        $purchaseStatusCounts = $purchaseBase->clone()
            ->select('status', DB::raw('COUNT(*) as c'))
            ->groupBy('status')
            ->pluck('c', 'status')
            ->toArray();

        $purchaseCompleted = (int) ($purchaseStatusCounts['completed'] ?? 0);
        $purchasePending = (int) ($purchaseStatusCounts['pending'] ?? 0);
        $purchaseReturned = (int) ($purchaseStatusCounts['returned'] ?? 0);
        $purchaseCancelled = (int) ($purchaseStatusCounts['cancelled'] ?? 0);

        $purchaseProcessing = $purchasePending;
        $purchaseDonut = $this->percentTriplet($purchaseCompleted, $purchaseProcessing, $purchaseReturned);

        $purchasePeriodTotal = (float) $purchaseBase->clone()
            ->selectRaw("COALESCE(SUM($purchaseTotalCol),0) as total")
            ->value('total');

        $avgPurchaseValue = $purchasePeriodCount > 0 ? ($purchasePeriodTotal / $purchasePeriodCount) : 0;

        // =========================
        // CUSTOMERS
        // =========================
$totalCustomers = (int) Customer::query()
    ->when($selectedUserId, fn($q) => $q->where('owner_id', $selectedUserId))
    ->count();
            $activeCustomers = (int) Customer::where('is_active', true)->count();

        $buyersThisPeriod = (int) $salesBase->clone()
            ->whereNotNull('customer_id')
            ->distinct('customer_id')
            ->count('customer_id');

        $conversionRate = $activeCustomers > 0 ? ($buyersThisPeriod / $activeCustomers) * 100 : 0;

        // =========================
/// =========================
// SUBSCRIPTIONS
// =========================
$totalActiveSubscriptions = (int) Subscription::where('status', 1)->count();

// Active subscription current value (sum of active plans price)
$subscriptionValue = (float) Subscription::query()
    ->join('plans', 'subscriptions.plan_id', '=', 'plans.id')
    ->where('subscriptions.status', 1)
    ->selectRaw('COALESCE(SUM(plans.price),0) as total')
    ->value('total');

// Total subscription received/profit (practical profit)
$totalSubscriptionProfit = (float) SubscriptionPayment::query()
    ->where('status', 'completed')
    ->selectRaw('COALESCE(SUM(amount),0) as total')
    ->value('total');

// All user deposits total
$userTotalDeposit = (float) UserDeposit::query()
    ->selectRaw('COALESCE(SUM(amount),0) as total')
    ->value('total');

        // =========================
        // INVENTORY
        // =========================
        $inventoryValue = (float) Stock::selectRaw("COALESCE(SUM(quantity * $stockPurchaseCol),0) as value")
            ->value('value');

        $lowStockItems = (int) Stock::where('quantity', '<=', 10)->where('quantity', '>', 0)->count();
        $outOfStockItems = (int) Stock::where('quantity', '<=', 0)->count();

        // =========================
        // EXPENSES (all time only)
        // =========================
        $totalExpensesAllTime = (float) Expense::sum('amount');


        // =========================
// SELECTED USER STATS
// =========================
$selectedUserStats = null;

if ($isSuperAdmin && $selectedUserId) {

    // 1. Sales
    $userSales = (float) Sale::where('owner_id', $selectedUserId)
        ->whereBetween('created_at', [$from, $to])
        ->selectRaw("COALESCE(SUM($salesTotalCol),0) as total")
        ->value('total');

    // 2. Total Expense
    $userExpense = (float) Expense::where('owner_id', $selectedUserId)
        ->whereBetween('created_at', [$from, $to])
        ->selectRaw("COALESCE(SUM(amount),0) as total")
        ->value('total');

    // 3. Inventory Value
    $userInventoryValue = (float) Stock::where('owner_id', $selectedUserId)
        ->selectRaw("COALESCE(SUM(quantity * $stockPurchaseCol),0) as value")
        ->value('value');

    // 4. Net Profit
    $userPurchaseCost = (float) SaleItem::query()
        ->join('sales', 'sale_items.sale_id', '=', 'sales.id')
        ->leftJoin('stocks', 'sale_items.stock_id', '=', 'stocks.id')
        ->where('sales.owner_id', $selectedUserId)
        ->whereBetween('sales.created_at', [$from, $to])
        ->selectRaw('COALESCE(SUM(sale_items.quantity * stocks.' . $stockPurchaseCol . '),0) as total')
        ->value('total');

    $userNetProfit = $userSales - $userPurchaseCost;

    // 5. Total Product Quantity
    $userTotalProductQty = (int) Stock::where('owner_id', $selectedUserId)
        ->selectRaw("COALESCE(SUM(quantity),0) as total")
        ->value('total');

    // 6. Thumbnail count (photo column)
    $userThumbnailCount = (int) \App\Models\Product::where('owner_id', $selectedUserId)
        ->whereNotNull('photo')
        ->where('photo', '!=', '')
        ->count();

    // 7. Account Value
    $userAccountValue = (float) UserDeposit::where('owner_id', $selectedUserId)
        ->selectRaw("COALESCE(SUM(amount),0) as total")
        ->value('total');

    // 8. Total Customers
    $userTotalCustomers = (int) Customer::where('owner_id', $selectedUserId)
        ->count();

    $selectedUserStats = [
        'sales'           => round($userSales, 2),
        'totalExpense'    => round($userExpense, 2),
        'inventoryValue'  => round($userInventoryValue, 2),
        'netProfit'       => round($userNetProfit, 2),
        'totalProductQty' => $userTotalProductQty,
        'thumbnailCount'  => $userThumbnailCount,
        'accountValue'    => round($userAccountValue, 2),
        'totalCustomers'  => $userTotalCustomers,
    ];
}

        // =========================
        // TOP PRODUCTS
        // =========================
        $topProducts = SaleItem::query()
            ->join('sales', 'sale_items.sale_id', '=', 'sales.id')
            ->leftJoin('products', 'sale_items.product_id', '=', 'products.id')
            ->whereBetween('sales.created_at', [$from, $to])
            ->selectRaw('sale_items.product_id as product_id')
            ->selectRaw("COALESCE(products.name, CONCAT('Product #', sale_items.product_id)) as name")
            ->selectRaw('SUM(sale_items.quantity) as total_quantity')
            ->selectRaw('SUM(sale_items.total_price) as total_sales')
            ->groupBy('sale_items.product_id', 'products.name')
            ->orderByDesc('total_sales')
            ->limit(5)
            ->get()
            ->map(function ($row) use ($prevFrom, $prevTo) {
                $current = (float) $row->total_sales;

                $prev = (float) SaleItem::query()
                    ->join('sales', 'sale_items.sale_id', '=', 'sales.id')
                    ->whereBetween('sales.created_at', [$prevFrom, $prevTo])
                    ->where('sale_items.product_id', $row->product_id)
                    ->sum('sale_items.total_price');

                $growth = $prev > 0 ? (($current - $prev) / $prev) * 100 : 0;

                return [
                    'id' => $row->product_id,
                    'name' => $row->name,
                    'sales' => $current,
                    'quantity' => (int) $row->total_quantity,
                    'growth' => round($growth, 1),
                ];
            });

        // =========================
        // Recent Activities
        // =========================
        $recentActivities = $salesBase->clone()
            ->latest()
            ->limit(5)
            ->get()
            ->map(function ($sale) use ($salesTotalCol) {
                return [
                    'id' => $sale->id,
                    'type' => 'sale',
                    'user' => 'Customer',
                    'action' => 'Completed sale ' . ($sale->invoice_no ?? ''),
                    'time' => Carbon::parse($sale->created_at)->diffForHumans(),
                    'amount' => (float) ($sale->{$salesTotalCol} ?? 0),
                ];
            })
            ->values()
            ->toArray();

        // =========================
        // payload
        // =========================
        $dashboardData = [
            'range' => $range,
            'dateFrom' => $dateFrom,
            'dateTo' => $dateTo,

            'profitSeries' => $profitSeries,
'subscriberSeries' => $subscriberSeries,

            // sales
            'periodSales' => $periodSales,
            'prevPeriodSales' => $prevSales,
            'salesGrowth' => round($salesGrowth, 1),

            'periodPaid' => round($periodPaid, 2),
            'periodDue' => round($periodDue, 2),

            'purchaseCost' => round($purchaseCost, 2),
            'totalExpense' => round($totalExpense, 2),

            // customers
            'totalCustomers' => $totalCustomers,
            'activeCustomers' => $activeCustomers,
            'buyersThisPeriod' => $buyersThisPeriod,
            'conversionRate' => round($conversionRate, 1),

            // inventory
            'inventoryValue' => $inventoryValue,
            'lowStockItems' => $lowStockItems,
            'outOfStockItems' => $outOfStockItems,

            'profitMargin' => round($profitMargin, 1),
            'averageOrderValue' => round($avgPurchaseValue, 2),

            // purchase analytics
            'orderAnalytics' => [
                'totalOrders' => $purchasePeriodCount,
                'completedOrders' => $purchaseCompleted,
                'activeProcessingOrders' => $purchaseProcessing,
                'returnedOrders' => $purchaseReturned,
                'cancelledOrders' => $purchaseCancelled,
            ],
            'donutPercentages' => $purchaseDonut,

            // chart + lists
            'salesSeries' => $salesSeries,
            'topProducts' => $topProducts,
            'recentActivities' => $recentActivities,

            // meta
            'rangeFrom' => $from->toDateTimeString(),
            'rangeTo' => $to->toDateTimeString(),
            'prevRangeFrom' => $prevFrom->toDateTimeString(),
            'prevRangeTo' => $prevTo->toDateTimeString(),
            'labelMode' => $labelMode,


                // subscriptions
        'totalActiveSubscriptions' => $totalActiveSubscriptions,
'subscriptionValue' => round($subscriptionValue, 2),
'totalSubscriptionProfit' => round($totalSubscriptionProfit, 2),
'userTotalDeposit' => round($userTotalDeposit, 2),
        ];

        return [
            'dashboardData' => $dashboardData,
            'totalSales' => $totalSales,
            'totalPaid' => $totalPaid,
            'totalDue' => $totalDue,
            'totalselas' => $totalOrders,
            'totalexpense' => $totalExpensesAllTime,
            'isShadowUser' => $isShadowUser,




              // ✅ role
    'isSuperAdmin' => $isSuperAdmin,
    'isAdmin' => $isAdmin,

    // ✅ permissions
    'permissions' => $permissions,

      'users' => User::select('id', 'name')->get(),
    'selectedUserId' => $selectedUserId,
    'selectedUserStats' => $selectedUserStats,
        ];
    }

    private function resolveRange(string $range): array
    {
        $now = Carbon::now();

        if ($range === 'today') {
            $from = $now->copy()->startOfDay();
            $to = $now->copy()->endOfDay();

            $prevFrom = $from->copy()->subDay();
            $prevTo = $to->copy()->subDay();

            return [$from, $to, $prevFrom, $prevTo, 'hour'];
        }

        if ($range === 'week') {
            $from = $now->copy()->startOfWeek();
            $to = $now->copy()->endOfWeek();

            $prevFrom = $from->copy()->subWeek();
            $prevTo = $to->copy()->subWeek();

            return [$from, $to, $prevFrom, $prevTo, 'day'];
        }

        if ($range === 'month') {
            $from = $now->copy()->startOfMonth();
            $to = $now->copy()->endOfMonth();

            $prevFrom = $from->copy()->subMonth()->startOfMonth();
            $prevTo = $from->copy()->subMonth()->endOfMonth();

            return [$from, $to, $prevFrom, $prevTo, 'day'];
        }

        // year
        $from = $now->copy()->startOfYear();
        $to = $now->copy()->endOfYear();

        $prevFrom = $from->copy()->subYear()->startOfYear();
        $prevTo = $from->copy()->subYear()->endOfYear();

        return [$from, $to, $prevFrom, $prevTo, 'month'];
    }

    private function buildSalesSeries(string $mode, Carbon $from, Carbon $to, string $salesTotalCol): array
    {
        if ($mode === 'hour') {
            $rows = Sale::query()
                ->whereBetween('created_at', [$from, $to])
                ->selectRaw('HOUR(created_at) as k')
                ->selectRaw("COALESCE(SUM($salesTotalCol),0) as v")
                ->groupBy('k')
                ->orderBy('k')
                ->get();

            $map = $rows->pluck('v', 'k')->toArray();

            $labels = [];
            $values = [];
            for ($h = 0; $h < 24; $h++) {
                $labels[] = str_pad((string) $h, 2, '0', STR_PAD_LEFT) . ':00';
                $values[] = (float) ($map[$h] ?? 0);
            }
            return compact('labels', 'values');
        }

        if ($mode === 'day') {
            $rows = Sale::query()
                ->whereBetween('created_at', [$from, $to])
                ->selectRaw('DATE(created_at) as k')
                ->selectRaw("COALESCE(SUM($salesTotalCol),0) as v")
                ->groupBy('k')
                ->orderBy('k')
                ->get();

            $map = $rows->pluck('v', 'k')->toArray();

            $labels = [];
            $values = [];
            $cursor = $from->copy()->startOfDay();
            while ($cursor->lte($to)) {
                $k = $cursor->toDateString();
                $labels[] = $cursor->format('d M');
                $values[] = (float) ($map[$k] ?? 0);
                $cursor->addDay();
            }
            return compact('labels', 'values');
        }

        // month buckets (Jan–Dec)
        $rows = Sale::query()
            ->whereBetween('created_at', [$from, $to])
            ->selectRaw('MONTH(created_at) as k')
            ->selectRaw("COALESCE(SUM($salesTotalCol),0) as v")
            ->groupBy('k')
            ->orderBy('k')
            ->get();

        $map = $rows->pluck('v', 'k')->toArray();

        $labels = [];
        $values = [];
        for ($m = 1; $m <= 12; $m++) {
            $labels[] = Carbon::createFromDate($from->year, $m, 1)->format('M');
            $values[] = (float) ($map[$m] ?? 0);
        }

        return compact('labels', 'values');
    }



    private function buildProfitSeries(string $mode, Carbon $from, Carbon $to, string $salesTotalCol, string $stockPurchaseCol): array
{
    if ($mode === 'hour') {
        $labels = [];
        $values = [];

        for ($h = 0; $h < 24; $h++) {
            $start = $from->copy()->hour($h)->minute(0)->second(0);
            $end = $start->copy()->endOfHour();

            $sales = (float) Sale::query()
                ->whereBetween('created_at', [$start, $end])
                ->selectRaw("COALESCE(SUM($salesTotalCol),0) as total")
                ->value('total');

            $purchaseCost = (float) SaleItem::query()
                ->join('sales', 'sale_items.sale_id', '=', 'sales.id')
                ->leftJoin('stocks', 'sale_items.stock_id', '=', 'stocks.id')
                ->whereBetween('sales.created_at', [$start, $end])
                ->selectRaw('COALESCE(SUM(sale_items.quantity * stocks.' . $stockPurchaseCol . '),0) as total')
                ->value('total');

            $labels[] = str_pad((string) $h, 2, '0', STR_PAD_LEFT) . ':00';
            $values[] = round($sales - $purchaseCost, 2);
        }

        return compact('labels', 'values');
    }

    if ($mode === 'day') {
        $labels = [];
        $values = [];

        $cursor = $from->copy()->startOfDay();
        while ($cursor->lte($to)) {
            $start = $cursor->copy()->startOfDay();
            $end = $cursor->copy()->endOfDay();

            $sales = (float) Sale::query()
                ->whereBetween('created_at', [$start, $end])
                ->selectRaw("COALESCE(SUM($salesTotalCol),0) as total")
                ->value('total');

            $purchaseCost = (float) SaleItem::query()
                ->join('sales', 'sale_items.sale_id', '=', 'sales.id')
                ->leftJoin('stocks', 'sale_items.stock_id', '=', 'stocks.id')
                ->whereBetween('sales.created_at', [$start, $end])
                ->selectRaw('COALESCE(SUM(sale_items.quantity * stocks.' . $stockPurchaseCol . '),0) as total')
                ->value('total');

            $labels[] = $cursor->format('d M');
            $values[] = round($sales - $purchaseCost, 2);

            $cursor->addDay();
        }

        return compact('labels', 'values');
    }

    // month
    $labels = [];
    $values = [];

    for ($m = 1; $m <= 12; $m++) {
        $start = Carbon::createFromDate($from->year, $m, 1)->startOfMonth();
        $end = Carbon::createFromDate($from->year, $m, 1)->endOfMonth();

        $sales = (float) Sale::query()
            ->whereBetween('created_at', [$start, $end])
            ->selectRaw("COALESCE(SUM($salesTotalCol),0) as total")
            ->value('total');

        $purchaseCost = (float) SaleItem::query()
            ->join('sales', 'sale_items.sale_id', '=', 'sales.id')
            ->leftJoin('stocks', 'sale_items.stock_id', '=', 'stocks.id')
            ->whereBetween('sales.created_at', [$start, $end])
            ->selectRaw('COALESCE(SUM(sale_items.quantity * stocks.' . $stockPurchaseCol . '),0) as total')
            ->value('total');

        $labels[] = $start->format('M');
        $values[] = round($sales - $purchaseCost, 2);
    }

    return compact('labels', 'values');
}



private function buildSubscriberSeries(string $mode, Carbon $from, Carbon $to): array
{
    if ($mode === 'hour') {
        $rows = SubscriptionPayment::query()
            ->where('status', 'completed')
            ->whereBetween('created_at', [$from, $to])
            ->selectRaw('HOUR(created_at) as k')
            ->selectRaw('COUNT(*) as v')
            ->groupBy('k')
            ->orderBy('k')
            ->get();

        $map = $rows->pluck('v', 'k')->toArray();

        $labels = [];
        $values = [];
        for ($h = 0; $h < 24; $h++) {
            $labels[] = str_pad((string) $h, 2, '0', STR_PAD_LEFT) . ':00';
            $values[] = (int) ($map[$h] ?? 0);
        }

        return compact('labels', 'values');
    }

    if ($mode === 'day') {
        $rows = SubscriptionPayment::query()
            ->where('status', 'completed')
            ->whereBetween('created_at', [$from, $to])
            ->selectRaw('DATE(created_at) as k')
            ->selectRaw('COUNT(*) as v')
            ->groupBy('k')
            ->orderBy('k')
            ->get();

        $map = $rows->pluck('v', 'k')->toArray();

        $labels = [];
        $values = [];
        $cursor = $from->copy()->startOfDay();

        while ($cursor->lte($to)) {
            $k = $cursor->toDateString();
            $labels[] = $cursor->format('d M');
            $values[] = (int) ($map[$k] ?? 0);
            $cursor->addDay();
        }

        return compact('labels', 'values');
    }

    // month
    $rows = SubscriptionPayment::query()
        ->where('status', 'completed')
        ->whereBetween('created_at', [$from, $to])
        ->selectRaw('MONTH(created_at) as k')
        ->selectRaw('COUNT(*) as v')
        ->groupBy('k')
        ->orderBy('k')
        ->get();

    $map = $rows->pluck('v', 'k')->toArray();

    $labels = [];
    $values = [];

    for ($m = 1; $m <= 12; $m++) {
        $labels[] = Carbon::createFromDate($from->year, $m, 1)->format('M');
        $values[] = (int) ($map[$m] ?? 0);
    }

    return compact('labels', 'values');
}

    private function percentTriplet(int $a, int $b, int $c): array
    {
        $total = $a + $b + $c;

        if ($total <= 0) {
            return ['completed' => 0, 'processing' => 0, 'returned' => 0];
        }

        $pa = (int) round(($a / $total) * 100);
        $pb = (int) round(($b / $total) * 100);
        $pc = (int) round(($c / $total) * 100);

        $sum = $pa + $pb + $pc;
        $diff = 100 - $sum;

        $arr = [
            ['k' => 'completed', 'v' => $pa],
            ['k' => 'processing', 'v' => $pb],
            ['k' => 'returned', 'v' => $pc],
        ];

        usort($arr, fn($x, $y) => $y['v'] <=> $x['v']);
        $arr[0]['v'] += $diff;

        $out = [];
        foreach ($arr as $it) {
            $out[$it['k']] = max(0, (int) $it['v']);
        }

        return $out;
    }
}