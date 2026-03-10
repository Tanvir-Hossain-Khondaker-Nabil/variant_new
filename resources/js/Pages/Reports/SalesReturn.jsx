import PageHeader from "../../components/PageHeader";
import { router } from "@inertiajs/react";
import React from "react";
import {
    Search,
    Filter,
    Calendar,
    Trash2,
    RefreshCw,
    DollarSign,
    Package,
    CheckCircle,
    XCircle,
    Clock,
    ChevronDown,
    ChevronUp,
    User,
    FileText,
    Download
} from "lucide-react";
import { useState, useEffect } from "react";
import { useTranslation } from "../../hooks/useTranslation";
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { toast } from "react-toastify";
import axios from 'axios';

export default function SalesReturn({
    salesReturns,
    filters = {},
    isShadowUser = false
}) {
    const { t, locale } = useTranslation();
    const [showFilters, setShowFilters] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const [search, setSearch] = useState(filters.search || '');
    const [statusFilter, setStatusFilter] = useState(filters.status || '');
    const [typeFilter, setTypeFilter] = useState(filters.type || '');
    const [fromDate, setFromDate] = useState(filters.from_date || '');
    const [toDate, setToDate] = useState(filters.to_date || '');
    const [expandedRows, setExpandedRows] = useState([]);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [selectedReturn, setSelectedReturn] = useState(null);

    const statusOptions = [
        { value: '', label: t('sales_return.all_statuses', 'All Statuses') },
        { value: 'pending', label: t('sales_return.pending', 'Pending') },
        { value: 'approved', label: t('sales_return.approved', 'Approved') },
        { value: 'completed', label: t('sales_return.completed', 'Completed') },
        { value: 'cancelled', label: t('sales_return.cancelled', 'Cancelled') }
    ];

    const typeOptions = [
        { value: '', label: t('sales_return.all_types', 'All Types') },
        { value: 'sales_return', label: t('sales_return.return', 'Return') },
        { value: 'damaged', label: t('sales_return.damage', 'Damage') }
    ];

    const formatCurrency = (value) => {
        return new Intl.NumberFormat('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(Number(value) || 0);
    };

    const formatDate = (dateString) => {
        if (!dateString) return '';
        return new Date(dateString).toLocaleDateString('en-GB');
    };

    // Format date for filename
    const formatDateForFilename = () => {
        const now = new Date();
        return now.toISOString().split('T')[0] + '_' + 
               now.getHours() + '-' + 
               now.getMinutes() + '-' + 
               now.getSeconds();
    };

    const getStatusBadge = (status) => {
        const badges = {
            pending: <span className="badge badge-warning badge-sm gap-1"><Clock size={10} /> {t('sales_return.pending', 'Pending')}</span>,
            approved: <span className="badge badge-info badge-sm gap-1"><CheckCircle size={10} /> {t('sales_return.approved', 'Approved')}</span>,
            completed: <span className="badge badge-success badge-sm gap-1"><CheckCircle size={10} /> {t('sales_return.completed', 'Completed')}</span>,
            cancelled: <span className="badge badge-error badge-sm gap-1"><XCircle size={10} /> {t('sales_return.cancelled', 'Cancelled')}</span>
        };
        return badges[status] || <span className="badge badge-sm">{status}</span>;
    };

    // Toggle filter section
    const toggleFilters = () => {
        setShowFilters(!showFilters);
    };

    // Check if any filter is active
    const hasActiveFilters = () => {
        return search || statusFilter || typeFilter || fromDate || toDate;
    };

    const applyFilters = () => {
        router.get(route('reports.sales-return'), {
            search,
            status: statusFilter,
            type: typeFilter,
            from_date: fromDate,
            to_date: toDate
        }, { preserveState: true, replace: true });
    };

    const resetFilters = () => {
        setSearch('');
        setStatusFilter('');
        setTypeFilter('');
        setFromDate('');
        setToDate('');
        router.get(route('reports.sales-return'), {});
    };

    const toggleRowExpand = (id) => {
        setExpandedRows(prev => prev.includes(id) ? prev.filter(rowId => rowId !== id) : [...prev, id]);
    };

    const handleDelete = (item) => {
        if (confirm(t('sales_return.confirm_delete', 'Are you sure you want to delete this record?'))) {
            router.delete(route('sales-return.destroy', item.id));
        }
    };

    // Fetch all sales returns for export
    const fetchAllSalesReturnsForExport = async () => {
        try {
            const response = await axios.get(route('reports.sales-return.export'), {
                params: {
                    search,
                    status: statusFilter,
                    type: typeFilter,
                    from_date: fromDate,
                    to_date: toDate
                }
            });
            return response.data.salesReturns;
        } catch (error) {
            console.error('Error fetching all sales returns:', error);
            toast.error('Failed to fetch all sales returns data');
            throw error;
        }
    };

    // Prepare data for export
    const prepareExportData = (itemsData) => {
        return itemsData.map(item => ({
            'Customer Name': item.customer?.customer_name || 'Walk-in Customer',
            'Customer Phone': item.customer?.phone || item.sale?.customer?.phone || 'N/A',
            'Sale Invoice': item.sale?.invoice_no || 'N/A',
            'Refund Amount (Tk)': formatCurrency(item.refunded_amount),
            'Type': item.type ? (item.type === 'damage' ? 'Damage' : 'Return') : 'N/A',
            'Return Type': item.return_type ? item.return_type.replace('_', ' ') : 'N/A',
            'Status': item.status || 'N/A',
            'Date': formatDate(item.created_at),
            'Reason': item.reason || 'N/A',
            'Notes': item.notes || 'N/A'
        }));
    };

    // Calculate summary statistics
    const calculateSummaryStats = (itemsData) => {
        const stats = itemsData.reduce((acc, item) => {
            acc.totalReturns += 1;
            acc.totalRefundAmount += parseFloat(item.refunded_amount) || 0;
            
            if (item.type === 'damage') {
                acc.totalDamage += 1;
                acc.damageAmount += parseFloat(item.refunded_amount) || 0;
            } else {
                acc.totalSalesReturns += 1;
                acc.salesReturnAmount += parseFloat(item.refunded_amount) || 0;
            }
            
            return acc;
        }, {
            totalReturns: 0,
            totalRefundAmount: 0,
            totalDamage: 0,
            damageAmount: 0,
            totalSalesReturns: 0,
            salesReturnAmount: 0
        });

        return stats;
    };

    // Download as CSV
    const downloadCSV = async () => {
        try {
            setIsDownloading(true);
            
            // Fetch all sales returns
            const allItems = await fetchAllSalesReturnsForExport();
            
            if (allItems.length === 0) {
                toast.warning('No data to export');
                return;
            }

            const exportData = prepareExportData(allItems);

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
            csvRows.push(`Search,${search || 'None'}`);
            csvRows.push(`Status,${statusFilter || 'All'}`);
            csvRows.push(`Type,${typeFilter || 'All'}`);
            csvRows.push(`Date From,${fromDate || 'None'}`);
            csvRows.push(`Date To,${toDate || 'None'}`);

            // Add summary section
            csvRows.push(''); // Empty row
            csvRows.push('SUMMARY STATISTICS');
            const stats = calculateSummaryStats(allItems);
            csvRows.push(`Total Returns,${stats.totalReturns}`);
            csvRows.push(`Total Refund Amount (Tk),${stats.totalRefundAmount.toFixed(2)}`);
            csvRows.push(`Total Sales Returns,${stats.totalSalesReturns}`);
            csvRows.push(`Sales Return Amount (Tk),${stats.salesReturnAmount.toFixed(2)}`);
            csvRows.push(`Total Damages,${stats.totalDamage}`);
            csvRows.push(`Damage Amount (Tk),${stats.damageAmount.toFixed(2)}`);

            const csvString = csvRows.join('\n');
            
            // Create and download file
            const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.href = url;
            link.download = `sales_returns_report_${formatDateForFilename()}.csv`;
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
    const downloadExcel = async () => {
        try {
            setIsDownloading(true);
            
            // Fetch all sales returns
            const allItems = await fetchAllSalesReturnsForExport();
            
            if (allItems.length === 0) {
                toast.warning('No data to export');
                return;
            }

            const exportData = prepareExportData(allItems);

            // Create workbook and worksheet
            const wb = XLSX.utils.book_new();
            const ws = XLSX.utils.json_to_sheet(exportData);

            // Create filter info sheet
            const filterData = [
                { 'Filter': 'Search', 'Value': search || 'None' },
                { 'Filter': 'Status', 'Value': statusFilter || 'All' },
                { 'Filter': 'Type', 'Value': typeFilter || 'All' },
                { 'Filter': 'Date From', 'Value': fromDate || 'None' },
                { 'Filter': 'Date To', 'Value': toDate || 'None' }
            ];
            const wsFilters = XLSX.utils.json_to_sheet(filterData);

            // Add summary to a new sheet
            const stats = calculateSummaryStats(allItems);
            const summaryData = [
                { 'Metric': 'Total Returns', 'Value': stats.totalReturns },
                { 'Metric': 'Total Refund Amount (Tk)', 'Value': stats.totalRefundAmount.toFixed(2) },
                { 'Metric': 'Total Sales Returns', 'Value': stats.totalSalesReturns },
                { 'Metric': 'Sales Return Amount (Tk)', 'Value': stats.salesReturnAmount.toFixed(2) },
                { 'Metric': 'Total Damages', 'Value': stats.totalDamage },
                { 'Metric': 'Damage Amount (Tk)', 'Value': stats.damageAmount.toFixed(2) }
            ];
            const wsSummary = XLSX.utils.json_to_sheet(summaryData);

            // Add sheets to workbook
            XLSX.utils.book_append_sheet(wb, ws, 'Sales Returns');
            XLSX.utils.book_append_sheet(wb, wsFilters, 'Filters Applied');
            XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');

            // Generate and download file
            XLSX.writeFile(wb, `sales_returns_report_${formatDateForFilename()}.xlsx`);
            
            toast.success('Excel file downloaded successfully');
        } catch (error) {
            console.error('Error downloading Excel:', error);
            toast.error('Failed to download Excel file');
        } finally {
            setIsDownloading(false);
        }
    };

    // Download as PDF
    const downloadPDF = async () => {
        try {
            setIsDownloading(true);
            
            // Fetch all sales returns
            const allItems = await fetchAllSalesReturnsForExport();
            
            if (allItems.length === 0) {
                toast.warning('No data to export');
                return;
            }

            const exportData = prepareExportData(allItems);

            // Create PDF document
            const doc = new jsPDF({
                orientation: 'landscape',
                unit: 'mm',
                format: 'a4'
            });

            // Add title
            doc.setFontSize(16);
            doc.setTextColor(30, 77, 43); // #1e4d2b color
            doc.text('Sales Returns & Damages Report', 14, 15);
            
            // Add date
            doc.setFontSize(10);
            doc.setTextColor(100, 100, 100);
            doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 22);

            // Add filter information
            doc.setFontSize(9);
            doc.setTextColor(80, 80, 80);
            doc.text(`Search: ${search || 'None'} | Status: ${statusFilter || 'All'} | Type: ${typeFilter || 'All'}`, 14, 29);
            doc.text(`Date Range: ${fromDate || 'Start'} to ${toDate || 'End'}`, 14, 35);

            // Prepare table columns and rows
            const tableColumns = [
                'Customer',
                'Invoice',
                'Amount',
                'Type',
                'Return Type',
                'Status',
                'Date'
            ];

            const tableRows = exportData.map(item => [
                item['Customer Name'].substring(0, 20) + (item['Customer Name'].length > 20 ? '...' : ''),
                item['Sale Invoice'],
                item['Refund Amount (Tk)'],
                item['Type'],
                item['Return Type'],
                item['Status'],
                item['Date']
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
            const stats = calculateSummaryStats(allItems);
            const finalY = doc.lastAutoTable.finalY + 10;
            
            doc.setFontSize(12);
            doc.setTextColor(30, 77, 43);
            doc.text('Summary Statistics', 14, finalY);
            
            doc.setFontSize(10);
            doc.setTextColor(0, 0, 0);
            doc.text(`Total Returns: ${stats.totalReturns}`, 14, finalY + 7);
            doc.text(`Total Refund Amount: ${stats.totalRefundAmount.toFixed(2)} Tk`, 14, finalY + 14);
            doc.text(`Sales Returns: ${stats.totalSalesReturns} (${stats.salesReturnAmount.toFixed(2)} Tk)`, 14, finalY + 21);
            doc.text(`Damages: ${stats.totalDamage} (${stats.damageAmount.toFixed(2)} Tk)`, 14, finalY + 28);

            // Save PDF
            doc.save(`sales_returns_report_${formatDateForFilename()}.pdf`);
            
            toast.success('PDF downloaded successfully');
        } catch (error) {
            console.error('Error downloading PDF:', error);
            toast.error('Failed to download PDF');
        } finally {
            setIsDownloading(false);
        }
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            if ((fromDate && toDate) || (!fromDate && !toDate)) {
                applyFilters();
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [search, statusFilter, typeFilter, fromDate, toDate]);

    return (
        <div className={`space-y-6 ${locale === 'bn' ? 'bangla-font' : ''}`}>
            <PageHeader
                title={t('sales_return.list_title', 'Sales Returns & Damages')}
                subtitle={t('sales_return.list_subtitle', 'Manage customer returns and damaged stock')}
            >
            </PageHeader>

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
                                resetFilters();
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
                        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                            <div className="form-control w-full">
                                <label className="label py-1"><span className="label-text text-xs font-semibold">{t('sales_return.search', 'Search')}</span></label>
                                <div className="relative">
                                    <Search className="absolute left-3 top-2.5 text-base-content/40" size={16} />
                                    <input
                                        type="text"
                                        placeholder={t('sales_return.search_placeholder', 'Search customer or invoice...')}
                                        className="input input-sm input-bordered w-full pl-8"
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="form-control w-full">
                                <label className="label py-1"><span className="label-text text-xs font-semibold">{t('sales_return.status', 'Status')}</span></label>
                                <select className="select select-sm select-bordered" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                                    {statusOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                                </select>
                            </div>

                            <div className="form-control w-full">
                                <label className="label py-1"><span className="label-text text-xs font-semibold">{t('sales_return.type', 'Return Type')}</span></label>
                                <select className="select select-sm select-bordered" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
                                    {typeOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                                </select>
                            </div>

                            <div className="form-control w-full">
                                <label className="label py-1"><span className="label-text text-xs font-semibold">{t('sales_return.from_date', 'From Date')}</span></label>
                                <div className="relative">
                                    <Calendar className="absolute left-3 top-2.5 text-base-content/40" size={14} />
                                    <input
                                        type="date"
                                        className="input input-sm input-bordered w-full pl-8"
                                        value={fromDate}
                                        onChange={(e) => setFromDate(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="form-control w-full">
                                <label className="label py-1"><span className="label-text text-xs font-semibold">{t('sales_return.to_date', 'To Date')}</span></label>
                                <div className="relative">
                                    <Calendar className="absolute left-3 top-2.5 text-base-content/40" size={14} />
                                    <input
                                        type="date"
                                        className="input input-sm input-bordered w-full pl-8"
                                        value={toDate}
                                        onChange={(e) => setToDate(e.target.value)}
                                        min={fromDate}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Active Filters Display */}
                        {hasActiveFilters() && (
                            <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-gray-600">
                                <span className="font-medium">Active Filters:</span>
                                {search && (
                                    <span className="badge badge-outline badge-sm">
                                        Search: "{search}"
                                    </span>
                                )}
                                {statusFilter && (
                                    <span className="badge badge-outline badge-sm">
                                        Status: {statusOptions.find(opt => opt.value === statusFilter)?.label}
                                    </span>
                                )}
                                {typeFilter && (
                                    <span className="badge badge-outline badge-sm">
                                        Type: {typeOptions.find(opt => opt.value === typeFilter)?.label}
                                    </span>
                                )}
                                {fromDate && (
                                    <span className="badge badge-outline badge-sm">
                                        From: {new Date(fromDate).toLocaleDateString()}
                                    </span>
                                )}
                                {toDate && (
                                    <span className="badge badge-outline badge-sm">
                                        To: {new Date(toDate).toLocaleDateString()}
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
                        disabled={isDownloading || (salesReturns.data && salesReturns.data.length === 0)}
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

            {/* Table */}
            <div className="overflow-x-auto bg-white rounded-box border border-base-200 shadow-sm">
                <table className="table table-zebra">
                    <thead className="bg-base-50">
                        <tr>
                            <th>{t('sales_return.customer', 'Customer')}</th>
                            <th>{t('sales_return.invoice', 'Sale Invoice')}</th>
                            <th>{t('sales_return.amount', 'Refund Amount')}</th>
                            <th>{t('sales_return.type', 'Type')}</th>
                            <th>{t('sales_return.return_type', 'Return Type')}</th>
                            <th>{t('sales_return.status', 'Status')}</th>
                            <th>{t('sales_return.date', 'Date')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {salesReturns.data && salesReturns.data.length > 0 ? (
                            salesReturns.data.map((item) => (
                                <React.Fragment key={item.id}>
                                    <tr>
                                        <td>
                                            <div className="flex items-center gap-2">
                                                <div className="p-2 bg-base-200 rounded-lg"><User size={14} /></div>
                                                <div>
                                                    <div className="font-bold">{item.customer?.customer_name || 'Walk-in Customer'}</div>
                                                    <div className="text-xs opacity-50">
                                                        {item.customer?.phone || item.sale?.customer?.phone || ''}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <div className="flex items-center gap-1 text-primary font-medium">
                                                <FileText size={14} />
                                                {item.sale?.invoice_no || 'N/A'}
                                            </div>
                                        </td>
                                        <td>
                                            <div className="font-semibold text-error">
                                                ৳{formatCurrency(item.refunded_amount)}
                                            </div>
                                        </td>
                                        <td>
                                            <span className={`badge badge-sm p-4 rounded ${item.type == 'damage' ? 'badge-error' : 'badge-info'}`}>
                                                {item.type ? t(`sales_return.${item.type}`, item.type) : 'N/A'}
                                            </span>
                                        </td>
                                        <td>
                                            <span className={`badge badge-sm p-4 rounded ${item.return_type == 'product_replacement' ? 'badge-warning' : 'badge-ghost'}`}>
                                                {item.return_type ? item.return_type.replace('_', ' ') : 'N/A'}
                                            </span>
                                        </td>
                                        <td>{getStatusBadge(item.status)}</td>
                                        <td>
                                            <div className="text-xs opacity-70">{formatDate(item.created_at)}</div>
                                        </td>
                                    </tr>
                                </React.Fragment>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="9" className="text-center py-8">
                                    <div className="flex flex-col items-center justify-center">
                                        <Package size={48} className="text-gray-300 mb-2" />
                                        <p className="text-gray-500">{t('sales_return.no_records', 'No sales returns found')}</p>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            {salesReturns.data && salesReturns.data.length > 0 && (
                <div className="flex justify-between items-center px-4">
                    <span className="text-sm opacity-50">
                        {t('sales_return.showing_results', 'Showing {from} to {to} of {total} returns', {
                            from: salesReturns.from || 0,
                            to: salesReturns.to || 0,
                            total: salesReturns.total || 0
                        })}
                    </span>

                    {/* Pagination Links */}
                    {salesReturns.links && salesReturns.links.length > 3 && (
                        <div className="join">
                            {salesReturns.links.map((link, index) => (
                                <button
                                    key={index}
                                    onClick={() => {
                                        if (link.url) {
                                            router.get(link.url, {}, { preserveState: true });
                                        }
                                    }}
                                    className={`join-item btn btn-sm ${link.active ? 'btn-active' : ''} ${!link.url ? 'btn-disabled' : ''}`}
                                    dangerouslySetInnerHTML={{ __html: link.label }}
                                />
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}