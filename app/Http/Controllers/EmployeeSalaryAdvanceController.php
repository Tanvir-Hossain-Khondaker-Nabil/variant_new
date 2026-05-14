<?php

namespace App\Http\Controllers;

use App\Models\Account;
use App\Models\BusinessSetting;
use App\Models\Employee;
use App\Models\EmployeeSalaryAdvance;
use App\Models\Payment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Carbon\Carbon;

class EmployeeSalaryAdvanceController extends Controller
{
    public function index(Request $request)
    {
        $query = EmployeeSalaryAdvance::with(['employee', 'account', 'payment'])
            ->latest('date');

        if ($request->filled('employee_id')) {
            $query->where('employee_id', $request->employee_id);
        }

        if ($request->filled('month')) {
            $startDate = Carbon::parse($request->month . '-01')->startOfMonth();
            $endDate = Carbon::parse($request->month . '-01')->endOfMonth();

            $query->whereBetween('date', [
                $startDate->toDateString(),
                $endDate->toDateString(),
            ]);
        }

        $businessSettings = BusinessSetting::current();

        return Inertia::render('employee-salary-advances/Index', [
            'advances' => $query->paginate(30)->withQueryString(),
            'employees' => Employee::where('is_active', true)
                ->orderBy('name')
                ->get(['id', 'name', 'employee_id']),
            'accounts' => Account::where('is_active', true)
                ->orderBy('name')
                ->get(['id', 'name', 'type', 'current_balance', 'is_petty_cash']),
            'filters' => [
                'employee_id' => $request->employee_id,
                'month' => $request->month ?? now()->format('Y-m'),
            ],
            'pettyCashAccountId' => $businessSettings?->petty_cash_account_id,
        ]);
    }

    public function store(Request $request)
    {
        $request->validate([
            'employee_id' => 'required|exists:employees,id',
            'date' => 'required|date',
            'amount' => 'required|numeric|min:1',
            'reason' => 'nullable|string',
            'account_id' => 'nullable|exists:accounts,id',
            'use_petty_cash' => 'nullable|boolean',
        ]);

        try {
            DB::transaction(function () use ($request) {
                $businessSettings = BusinessSetting::current();

                $usePettyCash = $request->boolean('use_petty_cash');
                $accountId = $request->account_id;

                if ($usePettyCash) {
                    if (!$businessSettings || !$businessSettings->petty_cash_account_id) {
                        throw new \Exception('Petty Cash account is not configured in Business Settings.');
                    }

                    $accountId = $businessSettings->petty_cash_account_id;
                }

                if (!$accountId) {
                    throw new \Exception('Please select a payment account.');
                }

                $account = Account::findOrFail($accountId);

                if (!$account->is_active) {
                    throw new \Exception('Selected account is not active.');
                }

                if (!$account->canWithdraw($request->amount)) {
                    throw new \Exception("Insufficient balance in account: {$account->name}. Available: ৳{$account->current_balance}");
                }

                $advance = EmployeeSalaryAdvance::create([
                    'employee_id' => $request->employee_id,
                    'date' => Carbon::parse($request->date)->toDateString(),
                    'amount' => $request->amount,
                    'reason' => $request->reason,
                    'account_id' => $account->id,
                    'payment_source' => $usePettyCash ? 'petty_cash' : 'account',
                    'is_petty_cash_payment' => $usePettyCash,
                    'created_by' => Auth::id(),
                ]);

                $account->updateBalance($request->amount, 'withdraw');

                $payment = Payment::create([
                    'reference_type' => 'employee_salary_advance',
'reference_id' => $advance->id,
                    'amount' => -abs($request->amount),
                    'payment_method' => $account->type ?? 'cash',
                    'txn_ref' => 'SAL-ADV-' . Str::random(10),
                    'note' => $request->reason ?? 'Employee Salary Advance',
                    'account_id' => $account->id,
                    'paid_at' => now(),
                    'status' => 'completed',
                    'created_by' => Auth::id(),
                ]);

                $advance->update([
                    'payment_id' => $payment->id,
                ]);
            });

            return back()->with('success', 'Salary advance saved successfully.');

        } catch (\Exception $e) {
            return back()->with('error', 'Error saving salary advance: ' . $e->getMessage());
        }
    }
}