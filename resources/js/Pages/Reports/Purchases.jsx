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
} from "lucide-react";
import { useMemo, useState, useEffect } from "react";
import { useTranslation } from "../../hooks/useTranslation";
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { toast } from "react-toastify";
import axios from 'axios';

export default function Purchases({ purchases, filters, isShadowUser, accounts }) {
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


  // ===================== Bulk Barcode Print =====================
  const [selectedPurchaseIds, setSelectedPurchaseIds] = useState(() => new Set());

  const clampInt = (v, min = 1, max = 999) => {
    const n = parseInt(v, 10);
    if (!Number.isFinite(n)) return min;
    return Math.max(min, Math.min(max, n));
  };



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
    return now.toISOString().split('T')[0] + '_' + 
           now.getHours() + '-' + 
           now.getMinutes() + '-' + 
           now.getSeconds();
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

    router.get(route("reports.purchase"), qs, {
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
      date_to: "" 
    });
    router.get(route("reports.purchase"), {}, { replace: true });
  };

  // Toggle filter section
  const toggleFilters = () => {
    setShowFilters(!showFilters);
  };

  // Check if any filter is active
  const hasActiveFilters = () => {
    return localFilters.search || localFilters.status || localFilters.date || localFilters.date_from || localFilters.date_to;
  };

  // Format date for input
  const formatDateForInput = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toISOString().split('T')[0];
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

  // ===================== Fetch all purchases for export =====================
  const fetchAllPurchasesForExport = async () => {
    try {
      const response = await axios.get(route('reports.purchase.export'), {
        params: {
          search: localFilters.search,
          status: localFilters.status,
          date_from: localFilters.date_from,
          date_to: localFilters.date_to
        }
      });
      return response.data.purchases;
    } catch (error) {
      console.error('Error fetching all purchases:', error);
      toast.error('Failed to fetch all purchase data');
      throw error;
    }
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


  // ===================== Prepare data for export =====================
  const prepareExportData = (purchasesData) => {
    return purchasesData.map(purchase => {
      const amounts = getDisplayAmounts(purchase);
      
      return {
        'Purchase No': purchase.purchase_no,
        'Supplier': purchase.supplier?.name || 'N/A',
        'Warehouse': purchase.warehouse?.name || 'N/A',
        'Total (Tk)': amounts.total.toFixed(2),
        'Paid (Tk)': amounts.paid.toFixed(2),
        'Due (Tk)': amounts.due.toFixed(2),
        'Payment Status': amounts.payment_status,
        'Purchase Status': purchase.status || 'N/A',
        'Date': formatDate(purchase.purchase_date),
        'Items Count': purchase.items?.length || 0,
        'Created By': purchase.creator?.name || 'System'
      };
    });
  };

  // ===================== Download as CSV =====================
  const downloadCSV = async () => {
    try {
      setIsDownloading(true);
      
      // Fetch all purchases
      const allPurchases = await fetchAllPurchasesForExport();
      
      if (allPurchases.length === 0) {
        toast.warning('No data to export');
        return;
      }

      const exportData = prepareExportData(allPurchases);

      const headers = Object.keys(exportData[0]);
      const csvRows = [];
      
      csvRows.push(headers.join(','));
      
      for (const row of exportData) {
        const values = headers.map(header => {
          const value = row[header]?.toString() || '';
          return `"${value.replace(/"/g, '""')}"`;
        });
        csvRows.push(values.join(','));
      }

      csvRows.push('');
      csvRows.push('FILTER INFORMATION');
      csvRows.push(`Search,${localFilters.search || 'None'}`);
      csvRows.push(`Status,${localFilters.status || 'All'}`);
      csvRows.push(`Date,${localFilters.date || 'None'}`);
      csvRows.push(`Date From,${localFilters.date_from || 'None'}`);
      csvRows.push(`Date To,${localFilters.date_to || 'None'}`);

      csvRows.push('');
      csvRows.push('SUMMARY STATISTICS');
      const totals = allPurchases.reduce((acc, purchase) => {
        const amounts = getDisplayAmounts(purchase);
        acc.total += amounts.total;
        acc.paid += amounts.paid;
        acc.due += amounts.due;
        return acc;
      }, { total: 0, paid: 0, due: 0 });
      
      csvRows.push(`Total Purchases,${allPurchases.length}`);
      csvRows.push(`Total Amount (Tk),${totals.total.toFixed(2)}`);
      csvRows.push(`Total Paid (Tk),${totals.paid.toFixed(2)}`);
      csvRows.push(`Total Due (Tk),${totals.due.toFixed(2)}`);

      const csvString = csvRows.join('\n');
      
      const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.href = url;
      link.download = `purchases_report_${formatDateForFilename()}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      
      toast.success('CSV downloaded successfully');
    } catch (error) {
      console.error('Error downloading CSV:', error);
      toast.error('Failed to download CSV');
    } finally {
      setIsDownloading(false);
    }
  };

  // ===================== Download as Excel =====================
  const downloadExcel = async () => {
    try {
      setIsDownloading(true);
      
      // Fetch all purchases
      const allPurchases = await fetchAllPurchasesForExport();
      
      if (allPurchases.length === 0) {
        toast.warning('No data to export');
        return;
      }

      const exportData = prepareExportData(allPurchases);

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(exportData);

      const filterData = [
        { 'Filter': 'Search', 'Value': localFilters.search || 'None' },
        { 'Filter': 'Status', 'Value': localFilters.status || 'All' },
        { 'Filter': 'Date', 'Value': localFilters.date || 'None' },
        { 'Filter': 'Date From', 'Value': localFilters.date_from || 'None' },
        { 'Filter': 'Date To', 'Value': localFilters.date_to || 'None' }
      ];
      const wsFilters = XLSX.utils.json_to_sheet(filterData);

      const totals = allPurchases.reduce((acc, purchase) => {
        const amounts = getDisplayAmounts(purchase);
        acc.total += amounts.total;
        acc.paid += amounts.paid;
        acc.due += amounts.due;
        return acc;
      }, { total: 0, paid: 0, due: 0 });
      
      const summaryData = [
        { 'Metric': 'Total Purchases', 'Value': allPurchases.length },
        { 'Metric': 'Total Amount (Tk)', 'Value': totals.total.toFixed(2) },
        { 'Metric': 'Total Paid (Tk)', 'Value': totals.paid.toFixed(2) },
        { 'Metric': 'Total Due (Tk)', 'Value': totals.due.toFixed(2) }
      ];
      const wsSummary = XLSX.utils.json_to_sheet(summaryData);

      XLSX.utils.book_append_sheet(wb, ws, 'Purchases');
      XLSX.utils.book_append_sheet(wb, wsFilters, 'Filters Applied');
      XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');

      XLSX.writeFile(wb, `purchases_report_${formatDateForFilename()}.xlsx`);
      
      toast.success('Excel file downloaded successfully');
    } catch (error) {
      console.error('Error downloading Excel:', error);
      toast.error('Failed to download Excel file');
    } finally {
      setIsDownloading(false);
    }
  };

  // ===================== Download as PDF =====================
  const downloadPDF = async () => {
    try {
      setIsDownloading(true);
      
      // Fetch all purchases
      const allPurchases = await fetchAllPurchasesForExport();
      
      if (allPurchases.length === 0) {
        toast.warning('No data to export');
        return;
      }

      const exportData = prepareExportData(allPurchases);

      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });

      doc.setFontSize(16);
      doc.setTextColor(30, 77, 43);
      doc.text('Purchase Report', 14, 15);
      
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 22);

      doc.setFontSize(9);
      doc.setTextColor(80, 80, 80);
      doc.text(`Search: ${localFilters.search || 'None'} | Status: ${localFilters.status || 'All'}`, 14, 29);
      doc.text(`Date: ${localFilters.date || 'None'} | Date Range: ${localFilters.date_from || 'Start'} to ${localFilters.date_to || 'End'}`, 14, 35);

      const tableColumns = [
        'Purchase No',
        'Supplier',
        'Total',
        'Paid',
        'Due',
        'Status',
        'Date'
      ];

      const tableRows = exportData.map(item => [
        item['Purchase No'].substring(0, 10) + (item['Purchase No'].length > 10 ? '...' : ''),
        item['Supplier'].substring(0, 15) + (item['Supplier'].length > 15 ? '...' : ''),
        item['Total (Tk)'],
        item['Paid (Tk)'],
        item['Due (Tk)'],
        item['Payment Status'],
        item['Date']
      ]);

      autoTable(doc, {
        head: [tableColumns],
        body: tableRows,
        startY: 40,
        theme: 'grid',
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [30, 77, 43], textColor: [255, 255, 255] },
        alternateRowStyles: { fillColor: [245, 245, 245] }
      });

      const totals = allPurchases.reduce((acc, purchase) => {
        const amounts = getDisplayAmounts(purchase);
        acc.total += amounts.total;
        acc.paid += amounts.paid;
        acc.due += amounts.due;
        return acc;
      }, { total: 0, paid: 0, due: 0 });
      
      const finalY = doc.lastAutoTable.finalY + 10;
      
      doc.setFontSize(12);
      doc.setTextColor(30, 77, 43);
      doc.text('Summary Statistics', 14, finalY);
      
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      doc.text(`Total Purchases: ${allPurchases.length}`, 14, finalY + 7);
      doc.text(`Total Amount: ${totals.total.toFixed(2)} Tk`, 14, finalY + 14);
      doc.text(`Total Paid: ${totals.paid.toFixed(2)} Tk`, 14, finalY + 21);
      doc.text(`Total Due: ${totals.due.toFixed(2)} Tk`, 14, finalY + 28);

      doc.save(`purchases_report_${formatDateForFilename()}.pdf`);
      
      toast.success('PDF downloaded successfully');
    } catch (error) {
      console.error('Error downloading PDF:', error);
      toast.error('Failed to download PDF');
    } finally {
      setIsDownloading(false);
    }
  };


  // ===================== UI =====================
  return (
    <div className={`bg-white rounded-box p-5 ${locale === "bn" ? "bangla-font" : ""}`}>
    
   
      {/* ===================== Header ===================== */}
      <PageHeader
        title={t("purchase.purchase_management", "Purchase Archive")}
        subtitle={t("purchase.manage_purchases", "Inbound inventory tracking index")}
      >
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
            {hasActiveFilters() && (
              <span className="badge badge-sm bg-primary text-white ml-2">Active</span>
            )}
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
                {localFilters.search && (
                  <span className="badge badge-outline badge-sm">
                    Search: {localFilters.search}
                  </span>
                )}
                {localFilters.status && (
                  <span className="badge badge-outline badge-sm">
                    Status: {localFilters.status}
                  </span>
                )}
                {localFilters.date && (
                  <span className="badge badge-outline badge-sm">
                    Date: {new Date(localFilters.date).toLocaleDateString()}
                  </span>
                )}
                {localFilters.date_from && (
                  <span className="badge badge-outline badge-sm">
                    From: {new Date(localFilters.date_from).toLocaleDateString()}
                  </span>
                )}
                {localFilters.date_to && (
                  <span className="badge badge-outline badge-sm">
                    To: {new Date(localFilters.date_to).toLocaleDateString()}
                  </span>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ===================== Action Buttons ===================== */}
      <div className="flex flex-wrap justify-between items-center gap-3 mb-4">
        <div className="flex flex-wrap gap-2 items-center">
          {selectedPurchaseIds.size > 0 && (
            <button type="button" onClick={clearSelection} className="btn btn-sm btn-outline font-black" title="Clear selection">
              <X size={16} /> Clear ({selectedPurchaseIds.size})
            </button>
          )}
        </div>

        {/* Download Button */}
        <div className="dropdown dropdown-end">
          <button 
            className="btn bg-green-600 text-white btn-sm"
            disabled={isDownloading}
            tabIndex={0}
          >
            <Download size={14} />
            {isDownloading ? 'Downloading...' : 'Download Report'}
          </button>
          <ul tabIndex={0} className="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-40">
            <li><button onClick={downloadCSV} className="btn btn-ghost btn-sm w-full text-left">CSV Format</button></li>
            <li><button onClick={downloadExcel} className="btn btn-ghost btn-sm w-full text-left">Excel Format</button></li>
            <li><button onClick={downloadPDF} className="btn btn-ghost btn-sm w-full text-left">PDF Format</button></li>
          </ul>
        </div>
      </div>

      {/* ===================== Table ===================== */}
      <div className="overflow-x-auto rounded-xl border border-gray-100">
        {safePurchases.length > 0 ? (
          <table className="table w-full">
            <thead className={`text-white uppercase text-[10px] tracking-widest ${isShadowUser ? "bg-amber-500" : "bg-primary"}`}>
              <tr>
                <th className="py-4">#</th>
                <th>Details</th>
                <th>Supplier & Warehouse</th>
                <th>Financial Status</th>
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
                            className={`badge border-none font-black text-[9px] uppercase py-1.5 px-2 ${
                              purchase.status === "completed"
                                ? "bg-blue-100 text-blue-700"
                                : purchase.status === "pending"
                                ? "bg-gray-100 text-gray-600"
                                : "bg-red-100 text-red-400"
                            }`}
                          >
                            {purchase.status}
                          </span>
                        </div>

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