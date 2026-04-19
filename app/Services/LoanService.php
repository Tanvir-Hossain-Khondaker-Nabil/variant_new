<?php

namespace App\Services;

use Carbon\Carbon;
use App\Models\Loan;
use App\Models\LoanSchedule;
use App\Models\LoanRepayment;
use Illuminate\Support\Facades\DB;

class LoanService
{
    public function calculateLoanSummary(array $data): array
    {
        $principal = round((float) $data['principal_amount'], 2);
        $rate = round((float) $data['interest_rate'], 2);
        $term = (int) $data['term_months'];
        $interestType = $data['interest_type'] ?? 'flat';

        if ($interestType === 'flat') {
            $totalInterest = round(($principal * $rate * $term) / (100 * 12), 2);
        } else {
            // simple approximation for reducing balance
            $monthlyRate = ($rate / 100) / 12;
            if ($monthlyRate <= 0) {
                $emi = round($principal / max(1, $term), 2);
                $totalPayable = round($emi * $term, 2);
                $totalInterest = round($totalPayable - $principal, 2);
                return [
                    'total_interest' => $totalInterest,
                    'total_payable' => $totalPayable,
                    'installment_amount' => $emi,
                ];
            }

            $emi = round(
                ($principal * $monthlyRate * pow(1 + $monthlyRate, $term)) /
                (pow(1 + $monthlyRate, $term) - 1),
                2
            );

            $totalPayable = round($emi * $term, 2);
            $totalInterest = round($totalPayable - $principal, 2);

            return [
                'total_interest' => $totalInterest,
                'total_payable' => $totalPayable,
                'installment_amount' => $emi,
            ];
        }

        $totalPayable = round($principal + $totalInterest, 2);
        $installmentAmount = round($totalPayable / max(1, $term), 2);

        return [
            'total_interest' => $totalInterest,
            'total_payable' => $totalPayable,
            'installment_amount' => $installmentAmount,
        ];
    }

    public function generateSchedules(Loan $loan): void
    {
        $loan->schedules()->delete();

        $term = (int) $loan->term_months;
        $principal = (float) $loan->approved_amount ?: (float) $loan->principal_amount;
        $rate = (float) $loan->interest_rate;
        $interestType = $loan->interest_type;
        $frequency = $loan->repayment_frequency;
        $firstDate = Carbon::parse($loan->first_installment_date ?? $loan->loan_date)->startOfDay();

        if ($interestType === 'flat') {
            $totalInterest = round(($principal * $rate * $term) / (100 * 12), 2);
            $principalEach = round($principal / $term, 2);
            $interestEach = round($totalInterest / $term, 2);
            $opening = $principal;

            for ($i = 1; $i <= $term; $i++) {
                $principalDue = $i === $term
                    ? round($opening, 2)
                    : $principalEach;

                $interestDue = $i === $term
                    ? round($loan->total_payable - (($loan->installment_amount * ($term - 1)) + $principalDue), 2)
                    : $interestEach;

                $totalDue = round($principalDue + $interestDue, 2);

                LoanSchedule::create([
                    'loan_id' => $loan->id,
                    'installment_no' => $i,
                    'due_date' => $this->nextDueDate($firstDate, $frequency, $i),
                    'opening_balance' => round($opening, 2),
                    'principal_due' => $principalDue,
                    'interest_due' => $interestDue,
                    'penalty_due' => 0,
                    'total_due' => $totalDue,
                    'status' => 'pending',
                ]);

                $opening = round($opening - $principalDue, 2);
            }

            return;
        }

        // reducing balance
        $monthlyRate = ($rate / 100) / 12;
        $emi = (float) $loan->installment_amount;
        $opening = $principal;

        for ($i = 1; $i <= $term; $i++) {
            $interestDue = round($opening * $monthlyRate, 2);
            $principalDue = round($emi - $interestDue, 2);

            if ($i === $term) {
                $principalDue = round($opening, 2);
                $totalDue = round($principalDue + $interestDue, 2);
            } else {
                $totalDue = round($principalDue + $interestDue, 2);
            }

            LoanSchedule::create([
                'loan_id' => $loan->id,
                'installment_no' => $i,
                'due_date' => $this->nextDueDate($firstDate, $frequency, $i),
                'opening_balance' => round($opening, 2),
                'principal_due' => $principalDue,
                'interest_due' => $interestDue,
                'penalty_due' => 0,
                'total_due' => $totalDue,
                'status' => 'pending',
            ]);

            $opening = round($opening - $principalDue, 2);
        }
    }

    protected function nextDueDate(Carbon $firstDate, string $frequency, int $installmentNo): string
    {
        $date = $firstDate->copy();

        if ($frequency === 'daily') {
            return $date->addDays($installmentNo - 1)->toDateString();
        }

        if ($frequency === 'weekly') {
            return $date->addWeeks($installmentNo - 1)->toDateString();
        }

        return $date->addMonthsNoOverflow($installmentNo - 1)->toDateString();
    }

