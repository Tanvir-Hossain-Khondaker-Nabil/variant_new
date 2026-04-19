<?php

namespace App\Http\Controllers;

use Carbon\Carbon;
use Inertia\Inertia;
use App\Models\Loan;
use App\Models\Outlet;
use App\Models\Borrower;
use Illuminate\Http\Request;
use App\Services\LoanService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;

class LoanController extends Controller
{
    public function __construct(protected LoanService $loanService)
    {
    }

    public function index(Request $request)
    {
        $q = trim((string) $request->get('search', ''));
        $status = $request->get('status', 'all');
        $borrowerId = $request->get('borrower_id');
        $outletId = $request->get('outlet_id');

        $loans = Loan::query()
            ->with(['borrower'])
            ->when($q, function ($query) use ($q) {
                $query->where(function ($qq) use ($q) {
                    $qq->where('code', 'like', "%{$q}%")
                        ->orWhereHas('borrower', function ($b) use ($q) {
                            $b->where('name', 'like', "%{$q}%")
                              ->orWhere('phone', 'like', "%{$q}%");
                        });
                });
            })
            ->when($status !== 'all', fn($q) => $q->where('status', $status))
            ->when($borrowerId, fn($q) => $q->where('borrower_id', $borrowerId))
            ->when($outletId, fn($q) => $q->where('outlet_id', $outletId))
            ->latest()
            ->paginate(10)
            ->withQueryString()
            ->through(function ($loan) {
                return [
                    'id' => $loan->id,
                    'code' => $loan->code,
                    'borrower' => [
                        'id' => $loan->borrower?->id,
                        'name' => $loan->borrower?->name,
                        'phone' => $loan->borrower?->phone,
                    ],
                    'outlet_id' => $loan->outlet_id,
                    'loan_date' => $loan->loan_date?->format('Y-m-d'),
                    'principal_amount' => (float) $loan->principal_amount,
                    'interest_rate' => (float) $loan->interest_rate,
                    'interest_type' => $loan->interest_type,
                    'term_months' => (int) $loan->term_months,
                    'repayment_frequency' => $loan->repayment_frequency,
                    'approved_amount' => (float) $loan->approved_amount,
                    'disbursed_amount' => (float) $loan->disbursed_amount,
                    'total_interest' => (float) $loan->total_interest,
                    'total_payable' => (float) $loan->total_payable,
                    'installment_amount' => (float) $loan->installment_amount,
                    'paid_amount' => (float) $loan->paid_amount,
                    'penalty_amount' => (float) $loan->penalty_amount,
                    'due_amount' => (float) $loan->due_amount,
                    'status' => $loan->status,
                    'maturity_date' => $loan->maturity_date?->format('Y-m-d'),
                ];
            });

        return Inertia::render('Loans/Index', [
            'filters' => [
                'search' => $q,
                'status' => $status,
                'borrower_id' => $borrowerId,
                'outlet_id' => $outletId,
            ],
            'loans' => $loans,
            'borrowers' => Borrower::select('id', 'name', 'phone')->orderBy('name')->get(),
            'outlets' => Outlet::select('id', 'name', 'code')->latest()->get(),
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'outlet_id' => 'nullable|exists:outlets,id',
            'borrower_id' => 'required|exists:borrowers,id',
            'loan_date' => 'required|date',
            'principal_amount' => 'required|numeric|min:1',
            'interest_rate' => 'required|numeric|min:0|max:100',
            'interest_type' => 'required|in:flat,reducing',
            'term_months' => 'required|integer|min:1|max:600',
            'repayment_frequency' => 'required|in:monthly,weekly,daily',
            'processing_fee' => 'nullable|numeric|min:0',
            'penalty_rate' => 'nullable|numeric|min:0|max:100',
            'first_installment_date' => 'nullable|date',
            'note' => 'nullable|string|max:2000',
        ]);

        return DB::transaction(function () use ($data) {
            $summary = $this->loanService->calculateLoanSummary($data);

            $loanDate = Carbon::parse($data['loan_date'])->startOfDay();
            $maturityDate = $loanDate->copy()->addMonthsNoOverflow((int) $data['term_months'])->toDateString();

            $loan = Loan::create([
                'outlet_id' => $data['outlet_id'] ?? null,
                'borrower_id' => $data['borrower_id'],
                'code' => $this->generateLoanCode(),
                'loan_date' => $loanDate->toDateString(),
                'principal_amount' => (float) $data['principal_amount'],
                'interest_rate' => (float) $data['interest_rate'],
                'interest_type' => $data['interest_type'],
                'term_months' => (int) $data['term_months'],
                'repayment_frequency' => $data['repayment_frequency'],
                'processing_fee' => (float) ($data['processing_fee'] ?? 0),
                'penalty_rate' => (float) ($data['penalty_rate'] ?? 0),
                'approved_amount' => null,
                'disbursed_amount' => 0,
                'total_interest' => $summary['total_interest'],
                'total_payable' => $summary['total_payable'],
                'installment_amount' => $summary['installment_amount'],
                'paid_amount' => 0,
                'penalty_amount' => 0,
                'due_amount' => $summary['total_payable'],
                'status' => 'pending',
                'first_installment_date' => $data['first_installment_date'] ?? null,
                'maturity_date' => $maturityDate,
                'note' => $data['note'] ?? null,
            ]);

            return to_route('loans.show', $loan->id)->with('success', 'Loan created successfully.');
        });
    }

