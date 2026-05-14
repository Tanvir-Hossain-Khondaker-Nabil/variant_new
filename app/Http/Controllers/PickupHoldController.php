<?php

namespace App\Http\Controllers;

use App\Models\Account;
use App\Models\Customer;
use App\Models\Payment;
use App\Models\PickupHold;
use App\Models\PickupHoldAction;
use App\Models\PickupHoldItem;
use App\Models\Product;
use App\Models\Purchase;
use App\Models\PurchaseItem;
use App\Models\Sale;
use App\Models\SaleItem;
use App\Models\Shop;
use App\Models\Stock;
use App\Models\Supplier;
use App\Models\Variant;
use App\Models\Warehouse;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Inertia\Inertia;

class PickupHoldController extends Controller
{
    private function getUnitConversions(): array
    {
        return [
            'weight' => [
                'ton' => 1000,
                'kg' => 1,
                'gram' => 0.001,
                'pound' => 0.453592,
            ],
            'volume' => [
                'liter' => 1,
                'ml' => 0.001,
            ],
            'piece' => [
                'piece' => 1,
                'dozen' => 12,
                'box' => 1,
            ],
            'length' => [
                'meter' => 1,
                'cm' => 0.01,
                'mm' => 0.001,
            ],
        ];
    }

    private function convertToBase(float $quantity, ?string $fromUnit, ?string $unitType): float
    {
        $unitType = $unitType ?: 'piece';
        $fromUnit = $fromUnit ?: 'piece';
        $conversions = $this->getUnitConversions();

        if (!isset($conversions[$unitType][$fromUnit])) {
            return $quantity;
        }

        return $quantity * $conversions[$unitType][$fromUnit];
    }

    private function convertFromBase(float $quantity, ?string $toUnit, ?string $unitType): float
    {
        $unitType = $unitType ?: 'piece';
        $toUnit = $toUnit ?: 'piece';
        $conversions = $this->getUnitConversions();

        if (!isset($conversions[$unitType][$toUnit])) {
            return $quantity;
        }

        $conversion = $conversions[$unitType][$toUnit];

        return $conversion != 0 ? $quantity / $conversion : $quantity;
    }

    private function userOutletId(): ?int
    {
        $user = Auth::user();

        return $user->current_outlet_id ?? $user->outlet_id ?? null;
    }

    private function userOwnerId(): ?int
    {
        $user = Auth::user();

        return $user->owner_id ?? $user->id ?? null;
    }

    private function nextHoldNo(string $direction): string
    {
        $prefix = $direction === 'outgoing' ? 'PHO' : 'PHI';

        do {
            $holdNo = $prefix . '-' . now()->format('Ymd') . '-' . strtoupper(Str::random(6));
        } while (PickupHold::where('hold_no', $holdNo)->exists());

        return $holdNo;
    }

    private function nextSaleInvoiceNo(): string
    {
        do {
            $invoiceNo = 'INV-PH-' . now()->format('Ymd') . '-' . strtoupper(Str::random(6));
        } while (Sale::where('invoice_no', $invoiceNo)->exists());

        return $invoiceNo;
    }

    private function nextPurchaseNo(): string
    {
        do {
            $purchaseNo = 'PUR-PH-' . now()->format('Ymd') . '-' . strtoupper(Str::random(6));
        } while (Purchase::where('purchase_no', $purchaseNo)->exists());

        return $purchaseNo;
    }

    private function recalculateHoldTotals(PickupHold $hold): void
    {
        $items = PickupHoldItem::where('pickup_hold_id', $hold->id)->get();

        $totalQuantity = $items->sum(fn ($item) => (float) $item->quantity);
        $remainingQuantity = $items->sum(fn ($item) => (float) $item->remaining_quantity);
        $soldQuantity = $items->sum(fn ($item) => (float) $item->sold_quantity);
        $returnedQuantity = $items->sum(fn ($item) => (float) $item->returned_quantity);

        $status = 'active';

        if ($totalQuantity > 0 && $remainingQuantity <= 0) {
            $status = 'completed';
        } elseif (($soldQuantity > 0 || $returnedQuantity > 0) && $remainingQuantity > 0) {
            $status = 'partial';
        }

        $hold->update([
            'total_quantity' => $totalQuantity,
            'remaining_quantity' => $remainingQuantity,
            'sold_quantity' => $soldQuantity,
            'returned_quantity' => $returnedQuantity,
            'status' => $status,
        ]);
    }

