<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class BusinessSetting extends Model
{
    use HasFactory, BelongsToTenant;

    protected $fillable = [
        'office_start_time',
        'office_end_time',
        'late_after_minutes',
        'late_fee_amount',
        'petty_cash_account_id',
        'salary_advance_adjustment',
        'auto_late_calculation',
        'is_active',
        'created_by',
        'outlet_id',
        'owner_id',
    ];

    protected $casts = [
        'late_fee_amount' => 'decimal:2',
        'salary_advance_adjustment' => 'boolean',
        'auto_late_calculation' => 'boolean',
        'is_active' => 'boolean',
    ];

    public function pettyCashAccount()
    {
        return $this->belongsTo(Account::class, 'petty_cash_account_id');
    }

    public static function current(): self
    {
        return self::firstOrCreate(
            [],
            [
                'office_start_time' => '10:00:00',
                'office_end_time' => '18:00:00',
                'late_after_minutes' => 30,
                'late_fee_amount' => 0,
                'salary_advance_adjustment' => true,
                'auto_late_calculation' => true,
                'is_active' => true,
            ]
        );
    }
}