    public function show(Loan $loan)
    {
        $loan->load([
            'borrower',
            'schedules' => fn($q) => $q->orderBy('installment_no'),
            'repayments' => fn($q) => $q->latest(),
        ]);

        return Inertia::render('Loans/Show', [
            'loan' => [
                'id' => $loan->id,
                'code' => $loan->code,
                'borrower_id' => $loan->borrower_id,
                'outlet_id' => $loan->outlet_id,
                'loan_date' => $loan->loan_date?->format('Y-m-d'),
                'principal_amount' => (float) $loan->principal_amount,
                'interest_rate' => (float) $loan->interest_rate,
                'interest_type' => $loan->interest_type,
                'term_months' => (int) $loan->term_months,
                'repayment_frequency' => $loan->repayment_frequency,
                'processing_fee' => (float) $loan->processing_fee,
                'penalty_rate' => (float) $loan->penalty_rate,
                'approved_amount' => (float) $loan->approved_amount,
                'disbursed_amount' => (float) $loan->disbursed_amount,
                'total_interest' => (float) $loan->total_interest,
                'total_payable' => (float) $loan->total_payable,
                'installment_amount' => (float) $loan->installment_amount,
                'paid_amount' => (float) $loan->paid_amount,
                'penalty_amount' => (float) $loan->penalty_amount,
                'due_amount' => (float) $loan->due_amount,
                'status' => $loan->status,
                'approved_date' => $loan->approved_date?->format('Y-m-d'),
                'disbursed_date' => $loan->disbursed_date?->format('Y-m-d'),
                'first_installment_date' => $loan->first_installment_date?->format('Y-m-d'),
                'maturity_date' => $loan->maturity_date?->format('Y-m-d'),
                'closed_date' => $loan->closed_date?->format('Y-m-d'),
                'note' => $loan->note,
                'borrower' => [
                    'id' => $loan->borrower?->id,
                    'name' => $loan->borrower?->name,
                    'phone' => $loan->borrower?->phone,
                    'email' => $loan->borrower?->email,
                    'address' => $loan->borrower?->address,
                ],
            ],
            'schedules' => $loan->schedules->map(fn($s) => [
                'id' => $s->id,
                'installment_no' => $s->installment_no,
                'due_date' => $s->due_date?->format('Y-m-d'),
                'opening_balance' => (float) $s->opening_balance,
                'principal_due' => (float) $s->principal_due,
                'interest_due' => (float) $s->interest_due,
                'penalty_due' => (float) $s->penalty_due,
                'total_due' => (float) $s->total_due,
                'paid_amount' => (float) $s->paid_amount,
                'status' => $s->status,
                'paid_date' => $s->paid_date?->format('Y-m-d'),
            ])->values(),
            'repayments' => $loan->repayments->map(fn($r) => [
                'id' => $r->id,
                'payment_date' => $r->payment_date?->format('Y-m-d'),
                'amount' => (float) $r->amount,
                'principal_amount' => (float) $r->principal_amount,
                'interest_amount' => (float) $r->interest_amount,
                'penalty_amount' => (float) $r->penalty_amount,
                'payment_method' => $r->payment_method,
                'reference_no' => $r->reference_no,
                'note' => $r->note,
            ])->values(),
        ]);
    }

