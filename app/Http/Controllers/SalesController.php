<?php

namespace App\Http\Controllers;

use App\Models\Account;
use App\Models\BusinessProfile;
use App\Models\Customer;
use App\Models\Installment;
use App\Models\Payment;
use App\Models\Product;
use App\Models\Purchase;
use App\Models\PurchaseItem;
use App\Models\Sale;
use App\Models\SaleItem;
use App\Models\Stock;
use App\Models\StockIdentifier;
use App\Models\StockMovement;
use App\Models\Supplier;
use App\Models\Variant;
use App\Models\Warranty;
use App\Services\ReceiptService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Inertia\Inertia;

class SalesController extends Controller
{
    private function getUnitConversions()
    {
        return [
            'weight' => [
                'ton' => 1000,
                'kg' => 1,
                'gram' => 0.001,
                'pound' => 0.453592
            ],
            'volume' => [
                'liter' => 1,
                'ml' => 0.001
            ],
            'piece' => [
                'piece' => 1,
                'dozen' => 12,
                'box' => 1
            ],
            'length' => [
                'meter' => 1,
                'cm' => 0.01,
                'mm' => 0.001
            ]
        ];
    }

    // কনভার্ট টু বেস ইউনিট
    private function convertToBase($quantity, $fromUnit, $unitType)
    {
        $conversions = $this->getUnitConversions();

        if (!isset($conversions[$unitType][$fromUnit])) {
            return $quantity;
        }

        return $quantity * $conversions[$unitType][$fromUnit];
    }

    // কনভার্ট ফ্রম বেস ইউনিট
    private function convertFromBase($quantity, $toUnit, $unitType)
    {
        $conversions = $this->getUnitConversions();

        if (!isset($conversions[$unitType][$toUnit])) {
            return $quantity;
        }

        $conversion = $conversions[$unitType][$toUnit];
        return $conversion != 0 ? $quantity / $conversion : $quantity;
    }

    // Get available sale units for a product
    private function getAvailableSaleUnits($product, $stock = null)
    {
        $unitType = $product->unit_type ?? 'piece';
        $conversions = $this->getUnitConversions();

        if (!isset($conversions[$unitType])) {
            return [$product->default_unit ?? 'piece'];
        }

        // Get purchase unit from stock or product
        $purchaseUnit = $stock ? $stock->unit : ($product->default_unit ?? 'piece');
        $purchaseFactor = $conversions[$unitType][$purchaseUnit] ?? 1;

        // Get all units that are smaller or equal to purchase unit
        $available = [];
        foreach ($conversions[$unitType] as $unit => $factor) {
            if ($factor <= $purchaseFactor) {
                $available[] = $unit;
            }
        }

        // Sort from smallest to largest (gram < kg < ton)
        usort($available, function ($a, $b) use ($conversions, $unitType) {
            return ($conversions[$unitType][$a] ?? 0) <=> ($conversions[$unitType][$b] ?? 0);
        });

        return $available;
    }

    /**
     * Display a listing of all sales
     */
    public function index(Request $request)
    {
        return $this->renderIndex($request, 'inventory', 'sales/Index');
    }



    /**
     * Display a listing of all sales for the POS system
     */
    public function indexPos(Request $request)
    {
        return $this->renderIndex($request, 'pos', 'sales/IndexPos');
    }



    /**
     * Render the sales index view
     */
    private function renderIndex(Request $request, string $type, string $view)
    {
        $data = $this->indexView($request, $type);

        return Inertia::render($view, [
            'sales' => $data['sales'],
            'accounts' => Account::where('is_active', true)->get(),
            'isShadowUser' => $data['isShadowUser'],
            'filters' => $data['filters'],
            'unitConversions' => $this->getUnitConversions(),
        ]);
    }



    /**
     * Render the sales index view
     */
    private function indexView(Request $request, string $type): array
    {
        $user = Auth::user();
        $isShadowUser = $user->type === 'shadow';

        $filters = [
            'search' => $request->input('search'),
            'status' => $request->input('status'),
            'date_from' => $request->input('date_from'),
            'date_to' => $request->input('date_to'),
        ];

        $sales = Sale::with([
            'customer',
            'items.product.brand',
            'items.variant',
            'payments'
        ])
            ->where('type', $type)
            ->where('status', '!=', 'cancelled')
            ->when($filters['search'], function ($query, $search) {
                $query->where(function ($q) use ($search) {
                    $q->where('invoice_no', 'like', "%{$search}%")
                        ->orWhereHas('customer', function ($q) use ($search) {
                            $q->where('customer_name', 'like', "%{$search}%");
                        });
                });
            })
            ->when(
                $filters['status'],
                fn($q, $status) =>
                $q->where('status', $status)
            )
            ->when(
                $filters['date_from'],
                fn($q, $dateFrom) =>
                $q->whereDate('created_at', '>=', $dateFrom)
            )
            ->when(
                $filters['date_to'],
                fn($q, $dateTo) =>
                $q->whereDate('created_at', '<=', $dateTo)
            )
            ->latest()
            ->paginate(15)
            ->withQueryString();

        if ($isShadowUser) {
            $sales->getCollection()->transform(
                fn($sale) => $this->transformToShadowData($sale)
            );
        }

        return [
            'sales' => $sales,
            'isShadowUser' => $isShadowUser,
            'filters' => $filters,
        ];
    }



    /**
     * Show form for the sale(inventory) creation
     */
    public function create()
    {
        $user = Auth::user();
        $isShadowUser = $user->type === 'shadow';

        $customers = Customer::orWhere('phone', '!=', '100100100')
            ->active()
            ->get();

        $stock = Stock::with([
            'warehouse',
            'product.category',
            'product.brand',
            'variant',
            'identifiers', // <-- add this
        ])
            ->where('quantity', '>', 0)
            ->orderBy('created_at', 'asc')
            ->get();

        $accounts = Account::where('is_active', true)->get();

        $supplier = Supplier::where('type', 'local')->get();

        $products = Product::with('brand', 'variants')
            ->where('type', 'local')
            ->get();

        $render = $isShadowUser ? 'sales/CreateShadow' : 'sales/Create';

        return Inertia::render($render, [
            'customers' => $customers,
            'productstocks' => $stock,
            'accounts' => $accounts,
            'products' => $products,
            'isShadowUser' => $isShadowUser,
            'suppliers' => $supplier,
            'unitConversions' => $this->getUnitConversions()
        ]);
    }


