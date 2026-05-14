<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Http\Requests\PurchaseRequestStore;
use App\Models\Account;
use App\Models\Attribute;
use App\Models\AttributeValue;
use App\Models\BusinessProfile;
use App\Models\Installment;
use App\Models\Payment;
use App\Models\Product;
use App\Models\Purchase;
use App\Models\PurchaseItem;
use App\Models\Stock;
use App\Models\StockIdentifier;
use App\Models\Supplier;
use App\Models\Variant;
use App\Models\Warehouse;
use App\Models\Warranty;
use Carbon\Carbon;
use DNS1D;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Illuminate\Support\Facades\Validator;
use Inertia\Inertia;

class PurchaseController extends Controller
{
    // ইউনিট কনভার্সন ফ্যাক্টর
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

    // Show purchase list with stocks and barcodes
    public function index(Request $request)
    {
        $user = Auth::user();
        $isShadowUser = $user->type === 'shadow';

        $query = Purchase::latest()
            ->GlobalOnly()
            ->with([
                'supplier',
                'warehouse',
                'items.product',
                'items.variant',
                'items.stock.identifiers',
            ]);

        // Search filter
        $query->when($request->filled('search'), function ($q) use ($request) {
            $search = $request->search;

            $q->where('purchase_no', 'like', "%{$search}%")
                ->orWhereHas(
                    'supplier',
                    fn($q) =>
                    $q->where('name', 'like', "%{$search}%")
                        ->orWhere('company', 'like', "%{$search}%")
                )
                ->orWhereHas(
                    'warehouse',
                    fn($q) =>
                    $q->where('name', 'like', "%{$search}%")
                        ->orWhere('code', 'like', "%{$search}%")
                )
                ->orWhereHas(
                    'items.stock',
                    fn($q) =>
                    $q->where('barcode', 'like', "%{$search}%")
                        ->orWhere('batch_no', 'like', "%{$search}%")
                )
                ->orWhereHas(
                    'items.stock.identifiers',
                    fn($q) =>
                    $q->where('identifier_value', 'like', "%{$search}%")
                        ->orWhere('identifier_type', 'like', "%{$search}%")
                );
        });

        // Other filters
        $query->when(
            $request->filled('status'),
            fn($q) => $q->where('status', $request->status)
        );

        $query->when(
            $request->filled('date'),
            fn($q) => $q->whereDate('purchase_date', $request->date)
        );

        $query->when(
            $request->filled(['date_from', 'date_to']),
            fn($q) =>
            $q->whereBetween('purchase_date', [
                $request->date_from,
                $request->date_to
            ])
        );

        $purchases = $query->paginate(20)->withQueryString();

        $purchases->getCollection()->transform(function ($purchase) use ($isShadowUser) {

            if ($isShadowUser) {
                $purchase = $this->transformToShadowData($purchase);
            }

            $barcodes = [];
            $identifiers = [];

            $purchase->items?->transform(function ($item) use (&$barcodes, &$identifiers) {

                $stock = Stock::with('identifiers')
                    ->where([
                        'product_id' => $item->product_id,
                        'variant_id' => $item->variant_id,
                    ])
                    ->where('batch_no', 'LIKE', "PO-{$item->id}-%")
                    ->first();

                if (!$stock) {
                    $item->stock = null;
                    return $item;
                }

                $item->stock = [
                    'id' => $stock->id,
                    'batch_no' => $stock->batch_no,
                    'barcode' => $stock->barcode,
                    'barcode_path' => $stock->barcode_path,
                    'quantity' => $stock->quantity,
                    'base_quantity' => $stock->base_quantity,
                    'unit' => $stock->unit,
                    'created_at' => $stock->created_at,
                    'has_barcode' => !empty($stock->barcode),
                    'identifiers' => $stock->identifiers->map(function ($identifier) {
                        return [
                            'id' => $identifier->id,
                            'identifier_type' => $identifier->identifier_type,
                            'identifier_value' => $identifier->identifier_value,
                            'status' => $identifier->status,
                            'sale_id' => $identifier->sale_id,
                            'sale_item_id' => $identifier->sale_item_id,
                            'sold_at' => $identifier->sold_at,
                        ];
                    })->values(),
                ];

                if ($stock->barcode) {
                    $barcodes[] = [
                        'barcode' => $stock->barcode,
                        'product_name' => $item->product->name ?? '',
                        'quantity' => $stock->quantity,
                        'unit' => $stock->unit,
                    ];
                }

                foreach ($stock->identifiers as $identifier) {
                    $identifiers[] = [
                        'id' => $identifier->id,
                        'product_name' => $item->product->name ?? '',
                        'variant_name' => $item->variant->sku ?? '',
                        'batch_no' => $stock->batch_no,
                        'barcode' => $stock->barcode,
                        'identifier_type' => $identifier->identifier_type,
                        'identifier_value' => $identifier->identifier_value,
                        'status' => $identifier->status,
                        'sold_at' => $identifier->sold_at,
                    ];
                }

                return $item;
            });

            $purchase->barcodes = $barcodes;
            $purchase->has_barcode = count($barcodes) > 0;
            $purchase->barcode_count = count($barcodes);

            $purchase->identifiers = $identifiers;
            $purchase->has_identifiers = count($identifiers) > 0;
            $purchase->identifier_count = count($identifiers);

            return $purchase;
        });

        return Inertia::render('Purchase/PurchaseList', [
            'filters' => $request->only(['search', 'status', 'date', 'date_from', 'date_to']),
            'purchases' => $purchases,
            'isShadowUser' => $isShadowUser,
            'accounts' => Account::where('is_active', true)->get(),
        ]);
    }

