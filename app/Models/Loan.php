<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Models\Concerns\BelongsToCreator;

class Loan extends Model
{
    use BelongsToCreator;

    protected $fillable = [
        'outlet_id',
        'borrower_id',
        'code',
        'loan_date',
        'principal_amount',
        'interest_rate',
        'interest_type',
        'term_months',
        'repayment_frequency',
        'processing_fee',
        'penalty_rate',
        'approved_amount',
        'disbursed_amount',
        'total_interest',
        'total_payable',
        'installment_amount',
        'paid_amount',
        'penalty_amount',
        'due_amount',
        'status',
        'approved_date',
        'disbursed_date',
        'first_installment_date',
        'maturity_date',
        'closed_date',
        'note',
        'created_by',
    ];

    protected $casts = [
        'loan_date' => 'date',
        'approved_date' => 'date',
        'disbursed_date' => 'date',
        'first_installment_date' => 'date',
        'maturity_date' => 'date',
        'closed_date' => 'date',
    ];

    public function borrower()
    {
        return $this->belongsTo(Borrower::class);
    }

    public function schedules()
    {
        return $this->hasMany(LoanSchedule::class);
    }

    public function repayments()
    {
        return $this->hasMany(LoanRepayment::class);
    }
}