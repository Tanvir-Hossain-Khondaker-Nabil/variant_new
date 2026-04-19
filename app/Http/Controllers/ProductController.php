<?php

namespace App\Http\Controllers;

use App\Models\Attribute;
use App\Models\Brand;
use App\Models\Category;
use App\Models\Product;
use App\Models\PurchaseItem;
use App\Models\PurchaseReturnItem;
use App\Models\ReplacementProduct;
use App\Models\SaleItem;
use App\Models\SalesReturnItem;
use App\Models\Stock;
use App\Models\Variant;
use App\Models\Warehouse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
use Inertia\Inertia;

class ProductController extends Controller
{


    /**
     * Get unit conversion factors
     */
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



    /**
     * Convert to base unit
     */
    private function convertToBase($quantity, $fromUnit, $unitType)
    {
        $conversions = $this->getUnitConversions();

        if (!isset($conversions[$unitType][$fromUnit])) {
            return $quantity;
        }

        return $quantity * $conversions[$unitType][$fromUnit];
    }



    /**
     * Convert from base unit to target unit
     */
    private function convertFromBase($quantity, $toUnit, $unitType)
    {
        $conversions = $this->getUnitConversions();

        if (!isset($conversions[$unitType][$toUnit])) {
            return $quantity;
        }

        $conversion = $conversions[$unitType][$toUnit];
        return $conversion != 0 ? $quantity / $conversion : $quantity;
    }



    /**
     * Get stock history for a product
     */
    private function getStockHistory($productId)
    {
        return Stock::where('product_id', $productId)
            ->orderBy('created_at', 'desc')
            ->get();
    }


    /**
     * View method
     */
    public function view($id)
    {
        $product = Product::with([
            'category',
            'brand',
            'variants.stock'
        ])->findOrFail($id);

        $totalStock = 0;
        $totalBaseStock = 0;

        foreach ($product->variants as $variant) {
            if ($variant->stock) {
                $totalStock += $variant->stock->quantity;
                $totalBaseStock += $variant->stock->base_quantity ?? $variant->stock->quantity;
            }
        }

        $product->total_stock = $totalStock;
        $product->total_base_stock = $totalBaseStock;

        return Inertia::render('product/ViewProduct', [
            'product' => $product,
            'unitConversions' => $this->getUnitConversions()
        ]);
    }


    /**
     * Index method
     */
    public function index(Request $request)
    {
        $brandId = $request->input('brand_id');
        $categoryId = $request->input('category_id');

        $baseQuery = Product::query()
            ->latest()
            ->with([
                'category',
                'brand',
                'variants',
                'variants.stock',
                'variants.stocks',
                'variants.stocks.identifiers',
                'variants.stock.identifiers',
            ])
            ->filter($request->only('search'))
            ->when($categoryId, function ($query, $categoryId) {
                return $query->whereHas('category', function ($q) use ($categoryId) {
                    $q->where('id', $categoryId);
                });
            })
            ->when($brandId, function ($query, $brandId) {
                return $query->whereHas('brand', function ($q) use ($brandId) {
                    $q->where('id', $brandId);
                });
            })
            ->when($request->filled(['start_date', 'end_date']), function ($q) use ($request) {
                $q->whereBetween('created_at', [
                    $request->start_date,
                    $request->end_date
                ]);
            });

        $products = (clone $baseQuery)
            ->paginate(20)
            ->withQueryString();

        $products->getCollection()->transform(function ($product) {
            $totalStock = 0;
            $totalBaseStock = 0;

            foreach ($product->variants as $variant) {
                if ($variant->stock) {
                    $totalStock += $variant->stock->quantity;
                    $totalBaseStock += $variant->stock->base_quantity ?? $variant->stock->quantity;
                }

                if ($variant->stocks && $variant->stocks->count()) {
                    $totalStock += $variant->stocks->sum('quantity');
                    $totalBaseStock += $variant->stocks->sum(function ($stock) {
                        return $stock->base_quantity ?? $stock->quantity;
                    });
                }
            }

            $product->total_stock = $totalStock;
            $product->total_base_stock = $totalBaseStock;

            return $product;
        });

        $summaryProducts = (clone $baseQuery)->get();

        $filteredCount = $summaryProducts->count();

        $filteredSalePriceTotal = $summaryProducts->sum(function ($product) {
            return $product->variants->sum(function ($variant) {
                $total = 0;

                if ($variant->stocks && $variant->stocks->count()) {
                    $total += $variant->stocks->sum(function ($stock) {
                        return (float) ($stock->sale_price ?? 0);
                    });
                }

                if ($variant->stock) {
                    $total += (float) ($variant->stock->sale_price ?? 0);
                }

                return $total;
            });
        });

        return Inertia::render("product/Product", [
            'filters' => $request->only('search', 'brand_id', 'category_id', 'start_date', 'end_date'),
            'product' => $products,
            'brands' => Brand::all(),
            'categories' => Category::all(),
            'unitConversions' => $this->getUnitConversions(),
            'summary' => [
                'count' => $filteredCount,
                'sale_price_total' => $filteredSalePriceTotal,
            ],
        ]);
    }