    public function list_index(Request $request)
    {
        $user = Auth::user();
        $isShadowUser = ($user->type === 'shadow');

        $query = Purchase::latest()
            ->LocalOnly()
            ->with(['supplier', 'warehouse', 'items.product', 'items.variant']);

        // Search filter
        $query->when($request->filled('search'), function ($q) use ($request) {
            $search = $request->search;

            $q->where('purchase_no', 'like', "%{$search}%")
                ->orWhereHas(
                    'supplier',
                    fn($q) =>
                    $q->where('name', 'like', "%{$search}%")
                        ->orWhere('company', 'like', "%{$search}%")
                )
                ->orWhereHas(
                    'warehouse',
                    fn($q) =>
                    $q->where('name', 'like', "%{$search}%")
                        ->orWhere('code', 'like', "%{$search}%")
                )
                ->orWhereHas(
                    'items.stock',
                    fn($q) =>
                    $q->where('barcode', 'like', "%{$search}%")
                        ->orWhere('batch_no', 'like', "%{$search}%")
                );
        });

        // Other filters
        $query->when(
            $request->filled('status'),
            fn($q) => $q->where('status', $request->status)
        );

        $query->when(
            $request->filled('date'),
            fn($q) => $q->whereDate('purchase_date', $request->date)
        );

        $query->when(
            $request->filled(['date_from', 'date_to']),
            fn($q) =>
            $q->whereBetween('purchase_date', [
                $request->date_from,
                $request->date_to
            ])
        );

        $purchases = $query->paginate(10)->withQueryString();

        // Attach item-wise stock/barcode info for index page
        $purchases->getCollection()->transform(function ($purchase) use ($isShadowUser) {

            if ($isShadowUser) {
                $purchase = $this->transformToShadowData($purchase);
            }

            if ($purchase->items) {
                $purchase->items->transform(function ($item) {

                    // Find stock for this purchase item by batch pattern: PO-{item_id}-XXXX
                    $stock = Stock::where('product_id', $item->product_id)
                        ->where('variant_id', $item->variant_id)
                        ->where('batch_no', 'LIKE', 'PO-' . $item->id . '-%')
                        ->first();

                    $item->stock = $stock ? [
                        'id' => $stock->id,
                        'batch_no' => $stock->batch_no,
                        'barcode' => $stock->barcode,
                        'barcode_path' => $stock->barcode_path,
                        'quantity' => $stock->quantity,
                        'base_quantity' => $stock->base_quantity,
                        'unit' => $stock->unit,
                        'created_at' => $stock->created_at,
                        'has_barcode' => !empty($stock->barcode),
                    ] : null;

                    return $item;
                });

                $barcodes = [];
                $hasBarcode = false;

                foreach ($purchase->items as $item) {
                    if ($item->stock && $item->stock['barcode']) {
                        $barcodes[] = [
                            'barcode' => $item->stock['barcode'],
                            'product_name' => $item->product->name ?? '',
                            'quantity' => $item->stock['quantity'],
                            'unit' => $item->stock['unit'],
                        ];
                        $hasBarcode = true;
                    }
                }

                $purchase->barcodes = $barcodes;
                $purchase->has_barcode = $hasBarcode;
                $purchase->barcode_count = count($barcodes);
            }

            return $purchase;
        });

        return Inertia::render('Purchase/PurchaseList', [
            'filters' => $request->only(['search', 'status', 'date']),
            'purchases' => $purchases,
            'isShadowUser' => $isShadowUser,
            'accounts' => Account::where('is_active', true)->get()
        ]);
    }


    public function create()
    {
        $user = Auth::user();
        $isShadowUser = ($user->type === 'shadow');

        $attributes = Attribute::with(['activeValues'])
            ->active()
            ->get()
            ->map(function ($attribute) {
                return [
                    'id' => $attribute->id,
                    'name' => $attribute->name,
                    'code' => $attribute->code,
                    'active_values' => $attribute->activeValues->map(function ($value) {
                        return [
                            'id' => $value->id,
                            'value' => $value->value,
                            'code' => $value->code,
                        ];
                    })->values(),
                ];
            })->values();

        return Inertia::render('Purchase/AddPurchase', [
            'suppliers' => Supplier::where('type', 'global')->get(),
            'warehouses' => Warehouse::where('is_active', true)->get(),
            'products' => Product::where('type', 'global')
                ->with(['brand', 'category', 'variants.stock'])
                ->get(),
            'attributes' => $attributes,
            'accounts' => Account::where('is_active', true)->get(),
            'isShadowUser' => $isShadowUser,
            'unitConversions' => $this->getUnitConversions()
        ]);
    }

    private function normalizePurchaseAttributes(array $attributes): array
    {
        $normalized = [];

        foreach ($attributes as $attributeName => $attributeValue) {
            $name = trim((string) $attributeName);

            if ($name === '') {
                continue;
            }

            if (is_array($attributeValue)) {
                $attributeValue = $attributeValue['value'] ?? $attributeValue['name'] ?? '';
            }

            $value = trim((string) $attributeValue);

            if ($value === '') {
                continue;
            }

            $normalized[$name] = $value;
        }

        ksort($normalized);

        return $normalized;
    }

    private function ensureAttributeAndValueExist(string $attributeName, string $attributeValue): void
    {
        $attributeName = trim($attributeName);
        $attributeValue = trim($attributeValue);

        if ($attributeName === '' || $attributeValue === '') {
            return;
        }

        $attribute = Attribute::whereRaw('LOWER(name) = ?', [strtolower($attributeName)])->first();

        if (!$attribute) {
            $lastId = ((int) Attribute::max('id')) + 1;

            $attribute = Attribute::create([
                'name' => $attributeName,
                'code' => Str::slug($attributeName) . '-' . Str::upper(Str::random(6)) . $lastId,
                'is_active' => true,
                'created_by' => Auth::id(),
                'outlet_id' => Auth::user()?->current_outlet_id ?? Auth::user()?->outlet_id,
                'owner_id' => Auth::user()?->owner_id ?? Auth::id(),
            ]);
        }

        $exists = AttributeValue::where('attribute_id', $attribute->id)
            ->whereRaw('LOWER(value) = ?', [strtolower($attributeValue)])
            ->exists();

        if (!$exists) {
            AttributeValue::create([
                'attribute_id' => $attribute->id,
                'value' => $attributeValue,
                'code' => Str::slug($attributeValue) . '-' . Str::upper(Str::random(6)) . $attribute->id,
                'is_active' => true,
                'created_by' => Auth::id(),
                'outlet_id' => Auth::user()?->current_outlet_id ?? Auth::user()?->outlet_id,
                'owner_id' => Auth::user()?->owner_id ?? Auth::id(),
            ]);
        }
    }

    private function syncPurchaseAttributesToMaster(array $attributes): void
    {
        foreach ($attributes as $name => $value) {
            $this->ensureAttributeAndValueExist((string) $name, (string) $value);
        }
    }

    private function makeVariantSku(Product $product, array $attributes): string
    {
        $parts = [];

        foreach ($attributes as $name => $value) {
            $namePart = strtoupper(substr(preg_replace('/[^A-Za-z0-9]/', '', (string) $name), 0, 3));
            $valuePart = strtoupper(substr(preg_replace('/[^A-Za-z0-9]/', '', (string) $value), 0, 5));

            if ($namePart !== '' && $valuePart !== '') {
                $parts[] = $namePart . $valuePart;
            }
        }

        sort($parts);

        $base = $product->product_no ?: ('PRD-' . $product->id);

        if (empty($parts)) {
            return $base . '_DEFAULT';
        }

        return $base . '_' . implode('_', $parts);
    }