    /**
     * Show form for the sale (POS) creation
     */
    public function createPos()
    {
        $user = Auth::user();
        $isShadowUser = $user->type === 'shadow';

        $customers = Customer::orWhere('phone', '!=', '100100100')
            ->active()
            ->get();

        $stock = Stock::with([
            'warehouse',
            'product.category',
            'product.brand',
            'variant',
            'identifiers', // add this
        ])
            ->where('quantity', '>', 0)
            ->orderBy('created_at', 'asc')
            ->get();

        $accounts = Account::where('is_active', true)->get();

        $supplier = Supplier::where('type', 'local')->get();

        $products = Product::with('brand', 'variants')
            ->where('type', 'local')
            ->get();

        $render = $isShadowUser ? 'sales/CreateShadowPos' : 'sales/CreatePos';

        return Inertia::render($render, [
            'customers' => $customers,
            'productstocks' => $stock,
            'products' => $products,
            'accounts' => $accounts,
            'isShadowUser' => $isShadowUser,
            'suppliers' => $supplier,
            'unitConversions' => $this->getUnitConversions()
        ]);
    }



    /**
     * Show form for the stock invoice creation
     */
    public function stockInvoice($batchno)
    {
        $user = Auth::user();
        $isShadowUser = $user->type === 'shadow';

        $sales = Stock::with(['warehouse', 'product.category', 'product.brand', 'variant'])
            ->where('quantity', '>', 0)
            ->where('batch_no', $batchno)
            ->first();

        if ($isShadowUser) {
            $sales->transform(function ($sale) {
                return $this->transformToShadowData($sale);
            });
        }

        return response()->json([
            'sales' => $sales,
            'isShadowUser' => $isShadowUser,
        ]);
    }


    /**
     * Store a new sale (Inventory)
     */
    public function store(Request $request)
    {
        try {
            $sale = $this->storeManage($request, 'inventory');

            return to_route('sales.show', $sale->id)
                ->with('success', 'Sale created successfully! Invoice: ' . $sale->invoice_no);
        } catch (\Throwable $e) {
            return back()->withErrors($e->getMessage())->withInput();
        }
    }



    /**
     * Store a new sale (POS)
     */
    public function storePos(Request $request)
    {
        try {
            $sale = $this->storeManage($request, 'pos');

            return to_route('salesPrint.show', $sale->id)
                ->with('success', 'Sale created successfully! Invoice: ' . $sale->invoice_no);
        } catch (\Throwable $e) {
            return back()->withErrors($e->getMessage())->withInput();
        }
    }




