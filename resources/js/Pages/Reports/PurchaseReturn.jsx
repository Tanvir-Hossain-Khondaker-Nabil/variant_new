import { useState, useEffect } from 'react';
import { Head, router, Link } from '@inertiajs/react';
import PageHeader from '@/Components/PageHeader';
import {
    Search,
    Filter,
    Calendar,
    Eye,
    Trash2,
    RefreshCw,
    DollarSign,
    Package,
    AlertCircle,
    CheckCircle,
    XCircle,
    Clock,
    Download,
    Printer,
    MoreVertical,
    ChevronDown,
    ChevronUp,
    Plus,
    FileText,
    ArrowLeft,
    User,
    Hash,
    Building,
    Warehouse as WarehouseIcon,
} from 'lucide-react';
import { toast } from "react-toastify";
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import axios from 'axios';

export default function Index({ returns, filters, summary, isShadowUser }) {
    const [showFilters, setShowFilters] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const [search, setSearch] = useState(filters.search || '');
    const [status, setStatus] = useState(filters.status || '');
    const [returnType, setReturnType] = useState(filters.return_type || '');
    const [dateFrom, setDateFrom] = useState(filters.date_from || '');
    const [dateTo, setDateTo] = useState(filters.date_to || '');
    const [expandedRows, setExpandedRows] = useState([]);
    const [selectedReturn, setSelectedReturn] = useState(null);
    const [showDeleteModal, setShowDeleteModal] = useState(false);

    // Format date for filename
    const formatDateForFilename = () => {
        const now = new Date();
        return now.toISOString().split('T')[0] + '_' +
            now.getHours() + '-' +
            now.getMinutes() + '-' +
            now.getSeconds();
    };

    // Check if any filter is active
    const hasActiveFilters = () => {
        return search || status || returnType || dateFrom || dateTo;
    };

    // Toggle filter section
    const toggleFilters = () => {
        setShowFilters(!showFilters);
    };

    const applyFilters = () => {
        const params = {};
        if (search) params.search = search;
        if (status) params.status = status;
        if (returnType) params.return_type = returnType;
        if (dateFrom) params.date_from = dateFrom;
        if (dateTo) params.date_to = dateTo;

        router.get(route('reports.purchase-return'), params, {
            preserveState: true,
            replace: true,
        });
    };

    const resetFilters = () => {
        setSearch('');
        setStatus('');
        setReturnType('');
        setDateFrom('');
        setDateTo('');
        router.get(route('reports.purchase-return'), {}, {
            preserveState: true,
            replace: true,
        });
    };

    // Fetch all purchase returns for export
    const fetchAllPurchaseReturnsForExport = async () => {
        try {
            const response = await axios.get(route('reports.purchase-return.export'), {
                params: {
                    search,
                    status,
                    return_type: returnType,
                    date_from: dateFrom,
                    date_to: dateTo
                }
            });
            return response.data.purchaseReturns;
        } catch (error) {
            console.error('Error fetching all purchase returns:', error);
            toast.error('Failed to fetch all purchase returns data');
            throw error;
        }
    };

    // Prepare data for export
    const prepareExportData = (itemsData) => {
        return itemsData.map(item => ({
            'Return No': item.return_no,
            'Purchase No': item.purchase?.purchase_no || 'N/A',
            'Supplier Name': item.supplier?.name || 'N/A',
            'Supplier Company': item.supplier?.company || 'N/A',
            'Return Type': item.return_type === 'money_back' ? 'Money Back' : 'Product Replacement',
            'Total Return Amount (Tk)': formatCurrency(item.total_return_amount),
            'Refunded Amount (Tk)': formatCurrency(item.refunded_amount),
            'Replacement Total (Tk)': item.replacement_total ? formatCurrency(item.replacement_total) : '0.00',
            'Status': item.status || 'N/A',
            'Return Date': formatDate(item.return_date),
            'Created Date': formatDate(item.created_at),
            'Warehouse': item.warehouse?.name || 'N/A',
            'Reason': item.reason || 'N/A',
            'Notes': item.notes || 'N/A',
            'Payment Type': item.payment_type || 'N/A',
            'Created By': item.creator?.name || 'System'
        }));
    };

    // Calculate summary statistics
    const calculateSummaryStats = (itemsData) => {
        const stats = itemsData.reduce((acc, item) => {
            acc.totalReturns += 1;
            acc.totalReturnAmount += parseFloat(item.total_return_amount) || 0;
            acc.totalRefundedAmount += parseFloat(item.refunded_amount) || 0;

            if (item.status === 'pending') {
                acc.pendingCount += 1;
                acc.pendingAmount += parseFloat(item.total_return_amount) || 0;
            } else if (item.status === 'approved') {
                acc.approvedCount += 1;
                acc.approvedAmount += parseFloat(item.total_return_amount) || 0;
            } else if (item.status === 'completed') {
                acc.completedCount += 1;
                acc.completedAmount += parseFloat(item.total_return_amount) || 0;
            } else if (item.status === 'cancelled') {
                acc.cancelledCount += 1;
                acc.cancelledAmount += parseFloat(item.total_return_amount) || 0;
            }

            if (item.return_type === 'money_back') {
                acc.moneyBackCount += 1;
                acc.moneyBackAmount += parseFloat(item.total_return_amount) || 0;
            } else {
                acc.replacementCount += 1;
                acc.replacementAmount += parseFloat(item.total_return_amount) || 0;
            }

            return acc;
        }, {
            totalReturns: 0,
            totalReturnAmount: 0,
            totalRefundedAmount: 0,
            pendingCount: 0,
            pendingAmount: 0,
            approvedCount: 0,
            approvedAmount: 0,
            completedCount: 0,
            completedAmount: 0,
            cancelledCount: 0,
            cancelledAmount: 0,
            moneyBackCount: 0,
            moneyBackAmount: 0,
            replacementCount: 0,
            replacementAmount: 0
        });

        return stats;
    };

    // Download as CSV
    const downloadCSV = async () => {
        try {
            setIsDownloading(true);

            // Fetch all purchase returns
            const allItems = await fetchAllPurchaseReturnsForExport();

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
            csvRows.push(`Status,${status || 'All'}`);
            csvRows.push(`Return Type,${returnType || 'All'}`);
            csvRows.push(`Date From,${dateFrom || 'None'}`);
            csvRows.push(`Date To,${dateTo || 'None'}`);

            // Add summary section
            csvRows.push(''); // Empty row
            csvRows.push('SUMMARY STATISTICS');
            const stats = calculateSummaryStats(allItems);
            csvRows.push(`Total Returns,${stats.totalReturns}`);
            csvRows.push(`Total Return Amount (Tk),${stats.totalReturnAmount.toFixed(2)}`);
            csvRows.push(`Total Refunded Amount (Tk),${stats.totalRefundedAmount.toFixed(2)}`);
            csvRows.push(`Pending Returns,${stats.pendingCount} (${stats.pendingAmount.toFixed(2)} Tk)`);
            csvRows.push(`Approved Returns,${stats.approvedCount} (${stats.approvedAmount.toFixed(2)} Tk)`);
            csvRows.push(`Completed Returns,${stats.completedCount} (${stats.completedAmount.toFixed(2)} Tk)`);
            csvRows.push(`Cancelled Returns,${stats.cancelledCount} (${stats.cancelledAmount.toFixed(2)} Tk)`);
            csvRows.push(`Money Back Returns,${stats.moneyBackCount} (${stats.moneyBackAmount.toFixed(2)} Tk)`);
            csvRows.push(`Replacement Returns,${stats.replacementCount} (${stats.replacementAmount.toFixed(2)} Tk)`);

            const csvString = csvRows.join('\n');

            // Create and download file
            const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.href = url;
            link.download = `purchase_returns_report_${formatDateForFilename()}.csv`;
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

            // Fetch all purchase returns
            const allItems = await fetchAllPurchaseReturnsForExport();

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
                { 'Filter': 'Status', 'Value': status || 'All' },
                { 'Filter': 'Return Type', 'Value': returnType || 'All' },
                { 'Filter': 'Date From', 'Value': dateFrom || 'None' },
                { 'Filter': 'Date To', 'Value': dateTo || 'None' }
            ];
            const wsFilters = XLSX.utils.json_to_sheet(filterData);

            // Add summary to a new sheet
            const stats = calculateSummaryStats(allItems);
            const summaryData = [
                { 'Metric': 'Total Returns', 'Value': stats.totalReturns },
                { 'Metric': 'Total Return Amount (Tk)', 'Value': stats.totalReturnAmount.toFixed(2) },
                { 'Metric': 'Total Refunded Amount (Tk)', 'Value': stats.totalRefundedAmount.toFixed(2) },
                { 'Metric': 'Pending Returns', 'Value': `${stats.pendingCount} (${stats.pendingAmount.toFixed(2)} Tk)` },
                { 'Metric': 'Approved Returns', 'Value': `${stats.approvedCount} (${stats.approvedAmount.toFixed(2)} Tk)` },
                { 'Metric': 'Completed Returns', 'Value': `${stats.completedCount} (${stats.completedAmount.toFixed(2)} Tk)` },
                { 'Metric': 'Cancelled Returns', 'Value': `${stats.cancelledCount} (${stats.cancelledAmount.toFixed(2)} Tk)` },
                { 'Metric': 'Money Back Returns', 'Value': `${stats.moneyBackCount} (${stats.moneyBackAmount.toFixed(2)} Tk)` },
                { 'Metric': 'Replacement Returns', 'Value': `${stats.replacementCount} (${stats.replacementAmount.toFixed(2)} Tk)` }
            ];
            const wsSummary = XLSX.utils.json_to_sheet(summaryData);

            // Add sheets to workbook
            XLSX.utils.book_append_sheet(wb, ws, 'Purchase Returns');
            XLSX.utils.book_append_sheet(wb, wsFilters, 'Filters Applied');
            XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');

            // Generate and download file
            XLSX.writeFile(wb, `purchase_returns_report_${formatDateForFilename()}.xlsx`);

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

            // Fetch all purchase returns
            const allItems = await fetchAllPurchaseReturnsForExport();

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
            doc.text('Purchase Returns Report', 14, 15);

            // Add date
            doc.setFontSize(10);
            doc.setTextColor(100, 100, 100);
            doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 22);

            // Add filter information
            doc.setFontSize(9);
            doc.setTextColor(80, 80, 80);
            doc.text(`Search: ${search || 'None'} | Status: ${status || 'All'} | Type: ${returnType || 'All'}`, 14, 29);
            doc.text(`Date Range: ${dateFrom || 'Start'} to ${dateTo || 'End'}`, 14, 35);

            // Prepare table columns and rows
            const tableColumns = [
                'Return No',
                'Supplier',
                'Type',
                'Amount',
                'Status',
                'Date'
            ];

            const tableRows = exportData.map(item => [
                item['Return No'].substring(0, 10) + (item['Return No'].length > 10 ? '...' : ''),
                item['Supplier Name'].substring(0, 15) + (item['Supplier Name'].length > 15 ? '...' : ''),
                item['Return Type'],
                item['Total Return Amount (Tk)'],
                item['Status'],
                item['Return Date']
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
            doc.text(`Total Return Amount: ${stats.totalReturnAmount.toFixed(2)} Tk`, 14, finalY + 14);
            doc.text(`Total Refunded: ${stats.totalRefundedAmount.toFixed(2)} Tk`, 14, finalY + 21);
            doc.text(`Pending: ${stats.pendingCount} (${stats.pendingAmount.toFixed(2)} Tk)`, 14, finalY + 28);
            doc.text(`Approved: ${stats.approvedCount} (${stats.approvedAmount.toFixed(2)} Tk)`, 14, finalY + 35);
            doc.text(`Completed: ${stats.completedCount} (${stats.completedAmount.toFixed(2)} Tk)`, 14, finalY + 42);
            doc.text(`Money Back: ${stats.moneyBackCount} (${stats.moneyBackAmount.toFixed(2)} Tk)`, 14, finalY + 49);
            doc.text(`Replacement: ${stats.replacementCount} (${stats.replacementAmount.toFixed(2)} Tk)`, 14, finalY + 56);

            // Save PDF
            doc.save(`purchase_returns_report_${formatDateForFilename()}.pdf`);

            toast.success('PDF downloaded successfully');
        } catch (error) {
            console.error('Error downloading PDF:', error);
            toast.error('Failed to download PDF');
        } finally {
            setIsDownloading(false);
        }
    };

    const formatCurrency = (value) => {
        const num = Number(value) || 0;
        return new Intl.NumberFormat('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(num);
    };

    const formatDate = (dateString) => {
        if (!dateString) return '';
        return new Date(dateString).toLocaleDateString('en-GB');
    };

    const getStatusBadge = (status) => {
        const badges = {
            pending: <span className="badge badge-warning">Pending</span>,
            approved: <span className="badge badge-info">Approved</span>,
            completed: <span className="badge badge-success">Completed</span>,
            cancelled: <span className="badge badge-error">Cancelled</span>,
        };
        return badges[status] || <span className="badge">{status}</span>;
    };

    const getTypeBadge = (type) => {
        if (type === 'money_back') {
            return <span className="badge badge-primary">Money Back</span>;
        } else if (type === 'product_replacement') {
            return <span className="badge badge-warning">Replacement</span>;
        }
        return <span className="badge">{type}</span>;
    };

    const handleApprove = (id) => {
        if (!confirm('Are you sure you want to approve this return?')) return;

        router.post(route('purchase-returns.approve', id), {}, {
            preserveScroll: true,
            onSuccess: () => router.reload(),
        });
    };

    const handleComplete = (id) => {
        if (!confirm('Are you sure you want to complete this return?')) return;

        router.post(route('purchase-returns.complete', id), {}, {
            preserveScroll: true,
            onSuccess: () => router.reload(),
        });
    };

    const handleDelete = (returnItem) => {
        setSelectedReturn(returnItem);
        setShowDeleteModal(true);
    };

    const confirmDelete = () => {
        if (!selectedReturn) return;

        router.delete(route('purchase-returns.destroy', selectedReturn.id), {
            preserveScroll: true,
            onSuccess: () => {
                setShowDeleteModal(false);
                setSelectedReturn(null);
            },
        });
    };

    const toggleRowExpand = (id) => {
        setExpandedRows(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    // Auto-apply search after delay
    useEffect(() => {
        const timer = setTimeout(applyFilters, 500);
        return () => clearTimeout(timer);
    }, [search]);

    // Apply other filters immediately
    useEffect(() => {
        applyFilters();
    }, [status, returnType, dateFrom, dateTo]);

    return (
        <div>
            <div className="py-6">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
                    <PageHeader
                        title="Purchase Returns"
                        subtitle="Manage and track purchase returns"
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
                                    <div className="form-control">
                                        <label className="label py-1">
                                            <span className="label-text">Search</span>
                                        </label>
                                        <div className="relative">
                                            <input
                                                type="text"
                                                className="input input-sm input-bordered w-full pl-8"
                                                placeholder="Search by return no, supplier..."
                                                value={search}
                                                onChange={(e) => setSearch(e.target.value)}
                                            />
                                            <Search size={14} className="absolute left-2 top-2.5 text-gray-400" />
                                        </div>
                                    </div>

                                    <div className="form-control">
                                        <label className="label py-1">
                                            <span className="label-text">Status</span>
                                        </label>
                                        <select
                                            className="select select-sm select-bordered w-full"
                                            value={status}
                                            onChange={(e) => setStatus(e.target.value)}
                                        >
                                            <option value="">All Status</option>
                                            <option value="pending">Pending</option>
                                            <option value="approved">Approved</option>
                                            <option value="completed">Completed</option>
                                            <option value="cancelled">Cancelled</option>
                                        </select>
                                    </div>

                                    <div className="form-control">
                                        <label className="label py-1">
                                            <span className="label-text">Type</span>
                                        </label>
                                        <select
                                            className="select select-sm select-bordered w-full"
                                            value={returnType}
                                            onChange={(e) => setReturnType(e.target.value)}
                                        >
                                            <option value="">All Types</option>
                                            <option value="money_back">Money Back</option>
                                            <option value="product_replacement">Product Replacement</option>
                                        </select>
                                    </div>

                                    <div className="form-control">
                                        <label className="label py-1">
                                            <span className="label-text">Date From</span>
                                        </label>
                                        <div className="relative">
                                            <input
                                                type="date"
                                                className="input input-sm input-bordered w-full pl-8"
                                                value={dateFrom}
                                                onChange={(e) => setDateFrom(e.target.value)}
                                            />
                                            <Calendar size={14} className="absolute left-2 top-2.5 text-gray-400" />
                                        </div>
                                    </div>

                                    <div className="form-control">
                                        <label className="label py-1">
                                            <span className="label-text">Date To</span>
                                        </label>
                                        <div className="relative">
                                            <input
                                                type="date"
                                                className="input input-sm input-bordered w-full pl-8"
                                                value={dateTo}
                                                onChange={(e) => setDateTo(e.target.value)}
                                                min={dateFrom}
                                            />
                                            <Calendar size={14} className="absolute left-2 top-2.5 text-gray-400" />
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
                                        {status && (
                                            <span className="badge badge-outline badge-sm">
                                                Status: {status}
                                            </span>
                                        )}
                                        {returnType && (
                                            <span className="badge badge-outline badge-sm">
                                                Type: {returnType === 'money_back' ? 'Money Back' : 'Replacement'}
                                            </span>
                                        )}
                                        {dateFrom && (
                                            <span className="badge badge-outline badge-sm">
                                                From: {new Date(dateFrom).toLocaleDateString()}
                                            </span>
                                        )}
                                        {dateTo && (
                                            <span className="badge badge-outline badge-sm">
                                                To: {new Date(dateTo).toLocaleDateString()}
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
                                disabled={isDownloading || (returns.data && returns.data.length === 0)}
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

                    {/* Returns Table */}
                    <div className="card bg-base-100 border border-base-300">
                        <div className="card-body">
                            <div className="overflow-x-auto">
                                <table className="table table-zebra w-full">
                                    <thead>
                                        <tr>
                                            <th>Return No</th>
                                            <th>Purchase No</th>
                                            <th>Supplier</th>
                                            <th>Type</th>
                                            <th>Amount</th>
                                            <th>Status</th>
                                            <th>Date</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {returns.data.map((item) => (
                                            <React.Fragment key={item.id}>
                                                <tr>
                                                    <td>
                                                        <div className="font-medium">{item.return_no}</div>
                                                        <div className="text-xs text-gray-500">
                                                            {formatDate(item.return_date)}
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <div>{item.purchase?.purchase_no || 'N/A'}</div>
                                                    </td>
                                                    <td>
                                                        <div>{item.supplier?.name || 'N/A'}</div>
                                                        {item.supplier?.company && (
                                                            <div className="text-xs text-gray-500">
                                                                {item.supplier.company}
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td>{getTypeBadge(item.return_type)}</td>
                                                    <td>
                                                        <div className="font-medium">
                                                            ৳{formatCurrency(item.total_return_amount)}
                                                        </div>
                                                    </td>
                                                    <td>{getStatusBadge(item.status)}</td>
                                                    <td>{formatDate(item.created_at)}</td>
                                                </tr>

                                                {expandedRows.includes(item.id) && (
                                                    <tr>
                                                        <td colSpan="8" className="bg-base-100">
                                                            <div className="p-4 border-t border-base-300">
                                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                                    <div>
                                                                        <h4 className="font-semibold text-sm mb-2">Details</h4>
                                                                        <div className="space-y-2 text-sm">
                                                                            <div className="flex justify-between">
                                                                                <span className="text-gray-600">Warehouse:</span>
                                                                                <span>{item.warehouse?.name || 'N/A'}</span>
                                                                            </div>
                                                                            <div className="flex justify-between">
                                                                                <span className="text-gray-600">Created By:</span>
                                                                                <span>{item.creator?.name || 'System'}</span>
                                                                            </div>
                                                                            <div className="flex justify-between">
                                                                                <span className="text-gray-600">Payment Type:</span>
                                                                                <span>{item.payment_type || 'N/A'}</span>
                                                                            </div>
                                                                        </div>
                                                                    </div>

                                                                    <div>
                                                                        <h4 className="font-semibold text-sm mb-2">Amount Details</h4>
                                                                        <div className="space-y-2 text-sm">
                                                                            <div className="flex justify-between">
                                                                                <span className="text-gray-600">Total Return:</span>
                                                                                <span className="font-medium">
                                                                                    ৳{formatCurrency(item.total_return_amount)}
                                                                                </span>
                                                                            </div>
                                                                            <div className="flex justify-between">
                                                                                <span className="text-gray-600">Refunded:</span>
                                                                                <span className="text-success">
                                                                                    ৳{formatCurrency(item.refunded_amount)}
                                                                                </span>
                                                                            </div>
                                                                            {item.return_type === 'product_replacement' && (
                                                                                <div className="flex justify-between">
                                                                                    <span className="text-gray-600">Replacement Total:</span>
                                                                                    <span className="text-warning">
                                                                                        ৳{formatCurrency(item.replacement_total || 0)}
                                                                                    </span>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    </div>

                                                                    <div>
                                                                        <h4 className="font-semibold text-sm mb-2">Reason & Notes</h4>
                                                                        <p className="text-sm text-gray-700">{item.reason || 'No reason provided'}</p>
                                                                        {item.notes && (
                                                                            <p className="text-xs text-gray-500 mt-2">{item.notes}</p>
                                                                        )}
                                                                    </div>
                                                                </div>

                                                                <div className="mt-4 pt-4 border-t border-base-300">
                                                                    <div className="flex gap-2">
                                                                        <Link
                                                                            href={route('purchase-returns.show', item.id)}
                                                                            className="btn btn-sm btn-outline"
                                                                        >
                                                                            <Eye size={14} className="mr-2" />
                                                                            View Details
                                                                        </Link>

                                                                        {item.status === 'pending' && (
                                                                            <button
                                                                                onClick={() => handleApprove(item.id)}
                                                                                className="btn btn-sm btn-success"
                                                                            >
                                                                                <CheckCircle size={14} className="mr-2" />
                                                                                Approve
                                                                            </button>
                                                                        )}

                                                                        {item.status === 'approved' && (
                                                                            <button
                                                                                onClick={() => handleComplete(item.id)}
                                                                                className={`btn btn-sm ${item.return_type === 'money_back' ? 'btn-primary' : 'btn-warning'}`}
                                                                            >
                                                                                {item.return_type === 'money_back' ? (
                                                                                    <>
                                                                                        <DollarSign size={14} className="mr-2" />
                                                                                        Complete Refund
                                                                                    </>
                                                                                ) : (
                                                                                    <>
                                                                                        <Package size={14} className="mr-2" />
                                                                                        Complete Replacement
                                                                                    </>
                                                                                )}
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )}
                                            </React.Fragment>
                                        ))}
                                    </tbody>
                                </table>

                                {returns.data.length === 0 && (
                                    <div className="text-center py-12">
                                        <RefreshCw size={48} className="mx-auto text-gray-300 mb-4" />
                                        <h3 className="text-lg font-semibold text-gray-500 mb-2">
                                            No purchase returns found
                                        </h3>
                                    </div>
                                )}
                            </div>

                            {/* Pagination */}
                            {returns.links && returns.links.length > 3 && (
                                <div className="flex justify-center mt-6">
                                    <div className="join">
                                        {returns.links.map((link, index) => (
                                            <button
                                                key={index}
                                                onClick={() => {
                                                    if (link.url) {
                                                        router.get(link.url);
                                                    }
                                                }}
                                                className={`join-item btn btn-sm ${link.active ? 'btn-primary' : ''} ${!link.url ? 'btn-disabled' : ''}`}
                                                dangerouslySetInnerHTML={{ __html: link.label }}
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
                        <div className="card bg-base-100 border border-base-300">
                            <div className="card-body p-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="text-sm font-semibold text-gray-500">Total Returns</h3>
                                        <p className="text-2xl font-bold mt-1">{summary.total}</p>
                                    </div>
                                    <RefreshCw size={24} className="text-primary" />
                                </div>
                            </div>
                        </div>

                        <div className="card bg-warning/10 border border-warning">
                            <div className="card-body p-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="text-sm font-semibold text-warning">Pending</h3>
                                        <p className="text-2xl font-bold mt-1 text-warning">{summary.pending}</p>
                                    </div>
                                    <Clock size={24} className="text-warning" />
                                </div>
                            </div>
                        </div>

                        <div className="card bg-success/10 border border-success">
                            <div className="card-body p-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="text-sm font-semibold text-success">Completed</h3>
                                        <p className="text-2xl font-bold mt-1 text-success">{summary.completed}</p>
                                    </div>
                                    <CheckCircle size={24} className="text-success" />
                                </div>
                            </div>
                        </div>

                        <div className="card bg-primary/10 border border-primary">
                            <div className="card-body p-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="text-sm font-semibold text-primary">Money Back</h3>
                                        <p className="text-2xl font-bold mt-1 text-primary">{summary.money_back}</p>
                                    </div>
                                    <DollarSign size={24} className="text-primary" />
                                </div>
                            </div>
                        </div>

                        <div className="card bg-warning/10 border border-warning">
                            <div className="card-body p-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="text-sm font-semibold text-warning">Replacement</h3>
                                        <p className="text-2xl font-bold mt-1 text-warning">{summary.replacement}</p>
                                    </div>
                                    <Package size={24} className="text-warning" />
                                </div>
                            </div>
                        </div>
                    </div>

                </div>


            </div>


        </div>
    );
}