    /*
     * add_index/ create method
     */
    public function add_index(Request $request)
    {
        $querystring = $request->only('id');
        $update = null;

        if ($querystring && isset($querystring['id'])) {
            $update = Product::with(['variants', 'category', 'brand'])->find($querystring['id']);

            if (!$update) {
                return redirect()->route('product.list')->with('error', 'Product not found');
            }
        }

        $attributes = Attribute::with(['activeValues'])->get()->map(function ($attribute) {
            return [
                'id' => $attribute->id,
                'name' => $attribute->name,
                'code' => $attribute->name,
                'active_values' => $attribute->activeValues->map(function ($value) {
                    return [
                        'id' => $value->id,
                        'value' => $value->value,
                        'code' => $value->code,
                    ];
                })
            ];
        });

        // Get categories with proper structure
        $categories = Category::all()->map(function ($category) {
            return [
                'id' => $category->id,
                'name' => $category->name,
            ];
        });

        // Get brands with proper structure
        $brands = Brand::all()->map(function ($brand) {
            return [
                'id' => $brand->id,
                'name' => $brand->name,
            ];
        });

        return Inertia::render('product/AddProduct', [
            'category' => $categories,
            'brand' => $brands,
            'update' => $update ? $update->toArray() : null,
            'attributes' => $attributes,
            'unitConversions' => $this->getUnitConversions()
        ]);
    }



