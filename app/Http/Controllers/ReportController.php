<?php

namespace App\Http\Controllers;

use App\Models\Account;
use App\Models\Customer;
use App\Models\DillerShip;
use App\Models\Expense;
use App\Models\Payment;
use App\Models\Product;
use App\Models\Purchase;
use App\Models\PurchaseItem;
use App\Models\PurchaseReturn;
use App\Models\Sale;
use App\Models\SaleItem;
use App\Models\SalesReturn;
use App\Models\Stock;
use App\Models\Supplier;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

use function Pest\Laravel\json;

class ReportController extends Controller
{


    /**
     * Get the unit conversions for different measurement types.
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
     * Display the sales report.
     */

    public function salesReport(Request $request)
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

        return Inertia::render('Reports/Sales', [
            'sales' => $sales,
            'accounts' => Account::where('is_active', true)->get(),
            'isShadowUser' => $isShadowUser,
            'filters' => $filters,
            'unitConversions' => $this->getUnitConversions(),
        ]);
    }


    /**
     * Export the sales report.
     */
    public function exportSalesReport(Request $request)
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
            ->get();

        if ($isShadowUser) {
            $sales->getCollection()->transform(
                fn($sale) => $this->transformToShadowData($sale)
            );
        }


        return response()->json([
            'sales' => $sales,
            'accounts' => Account::where('is_active', true)->get(),
            'isShadowUser' => $isShadowUser,
            'filters' => $filters,
            'unitConversions' => $this->getUnitConversions(),
        ]);
    }



    /**
     * Transform the sale data for shadow users.
     */
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



    /**
     * Get the index view data for the report.
     */
    public function purchaseReport(Request $request)
    {
        $user = Auth::user();
        $isShadowUser = $user->type === 'shadow';

        $query = Purchase::latest()
            // ->GlobalOnly()
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

        $purchases = $query->paginate(20)->withQueryString();
        $purchases->getCollection()->transform(function ($purchase) use ($isShadowUser) {

            if ($isShadowUser) {
                $purchase = $this->transformToShadowDataPurchase($purchase);
            }

            $barcodes = [];

            $purchase->items?->transform(function ($item) use (&$barcodes) {

                $stock = Stock::where([
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
                ];

                if ($stock->barcode) {
                    $barcodes[] = [
                        'barcode' => $stock->barcode,
                        'product_name' => $item->product->name ?? '',
                        'quantity' => $stock->quantity,
                        'unit' => $stock->unit,
                    ];
                }

                return $item;
            });

            $purchase->barcodes = $barcodes;
            $purchase->has_barcode = count($barcodes) > 0;
            $purchase->barcode_count = count($barcodes);

            return $purchase;
        });

        return Inertia::render('Reports/Purchases', [
            'filters' => $request->only(['search', 'status', 'date']),
            'purchases' => $purchases,
            'isShadowUser' => $isShadowUser,
            'accounts' => Account::where('is_active', true)->get(),
        ]);
    }



    /**
     * Get the index view data for the report.
     */
    public function exportPurchaseReport(Request $request)
    {
        $user = Auth::user();
        $isShadowUser = $user->type === 'shadow';

        $query = Purchase::latest()
            ->with(['supplier', 'warehouse', 'items.product', 'items.variant', 'creator']);

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

        // Status filter
        $query->when(
            $request->filled('status'),
            fn($q) => $q->where('status', $request->status)
        );

        // Date filter
        $query->when(
            $request->filled('date'),
            fn($q) => $q->whereDate('purchase_date', $request->date)
        );

        // Date range filter
        $query->when(
            $request->filled(['date_from', 'date_to']),
            fn($q) =>
            $q->whereBetween('purchase_date', [
                $request->date_from,
                $request->date_to
            ])
        );

        $purchases = $query->get();

        $purchases->transform(function ($purchase) use ($isShadowUser) {
            if ($isShadowUser) {
                $purchase = $this->transformToShadowDataPurchase($purchase);
            }

            $barcodes = [];

            $purchase->items?->transform(function ($item) use (&$barcodes) {
                $stock = Stock::where([
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
                ];

                if ($stock->barcode) {
                    $barcodes[] = [
                        'barcode' => $stock->barcode,
                        'product_name' => $item->product->name ?? '',
                        'quantity' => $stock->quantity,
                        'unit' => $stock->unit,
                    ];
                }

                return $item;
            });

            $purchase->barcodes = $barcodes;
            $purchase->has_barcode = count($barcodes) > 0;
            $purchase->barcode_count = count($barcodes);

            return $purchase;
        });

        return response()->json([
            'purchases' => $purchases,
            'filters' => $request->only(['search', 'status', 'date', 'date_from', 'date_to'])
        ]);
    }






    /**
     * Transform the purchase data for shadow users.
     */
    private function transformToShadowDataPurchase($purchase)
    {
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



    /**
     * Display the sales item report.
     */
    public function salesItemReport(Request $request)
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

            ->when($request->filled(['start_date', 'end_date']), function ($q) use ($request) {
                $q->whereBetween('created_at', [
                    $request->start_date,
                    $request->end_date
                ]);
            })

            ->when($request->filled('search'), function ($q) use ($request) {
                $search = $request->search;

                $q->whereHas('product', function ($query) use ($search) {
                    $query->where(function ($sub) use ($search) {
                        $sub->where('name', 'like', "%{$search}%")
                            ->orWhere('product_no', 'like', "%{$search}%");
                    });
                });
            })

            ->filter($request->all())
            ->latest()
            ->paginate(15)
            ->withQueryString();

        // Shadow user data transform
        if ($isShadowUser) {
            $salesItems->getCollection()->transform(function ($item) {
                return self::transformToShadowItemData($item);
            });
        }

        return Inertia::render('Reports/SalesItems', [
            'salesItems' => $salesItems,
            'isShadowUser' => $isShadowUser,
        ]);
    }


    /**
     * Export the sales item report.
     */
    public function exportSalesItemReport(Request $request)
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

            ->when($request->filled(['start_date', 'end_date']), function ($q) use ($request) {
                $q->whereBetween('created_at', [
                    $request->start_date,
                    $request->end_date
                ]);
            })

            ->when($request->filled('search'), function ($q) use ($request) {
                $search = $request->search;

                $q->whereHas('product', function ($query) use ($search) {
                    $query->where(function ($sub) use ($search) {
                        $sub->where('name', 'like', "%{$search}%")
                            ->orWhere('product_no', 'like', "%{$search}%");
                    });
                });
            })

            ->filter($request->all())
            ->latest()
            ->get();

        // Shadow user data transform
        if ($isShadowUser) {
            $salesItems->getCollection()->transform(function ($item) {
                return self::transformToShadowItemData($item);
            });
        }

        return response()->json([
            'salesItems' => $salesItems,
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



    /**
     * Display the purchase items report.
     */
    public function purchaseItemsReport(Request $request)
    {
        $user = Auth::user();
        $isShadowUser = $user->type === 'shadow';

        $purchaseItems = PurchaseItem::with(['purchase', 'product', 'variant', 'warehouse', 'damage'])

            ->when($request->filled('search'), function ($query) use ($request) {
                $query->whereHas('product', function ($q) use ($request) {
                    $q->where(function ($subQuery) use ($request) {
                        $subQuery->where('name', 'like', '%' . $request->search . '%')
                            ->orWhere('product_no', 'like', '%' . $request->search . '%');
                    });
                });
            })

            ->when($request->filled(['date_from', 'date_to']), function ($q) use ($request) {
                $q->whereBetween('created_at', [
                    $request->date_from,
                    $request->date_to
                ]);
            })

            ->orderBy('created_at', 'desc')
            ->paginate(20)
            ->withQueryString();

        if ($isShadowUser) {
            $purchaseItems->getCollection()->transform(function ($purchaseItem) {
                return $this->transformToShadowPurchaseItemData($purchaseItem);
            });
        }

        return Inertia::render('Reports/PurchaseItems', [
            'purchaseItems' => $purchaseItems,
            'filters' => $request->only(['product_id', 'date_from', 'date_to']),
            'isShadowUser' => $isShadowUser,
        ]);
    }



    public function exportPurchaseItemsReport(Request $request)
    {
        $user = Auth::user();
        $isShadowUser = $user->type === 'shadow';

        $purchaseItems = PurchaseItem::with(['purchase', 'product', 'variant', 'warehouse', 'damage'])
            ->when($request->filled('search'), function ($query) use ($request) {
                $query->whereHas('product', function ($q) use ($request) {
                    $q->where(function ($subQuery) use ($request) {
                        $subQuery->where('name', 'like', '%' . $request->search . '%')
                            ->orWhere('product_no', 'like', '%' . $request->search . '%');
                    });
                });
            })
            ->when($request->filled(['date_from', 'date_to']), function ($q) use ($request) {
                $q->whereBetween('created_at', [
                    $request->date_from,
                    $request->date_to
                ]);
            })
            ->orderBy('created_at', 'desc')
            ->get();


        return response()->json([
            'purchaseItems' => $purchaseItems,
            'filters' => $request->only(['search', 'date_from', 'date_to']),
        ]);
    }
    /**
     * Transform the purchase item data for shadow users.
     */
    private function transformToShadowPurchaseItemData($purchaseItem)
    {
        $purchaseItem->unit_price = $purchaseItem->shadow_unit_price ?? $purchaseItem->unit_price;
        $purchaseItem->sale_price = $purchaseItem->shadow_sale_price ?? $purchaseItem->sale_price;
        $purchaseItem->total_price = $purchaseItem->shadow_total_price ?? $purchaseItem->total_price;

        return $purchaseItem;
    }


    /**
     * Display the customer report.
     */
    public function customerReport(Request $request)
    {

        $filters = $request->only(['search', 'status', 'date_from', 'date_to']);

        $customers = Customer::query()
            ->with([
                'sales:id,customer_id,due_amount'
            ])
            ->search($filters['search'] ?? null)
            ->status($filters['status'] ?? null)
            ->dateRange(
                $filters['date_from'] ?? null,
                $filters['date_to'] ?? null
            )
            ->latest()
            ->paginate(10)
            ->withQueryString()
            ->through(fn($customer) => [
                'id'             => $customer->id,
                'customer_name'  => $customer->customer_name,
                'phone'          => $customer->phone,
                'address'        => $customer->address,
                'is_active'      => (bool) $customer->is_active,
                'advance_amount' => (float) $customer->advance_amount,
                'due_amount'     => (float) $customer->due_amount,
                'sales'          => $customer->sales,
                'created_at'     => $customer->created_at->format('D M, Y h:i A'),
            ]);

        return Inertia::render('Reports/Customers', [
            'customers' => $customers,
            'filters'   => $filters,
            'accounts'  => Account::where('is_active', true)->get(),
        ]);
    }


    /**
     * Export the customer report.
     */
    public function exportCustomerReport(Request $request)
    {
        $filters = $request->only(['search', 'status', 'date_from', 'date_to']);

        $customers = Customer::query()
            ->with([
                'sales:id,customer_id,due_amount'
            ])
            ->search($filters['search'] ?? null)
            ->status($filters['status'] ?? null)
            ->dateRange(
                $filters['date_from'] ?? null,
                $filters['date_to'] ?? null
            )
            ->latest()
            ->get()
            ->map(function ($customer) {
                return [
                    'id'             => $customer->id,
                    'customer_name'  => $customer->customer_name,
                    'phone'          => $customer->phone,
                    'address'        => $customer->address,
                    'is_active'      => (bool) $customer->is_active,
                    'advance_amount' => (float) $customer->advance_amount,
                    'due_amount'     => (float) $customer->due_amount,
                    'sales'          => $customer->sales,
                    'created_at'     => $customer->created_at->format('D M, Y h:i A'),
                    'account_id'     => $customer->account_id,
                ];
            });

        return response()->json([
            'success' => true,
            'customers' => $customers,
            'filters'   => $filters,
            'total'     => $customers->count()
        ]);
    }



    /**
     * Display the supplier report.
     */
    public function supplierReport(Request $request)
    {
        $filters = $request->only(['search', 'status', 'date_from', 'date_to']);

        $suppliers = Supplier::with(['purchases', 'dealership'])
            ->search($filters['search'] ?? null)
            ->status($filters['status'] ?? null)
            ->dateRange(
                $filters['date_from'] ?? null,
                $filters['date_to'] ?? null
            )
            ->withCount('purchases')
            ->latest()
            ->paginate(10)
            ->withQueryString();

        return response()->json([
            'suppliers'    => $suppliers,
            'filters'      => $filters,
            'dealerships'  => DillerShip::all(),
            'accounts'     => Account::where('is_active', true)->get(),
        ]);
    }


    /**
     * Export the supplier report.
     */
    public function exportSupplierReport(Request $request)
    {
        $filters = $request->only(['search', 'status', 'date_from', 'date_to']);

        $suppliers = Supplier::with(['purchases', 'dealership'])
            ->search($filters['search'] ?? null)
            ->status($filters['status'] ?? null)
            ->dateRange(
                $filters['date_from'] ?? null,
                $filters['date_to'] ?? null
            )
            ->withCount('purchases')
            ->latest()
            ->get();


        return response()->json([
            'suppliers'    => $suppliers,
            'filters'      => $filters,
            'dealerships'  => DillerShip::all(),
            'accounts'     => Account::where('is_active', true)->get(),
        ]);
    }



    /**
     * Display the transaction report.
     */
    public function transactionReport(Request $request)
    {
        $isShadowUser = Auth::user()->type === 'shadow';
        $search = $request->input('search');

        $payments = Payment::with([
            'sale',
            'purchase',
            'customer',
            'creator',
            'supplier',
            'account'
        ])
            ->search($search)
            ->when(request()->filled(['start_date', 'end_date']), function ($q) {
                $q->whereBetween('created_at', [
                    request()->start_date,
                    request()->end_date
                ]);
            })
            ->when(request('account_id'), function ($q) {
                $q->whereHas('account', function ($q) {
                    $q->where('id', request()->account_id);
                });
            })
            ->latest()
            ->paginate(20)
            ->withQueryString();


        return Inertia::render('Reports/Payments', [
            'payments' => $payments,
            'filters' => ['search' => $search],
            'accounts' => Account::where('is_active', true)->get(),
            'isShadowUser' => $isShadowUser,
        ]);
    }

    // Add this new method for exporting ALL payments
    public function exportTransactionReport(Request $request)
    {
        $search = $request->input('search');

        $payments = Payment::with([
            'sale',
            'purchase',
            'customer',
            'creator',
            'supplier',
            'account'
        ])
            ->where('status', '!=', 'cancelled')
            ->search($search)
            ->when(request()->filled(['start_date', 'end_date']), function ($q) {
                $q->whereBetween('created_at', [
                    request()->start_date,
                    request()->end_date
                ]);
            })
            ->latest()
            ->get();

        return response()->json([
            'payments' => $payments,
            'filters' => [
                'search' => $search,
                'start_date' => $request->start_date,
                'end_date' => $request->end_date
            ]
        ]);
    }



    /**
     * Display the account report.
     */
    public function accountReport(Request $request)
    {
        $search = $request->input('search');
        $type = $request->input('type', 'all');

        $accounts = Account::withCount('payments')
            ->when($search, function ($query) use ($search) {
                $query->where(function ($q) use ($search) {
                    $q->where('name', 'like', "%{$search}%")
                        ->orWhere('account_number', 'like', "%{$search}%")
                        ->orWhere('bank_name', 'like', "%{$search}%");
                });
            })
            ->when($type !== 'all', function ($query) use ($type) {
                $query->where('type', $type);
            })
            ->when(request()->filled(['start_date', 'end_date']), function ($q) {
                $q->whereBetween('created_at', [
                    request()->start_date,
                    request()->end_date
                ]);
            })
            ->latest()
            ->paginate(20)
            ->withQueryString();

        // Calculate total balance
        $totalBalance = Account::sum('current_balance');

        return Inertia::render('Reports/Account', [
            'accounts' => $accounts,
            'filters' => [
                'search' => $search,
                'type' => $type,
            ],
            'totalBalance' => $totalBalance,
        ]);
    }


    /**
     * product reports
     */
    public function productReport(Request $request)
    {
        $products = Product::latest()
            ->with(['category', 'brand', 'variants', 'variants.stocks'])
            ->when($request->filled('search'), function ($q) use ($request) {
                $q->where(function ($query) use ($request) {
                    $query->where('name', 'like', "%{$request->search}%")
                        ->orWhere('description', 'like', "%{$request->search}%");
                });
            })
            ->when(request()->filled(['start_date', 'end_date']), function ($q) {
                $q->whereBetween('created_at', [
                    request()->start_date,
                    request()->end_date
                ]);
            })
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
            }

            $product->total_stock = $totalStock;
            $product->total_base_stock = $totalBaseStock;

            return $product;
        });

        return Inertia::render("Reports/Product", [
            'filters' => $request->only('search'),
            'product' => $products,
            'unitConversions' => $this->getUnitConversions()
        ]);
    }


    /**
     * Export product report.
     */
    public function exportProductReport(Request $request)
    {
        $filters = $request->only(['search', 'start_date', 'end_date']);

        $products = Product::query()
            ->with(['category', 'variants.stock', 'stocks'])
            ->when($filters['search'] ?? null, function ($query, $search) {
                $query->where('name', 'like', "%{$search}%")
                    ->orWhere('product_no', 'like', "%{$search}%");
            })
            ->when($filters['start_date'] ?? null, function ($query, $start_date) {
                $query->whereDate('created_at', '>=', $start_date);
            })
            ->when($filters['end_date'] ?? null, function ($query, $end_date) {
                $query->whereDate('created_at', '<=', $end_date);
            })
            ->latest()
            ->get();

        return response()->json([
            'products' => $products,
            'filters' => $filters,
        ]);
    }


    /**
     * Display a listing of the resource.
     */
    public function expenseReport(Request $request)
    {
        $expenses = Expense::with(['creator', 'category'])
            ->when($request->search, function ($query) use ($request) {
                $query->where(function ($q) use ($request) {
                    $q->where('name', 'like', "%{$request->search}%")
                        ->orWhere('description', 'like', "%{$request->search}%");
                });
            })
            ->when(request()->filled(['start_date', 'end_date']), function ($q) {
                $q->whereBetween('created_at', [
                    request()->start_date,
                    request()->end_date
                ]);
            })
            ->latest()
            ->paginate(10)
            ->withQueryString();

        return Inertia::render('Reports/Expense', [
            'expenses' => $expenses,
            'filters' => $request->only('search'),
        ]);
    }


    /**
     * Export expense report.
     */
    public function exportExpenseReport(Request $request)
    {
        $filters = $request->only(['search', 'start_date', 'end_date']);

        $expenses = Expense::query()
            ->with(['category', 'creator'])
            ->when($filters['search'] ?? null, function ($query, $search) {
                $query->where('name', 'like', "%{$search}%")
                    ->orWhere('description', 'like', "%{$search}%");
            })
            ->when($filters['start_date'] ?? null, function ($query, $start_date) {
                $query->whereDate('created_at', '>=', $start_date);
            })
            ->when($filters['end_date'] ?? null, function ($query, $end_date) {
                $query->whereDate('created_at', '<=', $end_date);
            })
            ->latest()
            ->get();

        return response()->json([
            'expenses' => $expenses,
            'filters' => $filters,
        ]);
    }


    /**
     * Display a listing of the resource.
     */
    public function salesReturnReport(Request $request)
    {
        $user = Auth::user();
        $isShadowUser = $user->type === 'shadow';

        $query = SalesReturn::with([
            'sale.customer',
            'customer',
            'sale.items.product',
            'sale.items.variant',
        ])
            ->when($request->filled('search'), function ($q) use ($request) {
                $q->where(function ($q) use ($request) {
                    $q->where('return_no', 'like', "%{$request->search}%")
                        ->orWhereHas(
                            'sale',
                            fn($q) =>
                            $q->where('invoice_no', 'like', "%{$request->search}%")
                        )
                        ->orWhereHas(
                            'customer',
                            fn($q) =>
                            $q->where('customer_name', 'like', "%{$request->search}%")
                                ->orWhere('phone', 'like', "%{$request->search}%")
                        );
                });
            })
            ->when(
                $request->filled('status'),
                fn($q) =>
                $q->where('status', $request->status)
            )
            ->when(
                $request->filled('date_from') && $request->filled('date_to'),
                fn($q) =>
                $q->whereBetween('return_date', [
                    $request->date_from,
                    $request->date_to
                ])
            );

        $salesReturns = $query
            ->orderByDesc('created_at')
            ->paginate(15);

        if ($isShadowUser) {
            $salesReturns->getCollection()->transform(
                fn($return) => $this->transformToShadowData($return)
            );
        }

        return Inertia::render('Reports/SalesReturn', [
            'salesReturns' => $salesReturns,
            'filters' => $request->only([
                'search',
                'status',
                'date_from',
                'date_to',
                'type'
            ]),
        ]);
    }


    /**
     * Export sales return report.
     */
    public function exportSalesReturnsReport(Request $request)
    {
        $query = SalesReturn::with(['customer', 'sale.customer', 'items'])
            ->when($request->filled('search'), function ($query) use ($request) {
                $query->whereHas('customer', function ($q) use ($request) {
                    $q->where('customer_name', 'like', '%' . $request->search . '%')
                        ->orWhere('phone', 'like', '%' . $request->search . '%');
                })->orWhereHas('sale', function ($q) use ($request) {
                    $q->where('invoice_no', 'like', '%' . $request->search . '%');
                });
            })
            ->when($request->filled('status'), function ($query) use ($request) {
                $query->where('status', $request->status);
            })
            ->when($request->filled('type'), function ($query) use ($request) {
                $query->where('type', $request->type);
            })
            ->when($request->filled(['from_date', 'to_date']), function ($query) use ($request) {
                $query->whereBetween('created_at', [$request->from_date, $request->to_date]);
            })
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json([
            'salesReturns' => $query,
            'filters' => $request->all()
        ]);
    }



    /**
     * Generate a report for purchase returns.
     */
    public function purchaseReturnReport(Request $request)
    {
        $user = Auth::user();
        $isShadowUser = $user->type === 'shadow';

        $query = PurchaseReturn::with([
            'purchase.supplier',
            'supplier',
            'warehouse',
            'items.product',
            'creator'
        ])
            ->latest();

        // Search filters
        if ($request->filled('search')) {
            $query->where(function ($q) use ($request) {
                $q->where('return_no', 'like', '%' . $request->search . '%')
                    ->orWhereHas('purchase', function ($q) use ($request) {
                        $q->where('purchase_no', 'like', '%' . $request->search . '%');
                    })
                    ->orWhereHas('supplier', function ($q) use ($request) {
                        $q->where('name', 'like', '%' . $request->search . '%');
                    });
            });
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('return_type')) {
            $query->where('return_type', $request->return_type);
        }

        if ($request->filled('date_from') && $request->filled('date_to')) {
            $query->whereBetween('return_date', [$request->date_from, $request->date_to]);
        } elseif ($request->filled('date_from')) {
            $query->where('return_date', '>=', $request->date_from);
        } elseif ($request->filled('date_to')) {
            $query->where('return_date', '<=', $request->date_to);
        }

        $returns = $query->paginate(20)->withQueryString();

        return Inertia::render('Reports/PurchaseReturn', [
            'returns' => $returns,
            'filters' => $request->only(['search', 'status', 'return_type', 'date_from', 'date_to']),
            'isShadowUser' => $isShadowUser,
            'summary' => [
                'total' => $returns->total(),
                'pending' => PurchaseReturn::where('status', 'pending')->count(),
                'completed' => PurchaseReturn::where('status', 'completed')->count(),
                'money_back' => PurchaseReturn::where('return_type', 'money_back')->count(),
                'replacement' => PurchaseReturn::where('return_type', 'product_replacement')->count(),
            ]
        ]);
    }


    /**
     * Export purchase returns report.
     */
    public function exportPurchaseReturnsReport(Request $request)
    {
        $query = PurchaseReturn::with(['purchase', 'supplier', 'warehouse', 'creator', 'items'])
            ->when($request->filled('search'), function ($query) use ($request) {
                $search = $request->search;
                $query->where('return_no', 'like', "%{$search}%")
                    ->orWhereHas('supplier', function ($q) use ($search) {
                        $q->where('name', 'like', "%{$search}%")
                            ->orWhere('company', 'like', "%{$search}%");
                    });
            })
            ->when($request->filled('status'), function ($query) use ($request) {
                $query->where('status', $request->status);
            })
            ->when($request->filled('return_type'), function ($query) use ($request) {
                $query->where('return_type', $request->return_type);
            })
            ->when($request->filled(['date_from', 'date_to']), function ($query) use ($request) {
                $query->whereBetween('created_at', [$request->date_from, $request->date_to]);
            })
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json([
            'purchaseReturns' => $query,
            'filters' => $request->all()
        ]);
    }
}