    private function reduceHoldItemRemaining(PickupHoldItem $item, float $quantity, string $actionType): void
    {
        $remainingQuantity = max(0, (float) $item->remaining_quantity - $quantity);
        $soldQuantity = (float) $item->sold_quantity;
        $returnedQuantity = (float) $item->returned_quantity;

        if ($actionType === 'sold') {
            $soldQuantity += $quantity;
        }

        if ($actionType === 'return') {
            $returnedQuantity += $quantity;
        }

        $status = 'active';

        if ($remainingQuantity <= 0) {
            $status = 'completed';
        } elseif ($soldQuantity > 0 || $returnedQuantity > 0) {
            $status = 'partial';
        }

        $item->update([
            'remaining_quantity' => $remainingQuantity,
            'sold_quantity' => $soldQuantity,
            'returned_quantity' => $returnedQuantity,
            'status' => $status,
        ]);
    }

    private function getStockAvailableBaseQuantity(Stock $stock, Product $product): float
    {
        /*
        |--------------------------------------------------------------------------
        | IMPORTANT FIX
        |--------------------------------------------------------------------------
        | Do not use available_base_quantity first.
        | Old stock rows may have quantity = 9 but available_base_quantity = 0.
        | So actual available should come from stock.quantity + stock.unit.
        |--------------------------------------------------------------------------
        */

        $stockUnit = $stock->unit ?? ($product->default_unit ?? 'piece');

        return $this->convertToBase(
            (float) ($stock->quantity ?? 0),
            $stockUnit,
            $product->unit_type ?? 'piece'
        );
    }

    private function updateStockByBaseQuantity(Stock $stock, Product $product, float $newBaseQuantity): void
    {
        $stockUnit = $stock->unit ?? ($product->default_unit ?? 'piece');

        $newQuantity = $this->convertFromBase(
            $newBaseQuantity,
            $stockUnit,
            $product->unit_type ?? 'piece'
        );

        $stock->update([
            'quantity' => $newQuantity,
            'base_quantity' => $newBaseQuantity,
            'available_base_quantity' => $newBaseQuantity,
        ]);
    }

    private function ensureShopCustomer(Shop $shop): Customer
    {
        if ($shop->customer_id) {
            return Customer::findOrFail($shop->customer_id);
        }

        $customer = Customer::create([
            'customer_name' => $shop->name,
            'phone' => $shop->phone,
            'address' => $shop->address,
            'advance_amount' => 0,
            'due_amount' => 0,
            'is_active' => 1,
            'created_by' => Auth::id(),
            'outlet_id' => $this->userOutletId(),
            'owner_id' => $this->userOwnerId(),
        ]);

        $shop->update([
            'customer_id' => $customer->id,
            'type' => $shop->supplier_id ? 'both' : 'customer',
        ]);

        return $customer;
    }

    private function ensureShopSupplier(Shop $shop): Supplier
    {
        if ($shop->supplier_id) {
            return Supplier::findOrFail($shop->supplier_id);
        }

        $supplier = Supplier::create([
            'name' => $shop->name,
            'contact_person' => $shop->owner_name,
            'email' => $shop->email,
            'phone' => $shop->phone,
            'company' => $shop->company,
            'address' => $shop->address,
            'advance_amount' => 0,
            'due_amount' => 0,
            'is_active' => 1,
            'type' => 'local',
            'created_by' => Auth::id(),
            'outlet_id' => $this->userOutletId(),
            'owner_id' => $this->userOwnerId(),
        ]);

        $shop->update([
            'supplier_id' => $supplier->id,
            'type' => $shop->customer_id ? 'both' : 'supplier',
        ]);

        return $supplier;
    }