    public function update(Request $request, Loan $loan)
    {
        if (!in_array($loan->status, ['pending', 'approved'])) {
            return back()->with('error', 'Only pending or approved loans can be edited.');
        }

        $data = $request->validate([
            'outlet_id' => 'nullable|exists:outlets,id',
            'borrower_id' => 'required|exists:borrowers,id',
            'loan_date' => 'required|date',
            'principal_amount' => 'required|numeric|min:1',
            'interest_rate' => 'required|numeric|min:0|max:100',
            'interest_type' => 'required|in:flat,reducing',
            'term_months' => 'required|integer|min:1|max:600',
            'repayment_frequency' => 'required|in:monthly,weekly,daily',
            'processing_fee' => 'nullable|numeric|min:0',
            'penalty_rate' => 'nullable|numeric|min:0|max:100',
            'first_installment_date' => 'nullable|date',
            'note' => 'nullable|string|max:2000',
            'status' => 'required|in:pending,approved,rejected,disbursed,active,completed,closed,defaulted',
        ]);

        return DB::transaction(function () use ($data, $loan) {
            $summary = $this->loanService->calculateLoanSummary($data);
            $loanDate = Carbon::parse($data['loan_date'])->startOfDay();
            $maturityDate = $loanDate->copy()->addMonthsNoOverflow((int) $data['term_months'])->toDateString();

            $loan->update([
                'outlet_id' => $data['outlet_id'] ?? null,
                'borrower_id' => $data['borrower_id'],
                'loan_date' => $loanDate->toDateString(),
                'principal_amount' => (float) $data['principal_amount'],
                'interest_rate' => (float) $data['interest_rate'],
                'interest_type' => $data['interest_type'],
                'term_months' => (int) $data['term_months'],
                'repayment_frequency' => $data['repayment_frequency'],
                'processing_fee' => (float) ($data['processing_fee'] ?? 0),
                'penalty_rate' => (float) ($data['penalty_rate'] ?? 0),
                'total_interest' => $summary['total_interest'],
                'total_payable' => $summary['total_payable'],
                'installment_amount' => $summary['installment_amount'],
                'due_amount' => max(0, $summary['total_payable'] - (float) $loan->paid_amount),
                'first_installment_date' => $data['first_installment_date'] ?? null,
                'maturity_date' => $maturityDate,
                'note' => $data['note'] ?? null,
                'status' => $data['status'],
            ]);

            if ($loan->status === 'approved' && $loan->schedules()->exists()) {
                $this->loanService->generateSchedules($loan->fresh());
                $this->loanService->refreshLoanTotals($loan->fresh());
            }

            return to_route('loans.show', $loan->id)->with('success', 'Loan updated successfully.');
        });
    }