    /*
     * store/ update method
     */
    public function update(Request $request)
    {
        $isUpdate = !empty($request->id);

        $request->merge([
            'has_warranty' => filter_var($request->has_warranty, FILTER_VALIDATE_BOOLEAN),
            'is_fraction_allowed' => filter_var($request->is_fraction_allowed, FILTER_VALIDATE_BOOLEAN),
            'is_tracking_enabled' => filter_var($request->is_tracking_enabled, FILTER_VALIDATE_BOOLEAN),
        ]);

        $user = Auth::user();

        /*
        |--------------------------------------------------------------------------
        | 1) Subscription + Product Range Limit (Only for Create)
        |--------------------------------------------------------------------------
        */
        if (!$isUpdate) {
            $activeSub = $user->subscriptions()
                ->where('status', 1)
                ->where('start_date', '<=', now())
                ->where('end_date', '>=', now())
                ->latest('end_date')
                ->first();

            if (!$activeSub) {
                return redirect()->back()
                    ->withInput()
                    ->with('error', 'No active subscription found. Please renew/activate your plan.');
            }

            $allowedProductRange = (int) optional($activeSub)->product_range;
            $outletId = $user->outlet_id ?? null;

            $currentCount = Product::query()
                ->when($outletId, fn($q) => $q->where('outlet_id', $outletId))
                ->count();

            if ($allowedProductRange > 0 && $currentCount >= $allowedProductRange) {
                return redirect()->back()
                    ->withInput()
                    ->with('error', "Product limit exceeded! Your plan allows {$allowedProductRange} products. Current: {$currentCount}.");
            }
        }

        /*
        |--------------------------------------------------------------------------
        | 2) Decode variants JSON (Safe)
        |--------------------------------------------------------------------------
        */
        if ($request->has('variants') && is_string($request->variants)) {
            $decoded = json_decode($request->variants, true);
            $request->merge(['variants' => is_array($decoded) ? $decoded : []]);
        }

        /*
        |--------------------------------------------------------------------------
        | 3) Tracking rule
        |--------------------------------------------------------------------------
        */
        if ($request->boolean('is_tracking_enabled')) {
            $request->merge([
                'unit_type' => 'piece',
                'default_unit' => 'piece',
                'min_sale_unit' => 'piece',
                'is_fraction_allowed' => false,
            ]);
        }

        /*
        |--------------------------------------------------------------------------
        | 4) Validation
        |--------------------------------------------------------------------------
        */
        $rules = [
            'product_name' => 'required|string|max:255',
            'category_id' => 'required|exists:categories,id',
            'product_no' => 'nullable|string|max:100|unique:products,product_no,' . ($request->id ?? 'NULL'),
            'description' => 'nullable|string',
            'product_type' => 'required|in:regular,in_house',
            'variants' => 'nullable|array',
            'variants.*.attribute_values' => 'nullable',
            'brand_id' => 'nullable|exists:brands,id',
            'unit_type' => 'required|in:piece,weight,volume,length',
            'default_unit' => 'required|string|max:20',
            'min_sale_unit' => 'nullable|string|max:20',
            'photo' => 'nullable|image|max:2048',
            'type' => 'nullable|string|max:20',
            'is_fraction_allowed' => 'nullable',
            'has_warranty' => 'nullable',
            'warranty_duration' => 'nullable|integer|min:0',
            'warranty_duration_type' => 'nullable|string',
            'warranty_terms' => 'nullable|string',

            // tracking
            'is_tracking_enabled' => 'nullable|boolean',
            'tracking_type' => 'nullable|required_if:is_tracking_enabled,true|in:imei,serial',
        ];

        if ($request->product_type === 'in_house') {
            $rules = array_merge($rules, [
                'in_house_cost' => 'required|numeric|min:0',
                'in_house_shadow_cost' => 'nullable|numeric|min:0',
                'in_house_sale_price' => 'required|numeric|min:0',
                'in_house_shadow_sale_price' => 'nullable|numeric|min:0',
                'in_house_initial_stock' => 'required|integer|min:0',
            ]);
        }

        // unit based validation
        if ($request->unit_type === 'weight') {
            $rules['default_unit'] = 'required|in:ton,kg,gram,pound';
            $rules['min_sale_unit'] = 'nullable|in:ton,kg,gram,pound';
        } elseif ($request->unit_type === 'volume') {
            $rules['default_unit'] = 'required|in:liter,ml';
            $rules['min_sale_unit'] = 'nullable|in:liter,ml';
        } elseif ($request->unit_type === 'length') {
            $rules['default_unit'] = 'required|in:meter,cm,mm';
            $rules['min_sale_unit'] = 'nullable|in:meter,cm,mm';
        } else {
            $rules['default_unit'] = 'required|in:piece,dozen,box';
            $rules['min_sale_unit'] = 'nullable|in:piece,dozen,box';
        }

        $validator = Validator::make($request->all(), $rules);

        if ($validator->fails()) {
            return redirect()->back()
                ->withErrors($validator)
                ->withInput()
                ->with('error', 'Please fix the validation errors');
        }

        /*
        |--------------------------------------------------------------------------
        | 5) Save Product + Variants
        |--------------------------------------------------------------------------
        */
        DB::beginTransaction();

        try {
            $product = $isUpdate ? Product::find($request->id) : new Product();

            if ($isUpdate && !$product) {
                throw new \Exception("Product not found with ID: " . $request->id);
            }

            $product->name = $request->product_name;
            $product->type = $request->type;
            $product->brand_id = $request->brand_id ?: null;
            $product->product_no = $request->product_no;
            $product->category_id = $request->category_id;
            $product->description = $request->description;
            $product->product_type = $request->product_type;

            // warranty
            $product->has_warranty = (bool) ($request->has_warranty ?? false);
            $product->warranty_duration = $request->warranty_duration;
            $product->warranty_duration_type = $request->warranty_duration_type;
            $product->warranty_terms = $request->warranty_terms;

            // tracking
            $product->is_tracking_enabled = (bool) ($request->is_tracking_enabled ?? false);
            $product->tracking_type = $product->is_tracking_enabled ? $request->tracking_type : null;

            if (!$isUpdate) {
                $product->created_by = Auth::id();
            }

            // unit fields
            $product->unit_type = $request->unit_type;
            $product->default_unit = $request->default_unit;
            $product->is_fraction_allowed = (bool) ($request->is_fraction_allowed ?? false);
            $product->min_sale_unit = $request->min_sale_unit;

            // outlet_id set only if empty
            if (!$product->outlet_id && $user && isset($user->outlet_id)) {
                $product->outlet_id = $user->outlet_id;
            }

            // Photo upload
            if ($request->hasFile('photo')) {
                if (!empty($product->photo) && Storage::disk('public')->exists($product->photo)) {
                    Storage::disk('public')->delete($product->photo);
                }
                $path = $request->file('photo')->store('products', 'public');
                $product->photo = $path;
            }

            // In-house fields
            if ($request->product_type === 'in_house') {
                $product->in_house_cost = $request->in_house_cost;
                $product->in_house_shadow_cost = $request->in_house_shadow_cost ?? 0;
                $product->in_house_sale_price = $request->in_house_sale_price ?? 0;
                $product->in_house_shadow_sale_price = $request->in_house_shadow_sale_price ?? 0;
                $product->in_house_initial_stock = $request->in_house_initial_stock ?? 0;
            } else {
                $product->in_house_cost = null;
                $product->in_house_shadow_cost = null;
                $product->in_house_sale_price = null;
                $product->in_house_shadow_sale_price = null;
                $product->in_house_initial_stock = 0;
            }

            $product->save();

            /*
            |--------------------------------------------------------------------------
            | 6) Variants Logic (AUTO DEFAULT + AUTO REMOVE)
            |--------------------------------------------------------------------------
            */

            $variants = $request->input('variants', []);
            if (!is_array($variants)) {
                $variants = [];
            }

            $existingVariantIds = $product->variants()->pluck('id')->toArray();
            $newVariantIds = [];

            $nonEmptyVariants = [];
            $hasAnyNonEmpty = false;

            foreach ($variants as $variantData) {
                if (!is_array($variantData)) {
                    continue;
                }

                $attributeValues = $variantData['attribute_values'] ?? [];
                if (is_string($attributeValues)) {
                    $tmp = json_decode($attributeValues, true);
                    $attributeValues = is_array($tmp) ? $tmp : [];
                }
                if (!is_array($attributeValues)) {
                    $attributeValues = [];
                }

                $attributeValues = array_filter($attributeValues, fn($v) => trim((string) $v) !== '');

                if (!empty($attributeValues)) {
                    $hasAnyNonEmpty = true;
                    $nonEmptyVariants[] = [
                        'id' => $variantData['id'] ?? null,
                        'attribute_values' => $attributeValues,
                    ];
                }
            }

            if (!$hasAnyNonEmpty) {
                $nonEmptyVariants = [
                    [
                        'id' => null,
                        'attribute_values' => [],
                    ]
                ];
            }

            foreach ($nonEmptyVariants as $variantData) {
                $attributeValues = $variantData['attribute_values'] ?? [];
                if (!is_array($attributeValues)) {
                    $attributeValues = [];
                }

                $sku = $this->generateSku($product, $attributeValues);

                if (!empty($variantData['id'])) {
                    $variant = Variant::where('id', $variantData['id'])
                        ->where('product_id', $product->id)
                        ->first();

                    if ($variant) {
                        $variant->update([
                            'attribute_values' => $attributeValues,
                            'sku' => $sku,
                        ]);
                        $newVariantIds[] = $variant->id;

                        if ($product->product_type === 'in_house') {
                            $this->updateInHouseStock($product, $variant);
                        }
                    }
                } else {
                    $variant = Variant::create([
                        'product_id' => $product->id,
                        'attribute_values' => $attributeValues,
                        'sku' => $sku,
                    ]);

                    $newVariantIds[] = $variant->id;

                    if ($product->product_type === 'in_house') {
                        $this->createInHouseStock($product, $variant);
                    }
                }
            }

            $variantsToDelete = array_diff($existingVariantIds, $newVariantIds);
            if (!empty($variantsToDelete)) {
                Variant::whereIn('id', $variantsToDelete)->delete();
                Stock::whereIn('variant_id', $variantsToDelete)->delete();
            }

            DB::commit();

            return redirect()->route('product.list')
                ->with('success', "Product " . ($isUpdate ? 'updated' : 'created') . " successfully");

        } catch (\Exception $th) {
            DB::rollBack();

            return redirect()->back()
                ->withInput()
                ->with('error', "Server error: " . $th->getMessage());
        }
    }