    public function collectPayment(Loan $loan, array $data): void
    {
        DB::transaction(function () use ($loan, $data) {
            $amount = round((float) $data['amount'], 2);
            $remaining = $amount;

            $schedules = $loan->schedules()
                ->whereIn('status', ['pending', 'partial', 'overdue'])
                ->orderBy('installment_no')
                ->lockForUpdate()
                ->get();

            foreach ($schedules as $schedule) {
                if ($remaining <= 0) {
                    break;
                }

                $principalRemaining = round($schedule->principal_due - $schedule->principal_paid, 2);
                $interestRemaining = round($schedule->interest_due - $schedule->interest_paid, 2);
                $penaltyRemaining = round($schedule->penalty_due - $schedule->penalty_paid, 2);

                $paidPenalty = min($remaining, $penaltyRemaining);
                $remaining = round($remaining - $paidPenalty, 2);

                $paidInterest = min($remaining, $interestRemaining);
                $remaining = round($remaining - $paidInterest, 2);

                $paidPrincipal = min($remaining, $principalRemaining);
                $remaining = round($remaining - $paidPrincipal, 2);

                $schedulePaid = round($paidPenalty + $paidInterest + $paidPrincipal, 2);

                if ($schedulePaid <= 0) {
                    continue;
                }

                $schedule->update([
                    'paid_amount' => round($schedule->paid_amount + $schedulePaid, 2),
                    'principal_paid' => round($schedule->principal_paid + $paidPrincipal, 2),
                    'interest_paid' => round($schedule->interest_paid + $paidInterest, 2),
                    'penalty_paid' => round($schedule->penalty_paid + $paidPenalty, 2),
                    'paid_date' => $data['payment_date'],
                    'status' => $this->determineScheduleStatus($schedule, $data['payment_date']),
                ]);

                LoanRepayment::create([
                    'loan_id' => $loan->id,
                    'loan_schedule_id' => $schedule->id,
                    'payment_date' => $data['payment_date'],
                    'amount' => $schedulePaid,
                    'principal_amount' => $paidPrincipal,
                    'interest_amount' => $paidInterest,
                    'penalty_amount' => $paidPenalty,
                    'payment_method' => $data['payment_method'] ?? 'cash',
                    'reference_no' => $data['reference_no'] ?? null,
                    'note' => $data['note'] ?? null,
                ]);
            }

            $this->refreshLoanTotals($loan->fresh());
        });
    }

    protected function determineScheduleStatus($schedule, string $paymentDate): string
    {
        $totalDue = round($schedule->principal_due + $schedule->interest_due + $schedule->penalty_due, 2);
        $totalPaid = round($schedule->principal_paid + $schedule->interest_paid + $schedule->penalty_paid, 2);

        if ($totalPaid >= $totalDue - 0.01) {
            return 'paid';
        }

        if (Carbon::parse($schedule->due_date)->lt(Carbon::parse($paymentDate))) {
            return 'overdue';
        }

        return 'partial';
    }

    public function applyOverduePenalties(Loan $loan): void
    {
        $today = now()->toDateString();
        $rate = (float) $loan->penalty_rate;

        if ($rate <= 0) {
            return;
        }

        $schedules = $loan->schedules()
            ->whereIn('status', ['pending', 'partial', 'overdue'])
            ->whereDate('due_date', '<', $today)
            ->get();

        foreach ($schedules as $schedule) {
            $baseOutstanding = round(
                ($schedule->principal_due - $schedule->principal_paid) +
                ($schedule->interest_due - $schedule->interest_paid),
                2
            );

            if ($baseOutstanding <= 0) {
                continue;
            }

            $penalty = round(($baseOutstanding * $rate) / 100, 2);

            $schedule->update([
                'penalty_due' => round($schedule->penalty_due + $penalty, 2),
                'total_due' => round($schedule->total_due + $penalty, 2),
                'status' => 'overdue',
            ]);
        }

        $this->refreshLoanTotals($loan->fresh());
    }

    public function refreshLoanTotals(Loan $loan): void
    {
        $paid = round((float) $loan->repayments()->sum('amount'), 2);
        $penalty = round((float) $loan->schedules()->sum('penalty_due'), 2);
        $totalDue = round((float) $loan->schedules()->sum(DB::raw('total_due - paid_amount')), 2);

        $status = $loan->status;
        if ($loan->schedules()->count() > 0 && $loan->schedules()->where('status', '!=', 'paid')->count() === 0) {
            $status = 'completed';
        } elseif (in_array($loan->status, ['disbursed', 'active'])) {
            $status = 'active';
        }

        $loan->update([
            'paid_amount' => $paid,
            'penalty_amount' => $penalty,
            'due_amount' => max(0, $totalDue),
            'status' => $status,
        ]);
    }
}