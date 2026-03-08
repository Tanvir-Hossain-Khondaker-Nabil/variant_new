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
    Package,
    Layers,
    Info,
    Grid,
    List,
    Box,
    Tag,
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
    const [discountType, setDiscountType] = useState("percentage");
    const [flatDiscount, setFlatDiscount] = useState(null);
    const [percentageDiscount, setPercentageDiscount] = useState(null);
    const [paidAmount, setPaidAmount] = useState(null);
    const [shadowPaidAmount, setShadowPaidAmount] = useState(null);
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

    // State for product selection flow
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [productVariants, setProductVariants] = useState([]);
    const [showVariantModal, setShowVariantModal] = useState(false);
    const [showBatchModal, setShowBatchModal] = useState(false);
    const [selectedVariant, setSelectedVariant] = useState(null);
    const [availableBatches, setAvailableBatches] = useState([]);
    const [selectedBatch, setSelectedBatch] = useState(null);
    const [selectedUnits, setSelectedUnits] = useState({});
    const [unitQuantities, setUnitQuantities] = useState({});
    const [availableUnits, setAvailableUnits] = useState({});
    const [productDetails, setProductDetails] = useState({});
    const [stockDetails, setStockDetails] = useState({});
    const [basePrices, setBasePrices] = useState({});
    const [priceManuallyEdited, setPriceManuallyEdited] = useState({});

    // Installment payment state
    const [installmentDuration, setInstallmentDuration] = useState(0);
    const [totalInstallments, setTotalInstallments] = useState(0);

    // Pickup state
    const [pickupProductId, setPickupProductId] = useState("");
    const [pickupVariantId, setPickupVariantId] = useState("");
    const [pickupSupplierId, setPickupSupplierId] = useState("");
    const [pickupVariants, setPickupVariants] = useState([]);
    const [pickupQuantity, setPickupQuantity] = useState(1);
    const [pickupUnitPrice, setPickupUnitPrice] = useState(0);
    const [pickupSalePrice, setPickupSalePrice] = useState(0);

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
        discount_type: "percentage",
        flat_discount: 0,
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

    // Unit conversion helper functions
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

    const convertToBase = (quantity, fromUnit, unitType) => {
        const conversions = unitConversions[unitType];
        if (!conversions || !conversions[fromUnit]) return quantity;
        return quantity * conversions[fromUnit];
    };

    const convertFromBase = (quantity, toUnit, unitType) => {
        const conversions = unitConversions[unitType];
        if (!conversions || !conversions[toUnit]) return quantity;
        const conversion = conversions[toUnit];
        return conversion !== 0 ? quantity / conversion : quantity;
    };

    const convertUnitQuantity = (quantity, fromUnit, toUnit, unitType) => {
        if (fromUnit === toUnit) return quantity;
        const conversions = unitConversions[unitType];
        if (!conversions || !conversions[fromUnit] || !conversions[toUnit])
            return quantity;
        const baseQuantity = quantity * conversions[fromUnit];
        return baseQuantity / conversions[toUnit];
    };

    const calculatePriceForUnit = (basePricePerBaseUnit, targetUnit, unitType) => {
        const conversions = unitConversions[unitType];
        if (!conversions || !conversions[targetUnit]) return basePricePerBaseUnit;
        return basePricePerBaseUnit * conversions[targetUnit];
    };

    const calculateBasePricePerBaseUnit = (price, unit, unitType) => {
        const conversions = unitConversions[unitType];
        if (!conversions || !conversions[unit]) return price;
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

        if (discountType === "flat_discount") {
            return Number(flatDiscount) || 0;
        } else {
            return (subtotal * (Number(percentageDiscount) || 0)) / 100;
        }
    }, [calculateTotalSubTotal, discountType, flatDiscount, percentageDiscount]);

    const calculateGrandTotal = useCallback(() => {
        const subtotal = calculateTotalSubTotal();
        return subtotal + calculateVatAmount() - calculateDiscountAmount();
    }, [calculateTotalSubTotal, calculateVatAmount, calculateDiscountAmount]);

    const calculateDueAmount = useCallback(() => {
        const grandTotal = calculateGrandTotal();
        const paid = Number(paidAmount) || 0;
        return Math.max(0, grandTotal - paid);
    }, [calculateGrandTotal, paidAmount]);

    // ========== PRODUCT DATA ORGANIZATION ==========
    const allProducts = useMemo(() => {
        if (!productstocks || productstocks.length === 0) return [];

        const productMap = new Map();

        productstocks.forEach((stock) => {
            if (!stock.product) return;
            const productId = stock.product.id;

            if (!productMap.has(productId)) {
                productMap.set(productId, {
                    ...stock.product,
                    stocks: [],
                    variants: new Map(),
                });
            }

            const product = productMap.get(productId);
            product.stocks.push(stock);

            if (stock.variant) {
                const variantId = stock.variant.id;
                if (!product.variants.has(variantId)) {
                    product.variants.set(variantId, {
                        variant: stock.variant,
                        stocks: [],
                        totalQuantity: 0,
                        batches: new Map(),
                    });
                }

                const variant = product.variants.get(variantId);
                variant.stocks.push(stock);
                variant.totalQuantity += Number(stock.quantity) || 0;

                const batchKey = stock.batch_no || 'default';
                if (!variant.batches.has(batchKey)) {
                    variant.batches.set(batchKey, {
                        batch_no: stock.batch_no,
                        stocks: [],
                        totalQuantity: 0,
                        sale_price: stock.sale_price || 0,
                        purchase_price: stock.purchase_price || 0,
                    });
                }

                const batch = variant.batches.get(batchKey);
                batch.stocks.push(stock);
                batch.totalQuantity += Number(stock.quantity) || 0;
            }
        });

        return Array.from(productMap.values()).sort((a, b) => a.name.localeCompare(b.name));
    }, [productstocks]);

    // ========== SEARCH FUNCTION - UPDATED ==========
    useEffect(() => {
        if (!productSearch.trim()) {
            // When search is empty, show all products
            setFilteredProducts(allProducts);
            return;
        }

        const searchTerm = productSearch.toLowerCase();
        const filtered = allProducts.filter((product) => {
            return product.name.toLowerCase().includes(searchTerm) ||
                (product.product_no && product.product_no.toLowerCase().includes(searchTerm));
        });

        setFilteredProducts(filtered);
        setShowProductDropdown(true);
    }, [productSearch, allProducts]);

    // Add this effect to control dropdown visibility based on focus
    useEffect(() => {
        // This effect ensures dropdown shows when there are products
        if (allProducts.length > 0 && showProductDropdown) {
            setFilteredProducts(allProducts);
        }
    }, [showProductDropdown, allProducts]);

    // ========== PRODUCT SELECTION - SHOW ALL VARIANTS ==========
    const handleProductSelect = (product) => {
        setSelectedProduct(product);
        setProductSearch(product.name);
        setShowProductDropdown(false); // Close dropdown after selection

        // Process variants
        const variantsList = [];
        product.variants.forEach((variantData, variantId) => {
            const variant = variantData.variant;
            const attributes = variant.attribute_values || {};

            const attributePairs = Object.entries(attributes).map(([key, value]) => ({
                key,
                value
            }));

            // Group batches for this variant
            const batches = [];
            variantData.batches.forEach((batchData, batchNo) => {
                batches.push({
                    batch_no: batchData.batch_no,
                    totalQuantity: batchData.totalQuantity,
                    sale_price: batchData.sale_price,
                    purchase_price: batchData.purchase_price,
                    stocks: batchData.stocks,
                    unit: batchData.stocks[0]?.unit || product.default_unit || 'piece',
                });
            });

            variantsList.push({
                id: variantId,
                sku: variant.sku,
                attributes: attributePairs,
                totalStock: variantData.totalQuantity,
                batches: batches,
                unit: variantData.stocks[0]?.unit || product.default_unit || 'piece',
            });
        });

        setProductVariants(variantsList);
        setShowVariantModal(true);
    };

    // ========== VARIANT SELECTION - SHOW BATCHES ==========
    const handleVariantSelect = (variant) => {
        setSelectedVariant(variant);
        setAvailableBatches(variant.batches);
        setShowVariantModal(false);
        setShowBatchModal(true);
    };

    // ========== BATCH SELECTION - ADD TO CART ==========
    const handleBatchSelect = (batch) => {
        setSelectedBatch(batch);

        // Get the first stock from this batch
        const stock = batch.stocks[0];
        if (!stock) {
            alert("No stock available for this batch");
            return;
        }

        const product = selectedProduct;
        const variant = selectedVariant;

        // Add to cart with this specific batch
        addToCart(product, variant, batch, stock);

        setShowBatchModal(false);
    };

    // ========== ADD TO CART ==========
    const addToCart = (product, variant, batch, stock) => {
        const selectedSalePrice = Number(batch.sale_price) || Number(stock.sale_price) || 0;

        // Get product details
        const pDetails = getProductDetails(product.id);
        setProductDetails((prev) => ({
            ...prev,
            [product.id]: pDetails,
        }));

        // Get available units
        const availableUnitsForStock = getAvailableUnitsForProduct(product, stock);

        // Determine default sale unit
        let defaultUnit = pDetails?.min_sale_unit || product.default_unit || "piece";
        if (!availableUnitsForStock.includes(defaultUnit)) {
            defaultUnit = availableUnitsForStock[0] || "piece";
        }

        // Calculate base price
        let basePricePerBaseUnit = selectedSalePrice;
        if (pDetails?.unit_type && pDetails.unit_type !== "piece") {
            basePricePerBaseUnit = calculateBasePricePerBaseUnit(
                selectedSalePrice,
                stock.unit || 'piece',
                pDetails.unit_type
            );
        }

        // Calculate price in sale unit
        let unitPriceInSaleUnit = selectedSalePrice;
        if (stock.unit !== defaultUnit && pDetails?.unit_type) {
            unitPriceInSaleUnit = calculatePriceForUnit(
                basePricePerBaseUnit,
                defaultUnit,
                pDetails.unit_type
            );
        }

        // Create attribute display
        const attributeDisplay = variant.attributes
            .map(attr => `${attr.key}: ${attr.value}`)
            .join(' | ');

        // Create unique key with batch number
        const itemKey = `${product.id}-${variant.id}-${batch.batch_no || "default"}`;
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
            // Add new item
            const newItem = {
                uniqueKey: itemKey,
                product_id: product.id,
                variant_id: variant.id,
                batch_no: batch.batch_no,
                product_name: product.name,
                product_no: product.product_no,
                variant_attribute: attributeDisplay,
                product_code: product.product_no || "",
                quantity: 1,
                unit_quantity: 1,
                unit: defaultUnit,
                sku: variant.sku || "Default SKU",
                stockQuantity: Number(batch.totalQuantity) || 0,
                stockBaseQuantity: Number(stock.base_quantity) || Number(batch.totalQuantity) || 0,
                stockId: stock.id,
                original_purchase_unit: stock.unit || 'piece',
                original_sale_price: selectedSalePrice,
                unit_price: unitPriceInSaleUnit,
                sell_price: unitPriceInSaleUnit,
                total_price: unitPriceInSaleUnit,
                product_unit_type: pDetails?.unit_type || "piece",
                is_fraction_allowed: pDetails?.is_fraction_allowed || false,
                stockDetails: stock,
                base_price_per_base_unit: basePricePerBaseUnit,
            };

            setSelectedItems([...selectedItems, newItem]);
            setSelectedUnits((prev) => ({ ...prev, [itemKey]: defaultUnit }));
            setUnitQuantities((prev) => ({ ...prev, [itemKey]: 1 }));
            setAvailableUnits((prev) => ({
                ...prev,
                [itemKey]: availableUnitsForStock,
            }));
            setStockDetails((prev) => ({ ...prev, [itemKey]: stock }));
            setBasePrices((prev) => ({
                ...prev,
                [itemKey]: basePricePerBaseUnit,
            }));
            setPriceManuallyEdited((prev) => ({ ...prev, [itemKey]: false }));
        }

        // Reset selection
        setSelectedProduct(null);
        setSelectedVariant(null);
        setSelectedBatch(null);
        setProductSearch("");
    };

    // ========== BARCODE SCAN HANDLERS ==========
    const handleBarcodeScan = useCallback(
        (raw) => {
            const code = String(raw || "").trim();
            if (!code) return;

            setScanError("");
            const normalizedCode = code.toLowerCase();

            // 1) exact stock-level match first
            const matchedStock = productstocks.find((stock) => {
                const stockBarcode = String(stock.barcode || "").trim().toLowerCase();
                const stockCode = String(stock.code || "").trim().toLowerCase();
                const batchNo = String(stock.batch_no || "").trim().toLowerCase();
                const variantSku = String(stock.variant?.sku || "").trim().toLowerCase();
                const productNo = String(stock.product?.product_no || "").trim().toLowerCase();
                const productCode = String(stock.product?.code || "").trim().toLowerCase();

                return (
                    stockBarcode === normalizedCode ||
                    stockCode === normalizedCode ||
                    variantSku === normalizedCode ||
                    productNo === normalizedCode ||
                    productCode === normalizedCode ||
                    batchNo === normalizedCode
                );
            });

            if (matchedStock?.product && matchedStock?.variant) {
                const product = allProducts.find(
                    (p) => String(p.id) === String(matchedStock.product.id)
                );

                if (product) {
                    const variantData = product.variants.get(matchedStock.variant.id);

                    if (variantData) {
                        const variant = {
                            id: matchedStock.variant.id,
                            sku: matchedStock.variant.sku,
                            attributes: Object.entries(
                                matchedStock.variant.attribute_values || {}
                            ).map(([key, value]) => ({ key, value })),
                            totalStock: variantData.totalQuantity,
                            batches: Array.from(variantData.batches.values()).map((batchData) => ({
                                batch_no: batchData.batch_no,
                                totalQuantity: batchData.totalQuantity,
                                sale_price: batchData.sale_price,
                                purchase_price: batchData.purchase_price,
                                stocks: batchData.stocks,
                                unit:
                                    batchData.stocks[0]?.unit ||
                                    product.default_unit ||
                                    "piece",
                            })),
                            unit:
                                variantData.stocks[0]?.unit ||
                                product.default_unit ||
                                "piece",
                        };

                        const exactBatch =
                            variant.batches.find(
                                (b) =>
                                    String(b.batch_no || "").trim().toLowerCase() === normalizedCode
                            ) ||
                            variant.batches.find((b) =>
                                b.stocks.some(
                                    (s) =>
                                        String(s.id) === String(matchedStock.id) ||
                                        String(s.barcode || "").trim().toLowerCase() === normalizedCode
                                )
                            ) ||
                            variant.batches[0];

                        if (exactBatch) {
                            addToCart(product, variant, exactBatch, exactBatch.stocks[0]);
                            setProductSearch("");
                            barcodeRefNew.current = "";
                            return;
                        }
                    }
                }
            }

            // 2) fallback product-level match
            const product = allProducts.find((p) => {
                const productNo = String(p.product_no || "").trim().toLowerCase();
                const productCode = String(p.code || "").trim().toLowerCase();
                return productNo === normalizedCode || productCode === normalizedCode;
            });

            if (product) {
                const variantsList = Array.from(product.variants.values()).map((variantData) => ({
                    id: variantData.variant.id,
                    sku: variantData.variant.sku,
                    attributes: Object.entries(
                        variantData.variant.attribute_values || {}
                    ).map(([key, value]) => ({ key, value })),
                    totalStock: variantData.totalQuantity,
                    batches: Array.from(variantData.batches.values()).map((batchData) => ({
                        batch_no: batchData.batch_no,
                        totalQuantity: batchData.totalQuantity,
                        sale_price: batchData.sale_price,
                        purchase_price: batchData.purchase_price,
                        stocks: batchData.stocks,
                        unit:
                            batchData.stocks[0]?.unit ||
                            product.default_unit ||
                            "piece",
                    })),
                    unit:
                        variantData.stocks[0]?.unit ||
                        product.default_unit ||
                        "piece",
                }));

                // auto add if only one variant and one batch
                if (variantsList.length === 1 && variantsList[0].batches.length === 1) {
                    const onlyVariant = variantsList[0];
                    const onlyBatch = onlyVariant.batches[0];
                    addToCart(product, onlyVariant, onlyBatch, onlyBatch.stocks[0]);
                    setProductSearch("");
                    barcodeRefNew.current = "";
                    return;
                }

                // otherwise open modal
                setSelectedProduct(product);
                setProductVariants(variantsList);
                setShowVariantModal(true);
                setShowProductDropdown(false);
                setProductSearch("");
                return;
            }

            setScanError(`No product found for: ${code}`);
        },
        [allProducts, productstocks, selectedItems]
    );

    const SCAN_TIMEOUT = 100;
    const barcodeRefNew = useRef("");
    const lastScanTimeRef = useRef(0);

    useEffect(() => {
        const handleKeydown = (e) => {
            const target = e.target;
            const tag = target?.tagName;

            const isTypingField =
                tag === "INPUT" ||
                tag === "TEXTAREA" ||
                tag === "SELECT" ||
                target?.isContentEditable;

            // only allow scanner on the barcode input or outside inputs
            const isBarcodeInputFocused = target === barcodeRef.current;
            if (isTypingField && !isBarcodeInputFocused) return;

            if (e.ctrlKey || e.altKey || e.metaKey) return;

            const now = Date.now();

            if (e.key === "Enter") {
                const scannedValue = barcodeRefNew.current.trim() || productSearch.trim();

                if (scannedValue) {
                    e.preventDefault();
                    handleBarcodeScan(scannedValue);
                    barcodeRefNew.current = "";
                }
                return;
            }

            if (e.key.length === 1) {
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
    }, [handleBarcodeScan, productSearch]);

    // ========== UNIT CHANGE HANDLER ==========
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

        let newQuantity = item.unit_quantity;

        if (item.product_unit_type && item.product_unit_type !== "piece") {
            newQuantity = convertUnitQuantity(
                item.unit_quantity,
                oldUnit,
                newUnit,
                item.product_unit_type
            );

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

        let newPrice = item.unit_price;

        if (!priceManuallyEdited[itemKey]) {
            if (item.product_unit_type && item.product_unit_type !== "piece") {
                newPrice = calculatePriceForUnit(
                    item.base_price_per_base_unit,
                    newUnit,
                    item.product_unit_type
                );
            }
        }

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

    // ========== UPDATE ITEM ==========
    const updateItem = (index, field, value) => {
        const updated = [...selectedItems];
        const item = updated[index];
        const itemKey = item.uniqueKey;

        if (field === "unit_quantity" || field === "quantity") {
            const numValue = parseFloat(value) || 0;

            if (!item.is_fraction_allowed && numValue % 1 !== 0) {
                alert("Fractions are not allowed for this product");
                return;
            }

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
            updated[index].total_price = numValue * updated[index].unit_price;
        }
        else if (field === "unit_price" || field === "sell_price") {
            const numValue = parseFloat(value) || 0;

            if (numValue < 0) {
                alert("Unit price cannot be negative");
                return;
            }

            updated[index].unit_price = numValue;
            updated[index].sell_price = numValue;
            updated[index].total_price = updated[index].quantity * numValue;
            setPriceManuallyEdited((prev) => ({ ...prev, [itemKey]: true }));

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

    // ========== REMOVE ITEM ==========
    const removeItem = (index) => {
        const updated = [...selectedItems];
        const itemKey = updated[index].uniqueKey;

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
            setTotalInstallments(3);
            setInstallmentDuration(3);
        }
    };

    const handleManualPaymentInput = (e) => {
        const value = parseFloat(e.target.value) || 0;
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

    const handleAccountSelect = (accountId) => {
        const id = accountId ? parseInt(accountId) : "";
        setSelectedAccount(id);
        form.setData("account_id", id);
    };

    // ========== PICKUP FUNCTIONS ==========
    const handlePickupProductChange = (productId) => {
        setPickupProductId(productId);

        const p = products?.find((x) => String(x.id) === String(productId));
        setPickupProductName(p?.name || "");
        setPickupProductNo(p?.product_no || "");

        const vars = p?.variants || [];
        setPickupVariants(vars);
        setPickupVariantId("");
    };

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
            quantity: Number(pickupQuantity),
            unit_price: Number(pickupUnitPrice),
            sale_price: Number(pickupSalePrice),
            total_price: Number(pickupQuantity) * Number(pickupSalePrice),
        };

        setPickupItems([...pickupItems, newItem]);

        setPickupSupplierId("");
        setPickupProductId("");
        setPickupVariants([]);
        setPickupVariantId("");
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

        // Set the appropriate discount rate based on type
        let discountRateValue = 0;
        if (discountType === "percentage") {
            discountRateValue = Number(percentageDiscount) || 0;
        }

        form.setData({
            ...form.data,
            items: formattedItems,
            pickup_items: formattedPickupItems,
            vat_rate: Number(vatRate) || 0,
            discount_rate: discountRateValue,
            discount_type: discountType,
            flat_discount: discountType === "flat_discount" ? (Number(flatDiscount) || 0) : 0,
            paid_amount: Number(paidAmount) || 0,
            grand_amount: grandTotal,
            due_amount: dueAmount,
            sub_amount: totalSubTotal,
            type: "inventory",
            use_partial_payment: usePartialPayment,
            adjust_from_advance: adjustFromAdvance,
            advance_adjustment: advanceAdjustment,
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
        discountType,
        flatDiscount,
        percentageDiscount,
        paidAmount,
        usePartialPayment,
        adjustFromAdvance,
        availableAdvance,
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
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* LEFT COLUMN - Customer & Payment */}
                    <div className="lg:col-span-1 space-y-4">
                        {/* Customer Selection */}
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
                            </div>
                        )}

                        {customerSelectValue == "new" && (
                            <>
                                <div className="form-control">
                                    <label className="label">
                                        <span className="label-text">Customer Name *</span>
                                    </label>
                                    <input
                                        type="text"
                                        className="input input-bordered"
                                        value={customerNameInput}
                                        onChange={(e) => handleCustomerNameChange(e.target.value)}
                                    />
                                </div>
                                <div className="form-control">
                                    <label className="label">
                                        <span className="label-text">Customer Phone *</span>
                                    </label>
                                    <input
                                        type="text"
                                        className="input input-bordered"
                                        value={customerPhoneInput}
                                        onChange={(e) => handleCustomerPhoneChange(e.target.value)}
                                    />
                                </div>
                            </>
                        )}

                        {/* Payment Card */}
                        <div className="card card-compact bg-[#F8FAF5] border border-gray-200 rounded-xl shadow-sm">
                            <div className="card-body p-4">
                                <h3 className="text-xs font-black uppercase text-[#1E4D2B] flex items-center gap-2 mb-3">
                                    <CreditCard size={14} /> Payment
                                </h3>

                                <div className="form-control mb-3">
                                    <label className="label py-0">
                                        <span className="label-text text-[10px] text-gray-500 uppercase font-bold">
                                            Payment Account {paidAmount > 0 && "*"}
                                        </span>
                                    </label>
                                    <select
                                        className="select select-bordered select-sm w-full"
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
                                    {selectedAccountObj && (
                                        <div className="mt-2 p-2 bg-gray-50 rounded-lg border border-gray-200">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    {getAccountIcon(selectedAccountObj.type)}
                                                    <span className="text-xs font-bold">{selectedAccountObj.name}</span>
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

                                <div className="grid grid-cols-2 gap-3 mb-3">
                                    <div className="form-control">
                                        <label className="label py-0">
                                            <span className="label-text text-[10px] text-gray-500 uppercase font-bold">
                                                Status
                                            </span>
                                        </label>
                                        <select
                                            className="select select-bordered select-sm w-full"
                                            value={paymentStatus}
                                            onChange={(e) => handlePaymentStatusChange(e.target.value)}
                                        >
                                            <option value="unpaid">Unpaid</option>
                                            <option value="partial">Partial</option>
                                            <option value="paid">Paid</option>
                                            <option value="installment">Installment</option>
                                        </select>
                                    </div>
                                    <div className="form-control">
                                        <label className="label py-0">
                                            <span className="label-text text-[10px] text-gray-500 uppercase font-bold">
                                                Paid Amount
                                            </span>
                                        </label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            className="input input-bordered input-sm w-full font-mono"
                                            value={paidAmount}
                                            onChange={handleManualPaymentInput}
                                            disabled={!manualPaymentOverride && adjustFromAdvance}
                                        />
                                    </div>
                                </div>

                                {paymentStatus === 'installment' && (
                                    <div className="grid grid-cols-2 gap-3 mb-3">
                                        <div className="form-control">
                                            <label className="label py-0">
                                                <span className="label-text text-[10px] text-gray-500 uppercase font-bold">
                                                    Total Installments *
                                                </span>
                                            </label>
                                            <input
                                                type="number"
                                                min="1"
                                                className="input input-bordered input-sm w-full"
                                                value={totalInstallments}
                                                onChange={handleTotalInstallmentsInput}
                                            />
                                        </div>
                                        <div className="form-control">
                                            <label className="label py-0">
                                                <span className="label-text text-[10px] text-gray-500 uppercase font-bold">
                                                    Duration (Months) *
                                                </span>
                                            </label>
                                            <input
                                                type="number"
                                                min="1"
                                                className="input input-bordered input-sm w-full"
                                                value={installmentDuration}
                                                onChange={handleInstallmentDurationInput}
                                            />
                                        </div>
                                    </div>
                                )}

                                <div className="space-y-1 text-xs pt-2 border-t border-gray-200 font-bold">
                                    <div className="flex justify-between">
                                        <span>Gross</span>
                                        <span>৳{formatCurrency(grandTotal)}</span>
                                    </div>
                                    <div className="flex justify-between text-[#1E4D2B]">
                                        <span>Due</span>
                                        <span>৳{formatCurrency(dueAmount)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Sale Date & Notes */}
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

                    {/* RIGHT COLUMN - Products */}
                    <div className="lg:col-span-2">
                        {/* Product Search - UPDATED */}
                        <div className="mb-4">
                            <div className="form-control relative">
                                <div className="relative">
                                    <input
                                        ref={barcodeRef}
                                        type="text"
                                        className="input input-bordered w-full pr-10"
                                        value={productSearch}
                                        onChange={(e) => {
                                            setProductSearch(e.target.value);
                                        }}
                                        onFocus={() => {
                                            setShowProductDropdown(true);
                                            setFilteredProducts(allProducts);
                                        }}
                                        onBlur={() => {
                                            setTimeout(() => {
                                                setShowProductDropdown(false);
                                            }, 200);
                                        }}
                                        placeholder="Search products by name or code..."
                                        autoComplete="off"
                                    />
                                    <Search size={18} className="absolute right-3 top-3.5 text-gray-400" />
                                    {productSearch && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setProductSearch("");
                                                setFilteredProducts(allProducts); // Reset to all products when clearing
                                                setShowProductDropdown(true); // Keep dropdown open
                                            }}
                                            className="absolute right-10 top-3 text-gray-400 hover:text-error"
                                        >
                                            <X size={16} />
                                        </button>
                                    )}
                                </div>

                                {/* Product Dropdown */}
                                {showProductDropdown && filteredProducts.length > 0 && (
                                    <div className="absolute z-10 w-full mt-12 bg-white border border-gray-300 rounded-box shadow-lg max-h-96 overflow-y-auto">
                                        <div className="bg-gray-100 p-2 sticky top-0 flex justify-between items-center">
                                            <h3 className="text-sm font-semibold text-gray-700">
                                                Products ({filteredProducts.length})
                                            </h3>
                                            <button
                                                type="button"
                                                onClick={() => setShowProductDropdown(false)}
                                                className="btn btn-ghost btn-xs"
                                            >
                                                <X size={12} />
                                            </button>
                                        </div>

                                        {filteredProducts.map((product) => (
                                            <div
                                                key={product.id}
                                                className="p-3 hover:bg-gray-100 cursor-pointer border-b last:border-b-0"
                                                onClick={() => handleProductSelect(product)}
                                            >
                                                <div className="flex justify-between items-center">
                                                    <div>
                                                        <div className="font-medium flex items-center gap-2">
                                                            <Package size={14} className="text-primary" />
                                                            {product.name}
                                                        </div>
                                                        <div className="text-xs text-gray-500 mt-1">
                                                            <span className="mr-3">Code: {product.product_no || "N/A"}</span>
                                                            <span>Unit: {product.unit_type?.toUpperCase() || 'PIECE'}</span>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs bg-gray-200 px-2 py-1 rounded-full">
                                                            {product.variants?.size || 0} variants
                                                        </span>
                                                        <ChevronRight size={16} className="text-gray-400" />
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Selected Items List */}
                        {selectedItems.length > 0 && (
                            <div className="mb-4">
                                <h3 className="font-semibold mb-2 flex items-center gap-2">
                                    <ShoppingBag size={16} className="text-primary" />
                                    Selected Items ({selectedItems.length})
                                </h3>
                                <div className="space-y-3">
                                    {selectedItems.map((item, index) => (
                                        <SelectedItemCard
                                            key={item.uniqueKey}
                                            item={item}
                                            index={index}
                                            selectedUnits={selectedUnits}
                                            unitQuantities={unitQuantities}
                                            availableUnits={availableUnits}
                                            priceManuallyEdited={priceManuallyEdited}
                                            onUpdateItem={updateItem}
                                            onRemoveItem={removeItem}
                                            onUnitChange={handleUnitChange}
                                            formatCurrency={formatCurrency}
                                            convertToBase={convertToBase}
                                            convertFromBase={convertFromBase}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Pickup Section */}
                        <div className="mt-6">
                            <div className="flex justify-between items-center mb-2">
                                <h4 className="font-bold text-gray-700 flex items-center gap-2">
                                    <ShoppingBag size={16} /> Pickup Products
                                </h4>
                                <button
                                    type="button"
                                    onClick={() => setShowPickupModal(true)}
                                    className="btn btn-sm btn-outline"
                                >
                                    <Plus size={14} className="mr-1" /> Add Pickup Item
                                </button>
                            </div>

                            {pickupItems.length > 0 ? (
                                <div className="space-y-3">
                                    {pickupItems.map((item, index) => (
                                        <div key={item.id} className="card bg-gray-50 border border-gray-200 rounded-lg">
                                            <div className="card-body p-3">
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <h4 className="font-bold">{item.product_name}</h4>
                                                        <div className="text-sm mt-1">
                                                            <span className="text-gray-600">Variant: {item.variant_name}</span>
                                                            <br />
                                                            <span className="text-gray-600">Qty: {item.quantity} | Price: {formatWithSymbol(item.sale_price)}</span>
                                                            <br />
                                                            <span className="font-bold">Total: {formatWithSymbol(item.total_price)}</span>
                                                        </div>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => removePickupItem(index)}
                                                        className="btn btn-xs btn-ghost text-red-600"
                                                    >
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
                                </div>
                            )}
                        </div>

                        {/* Summary */}
                        {(selectedItems.length > 0 || pickupItems.length > 0) && (
                            <div className="border-t pt-4 mt-4 space-y-2">
                                <div className="flex justify-between">
                                    <span>Stock Items:</span>
                                    <span>{formatWithSymbol(realSubTotal)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Pickup Items:</span>
                                    <span>{formatWithSymbol(pickupSubTotal)}</span>
                                </div>
                                <div className="flex justify-between font-bold">
                                    <span>Sub Total:</span>
                                    <span>{formatWithSymbol(totalSubTotal)}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-2">
                                        <span>VAT:</span>
                                        <input
                                            type="number"
                                            min="0"
                                            max="100"
                                            step="0.01"
                                            className="input input-bordered input-sm w-20"
                                            value={vatRate}
                                            onChange={(e) => setVatRate(parseFloat(e.target.value) || 0)}
                                        />
                                        <span>%</span>
                                    </div>
                                    <span>{formatWithSymbol(vatAmount)}</span>
                                </div>

                                {/* Discount Section */}
                                <div className="flex justify-between items-center border-t pt-2 mt-2">
                                    <div className="flex items-center gap-2">
                                        <span>Discount:</span>
                                        <select
                                            className="select select-bordered select-sm w-24"
                                            value={discountType}
                                            onChange={(e) => setDiscountType(e.target.value)}
                                        >
                                            <option value="percentage">Percentage</option>
                                            <option value="flat_discount">Flat</option>
                                        </select>
                                    </div>
                                    <span className="text-green-600">-{formatWithSymbol(discountAmount)}</span>
                                </div>

                                {/* Conditional Discount Input Fields */}
                                {discountType === "percentage" && (
                                    <div className="flex justify-between items-center">
                                        <div className="flex items-center gap-2">
                                            <span>Percentage:</span>
                                            <input
                                                type="number"
                                                min="0"
                                                max="100"
                                                step="0.01"
                                                className="input input-bordered input-sm w-20"
                                                value={percentageDiscount}
                                                onChange={(e) => setPercentageDiscount(parseFloat(e.target.value) || 0)}
                                            />
                                            <span>%</span>
                                        </div>
                                        <span className="text-sm text-gray-600">
                                            Discount: {formatWithSymbol(discountAmount)}
                                        </span>
                                    </div>
                                )}

                                {discountType === "flat_discount" && (
                                    <div className="flex justify-between items-center">
                                        <div className="flex items-center gap-2">
                                            <span>Flat Discount:</span>
                                            <input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                className="input input-bordered input-sm w-28"
                                                value={flatDiscount}
                                                onChange={(e) => setFlatDiscount(parseFloat(e.target.value) || 0)}
                                                placeholder="Enter amount"
                                            />
                                        </div>
                                        <span className="text-sm text-gray-600">
                                            ৳{formatCurrency(flatDiscount)} off
                                        </span>
                                    </div>
                                )}

                                <div className="flex justify-between text-lg font-bold border-t pt-2">
                                    <span>Grand Total:</span>
                                    <span>{formatWithSymbol(grandTotal)}</span>
                                </div>
                                <div className="flex justify-between text-lg font-bold">
                                    <span>Due:</span>
                                    <span className={dueAmount > 0 ? "text-error" : "text-success"}>
                                        {formatWithSymbol(dueAmount)}
                                    </span>
                                </div>
                            </div>
                        )}

                        {/* Submit Buttons */}
                        <div className="flex gap-3 mt-6">
                            <button
                                type="submit"
                                className="btn bg-[#1e4d2b] text-white"
                                disabled={form.processing}
                            >
                                {form.processing ? "Creating..." : "Create Sale"}
                            </button>
                            <button
                                type="button"
                                onClick={() => router.visit(route("sales.index"))}
                                className="btn btn-ghost"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            </form>

            {/* Variant Selection Modal */}
            {showVariantModal && selectedProduct && (
                <div className="modal modal-open">
                    <div className="modal-box max-w-3xl">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold flex items-center gap-2">
                                <Layers size={18} className="text-primary" />
                                Select Variant - {selectedProduct.name}
                            </h3>
                            <button
                                onClick={() => {
                                    setShowVariantModal(false);
                                    setSelectedProduct(null);
                                }}
                                className="btn btn-sm btn-circle btn-ghost"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="grid grid-cols-1 gap-3 max-h-96 overflow-y-auto">
                            {productVariants.map((variant, index) => (
                                <div
                                    key={variant.id}
                                    className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 cursor-pointer"
                                    onClick={() => handleVariantSelect(variant)}
                                >
                                    <div className="flex justify-between items-start">
                                        <div className="flex-1">
                                            {/* Attributes */}
                                            <div className="flex flex-wrap gap-2 mb-2">
                                                {variant.attributes.map((attr, idx) => (
                                                    <span
                                                        key={idx}
                                                        className="px-2 py-1 bg-blue-50 text-blue-700 rounded-md text-xs border border-blue-200"
                                                    >
                                                        <span className="font-semibold">{attr.key}:</span> {attr.value}
                                                    </span>
                                                ))}
                                            </div>

                                            {/* Batches Preview */}
                                            {variant.batches.length > 0 && (
                                                <div className="mt-2">
                                                    <div className="text-xs font-semibold text-gray-600 mb-1">Available Batches:</div>
                                                    <div className="flex flex-wrap gap-2">
                                                        {variant.batches.slice(0, 3).map((batch, idx) => (
                                                            <span
                                                                key={idx}
                                                                className="px-2 py-1 bg-gray-100 text-gray-700 rounded-md text-xs"
                                                            >
                                                                Batch: {batch.batch_no || 'N/A'} | Qty: {batch.totalQuantity} | Price: ৳{batch.sale_price}
                                                            </span>
                                                        ))}
                                                        {variant.batches.length > 3 && (
                                                            <span className="text-xs text-gray-500">
                                                                +{variant.batches.length - 3} more
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        <ChevronRight size={20} className="text-gray-400" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Batch Selection Modal */}
            {showBatchModal && selectedVariant && (
                <div className="modal modal-open">
                    <div className="modal-box max-w-2xl">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold flex items-center gap-2">
                                <Box size={18} className="text-primary" />
                                Select Batch - {selectedProduct?.name}
                            </h3>
                            <button
                                onClick={() => {
                                    setShowBatchModal(false);
                                    setSelectedVariant(null);
                                }}
                                className="btn btn-sm btn-circle btn-ghost"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="space-y-3 max-h-96 overflow-y-auto">
                            {availableBatches.map((batch, index) => (
                                <div
                                    key={index}
                                    className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 cursor-pointer"
                                    onClick={() => handleBatchSelect(batch)}
                                >
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <div className="text-sm">
                                                <span className="font-semibold">Batch No:</span> {batch.batch_no || 'N/A'}
                                            </div>
                                            <div className="text-sm mt-1">
                                                <span className="font-semibold">Available Stock:</span> {batch.totalQuantity} {selectedVariant.unit.toUpperCase()}
                                            </div>
                                        </div>
                                        <div>
                                            <div className="text-sm">
                                                <span className="font-semibold">Sale Price:</span> ৳{batch.sale_price || 0}
                                            </div>
                                            <div className="text-sm mt-1">
                                                <span className="font-semibold">Purchase Price:</span> ৳{batch.purchase_price || 0}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="mt-2 text-right">
                                        <button className="btn btn-sm btn-primary">
                                            Select This Batch
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Pickup Modal */}
            {showPickupModal && (
                <div className="modal modal-open">
                    <div className="modal-box max-w-2xl">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold">Add Pickup Item</h3>
                            <button onClick={() => setShowPickupModal(false)} className="btn btn-sm btn-circle btn-ghost">✕</button>
                        </div>
                        <div className="space-y-4">
                            <div className="form-control">
                                <label className="label">Pickup Product *</label>
                                <select
                                    value={pickupProductId}
                                    onChange={(e) => handlePickupProductChange(e.target.value)}
                                    className="select select-bordered"
                                >
                                    <option value="">Select Product</option>
                                    {products.map((product) => (
                                        <option key={product.id} value={product.id}>
                                            {product.name} ({product.product_no})
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-control">
                                <label className="label">Pickup Variant *</label>
                                <select
                                    value={pickupVariantId}
                                    onChange={(e) => setPickupVariantId(e.target.value)}
                                    className="select select-bordered"
                                    disabled={!pickupProductId || pickupVariants.length === 0}
                                >
                                    <option value="">
                                        {pickupProductId ? "Select Variant" : "Select Product First"}
                                    </option>
                                    {pickupVariants?.map((v) => (
                                        <option key={v.id} value={v.id}>
                                            {v.sku || `Variant #${v.id}`}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-control">
                                <label className="label">Pickup Supplier *</label>
                                <select
                                    value={pickupSupplierId}
                                    onChange={(e) => setPickupSupplierId(e.target.value)}
                                    className="select select-bordered"
                                >
                                    <option value="">Select Supplier</option>
                                    {suppliers.map((supplier) => (
                                        <option key={supplier.id} value={supplier.id}>
                                            {supplier.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                                <div className="form-control">
                                    <label className="label">Quantity *</label>
                                    <input
                                        type="number"
                                        className="input input-bordered"
                                        value={pickupQuantity}
                                        onChange={(e) => setPickupQuantity(e.target.value)}
                                        min="1"
                                    />
                                </div>
                                <div className="form-control">
                                    <label className="label">Cost Price *</label>
                                    <input
                                        type="number"
                                        className="input input-bordered"
                                        value={pickupUnitPrice}
                                        onChange={(e) => setPickupUnitPrice(e.target.value)}
                                        min="0"
                                        step="0.01"
                                    />
                                </div>
                                <div className="form-control">
                                    <label className="label">Sale Price *</label>
                                    <input
                                        type="number"
                                        className="input input-bordered"
                                        value={pickupSalePrice}
                                        onChange={(e) => setPickupSalePrice(e.target.value)}
                                        min="0"
                                        step="0.01"
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="modal-action">
                            <button onClick={() => setShowPickupModal(false)} className="btn btn-ghost">Cancel</button>
                            <button onClick={addPickupItem} className="btn bg-[#1e4d2b] text-white">Add Item</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// ========== SELECTED ITEM CARD COMPONENT ==========
const SelectedItemCard = ({
    item,
    index,
    selectedUnits,
    unitQuantities,
    availableUnits,
    priceManuallyEdited,
    onUpdateItem,
    onRemoveItem,
    onUnitChange,
    formatCurrency,
    convertToBase,
    convertFromBase
}) => {
    const itemKey = item.uniqueKey || index;
    const availableUnitsList = availableUnits[item.uniqueKey] || [item.unit || "piece"];
    const selectedUnit = selectedUnits[item.uniqueKey] || item.unit || "piece";
    const unitQuantity = unitQuantities[item.uniqueKey] || item.unit_quantity || 1;
    const isManuallyEdited = priceManuallyEdited[item.uniqueKey] || false;

    return (
        <div className="border border-gray-300 rounded-box p-4">
            <div className="flex justify-between items-start mb-3">
                <div>
                    <h4 className="font-medium">{item.product_name}</h4>
                    <p className="text-sm text-gray-600">
                        <strong>Variant:</strong> {item.variant_attribute}
                    </p>
                    <p className="text-sm text-gray-600">
                        <strong>Batch:</strong> {item.batch_no || 'N/A'}
                        <span className="text-gray-600"> | <strong>Total Stock:</strong> {item?.stockQuantity || 0}</span>
                    </p>
                </div>
                <button
                    type="button"
                    onClick={() => onRemoveItem(index)}
                    className="btn btn-xs btn-error"
                >
                    <Trash2 size={12} />
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="form-control">
                    <label className="label">
                        <span className="label-text">Unit</span>
                    </label>
                    <select
                        className="select select-bordered select-sm"
                        value={selectedUnit}
                        onChange={(e) => onUnitChange(item.uniqueKey, e.target.value)}
                    >
                        {availableUnitsList.map((unit) => (
                            <option key={unit} value={unit}>
                                {unit.toUpperCase()}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="form-control">
                    <label className="label">
                        <span className="label-text">Quantity</span>
                    </label>
                    <input
                        type="number"
                        className="input input-bordered input-sm"
                        value={unitQuantity}
                        onChange={(e) => onUpdateItem(index, "unit_quantity", e.target.value)}
                    />
                </div>

                <div className="form-control">
                    <label className="label">
                        <span className="label-text">
                            Price {isManuallyEdited && "(Manual)"}
                        </span>
                    </label>
                    <input
                        type="number"
                        step="0.01"
                        className="input input-bordered input-sm"
                        value={item.unit_price}
                        onChange={(e) => onUpdateItem(index, "unit_price", e.target.value)}
                    />
                </div>

                <div className="form-control">
                    <label className="label">
                        <span className="label-text">Total</span>
                    </label>
                    <input
                        type="text"
                        className="input input-bordered input-sm bg-gray-100"
                        value={formatCurrency(item.total_price)}
                        readOnly
                    />
                </div>
            </div>

            {item.product_unit_type && item.product_unit_type !== "piece" && (
                <div className="mt-2 text-xs text-gray-600 bg-blue-50 p-2 rounded">
                    <span className="font-medium">Stock:</span> {
                        convertFromBase(item.stockBaseQuantity, selectedUnit, item.product_unit_type).toFixed(3)
                    } {selectedUnit.toUpperCase()} available
                </div>
            )}
        </div>
    );
};