    private function findOrCreateVariantFromPurchase(Product $product, array $attributes): Variant
    {
        $attributes = $this->normalizePurchaseAttributes($attributes);

        if (!empty($attributes)) {
            $this->syncPurchaseAttributesToMaster($attributes);
        }

        $variants = Variant::where('product_id', $product->id)->get();

        foreach ($variants as $variant) {
            $existing = $variant->attribute_values;

            if (is_string($existing)) {
                $decoded = json_decode($existing, true);
                $existing = is_array($decoded) ? $decoded : [];
            }

            $existing = $this->normalizePurchaseAttributes($existing ?: []);

            if ($existing === $attributes) {
                return $variant;
            }
        }

        return Variant::create([
            'product_id' => $product->id,
            'attribute_values' => $attributes,
            'sku' => $this->makeVariantSku($product, $attributes),
            'created_by' => Auth::id(),
            'outlet_id' => Auth::user()?->current_outlet_id ?? Auth::user()?->outlet_id,
            'owner_id' => Auth::user()?->owner_id ?? Auth::id(),
        ]);
    }

    private function itemNeedsTracking(Product $product, array $item): bool
    {
        if (!empty($item['is_tracking_enabled'])) {
            return true;
        }

        if ($product->is_tracking_enabled) {
            return true;
        }

        $identifiers = $item['identifiers'] ?? [];

        return is_array($identifiers) && count(array_filter($identifiers, fn($value) => trim((string) $value) !== '')) > 0;
    }

    // Store purchase: barcode ALWAYS created from batch_no
    public function store(PurchaseRequestStore $request)
    {
        $user = Auth::user();
        $isShadowUser = ($user->type === 'shadow');
        $request->validated();

        if (!$isShadowUser && $request->paid_amount > 0 && !$request->account_id) {
            return back()->withErrors(['error' => 'Please select a payment account when making payment']);
        }

        $account = null;
        $payment_type = 'cash';

        if ($request->account_id) {
            $account = Account::find($request->account_id);
            if (!$account) {
                return back()->withErrors(['error' => 'Selected account not found']);
            }
            if (!$account->is_active) {
                return back()->withErrors(['error' => 'Selected account is not active']);
            }
            $payment_type = $account->type ?? 'cash';
        }

        $adjustamount = $request->adjust_from_advance ?? false;

        if ($adjustamount == true) {
            $supplier = Supplier::find($request->supplier_id);
            $payment_type = 'advance_adjustment';

            if ($request->paid_amount > $supplier->advance_amount) {
                return back()->withErrors(['error' => 'Advance adjustment cannot be greater than available advance amount.']);
            }

            $supplier->update([
                'advance_amount' => $supplier->advance_amount - $request->paid_amount,
            ]);
        }

        DB::beginTransaction();
        try {
            do {
                $purchaseNo = 'PUR-' . date('Ymd') . '-' . strtoupper(Str::random(6));
            } while (Purchase::where('purchase_no', $purchaseNo)->exists());

            $totalAmount = 0;
            foreach ($request->items as $item) {
                $unitQuantity = (float) ($item['unit_quantity'] ?? $item['quantity'] ?? 0);
                $unitPrice = (float) ($item['unit_price'] ?? 0);
                $totalAmount += $unitQuantity * $unitPrice;
            }

            $totalAmount += (float) ($request->transportation_cost ?? 0);

            $paidAmount = (float) ($request->paid_amount ?? 0);
            $dueAmount = $totalAmount - $paidAmount;

            $purchase = Purchase::create([
                'purchase_no' => $purchaseNo,
                'supplier_id' => $request->supplier_id,
                'warehouse_id' => $request->warehouse_id,
                'purchase_date' => $request->purchase_date,
                'grand_total' => $totalAmount,
                'paid_amount' => $paidAmount,
                'due_amount' => $dueAmount,
                'payment_status' => $request->payment_status,
                'notes' => $request->notes,
                'status' => 'completed',
                'created_by' => $user->id,
                'payment_type' => $payment_type,
                'transportation_cost' => (float) ($request->transportation_cost ?? 0)
            ]);

            if ($request->payment_status === 'installment') {
                $installmentDuration = (int) $request->installment_duration;
                $totalInstallments = (int) $request->total_installments;
                $this->installmentManage($purchase, $installmentDuration, $totalInstallments);
            }

            foreach ($request->items as $item) {
                $product = Product::findOrFail($item['product_id']);
                $purchaseAttributes = $this->normalizePurchaseAttributes($item['attributes'] ?? []);
                $variant = $this->findOrCreateVariantFromPurchase($product, $purchaseAttributes);

                $item['variant_id'] = $variant->id;
                $item['tracking_type'] = $item['tracking_type'] ?? $product->tracking_type ?? 'imei';

                $this->validateTrackedItem($product, $item);

                $unitType = $product->unit_type ?? 'piece';
                $unit = $item['unit'] ?? ($product->default_unit ?? 'piece');
                $unitQuantity = (float) ($item['unit_quantity'] ?? $item['quantity'] ?? 1);

                $baseQuantity = $this->convertToBase($unitQuantity, $unit, $unitType);

                $unitPrice = $isShadowUser ? 0 : (float) ($item['unit_price'] ?? 0);
                $salePrice = $isShadowUser ? 0 : (float) ($item['sale_price'] ?? 0);
                $totalPrice = $unitQuantity * $unitPrice;

                if (!$isShadowUser && $salePrice <= 0) {
                    throw new \Exception("Sale price must be greater than 0 for product ID: {$item['product_id']}");
                }

                $purchaseItem = $purchase->items()->create([
                    'product_id' => $item['product_id'],
                    'variant_id' => $item['variant_id'],
                    'quantity' => $unitQuantity,
                    'unit' => $unit,
                    'unit_quantity' => $unitQuantity,
                    'base_quantity' => $baseQuantity,
                    'unit_price' => $unitPrice,
                    'sale_price' => $salePrice,
                    'total_price' => $totalPrice,
                    'created_by' => $user->id,
                    'warehouse_id' => $request->warehouse_id
                ]);

                if ($product->has_warranty) {
                    $endDate = match ($product->warranty_duration_type) {
                        Product::Day => now()->addDays($product->warranty_duration),
                        Product::Month => now()->addMonths($product->warranty_duration),
                        Product::Year => now()->addYears($product->warranty_duration),
                        default => now(),
                    };

                    Warranty::create([
                        'purchase_item_id' => $purchaseItem->id,
                        'start_date' => now(),
                        'end_date' => $endDate,
                        'terms' => $product->warranty_terms,
                    ]);
                }

                $batchNo = 'PO-' . $purchaseItem->id . '-' . Str::upper(Str::random(4));

                $stock = Stock::create([
                    'warehouse_id' => $request->warehouse_id,
                    'product_id' => $item['product_id'],
                    'variant_id' => $item['variant_id'],
                    'quantity' => $unitQuantity,
                    'unit' => $unit,
                    'base_quantity' => $baseQuantity,
                    'purchase_price' => $unitPrice,
                    'sale_price' => $salePrice,
                    'created_by' => $user->id,
                    'batch_no' => $batchNo,
                ]);

                $this->generateStockBarcodeFromBatch($stock);
                $this->saveTrackedIdentifiers($product, $purchaseItem, $stock, $item);
            }

            if ($paidAmount > 0) {
                if ($account) {
                    if (!$account->canWithdraw($paidAmount)) {
                        throw new \Exception("Insufficient balance in account: {$account->name}");
                    }
                    $account->updateBalance($paidAmount, 'withdraw');
                }

                $payment = new Payment();
                $payment->purchase_id = $purchase->id;
                $payment->amount = -$paidAmount;
                $payment->payment_method = $request->payment_method ?? $payment_type;
                $payment->txn_ref = $request->txn_ref ?? ('nexoryn-' . Str::random(10));
                $payment->note = $request->notes ?? null;
                $payment->supplier_id = $request->supplier_id ?? null;
                $payment->account_id = $request->account_id;
                $payment->paid_at = Carbon::now();
                $payment->created_by = Auth::id();
                $payment->save();
            }

            DB::commit();
            return redirect()->route('purchase.list')->with('success', 'Purchase created successfully');
        } catch (\Exception $e) {
            DB::rollBack();
            return redirect()->back()->with('error', 'Error creating purchase: ' . $e->getMessage());
        }
    }
    //installment manage function
    private function installmentManage($purchase, $installmentDuration, $totalInstallments)
    {
        if ($installmentDuration > 0 && $totalInstallments > 0) {
            $purchase->update([
                'installment_duration' => $installmentDuration,
                'total_installments' => $totalInstallments,
            ]);
        }

        $installmentTotal = $purchase->grand_total - $purchase->paid_amount;
        $perInstallmentAmount = round(
            $installmentTotal / $totalInstallments,
            2
        );

        // months per installment (can be 1.5, 2.5 etc)
        $monthsPerInstallment = $installmentDuration / $totalInstallments;

        for ($i = 1; $i <= $totalInstallments; $i++) {
            $daysToAdd = (int) round($monthsPerInstallment * 30 * $i);

            Installment::create([
                'purchase_id' => $purchase->id,
                'installment_no' => $i,
                'amount' => $perInstallmentAmount,
                'due_date' => Carbon::now()->addDays($daysToAdd),
                'paid_amount' => 0,
                'status' => 'pending',
            ]);
        }
    }

