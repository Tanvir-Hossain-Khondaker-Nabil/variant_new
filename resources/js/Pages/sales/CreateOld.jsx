import React, {
    useState,
    useEffect,
    useCallback,
    useMemo,
    useRef,
} from "react";
import PageHeader from "../../components/PageHeader";
import { useForm, router } from "@inertiajs/react";
import {
    ArrowLeft,
    Plus,
    Trash2,
    Search,
    User,
    Phone,
    Wallet,
    CreditCard,
    Landmark,
    Smartphone,
    ShoppingBag,
    X,
    ChevronRight,
    Warehouse,
    Edit,
    Ruler,
    AlertCircle,
    Calculator,
    RotateCcw,
} from "lucide-react";

export default function AddSale({
    customers,
    productstocks,
    suppliers,
    products,
    accounts,
    unitConversions = {
        weight: { ton: 1000, kg: 1, gram: 0.001, pound: 0.453592 },
        volume: { liter: 1, ml: 0.001 },
        piece: { piece: 1, dozen: 12, box: 1 },
        length: { meter: 1, cm: 0.01, mm: 0.001 },
    },
}) {
    const [selectedItems, setSelectedItems] = useState([]);
    const [pickupItems, setPickupItems] = useState([]);
    const [productSearch, setProductSearch] = useState("");
    const [filteredProducts, setFilteredProducts] = useState([]);
    const [vatRate, setVatRate] = useState(0);
    const [discountRate, setDiscountRate] = useState(0);
    const [paidAmount, setPaidAmount] = useState(0);
    const [shadowPaidAmount, setShadowPaidAmount] = useState(0);
    const [selectedAccount, setSelectedAccount] = useState("");
    const [paymentStatus, setPaymentStatus] = useState("unpaid");
    const [manualPaymentOverride, setManualPaymentOverride] = useState(false);
    const [customerSelectValue, setCustomerSelectValue] = useState("");
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [usePartialPayment, setUsePartialPayment] = useState(false);
    const [adjustFromAdvance, setAdjustFromAdvance] = useState(false);
    const [customerNameInput, setCustomerNameInput] = useState("");
    const [customerPhoneInput, setCustomerPhoneInput] = useState("");
    const [availableAdvance, setAvailableAdvance] = useState(0);
    const [showPickupModal, setShowPickupModal] = useState(false);
    const [showSupplierModal, setShowSupplierModal] = useState(false);
    const [pickupProductName, setPickupProductName] = useState("");
    const [pickupProductNo, setPickupProductNo] = useState("");
    const [pickupBrand, setPickupBrand] = useState("");
    const [pickupVariant, setPickupVariant] = useState("");
    const [selectedSupplier, setSelectedSupplier] = useState(null);
    const [newSupplierName, setNewSupplierName] = useState("");
    const [newSupplierCompany, setNewSupplierCompany] = useState("");
    const [newSupplierPhone, setNewSupplierPhone] = useState("");
    const [showProductDropdown, setShowProductDropdown] = useState(false);
    const [showBrandDropdown, setShowBrandDropdown] = useState(false);
    const [showVariantDropdown, setShowVariantDropdown] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [selectedBrand, setSelectedBrand] = useState(null);
    const [availableBrands, setAvailableBrands] = useState([]);
    const [availableVariants, setAvailableVariants] = useState([]);
    const [selectedUnits, setSelectedUnits] = useState({});
    const [unitQuantities, setUnitQuantities] = useState({});
    const [availableUnits, setAvailableUnits] = useState({});
    const [productDetails, setProductDetails] = useState({});
    const [stockDetails, setStockDetails] = useState({});
    const [basePrices, setBasePrices] = useState({});
    // Track if price was manually edited
    const [priceManuallyEdited, setPriceManuallyEdited] = useState({});

    // Installment payment state
    const [installmentDuration, setInstallmentDuration] = useState(0);
    const [totalInstallments, setTotalInstallments] = useState(0);

    // picup state
    const [pickupProductId, setPickupProductId] = useState("");
    const [pickupVariantId, setPickupVariantId] = useState("");
    const [pickupSupplierId, setPickupSupplierId] = useState("");
    const [pickupVariants, setPickupVariants] = useState([]);
    const [pickupQuantity, setPickupQuantity] = useState(1);
    const [pickupUnitPrice, setPickupUnitPrice] = useState(0);
    const [pickupSalePrice, setPickupSalePrice] = useState(0);

    // Batch selection modal state
    const [showBatchModal, setShowBatchModal] = useState(false);
    const [availableBatches, setAvailableBatches] = useState([]);
    const [selectedVariantForBatch, setSelectedVariantForBatch] = useState(null);

    // BARCODE SCANNER
    const barcodeRef = useRef(null);
    const [scanError, setScanError] = useState("");
    const [autoFocusScanner, setAutoFocusScanner] = useState(false);

    const form = useForm({
        customer_id: "",
        customer_name: "",
        phone: "",
        sale_date: new Date().toISOString().split("T")[0],
        notes: "",
        items: [],
        vat_rate: 0,
        discount_rate: 0,
        paid_amount: 0,
        grand_amount: 0,
        due_amount: 0,
        sub_amount: 0,
        type: "inventory",
        use_partial_payment: false,
        adjust_from_advance: false,
        advance_adjustment: 0,
        pickup_items: [],
        supplier_id: null,
        payment_status: "unpaid",
        account_id: 0,
        installment_duration: 0,
        total_installments: 0,
    });

    // ========== HELPER FUNCTIONS ==========
    const formatCurrency = (value) => (Number(value) || 0).toFixed(2);
    const formatWithSymbol = (value) => `৳${formatCurrency(value)}`;

    const getAccountIcon = (type) => {
        switch (type) {
            case "cash":
                return <Wallet size={14} className="text-green-600" />;
            case "bank":
                return <Landmark size={14} className="text-blue-600" />;
            case "mobile_banking":
                return <Smartphone size={14} className="text-purple-600" />;
            default:
                return <CreditCard size={14} />;
        }
    };

    // ইউনিট কনভার্সন হেল্পার ফাংশন
    const getAvailableUnitsForProduct = (product, stock) => {
        if (!product) return ["piece"];

        const unitType = product.unit_type || "piece";
        const conversions = unitConversions[unitType];

        if (!conversions) return [product.default_unit || "piece"];

        const purchaseUnit = stock?.unit || product.default_unit || "piece";
        const purchaseFactor = conversions[purchaseUnit] || 1;

        const available = [];

        for (const [unit, factor] of Object.entries(conversions)) {
            if (factor <= purchaseFactor) {
                available.push(unit);
            }
        }

        // ছোট থেকে বড় সাজাই (gram < kg < ton)
        return available.sort(
            (a, b) => (conversions[a] || 1) - (conversions[b] || 1)
        );
    };

    const getProductDetails = (productId) => {
        const product = allProducts.find((p) => p.id === productId);
        if (!product) return null;

        return {
            unit_type: product.unit_type || "piece",
            default_unit: product.default_unit || "piece",
            min_sale_unit: product.min_sale_unit || null,
            is_fraction_allowed: product.is_fraction_allowed || false,
        };
    };

    // Base unit এ convert করা
    const convertToBase = (quantity, fromUnit, unitType) => {
        const conversions = unitConversions[unitType];
        if (!conversions || !conversions[fromUnit]) return quantity;

        return quantity * conversions[fromUnit];
    };

    // Base unit থেকে নির্দিষ্ট unit এ convert করা
    const convertFromBase = (quantity, toUnit, unitType) => {
        const conversions = unitConversions[unitType];
        if (!conversions || !conversions[toUnit]) return quantity;

        const conversion = conversions[toUnit];
        return conversion !== 0 ? quantity / conversion : quantity;
    };

    // Unit থেকে unit এ convert করা
    const convertUnitQuantity = (quantity, fromUnit, toUnit, unitType) => {
        if (fromUnit === toUnit) return quantity;

        const conversions = unitConversions[unitType];
        if (!conversions || !conversions[fromUnit] || !conversions[toUnit])
            return quantity;

        const baseQuantity = quantity * conversions[fromUnit];
        return baseQuantity / conversions[toUnit];
    };

    // Auto Price Calculator - Unit change হলে price auto calculate হবে
    const calculatePriceForUnit = (basePricePerBaseUnit, targetUnit, unitType) => {
        const conversions = unitConversions[unitType];
        if (!conversions || !conversions[targetUnit]) return basePricePerBaseUnit;

        // Base unit price * target unit conversion factor
        return basePricePerBaseUnit * conversions[targetUnit];
    };

    // Calculate base price per base unit (সবচেয়ে ছোট unit)
    const calculateBasePricePerBaseUnit = (price, unit, unitType) => {
        const conversions = unitConversions[unitType];
        if (!conversions || !conversions[unit]) return price;

        // Price কে base unit price এ convert করি
        return price / conversions[unit];
    };

    // ========== CALCULATIONS ==========
    const calculateRealSubTotal = useCallback(() => {
        if (!selectedItems || selectedItems.length === 0) return 0;
        return selectedItems.reduce(
            (total, item) => total + (Number(item.total_price) || 0),
            0
        );
    }, [selectedItems]);

    const calculatePickupSubTotal = useCallback(() => {
        if (!pickupItems || pickupItems.length === 0) return 0;
        return pickupItems.reduce(
            (total, item) => total + (Number(item.total_price) || 0),
            0
        );
    }, [pickupItems]);

    const calculateTotalSubTotal = useCallback(() => {
        return calculateRealSubTotal() + calculatePickupSubTotal();
    }, [calculateRealSubTotal, calculatePickupSubTotal]);

    const calculateVatAmount = useCallback(() => {
        const subtotal = calculateTotalSubTotal();
        return (subtotal * (Number(vatRate) || 0)) / 100;
    }, [calculateTotalSubTotal, vatRate]);

    const calculateDiscountAmount = useCallback(() => {
        const subtotal = calculateTotalSubTotal();
        return (subtotal * (Number(discountRate) || 0)) / 100;
    }, [calculateTotalSubTotal, discountRate]);

    const calculateGrandTotal = useCallback(() => {
        const subtotal = calculateTotalSubTotal();
        return subtotal + calculateVatAmount() - calculateDiscountAmount();
    }, [calculateTotalSubTotal, calculateVatAmount, calculateDiscountAmount]);

    const calculateDueAmount = useCallback(() => {
        const grandTotal = calculateGrandTotal();
        const paid = Number(paidAmount) || 0;
        return Math.max(0, grandTotal - paid);
    }, [calculateGrandTotal, paidAmount]);

    // ========== PRODUCT DATA ==========
    const allProducts = useMemo(() => {
        if (!productstocks || productstocks.length === 0) return [];
        const productMap = new Map();

        productstocks.forEach((stock) => {
            if (!stock.product) return;
            const productId = stock.product.id;

            if (!productMap.has(productId)) {
                productMap.set(productId, {
                    ...stock.product,
                    totalStock: Number(stock.quantity) || 0,
                    totalBaseStock:
                        Number(stock.base_quantity) || Number(stock.quantity) || 0,
                    variantsCount: 1,
                    stocks: [stock],
                });
            } else {
                const existing = productMap.get(productId);
                existing.totalStock += Number(stock.quantity) || 0;
                existing.totalBaseStock +=
                    Number(stock.base_quantity) || Number(stock.quantity) || 0;
                existing.variantsCount += 1;
                existing.stocks.push(stock);
            }
        });

        return Array.from(productMap.values()).sort((a, b) =>
            a.name.localeCompare(b.name)
        );
    }, [productstocks]);

    // ============================
    // BARCODE INDEX (Batch -> Stock, SKU -> Stock, Code -> Product)
    // ============================
    const scanIndex = useMemo(() => {
        const batchMap = new Map();
        const skuMap = new Map();
        const productCodeMap = new Map();

        // Product code map
        allProducts.forEach((p) => {
            if (p.product_no) productCodeMap.set(String(p.product_no).trim(), p);
            if (p.code) productCodeMap.set(String(p.code).trim(), p);
        });

        const pickBetter = (existing, incoming) => {
            if (!existing) return incoming;
            const exQty = Number(existing.quantity) || 0;
            const inQty = Number(incoming.quantity) || 0;
            if (exQty <= 0 && inQty > 0) return incoming;
            return existing;
        };

        (productstocks || []).forEach((s) => {
            if (!s?.product || !s?.variant) return;

            if (s.batch_no) {
                const key = String(s.batch_no).trim();
                batchMap.set(key, pickBetter(batchMap.get(key), s));
            }

            if (s.variant?.sku) {
                const key = String(s.variant.sku).trim();
                skuMap.set(key, pickBetter(skuMap.get(key), s));
            }
        });

        return { batchMap, skuMap, productCodeMap };
    }, [productstocks, allProducts]);

    // ========== CUSTOMER HANDLING ==========
    const handleCustomerSelect = (value) => {
        setCustomerSelectValue(value);

        if (value === "new") {
            setSelectedCustomer(null);
            setCustomerNameInput("");
            setCustomerPhoneInput("");
            setAvailableAdvance(0);

            form.setData({
                ...form.data,
                customer_id: "",
                customer_name: "",
                phone: "",
            });

            setPaymentStatus("unpaid");
            setPaidAmount(0);
            setAdjustFromAdvance(false);
            setManualPaymentOverride(false);
            return;
        }

        if (!value) {
            setSelectedCustomer(null);
            setCustomerNameInput("");
            setCustomerPhoneInput("");
            setAvailableAdvance(0);

            form.setData({
                ...form.data,
                customer_id: "",
                customer_name: "",
                phone: "",
            });
            return;
        }

        const id = parseInt(value);
        const customer = customers.find((c) => c.id === id);
        setSelectedCustomer(customer || null);

        if (customer) {
            setCustomerNameInput(customer.customer_name || "");
            setCustomerPhoneInput(customer.phone || "");

            const advance = parseFloat(customer.advance_amount) || 0;
            const due = parseFloat(customer.due_amount) || 0;
            setAvailableAdvance(Math.max(0, advance - due));

            form.setData({
                ...form.data,
                customer_id: customer.id,
                customer_name: customer.customer_name,
                phone: customer.phone,
            });
        }
    };

    const handleCustomerNameChange = (value) => {
        setCustomerNameInput(value);
        form.setData("customer_name", value);

        if (value && selectedCustomer && value !== selectedCustomer.customer_name) {
            setSelectedCustomer(null);
            setCustomerSelectValue("new");
            form.setData("customer_id", "");
            setAvailableAdvance(0);
        }
    };

    const handleCustomerPhoneChange = (value) => {
        setCustomerPhoneInput(value);
        form.setData("phone", value);

        if (value && selectedCustomer && value !== selectedCustomer.phone) {
            setSelectedCustomer(null);
            setCustomerSelectValue("new");
            form.setData("customer_id", "");
            setAvailableAdvance(0);
        }
    };

    // ========== PAYMENT HANDLING ==========
    const handlePaymentStatusChange = (status) => {
        setPaymentStatus(status);
        const grandTotal = calculateGrandTotal();

        if (status === "paid") {
            setPaidAmount(grandTotal);
            setManualPaymentOverride(false);
            setAdjustFromAdvance(false);
            setTotalInstallments(0);
            setInstallmentDuration(0);
        } else if (status === "unpaid") {
            setPaidAmount(0);
            setManualPaymentOverride(false);
            setAdjustFromAdvance(false);
            setTotalInstallments(0);
            setInstallmentDuration(0);
        } else if (status === "partial") {
            setPaidAmount(grandTotal / 2);
            setManualPaymentOverride(true);
            setAdjustFromAdvance(false);
            setTotalInstallments(0);
            setInstallmentDuration(0);
        } else if (status === "installment") {
            setPaidAmount(grandTotal / 3);
            setManualPaymentOverride(true);
            setAdjustFromAdvance(false);
            setTotalInstallments(3); // Default 3 installments
            setInstallmentDuration(3); // Default 3 months
        }
    };

    const handleManualPaymentInput = (e) => {
        const value = parseFloat(e.target.value) || 0;
        const grandTotal = calculateGrandTotal();
        setPaidAmount(value);
    };

    const handleTotalInstallmentsInput = (e) => {
        const value = parseInt(e.target.value) || 0;
        setTotalInstallments(value);
        form.setData("total_installments", value);
    };

    const handleInstallmentDurationInput = (e) => {
        const value = parseInt(e.target.value) || 0;
        setInstallmentDuration(value);
        form.setData("installment_duration", value);
    };

    const enableManualPaymentOverride = () => {
        setManualPaymentOverride(true);
        setAdjustFromAdvance(false);
    };

    const disableManualPaymentOverride = () => {
        setManualPaymentOverride(false);
        const grandTotal = calculateGrandTotal();
        setPaidAmount(grandTotal);
        setPaymentStatus("paid");
    };

    const handleAccountSelect = (accountId) => {
        const id = accountId ? parseInt(accountId) : "";
        setSelectedAccount(id);
        form.setData("account_id", id);
    };

    const handlePickupProductChange = (productId) => {
        setPickupProductId(productId);

        const p = products?.find((x) => String(x.id) === String(productId));
        setPickupProductName(p?.name || "");
        setPickupProductNo(p?.product_no || "");

        // variants load
        const vars = p?.variants || [];
        setPickupVariants(vars);

        // reset selected variant
        setPickupVariantId("");
    };

    // ========== PRODUCT SELECTION FLOW ==========
    useEffect(() => {
        if (!productSearch.trim()) {
            setFilteredProducts(allProducts);
            return;
        }

        const searchTerm = productSearch.toLowerCase();
        const filtered = allProducts.filter(
            (product) =>
                product.name.toLowerCase().includes(searchTerm) ||
                product.product_no?.toLowerCase().includes(searchTerm) ||
                product.code?.toLowerCase().includes(searchTerm)
        );

        setFilteredProducts(filtered);
    }, [productSearch, allProducts]);

    const getBrandsForProduct = (productId) => {
        if (!productstocks || !productId) return [];
        const brandSet = new Set();

        productstocks
            .filter((stock) => stock.product?.id === productId && stock.quantity > 0)
            .forEach((stock) => {
                const variant = stock.variant;
                if (
                    variant &&
                    variant.attribute_values &&
                    typeof variant.attribute_values === "object"
                ) {
                    Object.keys(variant.attribute_values).forEach((key) =>
                        brandSet.add(key)
                    );
                }
            });

        return Array.from(brandSet).sort();
    };

    const getVariantsForBrand = (productId, brandName) => {
        if (!productstocks || !productId) return [];
        const variants = [];

        productstocks
            .filter((stock) => stock.product?.id === productId && stock.quantity > 0)
            .forEach((stock) => {
                const variant = stock.variant;
                if (
                    variant &&
                    variant.attribute_values &&
                    typeof variant.attribute_values === "object"
                ) {
                    if (!brandName || variant.attribute_values[brandName]) {
                        const existingVariant = variants.find((v) => v.variant?.id === variant.id);
                        if (!existingVariant) {
                            variants.push({
                                variant,
                                stocks: [stock],
                                totalQuantity: Number(stock.quantity) || 0,
                                totalBaseQuantity:
                                    Number(stock.base_quantity) || Number(stock.quantity) || 0,
                                batch_no: stock.batch_no,
                                sale_price: stock.sale_price,
                                shadow_sale_price: stock.shadow_sale_price,
                                unit: stock.unit || stock.product?.default_unit || "piece",
                                product: stock.product,
                                stockId: stock.id,
                            });
                        } else {
                            existingVariant.stocks.push(stock);
                            existingVariant.totalQuantity += Number(stock.quantity) || 0;
                            existingVariant.totalBaseQuantity +=
                                Number(stock.base_quantity) || Number(stock.quantity) || 0;
                        }
                    }
                }
            });

        return variants.sort((a, b) => b.totalQuantity - a.totalQuantity);
    };

    const handleProductSelect = (product) => {
        setSelectedProduct(product);
        setSelectedBrand(null);
        setAvailableVariants([]);

        const brands = getBrandsForProduct(product.id);
        setAvailableBrands(brands);

        if (brands.length > 0) {
            setShowBrandDropdown(true);
            setShowProductDropdown(false);
            setProductSearch(product.name);
        } else {
            const variants = getVariantsForBrand(product.id, "");
            setAvailableVariants(variants);
            setShowVariantDropdown(true);
            setShowProductDropdown(false);
        }
    };

    const handleBrandSelect = (brand) => {
        setSelectedBrand(brand);
        const variants = getVariantsForBrand(selectedProduct.id, brand);
        setAvailableVariants(variants);

        setShowBrandDropdown(false);
        setShowVariantDropdown(true);
        setProductSearch(`${selectedProduct.name} - ${brand}`);
    };

    const resetSelectionFlow = () => {
        setSelectedProduct(null);
        setSelectedBrand(null);
        setAvailableBrands([]);
        setAvailableVariants([]);
        setShowProductDropdown(false);
        setShowBrandDropdown(false);
        setShowVariantDropdown(false);
        setProductSearch("");
    };

    const goBackToProducts = () => {
        setSelectedProduct(null);
        setSelectedBrand(null);
        setAvailableBrands([]);
        setAvailableVariants([]);
        setShowBrandDropdown(false);
        setShowVariantDropdown(false);
        setShowProductDropdown(true);
        setProductSearch("");
    };

    const goBackToBrands = () => {
        setSelectedBrand(null);
        setAvailableVariants([]);
        setShowVariantDropdown(false);
        setShowBrandDropdown(true);
    };

    // ============================================
    // Helper: stockRow -> variantWithStocks (for barcode)
    // ============================================
    function buildVariantWithStocksFromStockRow(stockRow) {
        if (!stockRow?.product || !stockRow?.variant) return null;

        const relatedStocks = (productstocks || []).filter(
            (s) =>
                s.product?.id === stockRow.product.id &&
                s.variant?.id === stockRow.variant.id
        );

        const totalQuantity = relatedStocks.reduce(
            (t, s) => t + (Number(s.quantity) || 0),
            0
        );

        const totalBaseQuantity = relatedStocks.reduce(
            (t, s) => t + (Number(s.base_quantity) || Number(s.quantity) || 0),
            0
        );

        return {
            variant: stockRow.variant,
            stocks: relatedStocks.length ? relatedStocks : [stockRow],
            totalQuantity,
            totalBaseQuantity,
            batch_no: stockRow.batch_no,
            sale_price: stockRow.sale_price,
            shadow_sale_price: stockRow.shadow_sale_price,
            unit: stockRow.unit || stockRow.product?.default_unit || "piece",
            product: stockRow.product,
            stockId: stockRow.id,
        };
    }

    // ============================================
    // UPDATED: handleVariantSelect with editable price support
    // ============================================
    function handleVariantSelect(variantWithStocks) {
        const {
            variant,
            stocks,
            totalQuantity,
            totalBaseQuantity,
            sale_price,
            shadow_sale_price,
            unit,
            product,
            stockId,
        } = variantWithStocks;

        // Find ALL available stocks for this variant
        const availableStocks = stocks.filter((s) => s.quantity > 0);

        if (availableStocks.length === 0) {
            alert("No available stock for this variant");
            return;
        }

        // If multiple batches exist, show batch selection modal
        if (availableStocks.length > 1) {
            setShowBatchModal(true);
            setAvailableBatches(availableStocks);
            setSelectedVariantForBatch({
                variant,
                stocks: availableStocks,
                totalQuantity,
                totalBaseQuantity,
                sale_price,
                shadow_sale_price,
                unit,
                product,
                stockId,
            });
            return;
        }

        // Single batch - proceed directly
        const availableStock = availableStocks[0];
        proceedWithStockSelection(availableStock, variantWithStocks);
    }

    // Function to proceed with stock selection after batch is chosen
    const proceedWithStockSelection = (selectedStock, variantWithStocks) => {
        const {
            variant,
            sale_price,
            shadow_sale_price,
            unit,
            product,
        } = variantWithStocks;

        const selectedSalePrice = Number(selectedStock.sale_price) || Number(sale_price) || 0;
        const selectedShadowSalePrice =
            Number(selectedStock.shadow_sale_price) ||
            Number(shadow_sale_price) || 0;

        // Get product details
        const pDetails = getProductDetails(product.id);
        setProductDetails((prev) => ({
            ...prev,
            [product.id]: pDetails,
        }));

        // Get available units for this specific stock
        const availableUnitsForStock = getAvailableUnitsForProduct(
            product,
            selectedStock
        );

        // Determine default sale unit
        let defaultUnit = pDetails?.min_sale_unit || product.default_unit || "piece";
        if (!availableUnitsForStock.includes(defaultUnit)) {
            defaultUnit = availableUnitsForStock[0] || "piece";
        }

        // Calculate base price per base unit
        let basePricePerBaseUnit = selectedSalePrice;
        if (pDetails?.unit_type && pDetails.unit_type !== "piece") {
            basePricePerBaseUnit = calculateBasePricePerBaseUnit(
                selectedSalePrice,
                unit,
                pDetails.unit_type
            );
        }

        // Calculate price in sale unit using base price
        let unitPriceInSaleUnit = selectedSalePrice;
        if (unit !== defaultUnit && pDetails?.unit_type) {
            unitPriceInSaleUnit = calculatePriceForUnit(
                basePricePerBaseUnit,
                defaultUnit,
                pDetails.unit_type
            );
        }

        // Create unique key with batch number
        const itemKey = `${product.id}-${variant.id}-${selectedStock.batch_no || "default"}`;
        const existingItem = selectedItems.find((item) => item.uniqueKey === itemKey);

        if (existingItem) {
            // Update existing item
            const newQuantity = (existingItem.unit_quantity || 1) + 1;
            const newTotalPrice = newQuantity * existingItem.unit_price;

            setSelectedItems(
                selectedItems.map((item) =>
                    item.uniqueKey === itemKey
                        ? {
                            ...item,
                            unit_quantity: newQuantity,
                            quantity: newQuantity,
                            total_price: newTotalPrice,
                        }
                        : item
                )
            );
            setUnitQuantities((prev) => ({ ...prev, [itemKey]: newQuantity }));
        } else {
            // Add new item with editable price support
            const newItem = {
                uniqueKey: itemKey,
                product_id: product.id,
                variant_id: variant.id,
                batch_no: selectedStock.batch_no,
                product_name: product.name,
                product_no: product.product_no,
                variant_attribute:
                    selectedBrand ||
                    Object.keys(variant.attribute_values || {})[0] ||
                    "Default",
                product_code: product.product_no || "",
                variant_value: selectedBrand
                    ? variant.attribute_values?.[selectedBrand] || "Default"
                    : Object.values(variant.attribute_values || {})[0] || "Default",
                quantity: 1,
                unit_quantity: 1,
                unit: defaultUnit,
                sku: variant.sku || "Default SKU",
                stockQuantity: Number(selectedStock.quantity) || 0,
                stockBaseQuantity: Number(selectedStock.base_quantity) || Number(selectedStock.quantity) || 0,
                stockId: selectedStock.id,
                original_purchase_unit: unit,
                original_sale_price: selectedSalePrice,
                unit_price: unitPriceInSaleUnit,
                sell_price: unitPriceInSaleUnit,
                total_price: unitPriceInSaleUnit,
                shadow_sell_price: selectedShadowSalePrice,
                product_unit_type: pDetails?.unit_type || "piece",
                is_fraction_allowed: pDetails?.is_fraction_allowed || false,
                stockDetails: selectedStock,
                base_price_per_base_unit: basePricePerBaseUnit,
            };

            setSelectedItems([...selectedItems, newItem]);
            setSelectedUnits((prev) => ({ ...prev, [itemKey]: defaultUnit }));
            setUnitQuantities((prev) => ({ ...prev, [itemKey]: 1 }));
            setAvailableUnits((prev) => ({
                ...prev,
                [itemKey]: availableUnitsForStock,
            }));
            setStockDetails((prev) => ({ ...prev, [itemKey]: selectedStock }));
            setBasePrices((prev) => ({
                ...prev,
                [itemKey]: basePricePerBaseUnit,
            }));
            // Initialize price manually edited flag as false
            setPriceManuallyEdited((prev) => ({ ...prev, [itemKey]: false }));
        }

        resetSelectionFlow();
    };

    // Batch selection handler
    const handleBatchSelect = (selectedStock) => {
        if (!selectedVariantForBatch || !selectedStock) return;

        proceedWithStockSelection(selectedStock, selectedVariantForBatch);

        // Close batch modal and reset
        setShowBatchModal(false);
        setAvailableBatches([]);
        setSelectedVariantForBatch(null);
    };

    // ============================================
    // UPDATED: Handle unit change with price preservation
    // ============================================
    const handleUnitChange = (itemKey, newUnit) => {
        const itemIndex = selectedItems.findIndex(
            (item) => item.uniqueKey === itemKey
        );
        if (itemIndex === -1) return;

        const item = selectedItems[itemIndex];
        const oldUnit = item.unit;

        if (oldUnit === newUnit) return;

        const availableUnitsList = availableUnits[itemKey] || [item.unit];
        if (!availableUnitsList.includes(newUnit)) {
            alert(`Cannot sell in ${newUnit.toUpperCase()} unit for this product`);
            return;
        }

        // Convert quantity to new unit
        let newQuantity = item.unit_quantity;

        if (item.product_unit_type && item.product_unit_type !== "piece") {
            newQuantity = convertUnitQuantity(
                item.unit_quantity,
                oldUnit,
                newUnit,
                item.product_unit_type
            );

            // Validate stock in new unit
            const requestedBaseQty = convertToBase(
                newQuantity,
                newUnit,
                item.product_unit_type
            );
            const availableBaseQty =
                item.stockDetails?.base_quantity || item.stockBaseQuantity;

            if (requestedBaseQty > availableBaseQty) {
                const availableInUnit = convertFromBase(
                    availableBaseQty,
                    newUnit,
                    item.product_unit_type
                );
                alert(
                    `Cannot change unit. Exceeds available stock! Available: ${availableInUnit.toFixed(
                        3
                    )} ${newUnit.toUpperCase()}`
                );
                return;
            }
        }

        // Calculate new price based on whether it was manually edited
        let newPrice = item.unit_price;
        
        // Only auto-calculate if price wasn't manually edited
        if (!priceManuallyEdited[itemKey]) {
            if (item.product_unit_type && item.product_unit_type !== "piece") {
                // Auto-calculate based on base price
                newPrice = calculatePriceForUnit(
                    item.base_price_per_base_unit,
                    newUnit,
                    item.product_unit_type
                );
            }
        }
        // Otherwise keep the manually set price

        // Update item
        const updatedItems = [...selectedItems];
        updatedItems[itemIndex] = {
            ...item,
            unit: newUnit,
            unit_quantity: newQuantity,
            quantity: newQuantity,
            unit_price: newPrice,
            sell_price: newPrice,
            total_price: newQuantity * newPrice,
        };

        setSelectedItems(updatedItems);
        setSelectedUnits((prev) => ({ ...prev, [itemKey]: newUnit }));
        setUnitQuantities((prev) => ({ ...prev, [itemKey]: newQuantity }));
    };

    // ============================================
    // UPDATED: Update item with editable price support
    // ============================================
    const updateItem = (index, field, value) => {
        const updated = [...selectedItems];
        const item = updated[index];
        const itemKey = item.uniqueKey;

        if (field === "unit_quantity" || field === "quantity") {
            const numValue = parseFloat(value) || 0;

            // Validate if fractions are allowed
            if (!item.is_fraction_allowed && numValue % 1 !== 0) {
                alert("Fractions are not allowed for this product");
                return;
            }

            // Validate against available stock
            if (item.product_unit_type && item.product_unit_type !== "piece") {
                const requestedBaseQty = convertToBase(
                    numValue,
                    item.unit || "piece",
                    item.product_unit_type
                );
                const availableBaseQty =
                    item.stockDetails?.base_quantity || item.stockBaseQuantity;

                if (requestedBaseQty > availableBaseQty) {
                    const availableInUnit = convertFromBase(
                        availableBaseQty,
                        item.unit,
                        item.product_unit_type
                    );
                    alert(
                        `Exceeds available stock! Available: ${availableInUnit.toFixed(3)} ${item.unit.toUpperCase()}`
                    );
                    return;
                }
            } else if (numValue > item.stockQuantity) {
                alert(`Exceeds available stock! Available: ${item.stockQuantity}`);
                return;
            }

            updated[index][field] = numValue;
            updated[index].quantity = numValue;
            setUnitQuantities((prev) => ({ ...prev, [itemKey]: numValue }));

            // Recalculate total price with the current unit price
            updated[index].total_price = numValue * updated[index].unit_price;
        } 
        // ✅ ALLOW EDITING UNIT PRICE
        else if (field === "unit_price" || field === "sell_price") {
            const numValue = parseFloat(value) || 0;
            
            if (numValue < 0) {
                alert("Unit price cannot be negative");
                return;
            }
            
            updated[index].unit_price = numValue;
            updated[index].sell_price = numValue;
            
            // Recalculate total price with new unit price
            updated[index].total_price = updated[index].quantity * numValue;
            
            // Mark as manually edited
            setPriceManuallyEdited((prev) => ({ ...prev, [itemKey]: true }));
            
            // Update base price per base unit for future unit changes
            if (item.product_unit_type && item.product_unit_type !== "piece") {
                const newBasePricePerBaseUnit = calculateBasePricePerBaseUnit(
                    numValue,
                    item.unit,
                    item.product_unit_type
                );
                updated[index].base_price_per_base_unit = newBasePricePerBaseUnit;
                setBasePrices((prev) => ({ ...prev, [itemKey]: newBasePricePerBaseUnit }));
            }
        }

        setSelectedItems(updated);
    };

    // ============================================
    // NEW: Reset price to auto-calculated value
    // ============================================
    const resetToAutoPrice = (itemKey) => {
        const itemIndex = selectedItems.findIndex(
            (item) => item.uniqueKey === itemKey
        );
        if (itemIndex === -1) return;

        const item = selectedItems[itemIndex];
        
        if (!item.product_unit_type || item.product_unit_type === "piece") {
            // For piece items, reset to original sale price
            const newPrice = item.original_sale_price;
            updateItem(itemIndex, "unit_price", newPrice);
        } else {
            // For unit items, calculate based on base price
            const autoPrice = calculatePriceForUnit(
                item.base_price_per_base_unit,
                item.unit,
                item.product_unit_type
            );
            updateItem(itemIndex, "unit_price", autoPrice);
        }
        
        // Mark as not manually edited
        setPriceManuallyEdited((prev) => ({ ...prev, [itemKey]: false }));
    };

    const removeItem = (index) => {
        const updated = [...selectedItems];
        const itemKey = updated[index].uniqueKey;

        // Clean up unit states
        const newSelectedUnits = { ...selectedUnits };
        const newUnitQuantities = { ...unitQuantities };
        const newAvailableUnits = { ...availableUnits };
        const newStockDetails = { ...stockDetails };
        const newBasePrices = { ...basePrices };
        const newPriceManuallyEdited = { ...priceManuallyEdited };

        delete newSelectedUnits[itemKey];
        delete newUnitQuantities[itemKey];
        delete newAvailableUnits[itemKey];
        delete newStockDetails[itemKey];
        delete newBasePrices[itemKey];
        delete newPriceManuallyEdited[itemKey];

        setSelectedUnits(newSelectedUnits);
        setUnitQuantities(newUnitQuantities);
        setAvailableUnits(newAvailableUnits);
        setStockDetails(newStockDetails);
        setBasePrices(newBasePrices);
        setPriceManuallyEdited(newPriceManuallyEdited);

        updated.splice(index, 1);
        setSelectedItems(updated);
    };

    // ============================================
    // BARCODE SCAN HANDLERS (Batch No first)
    // ============================================
    const handleBarcodeScan = useCallback(
        (raw) => {
            const code = String(raw || "").trim();
            if (!code) return;

            setScanError("");

            // 1) Batch No
            const batchStock = scanIndex.batchMap.get(code);
            if (batchStock) {
                const vws = buildVariantWithStocksFromStockRow(batchStock);
                if (vws) {
                    handleVariantSelect(vws);
                    return;
                }
            }

            // 2) SKU
            const skuStock = scanIndex.skuMap.get(code);
            if (skuStock) {
                const vws = buildVariantWithStocksFromStockRow(skuStock);
                if (vws) {
                    handleVariantSelect(vws);
                    return;
                }
            }

            // 3) Product Code -> open selection flow
            const product = scanIndex.productCodeMap.get(code);
            if (product) {
                setProductSearch(product.name);
                setShowProductDropdown(false);
                handleProductSelect(product);
                return;
            }

            setScanError(`No match found for: ${code}`);
        },
        [scanIndex, handleProductSelect, buildVariantWithStocksFromStockRow]
    );

    // FIXED: Barcode scanner - do NOT block typing in inputs
    const SCAN_TIMEOUT = 100;
    const barcodeRefNew = useRef("");
    const lastScanTimeRef = useRef(0);

    useEffect(() => {
        const handleKeydown = (e) => {
            // If user is typing in an input/textarea/select or contenteditable, NEVER interfere
            const target = e.target;
            const tag = target?.tagName;

            const isTypingField =
                tag === "INPUT" ||
                tag === "TEXTAREA" ||
                tag === "SELECT" ||
                target?.isContentEditable;

            if (isTypingField) return;

            // ignore modifier shortcuts (Ctrl/Alt/Meta)
            if (e.ctrlKey || e.altKey || e.metaKey) return;

            const now = Date.now();

            // Enter means "barcode finished"
            if (e.key === "Enter") {
                if (barcodeRefNew.current.length > 0) {
                    e.preventDefault(); // only prevent default when we actually handle a scan
                    handleBarcodeScan(barcodeRefNew.current);
                    barcodeRefNew.current = "";
                }
                return;
            }

            // only collect normal printable characters
            if (e.key.length === 1) {
                // reset scan if too slow (normal typing)
                if (now - lastScanTimeRef.current > SCAN_TIMEOUT) {
                    barcodeRefNew.current = e.key;
                } else {
                    barcodeRefNew.current += e.key;
                }

                lastScanTimeRef.current = now;
            }
        };

        window.addEventListener("keydown", handleKeydown, { passive: false });
        return () => window.removeEventListener("keydown", handleKeydown);
    }, [handleBarcodeScan]);

    // Auto-focus scanner input
    useEffect(() => {
        if (!autoFocusScanner) return;
        const t = setTimeout(() => barcodeRef.current?.focus(), 200);
        return () => clearTimeout(t);
    }, [autoFocusScanner]);

    // ========== PICKUP SALE FUNCTIONS ==========
    const addPickupItem = () => {
        if (!pickupProductId || !pickupSupplierId) {
            alert("Please select product and supplier");
            return;
        }

        if (!pickupVariantId) {
            alert("Please select variant");
            return;
        }

        if (pickupQuantity <= 0 || pickupUnitPrice <= 0 || pickupSalePrice <= 0) {
            alert("Please fill all required fields for pickup item");
            return;
        }

        const variantObj = pickupVariants?.find(v => String(v.id) === String(pickupVariantId));

        const newItem = {
            id: Date.now(),
            product_name: pickupProductName,
            product_no: pickupProductNo,
            pickup_product_id: pickupProductId,
            pickup_supplier_id: pickupSupplierId,
            variant_id: pickupVariantId,
            variant_name: variantObj?.sku || `Variant#${pickupVariantId}`,
            brand: pickupBrand,
            variant: pickupVariant,
            quantity: Number(pickupQuantity),
            unit_price: Number(pickupUnitPrice),
            sale_price: Number(pickupSalePrice),
            total_price: Number(pickupQuantity) * Number(pickupSalePrice),
        };

        setPickupItems([...pickupItems, newItem]);

        // Reset form
        setPickupSupplierId("");
        setPickupProductId("");
        setPickupVariants([]);
        setPickupVariantId("");
        setPickupBrand("");
        setPickupVariant("");
        setPickupQuantity(1);
        setPickupUnitPrice(0);
        setPickupSalePrice(0);
        setShowPickupModal(false);
    };

    const removePickupItem = (index) => {
        const updated = [...pickupItems];
        updated.splice(index, 1);
        setPickupItems(updated);
    };

    const handleSupplierSelect = (supplier) => {
        setSelectedSupplier(supplier);
        form.setData("supplier_id", supplier.id);
        setShowSupplierModal(false);
    };

    const createNewSupplier = async () => {
        if (!newSupplierName || !newSupplierPhone) {
            alert("Supplier name and phone are required");
            return;
        }

        try {
            const response = await fetch(route("supplier.store"), {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-CSRF-TOKEN": document
                        .querySelector('meta[name="csrf-token"]')
                        .getAttribute("content"),
                    Accept: "application/json",
                },
                body: JSON.stringify({
                    name: newSupplierName,
                    company: newSupplierCompany,
                    phone: newSupplierPhone,
                    is_active: true,
                    _token: document
                        .querySelector('meta[name="csrf-token"]')
                        .getAttribute("content"),
                }),
            });

            const data = await response.json();

            if (response.ok) {
                setSelectedSupplier(data.supplier || data.data);
                form.setData("supplier_id", data.supplier?.id || data.data?.id);
                setShowSupplierModal(false);

                setNewSupplierName("");
                setNewSupplierCompany("");
                setNewSupplierPhone("");

                window.location.reload();
            } else {
                alert(data.message || "Error creating supplier");
            }
        } catch (error) {
            console.error("Error creating supplier:", error);
            alert("Network error creating supplier");
        }
    };

    // ========== FORM SYNC ==========
    useEffect(() => {
        const realSubTotal = calculateRealSubTotal();
        const pickupSubTotal = calculatePickupSubTotal();
        const totalSubTotal = calculateTotalSubTotal();
        const grandTotal = calculateGrandTotal();
        const dueAmount = calculateDueAmount();

        let advanceAdjustment = 0;
        if (adjustFromAdvance && availableAdvance > 0) {
            const maxAdjustable = Math.min(availableAdvance, grandTotal);
            const paidWithAdvance = Math.min(parseFloat(paidAmount) || 0, maxAdjustable);
            advanceAdjustment = Math.min(paidWithAdvance, maxAdjustable);
        }

        const formattedItems = selectedItems.map((item) => ({
            product_id: item.product_id,
            variant_id: item.variant_id,
            stock_id: item.stockId,
            batch_no: item.batch_no,
            quantity: item.quantity,
            unit_quantity: item.unit_quantity || item.quantity,
            unit: item.unit || "piece",
            unit_price: item.unit_price,
            total_price: item.total_price,
            shadow_sell_price: item.shadow_sell_price,
        }));

        const formattedPickupItems = pickupItems.map((item) => ({
            pickup_product_id: item.pickup_product_id,
            pickup_supplier_id: item.pickup_supplier_id,
            variant_id: item.variant_id,
            quantity: item.quantity,
            unit_price: item.unit_price,
            sale_price: item.sale_price,
            total_price: item.total_price,
        }));

        form.setData({
            ...form.data,
            items: formattedItems,
            pickup_items: formattedPickupItems,
            vat_rate: Number(vatRate) || 0,
            discount_rate: Number(discountRate) || 0,
            paid_amount: Number(paidAmount) || 0,
            shadow_paid_amount: Number(shadowPaidAmount) || 0,
            grand_amount: grandTotal,
            due_amount: dueAmount,
            sub_amount: totalSubTotal,
            type: "inventory",
            use_partial_payment: usePartialPayment,
            adjust_from_advance: adjustFromAdvance,
            advance_adjustment: advanceAdjustment,
            supplier_id: selectedSupplier ? selectedSupplier.id : null,
            payment_status: paymentStatus,
            account_id: selectedAccount,
            customer_name: customerNameInput,
            phone: customerPhoneInput,
            installment_duration: installmentDuration,
            total_installments: totalInstallments,
        });
    }, [
        selectedItems,
        pickupItems,
        vatRate,
        discountRate,
        paidAmount,
        shadowPaidAmount,
        usePartialPayment,
        adjustFromAdvance,
        availableAdvance,
        selectedSupplier,
        selectedAccount,
        paymentStatus,
        customerNameInput,
        customerPhoneInput,
        installmentDuration,
        totalInstallments,
        calculateRealSubTotal,
        calculatePickupSubTotal,
        calculateTotalSubTotal,
        calculateGrandTotal,
        calculateDueAmount,
    ]);

    // ========== SUBMIT ==========
    const submit = (e) => {
        e.preventDefault();

        if (selectedItems.length === 0 && pickupItems.length === 0) {
            alert("Please add at least one product to the sale");
            return;
        }

        const invalidItems = selectedItems.filter(
            (item) =>
                !item.unit_quantity ||
                item.unit_quantity <= 0 ||
                !item.unit_price ||
                item.unit_price <= 0
        );
        if (invalidItems.length > 0) {
            alert("Please ensure all items have valid quantity and unit price");
            return;
        }

        // Validate stock in base units
        const outOfStockItems = selectedItems.filter((item) => {
            if (item.product_unit_type && item.product_unit_type !== "piece") {
                const requestedBaseQty = convertToBase(
                    item.unit_quantity || 1,
                    item.unit || "piece",
                    item.product_unit_type
                );
                const availableBaseQty =
                    item.stockDetails?.base_quantity || item.stockBaseQuantity;
                return requestedBaseQty > availableBaseQty;
            } else {
                return item.unit_quantity > item.stockQuantity;
            }
        });

        if (outOfStockItems.length > 0) {
            const itemNames = outOfStockItems
                .map(
                    (item) =>
                        `${item.product_name} (Requested: ${item.unit_quantity} ${item.unit.toUpperCase()})`
                )
                .join(", ");
            alert(`Some items exceed available stock: ${itemNames}`);
            return;
        }

        // Validate payment
        if (paymentStatus === "installment") {
            if (!totalInstallments || totalInstallments <= 0) {
                alert("Please enter total installments for installment payment");
                return;
            }
            if (!installmentDuration || installmentDuration <= 0) {
                alert("Please enter installment duration");
                return;
            }
        }

        if (paidAmount > 0 && !selectedAccount) {
            alert("Please select a payment account");
            return;
        }

        form.post(route("sales.store"), {
            onError: (errors) => {
                console.error(errors);
                alert(errors.error || "Failed to create sale. Please check the form data.");
            },
        });
    };

    const realSubTotal = calculateRealSubTotal();
    const pickupSubTotal = calculatePickupSubTotal();
    const totalSubTotal = calculateTotalSubTotal();
    const grandTotal = calculateGrandTotal();
    const dueAmount = calculateDueAmount();
    const vatAmount = calculateVatAmount();
    const discountAmount = calculateDiscountAmount();

    const selectedAccountObj = selectedAccount
        ? accounts?.find((acc) => String(acc.id) === String(selectedAccount))
        : null;

    return (
        <div className="bg-white rounded-box p-5">
            <PageHeader title="Create New Sale" subtitle="Add products to sale (Inventory System)">
                <button
                    onClick={() => router.visit(route("sales.index"))}
                    className="btn btn-sm btn-ghost"
                >
                    <ArrowLeft size={15} /> Back to List
                </button>
            </PageHeader>

            <form onSubmit={submit}>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                    {/* LEFT COLUMN */}
                    <div className="lg:col-span-1 space-y-4">
                        {/* CUSTOMER SELECT */}
                        <div className="form-control">
                            <label className="label">
                                <span className="label-text">Select Customer *</span>
                            </label>
                            <select
                                className="select select-bordered"
                                value={customerSelectValue}
                                onChange={(e) => handleCustomerSelect(e.target.value)}
                            >
                                <option value="">Walking Customer</option>
                                <option value="new">+ New Customer</option>
                                {customers.map((c) => (
                                    <option key={c.id} value={String(c.id)}>
                                        {c.customer_name} ({c.phone})
                                    </option>
                                ))}
                            </select>
                        </div>

                        {selectedCustomer && (
                            <div className="border border-gray-200 rounded-box p-4 bg-gray-50">
                                <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                                    <User size={16} /> Customer Information
                                </h3>

                                <div className="space-y-2">
                                    <div className="flex items-center gap-2 text-sm">
                                        <User size={12} className="text-gray-500" />
                                        <span className="font-medium">{selectedCustomer.customer_name}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm">
                                        <Phone size={12} className="text-gray-500" />
                                        <span>{selectedCustomer.phone}</span>
                                    </div>

                                    {availableAdvance > 0 && (
                                        <div className="flex items-center gap-2 text-sm">
                                            <span className="font-medium">Available Advance:</span>
                                            <span className="ml-1 font-bold text-green-600">
                                                ৳{formatCurrency(availableAdvance)}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                <div className="mt-4 pt-3 border-t border-gray-200">
                                    <h4 className="font-medium text-gray-700 mb-2">Payment Options</h4>

                                    <div className="space-y-2">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={usePartialPayment}
                                                onChange={(e) => setUsePartialPayment(e.target.checked)}
                                                className="checkbox checkbox-sm checkbox-primary"
                                            />
                                            <span className="text-sm">Allow Partial Payment</span>
                                        </label>

                                        {availableAdvance > 0 && (
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={adjustFromAdvance}
                                                    onChange={(e) => setAdjustFromAdvance(e.target.checked)}
                                                    className="checkbox checkbox-sm checkbox-primary"
                                                />
                                                <span className="text-sm">Adjust from Customer Advance</span>
                                            </label>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {customerSelectValue == "new" && (
                            <>
                                {/* Name */}
                                <div className="form-control">
                                    <label className="label">
                                        <span className="label-text">Customer Name *</span>
                                    </label>
                                    <input
                                        type="text"
                                        className="input input-bordered"
                                        value={customerNameInput}
                                        onChange={(e) => handleCustomerNameChange(e.target.value)}
                                        onFocus={(e) => e.target.select()}
                                    />
                                </div>

                                {/* Phone */}
                                <div className="form-control">
                                    <label className="label">
                                        <span className="label-text">Customer Phone *</span>
                                    </label>
                                    <input
                                        type="text"
                                        className="input input-bordered"
                                        value={customerPhoneInput}
                                        onChange={(e) => handleCustomerPhoneChange(e.target.value)}
                                        onFocus={(e) => e.target.select()}
                                    />
                                </div>
                            </>
                        )}

                        {/* PAYMENT CARD */}
                        <div className="card card-compact bg-[#F8FAF5] text-[#333] border border-gray-200 rounded-xl shadow-sm">
                            <div className="card-body p-4">

                                {/* Header */}
                                <div className="flex justify-between items-center mb-3">
                                    <h3 className="text-xs font-black uppercase text[#1E4D2B] flex items-center gap-2">
                                        <CreditCard size={14} /> Payment
                                    </h3>
                                </div>


                                {/* Account Selection */}
                                <div className="form-control mb-3">
                                    <label className="label py-0">
                                        <span className="label-text text-[10px] text-gray-500 uppercase font-bold tracking-widest">
                                            Payment Account {paidAmount > 0 && "*"}
                                        </span>
                                    </label>

                                    <select
                                        className="select select-bordered select-sm w-full bg-white border-gray-300 text-gray-800"
                                        value={selectedAccount}
                                        onChange={(e) => handleAccountSelect(e.target.value)}
                                        required={paidAmount > 0}
                                        disabled={paidAmount <= 0}
                                    >
                                        <option value="">Select Account</option>
                                        {accounts?.map((account) => (
                                            <option key={account.id} value={account.id}>
                                                {account.name} — ৳{formatCurrency(account.current_balance)}
                                            </option>
                                        ))}
                                    </select>

                                    {paidAmount > 0 && !selectedAccount && (
                                        <div className="text-red-500 text-xs mt-1">
                                            Please select a payment account
                                        </div>
                                    )}

                                    {/* Selected Account Info */}
                                    {selectedAccountObj && (
                                        <div className="mt-2 p-2 bg-gray-50 rounded-lg border border-gray-200">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    {getAccountIcon(selectedAccountObj.type)}
                                                    <span className="text-xs font-bold">
                                                        {selectedAccountObj.name}
                                                    </span>
                                                    <span className="text-xs text-gray-500 capitalize">
                                                        ({selectedAccountObj.type})
                                                    </span>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-[10px] text-gray-400">Balance</div>
                                                    <div className="text-xs font-mono font-bold">
                                                        ৳{formatCurrency(selectedAccountObj.current_balance)}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">

                                    {/* Payment Status */}
                                    <div className="md:col-span-1">
                                        <div className="form-control">
                                            <label className="label py-0">
                                                <span className="label-text text-[10px] text-gray-500 uppercase font-bold tracking-widest">
                                                    Status
                                                </span>
                                            </label>

                                            <select
                                                className="select select-bordered select-sm w-full bg-white border-gray-300 text-gray-800"
                                                value={paymentStatus}
                                                onChange={(e) => handlePaymentStatusChange(e.target.value)}
                                            >
                                                <option value="unpaid">Unpaid</option>
                                                <option value="partial">Partial</option>
                                                <option value="paid">Paid</option>
                                                <option value="installment">Installment</option>
                                            </select>
                                        </div>
                                    </div>

                                    {/* Paid Amount */}
                                    <div className="md:col-span-1">
                                        <div className="form-control">
                                            <label className="label py-0">
                                                <span className="label-text text-[10px] text-gray-500 uppercase font-bold tracking-widest">
                                                    Paid Amount
                                                </span>
                                            </label>

                                            <input
                                                type="number"
                                                
                                                className="input input-bordered input-sm w-full bg-white border-gray-300 font-mono"
                                                value={paidAmount}
                                                onChange={handleManualPaymentInput}
                                                disabled={!manualPaymentOverride && adjustFromAdvance}
                                                onFocus={(e) => e.target.select()}
                                            />
                                        </div>
                                    </div>

                                </div>

                                {/* Installment Fields - Only show when status is installment */}
                                {paymentStatus === 'installment' && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                                        {/* Total Installments */}
                                        <div className="md:col-span-1">
                                            <div className="form-control">
                                                <label className="label py-0">
                                                    <span className="label-text text-[10px] text-gray-500 uppercase font-bold tracking-widest">
                                                        Total Installments *
                                                    </span>
                                                </label>

                                                <input
                                                    type="number"
                                                    min="1"
                                                    className="input input-bordered input-sm w-full bg-white border-gray-300 font-mono"
                                                    value={totalInstallments}
                                                    onChange={handleTotalInstallmentsInput}
                                                    onFocus={(e) => e.target.select()}
                                                />
                                            </div>
                                        </div>

                                        {/* Installment Duration */}
                                        <div className="md:col-span-1">
                                            <div className="form-control">
                                                <label className="label py-0">
                                                    <span className="label-text text-[10px] text-gray-500 uppercase font-bold tracking-widest">
                                                        Duration (Months) *
                                                    </span>
                                                </label>

                                                <input
                                                    type="number"
                                                    min="1"
                                                    className="input input-bordered input-sm w-full bg-white border-gray-300 font-mono"
                                                    value={installmentDuration}
                                                    onChange={handleInstallmentDurationInput}
                                                    onFocus={(e) => e.target.select()}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Totals */}
                                <div className="space-y-1 text-xs pt-2 border-t border-gray-200 font-bold uppercase">
                                    <div className="flex justify-between">
                                        <span>Gross</span>
                                        <span>৳{formatCurrency(grandTotal)}</span>
                                    </div>
                                    <div className="flex justify-between text[#1E4D2B] font-black">
                                        <span>Due</span>
                                        <span>৳{formatCurrency(dueAmount)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Sale date */}
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
                                onFocus={(e) => e.target.select()}
                            />
                        </div>

                        {/* notes */}
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
                                onFocus={(e) => e.target.select()}
                            />
                        </div>
                    </div>

                    {/* RIGHT COLUMN */}
                    <div className="lg:col-span-2">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-gray-700">Add Products to Sale</h3>
                            <div className="text-sm text-gray-500">
                                Stock Items: {selectedItems.length} | Pickup Items: {pickupItems.length}
                            </div>
                        </div>

                        {/* Stock products */}
                        <div className="mb-6">
                            <div className="flex justify-between items-center mb-2">
                                <h4 className="font-bold text-gray-700 flex items-center gap-2">
                                    <Warehouse size={16} /> Stock Products
                                </h4>
                                <button
                                    type="button"
                                    className="btn btn-xs btn-outline"
                                    onClick={() => {
                                        setProductSearch("");
                                        setShowProductDropdown(!showProductDropdown);
                                    }}
                                >
                                    <Search size={12} className="mr-1" /> Search Stock
                                </button>
                            </div>

                            <div className="form-control mb-4 relative">
                                <div className="relative">
                                    <input
                                        ref={barcodeRef}
                                        type="text"
                                        className="input input-bordered w-full pr-10"
                                        value={productSearch}
                                        onChange={(e) => {
                                            setProductSearch(e.target.value);
                                            setShowProductDropdown(true);
                                        }}
                                        onClick={() => setShowProductDropdown(true)}
                                        placeholder="Search products by name or SKU..."
                                        onFocus={(e) => e.target.select()}
                                    />
                                    <Search size={18} className="absolute right-3 top-3.5 text-gray-400" />

                                    {productSearch && (
                                        <button
                                            type="button"
                                            onClick={resetSelectionFlow}
                                            className="absolute right-10 top-3 text-gray-400 hover:text-error"
                                        >
                                            <X size={16} />
                                        </button>
                                    )}
                                </div>

                                {/* Product dropdown */}
                                {showProductDropdown && filteredProducts.length > 0 && (
                                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-box shadow-lg max-h-60 overflow-y-auto">
                                        <div className="bg-gray-100 p-2 sticky top-0 z-10">
                                            <div className="flex justify-between items-center">
                                                <h3 className="text-sm font-semibold text-gray-700">
                                                    Select Product ({filteredProducts.length})
                                                </h3>
                                                <button
                                                    type="button"
                                                    onClick={() => setShowProductDropdown(false)}
                                                    className="btn btn-ghost btn-xs"
                                                >
                                                    <X size={12} />
                                                </button>
                                            </div>
                                        </div>

                                        {filteredProducts.map((product) => (
                                            <div
                                                key={product.id}
                                                className="p-3 hover:bg-gray-100 cursor-pointer border-b last:border-b-0"
                                                onMouseDown={(e) => e.preventDefault()}
                                                onClick={() => handleProductSelect(product)}
                                            >
                                                <div className="flex justify-between items-center">
                                                    <div className="flex-1">
                                                        <div className="font-medium">{product.name}</div>
                                                        <div className="text-xs text-gray-500 mt-1">
                                                            Code: {product.product_no || "N/A"} • Stock: {product.totalStock}{" "}
                                                            {product.default_unit?.toUpperCase() || "PIECE"} • Variants:{" "}
                                                            {product.variantsCount}
                                                            {product.unit_type && product.unit_type !== "piece" && (
                                                                <span className="ml-2 text-blue-600">
                                                                    • Purchase Unit: {product.default_unit?.toUpperCase() || "PIECE"}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <ChevronRight size={16} className="text-gray-400" />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Brand dropdown */}
                                {showBrandDropdown && availableBrands.length > 0 && (
                                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-box shadow-lg max-h-60 overflow-y-auto">
                                        <div className="bg-gray-100 p-2 sticky top-0 z-10">
                                            <div className="flex items-center gap-2">
                                                <button
                                                    type="button"
                                                    onClick={goBackToProducts}
                                                    className="btn btn-ghost btn-xs"
                                                >
                                                    <ArrowLeft size={12} />
                                                </button>
                                                <h3 className="text-sm font-semibold text-gray-700 flex-1">
                                                    Select Brand for {selectedProduct?.name}
                                                </h3>
                                                <button
                                                    type="button"
                                                    onClick={() => setShowBrandDropdown(false)}
                                                    className="btn btn-ghost btn-xs"
                                                >
                                                    <X size={12} />
                                                </button>
                                            </div>
                                        </div>

                                        {availableBrands.map((brand, index) => (
                                            <div
                                                key={index}
                                                className="p-3 hover:bg-gray-100 cursor-pointer border-b last:border-b-0"
                                                onMouseDown={(e) => e.preventDefault()}
                                                onClick={() => handleBrandSelect(brand)}
                                            >
                                                <div className="flex justify-between items-center">
                                                    <div className="flex-1">
                                                        <div className="font-medium">{brand}</div>
                                                        <div className="text-xs text-gray-500">Click to view variants</div>
                                                    </div>
                                                    <ChevronRight size={16} className="text-gray-400" />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Variant dropdown */}
                                {showVariantDropdown && availableVariants.length > 0 && (
                                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-box shadow-lg max-h-60 overflow-y-auto">
                                        <div className="bg-gray-100 p-2 sticky top-0 z-10">
                                            <div className="flex items-center gap-2">
                                                <button
                                                    type="button"
                                                    onClick={selectedBrand ? goBackToBrands : goBackToProducts}
                                                    className="btn btn-ghost btn-xs"
                                                >
                                                    <ArrowLeft size={12} />
                                                </button>
                                                <h3 className="text-sm font-semibold text-gray-700 flex-1">
                                                    {selectedBrand
                                                        ? `Select ${selectedBrand} Variant`
                                                        : `Select Variant for ${selectedProduct?.name}`}
                                                </h3>
                                                <button
                                                    type="button"
                                                    onClick={() => setShowVariantDropdown(false)}
                                                    className="btn btn-ghost btn-xs"
                                                >
                                                    <X size={12} />
                                                </button>
                                            </div>
                                        </div>

                                        {availableVariants.map((variantWithStocks) => {
                                            const {
                                                variant,
                                                stocks,
                                                totalQuantity,
                                                totalBaseQuantity,
                                                sale_price,
                                                shadow_sale_price,
                                                unit,
                                                product,
                                            } = variantWithStocks;

                                            const displayName = selectedBrand
                                                ? variant.attribute_values?.[selectedBrand] || "Default"
                                                : Object.values(variant.attribute_values || {})[0] || "Default";

                                            // Get available batches
                                            const availableStocks = stocks.filter((s) => s.quantity > 0);
                                            const batchCount = availableStocks.length;

                                            return (
                                                <div
                                                    key={variant.id}
                                                    className="p-3 hover:bg-gray-100 cursor-pointer border-b last:border-b-0"
                                                    onMouseDown={(e) => e.preventDefault()}
                                                    onClick={() => handleVariantSelect(variantWithStocks)}
                                                >
                                                    <div className="flex justify-between items-center">
                                                        <div className="flex-1">
                                                            <div className="font-medium">{displayName}</div>
                                                            <div className="text-xs text-gray-500 mt-1">
                                                                <div>Purchase Unit: {unit?.toUpperCase()}</div>
                                                                <div>
                                                                    Total Available: {totalQuantity} {unit?.toUpperCase()} (
                                                                    {totalBaseQuantity.toFixed(3)} base units)
                                                                </div>
                                                                <div className="flex items-center gap-1">
                                                                    <Warehouse size={10} />
                                                                    Batches: {batchCount}
                                                                    {batchCount > 1 && (
                                                                        <span className="text-blue-600 ml-1">
                                                                            (Click to select batch)
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                {/* Show batch details if only one batch */}
                                                                {batchCount === 1 && availableStocks[0].batch_no && (
                                                                    <div className="mt-1">
                                                                        <span className="text-blue-600">Batch: {availableStocks[0].batch_no}</span>
                                                                    </div>
                                                                )}
                                                                <div>
                                                                    Price: {formatWithSymbol(Number(sale_price) || 0)} per{" "}
                                                                    {unit?.toUpperCase()}
                                                                </div>
                                                                {Number(shadow_sale_price) > 0 && (
                                                                    <div>Shadow Price: {formatWithSymbol(Number(shadow_sale_price))}</div>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <Plus size={16} className="text-primary" />
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* Stock Items List */}
                            {selectedItems.length > 0 ? (
                                <div className="space-y-3">
                                    <h3 className="font-semibold">Stock Items ({selectedItems.length})</h3>

                                    {selectedItems.map((item, index) => {
                                        const itemKey = item.uniqueKey || index;
                                        const availableUnitsList = availableUnits[item.uniqueKey] || [item.unit || "piece"];
                                        const selectedUnit = selectedUnits[item.uniqueKey] || item.unit || "piece";
                                        const unitQuantity = unitQuantities[item.uniqueKey] || item.unit_quantity || 1;
                                        const isManuallyEdited = priceManuallyEdited[item.uniqueKey] || false;

                                        return (
                                            <div key={itemKey} className="border border-gray-300 rounded-box p-4">
                                                <div className="flex justify-between items-start mb-3">
                                                    <div className="flex-1">
                                                        <h4 className="font-medium">
                                                            {item.product_name} ({item.product_code})
                                                        </h4>
                                                        <p className="text-sm text-gray-600">
                                                            <strong>Variant:</strong> {item.variant_attribute}: {item.variant_value}
                                                        </p>
                                                        <p className="text-sm text-gray-600">
                                                            <strong>Batch No:</strong> {item?.batch_no} • <strong>SKU:</strong>{" "}
                                                            {item?.sku}
                                                        </p>
                                                        <p className="text-sm text-gray-600">
                                                            <strong>Purchase Unit:</strong>{" "}
                                                            {item.original_purchase_unit?.toUpperCase()} • <strong>Available in this batch:</strong>{" "}
                                                            {item.stockQuantity} {item.original_purchase_unit?.toUpperCase()}
                                                            {item.product_unit_type && item.product_unit_type !== "piece" && (
                                                                <span>
                                                                    {" "}
                                                                    ({item.stockBaseQuantity.toFixed(3)} base units)
                                                                </span>
                                                            )}
                                                        </p>
                                                        {/* Show warehouse info if available */}
                                                        {item.stockDetails?.warehouse && (
                                                            <p className="text-sm text-gray-600">
                                                                <strong>Warehouse:</strong> {item.stockDetails.warehouse.name}
                                                            </p>
                                                        )}
                                                    </div>

                                                    <button
                                                        type="button"
                                                        onClick={() => removeItem(index)}
                                                        className="btn btn-xs btn-error"
                                                    >
                                                        <Trash2 size={12} />
                                                    </button>
                                                </div>

                                                {/* Unit settings section */}
                                                <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <Ruler size={14} className="text-blue-600" />
                                                        <span className="text-sm font-bold text-gray-700">Sale Unit Settings</span>
                                                        <div className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                                            <Calculator size={10} className="inline mr-1" />
                                                            {isManuallyEdited ? "Manual Price" : "Auto Price"}
                                                        </div>
                                                    </div>

                                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                                                        {/* ইউনিট সিলেক্ট */}
                                                        <div className="form-control">
                                                            <label className="label">
                                                                <span className="label-text">
                                                                    Sale Unit *
                                                                </span>
                                                            </label>
                                                            <select
                                                                className="select select-bordered select-sm"
                                                                value={selectedUnit}
                                                                onChange={(e) =>
                                                                    handleUnitChange(
                                                                        item.uniqueKey,
                                                                        e.target.value
                                                                    )
                                                                }
                                                            >
                                                                {availableUnitsList.map(
                                                                    (unit) => (
                                                                        <option
                                                                            key={unit}
                                                                            value={unit}
                                                                        >
                                                                            {unit.toUpperCase()}
                                                                        </option>
                                                                    )
                                                                )}
                                                            </select>
                                                            <div className="text-xs text-gray-500 mt-1">
                                                                Purchase Unit:{" "}
                                                                {item.original_purchase_unit?.toUpperCase()}
                                                            </div>
                                                        </div>

                                                        {/* Quantity Input */}
                                                        <div className="form-control">
                                                            <label className="label">
                                                                <span className="label-text">
                                                                    Quantity *
                                                                </span>
                                                            </label>
                                                            <input
                                                                type="number"
                                                                className="input input-bordered input-sm"
                                                                value={unitQuantity}
                                                                onChange={(e) =>
                                                                    updateItem(
                                                                        index,
                                                                        "unit_quantity",
                                                                        e.target.value
                                                                    )
                                                                }
                                                                required
                                                                onFocus={(e) => e.target.select()}
                                                            />
                                                            <div className="text-xs text-gray-500 mt-1">
                                                                In {selectedUnit.toUpperCase()}
                                                            </div>
                                                        </div>

                                                        {/* Unit Price - NOW EDITABLE */}
                                                        <div className="form-control">
                                                            <label className="label">
                                                                <span className="label-text">
                                                                    Unit Price(৳) *
                                                                </span>
                                                            </label>
                                                            <div className="relative">
                                                                <input
                                                                    type="number"
                                                                    // 
                                                                    className="input input-bordered input-sm w-full pr-10"
                                                                    value={item.unit_price}
                                                                    onChange={(e) => updateItem(index, "unit_price", e.target.value)}
                                                                    onFocus={(e) => e.target.select()}
                                                                />
                                                                <div className="absolute right-3 top-2.5 text-gray-500">
                                                                    <Calculator size={14} />
                                                                </div>
                                                            </div>
                                                            <div className="text-xs text-gray-500 mt-1">
                                                                Per {selectedUnit.toUpperCase()}
                                                                <span className="text-blue-600 ml-1">
                                                                    {isManuallyEdited ? "(manual)" : "(auto)"}
                                                                </span>
                                                            </div>
                                                            
                                                            {/* Reset to auto price button - only show if manually edited */}
                                                            {isManuallyEdited && item.product_unit_type && item.product_unit_type !== "piece" && (
                                                                <button
                                                                    type="button"
                                                                    className="btn btn-xs btn-ghost text-blue-600 mt-1 flex items-center gap-1"
                                                                    onClick={() => resetToAutoPrice(item.uniqueKey)}
                                                                >
                                                                    <RotateCcw size={10} />
                                                                    Reset to Auto Price
                                                                </button>
                                                            )}
                                                            
                                                            {item.product_unit_type &&
                                                                item.product_unit_type !== "piece" && (
                                                                    <div className="text-xs text-blue-600 mt-1">
                                                                        Base: ৳
                                                                        {formatCurrency(
                                                                            item.base_price_per_base_unit ||
                                                                            item.unit_price
                                                                        )} per base unit
                                                                    </div>
                                                                )}
                                                        </div>

                                                        {/* Total Price */}
                                                        <div className="form-control">
                                                            <label className="label">
                                                                <span className="label-text">
                                                                    Total Price
                                                                    (৳)
                                                                </span>
                                                            </label>
                                                            <input
                                                                type="number"
                                                                className="input input-bordered input-sm bg-gray-100"
                                                                value={formatCurrency(
                                                                    item.total_price
                                                                )}
                                                                readOnly
                                                                onFocus={(e) => e.target.select()}
                                                            />
                                                        </div>
                                                    </div>

                                                    {/* ইউনিট কনভার্সন ইনফো */}
                                                    {item.product_unit_type &&
                                                        item.product_unit_type !== "piece" && (
                                                            <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded">
                                                                <div className="text-xs text-blue-800">
                                                                    <div className="font-bold mb-1 flex items-center gap-1">
                                                                        <Calculator size={10} />
                                                                        Unit Conversion & Price Calculation:
                                                                    </div>
                                                                    <div className="grid grid-cols-2 gap-2">
                                                                        <div>
                                                                            <span className="font-medium">
                                                                                Purchase Unit:
                                                                            </span>{" "}
                                                                            {item.original_purchase_unit?.toUpperCase()}
                                                                        </div>
                                                                        <div>
                                                                            <span className="font-medium">
                                                                                Sale Unit:
                                                                            </span>{" "}
                                                                            {selectedUnit.toUpperCase()}
                                                                        </div>
                                                                        <div>
                                                                            <span className="font-medium">
                                                                                Base Unit Price:
                                                                            </span>{" "}
                                                                            ৳
                                                                            {formatCurrency(
                                                                                item.base_price_per_base_unit ||
                                                                                item.unit_price
                                                                            )}
                                                                        </div>
                                                                        <div>
                                                                            <span className="font-medium">
                                                                                Current Price:
                                                                            </span>{" "}
                                                                            ৳
                                                                            {formatCurrency(
                                                                                item.unit_price
                                                                            )}
                                                                            /
                                                                            {selectedUnit.toUpperCase()}
                                                                            {isManuallyEdited && (
                                                                                <span className="ml-1 text-orange-600">(manual)</span>
                                                                            )}
                                                                        </div>
                                                                        <div>
                                                                            <span className="font-medium">
                                                                                Quantity:
                                                                            </span>{" "}
                                                                            {unitQuantity} {selectedUnit.toUpperCase()}
                                                                        </div>
                                                                        <div>
                                                                            <span className="font-medium">
                                                                                In Base Units:
                                                                            </span>{" "}
                                                                            {convertToBase(
                                                                                unitQuantity,
                                                                                selectedUnit,
                                                                                item.product_unit_type
                                                                            ).toFixed(3)}
                                                                        </div>
                                                                        <div className="col-span-2">
                                                                            <span className="font-medium">
                                                                                Available Stock:
                                                                            </span>{" "}
                                                                            {convertFromBase(
                                                                                item.stockBaseQuantity,
                                                                                selectedUnit,
                                                                                item.product_unit_type
                                                                            ).toFixed(3)} {selectedUnit.toUpperCase()}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-box">
                                    <p className="text-gray-500">
                                        No stock items added yet
                                    </p>
                                    <p className="text-sm text-gray-400 mt-1">
                                        Search and add stock products above
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Pickup section */}
                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <h4 className="font-bold text-gray-700 flex items-center gap-2">
                                    <ShoppingBag size={16} /> Pickup Products
                                </h4>
                                <button type="button" onClick={() => setShowPickupModal(true)} className="btn btn-sm btn-outline">
                                    <Plus size={14} className="mr-1" /> Add Pickup Item
                                </button>
                            </div>

                            {pickupItems.length > 0 ? (
                                <div className="space-y-3">
                                    {pickupItems.map((item, index) => (
                                        <div key={item.id} className="card bg-gray-50 border border-gray-200 rounded-lg">
                                            <div className="card-body p-3">
                                                <div className="flex justify-between items-start">
                                                    <div className="flex-1">
                                                        <h4 className="font-bold text-gray-900">{item.product_name} ({item.product_no})</h4>
                                                        <div className="text-sm text-gray-600 mt-1">
                                                            <div className="text-xs mb-2">
                                                                <strong>Variant:</strong> {item.variant_name}
                                                            </div>
                                                            <div className="grid grid-cols-4 gap-2 mt-2">
                                                                <div>
                                                                    <span className="text-xs text-gray-500">Qty:</span>
                                                                    <div className="font-bold">{item.quantity}</div>
                                                                </div>
                                                                <div>
                                                                    <span className="text-xs text-gray-500">Cost:</span>
                                                                    <div className="font-bold">{formatWithSymbol(item.unit_price)}</div>
                                                                </div>
                                                                <div>
                                                                    <span className="text-xs text-gray-500">Sale:</span>
                                                                    <div className="font-bold">{formatWithSymbol(item.sale_price)}</div>
                                                                </div>
                                                                <div>
                                                                    <span className="text-xs text-gray-500">Total:</span>
                                                                    <div className="font-bold text-red-600">{formatWithSymbol(item.total_price)}</div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <button type="button" onClick={() => removePickupItem(index)} className="btn btn-xs btn-ghost text-red-600">
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="border border-dashed border-gray-200 rounded-box py-8 text-center">
                                    <ShoppingBag size={32} className="mx-auto text-gray-300 mb-2" />
                                    <p className="text-gray-500">No pickup items added</p>
                                    <p className="text-sm text-gray-400 mt-1">Click "Add Pickup Item" to add products not in stock</p>
                                </div>
                            )}
                        </div>

                        {/* Summary */}
                        {(selectedItems.length > 0 ||
                            pickupItems.length > 0) && (
                                <div className="border-t pt-4 mt-4 space-y-3">
                                    <div className="flex justify-between items-center">
                                        <span>Stock Items Total:</span>
                                        <span>
                                            {formatWithSymbol(realSubTotal)}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span>Pickup Items Total:</span>
                                        <span>
                                            {formatWithSymbol(pickupSubTotal)}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span>Sub Total:</span>
                                        <span>
                                            {formatWithSymbol(totalSubTotal)}
                                        </span>
                                    </div>

                                    <div className="flex justify-between items-center">
                                        <div className="flex items-center gap-2">
                                            <span>Vat / Tax:</span>
                                            <input
                                                type="number"
                                                min="0"
                                                max="100"
                                                
                                                className="input input-bordered input-sm w-20"
                                                value={vatRate}
                                                onChange={(e) =>
                                                    setVatRate(
                                                        parseFloat(
                                                            e.target.value
                                                        ) || 0
                                                    )
                                                }
                                                onFocus={(e) => e.target.select()}
                                            />
                                            <span>%</span>
                                        </div>
                                        <span>{formatWithSymbol(vatAmount)}</span>
                                    </div>

                                    <div className="flex justify-between items-center">
                                        <div className="flex items-center gap-2">
                                            <span>Discount:</span>
                                            <input
                                                type="number"
                                                min="0"
                                                max="100"
                                                
                                                className="input input-bordered input-sm w-20"
                                                value={discountRate}
                                                onChange={(e) =>
                                                    setDiscountRate(
                                                        parseFloat(
                                                            e.target.value
                                                        ) || 0
                                                    )
                                                }
                                                onFocus={(e) => e.target.select()}
                                            />
                                            <span>%</span>
                                        </div>
                                        <span>
                                            {formatWithSymbol(discountAmount)}
                                        </span>
                                    </div>

                                    <div className="flex justify-between items-center text-lg font-bold border-t pt-2">
                                        <span>Grand Total:</span>
                                        <span>{formatWithSymbol(grandTotal)}</span>
                                    </div>

                                    <div className="flex justify-between items-center text-lg font-bold border-t pt-2">
                                        <span>Due Amount:</span>
                                        <span
                                            className={
                                                dueAmount > 0
                                                    ? "text-error"
                                                    : "text-success"
                                            }
                                        >
                                            {formatWithSymbol(dueAmount)}
                                        </span>
                                    </div>
                                </div>
                            )}
                    </div>
                </div>

                <div className="flex gap-3 mt-6">
                    <button
                        type="submit"
                        className="btn bg-[#1e4d2b] text-white"
                        disabled={form.processing}
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

            {/* Pickup Modal */}
            {showPickupModal && (
                <div className="modal modal-open">
                    <div className="modal-box max-w-2xl">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold">Add Pickup Item</h3>
                            <button onClick={() => setShowPickupModal(false)} className="btn btn-sm btn-circle btn-ghost">
                                ✕
                            </button>
                        </div>

                        <div className="space-y-4">

                            <div className="form-control">
                                <label className="label">
                                    <span className="label-text">Pickup Product *</span>
                                </label>

                                <select
                                    value={pickupProductId}
                                    onChange={(e) => handlePickupProductChange(e.target.value)}
                                    className="select select-bordered"
                                    required
                                >
                                    <option value="">Select Product</option>
                                    {products.map((product) => (
                                        <option key={product.id} value={product.id}>
                                            {product.name} ({product?.product_no}) [ {product?.unit_type} unit ]
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-control">
                                <label className="label">
                                    <span className="label-text">Pickup Variant *</span>
                                </label>

                                <select
                                    value={pickupVariantId}
                                    onChange={(e) => setPickupVariantId(e.target.value)}
                                    className="select select-bordered"
                                    required
                                    disabled={!pickupProductId || pickupVariants.length === 0}
                                >
                                    <option value="">
                                        {pickupProductId ? "Select Variant" : "Select Product First"}
                                    </option>

                                    {pickupVariants?.map((v) => (
                                        <option key={v.id} value={v.id}>
                                            {v.sku || `Variant#${v.id}`}
                                        </option>
                                    ))}
                                </select>

                                {pickupProductId && pickupVariants.length === 0 && (
                                    <p className="text-xs text-red-500 mt-1">
                                        This product has no variants. Please create at least one variant.
                                    </p>
                                )}
                            </div>



                            <div className="form-control">
                                <label className="label">
                                    <span className="label-text">Pickup Supplier *</span>
                                </label>

                                <select
                                    value={pickupSupplierId}
                                    onChange={(e) => setPickupSupplierId(e.target.value)}
                                    className="select select-bordered"
                                    required
                                >
                                    <option value="" >
                                        Select Supplier
                                    </option>

                                    {suppliers.map((supplier) => (
                                        <option key={supplier.id} value={supplier.id}>
                                            {supplier.name}
                                        </option>
                                    ))}
                                </select>
                            </div>



                            <div className="grid grid-cols-3 gap-4">
                                <div className="form-control">
                                    <label className="label">
                                        <span className="label-text">Quantity *</span>
                                    </label>
                                    <input
                                        type="number"
                                        className="input input-bordered"
                                        value={pickupQuantity}
                                        onChange={(e) => setPickupQuantity(e.target.value)}
                                        min="1"
                                        required
                                    />
                                </div>

                                <div className="form-control">
                                    <label className="label">
                                        <span className="label-text">Cost Price *</span>
                                    </label>
                                    <input
                                        type="number"
                                        className="input input-bordered"
                                        value={pickupUnitPrice}
                                        onChange={(e) => setPickupUnitPrice(e.target.value)}
                                        min="0"
                                        
                                        required
                                    />
                                </div>

                                <div className="form-control">
                                    <label className="label">
                                        <span className="label-text">Sale Price *</span>
                                    </label>
                                    <input
                                        type="number"
                                        className="input input-bordered"
                                        value={pickupSalePrice}
                                        onChange={(e) => setPickupSalePrice(e.target.value)}
                                        min="0"
                                        
                                        required
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="modal-action">
                            <button onClick={() => setShowPickupModal(false)} className="btn btn-ghost">
                                Cancel
                            </button>
                            <button onClick={addPickupItem} className="btn bg-[#1e4d2b] text-white">
                                Add Item
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Supplier Modal */}
            {showSupplierModal && (
                <div className="modal modal-open">
                    <div className="modal-box max-w-lg">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold">
                                Add New Supplier
                            </h3>
                            <button
                                onClick={() => setShowSupplierModal(false)}
                                className="btn btn-sm btn-circle btn-ghost"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div className="form-control">
                                <label className="label">
                                    <span className="label-text">
                                        Supplier Name *
                                    </span>
                                </label>
                                <input
                                    type="text"
                                    className="input input-bordered"
                                    value={newSupplierName}
                                    onChange={(e) =>
                                        setNewSupplierName(e.target.value)
                                    }
                                    placeholder="Enter supplier name"
                                    onFocus={(e) => e.target.select()}
                                />
                            </div>

                            <div className="form-control">
                                <label className="label">
                                    <span className="label-text">Company</span>
                                </label>
                                <input
                                    type="text"
                                    className="input input-bordered"
                                    value={newSupplierCompany}
                                    onChange={(e) =>
                                        setNewSupplierCompany(e.target.value)
                                    }
                                    placeholder="Enter company name"
                                    onFocus={(e) => e.target.select()}
                                />
                            </div>

                            <div className="form-control">
                                <label className="label">
                                    <span className="label-text">Phone *</span>
                                </label>
                                <input
                                    type="text"
                                    className="input input-bordered"
                                    value={newSupplierPhone}
                                    onChange={(e) =>
                                        setNewSupplierPhone(e.target.value)
                                    }
                                    placeholder="Enter phone number"
                                    onFocus={(e) => e.target.select()}
                                />
                            </div>
                        </div>

                        <div className="modal-action">
                            <button
                                onClick={() => setShowSupplierModal(false)}
                                className="btn btn-ghost"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={createNewSupplier}
                                className="btn bg-[#1e4d2b] text-white"
                            >
                                Create Supplier
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Batch Selection Modal */}
            {showBatchModal && selectedVariantForBatch && (
                <div className="modal modal-open">
                    <div className="modal-box max-w-2xl">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold">
                                Select Batch for {selectedVariantForBatch.product?.name} - {
                                    Object.values(selectedVariantForBatch.variant?.attribute_values || {})[0] || "Default"
                                }
                            </h3>
                            <button
                                onClick={() => {
                                    setShowBatchModal(false);
                                    setAvailableBatches([]);
                                    setSelectedVariantForBatch(null);
                                }}
                                className="btn btn-sm btn-circle btn-ghost"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div className="bg-gray-50 p-4 rounded-lg">
                                <h4 className="font-semibold mb-2">Available Batches</h4>
                                <p className="text-sm text-gray-600 mb-3">
                                    Select a batch to add to sale. Different batches may have different prices.
                                </p>
                            </div>

                            <div className="overflow-y-auto max-h-96">
                                {availableBatches.map((stock, index) => (
                                    <div
                                        key={stock.id || index}
                                        className="p-4 border border-gray-200 rounded-lg mb-3 hover:bg-gray-50 cursor-pointer"
                                        onClick={() => handleBatchSelect(stock)}
                                    >
                                        <div className="flex justify-between items-start">
                                            <div className="flex-1">
                                                <div className="font-medium flex items-center gap-2">
                                                    <Warehouse size={14} className="text-blue-600" />
                                                    Batch: {stock.batch_no || "No Batch No"}
                                                </div>
                                                <div className="text-sm text-gray-600 mt-2 grid grid-cols-2 gap-2">
                                                    <div>
                                                        <span className="font-medium">Available:</span> {stock.quantity} {stock.unit?.toUpperCase()}
                                                        {stock.base_quantity && (
                                                            <span className="ml-1 text-gray-500">
                                                                ({Number(stock.base_quantity).toFixed(3)} base units)
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div>
                                                        <span className="font-medium">Purchase Price:</span> {formatWithSymbol(stock.purchase_price || 0)}
                                                    </div>
                                                    <div>
                                                        <span className="font-medium">Sale Price:</span> {formatWithSymbol(stock.sale_price || 0)}
                                                    </div>
                                                    {stock.shadow_sale_price > 0 && (
                                                        <div>
                                                            <span className="font-medium">Shadow Price:</span> {formatWithSymbol(stock.shadow_sale_price || 0)}
                                                        </div>
                                                    )}
                                                    <div>
                                                        <span className="font-medium">Warehouse:</span> {stock.warehouse?.name || "Main"}
                                                    </div>
                                                    {stock.expiry_date && (
                                                        <div>
                                                            <span className="font-medium">Expiry:</span> {stock.expiry_date}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="ml-4">
                                                <button
                                                    type="button"
                                                    className="btn btn-sm btn-primary"
                                                    onClick={() => handleBatchSelect(stock)}
                                                >
                                                    Select
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {availableBatches.length === 0 && (
                                <div className="text-center py-8">
                                    <AlertCircle size={32} className="mx-auto text-gray-400 mb-2" />
                                    <p className="text-gray-500">No available batches found</p>
                                </div>
                            )}
                        </div>

                        <div className="modal-action">
                            <button
                                onClick={() => {
                                    setShowBatchModal(false);
                                    setAvailableBatches([]);
                                    setSelectedVariantForBatch(null);
                                }}
                                className="btn btn-ghost"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}