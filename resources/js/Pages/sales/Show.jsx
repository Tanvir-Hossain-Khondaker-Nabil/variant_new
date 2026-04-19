// resources/js/Pages/sales/SaleShow.jsx
import React, { useMemo, useState, useEffect } from "react";
import { Link, usePage, router } from "@inertiajs/react";
import { ArrowLeft, Printer, Download, SlidersHorizontal, X, Check } from "lucide-react";
import { createPortal } from "react-dom";

/**
 * ✅ SaleShow (2 invoice designs + sidebar) — 100% DESIGN SAME
 *
 * ✅ Design-1: EXACTLY your current Sale invoice design (0% change)
 *    - only change: business profile dynamic (logo/name/address/phone/email/website/description)
 *
 * ✅ Design-2: Bangla Pad invoice (same style as your Purchase pad)
 *    - business profile dynamic
 *
 * ✅ Right-side floating icon + sidebar (Portal so z-index সমস্যা হবে না)
 * ✅ Persist design: cookie + localStorage
 * ✅ Print:
 *    - Design-1 prints #invoiceArea only (same method as your code)
 *    - Design-2 prints #printPad only (CSS visibility)
 */

export default function SaleShow({ sale, isShadowUser, businessProfile }) {
  const { auth } = usePage().props;
  const [isPrinting, setIsPrinting] = useState(false);

  // =========================
  // ✅ Persisted invoice type
  // =========================
  const STORAGE_KEY = "sale_invoice_design";
  const COOKIE_KEY = "sale_invoice_design";

  const getCookie = (name) => {
    if (typeof document === "undefined") return null;
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return decodeURIComponent(parts.pop().split(";").shift() || "");
    return null;
  };

  const setCookie = (name, value, days = 30) => {
    if (typeof document === "undefined") return;
    const d = new Date();
    d.setTime(d.getTime() + days * 24 * 60 * 60 * 1000);
    document.cookie = `${name}=${encodeURIComponent(value)}; expires=${d.toUTCString()}; path=/`;
  };

  const readPersistedDesign = () => {
    const ck = getCookie(COOKIE_KEY);
    if (ck === "1" || ck === "2") return ck;
    try {
      const ls = localStorage.getItem(STORAGE_KEY);
      if (ls === "1" || ls === "2") return ls;
    } catch (_) { }
    return "1"; // ✅ default must be Design-1
  };

  const [invoiceDesign, setInvoiceDesign] = useState("1");

  useEffect(() => {
    setInvoiceDesign(readPersistedDesign());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const persistDesign = (value) => {
    setInvoiceDesign(value);
    setCookie(COOKIE_KEY, value, 30);
    try {
      localStorage.setItem(STORAGE_KEY, value);
    } catch (_) { }
  };

  // =========================
  // ✅ Sidebar states
  // =========================
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const openSidebar = () => setSidebarOpen(true);
  const closeSidebar = () => setSidebarOpen(false);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") closeSidebar();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // =========================
  // ✅ Business profile dynamic (SAME for both designs)
  // =========================
  const resolveAssetUrl = (path) => {
    if (!path) return "";
    if (typeof path !== "string") return "";
    if (path.startsWith("http://") || path.startsWith("https://")) return path;
    if (path.startsWith("/")) return path;
    return `/storage/${path}`;
  };

  const profile = businessProfile || null;

  const bpName = profile?.name || "Business Name";
  const bpEmail = profile?.email || "email";
  const bpPhone = profile?.phone || "phone number";
  const bpAddr = profile?.address || "Address";
  const bpWebsite = profile?.website || "";
  const bpDesc = profile?.description || "";
  const bpFooterTitle = profile?.footer_title || "বিক্রয়িত পণ্য ১৫ দিনের মধ্যে ফেরত যোগ্য । পণ্য ফেরতের সময় অবশ্যই মেমোর ফটোকপি দিতে হবে";

  const bpLogo =
    resolveAssetUrl(profile?.logo) ||
    resolveAssetUrl(profile?.thum) ||
    "/media/uploads/logo.png";

  // =========================
  // ✅ helpers (Design-1: EXACTLY your code)
  // =========================
  const formatCurrency = (amount) => {
    const n = Number(amount || 0);
    return n.toFixed(2);
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  };

  const getProductDisplayName = (item) => {
    if (item.item_type === "pickup") return item.product_name || "Pickup Item";
    return item.product?.name || "N/A";
  };

  const getProductCode = (item) => {
    if (item.item_type === "pickup") return "PICKUP";
    return item.product?.product_no || item.product_id || "N/A";
  };

  const getVariantDisplayName = (item) => {
    if (item.variant?.attribute_values && typeof item.variant.attribute_values === "object") {
      return Object.values(item.variant.attribute_values).join(", ");
    }
    return item.variant?.attribute_values || "N/A";
  };

  const getBrandName = (item) => {
    return item.product?.brand?.name || item.brand?.name || item.product?.brand || "N/A";
  };

  const totalQty = useMemo(() => {
    return sale.items?.reduce((t, it) => t + Number(it.quantity || 0), 0) || 0;
  }, [sale]);

  const getAddAmount = (item) => {
    return Number(item.add_amount || item.vat_amount || item.tax_amount || 0);
  };

  const rowTotal = (item) => {
    const backend = Number(item.total_price || 0);
    if (backend) return backend;
    const qty = Number(item.quantity || 0);
    const unit = Number(item.unit_price || 0);
    return qty * unit + getAddAmount(item);
  };

  const items = sale.items || [];

  // =========================
  // ✅ Print Design-1 (EXACTLY your method)
  // =========================
  const handlePrintDesign1 = () => {
    const printContents = document.getElementById("invoiceArea")?.innerHTML;
    if (!printContents) return;

    const originalContents = document.body.innerHTML;

    document.body.innerHTML = `
        <html>
        <head>
            <title>Invoice Print</title>
            <style>
            @page { size: A4; margin: 10mm; }
            body { background: white; }
            table { width: 100%; border-collapse: collapse; }
            </style>
        </head>
        <body>${printContents}</body>
        </html>
    `;

    window.print();
    document.body.innerHTML = originalContents;
    window.location.reload(); // page back to normal
  };

  // =========================
  // ✅ Design-2 (Bangla Pad helpers)
  // =========================
  const safeItems = useMemo(() => sale?.items || [], [sale]);

  const toBanglaDigit = (value) => {
    const map = { 0: "০", 1: "১", 2: "২", 3: "৩", 4: "৪", 5: "৫", 6: "৬", 7: "৭", 8: "৮", 9: "৯" };
    return String(value ?? "").replace(/\d/g, (d) => map[d]);
  };

  const formatMoneyBn = (num) => {
    const n = Number(num || 0);
    const s = new Intl.NumberFormat("en-BD", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(n);
    return toBanglaDigit(s);
  };

  const formatNumberBn = (num) => {
    const n = Number(num || 0);
    const s = new Intl.NumberFormat("en-BD", { maximumFractionDigits: 2 }).format(n);
    return toBanglaDigit(s);
  };

  const formatDateBn = (date) => {
    if (!date) return "";
    const d = new Date(date);
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yy = String(d.getFullYear());
    return toBanglaDigit(`${dd}/${mm}/${yy}`);
  };

  const formatDateTimeBn = (date) => {
    if (!date) return "";
    const d = new Date(date);
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yy = String(d.getFullYear());
    const hh = String(d.getHours()).padStart(2, "0");
    const mi = String(d.getMinutes()).padStart(2, "0");
    return toBanglaDigit(`${dd}/${mm}/${yy} ${hh}:${mi}`);
  };

  const totalQty2 = useMemo(
    () => safeItems.reduce((s, it) => s + Number(it?.quantity || 0), 0),
    [safeItems]
  );

  const rows2 = useMemo(() => {
    return safeItems.map((item) => {
      const desc = getProductDisplayName(item);
      const qty = Number(item?.quantity || 0);
      const rate = Number(item?.unit_price || 0);
      const amount = Number(rowTotal(item) || 0);

      const identifiers = Array.isArray(item?.identifiers)
        ? item.identifiers
        : [];

      return { desc, qty, rate, amount, identifiers };
    });
  }, [safeItems]);

  const totals2 = useMemo(() => {
    const grandTotal = Number(sale?.grand_total || 0);
    const paid = Number(sale?.paid_amount || 0);
    const due = Number(sale?.due_amount || (grandTotal - paid));
    return { grandTotal, paid, due };
  }, [sale]);

  // ========= Pad theme (same as your pad)
  const MB_DARK = "rgb(15, 45, 26)";
  const MB_LIGHT = "rgb(30, 77, 43)";
  const MB_GRADIENT = "linear-gradient(rgb(15, 45, 26) 0%, rgb(30, 77, 43) 100%)";

  const BORDER = "border-[#0f2d1a]";
  const TEXT = "text-[#1e4d2b]";

  const memoNo2 = sale?.invoice_no || sale?.id || "";
  const invoiceDate2 = formatDateBn(sale?.created_at);

  const customerName2 =
    sale?.customer?.customer_name ||
    sale?.customer?.name ||
    "Walk-in Customer";

  const customerAddress2 =
    sale?.customer?.address ||
    sale?.customer?.customer_address ||
    "";

  const InvoicePad = ({ isPrint = false } = {}) => (
    <div className={`pad-border border-2 ${BORDER} p-3 sm:p-4`}>
      {/* ✅ SAME PAD DESIGN (only dynamic text) */}
      <div
        className={`text-center ${isPrint ? "text-[34px]" : "text-[34px] sm:text-[38px]"} font-extrabold leading-tight`}
        style={{
          background: MB_GRADIENT,
          WebkitBackgroundClip: "text",
          color: "transparent",
        }}
      >
        {bpName}
      </div>

      <div className="text-center mt-2">
        <span
          className="inline-block text-white px-4 py-1 rounded-full text-sm font-bold"
          style={{ background: MB_GRADIENT }}
        >
          {bpPhone ? `ফোন: ${bpPhone}` : " "}
        </span>
      </div>

      <div className="text-center text-xs sm:text-sm leading-relaxed mt-2 px-1">
        {bpDesc || "ধন্যবাদ।"}
      </div>

      <div className="text-center text-xs sm:text-sm font-semibold mt-2">
        {bpAddr}
      </div>

      {/* dotted fields */}
      <div className="mt-3 space-y-2 text-sm font-semibold">
        <div className="grid grid-cols-[42px_1fr_38px_1fr] gap-2 items-end">
          <div>নং-</div>
          <div className="flex items-end gap-2">
            <span className="text-xs font-medium">{toBanglaDigit(memoNo2)}</span>
            <span className={`flex-1 border-b-2 border-dotted ${BORDER} h-4`} />
          </div>
          <div>তারিখ</div>
          <div className="flex items-end gap-2">
            <span className="text-xs font-medium">{invoiceDate2}</span>
            <span className={`flex-1 border-b-2 border-dotted ${BORDER} h-4`} />
          </div>
        </div>

        <div className="grid grid-cols-[42px_1fr] gap-2 items-end">
          <div>নাম</div>
          <div className="flex items-end gap-2">
            <span className="text-xs font-medium">{customerName2}</span>
            <span className={`flex-1 border-b-2 border-dotted ${BORDER} h-4`} />
          </div>
        </div>

        <div className="grid grid-cols-[42px_1fr] gap-2 items-end">
          <div>ঠিকানা</div>
          <div className="flex items-end gap-2">
            <span className="text-xs font-medium">{customerAddress2}</span>
            <span className={`flex-1 border-b-2 border-dotted ${BORDER} h-4`} />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="mt-4">
        <table className="w-full table-fixed border-collapse">
          <thead>
            <tr>
              <th className={`border-2 ${BORDER} font-extrabold text-sm py-2 w-[55%]`} style={{ color: MB_LIGHT }}>
                বিবরণ
              </th>
              <th className={`border-2 ${BORDER} font-extrabold text-sm py-2 w-[15%]`} style={{ color: MB_LIGHT }}>
                পরিমাণ
              </th>
              <th className={`border-2 ${BORDER} font-extrabold text-sm py-2 w-[15%]`} style={{ color: MB_LIGHT }}>
                দর
              </th>
              <th className={`border-2 ${BORDER} font-extrabold text-sm py-2 w-[15%]`} style={{ color: MB_LIGHT }}>
                টাকা
              </th>
            </tr>
          </thead>

          <tbody>
            {rows2.length ? (
              rows2.map((r, idx) => (
                <tr key={idx}>
                  <td className={`border-l-2 border-r-2 ${BORDER} px-2 py-2 text-sm`}>
                    <div>{r.desc}</div>

                    {Array.isArray(r.identifiers) && r.identifiers.length > 0 && (
                      <div className="mt-1 space-y-[2px] text-[11px] text-gray-700">
                        {r.identifiers.map((identifier, idx) => (
                          <div key={identifier.id || idx}>
                            <span className="font-semibold uppercase">
                              {identifier.identifier_type}:
                            </span>{" "}
                            <span className="font-mono">{identifier.identifier_value}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className={`border-l-2 border-r-2 ${BORDER} px-2 py-2 text-sm text-center`}>
                    {formatNumberBn(r.qty)}
                  </td>
                  <td className={`border-l-2 border-r-2 ${BORDER} px-2 py-2 text-sm text-center`}>
                    {formatMoneyBn(r.rate)}
                  </td>
                  <td className={`border-l-2 border-r-2 ${BORDER} px-2 py-2 text-sm text-center`}>
                    {formatMoneyBn(r.amount)}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={4}
                  className={`border-l-2 border-r-2 border-b-2 ${BORDER} px-3 py-8 text-center text-gray-500`}
                >
                  কোনো আইটেম পাওয়া যায়নি
                </td>
              </tr>
            )}

            <tr>
              <td colSpan={4} className={`border-b-2 ${BORDER}`} style={{ height: 1 }} />
            </tr>
          </tbody>
        </table>

        {/* Totals */}
        <div className="mt-3 flex flex-wrap justify-end gap-4 text-xs font-bold">
          <span>
            মোট পরিমাণ: <b className={TEXT}>{formatNumberBn(totalQty2)}</b>
          </span>
          <span>
            মোট টাকা: <b className={TEXT}>{formatMoneyBn(totals2.grandTotal)}</b>
          </span>
          <span>
            পরিশোধ: <b className={TEXT}>{formatMoneyBn(totals2.paid)}</b>
          </span>
          <span>
            বকেয়া: <b className={TEXT}>{formatMoneyBn(totals2.due)}</b>
          </span>
        </div>

        <div className="mt-5 text-[11px] text-gray-700 whitespace-pre-line">
          {bpFooterTitle}
        </div>
      </div>
    </div>
  );

  // ✅ Print Design-2 (printPad only)
  const handlePrintDesign2 = () => {
    setIsPrinting(true);
    requestAnimationFrame(() => {
      setTimeout(() => {
        window.print();
        setTimeout(() => setIsPrinting(false), 400);
      }, 80);
    });
  };

  // ✅ Print switch
  const handlePrint = () => {
    if (invoiceDesign === "2") return handlePrintDesign2();
    return handlePrintDesign1();
  };
  const handleDownloadPDF = () => handlePrint();

  // =========================
  // ✅ Floating + Sidebar (Portal) — no design change in invoice
  // =========================
  function FloatingSettingsButton({ onClick }) {
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);
    if (!mounted) return null;

    return createPortal(
      <button
        type="button"
        onClick={onClick}
        className="no-print fixed right-3 top-1/2 -translate-y-1/2 bg-white border border-gray-200 shadow-lg rounded-full w-11 h-11 flex items-center justify-center hover:bg-gray-50"
        style={{ zIndex: 2147483647, pointerEvents: "auto" }}
        title="Invoice Settings"
      >
        <SlidersHorizontal size={18} />
      </button>,
      document.body
    );
  }

  function DesignCard({ title, desc, active, onSelect }) {
    return (
      <button
        type="button"
        onClick={onSelect}
        className={`w-full text-left p-3 rounded-xl border transition ${active ? "border-green-600 bg-green-50" : "border-gray-200 hover:bg-gray-50"
          }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-sm font-bold text-gray-900">{title}</div>
            <div className="text-xs text-gray-600 mt-1">{desc}</div>
          </div>
          {active ? (
            <span className="inline-flex items-center gap-1 text-xs font-bold text-green-700">
              <Check size={16} /> Active
            </span>
          ) : (
            <span className="text-xs font-semibold text-gray-500">Select</span>
          )}
        </div>
      </button>
    );
  }

  function SidebarDrawer() {
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);
    if (!mounted) return null;

    return createPortal(
      <>
        {sidebarOpen && (
          <div
            className="no-print fixed inset-0 bg-black/40"
            style={{ zIndex: 2147483646 }}
            onClick={closeSidebar}
          />
        )}

        <div
          className={`no-print fixed top-0 right-0 h-full w-[320px] bg-white shadow-2xl border-l border-gray-200 transform transition-transform duration-200 ${sidebarOpen ? "translate-x-0" : "translate-x-full"
            }`}
          style={{ zIndex: 2147483647 }}
        >
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            <div>
              <div className="text-sm font-bold text-gray-900">Invoice Settings</div>
              <div className="text-xs text-gray-500">Select invoice design (saved)</div>
            </div>
            <button
              type="button"
              onClick={closeSidebar}
              className="w-9 h-9 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-50"
              title="Close"
            >
              <X size={16} />
            </button>
          </div>

          <div className="p-4 space-y-3">
            <DesignCard
              title="Design 1 (Default)"
              desc="Standard A4 invoice (current design)"
              active={invoiceDesign === "1"}
              onSelect={() => persistDesign("1")}
            />
            <DesignCard
              title="Design 2 (Bangla Pad)"
              desc="Pad invoice with business profile"
              active={invoiceDesign === "2"}
              onSelect={() => persistDesign("2")}
            />
          </div>
        </div>
      </>,
      document.body
    );
  }

  // =========================
  // ✅ Design-1 UI — EXACT your invoice (0% change)
  // ONLY: business profile dynamic values injected in SAME places
  // =========================
  const InvoiceDesign1 = () => (
    <div className="bg-gray-100 min-h-screen p-3">
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          @page { size: A4; margin: 10mm; }
        }
      `}</style>

      {/* Top actions (hidden on print) */}
      <div className="no-print mb-3 bg-white border border-gray-300 rounded-md p-3 flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm">
          <div className="font-semibold text-gray-800">Invoice: {sale.invoice_no}</div>
          <div className="text-gray-600">Date: {formatDate(sale.created_at)}</div>
        </div>

        <div className="flex gap-2">
          <Link href={route("sales.index")} className="btn btn-sm btn-ghost border border-gray-300">
            <ArrowLeft size={16} className="mr-1" />
            Back
          </Link>
          <button onClick={handlePrint} className="btn btn-sm bg-gray-900 hover:bg-black text-white">
            <Printer size={16} className="mr-1" />
            Print
          </button>
          <button onClick={handleDownloadPDF} className="btn btn-sm bg-gray-700 hover:bg-gray-800 text-white">
            <Download size={16} className="mr-1" />
          </button>
        </div>
      </div>

      {/* Invoice Paper */}
      <div
        id="invoiceArea"
        className="bg-white border border-gray-400 mx-auto rounded-md shadow-sm relative overflow-hidden"
        style={{ maxWidth: "210mm" }}
      >
        {/* Watermark (like image) */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-10">
          <div className="w-[200px] h-[200px] rounded-full border-[10px] border-red-700 flex items-center justify-center">
            <div className="text-[80px] font-black text-red-200">
              <img
                src={bpLogo}
                className="h-full w-full object-contain p-1 "
                style={{ borderRadius: "50%" }}
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = "/media/uploads/logo.png";
                }}
                alt="Logo"
              />
            </div>
          </div>
        </div>

        <div className="relative p-4">
          {/* Header line like image */}
          <div className="flex items-start justify-between gap-4 border-b border-black pb-2">
            {/* Left brand */}
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full border-2 border-red-400 flex items-center justify-center">
                <img
                  src={bpLogo}
                  className="h-full w-full object-contain p-1 "
                  style={{ borderRadius: "50%" }}
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = "/media/uploads/logo.png";
                  }}
                  alt="Company Logo"
                />
              </div>
              <div>
                <div className="text-xl font-black tracking-wide text-gray-900">{bpName}</div>
                <div className="text-[11px] font-semibold tracking-[0.22em] text-gray-700 -mt-0.5"></div>
              </div>
            </div>

            {/* Offices (2 blocks) */}
            <div className="flex gap-4 text-[10px] leading-4 text-gray-800">
              <div className="border-l border-gray-300 pl-3">
                <div className="font-bold text-red-700">অফিস</div>
                <div className="max-w-[240px]">{bpAddr}</div>
                <div>{bpPhone}</div>
                <div>{bpEmail}</div>
                {bpWebsite ? <div>{bpWebsite}</div> : null}
              </div>
            </div>
          </div>

          {/* Invoice Title row */}
          <div className="flex items-center justify-center py-2">
            <div className="px-4 py-1 border border-black text-[12px] font-bold uppercase tracking-wider">
              Invoice
            </div>
          </div>

          {/* Meta info grid (like image small fields) */}
          <div className="grid grid-cols-2 gap-3 text-[10px] border-b border-gray-300 pb-2">
            <div className="space-y-1">
              <div className="flex justify-between gap-3">
                <span className="font-semibold">Bill No</span>
                <span className="font-mono">{sale.invoice_no}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="font-semibold">Delivery Date</span>
                <span>{formatDate(sale.delivery_date || sale.created_at)}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="font-semibold">Bill To</span>
                <span className="text-right">{sale.customer?.customer_name || "Walk-in Customer"}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="font-semibold">Address</span>
                <span className="text-right">{sale.customer?.address || "N/A"}</span>
              </div>
            </div>

            <div className="space-y-1">
              {/* <div className="flex justify-between gap-3">
                <span className="font-semibold">Project</span>
              </div> */}
              <div className="flex justify-between gap-3">
                <span className="font-semibold">Memo No</span>
                <span>{sale.reference_no || sale.id}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="font-semibold">Served By</span>
                <span>{sale.creator?.name || auth?.user?.name || "N/A"}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="font-semibold">Date & Time</span>
                <span>{formatDateTime(sale.created_at)}</span>
              </div>
            </div>
          </div>

          {/* Items table like image */}
          <div className="mt-2 overflow-x-auto">
            <table className="w-full text-[10px] border border-black">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-black p-1 w-[4%]">SL</th>
                  <th className="border border-black p-1 w-[10%]">Code</th>
                  <th className="border border-black p-1 text-left w-[30%]">Item Name</th>
                  <th className="border border-black p-1 text-left w-[16%]">Model / Variant</th>
                  <th className="border border-black p-1 w-[10%]">Brand</th>
                  <th className="border border-black p-1 w-[6%]">Qty</th>
                  <th className="border border-black p-1 w-[10%]">Trade Price</th>
                  <th className="border border-black p-1 w-[6%]">Add</th>
                  <th className="border border-black p-1 w-[8%]">Total Value</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => {
                  const add = getAddAmount(item);
                  const total = rowTotal(item);
                  return (
                    <tr key={item.id || idx}>
                      <td className="border border-black p-1 text-center">{idx + 1}</td>
                      <td className="border border-black p-1 text-center font-mono">{getProductCode(item)}</td>
                      {/* <td className="border border-black p-1">
                        <div className="font-semibold">{getProductDisplayName(item)}</div>
                        {item.item_type === "pickup" ? (
                          <div className="text-[9px] text-gray-600">Pickup Item</div>
                        ) : (
                          <div className="text-[9px] text-gray-600">
                            Stock Item
                          </div>
                        )}
                      </td> */}

                      <td className="border border-black p-1">
                        <div className="font-semibold">{getProductDisplayName(item)}</div>

                        {item.item_type === "pickup" ? (
                          <div className="text-[9px] text-gray-600">Pickup Item</div>
                        ) : (
                          <div className="text-[9px] text-gray-600">
                            Stock Item
                          </div>
                        )}

                        {Array.isArray(item.identifiers) && item.identifiers.length > 0 && (
                          <div className="mt-1 space-y-[2px]">
                            {item.identifiers.map((identifier, i) => (
                              <div key={identifier.id || i} className="text-[9px] leading-tight text-gray-700">
                                <span className="font-semibold uppercase">
                                  {identifier.identifier_type}:
                                </span>{" "}
                                <span className="font-mono">{identifier.identifier_value}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="border border-black p-1">{getVariantDisplayName(item) || 'Default'}</td>
                      <td className="border border-black p-1 text-center">{getBrandName(item)}</td>
                      <td className="border border-black p-1 text-center font-bold">
                        {item.quantity}
                        {item.unit ? <span className="text-[9px] text-gray-600"> {item.unit}</span> : null}
                      </td>
                      <td className="border border-black p-1 text-right font-mono">{formatCurrency(item.unit_price)}</td>
                      <td className="border border-black p-1 text-right font-mono">{formatCurrency(add)}</td>
                      <td className="border border-black p-1 text-right font-mono font-bold">{formatCurrency(total)}</td>
                    </tr>
                  );
                })}

                {items.length === 0 && (
                  <tr>
                    <td colSpan={9} className="border border-black p-3 text-center text-gray-600">
                      No items found
                    </td>
                  </tr>
                )}
              </tbody>

              {/* Footer totals row like image */}
              <tfoot>
                <tr>
                  <td colSpan={5} className="border border-black p-1 text-right font-bold">
                    Pcs.
                  </td>
                  <td className="border border-black p-1 text-center font-bold">{totalQty}</td>
                  <td className="border border-black p-1"></td>
                  <td className="border border-black p-1"></td>
                  <td className="border border-black p-1 text-right font-bold">
                    {formatCurrency(sale.grand_total)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Bottom summary (compact like invoice) */}
          <div className="mt-3 grid grid-cols-2 gap-3 text-[10px]">
            <div className="border border-gray-300 p-2">
              <div className="flex justify-between">
                <span className="font-semibold">Sub Total</span>
                <span className="font-mono">{formatCurrency(sale.sub_total)}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold">VAT/Tax</span>
                <span className="font-mono">
                  {sale.vat_tax || 0}% (
                  {formatCurrency((Number(sale.sub_total || 0) * Number(sale.vat_tax || 0)) / 100)})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold">Discount</span>
                <span className="font-mono">
                  {sale.discount || 0} {sale?.discount_type == 'flat_discount' ? 'Tk' : '%'}
                </span>
              </div>
              <div className="flex justify-between font-bold border-t border-gray-300 pt-1 mt-1">
                <span>Grand Total</span>
                <span className="font-mono">{formatCurrency(sale.grand_total)}</span>
              </div>
            </div>

            <div className="border border-gray-300 p-2">
              <div className="flex justify-between">
                <span className="font-semibold">Paid Amount</span>
                <span className="font-mono">{formatCurrency(sale.paid_amount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold">Due Amount</span>
                <span className="font-mono">{formatCurrency(sale.due_amount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold">Payment Method</span>
                <span className="font-semibold">{(sale.payment_type || "CASH").toUpperCase()}</span>
              </div>
            </div>
          </div>

          {/* Signature row like image */}
          <div className="mt-5 grid grid-cols-4 gap-4 text-[10px]">
            <div className="text-center">
              <div className="border-t border-black pt-1 font-semibold">Checked By</div>
            </div>
            <div className="text-center">
              <div className="border-t border-black pt-1 font-semibold">Authorised</div>
            </div>
            <div className="text-center">
              <div className="border-t border-black pt-1 font-semibold">Received</div>
            </div>
            <div className="text-center">
              <div className="border-t border-black pt-1 font-semibold">Delivery By</div>
            </div>
          </div>

          {/* Footer note line */}
          <div className="mt-3 text-[9px] text-gray-600 flex justify-between border-t border-gray-300 pt-2">
            <div>
              <span className=" whitespace-pre-line">
                {bpFooterTitle}
              </span>
            </div>
            <div>
              Powered by: Wiki Tech BD
              <br />
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // =========================
  // ✅ Design-2 wrapper (Pad print)
  // =========================
  const InvoiceDesign2 = () => (
    <div className="bg-gray-50 min-h-screen p-4">
      <style>{`
        #printPad { display: none; }

        @media print {
          @page { size: A4 portrait; margin: 10mm; }
          html, body { height: auto !important; }
          body {
            margin: 0 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          body * { visibility: hidden !important; }
          #printPad, #printPad * { visibility: visible !important; }

          #printPad {
            display: block !important;
            position: fixed !important;
            inset: 0 !important;
            width: 100% !important;
            background: #fff !important;
            padding: 0 !important;
          }

          #printPad .pad-border {
            max-width: 190mm !important;
            margin: 0 auto !important;
            border: 2px solid ${MB_DARK} !important;
            padding: 16px !important;
            min-height: 277mm !important;
          }

          table { page-break-inside: auto; }
          tr { page-break-inside: avoid; page-break-after: auto; }

          .no-print { display: none !important; }
        }
      `}</style>

      <div className="mb-4 bg-white p-4 rounded-lg shadow-sm no-print">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-gray-800">Invoice (Bangla Pad)</h1>
            <p className="text-sm text-gray-600 mt-1">
              নং: <span className="font-semibold">{toBanglaDigit(memoNo2)}</span> • তারিখ:{" "}
              <span className="font-semibold">{invoiceDate2}</span>
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link href={route("sales.index")} className="btn btn-sm btn-ghost border border-gray-300">
              <ArrowLeft size={15} className="mr-1" />
              Back
            </Link>

            <button
              onClick={handlePrint}
              className="btn btn-sm text-white"
              style={{ background: MB_GRADIENT }}
              disabled={isPrinting}
            >
              <Printer size={15} className="mr-1" />
              Print
              {isPrinting && <span className="loading loading-spinner loading-xs ml-2"></span>}
            </button>

            <button
              onClick={handleDownloadPDF}
              className="btn btn-sm text-white"
              style={{ background: MB_GRADIENT }}
              disabled={isPrinting}
            >
              <Download size={15} className="mr-1" />
              PDF
              {isPrinting && <span className="loading loading-spinner loading-xs ml-2"></span>}
            </button>
          </div>
        </div>
      </div>

      {/* Screen preview */}
      <div className="mx-auto max-w-[860px] bg-white shadow-sm rounded-lg border no-print">
        <div className="p-4 sm:p-6">
          <InvoicePad />
        </div>
      </div>

      {/* Print only */}
      <div id="printPad">
        <div className="mx-auto max-w-[860px] bg-white">
          <InvoicePad isPrint />
        </div>
      </div>
    </div>
  );

  // =========================
  // ✅ Render (design-1 default)
  // =========================
  return (
    <div className="relative">
      <FloatingSettingsButton onClick={openSidebar} />
      <SidebarDrawer />
      {invoiceDesign === "2" ? <InvoiceDesign2 /> : <InvoiceDesign1 />}
    </div>
  );
}