    // ✅ barcode = batch_no + image
    private function generateStockBarcodeFromBatch(Stock $stock)
    {
        try {
            if (empty($stock->batch_no)) {
                throw new \Exception("Batch no missing for stock: {$stock->id}");
            }

            $barcode = $stock->batch_no;

            $barcodePNG = DNS1D::getBarcodePNG($barcode, 'C128', 2, 60);
            $imageData = base64_decode($barcodePNG);

            $directory = 'public/barcodes/' . date('Y/m/d');
            Storage::makeDirectory($directory);

            $filename = 'barcode_' . $stock->id . '_' . time() . '.png';
            $path = $directory . '/' . $filename;

            Storage::put($path, $imageData);

            $stock->update([
                'barcode' => $barcode,
                'barcode_path' => $path
            ]);

            return $barcode;
        } catch (\Exception $e) {
            Log::error('Batch barcode failed', [
                'stock_id' => $stock->id ?? null,
                'error' => $e->getMessage()
            ]);
            return null;
        }
    }

    // Optional: regenerate barcode for one item (if missing)
    public function generatePurchaseItemBarcode($purchaseId, $itemId)
    {
        try {
            $purchaseItem = PurchaseItem::where('purchase_id', $purchaseId)
                ->where('id', $itemId)
                ->firstOrFail();

            $stock = Stock::where('product_id', $purchaseItem->product_id)
                ->where('variant_id', $purchaseItem->variant_id)
                ->where('batch_no', 'LIKE', 'PO-' . $purchaseItem->id . '-%')
                ->first();

            if (!$stock) {
                return redirect()->back()->with('error', 'Stock not found for this item');
            }

            if (empty($stock->barcode)) {
                $this->generateStockBarcodeFromBatch($stock);
            }

            return redirect()->back()->with('success', 'Barcode ready: ' . $stock->barcode);
        } catch (\Exception $e) {
            return redirect()->back()->with('error', 'Failed: ' . $e->getMessage());
        }
    }

    // Optional: generate barcodes for all items (if some old ones missing)
    public function generatePurchaseBarcodes($purchaseId)
    {
        try {
            $purchase = Purchase::with('items')->findOrFail($purchaseId);
            $generatedCount = 0;

            foreach ($purchase->items as $item) {
                $stock = Stock::where('product_id', $item->product_id)
                    ->where('variant_id', $item->variant_id)
                    ->where('batch_no', 'LIKE', 'PO-' . $item->id . '-%')
                    ->first();

                if ($stock && empty($stock->barcode)) {
                    $this->generateStockBarcodeFromBatch($stock);
                    $generatedCount++;
                }
            }

            return redirect()->back()->with('success', "Generated {$generatedCount} missing barcodes");
        } catch (\Exception $e) {
            return redirect()->back()->with('error', 'Failed: ' . $e->getMessage());
        }
    }


