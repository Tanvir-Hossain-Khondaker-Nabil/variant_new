<?php

namespace App\Http\Controllers;

use App\Models\Expense;
use App\Models\ExpenseCategory;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Carbon\Carbon;

class ExpenseReportController extends Controller
{
    public function monthlyCost(Request $request)
    {
        $month = $request->month ?? now()->format('Y-m');

        $startDate = Carbon::parse($month . '-01')->startOfMonth()->toDateString();
        $endDate = Carbon::parse($month . '-01')->endOfMonth()->toDateString();

        $baseQuery = Expense::query()
            ->with('category')
            ->whereBetween('date', [$startDate, $endDate]);

        if ($request->filled('category_id')) {
            $baseQuery->where('category_id', $request->category_id);
        }

        if ($request->filled('cost_type')) {
            $baseQuery->where('cost_type', $request->cost_type);
        }

        $expenses = (clone $baseQuery)
            ->orderByDesc('date')
            ->get();

        $summary = [
            'total_cost' => (clone $baseQuery)->sum('amount'),
            'daily_cost' => (clone $baseQuery)->where('cost_type', 'daily')->sum('amount'),
            'monthly_cost' => (clone $baseQuery)->where('cost_type', 'monthly')->sum('amount'),
            'petty_cash_cost' => (clone $baseQuery)->where('is_petty_cash_expense', true)->sum('amount'),
            'normal_account_cost' => (clone $baseQuery)
                ->where(function ($q) {
                    $q->where('is_petty_cash_expense', false)
                        ->orWhereNull('is_petty_cash_expense');
                })
                ->sum('amount'),
        ];

        $categorySummary = (clone $baseQuery)
            ->select(
                'category_id',
                DB::raw('COUNT(*) as total_entry'),
                DB::raw('SUM(amount) as total_amount')
            )
            ->groupBy('category_id')
            ->with('category:id,name')
            ->orderByDesc('total_amount')
            ->get();

        $dailySummary = (clone $baseQuery)
            ->select(
                'date',
                DB::raw('COUNT(*) as total_entry'),
                DB::raw('SUM(amount) as total_amount')
            )
            ->groupBy('date')
            ->orderBy('date')
            ->get();

        return Inertia::render('expenses/reports/MonthlyCost', [
            'expenses' => $expenses,
            'categories' => ExpenseCategory::orderBy('name')->get(),
            'filters' => [
                'month' => $month,
                'category_id' => $request->category_id,
                'cost_type' => $request->cost_type,
            ],
            'summary' => $summary,
            'categorySummary' => $categorySummary,
            'dailySummary' => $dailySummary,
        ]);
    }
}