import React, { useEffect, useState, useCallback } from "react";
import { useForm, router } from "@inertiajs/react";
import {
    Trash,
    X,
    Plus,
    Factory,
    Package,
    Image as ImageIcon,
    Ruler,
    Hash,
    LayoutGrid,
    Settings2,
    Info,
    ShieldCheck,
    Search,
} from "lucide-react";
import { toast } from "react-toastify";
import { useTranslation } from "../../hooks/useTranslation";

export default function AddProduct({ category, update, brand, attributes, errors: serverErrors }) {
    const { t, locale } = useTranslation();

    const [variants, setVariants] = useState([]);
    const [formErrors, setFormErrors] = useState({});
    const [categories, setCategories] = useState([]);
    const [brands, setBrands] = useState([]);
    const [availableAttributes, setAvailableAttributes] = useState([]);
    const [productType, setProductType] = useState("regular");
    const [variantAttributeSelector, setVariantAttributeSelector] = useState(null);
    const [photoPreview, setPhotoPreview] = useState(null);

    // Search state for attributes in the main variants card
    const [attributeSearchTerm, setAttributeSearchTerm] = useState("");

    // Separate search states for modal
    const [attributeKeySearchTerm, setAttributeKeySearchTerm] = useState("");
    const [attributeValueSearchTerm, setAttributeValueSearchTerm] = useState("");

    const [unitsByType] = useState({
        piece: ["piece", "dozen", "box"],
        weight: ["ton", "kg", "gram", "pound"],
        volume: ["liter", "ml"],
        length: ["meter", "cm", "mm"],
    });

    const [warrantyDurationTypes] = useState([
        { value: "day", label: "Day(s)" },
        { value: "month", label: "Month(s)" },
        { value: "year", label: "Year(s)" },
    ]);

    const productForm = useForm({
        id: update?.id || "",
        type: update?.type || "global",
        product_name: update?.name || "",
        brand_id: update?.brand_id || "",
        category_id: update?.category_id || "",
        product_no: update?.product_no || "",
        description: update?.description || "",
        product_type: update?.product_type || "regular",
        in_house_cost: update?.in_house_cost || 0,
        in_house_shadow_cost: update?.in_house_shadow_cost || 0,
        in_house_sale_price: update?.in_house_sale_price || 0,
        in_house_shadow_sale_price: update?.in_house_shadow_sale_price || 0,
        in_house_initial_stock: update?.in_house_initial_stock || 0,
        unit_type: update?.unit_type || "piece",
        default_unit: update?.default_unit || "piece",
        is_fraction_allowed: typeof update?.is_fraction_allowed === "boolean" ? update.is_fraction_allowed : true,
        min_sale_unit: update?.min_sale_unit || "",
        has_warranty: Boolean(update?.has_warranty) || false,
        warranty_duration: update?.warranty_duration || "",
        warranty_duration_type: update?.warranty_duration_type || "month",
        warranty_terms: update?.warranty_terms || "",

        is_tracking_enabled: Boolean(update?.is_tracking_enabled) || false,
        tracking_type: update?.tracking_type || "",

        variants: [],
        photo: null,
    });

    const generateProductCode = useCallback(
        (productName) => {
            if (update || !productName) return "";
            const words = productName.trim().split(" ");
            let code =
                words.length === 1
                    ? words[0].substring(0, 6).toUpperCase()
                    : words
                        .slice(0, 2)
                        .map((w) => w.charAt(0))
                        .join("")
                        .toUpperCase();
            return `${code}-${Date.now().toString().slice(-4)}`;
        },
        [update]
    );

    // ✅ helper: normalize attribute_values (object always)
    const normalizeAttrValues = (attrs) => {
        let result = attrs ?? {};
        if (typeof result === "string") {
            try {
                result = JSON.parse(result);
            } catch {
                result = {};
            }
        }
        if (!result || Array.isArray(result) || typeof result !== "object") result = {};
        return result;
    };

    useEffect(() => {
        if (serverErrors) setFormErrors(serverErrors);

        setCategories(Array.isArray(category) ? category : []);
        setBrands(Array.isArray(brand) ? brand : []);
        setAvailableAttributes(attributes || []);

        if (update) {
            setProductType(update.product_type || "regular");

            const mapped =
                update.variants?.map((v) => ({
                    id: v.id,
                    attribute_values: normalizeAttrValues(v.attribute_values),
                })) || [];

            // ✅ keep at least 1 variant UI row
            setVariants(mapped.length ? mapped : [{ attribute_values: {} }]);
        } else {
            setVariants([{ attribute_values: {} }]);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [category, brand, attributes, update, serverErrors]);

    const formSubmit = (e) => {
        e.preventDefault();

        // If variants is empty, add one default variant UI row
        let variantsToSend = variants;
        if (!variantsToSend || variantsToSend.length === 0) {
            variantsToSend = [{ id: null, attribute_values: {} }];
            setVariants(variantsToSend);
        }

        const formattedVariants = variantsToSend.map((variant) => ({
            id: variant.id || null,
            attribute_values: normalizeAttrValues(variant.attribute_values),
        }));

        const formData = new FormData();

        // Add all regular fields
        Object.keys(productForm.data).forEach((key) => {
            if (key !== "variants" && key !== "photo") {
                formData.append(key, productForm.data[key] ?? "");
            }
        });

        formData.append("variants", JSON.stringify(formattedVariants));

        if (productForm.data.photo) {
            formData.append("photo", productForm.data.photo);
        }

        router.post(update ? route("product.add.post") : route("product.add.post"), formData, {
            preserveScroll: true,
            onSuccess: () => toast.success(t("Product Saved!")),
            onError: (errors) => {
                console.error("Form errors:", errors);
                setFormErrors(errors);
                toast.error(t("Error saving product"));
            },
        });
    };

    // Filter attributes based on key search term
    const getFilteredAttributesByKey = () => {
        if (!attributeKeySearchTerm.trim()) return availableAttributes;

        const searchLower = attributeKeySearchTerm.toLowerCase();
        return availableAttributes.filter(
            (attr) => attr.name.toLowerCase().includes(searchLower) || String(attr.code || "").toLowerCase().includes(searchLower)
        );
    };

    // Filter values based on value search term
    const getFilteredValues = (values) => {
        if (!attributeValueSearchTerm.trim()) return values || [];

        const searchLower = attributeValueSearchTerm.toLowerCase();
        return (values || []).filter((val) => String(val.value || "").toLowerCase().includes(searchLower));
    };

    return (
        <div className={`min-h-screen bg-slate-50 pb-20 ${locale === "bn" ? "bangla-font" : ""}`}>
            {/* STICKY TOP BAR */}
            <div className="sticky top-0 z-40 w-full bg-white/80 backdrop-blur-md border-b mb-6 px-6 py-4">
                <div className="max-w-[1400px] mx-auto flex flex-wrap justify-between items-center gap-4">
                    <div className="flex items-center gap-3">
                        <div className="bg-primary p-2 rounded-lg text-white shadow-md shadow-primary/20">
                            <LayoutGrid size={20} />
                        </div>
                        <div>
                            <h1 className="text-lg font-bold leading-none">{update ? t("Update Product") : t("Create Product")}</h1>
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider italic">
                                {productType} mode
                            </span>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button type="button" onClick={() => window.history.back()} className="btn btn-sm btn-ghost font-bold">
                            {t("Cancel")}
                        </button>
                        <button className="btn btn-sm btn-primary px-8 shadow-lg shadow-primary/20" disabled={productForm.processing} onClick={formSubmit}>
                            {productForm.processing ? <span className="loading loading-spinner loading-xs"></span> : t("Save Changes")}
                        </button>
                    </div>
                </div>
            </div>

            <form id="product-form" onSubmit={formSubmit} className="max-w-[1400px] mx-auto px-4 grid grid-cols-12 gap-6">
                {/* LEFT COLUMN: Basic & Supply */}
                <div className="col-span-12 lg:col-span-4 space-y-6">
                    {/* General Info Card */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="bg-slate-50 px-5 py-3 border-b flex items-center gap-2">
                            <Info size={16} className="text-primary" />
                            <span className="text-xs font-bold uppercase tracking-widest text-slate-600">{t("Product Identity")}</span>
                        </div>

                        <div className="p-5 space-y-4">
                            <div className="form-control">
                                <label className="label py-1">
                                    <span className="label-text text-xs font-bold">{t("Product Name")}*</span>
                                </label>
                                <input
                                    type="text"
                                    className="input input-bordered input-sm w-full"
                                    value={productForm.data.product_name}
                                    onChange={(e) => {
                                        productForm.setData("product_name", e.target.value);
                                        if (!update) productForm.setData("product_no", generateProductCode(e.target.value));
                                    }}
                                />
                                {formErrors.product_name && <span className="text-error text-xs mt-1">{formErrors.product_name}</span>}
                            </div>

                            {/* Product Type radio */}
                            <div className="form-control">
                                <label className="label py-1">
                                    <span className="label-text text-xs font-bold">{t("Select your Product Type")} *</span>
                                </label>

                                <div className="flex gap-4">
                                    {["local", "global"].map((type) => (
                                        <label
                                            key={type}
                                            className={`flex items-center gap-2 cursor-pointer px-3 py-1 rounded-md border ${productForm.data.type === type
                                                ? "border-primary text-primary bg-primary/5"
                                                : "border-gray-300 text-slate-600"
                                                }`}
                                        >
                                            <input
                                                type="radio"
                                                name="type"
                                                value={type}
                                                checked={productForm.data.type === type}
                                                onChange={() => productForm.setData("type", type)}
                                                className="radio radio-xs hidden"
                                            />
                                            <span className="text-sm font-medium">{type}</span>
                                        </label>
                                    ))}
                                </div>

                                {formErrors.type && <span className="text-error text-xs mt-1 block">{formErrors.type}</span>}
                            </div>

                            <div className="form-control">
                                <label className="label py-1">
                                    <span className="label-text text-xs font-bold">{t("Product Code")}*</span>
                                </label>
                                <div className="join w-full">
                                    <input
                                        type="text"
                                        className="input input-bordered input-sm join-item w-full bg-slate-50"
                                        value={productForm.data.product_no}
                                        onChange={(e) => productForm.setData("product_no", e.target.value)}
                                    />
                                    <span className="join-item btn btn-sm bg-slate-100 border-slate-200 px-2">
                                        <Hash size={14} />
                                    </span>
                                </div>
                                {formErrors.product_no && <span className="text-error text-xs mt-1">{formErrors.product_no}</span>}
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="form-control">
                                    <label className="label py-1">
                                        <span className="label-text text-xs font-bold">{t("Category")}</span>
                                    </label>
                                    <select
                                        className="select select-bordered select-sm"
                                        value={productForm.data.category_id}
                                        onChange={(e) => productForm.setData("category_id", e.target.value)}
                                    >
                                        <option value="">{t("Select")}</option>
                                        {categories.map((c) => (
                                            <option key={c.id} value={c.id}>
                                                {c.name}
                                            </option>
                                        ))}
                                    </select>
                                    {formErrors.category_id && <span className="text-error text-xs mt-1">{formErrors.category_id}</span>}
                                </div>

                                <div className="form-control">
                                    <label className="label py-1">
                                        <span className="label-text text-xs font-bold">{t("Brand")}</span>
                                    </label>
                                    <select
                                        className="select select-bordered select-sm"
                                        value={productForm.data.brand_id}
                                        onChange={(e) => productForm.setData("brand_id", e.target.value)}
                                    >
                                        <option value="">{t("Select")}</option>
                                        {brands.map((b) => (
                                            <option key={b.id} value={b.id}>
                                                {b.name}
                                            </option>
                                        ))}
                                    </select>
                                    {formErrors.brand_id && <span className="text-error text-xs mt-1">{formErrors.brand_id}</span>}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* MIDDLE COLUMN: Measurement & Financial */}
                <div className="col-span-12 lg:col-span-4 space-y-6">
                    {/* Units Card */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="bg-slate-50 px-5 py-3 border-b flex items-center gap-2">
                            <Ruler size={16} className="text-primary" />
                            <span className="text-xs font-bold uppercase tracking-widest text-slate-600">{t("Unit Management")}</span>
                        </div>

                        <div className="p-5 space-y-4">
                            <div className="flex flex-wrap gap-1">
                                {Object.keys(unitsByType).map((type) => (
                                    <button
                                        key={type}
                                        type="button"
                                        onClick={() => {
                                            productForm.setData("unit_type", type);
                                            productForm.setData("default_unit", unitsByType[type][0]);
                                            productForm.setData("min_sale_unit", unitsByType[type][0]);
                                        }}
                                        className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase transition-all ${productForm.data.unit_type === type
                                            ? "bg-primary text-white"
                                            : "bg-slate-100 text-slate-400 hover:bg-slate-200"
                                            }`}
                                    >
                                        {type}
                                    </button>
                                ))}
                            </div>

                            <div className="grid grid-cols-2 gap-3 pt-2">
                                <div className="form-control">
                                    <label className="label py-1">
                                        <span className="label-text text-xs font-bold text-slate-500">{t("Purchase Unit")}</span>
                                    </label>
                                    <select
                                        className="select select-bordered select-sm"
                                        value={productForm.data.default_unit}
                                        onChange={(e) => productForm.setData("default_unit", e.target.value)}
                                    >
                                        {unitsByType[productForm.data.unit_type]?.map((u) => (
                                            <option key={u} value={u}>
                                                {u.toUpperCase()}
                                            </option>
                                        ))}
                                    </select>
                                    {formErrors.default_unit && <span className="text-error text-xs mt-1">{formErrors.default_unit}</span>}
                                </div>

                                <div className="form-control">
                                    <label className="label py-1">
                                        <span className="label-text text-xs font-bold text-slate-500">{t("Sales Unit")}</span>
                                    </label>
                                    <select
                                        className="select select-bordered select-sm"
                                        value={productForm.data.min_sale_unit}
                                        onChange={(e) => productForm.setData("min_sale_unit", e.target.value)}
                                    >
                                        <option value="">{t("Select")}</option>
                                        {unitsByType[productForm.data.unit_type]?.map((u) => (
                                            <option key={u} value={u}>
                                                {u.toUpperCase()}
                                            </option>
                                        ))}
                                    </select>
                                    {formErrors.min_sale_unit && <span className="text-error text-xs mt-1">{formErrors.min_sale_unit}</span>}
                                </div>
                            </div>

                            <label className="flex items-center gap-2 cursor-pointer p-2 bg-slate-50 rounded-lg border border-slate-100">
                                <input
                                    type="checkbox"
                                    className="checkbox checkbox-xs checkbox-primary"
                                    checked={!!productForm.data.is_fraction_allowed}
                                    onChange={(e) => productForm.setData("is_fraction_allowed", e.target.checked)}
                                />
                                <span className="text-xs font-bold text-slate-600">{t("Allow Fractional Sales")}</span>
                            </label>

                            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                                <div className="bg-slate-50 px-5 py-3 border-b flex items-center gap-2">
                                    <Package size={16} className="text-primary" />
                                    <span className="text-xs font-bold uppercase tracking-widest text-slate-600">
                                        {t("Device Tracking")}
                                    </span>
                                </div>

                                <div className="p-5 space-y-4">
                                    <label className="flex items-center gap-3 cursor-pointer p-3 bg-slate-50 rounded-xl border border-slate-100">
                                        <input
                                            type="checkbox"
                                            className="toggle toggle-primary"
                                            checked={!!productForm.data.is_tracking_enabled}
                                            onChange={(e) => {
                                                const checked = e.target.checked;
                                                productForm.setData("is_tracking_enabled", checked);

                                                if (checked) {
                                                    productForm.setData("unit_type", "piece");
                                                    productForm.setData("default_unit", "piece");
                                                    productForm.setData("min_sale_unit", "piece");
                                                    productForm.setData("is_fraction_allowed", false);
                                                } else {
                                                    productForm.setData("tracking_type", "");
                                                }
                                            }}
                                        />
                                        <div className="flex-1">
                                            <span className="text-sm font-bold text-slate-700 block">
                                                {t("Enable IMEI / Serial Tracking")}
                                            </span>
                                            <span className="text-xs text-slate-500">
                                                {t("Use this for mobile, laptop, desktop, computer accessories with unique serials")}
                                            </span>
                                        </div>
                                    </label>

                                    {productForm.data.is_tracking_enabled && (
                                        <div className="form-control">
                                            <label className="label py-1">
                                                <span className="label-text text-xs font-bold">{t("Tracking Type")}</span>
                                            </label>

                                            <div className="flex gap-4">
                                                {["imei", "serial"].map((type) => (
                                                    <label
                                                        key={type}
                                                        className={`flex items-center gap-2 cursor-pointer px-3 py-2 rounded-md border ${productForm.data.tracking_type === type
                                                                ? "border-primary text-primary bg-primary/5"
                                                                : "border-gray-300 text-slate-600"
                                                            }`}
                                                    >
                                                        <input
                                                            type="radio"
                                                            name="tracking_type"
                                                            value={type}
                                                            checked={productForm.data.tracking_type === type}
                                                            onChange={() => productForm.setData("tracking_type", type)}
                                                            className="radio radio-xs hidden"
                                                        />
                                                        <span className="text-sm font-medium uppercase">{type}</span>
                                                    </label>
                                                ))}
                                            </div>

                                            {formErrors.tracking_type && (
                                                <span className="text-error text-xs mt-1">{formErrors.tracking_type}</span>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {formErrors.is_fraction_allowed && <span className="text-error text-xs mt-1">{formErrors.is_fraction_allowed}</span>}
                        </div>
                    </div>

                    {/* In-House Pricing Card */}
                    {productType === "in_house" && (
                        <div className="bg-white rounded-2xl border-2 border-warning/20 shadow-sm overflow-hidden animate-in slide-in-from-top-4 duration-300">
                            <div className="bg-warning/5 px-5 py-3 border-b border-warning/10 flex items-center gap-2">
                                <Factory size={16} className="text-warning" />
                                <span className="text-xs font-bold uppercase tracking-widest text-warning/80">{t("Production Costs")}</span>
                            </div>

                            <div className="p-5 grid grid-cols-2 gap-4">
                                {[
                                    { k: "in_house_cost", l: "Cost" },
                                    { k: "in_house_sale_price", l: "Price" },
                                ].map((field) => (
                                    <div key={field.k} className="form-control">
                                        <label className="label py-0">
                                            <span className="label-text text-[10px] font-black text-slate-400 uppercase">{t(field.l)}</span>
                                        </label>
                                        <input
                                            type="number"
                                            className="input input-sm input-bordered font-bold"
                                            value={productForm.data[field.k]}
                                            onChange={(e) => productForm.setData(field.k, e.target.value)}
                                        />
                                        {formErrors[field.k] && <span className="text-error text-xs mt-1">{formErrors[field.k]}</span>}
                                    </div>
                                ))}

                                <div className="form-control col-span-2">
                                    <label className="label py-0">
                                        <span className="label-text text-[10px] font-black text-slate-400 uppercase">{t("Initial Stock Quantity")}</span>
                                    </label>
                                    <input
                                        type="number"
                                        className="input input-sm input-bordered font-bold"
                                        value={productForm.data.in_house_initial_stock}
                                        onChange={(e) => productForm.setData("in_house_initial_stock", e.target.value)}
                                    />
                                    {formErrors.in_house_initial_stock && (
                                        <span className="text-error text-xs mt-1">{formErrors.in_house_initial_stock}</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* RIGHT COLUMN: Media, Variants & Warranty */}
                <div className="col-span-12 lg:col-span-4 space-y-6">
                    {/* Image Card */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
                        <div className="flex justify-between items-center mb-4">
                            <span className="text-[10px] font-black uppercase text-slate-400">{t("Product Media")}</span>
                            <label className="btn btn-xs btn-outline btn-primary px-4">
                                {t("Upload")}
                                <input
                                    type="file"
                                    className="hidden"
                                    accept="image/*"
                                    onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (!file) return;
                                        productForm.setData("photo", file);
                                        setPhotoPreview(URL.createObjectURL(file));
                                    }}
                                />
                            </label>
                        </div>

                        <div className="w-full aspect-video rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center overflow-hidden">
                            {photoPreview || (update?.photo && `/storage/${update.photo}`) ? (
                                <img src={photoPreview || `/storage/${update.photo}`} className="w-full h-full object-contain" alt="preview" />
                            ) : (
                                <ImageIcon size={32} className="text-slate-200" />
                            )}
                        </div>
                        {formErrors.photo && <span className="text-error text-xs mt-2 block">{formErrors.photo}</span>}
                    </div>

                    {/* Warranty Card */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="bg-slate-50 px-5 py-3 border-b flex items-center gap-2">
                            <ShieldCheck size={16} className="text-primary" />
                            <span className="text-xs font-bold uppercase tracking-widest text-slate-600">{t("Warranty Information")}</span>
                        </div>

                        <div className="p-5 space-y-4">
                            <label className="flex items-center gap-3 cursor-pointer p-3 bg-slate-50 rounded-xl border border-slate-100 hover:bg-slate-100 transition-colors">
                                <input
                                    type="checkbox"
                                    className="toggle toggle-primary"
                                    checked={!!productForm.data.has_warranty}
                                    onChange={(e) => productForm.setData("has_warranty", e.target.checked)}
                                />
                                <div className="flex-1">
                                    <span className="text-sm font-bold text-slate-700 block">{t("Has Warranty")}</span>
                                    <span className="text-xs text-slate-500">{t("Enable warranty for this product")}</span>
                                </div>
                            </label>

                            {productForm.data.has_warranty && (
                                <>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="form-control">
                                            <label className="label py-1">
                                                <span className="label-text text-xs font-bold">{t("Duration")}</span>
                                            </label>
                                            <input
                                                type="number"
                                                className="input input-bordered input-sm"
                                                placeholder="e.g., 12"
                                                min="1"
                                                value={productForm.data.warranty_duration}
                                                onChange={(e) => productForm.setData("warranty_duration", e.target.value)}
                                            />
                                            {formErrors.warranty_duration && <span className="text-error text-xs mt-1">{formErrors.warranty_duration}</span>}
                                        </div>

                                        <div className="form-control">
                                            <label className="label py-1">
                                                <span className="label-text text-xs font-bold">{t("Duration Type")}</span>
                                            </label>
                                            <select
                                                className="select select-bordered select-sm"
                                                value={productForm.data.warranty_duration_type}
                                                onChange={(e) => productForm.setData("warranty_duration_type", e.target.value)}
                                            >
                                                {warrantyDurationTypes.map((type) => (
                                                    <option key={type.value} value={type.value}>
                                                        {t(type.label)}
                                                    </option>
                                                ))}
                                            </select>
                                            {formErrors.warranty_duration_type && (
                                                <span className="text-error text-xs mt-1">{formErrors.warranty_duration_type}</span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="form-control">
                                        <label className="label py-1">
                                            <span className="label-text text-xs font-bold">{t("Warranty Terms & Conditions")}</span>
                                        </label>
                                        <textarea
                                            className="textarea textarea-bordered textarea-sm w-full"
                                            placeholder={t("Enter warranty terms, conditions, coverage details...")}
                                            rows="4"
                                            value={productForm.data.warranty_terms}
                                            onChange={(e) => productForm.setData("warranty_terms", e.target.value)}
                                        />
                                        <div className="text-xs text-slate-500 mt-1">{t("Describe what is covered, what's not, claim process, etc.")}</div>
                                        {formErrors.warranty_terms && <span className="text-error text-xs mt-1">{formErrors.warranty_terms}</span>}
                                    </div>

                                    <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
                                        <span className="text-[10px] font-black uppercase text-primary/60 block mb-1">{t("Warranty Summary")}</span>
                                        <div className="text-sm font-bold text-slate-700">
                                            {productForm.data.warranty_duration && productForm.data.warranty_duration_type ? (
                                                <>
                                                    {productForm.data.warranty_duration}{" "}
                                                    {t(warrantyDurationTypes.find((x) => x.value === productForm.data.warranty_duration_type)?.label)}
                                                </>
                                            ) : (
                                                <span className="text-slate-400 italic">{t("Duration not specified")}</span>
                                            )}
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Variants Card */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col min-h-[400px]">
                        <div className="bg-slate-50 px-5 py-3 border-b flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Settings2 size={16} className="text-primary" />
                                <span className="text-xs font-bold uppercase tracking-widest text-slate-600">{t("Variants")}</span>
                            </div>

                            <button type="button" onClick={() => setVariants([...variants, { attribute_values: {} }])} className="btn btn-xs btn-primary btn-circle">
                                <Plus size={16} />
                            </button>
                        </div>

                        {/* Optional search input in main variants card */}
                        <div className="px-4 pt-4">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={16} />
                                <input
                                    type="text"
                                    placeholder={t("Search selected attributes...")}
                                    className="input input-bordered input-sm w-full pl-9 rounded"
                                    value={attributeSearchTerm}
                                    onChange={(e) => setAttributeSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="p-4 space-y-3 flex-1 overflow-y-auto max-h-[500px]">
                            {variants.map((variant, idx) => (
                                <div key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded-xl group transition-all hover:bg-white hover:shadow-md">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-[10px] font-bold text-slate-300 uppercase italic">#{idx + 1}</span>
                                        <button type="button" onClick={() => setVariants(variants.filter((_, i) => i !== idx))} className="text-slate-300 hover:text-error transition-colors">
                                            <Trash size={12} />
                                        </button>
                                    </div>

                                    <div className="flex flex-wrap gap-1 mb-3">
                                        {Object.entries(normalizeAttrValues(variant.attribute_values))
                                            .filter(([attr, val]) => {
                                                if (!attributeSearchTerm) return true;
                                                const s = attributeSearchTerm.toLowerCase();
                                                return String(attr).toLowerCase().includes(s) || String(val).toLowerCase().includes(s);
                                            })
                                            .map(([attr, val]) => (
                                                <div key={attr} className="px-2 py-0.5 bg-white border border-slate-200 rounded text-[9px] font-bold">
                                                    <span className="text-primary/50">{attr}:</span> {val}
                                                </div>
                                            ))}
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => setVariantAttributeSelector(idx)}
                                        className="btn btn-xs btn-block btn-outline border-slate-300 rounded-lg text-[10px] uppercase font-black"
                                    >
                                        {t("Configure Logic")}
                                    </button>
                                </div>
                            ))}
                        </div>

                        {formErrors.variants && <span className="text-error text-xs p-4">{formErrors.variants}</span>}
                    </div>
                </div>

                {/* ATTRIBUTE SELECTOR (Centered Modal) */}
                {variantAttributeSelector !== null && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 overflow-y-auto">
                        <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col">
                            <div className="p-6 bg-slate-50 border-b flex justify-between items-center">
                                <h4 className="font-bold text-slate-700">{t("Set Attributes")}</h4>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setVariantAttributeSelector(null);
                                        setAttributeKeySearchTerm("");
                                        setAttributeValueSearchTerm("");
                                    }}
                                    className="btn btn-sm btn-circle btn-ghost"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            {/* Search bar for Attribute Keys */}
                            <div className="px-6 py-3 border-b bg-white space-y-3">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={16} />
                                    <input
                                        type="text"
                                        placeholder={t("Search attribute names...")}
                                        className="input input-bordered input-sm w-full pl-9 rounded"
                                        value={attributeKeySearchTerm}
                                        onChange={(e) => setAttributeKeySearchTerm(e.target.value)}
                                    />
                                </div>

                                {/* (Optional) Value search - uncomment if you want */}
                                {/* 
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={16} />
                                    <input
                                        type="text"
                                        placeholder={t("Search attribute values...")}
                                        className="input input-bordered input-sm w-full pl-9 rounded"
                                        value={attributeValueSearchTerm}
                                        onChange={(e) => setAttributeValueSearchTerm(e.target.value)}
                                    />
                                </div>
                                */}
                            </div>

                            <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
                                {getFilteredAttributesByKey().map((attr) => {
                                    const filteredValues = getFilteredValues(attr.active_values || []);

                                    if (attributeValueSearchTerm && filteredValues.length === 0) {
                                        return null;
                                    }

                                    const currentAttrs = normalizeAttrValues(variants?.[variantAttributeSelector]?.attribute_values);

                                    return (
                                        <div key={attr.code} className="space-y-3">
                                            <h5 className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
                                                {attr.name}
                                            </h5>

                                            <div className="w-full space-y-3">
                                                <div className="flex flex-wrap gap-2">
                                                    {filteredValues.map((val) => {
                                                        const isSelected = currentAttrs?.[attr.code] === val.value;

                                                        return (
                                                            <button
                                                                key={val.id}
                                                                type="button"
                                                                onClick={() => {
                                                                    // ✅ FIX: deep clone, no mutation
                                                                    setVariants((prev) => {
                                                                        const next = (prev || []).map((v) => ({
                                                                            ...v,
                                                                            attribute_values: normalizeAttrValues(v.attribute_values),
                                                                        }));

                                                                        const idx = variantAttributeSelector;
                                                                        if (idx === null || idx === undefined) return next;
                                                                        if (!next[idx]) next[idx] = { attribute_values: {} };

                                                                        next[idx] = {
                                                                            ...next[idx],
                                                                            attribute_values: {
                                                                                ...normalizeAttrValues(next[idx].attribute_values),
                                                                                [attr.code]: val.value,
                                                                            },
                                                                        };

                                                                        return next;
                                                                    });
                                                                }}
                                                                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${isSelected
                                                                    ? "bg-primary text-white shadow-md shadow-primary/20"
                                                                    : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                                                                    }`}
                                                            >
                                                                {val.value}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}

                                {getFilteredAttributesByKey().length === 0 && (
                                    <div className="text-center py-8 text-slate-400">{t("No matching attributes found")}</div>
                                )}
                            </div>

                            <div className="p-6 border-t bg-slate-50 text-right">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setVariantAttributeSelector(null);
                                        setAttributeKeySearchTerm("");
                                        setAttributeValueSearchTerm("");
                                    }}
                                    className="btn btn-primary px-10 rounded-xl font-bold"
                                >
                                    {t("Done")}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </form>
        </div>
    );
}