    /**
     * Create stock entry for a new in-house product variant
     */
    private function createInHouseStock(Product $product, Variant $variant)
    {
        $inHouseWarehouse = Warehouse::where('code', 'IN-HOUSE')->first();

        if (!$inHouseWarehouse) {
            $inHouseWarehouse = Warehouse::create([
                'name' => 'In-House Production',
                'code' => 'IN-HOUSE',
                'address' => 'Internal Production Department',
                'is_active' => true,
                'created_by' => Auth::id(),
            ]);
        }

        $existingStock = Stock::where('warehouse_id', $inHouseWarehouse->id)
            ->where('product_id', $product->id)
            ->where('variant_id', $variant->id)
            ->first();

        // Calculate base quantity
        $unitType = $product->unit_type ?? 'piece';
        $defaultUnit = $product->default_unit ?? 'piece';
        $baseQuantity = $this->convertToBase($product->in_house_initial_stock, $defaultUnit, $unitType);

        $payload = [
            'quantity' => $product->in_house_initial_stock,
            'unit' => $defaultUnit,
            'base_quantity' => $baseQuantity,
            'purchase_price' => $product->in_house_cost,
            'sale_price' => $product->in_house_sale_price,
            'shadow_purchase_price' => $product->in_house_shadow_cost,
            'shadow_sale_price' => $product->in_house_shadow_sale_price,
        ];

        if ($existingStock) {
            $existingStock->update($payload);
        } else {
            Stock::create(array_merge($payload, [
                'warehouse_id' => $inHouseWarehouse->id,
                'product_id' => $product->id,
                'variant_id' => $variant->id,
                'created_by' => Auth::id(),
            ]));
        }
    }


