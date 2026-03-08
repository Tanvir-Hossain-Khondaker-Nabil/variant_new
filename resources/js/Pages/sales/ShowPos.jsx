// resources/js/Pages/sales/SaleShow.jsx
import React, { useMemo, useState, useEffect, useRef } from "react";
import { usePage, router } from "@inertiajs/react";
import { ArrowLeft, Printer, Download } from "lucide-react";

export default function SaleShow({
  sale,
  isShadowUser = false,
  businessProfile,

  // ✅ POS Roll / XP-365B support
  posPaperWidthMm = 72, // default UI width
  printerMaxPrintableMm = 76, // XP-365B printable width
  printXOffsetMm = 0, // driver alignment
}) {
  const { auth } = usePage().props;

  // =========================
  // ✅ Helpers
  // =========================
  const toNum = (v) => {
    if (v === null || v === undefined || v === "") return 0;
    const x = parseFloat(v);
    return Number.isFinite(x) ? x : 0;
  };

  const hasValue = (v) => v !== null && v !== undefined && v !== "";

  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

  const resolveAssetUrl = (path) => {
    if (!path) return "";
    if (typeof path !== "string") return "";
    if (path.startsWith("http://") || path.startsWith("https://")) return path;
    if (path.startsWith("/")) return path;
    return `/storage/${path}`;
  };

  const toBanglaDigit = (value) => {
    const map = {
      0: "০",
      1: "১",
      2: "২",
      3: "৩",
      4: "৪",
      5: "৫",
      6: "৬",
      7: "৭",
      8: "৮",
      9: "৯",
    };
    return String(value ?? "").replace(/\d/g, (d) => map[d]);
  };

  const formatMoneyBn = (amount) => {
    const num = new Intl.NumberFormat("en-BD", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(toNum(amount));
    return toBanglaDigit(num);
  };

  const formatDateTimeBn = (dateString) => {
    const d = dateString ? new Date(dateString) : new Date();
    const pad = (x) => String(x).padStart(2, "0");
    const dd = pad(d.getDate());
    const mm = pad(d.getMonth() + 1);
    const yy = d.getFullYear();
    const hh = pad(d.getHours());
    const mi = pad(d.getMinutes());
    return toBanglaDigit(`${dd}/${mm}/${yy} ${hh}:${mi}`);
  };

  const formatDateTimeEn = (dateString) => {
    const d = dateString ? new Date(dateString) : new Date();
    const pad = (x) => String(x).padStart(2, "0");
    const dd = pad(d.getDate());
    const mm = pad(d.getMonth() + 1);
    const yy = d.getFullYear();
    const hh = pad(d.getHours());
    const mi = pad(d.getMinutes());
    return `${dd}/${mm}/${yy} ${hh}:${mi}`;
  };

  const cleanTrailingIndex = (name) =>
    String(name ?? "").replace(/\s+\d+$/g, "").trim();

  // =========================
  // ✅ Theme
  // =========================
  const PRIMARY = "#103485";

  // =========================
  // ✅ Width controls
  // =========================
  const [paperWidthMm, setPaperWidthMm] = useState(() =>
    clamp(Number(posPaperWidthMm ?? 72), 30, 100)
  );

  useEffect(() => {
    setPaperWidthMm(clamp(Number(posPaperWidthMm ?? 72), 30, 100));
  }, [posPaperWidthMm]);

  const PRINTER_MAX_MM = Number(printerMaxPrintableMm ?? 76);

  // ✅ PRINT ONLY cap to printer printable width
  const PRINTABLE_MM = useMemo(() => {
    const w = Number(paperWidthMm ?? 72);
    return Math.min(w, PRINTER_MAX_MM);
  }, [paperWidthMm, PRINTER_MAX_MM]);

  const isCompact = useMemo(() => Number(paperWidthMm) < 60, [paperWidthMm]);

  const scale = useMemo(() => {
    const w = Number(paperWidthMm ?? 72);
    return clamp(w / 80, 0.66, 1.05);
  }, [paperWidthMm]);

  // =========================
  // ✅ Business profile
  // =========================
  const bp = businessProfile || {};
  const bpLogo =
    resolveAssetUrl(bp?.logo) ||
    resolveAssetUrl(bp?.thum) ||
    "/media/uploads/logo.png";

  // =========================
  // ✅ Sale data
  // =========================
  const posItems = useMemo(() => sale?.items || [], [sale]);

  const memoNo = sale?.invoice_no || sale?.sale_no || sale?.id || "";

  const cashierName =
    sale?.cashier?.name ||
    sale?.created_by?.name ||
    sale?.creator?.name ||
    auth?.user?.name ||
    "";

  // ✅ Header fields (image style)
  const cashierId =
    sale?.cashier?.id ||
    sale?.created_by?.id ||
    sale?.creator?.id ||
    auth?.user?.id ||
    "";

  const terminalId =
    sale?.terminal_id ||
    bp?.terminal_id ||
    bp?.pos_terminal_id ||
    bp?.terminal_code ||
    "";

  const invoiceNumber = memoNo || "";

  const invoiceDateEn = useMemo(
    () => formatDateTimeEn(sale?.created_at || new Date().toISOString()),
    [sale?.created_at]
  );

  const customerId =
    sale?.customer?.customer_id ||
    sale?.customer?.id ||
    sale?.customer_id ||
    "";

  const loyaltyNote =
    bp?.pos_loyalty_note ||
    "To Enjoy special Discounts Please register as a loyalty customer";

  const customerNamePos =
    sale?.customer?.customer_name || sale?.customer?.name || "Walk-in Customer";

  const customerPhonePos =
    sale?.customer?.phone || sale?.customer?.mobile || "00000000000";

  const todayDateTimeBn = useMemo(
    () => formatDateTimeBn(sale?.created_at || new Date().toISOString()),
    [sale?.created_at]
  );

  // =========================
  // ✅ Discount
  // =========================
  const discountInfo = useMemo(() => {
    const d = toNum(sale?.discount);
    const type = sale?.discount_type;

    if (!d) return { has: false, text: "", amount: 0, isPercent: false, raw: 0 };

    if (type === "flat_discount" || type === "flat") {
      return {
        has: true,
        text: `${formatMoneyBn(d)} ৳`,
        amount: d,
        isPercent: false,
        raw: d,
      };
    }

    return {
      has: true,
      text: `${toBanglaDigit(d)}%`,
      amount: 0,
      isPercent: true,
      raw: d,
    };
  }, [sale]);

  // =========================
  // ✅ Build line rows
  // =========================
  const lineRows = useMemo(() => {
    return posItems.map((it) => {
      const rawName =
        it?.product?.name || it?.product_name || it?.description || "N/A";
      const name = cleanTrailingIndex(rawName);

      const qty = toNum(it?.quantity ?? it?.qty ?? 0);
      const unitName = it?.unit_name || it?.unit?.name || it?.uom || "";

      const unitPrice = toNum(
        hasValue(it?.unit_price)
          ? it.unit_price
          : hasValue(it?.price)
          ? it.price
          : hasValue(it?.selling_price)
          ? it.selling_price
          : hasValue(it?.rate)
          ? it.rate
          : 0
      );

      const total = toNum(
        hasValue(it?.total_price)
          ? it.total_price
          : hasValue(it?.subtotal)
          ? it.subtotal
          : hasValue(it?.amount)
          ? it.amount
          : unitPrice * qty
      );

      return { name, qty, unitName, unitPrice, total };
    });
  }, [posItems]);

  const posSubTotal = useMemo(() => {
    if (hasValue(sale?.sub_total)) return toNum(sale.sub_total);
    if (hasValue(sale?.subtotal)) return toNum(sale.subtotal);
    return lineRows.reduce((sum, r) => sum + toNum(r.total), 0);
  }, [sale, lineRows]);

  const discountAmount = useMemo(() => {
    if (!discountInfo.has) return 0;
    if (!discountInfo.isPercent) return toNum(discountInfo.amount);
    return (posSubTotal * toNum(discountInfo.raw)) / 100;
  }, [discountInfo, posSubTotal]);

  const totalAfterDiscount = useMemo(
    () => posSubTotal - discountAmount,
    [posSubTotal, discountAmount]
  );

  const rounding = useMemo(() => {
    if (hasValue(sale?.rounding)) return toNum(sale.rounding);
    if (hasValue(sale?.round_off)) return toNum(sale.round_off);

    const net = toNum(
      sale?.grand_total || sale?.net_payable || sale?.net_total || 0
    );

    if (net && totalAfterDiscount) {
      const diff = net - totalAfterDiscount;
      if (Math.abs(diff) <= 5) return diff;
    }

    return 0;
  }, [sale, totalAfterDiscount]);

  const netPayable = useMemo(() => {
    const net = toNum(
      hasValue(sale?.grand_total)
        ? sale.grand_total
        : hasValue(sale?.net_payable)
        ? sale.net_payable
        : hasValue(sale?.net_total)
        ? sale.net_total
        : 0
    );

    if (net) return net;
    return totalAfterDiscount + rounding;
  }, [sale, totalAfterDiscount, rounding]);

  const cashPaid = useMemo(() => {
    return toNum(
      hasValue(sale?.cash_paid)
        ? sale.cash_paid
        : hasValue(sale?.paid_amount)
        ? sale.paid_amount
        : hasValue(sale?.payment?.amount)
        ? sale.payment.amount
        : 0
    );
  }, [sale]);

  const changeAmount = useMemo(() => {
    if (!cashPaid) return 0;
    const ch = cashPaid - netPayable;
    return ch > 0 ? ch : 0;
  }, [cashPaid, netPayable]);

  // =========================
  // ✅ Discount items section
  // =========================
  const discountItems = useMemo(() => {
    const arr = sale?.discount_items;
    if (Array.isArray(arr) && arr.length) {
      return arr.map((x) => ({
        name: cleanTrailingIndex(
          x?.name || x?.item || x?.product_name || "Item"
        ),
        amount: toNum(x?.amount || x?.discount || 0),
      }));
    }

    const fromLines = posItems
      .map((it) => {
        const rawName =
          it?.product?.name || it?.product_name || it?.description || "";
        const name = cleanTrailingIndex(rawName);
        const d = toNum(it?.discount_amount) || toNum(it?.discount) || 0;
        return d > 0 ? { name: name || "Item", amount: d } : null;
      })
      .filter(Boolean);

    return fromLines;
  }, [sale, posItems]);

  const totalSavings = useMemo(() => {
    const backend =
      toNum(sale?.total_savings) ||
      toNum(sale?.discount_total) ||
      toNum(sale?.total_discount) ||
      0;

    return backend || discountAmount || 0;
  }, [sale, discountAmount]);

  // =========================
  // ✅ Loyalty points
  // =========================
  const loyalty = useMemo(() => {
    const lp = sale?.loyalty || sale?.loyalty_points || null;
    if (!lp) return null;

    const prev = toNum(lp?.previous_points ?? lp?.prev ?? 0);
    const earned = toNum(lp?.earned_points ?? lp?.earned ?? 0);
    const balance = toNum(lp?.balance_points ?? lp?.balance ?? prev + earned);

    return { prev, earned, balance };
  }, [sale]);

  // =========================
  // ✅ Printing state
  // =========================
  const [isPrinting, setIsPrinting] = useState(false);
  const receiptRef = useRef(null);

  // =========================
  // ✅ POS FONT/WEIGHT (matches your screenshot)
  // =========================
  const buildPosFontCss = (pw, paperMm, sc) => {
    const w = Number(paperMm ?? 72);
    const extraCompact = w <= 40;

    // base font feel like thermal (bolder)
    const s = Number(sc || 1) * (extraCompact ? 0.92 : 1);

    // columns stay same logic as before
    const colSL = extraCompact ? "5.5mm" : w < 60 ? "6mm" : "6.5mm";
    const colUnit = extraCompact ? "12mm" : w < 60 ? "13mm" : "14mm";
    const colQty = extraCompact ? "9mm" : w < 60 ? "10mm" : "11mm";
    const colTotal = extraCompact ? "16mm" : w < 60 ? "18mm" : "20mm";

    return `
      @import url('https://fonts.googleapis.com/css2?family=Courier+Prime:wght@400;700&display=swap');

      *{
        box-sizing:border-box;
        
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }

      :root{
        --paper:${pw}mm;
        --scale:${s};
        --padX: calc(${extraCompact ? "1.5mm" : "2mm"} * var(--scale));
        --padTop: calc(${extraCompact ? "1.5mm" : "2mm"} * var(--scale));
        --padBottom: calc(${extraCompact ? "2.0mm" : "2.8mm"} * var(--scale));

        --fsTitle: calc(${extraCompact ? "15" : "16"}px * var(--scale));
        --fsLine:  calc(${extraCompact ? "10.4" : "11.2"}px * var(--scale));
        --fsNote:  calc(${extraCompact ? "9.6" : "10.2"}px * var(--scale));

        --fsField: calc(${extraCompact ? "10.4" : "11.2"}px * var(--scale));
        --fsMeta:  calc(${extraCompact ? "10.2" : "11.0"}px * var(--scale));
        --fsHead:  calc(${extraCompact ? "10.4" : "11.2"}px * var(--scale));
        --fsRow:   calc(${extraCompact ? "10.4" : "11.2"}px * var(--scale));
        --fsTot:   calc(${extraCompact ? "10.8" : "11.4"}px * var(--scale));
        --fsFoot:  calc(${extraCompact ? "9.6" : "10.2"}px * var(--scale));
        --fsThanks: calc(${extraCompact ? "10" : "11"}px * var(--scale));

        --colSL:${colSL};
        --colUnit:${colUnit};
        --colQty:${colQty};
        --colTotal:${colTotal};
      }

      .padRoot{
        width: var(--paper);
        max-width: var(--paper);
        min-width: var(--paper);
        margin:0;
        background:#fff;
        color:#000;
        padding: var(--padTop) var(--padX) var(--padBottom) var(--padX);
        line-height:1.28;
        letter-spacing: .2px;
        font-family:'Courier Prime','Courier New',monospace !important;
      }

      .padRoot *{ text-overflow:clip !important; }

      /* ===== Header (Image style) ===== */
      .posHeaderBlock{
        text-align:center;
        padding-top:.2mm;
        padding-bottom:1.6mm;
        border-bottom: 1px dashed #000;
        margin-bottom: 1.6mm;
      }
      .posHeaderTitle{
        font-size: var(--fsTitle);
        letter-spacing: 1px;
        margin-bottom: .7mm;
      }
      .posHeaderRow{
        display:flex;
        justify-content:space-between;
        gap: 2mm;
        font-size: var(--fsLine);
        margin-top: .55mm;
        text-align:left;
      }
      .posHeaderLeft, .posHeaderRight{ flex:1; }
      .posHeaderRight{ text-align:right; }
      .posHeaderNote{
        margin-top: 1mm;
        font-size: var(--fsNote);
        font-weight: 400;
      }

      /* ===== Customer fields ===== */
      .padFields{ margin-top: 1.2mm; }
      .padFieldStack{ display:flex; flex-direction:column; }
      .padFieldGroup{
        display:grid;
        grid-template-columns:${extraCompact ? "12mm" : "14mm"} 1fr;
        align-items:center;
        font-size: var(--fsField);
        margin-bottom: .5mm;
      }

      /* ===== Meta ===== */
      .posMeta{
        margin-top: 1.4mm;
        padding-top: 1.2mm;
        border-top: 1px dashed #000;
        font-size: var(--fsMeta);
      }
      .posMetaRow{
        display:flex;
        justify-content:space-between;
        gap:2mm;
        margin-top: .55mm;
      }

      /* ===== Table ===== */
      .posTable{
        margin-top: 1.6mm;
        border-top: 1px dashed #000;
        border-bottom: 1px dashed #000;
      }
      .posThead{
        display:grid;
        grid-template-columns: var(--colSL) 1fr var(--colUnit) var(--colQty) var(--colTotal);
        gap: 1mm;
        padding: 1mm 0;
        font-size: var(--fsHead);
      }
      .posTrow{
        display:grid;
        grid-template-columns: var(--colSL) 1fr var(--colUnit) var(--colQty) var(--colTotal);
        gap: 1mm;
        padding: 1mm 0;
        font-size: var(--fsRow);
        font-weight: 400;
        border-top: 1px dashed #000;
        min-width:0;
      }
      .posSL{ text-align:left; }
      .posName{ min-width:0; font-weight:400; }
      .posUnit, .posQty{ text-align:right; font-weight:300; }
      .posTotal{ text-align:right; }

      /* ===== Totals ===== */
      .posTotals{
        margin-top: 1.8mm;
        font-size: var(--fsTot);
      }
      .posTotRow{
        display:flex;
        justify-content:space-between;
        gap: 2mm;
        padding: .6mm 0;
      }
      .posTotDash{
        border-top: 1px dashed #000;
        margin: 1mm 0;
      }
      .posNet{
        font-size: calc(var(--fsTot) * 1.06);
      }

      /* ===== Small list / footer ===== */
      .posSectionTitle{
        margin-top:1.6mm;
        padding-top:1.2mm;
        border-top:1px dashed #000;
        font-size: var(--fsTot);
        text-align:center;
      }
      .posSmallList{
        margin-top:1mm;
        font-size: var(--fsFoot);
      }
      .posSmallRow{
        display:flex;
        justify-content:space-between;
        gap:2mm;
        padding:.45mm 0;
      }

      .posFooter{
        margin-top: 2mm;
        padding-top: 1.2mm;
        border-top: 1px dashed #000;
        font-size: var(--fsFoot);
        font-weight: 400;
        text-align:center;
      }
      .posThanks{
        margin-top: 1mm;
        font-size: var(--fsThanks);
        font-weight: 400;
      }
    `;
  };

  // =========================
  // ✅ Print CSS builder (FULL)
  // =========================
  const buildPrintCss = (paperMm, printableMm, sc, xOffsetMm) => {
    const w = Number(paperMm ?? 72);
    const pw = Number(printableMm ?? w);
    const xo = Number(xOffsetMm ?? 0);

    return `
      ${buildPosFontCss(pw, w, sc)}

      html, body { margin:0; padding:0; background:#fff; overflow:hidden !important; }
      html { width:${pw}mm !important; max-width:${pw}mm !important; }
      body { width:${pw}mm !important; max-width:${pw}mm !important; }

      @page { size: ${pw}mm auto; margin: 0mm; }

      .printWrap{
        width:${pw}mm !important;
        max-width:${pw}mm !important;
        margin:0 !important;
        padding:0 !important;
        background:#fff !important;
        overflow:hidden !important;
      }

      /* print offset fix */
      .padRoot{
        transform: translateX(${xo}mm);
      }
    `;
  };

  // =========================
  // ✅ Print
  // =========================
  const handlePrint = () => {
    if (!receiptRef.current) return alert("Receipt not ready");

    setIsPrinting(true);

    const css = buildPrintCss(paperWidthMm, PRINTABLE_MM, scale, printXOffsetMm);
    const receiptHtml = receiptRef.current.innerHTML;

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      setIsPrinting(false);
      return alert("Please allow popups to print.");
    }

    const html = `
      <!doctype html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>Print</title>
        <style>${css}</style>
      </head>
      <body>
        <div class="printWrap">
          <div class="padRoot">${receiptHtml}</div>
        </div>

        <script>
          (function(){
            try{
              var W = "${PRINTABLE_MM}";
              document.documentElement.style.width = W + "mm";
              document.body.style.width = W + "mm";
              document.body.style.maxWidth = W + "mm";

              var wrap = document.querySelector(".printWrap");
              if(wrap){
                wrap.style.width = W + "mm";
                wrap.style.maxWidth = W + "mm";
              }
              var root = document.querySelector(".padRoot");
              if(root){
                root.style.width = W + "mm";
                root.style.maxWidth = W + "mm";
                root.style.minWidth = W + "mm";
              }
            }catch(e){}

            var imgs = Array.from(document.images || []);
            function go(){ setTimeout(function(){ window.print(); }, 200); }
            if(!imgs.length) return go();

            var done = 0;
            function finish(){ done++; if(done >= imgs.length) go(); }

            imgs.forEach(function(img){
              if(img.complete) return finish();
              img.onload = finish;
              img.onerror = finish;
            });

            setTimeout(go, 2500);
          })();
        </script>
      </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();

    setTimeout(() => setIsPrinting(false), 800);
  };

  const handleDownloadDesign2 = () => handlePrint();

  // =========================
  // ✅ POS Roll
  // =========================
  const PadRoll = () => {
    return (
      <div className={`padRoot ${isCompact ? "padCompact" : "padNormal"}`}>
        <div ref={receiptRef}>
          {/* ✅ HEADER (Image Style) */}
          <div className="posHeaderBlock">
            <div className="posHeaderTitle">RETAIL INVOICE</div>

            <div className="posHeaderRow">
              <div className="posHeaderLeft">
                Cashier : {cashierName || "—"}
                {hasValue(cashierId) ? ` (${cashierId})` : ""}
              </div>
              <div className="posHeaderRight">
                Terminal ID : {terminalId || "—"}
              </div>
            </div>

            <div className="posHeaderRow">
              <div className="posHeaderLeft">
                Invoice Number : {invoiceNumber || "—"}
              </div>
              <div className="posHeaderRight">Date : {invoiceDateEn}</div>
            </div>

            <div className="posHeaderRow" style={{ justifyContent: "flex-start" }}>
              <div className="posHeaderLeft">
                Customer ID : {customerId || "—"}
              </div>
              <div className="posHeaderRight"></div>
            </div>

            <div className="posHeaderNote">{loyaltyNote}</div>
          </div>

          {/* ✅ Name / Mobile */}
          <div className="padFields">
            <div className="padFieldStack">
              <div className="padFieldGroup">
                <div className="padLabelBox">নাম</div>
                <div className="padInputLine">
                  <span className="padInputText">{customerNamePos}</span>
                </div>
              </div>

              <div className="padFieldGroup">
                <div className="padLabelBox">মোবা</div>
                <div className="padInputLine">
                  <span className="padInputText">
                    {customerPhonePos || "—"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* ✅ POS Meta */}
          <div className="posMeta">
            <div className="posMetaRow">
              <div className="posMetaLeft">
                <span className="posMetaLabel">মেমো:</span>{" "}
                <span className="posMetaMuted">{toBanglaDigit(memoNo)}</span>
              </div>
              <div className="posMetaRight">
                <span className="posMetaLabel">তারিখ:</span>{" "}
                <span className="posMetaMuted">{todayDateTimeBn}</span>
              </div>
            </div>

            <div className="posMetaRow">
              <div className="posMetaLeft">
                <span className="posMetaLabel">ক্যাশিয়ার:</span>{" "}
                <span className="posMetaMuted">{cashierName || "—"}</span>
              </div>
              <div className="posMetaRight"></div>
            </div>
          </div>

          {/* ✅ Items Table */}
          <div className="posTable">
            <div className="posThead">
              <div className="posCell posSL">SL</div>
              <div className="posCell">Name</div>
              <div className="posCell posUnit">Unit</div>
              <div className="posCell posQty">Qty</div>
              <div className="posCell posTotal">Total</div>
            </div>

            {lineRows.length ? (
              lineRows.map((r, idx) => (
                <div key={idx} className="posTrow">
                  <div className="posCell posSL">{toBanglaDigit(idx + 1)}</div>
                  <div className="posCell posName" title={r.name}>
                    {r.name}
                  </div>
                  <div className="posCell posUnit">
                    {formatMoneyBn(r.unitPrice)}
                  </div>
                  <div className="posCell posQty">
                    {toBanglaDigit(r.qty)}
                    {r.unitName ? ` ${r.unitName}` : ""}
                  </div>
                  <div className="posCell posTotal">
                    {formatMoneyBn(r.total)}
                  </div>
                </div>
              ))
            ) : (
              <div className="posTrow">
                <div className="posCell posSL">{toBanglaDigit(1)}</div>
                <div className="posCell posName">কোনো আইটেম নেই</div>
                <div className="posCell posUnit">{formatMoneyBn(0)}</div>
                <div className="posCell posQty">{toBanglaDigit(0)}</div>
                <div className="posCell posTotal">{formatMoneyBn(0)}</div>
              </div>
            )}
          </div>

          {/* ✅ Totals */}
          <div className="posTotals">
            <div className="posTotRow">
              <div className="posTotLabel">Sub Total :</div>
              <div className="posTotValue">{formatMoneyBn(posSubTotal)}</div>
            </div>

            {discountInfo.has ? (
              <div className="posTotRow">
                <div className="posTotLabel">(-) Discount :</div>
                <div className="posTotValue">
                  {discountInfo.isPercent
                    ? `${discountInfo.text}  (${formatMoneyBn(discountAmount)})`
                    : formatMoneyBn(discountAmount)}
                </div>
              </div>
            ) : null}

            <div className="posTotRow">
              <div className="posTotLabel"></div>
              <div className="posTotValue">
                {formatMoneyBn(totalAfterDiscount)}
              </div>
            </div>

            <div className="posTotDash" />

            <div className="posTotRow">
              <div className="posTotLabel">(±) Rounding :</div>
              <div className="posTotValue">{formatMoneyBn(rounding)}</div>
            </div>

            <div className="posTotRow posNet">
              <div className="posTotLabel">Net Payable :</div>
              <div className="posTotValue">{formatMoneyBn(netPayable)}</div>
            </div>

            <div className="posTotDash" />

            <div className="posTotRow">
              <div className="posTotLabel">Cash Paid :</div>
              <div className="posTotValue">{formatMoneyBn(cashPaid)}</div>
            </div>

            <div className="posTotRow">
              <div className="posTotLabel">Change Amount :</div>
              <div className="posTotValue">{formatMoneyBn(changeAmount)}</div>
            </div>
          </div>

          {/* ✅ Discount items */}
          {discountItems?.length ? (
            <>
              <div className="posSectionTitle">** DISCOUNT ITEMS **</div>
              <div className="posSmallList">
                {discountItems.map((d, i) => (
                  <div key={i} className="posSmallRow">
                    <div className="posSmallName">
                      {toBanglaDigit(i + 1)}. {d.name}
                    </div>
                    <div>{formatMoneyBn(d.amount)}</div>
                  </div>
                ))}
              </div>
            </>
          ) : null}

          {/* ✅ Total savings */}
          {totalSavings > 0 ? (
            <div className="posFooter" style={{ textAlign: "left" }}>
              <div style={{ fontWeight: 700 }}>
                Total savings TK. : {formatMoneyBn(totalSavings)}
              </div>
            </div>
          ) : null}

          {/* ✅ Loyalty points */}
          {loyalty ? (
            <div className="posFooter" style={{ textAlign: "left" }}>
              <div style={{ fontWeight: 700, marginBottom: "0.8mm" }}>
                Loyalty Points ({new Date().toLocaleDateString("en-GB")}):
              </div>
              <div className="posSmallRow">
                <div>Previous Points :</div>
                <div>{toBanglaDigit(loyalty.prev)}</div>
              </div>
              <div className="posSmallRow">
                <div>This Invoice :</div>
                <div>{toBanglaDigit(loyalty.earned)}</div>
              </div>
              <div className="posSmallRow" style={{ fontWeight: 700 }}>
                <div>Balance Points :</div>
                <div>{toBanglaDigit(loyalty.balance)}</div>
              </div>
            </div>
          ) : null}

          {/* ✅ Footer */}
          <div className="posFooter">
            <div>Prices inclusive of VAT (if applicable)</div>
            {hasValue(sale?.vat_payable) ? (
              <div style={{ fontWeight: 700 }}>
                VAT Payable TK. {formatMoneyBn(sale.vat_payable)}
              </div>
            ) : null}
            <div style={{ marginTop: "0.8mm" }}>Thank you for shopping</div>
            <div className="posThanks">ধন্যবাদ আবার আসবেন</div>
          </div>
        </div>
      </div>
    );
  };

  // =========================
  // ✅ Main UI (Preview)
  // =========================
  const InvoiceDesign2 = () => {
    const PAPER_MM = Number(paperWidthMm ?? 72);
    const extraCompact = PAPER_MM <= 40;

    // ✅ Use SAME font css in preview
    const previewCss = `
      :root{ --paper:${PAPER_MM}mm; }
      ${buildPosFontCss(PAPER_MM, PAPER_MM, scale)}
      .pos-preview{
        background:#fff;
        border:1px solid #e5e7eb;
        border-radius:10px;
        padding:12px;
        width: fit-content;
        margin: 0 auto;
        box-shadow:0 1px 2px rgba(0,0,0,.04);
      }
      /* preview doesn't need print offsets */
      .padRoot{ transform:none !important; }
    `;

    return (
      <div className="bg-gray-50 min-h-screen p-4">
        <style>{previewCss}</style>

        {/* Header + actions */}
        <div className="mb-4 bg-white p-4 rounded-lg shadow-sm no-print">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <button
                  type="button"
                  onClick={() => router.visit(route("sales.index"))}
                  className="btn btn-ghost btn-sm btn-circle"
                >
                  <ArrowLeft size={16} />
                </button>
                <h1 className="text-xl font-bold text-gray-800">
                  Sale Invoice (RP/XP Roll Print)
                </h1>
              </div>

              <div className="text-sm text-gray-600">
                মেমো:{" "}
                <span className="font-semibold">{toBanglaDigit(memoNo)}</span> •
                সময়: <span className="font-semibold">{todayDateTimeBn}</span>
                {isShadowUser && (
                  <span className="ml-2 text-xs px-2 py-0.5 rounded bg-yellow-100 text-yellow-800">
                    Shadow
                  </span>
                )}
              </div>

              <div className="mt-1 text-xs text-gray-500">
                ✅ Scale <b>100%</b> • Fit/Shrink <b>OFF</b> • Paper:{" "}
                <b style={{ color: PRIMARY }}>{paperWidthMm}mm</b> • Print uses:{" "}
                <b style={{ color: PRIMARY }}>{PRINTABLE_MM}mm</b>{" "}
                {paperWidthMm > PRINTABLE_MM ? (
                  <span className="ml-2 text-[11px] font-bold text-red-500">
                    (Printer cap {PRINTER_MAX_MM}mm → NO RIGHT GAP)
                  </span>
                ) : null}
              </div>
            </div>

            {/* controls */}
            <div className="flex flex-col gap-2 min-w-[260px]">
              <div className="flex items-center justify-between">
                <div className="text-xs font-bold text-gray-600">Paper Width</div>
                <div className="text-xs font-black" style={{ color: PRIMARY }}>
                  {paperWidthMm}mm
                </div>
              </div>

              <input
                type="range"
                min="30"
                max="100"
                step="1"
                value={paperWidthMm}
                onChange={(e) =>
                  setPaperWidthMm(clamp(Number(e.target.value), 30, 100))
                }
                className="range range-primary"
              />

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="btn btn-xs"
                  onClick={() => setPaperWidthMm(72)}
                  style={{ background: PRIMARY, color: "#fff" }}
                >
                  72mm (Default)
                </button>

                <button
                  type="button"
                  className="btn btn-xs btn-outline"
                  onClick={() => setPaperWidthMm(58)}
                  style={{ borderColor: PRIMARY, color: PRIMARY }}
                >
                  58mm
                </button>

                <button
                  type="button"
                  className="btn btn-xs btn-outline"
                  onClick={() => setPaperWidthMm(80)}
                  style={{ borderColor: PRIMARY, color: PRIMARY }}
                >
                  80mm
                </button>
              </div>

              <div className="flex flex-wrap gap-2 mt-1">
                <button
                  onClick={handlePrint}
                  className="btn btn-sm text-white"
                  style={{ background: PRIMARY }}
                  disabled={isPrinting}
                >
                  <Printer size={16} className="mr-1" />
                  Print
                  {isPrinting && (
                    <span className="loading loading-spinner loading-xs ml-2"></span>
                  )}
                </button>

                <button
                  onClick={handleDownloadDesign2}
                  className="btn btn-sm btn-outline"
                  disabled={isPrinting}
                  style={{ borderColor: PRIMARY, color: PRIMARY }}
                >
                  <Download size={16} className="mr-1" />
                  Save PDF
                  {isPrinting && (
                    <span className="loading loading-spinner loading-xs ml-2"></span>
                  )}
                </button>
              </div>

              {extraCompact ? (
                <div className="text-[11px] text-gray-500">
                  Compact mode (≤ 40mm) auto-adjusted.
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {/* Preview */}
        <div className="pos-preview no-print">
          <PadRoll />
        </div>
      </div>
    );
  };

  // =========================
  // ✅ Render
  // =========================
  return (
    <div className="relative">
      <InvoiceDesign2 />
    </div>
  );
}