    /**
     * Shared create logic for both Inventory + POS
     */
    private function storeManage(Request $request, string $type): Sale
    {
        // -------------------------
        //  Rules (fixed order)
        // -------------------------
        $rules = [
            'customer_id' => 'nullable|exists:customers,id',
            'customer_name' => 'nullable|string|max:255',
            'phone' => 'nullable|string|max:20',
            'items' => 'nullable|array',
            'pickup_items' => 'nullable|array',

            'discount_type' => 'nullable|string|max:255',
            'discount_rate' => 'nullable|numeric|min:0',
            'flat_discount' => 'nullable|numeric|min:0',

            'vat_rate' => 'nullable|numeric|min:0',
            'sub_amount' => 'nullable|numeric|min:0',
            'grand_amount' => 'nullable|numeric|min:0',
            'paid_amount' => 'nullable|numeric|min:0',
            'due_amount' => 'nullable|numeric|min:0',

            'payment_status' => 'nullable|string|max:50',
            'payment_method' => 'nullable|string|max:50',
            'txn_ref' => 'nullable|string|max:100',
            'notes' => 'nullable|string|max:1000',

            'adjust_from_advance' => 'nullable|boolean',
            'customer_due_amount' => 'nullable|numeric|min:0',

            'installment_duration' => 'nullable|integer',
            'total_installments' => 'nullable|integer',
        ];

        // Validate at least one type of items
        if (empty($request->items) && empty($request->pickup_items)) {
            throw new \Exception('At least one item (stock or pickup) is required.');
        }
        if ($request->items && is_array($request->items) && count($request->items) > 0) {
            $rules['items.*.product_id'] = 'required|exists:products,id';
            $rules['items.*.variant_id'] = 'required|exists:variants,id';
            $rules['items.*.quantity'] = 'required|integer|min:1';

            $rules['items.*.unit'] = 'nullable|string|max:50';
            $rules['items.*.unit_quantity'] = 'nullable|numeric|min:0.0001';
            $rules['items.*.unit_price'] = 'nullable|numeric|min:0';
            $rules['items.*.shadow_sell_price'] = 'nullable|numeric|min:0';
            $rules['items.*.stock_id'] = 'nullable|integer';

            /*
            |--------------------------------------------------------------------------
            | IMEI / Serial selected from frontend
            |--------------------------------------------------------------------------
            */
            $rules['items.*.identifier_ids'] = 'nullable|array';
            $rules['items.*.identifier_ids.*'] = 'nullable|integer|exists:stock_identifiers,id';
        }

        if ($request->pickup_items && is_array($request->pickup_items) && count($request->pickup_items) > 0) {
            $rules['pickup_items.*.pickup_product_id'] = 'required|exists:products,id';
            $rules['pickup_items.*.pickup_supplier_id'] = 'required|exists:suppliers,id';
            $rules['pickup_items.*.variant_id'] = 'required|exists:variants,id';
            $rules['pickup_items.*.quantity'] = 'required|integer|min:1';
            $rules['pickup_items.*.unit_price'] = 'required|numeric|min:0.01';
            $rules['pickup_items.*.sale_price'] = 'required|numeric|min:0.01';
            $rules['pickup_items.*.total_price'] = 'nullable|numeric|min:0';
        }

        if ((float) $request->paid_amount > 0) {
            $rules['account_id'] = 'required|exists:accounts,id';
        }

        $request->validate($rules);
        // -------------------------
        // Discount (same logic)
        // -------------------------
        $discountType = $request->input('discount_type');
        $discount = 0;


        if ($discountType == 'flat_discount') {
            $discount = (float) ($request->flat_discount ?? 0);
        } else {
            $discount = (float) ($request->discount_rate ?? 0);
        }

        DB::beginTransaction();

        try {
            $adjust_amount = (bool) $request->adjust_from_advance;
            $paid_amount = (float) ($request->paid_amount ?? 0);

            $pickup_items = $request->pickup_items ?? [];
            $regular_items = $request->items ?? [];

            // -------------------------
            //  Validate account if paid
            // -------------------------
            $account = null;
            $account_id = null;
            $payment_type = 'cash';

            if ($paid_amount > 0) {
                $account_id = (int) $request->account_id;
                $account = Account::find($account_id);

                if (!$account || !$account->is_active) {
                    throw new \Exception('Selected account is not active or not found.');
                }

                $payment_type = $account->type ?? 'cash';
            }

            // -------------------------
            //  Determine customerId (same logic)
            // -------------------------
            $customerId = null;


            if (
                !$request->filled('customer_id') &&
                !$request->filled('customer_name') &&
                !$request->filled('phone')
            ) {
                $customer = Customer::where('phone', '100100100')
                    ->where('is_active', Customer::IS_ACTIVE)
                    ->where('created_by', Auth::id())
                    ->where('outlet_id', Auth::user()->current_outlet_id)
                    ->first();

                if ($customer) {
                    $customerId = $customer->id;
                } else {
                    $customer = Customer::create([
                        'customer_name' => 'Walk-In-Customer',
                        'phone' => '100100100',
                        'advance_amount' => 0,
                        'due_amount' => 0,
                        'is_active' => 1,
                        'created_by' => Auth::id(),
                        'outlet_id' => Auth::user()->current_outlet_id
                    ]);

                    $customerId = $customer->id;
                }
            } elseif (!empty($request->customer_id)) {
                $customerId = (int) $request->customer_id;
            } else {
                $name = trim((string) $request->customer_name);
                $phone = trim((string) $request->phone);

                if ($name !== '' && $phone !== '') {
                    $existingCustomer = Customer::where('phone', $phone)->first();

                    if ($existingCustomer) {
                        $customerId = $existingCustomer->id;
                    } else {
                        $customerId = Customer::create([
                            'customer_name' => $name,
                            'phone' => $phone,
                            'advance_amount' => 0,
                            'due_amount' => $request->customer_due_amount ?? 0,
                            'is_active' => 1,
                            'created_by' => Auth::id(),
                            'outlet_id' => Auth::user()->current_outlet_id
                        ])->id;
                    }
                }
            }

            // Inventory must have a customer
            if ($type === 'inventory' && !$customerId) {
                throw new \Exception('Customer is required for inventory sale.');
            }

            // -------------------------
            // ✅ Advance adjustment
            // -------------------------
            if ($adjust_amount === true && $customerId) {
                $customer = Customer::find($customerId);
                if (!$customer)
                    throw new \Exception('Customer not found for advance adjustment.');

                if ($paid_amount > $customer->advance_amount) {
                    throw new \Exception('Adjustment amount cannot be greater than available advance amount.');
                }

                $payment_type = 'advance_adjustment';

                $customer->update([
                    'advance_amount' => $customer->advance_amount - $paid_amount,
                ]);
            }

            // status
            $status = ((float) $request->paid_amount === (float) $request->grand_amount) ? 'paid' : 'partial';

            if ($request->payment_status == 'installment') {
                $payment_type = 'installment';
            }

            // -------------------------
            // ✅ Create SALE first (so we have $sale->id for FIFO / pickup purchase link)
            // -------------------------
            $sale = Sale::create([
                'customer_id' => $customerId ?? null,
                'invoice_no' => $this->generateInvoiceNo(),

                'sub_total' => $request->sub_amount ?? 0,
                'discount' => $discount ?? 0,
                'discount_type' => $discountType ?? 'percentage',
                'vat_tax' => $request->vat_rate ?? 0,
                'grand_total' => $request->grand_amount ?? 0,

                'paid_amount' => (float) ($request->paid_amount ?? 0),
                'due_amount' => $request->due_amount ?? (($request->grand_amount ?? 0) - ((float) ($request->paid_amount ?? 0))),

                'shadow_vat_tax' => $request->vat_rate ?? 0,
                'shadow_discount' => $request->discount_rate ?? 0,
                'shadow_sub_total' => $request->sub_amount ?? 0,
                'shadow_grand_total' => $request->grand_amount ?? 0,
                'shadow_paid_amount' => (float) ($request->paid_amount ?? 0),
                'shadow_due_amount' => $request->due_amount ?? 0,

                'account_id' => $account->id ?? null,
                'payment_type' => $payment_type ?? 'cash',
                'status' => $status ?? 'pending',
                'type' => $type ?? 'pos',
                'sale_type' => count($pickup_items) > 0 ? 'both' : 'real',
                'created_by' => Auth::id(),
                'outlet_id' => Auth::user()->current_outlet_id ?? null,
            ]);

            // -------------------------
            // ✅ Installment
            // -------------------------
            if ($request->payment_status === 'installment') {
                $installmentDuration = (int) $request->installment_duration;
                $totalInstallments = (int) $request->total_installments;

                // if you already have this method, keep it.
                if (method_exists($this, 'installmentManage')) {
                    $this->installmentManage($sale, $installmentDuration, $totalInstallments);
                }
            }

            // -------------------------
            // Totals
            // -------------------------
            $shadowSubTotal = 0;
            $regularSubTotal = 0;
            $pickupSaleTotal = 0;
            $pickupCostTotal = 0;

            // -------------------------
            // ✅ Regular items
            // -------------------------
            if (count($regular_items) > 0) {
                foreach ($regular_items as $item) {
                    if (!isset($item['product_id']) || !isset($item['variant_id'])) {
                        throw new \Exception('Product ID and Variant ID are required for inventory items.');
                    }

                    $product = Product::find($item['product_id']);
                    $variant = Variant::find($item['variant_id']);

                    if (!$product || !$variant) {
                        throw new \Exception('Product or Variant not found for inventory item.');
                    }
                    $identifierIds = array_values(array_filter($item['identifier_ids'] ?? []));

                    $unit = $item['unit'] ?? ($product->min_sale_unit ?? $product->default_unit ?? 'piece');
                    $unitQuantity = (float) ($item['unit_quantity'] ?? $item['quantity'] ?? 1);

                    /*
                    |--------------------------------------------------------------------------
                    | IMPORTANT FIX
                    |--------------------------------------------------------------------------
                    | Before: only product.is_tracking_enabled controlled IMEI/Serial sale.
                    | Now: purchase can create stock_identifiers even if product tracking flag is false.
                    | So if identifier_ids are selected, this item must be treated as tracked.
                    |--------------------------------------------------------------------------
                    */
                    $isTrackedProduct = (
                        (!empty($product->is_tracking_enabled) && in_array($product->tracking_type, ['imei', 'serial']))
                        || count($identifierIds) > 0
                    );

                    if ($isTrackedProduct) {
                        if ($unit !== 'piece') {
                            throw new \Exception("Tracked product must be sold in piece unit.");
                        }

                        if ((int) $unitQuantity !== count($identifierIds)) {
                            throw new \Exception("Identifier count must match quantity for {$product->name}.");
                        }

                        if (count($identifierIds) !== count(array_unique($identifierIds))) {
                            throw new \Exception("Duplicate identifier selected for {$product->name}.");
                        }

                        $validIdentifiers = StockIdentifier::query()
                            ->whereIn('id', $identifierIds)
                            ->where('stock_id', $item['stock_id'] ?? null)
                            ->where('product_id', $product->id)
                            ->where('variant_id', $variant->id)
                            ->where('status', 'available')
                            ->lockForUpdate()
                            ->get();

                        if ($validIdentifiers->count() !== count($identifierIds)) {
                            throw new \Exception("Some selected IMEI/Serial are invalid or unavailable for {$product->name}.");
                        }
                    }

                    // Get sale price (already converted to selected unit in frontend)
                    $unitPrice = (float) ($item['unit_price'] ?? 0);
                    $shadowUnitPrice = (float) ($item['shadow_sell_price'] ?? $unitPrice);

                    // base qty
                    $unitType = $product->unit_type ?? 'piece';
                    $baseQuantity = $this->convertToBase($unitQuantity, $unit, $unitType);

                    // Stock check in base units
                    $availableBaseQty = $this->getAvailableStockInBase(
                        $product->id,
                        $variant->id,
                        $item['stock_id'] ?? null
                    );

                    if ($baseQuantity > $availableBaseQty) {
                        $availableInUnit = $this->convertFromBase($availableBaseQty, $unit, $unitType);
                        throw new \Exception("Not enough stock for {$product->name}. Available: {$availableInUnit} {$unit}, Requested: {$unitQuantity} {$unit}");
                    }

                    // FIFO out base
                    $stockUsed = $this->fifoOutInBase(
                        $product->id,
                        $variant->id,
                        $baseQuantity,
                        $sale->id,
                        $item['stock_id'] ?? null,
                        $unit
                    );

                    $saleItem = SaleItem::create([
                        'sale_id' => $sale->id,
                        'product_id' => $product->id,
                        'variant_id' => $variant->id,
                        'warehouse_id' => $stockUsed['warehouse_id'] ?? null,

                        'quantity' => $unitQuantity,
                        'unit' => $unit,
                        'unit_quantity' => $unitQuantity,
                        'base_quantity' => $baseQuantity,

                        'unit_price' => $unitPrice,
                        'total_price' => $unitQuantity * $unitPrice,
                        'stock_id' => $stockUsed['stock_id'] ?? $item['stock_id'],

                        'shadow_unit_price' => $shadowUnitPrice,
                        'shadow_total_price' => $unitQuantity * $shadowUnitPrice,

                        'status' => 'completed',
                        'created_by' => Auth::id(),
                        'item_type' => 'real',
                    ]);

                    // ✅ Mark selected identifiers as sold
                    if ($isTrackedProduct && !empty($identifierIds)) {
                        StockIdentifier::query()
                            ->whereIn('id', $identifierIds)
                            ->update([
                                'status' => 'sold',
                                'sale_id' => $sale->id,
                                'sale_item_id' => $saleItem->id,
                                'sold_at' => now(),
                            ]);
                    }

                    // Warranty (only if your Product has these fields)
                    if (!empty($product->has_warranty)) {
                        Warranty::create([
                            'sale_item_id' => $saleItem->id,
                            'start_date' => now(),
                            'end_date' => now()->addDays((int) ($product->warranty_duration ?? 0)),
                            'terms' => $product->warranty_terms ?? null,
                        ]);
                    }

                    $shadowSubTotal += $unitQuantity * $shadowUnitPrice;
                    $regularSubTotal += $unitQuantity * $unitPrice;
                }
            }

            // -------------------------
            //  Pickup items
            // -------------------------
            if (count($pickup_items) > 0) {
                foreach ($pickup_items as $pickupItem) {
                    $product = Product::with('variants', 'brand')->find($pickupItem['pickup_product_id']);
                    $supplier = Supplier::find($pickupItem['pickup_supplier_id']);

                    $variantId = (int) $pickupItem['variant_id'];
                    $variant = Variant::where('id', $variantId)->where('product_id', $product?->id)->first();

                    if (!$product || !$supplier) {
                        throw new \Exception('Product or Supplier not found for pickup item.');
                    }

                    if (!$variant) {
                        throw new \Exception('Selected variant does not belong to the selected product.');
                    }

                    $pickupQuantity = (int) ($pickupItem['quantity'] ?? 1);
                    $pickupUnitPrice = (float) ($pickupItem['unit_price'] ?? 0);
                    $pickupSalePrice = (float) ($pickupItem['sale_price'] ?? $pickupUnitPrice);
                    $pickupTotalPrice = (float) ($pickupItem['total_price'] ?? ($pickupQuantity * $pickupSalePrice));

                    $purchase = Purchase::create([
                        'purchase_no' => 'PPP-' . now()->format('Ymd') . '-' . strtoupper(Str::random(5)),
                        'warehouse_id' => null,
                        'supplier_id' => $supplier->id ?? $request->supplier_id,
                        'purchase_date' => Carbon::now(),
                        'grand_total' => $pickupUnitPrice * $pickupQuantity,
                        'paid_amount' => 0,
                        'status' => 'pending',
                        'due_amount' => $pickupUnitPrice * $pickupQuantity,
                        'created_by' => Auth::id(),
                        'type' => defined(Purchase::class . '::TYPE_LOCAL') ? Purchase::TYPE_LOCAL : 'local',
                        'pickup_sale_id' => $sale->id,
                    ]);

                    $purchaseItem = PurchaseItem::create([
                        'purchase_id' => $purchase->id,
                        'product_id' => $product->id,
                        'variant_id' => $variantId,
                        'warehouse_id' => null,
                        'supplier_id' => $supplier->id ?? $request->supplier_id,
                        'quantity' => $pickupQuantity,
                        'unit_price' => $pickupUnitPrice,
                        'total_price' => $pickupUnitPrice * $pickupQuantity,
                        'sale_price' => $pickupSalePrice,
                        'created_by' => Auth::id(),
                        'item_type' => 'pickup',
                        'product_name' => $product->name,
                        'brand' => $product->brand->name ?? null,
                    ]);

                    SaleItem::create([
                        'sale_id' => $sale->id,
                        'product_id' => $product->id,
                        'variant_id' => $variantId,
                        'warehouse_id' => null,
                        'stock_id' => null,
                        'quantity' => $pickupQuantity,
                        'unit_price' => $pickupSalePrice,
                        'total_price' => $pickupTotalPrice,
                        'status' => 'completed',
                        'created_by' => Auth::id(),
                        'item_type' => 'pickup',
                        'product_name' => $product->name ?? null,
                        'brand' => $product->brand->name ?? null,
                        'purchase_item_id' => $purchaseItem->id,
                    ]);

                    $pickupCostTotal += $pickupUnitPrice * $pickupQuantity;
                    $pickupSaleTotal += $pickupTotalPrice;

                    // in your old code you added pickup sale into regularSubTotal too
                    $regularSubTotal += $pickupTotalPrice;
                }
            }

            if (count($regular_items) == 0 && count($pickup_items) == 0) {
                throw new \Exception('At least one item is required for a sale.');
            }

            // -------------------------
            //  Calculate totals (same structure)
            // -------------------------
            $totalSubTotal = $regularSubTotal;

            // if percentage discount => amount = subtotal * discount/100
            // if ($discountType == 'percentage') {
            //     $totalDiscountAmount = $totalSubTotal * ($discount ?? 0) / 100;
            // } else{
            //     $totalDiscountAmount = $discount ?? 0;
            // }

            $totalVatAmount = $totalSubTotal * ((float) ($request->vat_rate ?? 0)) / 100;

            // $grandTotal = $totalSubTotal - $totalDiscountAmount + $totalVatAmount;

            $shadowGrandTotal = $shadowSubTotal + $pickupSaleTotal;
            if ($shadowGrandTotal > 0) {
                $shadowGrandTotal += $shadowGrandTotal * ((float) ($request->vat_rate ?? 0)) / 100;
                $shadowGrandTotal -= $shadowGrandTotal * ((float) ($request->discount_rate ?? 0)) / 100;
            }

            // Update sale with calculated totals
            $sale->update([
                'sub_total' => $totalSubTotal,
                // 'grand_total' => $grandTotal,

                'shadow_sub_total' => $shadowSubTotal + $pickupSaleTotal,
                'shadow_grand_total' => $shadowGrandTotal,

                'shadow_due_amount' => max(0, $shadowGrandTotal - ($paid_amount ?? 0)),
                'shadow_paid_amount' => min($paid_amount ?? 0, $shadowGrandTotal),
            ]);

            // -------------------------
            //  Payment create (same logic)
            // -------------------------
            if ($paid_amount > 0) {
                Payment::create([
                    'sale_id' => $sale->id,
                    'account_id' => $account_id ?? null,
                    'amount' => $paid_amount,
                    'shadow_amount' => min($paid_amount, $shadowGrandTotal),
                    'payment_method' => $request->payment_method ?? ($payment_type ?? 'cash'),
                    'txn_ref' => $request->txn_ref ?? ('SIOP-' . Str::random(10)),
                    'note' => $request->notes ?? null,
                    'customer_id' => $customerId,
                    'paid_at' => Carbon::now(),
                    'status' => 'completed',
                    'created_by' => Auth::id(),
                ]);

                if ($adjust_amount == false && $account) {
                    if (method_exists($account, 'updateBalance')) {
                        $account->updateBalance($paid_amount, 'credit');
                    }
                }
            }

            DB::commit();
            return $sale;
        } catch (\Throwable $e) {
            DB::rollBack();
            throw $e;
        }
    }



