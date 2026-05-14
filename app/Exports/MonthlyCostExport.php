<?php

namespace App\Exports;

use App\Models\Expense;
use Carbon\Carbon;
use Maatwebsite\Excel\Concerns\FromArray;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;

class MonthlyCostExport implements FromArray, ShouldAutoSize
{
    public function __construct(
        public string $month,
        public ?string $categoryId = null,
        public ?string $costType = null
    ) {}

    public function array(): array
    {
        $startDate = Carbon::parse($this->month . '-01')->startOfMonth()->toDateString();
        $endDate = Carbon::parse($this->month . '-01')->endOfMonth()->toDateString();

        $query = Expense::with('category')
            ->whereBetween('date', [$startDate, $endDate]);

        if ($this->categoryId) {
            $query->where('category_id', $this->categoryId);
        }

        if ($this->costType) {
            $query->where('cost_type', $this->costType);
        }

        $expenses = $query->orderBy('date')->get();

        $rows = [
            ['Monthly Cost Report'],
            ['Month', $this->month],
            ['Date Range', $startDate . ' to ' . $endDate],
            [],
            ['Date', 'Category', 'Details', 'Cost Type', 'Payment Source', 'Amount'],
        ];

        foreach ($expenses as $expense) {
            $rows[] = [
                $expense->date,
                $expense->category?->name ?? 'Uncategorized',
                $expense->details ?? '-',
                ucfirst($expense->cost_type ?? 'daily'),
                $expense->is_petty_cash_expense ? 'Petty Cash' : 'Normal Account',
                $expense->amount,
            ];
        }

        $rows[] = [];
        $rows[] = ['Total', '', '', '', '', $expenses->sum('amount')];

        return $rows;
    }
}