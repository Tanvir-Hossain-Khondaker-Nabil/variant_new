<?php

namespace App\Models;

use App\Scopes\UserScope;
use App\Scopes\OutletScope;
use Illuminate\Support\Facades\Auth;
use Illuminate\Database\Eloquent\Model;
use App\Models\Concerns\BelongsToTenant;

class Expense extends Model
{
    // fillable
    protected $fillable = [
        'date',
        'details',
        'amount',
        'sh_amount',
        'category_id',
        'payment_id',
        'created_by',
        'outlet_id',
        'owner_id',
        'cost_type',
        'is_petty_cash_expense',
        'payment_source',
    ];

    protected $casts = [
    'is_petty_cash_expense' => 'boolean',
];

    use BelongsToTenant;


    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function category()
    {
        return $this->belongsTo(ExpenseCategory::class, 'category_id');
    }

    public function payments()
    {
        return $this->hasMany(Payment::class, 'expense_id');
    }
}