    private function getOrCreateDefaultVariant(Product $product): Variant
    {
        $variant = Variant::where('product_id', $product->id)
            ->where(function ($query) {
                $query->whereNull('attribute_values')
                    ->orWhere('attribute_values', '[]')
                    ->orWhere('attribute_values', '{}');
            })
            ->first();

        if ($variant) {
            return $variant;
        }

        $variant = Variant::where('product_id', $product->id)->first();

        if ($variant) {
            return $variant;
        }

        return Variant::create([
            'product_id' => $product->id,
            'attribute_values' => [],
            'sku' => ($product->product_no ?: 'PRD-' . $product->id) . '_DEFAULT',
            'created_by' => Auth::id(),
            'outlet_id' => $this->userOutletId(),
            'owner_id' => $this->userOwnerId(),
        ]);
    }

    public function index(Request $request)
    {
        $filters = $request->only([
            'search',
            'direction',
            'status',
            'shop_id',
            'date_from',
            'date_to',
        ]);

        $holds = PickupHold::with([
            'shop',
            'items.product.brand',
            'items.variant',
            'items.warehouse',
        ])
            ->when($filters['search'] ?? null, function ($query, $search) {
                $query->where(function ($q) use ($search) {
                    $q->where('hold_no', 'like', "%{$search}%")
                        ->orWhereHas('shop', function ($shopQuery) use ($search) {
                            $shopQuery->where('name', 'like', "%{$search}%")
                                ->orWhere('phone', 'like', "%{$search}%")
                                ->orWhere('company', 'like', "%{$search}%");
                        })
                        ->orWhereHas('items.product', function ($productQuery) use ($search) {
                            $productQuery->where('name', 'like', "%{$search}%")
                                ->orWhere('product_no', 'like', "%{$search}%");
                        });
                });
            })
            ->when($filters['direction'] ?? null, function ($query, $direction) {
                $query->where('direction', $direction);
            })
            ->when($filters['status'] ?? null, function ($query, $status) {
                $query->where('status', $status);
            })
            ->when($filters['shop_id'] ?? null, function ($query, $shopId) {
                $query->where('shop_id', $shopId);
            })
            ->when($filters['date_from'] ?? null, function ($query, $dateFrom) {
                $query->whereDate('hold_date', '>=', $dateFrom);
            })
            ->when($filters['date_to'] ?? null, function ($query, $dateTo) {
                $query->whereDate('hold_date', '<=', $dateTo);
            })
            ->latest()
            ->paginate(15)
            ->withQueryString();

        return Inertia::render('Pickup/Holds/Index', [
            'holds' => $holds,
            'filters' => $filters,
            'shops' => Shop::active()->orderBy('name')->get(),
        ]);
    }

