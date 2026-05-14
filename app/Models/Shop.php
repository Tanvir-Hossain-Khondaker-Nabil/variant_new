<?php
namespace App\Models;
use App\Models\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
class Shop extends Model
{
    use HasFactory, BelongsToTenant;
    protected $fillable = ['name', 'owner_name', 'phone', 'email', 'address', 'company', 'customer_id', 'supplier_id', 'type', 'is_active', 'created_by', 'outlet_id', 'owner_id'];
    protected $casts = ['is_active' => 'boolean'];
    public function customer()
    {
        return $this->belongsTo(Customer::class);
    }
    public function supplier()
    {
        return $this->belongsTo(Supplier::class);
    }
    public function holds()
    {
        return $this->hasMany(PickupHold::class);
    }
    public function outgoingHolds()
    {
        return $this->hasMany(PickupHold::class)->where('direction', 'outgoing');
    }
    public function incomingHolds()
    {
        return $this->hasMany(PickupHold::class)->where('direction', 'incoming');
    }
    public function scopeActive($q)
    {
        return $q->where('is_active', true);
    }
    public function scopeSearch($q, $s)
    {
        return $q->when($s, function ($q) use ($s) {
            $q->where(function ($x) use ($s) {
                $x->where('name', 'like', "%{$s}%")->orWhere('owner_name', 'like', "%{$s}%")->orWhere('phone', 'like', "%{$s}%")->orWhere('company', 'like', "%{$s}%")->orWhere('email', 'like', "%{$s}%"); }); });
    }
}
