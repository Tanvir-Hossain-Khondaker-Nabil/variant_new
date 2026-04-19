import PageHeader from "../../components/PageHeader";
import { useForm, router } from "@inertiajs/react";
import { ArrowLeft, Plus, Trash2, Search } from "lucide-react";
import { useState, useEffect, useCallback } from "react";

export default function AddSale({ customers, productstocks }) {
    const [selectedItems, setSelectedItems] = useState([]);
    const [productSearch, setProductSearch] = useState("");
    const [filteredProducts, setFilteredProducts] = useState([]);
    const [vatRate, setVatRate] = useState(0);
    const [discountRate, setDiscountRate] = useState(0);
    const [paidAmount, setPaidAmount] = useState(0);
    const [shadowPaidAmount, setShadowPaidAmount] = useState(0);

    console.log("Customers:", customers);
    console.log("Product Stocks:", productstocks);

    const calculateSubTotal = useCallback(() => {
        if (!selectedItems || selectedItems.length === 0) return 0;
        return selectedItems.reduce((total, item) => {
            const itemTotal = Number(item.total_price) || 0;
            return total + itemTotal;
        }, 0);
    }, [selectedItems]);

    const calculateVatAmount = useCallback(() => {
        const subtotal = calculateSubTotal();
        return (subtotal * (Number(vatRate) || 0)) / 100;
    }, [calculateSubTotal, vatRate]);

    const calculateDiscountAmount = useCallback(() => {
        const subtotal = calculateSubTotal();
        return (subtotal * (Number(discountRate) || 0)) / 100;
    }, [calculateSubTotal, discountRate]);

    const calculateGrandTotal = useCallback(() => {
        const subtotal = calculateSubTotal();
        const vatAmount = calculateVatAmount();
        const discountAmount = calculateDiscountAmount();
        return subtotal + vatAmount - discountAmount;
    }, [calculateSubTotal, calculateVatAmount, calculateDiscountAmount]);

    const calculateDueAmount = useCallback(() => {
        const grandTotal = calculateGrandTotal();
        const paid = Number(paidAmount) || 0;
        return Math.max(0, grandTotal - paid);
    }, [calculateGrandTotal, paidAmount]);

    const form = useForm({
        customer_id: "",
        sale_date: new Date().toISOString().split('T')[0],
        notes: "",
        items: [],
        vat_rate: 0,
        discount_rate: 0,
        paid_amount: 0,
        grand_amount: 0,
        due_amount: 0,
        sub_amount: 0,
        type: 'inventory',
    });

    // Update form data when any of the dependencies change
    useEffect(() => {
        const subTotal = calculateSubTotal();
        const grandTotal = calculateGrandTotal();
        const dueAmount = calculateDueAmount();

        form.setData({
            ...form.data,
            items: selectedItems,
            vat_rate: Number(vatRate) || 0,
            discount_rate: Number(discountRate) || 0,
            paid_amount: Number(paidAmount) || 0,
            shadow_paid_amount: Number(shadowPaidAmount) || 0,
            grand_amount: grandTotal,
            due_amount: dueAmount,
            sub_amount: subTotal,
            type: 'inventory',
            shadow_type: 'shadow',
        });
    }, [selectedItems, vatRate, discountRate, paidAmount, shadowPaidAmount, calculateSubTotal, calculateGrandTotal, calculateDueAmount]);

    const getVariantDisplayName = (variant) => {
        const parts = [];

        if (variant.attribute_values) {
            if (typeof variant.attribute_values === 'object') {
                const attrs = Object.entries(variant.attribute_values)
                    .map(([key, value]) => ` ${value}`)
                    .join(', ');
                parts.push(` ${attrs}`);
            } else {
                parts.push(`Attribute: ${variant.attribute_values}`);
            }
        }

         if (variant.sku) parts.push(`Sku: ${variant.sku}`);
        return parts.join(', ') || 'Default Variant';
    };

    const getBrandName = (variant) => {
        const parts = [];

        if (variant.attribute_values) {
            if (typeof variant.attribute_values === 'object') {
                const attrs = Object.entries(variant.attribute_values)
                    .map(([key, value]) => `${key}`)
                    .join(', ');
                parts.push(` ${attrs}`);
            } else {
                parts.push(`Attribute: ${variant.attribute_values}`);
            }
        }

        return parts.join(', ') || 'Default Variant';
    };

    // Filter products based on search
    useEffect(() => {
        if (productSearch) {
            const filtered = productstocks.filter(productstock =>
                productstock.product.name.toLowerCase().includes(productSearch.toLowerCase()) ||
                productstock.product.product_no?.toLowerCase().includes(productSearch.toLowerCase())
            );
            setFilteredProducts(filtered);
        } else {
            setFilteredProducts(productstocks.slice(0, 10));
        }
    }, [productSearch, productstocks]);

    const addItem = (productstock, variant) => {
        const variantId = variant?.id || 0;

        const existingItem = selectedItems.find(
            item => item.product_id === productstock.product.id && item.variant_id === variantId
        );

        if (existingItem) {
            setSelectedItems(selectedItems.map(item =>
                item.product_id === productstock.product.id && item.variant_id === variantId
                    ? { ...item, quantity: item.quantity }
                    : item
            ));
        } else {
            const salePrice = Number(productstock.sale_price) || 0;
            const shadowSalePrice = Number(productstock.shadow_sale_price) || 0;

            setSelectedItems([
                ...selectedItems,
                {
                    product_id: productstock.product.id,
                    variant_id: variantId,
                    product_name: productstock.product.name,
                    product_code: productstock.product.product_no || '',
                    variant_name: variant ? getVariantDisplayName(variant) : 'Default Variant',
                    brand_name: variant ? getBrandName(variant) : 'Default Brand',
                    quantity: 1,
                    stockQuantity: Number(productstock.quantity) || 0,
                    unit_price: salePrice,
                    sell_price: salePrice,
                    total_price: shadowSalePrice,
                    shadow_sell_price: shadowSalePrice,
                }
            ]);
        }
        setProductSearch("");
        setFilteredProducts([]);
    };

    const removeItem = (index) => {
        const updated = [...selectedItems];
        updated.splice(index, 1);
        setSelectedItems(updated);
    };

    const updateItem = (index, field, value) => {
        const updated = [...selectedItems];
        const numValue = field === 'quantity' ? parseInt(value) || 0 : parseFloat(value) || 0;

        updated[index][field] = numValue;

        if (field === 'quantity' || field === 'unit_price') {
            const quantity = field === 'quantity' ? numValue : updated[index].quantity;
            const unitPrice = field === 'shadow_sell_price' ? numValue : updated[index].shadow_sell_price;

            updated[index].total_price = quantity * unitPrice;
        }

        setSelectedItems(updated);
    };

    console.log("Selected Items:", selectedItems);
    console.log("Form Data:", form.data);

    // Safe number formatting function
    const formatCurrency = (value) => {
        const numValue = Number(value) || 0;
        return numValue.toFixed(2);
    };

    const submit = (e) => {
        e.preventDefault();

        if (selectedItems.length === 0) {
            alert("Please add at least one product to the sale");
            return;
        }

        // Validate that all items have quantity and unit price
        const invalidItems = selectedItems.filter(item =>
            !item.quantity || item.quantity <= 0 || !item.unit_price || item.unit_price <= 0
        );

        if (invalidItems.length > 0) {
            alert("Please ensure all items have valid quantity and unit price");
            return;
        }

        // Check for stock availability
        const outOfStockItems = selectedItems.filter(item =>
            item.quantity > item.stockQuantity
        );

        if (outOfStockItems.length > 0) {
            alert("Some items exceed available stock. Please adjust quantities.");
            return;
        }

        console.log("Submitting form data:", form.data);

        form.post(route("salesShadow.store"), {
            onSuccess: () => {
                console.log("Sale created successfully");
                router.visit(route("sales.index"));
            },
            onError: (errors) => {
                console.error("Error occurred:", errors);
                if (errors.items) {
                    alert("Please check the product items: " + errors.items);
                } else {
                    console.error("Error occurred:", errors);
                    alert(errors.error || "Failed to create sale. Please check the form data.");
                }
            }
        });
    };

    return (
        <div className="bg-white rounded-box p-5">
            <PageHeader
                title="Create New (Sale/Order)(shadow)"
                subtitle="Add products to sale (Inventory System)"
            >
                <button
                    onClick={() => router.visit(route("sales.index"))}
                    className="btn btn-sm btn-ghost"
                >
                    <ArrowLeft size={15} /> Back to List
                </button>
            </PageHeader>

            <form onSubmit={submit}>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                    <div className="lg:col-span-1 space-y-4">
                        <div className="form-control">
                            <label className="label">
                                <span className="label-text">Customer *</span>
                            </label>
                            <select
                                className="select select-bordered"
                                value={form.data.customer_id}
                                onChange={(e) => form.setData("customer_id", e.target.value)}
                                required
                            >
                                <option value="">Select Customer</option>
                                {customers.map(c => (
                                    <option key={c.id} value={c.id}>{c.customer_name}</option>
                                ))}
                            </select>
                            {form.errors.customer_id && (
                                <div className="text-error text-sm mt-1">{form.errors.customer_id}</div>
                            )}
                        </div>

                        <div className="form-control">
                            <label className="label">
                                <span className="label-text">Sale Date *</span>
                            </label>
                            <input
                                type="date"
                                className="input input-bordered"
                                value={form.data.sale_date}
                                onChange={(e) => form.setData("sale_date", e.target.value)}
                                required
                            />
                        </div>

                        <div className="form-control">
                            <label className="label">
                                <span className="label-text">Notes</span>
                            </label>
                            <textarea
                                className="textarea textarea-bordered"
                                rows="3"
                                value={form.data.notes}
                                onChange={(e) => form.setData("notes", e.target.value)}
                                placeholder="Additional notes..."
                            />
                        </div>
                    </div>

                    {/* Product Selection */}
                    <div className="lg:col-span-2">
                        <div className="form-control mb-4 relative">
                            <label className="label">
                                <span className="label-text">Add Products</span>
                            </label>
                            <input
                                type="text"
                                className="input input-bordered w-full pr-10"
                                value={productSearch}
                                onChange={(e) => setProductSearch(e.target.value)}
                                placeholder="Search products by name or SKU..."
                            />

                            {/* Product Search Results */}
                            {productSearch && filteredProducts.length > 0 && (
                                <div className="absolute z-10 mt-1 w-full max-w-md bg-white border border-gray-300 rounded-box shadow-lg max-h-60 overflow-y-auto">
                                    {filteredProducts.map(filteredProduct => {
                                        const brand = filteredProduct.variant?.attribute_values
                                            ? Object.entries(filteredProduct.variant.attribute_values)
                                                .map(([key, value]) => `${key}`)
                                                .join(', ')
                                            : null;

                                        const attributes = filteredProduct.variant?.attribute_values
                                        ? Object.entries(filteredProduct.variant.attribute_values)
                                            .map(([key, value]) => `${value}`)
                                            .join(', ')
                                        : null;
                                        return (
                                            <div
                                                key={filteredProduct.product.id}
                                                className="p-3 hover:bg-gray-100 cursor-pointer border-b last:border-b-0"
                                                onClick={() => addItem(filteredProduct, filteredProduct.variant)}
                                            >
                                                <div className="flex flex-col">
                                                    <div className="flex justify-between items-center">
                                                        <span>{filteredProduct.product.name} ({filteredProduct.variant.sku})</span>
                                                        <Plus size={14} className="text-primary" />
                                                    </div>
                                                    {attributes && (
                                                        <div className="text-sm text-gray-500 mt-1">
                                                            <span>BrandName: {brand} || </span>
                                                            { attributes && <span>Variant: {attributes}  </span>}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {selectedItems.length > 0 ? (

                            <div className="space-y-3">
                                <h3 className="font-semibold">Selected Items ({selectedItems.length})</h3>
                                {selectedItems.map((item, index) => (
                                    <div key={index} className="border border-gray-300 rounded-box p-4">
                                        <div className="flex justify-between items-start mb-3">
                                            <div className="flex-1">
                                                <h4 className="font-medium">{item.product_name} ({item.product_code})</h4>
                                                <p className="text-sm text-gray-600"><strong>BrandName: </strong> {item?.brand_name}</p>
                                                <p className="text-sm text-gray-600"><strong>Variant: </strong> {item.variant_name}</p>
                                                <p className="text-sm text-gray-600"> <strong>Available Stock:</strong> {item.stockQuantity} |
                                                    <strong>Sale Price:</strong> ৳{formatCurrency(item.shadow_sell_price)}</p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => removeItem(index)}
                                                className="btn btn-xs btn-error"
                                            >
                                                <Trash2 size={12} />
                                            </button>
                                        </div>
                                        <div className="grid grid-cols-3 gap-3">
                                            <div className="form-control">
                                                <label className="label"><span className="label-text">Quantity *</span></label>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    max={item.stockQuantity}
                                                    className="input input-bordered input-sm"
                                                    value={item.quantity}
                                                    onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                                                    required
                                                />
                                                {item.quantity > item.stockQuantity && (
                                                    <div className="text-error text-xs mt-1">Exceeds available stock!</div>
                                                )}
                                            </div>

                                            <div className="form-control">
                                                <label className="label"><span className="label-text"> Unit Price (৳) *</span></label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    
                                                    className="input input-bordered input-sm bg-gray-100"
                                                    value={item.shadow_sell_price}
                                                    onChange={(e) => updateItem(index, 'shadow_sell_price', e.target.value)}
                                                    readOnly
                                                />
                                            </div>

                                            <div className="form-control">
                                                <label className="label"><span className="label-text">Total Price (৳)</span></label>
                                                <input
                                                    type="number"
                                                    className="input input-bordered input-sm bg-gray-100"
                                                    value={formatCurrency(item.total_price)}
                                                    readOnly
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                {/* Calculation Summary */}
                                <div className="border-t pt-4 mt-4 space-y-3">
                                    <div className="flex justify-between items-center">
                                        <span>Sub Total:</span>
                                        <span>৳{formatCurrency(calculateSubTotal())}</span>
                                    </div>

                                    {/* VAT Field */}
                                    <div className="flex justify-between items-center">
                                        <div className="flex items-center gap-2">
                                            <span>Vat / Tax:</span>
                                            <input
                                                type="number"
                                                min="0"
                                                max="100"
                                                
                                                className="input input-bordered input-sm w-20"
                                                value={vatRate}
                                                onChange={(e) => setVatRate(parseFloat(e.target.value) || 0)}
                                                placeholder="Rate %"
                                            />
                                            <span>%</span>
                                        </div>
                                        <span>৳{formatCurrency(calculateVatAmount())}</span>
                                    </div>

                                    {/* Discount Field */}
                                    <div className="flex justify-between items-center">
                                        <div className="flex items-center gap-2">
                                            <span>Discount:</span>
                                            <input
                                                type="number"
                                                min="0"
                                                max="100"
                                                
                                                className="input input-bordered input-sm w-20"
                                                value={discountRate}
                                                onChange={(e) => setDiscountRate(parseFloat(e.target.value) || 0)}
                                                placeholder="Rate %"
                                            />
                                            <span>%</span>
                                        </div>
                                        <span>৳{formatCurrency(calculateDiscountAmount())}</span>
                                    </div>

                                    <div className="flex justify-between items-center text-lg font-bold border-t pt-2">
                                        <span>Grand Total:</span>
                                        <span>৳{formatCurrency(calculateGrandTotal())}</span>
                                    </div>

                                    {/* Paid Amount */}
                                    <div className="flex justify-between items-center">
                                        <div className="flex items-center gap-2">
                                            <span>Paid Amount:</span>
                                            <input
                                                type="number"
                                                min="0"
                                                
                                                max={calculateGrandTotal()}
                                                className="input input-bordered input-sm w-32"
                                                value={paidAmount}
                                                onChange={(e) => setPaidAmount(parseFloat(e.target.value) || 0)}
                                            />
                                        </div>
                                        <span>৳{formatCurrency(paidAmount)}</span>
                                    </div>


                                    {/* Due Amount */}
                                    <div className="flex justify-between items-center text-lg font-bold border-t pt-2">
                                        <span>Due Amount:</span>
                                        <span className={calculateDueAmount() > 0 ? "text-error" : "text-success"}>
                                            ৳{formatCurrency(calculateDueAmount())}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-box">
                                <p className="text-gray-500">No items added yet</p>
                                <p className="text-sm text-gray-400 mt-1">Search and add products above</p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex gap-3 mt-6">
                    <button
                        type="submit"
                        className="btn bg-[#1e4d2b] text-white"
                        disabled={form.processing || selectedItems.length === 0}
                    >
                        {form.processing ? "Creating Sale..." : "Create Sale"}
                    </button>
                    <button
                        type="button"
                        onClick={() => router.visit(route("sales.index"))}
                        className="btn btn-ghost"
                    >
                        Cancel
                    </button>
                </div>
            </form>
        </div>
    );
}