    public function create()
    {
        $stocks = Stock::with([
            'warehouse',
            'product.category',
            'product.brand',
            'variant',
            'identifiers',
        ])
            ->where('quantity', '>', 0)
            ->orderBy('created_at', 'asc')
            ->get();

        $products = Product::with([
            'brand',
            'category',
            'variants',
        ])
            ->orderBy('name')
            ->get();

        return Inertia::render('Pickup/Holds/Create', [
            'shops' => Shop::active()->orderBy('name')->get(),
            'warehouses' => Warehouse::where('is_active', true)->get(),
            'stocks' => $stocks,
            'products' => $products,
            'accounts' => Account::where('is_active', true)->get(),
            'unitConversions' => $this->getUnitConversions(),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'shop_id' => 'required|exists:shops,id',
            'direction' => 'required|in:outgoing,incoming',
            'hold_date' => 'nullable|date',
            'notes' => 'nullable|string|max:2000',
            'items' => 'required|array|min:1',

            'items.*.product_id' => 'required|exists:products,id',
            'items.*.variant_id' => 'nullable|exists:variants,id',
            'items.*.warehouse_id' => 'nullable|exists:warehouses,id',
            'items.*.stock_id' => 'nullable|exists:stocks,id',
            'items.*.unit' => 'nullable|string|max:50',
            'items.*.quantity' => 'required|numeric|min:0.0001',
            'items.*.unit_price' => 'nullable|numeric|min:0',
            'items.*.sale_price' => 'nullable|numeric|min:0',
        ]);

        DB::beginTransaction();

        try {
            $direction = $validated['direction'];

            $hold = PickupHold::create([
                'hold_no' => $this->nextHoldNo($direction),
                'shop_id' => $validated['shop_id'],
                'direction' => $direction,
                'status' => 'active',
                'hold_date' => $validated['hold_date'] ?? now()->toDateString(),
                'notes' => $validated['notes'] ?? null,
                'total_quantity' => 0,
                'remaining_quantity' => 0,
                'sold_quantity' => 0,
                'returned_quantity' => 0,
                'created_by' => Auth::id(),
                'outlet_id' => $this->userOutletId(),
                'owner_id' => $this->userOwnerId(),
            ]);

            foreach ($validated['items'] as $row) {
                $product = Product::findOrFail($row['product_id']);

                $unit = $row['unit'] ?? ($product->default_unit ?? 'piece');
                $quantity = (float) ($row['quantity'] ?? 0);

                if ($quantity <= 0) {
                    throw new \Exception("Invalid quantity for {$product->name}");
                }

                $baseQuantity = $this->convertToBase(
                    $quantity,
                    $unit,
                    $product->unit_type ?? 'piece'
                );

                $unitPrice = (float) ($row['unit_price'] ?? 0);
                $salePrice = (float) ($row['sale_price'] ?? 0);

                if ($direction === 'outgoing') {
                    if (empty($row['stock_id'])) {
                        throw new \Exception('Stock is required for outgoing pickup.');
                    }

                    $stock = Stock::lockForUpdate()->findOrFail($row['stock_id']);

                    if ((int) $stock->product_id !== (int) $product->id) {
                        throw new \Exception('Selected stock product mismatch.');
                    }

                    if (!empty($row['variant_id']) && (int) $stock->variant_id !== (int) $row['variant_id']) {
                        throw new \Exception('Selected stock variant mismatch.');
                    }

                    /*
                    |--------------------------------------------------------------------------
                    | FIXED STOCK CHECK
                    |--------------------------------------------------------------------------
                    | Stock has quantity 9 but available_base_quantity may be 0.
                    | So available is calculated from actual stock.quantity.
                    |--------------------------------------------------------------------------
                    */
                    $availableBaseQuantity = $this->getStockAvailableBaseQuantity($stock, $product);

                    if ($baseQuantity > $availableBaseQuantity) {
                        $availableInSelectedUnit = $this->convertFromBase(
                            $availableBaseQuantity,
                            $unit,
                            $product->unit_type ?? 'piece'
                        );

                        throw new \Exception(
                            "Not enough stock for {$product->name}. Available: {$availableInSelectedUnit} {$unit}, Requested: {$quantity} {$unit}"
                        );
                    }

                    $remainingBaseQuantity = max(0, $availableBaseQuantity - $baseQuantity);

                    $this->updateStockByBaseQuantity($stock, $product, $remainingBaseQuantity);

                    $finalUnitPrice = $unitPrice > 0 ? $unitPrice : (float) $stock->purchase_price;
                    $finalSalePrice = $salePrice > 0 ? $salePrice : (float) $stock->sale_price;

                    PickupHoldItem::create([
                        'pickup_hold_id' => $hold->id,
                        'product_id' => $product->id,
                        'variant_id' => $stock->variant_id,
                        'warehouse_id' => $stock->warehouse_id,
                        'stock_id' => $stock->id,
                        'unit' => $unit,
                        'quantity' => $quantity,
                        'base_quantity' => $baseQuantity,
                        'remaining_quantity' => $quantity,
                        'sold_quantity' => 0,
                        'returned_quantity' => 0,
                        'unit_price' => $finalUnitPrice,
                        'sale_price' => $finalSalePrice,
                        'total_price' => $quantity * $finalSalePrice,
                        'status' => 'active',
                        'created_by' => Auth::id(),
                        'outlet_id' => $this->userOutletId(),
                        'owner_id' => $this->userOwnerId(),
                    ]);
                }

                if ($direction === 'incoming') {
                    $variantId = $row['variant_id'] ?? null;

                    if (!$variantId) {
                        $variantId = $this->getOrCreateDefaultVariant($product)->id;
                    }

                    $warehouseId = $row['warehouse_id'] ?? null;

                    if (!$warehouseId) {
                        throw new \Exception('Warehouse is required for incoming pickup.');
                    }

                    $finalUnitPrice = $unitPrice;
                    $finalSalePrice = $salePrice;

                    $stock = Stock::create([
                        'warehouse_id' => $warehouseId,
                        'product_id' => $product->id,
                        'variant_id' => $variantId,
                        'quantity' => $quantity,
                        'base_quantity' => $baseQuantity,
                        'available_base_quantity' => $baseQuantity,
                        'purchase_price' => $finalUnitPrice,
                        'sale_price' => $finalSalePrice,
                        'batch_no' => 'PIH-' . now()->format('Ymd') . '-' . strtoupper(Str::random(6)),
                        'created_by' => Auth::id(),
                        'outlet_id' => $this->userOutletId(),
                        'owner_id' => $this->userOwnerId(),
                    ]);

                    PickupHoldItem::create([
                        'pickup_hold_id' => $hold->id,
                        'product_id' => $product->id,
                        'variant_id' => $variantId,
                        'warehouse_id' => $warehouseId,
                        'stock_id' => $stock->id,
                        'unit' => $unit,
                        'quantity' => $quantity,
                        'base_quantity' => $baseQuantity,
                        'remaining_quantity' => $quantity,
                        'sold_quantity' => 0,
                        'returned_quantity' => 0,
                        'unit_price' => $finalUnitPrice,
                        'sale_price' => $finalSalePrice,
                        'total_price' => $quantity * $finalUnitPrice,
                        'status' => 'active',
                        'created_by' => Auth::id(),
                        'outlet_id' => $this->userOutletId(),
                        'owner_id' => $this->userOwnerId(),
                    ]);
                }
            }

            $this->recalculateHoldTotals($hold);

            DB::commit();

            return redirect()
                ->route('pickup-holds.show', $hold->id)
                ->with('success', 'Pickup hold created successfully.');
        } catch (\Exception $e) {
            DB::rollBack();

            return redirect()
                ->back()
                ->withInput()
                ->with('error', $e->getMessage());
        }
    }

