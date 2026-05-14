<?php

namespace App\Http\Controllers;

use App\Http\Requests\AccountStore;
use App\Http\Requests\AccountUpdate;
use Inertia\Inertia;
use App\Models\Account;
use App\Models\Payment;
use App\Models\User;
use Illuminate\Support\Str;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;

class AccountController extends Controller
{

    //index method will be here
    public function index(Request $request)
    {
        $search = $request->input('search');
        $type = $request->input('type', 'all');

        $accounts = Account::withCount('payments')
            ->when($search, function ($query) use ($search) {
                $query->where(function ($q) use ($search) {
                    $q->where('name', 'like', "%{$search}%")
                        ->orWhere('account_number', 'like', "%{$search}%")
                        ->orWhere('bank_name', 'like', "%{$search}%");
                });
            })
            ->when($type !== 'all', function ($query) use ($type) {
                $query->where('type', $type);
            })
            ->latest()
            ->paginate(20)
            ->withQueryString();

        // Calculate total balance
        $totalBalance = Account::sum('current_balance');

        return Inertia::render('Accounts/AccountIndex', [
            'accounts' => $accounts,
            'filters' => [
                'search' => $search,
                'type' => $type,
            ],
            'totalBalance' => $totalBalance,
        ]);
    }


    // create wil be here
    public function create()
    {
        return Inertia::render('Accounts/AccountCreate');
    }


    // store method will be here
    public function store(AccountStore $request)
    {
        $validated = $request->validated();

        DB::transaction(function () use ($validated) {

            // ✅ Create Account
            $account = Account::create([
                ...$validated,
                'current_balance' => $validated['opening_balance'],
                'user_id' => User::where('role_id', User::ADMIN_ROLE)->first()?->id,
                'created_by' => Auth::id(),
            ]);

            // ✅ Make first account default
            if (Account::where('user_id', Auth::id())->count() == 1) {
                $account->update(['is_default' => true]);
            }

            // ✅ Create Payment transaction for Opening Balance
            if (!empty($validated['opening_balance']) && $validated['opening_balance'] > 0) {
                Payment::create([
                    'account_id' => $account->id,
                    'amount' => $validated['opening_balance'],
                    'payment_method' => 'deposit', // OR use 'opening_balance'
                    'txn_ref' => 'OB-' . strtoupper(Str::random(8)),
                    'note' => 'Opening balance added while creating account',
                    'paid_at' => now(),
                    'status' => 'completed',
                    'created_by' => Auth::id(),
                ]);
            }
        });

        return to_route('accounts.index')->with('success', 'Account created successfully.');
    }

   
    // Show account details
    public function show(Account $account)
    {

        $account = Account::with('payments')->find($account->id);

        $paymentStats = [
            'total_deposits' => $account->payments()->whereIn('payment_method', ['deposit', 'transfer'])
                ->where('status', 'completed')
                ->sum('amount'),
            'total_withdrawals' => Payment::where('account_id', $account->id)
                ->whereIn('payment_method', ['withdrawal', 'transfer'])
                ->where('status', 'completed')
                ->sum('amount'),
            'total_transactions' => Payment::where('account_id', $account->id)->count(),
            'recent_transactions' => Payment::where('account_id', $account->id)
                ->latest()
                ->take(10)
                ->get(), // Simple query without relationships
        ];

        // Get monthly balance history (last 6 months)
        $balanceHistory = Payment::select(
            DB::raw('DATE_FORMAT(paid_at, "%Y-%m") as month'),
            DB::raw('SUM(CASE WHEN payment_method IN ("deposit", "transfer") THEN amount ELSE -amount END) as net_change')
        )
            ->where('account_id', $account->id)
            ->where('status', 'completed')
            ->where('paid_at', '>=', now()->subMonths(6))
            ->groupBy('month')
            ->orderBy('month')
            ->get();

        // Calculate running balance for each month
        $runningBalance = $account->opening_balance;
        $balanceTrend = [];

        foreach ($balanceHistory as $record) {
            $runningBalance += $record->net_change;
            $balanceTrend[] = [
                'month' => $record->month,
                'balance' => $runningBalance,
                'change' => $record->net_change,
            ];
        }

        return Inertia::render('Accounts/Show', [
            'account' => $account,
            'paymentStats' => $paymentStats,
            'balanceTrend' => $balanceTrend,
        ]);
    }

    public function edit(Account $account)
    {
        return Inertia::render('Accounts/AccountEdit', [
            'account' => $account,
        ]);
    }

   public function update(AccountUpdate $request, Account $account)
{
    if ($account->is_locked && !$request->boolean('allow_locked_update')) {
        return back()->with('error', 'This account is locked and cannot be updated.');
    }

    $validated = $request->validated();

    $account->update($validated);

    return to_route('accounts.index')
        ->with('success', 'Account updated successfully.');
}


