import PageHeader from "../../components/PageHeader";
import { router, useForm } from "@inertiajs/react";
import {
    ArrowLeft,
    Plus,
    Minus,
    Trash2,
    Search,
    RefreshCw,
    ChevronLeft,
    ChevronRight,
    Wallet,
    CreditCard,
    X,
    ShoppingBag,
    Landmark,
    Smartphone,
    Edit,
    User,
    Package,
    Ruler,
    ChevronDown,
    Check,
    FileText,
    Calendar,
    AlertCircle,
    Percent,
} from "lucide-react";
import { useEffect, useMemo, useState, useCallback, useRef } from "react";

export default function AddSale({
    customers = [],
    productstocks = [],
    suppliers = [],
    accounts = [],
    products = [],
    unitConversions = {
        weight: { ton: 1000, kg: 1, gram: 0.001, pound: 0.453592 },
        volume: { liter: 1, ml: 0.001 },
        piece: { piece: 1, dozen: 12, box: 1 },
        length: { meter: 1, cm: 0.01, mm: 0.001 },
    },
}) {
    // ---------------- Utils ----------------
    const n = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
    const formatCurrency = (v) => n(v).toFixed(2);
    const money = (v) => `৳${formatCurrency(v)}`;

    // ---------------- State ----------------
    const [search, setSearch] = useState("");
    const [categoryFilter, setCategoryFilter] = useState("All Categories");
    const [brandFilter, setBrandFilter] = useState("All Brands");
    const [page, setPage] = useState(1);
    const pageSize = 8;

    // Installment payment state
    const [installmentDuration, setInstallmentDuration] = useState(null);
    const [totalInstallments, setTotalInstallments] = useState(null);

    // Customer state
    const [customerId, setCustomerId] = useState("");
    const [customerName, setCustomerName] = useState("");
    const [customerPhone, setCustomerPhone] = useState("");
    const [showManualCustomerFields, setShowManualCustomerFields] = useState(false);
    const [selectedCustomer, setSelectedCustomer] = useState(null);

    // Payment state
    const [selectedAccount, setSelectedAccount] = useState("");
    const [paymentStatus, setPaymentStatus] = useState("unpaid");
    const [partialPayment, setPartialPayment] = useState(false);
    const [paidAmount, setPaidAmount] = useState(0);
    const [manualPaymentOverride, setManualPaymentOverride] = useState(false);
    const [selectedIdentifiers, setSelectedIdentifiers] = useState({});

    // Cart state
    const [cart, setCart] = useState([]);
    const cartCount = cart.reduce((a, i) => a + n(i.qty), 0);

    // Tax/Discount
    const [taxRate, setTaxRate] = useState(null);
    const [discountValue, setDiscountValue] = useState(null);

    // Pickup state
    const [pickupItems, setPickupItems] = useState([]);
    const [showPickupModal, setShowPickupModal] = useState(false);
    const [selectedSupplier, setSelectedSupplier] = useState(null);
    const [pickupVariantId, setPickupVariantId] = useState("");
    const [pickupVariants, setPickupVariants] = useState([]);

    // Pickup form
    const [pickupProductName, setPickupProductName] = useState("");
    const [pickupQuantity, setPickupQuantity] = useState(1);
    const [pickupUnitPrice, setPickupUnitPrice] = useState(null);
    const [pickupSalePrice, setPickupSalePrice] = useState(null);

    // Order info
    const [saleDate, setSaleDate] = useState(new Date().toISOString().split("T")[0]);
    const [notes, setNotes] = useState("");

    // Unit conversion state
    const [unitDropdownOpen, setUnitDropdownOpen] = useState({});
    const [selectedUnits, setSelectedUnits] = useState({});
    const [unitQuantities, setUnitQuantities] = useState({});
    const [availableUnits, setAvailableUnits] = useState({});
    const [unitPrices, setUnitPrices] = useState({});
    const [basePrices, setBasePrices] = useState({});
    const [pickupProductId, setPickupProductId] = useState("");
    const [pickupSupplierId, setPickupSupplierId] = useState("");

    const dropdownRefs = useRef({});

    const getSelectedIdentifierValues = useCallback((itemKey) => {
        return Array.isArray(selectedIdentifiers[itemKey])
            ? selectedIdentifiers[itemKey]
            : [];
    }, [selectedIdentifiers]);

    const updateSelectedIdentifier = useCallback((itemKey, slotIndex, identifierId) => {
        setSelectedIdentifiers((prev) => {
            const current = Array.isArray(prev[itemKey]) ? [...prev[itemKey]] : [];
            current[slotIndex] = identifierId ? Number(identifierId) : "";

            return {
                ...prev,
                [itemKey]: current,
            };
        });
    }, []);

    const autoAssignIdentifiers = useCallback((availableIdentifiers = [], qty = 1, existing = []) => {
        const next = Array.isArray(existing) ? [...existing].slice(0, qty) : [];
        const used = new Set(next.filter(Boolean).map(Number));

        for (let i = 0; i < qty; i++) {
            if (!next[i]) {
                const candidate = availableIdentifiers.find(
                    (identifier) => !used.has(Number(identifier.id))
                );

                if (candidate) {
                    next[i] = Number(candidate.id);
                    used.add(Number(candidate.id));
                }
            }
        }

        return next.slice(0, qty);
    }, []);

    // ---------------- Unit Conversion Helper Functions ----------------
    const getAvailableUnitsForStock = useCallback(
        (product, stock) => {
            if (!product) return ["piece"];

            const unitType = product.unit_type || "piece";
            const conversions = unitConversions[unitType];
            if (!conversions) return [product.default_unit || "piece"];

            const purchaseUnit = stock?.unit || product.default_unit || "piece";
            const purchaseFactor = conversions[purchaseUnit] || 1;

            const available = [];
            for (const [unit, factor] of Object.entries(conversions)) {
                if (factor <= purchaseFactor) available.push(unit);
            }

            return available.sort((a, b) => (conversions[a] || 1) - (conversions[b] || 1));
        },
        [unitConversions]
    );

    const convertToBase = useCallback(
        (quantity, fromUnit, unitType) => {
            const conversions = unitConversions[unitType];
            if (!conversions || !conversions[fromUnit]) return quantity;
            return quantity * conversions[fromUnit];
        },
        [unitConversions]
    );

    const convertFromBase = useCallback(
        (quantity, toUnit, unitType) => {
            const conversions = unitConversions[unitType];
            if (!conversions || !conversions[toUnit]) return quantity;
            const conversion = conversions[toUnit];
            return conversion !== 0 ? quantity / conversion : quantity;
        },
        [unitConversions]
    );

    const convertUnitQuantity = useCallback(
        (quantity, fromUnit, toUnit, unitType) => {
            if (fromUnit === toUnit) return quantity;

            const conversions = unitConversions[unitType];
            if (!conversions || !conversions[fromUnit] || !conversions[toUnit]) return quantity;

            const baseQuantity = quantity * conversions[fromUnit];
            return baseQuantity / conversions[toUnit];
        },
        [unitConversions]
    );

    const calculatePriceForUnit = useCallback((basePricePerBaseUnit, targetUnit, unitType) => {
        const conversions = unitConversions[unitType];
        if (!conversions || !conversions[targetUnit]) return basePricePerBaseUnit;
        return basePricePerBaseUnit * conversions[targetUnit];
    }, [unitConversions]);

    const calculateBasePricePerBaseUnit = useCallback(
        (price, unit, unitType) => {
            const conversions = unitConversions[unitType];
            if (!conversions || !conversions[unit]) return price;
            return price / conversions[unit];
        },
        [unitConversions]
    );

    // ---------------- Catalog (from productstocks) ----------------
    const catalog = useMemo(() => {
        const map = new Map();

        for (const s of productstocks || []) {
            if (!s?.product || n(s?.quantity) <= 0) continue;

            const p = s.product;
            const pid = p.id;

            if (!map.has(pid)) {
                const img = p.photo ? `/storage/${p.photo}` : null;
                map.set(pid, {
                    id: pid,
                    name: p.name || "Unnamed Product",
                    product_no: p.product_no || "",
                    category_name: p.category?.name || "Uncategorized",
                    brand_name: p.brand?.name || "No Brand",
                    image: img,
                    unit_type: p.unit_type || "piece",
                    default_unit: p.default_unit || "piece",
                    min_sale_unit: p.min_sale_unit || null,
                    is_fraction_allowed: p.is_fraction_allowed || false,
                    totalStock: 0,
                    minPrice: null,
                    variants: [],
                });
            }

            const item = map.get(pid);
            item.totalStock += n(s.quantity);

            const sp = n(s.sale_price);
            item.minPrice = item.minPrice === null ? sp : Math.min(item.minPrice, sp);

            const variantLabel = (() => {
                const v = s?.variant;
                if (!v) return "Default";

                const attrs = v.attribute_values;
                if (attrs && typeof attrs === "object" && !Array.isArray(attrs)) {
                    const pairs = Object.entries(attrs)
                        .filter(([key, value]) => key && value)
                        .map(([key, value]) => `${key}: ${value}`);
                    if (pairs.length) return pairs.join(", ");
                }

                return v.sku || "Default";
            })();

            const availableUnitsForStock = getAvailableUnitsForStock(map.get(pid), s);

            const availableIdentifiers = (s.identifiers || []).filter(
                (identifier) => String(identifier.status || "").toLowerCase() === "available"
            );

            const trackingType =
                p.tracking_type ||
                availableIdentifiers?.[0]?.identifier_type ||
                "imei";

            item.variants.push({
                stock_id: s.id,
                batch_no: s.batch_no || null,
                quantity: n(s.quantity),
                sale_price: n(s.sale_price),
                shadow_sale_price: n(s.shadow_sale_price),
                variant_id: s.variant?.id || null,
                variant_label: variantLabel,
                purchase_unit: s.unit || item.default_unit || "piece",
                base_quantity: n(s.base_quantity) || n(s.quantity),
                available_units: availableUnitsForStock,
                warehouse_id: s.warehouse_id,
                product_unit_type: item.unit_type || "piece",
                is_fraction_allowed: item.is_fraction_allowed || false,
                sku: s.variant?.sku || null,
                identifiers: s.identifiers || [],

                /*
                |--------------------------------------------------------------------------
                | IMPORTANT FIX
                |--------------------------------------------------------------------------
                | POS tracking should work even if product.is_tracking_enabled is false,
                | because IMEI/Serial now comes from purchase stock identifiers.
                |--------------------------------------------------------------------------
                */
                is_tracking_enabled:
                    (
                        !!p.is_tracking_enabled &&
                        (p.tracking_type === "imei" || p.tracking_type === "serial")
                    ) ||
                    availableIdentifiers.length > 0,

                tracking_type: trackingType,
                available_identifiers: availableIdentifiers,
            });
        }

        return Array.from(map.values())
            .map((p) => ({
                ...p,
                variants: p.variants.sort((a, b) => {
                    if (b.quantity !== a.quantity) return b.quantity - a.quantity;
                    return (a.batch_no || "").localeCompare(b.batch_no || "");
                }),
            }))
            .sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    }, [productstocks, getAvailableUnitsForStock]);

    // ---------------- Filters & Pagination ----------------
    const categories = useMemo(() => {
        const set = new Set();
        for (const p of catalog) set.add(p.category_name || "Uncategorized");
        return ["All Categories", ...Array.from(set).sort()];
    }, [catalog]);

    const brands = useMemo(() => {
        const set = new Set();
        for (const p of catalog) set.add(p.brand_name || "No Brand");
        return ["All Brands", ...Array.from(set).sort()];
    }, [catalog]);

    const filteredCatalog = useMemo(() => {
        const q = search.trim().toLowerCase();

        return catalog.filter((p) => {
            const okCategory =
                categoryFilter === "All Categories" ? true : p.category_name === categoryFilter;

            const okBrand =
                brandFilter === "All Brands" ? true : p.brand_name === brandFilter;

            const okSearch = !q
                ? true
                : (p.name || "").toLowerCase().includes(q) ||
                (p.product_no || "").toLowerCase().includes(q) ||
                (p.variants || []).some((v) => {
                    const batchNo = String(v.batch_no || "").toLowerCase();
                    const sku = String(v.sku || "").toLowerCase();
                    const identifierMatch = (v.identifiers || []).some((identifier) =>
                        String(identifier.identifier_value || "").toLowerCase().includes(q)
                    );

                    return (
                        batchNo.includes(q) ||
                        sku.includes(q) ||
                        identifierMatch
                    );
                });

            return okCategory && okBrand && okSearch;
        });
    }, [catalog, search, categoryFilter, brandFilter]);

    const totalPages = Math.max(1, Math.ceil(filteredCatalog.length / pageSize));

    useEffect(() => {
        setPage((p) => Math.min(Math.max(1, p), totalPages));
    }, [totalPages]);

    const pagedCatalog = useMemo(() => {
        const start = (page - 1) * pageSize;
        return filteredCatalog.slice(start, start + pageSize);
    }, [filteredCatalog, page]);

    // ---------------- Customer Sync ----------------
    useEffect(() => {
        if (customerId && customerId !== "01") {
            const customer = customers.find((c) => String(c.id) === String(customerId));
            setSelectedCustomer(customer || null);
            if (customer) {
                setCustomerName(customer.customer_name || "");
                setCustomerPhone(customer.phone || "");
            }
        } else {
            setSelectedCustomer(null);
        }
    }, [customerId, customers]);

    // ---------------- Cart Operations ----------------
    function handleVariantSelect(product, variant) {
        addToCart(product, variant);
    }

    const addToCart = useCallback(
        (product, variant) => {
            if (!product || !variant) return;

            const key = `${product.id}-${variant.variant_id || "0"}-${variant.stock_id}`;
            const existingItem = cart.find((x) => x.key === key);

            const availableIdentifiers = Array.isArray(variant.available_identifiers)
                ? variant.available_identifiers
                : [];

            /*
            |--------------------------------------------------------------------------
            | IMPORTANT FIX
            |--------------------------------------------------------------------------
            | If this stock/batch has available identifiers, POS must treat it as tracked.
            |--------------------------------------------------------------------------
            */
            const isTrackedProduct =
                (
                    !!variant.is_tracking_enabled &&
                    (variant.tracking_type === "imei" || variant.tracking_type === "serial")
                ) ||
                availableIdentifiers.length > 0;

            const trackingType =
                variant.tracking_type ||
                availableIdentifiers?.[0]?.identifier_type ||
                "imei";

            if (existingItem) {
                const nextQty = n(existingItem.qty) + 1;

                if (isTrackedProduct && nextQty > availableIdentifiers.length) {
                    alert(
                        `Only ${availableIdentifiers.length} ${variant.tracking_type} available for this item`
                    );
                    return;
                }

                changeQty(key, nextQty);
                return;
            }

            const availableUnitsForStock =
                variant.available_units || getAvailableUnitsForStock(product, variant);

            let defaultUnit =
                product.min_sale_unit || product.default_unit || availableUnitsForStock[0] || "piece";

            if (!availableUnitsForStock.includes(defaultUnit)) {
                defaultUnit = availableUnitsForStock[0] || "piece";
            }

            if (isTrackedProduct) {
                defaultUnit = "piece";
            }

            const unitType = product.unit_type || "piece";
            let basePricePerBaseUnit = variant.sale_price;

            if (unitType !== "piece") {
                basePricePerBaseUnit = calculateBasePricePerBaseUnit(
                    variant.sale_price,
                    variant.purchase_unit,
                    unitType
                );
            }

            let unitPrice = variant.sale_price;
            if (!isTrackedProduct && variant.purchase_unit !== defaultUnit && unitType !== "piece") {
                unitPrice = calculatePriceForUnit(basePricePerBaseUnit, defaultUnit, unitType);
            }

            const newItem = {
                key,
                product_id: product.id,
                variant_id: variant.variant_id,
                stock_id: variant.stock_id,
                name: product.name,
                code: product.product_no,
                variant_label: variant.variant_label,
                batch_no: variant.batch_no,
                qty: 1,
                unit: defaultUnit,
                unit_price: unitPrice,
                shadow_unit_price: n(variant.shadow_sale_price) || unitPrice,
                maxQty: n(variant.quantity),
                total_price: unitPrice,
                product_unit_type: unitType,
                is_fraction_allowed: isTrackedProduct ? false : (product.is_fraction_allowed || false),
                original_purchase_unit: variant.purchase_unit,
                original_sale_price: variant.sale_price,
                base_quantity: variant.base_quantity || variant.quantity,
                available_units: isTrackedProduct ? ["piece"] : availableUnitsForStock,
                base_price_per_base_unit: basePricePerBaseUnit,

                is_tracking_enabled: isTrackedProduct,
                tracking_type: trackingType,
                available_identifiers: availableIdentifiers,
            };

            setCart((prev) => [...prev, newItem]);

            setSelectedUnits((prev) => ({ ...prev, [key]: defaultUnit }));
            setUnitQuantities((prev) => ({ ...prev, [key]: 1 }));
            setAvailableUnits((prev) => ({
                ...prev,
                [key]: isTrackedProduct ? ["piece"] : availableUnitsForStock,
            }));
            setUnitPrices((prev) => ({ ...prev, [key]: unitPrice }));
            setBasePrices((prev) => ({ ...prev, [key]: basePricePerBaseUnit }));

            if (isTrackedProduct) {
                setSelectedIdentifiers((prev) => ({
                    ...prev,
                    [key]: autoAssignIdentifiers(availableIdentifiers, 1, []),
                }));
            }
        },
        [
            cart,
            getAvailableUnitsForStock,
            calculateBasePricePerBaseUnit,
            calculatePriceForUnit,
            autoAssignIdentifiers,
        ]
    );

    const removeCartItem = (key) => {
        setCart((prev) => prev.filter((x) => x.key !== key));

        setSelectedUnits((prev) => {
            const ns = { ...prev };
            delete ns[key];
            return ns;
        });
        setUnitQuantities((prev) => {
            const ns = { ...prev };
            delete ns[key];
            return ns;
        });
        setAvailableUnits((prev) => {
            const ns = { ...prev };
            delete ns[key];
            return ns;
        });
        setUnitPrices((prev) => {
            const ns = { ...prev };
            delete ns[key];
            return ns;
        });
        setBasePrices((prev) => {
            const ns = { ...prev };
            delete ns[key];
            return ns;
        });
        setUnitDropdownOpen((prev) => {
            const ns = { ...prev };
            delete ns[key];
            return ns;
        });
        setSelectedIdentifiers((prev) => {
            const ns = { ...prev };
            delete ns[key];
            return ns;
        });
    };

    const changeQty = (key, nextQty) => {
        const item = cart.find((x) => x.key === key);

        if (!item) return;

        const selectedUnit = selectedUnits[key] || item.unit;

        if (item.is_tracking_enabled && selectedUnit !== "piece") {
            alert("Tracked product must be sold in piece unit");
            return;
        }

        let q = n(nextQty);

        if (!item.is_fraction_allowed && q % 1 !== 0) {
            alert("Fractions are not allowed for this product");
            return;
        }

        if (item.is_tracking_enabled) {
            if (q % 1 !== 0) {
                alert("Tracked product quantity must be whole number");
                return;
            }

            const availableIdentifierCount = Array.isArray(item.available_identifiers)
                ? item.available_identifiers.length
                : 0;

            if (q > availableIdentifierCount) {
                alert(`Only ${availableIdentifierCount} ${item.tracking_type} available for this item`);
                return;
            }
        }

        if (item.product_unit_type && item.product_unit_type !== "piece") {
            const requestedBaseQty = convertToBase(q, selectedUnit, item.product_unit_type);
            if (requestedBaseQty > item.base_quantity) {
                const availableInUnit = convertFromBase(item.base_quantity, selectedUnit, item.product_unit_type);
                alert(`Exceeds available stock! Available: ${availableInUnit.toFixed(3)} ${selectedUnit.toUpperCase()}`);
                return;
            }
        } else if (!item.is_tracking_enabled && q > item.maxQty) {
            alert(`Exceeds available stock! Available: ${item.maxQty}`);
            return;
        }

        if (q < (item.is_tracking_enabled ? 1 : 0.001)) {
            q = 1;
        }

        const unitPrice = unitPrices[key] || item.unit_price;

        setCart((prev) =>
            prev.map((x) => {
                if (x.key !== key) return x;
                return { ...x, qty: q, unit_price: unitPrice, total_price: q * n(unitPrice) };
            })
        );

        setUnitQuantities((prev) => ({ ...prev, [key]: q }));

        if (item.is_tracking_enabled) {
            setSelectedIdentifiers((prev) => ({
                ...prev,
                [key]: autoAssignIdentifiers(
                    item.available_identifiers || [],
                    q,
                    prev[key] || []
                ),
            }));
        }
    };

    const handleUnitChange = (key, newUnit) => {
        const item = cart.find((x) => x.key === key);
        if (item.is_tracking_enabled && newUnit !== "piece") {
            alert("Tracked product must be sold in piece unit");
            return;
        }
        if (!item) return;

        const oldUnit = selectedUnits[key] || item.unit;
        const oldQty = unitQuantities[key] || item.qty;

        if (oldUnit === newUnit) return;

        const availableUnitsList = availableUnits[key] || [item.unit];
        if (!availableUnitsList.includes(newUnit)) {
            alert(`Cannot sell in ${newUnit.toUpperCase()} unit for this product`);
            return;
        }

        const unitType = item.product_unit_type || "piece";

        let newQty = oldQty;
        if (unitType !== "piece") {
            newQty = convertUnitQuantity(oldQty, oldUnit, newUnit, unitType);

            const requestedBaseQty = convertToBase(newQty, newUnit, unitType);
            if (requestedBaseQty > item.base_quantity) {
                const availableInUnit = convertFromBase(item.base_quantity, newUnit, unitType);
                alert(`Cannot change unit. Exceeds available stock! Available: ${availableInUnit.toFixed(3)} ${newUnit.toUpperCase()}`);
                return;
            }
        }

        const basePricePerBaseUnit =
            basePrices[key] ||
            item.base_price_per_base_unit ||
            calculateBasePricePerBaseUnit(item.original_sale_price, item.original_purchase_unit, unitType);

        const newPrice = calculatePriceForUnit(basePricePerBaseUnit, newUnit, unitType);

        setCart((prev) =>
            prev.map((x) => {
                if (x.key !== key) return x;
                return {
                    ...x,
                    unit: newUnit,
                    qty: newQty,
                    unit_price: newPrice,
                    total_price: newQty * n(newPrice),
                    base_price_per_base_unit: basePricePerBaseUnit
                };
            })
        );

        setSelectedUnits((prev) => ({ ...prev, [key]: newUnit }));
        setUnitQuantities((prev) => ({ ...prev, [key]: newQty }));
        setUnitPrices((prev) => ({ ...prev, [key]: newPrice }));
        setBasePrices((prev) => ({ ...prev, [key]: basePricePerBaseUnit }));
        setUnitDropdownOpen((prev) => ({ ...prev, [key]: false }));
    };

    useEffect(() => {
        const handleClickOutside = (event) => {
            Object.keys(dropdownRefs.current).forEach((key) => {
                if (dropdownRefs.current[key] && !dropdownRefs.current[key].contains(event.target)) {
                    setUnitDropdownOpen((prev) => ({ ...prev, [key]: false }));
                }
            });
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // ---------------- Barcode Scanner ----------------
    const barcodeRef = useRef(null);
    const [scanError, setScanError] = useState("");

    const scanIndex = useMemo(() => {
        const batchMap = new Map();
        const skuMap = new Map();
        const productCodeMap = new Map();
        const identifierMap = new Map();

        for (const p of catalog) {
            if (p?.product_no) {
                productCodeMap.set(String(p.product_no).trim().toLowerCase(), p);
            }

            for (const v of p.variants || []) {
                if (v?.batch_no) {
                    batchMap.set(String(v.batch_no).trim().toLowerCase(), {
                        product: p,
                        variant: v,
                    });
                }

                if (v?.sku) {
                    skuMap.set(String(v.sku).trim().toLowerCase(), {
                        product: p,
                        variant: v,
                    });
                }

                for (const identifier of v.identifiers || []) {
                    const identifierValue = String(
                        identifier?.identifier_value || ""
                    ).trim().toLowerCase();

                    if (identifierValue) {
                        identifierMap.set(identifierValue, {
                            product: p,
                            variant: v,
                            identifier,
                        });
                    }
                }
            }
        }

        return { batchMap, skuMap, productCodeMap, identifierMap };
    }, [catalog]);

    const handleBarcodeScan = useCallback(
        (raw) => {
            const code = String(raw || "").trim();
            if (!code) return;

            const key = code.toLowerCase();
            setScanError("");

            const byBatch = scanIndex.batchMap.get(key);
            if (byBatch) {
                addToCart(byBatch.product, byBatch.variant);
                return;
            }

            const byIdentifier = scanIndex.identifierMap.get(key);
            if (byIdentifier) {
                addToCart(byIdentifier.product, byIdentifier.variant);
                return;
            }

            const bySku = scanIndex.skuMap.get(key);
            if (bySku) {
                addToCart(bySku.product, bySku.variant);
                return;
            }

            const byProductCode = scanIndex.productCodeMap.get(key);
            if (byProductCode) {
                setSearch(byProductCode.name || "");
                setPage(1);
                return;
            }

            setScanError(`No match found for: ${code}`);
        },
        [scanIndex, addToCart]
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

            if (isTypingField) return;
            if (e.ctrlKey || e.altKey || e.metaKey) return;

            const now = Date.now();

            if (e.key === "Enter") {
                if (barcodeRefNew.current.length > 0) {
                    e.preventDefault();
                    handleBarcodeScan(barcodeRefNew.current);
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
    }, [handleBarcodeScan]);

    // ---------------- Form ----------------
    const form = useForm({
        customer_id: null,
        customer_name: null,
        phone: null,
        sale_date: saleDate,
        notes: notes,
        items: [],
        vat_rate: 0,
        discount_rate: 0,
        flat_discount: 0,
        paid_amount: 0,
        grand_amount: 0,
        due_amount: 0,
        sub_amount: 0,
        type: "pos",
        pickup_items: [],
        supplier_id: null,
        account_id: "",
        adjust_from_advance: false,
        advance_adjustment: 0,
        payment_status: "unpaid",
        discount_type: 'flat_discount',
    });

    // ---------------- Totals ----------------
    const subTotal = useMemo(() => cart.reduce((sum, i) => sum + n(i.total_price), 0), [cart]);
    const pickupSubTotal = useMemo(
        () => pickupItems.reduce((sum, i) => sum + n(i.total_price), 0),
        [pickupItems]
    );
    const totalSubTotal = useMemo(() => subTotal + pickupSubTotal, [subTotal, pickupSubTotal]);
    const taxAmount = useMemo(() => (totalSubTotal * n(taxRate)) / 100, [totalSubTotal, taxRate]);

    const discountAmount = useMemo(() => {
        if (form.data.discount_type === 'percentage') {
            return (totalSubTotal * n(discountValue)) / 100;
        } else {
            return n(discountValue);
        }
    }, [totalSubTotal, discountValue, form.data.discount_type]);

    const grandTotal = useMemo(
        () => totalSubTotal + taxAmount - discountAmount,
        [totalSubTotal, taxAmount, discountAmount]
    );

    useEffect(() => {
        if (!manualPaymentOverride) {
            if (paymentStatus === "paid") {
                setPaidAmount(grandTotal);
                setPartialPayment(false);
            } else if (paymentStatus === "unpaid") {
                setPaidAmount(0);
                setPartialPayment(false);
                setSelectedAccount("");
            } else if (paymentStatus === "partial") {
                setPartialPayment(true);
                if (paidAmount === 0 || paidAmount >= grandTotal) setPaidAmount(grandTotal * 0.5);
            }
        }
    }, [grandTotal, paymentStatus, manualPaymentOverride]);

    useEffect(() => {
        if (manualPaymentOverride) {
            if (paidAmount === 0) {
                setPaymentStatus("unpaid");
                setPartialPayment(false);
            } else if (paidAmount >= grandTotal) {
                setPaymentStatus("paid");
                setPartialPayment(false);
            } else {
                setPaymentStatus("partial");
                setPartialPayment(true);
            }
        }
    }, [paidAmount, grandTotal, manualPaymentOverride]);

    const dueAmount = useMemo(() => Math.max(0, grandTotal - n(paidAmount)), [grandTotal, paidAmount]);

    const handlePickupProductChange = (productId) => {
        setPickupProductId(productId);

        const p = products?.find((x) => String(x.id) === String(productId));
        setPickupProductName(p?.name || "");

        const vars = p?.variants || [];
        setPickupVariants(vars);
        setPickupVariantId("");
    };

    // ---------------- Form Sync ----------------
    useEffect(() => {
        const formattedItems = cart.map((i) => ({
            product_id: i.product_id,
            variant_id: i.variant_id,
            stock_id: i.stock_id,
            batch_no: i.batch_no,
            quantity: n(i.qty),
            unit_quantity: n(i.qty),
            unit: i.unit || "piece",
            unit_price: n(i.unit_price),
            total_price: n(i.total_price),
            shadow_sell_price: n(i.shadow_unit_price),
            identifier_ids: (getSelectedIdentifierValues(i.key) || [])
                .filter((value) => value !== "" && value !== null && value !== undefined)
                .map((value) => Number(value))
                .filter(Boolean),
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

        const walkIn = !customerId && !customerName.trim() && !customerPhone.trim();

        let discountRate = 0;
        let flatDiscount = 0;

        if (form.data.discount_type === 'percentage') {
            discountRate = n(discountValue);
            flatDiscount = 0;
        } else {
            discountRate = 0;
            flatDiscount = n(discountValue);
        }

        form.setData({
            ...form.data,
            customer_id: customerId && customerId !== "01" ? customerId : null,
            customer_name: walkIn
                ? null
                : customerId && customerId !== "01"
                    ? null
                    : customerName.trim() || null,
            phone: walkIn
                ? null
                : customerId && customerId !== "01"
                    ? null
                    : customerPhone.trim() || null,
            items: formattedItems,
            pickup_items: formattedPickupItems,
            vat_rate: n(taxRate),
            discount_rate: discountRate,
            flat_discount: flatDiscount,
            discount_type: form.data.discount_type,
            paid_amount: n(paidAmount),
            grand_amount: n(grandTotal),
            due_amount: n(dueAmount),
            sub_amount: n(totalSubTotal),
            account_id: selectedAccount || "",
            payment_status: paymentStatus,
            supplier_id: selectedSupplier?.id || null,
            installment_duration: installmentDuration,
            total_installments: totalInstallments,
            sale_date: saleDate,
            notes: notes,
            type: "pos",
        });
    }, [
        cart,
        pickupItems,
        installmentDuration,
        totalInstallments,
        customerId,
        customerName,
        customerPhone,
        taxRate,
        discountValue,
        form.data.discount_type,
        totalSubTotal,
        grandTotal,
        paidAmount,
        dueAmount,
        selectedAccount,
        paymentStatus,
        selectedSupplier,
        saleDate,
        notes,
    ]);

    // ---------------- Pickup Functions ----------------
    const addPickupItem = () => {
        if (!pickupProductId || !pickupSupplierId) {
            alert("Please select product and supplier");
            return;
        }

        if (!pickupVariantId) {
            alert("Please select variant");
            return;
        }

        const variantObj = pickupVariants?.find(
            (v) => String(v.id) === String(pickupVariantId)
        );

        const newItem = {
            id: Date.now(),
            product_name: pickupProductName,
            pickup_product_id: pickupProductId,
            pickup_supplier_id: pickupSupplierId,
            variant_id: pickupVariantId,
            variant_label: variantObj?.sku || `Variant#${pickupVariantId}`,
            quantity: Number(pickupQuantity),
            unit_price: Number(pickupUnitPrice),
            sale_price: Number(pickupSalePrice),
            total_price: Number(pickupQuantity) * Number(pickupSalePrice),
        };

        setPickupItems([...pickupItems, newItem]);

        setPickupSupplierId("");
        setPickupProductId("");
        setPickupProductName("");
        setPickupVariants([]);
        setPickupVariantId("");
        setPickupQuantity(1);
        setPickupUnitPrice(0);
        setPickupSalePrice(0);
        setShowPickupModal(false);
    };

    const removePickupItem = (index) => {
        setPickupItems((prev) => prev.filter((_, i) => i !== index));
    };

    // ---------------- Payment Functions ----------------
    const handlePaymentStatusChange = (status) => {
        setPaymentStatus(status);
        setManualPaymentOverride(false);

        if (status === "paid") {
            setPaidAmount(grandTotal);
            setPartialPayment(false);
            setTotalInstallments(0);
            setInstallmentDuration(0);
        } else if (status === "unpaid") {
            setPaidAmount(0);
            setPartialPayment(false);
            setTotalInstallments(0);
            setInstallmentDuration(0);
        } else if (status === "partial") {
            setPaidAmount(grandTotal / 2);
            setPartialPayment(true);
            setTotalInstallments(0);
            setInstallmentDuration(0);
        } else if (status === "installment") {
            setPaidAmount(grandTotal / 3);
            setPartialPayment(false);
            setTotalInstallments(3);
            setInstallmentDuration(3);
        }
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

    const handlePaidAmountChange = (value) => {
        const v = n(value);
        setPaidAmount(v);
        setManualPaymentOverride(true);

        if (v === 0) {
            setPaymentStatus("unpaid");
            setPartialPayment(false);
        } else if (v >= grandTotal) {
            setPaymentStatus("paid");
            setPartialPayment(false);
        } else {
            setPaymentStatus("partial");
            setPartialPayment(true);
        }
    };

    const enableManualPaymentOverride = () => setManualPaymentOverride(true);

    const disableManualPaymentOverride = () => {
        setManualPaymentOverride(false);
        if (paymentStatus === "paid") setPaidAmount(grandTotal);
        if (paymentStatus === "unpaid") {
            setPaidAmount(0);
            setSelectedAccount("");
        }
        if (paymentStatus === "partial") {
            if (paidAmount === 0 || paidAmount >= grandTotal) setPaidAmount(grandTotal * 0.5);
        }
    };

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

    const isAccountDisabled = paymentStatus === "unpaid";
    const selectedAccountObj = selectedAccount
        ? accounts.find((acc) => String(acc.id) === String(selectedAccount))
        : null;

    // ---------------- Submit ----------------
    const submit = (e) => {
        e.preventDefault();

        if (!cart.length && !pickupItems.length) return alert("Add at least 1 product");
        if (paymentStatus !== "unpaid" && !selectedAccount)
            return alert("Select a payment account for payment");

        const hasOne =
            (!!customerName.trim() && !customerPhone.trim()) ||
            (!customerName.trim() && !!customerPhone.trim());
        if (!customerId && hasOne)
            return alert("If you type customer info, provide both Name and Phone. Otherwise keep walk-in empty.");

        const outOfStockItems = cart.filter((item) => {
            const selectedUnit = selectedUnits[item.key] || item.unit;
            if (item.product_unit_type && item.product_unit_type !== "piece") {
                const requestedBaseQty = convertToBase(item.qty, selectedUnit, item.product_unit_type);
                return requestedBaseQty > item.base_quantity;
            }
            return item.qty > item.maxQty;
        });

        const trackedInvalidItems = cart.filter((item) => {
            if (!item.is_tracking_enabled) return false;

            const qty = parseInt(item.qty || 0, 10);
            const selected = (getSelectedIdentifierValues(item.key) || []).filter(Boolean);
            const unique = new Set(selected.map(String));

            if ((item.unit || "piece") !== "piece") return true;
            if (qty <= 0) return true;
            if (selected.length !== qty) return true;
            if (unique.size !== selected.length) return true;

            return false;
        });

        if (trackedInvalidItems.length > 0) {
            alert("Please select valid IMEI / Serial for all tracked items");
            return;
        }

        if (outOfStockItems.length > 0) {
            const itemNames = outOfStockItems
                .map((item) => {
                    const selectedUnit = selectedUnits[item.key] || item.unit;
                    return `${item.name} (Requested: ${item.qty} ${selectedUnit.toUpperCase()})`;
                })
                .join(", ");
            alert(`Some items exceed available stock: ${itemNames}`);
            return;
        }

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

        form.post(route("salesPos.store"), {
            onError: (errors) => {
                console.error(errors);
                alert(errors?.error || "Sale create failed. Check fields.");
            },
        });
    };

    // ---------------- UI ----------------
    return (
        <div className="bg-white rounded-box p-5">
            <PageHeader title="POS Checkout" subtitle="Create sale with modern POS layout">
                <button onClick={() => router.visit(route("salesPos.index"))} className="btn btn-sm btn-ghost">
                    <ArrowLeft size={15} /> Back
                </button>
            </PageHeader>

            <form onSubmit={submit} className="mt-4">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* LEFT COLUMN - Product Catalog */}
                    <div className="lg:col-span-8">
                        <div className="card border border-gray-200 rounded-2xl shadow-sm">
                            <div className="card-body p-4">
                                <div className="flex flex-col md:flex-row justify-between gap-4 mb-6">
                                    <div>
                                        <h2 className="text-xl font-bold text-gray-800">Product</h2>
                                    </div>

                                    <div className="flex flex-col md:flex-row items-start md:items-center gap-3">
                                        <div className="join">
                                            <select
                                                className="select select-bordered join-item select-sm"
                                                value={categoryFilter}
                                                onChange={(e) => {
                                                    setCategoryFilter(e.target.value);
                                                    setPage(1);
                                                }}
                                            >
                                                {categories.map((c) => (
                                                    <option key={c} value={c}>
                                                        {c}
                                                    </option>
                                                ))}
                                            </select>

                                            <select
                                                className="select select-bordered join-item select-sm"
                                                value={brandFilter}
                                                onChange={(e) => {
                                                    setBrandFilter(e.target.value);
                                                    setPage(1);
                                                }}
                                            >
                                                {brands.map((b) => (
                                                    <option key={b} value={b}>
                                                        {b}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className="relative">
                                            <Search size={18} className="absolute left-3 top-2.5 text-gray-400" />
                                            <input
                                                ref={barcodeRef}
                                                className="input input-bordered input-sm w-full md:w-64 pl-10"
                                                placeholder="Search / scan by product, batch, IMEI, serial..."
                                                value={search}
                                                onChange={(e) => {
                                                    setSearch(e.target.value);
                                                    setPage(1);
                                                }}
                                            />
                                        </div>

                                        <button
                                            type="button"
                                            className="btn btn-sm btn-outline"
                                            onClick={() => {
                                                setSearch("");
                                                setCategoryFilter("All Categories");
                                                setBrandFilter("All Brands");
                                                setPage(1);
                                            }}
                                            title="Reset"
                                        >
                                            <RefreshCw size={14} />
                                        </button>
                                    </div>
                                </div>

                                {/* Products grid */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                    {pagedCatalog.map((p) => (
                                        <div
                                            key={p.id}
                                            className="card card-compact border border-gray-200 rounded-xl hover:shadow-md transition-shadow hover:border-primary/50"
                                        >
                                            <figure className="h-36 bg-gray-50 flex items-center justify-center overflow-hidden rounded-t-xl">
                                                {p.image ? (
                                                    <img
                                                        src={p.image}
                                                        alt={p.name}
                                                        className="h-full w-full object-contain p-4"
                                                        onError={(e) => {
                                                            e.currentTarget.onerror = null;
                                                            e.currentTarget.src = "/media/uploads/logo.png";
                                                        }}
                                                    />
                                                ) : (
                                                    <img
                                                        src="/media/uploads/logo.png"
                                                        alt={p.name}
                                                        className="h-full w-full object-contain p-4 opacity-50"
                                                    />
                                                )}
                                            </figure>

                                            <div className="card-body p-4">
                                                <h3 className="card-title text-sm font-semibold text-gray-800 line-clamp-2">
                                                    {p.name}
                                                </h3>

                                                <div className="text-xs text-gray-500 mb-2">
                                                    <div className="truncate">{p.product_no || "No code"}</div>
                                                    <div className="flex justify-between mt-1">
                                                        <span>{p.variants?.[0]?.variant_label}</span>
                                                        {p.unit_type && p.unit_type !== "piece" && (
                                                            <span className="text-blue-600 font-medium">
                                                                {p.default_unit?.toUpperCase() || "PIECE"}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <div className="text-lg font-bold text-primary">
                                                            {money(p.minPrice ?? 0)}
                                                        </div>
                                                        <div className="text-xs text-success font-medium flex items-center gap-1">
                                                            <Package size={10} />
                                                            <span>Stock: {formatCurrency(p.totalStock)}</span>
                                                        </div>
                                                    </div>

                                                    <div className="dropdown dropdown-end">
                                                        <button
                                                            type="button"
                                                            className="btn btn-circle btn-primary btn-sm"
                                                            onClick={() => {
                                                                if (p.variants.length === 1) handleVariantSelect(p, p.variants[0]);
                                                            }}
                                                        >
                                                            <Plus size={18} />
                                                        </button>

                                                        {p.variants.length > 1 && (
                                                            <ul className="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-64 overflow-y-auto max-h-64">
                                                                <li className="menu-title text-xs font-bold p-2">Select Variant</li>
                                                                {p.variants.map((variant, idx) => (
                                                                    <li key={idx}>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => handleVariantSelect(p, variant)}
                                                                            className="flex justify-between items-center py-2 px-3 hover:bg-gray-50"
                                                                        >
                                                                            <div className="text-left">
                                                                                <div className="font-medium text-sm">
                                                                                    {variant.variant_label}
                                                                                </div>
                                                                                <div className="text-xs text-gray-500">
                                                                                    Batch: {variant.batch_no || "N/A"}
                                                                                </div>
                                                                            </div>
                                                                            <div className="text-right">
                                                                                <div className="font-bold text-primary text-sm">
                                                                                    {money(variant.sale_price)}
                                                                                </div>
                                                                                <div className="text-xs text-gray-500">
                                                                                    {formatCurrency(variant.quantity)}{" "}
                                                                                    {variant.purchase_unit?.toUpperCase()}
                                                                                </div>
                                                                            </div>
                                                                        </button>
                                                                    </li>
                                                                ))}
                                                            </ul>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Pagination */}
                                <div className="mt-8 flex items-center justify-between border-t pt-4">
                                    <div className="text-sm text-gray-500">
                                        Showing {(page - 1) * pageSize + 1} to{" "}
                                        {Math.min(page * pageSize, filteredCatalog.length)} of{" "}
                                        {filteredCatalog.length} products
                                    </div>

                                    <div className="join">
                                        <button
                                            type="button"
                                            className="join-item btn btn-sm"
                                            disabled={page <= 1}
                                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                                        >
                                            <ChevronLeft size={16} />
                                        </button>

                                        <button className="join-item btn btn-sm btn-active pointer-events-none">
                                            Page {page}
                                        </button>

                                        <button
                                            type="button"
                                            className="join-item btn btn-sm"
                                            disabled={page >= totalPages}
                                            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                        >
                                            <ChevronRight size={16} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* RIGHT COLUMN - Checkout */}
                    <div className="lg:col-span-4">
                        <div className="space-y-6">
                            {/* Checkout Summary */}
                            <div className="card border border-gray-200 rounded-2xl shadow-sm">
                                <div className="card-body p-0">
                                    <div className="p-2">
                                        {!cart.length && !pickupItems.length ? (
                                            <div className="py-12 text-center bg-white">
                                                <Package size={48} className="mx-auto text-gray-300 mb-3" />
                                                <div className="font-medium text-gray-500">No items added</div>
                                                <div className="text-sm text-gray-400 mt-1">
                                                    Select products from the catalog
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                                                {/* Stock items */}
                                                {cart.map((i) => {
                                                    const availableUnitsList = availableUnits[i.key] || [i.unit || "piece"];
                                                    const selectedUnit = selectedUnits[i.key] || i.unit || "piece";
                                                    const unitQuantity = unitQuantities[i.key] || i.qty || 1;
                                                    const unitPrice = unitPrices[i.key] || i.unit_price;
                                                    const selectedForItem = getSelectedIdentifierValues(i.key);
                                                    return (
                                                        <div
                                                            key={i.key}
                                                            className="p-3 border border-gray-200 rounded-lg hover:border-primary/50 hover:bg-gray-50 transition-colors"
                                                        >
                                                            <div className="flex items-start justify-between gap-3">
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="font-semibold text-gray-900 truncate">{i.name}</div>
                                                                    <div className="text-xs text-gray-600 truncate mt-1">
                                                                        {i.variant_label}
                                                                        {i.batch_no && ` • ${i.batch_no}`}
                                                                    </div>

                                                                    {availableUnitsList.length > 1 && (
                                                                        <div
                                                                            className="mt-2 relative"
                                                                            ref={(el) => (dropdownRefs.current[i.key] = el)}
                                                                        >
                                                                            <button
                                                                                type="button"
                                                                                className="btn btn-xs btn-outline border-gray-300 hover:bg-gray-100 flex items-center gap-1"
                                                                                onClick={() =>
                                                                                    setUnitDropdownOpen((prev) => ({
                                                                                        ...prev,
                                                                                        [i.key]: !prev[i.key],
                                                                                    }))
                                                                                }
                                                                            >
                                                                                <Ruler size={10} />
                                                                                <span>{selectedUnit.toUpperCase()}</span>
                                                                                <ChevronDown size={10} />
                                                                            </button>

                                                                            {unitDropdownOpen[i.key] && (
                                                                                <div className="absolute left-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-10 min-w-[120px]">
                                                                                    {availableUnitsList.map((unit) => (
                                                                                        <button
                                                                                            key={unit}
                                                                                            type="button"
                                                                                            className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-100 flex items-center justify-between ${selectedUnit === unit ? "bg-blue-50 text-blue-600" : ""
                                                                                                }`}
                                                                                            onClick={() => handleUnitChange(i.key, unit)}
                                                                                        >
                                                                                            <span>{unit.toUpperCase()}</span>
                                                                                            {selectedUnit === unit && <Check size={12} />}
                                                                                        </button>
                                                                                    ))}
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    )}

                                                                    <div className="mt-2 flex items-center gap-2">
                                                                        <button
                                                                            type="button"
                                                                            className="btn btn-xs btn-square btn-outline border-gray-300 hover:bg-gray-100"
                                                                            onClick={() => changeQty(i.key, n(i.qty) - 1)}
                                                                        >
                                                                            <Minus size={12} className="text-gray-700" />
                                                                        </button>

                                                                        <input
                                                                            className="input input-bordered input-xs !w-[100px] text-center font-medium"
                                                                            type="number"
                                                                            value={unitQuantity}
                                                                            min={1}
                                                                            onChange={(e) => changeQty(i.key, Number(e.target.value))}
                                                                        />

                                                                        <button
                                                                            style={{ zIndex: "99999999999" }}
                                                                            type="button"
                                                                            className="btn btn-xs btn-square btn-outline border-gray-300 hover:bg-gray-100"
                                                                            onClick={() =>
                                                                                changeQty(
                                                                                    i.key,
                                                                                    n(i.qty) + (i.is_tracking_enabled ? 1 : (i.is_fraction_allowed ? 0.001 : 1))
                                                                                )
                                                                            }
                                                                        >
                                                                            <Plus size={12} className="text-gray-700" />
                                                                        </button>
                                                                    </div>

                                                                    <div className="text-xs text-gray-500 mt-1">
                                                                        Available: {formatCurrency(i.maxQty)}{" "}
                                                                        {i.original_purchase_unit?.toUpperCase()}
                                                                    </div>
                                                                </div>

                                                                <div className="text-right">
                                                                    <div className="font-bold text-gray-900 text-lg">{money(i.total_price)}</div>
                                                                    <div className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded mt-1">
                                                                        {money(unitPrice)}/{selectedUnit.toUpperCase()}
                                                                    </div>
                                                                    <button
                                                                        type="button"
                                                                        className="btn btn-ghost btn-xs mt-10 text-red-600 hover:text-red-700 hover:bg-red-50 me-1"
                                                                        onClick={() => removeCartItem(i.key)}
                                                                    >
                                                                        <Trash2 size={12} />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                            {i.is_tracking_enabled && (
                                                                <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
                                                                    <div className="flex items-center justify-between mb-2">
                                                                        <h4 className="text-sm font-semibold text-amber-800">
                                                                            Select {i.tracking_type === "imei" ? "IMEI" : "Serial"}
                                                                        </h4>
                                                                        <span className="text-xs text-amber-700">
                                                                            Required: {Number(i.qty || 0)}
                                                                        </span>
                                                                    </div>

                                                                    <div className="grid grid-cols-1 gap-2">
                                                                        {Array.from({ length: Number(i.qty || 0) }).map((_, slotIndex) => (
                                                                            <div key={`${i.key}-identifier-${slotIndex}`}>
                                                                                <label className="label py-1">
                                                                                    <span className="label-text text-xs font-medium">
                                                                                        {i.tracking_type === "imei" ? "IMEI" : "Serial"} #{slotIndex + 1}
                                                                                    </span>
                                                                                </label>

                                                                                <select
                                                                                    className="select select-bordered select-sm w-full"
                                                                                    value={selectedForItem[slotIndex] || ""}
                                                                                    onChange={(e) =>
                                                                                        updateSelectedIdentifier(i.key, slotIndex, e.target.value)
                                                                                    }
                                                                                >
                                                                                    <option value="">
                                                                                        Select {i.tracking_type === "imei" ? "IMEI" : "Serial"}
                                                                                    </option>

                                                                                    {(i.available_identifiers || []).map((identifier) => {
                                                                                        const alreadySelected = selectedForItem.some(
                                                                                            (value, idx) =>
                                                                                                idx !== slotIndex &&
                                                                                                String(value) === String(identifier.id)
                                                                                        );

                                                                                        return (
                                                                                            <option
                                                                                                key={identifier.id}
                                                                                                value={identifier.id}
                                                                                                disabled={alreadySelected}
                                                                                            >
                                                                                                {identifier.identifier_value}
                                                                                            </option>
                                                                                        );
                                                                                    })}
                                                                                </select>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}

                                                {/* Pickup items */}
                                                {pickupItems.map((item, index) => (
                                                    <div
                                                        key={item.id}
                                                        className="p-3 border border-yellow-200 rounded-lg bg-yellow-50 hover:bg-yellow-100"
                                                    >
                                                        <div className="flex items-start justify-between gap-3">
                                                            <div className="flex-1">
                                                                <div className="font-semibold text-gray-900 flex items-center gap-1">
                                                                    <ShoppingBag size={12} className="text-orange-500" />
                                                                    {item.product_name}
                                                                </div>
                                                                <div className="text-xs text-gray-600 mt-1">
                                                                    Qty: <span className="font-medium">{item.quantity}</span> ×{" "}
                                                                    <span className="font-medium">{money(item.sale_price)}</span>
                                                                </div>
                                                            </div>

                                                            <div className="text-right">
                                                                <div className="font-bold text-gray-900 text-lg">
                                                                    {money(item.total_price)}
                                                                </div>
                                                                <button
                                                                    type="button"
                                                                    className="btn btn-ghost btn-xs text-red-600 hover:text-red-700 hover:bg-red-50 mt-2"
                                                                    onClick={() => removePickupItem(index)}
                                                                >
                                                                    <Trash2 size={12} />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {/* Add pickup */}
                                        <div className="mt-4 px-4 pb-4">
                                            <button
                                                type="button"
                                                onClick={() => setShowPickupModal(true)}
                                                className="btn btn-outline w-full btn-sm"
                                            >
                                                <Plus size={14} className="mr-2" />
                                                Add Pickup Item
                                            </button>
                                        </div>
                                    </div>

                                    {/* Totals */}
                                    <div className="px-2 py-3 border-t bg-gray-50">
                                        <div className="space-y-2 mb-3">
                                            <div className="flex justify-between items-center">
                                                <span className="text-gray-600">Stock Items:</span>
                                                <span className="font-medium">{money(subTotal)}</span>
                                            </div>

                                            {pickupItems.length > 0 && (
                                                <div className="flex justify-between items-center">
                                                    <span className="text-gray-600">Pickup Items:</span>
                                                    <span className="font-medium">{money(pickupSubTotal)}</span>
                                                </div>
                                            )}

                                            <div className="border-t pt-2">
                                                <div className="flex justify-between items-center">
                                                    <span className="text-gray-700 font-medium">Subtotal:</span>
                                                    <span className="font-semibold">{money(totalSubTotal)}</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Tax and Discount Section */}
                                        <div className="grid grid-cols-2 gap-2 mb-3">
                                            <div className="form-control">
                                                <label className="label py-1">
                                                    <span className="label-text text-xs flex items-center gap-1">
                                                        <Percent size={10} /> Tax %
                                                    </span>
                                                </label>
                                                <input
                                                    type="number"
                                                    className="input input-bordered input-sm"
                                                    value={taxRate}
                                                    onChange={(e) => setTaxRate(n(e.target.value))}
                                                    placeholder="0"
                                                    min="0"
                                                    step="0.1"
                                                />
                                            </div>

                                            <div className="form-control">
                                                <label className="label py-1">
                                                    <span className="label-text text-xs flex items-center gap-1">
                                                        <CreditCard size={10} /> Discount Type
                                                    </span>
                                                </label>
                                                <select
                                                    className="select select-bordered select-sm"
                                                    value={form.data.discount_type}
                                                    onChange={(e) => form.setData('discount_type', e.target.value)}
                                                >
                                                    <option value="flat_discount">Flat Discount</option>
                                                    <option value="percentage">Percentage</option>
                                                </select>
                                            </div>
                                        </div>

                                        <div className="form-control mb-3">
                                            <label className="label py-1">
                                                <span className="label-text text-xs flex items-center gap-1">
                                                    <Percent size={10} />
                                                    {form.data.discount_type === 'percentage' ? 'Discount Percentage' : 'Discount Amount'}
                                                </span>
                                            </label>
                                            <input
                                                type="number"
                                                className="input input-bordered input-sm"
                                                value={discountValue}
                                                onChange={(e) => setDiscountValue(n(e.target.value))}
                                                placeholder={form.data.discount_type === 'percentage' ? 'Enter discount %' : 'Enter discount amount'}
                                            // min="0"
                                            // step={form.data.discount_type === 'percentage' ? "0.1" : "0.01"}
                                            />
                                        </div>

                                        {discountValue > 0 && (
                                            <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded-lg mb-3">
                                                {form.data.discount_type === 'percentage' ? (
                                                    <div className="flex justify-between">
                                                        <span>Discount ({discountValue}%):</span>
                                                        <span className="font-semibold text-green-600">
                                                            -{money((totalSubTotal * discountValue) / 100)}
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <div className="flex justify-between">
                                                        <span>Flat Discount:</span>
                                                        <span className="font-semibold text-green-600">
                                                            -{money(discountValue)}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        <div className="mt-3 pt-3 border-t">
                                            <div className="flex justify-between items-center text-lg font-bold">
                                                <span>GRAND TOTAL:</span>
                                                <span className="text-primary">{money(grandTotal)}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Order Info */}
                            <div className="card border border-gray-200 rounded-2xl shadow-sm">
                                <div className="card-body p-4">
                                    <h2 className="text-lg font-bold flex items-center gap-2 mb-4 text-gray-800">
                                        <FileText size={20} /> Order Information
                                    </h2>

                                    <div className="space-y-4">
                                        <div className="form-control">
                                            <label className="label py-1">
                                                <span className="label-text flex items-center gap-2">
                                                    <Calendar size={14} /> Sale Date
                                                </span>
                                            </label>
                                            <input
                                                type="date"
                                                className="input input-bordered"
                                                value={saleDate}
                                                onChange={(e) => setSaleDate(e.target.value)}
                                            />
                                        </div>

                                        <div className="form-control">
                                            <label className="label py-1">
                                                <span className="label-text flex items-center gap-2">
                                                    <User size={14} /> Customer
                                                </span>
                                            </label>
                                            <select
                                                className="select select-bordered"
                                                value={customerId}
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    setCustomerId(val);
                                                    setShowManualCustomerFields(val === "01");
                                                }}
                                            >
                                                <option value="">Walk In Customer</option>
                                                <option value="01">+ Add New Customer</option>
                                                {customers.map((c) => (
                                                    <option key={c.id} value={c.id}>
                                                        {c.customer_name} ({c.phone})
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        {showManualCustomerFields && (
                                            <div className="space-y-3 bg-gray-50 p-3 rounded-lg border">
                                                <div className="form-control">
                                                    <label className="label py-1">
                                                        <span className="label-text">Customer Name *</span>
                                                    </label>
                                                    <input
                                                        className="input input-bordered"
                                                        placeholder="Enter customer name"
                                                        value={customerName}
                                                        onChange={(e) => setCustomerName(e.target.value)}
                                                        required
                                                    />
                                                </div>

                                                <div className="form-control">
                                                    <label className="label py-1">
                                                        <span className="label-text">Phone Number *</span>
                                                    </label>
                                                    <input
                                                        className="input input-bordered"
                                                        placeholder="Enter phone number"
                                                        value={customerPhone}
                                                        onChange={(e) => setCustomerPhone(e.target.value)}
                                                        required
                                                    />
                                                </div>
                                            </div>
                                        )}

                                        {selectedCustomer && (
                                            <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <div className="font-medium text-blue-800">
                                                            {selectedCustomer.customer_name}
                                                        </div>
                                                        <div className="text-sm text-blue-600">{selectedCustomer.phone}</div>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setCustomerId("");
                                                            setSelectedCustomer(null);
                                                            setCustomerName("");
                                                            setCustomerPhone("");
                                                        }}
                                                        className="btn btn-xs btn-ghost text-blue-600"
                                                    >
                                                        <X size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Payment */}
                            <div className="card bg-white border border-gray-200 rounded-xl shadow-sm">
                                <div className="card-body p-3">
                                    <div className="flex justify-between items-center mb-3">
                                        <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                                            <CreditCard size={16} className="text-green-600" />
                                            Payment
                                        </h3>

                                        <button
                                            type="button"
                                            onClick={manualPaymentOverride ? disableManualPaymentOverride : enableManualPaymentOverride}
                                            className="btn btn-xs bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300"
                                        >
                                            {manualPaymentOverride ? <X size={12} /> : <Edit size={12} />}
                                            {manualPaymentOverride ? "Cancel" : "Manual"}
                                        </button>
                                    </div>

                                    <div className="space-y-3">
                                        <div className="form-control">
                                            <label className="label py-0">
                                                <span className="label-text text-xs text-gray-600 font-semibold">
                                                    Payment Account *
                                                </span>
                                            </label>
                                            <select
                                                className="select select-bordered select-sm w-full bg-white border-gray-300 text-gray-800"
                                                value={selectedAccount}
                                                onChange={(e) => setSelectedAccount(e.target.value)}
                                                required={paymentStatus !== "unpaid"}
                                                disabled={isAccountDisabled}
                                            >
                                                <option value="">Select Account</option>
                                                {accounts.map((account) => (
                                                    <option key={account.id} value={account.id}>
                                                        {account.name} — ৳ {formatCurrency(account.current_balance)}
                                                    </option>
                                                ))}
                                            </select>

                                            {isAccountDisabled && (
                                                <p className="text-[11px] text-gray-500 mt-1">
                                                    Account disabled for unpaid status
                                                </p>
                                            )}
                                        </div>

                                        {selectedAccountObj && !isAccountDisabled && (
                                            <div className="p-2 rounded-lg bg-gray-50 border border-gray-200">
                                                <div className="flex justify-between items-center text-xs">
                                                    <div className="flex items-center gap-2 text-gray-700">
                                                        {getAccountIcon(selectedAccountObj.type)}
                                                        <span className="font-medium">{selectedAccountObj.name}</span>
                                                    </div>
                                                    <span className="font-semibold">
                                                        ৳ {formatCurrency(selectedAccountObj.current_balance)}
                                                    </span>
                                                </div>
                                            </div>
                                        )}

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            <div className="form-control">
                                                <label className="label py-0">
                                                    <span className="label-text text-xs text-gray-600 font-semibold">
                                                        Payment Status *
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

                                            <div className="form-control">
                                                <label className="label py-0">
                                                    <span className="label-text text-xs text-gray-600 font-semibold">
                                                        Paid Amount
                                                    </span>
                                                </label>
                                                <input
                                                    type="number"
                                                    // 
                                                    className="input input-bordered input-sm w-full bg-white border-gray-300 text-gray-800"
                                                    value={paidAmount}
                                                    onChange={(e) => handlePaidAmountChange(e.target.value)}
                                                    disabled={!manualPaymentOverride && paymentStatus === "unpaid"}
                                                    // min={0}
                                                    max={grandTotal}
                                                />
                                            </div>
                                        </div>

                                        {paymentStatus === 'installment' && (
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
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

                                        <div className="pt-2 border-t border-gray-200 space-y-1 text-xs">
                                            <div className="flex justify-between">
                                                <span className="text-gray-500">Total</span>
                                                <span className="font-semibold">{money(grandTotal)}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-500">Paid</span>
                                                <span className="font-semibold text-green-600">
                                                    {money(paidAmount)}
                                                </span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-500">Due</span>
                                                <span
                                                    className={`font-semibold ${dueAmount > 0 ? "text-red-600" : "text-green-600"
                                                        }`}
                                                >
                                                    {money(dueAmount)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="space-y-3">
                                <button
                                    type="submit"
                                    className="btn text-white w-full btn-lg"
                                    style={{ backgroundColor: "#1e4d2b" }}
                                    disabled={form.processing || (!cart.length && !pickupItems.length)}
                                >
                                    {form.processing ? (
                                        <>
                                            <span className="loading loading-spinner loading-sm"></span>
                                            Processing...
                                        </>
                                    ) : (
                                        <>
                                            Complete Sale
                                            <span className="ml-2 font-bold">{money(grandTotal)}</span>
                                        </>
                                    )}
                                </button>

                                <button type="button" className="btn btn-outline w-full" onClick={() => router.visit(route("salesPos.index"))}>
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Form errors */}
                {Object.keys(form.errors || {}).length > 0 && (
                    <div className="mt-4 alert alert-error">
                        <div className="flex items-center gap-2">
                            <AlertCircle size={16} />
                            <div>
                                <div className="font-bold">Validation error</div>
                                <div className="text-sm opacity-90">
                                    {Object.values(form.errors).slice(0, 3).join(" | ")}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </form>

            {/* Pickup Modal */}
            {showPickupModal && (
                <div className="modal modal-open">
                    <div className="modal-box max-w-md">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-bold flex items-center gap-2">
                                <ShoppingBag size={20} /> Add Pickup Item
                            </h3>
                            <button onClick={() => setShowPickupModal(false)} className="btn btn-sm btn-circle btn-ghost">
                                ✖
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
                                            {product.name}({product.product_no}) [{product.unit_type} unit]
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
                                    <option value="">Select Supplier</option>
                                    {suppliers.map((supplier) => (
                                        <option key={supplier.id} value={supplier.id}>
                                            {supplier.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
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
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <div className="form-control">
                                    <label className="label">
                                        <span className="label-text">Sale Price (৳) *</span>
                                    </label>
                                    <input
                                        type="number"
                                        className="input input-bordered"
                                        value={pickupSalePrice}
                                        onChange={(e) => setPickupSalePrice(e.target.value)}
                                        min="0"

                                        placeholder="0.00"
                                        required
                                    />
                                </div>

                                <div className="form-control">
                                    <label className="label">
                                        <span className="label-text">Total Amount</span>
                                    </label>
                                    <div className="input input-bordered bg-gray-100 font-bold text-center">
                                        ৳ {formatCurrency(n(pickupQuantity) * n(pickupSalePrice))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="modal-action">
                            <button onClick={() => setShowPickupModal(false)} className="btn btn-ghost">
                                Cancel
                            </button>
                            <button onClick={addPickupItem} className="btn btn-primary">
                                Add Item
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}