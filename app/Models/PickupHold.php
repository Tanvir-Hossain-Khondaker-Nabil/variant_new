<?php
namespace App\Models;
use App\Models\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
class PickupHold extends Model {
    use HasFactory, BelongsToTenant;
    const DIRECTION_OUTGOING='outgoing'; const DIRECTION_INCOMING='incoming';
    const STATUS_ACTIVE='active'; const STATUS_PARTIAL='partial'; const STATUS_COMPLETED='completed'; const STATUS_CANCELLED='cancelled';
    protected $fillable=['hold_no','shop_id','direction','status','hold_date','notes','total_quantity','remaining_quantity','sold_quantity','returned_quantity','created_by','outlet_id','owner_id'];
    protected $casts=['hold_date'=>'date','total_quantity'=>'decimal:4','remaining_quantity'=>'decimal:4','sold_quantity'=>'decimal:4','returned_quantity'=>'decimal:4'];
    public function shop(){return $this->belongsTo(Shop::class);}    
    public function items(){return $this->hasMany(PickupHoldItem::class)->with(['product.brand','variant','warehouse','stock']);}
    public function actions(){return $this->hasMany(PickupHoldAction::class)->latest();}
    public function creator(){return $this->belongsTo(User::class,'created_by');}
    public function recalculateTotals():void{ $this->loadMissing('items'); $total=$this->items->sum(fn($i)=>(float)$i->quantity); $remaining=$this->items->sum(fn($i)=>(float)$i->remaining_quantity); $sold=$this->items->sum(fn($i)=>(float)$i->sold_quantity); $returned=$this->items->sum(fn($i)=>(float)$i->returned_quantity); $status=self::STATUS_ACTIVE; if($remaining<=0 && $total>0){$status=self::STATUS_COMPLETED;} elseif(($sold>0||$returned>0)&&$remaining>0){$status=self::STATUS_PARTIAL;} $this->update(['total_quantity'=>$total,'remaining_quantity'=>$remaining,'sold_quantity'=>$sold,'returned_quantity'=>$returned,'status'=>$status]); }
}
