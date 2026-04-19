<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use App\Models\Concerns\BelongsToTenant;

class StockIdentifier extends Model
{
    use HasFactory, BelongsToTenant;

    protected $fillable = [
        'stock_id',
        'purchase_item_id',
        'product_id',
        'variant_id',
        'identifier_type',
        'identifier_value',
        'status',
        'sale_id',
        'sale_item_id',
        'sold_at',
        'created_by',
        'outlet_id',
        'owner_id',
    ];

    public function stock()
    {
        return $this->belongsTo(Stock::class);
    }

    public function purchaseItem()
    {
        return $this->belongsTo(PurchaseItem::class);
    }

    public function product()
    {
        return $this->belongsTo(Product::class);
    }

    public function variant()
    {
        return $this->belongsTo(Variant::class);
    }

    public function scopeAvailable($query)
    {
        return $query->where('status', 'available');
    }
}