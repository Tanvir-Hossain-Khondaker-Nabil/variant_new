<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class LoanSchedule extends Model
{
    protected $fillable = [
        'loan_id',
        'installment_no',
        'due_date',
        'opening_balance',
        'principal_due',
        'interest_due',
        'penalty_due',
        'total_due',
        'paid_amount',
        'principal_paid',
        'interest_paid',
        'penalty_paid',
        'status',
        'paid_date',
    ];

    protected $casts = [
        'due_date' => 'date',
        'paid_date' => 'date',
    ];

    public function loan()
    {
        return $this->belongsTo(Loan::class);
    }
}