    //installment manage function
    private function installmentManage($sale, $installmentDuration, $totalInstallments)
    {
        if ($installmentDuration > 0 && $totalInstallments > 0) {
            $sale->update([
                'installment_duration' => $installmentDuration,
                'total_installments' => $totalInstallments,
            ]);
        }

        $installmentTotal = $sale->grand_total - $sale->paid_amount;
        $perInstallmentAmount = round(
            $installmentTotal / $totalInstallments,
            2
        );

        // months per installment (can be 1.5, 2.5 etc)
        $monthsPerInstallment = $installmentDuration / $totalInstallments;

        for ($i = 1; $i <= $totalInstallments; $i++) {

            // Convert months → days (approx)
            $daysToAdd = (int) round($monthsPerInstallment * 30 * $i);

            Installment::create([
                'sale_id' => $sale->id,
                'installment_no' => $i,
                'amount' => $perInstallmentAmount,
                'due_date' => Carbon::now()->addDays($daysToAdd),
                'paid_amount' => 0,
                'status' => 'pending',
            ]);
        }
    }


    // Get available stock in base units
    private function getAvailableStockInBase($productId, $variantId, $stockId = null)
    {
        $product = Product::find($productId);
        $unitType = $product?->unit_type ?? 'piece';

        $query = Stock::where('product_id', $productId)
            ->when($variantId, function ($q) use ($variantId) {
                $q->where('variant_id', $variantId);
            }, function ($q) {
                // ✅ variantId null হলে stock.variant_id NULL খুঁজবে
                $q->whereNull('variant_id');
            })
            ->where('quantity', '>', 0);

        if ($stockId) {
            $query->where('id', $stockId);
        }

        $stocks = $query->get();

        $totalBase = 0;
        foreach ($stocks as $stock) {
            $stockUnit = $stock->unit ?? ($product?->default_unit ?? 'piece');
            // ✅ base_quantity এর উপর depend না করে quantity+unit থেকে base হিসাব
            $totalBase += $this->convertToBase((float) $stock->quantity, $stockUnit, $unitType);
        }

        return $totalBase;
    }

