// resources/js/Pages/purchases/PurchaseShow.jsx

import React, { useMemo } from "react";
import { router, usePage } from "@inertiajs/react";
import { ArrowLeft, Printer, Download } from "lucide-react";

export default function PurchaseShow({ purchase, isShadowUser = false, businessProfile }) {
    const { auth } = usePage().props;

    const resolveAssetUrl = (path) => {
        if (!path) return "";
        if (typeof path !== "string") return "";
        if (path.startsWith("http://") || path.startsWith("https://")) return path;
        if (path.startsWith("/")) return path;
        return `/storage/${path}`;
    };

    const profile = businessProfile || {};

    const businessName = profile?.name || "";
    const businessEmail = profile?.email || "";
    const businessPhone = profile?.phone || "";
    const businessSecondPhone = profile?.secondary_phone || profile?.phone_2 || "";
    const businessAddress = profile?.address || "";
    const businessWebsite = profile?.website || "";
    const businessFacebook =
        profile?.facebook ||
        profile?.facebook_page ||
        profile?.fb_page ||
        "Variant";

    const businessLogo =
        resolveAssetUrl(profile?.logo) ||
        resolveAssetUrl(profile?.thum) ||
        "";

    const brandPolicyName = businessName || "VARIANT";

    const items = purchase?.items || [];

    const toNum = (value) => {
        if (value === null || value === undefined || value === "") return 0;
        const number = Number(value);
        return Number.isFinite(number) ? number : 0;
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(toNum(amount));
    };

    const formatDate = (dateString) => {
        if (!dateString) return "";

        const date = new Date(dateString);

        return date.toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
        });
    };

    const formatDateTimeForInvoice = (dateString) => {
        if (!dateString) return { datePart: "", timePart: "" };

        const date = new Date(dateString);

        const datePart = date.toLocaleDateString("en-US", {
            month: "long",
            day: "2-digit",
            year: "numeric",
        });

        const timePart = date.toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
        });

        return {
            datePart,
            timePart,
        };
    };

    const capitalizeText = (value) => {
        if (!value) return "";
        return String(value)
            .replace(/_/g, " ")
            .replace(/-/g, " ")
            .replace(/\b\w/g, (char) => char.toUpperCase());
    };

    const getPurchaseAmount = (field) => {
        if (isShadowUser) {
            if (field === "grand_total") return purchase?.shadow_grand_total ?? purchase?.grand_total ?? 0;
            if (field === "paid_amount") return purchase?.shadow_paid_amount ?? purchase?.paid_amount ?? 0;
            if (field === "due_amount") return purchase?.shadow_due_amount ?? purchase?.due_amount ?? 0;
        }

        return purchase?.[field] ?? 0;
    };

    const getPrice = (item, field) => {
        if (isShadowUser) {
            if (field === "unit_price") return item?.shadow_unit_price ?? item?.unit_price ?? 0;
            if (field === "total_price") return item?.shadow_total_price ?? item?.total_price ?? 0;
            if (field === "sale_price") return item?.shadow_sale_price ?? item?.sale_price ?? 0;
        }

        return item?.[field] ?? 0;
    };

    const getSupplierName = () => {
        return (
            purchase?.supplier?.company ||
            purchase?.supplier?.name ||
            purchase?.supplier?.contact_person ||
            "Supplier"
        );
    };

    const getSupplierNumber = () => {
        return (
            purchase?.supplier?.phone ||
            purchase?.supplier?.mobile ||
            purchase?.supplier_phone ||
            ""
        );
    };

    const getSupplierAddress = () => {
        return (
            purchase?.supplier?.address ||
            purchase?.warehouse?.address ||
            purchase?.supplier_address ||
            ""
        );
    };

    const getPaymentMethod = () => {
        return capitalizeText(
            purchase?.payment_type ||
            purchase?.payment_method ||
            purchase?.payments?.[0]?.payment_type ||
            "Cash"
        );
    };

    const getProductDisplayName = (item) => {
        return (
            item?.product?.name ||
            item?.product_name ||
            item?.description ||
            item?.name ||
            "N/A"
        );
    };

    const getVariantDisplayName = (item) => {
        const variant = item?.variant;

        if (
            variant?.attribute_values &&
            typeof variant.attribute_values === "object"
        ) {
            return Object.values(variant.attribute_values)
                .filter(Boolean)
                .join(", ");
        }

        return (
            variant?.attribute_values ||
            item?.variant_name ||
            variant?.name ||
            ""
        );
    };

    const getBrandName = (item) => {
        return (
            item?.product?.brand?.name ||
            item?.brand?.name ||
            item?.product?.brand ||
            item?.brand_name ||
            ""
        );
    };

    const getItemIdentifiers = (item) => {
        if (Array.isArray(item?.identifiers)) {
            return item.identifiers;
        }

        if (item?.stock?.identifiers && Array.isArray(item.stock.identifiers)) {
            return item.stock.identifiers;
        }

        if (Array.isArray(item?.stock_identifiers)) {
            return item.stock_identifiers;
        }

        return [];
    };

    const getItemExtraDetails = (item) => {
        const details = [];

        const variant = getVariantDisplayName(item);
        const brand = getBrandName(item);

        if (variant) {
            details.push(`Variant- ${variant}`);
        }

        if (brand) {
            details.push(`Brand- ${brand}`);
        }

        if (item?.battery_health) {
            details.push(`Battery Health- ${item.battery_health}`);
        }

        const identifiers = getItemIdentifiers(item);

        identifiers.forEach((identifier) => {
            if (identifier?.identifier_type && identifier?.identifier_value) {
                details.push(
                    `${String(identifier.identifier_type).toUpperCase()} : ${identifier.identifier_value}`
                );
            }
        });

        return details.join(", ");
    };

    const rowTotal = (item) => {
        const backendTotal = toNum(
            getPrice(item, "total_price") ||
            item?.subtotal ||
            item?.amount ||
            item?.total ||
            0
        );

        if (backendTotal > 0) {
            return backendTotal;
        }

        const qty = toNum(item?.quantity || item?.qty || 0);
        const unitPrice = toNum(getPrice(item, "unit_price") || item?.price || item?.rate || 0);

        return qty * unitPrice;
    };

    const invoiceDateTime = useMemo(() => {
        return formatDateTimeForInvoice(purchase?.purchase_date || purchase?.created_at);
    }, [purchase]);

    const subTotal = useMemo(() => {
        if (purchase?.sub_total !== null && purchase?.sub_total !== undefined) {
            return toNum(purchase.sub_total);
        }

        if (purchase?.subtotal !== null && purchase?.subtotal !== undefined) {
            return toNum(purchase.subtotal);
        }

        return items.reduce((total, item) => total + rowTotal(item), 0);
    }, [purchase, items]);

    const vatAmount = useMemo(() => {
        if (purchase?.vat_amount !== null && purchase?.vat_amount !== undefined) {
            return toNum(purchase.vat_amount);
        }

        if (purchase?.tax_amount !== null && purchase?.tax_amount !== undefined) {
            return toNum(purchase.tax_amount);
        }

        return 0;
    }, [purchase]);

    const transportationCost = useMemo(() => {
        return toNum(purchase?.transportation_cost || purchase?.shipping_cost || 0);
    }, [purchase]);

    const grandTotal = useMemo(() => {
        if (getPurchaseAmount("grand_total") !== null && getPurchaseAmount("grand_total") !== undefined) {
            const amount = toNum(getPurchaseAmount("grand_total"));
            if (amount > 0) return amount;
        }

        return subTotal + vatAmount + transportationCost;
    }, [purchase, subTotal, vatAmount, transportationCost, isShadowUser]);

    const paidAmount = useMemo(() => {
        return toNum(getPurchaseAmount("paid_amount"));
    }, [purchase, isShadowUser]);

    const dueAmount = useMemo(() => {
        if (getPurchaseAmount("due_amount") !== null && getPurchaseAmount("due_amount") !== undefined) {
            return toNum(getPurchaseAmount("due_amount"));
        }

        return Math.max(grandTotal - paidAmount, 0);
    }, [purchase, grandTotal, paidAmount, isShadowUser]);

    const warrantyPolicyLines = [
        {
            type: "paragraph",
            text: `For all devices with official brand warranty, customers will receive all warranty services according to the respective brand’s own warranty policy. Customers can claim warranty services from the brand’s official customer care center by presenting the purchase invoice provided by ${brandPolicyName}.`,
        },
        {
            type: "paragraph-bold",
            text: `For devices covered under ${brandPolicyName} warranty, customers will receive the following after-sales services:`,
        },
        {
            type: "heading",
            text: "20 Days Replacement Warranty",
        },
        {
            type: "bullet",
            text: "A 20-day replacement warranty is provided from the date of purchase for any device-related issue.",
        },
        {
            type: "bullet",
            text: "If the phone becomes completely dead within this period, the replacement process may take 15–90 working days.",
        },
        {
            type: "bullet",
            text: "No replacement warranty will be applicable for software-related issues.",
        },
        {
            type: "bullet",
            text: `All issues must be visibly demonstrated in front of ${brandPolicyName} authorities.`,
        },
        {
            type: "bullet",
            text: "Replacement warranty is applicable only once.",
        },
        {
            type: "bullet",
            text: "For replacement eligibility, the device, box, and all accessories must remain intact and undamaged.",
        },
        {
            type: "bullet",
            text: "Devices with any scratches or dents will not qualify for replacement warranty.",
        },
        {
            type: "heading",
            text: "02 Years’ Service Warranty",
        },
        {
            type: "bullet",
            text: "After the 20-day replacement warranty period, a 2-year service warranty will be applicable.",
        },
        {
            type: "bullet",
            text: "If the device can be repaired through servicing without replacing any parts, no service charge will be applied.",
        },
        {
            type: "bullet",
            text: "If any parts need to be replaced, the customer must bear the cost of those parts.",
        },
        {
            type: "bullet",
            text: "Service duration will depend on the availability of parts in the market.",
        },
        {
            type: "heading",
            text: "Important Terms & Conditions",
        },
        {
            type: "bullet",
            text: "Customers are requested to check the active/inactive status and all visible conditions (scratches, cracks, dust, color issues, etc.) before leaving the outlet, as these will not be covered under warranty afterward.",
        },
        {
            type: "bullet",
            text: "Warranty is not applicable for charging cables, adapters, or any accessories provided inside the box.",
        },
        {
            type: "bullet",
            text: `If the purchased device is not preferred, customers may exchange it according to ${brandPolicyName}’s exchange policy.`,
        },
        {
            type: "bullet",
            text: "If a customer wants to sell or exchange the device within 20 days, 20% of the purchase value will be deducted.",
        },
        {
            type: "bullet",
            text: "Warranty will be considered void if the device is damaged due to accidents, misuse, fire, water damage, voltage fluctuation, lightning, forceful opening, or any external causes.",
        },
        {
            type: "bullet",
            text: `Devices exposed to liquid/water or serviced previously outside ${brandPolicyName} will not be covered under warranty policy.`,
        },
        {
            type: "bullet",
            text: "Any manufacturing defect must be reported within 24 hours of purchase or receiving the product from courier service.",
        },
        {
            type: "bullet",
            text: `According to ${brandPolicyName} policy, customers may receive 7 days / 3 months / 6 months / 12 months / 18 months / 24 months warranty depending on the product.`,
        },
        {
            type: "bullet",
            text: "Warranty claim processing for sold products may require 15–40 working days.",
        },
        {
            type: "bullet",
            text: "For products received through courier or home delivery, an unboxing video is mandatory for warranty claims.",
        },
        {
            type: "bullet",
            text: "Product box and invoice/memo are mandatory for claiming warranty.",
        },
        {
            type: "bullet",
            text: "Customers are advised to check whether the phone is blacklisted before purchase.",
        },
        {
            type: "bullet",
            text: `Phones from the USA Sales Region may later become blacklisted; therefore, purchasing such phones is entirely at the customer’s own risk, and ${brandPolicyName} discourages customers from purchasing them.`,
        },
        {
            type: "bullet",
            text: `${brandPolicyName} authority will not bear any responsibility if the phone becomes blacklisted in the future.`,
        },
    ];

    const handlePrint = () => {
        window.print();
    };

    const handleDownloadPDF = () => {
        window.print();
    };

    return (
        <div className="min-h-screen bg-gray-100">
            <style>{`
                @media print {
                    @page {
                        size: A4 portrait;
                        margin: 0;
                    }

                    html,
                    body {
                        width: 210mm !important;
                        height: 297mm !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        overflow: hidden !important;
                        background: #ffffff !important;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }

                    body * {
                        visibility: hidden !important;
                    }

                    #variantInvoicePrintArea,
                    #variantInvoicePrintArea * {
                        visibility: visible !important;
                    }

                    #variantInvoicePrintArea {
                        position: absolute !important;
                        left: 0 !important;
                        top: 0 !important;
                        width: 210mm !important;
                        height: 297mm !important;
                        min-height: 297mm !important;
                        max-height: 297mm !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        overflow: hidden !important;
                        box-shadow: none !important;
                        border: none !important;
                        background: #ffffff !important;
                    }

                    .no-print {
                        display: none !important;
                    }

                    .variant-invoice-paper {
                        width: 210mm !important;
                        height: 297mm !important;
                        min-height: 297mm !important;
                        max-height: 297mm !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        border: none !important;
                        box-shadow: none !important;
                        overflow: hidden !important;
                        background: #ffffff !important;
                    }

                    .variant-print-scale {
                        width: 210mm !important;
                        height: 297mm !important;
                        transform: scale(0.94) !important;
                        transform-origin: top center !important;
                    }

                    .variant-invoice-inner {
                        width: 210mm !important;
                        margin-left: auto !important;
                        margin-right: auto !important;
                        padding-top: 8mm !important;
                        padding-bottom: 0 !important;
                        font-family: "Times New Roman", Times, serif !important;
                        color: #000000 !important;
                        overflow: visible !important;
                    }

                    .variant-header {
                        min-height: 27mm !important;
                    }

                    .variant-logo-wrap {
                        height: 25mm !important;
                    }

                    .variant-logo {
                        width: 56mm !important;
                        max-height: 20mm !important;
                        object-fit: contain !important;
                        object-position: left top !important;
                        margin-bottom: 11px !important;
                    }

                    .variant-business-info {
                        font-size: 12px !important;
                        line-height: 1.05 !important;
                    }

                    .variant-invoice-title {
                        font-size: 26px !important;
                        line-height: 1 !important;
                    }

                    .variant-customer-row {
                        font-size: 14px !important;
                        line-height: 1.1 !important;
                    }

                    .variant-items-section {
                        margin-top: 4mm !important;
                        padding-top: 2mm !important;
                    }

                    .variant-all-items {
                        min-height: 29mm !important;
                        max-height: 35mm !important;
                        overflow: hidden !important;
                    }

                    .variant-item-line {
                        page-break-inside: avoid !important;
                        break-inside: avoid !important;
                        font-size: 14px !important;
                        line-height: 1.6 !important;
                        margin-bottom: 1.2mm !important;
                        font-weight: 700 !important;
                    }

                    .variant-summary-section {
                        margin-top: 4mm !important;
                    }

                    .variant-summary-main {
                        font-size: 14px !important;
                        line-height: 1.1 !important;
                    }

                    .variant-summary-extra {
                        font-size: 12px !important;
                        line-height: 1.1 !important;
                    }

                    .variant-payment-row {
                        margin-top: 4mm !important;
                        font-size: 14px !important;
                        line-height: 1.1 !important;
                    }

                    .variant-warranty-section {
                        margin-top: 5mm !important;
                        padding-top: 2mm !important;
                    }

                    .variant-warranty-title {
                        font-size: 18px !important;
                        line-height: 1 !important;
                        margin-bottom: 1mm !important;
                    }

                    .variant-warranty-text {
                        font-size: 12px !important;
                        line-height: 1.08 !important;
                    }

                    .variant-warranty-heading {
                        margin-top: 0.7mm !important;
                        margin-left: 7mm !important;
                    }

                    .variant-warranty-bullet {
                        display: grid !important;
                        grid-template-columns: 5mm 1fr !important;
                        margin-left: 7mm !important;
                    }

                    .variant-warranty-bullet-dot {
                        font-size: 14px !important;
                        line-height: 9px !important;
                    }

                    .variant-confirm-text {
                        margin-top: 3mm !important;
                        font-size: 12px !important;
                        line-height: 1.05 !important;
                    }

                    .variant-signature-section {
                        margin-top: 6mm !important;
                    }

                    .variant-signature-box {
                        font-size: 15px !important;
                    }
                }
            `}</style>

            <div className="no-print bg-white border-b border-gray-200 px-4 py-3">
                <div className="max-w-[900px] mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                        <h1 className="text-lg font-bold text-gray-900">
                            Purchase Invoice: {purchase?.purchase_no || purchase?.id}
                        </h1>
                        <p className="text-sm text-gray-500">
                            Date: {formatDate(purchase?.purchase_date || purchase?.created_at)}
                            {isShadowUser ? (
                                <span className="ml-2 text-xs px-2 py-0.5 rounded bg-yellow-100 text-yellow-800">
                                    Shadow
                                </span>
                            ) : null}
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <button
                            type="button"
                            onClick={() => router.visit(route("purchase.list"))}
                            className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-gray-300 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                        >
                            <ArrowLeft size={16} />
                            Back
                        </button>

                        <button
                            type="button"
                            onClick={handlePrint}
                            className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-gray-900 text-white text-sm font-semibold hover:bg-black"
                        >
                            <Printer size={16} />
                            Print
                        </button>

                        <button
                            type="button"
                            onClick={handleDownloadPDF}
                            className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-gray-700 text-white text-sm font-semibold hover:bg-gray-800"
                        >
                            <Download size={16} />
                            PDF
                        </button>
                    </div>
                </div>
            </div>

            <div className="py-5 px-3">
                <div
                    id="variantInvoicePrintArea"
                    className="variant-invoice-paper bg-white mx-auto shadow-sm border border-gray-200"
                    style={{
                        minHeight: "297mm",
                    }}
                >
                    <div className="variant-print-scale">
                        <div
                            className="variant-invoice-inner"
                            style={{
                                width: "210mm",
                                marginLeft: "auto",
                                marginRight: "auto",
                                paddingTop: "8mm",
                                paddingBottom: "0",
                                fontFamily: `"Times New Roman", Times, serif`,
                                color: "#000000",
                            }}
                        >
                            <div
                                className="variant-header flex items-start justify-between"
                                style={{
                                    minHeight: "27mm",
                                }}
                            >
                                <div>
                                    <div
                                        className="variant-logo-wrap"
                                        style={{
                                            height: "25mm",
                                            display: "flex",
                                            alignItems: "flex-start",
                                        }}
                                    >
                                        {businessLogo ? (
                                            <img
                                                src={businessLogo}
                                                alt={businessName || "Business Logo"}
                                                className="variant-logo"
                                                style={{
                                                    width: "56mm",
                                                    maxHeight: "20mm",
                                                    objectFit: "contain",
                                                    objectPosition: "left top",
                                                    marginBottom: "11px",
                                                }}
                                                onError={(e) => {
                                                    e.currentTarget.style.display = "none";
                                                }}
                                            />
                                        ) : businessName ? (
                                            <div
                                                style={{
                                                    fontSize: "22px",
                                                    fontWeight: "700",
                                                    lineHeight: "1",
                                                }}
                                            >
                                                {businessName}
                                            </div>
                                        ) : null}
                                    </div>

                                    <div
                                        className="variant-business-info"
                                        style={{
                                            fontSize: "12px",
                                            lineHeight: "1.05",
                                        }}
                                    >
                                        {businessAddress ? (
                                            <div className="whitespace-pre-line">
                                                {businessAddress}
                                            </div>
                                        ) : null}

                                        {(businessPhone || businessSecondPhone) ? (
                                            <div>
                                                Mobile: {businessPhone}
                                                {businessSecondPhone ? `, ${businessSecondPhone}` : ""}
                                            </div>
                                        ) : null}

                                        {businessEmail ? (
                                            <div>
                                                Email:{" "}
                                                <span style={{ textDecoration: "underline" }}>
                                                    {businessEmail}
                                                </span>
                                            </div>
                                        ) : null}

                                        {businessWebsite ? (
                                            <div>
                                                Website:{" "}
                                                <span style={{ textDecoration: "underline" }}>
                                                    {businessWebsite}
                                                </span>
                                            </div>
                                        ) : null}

                                        {businessFacebook ? (
                                            <div>
                                                Facebook: {businessFacebook}
                                            </div>
                                        ) : null}
                                    </div>
                                </div>

                                <div
                                    className="variant-invoice-title"
                                    style={{
                                        fontSize: "26px",
                                        fontWeight: "700",
                                        lineHeight: "1",
                                        paddingTop: "2mm",
                                        letterSpacing: "0.5px",
                                    }}
                                >
                                    INVOICE
                                </div>
                            </div>

                            <div
                                className="variant-customer-row"
                                style={{
                                    borderTop: "2px solid #000",
                                    marginTop: "0mm",
                                    paddingTop: "1mm",
                                    fontSize: "14px",
                                    fontWeight: "700",
                                    lineHeight: "1.1",
                                }}
                            >
                                <div className="flex items-center justify-between">
                                    <div>
                                        Name : {getSupplierName()}
                                    </div>

                                    <div
                                        style={{
                                            minWidth: "49mm",
                                            textAlign: "right",
                                        }}
                                    >
                                        {invoiceDateTime?.datePart}{" "}
                                        <span style={{ marginLeft: "5mm" }}>
                                            {invoiceDateTime?.timePart}
                                        </span>
                                    </div>
                                </div>

                                <div>
                                    Number : {getSupplierNumber()}
                                </div>

                                {getSupplierAddress() ? (
                                    <div>
                                        Address : {getSupplierAddress()}
                                    </div>
                                ) : null}
                            </div>

                            <div
                                className="variant-items-section"
                                style={{
                                    borderTop: "2px solid #000",
                                    marginTop: "4mm",
                                    paddingTop: "2mm",
                                }}
                            >
                                <div
                                    className="variant-all-items"
                                    style={{
                                        minHeight: "29mm",
                                        maxHeight: "35mm",
                                        overflow: "hidden",
                                    }}
                                >
                                    {items.length > 0 ? (
                                        items.map((item, index) => {
                                            const extraDetails = getItemExtraDetails(item);

                                            return (
                                                <div
                                                    key={item?.id || index}
                                                    className="variant-item-line flex items-start justify-between"
                                                    style={{
                                                        fontSize: "14px",
                                                        lineHeight: "1.6",
                                                        marginBottom: "1.2mm",
                                                        fontWeight: "700",
                                                    }}
                                                >
                                                    <div style={{ paddingRight: "8mm" }}>
                                                        <div>
                                                            {getProductDisplayName(item)}
                                                            {toNum(item?.quantity || item?.qty || 0) > 1
                                                                ? ` x ${toNum(item?.quantity || item?.qty || 0)}`
                                                                : ""}
                                                            {extraDetails ? ` ${extraDetails}` : ""}
                                                        </div>
                                                    </div>

                                                    <div
                                                        className="flex items-start justify-between"
                                                        style={{
                                                            minWidth: "31mm",
                                                        }}
                                                    >
                                                        <span style={{ fontWeight: "700" }}>
                                                            BDT
                                                        </span>
                                                        <span style={{ fontWeight: "700" }}>
                                                            {formatCurrency(rowTotal(item))}
                                                        </span>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    ) : (
                                        <div
                                            style={{
                                                fontSize: "14px",
                                                color: "#555",
                                            }}
                                        >
                                            No items found
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div
                                className="variant-summary-section"
                                style={{
                                    borderTop: "1px solid #000",
                                    marginTop: "4mm",
                                    paddingTop: "0",
                                }}
                            >
                                <div
                                    className="variant-summary-main flex items-center justify-end"
                                    style={{
                                        fontSize: "14px",
                                        lineHeight: "1.1",
                                        fontWeight: "400",
                                    }}
                                >
                                    <div
                                        style={{
                                            minWidth: "34mm",
                                            textAlign: "left",
                                        }}
                                    >
                                        Sub Total
                                    </div>

                                    <div
                                        style={{
                                            minWidth: "17mm",
                                            textAlign: "left",
                                            fontWeight: "700",
                                        }}
                                    >
                                        BDT
                                    </div>

                                    <div
                                        style={{
                                            minWidth: "25mm",
                                            textAlign: "right",
                                            fontWeight: "700",
                                        }}
                                    >
                                        {formatCurrency(subTotal)}
                                    </div>
                                </div>

                                {vatAmount > 0 ? (
                                    <div
                                        className="variant-summary-extra flex items-center justify-end"
                                        style={{
                                            fontSize: "12px",
                                            lineHeight: "1.1",
                                        }}
                                    >
                                        <div
                                            style={{
                                                minWidth: "34mm",
                                                textAlign: "left",
                                            }}
                                        >
                                            VAT / Tax
                                        </div>

                                        <div
                                            style={{
                                                minWidth: "17mm",
                                                textAlign: "left",
                                                fontWeight: "700",
                                            }}
                                        >
                                            BDT
                                        </div>

                                        <div
                                            style={{
                                                minWidth: "25mm",
                                                textAlign: "right",
                                            }}
                                        >
                                            {formatCurrency(vatAmount)}
                                        </div>
                                    </div>
                                ) : null}

                                {transportationCost > 0 ? (
                                    <div
                                        className="variant-summary-extra flex items-center justify-end"
                                        style={{
                                            fontSize: "12px",
                                            lineHeight: "1.1",
                                        }}
                                    >
                                        <div
                                            style={{
                                                minWidth: "34mm",
                                                textAlign: "left",
                                            }}
                                        >
                                            Transport
                                        </div>

                                        <div
                                            style={{
                                                minWidth: "17mm",
                                                textAlign: "left",
                                                fontWeight: "700",
                                            }}
                                        >
                                            BDT
                                        </div>

                                        <div
                                            style={{
                                                minWidth: "25mm",
                                                textAlign: "right",
                                            }}
                                        >
                                            {formatCurrency(transportationCost)}
                                        </div>
                                    </div>
                                ) : null}

                                {grandTotal !== subTotal ? (
                                    <div
                                        className="variant-summary-extra flex items-center justify-end"
                                        style={{
                                            fontSize: "12px",
                                            lineHeight: "1.1",
                                            fontWeight: "700",
                                        }}
                                    >
                                        <div
                                            style={{
                                                minWidth: "34mm",
                                                textAlign: "left",
                                            }}
                                        >
                                            Grand Total
                                        </div>

                                        <div
                                            style={{
                                                minWidth: "17mm",
                                                textAlign: "left",
                                            }}
                                        >
                                            BDT
                                        </div>

                                        <div
                                            style={{
                                                minWidth: "25mm",
                                                textAlign: "right",
                                            }}
                                        >
                                            {formatCurrency(grandTotal)}
                                        </div>
                                    </div>
                                ) : null}

                                <div
                                    className="variant-payment-row flex items-center justify-end"
                                    style={{
                                        fontSize: "14px",
                                        lineHeight: "1.1",
                                        fontWeight: "700",
                                        marginTop: "4mm",
                                    }}
                                >
                                    <div
                                        style={{
                                            minWidth: "54mm",
                                            textAlign: "left",
                                        }}
                                    >
                                        Payment Method
                                    </div>

                                    <div
                                        style={{
                                            minWidth: "33mm",
                                            textAlign: "center",
                                        }}
                                    >
                                        {getPaymentMethod()}
                                    </div>
                                </div>

                                {paidAmount > 0 ? (
                                    <div
                                        className="variant-summary-extra flex items-center justify-end"
                                        style={{
                                            fontSize: "12px",
                                            lineHeight: "1.1",
                                        }}
                                    >
                                        <div
                                            style={{
                                                minWidth: "54mm",
                                                textAlign: "left",
                                            }}
                                        >
                                            Paid Amount
                                        </div>

                                        <div
                                            style={{
                                                minWidth: "33mm",
                                                textAlign: "right",
                                            }}
                                        >
                                            BDT {formatCurrency(paidAmount)}
                                        </div>
                                    </div>
                                ) : null}

                                {dueAmount > 0 ? (
                                    <div
                                        className="variant-summary-extra flex items-center justify-end"
                                        style={{
                                            fontSize: "12px",
                                            lineHeight: "1.1",
                                        }}
                                    >
                                        <div
                                            style={{
                                                minWidth: "54mm",
                                                textAlign: "left",
                                            }}
                                        >
                                            Due Amount
                                        </div>

                                        <div
                                            style={{
                                                minWidth: "33mm",
                                                textAlign: "right",
                                            }}
                                        >
                                            BDT {formatCurrency(dueAmount)}
                                        </div>
                                    </div>
                                ) : null}
                            </div>

                            <div
                                className="variant-warranty-section"
                                style={{
                                    borderTop: "3px solid #000",
                                    marginTop: "5mm",
                                    paddingTop: "2mm",
                                }}
                            >
                                <div
                                    className="variant-warranty-text"
                                    style={{
                                        fontSize: "12px",
                                        lineHeight: "1.08",
                                    }}
                                >
                                    <div
                                        className="variant-warranty-title"
                                        style={{
                                            textAlign: "center",
                                            fontSize: "18px",
                                            lineHeight: "1",
                                            fontWeight: "700",
                                            textDecoration: "underline",
                                            marginBottom: "1mm",
                                        }}
                                    >
                                        WARRANTY POLICY
                                    </div>

                                    {warrantyPolicyLines.map((line, index) => {
                                        if (line.type === "heading") {
                                            return (
                                                <div
                                                    key={index}
                                                    className="variant-warranty-heading"
                                                    style={{
                                                        fontWeight: "700",
                                                        textDecoration: "underline",
                                                        marginTop: "0.7mm",
                                                        marginLeft: "7mm",
                                                    }}
                                                >
                                                    {line.text}
                                                </div>
                                            );
                                        }

                                        if (line.type === "bullet") {
                                            return (
                                                <div
                                                    key={index}
                                                    className="variant-warranty-bullet"
                                                    style={{
                                                        display: "grid",
                                                        gridTemplateColumns: "5mm 1fr",
                                                        marginLeft: "7mm",
                                                    }}
                                                >
                                                    <span
                                                        className="variant-warranty-bullet-dot"
                                                        style={{
                                                            fontSize: "14px",
                                                            lineHeight: "9px",
                                                        }}
                                                    >
                                                        •
                                                    </span>
                                                    <span>
                                                        {line.text}
                                                    </span>
                                                </div>
                                            );
                                        }

                                        if (line.type === "paragraph-bold") {
                                            return (
                                                <div
                                                    key={index}
                                                    style={{
                                                        fontWeight: "700",
                                                        marginTop: "0.7mm",
                                                        marginLeft: "7mm",
                                                    }}
                                                >
                                                    {line.text}
                                                </div>
                                            );
                                        }

                                        return (
                                            <div
                                                key={index}
                                                style={{
                                                    marginBottom: "0.7mm",
                                                }}
                                            >
                                                {line.text}
                                            </div>
                                        );
                                    })}

                                    <div
                                        className="variant-confirm-text"
                                        style={{
                                            marginTop: "3mm",
                                            textAlign: "center",
                                            fontWeight: "700",
                                            fontSize: "12px",
                                            lineHeight: "1.05",
                                        }}
                                    >
                                        I have been informed of and understood all the above-mentioned terms and conditions and purchased the product
                                        <br />
                                        from {brandPolicyName} accordingly.
                                    </div>
                                </div>
                            </div>

                            <div
                                className="variant-signature-section flex items-end justify-between"
                                style={{
                                    marginTop: "6mm",
                                    fontSize: "11px",
                                    lineHeight: "1.1",
                                }}
                            >
                                <div>
                                    {auth?.user?.name || purchase?.creator?.name || purchase?.created_by?.name ? (
                                        <>Printed By: {auth?.user?.name || purchase?.creator?.name || purchase?.created_by?.name}</>
                                    ) : null}
                                </div>

                                <div
                                    className="variant-signature-box"
                                    style={{
                                        width: "50mm",
                                        textAlign: "center",
                                        fontSize: "15px",
                                        fontWeight: "700",
                                    }}
                                >
                                    <div
                                        style={{
                                            borderTop: "1px dashed #000",
                                            paddingTop: "0",
                                        }}
                                    >
                                        Client Signature
                                    </div>
                                </div>
                            </div>

                            {purchase?.purchase_no ? (
                                <div
                                    className="no-print"
                                    style={{
                                        marginTop: "2mm",
                                        fontSize: "9px",
                                        color: "#444",
                                        textAlign: "left",
                                    }}
                                >
                                    Invoice No: {purchase.purchase_no}
                                </div>
                            ) : null}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}