<?php
namespace App\Http\Controllers;
use App\Models\Shop;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
class ShopController extends Controller
{
    public function index(Request $request)
    {
        $filters = $request->only(['search', 'type', 'status']);
        $shops = Shop::with(['customer', 'supplier'])->withCount(['holds', 'outgoingHolds', 'incomingHolds'])->search($filters['search'] ?? null)->when($filters['type'] ?? null, fn($q, $v) => $q->where('type', $v))->when(($filters['status'] ?? '') !== '', fn($q) => $q->where('is_active', $filters['status'] === 'active'))->latest()->paginate(15)->withQueryString();
        return Inertia::render('Pickup/Shops/Index', ['shops' => $shops, 'filters' => $filters]);
    }
    public function store(Request $request)
    {
        $data = $request->validate(['name' => 'required|string|max:255', 'owner_name' => 'nullable|string|max:255', 'phone' => 'nullable|string|max:50', 'email' => 'nullable|email|max:255', 'address' => 'nullable|string|max:1000', 'company' => 'nullable|string|max:255', 'type' => 'required|in:customer,supplier,both', 'is_active' => 'nullable|boolean']);
        $u = Auth::user();
        Shop::create([...$data, 'is_active' => $request->boolean('is_active', true), 'created_by' => Auth::id(), 'outlet_id' => $u->current_outlet_id ?? $u->outlet_id ?? null, 'owner_id' => $u->owner_id ?? $u->id]);
        return back()->with('success', 'Shop created successfully.');
    }
    public function update(Request $request, Shop $shop)
    {
        $data = $request->validate(['name' => 'required|string|max:255', 'owner_name' => 'nullable|string|max:255', 'phone' => 'nullable|string|max:50', 'email' => 'nullable|email|max:255', 'address' => 'nullable|string|max:1000', 'company' => 'nullable|string|max:255', 'type' => 'required|in:customer,supplier,both', 'is_active' => 'nullable|boolean']);
        $shop->update([...$data, 'is_active' => $request->boolean('is_active', true)]);
        return back()->with('success', 'Shop updated successfully.');
    }
    public function destroy(Shop $shop)
    {
        if ($shop->holds()->exists())
            return back()->with('error', 'Cannot delete shop with pickup hold records.');
        $shop->delete();
        return back()->with('success', 'Shop deleted successfully.');
    }
}