    // FIFO stock deduction in base units
    private function fifoOutInBase($productId, $variantId, $neededBaseQty, $saleId, $stockId = null, $saleUnit = null)
    {
        $product = Product::find($productId);
        $unitType = $product?->unit_type ?? 'piece';

        $query = Stock::where('product_id', $productId)
            ->when($variantId, function ($q) use ($variantId) {
                $q->where('variant_id', $variantId);
            }, function ($q) {
                $q->whereNull('variant_id');
            })
            ->where('quantity', '>', 0);

        if ($stockId) {
            $query->where('id', $stockId);
        }

        $stocks = $query->orderBy('created_at', 'asc')->lockForUpdate()->get();

        $stockUsed = [
            'warehouse_id' => null,
            'stock_id' => null
        ];

        foreach ($stocks as $stock) {
            if ($neededBaseQty <= 0)
                break;

            $stockUnit = $stock->unit ?? ($product?->default_unit ?? 'piece');

            // ✅ available base from stock.quantity not base_quantity
            $availableBaseQty = $this->convertToBase((float) $stock->quantity, $stockUnit, $unitType);

            if ($availableBaseQty <= 0)
                continue;

            $takeBase = min($availableBaseQty, $neededBaseQty);
            $remainingBaseQty = $availableBaseQty - $takeBase;

            // ✅ convert remaining base back to stock unit and update quantity
            $remainingUnitQty = $this->convertFromBase($remainingBaseQty, $stockUnit, $unitType);

            $stock->update([
                'quantity' => $remainingUnitQty,
                // optional: keep base_quantity synced too
                'base_quantity' => $remainingBaseQty,
            ]);

            $neededBaseQty -= $takeBase;

            if (!$stockUsed['warehouse_id']) {
                $stockUsed['warehouse_id'] = $stock->warehouse_id;
                $stockUsed['stock_id'] = $stock->id;
            }

            StockMovement::create([
                'warehouse_id' => $stock->warehouse_id ?? null,
                'product_id' => $productId,
                'variant_id' => $variantId,
                'type' => 'out',
                'qty' => $takeBase,
                'unit' => 'base',
                'sale_unit' => $saleUnit,
                'reference_type' => Sale::class,
                'reference_id' => $saleId,
                'created_by' => Auth::id(),
                'notes' => 'Sale deduction in base units. Sold in unit: ' . $saleUnit
            ]);
        }

        if ($neededBaseQty > 0) {
            throw new \Exception("Not enough stock for product ID {$productId}.");
        }

        return $stockUsed;
    }