    // Print barcode for purchase item
    public function printItemBarcode($purchaseId, $itemId)
    {
        try {
            $purchaseItem = PurchaseItem::with(['product', 'variant', 'purchase'])
                ->where('purchase_id', $purchaseId)
                ->where('id', $itemId)
                ->firstOrFail();

            $stock = Stock::where('product_id', $purchaseItem->product_id)
                ->where('variant_id', $purchaseItem->variant_id)
                ->where('batch_no', 'LIKE', 'PO-' . $purchaseItem->id . '-%')
                ->first();

            if (!$stock) {
                return redirect()->back()->with('error', 'Stock not found');
            }

            if (empty($stock->barcode)) {
                $this->generateStockBarcodeFromBatch($stock);
                $stock->refresh();
            }

            $business = BusinessProfile::where('user_id', auth()->id())->first();

            return Inertia::render('Purchase/BarcodePrint', [
                'purchaseItem' => $purchaseItem,
                'stock' => $stock,
                'business' => $business,
                'barcode_svg' => DNS1D::getBarcodeSVG($stock->barcode, 'C128', 2, 60)
            ]);
        } catch (\Exception $e) {
            return redirect()->back()->with('error', 'Failed: ' . $e->getMessage());
        }
    }


    // Print all barcodes for a purchase
    public function printPurchaseBarcodes($purchaseId)
    {
        try {
            $purchase = Purchase::with(['items.product', 'items.variant', 'supplier', 'warehouse'])->findOrFail($purchaseId);

            $itemsWithBarcodes = [];

            foreach ($purchase->items as $item) {
                $stock = Stock::where('product_id', $item->product_id)
                    ->where('variant_id', $item->variant_id)
                    ->where('batch_no', 'LIKE', 'PO-' . $item->id . '-%')
                    ->first();

                if (!$stock)
                    continue;

                if (empty($stock->barcode)) {
                    $this->generateStockBarcodeFromBatch($stock);
                    $stock->refresh();
                }

                $itemsWithBarcodes[] = [
                    'item' => $item,
                    'stock' => $stock,
                    'barcode_svg' => DNS1D::getBarcodeSVG($stock->barcode, 'C128', 2, 60)
                ];
            }

            $business = BusinessProfile::where('user_id', auth()->id())->first();

            return Inertia::render('Purchase/BulkBarcodePrint', [
                'purchase' => $purchase,
                'items' => $itemsWithBarcodes,
                'business' => $business
            ]);
        } catch (\Exception $e) {
            return redirect()->back()->with('error', 'Failed: ' . $e->getMessage());
        }
    }


    // Show purchase with barcode details
    public function show($id)
    {
        $user = Auth::user();
        $isShadowUser = ($user->type === 'shadow');

        $purchase = Purchase::with([
            'supplier',
            'warehouse',
            'items.product',
            'items.product.brand',
            'items.variant',
            'payments.account'
        ])->findOrFail($id);


        if ($isShadowUser) {
            $purchase = $this->transformToShadowData($purchase);
        }

        if ($purchase->items) {
            $purchase->items->transform(function ($item) {
                $stock = Stock::where('product_id', $item->product_id)
                    ->where('variant_id', $item->variant_id)
                    ->where('batch_no', 'LIKE', 'PO-' . $item->id . '-%')
                    ->first();

                $item->stock_details = $stock;
                return $item;
            });

            $purchase->barcode_stats = [
                'total_items' => $purchase->items->count(),
                'items_with_barcode' => $purchase->items->filter(function ($item) {
                    return $item->stock_details && !empty($item->stock_details->barcode);
                })->count(),
                'items_without_barcode' => $purchase->items->filter(function ($item) {
                    return !$item->stock_details || empty($item->stock_details->barcode);
                })->count(),
            ];
        }

        $ownerId = $purchase->created_by ?? $user->created_by ?? $user->id;
        $outletId = $purchase->outlet_id ?? $user->outlet_id ?? null;

        $bpQuery = BusinessProfile::query()->where('created_by', $ownerId);


        if (!empty($outletId)) {
            $bpQuery->where('outlet_id', $outletId);
        }

        $businessProfile = $bpQuery->latest()->first();


        if (!$businessProfile) {
            $businessProfile = BusinessProfile::latest()->first();
        }

        return Inertia::render('Purchase/PurchaseShow', [
            'purchase' => $purchase,
            'isShadowUser' => $isShadowUser,
            'businessProfile' => $businessProfile,
        ]);
    }


    //show purchase items
    public function showPurchasesItem($id)
    {
        $user = Auth::user();
        $isShadowUser = $user->type === 'shadow';

        $purchaseItem = PurchaseItem::with(['purchase.supplier', 'product', 'variant', 'warehouse'])
            ->findOrFail($id);

        if ($isShadowUser) {
            $purchaseItem = $this->transformToShadowItemData($purchaseItem);
        }

        $business = BusinessProfile::where('user_id', $user->id)->first();

        return Inertia::render('Purchase/PurchaseItemShow', [
            'purchaseItem' => $purchaseItem,
            'isShadowUser' => $isShadowUser,
            'business' => $business,
        ]);
    }



    public function edit($id)
    {
        $user = Auth::user();
        $isShadowUser = ($user->type === 'shadow');

        $purchase = Purchase::with(['supplier', 'warehouse', 'items.product', 'items.variant', 'payments'])
            ->findOrFail($id);

        if ($isShadowUser) {
            $purchase = $this->transformToShadowData($purchase);
        }

        return Inertia::render('Purchase/EditPurchase', [
            'purchase' => $purchase,
            'suppliers' => Supplier::all(),
            'warehouses' => Warehouse::where('is_active', true)->get(),
            'products' => Product::with('variants', 'brand')->get(),
            'accounts' => Account::where('is_active', true)->get(),
            'isShadowUser' => $isShadowUser,
            'unitConversions' => $this->getUnitConversions()
        ]);
    }