    public function show(PickupHold $pickupHold)
    {
        $pickupHold->load([
            'shop.customer',
            'shop.supplier',
            'items.product.brand',
            'items.variant',
            'items.warehouse',
            'items.stock',
            'actions.sale',
            'actions.purchase',
            'creator',
        ]);

        return Inertia::render('Pickup/Holds/Show', [
            'hold' => $pickupHold,
            'accounts' => Account::where('is_active', true)->get(),
        ]);
    }

    public function returnItem(Request $request, PickupHoldItem $item)
    {
        $validated = $request->validate([
            'quantity' => 'required|numeric|min:0.0001',
            'notes' => 'nullable|string|max:2000',
        ]);

        DB::beginTransaction();

        try {
            $item = PickupHoldItem::with([
                'hold.shop',
                'product',
                'stock',
            ])
                ->lockForUpdate()
                ->findOrFail($item->id);

            $hold = PickupHold::lockForUpdate()->findOrFail($item->pickup_hold_id);

            $quantity = (float) $validated['quantity'];

            if ($quantity > (float) $item->remaining_quantity) {
                throw new \Exception('Return quantity cannot exceed remaining hold quantity.');
            }

            $product = $item->product;

            $baseQuantity = $this->convertToBase(
                $quantity,
                $item->unit,
                $product->unit_type ?? 'piece'
            );

            if ($hold->direction === 'outgoing') {
                /*
                |--------------------------------------------------------------------------
                | Outgoing Return
                |--------------------------------------------------------------------------
                | Shop returns my product.
                | Product was deducted during hold create, so add it back.
                |--------------------------------------------------------------------------
                */

                $stock = Stock::lockForUpdate()->findOrFail($item->stock_id);

                $currentBaseQuantity = $this->getStockAvailableBaseQuantity($stock, $product);
                $newBaseQuantity = $currentBaseQuantity + $baseQuantity;

                $this->updateStockByBaseQuantity($stock, $product, $newBaseQuantity);
            }

            if ($hold->direction === 'incoming') {
                /*
                |--------------------------------------------------------------------------
                | Incoming Return
                |--------------------------------------------------------------------------
                | I return shop product to shop.
                | Product was added during hold create, so remove it.
                |--------------------------------------------------------------------------
                */

                $stock = Stock::lockForUpdate()->findOrFail($item->stock_id);

                $currentBaseQuantity = $this->getStockAvailableBaseQuantity($stock, $product);

                if ($baseQuantity > $currentBaseQuantity) {
                    throw new \Exception('Not enough stock to return to shop.');
                }

                $newBaseQuantity = max(0, $currentBaseQuantity - $baseQuantity);

                $this->updateStockByBaseQuantity($stock, $product, $newBaseQuantity);
            }

            $this->reduceHoldItemRemaining($item, $quantity, 'return');

            PickupHoldAction::create([
                'pickup_hold_id' => $hold->id,
                'pickup_hold_item_id' => $item->id,
                'action_type' => 'return',
                'quantity' => $quantity,
                'base_quantity' => $baseQuantity,
                'unit_price' => $item->unit_price,
                'total_price' => $quantity * (float) $item->unit_price,
                'notes' => $validated['notes'] ?? null,
                'created_by' => Auth::id(),
                'outlet_id' => $this->userOutletId(),
                'owner_id' => $this->userOwnerId(),
            ]);

            $this->recalculateHoldTotals($hold);

            DB::commit();

            return redirect()
                ->back()
                ->with('success', 'Pickup item returned successfully.');
        } catch (\Exception $e) {
            DB::rollBack();

            return redirect()
                ->back()
                ->with('error', $e->getMessage());
        }
    }