    //destroy method will be here
    public function destroy(Account $account)
    {
        if ($account->is_petty_cash || $account->is_locked) {
    return back()->with('error', 'Petty Cash account is locked and cannot be deleted.');
}
        // Check if account has transactions
        if ($account->payments()->count() > 0) {
            return redirect()->back()
                ->with('error', 'Cannot delete account with existing transactions.');
        }

        // Don't allow deletion of default account if it's the only one
        if ($account->is_default && Account::where('user_id', Auth::id())->count() === 1) {
            return redirect()->back()
                ->with('error', 'Cannot delete the only default account.');
        }

        $account->delete();

        // If default was deleted, set another as default
        if ($account->is_default) {
            Account::where('user_id', Auth::id())
                ->where('is_active', true)
                ->first()
                ?->update(['is_default' => true]);
        }

        return redirect()->route('accounts.index')
            ->with('success', 'Account deleted successfully.');
    }


    //deposit method will be here
    public function deposit(Request $request, Account $account)
    {
        $validated = $request->validate([
            'amount' => 'required|numeric|min:0.01',
            'note' => 'nullable|string',
        ]);

        DB::transaction(function () use ($account, $validated) {
            // Create payment record
            Payment::create([
                'account_id' => $account->id,
                'amount' => $validated['amount'],
                'payment_method' => 'deposit',
                'txn_ref' => 'DP-' . strtoupper(Str::random(8)),
                'note' => 'deposit for the business',
                'paid_at' => now(),
                'status' => 'completed',
                'created_by' => Auth::id(),
            ]);

            // Update account balance
            $account->updateBalance($validated['amount'], 'credit');
        });

        return redirect()->back()
            ->with('success', 'Deposit successful.');
    }


    //withdraw method will be here
    public function withdraw(Request $request, Account $account)
    {

        $validated = $request->validate([
            'amount' => [
                'required',
                'numeric',
                'min:0.01',
                function ($attribute, $value, $fail) use ($account) {
                    if ($value > $account->current_balance) {
                        $fail('Insufficient balance.');
                    }
                },
            ],
            'note' => 'nullable|string',
        ]);

        DB::transaction(function () use ($account, $validated) {
            // Create payment record
            Payment::create([
                'account_id' => $account->id,
                'amount' => $validated['amount'] * -1,
                'payment_method' => 'withdrawal',
                'txn_ref' => 'WD-' . strtoupper(Str::random(8)),
                'note' => 'withdraw',
                'paid_at' => now(),
                'status' => 'completed',
                'created_by' => Auth::id(),
            ]);

            // Update account balance
            $account->updateBalance($validated['amount'], 'debit');
        });

        return redirect()->back()
            ->with('success', 'Withdrawal successful.');
    }


    //transfer method
    public function transfer(Request $request)
    {
        $validated = $request->validate([
            'from_account_id' => 'required|exists:accounts,id',
            'to_account_id' => 'required|exists:accounts,id|different:from_account_id',
            'amount' => [
                'required',
                'numeric',
                'min:0.01',
                function ($attribute, $value, $fail) use ($request) {
                    $fromAccount = Account::find($request->from_account_id);
                    if ($fromAccount && $value > $fromAccount->current_balance) {
                        $fail('Insufficient balance in source account.');
                    }
                },
            ],
            'note' => 'nullable|string',
        ]);

        DB::transaction(function () use ($validated) {
            $fromAccount = Account::find($validated['from_account_id']);
            $toAccount = Account::find($validated['to_account_id']);
            $txnRef = 'TR-' . strtoupper(Str::random(8));

            // Create withdrawal payment
            Payment::create([
                'account_id' => $fromAccount->id,
                'amount' => $validated['amount'],
                'payment_method' => 'transfer',
                'txn_ref' => $txnRef,
                'note' => "Transfer to {$toAccount->name}: " . ($validated['note'] ?? ''),
                'paid_at' => now(),
                'status' => 'completed',
                'created_by' => Auth::id(),
            ]);

            // Create deposit payment
            Payment::create([
                'account_id' => $toAccount->id,
                'amount' => $validated['amount'],
                'payment_method' => 'transfer',
                'txn_ref' => $txnRef,
                'note' => "Transfer from {$fromAccount->name}: " . ($validated['note'] ?? ''),
                'paid_at' => now(),
                'status' => 'completed',
                'created_by' => Auth::id(),
            ]);

            // Update balances
            $fromAccount->updateBalance($validated['amount'], 'debit');
            $toAccount->updateBalance($validated['amount'], 'credit');
        });

        return to_route('accounts.index')
            ->with('success', 'Transfer completed successfully.');
    }
}
