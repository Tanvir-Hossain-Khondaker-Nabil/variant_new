<?php

namespace App\Models;

use App\Scopes\UserScope;
use App\Scopes\OutletScope;
use Illuminate\Support\Facades\Auth;
use Illuminate\Database\Eloquent\Model;
use App\Models\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;


class Stock extends Model
{
    use HasFactory;

    protected $fillable = [
        'warehouse_id',
        'product_id',
        'purchase_id',
        'variant_id',
        'quantity',
        'purchase_price',
        'sale_price',
        'shadow_purchase_price',
        'shadow_sale_price',
        'created_by',
        'batch_no',
        'outlet_id',
        'barcode',
        'barcode_path',
        'base_quantity',
        'available_base_quantity',
        'owner_id'

    ];

    protected $casts = [
        'purchase_price' => 'decimal:2',
        'sale_price' => 'decimal:2',
        'shadow_purchase_price' => 'decimal:2', // Add this
        'shadow_sale_price' => 'decimal:2',     // Add this
    ];


    use BelongsToTenant;

    public function identifiers()
    {
        return $this->hasMany(StockIdentifier::class);
    }

    public function purchaseItems()
    {
        return $this->hasMany(PurchaseItem::class);
    }

    public function saleItems()
    {
        return $this->hasMany(SaleItem::class);
    }

    public function warehouse()
    {
        return $this->belongsTo(Warehouse::class);
    }

    public function product()
    {
        return $this->belongsTo(Product::class)->with(['brand', 'variants']);
    }

    public function variant()
    {
        return $this->belongsTo(Variant::class);
    }

    public function getStockValueAttribute()
    {
        return $this->quantity * $this->purchase_price;
    }

    public function updateBaseQuantities()
    {
        $variant = $this->variant;
        if (!$variant || !$variant->unit) {
            $this->base_quantity = $this->quantity;
            $this->available_base_quantity = $this->quantity;
            return;
        }

        $baseUnit = Unit::getBaseWeightUnit();
        if ($baseUnit && $variant->unit_id !== $baseUnit->id) {
            $conversion = $variant->unit->conversion_factor;
            $this->base_quantity = $this->quantity * $conversion;
            $this->available_base_quantity = $this->quantity * $conversion;
        } else {
            $this->base_quantity = $this->quantity;
            $this->available_base_quantity = $this->quantity;
        }
    }
}