    public function soldItem(Request $request, PickupHoldItem $item)
    {
        $validated = $request->validate([
            'quantity' => 'required|numeric|min:0.0001',
            'unit_price' => 'nullable|numeric|min:0',
            'account_id' => 'nullable|exists:accounts,id',
            'paid_amount' => 'nullable|numeric|min:0',
            'notes' => 'nullable|string|max:2000',
        ]);

        DB::beginTransaction();

        try {
            $item = PickupHoldItem::with([
                'hold.shop.customer',
                'hold.shop.supplier',
                'product',
                'variant',
                'stock',
            ])
                ->lockForUpdate()
                ->findOrFail($item->id);

            $hold = PickupHold::lockForUpdate()->findOrFail($item->pickup_hold_id);

            $quantity = (float) $validated['quantity'];

            if ($quantity > (float) $item->remaining_quantity) {
                throw new \Exception('Sold quantity cannot exceed remaining hold quantity.');
            }

            $product = $item->product;

            $baseQuantity = $this->convertToBase(
                $quantity,
                $item->unit,
                $product->unit_type ?? 'piece'
            );

            $unitPrice = (float) (
                $validated['unit_price']
                ?? (
                    $hold->direction === 'outgoing'
                        ? $item->sale_price
                        : $item->unit_price
                )
            );

            if ($unitPrice <= 0) {
                throw new \Exception('Price must be greater than zero.');
            }

            $totalPrice = $quantity * $unitPrice;
            $paidAmount = (float) ($validated['paid_amount'] ?? 0);
            $accountId = $validated['account_id'] ?? null;

            if ($paidAmount > $totalPrice) {
                throw new \Exception('Paid amount cannot be greater than total price.');
            }

            if ($paidAmount > 0 && !$accountId) {
                throw new \Exception('Account is required when paid amount is greater than zero.');
            }

            $sale = null;
            $saleItem = null;
            $purchase = null;
            $purchaseItem = null;

            if ($hold->direction === 'outgoing') {
                /*
                |--------------------------------------------------------------------------
                | Outgoing Sold
                |--------------------------------------------------------------------------
                | Neighbor shop took my product and sold/kept it.
                | Stock was already deducted at hold create.
                | So create Sale + SaleItem only. Do NOT deduct stock again.
                |--------------------------------------------------------------------------
                */

                $customer = $this->ensureShopCustomer($hold->shop);

                $sale = Sale::create([
                    'customer_id' => $customer->id,
                    'invoice_no' => $this->nextSaleInvoiceNo(),
                    'sub_total' => $totalPrice,
                    'discount' => 0,
                    'vat_tax' => 0,
                    'grand_total' => $totalPrice,
                    'paid_amount' => $paidAmount,
                    'due_amount' => max(0, $totalPrice - $paidAmount),

                    /*
                    |--------------------------------------------------------------------------
                    | IMPORTANT FIX
                    |--------------------------------------------------------------------------
                    | Do not use "none".
                    | Your sales.payment_type enum does not allow "none".
                    |--------------------------------------------------------------------------
                    */
                    'payment_type' => 'cash',

                    'account_id' => $accountId,
                    'status' => $paidAmount >= $totalPrice
                        ? 'paid'
                        : ($paidAmount > 0 ? 'partial' : 'pending'),
                    'type' => 'inventory',
                    'sale_type' => 'pickup_hold',
                    'created_by' => Auth::id(),
                    'outlet_id' => $this->userOutletId(),
                    'owner_id' => $this->userOwnerId(),
                ]);

                $saleItem = SaleItem::create([
                    'sale_id' => $sale->id,
                    'product_id' => $item->product_id,
                    'variant_id' => $item->variant_id,
                    'warehouse_id' => $item->warehouse_id,
                    'stock_id' => $item->stock_id,

                    'quantity' => $quantity,
                    'unit' => $item->unit,
                    'unit_quantity' => $quantity,
                    'base_quantity' => $baseQuantity,

                    'unit_price' => $unitPrice,
                    'total_price' => $totalPrice,

                    'shadow_unit_price' => $unitPrice,
                    'shadow_total_price' => $totalPrice,

                    'status' => 'completed',
                    'created_by' => Auth::id(),
                    'outlet_id' => $this->userOutletId(),
                    'owner_id' => $this->userOwnerId(),
                    'item_type' => 'pickup_hold',
                ]);

                if ($paidAmount > 0 && $accountId) {
                    $account = Account::lockForUpdate()->findOrFail($accountId);

                    if (method_exists($account, 'updateBalance')) {
                        $account->updateBalance($paidAmount, 'deposit');
                    }

                    Payment::create([
                        'sale_id' => $sale->id,
                        'customer_id' => $customer->id,
                        'account_id' => $accountId,
                        'amount' => $paidAmount,
                        'shadow_amount' => $paidAmount,
                        'payment_method' => $account->type ?? 'cash',
                        'txn_ref' => 'PHS-' . strtoupper(Str::random(8)),
                        'note' => $validated['notes'] ?? 'Pickup hold sale payment',
                        'paid_at' => Carbon::now(),
                        'created_by' => Auth::id(),
                        'outlet_id' => $this->userOutletId(),
                        'owner_id' => $this->userOwnerId(),
                        'status' => 'completed',
                    ]);
                }

                $item->update([
                    'sale_id' => $sale->id,
                ]);
            }

            if ($hold->direction === 'incoming') {
                /*
                |--------------------------------------------------------------------------
                | Incoming Sold / Confirm
                |--------------------------------------------------------------------------
                | Neighbor shop gave product to me on hold.
                | Stock was already added at hold create.
                | When sold/kept, create Purchase + PurchaseItem only.
                | Do NOT add stock again.
                |--------------------------------------------------------------------------
                */

                $supplier = $this->ensureShopSupplier($hold->shop);

                $purchase = Purchase::create([
                    'supplier_id' => $supplier->id,
                    'warehouse_id' => $item->warehouse_id,
                    'purchase_no' => $this->nextPurchaseNo(),
                    'purchase_date' => now()->toDateString(),
                    'grand_total' => $totalPrice,
                    'paid_amount' => $paidAmount,
                    'due_amount' => max(0, $totalPrice - $paidAmount),
                    'payment_status' => $paidAmount >= $totalPrice
                        ? 'paid'
                        : ($paidAmount > 0 ? 'partial' : 'unpaid'),
                    'status' => 'completed',

                    /*
                    |--------------------------------------------------------------------------
                    | IMPORTANT FIX
                    |--------------------------------------------------------------------------
                    | Do not use "none" here also.
                    |--------------------------------------------------------------------------
                    */
                    'payment_type' => 'cash',

                    'type' => 'local',
                    'created_by' => Auth::id(),
                    'outlet_id' => $this->userOutletId(),
                    'owner_id' => $this->userOwnerId(),
                ]);

                $purchaseItem = PurchaseItem::create([
                    'purchase_id' => $purchase->id,
                    'product_id' => $item->product_id,
                    'warehouse_id' => $item->warehouse_id,
                    'supplier_id' => $supplier->id,
                    'variant_id' => $item->variant_id,

                    'quantity' => $quantity,
                    'unit' => $item->unit,
                    'unit_quantity' => $quantity,
                    'base_quantity' => $baseQuantity,

                    'unit_price' => $unitPrice,
                    'total_price' => $totalPrice,
                    'sale_price' => $item->sale_price,

                    'created_by' => Auth::id(),
                    'outlet_id' => $this->userOutletId(),
                    'owner_id' => $this->userOwnerId(),
                ]);

                if ($paidAmount > 0 && $accountId) {
                    $account = Account::lockForUpdate()->findOrFail($accountId);

                    if (method_exists($account, 'updateBalance')) {
                        $account->updateBalance($paidAmount, 'withdraw');
                    }

                    Payment::create([
                        'purchase_id' => $purchase->id,
                        'supplier_id' => $supplier->id,
                        'account_id' => $accountId,
                        'amount' => -1 * $paidAmount,
                        'shadow_amount' => 0,
                        'payment_method' => $account->type ?? 'cash',
                        'txn_ref' => 'PHP-' . strtoupper(Str::random(8)),
                        'note' => $validated['notes'] ?? 'Pickup hold purchase payment',
                        'paid_at' => Carbon::now(),
                        'created_by' => Auth::id(),
                        'outlet_id' => $this->userOutletId(),
                        'owner_id' => $this->userOwnerId(),
                        'status' => 'completed',
                    ]);
                }

                $item->update([
                    'purchase_id' => $purchase->id,
                ]);
            }

            $this->reduceHoldItemRemaining($item, $quantity, 'sold');

            PickupHoldAction::create([
                'pickup_hold_id' => $hold->id,
                'pickup_hold_item_id' => $item->id,
                'action_type' => 'sold',
                'quantity' => $quantity,
                'base_quantity' => $baseQuantity,
                'unit_price' => $unitPrice,
                'total_price' => $totalPrice,
                'sale_id' => $sale?->id,
                'sale_item_id' => $saleItem?->id,
                'purchase_id' => $purchase?->id,
                'purchase_item_id' => $purchaseItem?->id,
                'notes' => $validated['notes'] ?? null,
                'created_by' => Auth::id(),
                'outlet_id' => $this->userOutletId(),
                'owner_id' => $this->userOwnerId(),
            ]);

            $this->recalculateHoldTotals($hold);

            DB::commit();

            return redirect()
                ->back()
                ->with('success', 'Pickup hold sold/confirmed successfully.');
        } catch (\Exception $e) {
            DB::rollBack();

            return redirect()
                ->back()
                ->with('error', $e->getMessage());
        }
    }
}