    // Get product with stock info
    public function getProductWithStock($productId, $variantId = null)
    {
        try {
            $product = Product::with(['variants.stock'])->findOrFail($productId);

            // Calculate total available stock
            $totalStock = 0;
            $totalBaseStock = 0;

            foreach ($product->variants as $variant) {
                if ($variant->stock) {
                    $totalStock += $variant->stock->quantity;
                    $totalBaseStock += $variant->stock->base_quantity ?? $variant->stock->quantity;
                }
            }

            $response = [
                'product' => $product,
                'total_stock' => $totalStock,
                'total_base_stock' => $totalBaseStock,
                'unit_type' => $product->unit_type ?? 'piece',
                'default_unit' => $product->default_unit ?? 'piece',
                'min_sale_unit' => $product->min_sale_unit ?? null,
                'is_fraction_allowed' => $product->is_fraction_allowed ?? false,
            ];

            if ($variantId) {
                $variant = Variant::with('stock')->where('product_id', $productId)
                    ->where('id', $variantId)
                    ->first();

                if ($variant) {
                    $response['variant'] = $variant;
                    $response['variant_stock'] = $variant->stock;
                }
            }

            return response()->json($response);
        } catch (\Exception $e) {
            return response()->json(['error' => 'Product not found'], 404);
        }
    }

    /**
     * Display the specified sale
     */
    public function show(Sale $sale)
    {
        return $this->renderShow($sale, 'sales/Show');
    }

