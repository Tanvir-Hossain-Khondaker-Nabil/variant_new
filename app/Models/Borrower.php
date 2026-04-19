<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Models\Concerns\BelongsToCreator;

class Borrower extends Model
{
    use BelongsToCreator;

    protected $fillable = [
        'outlet_id',
        'name',
        'phone',
        'email',
        'address',
        'is_active',
        'created_by',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    public function loans()
    {
        return $this->hasMany(Loan::class);
    }
}