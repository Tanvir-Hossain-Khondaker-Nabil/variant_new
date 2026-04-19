<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Models\Concerns\BelongsToCreator;

class LoanRepayment extends Model
{
    use BelongsToCreator;

    protected $fillable = [
        'loan_id',
        'loan_schedule_id',
        'payment_date',
        'amount',
        'principal_amount',
        'interest_amount',
        'penalty_amount',
        'payment_method',
        'reference_no',
        'note',
        'created_by',
    ];

    protected $casts = [
        'payment_date' => 'date',
    ];

    public function loan()
    {
        return $this->belongsTo(Loan::class);
    }

    public function schedule()
    {
        return $this->belongsTo(LoanSchedule::class, 'loan_schedule_id');
    }
}