    /**
     * Update stock entry for an existing in-house product variant
     */
    private function updateInHouseStock(Product $product, Variant $variant)
    {
        $inHouseWarehouse = Warehouse::where('code', 'IN-HOUSE')->first();

        if (!$inHouseWarehouse) {
            return;
        }

        $existingStock = Stock::where('warehouse_id', $inHouseWarehouse->id)
            ->where('product_id', $product->id)
            ->where('variant_id', $variant->id)
            ->first();

        // Calculate base quantity
        $unitType = $product->unit_type ?? 'piece';
        $defaultUnit = $product->default_unit ?? 'piece';
        $baseQuantity = $this->convertToBase($product->in_house_initial_stock, $defaultUnit, $unitType);

        $payload = [
            'unit' => $defaultUnit,
            'base_quantity' => $baseQuantity,
            'purchase_price' => $product->in_house_cost,
            'sale_price' => $product->in_house_sale_price,
            'shadow_purchase_price' => $product->in_house_shadow_cost,
            'shadow_sale_price' => $product->in_house_shadow_sale_price,
        ];

        if ($existingStock) {
            $existingStock->update($payload);
        }
    }



    /**
     * Generate SKU for a product variant based on its attributes
     */
    private function generateSku(Product $product, array $attributeValues): string
    {
        $shortCodes = [];

        foreach ($attributeValues as $attribute => $value) {
            $attrShort = strtoupper(substr(preg_replace('/[^a-zA-Z]/', '', (string) $attribute), 0, 3));
            $valShort = strtoupper(substr(preg_replace('/[^a-zA-Z0-9]/', '', (string) $value), 0, 3));
            $shortCodes[] = $attrShort . $valShort;
        }

        sort($shortCodes);

        if (empty($shortCodes)) {
            return $product->product_no . '_DEFAULT';
        }

        return $product->product_no . '_' . implode('_', $shortCodes);
    }



