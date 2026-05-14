import React, { useMemo, useState } from "react";
import { Link, router } from "@inertiajs/react";
import {
    ArrowLeft,
    Plus,
    Trash2,
    Search,
    Package,
    Save,
    X,
    Info,
    Store,
    Warehouse,
} from "lucide-react";

export default function PickupHoldCreate({
    shops = [],
    warehouses = [],
    stocks = [],
    products = [],
    accounts = [],
    unitConversions = {
        weight: { ton: 1000, kg: 1, gram: 0.001, pound: 0.453592 },
        volume: { liter: 1, ml: 0.001 },
        piece: { piece: 1, dozen: 12, box: 1 },
        length: { meter: 1, cm: 0.01, mm: 0.001 },
    },
}) {
    const [direction, setDirection] = useState("outgoing");
    const [shopId, setShopId] = useState("");
    const [holdDate, setHoldDate] = useState(new Date().toISOString().split("T")[0]);
    const [notes, setNotes] = useState("");

    const [items, setItems] = useState([]);

    const [search, setSearch] = useState("");
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [selectedVariantId, setSelectedVariantId] = useState("");
    const [selectedStockId, setSelectedStockId] = useState("");
    const [selectedWarehouseId, setSelectedWarehouseId] = useState("");

    const [unit, setUnit] = useState("piece");
    const [quantity, setQuantity] = useState(1);
    const [unitPrice, setUnitPrice] = useState(0);
    const [salePrice, setSalePrice] = useState(0);
    const [submitting, setSubmitting] = useState(false);

    const safeShops = Array.isArray(shops) ? shops : [];
    const safeWarehouses = Array.isArray(warehouses) ? warehouses : [];
    const safeStocks = Array.isArray(stocks) ? stocks : [];
    const safeProducts = Array.isArray(products) ? products : [];

    const formatCurrency = (value) => {
        const num = Number(value) || 0;
        return num.toFixed(2);
    };

    const formatVariant = (variant) => {
        if (!variant) return "Default Variant";

        const attrs = variant.attribute_values || {};

        if (!attrs || Object.keys(attrs).length === 0) {
            return variant.sku || "Default Variant";
        }

        return Object.entries(attrs)
            .map(([key, value]) => `${key}: ${value}`)
            .join(" | ");
    };

    const getProductUnitOptions = (product) => {
        if (!product) return ["piece"];

        const unitType = product.unit_type || "piece";
        const conversions = unitConversions?.[unitType];

        if (!conversions) return [product.default_unit || "piece"];

        return Object.keys(conversions);
    };

    const stockProducts = useMemo(() => {
        const map = new Map();

        safeStocks.forEach((stock) => {
            if (!stock?.product) return;

            const productId = stock.product.id;

            if (!map.has(productId)) {
                map.set(productId, {
                    ...stock.product,
                    stocks: [],
                    variants: new Map(),
                });
            }

            const product = map.get(productId);
            product.stocks.push(stock);

            if (stock.variant) {
                const variantId = stock.variant.id;

                if (!product.variants.has(variantId)) {
                    product.variants.set(variantId, {
                        variant: stock.variant,
                        stocks: [],
                        totalQuantity: 0,
                    });
                }

                const variantRow = product.variants.get(variantId);
                variantRow.stocks.push(stock);
                variantRow.totalQuantity += Number(stock.quantity) || 0;
            }
        });

        return Array.from(map.values()).sort((a, b) =>
            String(a.name || "").localeCompare(String(b.name || ""))
        );
    }, [safeStocks]);

    const searchableProducts = direction === "outgoing" ? stockProducts : safeProducts;

    const filteredProducts = useMemo(() => {
        const term = search.trim().toLowerCase();

        if (!term) return searchableProducts.slice(0, 20);

        return searchableProducts
            .filter((product) => {
                const productMatch =
                    String(product.name || "").toLowerCase().includes(term) ||
                    String(product.product_no || "").toLowerCase().includes(term) ||
                    String(product.brand?.name || "").toLowerCase().includes(term);

                const stockMatch = (product.stocks || []).some((stock) => {
                    return (
                        String(stock.batch_no || "").toLowerCase().includes(term) ||
                        String(stock.barcode || "").toLowerCase().includes(term) ||
                        String(stock.variant?.sku || "").toLowerCase().includes(term)
                    );
                });

                return productMatch || stockMatch;
            })
            .slice(0, 20);
    }, [searchableProducts, search]);

    const selectedProductVariants = useMemo(() => {
        if (!selectedProduct) return [];

        if (direction === "outgoing") {
            return Array.from(selectedProduct.variants?.values?.() || []).map((row) => ({
                id: row.variant.id,
                variant: row.variant,
                totalQuantity: row.totalQuantity,
                stocks: row.stocks,
            }));
        }

        return (selectedProduct.variants || []).map((variant) => ({
            id: variant.id,
            variant,
            totalQuantity: 0,
            stocks: [],
        }));
    }, [selectedProduct, direction]);

    const selectedVariantStocks = useMemo(() => {
        if (!selectedProduct || !selectedVariantId || direction !== "outgoing") {
            return [];
        }

        const variantRow = Array.from(selectedProduct.variants?.values?.() || []).find(
            (row) => String(row.variant.id) === String(selectedVariantId)
        );

        return variantRow?.stocks || [];
    }, [selectedProduct, selectedVariantId, direction]);

    const selectProduct = (product) => {
        setSelectedProduct(product);
        setSearch(product.name || "");
        setSelectedVariantId("");
        setSelectedStockId("");
        setSelectedWarehouseId("");
        setQuantity(1);

        const units = getProductUnitOptions(product);
        setUnit(product.default_unit || units[0] || "piece");

        if (direction === "incoming") {
            const firstVariant = product.variants?.[0];
            if (firstVariant) {
                setSelectedVariantId(String(firstVariant.id));
            }
        }

        setUnitPrice(0);
        setSalePrice(0);
    };

    const handleVariantChange = (variantId) => {
        setSelectedVariantId(variantId);
        setSelectedStockId("");

        if (direction === "incoming") {
            return;
        }

        const variantRow = selectedProductVariants.find(
            (row) => String(row.id) === String(variantId)
        );

        const firstStock = variantRow?.stocks?.[0];

        if (firstStock) {
            setSelectedStockId(String(firstStock.id));
            setSelectedWarehouseId(firstStock.warehouse_id || "");
            setUnit(firstStock.unit || selectedProduct?.default_unit || "piece");
            setUnitPrice(Number(firstStock.purchase_price) || 0);
            setSalePrice(Number(firstStock.sale_price) || 0);
        }
    };

    const handleStockChange = (stockId) => {
        setSelectedStockId(stockId);

        const stock = selectedVariantStocks.find(
            (row) => String(row.id) === String(stockId)
        );

        if (stock) {
            setSelectedWarehouseId(stock.warehouse_id || "");
            setUnit(stock.unit || selectedProduct?.default_unit || "piece");
            setUnitPrice(Number(stock.purchase_price) || 0);
            setSalePrice(Number(stock.sale_price) || 0);
        }
    };

    const addItem = () => {
        if (!selectedProduct) {
            alert("Please select product");
            return;
        }

        if (!selectedVariantId) {
            alert("Please select variant");
            return;
        }

        if (direction === "outgoing" && !selectedStockId) {
            alert("Please select stock/batch");
            return;
        }

        if (direction === "incoming" && !selectedWarehouseId) {
            alert("Please select warehouse");
            return;
        }

        const qty = Number(quantity) || 0;

        if (qty <= 0) {
            alert("Quantity must be greater than zero");
            return;
        }

        const selectedVariant =
            selectedProductVariants.find(
                (row) => String(row.id) === String(selectedVariantId)
            )?.variant || null;

        const selectedStock =
            selectedVariantStocks.find((stock) => String(stock.id) === String(selectedStockId)) ||
            null;

        if (direction === "outgoing" && selectedStock) {
            const availableQty = Number(selectedStock.quantity) || 0;

            if (qty > availableQty) {
                alert(`Not enough stock. Available: ${availableQty}`);
                return;
            }
        }

        const uniqueKey =
            direction === "outgoing"
                ? `${selectedProduct.id}-${selectedVariantId}-${selectedStockId}-${unit}`
                : `${selectedProduct.id}-${selectedVariantId}-${selectedWarehouseId}-${unit}-${Date.now()}`;

        const exists = items.some((item) => item.uniqueKey === uniqueKey);

        if (exists) {
            alert("This item already added");
            return;
        }

        const warehouseName =
            direction === "outgoing"
                ? selectedStock?.warehouse?.name || "N/A"
                : safeWarehouses.find(
                      (warehouse) => String(warehouse.id) === String(selectedWarehouseId)
                  )?.name || "N/A";

        const newItem = {
            uniqueKey,
            product_id: selectedProduct.id,
            product_name: selectedProduct.name,
            product_no: selectedProduct.product_no,
            variant_id: selectedVariantId,
            variant_name: formatVariant(selectedVariant),
            warehouse_id: direction === "outgoing" ? selectedStock?.warehouse_id : selectedWarehouseId,
            warehouse_name: warehouseName,
            stock_id: direction === "outgoing" ? selectedStockId : null,
            batch_no: selectedStock?.batch_no || null,
            unit,
            quantity: qty,
            unit_price: Number(unitPrice) || 0,
            sale_price: Number(salePrice) || 0,
        };

        setItems((prev) => [...prev, newItem]);

        setSelectedProduct(null);
        setSelectedVariantId("");
        setSelectedStockId("");
        setSelectedWarehouseId("");
        setSearch("");
        setQuantity(1);
        setUnitPrice(0);
        setSalePrice(0);
    };

    const removeItem = (uniqueKey) => {
        setItems((prev) => prev.filter((item) => item.uniqueKey !== uniqueKey));
    };

    const submit = (e) => {
        e.preventDefault();

        if (!shopId) {
            alert("Please select shop");
            return;
        }

        if (items.length === 0) {
            alert("Please add at least one item");
            return;
        }

        setSubmitting(true);

        router.post(
            route("pickup-holds.store"),
            {
                shop_id: shopId,
                direction,
                hold_date: holdDate,
                notes,
                items: items.map((item) => ({
                    product_id: item.product_id,
                    variant_id: item.variant_id,
                    warehouse_id: item.warehouse_id,
                    stock_id: item.stock_id,
                    unit: item.unit,
                    quantity: item.quantity,
                    unit_price: item.unit_price,
                    sale_price: item.sale_price,
                })),
            },
            {
                preserveScroll: true,
                onError: (errors) => {
                    console.error(errors);
                    alert("Failed to create pickup hold");
                },
                onFinish: () => setSubmitting(false),
            }
        );
    };

    const totalAmount = items.reduce((total, item) => {
        const price = direction === "outgoing" ? item.sale_price : item.unit_price;
        return total + (Number(item.quantity) || 0) * (Number(price) || 0);
    }, 0);

    return (
        <div className="min-h-screen bg-slate-50 p-4 md:p-6">
            <div className="max-w-7xl mx-auto">
                <div className="mb-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
                            <Package size={24} className="text-primary" />
                            Create Pickup Hold
                        </h1>
                        <p className="text-sm text-gray-500 mt-1">
                            Outgoing = shop takes from my stock. Incoming = I take from shop.
                        </p>
                    </div>

                    <Link href={route("pickup-holds.index")} className="btn btn-outline btn-sm">
                        <ArrowLeft size={16} />
                        Back
                    </Link>
                </div>

                <form onSubmit={submit} className="space-y-5">
                    <div className="bg-white rounded-2xl border shadow-sm p-5">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="form-control">
                                <label className="label">
                                    <span className="label-text font-bold">Direction</span>
                                </label>

                                <select
                                    className="select select-bordered"
                                    value={direction}
                                    onChange={(e) => {
                                        setDirection(e.target.value);
                                        setItems([]);
                                        setSelectedProduct(null);
                                        setSearch("");
                                        setSelectedVariantId("");
                                        setSelectedStockId("");
                                    }}
                                >
                                    <option value="outgoing">Outgoing - shop takes from me</option>
                                    <option value="incoming">Incoming - I take from shop</option>
                                </select>
                            </div>

                            <div className="form-control">
                                <label className="label">
                                    <span className="label-text font-bold">Shop</span>
                                </label>

                                <select
                                    className="select select-bordered"
                                    value={shopId}
                                    onChange={(e) => setShopId(e.target.value)}
                                >
                                    <option value="">Select Shop</option>
                                    {safeShops.map((shop) => (
                                        <option key={shop.id} value={shop.id}>
                                            {shop.name} {shop.phone ? `(${shop.phone})` : ""}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-control">
                                <label className="label">
                                    <span className="label-text font-bold">Date</span>
                                </label>

                                <input
                                    type="date"
                                    className="input input-bordered"
                                    value={holdDate}
                                    onChange={(e) => setHoldDate(e.target.value)}
                                />
                            </div>

                            <div className="form-control">
                                <label className="label">
                                    <span className="label-text font-bold">Notes</span>
                                </label>

                                <input
                                    type="text"
                                    className="input input-bordered"
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    placeholder="Optional notes"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl border shadow-sm p-5">
                        <div className="flex items-center gap-2 mb-4">
                            <Package size={18} className="text-primary" />
                            <h2 className="font-black text-gray-900">Add Product</h2>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                            <div className="lg:col-span-4 relative">
                                <label className="label">
                                    <span className="label-text font-bold">Search Product</span>
                                </label>

                                <div className="relative">
                                    <Search
                                        size={16}
                                        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                                    />
                                    <input
                                        type="text"
                                        className="input input-bordered w-full pl-10"
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        placeholder="Search product / barcode / batch"
                                    />

                                    {search && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setSearch("");
                                                setSelectedProduct(null);
                                            }}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                                        >
                                            <X size={15} />
                                        </button>
                                    )}
                                </div>

                                {search && filteredProducts.length > 0 && !selectedProduct && (
                                    <div className="absolute z-30 mt-2 bg-white border rounded-xl shadow-xl w-full max-h-80 overflow-y-auto">
                                        {filteredProducts.map((product) => (
                                            <button
                                                key={product.id}
                                                type="button"
                                                onClick={() => selectProduct(product)}
                                                className="w-full text-left px-4 py-3 hover:bg-slate-50 border-b"
                                            >
                                                <div className="font-bold text-sm">
                                                    {product.name}
                                                </div>
                                                <div className="text-xs text-gray-500">
                                                    {product.product_no || "N/A"}{" "}
                                                    {product.brand?.name
                                                        ? `• ${product.brand.name}`
                                                        : ""}
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="lg:col-span-3">
                                <label className="label">
                                    <span className="label-text font-bold">Variant</span>
                                </label>

                                <select
                                    className="select select-bordered w-full"
                                    value={selectedVariantId}
                                    onChange={(e) => handleVariantChange(e.target.value)}
                                    disabled={!selectedProduct}
                                >
                                    <option value="">Select Variant</option>
                                    {selectedProductVariants.map((row) => (
                                        <option key={row.id} value={row.id}>
                                            {formatVariant(row.variant)}
                                            {direction === "outgoing"
                                                ? ` - Stock: ${row.totalQuantity}`
                                                : ""}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {direction === "outgoing" ? (
                                <div className="lg:col-span-3">
                                    <label className="label">
                                        <span className="label-text font-bold">Stock / Batch</span>
                                    </label>

                                    <select
                                        className="select select-bordered w-full"
                                        value={selectedStockId}
                                        onChange={(e) => handleStockChange(e.target.value)}
                                        disabled={!selectedVariantId}
                                    >
                                        <option value="">Select Stock</option>
                                        {selectedVariantStocks.map((stock) => (
                                            <option key={stock.id} value={stock.id}>
                                                {stock.batch_no || "No Batch"} - Qty:{" "}
                                                {stock.quantity} -{" "}
                                                {stock.warehouse?.name || "N/A"}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            ) : (
                                <div className="lg:col-span-3">
                                    <label className="label">
                                        <span className="label-text font-bold">Warehouse</span>
                                    </label>

                                    <select
                                        className="select select-bordered w-full"
                                        value={selectedWarehouseId}
                                        onChange={(e) => setSelectedWarehouseId(e.target.value)}
                                    >
                                        <option value="">Select Warehouse</option>
                                        {safeWarehouses.map((warehouse) => (
                                            <option key={warehouse.id} value={warehouse.id}>
                                                {warehouse.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            <div className="lg:col-span-2">
                                <label className="label">
                                    <span className="label-text font-bold">Unit</span>
                                </label>

                                <select
                                    className="select select-bordered w-full"
                                    value={unit}
                                    onChange={(e) => setUnit(e.target.value)}
                                >
                                    {getProductUnitOptions(selectedProduct).map((u) => (
                                        <option key={u} value={u}>
                                            {u}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="lg:col-span-2">
                                <label className="label">
                                    <span className="label-text font-bold">Qty</span>
                                </label>

                                <input
                                    type="number"
                                    
                                    min="0"
                                    className="input input-bordered w-full"
                                    value={quantity}
                                    onChange={(e) => setQuantity(e.target.value)}
                                />
                            </div>

                            <div className="lg:col-span-2">
                                <label className="label">
                                    <span className="label-text font-bold">
                                        {direction === "incoming"
                                            ? "Purchase Price"
                                            : "Cost Price"}
                                    </span>
                                </label>

                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    className="input input-bordered w-full"
                                    value={unitPrice}
                                    onChange={(e) => setUnitPrice(e.target.value)}
                                />
                            </div>

                            <div className="lg:col-span-2">
                                <label className="label">
                                    <span className="label-text font-bold">Sale Price</span>
                                </label>

                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    className="input input-bordered w-full"
                                    value={salePrice}
                                    onChange={(e) => setSalePrice(e.target.value)}
                                />
                            </div>

                            <div className="lg:col-span-2 flex items-end">
                                <button
                                    type="button"
                                    onClick={addItem}
                                    className="btn btn-primary w-full"
                                >
                                    <Plus size={16} />
                                    Add
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
                        <div className="p-5 border-b flex items-center justify-between">
                            <h2 className="font-black text-gray-900">Hold Cart</h2>

                            <div className="flex items-center gap-2">
                                <span className="badge badge-primary">{items.length} Items</span>
                                <span className="badge badge-neutral">
                                    Total: {formatCurrency(totalAmount)}
                                </span>
                            </div>
                        </div>

                        {items.length === 0 ? (
                            <div className="p-10 text-center text-gray-500">
                                <Info size={32} className="mx-auto mb-2" />
                                No item added yet.
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="table table-zebra">
                                    <thead>
                                        <tr>
                                            <th>Product</th>
                                            <th>Variant</th>
                                            <th>Warehouse</th>
                                            <th>Batch</th>
                                            <th>Qty</th>
                                            <th>Cost/Purchase</th>
                                            <th>Sale</th>
                                            <th>Total</th>
                                            <th></th>
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {items.map((item) => (
                                            <tr key={item.uniqueKey}>
                                                <td>
                                                    <div className="font-bold">
                                                        {item.product_name}
                                                    </div>
                                                    <div className="text-xs text-gray-500">
                                                        {item.product_no || "N/A"}
                                                    </div>
                                                </td>

                                                <td className="text-sm">{item.variant_name}</td>

                                                <td>{item.warehouse_name}</td>

                                                <td>{item.batch_no || "N/A"}</td>

                                                <td>
                                                    {item.quantity} {item.unit}
                                                </td>

                                                <td>{formatCurrency(item.unit_price)}</td>

                                                <td>{formatCurrency(item.sale_price)}</td>

                                                <td>
                                                    {formatCurrency(
                                                        item.quantity *
                                                            (direction === "outgoing"
                                                                ? item.sale_price
                                                                : item.unit_price)
                                                    )}
                                                </td>

                                                <td>
                                                    <button
                                                        type="button"
                                                        onClick={() => removeItem(item.uniqueKey)}
                                                        className="btn btn-ghost btn-xs text-red-600"
                                                    >
                                                        <Trash2 size={15} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        <div className="p-5 border-t flex justify-end">
                            <button
                                type="submit"
                                disabled={submitting || items.length === 0}
                                className="btn btn-primary"
                            >
                                <Save size={16} />
                                {submitting ? "Saving..." : "Create Pickup Hold"}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}