    public function showPos(Sale $sale)
    {
        return $this->renderShow($sale, 'sales/ShowPos');
    }


    private function renderShow(Sale $sale, string $view)
    {
        $data = $this->showView($sale);

        return Inertia::render($view, [
            'sale' => $data['sale'],
            'isShadowUser' => $data['isShadowUser'],
            'businessProfile' => $data['businessProfile'],
        ]);
    }


    private function showView(Sale $sale): array
    {
        $user = Auth::user();
        $isShadowUser = $user->type === 'shadow';

        $businessProfile = BusinessProfile::where('created_by', $user->id)->first();


        $sale = Sale::with([
            'customer',
            'items.product.brand',
            'items.variant',
            'items.warehouse',
            'items.stock.identifiers',
            'creator',
        ])->findOrFail($sale->id);

        $sale->items->transform(function ($item) {
            /*
            |--------------------------------------------------------------------------
            | IMEI / Serial for invoice
            |--------------------------------------------------------------------------
            | The historical relation is sale_item_id.
            | Do not depend on current stock_id/status for invoice display.
            |--------------------------------------------------------------------------
            */
            $item->identifiers = StockIdentifier::where('sale_item_id', $item->id)
                ->get([
                    'id',
                    'identifier_type',
                    'identifier_value',
                    'status',
                    'sold_at',
                    'sale_id',
                    'sale_item_id',
                ]);

            return $item;
        });

        if ($isShadowUser) {
            $sale = $this->transformToShadowData($sale);
        }

        return [
            'sale' => $sale,
            'isShadowUser' => $isShadowUser,
            'businessProfile' => $businessProfile,
        ];
    }


    /**
     * Remove the specified sale
     */
    public function destroy(Sale $sale)
    {
        DB::beginTransaction();

        try {
            foreach ($sale->items as $item) {
                if ($item->item_type === 'real') {
                    // Find stock record and add back the quantity
                    $stock = Stock::where('product_id', $item->product_id)
                        ->where('variant_id', $item->variant_id)
                        ->where('warehouse_id', $item->warehouse_id)
                        ->first();

                    if ($stock) {
                        // Calculate base quantity to add back
                        $unitType = $item->product->unit_type ?? 'piece';
                        $baseQty = $this->convertToBase($item->quantity, $item->unit, $unitType);

                        $stock->increment('quantity', $item->quantity);
                        $stock->increment('base_quantity', $baseQty);
                    }
                }
            }

            $sale->delete();

            DB::commit();

            return redirect()->route('sales.index')->with('success', 'Sale deleted successfully!');
        } catch (\Exception $e) {
            DB::rollBack();
            return back()->withErrors($e->getMessage());
        }
    }



    private function generateInvoiceNo(): string
    {
        $prefix = 'INV-' . now()->format('Y-m') . '-';

        $lastInvoice = Sale::where('invoice_no', 'like', $prefix . '%')
            ->orderByDesc('invoice_no')
            ->value('invoice_no');

        $num = $lastInvoice
            ? (int) substr($lastInvoice, -4) + 1
            : 1;

        return $prefix . str_pad($num, 4, '0', STR_PAD_LEFT) . Str::random(3);
    }



    //clear due of sales order
    public function storePayment(Request $request, Sale $sale)
    {
        $request->validate([
            'amount' => 'required|numeric|min:0.01',
            'account_id' => 'required|exists:accounts,id',
            'payment_method' => 'required|string',
        ]);

        $customerId = $sale->customer_id;
        $account = Account::find($request->account_id);

        if (!$account || !$account->is_active) {
            return back()->withErrors(['error' => 'Selected account is not active or not found.']);
        }

        DB::beginTransaction();

        try {
            // Create payment record
            Payment::create([
                'sale_id' => $sale->id,
                'account_id' => $request->account_id,
                'customer_id' => $customerId,
                'amount' => $request->amount,
                'shadow_amount' => $request->shadow_paid_amount ?? 0,
                'payment_method' => $request->payment_method,
                'txn_ref' => $request->txn_ref ?? ('nexoryn-' . Str::random(10)),
                'note' => $request->notes ?? 'sales due payment clearance',
                'paid_at' => $request->payment_date ?? Carbon::now(),
                'created_by' => Auth::id(),
                'status' => 'completed',
            ]);

            // Update sale amounts
            $newPaidAmount = $sale->paid_amount + $request->amount;
            $newDueAmount = max(0, $sale->due_amount - $request->amount);

            $sale->update([
                'paid_amount' => $newPaidAmount ?? 0,
                'account_id' => $request->account_id ?? null,
                'shadow_paid_amount' => $sale->shadow_paid_amount + ($request->shadow_paid_amount ?? 0),
                'due_amount' => $newDueAmount ?? 0,
                'shadow_due_amount' => max(0, $sale->shadow_due_amount - ($request->shadow_paid_amount ?? 0)),
                'status' => $newDueAmount <= 0.01 ? 'paid' : 'partial',
            ]);

            // Update account balance (credit for income from sale)
            $account->updateBalance($request->amount, 'credit');

            DB::commit();

            return redirect()->back()->with('success', 'Payment recorded successfully!');
        } catch (\Exception $e) {
            DB::rollBack();
            return back()->withErrors(['error' => 'Payment failed: ' . $e->getMessage()]);
        }
    }


    private function transformToShadowData($sale)
    {
        $sale->sub_total = $sale->shadow_sub_total;
        $sale->discount = $sale->shadow_discount;
        $sale->vat_tax = $sale->shadow_vat_tax;
        $sale->grand_total = $sale->shadow_grand_total;
        $sale->paid_amount = $sale->shadow_paid_amount;
        $sale->due_amount = $sale->shadow_due_amount;

        if ($sale->items) {
            $sale->items->transform(function ($item) {
                $item->unit_price = $item->shadow_unit_price;
                $item->sale_price = $item->shadow_sale_price;
                $item->total_price = $item->shadow_total_price;
                return $item;
            });
        }

        return $sale;
    }