    /**
     * Update purchase (batch-wise delete old item stock)
     */
    public function update(Request $request, $id)
    {
        $user = Auth::user();
        $isShadowUser = ($user->type === 'shadow');

        $validated = $request->validate([
            'supplier_id' => 'required|exists:suppliers,id',
            'warehouse_id' => 'required|exists:warehouses,id',
            'purchase_date' => 'required|date',
            'notes' => 'nullable|string',

            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|exists:products,id',
            'items.*.variant_id' => 'nullable|exists:variants,id',
            'items.*.unit' => 'nullable|string|max:20',
            'items.*.unit_quantity' => 'required|numeric|min:0.001',
            'items.*.quantity' => 'required|numeric|min:0.001',
            'items.*.unit_price' => 'required|numeric|min:0',
            'items.*.sale_price' => 'required|numeric|min:0',
            'items.*.total_price' => 'nullable|numeric|min:0',
            'items.*.transportation_cost' => 'nullable|numeric|min:0',
            'items.*.attributes' => 'nullable|array',

            'paid_amount' => 'nullable|numeric|min:0',
            'payment_status' => 'required|in:paid,partial,unpaid,installment',
            'account_id' => 'nullable|exists:accounts,id',
            'payment_method' => 'nullable|string|max:50',
            'txn_ref' => 'nullable|string|max:255',

            'adjust_from_advance' => 'nullable|boolean',
            'use_partial_payment' => 'nullable|boolean',
            'manual_payment_override' => 'nullable|boolean',

            'installment_duration' => 'nullable|integer|min:0',
            'total_installments' => 'nullable|integer|min:0',
            'transportation_cost' => 'nullable|numeric|min:0',
        ]);

        if (!$isShadowUser && ($request->paid_amount ?? 0) > 0 && !$request->account_id) {
            return back()->withErrors([
                'error' => 'Please select a payment account when making payment'
            ]);
        }

        DB::beginTransaction();

        try {
            $purchase = Purchase::with(['items', 'payments'])->findOrFail($id);

            /*
            |--------------------------------------------------------------------------
            | Reverse old payments from account balance
            |--------------------------------------------------------------------------
            */
            foreach ($purchase->payments as $oldPayment) {
                if ($oldPayment->account_id && abs($oldPayment->amount) > 0) {
                    $oldAccount = Account::find($oldPayment->account_id);

                    if ($oldAccount) {
                        $oldAccount->updateBalance(abs($oldPayment->amount), 'deposit');
                    }
                }

                $oldPayment->delete();
            }

            /*
            |--------------------------------------------------------------------------
            | Delete old purchase items, stock, identifiers, warranties
            |--------------------------------------------------------------------------
            */
            foreach ($purchase->items as $oldItem) {
                $oldStock = Stock::where('product_id', $oldItem->product_id)
                    ->where('variant_id', $oldItem->variant_id)
                    ->where('batch_no', 'LIKE', 'PO-' . $oldItem->id . '-%')
                    ->first();

                if ($oldStock) {
                    StockIdentifier::where('stock_id', $oldStock->id)->delete();
                    $oldStock->delete();
                }

                Warranty::where('purchase_item_id', $oldItem->id)->delete();
                $oldItem->delete();
            }

            /*
            |--------------------------------------------------------------------------
            | Calculate new totals
            |--------------------------------------------------------------------------
            */
            $totalAmount = 0;

            foreach ($request->items as $item) {
                $unitQuantity = (float) ($item['unit_quantity'] ?? $item['quantity'] ?? 0);
                $unitPrice = $isShadowUser ? 0 : (float) ($item['unit_price'] ?? 0);

                $totalAmount += $unitQuantity * $unitPrice;
            }

            $totalAmount += (float) ($request->transportation_cost ?? 0);

            $paidAmount = $isShadowUser ? 0 : (float) ($request->paid_amount ?? 0);
            $dueAmount = max(0, $totalAmount - $paidAmount);

            $paymentType = $request->payment_method ?? 'cash';
            $account = null;

            if (!$isShadowUser && $request->account_id) {
                $account = Account::find($request->account_id);

                if (!$account) {
                    throw new \Exception('Selected account not found');
                }

                if (!$account->is_active) {
                    throw new \Exception('Selected account is not active');
                }

                $paymentType = $account->type ?? $paymentType;
            }

            /*
            |--------------------------------------------------------------------------
            | Advance adjustment
            |--------------------------------------------------------------------------
            */
            if (!$isShadowUser && $request->boolean('adjust_from_advance')) {
                $supplier = Supplier::findOrFail($request->supplier_id);
                $paymentType = 'advance_adjustment';

                if ($paidAmount > $supplier->advance_amount) {
                    throw new \Exception('Advance adjustment cannot be greater than available advance amount.');
                }

                $supplier->update([
                    'advance_amount' => $supplier->advance_amount - $paidAmount,
                ]);
            }

            /*
            |--------------------------------------------------------------------------
            | Update purchase
            |--------------------------------------------------------------------------
            */
            $purchase->update([
                'supplier_id' => $request->supplier_id,
                'warehouse_id' => $request->warehouse_id,
                'purchase_date' => $request->purchase_date,
                'grand_total' => $totalAmount,
                'paid_amount' => $paidAmount,
                'due_amount' => $dueAmount,
                'payment_status' => $isShadowUser ? 'unpaid' : $request->payment_status,
                'notes' => $request->notes,
                'payment_type' => $paymentType,
                'transportation_cost' => (float) ($request->transportation_cost ?? 0),
                'installment_duration' => (int) ($request->installment_duration ?? 0),
                'total_installments' => (int) ($request->total_installments ?? 0),
            ]);

            /*
            |--------------------------------------------------------------------------
            | Delete old installments and recreate if installment
            |--------------------------------------------------------------------------
            */
            Installment::where('purchase_id', $purchase->id)->delete();

            if (!$isShadowUser && $request->payment_status === 'installment') {
                $installmentDuration = (int) $request->installment_duration;
                $totalInstallments = (int) $request->total_installments;

                if ($installmentDuration <= 0 || $totalInstallments <= 0) {
                    throw new \Exception('Please enter valid installment details');
                }

                $this->installmentManage($purchase, $installmentDuration, $totalInstallments);
            }

            /*
            |--------------------------------------------------------------------------
            | Recreate purchase items and stocks
            |--------------------------------------------------------------------------
            */
            foreach ($request->items as $item) {
                $product = Product::findOrFail($item['product_id']);
                $purchaseAttributes = $this->normalizePurchaseAttributes($item['attributes'] ?? []);
                $variant = $this->findOrCreateVariantFromPurchase($product, $purchaseAttributes);

                $item['variant_id'] = $variant->id;
                $item['tracking_type'] = $item['tracking_type'] ?? $product->tracking_type ?? 'imei';

                $this->validateTrackedItem($product, $item);

                $unitType = $product->unit_type ?? 'piece';
                $unit = $item['unit'] ?? ($product->default_unit ?? 'piece');
                $unitQuantity = (float) ($item['unit_quantity'] ?? $item['quantity'] ?? 1);

                $baseQuantity = $this->convertToBase($unitQuantity, $unit, $unitType);

                $unitPrice = $isShadowUser ? 0 : (float) ($item['unit_price'] ?? 0);
                $salePrice = $isShadowUser ? 0 : (float) ($item['sale_price'] ?? 0);
                $totalPrice = $unitQuantity * $unitPrice;

                if (!$isShadowUser && $salePrice <= 0) {
                    throw new \Exception("Sale price must be greater than 0 for product ID: {$item['product_id']}");
                }

                $purchaseItem = $purchase->items()->create([
                    'product_id' => $item['product_id'],
                    'variant_id' => $item['variant_id'],
                    'quantity' => $unitQuantity,
                    'unit' => $unit,
                    'unit_quantity' => $unitQuantity,
                    'base_quantity' => $baseQuantity,
                    'unit_price' => $unitPrice,
                    'sale_price' => $salePrice,
                    'total_price' => $totalPrice,
                    'created_by' => $user->id,
                    'warehouse_id' => $request->warehouse_id,
                ]);

                if ($product->has_warranty) {
                    $endDate = match ($product->warranty_duration_type) {
                        Product::Day => now()->addDays($product->warranty_duration),
                        Product::Month => now()->addMonths($product->warranty_duration),
                        Product::Year => now()->addYears($product->warranty_duration),
                        default => now(),
                    };

                    Warranty::create([
                        'purchase_item_id' => $purchaseItem->id,
                        'start_date' => now(),
                        'end_date' => $endDate,
                        'terms' => $product->warranty_terms,
                    ]);
                }

                $batchNo = 'PO-' . $purchaseItem->id . '-' . Str::upper(Str::random(4));

                $stock = Stock::create([
                    'warehouse_id' => $request->warehouse_id,
                    'product_id' => $item['product_id'],
                    'variant_id' => $item['variant_id'],
                    'quantity' => $unitQuantity,
                    'unit' => $unit,
                    'base_quantity' => $baseQuantity,
                    'purchase_price' => $unitPrice,
                    'sale_price' => $salePrice,
                    'created_by' => $user->id,
                    'batch_no' => $batchNo,
                ]);

                $this->generateStockBarcodeFromBatch($stock);
                $this->saveTrackedIdentifiers($product, $purchaseItem, $stock, $item);
            }

            /*
            |--------------------------------------------------------------------------
            | Create new payment
            |--------------------------------------------------------------------------
            */
            if (!$isShadowUser && $paidAmount > 0) {
                if ($account) {
                    if (!$account->canWithdraw($paidAmount)) {
                        throw new \Exception("Insufficient balance in account: {$account->name}");
                    }

                    $account->updateBalance($paidAmount, 'withdraw');
                }

                $payment = new Payment();
                $payment->purchase_id = $purchase->id;
                $payment->amount = -$paidAmount;
                $payment->payment_method = $request->payment_method ?? $paymentType;
                $payment->txn_ref = $request->txn_ref ?? ('nexoryn-' . Str::random(10));
                $payment->note = $request->notes ?? null;
                $payment->supplier_id = $request->supplier_id ?? null;
                $payment->account_id = $request->account_id;
                $payment->paid_at = Carbon::now();
                $payment->created_by = Auth::id();
                $payment->save();
            }

            DB::commit();

            return redirect()
                ->route('purchase.list')
                ->with('success', 'Purchase updated successfully');

        } catch (\Exception $e) {
            DB::rollBack();

            return redirect()
                ->back()
                ->withInput()
                ->withErrors([
                    'error' => 'Error updating purchase: ' . $e->getMessage()
                ]);
        }
    }

