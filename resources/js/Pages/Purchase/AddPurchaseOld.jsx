import PageHeader from "../../components/PageHeader";
import { useForm, router } from "@inertiajs/react";
import { ArrowLeft, Plus, Trash2, Search, Shield, DollarSign, User, Building, Phone, Mail, MapPin, Info, Edit, X } from "lucide-react";
import { useState, useEffect, useRef, useCallback } from "react";
import { useTranslation } from "../../hooks/useTranslation";

export default function AddPurchase({ suppliers, warehouses, products, isShadowUser }) {
    const { t, locale } = useTranslation();
    const [selectedItems, setSelectedItems] = useState([]);
    const [productSearch, setProductSearch] = useState("");
    const [filteredProducts, setFilteredProducts] = useState([]);
    const [paymentStatus, setPaymentStatus] = useState('unpaid');
    const [shadowPaymentStatus, setShadowPaymentStatus] = useState('unpaid');
    const [paidAmount, setPaidAmount] = useState(0);
    const [shadowPaidAmount, setShadowPaidAmount] = useState(0);
    const [selectedSupplier, setSelectedSupplier] = useState(null);
    const [usePartialPayment, setUsePartialPayment] = useState(false);
    const [adjustFromAdvance, setAdjustFromAdvance] = useState(false);
    const [availableAdvance, setAvailableAdvance] = useState(0);
    const [manualPaymentOverride, setManualPaymentOverride] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);

    const searchRef = useRef(null);
    const dropdownRef = useRef(null);

    // Define calculate functions
    const calculateTotal = useCallback(() => {
        return selectedItems.reduce((total, item) => total + (item.total_price || 0), 0);
    }, [selectedItems]);

    const calculateShadowTotal = useCallback(() => {
        return selectedItems.reduce((total, item) => total + (item.shadow_total_price || 0), 0);
    }, [selectedItems]);

    const getDueAmount = useCallback(() => {
        const totalAmount = calculateTotal();
        return Math.max(0, totalAmount - paidAmount);
    }, [calculateTotal, paidAmount]);

    const getShadowDueAmount = useCallback(() => {
        const shadowTotalAmount = calculateShadowTotal();
        return Math.max(0, shadowTotalAmount - shadowPaidAmount);
    }, [calculateShadowTotal, shadowPaidAmount]);

    const getRemainingAdvance = useCallback(() => {
        const totalAmount = calculateTotal();
        const advanceUsed = Math.min(availableAdvance, totalAmount);
        return Math.max(0, availableAdvance - advanceUsed);
    }, [availableAdvance, calculateTotal]);

    const getAdvanceUsage = useCallback(() => {
        const totalAmount = calculateTotal();
        return Math.min(availableAdvance, totalAmount);
    }, [availableAdvance, calculateTotal]);

    const formatCurrency = (value) => {
        const numValue = Number(value) || 0;
        return new Intl.NumberFormat('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(numValue);
    };

    const form = useForm({
        supplier_id: "",
        adjust_from_advance: false,
        warehouse_id: "",
        purchase_date: new Date().toISOString().split('T')[0],
        notes: "",
        paid_amount: 0,
        shadow_paid_amount: 0,
        payment_status: 'unpaid',
        shadow_payment_status: 'unpaid',
        items: [],
        use_partial_payment: false,
        manual_payment_override: false,
    });

    // Sync selectedItems with form data
    useEffect(() => {
        form.setData('items', selectedItems);
    }, [selectedItems]);

    // Sync payment data with form
    useEffect(() => {
        const formData = {
            ...form.data,
            paid_amount: paidAmount,
            shadow_paid_amount: shadowPaidAmount,
            payment_status: paymentStatus,
            shadow_payment_status: shadowPaymentStatus,
            use_partial_payment: usePartialPayment,
            adjust_from_advance: adjustFromAdvance,
            manual_payment_override: manualPaymentOverride,
        };

        if (isShadowUser) {
            formData.paid_amount = 0;
            formData.payment_status = 'unpaid';
        }

        form.setData(formData);
    }, [
        paidAmount,
        shadowPaidAmount,
        paymentStatus,
        shadowPaymentStatus,
        usePartialPayment,
        adjustFromAdvance,
        manualPaymentOverride,
        isShadowUser
    ]);

    // Handle supplier selection
    const handleSupplierChange = (e) => {
        const supplierId = e.target.value;
        form.setData("supplier_id", supplierId);

        const supplier = suppliers?.find(s => s.id == supplierId);
        setSelectedSupplier(supplier);

        if (supplier) {
            let advance = 0;
            if (supplier.advance_amount !== undefined) {
                advance = parseFloat(supplier.advance_amount) || 0;
            } else {
                const supplierAdvance = parseFloat(supplier.advance || 0);
                const supplierDue = parseFloat(supplier.due || 0);
                advance = Math.max(0, supplierAdvance - supplierDue);
            }
            setAvailableAdvance(advance);
        } else {
            setAvailableAdvance(0);
        }

        setUsePartialPayment(false);
        setAdjustFromAdvance(false);
        setManualPaymentOverride(false);
        setPaidAmount(0);
        setPaymentStatus('unpaid');
    };

    // Handle adjust from advance checkbox
    useEffect(() => {
        if (adjustFromAdvance && availableAdvance > 0 && !manualPaymentOverride) {
            const totalAmount = calculateTotal();
            const maxAdjustable = Math.min(availableAdvance, totalAmount);

            if (paidAmount === 0 || paidAmount > totalAmount) {
                const autoPaidAmount = Math.min(maxAdjustable, totalAmount);
                setPaidAmount(autoPaidAmount);

                if (autoPaidAmount >= totalAmount) {
                    setPaymentStatus('paid');
                } else if (autoPaidAmount > 0) {
                    setPaymentStatus('partial');
                } else {
                    setPaymentStatus('unpaid');
                }
            }
        }
    }, [adjustFromAdvance, availableAdvance, calculateTotal, manualPaymentOverride]);

    // Handle partial payment checkbox
    useEffect(() => {
        if (!usePartialPayment && !manualPaymentOverride && !adjustFromAdvance) {
            const totalAmount = calculateTotal();
            setPaidAmount(totalAmount);
        }
    }, [usePartialPayment, calculateTotal, manualPaymentOverride, adjustFromAdvance]);

    // Enable manual payment override
    const enableManualPaymentOverride = () => {
        setManualPaymentOverride(true);
        setAdjustFromAdvance(false);
    };

    const disableManualPaymentOverride = () => {
        setManualPaymentOverride(false);
        const totalAmount = calculateTotal();
        if (!usePartialPayment) {
            setPaidAmount(totalAmount);
        } else {
            setPaidAmount(0);
        }
        setPaymentStatus('unpaid');
    };

    // Handle manual payment input
    const handleManualPaymentInput = (e) => {
        const value = parseFloat(e.target.value) || 0;
        const totalAmount = calculateTotal();

        setPaidAmount(value);

        if (value === 0) {
            setPaymentStatus('unpaid');
        } else if (value >= totalAmount) {
            setPaymentStatus('paid');
        } else {
            setPaymentStatus('partial');
        }
    };

    // Helper function to get variant display name
    const getVariantDisplayName = (variant) => {
        if (variant.attribute_values && Object.keys(variant.attribute_values).length > 0) {
            const parts = [];
            for (const [attribute, value] of Object.entries(variant.attribute_values)) {
                parts.push(`${attribute}: ${value}`);
            }
            return parts.join(', ');
        }

        const parts = [];
        if (variant.size) parts.push(`Size: ${variant.size}`);
        if (variant.color) parts.push(`Color: ${variant.color}`);
        if (variant.material) parts.push(`Material: ${variant.material}`);
        return parts.join(', ') || 'Default Variant';
    };

    // Filter products based on search
    useEffect(() => {
        if (productSearch.trim()) {
            const filtered = products.filter(product =>
                product.name.toLowerCase().includes(productSearch.toLowerCase()) ||
                product.product_no.toLowerCase().includes(productSearch.toLowerCase())
            );
            setFilteredProducts(filtered);
            setShowDropdown(true);
        } else {
            setFilteredProducts([]);
            setShowDropdown(false);
        }
    }, [productSearch, products]);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setShowDropdown(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const addItem = (product, variant) => {
        const existingItem = selectedItems.find(
            item => item.product_id === product.id && item.variant_id === variant.id
        );

        if (existingItem) {
            setSelectedItems(selectedItems.map(item =>
                item.product_id === product.id && item.variant_id === variant.id
                    ? {
                        ...item,
                        quantity: item.quantity + 1,
                        total_price: (item.quantity + 1) * item.unit_price,
                        shadow_total_price: (item.quantity + 1) * item.shadow_unit_price
                    }
                    : item
            ));
        } else {
            const defaultUnitPrice = variant.unit_cost || 1;
            const defaultSalePrice = variant.selling_price || 1;
            const defaultShadowUnitPrice = variant.shadow_unit_cost || 1;
            const defaultShadowSalePrice = variant.shadow_selling_price || 1;

            setSelectedItems([
                ...selectedItems,
                {
                    product_id: product.id,
                    variant_id: variant.id,
                    product_name: product.name,
                    variant_name: getVariantDisplayName(variant),
                    quantity: 1,
                    unit_price: defaultUnitPrice,
                    sale_price: defaultSalePrice,
                    shadow_unit_price: defaultShadowUnitPrice,
                    shadow_sale_price: defaultShadowSalePrice,
                    total_price: defaultUnitPrice * 1,
                    shadow_total_price: defaultShadowUnitPrice * 1
                }
            ]);
        }
        setProductSearch("");
        setShowDropdown(false);
        setFilteredProducts([]);
    };

    const removeItem = (index) => {
        const updated = [...selectedItems];
        updated.splice(index, 1);
        setSelectedItems(updated);
    };

    const updateItem = (index, field, value) => {
        const updated = [...selectedItems];
        const numericValue = field === 'quantity' ? parseInt(value) || 1 : parseFloat(value) || 0;

        updated[index][field] = numericValue;

        if (field === 'quantity' || field === 'unit_price' || field === 'shadow_unit_price') {
            const quantity = updated[index].quantity;
            const unitPrice = updated[index].unit_price;
            const shadowUnitPrice = updated[index].shadow_unit_price;

            updated[index].total_price = quantity * unitPrice;
            updated[index].shadow_total_price = quantity * shadowUnitPrice;
        }

        if (field === 'sale_price' || field === 'shadow_sale_price') {
            updated[index][field] = numericValue;
        }

        setSelectedItems(updated);
    };

    const handlePaymentStatusChange = (status) => {
        setPaymentStatus(status);
        const totalAmount = calculateTotal();

        if (status === 'paid') {
            setPaidAmount(totalAmount);
            setManualPaymentOverride(false);
            setAdjustFromAdvance(false);
        } else if (status === 'unpaid') {
            setPaidAmount(0);
            setManualPaymentOverride(false);
            setAdjustFromAdvance(false);
        } else if (status === 'partial') {
            setManualPaymentOverride(true);
            setAdjustFromAdvance(false);
        }
    };

    const handleShadowPaymentStatusChange = (status) => {
        setShadowPaymentStatus(status);
        if (status === 'paid') {
            setShadowPaidAmount(calculateShadowTotal());
        } else if (status === 'unpaid') {
            setShadowPaidAmount(0);
        }
    };

    const submit = (e) => {
        e.preventDefault();

        if (!form.data.supplier_id) {
            alert(t('purchase.select_supplier', 'Please select a supplier'));
            return;
        }

        if (!form.data.warehouse_id) {
            alert(t('purchase.select_warehouse', 'Please select a warehouse'));
            return;
        }

        if (selectedItems.length === 0) {
            alert(t('purchase.add_products_validation', 'Please add at least one product'));
            return;
        }

        const invalidItems = selectedItems.filter(item =>
            item.quantity <= 0 ||
            item.unit_price <= 0 ||
            item.shadow_unit_price <= 0
        );

        if (invalidItems.length > 0) {
            alert(t('purchase.valid_prices_validation', 'Please ensure all items have valid quantities and prices greater than 0'));
            return;
        }

        let advanceAdjustment = 0;
        if (adjustFromAdvance && availableAdvance > 0) {
            const totalAmount = calculateTotal();
            const maxAdjustable = Math.min(availableAdvance, totalAmount);
            advanceAdjustment = Math.min(paidAmount, maxAdjustable);
        }

        const finalData = {
            ...form.data,
            total_amount: calculateTotal(),
            shadow_total_amount: calculateShadowTotal(),
            due_amount: getDueAmount(),
            shadow_due_amount: getShadowDueAmount(),
            use_partial_payment: usePartialPayment,
            adjust_from_advance: adjustFromAdvance,
            manual_payment_override: manualPaymentOverride,
            advance_adjustment: advanceAdjustment,
            remaining_advance: getRemainingAdvance(),
            advance_used: getAdvanceUsage(),
        };

        if (isShadowUser) {
            finalData.paid_amount = 0;
            finalData.payment_status = 'unpaid';
            finalData.due_amount = finalData.total_amount;
            finalData.adjust_from_advance = false;
            finalData.advance_adjustment = 0;
        }

        form.post(route("purchase.store"), {
            onSuccess: () => {
                router.visit(route("purchase.list"));
            },
            onError: (errors) => {
                console.error("Error occurred:", errors);
                if (errors.items) {
                    alert("Please check the product items: " + errors.items);
                } else {
                    alert(errors.error || "There was an error creating the purchase. Please check all fields and try again.");
                }
            }
        });
    };

    const totalAmount = calculateTotal();
    const shadowTotalAmount = calculateShadowTotal();
    const dueAmount = getDueAmount();
    const shadowDueAmount = getShadowDueAmount();
    const advanceUsage = getAdvanceUsage();
    const remainingAdvance = getRemainingAdvance();

    return (
        <div className={`bg-white rounded-box p-5 ${locale === 'bn' ? 'bangla-font' : ''}`}>
            <PageHeader
                title={isShadowUser ? t('purchase.create_shadow_purchase', 'Create Purchase (Shadow Mode)') : t('purchase.create_purchase', 'Create New Purchase')}
                subtitle={isShadowUser ? t('purchase.create_shadow_subtitle', 'Add products to purchase order with shadow pricing') : t('purchase.create_subtitle', 'Add products to purchase order with real and shadow pricing')}
            >
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => router.visit(route("purchase.list"))}
                        className="btn btn-sm btn-ghost"
                    >
                        <ArrowLeft size={15} /> {t('purchase.back_to_list', 'Back to List')}
                    </button>
                </div>
            </PageHeader>

            <form onSubmit={submit}>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                    {/* Left Column - Basic Information */}
                    <div className="lg:col-span-1 space-y-4">
                        <div className="form-control">
                            <label className="label">
                                <span className="label-text">{t('purchase.supplier', 'Supplier')} *</span>
                            </label>
                            <select
                                className="select select-bordered w-full"
                                value={form.data.supplier_id}
                                onChange={handleSupplierChange}
                                required
                            >
                                <option value="">{t('purchase.select_supplier', 'Select Supplier')}</option>
                                {suppliers?.map(supplier => (
                                    <option key={supplier.id} value={supplier.id}>
                                        {supplier.name} - {supplier.company}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Supplier Information Card */}
                        {selectedSupplier && (
                            <div className="card card-compact bg-base-100 border border-base-300">
                                <div className="card-body">
                                    <h3 className="card-title text-sm font-semibold flex items-center gap-2">
                                        <User size={16} /> {t('purchase.supplier_information', 'Supplier Information')}
                                    </h3>
                                    <div className="space-y-2 text-sm">
                                        <div className="flex items-center gap-2">
                                            <User size={12} className="text-gray-500 flex-shrink-0" />
                                            <span className="font-medium truncate">{selectedSupplier.name}</span>
                                        </div>
                                        {selectedSupplier.company && (
                                            <div className="flex items-center gap-2">
                                                <Building size={12} className="text-gray-500 flex-shrink-0" />
                                                <span className="truncate">{selectedSupplier.company}</span>
                                            </div>
                                        )}
                                        {selectedSupplier.phone && (
                                            <div className="flex items-center gap-2">
                                                <Phone size={12} className="text-gray-500 flex-shrink-0" />
                                                <span>{selectedSupplier.phone}</span>
                                            </div>
                                        )}
                                        {selectedSupplier.email && (
                                            <div className="flex items-center gap-2">
                                                <Mail size={12} className="text-gray-500 flex-shrink-0" />
                                                <span className="truncate">{selectedSupplier.email}</span>
                                            </div>
                                        )}
                                        {selectedSupplier.address && (
                                            <div className="flex items-start gap-2">
                                                <MapPin size={12} className="text-gray-500 mt-0.5 flex-shrink-0" />
                                                <span className="text-xs line-clamp-2">{selectedSupplier.address}</span>
                                            </div>
                                        )}
                                        {selectedSupplier.contact_person && (
                                            <div className="flex items-center gap-2">
                                                <User size={12} className="text-gray-500 flex-shrink-0" />
                                                <span className="text-xs">
                                                    <span className="font-medium">{t('purchase.contact_person', 'Contact')}:</span>
                                                    <span className="ml-1">{selectedSupplier.contact_person}</span>
                                                </span>
                                            </div>
                                        )}
                                        {(availableAdvance > 0 || selectedSupplier.advance_amount > 0) && (
                                            <div className="flex items-center gap-2 pt-1 border-t border-base-300">
                                                <DollarSign size={12} className="text-success flex-shrink-0" />
                                                <span className="text-xs">
                                                    <span className="font-medium">{t('purchase.available_advance', 'Available Advance')}:</span>
                                                    <span className="ml-1 font-bold text-success">
                                                        ৳{formatCurrency(availableAdvance)}
                                                    </span>
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Payment Options */}
                                    {(availableAdvance > 0) && (
                                        <div className="mt-3 pt-3 border-t border-base-300">
                                            <h4 className="font-medium text-sm mb-2">{t('purchase.payment_options', 'Payment Options')}</h4>

                                            <div className="space-y-2">
                                                <label className="flex items-center gap-2 cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={usePartialPayment}
                                                        onChange={(e) => {
                                                            setUsePartialPayment(e.target.checked);
                                                            if (!e.target.checked) {
                                                                setManualPaymentOverride(false);
                                                            }
                                                        }}
                                                        className="checkbox checkbox-xs checkbox-primary"
                                                    />
                                                    <span className="text-xs">{t('purchase.allow_partial_payment', 'Allow Partial Payment')}</span>
                                                </label>

                                                <label className="flex items-center gap-2 cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={adjustFromAdvance}
                                                        onChange={(e) => {
                                                            setAdjustFromAdvance(e.target.checked);
                                                            if (e.target.checked) {
                                                                setManualPaymentOverride(false);
                                                            }
                                                        }}
                                                        className="checkbox checkbox-xs checkbox-primary"
                                                    />
                                                    <span className="text-xs">{t('purchase.adjust_from_advance', 'Adjust from Supplier Advance')}</span>
                                                    <span className="text-xs text-gray-500">
                                                        (৳{formatCurrency(Math.min(availableAdvance, totalAmount))})
                                                    </span>
                                                </label>
                                            </div>

                                            {adjustFromAdvance && (
                                                <div className="mt-2 p-2 bg-info/10 border border-info/20 rounded text-xs text-info">
                                                    <strong>{t('purchase.note', 'Note')}:</strong>
                                                    {t('purchase.advance_will_be_deducted', ' Up to ৳')}{formatCurrency(Math.min(availableAdvance, totalAmount))}
                                                    {t('purchase.will_be_deducted', ' will be deducted from supplier\'s advance balance.')}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        <div className="form-control">
                            <label className="label">
                                <span className="label-text">{t('purchase.warehouse', 'Warehouse')} *</span>
                            </label>
                            <select
                                className="select select-bordered w-full"
                                value={form.data.warehouse_id}
                                onChange={(e) => form.setData("warehouse_id", e.target.value)}
                                required
                            >
                                <option value="">{t('purchase.select_warehouse', 'Select Warehouse')}</option>
                                {warehouses?.map(warehouse => (
                                    <option key={warehouse.id} value={warehouse.id}>
                                        {warehouse.name} ({warehouse.code})
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="form-control">
                            <label className="label">
                                <span className="label-text">{t('purchase.purchase_date', 'Purchase Date')} *</span>
                            </label>
                            <input
                                type="date"
                                className="input input-bordered w-full"
                                value={form.data.purchase_date}
                                onChange={(e) => form.setData("purchase_date", e.target.value)}
                                required
                            />
                        </div>

                        {/* Payment Information Section */}
                        {isShadowUser ? (
                            <div className="card card-compact bg-warning/10 border border-warning">
                                <div className="card-body">
                                    <h3 className="card-title text-sm font-semibold flex items-center gap-2 text-warning">
                                        <Shield size={16} />
                                        {t('purchase.shadow_payment_information', 'Shadow Payment Information')}
                                    </h3>

                                    <div className="form-control">
                                        <label className="label py-1">
                                            <span className="label-text text-xs">{t('purchase.payment_status', 'Payment Status')}</span>
                                        </label>
                                        <select
                                            className="select select-bordered select-sm w-full border-warning"
                                            value={shadowPaymentStatus}
                                            onChange={(e) => handleShadowPaymentStatusChange(e.target.value)}
                                        >
                                            <option value="unpaid">{t('purchase.unpaid', 'Unpaid')}</option>
                                            <option value="partial">{t('purchase.partial', 'Partial')}</option>
                                            <option value="paid">{t('purchase.paid', 'Paid')}</option>
                                        </select>
                                    </div>

                                    <div className="form-control">
                                        <label className="label py-1">
                                            <span className="label-text text-xs">{t('purchase.paid_amount', 'Paid Amount')}</span>
                                        </label>
                                        <input
                                            type="number"
                                            min="0"
                                            
                                            className="input input-bordered input-sm w-full border-warning"
                                            value={shadowPaidAmount}
                                            onChange={(e) => setShadowPaidAmount(parseFloat(e.target.value) || 0)}
                                        />
                                    </div>

                                    <div className="space-y-1 text-xs">
                                        <div className="flex justify-between">
                                            <span>{t('purchase.total_amount', 'Total Amount')}:</span>
                                            <span className="font-semibold text-warning">
                                                ৳{formatCurrency(shadowTotalAmount)}
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>{t('purchase.paid_amount', 'Paid Amount')}:</span>
                                            <span className="text-success">৳{formatCurrency(shadowPaidAmount)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>{t('purchase.due_amount', 'Due Amount')}:</span>
                                            <span className={`font-semibold ${shadowDueAmount > 0 ? 'text-warning' : 'text-success'}`}>
                                                ৳{formatCurrency(shadowDueAmount)}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="card card-compact bg-base-100 border border-base-300">
                                    <div className="card-body">
                                        <div className="flex justify-between items-center mb-2">
                                            <h3 className="card-title text-sm font-semibold flex items-center gap-2">
                                                <DollarSign size={16} />
                                                {t('purchase.payment_information', 'Payment Information')}
                                            </h3>
                                            {!manualPaymentOverride ? (
                                                <button
                                                    type="button"
                                                    onClick={enableManualPaymentOverride}
                                                    className="btn btn-xs btn-outline btn-info"
                                                >
                                                    <Edit size={10} /> {t('purchase.manual', 'Manual')}
                                                </button>
                                            ) : (
                                                <button
                                                    type="button"
                                                    onClick={disableManualPaymentOverride}
                                                    className="btn btn-xs btn-outline btn-error"
                                                >
                                                    <X size={10} /> {t('purchase.cancel', 'Cancel')}
                                                </button>
                                            )}
                                        </div>

                                        <div className="form-control">
                                            <label className="label py-1">
                                                <span className="label-text text-xs">{t('purchase.payment_status', 'Payment Status')}</span>
                                            </label>
                                            <select
                                                className="select select-bordered select-sm w-full"
                                                value={paymentStatus}
                                                onChange={(e) => handlePaymentStatusChange(e.target.value)}
                                            >
                                                <option value="unpaid">{t('purchase.unpaid', 'Unpaid')}</option>
                                                <option value="partial">{t('purchase.partial', 'Partial')}</option>
                                                <option value="paid">{t('purchase.paid', 'Paid')}</option>
                                            </select>
                                        </div>

                                        <div className="form-control">
                                            <label className="label py-1">
                                                <span className="label-text text-xs">{t('purchase.paid_amount', 'Paid Amount')}</span>
                                                {manualPaymentOverride && (
                                                    <span className="label-text-alt text-info">
                                                        ({t('purchase.manual', 'Manual')})
                                                    </span>
                                                )}
                                            </label>
                                            <input
                                                type="number"
                                                min="0"
                                                max={totalAmount}
                                                
                                                className={`input input-bordered input-sm w-full ${manualPaymentOverride ? 'border-info' : ''}`}
                                                value={paidAmount}
                                                onChange={handleManualPaymentInput}
                                                disabled={!manualPaymentOverride && adjustFromAdvance}
                                            />
                                            {adjustFromAdvance && !manualPaymentOverride && (
                                                <p className="text-xs text-success mt-1">
                                                    {t('purchase.amount_paid_from_advance', 'Amount auto-calculated from supplier advance')}
                                                </p>
                                            )}
                                            {manualPaymentOverride && (
                                                <p className="text-xs text-info mt-1">
                                                    {t('purchase.manual_payment_mode', 'Manual payment mode active')}
                                                </p>
                                            )}
                                        </div>

                                        <div className="space-y-1 text-xs">
                                            <div className="flex justify-between">
                                                <span>{t('purchase.total_amount', 'Total Amount')}:</span>
                                                <span className="font-semibold">
                                                    ৳{formatCurrency(totalAmount)}
                                                </span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span>{t('purchase.paid_amount', 'Paid Amount')}:</span>
                                                <span className="text-success">৳{formatCurrency(paidAmount)}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span>{t('purchase.due_amount', 'Due Amount')}:</span>
                                                <span className={`font-semibold ${dueAmount > 0 ? 'text-warning' : 'text-success'}`}>
                                                    ৳{formatCurrency(dueAmount)}
                                                </span>
                                            </div>
                                            {adjustFromAdvance && (
                                                <div className="pt-2 border-t border-base-300">
                                                    <div className="flex justify-between">
                                                        <span>{t('purchase.advance_adjustment', 'Advance Adjustment')}:</span>
                                                        <span className="font-medium text-info">
                                                            ৳{formatCurrency(advanceUsage)}
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span>{t('purchase.remaining_advance', 'Remaining Advance')}:</span>
                                                        <span className={`font-medium ${remainingAdvance > 0 ? 'text-warning' : 'text-base-content/60'}`}>
                                                            ৳{formatCurrency(remainingAdvance)}
                                                        </span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="card card-compact bg-info/10 border border-info/20">
                                    <div className="card-body">
                                        <h3 className="card-title text-sm font-semibold flex items-center gap-2 text-info">
                                            <Shield size={16} />
                                            {t('purchase.shadow_payment_information', 'Shadow Payment Information')}
                                        </h3>

                                        <div className="form-control">
                                            <label className="label py-1">
                                                <span className="label-text text-xs">{t('purchase.payment_status', 'Payment Status')}</span>
                                            </label>
                                            <select
                                                className="select select-bordered select-sm w-full border-info"
                                                value={shadowPaymentStatus}
                                                onChange={(e) => handleShadowPaymentStatusChange(e.target.value)}
                                            >
                                                <option value="unpaid">{t('purchase.unpaid', 'Unpaid')}</option>
                                                <option value="partial">{t('purchase.partial', 'Partial')}</option>
                                                <option value="paid">{t('purchase.paid', 'Paid')}</option>
                                            </select>
                                        </div>

                                        <div className="form-control">
                                            <label className="label py-1">
                                                <span className="label-text text-xs">{t('purchase.paid_amount', 'Paid Amount')}</span>
                                            </label>
                                            <input
                                                type="number"
                                                min="0"
                                                
                                                className="input input-bordered input-sm w-full border-info"
                                                value={shadowPaidAmount}
                                                onChange={(e) => setShadowPaidAmount(parseFloat(e.target.value) || 0)}
                                            />
                                        </div>

                                        <div className="space-y-1 text-xs">
                                            <div className="flex justify-between">
                                                <span>{t('purchase.shadow_total', 'Shadow Total')}:</span>
                                                <span className="font-semibold text-info">
                                                    ৳{formatCurrency(shadowTotalAmount)}
                                                </span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span>{t('purchase.shadow_paid', 'Shadow Paid')}:</span>
                                                <span className="text-success">৳{formatCurrency(shadowPaidAmount)}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span>{t('purchase.shadow_due', 'Shadow Due')}:</span>
                                                <span className={`font-semibold ${shadowDueAmount > 0 ? 'text-warning' : 'text-success'}`}>
                                                    ৳{formatCurrency(shadowDueAmount)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="form-control">
                            <label className="label">
                                <span className="label-text">{t('purchase.notes', 'Notes')}</span>
                            </label>
                            <textarea
                                className="textarea textarea-bordered w-full textarea-sm"
                                rows="3"
                                value={form.data.notes}
                                onChange={(e) => form.setData("notes", e.target.value)}
                                placeholder={t('purchase.additional_notes', 'Additional notes...')}
                            />
                        </div>
                    </div>

                    {/* Right Column - Product Selection */}
                    <div className="lg:col-span-2">
                        <div className="form-control mb-4 relative" ref={searchRef}>
                            <label className="label">
                                <span className="label-text">{t('purchase.add_products', 'Add Products')} *</span>
                            </label>
                            <div className="relative">
                                <input
                                    type="text"
                                    className="input input-bordered w-full pr-10"
                                    value={productSearch}
                                    onChange={(e) => setProductSearch(e.target.value)}
                                    onFocus={() => productSearch.trim() && setShowDropdown(true)}
                                    placeholder={t('purchase.search_products', 'Search products by name or code...')}
                                />
                                <Search size={16} className="absolute right-3 top-3 text-gray-400" />
                            </div>

                            {showDropdown && filteredProducts.length > 0 && (
                                <div
                                    ref={dropdownRef}
                                    className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-96 overflow-y-auto"
                                >
                                    {filteredProducts.map(product => (
                                        <div key={product.id} className="border-b last:border-b-0">
                                            <div className="p-3 font-medium bg-base-200 sticky top-0 z-10">
                                                <div className="flex justify-between items-center">
                                                    <span className="font-semibold text-sm">
                                                        {product.name} 
                                                        {product?.brand && (
                                                            <span className="text-xs text-gray-500">({product.brand?.name || ''})</span>
                                                        )}
                                                    </span>
                                                    <span className="text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded">
                                                        {product.product_no}
                                                    </span>
                                                </div>
                                            </div>
                                            {product.variants && product.variants.map(variant => (
                                                <div
                                                    key={variant.id}
                                                    className="p-3 hover:bg-base-100 cursor-pointer border-b last:border-b-0 transition-colors duration-150"
                                                    onClick={() => addItem(product, variant)}
                                                >
                                                    <div className="flex justify-between items-start">
                                                        <div className="flex-1">
                                                            <div className="font-medium text-sm mb-1">
                                                                {getVariantDisplayName(variant)}
                                                            </div>
                                                            {variant.sku && (
                                                                <div className="text-xs text-gray-500 font-mono mb-1">
                                                                    SKU: {variant.sku}
                                                                </div>
                                                            )}
                                                            <div className="text-xs text-gray-600 space-y-1">
                                                                <div className="flex gap-4">
                                                                    <div>
                                                                        <span className="font-medium">Cost:</span>
                                                                        <span className="ml-1">৳{variant.unit_cost || '0.00'}</span>
                                                                    </div>
                                                                    <div>
                                                                        <span className="font-medium">Shadow:</span>
                                                                        <span className="ml-1">৳{variant.shadow_unit_cost || '0.00'}</span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <Plus size={16} className="text-primary flex-shrink-0 ml-2 mt-1" />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ))}
                                </div>
                            )}

                            {showDropdown && filteredProducts.length === 0 && productSearch.trim() && (
                                <div
                                    ref={dropdownRef}
                                    className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg p-4 text-center text-gray-500"
                                >
                                    {t('purchase.no_products_found', 'No products found matching')} "{productSearch}"
                                </div>
                            )}
                        </div>

                        {/* Selected Items */}
                        {selectedItems.length > 0 ? (
                            <div className="space-y-4">
                                <h3 className="font-semibold text-lg flex items-center gap-2">
                                    {t('purchase.selected_items', 'Selected Items')}
                                    <span className="badge badge-primary badge-sm">{selectedItems.length}</span>
                                </h3>

                                <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
                                    {selectedItems.map((item, index) => (
                                        <div key={index} className="card card-compact bg-base-100 border border-base-300">
                                            <div className="card-body">
                                                <div className="flex justify-between items-start mb-3">
                                                    <div className="flex-1">
                                                        <h4 className="font-medium text-base">{item.product_name}</h4>
                                                        <p className="text-sm text-gray-600">{item.variant_name}</p>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => removeItem(index)}
                                                        className="btn btn-xs btn-error btn-outline"
                                                    >
                                                        <Trash2 size={12} />
                                                        {t('purchase.remove', 'Remove')}
                                                    </button>
                                                </div>

                                                <div className="space-y-4">
                                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                                                        <div className="form-control">
                                                            <label className="label py-1">
                                                                <span className="label-text text-xs">{t('purchase.quantity', 'Quantity')} *</span>
                                                            </label>
                                                            <input
                                                                type="number"
                                                                min="1"
                                                                className="input input-bordered input-sm w-full"
                                                                value={item.quantity}
                                                                onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 1)}
                                                                required
                                                            />
                                                        </div>

                                                        {!isShadowUser && (
                                                            <div className="form-control">
                                                                <label className="label py-1">
                                                                    <span className="label-text text-xs">{t('purchase.unit_price', 'Unit Price')} *</span>
                                                                </label>
                                                                <input
                                                                    type="number"
                                                                    min="0.01"
                                                                    
                                                                    className="input input-bordered input-sm w-full"
                                                                    value={item.unit_price}
                                                                    onChange={(e) => updateItem(index, 'unit_price', parseFloat(e.target.value) || 0)}
                                                                    required
                                                                />
                                                            </div>
                                                        )}

                                                        <div className="form-control">
                                                            <label className="label py-1">
                                                                <span className="label-text text-xs flex items-center gap-1">
                                                                    {isShadowUser ? t('purchase.unit_price', 'Unit Price') : t('purchase.shadow_unit_price', 'Shadow Unit Price')} *
                                                                    {isShadowUser && <Shield size={12} className="text-warning" />}
                                                                </span>
                                                            </label>
                                                            <input
                                                                type="number"
                                                                min="0.01"
                                                                
                                                                className={`input input-bordered input-sm w-full ${isShadowUser ? 'border-warning' : 'border-info'}`}
                                                                value={item.shadow_unit_price}
                                                                onChange={(e) => updateItem(index, 'shadow_unit_price', parseFloat(e.target.value) || 0)}
                                                                required
                                                            />
                                                        </div>



                                                        <div className="form-control">
                                                            <label className="label py-1">
                                                                <span className="label-text text-xs">
                                                                    {isShadowUser ? t('purchase.total_price', 'Total Price') : t('purchase.real_total', 'Real Total')}
                                                                </span>
                                                            </label>
                                                            <input
                                                                type="text"
                                                                className={`input input-bordered input-sm w-full bg-base-200 ${isShadowUser ? 'bg-warning/10' : ''}`}
                                                                value={isShadowUser ? formatCurrency(item.shadow_total_price) : formatCurrency(item.total_price)}
                                                                readOnly
                                                            />
                                                        </div>
                                                    </div>

                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                        {!isShadowUser && (
                                                            <div className="form-control">
                                                                <label className="label py-1">
                                                                    <span className="label-text text-xs">{t('purchase.sale_price', 'Sale Price')} *</span>
                                                                </label>
                                                                <input
                                                                    type="number"
                                                                    min="0.01"
                                                                    
                                                                    className="input input-bordered input-sm w-full"
                                                                    value={item.sale_price}
                                                                    onChange={(e) => updateItem(index, 'sale_price', parseFloat(e.target.value) || 0)}
                                                                    required
                                                                />
                                                            </div>
                                                        )}

                                                        <div className="form-control">
                                                            <label className="label py-1">
                                                                <span className="label-text text-xs flex items-center gap-1">
                                                                    {isShadowUser ? t('purchase.sale_price', 'Sale Price') : t('purchase.shadow_sale_price', 'Shadow Sale Price')} *
                                                                    {isShadowUser && <Shield size={12} className="text-warning" />}
                                                                </span>
                                                            </label>
                                                            <input
                                                                type="number"
                                                                min="0.01"
                                                                
                                                                className={`input input-bordered input-sm w-full ${isShadowUser ? 'border-warning' : 'border-info'}`}
                                                                value={item.shadow_sale_price}
                                                                onChange={(e) => updateItem(index, 'shadow_sale_price', parseFloat(e.target.value) || 0)}
                                                                required
                                                            />
                                                        </div>

                                                    </div>

                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-3 border-t border-base-300">
                                                        {!isShadowUser && (
                                                            <div className="text-xs space-y-1">
                                                                <div className="flex justify-between">
                                                                    <span className="font-medium">{t('purchase.real_total', 'Real Total')}:</span>
                                                                    <span className="font-semibold">৳{formatCurrency(item.total_price)}</span>
                                                                </div>
                                                                <div className="flex justify-between">
                                                                    <span className="font-medium">{t('purchase.real_sale_price', 'Real Sale Price')}:</span>
                                                                    <span className="font-semibold">৳{formatCurrency(item.sale_price)}</span>
                                                                </div>
                                                            </div>
                                                        )}
                                                        <div className={`text-xs space-y-1 ${isShadowUser ? 'text-warning' : 'text-info'}`}>
                                                            <div className="flex justify-between">
                                                                <span className="font-medium">
                                                                    {isShadowUser ? t('purchase.active_total', 'Active Total') : t('purchase.shadow_total', 'Shadow Total')}:
                                                                </span>
                                                                <span className="font-semibold">৳{formatCurrency(item.shadow_total_price)}</span>
                                                            </div>
                                                            <div className="flex justify-between">
                                                                <span className="font-medium">
                                                                    {isShadowUser ? t('purchase.active_sale_price', 'Active Sale Price') : t('purchase.shadow_sale_price', 'Shadow Sale Price')}:
                                                                </span>
                                                                <span className="font-semibold">৳{formatCurrency(item.shadow_sale_price)}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Totals Section */}
                                <div className="border-t border-base-300 pt-4 mt-4 space-y-4">
                                    <div className={`grid ${isShadowUser ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'} gap-4`}>
                                        {!isShadowUser && (
                                            <div className="card card-compact bg-base-100 border border-base-300">
                                                <div className="card-body">
                                                    <h4 className="card-title text-sm font-semibold flex items-center gap-2">
                                                        {t('purchase.real_amounts', 'Real Amounts')}
                                                        {adjustFromAdvance && (
                                                            <span className="badge badge-success badge-sm">
                                                                {t('purchase.advance_active', 'Advance Active')}
                                                            </span>
                                                        )}
                                                    </h4>
                                                    <div className="space-y-1 text-sm">
                                                        <div className="flex justify-between">
                                                            <span>{t('purchase.total_amount', 'Total Amount')}:</span>
                                                            <span className="font-semibold">
                                                                ৳{formatCurrency(totalAmount)}
                                                            </span>
                                                        </div>
                                                        <div className="flex justify-between">
                                                            <span>{t('purchase.paid_amount', 'Paid Amount')}:</span>
                                                            <span className="text-success">
                                                                ৳{formatCurrency(paidAmount)}
                                                            </span>
                                                        </div>
                                                        <div className="flex justify-between">
                                                            <span>{t('purchase.due_amount', 'Due Amount')}:</span>
                                                            <span className={`font-semibold ${dueAmount > 0 ? 'text-warning' : 'text-success'}`}>
                                                                ৳{formatCurrency(dueAmount)}
                                                            </span>
                                                        </div>
                                                        {adjustFromAdvance && (
                                                            <div className="pt-2 border-t border-base-300 space-y-1">
                                                                <div className="flex justify-between">
                                                                    <span>{t('purchase.advance_adjustment', 'Advance Adjustment')}:</span>
                                                                    <span className="font-medium text-info">
                                                                        ৳{formatCurrency(advanceUsage)}
                                                                    </span>
                                                                </div>
                                                                <div className="flex justify-between">
                                                                    <span>{t('purchase.remaining_advance', 'Remaining Advance')}:</span>
                                                                    <span className={`font-medium ${remainingAdvance > 0 ? 'text-warning' : 'text-base-content/60'}`}>
                                                                        ৳{formatCurrency(remainingAdvance)}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        )}
                                                        <div className="pt-2 border-t border-base-300">
                                                            <div className="flex justify-between items-center">
                                                                <span>{t('purchase.payment_status', 'Payment Status')}:</span>
                                                                <span className={`badge badge-${paymentStatus === 'paid' ? 'success' : paymentStatus === 'partial' ? 'warning' : 'error'} badge-sm`}>
                                                                    {t(`purchase.${paymentStatus}`, paymentStatus)}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        <div className={`card card-compact ${isShadowUser ? 'bg-warning/10 border border-warning' : 'bg-info/10 border border-info/20'}`}>
                                            <div className="card-body">
                                                <h4 className="card-title text-sm font-semibold flex items-center gap-2">
                                                    {isShadowUser ? t('purchase.active_amounts', 'Active Amounts') : t('purchase.shadow_amounts', 'Shadow Amounts')}
                                                    {isShadowUser && (
                                                        <span className="badge badge-warning badge-sm">{t('purchase.active', 'Active')}</span>
                                                    )}
                                                </h4>
                                                <div className="space-y-1 text-sm">
                                                    <div className="flex justify-between">
                                                        <span>{isShadowUser ? t('purchase.total_amount', 'Total Amount') : t('purchase.shadow_total', 'Shadow Total')}:</span>
                                                        <span className={`font-semibold ${isShadowUser ? 'text-warning' : 'text-info'}`}>
                                                            ৳{formatCurrency(shadowTotalAmount)}
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span>{isShadowUser ? t('purchase.paid_amount', 'Paid Amount') : t('purchase.shadow_paid', 'Shadow Paid')}:</span>
                                                        <span className="text-success">৳{formatCurrency(shadowPaidAmount)}</span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span>{isShadowUser ? t('purchase.due_amount', 'Due Amount') : t('purchase.shadow_due', 'Shadow Due')}:</span>
                                                        <span className={`font-semibold ${shadowDueAmount > 0 ? 'text-warning' : 'text-success'}`}>
                                                            ৳{formatCurrency(shadowDueAmount)}
                                                        </span>
                                                    </div>
                                                    <div className="pt-2 border-t border-base-300">
                                                        <div className="flex justify-between items-center">
                                                            <span>{t('purchase.payment_status', 'Payment Status')}:</span>
                                                            <span className={`badge badge-${shadowPaymentStatus === 'paid' ? 'success' : shadowPaymentStatus === 'partial' ? 'warning' : 'error'} badge-sm`}>
                                                                {t(`purchase.${shadowPaymentStatus}`, shadowPaymentStatus)}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Advanced Options Summary */}
                                    {!isShadowUser && (usePartialPayment || adjustFromAdvance || availableAdvance > 0) && (
                                        <div className="card card-compact bg-base-100 border border-base-300">
                                            <div className="card-body">
                                                <h4 className="card-title text-sm font-semibold flex items-center gap-2">
                                                    <Info size={16} />
                                                    {t('purchase.payment_options_summary', 'Payment Options Summary')}
                                                </h4>
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                                                    {usePartialPayment && (
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-2 h-2 rounded-full bg-[#1e4d2b] text-white"></div>
                                                            <span>{t('purchase.partial_payment_enabled', 'Partial Payment Enabled')}</span>
                                                        </div>
                                                    )}
                                                    {adjustFromAdvance && (
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-2 h-2 rounded-full bg-warning"></div>
                                                            <span>{t('purchase.advance_adjustment_enabled', 'Advance Adjustment Enabled')}</span>
                                                        </div>
                                                    )}
                                                    {availableAdvance > 0 && (
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-2 h-2 rounded-full bg-success"></div>
                                                            <span>
                                                                {t('purchase.available_advance', 'Available Advance')}:
                                                                <span className="font-medium ml-1">৳{formatCurrency(availableAdvance)}</span>
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="card card-compact bg-base-100 border-2 border-dashed border-base-300">
                                <div className="card-body text-center py-8">
                                    <p className="text-gray-500">{t('purchase.no_items_added', 'No items added yet')}</p>
                                    <p className="text-sm text-gray-400 mt-1">
                                        {t('purchase.search_add_products', 'Search and add products above')}
                                    </p>
                                    {isShadowUser && (
                                        <p className="text-sm text-warning mt-2">
                                            {t('purchase.enter_shadow_prices', 'Remember to enter shadow prices for all items')}
                                        </p>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex gap-3 mt-6">
                    <button
                        type="submit"
                        className={`btn ${isShadowUser ? 'btn-warning' : 'bg-[#1e4d2b] text-white'}`}
                        disabled={form.processing || selectedItems.length === 0}
                    >
                        {form.processing ? (
                            <span className="flex items-center gap-2">
                                <div className="loading loading-spinner loading-sm"></div>
                                {t('purchase.creating_purchase', 'Creating Purchase...')}
                            </span>
                        ) : isShadowUser ? (
                            <>
                                <Shield size={16} />
                                {t('purchase.create_shadow_purchase_btn', 'Create Shadow Purchase')}
                            </>
                        ) : (
                            t('purchase.create_purchase_btn', 'Create Purchase')
                        )}
                    </button>
                    <button
                        type="button"
                        onClick={() => router.visit(route("purchase.list"))}
                        className="btn btn-ghost"
                    >
                        {t('purchase.cancel', 'Cancel')}
                    </button>
                </div>
            </form>
        </div>
    );
}