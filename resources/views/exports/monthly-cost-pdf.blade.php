<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Monthly Cost Report</title>
    <style>
        body { font-family: DejaVu Sans, sans-serif; font-size: 11px; color: #111827; }
        .header { text-align: center; border-bottom: 2px solid #111827; padding-bottom: 12px; margin-bottom: 20px; }
        .header h1 { margin: 0; font-size: 22px; text-transform: uppercase; }
        .header p { margin: 4px 0; color: #6b7280; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 14px; }
        th { background: #111827; color: #fff; padding: 7px; text-align: left; font-size: 10px; text-transform: uppercase; }
        td { border: 1px solid #e5e7eb; padding: 7px; }
        .right { text-align: right; }
        .title { font-size: 14px; font-weight: bold; margin: 18px 0 8px; text-transform: uppercase; }
        .total-row { font-weight: bold; background: #f3f4f6; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Monthly Cost Report</h1>
        <p>Month: {{ $month }}</p>
        <p>Date Range: {{ $startDate }} to {{ $endDate }}</p>
    </div>

    <table>
        <tr>
            <td><strong>Total Cost</strong></td>
            <td class="right">BDT {{ number_format($summary['total_cost'], 2) }}</td>
            <td><strong>Daily Cost</strong></td>
            <td class="right">BDT {{ number_format($summary['daily_cost'], 2) }}</td>
        </tr>
        <tr>
            <td><strong>Monthly Cost</strong></td>
            <td class="right">BDT {{ number_format($summary['monthly_cost'], 2) }}</td>
            <td><strong>Petty Cash</strong></td>
            <td class="right">BDT {{ number_format($summary['petty_cash_cost'], 2) }}</td>
        </tr>
        <tr>
            <td><strong>Normal Account</strong></td>
            <td class="right">BDT {{ number_format($summary['normal_account_cost'], 2) }}</td>
            <td></td>
            <td></td>
        </tr>
    </table>

    <div class="title">Category Summary</div>

    <table>
        <thead>
            <tr>
                <th>Category</th>
                <th>Total Entry</th>
                <th class="right">Amount</th>
            </tr>
        </thead>
        <tbody>
            @foreach($categorySummary as $item)
                <tr>
                    <td>{{ $item->category?->name ?? 'Uncategorized' }}</td>
                    <td>{{ $item->total_entry }}</td>
                    <td class="right">BDT {{ number_format($item->total_amount, 2) }}</td>
                </tr>
            @endforeach
        </tbody>
    </table>

    <div class="title">Expense Details</div>

    <table>
        <thead>
            <tr>
                <th>Date</th>
                <th>Category</th>
                <th>Details</th>
                <th>Cost Type</th>
                <th>Source</th>
                <th class="right">Amount</th>
            </tr>
        </thead>
        <tbody>
            @foreach($expenses as $expense)
                <tr>
                    <td>{{ $expense->date }}</td>
                    <td>{{ $expense->category?->name ?? 'Uncategorized' }}</td>
                    <td>{{ $expense->details ?? '-' }}</td>
                    <td>{{ ucfirst($expense->cost_type ?? 'daily') }}</td>
                    <td>{{ $expense->is_petty_cash_expense ? 'Petty Cash' : 'Normal Account' }}</td>
                    <td class="right">BDT {{ number_format($expense->amount, 2) }}</td>
                </tr>
            @endforeach

            <tr class="total-row">
                <td colspan="5" class="right">Total</td>
                <td class="right">BDT {{ number_format($expenses->sum('amount'), 2) }}</td>
            </tr>
        </tbody>
    </table>
</body>
</html>