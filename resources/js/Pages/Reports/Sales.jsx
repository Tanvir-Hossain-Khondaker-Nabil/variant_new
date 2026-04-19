import React, { useState, useEffect } from "react";
import PageHeader from "../../components/PageHeader";
import Pagination from "../../components/Pagination";
import {
    Frown,
    Plus,
    Printer,
    Edit,
    Trash2,
    Eye,
    Search,
    Check,
    X,
    DollarSign,
    AlertCircle,
    Wallet,
    Landmark,
    Smartphone,
    CreditCard,
    History,
    Download,
    Filter,
    ChevronUp,
    ChevronDown,
} from "lucide-react";
import { Link, router, useForm, usePage } from "@inertiajs/react";
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { toast } from "react-toastify";
import axios from 'axios';

export default function Sales({ sales, filters, isShadowUser, accounts }) {
    const { auth } = usePage().props;
    const [showFilters, setShowFilters] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);

    // Payment modal states
    const [selectedSale, setSelectedSale] = useState(null);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [processingPayment, setProcessingPayment] = useState(false);
    const [paymentErrors, setPaymentErrors] = useState({});
    const [selectedAccount, setSelectedAccount] = useState(null);
    const [paymentData, setPaymentData] = useState({
        paid_amount: 0,
        payment_date: new Date().toISOString().split("T")[0],
        payment_method: "cash",
        notes: "",
        account_id: "",
    });

    // Handle search and filters
    const filterForm = useForm({
        search: filters.search || "",
        status: filters.status || "",
        date_from: filters.date_from || "",
        date_to: filters.date_to || "",
    });

    // Update selected account when account_id changes
    useEffect(() => {
        if (paymentData.account_id && accounts && accounts.length > 0) {
            const account = accounts.find(
                (acc) => acc.id == paymentData.account_id
            );
            setSelectedAccount(account || null);
        } else {
            setSelectedAccount(null);
        }
    }, [paymentData.account_id, accounts]);

    const handleFilter = () => {
        const queryParams = {};

        // Only add non-empty values to query params
        if (filterForm.data.search.trim())
            queryParams.search = filterForm.data.search.trim();
        if (filterForm.data.status) queryParams.status = filterForm.data.status;
        if (filterForm.data.date_from)
            queryParams.date_from = filterForm.data.date_from;
        if (filterForm.data.date_to)
            queryParams.date_to = filterForm.data.date_to;

        router.get(route("reports.sales"), queryParams, {
            preserveScroll: true,
            preserveState: true,
            replace: true,
        });
    };

    const handleKeyPress = (e) => {
        if (e.key === "Enter") {
            handleFilter();
        }
    };

    const clearFilters = () => {
        filterForm.setData({
            search: "",
            status: "",
            date_from: "",
            date_to: "",
        });
        setTimeout(() => {
            router.get(
                route("reports.sales"),
                {},
                {
                    preserveScroll: true,
                    preserveState: true,
                }
            );
        }, 0);
    };

    // Toggle filter section
    const toggleFilters = () => {
        setShowFilters(!showFilters);
    };

    // Check if any filter is active
    const hasActiveFilters = () => {
        return filterForm.data.search || filterForm.data.status || filterForm.data.date_from || filterForm.data.date_to;
    };

    // Format date for input
    const formatDateForInput = (dateString) => {
        if (!dateString) return '';
        return new Date(dateString).toISOString().split('T')[0];
    };

    // Format date for filename
    const formatDateForFilename = () => {
        const now = new Date();
        return now.toISOString().split('T')[0] + '_' + 
               now.getHours() + '-' + 
               now.getMinutes() + '-' + 
               now.getSeconds();
    };

    // Fetch all sales for export
    const fetchAllSalesForExport = async () => {
        try {
            const response = await axios.get(route('reports.sales.export'), {
                params: {
                    search: filterForm.data.search,
                    status: filterForm.data.status,
                    date_from: filterForm.data.date_from,
                    date_to: filterForm.data.date_to
                }
            });
            return response.data.sales;
        } catch (error) {
            console.error('Error fetching all sales:', error);
            toast.error('Failed to fetch all sales data');
            throw error;
        }
    };

    // Close payment modal
    const closePaymentModal = () => {
        setShowPaymentModal(false);
        setSelectedSale(null);
        setSelectedAccount(null);
        setProcessingPayment(false);
        setPaymentErrors({});
    };

    // Handle payment input change
    const handlePaymentInputChange = (e) => {
        const { name, value } = e.target;
        setPaymentData((prev) => ({
            ...prev,
            [name]: name === "paid_amount" ? parseFloat(value) || 0 : value,
        }));
    };

    // Handle payment submission
    const handlePaymentSubmit = (e) => {
        e.preventDefault();

        if (!selectedSale) return;

        setProcessingPayment(true);
        setPaymentErrors({});

        // Validate before submitting
        const errors = {};

        if (paymentData.paid_amount <= 0) {
            errors.amount = "Please enter a payment amount";
        }

        if (paymentData.paid_amount > selectedSale.due_amount) {
            errors.paid_amount = "Payment cannot exceed due amount";
        }

        if (!paymentData.account_id) {
            errors.account_id = "Please select an account";
        }

        if (Object.keys(errors).length > 0) {
            setPaymentErrors(errors);
            setProcessingPayment(false);
            return;
        }

        router.post(
            route("sales.payments.store", { sale: selectedSale.id }),
            {
                sale_id: selectedSale.id,
                amount: paymentData.paid_amount,
                payment_date: paymentData.payment_date,
                payment_method: paymentData.payment_method,
                notes: paymentData.notes,
                account_id: paymentData.account_id,
            },
            {
                preserveScroll: true,
                preserveState: true,
                onSuccess: () => {
                    closePaymentModal();
                    router.reload({ only: ["sales"] });
                },
                onError: (errors) => {
                    console.error("Payment error:", errors);
                    setPaymentErrors(errors);
                    setProcessingPayment(false);
                },
            }
        );
    };

    // Calculate item counts for each sale
    const getTotalItems = (sale) => {
        return (
            sale.items?.reduce((total, item) => total + item.quantity, 0) || 0
        );
    };

    // Format currency
    const formatCurrency = (amount) => {
        return new Intl.NumberFormat("en-BD", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(amount);
    };

    // Format number
    const formatNumber = (amount) => {
        const num = parseFloat(amount) || 0;
        return new Intl.NumberFormat("en-IN", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(num);
    };

    // Get account icon
    const getAccountIcon = (type) => {
        switch (type) {
            case "cash":
                return <Wallet size={14} className="text-green-600" />;
            case "bank":
                return <Landmark size={14} className="text-blue-600" />;
            case "mobile_banking":
                return <Smartphone size={14} className="text-purple-600" />;
            default:
                return <CreditCard size={14} />;
        }
    };

    // Prepare data for export
    const prepareExportData = (salesData) => {
        return salesData.map(sale => ({
            'Invoice No': sale.invoice_no,
            'Customer': sale.customer?.customer_name || "Walk-in Customer",
            'Customer Phone': sale.customer?.phone || 'N/A',
            'Total Items': getTotalItems(sale),
            'Sub Total (Tk)': formatCurrency(sale.sub_total),
            'Grand Total (Tk)': formatCurrency(sale.grand_total),
            'Paid Amount (Tk)': formatCurrency(sale.paid_amount),
            'Due Amount (Tk)': formatCurrency(sale.due_amount),
            'Status': sale.status,
            'Payment Type': sale.payment_type || 'N/A',
            'Date': new Date(sale.created_at).toLocaleDateString("en-GB"),
            'Created By': sale.creator?.name || 'System'
        }));
    };

    // Download as CSV
    const downloadCSV = async () => {
        try {
            setIsDownloading(true);
            
            // Fetch all sales
            const allSales = await fetchAllSalesForExport();
            
            if (allSales.length === 0) {
                toast.warning('No data to export');
                return;
            }

            const exportData = prepareExportData(allSales);

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
            csvRows.push(`Status,${filterForm.data.status || 'All'}`);
            csvRows.push(`Date From,${filterForm.data.date_from || 'None'}`);
            csvRows.push(`Date To,${filterForm.data.date_to || 'None'}`);

            // Add summary section
            csvRows.push(''); // Empty row
            csvRows.push('SUMMARY STATISTICS');
            const totals = calculateTotals(allSales);
            csvRows.push(`Total Sales,${totals.totalSales}`);
            csvRows.push(`Total Revenue (Tk),${totals.totalRevenue.toFixed(2)}`);
            csvRows.push(`Total Paid (Tk),${totals.totalPaid.toFixed(2)}`);
            csvRows.push(`Total Due (Tk),${totals.totalDue.toFixed(2)}`);

            const csvString = csvRows.join('\n');
            
            // Create and download file
            const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.href = url;
            link.download = `pos_sales_report_${formatDateForFilename()}.csv`;
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
            
            // Fetch all sales
            const allSales = await fetchAllSalesForExport();
            
            if (allSales.length === 0) {
                toast.warning('No data to export');
                return;
            }

            const exportData = prepareExportData(allSales);

            // Create workbook and worksheet
            const wb = XLSX.utils.book_new();
            const ws = XLSX.utils.json_to_sheet(exportData);

            // Create filter info sheet
            const filterData = [
                { 'Filter': 'Search', 'Value': filterForm.data.search || 'None' },
                { 'Filter': 'Status', 'Value': filterForm.data.status || 'All' },
                { 'Filter': 'Date From', 'Value': filterForm.data.date_from || 'None' },
                { 'Filter': 'Date To', 'Value': filterForm.data.date_to || 'None' }
            ];
            const wsFilters = XLSX.utils.json_to_sheet(filterData);

            // Add summary to a new sheet
            const totals = calculateTotals(allSales);
            const summaryData = [
                { 'Metric': 'Total Sales', 'Value': totals.totalSales },
                { 'Metric': 'Total Revenue (Tk)', 'Value': totals.totalRevenue.toFixed(2) },
                { 'Metric': 'Total Paid (Tk)', 'Value': totals.totalPaid.toFixed(2) },
                { 'Metric': 'Total Due (Tk)', 'Value': totals.totalDue.toFixed(2) }
            ];
            const wsSummary = XLSX.utils.json_to_sheet(summaryData);

            // Add sheets to workbook
            XLSX.utils.book_append_sheet(wb, ws, 'POS Sales');
            XLSX.utils.book_append_sheet(wb, wsFilters, 'Filters Applied');
            XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');

            // Generate and download file
            XLSX.writeFile(wb, `pos_sales_report_${formatDateForFilename()}.xlsx`);
            
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
            
            // Fetch all sales
            const allSales = await fetchAllSalesForExport();
            
            if (allSales.length === 0) {
                toast.warning('No data to export');
                return;
            }

            const exportData = prepareExportData(allSales);

            // Create PDF document
            const doc = new jsPDF({
                orientation: 'landscape',
                unit: 'mm',
                format: 'a4'
            });

            // Add title
            doc.setFontSize(16);
            doc.setTextColor(30, 77, 43); // #1e4d2b color
            doc.text('POS Sales Report', 14, 15);
            
            // Add date
            doc.setFontSize(10);
            doc.setTextColor(100, 100, 100);
            doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 22);

            // Add filter information
            doc.setFontSize(9);
            doc.setTextColor(80, 80, 80);
            doc.text(`Search: ${filterForm.data.search || 'None'} | Status: ${filterForm.data.status || 'All'}`, 14, 29);
            doc.text(`Date Range: ${filterForm.data.date_from || 'Start'} to ${filterForm.data.date_to || 'End'}`, 14, 35);

            // Prepare table columns and rows
            const tableColumns = [
                'Invoice',
                'Customer',
                'Items',
                'Grand Total',
                'Paid',
                'Due',
                'Status',
                'Date'
            ];

            const tableRows = exportData.map(item => [
                item['Invoice No'].substring(0, 10) + (item['Invoice No'].length > 10 ? '...' : ''),
                item['Customer'].substring(0, 15) + (item['Customer'].length > 15 ? '...' : ''),
                item['Total Items'],
                item['Grand Total (Tk)'],
                item['Paid Amount (Tk)'],
                item['Due Amount (Tk)'],
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
            const totals = calculateTotals(allSales);
            const finalY = doc.lastAutoTable.finalY + 10;
            
            doc.setFontSize(12);
            doc.setTextColor(30, 77, 43);
            doc.text('Summary Statistics', 14, finalY);
            
            doc.setFontSize(10);
            doc.setTextColor(0, 0, 0);
            doc.text(`Total Sales: ${totals.totalSales}`, 14, finalY + 7);
            doc.text(`Total Revenue: ${totals.totalRevenue.toFixed(2)} Tk`, 14, finalY + 14);
            doc.text(`Total Paid: ${totals.totalPaid.toFixed(2)} Tk`, 14, finalY + 21);
            doc.text(`Total Due: ${totals.totalDue.toFixed(2)} Tk`, 14, finalY + 28);

            // Save PDF
            doc.save(`pos_sales_report_${formatDateForFilename()}.pdf`);
            
            toast.success('PDF downloaded successfully');
        } catch (error) {
            console.error('Error downloading PDF:', error);
            toast.error('Failed to download PDF');
        } finally {
            setIsDownloading(false);
        }
    };

    const calculateTotals = (salesData) => {
        const totalRevenue = salesData.reduce(
            (sum, sale) => sum + parseFloat(sale.grand_total || 0),
            0
        );
        const totalPaid = salesData.reduce(
            (sum, sale) => sum + parseFloat(sale.paid_amount || 0),
            0
        );
        const totalDue = salesData.reduce(
            (sum, sale) => sum + parseFloat(sale.due_amount || 0),
            0
        );

        return {
            totalRevenue,
            totalPaid,
            totalDue,
            totalSales: salesData.length,
        };
    };

    const totals = calculateTotals(sales.data || []);

    // Check if payment button should be disabled
    const isPaymentDisabled = (sale) => {
        return sale.due_amount <= 0;
    };

    return (
        <div className="bg-white rounded-box p-5">
            <PageHeader
                title={
                    isShadowUser ? "All Sales Report" : "All Sales Report"
                }
                subtitle={
                    isShadowUser
                        ? "View sales reports"
                        : "Manage your product sales"
                }
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
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            {/* Search Filter */}
                            <fieldset className="fieldset">
                                <legend className="fieldset-legend">Search</legend>
                                <div className="relative">
                                    <input
                                        type="text"
                                        className="input input-sm w-full"
                                        placeholder="Invoice or customer..."
                                        value={filterForm.data.search}
                                        onChange={(e) => filterForm.setData("search", e.target.value)}
                                        onKeyPress={handleKeyPress}
                                    />
                                    <Search className="absolute right-2 top-2 text-gray-400" size={16} />
                                </div>
                            </fieldset>

                            {/* Status Filter */}
                            <fieldset className="fieldset">
                                <legend className="fieldset-legend">Status</legend>
                                <select
                                    value={filterForm.data.status}
                                    onChange={(e) => filterForm.setData("status", e.target.value)}
                                    className="select select-sm w-full"
                                >
                                    <option value="">All Status</option>
                                    <option value="pending">Pending</option>
                                    <option value="paid">Paid</option>
                                    <option value="partial">Partial</option>
                                    <option value="cancelled">Cancelled</option>
                                </select>
                            </fieldset>

                            {/* Date From Filter */}
                            <fieldset className="fieldset">
                                <legend className="fieldset-legend">Date From</legend>
                                <div className="relative">
                                    <input
                                        type="date"
                                        className="input input-sm w-full"
                                        value={formatDateForInput(filterForm.data.date_from)}
                                        onChange={(e) => filterForm.setData("date_from", e.target.value)}
                                    />
                                </div>
                            </fieldset>

                            {/* Date To Filter */}
                            <fieldset className="fieldset">
                                <legend className="fieldset-legend">Date To</legend>
                                <div className="relative">
                                    <input
                                        type="date"
                                        className="input input-sm w-full"
                                        value={formatDateForInput(filterForm.data.date_to)}
                                        onChange={(e) => filterForm.setData("date_to", e.target.value)}
                                        min={formatDateForInput(filterForm.data.date_from)}
                                    />
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
                                {filterForm.data.status && (
                                    <span className="badge badge-outline badge-sm">
                                        Status: {filterForm.data.status}
                                    </span>
                                )}
                                {filterForm.data.date_from && (
                                    <span className="badge badge-outline badge-sm">
                                        From: {new Date(filterForm.data.date_from).toLocaleDateString()}
                                    </span>
                                )}
                                {filterForm.data.date_to && (
                                    <span className="badge badge-outline badge-sm">
                                        To: {new Date(filterForm.data.date_to).toLocaleDateString()}
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

            <div className="print:hidden">
                <div className="overflow-x-auto">
                    {sales.data.length > 0 ? (
                        <table className="table table-auto w-full">
                            <thead
                                className={`${isShadowUser
                                    ? "bg-warning"
                                    : "bg-[#1e4d2b] text-white"
                                    } text-white`}
                            >
                                <tr>
                                    <th>Invoice No</th>
                                    <th>Customer</th>
                                    <th>Items</th>
                                    <th>Sub Total</th>
                                    <th>Grand Total</th>
                                    <th>Paid</th>
                                    <th>Due</th>
                                    <th>Status</th>
                                    <th>Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sales.data.map((sale, index) => (
                                    <tr
                                        key={sale.id}
                                        className="hover:bg-gray-50"
                                    >
                                        <td className="font-mono font-semibold">
                                            {sale.invoice_no}
                                        </td>
                                        <td>
                                            <div>
                                                <p className="font-medium">
                                                    {sale.customer
                                                        ?.customer_name ||
                                                        "Walk-in Customer"}
                                                </p>
                                                {sale.customer?.phone && (
                                                    <p className="text-sm text-gray-500">
                                                        {sale.customer.phone}
                                                    </p>
                                                )}
                                            </div>
                                        </td>
                                        <td>
                                            <span className="badge badge-outline">
                                                {getTotalItems(sale)}
                                            </span>
                                        </td>
                                        <td className="font-semibold">
                                            {formatCurrency(sale.sub_total)} Tk
                                        </td>
                                        <td className="font-semibold text-primary">
                                            {formatCurrency(sale.grand_total)}{" "}
                                            Tk
                                        </td>
                                        <td className="text-success font-semibold">
                                            {formatCurrency(sale.paid_amount)}{" "}
                                            Tk
                                        </td>
                                        <td
                                            className={`font-semibold ${sale.due_amount > 0
                                                ? "text-error"
                                                : "text-success"
                                                }`}
                                        >
                                            {formatCurrency(sale.due_amount)} Tk
                                        </td>
                                        <td>
                                            <span
                                                className={`badge capitalize ${sale.status === "paid"
                                                    ? "badge-success"
                                                    : sale.status ===
                                                        "cancelled"
                                                        ? "badge-error"
                                                        : "badge-warning"
                                                    }`}
                                            >
                                                {sale.status}
                                            </span>
                                        </td>
                                        <td>
                                            {new Date(
                                                sale.created_at
                                            ).toLocaleString("en-GB", {
                                                timeZone: "Asia/Dhaka",
                                                day: "2-digit",
                                                month: "2-digit",
                                                year: "numeric",
                                                hour: "2-digit",
                                                minute: "2-digit",
                                            })}
                                        </td>
                                     
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <div className="border border-gray-200 rounded-box px-5 py-16 flex flex-col justify-center items-center gap-3">
                            <Frown size={32} className="text-gray-400" />
                            <h1 className="text-gray-500 text-lg font-medium">
                                No reports found!
                            </h1>
                            <p className="text-gray-400 text-sm text-center max-w-md">
                                {hasActiveFilters
                                    ? "Try adjusting your search filters to find what you're looking for."
                                    : "Get started by creating your first sale record."}
                            </p>
                        </div>
                    )}
                </div>

                {/* Summary Stats */}
                {sales.data.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6 p-4 bg-gray-50 rounded-box">
                        <div className="text-center">
                            <p className="text-sm text-gray-600">Total Sales</p>
                            <p className="text-xl font-bold text-primary">
                                {totals.totalSales}
                            </p>
                        </div>
                        <div className="text-center">
                            <p className="text-sm text-gray-600">
                                Total Revenue
                            </p>
                            <p className="text-xl font-bold text-success">
                                {formatCurrency(totals.totalRevenue)} Tk
                            </p>
                        </div>
                        <div className="text-center">
                            <p className="text-sm text-gray-600">Total Paid</p>
                            <p className="text-xl font-bold text-info">
                                {formatCurrency(totals.totalPaid)} Tk
                            </p>
                        </div>
                        <div className="text-center">
                            <p className="text-sm text-gray-600">Total Due</p>
                            <p className="text-xl font-bold text-error">
                                {formatCurrency(totals.totalDue)} Tk
                            </p>
                        </div>
                    </div>
                )}

                {sales.data.length > 0 && <Pagination data={sales} />}
            </div>

            {/* Payment Modal */}
            {showPaymentModal && selectedSale && (
                <div className="modal modal-open">
                    <div className="modal-box max-w-4xl">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold flex items-center gap-2">
                                <DollarSign size={20} />
                                Payment Clearance - {selectedSale.invoice_no}
                            </h3>
                            <button
                                onClick={closePaymentModal}
                                className="btn btn-sm btn-circle btn-ghost"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Left Column: Payment Summary */}
                            <div>
                                <h4 className="font-semibold mb-3 flex items-center gap-2">
                                    <History size={16} />
                                    Sale Summary
                                </h4>

                                <div className="bg-gray-50 rounded-box p-4 mb-4">
                                    <div className="space-y-3 text-sm">
                                        <div className="grid grid-cols-2 gap-2">
                                            <div>
                                                <span className="text-gray-600">
                                                    Grand Total:
                                                </span>
                                                <p className="font-semibold">
                                                    {formatCurrency(
                                                        selectedSale.grand_total
                                                    )}{" "}
                                                    Tk
                                                </p>
                                            </div>
                                            <div>
                                                <span className="text-gray-600">
                                                    Total Paid:
                                                </span>
                                                <p className="font-semibold text-success">
                                                    {formatCurrency(
                                                        selectedSale.paid_amount
                                                    )}{" "}
                                                    Tk
                                                </p>
                                            </div>
                                            <div>
                                                <span className="text-gray-600">
                                                    Due Amount:
                                                </span>
                                                <p
                                                    className={`font-semibold ${selectedSale.due_amount >
                                                        0
                                                        ? "text-error"
                                                        : "text-success"
                                                        }`}
                                                >
                                                    {formatCurrency(
                                                        selectedSale.due_amount
                                                    )}{" "}
                                                    Tk
                                                </p>
                                            </div>
                                            <div>
                                                <span className="text-gray-600">
                                                    Status:
                                                </span>
                                                <p className="font-semibold capitalize">
                                                    {selectedSale.status}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="border-t pt-2">
                                            <p className="text-gray-600 mb-1">
                                                Customer:
                                            </p>
                                            <p className="font-semibold">
                                                {selectedSale.customer
                                                    ?.customer_name ||
                                                    "Walk-in Customer"}
                                            </p>
                                            {selectedSale.customer?.phone && (
                                                <p className="text-sm text-gray-500">
                                                    {
                                                        selectedSale.customer
                                                            .phone
                                                    }
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Payment History if available */}
                                {selectedSale.payments &&
                                    selectedSale.payments.length > 0 && (
                                        <div>
                                            <h5 className="font-semibold mb-2">
                                                Previous Payments
                                            </h5>
                                            <div className="space-y-2 max-h-40 overflow-y-auto">
                                                {selectedSale.payments.map(
                                                    (payment, idx) => (
                                                        <div
                                                            key={idx}
                                                            className="bg-gray-100 p-2 rounded text-sm"
                                                        >
                                                            <div className="flex justify-between">
                                                                <span>
                                                                    {new Date(
                                                                        payment.payment_date
                                                                    ).toLocaleDateString()}
                                                                </span>
                                                                <span className="font-semibold text-success">
                                                                    {formatCurrency(
                                                                        payment.amount
                                                                    )}{" "}
                                                                    Tk
                                                                </span>
                                                            </div>
                                                            <div className="text-xs text-gray-500">
                                                                Method:{" "}
                                                                {
                                                                    payment.payment_method
                                                                }{" "}
                                                                |
                                                                {payment.notes &&
                                                                    ` Notes: ${payment.notes}`}
                                                            </div>
                                                        </div>
                                                    )
                                                )}
                                            </div>
                                        </div>
                                    )}
                            </div>

                            {/* Right Column: Payment Form */}
                            <div>
                                <h4 className="font-semibold mb-3">
                                    Receive Payment
                                </h4>

                                <form onSubmit={handlePaymentSubmit}>
                                    <div className="space-y-4">
                                        <div className="form-control">
                                            <label className="label">
                                                <span className="label-text">
                                                    Amount to Pay *
                                                </span>
                                                <span className="label-text-alt">
                                                    Due:{" "}
                                                    {formatCurrency(
                                                        selectedSale.due_amount
                                                    )}{" "}
                                                    Tk
                                                </span>
                                            </label>
                                            <input
                                                type="number"
                                                name="paid_amount"
                                                value={paymentData.paid_amount}
                                                onChange={
                                                    handlePaymentInputChange
                                                }
                                                min="0.01"
                                                max={selectedSale.due_amount}
                                                
                                                className="input input-bordered"
                                                required
                                            />
                                            {paymentErrors.paid_amount && (
                                                <div className="text-red-600 text-xs mt-1 flex items-center gap-1">
                                                    <AlertCircle size={12} />
                                                    {paymentErrors.paid_amount}
                                                </div>
                                            )}
                                        </div>

                                        <div className="form-control">
                                            <label className="label">
                                                <span className="label-text">
                                                    Payment Date *
                                                </span>
                                            </label>
                                            <input
                                                type="date"
                                                name="payment_date"
                                                value={paymentData.payment_date}
                                                onChange={
                                                    handlePaymentInputChange
                                                }
                                                className="input input-bordered"
                                                required
                                            />
                                        </div>

                                        {/* Account Selection */}
                                        {accounts && accounts.length > 0 && (
                                            <div className="form-control">
                                                <label className="label py-0">
                                                    <span className="label-text font-bold text-gray-700">
                                                        Payment Account *
                                                    </span>
                                                </label>
                                                <select
                                                    name="account_id"
                                                    value={
                                                        paymentData.account_id ||
                                                        ""
                                                    }
                                                    onChange={
                                                        handlePaymentInputChange
                                                    }
                                                    className="select select-bordered w-full"
                                                    disabled={processingPayment}
                                                    required
                                                >
                                                    <option value="">
                                                        Select Account
                                                    </option>
                                                    {accounts
                                                        .filter(
                                                            (acc) =>
                                                                acc.is_active
                                                        )
                                                        .map((account) => (
                                                            <option
                                                                key={account.id}
                                                                value={
                                                                    account.id
                                                                }
                                                            >
                                                                <div className="flex items-center justify-between">
                                                                    <div className="flex items-center gap-2">
                                                                        {getAccountIcon(
                                                                            account.type
                                                                        )}
                                                                        <span>
                                                                            {
                                                                                account.name
                                                                            }
                                                                        </span>
                                                                    </div>
                                                                    <span className="text-xs text-gray-500">
                                                                        ৳
                                                                        {formatNumber(
                                                                            account.current_balance
                                                                        )}
                                                                    </span>
                                                                </div>
                                                            </option>
                                                        ))}
                                                </select>
                                                {paymentErrors.account_id && (
                                                    <div className="text-red-600 text-xs mt-1 flex items-center gap-1">
                                                        <AlertCircle
                                                            size={12}
                                                        />
                                                        {
                                                            paymentErrors.account_id
                                                        }
                                                    </div>
                                                )}

                                                {/* Selected Account Info */}
                                                {selectedAccount && (
                                                    <div className="mt-2 p-2 bg-gray-50 rounded-lg border border-gray-200">
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center gap-2">
                                                                {getAccountIcon(
                                                                    selectedAccount.type
                                                                )}
                                                                <span className="text-sm font-bold">
                                                                    {
                                                                        selectedAccount.name
                                                                    }
                                                                </span>
                                                                <span className="text-xs text-gray-500 capitalize">
                                                                    (
                                                                    {
                                                                        selectedAccount.type
                                                                    }
                                                                    )
                                                                </span>
                                                            </div>
                                                            <div className="text-right">
                                                                <div className="text-xs text-gray-500">
                                                                    Current
                                                                    Balance
                                                                </div>
                                                                <div className="text-sm font-mono font-bold">
                                                                    ৳
                                                                    {formatNumber(
                                                                        selectedAccount.current_balance
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        <div className="form-control">
                                            <label className="label">
                                                <span className="label-text">
                                                    Notes (Optional)
                                                </span>
                                            </label>
                                            <textarea
                                                name="notes"
                                                value={paymentData.notes}
                                                onChange={
                                                    handlePaymentInputChange
                                                }
                                                className="textarea textarea-bordered"
                                                rows="2"
                                                placeholder="Add any payment notes..."
                                            />
                                        </div>

                                        {/* Payment Summary */}
                                        <div className="bg-warning/10 border border-warning/20 rounded-box p-4">
                                            <h5 className="font-semibold mb-2">
                                                Payment Summary
                                            </h5>
                                            <div className="space-y-1 text-sm">
                                                <div className="flex justify-between">
                                                    <span>Current Due:</span>
                                                    <span>
                                                        {formatCurrency(
                                                            selectedSale.due_amount
                                                        )}{" "}
                                                        Tk
                                                    </span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span>Paying Now:</span>
                                                    <span className="text-success">
                                                        {formatCurrency(
                                                            paymentData.paid_amount
                                                        )}{" "}
                                                        Tk
                                                    </span>
                                                </div>
                                                <div className="flex justify-between font-semibold border-t pt-1">
                                                    <span>Remaining Due:</span>
                                                    <span
                                                        className={
                                                            selectedSale.due_amount -
                                                                paymentData.paid_amount >
                                                                0
                                                                ? "text-error"
                                                                : "text-success"
                                                        }
                                                    >
                                                        {formatCurrency(
                                                            selectedSale.due_amount -
                                                            paymentData.paid_amount
                                                        )}{" "}
                                                        Tk
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="modal-action">
                                            <button
                                                type="button"
                                                onClick={closePaymentModal}
                                                className="btn btn-ghost"
                                                disabled={processingPayment}
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                type="submit"
                                                className="btn bg-[#1e4d2b] text-white"
                                                disabled={
                                                    processingPayment ||
                                                    paymentData.paid_amount <=
                                                    0 ||
                                                    paymentData.paid_amount >
                                                    selectedSale.due_amount ||
                                                    !paymentData.account_id
                                                }
                                            >
                                                {processingPayment ? (
                                                    <span className="loading loading-spinner"></span>
                                                ) : (
                                                    <>
                                                        <DollarSign
                                                            size={16}
                                                            className="mr-1"
                                                        />
                                                        Process Payment
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}