    /*
     * delete / destroy method
     */
    public function del($id)
    {
        DB::beginTransaction();

        try {
            $product = Product::findOrFail($id);

            // Get variant ids first
            $variantIds = $product->variants()->pluck('id')->toArray();

            // Delete product photo
            if (!empty($product->photo) && Storage::disk('public')->exists($product->photo)) {
                Storage::disk('public')->delete($product->photo);
            }

            /**
             * Delete child records first
             * Order matters
             */

            // Return / replacement related
            PurchaseReturnItem::where('product_id', $product->id)->delete();
            if (!empty($variantIds)) {
                PurchaseReturnItem::whereIn('variant_id', $variantIds)->delete();
            }

            ReplacementProduct::where('product_id', $product->id)->delete();
            if (!empty($variantIds)) {
                ReplacementProduct::whereIn('variant_id', $variantIds)->delete();
            }

            SalesReturnItem::where('product_id', $product->id)->delete();
            if (!empty($variantIds)) {
                SalesReturnItem::whereIn('variant_id', $variantIds)->delete();
            }

            // Sale / purchase items
            SaleItem::where('product_id', $product->id)->delete();
            if (!empty($variantIds)) {
                SaleItem::whereIn('variant_id', $variantIds)->delete();
            }

            PurchaseItem::where('product_id', $product->id)->delete();
            if (!empty($variantIds)) {
                PurchaseItem::whereIn('variant_id', $variantIds)->delete();
            }

            // Stocks
            Stock::where('product_id', $product->id)->delete();
            if (!empty($variantIds)) {
                Stock::whereIn('variant_id', $variantIds)->delete();
            }

            // Variants
            if (!empty($variantIds)) {
                Variant::whereIn('id', $variantIds)->delete();
            }

            // Finally delete product
            $product->delete();

            DB::commit();

            return redirect()->back()->with('success', 'Product and all related data deleted successfully.');
        } catch (\Exception $th) {
            DB::rollBack();
            return redirect()->back()->with('error', 'Server error: ' . $th->getMessage());
        }
    }


