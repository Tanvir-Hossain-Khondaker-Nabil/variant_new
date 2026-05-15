import React, { useState } from "react";
import PageHeader from "../../components/PageHeader";
import Pagination from "../../components/Pagination";
import { Frown, Search, Eye, FileText, User, Receipt, DollarSign, Wallet, CreditCard, Landmark, Globe, Calendar, Download, Filter, ChevronUp, ChevronDown } from "lucide-react";
import { Link, router, useForm, usePage } from "@inertiajs/react";
import { useTranslation } from "../../hooks/useTranslation";
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { toast } from "react-toastify";

export default function PaymentIndex({ payments, filters, isShadowUser }) {
    const { auth } = usePage().props;
    const { t, locale } = useTranslation();
    const [showFilters, setShowFilters] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);

    // Handle search and filters
    const filterForm = useForm({
        search: filters.search || "",
        start_date: filters.start_date || "",
        end_date: filters.end_date || "",
    });

    const handleFilter = () => {
        const queryParams = {};
        if (filterForm.data.search.trim()) {
            queryParams.search = filterForm.data.search.trim();
        }
        if (filterForm.data.start_date) {
            queryParams.start_date = filterForm.data.start_date;
        }
        if (filterForm.data.end_date) {
            queryParams.end_date = filterForm.data.end_date;
        }
        router.get(route("payments.index"), queryParams, {
            preserveScroll: true,
            preserveState: true,
            replace: true,
        });
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter') {
            handleFilter();
        }
    };

    const openDatePicker = (e) => {
        if (typeof e.currentTarget.showPicker === "function") {
            try {
                e.currentTarget.showPicker();
            } catch (error) {
                e.currentTarget.focus();
            }
        }
    };

    const clearFilters = () => {
        filterForm.setData({ search: "", start_date: "", end_date: "" });
        setTimeout(() => {
            router.get(route("payments.index"), {}, {
                preserveScroll: true,
                preserveState: true,
            });
        }, 0);
    };

    // Toggle filter section
    const toggleFilters = () => {
        setShowFilters(!showFilters);
    };

    // Check if any filter is active
    const hasActiveFilters = () => {
        return filterForm.data.search || filterForm.data.start_date || filterForm.data.end_date;
    };

    // Format date for input
    const formatDateForInput = (dateString) => {
        if (!dateString) return '';
        return new Date(dateString).toISOString().split('T')[0];
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-BD', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(amount);
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleString(locale === 'bn' ? 'bn-BD' : 'en-GB', {
            timeZone: "Asia/Dhaka",
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    // Format date for filename
    const formatDateForFilename = () => {
        const now = new Date();
        return now.toISOString().split('T')[0] + '_' + 
               now.getHours() + '-' + 
               now.getMinutes() + '-' + 
               now.getSeconds();
    };

    const getPaymentMethodBadge = (method) => {
        const colors = {
            cash: "bg-green-100 text-green-700",
            bank: "bg-purple-100 text-purple-700",
            mobile_banking: "bg-amber-100 text-amber-700",
            online: "bg-red-100 text-red-700",
        };
        const labels = {
            cash: t('payment.cash', 'Cash'),
            bank: t('payment.bank', 'Bank Transfer'),
            mobile_banking: t('payment.mobile_banking', 'Mobile Banking'),
            online: t('payment.online', 'Online Payment'),
        };
        return {
            color: colors[method] || "bg-gray-100 text-gray-700",
            label: labels[method] || method
        };
    };

    const getStatusLabel = (status) => {
        const labels = {
            completed: t('payment.completed', 'Completed'),
            pending: t('payment.pending', 'Pending'),
            failed: t('payment.failed', 'Failed'),
        };
        return labels[status] || status;
    };

    const calculateTotals = () => {
        const paymentsData = payments.data || [];
        const totalAmount = paymentsData.reduce((sum, payment) => sum + parseFloat(payment.amount || 0), 0);
        const totalCash = paymentsData.reduce((sum, payment) =>
            payment.payment_method == 'cash' ? sum + parseFloat(payment.amount || 0) : sum, 0);
        const totalCard = paymentsData.reduce((sum, payment) =>
            payment.payment_method == 'mobile_banking' ? sum + parseFloat(payment.amount || 0) : sum, 0);
        const totalBank = paymentsData.reduce((sum, payment) =>
            payment.payment_method == 'bank' ? sum + parseFloat(payment.amount || 0) : sum, 0);

        return { totalAmount, totalCash, totalCard, totalBank, totalPayments: paymentsData.length };
    };

    // Prepare data for export
    const prepareExportData = () => {
        const paymentsData = payments.data || [];
        
        return paymentsData.map(payment => ({
            'Reference': payment.txn_ref || "#MANUAL",
            'Entity': payment.customer?.customer_name || payment.supplier?.name || "Walk-in",
            'Entity Type': payment.customer ? "Customer" : (payment.supplier ? "Supplier" : "Walk-in"),
            'Amount (Tk)': parseFloat(payment.amount).toFixed(2),
            'Payment Method': getPaymentMethodBadge(payment.payment_method).label,
            'Status': getStatusLabel(payment.status),
            'Date': formatDate(payment.created_at),
            'Account': payment.account?.name || 'Cash',
            'Sale ID': payment.sale?.id || 'N/A',
            'Purchase ID': payment.purchase?.id || 'N/A',
            'Created By': payment.creator?.name || 'System'
        }));
    };

    // Download as CSV
    const downloadCSV = () => {
        try {
            setIsDownloading(true);
            const exportData = prepareExportData();
            
            if (exportData.length === 0) {
                toast.warning('No data to export');
                return;
            }

            // Convert to CSV
            const headers = Object.keys(exportData[0]);
            const csvRows = [];
            
            // Add headers
            csvRows.push(headers.join(','));
            
            // Add data rows
            for (const row of exportData) {
                const values = headers.map(header => {
                    const value = row[header]?.toString() || '';
                    // Escape commas and quotes
                    return `"${value.replace(/"/g, '""')}"`;
                });
                csvRows.push(values.join(','));
            }

            // Add filter information
            csvRows.push(''); // Empty row
            csvRows.push('FILTER INFORMATION');
            csvRows.push(`Search,${filterForm.data.search || 'None'}`);
            csvRows.push(`Date Range,${filterForm.data.start_date || 'Start'} to ${filterForm.data.end_date || 'End'}`);

            // Add summary section
            csvRows.push(''); // Empty row
            csvRows.push('SUMMARY STATISTICS');
            const totals = calculateTotals();
            csvRows.push(`Total Payments,${totals.totalPayments}`);
            csvRows.push(`Total Amount (Tk),${totals.totalAmount.toFixed(2)}`);
            csvRows.push(`Total Cash,${totals.totalCash.toFixed(2)}`);
            csvRows.push(`Total Mobile Banking,${totals.totalCard.toFixed(2)}`);
            csvRows.push(`Total Bank Transfer,${totals.totalBank.toFixed(2)}`);

            const csvString = csvRows.join('\n');
            
            // Create and download file
            const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.href = url;
            link.download = `payments_report_${formatDateForFilename()}.csv`;
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

    // Download as Excel
    const downloadExcel = () => {
        try {
            setIsDownloading(true);
            const exportData = prepareExportData();
            
            if (exportData.length === 0) {
                toast.warning('No data to export');
                return;
            }

            // Create workbook and worksheet
            const wb = XLSX.utils.book_new();
            const ws = XLSX.utils.json_to_sheet(exportData);

            // Create filter info sheet
            const filterData = [
                { 'Filter': 'Search', 'Value': filterForm.data.search || 'None' },
                { 'Filter': 'Start Date', 'Value': filterForm.data.start_date || 'None' },
                { 'Filter': 'End Date', 'Value': filterForm.data.end_date || 'None' }
            ];
            const wsFilters = XLSX.utils.json_to_sheet(filterData);

            // Add summary to a new sheet
            const totals = calculateTotals();
            const summaryData = [
                { 'Metric': 'Total Payments', 'Value': totals.totalPayments },
                { 'Metric': 'Total Amount (Tk)', 'Value': totals.totalAmount.toFixed(2) },
                { 'Metric': 'Total Cash', 'Value': totals.totalCash.toFixed(2) },
                { 'Metric': 'Total Mobile Banking', 'Value': totals.totalCard.toFixed(2) },
                { 'Metric': 'Total Bank Transfer', 'Value': totals.totalBank.toFixed(2) }
            ];
            const wsSummary = XLSX.utils.json_to_sheet(summaryData);

            // Add sheets to workbook
            XLSX.utils.book_append_sheet(wb, ws, 'Payments');
            XLSX.utils.book_append_sheet(wb, wsFilters, 'Filters Applied');
            XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');

            // Generate and download file
            XLSX.writeFile(wb, `payments_report_${formatDateForFilename()}.xlsx`);
            
            toast.success('Excel file downloaded successfully');
        } catch (error) {
            console.error('Error downloading Excel:', error);
            toast.error('Failed to download Excel file');
        } finally {
            setIsDownloading(false);
        }
    };

    // Download as PDF
    const downloadPDF = () => {
        try {
            setIsDownloading(true);
            const exportData = prepareExportData();
            
            if (exportData.length === 0) {
                toast.warning('No data to export');
                return;
            }

            // Create PDF document
            const doc = new jsPDF({
                orientation: 'landscape',
                unit: 'mm',
                format: 'a4'
            });

            // Add title
            doc.setFontSize(16);
            doc.setTextColor(30, 77, 43); // #1e4d2b color
            doc.text('Payments Report', 14, 15);
            
            // Add date
            doc.setFontSize(10);
            doc.setTextColor(100, 100, 100);
            doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 22);

            // Add filter information
            doc.setFontSize(9);
            doc.setTextColor(80, 80, 80);
            doc.text(`Search: ${filterForm.data.search || 'None'}`, 14, 29);
            doc.text(`Date Range: ${filterForm.data.start_date || 'Start'} to ${filterForm.data.end_date || 'End'}`, 14, 35);

            // Prepare table columns and rows
            const tableColumns = [
                'Reference',
                'Entity',
                'Amount',
                'Method',
                'Status',
                'Date'
            ];

            const tableRows = exportData.map(item => [
                item['Reference'].substring(0, 10) + (item['Reference'].length > 10 ? '...' : ''),
                item['Entity'].substring(0, 15) + (item['Entity'].length > 15 ? '...' : ''),
                item['Amount (Tk)'],
                item['Payment Method'],
                item['Status'],
                item['Date'].split(',')[0] // Just the date part
            ]);

            // Add table using autoTable
            autoTable(doc, {
                head: [tableColumns],
                body: tableRows,
                startY: 40,
                theme: 'grid',
                styles: { fontSize: 8, cellPadding: 2 },
                headStyles: { fillColor: [30, 77, 43], textColor: [255, 255, 255] },
                alternateRowStyles: { fillColor: [245, 245, 245] }
            });

            // Add summary statistics
            const totals = calculateTotals();
            const finalY = doc.lastAutoTable.finalY + 10;
            
            doc.setFontSize(12);
            doc.setTextColor(30, 77, 43);
            doc.text('Summary Statistics', 14, finalY);
            
            doc.setFontSize(10);
            doc.setTextColor(0, 0, 0);
            doc.text(`Total Payments: ${totals.totalPayments}`, 14, finalY + 7);
            doc.text(`Total Amount: ${totals.totalAmount.toFixed(2)} Tk`, 14, finalY + 14);
            doc.text(`Total Cash: ${totals.totalCash.toFixed(2)} Tk`, 14, finalY + 21);
            doc.text(`Total Mobile Banking: ${totals.totalCard.toFixed(2)} Tk`, 14, finalY + 28);
            doc.text(`Total Bank Transfer: ${totals.totalBank.toFixed(2)} Tk`, 14, finalY + 35);

            // Save PDF
            doc.save(`payments_report_${formatDateForFilename()}.pdf`);
            
            toast.success('PDF downloaded successfully');
        } catch (error) {
            console.error('Error downloading PDF:', error);
            toast.error('Failed to download PDF');
        } finally {
            setIsDownloading(false);
        }
    };

    const totals = calculateTotals();

    return (
        <div className={`bg-white rounded-box p-5 ${locale === 'bn' ? 'bangla-font' : ''}`}>
            <PageHeader
                title={t('payment.title', 'Transaction Ledger')}
                subtitle={t('payment.subtitle', 'Monitor financial inbound and outbound flows')}
            />

            {/* Collapsible Filter Card */}
            <div className="bg-base-100 rounded-box border border-base-content/5 mb-6 overflow-hidden">
                {/* Card Header with Toggle Button */}
                <div 
                    className="flex items-center justify-between p-4 cursor-pointer hover:bg-base-200 transition-colors"
                    onClick={toggleFilters}
                >
                    <div className="flex items-center gap-2">
                        <Filter size={18} className="text-[#1e4d2b]" />
                        <h3 className="text-lg font-semibold text-neutral">Filters</h3>
                        {hasActiveFilters() && (
                            <span className="badge badge-sm bg-[#1e4d2b] text-white ml-2">Active</span>
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
                                handleFilter();
                            }}
                            className="btn bg-[#1e4d2b] text-white btn-sm"
                        >
                            <Search size={14} />
                            Search
                        </button>
                        <button className="btn btn-ghost btn-sm">
                            {showFilters ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                        </button>
                    </div>
                </div>

                {/* Filter Content - Collapsible */}
                {showFilters && (
                    <div className="p-4 border-t border-base-content/5">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {/* Search Filter */}
                            <fieldset className="fieldset">
                                <legend className="fieldset-legend">Search</legend>
                                <div className="relative">
                                    <input
                                        type="text"
                                        className="input input-sm w-full"
                                        placeholder="Search references..."
                                        value={filterForm.data.search}
                                        onChange={(e) => filterForm.setData("search", e.target.value)}
                                        onKeyPress={handleKeyPress}
                                    />
                                    <Search className="absolute right-2 top-2 text-gray-400 pointer-events-none" size={16} />
                                </div>
                            </fieldset>

                            {/* Date From Filter */}
                            <fieldset className="fieldset">
                                <legend className="fieldset-legend">Date From</legend>
                                <div className="relative">
                                    <input
                                        type="date"
                                        className="input input-sm w-full cursor-pointer"
                                        value={formatDateForInput(filterForm.data.start_date)}
                                        onClick={openDatePicker}
                                        onChange={(e) => filterForm.setData("start_date", e.target.value)}
                                    />
                                    <Calendar className="absolute right-2 top-2 text-gray-400 pointer-events-none" size={16} />
                                </div>
                            </fieldset>

                            {/* Date To Filter */}
                            <fieldset className="fieldset">
                                <legend className="fieldset-legend">Date To</legend>
                                <div className="relative">
                                    <input
                                        type="date"
                                        className="input input-sm w-full cursor-pointer"
                                        value={formatDateForInput(filterForm.data.end_date)}
                                        onClick={openDatePicker}
                                        onChange={(e) => filterForm.setData("end_date", e.target.value)}
                                        min={formatDateForInput(filterForm.data.start_date)}
                                    />
                                    <Calendar className="absolute right-2 top-2 text-gray-400 pointer-events-none" size={16} />
                                </div>
                            </fieldset>
                        </div>

                        {/* Active Filters Display */}
                        {hasActiveFilters() && (
                            <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-gray-600">
                                <span className="font-medium">Active Filters:</span>
                                {filterForm.data.search && (
                                    <span className="badge badge-outline badge-sm">
                                        Search: {filterForm.data.search}
                                    </span>
                                )}
                                {filterForm.data.start_date && (
                                    <span className="badge badge-outline badge-sm">
                                        From: {new Date(filterForm.data.start_date).toLocaleDateString()}
                                    </span>
                                )}
                                {filterForm.data.end_date && (
                                    <span className="badge badge-outline badge-sm">
                                        To: {new Date(filterForm.data.end_date).toLocaleDateString()}
                                    </span>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Download Button */}
            <div className="flex justify-end mb-4">
                <div className="dropdown dropdown-end">
                    <button 
                        className="btn bg-green-600 text-white btn-sm"
                        disabled={isDownloading || payments.data.length === 0}
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

            {/* Industrial Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
                <div className="bg-[#1e4d2b] text-white rounded-2xl p-4 shadow-xl border-b-4 border-red-600 text-white">
                    <p className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-1">{t('payment.total_amount', 'Total Volume')}</p>
                    <p className="text-xl font-black font-mono">৳{formatCurrency(totals.totalAmount)}</p>
                </div>
                <div className="bg-white border-2 border-gray-900 rounded-2xl p-4 shadow-sm">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Cash In</p>
                    <p className="text-xl font-black text-gray-900 font-mono">৳{formatCurrency(totals.totalCash)}</p>
                </div>
                <div className="bg-white border-2 border-gray-900 rounded-2xl p-4 shadow-sm">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Card Processed</p>
                    <p className="text-xl font-black text-gray-900 font-mono">৳{formatCurrency(totals.totalCard)}</p>
                </div>
                <div className="bg-white border-2 border-gray-900 rounded-2xl p-4 shadow-sm">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Bank Trans.</p>
                    <p className="text-xl font-black text-gray-900 font-mono">৳{formatCurrency(totals.totalBank)}</p>
                </div>
                <div className="bg-gray-50 rounded-2xl p-4 border border-gray-200">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Entries</p>
                    <p className="text-2xl font-black text-gray-900">{totals.totalPayments}</p>
                </div>
            </div>

            <div className="print:hidden">
                <div className="overflow-x-auto rounded-xl border border-gray-100 shadow-sm">
                    {payments.data.length > 0 ? (
                        <table className="table w-full border-separate border-spacing-0">
                            <thead className="bg-[#1e4d2b] text-white text-white uppercase text-[10px] tracking-widest">
                                <tr>
                                    <th className="py-4">Reference</th>
                                    <th>Entity (Customer/Supplier)</th>
                                    <th>Amount</th>
                                    <th>Method</th>
                                    <th>Status</th>
                                    <th>Date/Time</th>
                                    <th>Account</th>
                                    <th className="text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="font-bold text-sm text-gray-700 italic-last-child">
                                {payments.data.map((payment) => {
                                    const methodBadge = getPaymentMethodBadge(payment.payment_method);
                                    return (
                                        <tr key={payment.id} className="hover:bg-gray-50 border-b border-gray-50 transition-colors">
                                            <td>
                                                <span className="font-mono text-xs font-black text-gray-900 tracking-tighter">
                                                    {payment.txn_ref || "#MANUAL"}
                                                </span>
                                            </td>
                                            <td>
                                                <div className="flex flex-col">
                                                    <div className="flex items-center gap-2 uppercase font-black text-gray-900">
                                                        <User size={12} className="text-red-600" />
                                                        {payment.customer?.customer_name || payment.supplier?.name || "Walk-in"}
                                                    </div>
                                                    <span className="text-[10px] text-gray-400 uppercase ml-5">
                                                        {payment.customer ? "Customer" : (payment.supplier ? "Supplier" : "Walk-in")}
                                                    </span>
                                                </div>
                                            </td>
                                            <td>
                                                <span className="font-mono font-black text-gray-900">
                                                    ৳{formatCurrency(payment.amount)}
                                                </span>
                                            </td>
                                            <td>
                                                <span className={`badge border-none font-black text-[9px] uppercase tracking-tighter py-2 px-2 rounded ${methodBadge.color}`}>
                                                    {methodBadge.label}
                                                </span>
                                            </td>
                                            <td>
                                                <span className={`badge border-none font-black text-[9px] uppercase py-2 px-2 rounded ${payment.status === 'completed' ? 'bg-green-100 text-green-700' :
                                                        payment.status === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                                                    }`}>
                                                    {getStatusLabel(payment.status)}
                                                </span>
                                            </td>
                                            <td>
                                                <div className="flex items-center gap-2 text-[10px] text-gray-400 font-black uppercase tracking-tighter">
                                                    <Calendar size={10} />
                                                    {formatDate(payment.created_at)}
                                                </div>
                                            </td>
                                            <td>
                                                {payment.account ? (
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs font-bold text-gray-700">
                                                            {payment.account.name}
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-gray-400">Cash</span>
                                                )}
                                            </td>
                                            <td className="text-right">
                                                <div className="flex justify-end gap-1">
                                                    <Link
                                                        href={route("payments.show", { payment: payment.id })}
                                                        className="btn btn-square btn-xs text-[#1E4D2B] hover:text-[#1E4D2B]"
                                                    >
                                                        <Eye size={14} />
                                                    </Link>
                                                    {payment.sale && (
                                                        <Link
                                                            href={route("sales.show", { sale: payment.sale.id })}
                                                            className="btn btn-ghost btn-square btn-xs hover:bg-red-600 hover:text-[white] text-red-600"
                                                        >
                                                            <Receipt size={14} />
                                                        </Link>
                                                    )}
                                                    {payment.purchase && (
                                                        <Link
                                                            href={route("purchase.show", { id: payment.purchase.id })}
                                                            className="btn btn-ghost btn-square btn-xs hover:bg-red-600 hover:text-white text-red-600"
                                                        >
                                                            <Receipt size={14} />
                                                        </Link>
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
                            <span className="font-black uppercase tracking-widest text-xs">No transactions found</span>
                        </div>
                    )}
                </div>
                {payments.data.length > 0 && <Pagination data={payments} />}
            </div>
        </div>
    );
}