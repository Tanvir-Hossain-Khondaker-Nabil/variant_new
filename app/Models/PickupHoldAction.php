<?php
namespace App\Models;
use App\Models\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
class PickupHoldAction extends Model {
    use HasFactory, BelongsToTenant;
    protected $fillable=['pickup_hold_id','pickup_hold_item_id','action_type','quantity','base_quantity','unit_price','total_price','sale_id','sale_item_id','purchase_id','purchase_item_id','notes','created_by','outlet_id','owner_id'];
    protected $casts=['quantity'=>'decimal:4','base_quantity'=>'decimal:4','unit_price'=>'decimal:4','total_price'=>'decimal:4'];
    public function hold(){return $this->belongsTo(PickupHold::class,'pickup_hold_id');}
    public function item(){return $this->belongsTo(PickupHoldItem::class,'pickup_hold_item_id');}
    public function sale(){return $this->belongsTo(Sale::class);}    
    public function saleItem(){return $this->belongsTo(SaleItem::class);}    
    public function purchase(){return $this->belongsTo(Purchase::class);}    
    public function purchaseItem(){return $this->belongsTo(PurchaseItem::class);}    
}