    /*
     * Get available units for a product
     */
    public function getAvailableUnits($productId)
    {
        try {
            $product = Product::findOrFail($productId);

            $conversions = $this->getUnitConversions();
            $unitType = $product->unit_type ?? 'piece';

            $units = [];
            if (isset($conversions[$unitType])) {
                $units = array_keys($conversions[$unitType]);
            }

            // Get available stocks for this product to determine available sale units
            $stocks = Stock::where('product_id', $productId)
                ->where('quantity', '>', 0)
                ->get();

            $availableUnits = [];
            foreach ($stocks as $stock) {
                if ($stock->unit && !in_array($stock->unit, $availableUnits)) {
                    $availableUnits[] = $stock->unit;

                    // Also add smaller units
                    if (isset($conversions[$unitType][$stock->unit])) {
                        $stockFactor = $conversions[$unitType][$stock->unit];
                        foreach ($conversions[$unitType] as $unit => $factor) {
                            if ($factor <= $stockFactor && !in_array($unit, $availableUnits)) {
                                $availableUnits[] = $unit;
                            }
                        }
                    }
                }
            }

            // If no stocks found, use product's default unit
            if (empty($availableUnits)) {
                $availableUnits = [$product->default_unit ?? 'piece'];
            }

            return response()->json([
                'units' => $availableUnits,
                'default_unit' => $product->default_unit ?? 'piece',
                'min_sale_unit' => $product->min_sale_unit ?? null,
                'is_fraction_allowed' => $product->is_fraction_allowed ?? false,
                'unit_type' => $unitType
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



    // Update stock for a product (for manual adjustments)
    public function updateStock(Request $request, $id)
    {
        $request->validate([
            'variant_id' => 'nullable|exists:variants,id',
            'quantity' => 'required|numeric|min:0',
            'unit' => 'required|string',
            'warehouse_id' => 'nullable|exists:warehouses,id',
            'notes' => 'nullable|string',
        ]);

        DB::beginTransaction();
        try {
            $product = Product::findOrFail($id);
            $variant = Variant::findOrFail($request->variant_id);

            // Verify variant belongs to product
            if ($variant->product_id != $product->id) {
                throw new \Exception('Variant does not belong to this product');
            }

            $warehouseId = $request->warehouse_id ?? Warehouse::where('code', 'IN-HOUSE')->value('id');

            if (!$warehouseId) {
                throw new \Exception('Warehouse not found');
            }

            // Calculate base quantity
            $unitType = $product->unit_type ?? 'piece';
            $baseQuantity = $this->convertToBase($request->quantity, $request->unit, $unitType);

            // Find or create stock record
            $stock = Stock::where('warehouse_id', $warehouseId)
                ->where('product_id', $product->id)
                ->where('variant_id', $variant->id)
                ->first();

            if ($stock) {
                $stock->update([
                    'quantity' => $request->quantity,
                    'unit' => $request->unit,
                    'base_quantity' => $baseQuantity,
                    'updated_by' => Auth::id(),
                ]);
            } else {
                Stock::create([
                    'warehouse_id' => $warehouseId,
                    'product_id' => $product->id,
                    'variant_id' => $variant->id,
                    'quantity' => $request->quantity,
                    'unit' => $request->unit,
                    'base_quantity' => $baseQuantity,
                    'created_by' => Auth::id(),
                ]);
            }

            // Record stock movement
            \App\Models\StockMovement::create([
                'warehouse_id' => $warehouseId,
                'product_id' => $product->id,
                'variant_id' => $variant->id,
                'type' => 'adjustment',
                'qty' => $baseQuantity,
                'unit' => 'base',
                'reference_type' => 'manual',
                'reference_id' => Auth::id(),
                'notes' => $request->notes ?? 'Manual stock adjustment',
                'created_by' => Auth::id(),
            ]);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Stock updated successfully',
                'stock' => $stock
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'error' => $e->getMessage()
            ], 500);
        }
    }


    /**
     * Get stock history for a product
     */
    public function stockHistory($id)
    {
        $product = Product::findOrFail($id);

        $history = \App\Models\StockMovement::with(['warehouse', 'variant'])
            ->where('product_id', $id)
            ->orderBy('created_at', 'desc')
            ->paginate(20);

        return Inertia::render('product/StockHistory', [
            'product' => $product,
            'history' => $history
        ]);
    }


    /**
     * Export products to CSV/Excel
     */
    public function export(Request $request)
    {
        $products = Product::with(['category', 'brand', 'variants.stock'])
            ->filter($request->only('search'))
            ->get()
            ->map(function ($product) {
                $totalStock = 0;
                $totalBaseStock = 0;

                foreach ($product->variants as $variant) {
                    if ($variant->stock) {
                        $totalStock += $variant->stock->quantity;
                        $totalBaseStock += $variant->stock->base_quantity ?? $variant->stock->quantity;
                    }
                }

                return [
                    'ID' => $product->id,
                    'Name' => $product->name,
                    'Product Code' => $product->product_no,
                    'Category' => $product->category->name ?? '',
                    'Brand' => $product->brand->name ?? '',
                    'Unit Type' => $product->unit_type ?? 'piece',
                    'Default Unit' => $product->default_unit ?? 'piece',
                    'Min Sale Unit' => $product->min_sale_unit ?? '',
                    'Allow Fractions' => $product->is_fraction_allowed ? 'Yes' : 'No',
                    'Product Type' => $product->product_type,
                    'In-House Cost' => $product->in_house_cost ?? 0,
                    'In-House Sale Price' => $product->in_house_sale_price ?? 0,
                    'Total Stock' => $totalStock,
                    'Total Base Stock' => $totalBaseStock,
                    'Variants Count' => $product->variants->count(),
                    'Description' => $product->description,
                    'Created At' => $product->created_at->format('Y-m-d H:i:s'),
                ];
            });

        $headers = [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => 'attachment; filename="products_' . date('Y-m-d') . '.csv"',
        ];

        $callback = function () use ($products) {
            $file = fopen('php://output', 'w');

            // Add BOM for UTF-8
            fputs($file, $bom = (chr(0xEF) . chr(0xBB) . chr(0xBF)));

            // Headers
            fputcsv($file, array_keys($products->first() ?? []));

            // Data
            foreach ($products as $product) {
                fputcsv($file, $product);
            }

            fclose($file);
        };

        return response()->stream($callback, 200, $headers);
    }



    // Import products from CSV/Excel
    public function import(Request $request)
    {
        $request->validate([
            'file' => 'required|mimes:csv,txt,xlsx,xls',
        ]);

        // This is a simplified version. In real implementation, you would use:
        // 1. Laravel Excel package or similar
        // 2. Queue jobs for large imports
        // 3. Proper validation and error handling

        return redirect()->back()->with('error', 'Import feature not implemented yet. Please use the web interface.');
    }



    // Get products for API (for mobile apps or external systems)
    public function apiIndex(Request $request)
    {
        $products = Product::with(['category', 'brand', 'variants.stock'])
            ->filter($request->only('search'))
            ->paginate($request->get('per_page', 20));

        // Calculate stock for each product
        $products->getCollection()->transform(function ($product) {
            $totalStock = 0;
            $totalBaseStock = 0;

            foreach ($product->variants as $variant) {
                if ($variant->stock) {
                    $totalStock += $variant->stock->quantity;
                    $totalBaseStock += $variant->stock->base_quantity ?? $variant->stock->quantity;
                }
            }

            return [
                'id' => $product->id,
                'name' => $product->name,
                'product_no' => $product->product_no,
                'category' => $product->category->name ?? null,
                'brand' => $product->brand->name ?? null,
                'unit_type' => $product->unit_type ?? 'piece',
                'default_unit' => $product->default_unit ?? 'piece',
                'min_sale_unit' => $product->min_sale_unit ?? null,
                'is_fraction_allowed' => $product->is_fraction_allowed ?? false,
                'product_type' => $product->product_type,
                'in_house_cost' => $product->in_house_cost,
                'in_house_sale_price' => $product->in_house_sale_price,
                'total_stock' => $totalStock,
                'total_base_stock' => $totalBaseStock,
                'variants' => $product->variants->map(function ($variant) {
                    return [
                        'id' => $variant->id,
                        'attribute_values' => $variant->attribute_values,
                        'sku' => $variant->sku,
                        'stock' => $variant->stock ? [
                            'quantity' => $variant->stock->quantity,
                            'base_quantity' => $variant->stock->base_quantity,
                            'unit' => $variant->stock->unit,
                            'sale_price' => $variant->stock->sale_price,
                        ] : null
                    ];
                }),
                'description' => $product->description,
                'photo_url' => $product->photo ? url('/storage/' . $product->photo) : null,
                'created_at' => $product->created_at->toISOString(),
            ];
        });

        return response()->json($products);
    }


    /**
     * Bulk update products
     */
    public function bulkUpdate(Request $request)
    {
        $request->validate([
            'products' => 'required|array',
            'products.*.id' => 'required|exists:products,id',
            'field' => 'required|in:unit_type,default_unit,min_sale_unit,is_fraction_allowed',
            'value' => 'required',
        ]);

        DB::beginTransaction();
        try {
            $updatedCount = 0;

            foreach ($request->products as $productData) {
                $product = Product::find($productData['id']);

                if ($product) {
                    $field = $request->field;
                    $value = $request->value;

                    // Validate based on field
                    if ($field === 'unit_type' && !in_array($value, ['piece', 'weight', 'volume', 'length'])) {
                        continue;
                    }

                    if ($field === 'default_unit') {
                        // Validate based on current unit_type
                        $unitType = $product->unit_type;
                        $validUnits = $this->getUnitConversions()[$unitType] ?? ['piece'];
                        if (!in_array($value, array_keys($validUnits))) {
                            continue;
                        }
                    }

                    if ($field === 'is_fraction_allowed') {
                        $value = filter_var($value, FILTER_VALIDATE_BOOLEAN);
                    }

                    $product->update([$field => $value]);
                    $updatedCount++;
                }
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => "Updated {$updatedCount} products successfully",
                'updated_count' => $updatedCount
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'error' => $e->getMessage()
            ], 500);
        }
    }
}