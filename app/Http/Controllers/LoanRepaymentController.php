<?php

namespace App\Http\Controllers;

use Inertia\Inertia;
use App\Models\Loan;
use App\Models\LoanRepayment;
use Illuminate\Http\Request;
use App\Services\LoanService;

class LoanRepaymentController extends Controller
{
    public function __construct(protected LoanService $loanService)
    {
    }

    public function index(Request $request)
    {
        $status = $request->get('status', 'all');
        $loanId = $request->get('loan_id');

        $repayments = LoanRepayment::query()
            ->with(['loan.borrower', 'schedule'])
            ->when($loanId, fn($q) => $q->where('loan_id', $loanId))
            ->latest('payment_date')
            ->paginate(10)
            ->withQueryString()
            ->through(function ($r) {
                return [
                    'id' => $r->id,
                    'payment_date' => $r->payment_date?->format('Y-m-d'),
                    'amount' => (float) $r->amount,
                    'principal_amount' => (float) $r->principal_amount,
                    'interest_amount' => (float) $r->interest_amount,
                    'penalty_amount' => (float) $r->penalty_amount,
                    'payment_method' => $r->payment_method,
                    'reference_no' => $r->reference_no,
                    'loan' => [
                        'id' => $r->loan?->id,
                        'code' => $r->loan?->code,
                        'borrower_name' => $r->loan?->borrower?->name,
                    ],
                    'schedule' => [
                        'id' => $r->schedule?->id,
                        'installment_no' => $r->schedule?->installment_no,
                    ],
                ];
            });

        return Inertia::render('LoanRepayments/Index', [
            'filters' => [
                'status' => $status,
                'loan_id' => $loanId,
            ],
            'repayments' => $repayments,
        ]);
    }

    public function collect(Request $request)
    {
        $data = $request->validate([
            'loan_id' => 'required|exists:loans,id',
            'payment_date' => 'required|date',
            'amount' => 'required|numeric|min:1',
            'payment_method' => 'required|in:cash,bank,mobile_banking,cheque',
            'reference_no' => 'nullable|string|max:255',
            'note' => 'nullable|string|max:1000',
        ]);

        $loan = Loan::findOrFail($data['loan_id']);

        if (!in_array($loan->status, ['active', 'disbursed'])) {
            return back()->with('error', 'Only active loan can receive repayment.');
        }

        $this->loanService->applyOverduePenalties($loan);
        $this->loanService->collectPayment($loan->fresh(), $data);

        return back()->with('success', 'Repayment collected successfully.');
    }
}