    public function destroy(Loan $loan)
    {
        if ($loan->repayments()->exists() || $loan->schedules()->exists()) {
            return back()->with('error', 'Cannot delete loan with schedules or repayments.');
        }

        if (!in_array($loan->status, ['pending', 'rejected'])) {
            return back()->with('error', 'Only pending or rejected loans can be deleted.');
        }

        $loan->delete();

        return to_route('loans.index')->with('success', 'Loan deleted successfully.');
    }

    public function approve(Request $request, Loan $loan)
    {
        if ($loan->status !== 'pending') {
            return back()->with('error', 'Only pending loan can be approved.');
        }

        $data = $request->validate([
            'approved_amount' => 'nullable|numeric|min:1',
            'approved_date' => 'required|date',
            'first_installment_date' => 'required|date',
        ]);

        return DB::transaction(function () use ($loan, $data) {
            $approvedAmount = (float) ($data['approved_amount'] ?? $loan->principal_amount);

            $loan->update([
                'approved_amount' => $approvedAmount,
                'approved_date' => $data['approved_date'],
                'first_installment_date' => $data['first_installment_date'],
                'status' => 'approved',
            ]);

            $summary = $this->loanService->calculateLoanSummary([
                'principal_amount' => $approvedAmount,
                'interest_rate' => $loan->interest_rate,
                'interest_type' => $loan->interest_type,
                'term_months' => $loan->term_months,
            ]);

            $loan->update([
                'total_interest' => $summary['total_interest'],
                'total_payable' => $summary['total_payable'],
                'installment_amount' => $summary['installment_amount'],
                'due_amount' => $summary['total_payable'],
            ]);

            $this->loanService->generateSchedules($loan->fresh());

            return back()->with('success', 'Loan approved successfully.');
        });
    }

    public function reject(Request $request, Loan $loan)
    {
        if ($loan->status !== 'pending') {
            return back()->with('error', 'Only pending loan can be rejected.');
        }

        $data = $request->validate([
            'note' => 'nullable|string|max:2000',
        ]);

        $loan->update([
            'status' => 'rejected',
            'note' => $data['note'] ?? $loan->note,
        ]);

        return back()->with('success', 'Loan rejected successfully.');
    }

    public function disburse(Request $request, Loan $loan)
    {
        if ($loan->status !== 'approved') {
            return back()->with('error', 'Only approved loan can be disbursed.');
        }

        $data = $request->validate([
            'disbursed_date' => 'required|date',
            'disbursed_amount' => 'nullable|numeric|min:1',
        ]);

        $amount = (float) ($data['disbursed_amount'] ?? $loan->approved_amount ?? $loan->principal_amount);

        $loan->update([
            'disbursed_date' => $data['disbursed_date'],
            'disbursed_amount' => $amount,
            'status' => 'disbursed',
        ]);

        $loan->update([
            'status' => 'active',
        ]);

        return back()->with('success', 'Loan disbursed successfully.');
    }

    public function close(Request $request, Loan $loan)
    {
        $data = $request->validate([
            'closed_date' => 'required|date',
            'note' => 'nullable|string|max:2000',
        ]);

        $this->loanService->refreshLoanTotals($loan->fresh());

        if ((float) $loan->fresh()->due_amount > 0.01) {
            return back()->with('error', 'Loan still has due amount.');
        }

        $loan->update([
            'status' => 'closed',
            'closed_date' => $data['closed_date'],
            'note' => $data['note'] ?? $loan->note,
        ]);

        return back()->with('success', 'Loan closed successfully.');
    }

    protected function generateLoanCode(): string
    {
        $date = now()->format('Ymd');

        $last = Loan::withoutGlobalScopes()
            ->whereDate('created_at', now()->toDateString())
            ->where('code', 'like', "LN-{$date}-%")
            ->orderByDesc('id')
            ->value('code');

        $next = 1;
        if ($last) {
            $parts = explode('-', $last);
            $next = ((int) ($parts[2] ?? 0)) + 1;
        }

        return 'LN-' . $date . '-' . str_pad((string) $next, 4, '0', STR_PAD_LEFT);
    }
}