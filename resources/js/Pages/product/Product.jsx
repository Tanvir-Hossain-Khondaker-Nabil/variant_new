import PageHeader from "../../components/PageHeader";
import Pagination from "../../components/Pagination";
import { Link, router, useForm, usePage } from "@inertiajs/react";
import {
    Frown,
    Pen,
    Plus,
    Trash2,
    Package,
    ChevronDown,
    ChevronRight,
    Tag,
    Barcode,
    Printer,
    Copy,
    X,
    Layers,
    AlignLeft,
    AlignRight,
    CheckSquare,
    Square,
    MoreVertical,
} from "lucide-react";
import React, { Fragment, useCallback, useMemo, useState } from "react";
import { useTranslation } from "../../hooks/useTranslation";
import JsBarcode from "jsbarcode";

export default function Product({ product, filters }) {
    const { auth } = usePage().props;
    const { t, locale } = useTranslation();

    const [expandedProducts, setExpandedProducts] = useState({});
    const [showBulkBarcodeModal, setShowBulkBarcodeModal] = useState(false);

    // store selected barcode rows (barcode is unique key)
    const [selectedBarcodeMap, setSelectedBarcodeMap] = useState(() => new Map());

    /**
     * ✅ KEEP FIRST JSX UI + ADD BOTH PRINT TYPES:
     * 1) Sheet Grid Print (old first jsx)  -> uses image (tec-it)
     * 2) RP400 Exact Label/Slip (second jsx)-> uses SVG (JsBarcode) + @page size
     */
    const [barcodeConfig, setBarcodeConfig] = useState({
        // ✅ WHICH PRINT TYPE
        printType: "sheet", // "sheet" | "rp400"

        // ========= SHEET (first jsx) =========
        sheet: {
            showProductName: true,
            showBatchNo: true,
            showSalePrice: false,
            showVariantName: false,

            align: "left", // left | right

            labelWidthMm: 38,
            labelHeightMm: 25,
            gapMm: 2,

            copiesMode: "one", // one | byQty | fixed
            fixedCopies: 1,

            barcodeImgHeightPx: 50,
        },

        // ========= RP400 (second jsx) =========
        rp400: {
            // content
            showProductName: true,
            showBatchNo: true,
            showSalePrice: false,
            showVariantName: false,
            showTextUnderBarcode: false,

            // alignment + orientation
            align: "center", // left | center | right
            orientation: "portrait", // portrait | landscape

            // label/slip sizes
            // (You can change these in modal)
            labelWidthMm: 38,
            labelHeightMm: 25,
            slipWidthMm: 38,
            slipHeightMm: 25,

            paddingMm: 1,

            // barcode sizing
            barcodeHeightMm: 33,
            barWidthPx: 0, // 0 = auto

            // copies
            copiesMode: "one", // one | byQty | fixed
            fixedCopies: 1,

            // print mode inside RP400
            printMode: "label", // label | slip
            showSlipTotals: false,
        },
    });

    const safeProducts = product?.data || [];

    // handle search
    const searchForm = useForm({
        search: filters?.search || "",
    });

    const handleSearch = (e) => {
        const value = e.target.value;
        searchForm.setData("search", value);

        const queryString = value ? { search: value } : {};
        router.get(route("product.list"), queryString, {
            preserveScroll: true,
            preserveState: true,
            replace: true,
        });
    };

    // Toggle variant expansion
    const toggleExpand = (productId) => {
        setExpandedProducts((prev) => ({
            ...prev,
            [productId]: !prev[productId],
        }));
    };

    // Format variant display for attribute-based variants
    const formatVariantDisplay = (variant) => {
        if (!variant?.attribute_values || Object.keys(variant.attribute_values).length === 0) {
            return t("product.default_variant", "Default Variant");
        }

        const parts = [];
        for (const [attributeCode, value] of Object.entries(variant.attribute_values)) {
            parts.push(`${attributeCode}: ${value}`);
        }
        return parts.join(" | ");
    };

    // Format currency
    const formatCurrency = (amount) => {
        return new Intl.NumberFormat("en-IN", { style: "currency", currency: "BDT" }).format(amount || 0);
    };

    // Calculate total stock for a product
    const calculateTotalStock = (productItem) => {
        if (!productItem?.variants || productItem.variants.length === 0) return 0;
        return productItem.variants.reduce((total, variant) => total + (variant?.stock?.quantity || 0), 0);
    };

    // Get unique attributes count for a product
    const getUniqueAttributesCount = (productItem) => {
        if (!productItem?.variants || productItem.variants.length === 0) return 0;

        const allAttributes = new Set();
        productItem.variants.forEach((variant) => {
            if (variant?.attribute_values && Object.keys(variant.attribute_values).length > 0) {
                Object.keys(variant.attribute_values).forEach((attributeCode) => {
                    allAttributes.add(attributeCode);
                });
            }
        });

        return allAttributes.size;
    };

    /**
     * ✅ Get barcodes for a variant (support multiple backend structures)
     */
    const getVariantBarcodes = (variant, productItem = null) => {
        const result = [];

        // 1) variant.stock.barcode (single)
        if (variant?.stock?.barcode) {
            result.push({
                barcode: variant.stock.barcode,
                batch_no: variant.stock.batch_no,
                quantity: variant.stock.quantity,
                purchase_price: variant.stock.purchase_price,
                sale_price: variant.stock.sale_price,
                warehouse_id: variant.stock.warehouse_id,
                variant_id: variant.id,
            });
        }

        // 2) variant.barcode (single) if no stock.barcode already
        if (!result.length && variant?.barcode) {
            result.push({
                barcode: variant.barcode,
                batch_no: variant?.batch_no,
                quantity: variant?.quantity,
                purchase_price: variant?.purchase_price,
                sale_price: variant?.sale_price,
                warehouse_id: variant?.warehouse_id,
                variant_id: variant.id,
            });
        }

        // 3) variant.stocks[] (multiple)
        if (Array.isArray(variant?.stocks) && variant.stocks.length > 0) {
            variant.stocks.forEach((s) => {
                if (s?.barcode) {
                    result.push({
                        barcode: s.barcode,
                        batch_no: s.batch_no,
                        quantity: s.quantity,
                        purchase_price: s.purchase_price,
                        sale_price: s.sale_price,
                        warehouse_id: s.warehouse_id,
                        variant_id: variant.id,
                    });
                }
            });
        }

        // 4) productItem.stocks[] fallback (multiple) - match variant_id if possible
        if (productItem && Array.isArray(productItem?.stocks) && productItem.stocks.length > 0) {
            const matched = productItem.stocks.filter((s) => {
                if (!s?.barcode) return false;
                if (s.variant_id && variant?.id) return String(s.variant_id) === String(variant.id);
                return true;
            });

            matched.forEach((s) => {
                if (!result.some((x) => x.barcode === s.barcode)) {
                    result.push({
                        barcode: s.barcode,
                        batch_no: s.batch_no,
                        quantity: s.quantity,
                        purchase_price: s.purchase_price,
                        sale_price: s.sale_price,
                        warehouse_id: s.warehouse_id,
                        variant_id: s.variant_id || variant?.id,
                    });
                }
            });
        }

        // unique by barcode
        const uniq = [];
        const seen = new Set();
        for (const row of result) {
            const code = String(row?.barcode || "").trim();
            if (code && !seen.has(code)) {
                seen.add(code);
                uniq.push({ ...row, barcode: code });
            }
        }
        return uniq;
    };

    // Copy barcode to clipboard
    const copyBarcode = (barcode) => {
        navigator.clipboard?.writeText(String(barcode || "")).then(() => {
            alert("Barcode copied to clipboard!");
        });
    };

    // =========================
    // ✅ BULK BARCODE SELECT
    // =========================
    const selectedCount = selectedBarcodeMap.size;

    const toggleSelectBarcode = (row) => {
        const code = String(row?.barcode || "").trim();
        if (!code) return;

        setSelectedBarcodeMap((prev) => {
            const next = new Map(prev);
            if (next.has(code)) next.delete(code);
            else next.set(code, row);
            return next;
        });
    };

    const clearSelectedBarcodes = () => setSelectedBarcodeMap(new Map());

    const openBulkModal = () => {
        if (selectedCount <= 0) return alert("Select at least 1 barcode");
        setShowBulkBarcodeModal(true);
    };

    const closeBulkModal = () => setShowBulkBarcodeModal(false);

    const updateBarcodeConfig = (pathKey, value) => {
        // pathKey examples:
        // "printType"
        // "sheet.labelWidthMm"
        // "rp400.orientation"
        const numberKeys = new Set([
            "sheet.labelWidthMm",
            "sheet.labelHeightMm",
            "sheet.gapMm",
            "sheet.fixedCopies",
            "sheet.barcodeImgHeightPx",

            "rp400.labelWidthMm",
            "rp400.labelHeightMm",
            "rp400.slipWidthMm",
            "rp400.slipHeightMm",
            "rp400.paddingMm",
            "rp400.barcodeHeightMm",
            "rp400.barWidthPx",
            "rp400.fixedCopies",
        ]);

        setBarcodeConfig((prev) => {
            const next = { ...prev };

            if (pathKey === "printType") {
                next.printType = value;
                return next;
            }

            const [root, key] = pathKey.split(".");
            if (!root || !key) return prev;

            next[root] = { ...next[root], [key]: numberKeys.has(pathKey) ? Number(value) : value };
            return next;
        });
    };

    const escapeHtml = (s) =>
        String(s || "")
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");

    // =========================
    // ✅ SHEET MODE (FIRST JSX) - tec-it image barcode
    // =========================
    const generateBarcodeImage = (barcode) => {
        const code = String(barcode || "").trim();
        return `https://barcode.tec-it.com/barcode.ashx?data=${encodeURIComponent(code)}&code=Code128&dpi=96`;
    };

    const buildSheetLabels = () => {
        const { copiesMode, fixedCopies, showProductName, showBatchNo, showSalePrice } = barcodeConfig.sheet;

        const resolveCopies = (qty) => {
            if (copiesMode === "fixed") return Math.max(1, Number(fixedCopies || 1));
            if (copiesMode === "byQty") return Math.max(1, Math.round(Number(qty || 1)));
            return 1;
        };

        const labels = [];
        for (const row of selectedBarcodeMap.values()) {
            const copies = resolveCopies(row?.quantity || 1);
            for (let i = 0; i < copies; i++) {
                labels.push({
                    codeValue: row.barcode,
                    imgSrc: generateBarcodeImage(row.barcode),
                    productName: showProductName ? row.productName || "" : "",
                    variantName: row.variantName || "",
                    batchNo: showBatchNo ? row.batch_no || "" : "",
                    salePrice: showSalePrice ? row.sale_price || "" : "",
                });
            }
        }
        return labels;
    };

    const handleSheetBarcodePrint = () => {
        const labels = buildSheetLabels();
        if (!labels.length) return alert("No barcodes found to print.");

        const {
            showProductName,
            showBatchNo,
            showSalePrice,
            align,
            labelWidthMm,
            labelHeightMm,
            gapMm,
            barcodeImgHeightPx,
        } = barcodeConfig.sheet;

        const printWindow = window.open("", "_blank");
        if (!printWindow) return alert("Please allow popups to print barcodes.");

        const css = `
          @page { margin: 6mm; }
          @media print { .no-print { display:none !important; } body { padding:0; } }

          * { box-sizing:border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          body {
            margin:0;
            padding:10px;
            font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial;
            background:#fff;
            color:#0f172a;
          }

          .sheet { width:100%; }

          .grid{
            width: 100%;
            display: grid;
            grid-auto-flow: row;
            grid-template-columns: repeat(auto-fit, ${Number(labelWidthMm)}mm);
            gap:${Number(gapMm)}mm;
            justify-content:${align === "right" ? "end" : "start"};
            align-content:start;
          }

          .label{
            width:${Number(labelWidthMm)}mm;
            height:${Number(labelHeightMm)}mm;
            padding:4px 2px;
            border-radius:8px;
            background:#fff;
            border:1px solid #e5e7eb;
            display:flex;
            flex-direction:column;
            overflow:hidden;
            break-inside:avoid;
            page-break-inside:avoid;
            position:relative;
          }

          .barcodeArea {
            display:flex;
            flex-direction:column;
            align-items:center;
            justify-content:center;
            gap:4px;
            height:100%;
            width:100%;
            text-align:center;
          }

          .name {
            width:100%;
            font-weight:900;
            font-size:11px;
            color:#0f172a;
            display:-webkit-box;
            -webkit-line-clamp:2;
            -webkit-box-orient:vertical;
          }

          .variant {
            width:100%;
            font-weight:800;
            font-size:9px;
            color:#64748b;
            display:-webkit-box;
            -webkit-line-clamp:1;
            -webkit-box-orient:vertical;
            overflow:hidden;
          }

          .barcodeImg{
            height:${Number(barcodeImgHeightPx)}px;
            width:auto;
            max-width:92%;
            object-fit:contain;
            display:block;
            margin:0 auto;
          }

          .batch, .price {
            width:100%;
            font-size:10px;
            font-weight:900;
            white-space:nowrap;
            text-overflow:ellipsis;
          }
          .batch { color:#475569; font-weight:800; font-size:9px; }
          .price { color:#0f172a; }

          .no-print { text-align:center; margin-top:14px; color:#64748b; font-weight:900; }
          .btn { border:none; padding:8px 14px; border-radius:12px; font-weight:900; cursor:pointer; margin:0 6px; background:#111827; color:#fff; }
          .btn.ghost { background:#f1f5f9; color:#111827; }
        `;

        const labelsHtml = labels
            .map((l) => {
                const nameHtml = showProductName ? `<div class="name">${escapeHtml(l.productName || "")}</div>` : "";
                const variantHtml = showProductName ? `<div class="variant">${escapeHtml(l.variantName || "")}</div>` : "";

                const batchHtml = showBatchNo
                    ? `<div class="batch">${l.batchNo ? `Batch: ${escapeHtml(l.batchNo)}` : "Batch: -"}</div>`
                    : "";

                const priceHtml = showSalePrice
                    ? `<div class="price">${l.salePrice ? `৳${Number(l.salePrice).toFixed(2)}` : "-"}</div>`
                    : "";

                return `
                  <div class="label">
                    <div class="barcodeArea">
                      ${nameHtml}
                      ${variantHtml}
                      <img class="barcodeImg" src="${escapeHtml(l.imgSrc)}" alt="Barcode ${escapeHtml(l.codeValue)}" />
                      ${batchHtml}
                      ${priceHtml}
                    </div>
                  </div>
                `;
            })
            .join("");

        const html = `
          <!doctype html>
          <html>
          <head>
            <meta charset="utf-8" />
            <title>Barcode Labels</title>
            <style>${css}</style>
          </head>
          <body>
            <div class="sheet"><div class="grid">${labelsHtml}</div></div>

            <div class="no-print">
              Total: ${labels.length} labels
              <div style="margin-top:10px;">
                <button class="btn" onclick="window.print()">Print</button>
                <button class="btn ghost" onclick="window.close()">Close</button>
              </div>
            </div>

            <script>
              (function(){
                var imgs = Array.from(document.images || []);
                if(!imgs.length){ setTimeout(function(){ window.print(); }, 250); return; }

                var done = 0;
                function finish(){
                  done++;
                  if(done >= imgs.length) setTimeout(function(){ window.print(); }, 250);
                }

                imgs.forEach(function(img){
                  if(img.complete) return finish();
                  img.onload = finish;
                  img.onerror = finish;
                });

                setTimeout(function(){ window.print(); }, 5000);
              })();
            </script>
          </body>
          </html>
        `;

        printWindow.document.open();
        printWindow.document.write(html);
        printWindow.document.close();

        closeBulkModal();
    };

    // =========================
    // ✅ RP400 MODE (SECOND JSX) - SVG + exact @page size
    // =========================
    const autoBarWidth = (code) => {
        const len = String(code || "").length;
        if (len <= 6) return 2.3;
        if (len <= 10) return 2.1;
        if (len <= 14) return 1.9;
        if (len <= 18) return 1.7;
        return 1.5;
    };

    const generateBarcodeSvgString = useCallback(
        (codeValue) => {
            const code = String(codeValue || "").trim();
            if (!code) return "";

            try {
                const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");

                const finalBarWidth =
                    Number(barcodeConfig.rp400.barWidthPx || 0) > 0
                        ? Number(barcodeConfig.rp400.barWidthPx)
                        : autoBarWidth(code);

                JsBarcode(svg, code, {
                    format: "CODE128",
                    displayValue: false,
                    margin: 0,
                    height: 90,
                    width: finalBarWidth,
                    lineColor: "#000",
                    background: "#fff",
                });

                const wAttr = svg.getAttribute("width");
                const hAttr = svg.getAttribute("height");
                const w = Number(wAttr || 0);
                const h = Number(hAttr || 0);
                if (w > 0 && h > 0) {
                    svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
                }

                svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
                svg.setAttribute("preserveAspectRatio", "xMidYMid meet");

                svg.removeAttribute("width");
                svg.removeAttribute("height");

                return svg.outerHTML;
            } catch (e) {
                console.error("Barcode SVG generate failed:", e);
                return "";
            }
        },
        [barcodeConfig.rp400.barWidthPx]
    );

    const buildRp400Labels = useCallback(() => {
        const { copiesMode, fixedCopies } = barcodeConfig.rp400;

        const resolveCopies = (qty) => {
            if (copiesMode === "fixed") return Math.max(1, Number(fixedCopies || 1));
            if (copiesMode === "byQty") return Math.max(1, Math.round(Number(qty || 1)));
            return 1;
        };

        const labels = [];
        for (const row of selectedBarcodeMap.values()) {
            const copies = resolveCopies(row?.quantity || 1);

            const svgHtml = generateBarcodeSvgString(row?.barcode);
            if (!svgHtml) continue;

            for (let i = 0; i < copies; i++) {
                labels.push({
                    codeValue: String(row.barcode || "").trim(),
                    svgHtml,
                    productName: row.productName || "",
                    variantName: row.variantName || "",
                    batchNo: row.batch_no || "",
                    salePrice: row.sale_price || "",
                    qty: row.quantity || 0,
                });
            }
        }

        return labels;
    }, [barcodeConfig.rp400, selectedBarcodeMap, generateBarcodeSvgString]);

    const handleRp400BarcodePrint = () => {
        const labels = buildRp400Labels();
        if (!labels.length) return alert("No barcodes found to print.");

        const cfg = barcodeConfig.rp400;

        const {
            showProductName,
            showVariantName,
            showBatchNo,
            showSalePrice,
            showTextUnderBarcode,
            align,
            orientation,
            labelWidthMm,
            labelHeightMm,
            paddingMm,
            barcodeHeightMm,
            slipWidthMm,
            slipHeightMm,
            printMode,
            showSlipTotals,
        } = cfg;

        const baseW = printMode === "slip" ? Number(slipWidthMm || 72) : Number(labelWidthMm || 72);
        const baseH = printMode === "slip" ? Number(slipHeightMm || 28) : Number(labelHeightMm || 47);

        const pad = Number(paddingMm || 1.5);
        const barcodeH = Number(barcodeHeightMm || 18);

        const pageW = orientation === "landscape" ? baseH : baseW;
        const pageH = orientation === "landscape" ? baseW : baseH;

        const printWindow = window.open("", "_blank");
        if (!printWindow) return alert("Please allow popups to print barcodes.");

        const css = `
            @page { size: ${pageW}mm ${pageH}mm; margin: 0mm; }

            html, body {
                margin: 0;
                padding: 0;
                background: #fff;
                width: ${pageW}mm;
                height: ${pageH}mm;
                overflow: hidden;
            }

            * {
                box-sizing: border-box;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
                font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial;
            }

            .page {
                width: ${pageW}mm;
                height: ${pageH}mm;
                page-break-after: always;
                overflow: hidden;
                position: relative;
            }

            .rotFix {
                width: ${baseW}mm;
                height: ${baseH}mm;
                position: absolute;
                left: 0;
                top: 0;
                transform-origin: top left;
            }
            .rotFix.landscape {
                transform: rotate(90deg) translateY(-${baseH}mm);
            }

            .label {
                width: ${baseW}mm;
                height: ${baseH}mm;
                padding: ${pad}mm;
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
                text-align: center;
            }

            .wrap {
                width: 100%;
                height: 100%;
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: ${align === "left" ? "flex-start" : align === "right" ? "flex-end" : "center"};
                text-align: ${align};
            }

            .name {
                width: 100%;
                font-size: 9pt;
                font-weight: 900;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }

            .variant {
                width: 100%;
                font-size: ${printMode === "slip" ? "14pt" : "15pt"};
                font-weight: 800;
                line-height: 1.1;
                margin-bottom: 0.8mm;
                color: #111;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }

            .barcodeBox {
                width: 100%;
                height: 9pt
                display: flex;
                align-items: center;
                justify-content: center;
            }

            .barcodeBox svg {
                height: 100%;
                width: auto;
                max-width: 100%;
            }

            .textUnder {
                font-size: ${printMode === "slip" ? "7pt" : "8pt"};
                font-weight: 900;
                margin-top: 0.4mm;
                letter-spacing: 0.2px;
            }

            .batch {
                width: 100%;
                font-size: 9pt;
                font-weight: 800;
                margin-top: 0.8mm;
                white-space: nowrap;
                text-overflow: ellipsis;
                color: #111;
            }

            .price {
                width: 100%;
                font-size: 9pt;
                font-weight: 900;
                margin-top: 0.6mm;
            }

            .slipLine {
                width: 100%;
                display:flex;
                justify-content: space-between;
                font-size: 8pt;
                font-weight: 900;
                margin-top: 0.7mm;
                border-top: 1px dashed #ddd;
                padding-top: 0.7mm;
            }

            @media screen {
                .no-print {
                    padding: 14px;
                    border-top: 1px solid #ddd;
                    text-align: center;
                }
                .btn {
                    border: none;
                    padding: 8px 14px;
                    border-radius: 10px;
                    font-weight: 900;
                    cursor: pointer;
                    margin: 0 6px;
                    background: #111;
                    color: #fff;
                }
                .btn.ghost { background:#eee; color:#111; }
            }
            @media print {
                .no-print { display: none !important; }
            }
        `;

        const onePrintHtml = (l) => {
            const nameHtml = showProductName ? `<div class="name">${escapeHtml(l.productName || "")}</div>` : "";
            const variantHtml = showVariantName ? `<div class="variant">${escapeHtml(l.variantName || "")}</div>` : "";
            const textUnder = showTextUnderBarcode ? `<div class="textUnder">${escapeHtml(l.codeValue || "")}</div>` : "";
            const batchHtml = showBatchNo ? `<div class="batch">${l.batchNo ? `Batch: ${escapeHtml(l.batchNo)}` : "Batch: -"}</div>` : "";
            const priceHtml = showSalePrice ? `<div class="price">${l.salePrice ? `৳${Number(l.salePrice).toFixed(2)}` : "-"}</div>` : "";
            const slipTotals =
                printMode === "slip" && showSlipTotals
                    ? `<div class="slipLine"><span>Qty</span><span>${escapeHtml(l.qty || 0)}</span></div>`
                    : "";

            return `
                <div class="label">
                    <div class="wrap">
                        ${nameHtml}
                        ${variantHtml}
                        <div class="barcodeBox">${l.svgHtml || ""}</div>
                        ${textUnder}
                        ${batchHtml}
                        ${priceHtml}
                        ${slipTotals}
                    </div>
                </div>
            `;
        };

        const bodyHtml = labels
            .map((l) => {
                const rotClass = orientation === "landscape" ? "rotFix landscape" : "rotFix";
                return `
                  <div class="page">
                    <div class="${rotClass}">
                      ${onePrintHtml(l)}
                    </div>
                  </div>
                `;
            })
            .join("");

        const title = cfg.printMode === "slip" ? "Slip" : "Label";

        const html = `
            <!doctype html>
            <html>
            <head>
                <meta charset="utf-8" />
                <title>${title} Barcode Print</title>
                <style>${css}</style>
            </head>
            <body>
                ${bodyHtml}
                <div class="no-print">
                    <div style="font-size:12px;font-weight:900;">
                        Print settings: <b>Scale 100%</b> • Margins None • Headers/Footers Off • Fit/Shrink OFF
                    </div>
                    <div style="margin-top:10px;">
                        <button class="btn" onclick="window.print()">Print</button>
                        <button class="btn ghost" onclick="window.close()">Close</button>
                    </div>
                </div>
                <script>
                    setTimeout(function(){ window.print(); }, 250);
                </script>
            </body>
            </html>
        `;

        printWindow.document.open();
        printWindow.document.write(html);
        printWindow.document.close();

        closeBulkModal();
    };

    // ✅ One entry point: based on printType
    const handleBulkBarcodePrint = () => {
        if (barcodeConfig.printType === "rp400") return handleRp400BarcodePrint();
        return handleSheetBarcodePrint();
    };

    // ====== Sticky column helper classes ======
    const stickyLeftTh = "sticky left-0 z-30 bg-[#1e4d2b]";
    const stickyRightTh = "sticky right-0 z-30 bg-[#1e4d2b]";
    const stickyLeftTd = "sticky left-0 z-20 bg-white";
    const stickyRightTd = "sticky right-0 z-20 bg-white";
    const stickyShadowLeft = "shadow-[6px_0_10px_-10px_rgba(0,0,0,0.4)]";
    const stickyShadowRight = "shadow-[-6px_0_10px_-10px_rgba(0,0,0,0.4)]";

    return (
        <div className={`bg-white rounded-box p-5 ${locale === "bn" ? "bangla-font" : ""}`}>
            {/* ✅ Bulk Barcode Settings Modal */}
            {showBulkBarcodeModal && (
                <div className="fixed inset-0 bg-black/30 flex items-start justify-center z-50 p-4 overflow-y-auto">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mt-16 border border-gray-100">
                        <div className="p-6">
                            <div className="flex items-center justify-between gap-3 mb-4">
                                <div>
                                    <h3 className="text-xl font-black text-gray-900 flex items-center gap-2">
                                        <Barcode size={20} className="text-primary" />
                                        Bulk Barcode Print
                                    </h3>
                                    <p className="text-xs text-gray-500 font-bold">
                                        Selected: <span className="text-gray-900">{selectedCount}</span> barcode(s)
                                    </p>
                                </div>
                                <button onClick={closeBulkModal} className="btn btn-ghost btn-circle btn-sm">
                                    <X size={18} />
                                </button>
                            </div>

                            {/* ✅ Choose Print Type (TWO KIND OF PRINT) */}
                            <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                                <div className="text-[11px] font-black uppercase tracking-widest text-gray-500 mb-2 flex items-center gap-2">
                                    <Layers size={14} />
                                    Print Type
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    <label className="flex items-center gap-2 p-2 bg-white rounded-lg border border-gray-100 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="printType"
                                            checked={barcodeConfig.printType === "sheet"}
                                            onChange={() => updateBarcodeConfig("printType", "sheet")}
                                        />
                                        <span className="font-black text-sm">Sheet Grid (A4)</span>
                                    </label>

                                    <label className="flex items-center gap-2 p-2 bg-white rounded-lg border border-gray-100 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="printType"
                                            checked={barcodeConfig.printType === "rp400"}
                                            onChange={() => updateBarcodeConfig("printType", "rp400")}
                                        />
                                        <span className="font-black text-sm">Label Printer (RP400)</span>
                                    </label>
                                </div>

                                <div className="mt-2 text-[11px] font-bold text-gray-500">
                                    Sheet = multiple labels on page • RP400 = exact @page size for label/slip
                                </div>
                            </div>

                            {/* ========================= */}
                            {/* ✅ SHEET SETTINGS (FIRST JSX) */}
                            {/* ========================= */}
                            {barcodeConfig.printType === "sheet" && (
                                <>
                                    <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 mt-4">
                                        <div className="text-[11px] font-black uppercase tracking-widest text-gray-500 mb-2 flex items-center gap-2">
                                            <Layers size={14} />
                                            Label Content
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                            <label className="flex items-center gap-2 p-2 bg-white rounded-lg border border-gray-100 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={barcodeConfig.sheet.showProductName}
                                                    onChange={(e) => updateBarcodeConfig("sheet.showProductName", e.target.checked)}
                                                    className="checkbox checkbox-sm"
                                                />
                                                <span className="font-black text-sm">Product Name</span>
                                            </label>

                                            <label className="flex items-center gap-2 p-2 bg-white rounded-lg border border-gray-100 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={barcodeConfig.sheet.showBatchNo}
                                                    onChange={(e) => updateBarcodeConfig("sheet.showBatchNo", e.target.checked)}
                                                    className="checkbox checkbox-sm"
                                                />
                                                <span className="font-black text-sm">Batch No</span>
                                            </label>

                                            <label className="flex items-center gap-2 p-2 bg-white rounded-lg border border-gray-100 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={barcodeConfig.sheet.showSalePrice}
                                                    onChange={(e) => updateBarcodeConfig("sheet.showSalePrice", e.target.checked)}
                                                    className="checkbox checkbox-sm"
                                                />
                                                <span className="font-black text-sm">Sale Price</span>
                                            </label>
                                        </div>
                                    </div>

                                    <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div className="rounded-xl border border-gray-100 p-4">
                                            <div className="text-[11px] font-black uppercase tracking-widest text-gray-500 mb-2 flex items-center gap-2">
                                                <AlignLeft size={14} />
                                                Print Alignment
                                            </div>
                                            <div className="flex gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => updateBarcodeConfig("sheet.align", "left")}
                                                    className={`btn btn-sm flex-1 ${
                                                        barcodeConfig.sheet.align === "left" ? "btn-primary" : "btn-outline"
                                                    }`}
                                                >
                                                    <AlignLeft size={16} /> Left
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => updateBarcodeConfig("sheet.align", "right")}
                                                    className={`btn btn-sm flex-1 ${
                                                        barcodeConfig.sheet.align === "right" ? "btn-primary" : "btn-outline"
                                                    }`}
                                                >
                                                    <AlignRight size={16} /> Right
                                                </button>
                                            </div>
                                        </div>

                                        <div className="rounded-xl border border-gray-100 p-4">
                                            <div className="text-[11px] font-black uppercase tracking-widest text-gray-500 mb-2">Copies</div>

                                            <div className="flex flex-col gap-2">
                                                <label className="flex items-center gap-2 font-black text-sm cursor-pointer">
                                                    <input
                                                        type="radio"
                                                        name="sheetCopiesMode"
                                                        checked={barcodeConfig.sheet.copiesMode === "one"}
                                                        onChange={() => updateBarcodeConfig("sheet.copiesMode", "one")}
                                                    />
                                                    One label
                                                </label>

                                                <label className="flex items-center gap-2 font-black text-sm cursor-pointer">
                                                    <input
                                                        type="radio"
                                                        name="sheetCopiesMode"
                                                        checked={barcodeConfig.sheet.copiesMode === "byQty"}
                                                        onChange={() => updateBarcodeConfig("sheet.copiesMode", "byQty")}
                                                    />
                                                    By quantity
                                                </label>

                                                <label className="flex items-center gap-2 font-black text-sm cursor-pointer">
                                                    <input
                                                        type="radio"
                                                        name="sheetCopiesMode"
                                                        checked={barcodeConfig.sheet.copiesMode === "fixed"}
                                                        onChange={() => updateBarcodeConfig("sheet.copiesMode", "fixed")}
                                                    />
                                                    Fixed
                                                </label>

                                                <input
                                                    type="number"
                                                    min="1"
                                                    step="1"
                                                    value={barcodeConfig.sheet.fixedCopies}
                                                    onChange={(e) => updateBarcodeConfig("sheet.fixedCopies", e.target.value)}
                                                    disabled={barcodeConfig.sheet.copiesMode !== "fixed"}
                                                    className="input input-sm input-bordered font-mono"
                                                    placeholder="Copies"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-3 grid grid-cols-1 sm:grid-cols-4 gap-3">
                                        <div className="rounded-xl border border-gray-100 p-4">
                                            <div className="text-[11px] font-black uppercase tracking-widest text-gray-500 mb-2">W (mm)</div>
                                            <input
                                                type="number"
                                                min="20"
                                                step="1"
                                                value={barcodeConfig.sheet.labelWidthMm}
                                                onChange={(e) => updateBarcodeConfig("sheet.labelWidthMm", e.target.value)}
                                                className="input input-sm input-bordered font-mono w-full"
                                            />
                                        </div>

                                        <div className="rounded-xl border border-gray-100 p-4">
                                            <div className="text-[11px] font-black uppercase tracking-widest text-gray-500 mb-2">H (mm)</div>
                                            <input
                                                type="number"
                                                min="15"
                                                step="1"
                                                value={barcodeConfig.sheet.labelHeightMm}
                                                onChange={(e) => updateBarcodeConfig("sheet.labelHeightMm", e.target.value)}
                                                className="input input-sm input-bordered font-mono w-full"
                                            />
                                        </div>

                                        <div className="rounded-xl border border-gray-100 p-4">
                                            <div className="text-[11px] font-black uppercase tracking-widest text-gray-500 mb-2">Gap (mm)</div>
                                            <input
                                                type="number"
                                                min="0"
                                                step="1"
                                                value={barcodeConfig.sheet.gapMm}
                                                onChange={(e) => updateBarcodeConfig("sheet.gapMm", e.target.value)}
                                                className="input input-sm input-bordered font-mono w-full"
                                            />
                                        </div>

                                        <div className="rounded-xl border border-gray-100 p-4">
                                            <div className="text-[11px] font-black uppercase tracking-widest text-gray-500 mb-2">Img (px)</div>
                                            <input
                                                type="number"
                                                min="20"
                                                step="1"
                                                value={barcodeConfig.sheet.barcodeImgHeightPx}
                                                onChange={(e) => updateBarcodeConfig("sheet.barcodeImgHeightPx", e.target.value)}
                                                className="input input-sm input-bordered font-mono w-full"
                                            />
                                        </div>
                                    </div>

                                    <div className="mt-3 text-xs text-gray-500">
                                        <div className="font-bold">Note:</div>
                                        <div>Uses tec-it.com barcode service. Make sure your browser allows images from external sources.</div>
                                    </div>
                                </>
                            )}

                            {/* ========================= */}
                            {/* ✅ RP400 SETTINGS (SECOND JSX) */}
                            {/* ========================= */}
                            {barcodeConfig.printType === "rp400" && (
                                <>
                                    {/* ✅ Print Mode */}
                                    <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 mt-4">
                                        <div className="text-[11px] font-black uppercase tracking-widest text-gray-500 mb-2 flex items-center gap-2">
                                            <Layers size={14} />
                                            RP400 Print Mode
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                            <label className="flex items-center gap-2 p-2 bg-white rounded-lg border border-gray-100 cursor-pointer">
                                                <input
                                                    type="radio"
                                                    name="rp400PrintMode"
                                                    checked={barcodeConfig.rp400.printMode === "label"}
                                                    onChange={() => updateBarcodeConfig("rp400.printMode", "label")}
                                                />
                                                <span className="font-black text-sm">Label</span>
                                            </label>

                                            <label className="flex items-center gap-2 p-2 bg-white rounded-lg border border-gray-100 cursor-pointer">
                                                <input
                                                    type="radio"
                                                    name="rp400PrintMode"
                                                    checked={barcodeConfig.rp400.printMode === "slip"}
                                                    onChange={() => updateBarcodeConfig("rp400.printMode", "slip")}
                                                />
                                                <span className="font-black text-sm">Mini Slip</span>
                                            </label>
                                        </div>

                                        {barcodeConfig.rp400.printMode === "slip" && (
                                            <label className="mt-3 flex items-center gap-2 p-2 bg-white rounded-lg border border-gray-100 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={barcodeConfig.rp400.showSlipTotals}
                                                    onChange={(e) => updateBarcodeConfig("rp400.showSlipTotals", e.target.checked)}
                                                    className="checkbox checkbox-sm"
                                                />
                                                <span className="font-black text-sm">Show Qty line (Slip)</span>
                                            </label>
                                        )}

                                        <div className="mt-2 text-[11px] font-bold text-gray-500">
                                            IMPORTANT: Chrome print → Scale <span className="text-gray-900">100%</span> (no fit/shrink)
                                        </div>
                                    </div>

                                    {/* ✅ Label Content */}
                                    <div className="mt-4 rounded-xl border border-gray-100 bg-gray-50 p-4">
                                        <div className="text-[11px] font-black uppercase tracking-widest text-gray-500 mb-2 flex items-center gap-2">
                                            <Layers size={14} />
                                            Label Content
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                            <label className="flex items-center gap-2 p-2 bg-white rounded-lg border border-gray-100 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={barcodeConfig.rp400.showProductName}
                                                    onChange={(e) => updateBarcodeConfig("rp400.showProductName", e.target.checked)}
                                                    className="checkbox checkbox-sm"
                                                />
                                                <span className="font-black text-sm">Product Name</span>
                                            </label>

                                            <label className="flex items-center gap-2 p-2 bg-white rounded-lg border border-gray-100 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={barcodeConfig.rp400.showVariantName}
                                                    onChange={(e) => updateBarcodeConfig("rp400.showVariantName", e.target.checked)}
                                                    className="checkbox checkbox-sm"
                                                />
                                                <span className="font-black text-sm">Variant Name</span>
                                            </label>

                                            <label className="flex items-center gap-2 p-2 bg-white rounded-lg border border-gray-100 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={barcodeConfig.rp400.showBatchNo}
                                                    onChange={(e) => updateBarcodeConfig("rp400.showBatchNo", e.target.checked)}
                                                    className="checkbox checkbox-sm"
                                                />
                                                <span className="font-black text-sm">Batch No</span>
                                            </label>

                                            <label className="flex items-center gap-2 p-2 bg-white rounded-lg border border-gray-100 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={barcodeConfig.rp400.showSalePrice}
                                                    onChange={(e) => updateBarcodeConfig("rp400.showSalePrice", e.target.checked)}
                                                    className="checkbox checkbox-sm"
                                                />
                                                <span className="font-black text-sm">Sale Price</span>
                                            </label>

                                            <label className="flex items-center gap-2 p-2 bg-white rounded-lg border border-gray-100 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={barcodeConfig.rp400.showTextUnderBarcode}
                                                    onChange={(e) => updateBarcodeConfig("rp400.showTextUnderBarcode", e.target.checked)}
                                                    className="checkbox checkbox-sm"
                                                />
                                                <span className="font-black text-sm">Text under barcode</span>
                                            </label>
                                        </div>
                                    </div>

                                    {/* ✅ Orientation + Alignment */}
                                    <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div className="rounded-xl border border-gray-100 p-4">
                                            <div className="text-[11px] font-black uppercase tracking-widest text-gray-500 mb-2 flex items-center gap-2">
                                                <AlignLeft size={14} />
                                                Print Alignment
                                            </div>
                                            <div className="flex gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => updateBarcodeConfig("rp400.align", "left")}
                                                    className={`btn btn-sm flex-1 ${barcodeConfig.rp400.align === "left" ? "btn-primary" : "btn-outline"}`}
                                                >
                                                    <AlignLeft size={16} /> Left
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => updateBarcodeConfig("rp400.align", "center")}
                                                    className={`btn btn-sm flex-1 ${barcodeConfig.rp400.align === "center" ? "btn-primary" : "btn-outline"}`}
                                                >
                                                    Center
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => updateBarcodeConfig("rp400.align", "right")}
                                                    className={`btn btn-sm flex-1 ${barcodeConfig.rp400.align === "right" ? "btn-primary" : "btn-outline"}`}
                                                >
                                                    <AlignRight size={16} /> Right
                                                </button>
                                            </div>
                                        </div>

                                        <div className="rounded-xl border border-gray-100 p-4">
                                            <div className="text-[11px] font-black uppercase tracking-widest text-gray-500 mb-2">Orientation (Fix rotate)</div>
                                            <div className="flex gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => updateBarcodeConfig("rp400.orientation", "portrait")}
                                                    className={`btn btn-sm flex-1 ${
                                                        barcodeConfig.rp400.orientation === "portrait" ? "btn-primary" : "btn-outline"
                                                    }`}
                                                >
                                                    Portrait
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => updateBarcodeConfig("rp400.orientation", "landscape")}
                                                    className={`btn btn-sm flex-1 ${
                                                        barcodeConfig.rp400.orientation === "landscape" ? "btn-primary" : "btn-outline"
                                                    }`}
                                                >
                                                    Landscape
                                                </button>
                                            </div>
                                            <div className="text-[10px] font-bold text-gray-500 mt-2">
                                                If printer prints rotated/sideways → choose Landscape.
                                            </div>
                                        </div>
                                    </div>

                                    {/* ✅ Sizes */}
                                    <div className="mt-3 rounded-xl border border-gray-100 bg-gray-50 p-4">
                                        <div className="text-[11px] font-black uppercase tracking-widest text-gray-500 mb-2">Sizes</div>

                                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                                            <div className="rounded-xl border border-gray-100 p-4 bg-white">
                                                <div className="text-[11px] font-black uppercase tracking-widest text-gray-500 mb-2">Label W</div>
                                                <input
                                                    type="number"
                                                    min="20"
                                                    step="1"
                                                    value={barcodeConfig.rp400.labelWidthMm}
                                                    onChange={(e) => updateBarcodeConfig("rp400.labelWidthMm", e.target.value)}
                                                    className="input input-sm input-bordered font-mono w-full"
                                                />
                                            </div>

                                            <div className="rounded-xl border border-gray-100 p-4 bg-white">
                                                <div className="text-[11px] font-black uppercase tracking-widest text-gray-500 mb-2">Label H</div>
                                                <input
                                                    type="number"
                                                    min="15"
                                                    step="1"
                                                    value={barcodeConfig.rp400.labelHeightMm}
                                                    onChange={(e) => updateBarcodeConfig("rp400.labelHeightMm", e.target.value)}
                                                    className="input input-sm input-bordered font-mono w-full"
                                                />
                                            </div>

                                            <div className="rounded-xl border border-gray-100 p-4 bg-white">
                                                <div className="text-[11px] font-black uppercase tracking-widest text-gray-500 mb-2">Slip W</div>
                                                <input
                                                    type="number"
                                                    min="40"
                                                    step="1"
                                                    value={barcodeConfig.rp400.slipWidthMm}
                                                    onChange={(e) => updateBarcodeConfig("rp400.slipWidthMm", e.target.value)}
                                                    className="input input-sm input-bordered font-mono w-full"
                                                />
                                            </div>

                                            <div className="rounded-xl border border-gray-100 p-4 bg-white">
                                                <div className="text-[11px] font-black uppercase tracking-widest text-gray-500 mb-2">Slip H</div>
                                                <input
                                                    type="number"
                                                    min="10"
                                                    step="1"
                                                    value={barcodeConfig.rp400.slipHeightMm}
                                                    onChange={(e) => updateBarcodeConfig("rp400.slipHeightMm", e.target.value)}
                                                    className="input input-sm input-bordered font-mono w-full"
                                                />
                                            </div>
                                        </div>

                                        <div className="mt-3 grid grid-cols-1 sm:grid-cols-4 gap-3">
                                            <div className="rounded-xl border border-gray-100 p-4 bg-white">
                                                <div className="text-[11px] font-black uppercase tracking-widest text-gray-500 mb-2">Padding</div>
                                                <input
                                                    type="number"
                                                    min="0.5"
                                                    step="0.1"
                                                    value={barcodeConfig.rp400.paddingMm}
                                                    onChange={(e) => updateBarcodeConfig("rp400.paddingMm", e.target.value)}
                                                    className="input input-sm input-bordered font-mono w-full"
                                                />
                                            </div>

                                            <div className="rounded-xl border border-gray-100 p-4 bg-white">
                                                <div className="text-[11px] font-black uppercase tracking-widest text-gray-500 mb-2">Barcode H</div>
                                                <input
                                                    type="number"
                                                    min="8"
                                                    max="26"
                                                    step="0.5"
                                                    value={barcodeConfig.rp400.barcodeHeightMm}
                                                    onChange={(e) => updateBarcodeConfig("rp400.barcodeHeightMm", e.target.value)}
                                                    className="input input-sm input-bordered font-mono w-full"
                                                />
                                            </div>

                                            <div className="rounded-xl border border-gray-100 p-4 bg-white">
                                                <div className="text-[11px] font-black uppercase tracking-widest text-gray-500 mb-2">BarW (px)</div>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    max="3"
                                                    step="0.1"
                                                    value={barcodeConfig.rp400.barWidthPx}
                                                    onChange={(e) => updateBarcodeConfig("rp400.barWidthPx", e.target.value)}
                                                    className="input input-sm input-bordered font-mono w-full"
                                                />
                                                <div className="text-[10px] text-gray-500 mt-1 font-bold">0 = Auto</div>
                                            </div>

                                            <div className="rounded-xl border border-gray-100 p-4 bg-white">
                                                <div className="text-[11px] font-black uppercase tracking-widest text-gray-500 mb-2">Copies</div>
                                                <div className="flex flex-col gap-2">
                                                    <label className="flex items-center gap-2 font-black text-sm cursor-pointer">
                                                        <input
                                                            type="radio"
                                                            name="rp400CopiesMode"
                                                            checked={barcodeConfig.rp400.copiesMode === "one"}
                                                            onChange={() => updateBarcodeConfig("rp400.copiesMode", "one")}
                                                        />
                                                        One
                                                    </label>

                                                    <label className="flex items-center gap-2 font-black text-sm cursor-pointer">
                                                        <input
                                                            type="radio"
                                                            name="rp400CopiesMode"
                                                            checked={barcodeConfig.rp400.copiesMode === "byQty"}
                                                            onChange={() => updateBarcodeConfig("rp400.copiesMode", "byQty")}
                                                        />
                                                        By Qty
                                                    </label>

                                                    <label className="flex items-center gap-2 font-black text-sm cursor-pointer">
                                                        <input
                                                            type="radio"
                                                            name="rp400CopiesMode"
                                                            checked={barcodeConfig.rp400.copiesMode === "fixed"}
                                                            onChange={() => updateBarcodeConfig("rp400.copiesMode", "fixed")}
                                                        />
                                                        Fixed
                                                    </label>

                                                    <input
                                                        type="number"
                                                        min="1"
                                                        step="1"
                                                        value={barcodeConfig.rp400.fixedCopies}
                                                        onChange={(e) => updateBarcodeConfig("rp400.fixedCopies", e.target.value)}
                                                        disabled={barcodeConfig.rp400.copiesMode !== "fixed"}
                                                        className="input input-sm input-bordered font-mono"
                                                        placeholder="Copies"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-3 text-xs text-gray-500">
                                        <div className="font-bold">Fixed:</div>
                                        <div>✅ SVG stretch বন্ধ • ✅ viewBox set • ✅ Portrait/Landscape rotate fix</div>
                                    </div>
                                </>
                            )}

                            {/* ✅ Buttons */}
                            <div className="mt-4 flex gap-2">
                                <button type="button" onClick={closeBulkModal} className="btn btn-ghost flex-1">
                                    Cancel
                                </button>
                                <button type="button" onClick={handleBulkBarcodePrint} className="btn btn-primary flex-1">
                                    <Printer size={18} />
                                    Print Barcodes
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <PageHeader title={t("product.product_list", "Product List")} subtitle={t("product.subtitle", "Manage your all products from here.")}>
                <div className="flex items-center gap-2 flex-wrap">
                    <input
                        type="search"
                        onChange={handleSearch}
                        value={searchForm.data.search}
                        placeholder={t("product.search_placeholder", "Search products...")}
                        className="input input-sm"
                    />

                    <button onClick={() => router.visit(route("product.add"))} className="btn bg-[#1e4d2b] text-white btn-sm">
                        <Plus size={15} /> {t("product.add_new", "Add New")}
                    </button>

                    {/* ✅ Bulk print button */}
                    <button
                        type="button"
                        onClick={openBulkModal}
                        className={`btn btn-sm font-black ${
                            selectedCount > 0 ? "bg-gray-900 text-white hover:bg-black" : "bg-gray-100 text-gray-400 cursor-not-allowed"
                        }`}
                        disabled={selectedCount === 0}
                        title="Print selected barcodes"
                    >
                        <Barcode size={15} /> Print Selected ({selectedCount})
                    </button>

                    {selectedCount > 0 && (
                        <button type="button" onClick={clearSelectedBarcodes} className="btn btn-sm btn-outline font-black" title="Clear selection">
                            <X size={16} /> Clear
                        </button>
                    )}
                </div>
            </PageHeader>

            {/* ✅ Wrapper: keep horizontal scroll, but sticky first & last columns */}
            <div className="overflow-x-auto rounded-xl border border-gray-100">
                {safeProducts?.length > 0 ? (
                    <table className="table table-auto w-full min-w-[1100px]">
                        <thead className="bg-[#1e4d2b] text-white">
                            <tr>
                                {/* Sticky LEFT: expand toggle */}
                                <th className={`${stickyLeftTh} ${stickyShadowLeft} w-[54px]`}></th>

                                <th>{t("product.product_name", "Product Name")}</th>
                                <th className="w-[140px]">{t("product.category", "Category")}</th>
                                {/* <th className="w-[140px]">{t("product.attributes", "Attributes")}</th> */}
                                <th className="w-[140px]">{t("product.total_stock", "Total Stock")}</th>
                                <th className="w-[360px]">{t("product.variants", "Variants")}</th>
                                <th className="w-[360px]">{t("product.barcodes", "Barcodes")}</th>

                                {/* ✅ Sticky RIGHT: actions */}
                                <th className={`${stickyRightTh} ${stickyShadowRight} w-[120px] text-center`}>
                                    {t("product.actions", "Actions")}
                                </th>
                            </tr>
                        </thead>

                        <tbody>
                            {safeProducts.map((productItem) => {
                                const totalStock = calculateTotalStock(productItem);
                                const attributesCount = getUniqueAttributesCount(productItem);
                                const variantsCount = productItem?.variants?.length || 0;
                                const isExpanded = !!expandedProducts[productItem.id];

                                const totalBarcodes =
                                    productItem?.variants?.reduce((total, v) => total + getVariantBarcodes(v, productItem).length, 0) || 0;

                                return (
                                    <Fragment key={productItem.id}>
                                        <tr className="hover:bg-gray-50">
                                            {/* Sticky LEFT cell */}
                                            <td className={`${stickyLeftTd} ${stickyShadowLeft} w-[54px]`}>
                                                {variantsCount > 1 && (
                                                    <button
                                                        onClick={() => toggleExpand(productItem.id)}
                                                        className="btn btn-ghost btn-xs"
                                                        title={isExpanded ? "Hide variants" : "Show variants"}
                                                    >
                                                        {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                                    </button>
                                                )}
                                            </td>

                                            <td>
                                                <div className="font-medium">
                                                    {productItem.name}
                                                    <span className="text-xs text-gray-500">
                                                        {" "}
                                                        <i>({productItem.product_no})</i>{" "}
                                                    </span>
                                                </div>
                                            </td>

                                            <td>{productItem.category?.name || t("product.not_available", "N/A")}</td>

                                            {/* <td>
                                                <div className="flex items-center gap-2">
                                                    <Tag size={14} className="text-purple-600" />
                                                    <span className="text-sm">
                                                        {attributesCount}{" "}
                                                        {attributesCount === 1 ? t("product.attribute", "attribute") : t("product.attributes_plural", "attributes")}
                                                    </span>
                                                </div>
                                            </td> */}

                                            <td>
                                                <div className="flex items-center gap-2">
                                                    <Package size={16} className="text-blue-600" />
                                                    <div>
                                                        <div
                                                            className={`font-bold text-lg ${
                                                                totalStock === 0 ? "text-error" : totalStock < 10 ? "text-warning" : "text-success"
                                                            }`}
                                                        >
                                                            {totalStock}
                                                        </div>
                                                        <div className="text-xs text-gray-500">{t("product.units", "units")}</div>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Variants */}
                                            <td className="max-w-[360px]">
                                                <div className="flex flex-col gap-2">
                                                    {!isExpanded && variantsCount > 1 && (
                                                        <button
                                                            onClick={() => toggleExpand(productItem.id)}
                                                            className="btn btn-ghost btn-xs w-full text-primary justify-start"
                                                        >
                                                            <ChevronDown size={12} className="mr-1" />
                                                            Show {variantsCount} variants
                                                        </button>
                                                    )}

                                                    {(isExpanded || variantsCount <= 1) &&
                                                        productItem?.variants?.map((variant) => {
                                                            const hasAttributes = variant?.attribute_values && Object.keys(variant.attribute_values).length > 0;
                                                            const variantStock = variant?.stock?.quantity || 0;
                                                            const variantPrice = variant?.stock?.sale_price || 0;
                                                            const barcodes = getVariantBarcodes(variant, productItem);

                                                            return (
                                                                <div
                                                                    key={variant.id}
                                                                    className={`border p-2 rounded text-xs ${
                                                                        hasAttributes ? "border-primary bg-[#1e4d2b] text-white" : "border-dashed border-neutral"
                                                                    }`}
                                                                >
                                                                    <div className="flex justify-between items-start">
                                                                        <div className="flex-1">
                                                                            <div className="font-medium">{formatVariantDisplay(variant)}</div>

                                                                            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs">
                                                                                <span>
                                                                                    {t("product.stock", "Stock")}: {variantStock}
                                                                                </span>
                                                                                {variantPrice > 0 && (
                                                                                    <span>
                                                                                        {t("product.price", "Price")}: {formatCurrency(variantPrice)}
                                                                                    </span>
                                                                                )}
                                                                                {barcodes.length > 0 && (
                                                                                    <span className="flex items-center gap-1">
                                                                                        <Barcode size={10} />
                                                                                        {barcodes.length} barcode(s)
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}

                                                    {isExpanded && variantsCount > 1 && (
                                                        <button
                                                            onClick={() => toggleExpand(productItem.id)}
                                                            className="btn btn-ghost btn-xs w-full text-primary mt-1 justify-start"
                                                        >
                                                            <ChevronRight size={12} className="mr-1" />
                                                            Hide variants
                                                        </button>
                                                    )}
                                                </div>
                                            </td>

                                            {/* Barcodes column */}
                                            <td className="max-w-[360px]">
                                                <div className="flex flex-col gap-2">
                                                    <div className="flex items-center gap-2">
                                                        <Barcode size={14} className="text-blue-600" />
                                                        <span className="text-sm font-bold">
                                                            {totalBarcodes} {totalBarcodes === 1 ? "barcode" : "barcodes"}
                                                        </span>
                                                    </div>

                                                    {totalBarcodes > 0 ? (
                                                        <div className="space-y-2">
                                                            {productItem?.variants?.map((variant) => {
                                                                const barcodes = getVariantBarcodes(variant, productItem);
                                                                if (!barcodes.length) return null;

                                                                const variantName = formatVariantDisplay(variant);

                                                                return (
                                                                    <div key={variant.id} className="border rounded-lg p-2 bg-white">
                                                                        <div className="space-y-1">
                                                                            {barcodes.map((b, idx) => {
                                                                                const isSelected = selectedBarcodeMap.has(b.barcode);

                                                                                const rowForBulk = {
                                                                                    barcode: b.barcode,
                                                                                    batch_no: b.batch_no,
                                                                                    quantity: b.quantity,
                                                                                    purchase_price: b.purchase_price,
                                                                                    sale_price: b.sale_price,
                                                                                    warehouse_id: b.warehouse_id,
                                                                                    variant_id: b.variant_id,
                                                                                    productName: productItem.name,
                                                                                    variantName,
                                                                                };

                                                                                return (
                                                                                    <div
                                                                                        key={`${variant.id}-${b.barcode}-${idx}`}
                                                                                        className={`flex items-center justify-between p-2 rounded text-xs border ${
                                                                                            isSelected ? "bg-primary/10 border-primary/20" : "bg-gray-50 border-transparent"
                                                                                        }`}
                                                                                    >
                                                                                        <div className="flex items-center gap-2 min-w-0">
                                                                                            <button
                                                                                                type="button"
                                                                                                onClick={() => toggleSelectBarcode(rowForBulk)}
                                                                                                className="btn btn-ghost btn-xs"
                                                                                                title={isSelected ? "Unselect" : "Select"}
                                                                                            >
                                                                                                {isSelected ? (
                                                                                                    <CheckSquare size={16} className="text-primary" />
                                                                                                ) : (
                                                                                                    <Square size={16} className="text-gray-400" />
                                                                                                )}
                                                                                            </button>

                                                                                            <div className="min-w-0">
                                                                                                <div className="font-mono truncate max-w-[220px]">{b.barcode}</div>
                                                                                                <div className="text-[10px] text-gray-500">
                                                                                                    Batch: {b.batch_no || "N/A"} • Qty: {b.quantity || 0}
                                                                                                </div>
                                                                                            </div>
                                                                                        </div>

                                                                                        <div className="flex gap-1 shrink-0">
                                                                                            <button onClick={() => copyBarcode(b.barcode)} className="btn btn-xs btn-ghost" title="Copy Barcode">
                                                                                                <Copy size={10} />
                                                                                            </button>
                                                                                        </div>
                                                                                    </div>
                                                                                );
                                                                            })}
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    ) : (
                                                        <span className="text-xs text-gray-500 italic">No barcodes assigned</span>
                                                    )}
                                                </div>
                                            </td>

                                            {/* ✅ Sticky RIGHT Actions cell (no more scrolling away) */}
                                            <td className={`${stickyRightTd} ${stickyShadowRight} text-center`}>
                                                <div className="flex items-center justify-center gap-2">
                                                    {/* Desktop icons */}
                                                    <div className="hidden md:flex items-center gap-2">
                                                        <Link
                                                            href={route("product.add", { id: productItem.id })}
                                                            className="btn btn-xs btn-warning"
                                                            title={t("product.edit", "Edit Product")}
                                                        >
                                                            <Pen size={10} />
                                                        </Link>

                                                        <Link
                                                            href={route("product.del", { id: productItem.id })}
                                                            onClick={(e) => {
                                                                if (
                                                                    !confirm(
                                                                        t(
                                                                            "product.delete_confirmation",
                                                                            "Are you sure you want to delete this product? This action cannot be undone."
                                                                        )
                                                                    )
                                                                ) {
                                                                    e.preventDefault();
                                                                }
                                                            }}
                                                            className="btn btn-xs btn-error"
                                                            title={t("product.delete", "Delete Product")}
                                                        >
                                                            <Trash2 size={10} />
                                                        </Link>
                                                    </div>

                                                    {/* Mobile dropdown */}
                                                    <div className="md:hidden dropdown dropdown-end">
                                                        <button type="button" className="btn btn-xs btn-ghost" title="Actions">
                                                            <MoreVertical size={16} />
                                                        </button>
                                                        <ul className="dropdown-content z-[60] menu p-2 shadow bg-base-100 rounded-box w-44 border border-gray-100">
                                                            <li>
                                                                <Link href={route("product.add", { id: productItem.id })}>
                                                                    <Pen size={14} /> Edit
                                                                </Link>
                                                            </li>
                                                            <li>
                                                                <Link
                                                                    href={route("product.del", { id: productItem.id })}
                                                                    onClick={(e) => {
                                                                        if (!confirm("Delete this product?")) e.preventDefault();
                                                                    }}
                                                                >
                                                                    <Trash2 size={14} /> Delete
                                                                </Link>
                                                            </li>
                                                        </ul>
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>

                                        {/* Expanded variants row */}
                                        {isExpanded && (
                                            <tr>
                                                <td colSpan="8" className="bg-gray-50 p-4">
                                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                                        {productItem?.variants?.map((variant) => {
                                                            const barcodes = getVariantBarcodes(variant, productItem);
                                                            const variantStock = variant?.stock?.quantity || 0;
                                                            const variantPrice = variant?.stock?.sale_price || 0;
                                                            const variantName = formatVariantDisplay(variant);

                                                            return (
                                                                <div key={variant.id} className="border rounded-lg p-3 bg-white">
                                                                    <div className="font-medium mb-2">{variantName}</div>

                                                                    <div className="grid grid-cols-2 gap-2 mb-3">
                                                                        <div className="text-sm">
                                                                            <div className="text-gray-600">Stock</div>
                                                                            <div className="font-bold">{variantStock}</div>
                                                                        </div>
                                                                        <div className="text-sm">
                                                                            <div className="text-gray-600">Price</div>
                                                                            <div className="font-bold">{formatCurrency(variantPrice)}</div>
                                                                        </div>
                                                                    </div>

                                                                    {barcodes.length > 0 ? (
                                                                        <div>
                                                                            <div className="text-sm font-medium mb-2 flex items-center gap-2">
                                                                                <Barcode size={12} />
                                                                                Barcodes ({barcodes.length})
                                                                            </div>

                                                                            <div className="space-y-1">
                                                                                {barcodes.map((barcodeData, index) => {
                                                                                    const isSelected = selectedBarcodeMap.has(barcodeData.barcode);

                                                                                    const rowForBulk = {
                                                                                        barcode: barcodeData.barcode,
                                                                                        batch_no: barcodeData.batch_no,
                                                                                        quantity: barcodeData.quantity,
                                                                                        purchase_price: barcodeData.purchase_price,
                                                                                        sale_price: barcodeData.sale_price,
                                                                                        warehouse_id: barcodeData.warehouse_id,
                                                                                        variant_id: barcodeData.variant_id,
                                                                                        productName: productItem.name,
                                                                                        variantName,
                                                                                    };

                                                                                    return (
                                                                                        <div
                                                                                            key={`${variant.id}-${barcodeData.barcode}-${index}`}
                                                                                            className={`flex items-center justify-between p-2 rounded text-xs border ${
                                                                                                isSelected ? "bg-primary/10 border-primary/20" : "bg-gray-50 border-transparent"
                                                                                            }`}
                                                                                        >
                                                                                            <div className="flex items-center gap-2">
                                                                                                <button
                                                                                                    type="button"
                                                                                                    onClick={() => toggleSelectBarcode(rowForBulk)}
                                                                                                    className="btn btn-ghost btn-xs"
                                                                                                >
                                                                                                    {isSelected ? (
                                                                                                        <CheckSquare size={16} className="text-primary" />
                                                                                                    ) : (
                                                                                                        <Square size={16} className="text-gray-400" />
                                                                                                    )}
                                                                                                </button>

                                                                                                <div className="min-w-0">
                                                                                                    <div className="font-mono truncate max-w-[220px]">{barcodeData.barcode}</div>
                                                                                                    <div className="text-gray-500">Batch: {barcodeData.batch_no || "N/A"}</div>
                                                                                                </div>
                                                                                            </div>

                                                                                            <div className="flex gap-1">
                                                                                                <button onClick={() => copyBarcode(barcodeData.barcode)} className="btn btn-xs btn-ghost">
                                                                                                    <Copy size={10} />
                                                                                                </button>
                                                                                            </div>
                                                                                        </div>
                                                                                    );
                                                                                })}
                                                                            </div>
                                                                        </div>
                                                                    ) : (
                                                                        <div className="text-sm text-gray-500 italic">No barcodes for this variant</div>
                                                                    )}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </Fragment>
                                );
                            })}
                        </tbody>
                    </table>
                ) : (
                    <div className="border border-gray-200 rounded-box px-5 py-10 flex flex-col justify-center items-center gap-2">
                        <Frown size={20} className="text-gray-500" />
                        <h1 className="text-gray-500 text-sm">{t("product.no_products_found", "No products found!")}</h1>
                        <button onClick={() => router.visit(route("product.add"))} className="btn bg-[#1e4d2b] text-white btn-sm">
                            <Plus size={15} /> {t("product.add_new_product", "Add new product")}
                        </button>
                    </div>
                )}
            </div>

            <Pagination data={product} />
        </div>
    );
}