    public function destroy($id)
    {
        DB::beginTransaction();
        try {
            $purchase = Purchase::with('items')->findOrFail($id);

            // Restore account balance if payment exists
            $payment = Payment::where('purchase_id', $purchase->id)->first();

            if ($payment && $payment->account_id) {
                $account = Account::find($payment->account_id);
                if ($account) {
                    $paymentAmount = abs($payment->amount);
                    $account->updateBalance($paymentAmount, 'deposit');
                }
            }

            // Delete stock batch-wise
            foreach ($purchase->items as $item) {
                $stock = Stock::where('product_id', $item->product_id)
                    ->orWhere('warehouse_id', $purchase->warehouse_id)
                    ->where('variant_id', $item->variant_id)
                    ->first();

                if ($stock)
                    $stock->delete();
            }

            $purchase->delete();

            DB::commit();
            return redirect()->route('purchase.list')->with('success', 'Purchase deleted successfully');
        } catch (\Exception $e) {
            DB::rollBack();
            return redirect()->back()->with('error', 'Error deleting purchase: ' . $e->getMessage());
        }
    }


    // update payment method (your same logic)
    public function updatePayment(Request $request, $id)
    {
        $purchase = Purchase::with('supplier')->findOrFail($id);

        $request->validate([
            'payment_amount' => 'required|numeric|min:0',
            'notes' => 'nullable|string',
            'account_id' => 'required|exists:accounts,id',
        ]);

        DB::beginTransaction();
        try {
            $paymentAmount = (float) $request->payment_amount;
            $account = Account::find($request->account_id);

            if (!$account)
                return back()->withErrors(['error' => 'Selected account not found']);
            if (!$account->canWithdraw($paymentAmount)) {
                return back()->withErrors(['account_id' => 'Insufficient balance in selected account | Low Balance in your selected account']);
            }

            $newPaidAmount = $purchase->paid_amount + $paymentAmount;
            $newDueAmount = max(0, $purchase->grand_total - $newPaidAmount);
            $newPaymentStatus = $newDueAmount == 0 ? 'paid' : ($newPaidAmount > 0 ? 'partial' : 'unpaid');

            $purchase->update([
                'paid_amount' => $newPaidAmount,
                'due_amount' => $newDueAmount,
                'payment_status' => $newPaymentStatus,
                'status' => 'completed'
            ]);

            $account->updateBalance($paymentAmount, 'withdraw');

            Payment::create([
                'purchase_id' => $purchase->id,
                'amount' => -$paymentAmount,
                'payment_method' => $request->payment_method ?? ($account->type ?? 'cash'),
                'txn_ref' => 'PYM-' . Str::random(10),
                'note' => $request->notes ?? 'Purchase due amount clearance',
                'supplier_id' => $purchase->supplier_id,
                'account_id' => $request->account_id,
                'paid_at' => Carbon::now(),
                'created_by' => Auth::id()
            ]);

            DB::commit();
            return redirect()->back()->with('success', 'Payment processed successfully');
        } catch (\Exception $e) {
            DB::rollBack();
            return redirect()->back()->with('error', 'Error processing payment: ' . $e->getMessage());
        }
    }


