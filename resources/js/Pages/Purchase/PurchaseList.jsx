import PageHeader from "../../components/PageHeader";
import Pagination from "../../components/Pagination";
import { Link, router, usePage } from "@inertiajs/react";
import {
  Eye,
  Plus,
  Trash2,
  Frown,
  Calendar,
  User,
  Warehouse,
  Edit,
  Search,
  X,
  RefreshCw,
  CreditCard,
  CheckCircle,
  AlertCircle,
  Receipt,
  Barcode as BarcodeIcon,
  Printer,
  CheckSquare,
  Square,
  Layers,
  AlignLeft,
  AlignRight,
  Tag,
  Copy,
  Download,
  Filter,
  ChevronUp,
  ChevronDown,
  LayoutGrid,
} from "lucide-react";
import { useMemo, useState, useEffect, useCallback } from "react";
import { useTranslation } from "../../hooks/useTranslation";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { toast } from "react-toastify";
import JsBarcode from "jsbarcode";

export default function PurchaseList({ purchases, filters, isShadowUser, accounts }) {
  const { auth } = usePage().props;
  const { t, locale } = useTranslation();
  const [showFilters, setShowFilters] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const safePurchases = purchases?.data || [];

  const [localFilters, setLocalFilters] = useState({
    search: filters?.search || "",
    status: filters?.status || "",
    date: filters?.date || "",
    date_from: filters?.date_from || "",
    date_to: filters?.date_to || "",
  });

  // ===================== Payment Modal =====================
  const [paymentForm, setPaymentForm] = useState({
    payment_amount: "",
    account_id: "",
    notes: "",
  });

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState(null);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [paymentErrors, setPaymentErrors] = useState({});

  // ===================== Bulk Barcode Print =====================
  const [selectedPurchaseIds, setSelectedPurchaseIds] = useState(() => new Set());
  const [showBarcodeModal, setShowBarcodeModal] = useState(false);

  // ✅ per-barcode copies map { [key]: copies }
  const [barcodeCopiesMap, setBarcodeCopiesMap] = useState({});
  // ✅ default copies input (shown near Print)
  const [defaultBarcodeCopies, setDefaultBarcodeCopies] = useState(1);

  const clampInt = (v, min = 1, max = 999) => {
    const n = parseInt(v, 10);
    if (!Number.isFinite(n)) return min;
    return Math.max(min, Math.min(max, n));
  };

  // ===================== Barcode Config =====================
  // ✅ Keep your first JSX defaults + add second JSX (SVG/RP400) options
  const [barcodeConfig, setBarcodeConfig] = useState({
    // which print type
    printType: "img", // "img" | "svg"

    // content
    showProductName: true,
    showBatchNo: true,
    showSalePrice: false,
    showSiNo: false,

    // alignment (img grid + sheet)
    align: "left", // left | right

    // label size (used for BOTH types)
    labelWidthMm: 38,
    labelHeightMm: 25,
    gapMm: 2,

    // copies
    copiesMode: "one", // one | byQty | fixed | manual
    fixedCopies: 1,

    // IMG mode (tec-it)
    barcodeImgHeightPx: 50,

    // SVG mode (sharp RP400)
    layoutMode: "label", // label (1 per page) | sheet (grid)
    paddingMm: 1.2,
    barcodeFormat: "CODE128",
    barcodeHeightMm: 33, // tuned for your 30mm height; change from UI if needed
    barWidthPx: 1.2,
    showTextUnderBarcode: false,
    paperWidthMm: 104, // sheet mode only
  });

  const selectedPurchases = useMemo(() => {
    const ids = selectedPurchaseIds;
    return safePurchases.filter((p) => ids.has(p.id));
  }, [safePurchases, selectedPurchaseIds]);

  // ===================== Helpers =====================
  const formatCurrency = (amount) => {
    const num = parseFloat(amount) || 0;
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "BDT",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num);
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-US", { day: "2-digit", month: "short", year: "numeric" });
    } catch {
      return dateString;
    }
  };

  // Format date for filename
  const formatDateForFilename = () => {
    const now = new Date();
    return (
      now.toISOString().split("T")[0] +
      "_" +
      now.getHours() +
      "-" +
      now.getMinutes() +
      "-" +
      now.getSeconds()
    );
  };

  const formatAccountBalance = (balance) => {
    const num = parseFloat(balance) || 0;
    return new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num);
  };

  const copyText = (txt) => {
    const text = String(txt || "");
    if (!text) return;
    navigator.clipboard?.writeText(text).catch(() => { });
  };

  const escapeHtml = (str) => {
    return String(str ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  };

  // ===================== Filters =====================
  const handleFilter = (field, value) => {
    const newFilters = { ...localFilters, [field]: value };
    setLocalFilters(newFilters);
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      applyFilters();
    }
  };

  const applyFilters = () => {
    const qs = {};
    if (localFilters.search) qs.search = localFilters.search;
    if (localFilters.status) qs.status = localFilters.status;
    if (localFilters.date) qs.date = localFilters.date;
    if (localFilters.date_from) qs.date_from = localFilters.date_from;
    if (localFilters.date_to) qs.date_to = localFilters.date_to;

    router.get(route("purchase.list"), qs, {
      preserveScroll: true,
      preserveState: true,
      replace: true,
    });
  };

  const clearFilters = () => {
    setLocalFilters({
      search: "",
      status: "",
      date: "",
      date_from: "",
      date_to: "",
    });
    router.get(route("purchase.list"), {}, { replace: true });
  };

  // Toggle filter section
  const toggleFilters = () => {
    setShowFilters(!showFilters);
  };

  // Check if any filter is active
  const hasActiveFilters = () => {
    return (
      localFilters.search ||
      localFilters.status ||
      localFilters.date ||
      localFilters.date_from ||
      localFilters.date_to
    );
  };

  // Format date for input
  const formatDateForInput = (dateString) => {
    if (!dateString) return "";
    return new Date(dateString).toISOString().split("T")[0];
  };

  const handleDelete = (id) => {
    if (confirm("Permanently wipe record and reverse stock?")) {
      router.delete(route("purchase.destroy", id));
    }
  };

  // ===================== Amounts =====================
  const getDisplayAmounts = (purchase) => {
    if (!purchase) return { total: 0, paid: 0, due: 0, payment_status: "unpaid" };

    const total = parseFloat(purchase.grand_total) || 0;
    const paid = parseFloat(purchase.paid_amount) || 0;
    const due = parseFloat(purchase.due_amount) || 0;
    const paymentStatus = purchase.payment_status || "unpaid";

    if (isShadowUser && purchase.shadow_total_amount !== undefined) {
      return {
        total: parseFloat(purchase.shadow_total_amount) || total,
        paid: parseFloat(purchase.shadow_paid_amount) || paid,
        due: parseFloat(purchase.shadow_due_amount) || due,
        payment_status: purchase.shadow_payment_status || paymentStatus,
      };
    }

    return { total, paid, due: due > 0 ? due : Math.max(0, total - paid), payment_status: paymentStatus };
  };

  // ===================== Payment Modal =====================
  const openPaymentModal = (purchase) => {
    const amounts = getDisplayAmounts(purchase);
    setSelectedPurchase(purchase);
    setPaymentForm({
      payment_amount: Math.max(0, amounts.due).toFixed(2),
      account_id: "",
      notes: "",
    });
    setPaymentErrors({});
    setShowPaymentModal(true);
  };

  const closePaymentModal = () => {
    setShowPaymentModal(false);
    setSelectedPurchase(null);
    setPaymentForm({ payment_amount: "", account_id: "", notes: "" });
    setProcessingPayment(false);
    setPaymentErrors({});
  };

  const validatePaymentForm = () => {
    const errors = {};
    const amounts = getDisplayAmounts(selectedPurchase);
    const maxAmount = amounts.due;

    if (!paymentForm.account_id) errors.account_id = "Please select a payment method";
    if (!paymentForm.payment_amount || parseFloat(paymentForm.payment_amount) <= 0) {
      errors.payment_amount = "Please enter a valid payment amount";
    } else if (parseFloat(paymentForm.payment_amount) > maxAmount) {
      errors.payment_amount = `Payment amount cannot exceed due amount of ${formatCurrency(maxAmount)}`;
    }
    return errors;
  };

  const handlePaymentFormChange = (field, value) => {
    setPaymentForm((prev) => ({ ...prev, [field]: value }));
    if (paymentErrors[field]) setPaymentErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const setFullPayment = () => {
    if (!selectedPurchase) return;
    const amounts = getDisplayAmounts(selectedPurchase);
    handlePaymentFormChange("payment_amount", Math.max(0, amounts.due).toFixed(2));
  };

  const setHalfPayment = () => {
    if (!selectedPurchase) return;
    const amounts = getDisplayAmounts(selectedPurchase);
    handlePaymentFormChange("payment_amount", Math.max(0, amounts.due * 0.5).toFixed(2));
  };

  const handlePaymentSubmit = (e) => {
    e.preventDefault();
    if (!selectedPurchase) return;

    const errors = validatePaymentForm();
    if (Object.keys(errors).length > 0) return setPaymentErrors(errors);

    setProcessingPayment(true);

    router.patch(
      route("purchase.updatePayment", selectedPurchase.id),
      {
        payment_amount: parseFloat(paymentForm.payment_amount),
        account_id: paymentForm.account_id,
        notes: paymentForm.notes,
      },
      {
        preserveScroll: true,
        onSuccess: () => {
          closePaymentModal();
          router.reload({ only: ["purchases"], preserveScroll: true });
        },
        onError: (errors) => {
          const formatted = {};
          Object.keys(errors).forEach((k) => (formatted[k] = Array.isArray(errors[k]) ? errors[k][0] : errors[k]));
          setPaymentErrors(formatted);
        },
        onFinish: () => setProcessingPayment(false),
      }
    );
  };

  // ===================== Bulk Select =====================
  const isAllSelected = safePurchases.length > 0 && selectedPurchaseIds.size === safePurchases.length;

  const toggleSelectAll = () => {
    setSelectedPurchaseIds((prev) => {
      const next = new Set(prev);
      if (safePurchases.length === 0) return next;

      if (next.size === safePurchases.length) next.clear();
      else safePurchases.forEach((p) => next.add(p.id));

      return next;
    });
  };

  const toggleSelectOne = (id) => {
    setSelectedPurchaseIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const clearSelection = () => setSelectedPurchaseIds(new Set());

  // ===================== Barcode Modal =====================
  const openBarcodeModal = () => {
    if (selectedPurchaseIds.size === 0) return alert("Please select at least 1 purchase");
    setShowBarcodeModal(true);
  };
  const closeBarcodeModal = () => setShowBarcodeModal(false);

  const updateBarcodeConfig = (key, value) => {
    const numberKeys = [
      "labelWidthMm",
      "labelHeightMm",
      "gapMm",
      "fixedCopies",
      "barcodeImgHeightPx",
      "paddingMm",
      "barcodeHeightMm",
      "barWidthPx",
      "paperWidthMm",
    ];
    setBarcodeConfig((prev) => ({
      ...prev,
      [key]: numberKeys.includes(key) ? Number(value) : value,
    }));
  };

  // ===================== Barcode Image Generator (IMG/TEC-IT) =====================
  const getBarcodeImageUrl = (codeValue) => {
    const code = String(codeValue || "").trim();
    if (!code) return "";
    return `https://barcode.tec-it.com/barcode.ashx?data=${encodeURIComponent(code)}&code=Code128&dpi=120&quiet=0`;
  };

  // ===================== ✅ SVG BARCODE GENERATOR (SHARP RP400) =====================
  const generateBarcodeSvgString = useCallback(
    (codeValue) => {
      const code = String(codeValue || "").trim();
      if (!code) return "";

      try {
        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");

        JsBarcode(svg, code, {
          format: barcodeConfig.barcodeFormat || "CODE128",
          displayValue: false,
          margin: 0,
          height: 60,
          width: Number(barcodeConfig.barWidthPx || 1.2),
          lineColor: "#000",
          background: "#fff",
        });

        svg.removeAttribute("width");
        svg.removeAttribute("height");
        svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");

        return svg.outerHTML;
      } catch (e) {
        console.error("Barcode SVG generate failed:", e);
        return "";
      }
    },
    [barcodeConfig.barcodeFormat, barcodeConfig.barWidthPx]
  );

  // ===================== ✅ Build Labels (supports BOTH types) =====================
  // return:
  // { uniqueLabels: [..] } -> one per unique barcodeKey
  // { expandedLabels: [..] } -> repeated by qty for print
  const buildBarcodeLabels = useCallback(() => {
    const uniqueLabels = [];
    const expandedLabels = [];
    const seen = new Set();

    const { copiesMode, fixedCopies } = barcodeConfig;

    const resolveDefaultCopies = (qty) => {
      if (copiesMode === "fixed") return clampInt(fixedCopies || 1);
      if (copiesMode === "byQty") return clampInt(Math.round(Number(qty || 1)));
      // one বা manual → default 1 (manual copies map থেকে হবে)
      return 1;
    };

    selectedPurchases.forEach((purchase) => {
      const items = Array.isArray(purchase?.items) ? purchase.items : [];

      items.forEach((item) => {
        const product = item?.product || {};
        const stock = item?.stock || {};

        const barcode =
          stock?.barcode ||
          product?.barcode ||
          item?.barcode ||
          stock?.batch_no ||
          item?.batch_no ||
          product?.sku ||
          "";

        const code = String(barcode || "").trim();
        if (!code) return;

        const batchNo = String(stock?.batch_no || item?.batch_no || "").trim();
        const key = `${code}__${batchNo || "-"}`;
        if (seen.has(key)) return;
        seen.add(key);

        // build both payloads
        const imgSrc = getBarcodeImageUrl(code);
        const svgHtml = generateBarcodeSvgString(code); // may be used when printType=svg

        const base = {
          key,
          codeValue: code,
          imgSrc,
          svgHtml,
          productName: product?.name || item?.product_name || "Product",
          batchNo,
          salePrice: item?.sale_price ?? product?.sale_price ?? "",
          itemQty: Number(item?.quantity || 1),
        };

        uniqueLabels.push(base);

        let copies = 1;

        if (copiesMode === "manual") {
          copies = clampInt(barcodeCopiesMap[key] ?? defaultBarcodeCopies ?? 1);
        } else {
          copies = resolveDefaultCopies(base.itemQty);
        }

        for (let i = 0; i < copies; i++) {
          expandedLabels.push(base);
        }
      });
    });

    return { uniqueLabels, expandedLabels };
  }, [selectedPurchases, barcodeConfig, barcodeCopiesMap, defaultBarcodeCopies, generateBarcodeSvgString]);

  // ===================== ✅ auto-seed copies map when modal opens or selection changes =====================
  useEffect(() => {
    if (!showBarcodeModal) return;

    setBarcodeCopiesMap((prev) => {
      const next = { ...prev };
      const { uniqueLabels } = buildBarcodeLabels();

      uniqueLabels.forEach((l) => {
        if (next[l.key] == null) {
          // default seed:
          // byQty → item qty, fixed → fixed copies, otherwise defaultBarcodeCopies
          if (barcodeConfig.copiesMode === "byQty") next[l.key] = clampInt(l.itemQty || 1);
          else if (barcodeConfig.copiesMode === "fixed") next[l.key] = clampInt(barcodeConfig.fixedCopies || 1);
          else next[l.key] = clampInt(defaultBarcodeCopies || 1);
        }
      });

      // remove keys that are no longer present
      const alive = new Set(uniqueLabels.map((l) => l.key));
      Object.keys(next).forEach((k) => {
        if (!alive.has(k)) delete next[k];
      });

      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showBarcodeModal, selectedPurchaseIds]);

  // ===================== PRINT FUNCTION (BOTH TYPES) =====================
  const handleBarcodePrint = () => {
    const { expandedLabels } = buildBarcodeLabels();
    if (!expandedLabels.length) return alert("No barcodes found to print.");

    // ========== TYPE 1: IMG Grid (your first JSX) ==========
    if (barcodeConfig.printType === "img") {
      const {
        showProductName,
        showBatchNo,
        showSalePrice,
        showSiNo,
        align,
        labelWidthMm,
        labelHeightMm,
        gapMm,
        barcodeImgHeightPx,
      } = barcodeConfig;

      const printWindow = window.open("", "_blank");
      if (!printWindow) return alert("Please allow popups to print barcodes.");

      const css = `
        @page { margin: 3mm; }        
        @media print { body { padding:0; } }

        * { box-sizing:border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        body {
          margin: 0;
          padding: 0;
          font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial;
          background:#fff;
          color:#0f172a;
        }

        .sheet { width: 100%; }

        .grid-wrap {
          width: 100%;
          display: grid;
          grid-auto-flow: row;
          grid-template-columns: repeat(auto-fit, ${Number(labelWidthMm)}mm);
          gap: ${Number(gapMm)}mm;

          justify-content: ${align === "right" ? "end" : "start"};
          align-content: start;
        }

        .label {
          width:${Number(labelWidthMm)}mm;
          height:${Number(labelHeightMm)}mm;
          padding:4px 2px;
          border-radius:8px;
          background:#fff;
          border: 1px solid #e5e7eb;
          display:flex;
          flex-direction:column;
          overflow:hidden;
          break-inside:avoid;
          page-break-inside:avoid;
          flex-shrink: 0;
          position: relative;
        }

        .barcodeArea {
          display:flex;
          flex-direction:column;
          align-items:center;
          justify-content:center;
          gap:2px;
          height:100%;
          width:100%;
          text-align:center;
        }

        .si-no {
          position: absolute;
          top: 2px;
          left: 4px;
          font-size: 8px;
          font-weight: 900;
          color: #ef4444;
          background: #fee2e2;
          padding: 1px 4px;
          border-radius: 4px;
          line-height: 1.2;
        }

        .name {
          width:100%;
          font-weight:900;
          font-size:10px;
          color:#0f172a;
          display:-webkit-box;
        }

        .barcodeImg {
          height:${Number(barcodeImgHeightPx)}px;
          width: 100%;
          object-fit: contain;
          display:block;
          margin: 0 auto;
        }

        .batch,
        .price {
          width:100%;
          font-size:10px;
          font-weight:900;
          color:#0f172a;
          white-space:nowrap;
          text-overflow:ellipsis;
        }

        .batch { color:#475569; font-weight:800;}
        .price { letter-spacing: .2px; }

        .no-print { text-align:center; margin-top:14px; color:#64748b; font-weight:900; }
        .btn { border:none; padding:8px 14px; border-radius:12px; font-weight:900; cursor:pointer; margin:0 6px; background:#111827; color:#fff; }
        .btn.ghost { background:#f1f5f9; color:#111827; }
      `;

      const labelsHtml = expandedLabels
        .map((l, index) => {
          const productName = escapeHtml(l.productName || "");
          const batchNo = escapeHtml(l.batchNo || "");
          const codeValue = escapeHtml(l.codeValue || "");
          const imgSrc = escapeHtml(l.imgSrc || "");
          const siNo = index + 1;

          const siNoHtml = showSiNo ? `<div class="si-no">#${siNo}</div>` : "";
          const nameHtml = showProductName ? `<div class="name">${productName}</div>` : "";
          const batchHtml = showBatchNo
            ? `<div class="batch">${batchNo ? `Batch: ${batchNo}` : "Batch: -"}</div>`
            : "";
          const priceHtml = showSalePrice
            ? `<div class="price">${l.salePrice ? `৳${Number(l.salePrice).toFixed(2)}` : "-"}</div>`
            : "";

          return `
            <div class="label">
              ${siNoHtml}
              <div class="barcodeArea">
                ${nameHtml}
                <img class="barcodeImg" src="${imgSrc}" alt="Barcode ${codeValue}" />
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
          <div class="sheet">
            <div class="grid-wrap">${labelsHtml}</div>
          </div>

          <div class="no-print">
            Total: ${expandedLabels.length} labels
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

      closeBarcodeModal();
      return;
    }

    // ========== TYPE 2: SVG Exact (RP400 sharp) ==========
    const {
      showProductName,
      showBatchNo,
      showSalePrice,
      showSiNo,
      align,
      labelWidthMm,
      labelHeightMm,
      paddingMm,
      barcodeHeightMm,
      layoutMode,
      paperWidthMm,
      gapMm,
      showTextUnderBarcode,
    } = barcodeConfig;

    // ensure svg exists
    const broken = expandedLabels.find((l) => !l.svgHtml);
    if (broken) {
      alert("Some barcodes could not be generated (SVG). Check console and barcode value.");
      return;
    }

    const labelW = Number(labelWidthMm);
    const labelH = Number(labelHeightMm);
    const pad = Number(paddingMm);
    const barcodeH = Number(barcodeHeightMm);

    const paperW = Number(paperWidthMm);
    const gap = Number(gapMm);
    const cols = Math.max(1, Math.floor((paperW + gap) / (labelW + gap)));

    const printWindow = window.open("", "_blank");
    if (!printWindow) return alert("Please allow popups to print barcodes.");

    const css = `
      /* ✅ exact page size per label (label mode) */
      @page { size: ${labelW}mm ${labelH}mm; margin: 0mm; }
      html, body { margin:0; padding:0; background:#fff; }
      * { box-sizing:border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }

      .page { width:${labelW}mm; height:${labelH}mm; }

      .label {
        width: ${labelW}mm;
        height: ${labelH}mm;
        padding: ${pad}mm;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
      }

      .wrap {
        width: 100%;
        height: 100%;
        display:flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        text-align:center;
      }

      .si-no {
        position: absolute;
        top: ${pad}mm;
        left: ${pad}mm;
        font-size: 7.5pt;
        font-weight: 900;
        background: #efefef;
        padding: 0.5mm 1mm;
        border-radius: 1mm;
      }

      .name {
        width: 100%;
        font-size: 7pt;
        font-weight: 900;
      }

      .barcodeBox {
        width: 100%;
        height: ${barcodeH}mm;
        display:flex;
        align-items:center;
        justify-content:center;
      }

      .barcodeBox svg {
        width: 100%;
        height: 100%;
        display: block;
      }
      .barcodeBox svg * {
        shape-rendering: crispEdges;
      }

      .batch {
        width: 100%;
        font-size: 9pt;
        font-weight: 800;
        white-space: nowrap;
        text-overflow: ellipsis;
        color:#111;
      }

      .price {
        width: 100%;
        font-size: 9pt;
        font-weight: 900;
      }

      @media screen {
        .no-print { display:block; padding: 12px; border-top:1px solid #ddd; text-align:center; }
        .btn { border:none; padding:8px 14px; border-radius:10px; font-weight:900; cursor:pointer; margin:0 6px; background:#111; color:#fff; }
        .btn.ghost { background:#eee; color:#111; }
      }
      @media print {
        .no-print { display:none; }
      }

      .sheet { padding: 2mm; }
      .grid-wrap {
        width: 100%;
        display: grid;
        grid-template-columns: repeat(${cols}, ${labelW}mm);
        gap: ${gap}mm;
        justify-content: ${align === "right" ? "end" : "start"};
      }
    `;

    const labelHtml = (l, index) => {
      const productName = escapeHtml(l.productName || "");
      const batchNo = escapeHtml(l.batchNo || "");
      const codeValue = escapeHtml(l.codeValue || "");
      const siNo = index + 1;

      const siNoHtml = showSiNo ? `<div class="si-no">#${siNo}</div>` : "";
      const nameHtml = showProductName ? `<div class="name">${productName}</div>` : "";
      const batchHtml = showBatchNo ? `<div class="batch">${batchNo ? `Batch: ${batchNo}` : ""}</div>` : "";
      const priceHtml = showSalePrice ? `<div class="price">${l.salePrice ? `৳${Number(l.salePrice).toFixed(2)}` : ""}</div>` : "";

      const barcodeSvg = l.svgHtml || "";
      const textUnder = showTextUnderBarcode
        ? `<div style="font-size:7pt;font-weight:900;margin-top:0.4mm;letter-spacing:.2px;">${codeValue}</div>`
        : "";

      return `
        <div class="label" style="position:relative;">
          ${siNoHtml}
          <div class="wrap">
            ${nameHtml}
            <div class="barcodeBox">${barcodeSvg}</div>
            ${textUnder}
            ${batchHtml}
            ${priceHtml}
          </div>
        </div>
      `;
    };

    let bodyHtml = "";
    if (layoutMode === "label") {
      bodyHtml = expandedLabels.map((l, idx) => `<div class="page">${labelHtml(l, idx)}</div>`).join("");
    } else {
      bodyHtml = `
        <div class="sheet">
          <div class="grid-wrap">
            ${expandedLabels.map((l, idx) => labelHtml(l, idx)).join("")}
          </div>
        </div>
      `;
    }

    const html = `
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Barcode Labels (SVG)</title>
          <style>${css}</style>
        </head>
        <body>
          ${bodyHtml}

          <div class="no-print">
            <div style="font-size:12px;font-weight:900;">
              IMPORTANT: Print dialog → <b>Scale 100%</b> (NO fit/shrink), disable headers/footers.
            </div>
            <div style="margin-top:10px;">
              <button class="btn" onclick="window.print()">Print</button>
              <button class="btn ghost" onclick="window.close()">Close</button>
            </div>
          </div>

          <script>
            setTimeout(function(){ window.print(); }, 200);
          </script>
        </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();

    closeBarcodeModal();
  };

  // ===================== Prepare data for export =====================
  const prepareExportData = () => {
    return safePurchases.map((purchase) => {
      const amounts = getDisplayAmounts(purchase);

      return {
        "Purchase No": purchase.purchase_no,
        Supplier: purchase.supplier?.name || "N/A",
        Warehouse: purchase.warehouse?.name || "N/A",
        "Total (Tk)": amounts.total.toFixed(2),
        "Paid (Tk)": amounts.paid.toFixed(2),
        "Due (Tk)": amounts.due.toFixed(2),
        "Payment Status": amounts.payment_status,
        "Purchase Status": purchase.status || "N/A",
        Date: formatDate(purchase.purchase_date),
        "Items Count": purchase.items?.length || 0,
        "Created By": purchase.creator?.name || "System",
      };
    });
  };

  // ===================== Download as CSV =====================
  const downloadCSV = () => {
    try {
      setIsDownloading(true);
      const exportData = prepareExportData();

      if (exportData.length === 0) {
        toast.warning("No data to export");
        return;
      }

      const headers = Object.keys(exportData[0]);
      const csvRows = [];

      csvRows.push(headers.join(","));

      for (const row of exportData) {
        const values = headers.map((header) => {
          const value = row[header]?.toString() || "";
          return `"${value.replace(/"/g, '""')}"`;
        });
        csvRows.push(values.join(","));
      }

      csvRows.push("");
      csvRows.push("FILTER INFORMATION");
      csvRows.push(`Search,${localFilters.search || "None"}`);
      csvRows.push(`Status,${localFilters.status || "All"}`);
      csvRows.push(`Date,${localFilters.date || "None"}`);
      csvRows.push(`Date From,${localFilters.date_from || "None"}`);
      csvRows.push(`Date To,${localFilters.date_to || "None"}`);

      csvRows.push("");
      csvRows.push("SUMMARY STATISTICS");
      const totals = safePurchases.reduce(
        (acc, purchase) => {
          const amounts = getDisplayAmounts(purchase);
          acc.total += amounts.total;
          acc.paid += amounts.paid;
          acc.due += amounts.due;
          return acc;
        },
        { total: 0, paid: 0, due: 0 }
      );

      csvRows.push(`Total Purchases,${safePurchases.length}`);
      csvRows.push(`Total Amount (Tk),${totals.total.toFixed(2)}`);
      csvRows.push(`Total Paid (Tk),${totals.paid.toFixed(2)}`);
      csvRows.push(`Total Due (Tk),${totals.due.toFixed(2)}`);

      const csvString = csvRows.join("\n");

      const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.href = url;
      link.download = `purchases_report_${formatDateForFilename()}.csv`;
      link.click();
      URL.revokeObjectURL(url);

      toast.success("CSV downloaded successfully");
    } catch (error) {
      console.error("Error downloading CSV:", error);
      toast.error("Failed to download CSV");
    } finally {
      setIsDownloading(false);
    }
  };

  // ===================== Download as Excel =====================
  const downloadExcel = () => {
    try {
      setIsDownloading(true);
      const exportData = prepareExportData();

      if (exportData.length === 0) {
        toast.warning("No data to export");
        return;
      }

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(exportData);

      const filterData = [
        { Filter: "Search", Value: localFilters.search || "None" },
        { Filter: "Status", Value: localFilters.status || "All" },
        { Filter: "Date", Value: localFilters.date || "None" },
        { Filter: "Date From", Value: localFilters.date_from || "None" },
        { Filter: "Date To", Value: localFilters.date_to || "None" },
      ];
      const wsFilters = XLSX.utils.json_to_sheet(filterData);

      const totals = safePurchases.reduce(
        (acc, purchase) => {
          const amounts = getDisplayAmounts(purchase);
          acc.total += amounts.total;
          acc.paid += amounts.paid;
          acc.due += amounts.due;
          return acc;
        },
        { total: 0, paid: 0, due: 0 }
      );

      const summaryData = [
        { Metric: "Total Purchases", Value: safePurchases.length },
        { Metric: "Total Amount (Tk)", Value: totals.total.toFixed(2) },
        { Metric: "Total Paid (Tk)", Value: totals.paid.toFixed(2) },
        { Metric: "Total Due (Tk)", Value: totals.due.toFixed(2) },
      ];
      const wsSummary = XLSX.utils.json_to_sheet(summaryData);

      XLSX.utils.book_append_sheet(wb, ws, "Purchases");
      XLSX.utils.book_append_sheet(wb, wsFilters, "Filters Applied");
      XLSX.utils.book_append_sheet(wb, wsSummary, "Summary");

      XLSX.writeFile(wb, `purchases_report_${formatDateForFilename()}.xlsx`);

      toast.success("Excel file downloaded successfully");
    } catch (error) {
      console.error("Error downloading Excel:", error);
      toast.error("Failed to download Excel file");
    } finally {
      setIsDownloading(false);
    }
  };

  // ===================== Download as PDF =====================
  const downloadPDF = () => {
    try {
      setIsDownloading(true);
      const exportData = prepareExportData();

      if (exportData.length === 0) {
        toast.warning("No data to export");
        return;
      }

      const doc = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4",
      });

      doc.setFontSize(16);
      doc.setTextColor(30, 77, 43);
      doc.text("Purchase Report", 14, 15);

      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 22);

      doc.setFontSize(9);
      doc.setTextColor(80, 80, 80);
      doc.text(`Search: ${localFilters.search || "None"} | Status: ${localFilters.status || "All"}`, 14, 29);
      doc.text(
        `Date: ${localFilters.date || "None"} | Date Range: ${localFilters.date_from || "Start"} to ${localFilters.date_to || "End"}`,
        14,
        35
      );

      const tableColumns = ["Purchase No", "Supplier", "Total", "Paid", "Due", "Status", "Date"];

      const tableRows = exportData.map((item) => [
        item["Purchase No"].substring(0, 10) + (item["Purchase No"].length > 10 ? "..." : ""),
        item["Supplier"].substring(0, 15) + (item["Supplier"].length > 15 ? "..." : ""),
        item["Total (Tk)"],
        item["Paid (Tk)"],
        item["Due (Tk)"],
        item["Payment Status"],
        item["Date"],
      ]);

      autoTable(doc, {
        head: [tableColumns],
        body: tableRows,
        startY: 40,
        theme: "grid",
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [30, 77, 43], textColor: [255, 255, 255] },
        alternateRowStyles: { fillColor: [245, 245, 245] },
      });

      const totals = safePurchases.reduce(
        (acc, purchase) => {
          const amounts = getDisplayAmounts(purchase);
          acc.total += amounts.total;
          acc.paid += amounts.paid;
          acc.due += amounts.due;
          return acc;
        },
        { total: 0, paid: 0, due: 0 }
      );

      const finalY = doc.lastAutoTable.finalY + 10;

      doc.setFontSize(12);
      doc.setTextColor(30, 77, 43);
      doc.text("Summary Statistics", 14, finalY);

      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      doc.text(`Total Purchases: ${safePurchases.length}`, 14, finalY + 7);
      doc.text(`Total Amount: ${totals.total.toFixed(2)} Tk`, 14, finalY + 14);
      doc.text(`Total Paid: ${totals.paid.toFixed(2)} Tk`, 14, finalY + 21);
      doc.text(`Total Due: ${totals.due.toFixed(2)} Tk`, 14, finalY + 28);

      doc.save(`purchases_report_${formatDateForFilename()}.pdf`);

      toast.success("PDF downloaded successfully");
    } catch (error) {
      console.error("Error downloading PDF:", error);
      toast.error("Failed to download PDF");
    } finally {
      setIsDownloading(false);
    }
  };

  // ===================== UI Helper counts =====================
  const modalCounts = useMemo(() => {
    if (!showBarcodeModal) return { unique: 0, total: 0, uniqueLabels: [] };

    const { uniqueLabels } = buildBarcodeLabels();

    let total = 0;
    uniqueLabels.forEach((l) => {
      if (barcodeConfig.copiesMode === "manual") total += clampInt(barcodeCopiesMap[l.key] ?? defaultBarcodeCopies ?? 1);
      else if (barcodeConfig.copiesMode === "byQty") total += clampInt(l.itemQty || 1);
      else if (barcodeConfig.copiesMode === "fixed") total += clampInt(barcodeConfig.fixedCopies || 1);
      else total += 1;
    });

    return { unique: uniqueLabels.length, total, uniqueLabels };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showBarcodeModal, selectedPurchaseIds, barcodeConfig, barcodeCopiesMap, defaultBarcodeCopies, buildBarcodeLabels]);

  // ===================== UI =====================
  return (
    <div className={`bg-white rounded-box p-5 ${locale === "bn" ? "bangla-font" : ""}`}>
      {/* ===================== Payment Modal ===================== */}
      {showPaymentModal && selectedPurchase && (
        <div className="fixed inset-0 bg-[#3333333d] bg-opacity-50 flex items-start justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mt-20">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-black text-gray-900 flex items-center gap-2">
                  <Receipt className="text-red-600" size={20} />
                  Clear Payment
                </h3>
                <button onClick={closePaymentModal} className="btn btn-ghost btn-circle btn-sm" disabled={processingPayment}>
                  <X size={20} />
                </button>
              </div>

              <div className="mb-6 p-4 bg-gray-50 rounded-xl border border-gray-200">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <div className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-1">Total</div>
                    <div className="text-lg font-black text-gray-900">{formatCurrency(getDisplayAmounts(selectedPurchase).total)}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-1">Due</div>
                    <div className="text-lg font-black text-red-600">{formatCurrency(getDisplayAmounts(selectedPurchase).due)}</div>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-gray-200 text-xs">
                  <div className="flex justify-between mb-1">
                    <span className="text-gray-600">Purchase #:</span>
                    <span className="font-bold">{selectedPurchase.purchase_no}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Supplier:</span>
                    <span className="font-bold">{selectedPurchase.supplier?.name || "N/A"}</span>
                  </div>
                </div>
              </div>

              <form onSubmit={handlePaymentSubmit}>
                <div className="space-y-4">
                  <div className="form-control">
                    <label className="label py-0">
                      <span className="label-text font-bold text-gray-700">Select Payment Method *</span>
                    </label>
                    <select
                      name="account_id"
                      value={paymentForm.account_id}
                      onChange={(e) => handlePaymentFormChange("account_id", e.target.value)}
                      className="select select-bordered w-full"
                      disabled={processingPayment}
                      required
                    >
                      <option value="">Select Payment Method</option>
                      {accounts?.map((account) => (
                        <option key={account.id} value={account.id}>
                          {account.name} ({formatAccountBalance(account.current_balance)} tk)
                        </option>
                      ))}
                    </select>
                    {paymentErrors.account_id && (
                      <div className="text-red-600 text-xs mt-1 flex items-center gap-1">
                        <AlertCircle size={12} />
                        {paymentErrors.account_id}
                      </div>
                    )}
                  </div>

                  <div className="form-control">
                    <label className="label py-0">
                      <span className="label-text font-bold text-gray-700">Payment Amount *</span>
                    </label>

                    <div className="flex gap-2 mb-2">
                      <button
                        type="button"
                        onClick={setHalfPayment}
                        className="btn btn-sm btn-outline flex-1"
                        disabled={processingPayment || getDisplayAmounts(selectedPurchase).due <= 0}
                      >
                        50%
                      </button>
                      <button
                        type="button"
                        onClick={setFullPayment}
                        className="btn btn-sm btn-outline btn-primary flex-1"
                        disabled={processingPayment || getDisplayAmounts(selectedPurchase).due <= 0}
                      >
                        Full
                      </button>
                    </div>

                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold">৳</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        max={getDisplayAmounts(selectedPurchase).due}
                        value={paymentForm.payment_amount}
                        onChange={(e) => handlePaymentFormChange("payment_amount", e.target.value)}
                        className="input input-bordered w-full pl-8 font-mono"
                        disabled={processingPayment || getDisplayAmounts(selectedPurchase).due <= 0}
                        required
                      />
                    </div>

                    {paymentErrors.payment_amount && (
                      <div className="text-red-600 text-xs mt-1 flex items-center gap-1">
                        <AlertCircle size={12} />
                        {paymentErrors.payment_amount}
                      </div>
                    )}

                    <div className="text-xs text-gray-500 mt-1">Maximum: {formatCurrency(getDisplayAmounts(selectedPurchase).due)}</div>
                  </div>

                  <div className="form-control">
                    <label className="label py-0">
                      <span className="label-text font-bold text-gray-700">Notes (Optional)</span>
                    </label>
                    <textarea
                      name="notes"
                      value={paymentForm.notes}
                      onChange={(e) => handlePaymentFormChange("notes", e.target.value)}
                      className="textarea textarea-bordered w-full"
                      rows="2"
                      placeholder="Payment reference or notes..."
                      disabled={processingPayment}
                    />
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button type="button" onClick={closePaymentModal} className="btn btn-ghost flex-1" disabled={processingPayment}>
                      Cancel
                    </button>
                    <button type="submit" className="btn btn-primary flex-1" disabled={processingPayment || getDisplayAmounts(selectedPurchase).due <= 0}>
                      {processingPayment ? (
                        <>
                          <span className="loading loading-spinner loading-sm"></span>
                          Processing...
                        </>
                      ) : (
                        <>
                          <CheckCircle size={18} />
                          Complete Payment
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </form>

            </div>
          </div>
        </div>
      )}

      {/* ===================== Barcode Modal ===================== */}
      {showBarcodeModal && (
        <div className="fixed inset-0 bg-black/30 flex items-start justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mt-16 border border-gray-100">
            <div className="p-6">
              <div className="flex items-center justify-between gap-3 mb-4">
                <div>
                  <h3 className="text-xl font-black text-gray-900 flex items-center gap-2">
                    <BarcodeIcon size={20} className="text-primary" />
                    Bulk Barcode Print
                  </h3>
                  <p className="text-xs text-gray-500 font-bold">
                    Selected: <span className="text-gray-900">{selectedPurchaseIds.size}</span> purchase(s) •
                    Unique Barcodes: <span className="text-gray-900">{modalCounts.unique}</span> •
                    Total Labels: <span className="text-gray-900">{modalCounts.total}</span>
                  </p>
                </div>

                <button onClick={closeBarcodeModal} className="btn btn-ghost btn-circle btn-sm">
                  <X size={18} />
                </button>
              </div>

              {/* ✅ NEW: two print types */}
              <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 mb-4">
                <div className="text-[11px] font-black uppercase tracking-widest text-gray-500 mb-2 flex items-center gap-2">
                  <LayoutGrid size={14} />
                  Print Type
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <label className="flex items-center gap-2 p-2 bg-white rounded-lg border border-gray-100 cursor-pointer select-none">
                    <input
                      type="radio"
                      name="printType"
                      checked={barcodeConfig.printType === "img"}
                      onChange={() => updateBarcodeConfig("printType", "img")}
                    />
                    <span className="font-black text-sm">Normal (Image / Grid)</span>
                  </label>

                  <label className="flex items-center gap-2 p-2 bg-white rounded-lg border border-gray-100 cursor-pointer select-none">
                    <input
                      type="radio"
                      name="printType"
                      checked={barcodeConfig.printType === "svg"}
                      onChange={() => updateBarcodeConfig("printType", "svg")}
                    />
                    <span className="font-black text-sm">RP400 Sharp (SVG Exact)</span>
                  </label>
                </div>

                <div className="mt-2 text-[11px] font-bold text-gray-500">
                  Tip: RP400 Sharp → Chrome print scale <span className="text-gray-900">100%</span> (no fit/shrink)
                </div>
              </div>

              {/* SVG-only mode controls */}
              {barcodeConfig.printType === "svg" && (
                <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 mb-4">
                  <div className="text-[11px] font-black uppercase tracking-widest text-gray-500 mb-2 flex items-center gap-2">
                    <LayoutGrid size={14} />
                    SVG Printing Mode
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <label className="flex items-center gap-2 p-2 bg-white rounded-lg border border-gray-100 cursor-pointer select-none">
                      <input
                        type="radio"
                        name="layoutMode"
                        checked={barcodeConfig.layoutMode === "label"}
                        onChange={() => updateBarcodeConfig("layoutMode", "label")}
                      />
                      <span className="font-black text-sm">Label (1 per page)</span>
                    </label>

                    {/* <label className="flex items-center gap-2 p-2 bg-white rounded-lg border border-gray-100 cursor-pointer select-none">
                      <input
                        type="radio"
                        name="layoutMode"
                        checked={barcodeConfig.layoutMode === "sheet"}
                        onChange={() => updateBarcodeConfig("layoutMode", "sheet")}
                      />
                      <span className="font-black text-sm">Sheet/Grid</span>
                    </label> */}
                  </div>

                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="rounded-xl border border-gray-100 p-4 bg-white">
                      <div className="text-[11px] font-black uppercase tracking-widest text-gray-500 mb-2">Barcode Height (mm)</div>
                      <input
                        type="number"
                        min="6"
                        step="0.5"
                        value={barcodeConfig.barcodeHeightMm}
                        onChange={(e) => updateBarcodeConfig("barcodeHeightMm", e.target.value)}
                        className="input input-sm input-bordered font-mono w-full"
                      />
                      <div className="text-[11px] font-bold text-gray-500 mt-1">If too tall → reduce</div>
                    </div>

                    <div className="rounded-xl border border-gray-100 p-4 bg-white">
                      <div className="text-[11px] font-black uppercase tracking-widest text-gray-500 mb-2">Bar Thickness (px)</div>
                      <input
                        type="number"
                        min="1"
                        max="3"
                        step="0.1"
                        value={barcodeConfig.barWidthPx}
                        onChange={(e) => updateBarcodeConfig("barWidthPx", e.target.value)}
                        className="input input-sm input-bordered font-mono w-full"
                      />
                      <div className="text-[11px] font-bold text-gray-500 mt-1">If broken → increase 1.4 / 1.6</div>
                    </div>
                  </div>

                  <label className="mt-3 flex items-center gap-2 p-2 bg-white rounded-lg border border-gray-100 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={!!barcodeConfig.showTextUnderBarcode}
                      onChange={(e) => updateBarcodeConfig("showTextUnderBarcode", e.target.checked)}
                      className="checkbox checkbox-sm"
                    />
                    <span className="font-black text-sm">Show code under barcode</span>
                  </label>

                  {barcodeConfig.layoutMode === "sheet" && (
                    <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="rounded-xl border border-gray-100 p-4 bg-white">
                        <div className="text-[11px] font-black uppercase tracking-widest text-gray-500 mb-2">Paper Width (mm)</div>
                        <input
                          type="number"
                          min="50"
                          step="1"
                          value={barcodeConfig.paperWidthMm}
                          onChange={(e) => updateBarcodeConfig("paperWidthMm", e.target.value)}
                          className="input input-sm input-bordered font-mono w-full"
                        />
                      </div>

                      <div className="rounded-xl border border-gray-100 p-4 bg-white">
                        <div className="text-[11px] font-black uppercase tracking-widest text-gray-500 mb-2">Gap (mm)</div>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={barcodeConfig.gapMm}
                          onChange={(e) => updateBarcodeConfig("gapMm", e.target.value)}
                          className="input input-sm input-bordered font-mono w-full"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                <div className="text-[11px] font-black uppercase tracking-widest text-gray-500 mb-2 flex items-center gap-2">
                  <Layers size={14} />
                  Label Content
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <label className="flex items-center gap-2 p-2 bg-white rounded-lg border border-gray-100 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={!!barcodeConfig.showProductName}
                      onChange={(e) => updateBarcodeConfig("showProductName", e.target.checked)}
                      className="checkbox checkbox-sm"
                    />
                    <span className="font-black text-sm flex items-center gap-2">
                      <Tag size={14} className="text-gray-500" />
                      Product Name
                    </span>
                  </label>

                  <label className="flex items-center gap-2 p-2 bg-white rounded-lg border border-gray-100 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={!!barcodeConfig.showBatchNo}
                      onChange={(e) => updateBarcodeConfig("showBatchNo", e.target.checked)}
                      className="checkbox checkbox-sm"
                    />
                    <span className="font-black text-sm">Batch No</span>
                  </label>

                  <label className="flex items-center gap-2 p-2 bg-white rounded-lg border border-gray-100 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={!!barcodeConfig.showSalePrice}
                      onChange={(e) => updateBarcodeConfig("showSalePrice", e.target.checked)}
                      className="checkbox checkbox-sm"
                    />
                    <span className="font-black text-sm">Sale Price</span>
                  </label>

                  <label className="flex items-center gap-2 p-2 bg-white rounded-lg border border-gray-100 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={!!barcodeConfig.showSiNo}
                      onChange={(e) => updateBarcodeConfig("showSiNo", e.target.checked)}
                      className="checkbox checkbox-sm"
                    />
                    <span className="font-black text-sm flex items-center gap-2">
                      <Tag size={14} className="text-gray-500" />
                      Si No (Serial)
                    </span>
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
                      onClick={() => updateBarcodeConfig("align", "left")}
                      className={`btn btn-sm flex-1 ${barcodeConfig.align === "left" ? "btn-primary" : "btn-outline"}`}
                    >
                      <AlignLeft size={16} /> Left
                    </button>
                    <button
                      type="button"
                      onClick={() => updateBarcodeConfig("align", "right")}
                      className={`btn btn-sm flex-1 ${barcodeConfig.align === "right" ? "btn-primary" : "btn-outline"}`}
                    >
                      <AlignRight size={16} /> Right
                    </button>
                  </div>
                  <div className="text-[11px] font-bold text-gray-500 mt-2">
                    Current: <span className="text-gray-900">{String(barcodeConfig.align || "left").toUpperCase()}</span>
                  </div>
                </div>

                <div className="rounded-xl border border-gray-100 p-4">
                  <div className="text-[11px] font-black uppercase tracking-widest text-gray-500 mb-2 flex items-center gap-2">
                    <Copy size={14} />
                    Copies Mode
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="flex items-center gap-2 font-black text-sm cursor-pointer select-none">
                      <input
                        type="radio"
                        name="copiesMode"
                        checked={barcodeConfig.copiesMode === "one"}
                        onChange={() => updateBarcodeConfig("copiesMode", "one")}
                      />
                      One label per barcode
                    </label>

                    <label className="flex items-center gap-2 font-black text-sm cursor-pointer select-none">
                      <input
                        type="radio"
                        name="copiesMode"
                        checked={barcodeConfig.copiesMode === "byQty"}
                        onChange={() => updateBarcodeConfig("copiesMode", "byQty")}
                      />
                      Print by item quantity
                    </label>

                    <label className="flex items-center gap-2 font-black text-sm cursor-pointer select-none">
                      <input
                        type="radio"
                        name="copiesMode"
                        checked={barcodeConfig.copiesMode === "fixed"}
                        onChange={() => updateBarcodeConfig("copiesMode", "fixed")}
                      />
                      Fixed copies for all
                    </label>

                    <label className="flex items-center gap-2 font-black text-sm cursor-pointer select-none">
                      <input
                        type="radio"
                        name="copiesMode"
                        checked={barcodeConfig.copiesMode === "manual"}
                        onChange={() => updateBarcodeConfig("copiesMode", "manual")}
                      />
                      Manual (per barcode)
                    </label>

                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={barcodeConfig.fixedCopies}
                      onChange={(e) => updateBarcodeConfig("fixedCopies", e.target.value)}
                      disabled={barcodeConfig.copiesMode !== "fixed"}
                      className="input input-sm input-bordered font-mono"
                      placeholder="Copies"
                    />
                  </div>
                </div>
              </div>

              {/* ✅ Manual per-barcode copies list */}
              {barcodeConfig.copiesMode === "manual" && (
                <div className="mt-4 rounded-xl border border-gray-100 p-4">
                  <div className="text-[11px] font-black uppercase tracking-widest text-gray-500 mb-3">
                    Per Barcode Copies
                  </div>

                  {modalCounts.uniqueLabels.length === 0 ? (
                    <div className="text-sm font-bold text-gray-500">No labels found.</div>
                  ) : (
                    <div className="max-h-[240px] overflow-y-auto pr-1 space-y-2">
                      {modalCounts.uniqueLabels.map((l) => (
                        <div key={l.key} className="flex items-center justify-between gap-3 bg-gray-50 border border-gray-100 rounded-xl p-3">
                          <div className="min-w-0">
                            <div className="font-black text-sm text-gray-900 truncate">{l.productName}</div>
                            <div className="text-[11px] font-bold text-gray-500 truncate">
                              Code: <span className="text-gray-900">{l.codeValue}</span>
                              {l.batchNo ? <> • Batch: <span className="text-gray-900">{l.batchNo}</span></> : null}
                              {l.itemQty ? <> • Qty: <span className="text-gray-900">{l.itemQty}</span></> : null}
                            </div>
                          </div>

                          <input
                            type="number"
                            min="1"
                            max="999"
                            value={barcodeCopiesMap[l.key] ?? defaultBarcodeCopies}
                            onChange={(e) =>
                              setBarcodeCopiesMap((prev) => ({
                                ...prev,
                                [l.key]: clampInt(e.target.value),
                              }))
                            }
                            className="input input-sm input-bordered font-mono w-[90px] text-center"
                            title="Copies"
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      className="btn btn-sm btn-outline flex-1"
                      onClick={() => {
                        setBarcodeCopiesMap((prev) => {
                          const next = { ...prev };
                          modalCounts.uniqueLabels.forEach((l) => (next[l.key] = clampInt(defaultBarcodeCopies)));
                          return next;
                        });
                      }}
                    >
                      Apply Default to All
                    </button>

                    <button
                      type="button"
                      className="btn btn-sm btn-outline flex-1"
                      onClick={() => {
                        setBarcodeCopiesMap((prev) => {
                          const next = { ...prev };
                          modalCounts.uniqueLabels.forEach((l) => (next[l.key] = clampInt(l.itemQty || 1)));
                          return next;
                        });
                      }}
                    >
                      Set = Item Qty
                    </button>
                  </div>
                </div>
              )}

              <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="rounded-xl border border-gray-100 p-4">
                  <div className="text-[11px] font-black uppercase tracking-widest text-gray-500 mb-2">Label W (mm)</div>
                  <input
                    type="number"
                    min="20"
                    step="1"
                    value={barcodeConfig.labelWidthMm}
                    onChange={(e) => updateBarcodeConfig("labelWidthMm", e.target.value)}
                    className="input input-sm input-bordered font-mono w-full"
                  />
                </div>

                <div className="rounded-xl border border-gray-100 p-4">
                  <div className="text-[11px] font-black uppercase tracking-widest text-gray-500 mb-2">Label H (mm)</div>
                  <input
                    type="number"
                    min="15"
                    step="1"
                    value={barcodeConfig.labelHeightMm}
                    onChange={(e) => updateBarcodeConfig("labelHeightMm", e.target.value)}
                    className="input input-sm input-bordered font-mono w-full"
                  />
                </div>

                <div className="rounded-xl border border-gray-100 p-4">
                  <div className="text-[11px] font-black uppercase tracking-widest text-gray-500 mb-2">
                    {barcodeConfig.printType === "svg" ? "Padding (mm)" : "Gap (mm)"}
                  </div>
                  {barcodeConfig.printType === "svg" ? (
                    <input
                      type="number"
                      min="0.5"
                      step="0.1"
                      value={barcodeConfig.paddingMm}
                      onChange={(e) => updateBarcodeConfig("paddingMm", e.target.value)}
                      className="input input-sm input-bordered font-mono w-full"
                    />
                  ) : (
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={barcodeConfig.gapMm}
                      onChange={(e) => updateBarcodeConfig("gapMm", e.target.value)}
                      className="input input-sm input-bordered font-mono w-full"
                    />
                  )}
                </div>
              </div>

              {/* IMG-only: barcode image height */}
              {barcodeConfig.printType === "img" && (
                <div className="mt-3 rounded-xl border border-gray-100 p-4">
                  <div className="text-[11px] font-black uppercase tracking-widest text-gray-500 mb-2">Barcode Image Height (px)</div>
                  <input
                    type="number"
                    min="30"
                    step="1"
                    value={barcodeConfig.barcodeImgHeightPx}
                    onChange={(e) => updateBarcodeConfig("barcodeImgHeightPx", e.target.value)}
                    className="input input-sm input-bordered font-mono w-full"
                  />
                </div>
              )}

              <div className="mt-4 flex gap-2">
                <button type="button" onClick={closeBarcodeModal} className="btn btn-ghost flex-1">
                  Cancel
                </button>
                <button type="button" onClick={handleBarcodePrint} className="btn btn-primary flex-1">
                  <Printer size={18} />
                  Print ({modalCounts.total})
                </button>
              </div>

              <div className="mt-3 text-xs text-gray-500 font-bold">
                {barcodeConfig.printType === "img" ? (
                  <>Note: Uses tec-it.com barcode service (external). Ensure external images allowed.</>
                ) : (
                  <>✅ SVG barcode (sharp) + exact page size. Print scale must be 100%.</>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================== Header ===================== */}
      <PageHeader
        title={t("purchase.purchase_management", "Purchase Archive")}
        subtitle={t("purchase.manage_purchases", "Inbound inventory tracking index")}
      >
        <div className="flex flex-wrap gap-2 items-center">
          <Link
            href={route("purchase.create")}
            className={`btn btn-sm border-none font-black uppercase tracking-widest text-[10px] ${isShadowUser ? "bg-amber-500 text-black hover:bg-amber-600" : "bg-primary text-white hover:bg-primary"
              }`}
          >
            <Plus size={15} /> {t("purchase.new_purchase", "New Entry")}
          </Link>
        </div>
      </PageHeader>

      {/* ===================== Collapsible Filter Card ===================== */}
      <div className="bg-base-100 rounded-box border border-base-content/5 mb-6 overflow-hidden">
        <div
          className="flex items-center justify-between p-4 cursor-pointer hover:bg-base-200 transition-colors"
          onClick={toggleFilters}
        >
          <div className="flex items-center gap-2">
            <Filter size={18} className="text-primary" />
            <h3 className="text-lg font-semibold text-neutral">Filters</h3>
            {hasActiveFilters() && <span className="badge badge-sm bg-primary text-white ml-2">Active</span>}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                clearFilters();
              }}
              className="btn btn-ghost btn-sm"
            >
              Clear
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                applyFilters();
              }}
              className="btn bg-primary text-white btn-sm"
            >
              <Search size={14} />
              Search
            </button>
            <button className="btn btn-ghost btn-sm">
              {showFilters ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </button>
          </div>
        </div>

        {showFilters && (
          <div className="p-4 border-t border-base-content/5">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              <fieldset className="fieldset">
                <legend className="fieldset-legend">Search</legend>
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="search"
                    onChange={(e) => handleFilter("search", e.target.value)}
                    value={localFilters.search}
                    placeholder="ID or Number..."
                    className="input input-sm input-bordered w-full pl-8"
                    onKeyPress={handleKeyPress}
                  />
                </div>
              </fieldset>

              <fieldset className="fieldset">
                <legend className="fieldset-legend">Status</legend>
                <select
                  onChange={(e) => handleFilter("status", e.target.value)}
                  value={localFilters.status}
                  className="select select-sm select-bordered w-full"
                >
                  <option value="">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </fieldset>

              <fieldset className="fieldset">
                <legend className="fieldset-legend">Date From</legend>
                <div className="relative">
                  <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="date"
                    onChange={(e) => handleFilter("date_from", e.target.value)}
                    value={formatDateForInput(localFilters.date_from)}
                    className="input input-sm input-bordered w-full pl-8"
                  />
                </div>
              </fieldset>

              <fieldset className="fieldset">
                <legend className="fieldset-legend">Date To</legend>
                <div className="relative">
                  <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="date"
                    onChange={(e) => handleFilter("date_to", e.target.value)}
                    value={formatDateForInput(localFilters.date_to)}
                    className="input input-sm input-bordered w-full pl-8"
                    min={formatDateForInput(localFilters.date_from)}
                  />
                </div>
              </fieldset>
            </div>

            {hasActiveFilters() && (
              <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-gray-600">
                <span className="font-medium">Active Filters:</span>
                {localFilters.search && <span className="badge badge-outline badge-sm">Search: {localFilters.search}</span>}
                {localFilters.status && <span className="badge badge-outline badge-sm">Status: {localFilters.status}</span>}
                {localFilters.date && (
                  <span className="badge badge-outline badge-sm">Date: {new Date(localFilters.date).toLocaleDateString()}</span>
                )}
                {localFilters.date_from && (
                  <span className="badge badge-outline badge-sm">From: {new Date(localFilters.date_from).toLocaleDateString()}</span>
                )}
                {localFilters.date_to && (
                  <span className="badge badge-outline badge-sm">To: {new Date(localFilters.date_to).toLocaleDateString()}</span>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ===================== Action Buttons ===================== */}
      <div className="flex flex-wrap justify-between items-center gap-3 mb-4">
        <div className="flex flex-wrap gap-2 items-center">
          {/* Print selected */}
          <button
            type="button"
            onClick={openBarcodeModal}
            className={`btn btn-sm border-none font-black uppercase tracking-widest text-[10px] ${selectedPurchaseIds.size > 0 ? "bg-gray-900 text-white hover:bg-black" : "bg-gray-100 text-gray-400 cursor-not-allowed"
              }`}
            disabled={selectedPurchaseIds.size === 0}
            title="Print selected barcodes"
          >
            <BarcodeIcon size={15} /> Print Barcodes
          </button>

          {selectedPurchaseIds.size > 0 && (
            <button type="button" onClick={clearSelection} className="btn btn-sm btn-outline font-black" title="Clear selection">
              <X size={16} /> Clear ({selectedPurchaseIds.size})
            </button>
          )}
        </div>

        {/* Download Button */}
        <div className="dropdown dropdown-end">
          <button className="btn bg-green-600 text-white btn-sm" disabled={isDownloading || safePurchases.length === 0} tabIndex={0}>
            <Download size={14} />
            {isDownloading ? "Downloading..." : "Download Report"}
          </button>
          <ul tabIndex={0} className="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-40">
            <li>
              <button onClick={downloadCSV} className="btn btn-ghost btn-sm w-full text-left">
                CSV Format
              </button>
            </li>
            <li>
              <button onClick={downloadExcel} className="btn btn-ghost btn-sm w-full text-left">
                Excel Format
              </button>
            </li>
            <li>
              <button onClick={downloadPDF} className="btn btn-ghost btn-sm w-full text-left">
                PDF Format
              </button>
            </li>
          </ul>
        </div>
      </div>

      {/* ===================== Table ===================== */}
      <div className="overflow-x-auto rounded-xl border border-gray-100">
        {safePurchases.length > 0 ? (
          <table className="table w-full">
            <thead className={`text-white uppercase text-[10px] tracking-widest ${isShadowUser ? "bg-amber-500" : "bg-primary"}`}>
              <tr>
                <th className="py-4 w-[40px]">
                  <button
                    type="button"
                    onClick={toggleSelectAll}
                    className="btn btn-ghost btn-xs text-white hover:bg-white/10"
                    title={isAllSelected ? "Unselect all" : "Select all"}
                  >
                    {isAllSelected ? <CheckSquare size={16} /> : <Square size={16} />}
                  </button>
                </th>
                <th className="py-4">#</th>
                <th>Details</th>
                <th>Supplier & Warehouse</th>
                <th>Financial Status</th>
                <th className="text-right">Command</th>
              </tr>
            </thead>

            <tbody className="font-bold text-sm text-gray-700 italic-last-child">
              {safePurchases.map((purchase, index) => {
                const amounts = getDisplayAmounts(purchase);
                const isSelected = selectedPurchaseIds.has(purchase.id);

                const displayTotal = amounts.total;
                const displayPaid = amounts.paid;
                const displayDue = amounts.due;
                const displayPaymentStatus = amounts.payment_status;

                const isPaid = displayPaymentStatus === "paid";
                const isPartial = displayPaymentStatus === "partial";

                return (
                  <tr key={purchase.id} className={`hover:bg-gray-50 border-b border-gray-50 transition-colors ${isSelected ? "bg-primary/5" : ""}`}>
                    <td>
                      <button type="button" onClick={() => toggleSelectOne(purchase.id)} className="btn btn-ghost btn-xs" title={isSelected ? "Unselect" : "Select"}>
                        {isSelected ? <CheckSquare size={16} className="text-primary" /> : <Square size={16} className="text-gray-400" />}
                      </button>
                    </td>

                    <td className="text-gray-400 font-mono text-xs">{index + 1}</td>

                    <td>
                      <p className="font-black text-gray-900 font-mono uppercase tracking-tighter leading-none mb-1">#{purchase.purchase_no}</p>
                      <span className="text-[10px] flex items-center gap-1 text-gray-400 font-black uppercase tracking-widest">
                        <Calendar size={10} /> {formatDate(purchase.purchase_date)}
                      </span>
                    </td>

                    <td>
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2 text-gray-900 uppercase text-xs">
                          <User size={12} className="text-red-600" />
                          {purchase.supplier?.name || "N/A"}
                        </div>
                        <div className="flex items-center gap-2 text-gray-400 uppercase text-[10px] font-black">
                          <Warehouse size={12} className="text-gray-400" />
                          {purchase.warehouse?.name || "N/A"}
                        </div>
                      </div>
                    </td>

                    <td>
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-600">Total:</span>
                          <span className="font-mono text-xs font-black text-gray-900">{formatCurrency(displayTotal)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-600">Paid:</span>
                          <span className={`font-mono text-xs font-black ${displayPaid > 0 ? "text-green-600" : "text-gray-500"}`}>{formatCurrency(displayPaid)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-600">Due:</span>
                          <span className={`font-mono text-xs font-black ${displayDue > 0 ? "text-red-600" : "text-primary"}`}>{formatCurrency(displayDue)}</span>
                        </div>

                        <div className="flex gap-1 items-center mt-1">
                          <span className={`badge border-none font-black text-[9px] uppercase py-1.5 px-2 ${isPaid ? "bg-green-100 text-green-700" : isPartial ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-600"}`}>
                            {displayPaymentStatus}
                          </span>
                          <span
                            className={`badge border-none font-black text-[9px] uppercase py-1.5 px-2 ${purchase.status === "completed"
                                ? "bg-blue-100 text-blue-700"
                                : purchase.status === "pending"
                                  ? "bg-gray-100 text-gray-600"
                                  : "bg-red-100 text-red-400"
                              }`}
                          >
                            {purchase.status}
                          </span>
                        </div>

                        {displayDue > 0 &&
                          (purchase?.payment_status == "installment" ? (
                            <Link
                              href={route("installments.show", {
                                id: purchase.id,
                                type: "purchase",
                              })}
                              className="btn btn-xs btn-primary"
                            >
                              View Installments
                            </Link>
                          ) : (
                            <div className="mt-2">
                              <button onClick={() => openPaymentModal(purchase)} className="btn btn-xs btn-primary w-full flex items-center justify-center gap-1">
                                <CreditCard size={12} />
                                Pay Now
                              </button>
                            </div>
                          ))}
                      </div>
                    </td>

                    <td className="text-right">
                      <div className="flex justify-end gap-1">
                        <Link href={route("purchase.show", purchase.id)} className="btn btn-ghost btn-square btn-xs hover:bg-gray-900 hover:text-white" title="View Details">
                          <Eye size={16} />
                        </Link>

                        {purchase.status === "completed" && (
                          <button
                            onClick={() => router.visit(route("purchase-returns.create", { purchase_id: purchase.id }))}
                            className="btn btn-ghost btn-square btn-xs text-red-600 hover:bg-red-600 hover:text-white"
                            title="Create Return"
                          >
                            <RefreshCw size={14} />
                          </button>
                        )}

                        <button onClick={() => copyText(purchase?.purchase_no)} className="btn btn-ghost btn-square btn-xs hover:bg-gray-200" title="Copy Purchase No">
                          <Copy size={16} />
                        </button>

                        <Link href={route("purchase.edit", purchase.id)} className="btn btn-ghost btn-square btn-xs hover:bg-blue-600 hover:text-white text-blue-600" title="Edit Purchase">
                          <Edit size={16} />
                        </Link>

                        {auth?.role === "admin" && (
                          <button onClick={() => handleDelete(purchase.id)} className="btn btn-ghost btn-square btn-xs text-red-400 hover:bg-red-600 hover:text-white" title="Delete Purchase">
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div className="py-20 text-center text-gray-400 flex flex-col items-center gap-3">
            <Frown size={40} className="text-gray-200" />
            <span className="font-black uppercase tracking-widest text-xs">No records found</span>
          </div>
        )}
      </div>

      <Pagination data={purchases} />
    </div>
  );
}