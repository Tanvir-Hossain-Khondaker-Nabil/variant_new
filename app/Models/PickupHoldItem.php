<?php
namespace App\Models;
use App\Models\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
class PickupHoldItem extends Model {
    use HasFactory, BelongsToTenant;
    protected $fillable=['pickup_hold_id','product_id','variant_id','warehouse_id','stock_id','unit','quantity','base_quantity','remaining_quantity','sold_quantity','returned_quantity','unit_price','sale_price','total_price','status','sale_id','purchase_id','created_by','outlet_id','owner_id'];
    protected $casts=['quantity'=>'decimal:4','base_quantity'=>'decimal:4','remaining_quantity'=>'decimal:4','sold_quantity'=>'decimal:4','returned_quantity'=>'decimal:4','unit_price'=>'decimal:4','sale_price'=>'decimal:4','total_price'=>'decimal:4'];
    public function hold(){return $this->belongsTo(PickupHold::class,'pickup_hold_id');}
    public function product(){return $this->belongsTo(Product::class)->with('brand');}
    public function variant(){return $this->belongsTo(Variant::class)->withDefault();}
    public function warehouse(){return $this->belongsTo(Warehouse::class);}    
    public function stock(){return $this->belongsTo(Stock::class);}    
    public function actions(){return $this->hasMany(PickupHoldAction::class);}    
    public function sale(){return $this->belongsTo(Sale::class);}    
    public function purchase(){return $this->belongsTo(Purchase::class);}    
    public function reduceRemaining(float $quantity,string $actionType):void{ $remaining=max(0,(float)$this->remaining_quantity-$quantity); $sold=(float)$this->sold_quantity; $returned=(float)$this->returned_quantity; if($actionType==='sold'){$sold+=$quantity;} if($actionType==='return'){$returned+=$quantity;} $status='active'; if($remaining<=0){$status='completed';} elseif($sold>0||$returned>0){$status='partial';} $this->update(['remaining_quantity'=>$remaining,'sold_quantity'=>$sold,'returned_quantity'=>$returned,'status'=>$status]); }
}