    public function approve(Request $request, $id)
    {
        // kept as-is (your business logic)
        $purchase = Purchase::with('items')->findOrFail($id);

        $request->validate([
            'items' => 'required|array',
            'items.*.id' => 'required|exists:purchase_items,id',
            'items.*.purchase_price' => 'required|numeric|min:0.01',
            'items.*.sale_price' => 'required|numeric|min:0.01',
            'notes' => 'nullable|string'
        ]);

        DB::beginTransaction();
        try {
            $totalRealAmount = 0;

            foreach ($request->items as $approveItem) {
                $item = PurchaseItem::find($approveItem['id']);

                if ($item) {
                    $realTotalPrice = $approveItem['purchase_price'] * $item->quantity;
                    $totalRealAmount += $realTotalPrice;

                    $item->update([
                        'unit_price' => $approveItem['purchase_price'],
                        'sale_price' => $approveItem['sale_price'],
                        'total_price' => $realTotalPrice
                    ]);

                    $stock = Stock::where('warehouse_id', $purchase->warehouse_id)
                        ->where('product_id', $item->product_id)
                        ->where('variant_id', $item->variant_id)
                        ->where('batch_no', 'LIKE', 'PO-' . $item->id . '-%')
                        ->first();

                    if ($stock) {
                        $stock->update([
                            'purchase_price' => $approveItem['purchase_price'],
                            'sale_price' => $approveItem['sale_price']
                        ]);
                    }
                }
            }

            $purchase->update([
                'total_amount' => $totalRealAmount,
                'due_amount' => max(0, $totalRealAmount - $purchase->paid_amount),
                'status' => 'completed',
                'notes' => $purchase->notes . "\n\nApproved by: " . Auth::user()->name .
                    "\nApproval Date: " . now()->format('Y-m-d H:i:s') .
                    ($request->notes ? "\nApproval Notes: " . $request->notes : "")
            ]);

            DB::commit();
            return redirect()->back()->with('success', 'Shadow purchase approved successfully');
        } catch (\Exception $e) {
            DB::rollBack();
            return redirect()->back()->with('error', 'Error approving purchase: ' . $e->getMessage());
        }
    }


    private function transformToShadowData($purchase)
    {
        // Keep your shadow display behavior
        $purchase->grand_total = $purchase->shadow_grand_total ?? $purchase->grand_total;
        $purchase->paid_amount = $purchase->shadow_paid_amount ?? $purchase->paid_amount;
        $purchase->due_amount = $purchase->shadow_due_amount ?? $purchase->due_amount;

        if ($purchase->items) {
            $purchase->items->transform(function ($item) {
                $item->unit_price = $item->shadow_unit_price ?? $item->unit_price;
                $item->sale_price = $item->shadow_sale_price ?? $item->sale_price;
                $item->total_price = $item->shadow_total_price ?? $item->total_price;
                return $item;
            });
        }

        return $purchase;
    }


    public function allPurchasesItems(Request $request)
    {
        $user = Auth::user();
        $isShadowUser = $user->type === 'shadow';

        $purchaseItems = PurchaseItem::with(['purchase', 'product', 'variant', 'warehouse', 'damage'])
            ->when($request->filled('product_id'), function ($query) use ($request) {
                $query->where('product_id', $request->product_id);
            })
            ->when(request()->filled(['date_from', 'date_to']), function ($q) {
                $q->whereBetween('created_at', [
                    request()->date_from,
                    request()->date_to
                ]);
            })
            ->orderBy('created_at', 'desc')
            ->paginate(15)
            ->withQueryString();

        if ($isShadowUser) {
            $purchaseItems->getCollection()->transform(function ($purchaseItem) {
                return $this->transformToShadowItemData($purchaseItem);
            });
        }

        return Inertia::render('Purchase/PurchaseItemsList', [
            'purchaseItems' => $purchaseItems,
            'filters' => $request->only(['product_id', 'date_from', 'date_to']),
            'isShadowUser' => $isShadowUser,
        ]);
    }

    private function transformToShadowItemData($purchaseItem)
    {
        $purchaseItem->unit_price = $purchaseItem->shadow_unit_price ?? $purchaseItem->unit_price;
        $purchaseItem->sale_price = $purchaseItem->shadow_sale_price ?? $purchaseItem->sale_price;
        $purchaseItem->total_price = $purchaseItem->shadow_total_price ?? $purchaseItem->total_price;

        return $purchaseItem;
    }

    private function validateTrackedItem(Product $product, array $item): void
    {
        if (!$this->itemNeedsTracking($product, $item)) {
            return;
        }

        $qty = (int) ($item['unit_quantity'] ?? $item['quantity'] ?? 0);
        $unit = $item['unit'] ?? 'piece';
        $trackingType = $item['tracking_type'] ?? $product->tracking_type ?? 'imei';
        $identifiers = $item['identifiers'] ?? [];

        if ($unit !== 'piece') {
            throw ValidationException::withMessages([
                'items' => "{$product->name} tracked product. Unit must be piece."
            ]);
        }

        if (!is_array($identifiers) || count($identifiers) !== $qty) {
            throw ValidationException::withMessages([
                'items' => "{$product->name} requires exactly {$qty} {$trackingType} values."
            ]);
        }

        $cleaned = collect($identifiers)
            ->map(fn($v) => trim((string) $v))
            ->filter()
            ->values();

        if ($cleaned->count() !== $qty) {
            throw ValidationException::withMessages([
                'items' => "{$product->name} requires all {$qty} {$trackingType} values."
            ]);
        }

        if ($cleaned->unique(fn($v) => strtolower($v))->count() !== $cleaned->count()) {
            throw ValidationException::withMessages([
                'items' => "Duplicate {$trackingType} found for {$product->name}."
            ]);
        }

        $exists = StockIdentifier::whereIn('identifier_value', $cleaned->all())->exists();
        if ($exists) {
            throw ValidationException::withMessages([
                'items' => "One or more {$trackingType} already exists."
            ]);
        }
    }

    private function saveTrackedIdentifiers(Product $product, PurchaseItem $purchaseItem, Stock $stock, array $item): void
    {
        if (!$this->itemNeedsTracking($product, $item)) {
            return;
        }

        $trackingType = $item['tracking_type'] ?? $product->tracking_type ?? 'imei';

        foreach (($item['identifiers'] ?? []) as $identifierValue) {
            $identifierValue = trim((string) $identifierValue);

            if ($identifierValue === '') {
                continue;
            }

            StockIdentifier::create([
                'stock_id' => $stock->id,
                'purchase_item_id' => $purchaseItem->id,
                'product_id' => $product->id,
                'variant_id' => $purchaseItem->variant_id,
                'identifier_type' => $trackingType,
                'identifier_value' => $identifierValue,
                'status' => 'available',
                'created_by' => Auth::id(),
                'outlet_id' => Auth::user()?->current_outlet_id ?? Auth::user()?->outlet_id,
                'owner_id' => Auth::user()?->owner_id ?? Auth::id(),
            ]);
        }
    }

}