    public function scanBarcode(Request $request)
    {
        $code = trim($request->code);
        $code = preg_replace('/\s+/', '', $code);

        $stock = Stock::with(['product', 'variant'])
            ->where('quantity', '>', 0)
            ->where(function ($q) use ($code) {
                $q->where('barcode', $code)
                    ->orWhere('batch_no', $code);
            })
            ->first();

        if (!$stock) {
            return response()->json([
                'message' => 'Stock not found',
                'code_received' => $code,
            ], 404);
        }

        return response()->json([
            'stock' => [
                'id' => $stock->id,
                'barcode' => $stock->barcode,
                'batch_no' => $stock->batch_no,
                'quantity' => $stock->quantity,
                'base_quantity' => $stock->base_quantity,
                'unit' => $stock->unit,
                'sale_price' => $stock->sale_price,
                'shadow_sale_price' => $stock->shadow_sale_price,
                'product' => [
                    'id' => $stock->product->id,
                    'name' => $stock->product->name,
                    'product_no' => $stock->product->product_no,
                    'unit_type' => $stock->product->unit_type ?? 'piece',
                    'default_unit' => $stock->product->default_unit ?? 'piece',
                    'is_fraction_allowed' => $stock->product->is_fraction_allowed ?? false,
                    'min_sale_unit' => $stock->product->min_sale_unit ?? null,
                ],
                'variant' => [
                    'id' => $stock->variant->id,
                    'sku' => $stock->variant->sku,
                    'attribute_values' => $stock->variant->attribute_values,
                ],
            ]
        ]);
    }

    // Get available units for a product
    public function getAvailableUnits($productId, $stockId = null)
    {
        try {
            $product = Product::findOrFail($productId);
            $stock = $stockId ? Stock::find($stockId) : null;

            $availableUnits = $this->getAvailableSaleUnits($product, $stock);

            return response()->json([
                'units' => $availableUnits,
                'default_unit' => $product->default_unit ?? 'piece',
                'min_sale_unit' => $product->min_sale_unit ?? null,
                'is_fraction_allowed' => $product->is_fraction_allowed ?? false,
                'unit_type' => $product->unit_type ?? 'piece'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Product not found',
                'units' => ['piece'],
                'default_unit' => 'piece',
                'min_sale_unit' => null,
                'is_fraction_allowed' => false,
                'unit_type' => 'piece'
            ], 404);
        }
    }

    // Get available sale units for a specific stock item
    public function getAvailableSaleUnitsForStock($stockId)
    {
        $stock = Stock::with('product')->findOrFail($stockId);
        $product = $stock->product;

        if (!$product) {
            return response()->json(['available_units' => [$stock->unit ?? 'piece']]);
        }

        $availableUnits = $this->getAvailableSaleUnits($product, $stock);

        // Calculate price in different units
        $prices = [];
        foreach ($availableUnits as $unit) {
            if ($unit === $stock->unit) {
                $prices[$unit] = $stock->sale_price;
            } else {
                $prices[$unit] = $this->calculatePriceInUnit(
                    $stock->sale_price,
                    $stock->unit,
                    $unit,
                    $product->unit_type ?? 'piece'
                );
            }
        }

        return response()->json([
            'available_units' => $availableUnits,
            'prices' => $prices,
            'purchase_unit' => $stock->unit,
            'sale_price' => $stock->sale_price,
            'base_quantity' => $stock->base_quantity,
            'product' => [
                'name' => $product->name,
                'unit_type' => $product->unit_type,
                'is_fraction_allowed' => $product->is_fraction_allowed
            ]
        ]);
    }

    // Calculate price in different unit
    private function calculatePriceInUnit($price, $fromUnit, $toUnit, $unitType)
    {
        $conversions = $this->getUnitConversions();

        if (!isset($conversions[$unitType][$fromUnit]) || !isset($conversions[$unitType][$toUnit])) {
            return $price;
        }

        $pricePerBaseUnit = $price / $conversions[$unitType][$fromUnit];
        return $pricePerBaseUnit * $conversions[$unitType][$toUnit];
    }

    // Get unit conversion rates
    public function getUnitConversionRates()
    {
        return response()->json([
            'conversions' => $this->getUnitConversions()
        ]);
    }


    /**
     * Get all sales items
     */
    public function allSalesItems()
    {
        $user = Auth::user();
        $isShadowUser = $user->type === 'shadow';

        $salesItems = SaleItem::with([
            'sale.customer',
            'product',
            'variant',
            'stock',
            'warehouse',
            'damage'
        ])
            ->where('status', '!=', 'cancelled')
            ->when(request()->filled(['start_date', 'end_date']), function ($q) {
                $q->whereBetween('created_at', [
                    request()->start_date,
                    request()->end_date
                ]);
            })
            ->filter(request()->all())
            ->orderBy('created_at', 'desc')
            ->paginate(15)
            ->withQueryString();

        if ($isShadowUser) {
            $salesItems->getCollection()->transform(function ($item) {
                return self::transformToShadowItemData($item);
            });
        }

        return Inertia::render('sales/SalesItem', [
            'salesItems' => $salesItems,
            'isShadowUser' => $isShadowUser,
        ]);
    }


    public function showItem($id)
    {
        $user = Auth::user();
        $isShadowUser = $user->type === 'shadow';
        $saleItem = SaleItem::with(['sale.customer', 'product', 'variant', 'warehouse',])->findOrFail($id);

        if ($isShadowUser) {
            $saleItem = self::transformToShadowItemData($saleItem);
        }

        return Inertia::render('sales/ShowItem', [
            'saleItem' => $saleItem,
            'isShadowUser' => $isShadowUser,
        ]);
    }


    /**
     * Update the specified sale item
     */

    private static function transformToShadowItemData($salesItems)
    {

        $salesItems->unit_price = $salesItems->shadow_unit_price;
        $salesItems->total_price = $salesItems->shadow_total_price;
        return $salesItems;
    }
}
