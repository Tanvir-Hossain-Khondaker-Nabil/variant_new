<?php

namespace App\Models;

use App\Scopes\UserScope;
use App\Scopes\OutletScope;
use Illuminate\Support\Facades\Auth;
use Illuminate\Database\Eloquent\Model;
use App\Models\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\SoftDeletes;

class Account extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'name',
        'account_number',
        'type',
        'bank_name',
        'mobile_provider',
        'opening_balance',
        'current_balance',
        'note',
        'is_default',
        'is_active',
        'user_id',
        'created_by',
        'outlet_id',
        'owner_id',
        'is_petty_cash',
'is_locked',
    ];

    protected $casts = [
        'current_balance' => 'float',
         'is_petty_cash' => 'boolean',
    'is_locked' => 'boolean',
    ];


    use BelongsToTenant;

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function payments()
    {
        return $this->hasMany(Payment::class, 'account_id');
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function scopeDefault($query)
    {
        return $query->where('is_default', true);
    }

    public function updateBalance($amount, $type = 'deposit'): self
    {
        $newBalance = $this->current_balance;

        if ($type == 'deposit' || $type == 'credit') {
            $newBalance += $amount;
        } elseif ($type == 'withdraw' || $type == 'debit') {
            if ($this->current_balance < $amount) {
                throw new \Exception("Insufficient balance in account: {$this->name}. Available: {$this->current_balance}, Required: {$amount}");
            }
            $newBalance -= $amount;
        }

        $this->update(['current_balance' => $newBalance]);

        return $this;
    }

    public function canWithdraw($amount): bool
    {
        return $this->current_balance >= $amount;
    }

    // Helper methods
    public function getFormattedBalance(): string
    {
        return number_format($this->current_balance, 2);
    }

    public function getTypeLabel(): string
    {
        return match ($this->type) {
            'cash' => 'Cash',
            'bank' => 'Bank',
            'mobile_banking' => 'Mobile Banking',
            default => ucfirst($this->type)
        };
    }

    public function makeDefault(): void
    {
        // Remove default from all accounts of this user
        self::where('user_id', $this->user_id)
            ->where('id', '!=', $this->id)
            ->update(['is_default' => false]);

        $this->update(['is_default' => true]);
    }

    public function isDeletable(): bool
    {
        // Check if account has any transactions
        return $this->payments()->count() === 0;
    }
}