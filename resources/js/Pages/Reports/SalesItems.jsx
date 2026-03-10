import React, { useEffect, useState } from "react";
import PageHeader from "../../components/PageHeader";
import { Link, router, useForm, usePage } from "@inertiajs/react";
import { Eye, Search, RefreshCw, Frown, ChevronDown, ChevronUp, Download, Calendar, Filter } from "lucide-react";
import { toast } from "react-toastify";
import Select from "react-select";
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import axios from 'axios';

export default function SalesItems({ salesItems }) {
    const { flash, isShadowUser } = usePage().props;
    const [expandedRow, setExpandedRow] = useState(null);
    const [showFilters, setShowFilters] = useState(false); 
    const [filters, setFilters] = useState({
        search: "",
        customer_id: "",
        product_id: "",
        warehouse_id: "",
    });
    const [dateRange, setDateRange] = useState({
        start_date: "",
        end_date: ""
    });
    const [isDownloading, setIsDownloading] = useState(false);

    // Handle date changes
    const handleDateChange = (type, date) => {
        const newDateRange = { ...dateRange, [type]: date };
        setDateRange(newDateRange);
        
        // If start_date is changed and end_date is before it, clear end_date
        if (type === 'start_date' && dateRange.end_date && date > dateRange.end_date) {
            setDateRange(prev => ({ ...prev, end_date: "" }));
        }
    };

    // Handle search and filtering
    const handleFilter = (field, value) => {
        const newFilters = { ...filters, [field]: value };
        setFilters(newFilters);
    };

    const applyFilters = () => {
        // Validate date range - both dates required or neither
        const hasStartDate = dateRange.start_date;
        const hasEndDate = dateRange.end_date;
        
        if ((hasStartDate && !hasEndDate) || (!hasStartDate && hasEndDate)) {
            toast.warning('Please provide both start and end dates for date range filter');
            return;
        }

        const queryString = {};
        
        // Add text filters
        if (filters.search) queryString.search = filters.search;
        if (filters.customer_id) queryString.customer_id = filters.customer_id;
        if (filters.product_id) queryString.product_id = filters.product_id;
        if (filters.warehouse_id) queryString.warehouse_id = filters.warehouse_id;
        
        // Add date filters
        if (dateRange.start_date) queryString.start_date = dateRange.start_date;
        if (dateRange.end_date) queryString.end_date = dateRange.end_date;
        
        router.get(route("reports.sales.items"), queryString, { 
            preserveScroll: true, 
            preserveState: true, 
            replace: true 
        });
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter') {
            applyFilters();
        }
    };

    const clearFilters = () => {
        setFilters({ search: "", customer_id: "", product_id: "", warehouse_id: "" });
        setDateRange({ start_date: "", end_date: "" });
        router.get(route("reports.sales.items"), {}, { replace: true });
    };

    // Toggle row expansion
    const toggleRow = (index) => {
        setExpandedRow(expandedRow === index ? null : index);
    };

    // Toggle filter section
    const toggleFilters = () => {
        setShowFilters(!showFilters);
    };

    // Format date
    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    // Format date for input
    const formatDateForInput = (date) => {
        if (!date) return "";
        const d = new Date(date);
        return d.toISOString().split('T')[0];
    };

    // Format date for filename
    const formatDateForFilename = () => {
        const now = new Date();
        return now.toISOString().split('T')[0] + '_' + 
               now.getHours() + '-' + 
               now.getMinutes() + '-' + 
               now.getSeconds();
    };

    // Format currency
    const formatCurrency = (amount) => {
        const num = parseFloat(amount) || 0;
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'BDT',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(num);
    };

    // Calculate item total
    const calculateItemTotal = (item) => {
        const price = parseFloat(item.unit_price) || 0;
        const quantity = parseFloat(item.quantity) || 0;
        const discount = parseFloat(item.discount) || 0;

        const subtotal = price * quantity;
        const discountAmount = (subtotal * discount) / 100;
        return (subtotal - discountAmount).toFixed(2);
    };

    // Check if any filter is active
    const hasActiveFilters = () => {
        return filters.search || filters.customer_id || filters.product_id || filters.warehouse_id || dateRange.start_date || dateRange.end_date;
    };

    // Get variant text
    const getVariantText = (variant) => {
        if (!variant) return 'N/A';

        if (variant.attribute_values) {
            if (typeof variant.attribute_values === 'object') {
                return Object.entries(variant.attribute_values)
                    .map(([key, value]) => `${value}`)
                    .join(', ');
            }
            return variant.attribute_values;
        }
        return 'N/A';
    };

    // Get variant attributes
    const getVariantAttributes = (variant) => {
        if (!variant) return 'N/A';

        if (variant.attribute_values) {
            if (typeof variant.attribute_values === 'object') {
                return Object.entries(variant.attribute_values)
                    .map(([key, value]) => `${key}`)
                    .join(', ');
            }
            return variant.attribute_values;
        }
        return 'N/A';
    };

    // Fetch all sales items for export
    const fetchAllSalesItemsForExport = async () => {
        try {
            const response = await axios.get(route('reports.sales-items.export'), {
                params: {
                    search: filters.search,
                    customer_id: filters.customer_id,
                    product_id: filters.product_id,
                    warehouse_id: filters.warehouse_id,
                    start_date: dateRange.start_date,
                    end_date: dateRange.end_date
                }
            });
            return response.data.salesItems;
        } catch (error) {
            console.error('Error fetching all sales items:', error);
            toast.error('Failed to fetch all sales items data');
            throw error;
        }
    };

    // Prepare data for export
    const prepareExportData = (itemsData) => {
        return itemsData.map(item => ({
            'Product Name': item.product?.name || item.product_name,
            'Product Code': item.product?.product_no || 'N/A',
            'Variant': item.variant ? getVariantText(item.variant) : (item.variant_name || 'N/A'),
            'Customer Name': item.sale?.customer?.customer_name || 'Walk-in Customer',
            'Customer Phone': item.sale?.customer?.phone || 'N/A',
            'Unit Price (Tk)': parseFloat(item.unit_price).toFixed(2),
            'Quantity': item.quantity,
            'Discount (%)': item.discount || 0,
            'VAT (%)': item.sale?.vat_tax || 0,
            'Total (Tk)': calculateItemTotal(item),
            'Sale Type': item?.sale?.type || 'N/A',
            'Item Type': item?.warehouse_id ? 'Stock Item' : 'Pickup Item',
            'Warehouse': item.warehouse?.name || 'N/A',
            'Invoice No': item.sale?.invoice_no || 'N/A',
            'Sale Status': item.sale?.status || 'N/A',
            'Sale Date': formatDate(item.created_at),
            'Sale ID': item.sale_id
        }));
    };

    // Calculate summary stats
    const calculateSummaryStats = (itemsData) => {
        const totalItems = itemsData.length;
        const totalQuantity = itemsData.reduce((sum, item) => sum + parseFloat(item.quantity || 0), 0);
        const totalSales = itemsData.reduce((sum, item) => sum + parseFloat(calculateItemTotal(item) || 0), 0);
        const avgPerItem = totalItems > 0 ? totalSales / totalItems : 0;
        
        return { totalItems, totalQuantity, totalSales, avgPerItem };
    };

    // Download as CSV
    const downloadCSV = async () => {
        try {
            setIsDownloading(true);
            
            // Fetch all sales items
            const allItems = await fetchAllSalesItemsForExport();
            
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
            csvRows.push(`Search,${filters.search || 'None'}`);
            csvRows.push(`Date Range,${dateRange.start_date || 'Start'} to ${dateRange.end_date || 'End'}`);

            // Add summary section
            csvRows.push(''); // Empty row
            csvRows.push('SUMMARY STATISTICS');
            const stats = calculateSummaryStats(allItems);
            csvRows.push(`Total Items,${stats.totalItems}`);
            csvRows.push(`Total Quantity,${stats.totalQuantity}`);
            csvRows.push(`Total Sales (Tk),${stats.totalSales.toFixed(2)}`);
            csvRows.push(`Average per Item (Tk),${stats.avgPerItem.toFixed(2)}`);

            const csvString = csvRows.join('\n');
            
            // Create and download file
            const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.href = url;
            link.download = `sales_items_report_${formatDateForFilename()}.csv`;
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
            
            // Fetch all sales items
            const allItems = await fetchAllSalesItemsForExport();
            
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
                { 'Filter': 'Search', 'Value': filters.search || 'None' },
                { 'Filter': 'Date Range', 'Value': `${dateRange.start_date || 'Start'} to ${dateRange.end_date || 'End'}` }
            ];
            const wsFilters = XLSX.utils.json_to_sheet(filterData);

            // Add summary to a new sheet
            const stats = calculateSummaryStats(allItems);
            const summaryData = [
                { 'Metric': 'Total Items', 'Value': stats.totalItems },
                { 'Metric': 'Total Quantity', 'Value': stats.totalQuantity },
                { 'Metric': 'Total Sales (Tk)', 'Value': stats.totalSales.toFixed(2) },
                { 'Metric': 'Average per Item (Tk)', 'Value': stats.avgPerItem.toFixed(2) }
            ];
            const wsSummary = XLSX.utils.json_to_sheet(summaryData);

            // Add sheets to workbook
            XLSX.utils.book_append_sheet(wb, ws, 'Sales Items');
            XLSX.utils.book_append_sheet(wb, wsFilters, 'Filters Applied');
            XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');

            // Generate and download file
            XLSX.writeFile(wb, `sales_items_report_${formatDateForFilename()}.xlsx`);
            
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
            
            // Fetch all sales items
            const allItems = await fetchAllSalesItemsForExport();
            
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
            doc.text('Sales Items Report', 14, 15);
            
            // Add date
            doc.setFontSize(10);
            doc.setTextColor(100, 100, 100);
            doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 22);

            // Add filter information
            doc.setFontSize(9);
            doc.setTextColor(80, 80, 80);
            doc.text(`Filters: Search: ${filters.search || 'None'}`, 14, 29);
            doc.text(`Date Range: ${dateRange.start_date || 'Start'} to ${dateRange.end_date || 'End'}`, 14, 35);

            // Prepare table columns and rows
            const tableColumns = [
                'Product',
                'Customer',
                'Price',
                'Qty',
                'Total',
                'Type',
                'Date'
            ];

            const tableRows = exportData.map(item => [
                (item['Product Name'] || '').substring(0, 20) + ((item['Product Name'] || '').length > 20 ? '...' : ''),
                (item['Customer Name'] || '').substring(0, 15) + ((item['Customer Name'] || '').length > 15 ? '...' : ''),
                item['Unit Price (Tk)'],
                item['Quantity'],
                item['Total (Tk)'],
                item['Sale Type'],
                (item['Sale Date'] || '').split(',')[0] // Just the date part
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
            doc.text(`Total Items: ${stats.totalItems}`, 14, finalY + 7);
            doc.text(`Total Quantity: ${stats.totalQuantity}`, 14, finalY + 14);
            doc.text(`Total Sales: ${stats.totalSales.toFixed(2)} Tk`, 14, finalY + 21);
            doc.text(`Average per Item: ${stats.avgPerItem.toFixed(2)} Tk`, 14, finalY + 28);

            // Save PDF
            doc.save(`sales_items_report_${formatDateForFilename()}.pdf`);
            
            toast.success('PDF downloaded successfully');
        } catch (error) {
            console.error('Error downloading PDF:', error);
            toast.error('Failed to download PDF');
        } finally {
            setIsDownloading(false);
        }
    };

    useEffect(() => {
        if (flash?.success) {
            toast.success(flash.success);
        }
        if (flash?.error) {
            toast.error(flash.error);
        }
    }, [flash]);

    const safeSalesItems = salesItems?.data || [];
    const stats = calculateSummaryStats(safeSalesItems);

    return (
        <div className="bg-white rounded-box p-5">
            <PageHeader
                title="All Sales Items"
                description="Comprehensive list of all sold items with detailed information"
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
                        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-3 gap-4 mb-4">
                            {/* Search - Updated to match backend */}
                            <fieldset className="fieldset">
                                <legend className="fieldset-legend">Search Product</legend>
                                <input
                                    type="text"
                                    className="input input-sm"
                                    placeholder="Search by product name or code..."
                                    value={filters.search}
                                    onChange={(e) => handleFilter("search", e.target.value)}
                                    onKeyPress={handleKeyPress}
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    Search in product name or code
                                </p>
                            </fieldset>

                             <fieldset className="fieldset">
                                <legend className="fieldset-legend">Start Date</legend>
                                <div className="relative">
                                    <input
                                        type="date"
                                        className="input input-sm w-full"
                                        value={formatDateForInput(dateRange.start_date)}
                                        onChange={(e) => handleDateChange('start_date', e.target.value)}
                                        onKeyPress={handleKeyPress}
                                    />
                                </div>
                            </fieldset>

                            {/* End Date */}
                            <fieldset className="fieldset">
                                <legend className="fieldset-legend">End Date</legend>
                                <div className="relative">
                                    <input
                                        type="date"
                                        className="input input-sm w-full"
                                        value={formatDateForInput(dateRange.end_date)}
                                        onChange={(e) => handleDateChange('end_date', e.target.value)}
                                        onKeyPress={handleKeyPress}
                                        min={formatDateForInput(dateRange.start_date)}
                                        disabled={!dateRange.start_date}
                                    />
                                </div>
                                {!dateRange.start_date && (
                                    <p className="text-xs text-amber-600 mt-1">
                                        Select start date first
                                    </p>
                                )}
                            </fieldset>

                   
                        </div>

                      

                        {/* Date Range Hint */}
                        {(dateRange.start_date || dateRange.end_date) && (
                            <div className="mt-2 text-sm text-amber-600 bg-amber-50 p-2 rounded">
                                Note: Date filter requires both Start and End dates to work properly.
                            </div>
                        )}

                        {/* Active Filters Display */}
                        {hasActiveFilters() && (
                            <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-gray-600">
                                <span className="font-medium">Active Filters:</span>
                                {filters.search && (
                                    <span className="badge badge-outline badge-sm">
                                        Search: "{filters.search}"
                                    </span>
                                )}
                                {filters.customer_id && (
                                    <span className="badge badge-outline badge-sm">
                                        Customer ID: {filters.customer_id}
                                    </span>
                                )}
                                {filters.product_id && (
                                    <span className="badge badge-outline badge-sm">
                                        Product ID: {filters.product_id}
                                    </span>
                                )}
                                {filters.warehouse_id && (
                                    <span className="badge badge-outline badge-sm">
                                        Warehouse ID: {filters.warehouse_id}
                                    </span>
                                )}
                                {(dateRange.start_date || dateRange.end_date) && (
                                    <span className="badge badge-outline badge-sm">
                                        Date: {dateRange.start_date ? new Date(dateRange.start_date).toLocaleDateString() : 'Start'} 
                                        {' → '} 
                                        {dateRange.end_date ? new Date(dateRange.end_date).toLocaleDateString() : 'End'}
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

            {/* Sales Items Table */}
            <div className="overflow-x-auto rounded-box border border-base-content/5 bg-base-100">
                {safeSalesItems.length > 0 ? (
                    <table className="table">
                        <thead className={`${isShadowUser ? 'bg-warning' : 'bg-[#1e4d2b]'} text-white`}>
                            <tr>
                                <th className="w-8"></th>
                                <th>Product</th>
                                <th>Customer</th>
                                <th>Price</th>
                                <th>Qty</th>
                                <th>Discount</th>
                                <th>Type</th>
                                <th>Total</th>
                                <th>Warehouse</th>
                                <th>Date</th>
                            </tr>
                        </thead>
                        <tbody>
                            {safeSalesItems.map((item, index) => (
                                <React.Fragment key={item.id}>
                                    <tr className="hover:bg-base-200">
                                        <td>
                                            <button
                                                onClick={() => toggleRow(index)}
                                                className="btn btn-ghost btn-xs"
                                            >
                                                {expandedRow === index ? (
                                                    <ChevronUp size={14} />
                                                ) : (
                                                    <ChevronDown size={14} />
                                                )}
                                            </button>
                                        </td>
                                        <td>
                                            <div className="max-w-[200px]">
                                                <div className="font-medium text-sm">
                                                    {item.product?.name || item.product_name}
                                                    {item.product?.product_no && ` (${item.product.product_no})`}
                                                </div>
                                                {item.variant && (
                                                    <div className="text-xs text-gray-500">
                                                        Variant: {getVariantText(item.variant)}
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td>
                                            <div className="max-w-[150px]">
                                                <div className="text-sm">
                                                    {item.sale?.customer?.customer_name || 'Walk-in Customer'}
                                                </div>
                                                {item.sale?.customer?.phone && (
                                                    <div className="text-xs text-gray-500">
                                                        {item.sale.customer.phone}
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td>
                                            <div className="text-sm">
                                                {parseFloat(item.unit_price).toFixed(2)} Tk
                                            </div>
                                        </td>
                                        <td>
                                            <div className="text-sm">
                                                {item.quantity}
                                            </div>
                                        </td>
                                        <td>
                                            <div className="text-sm">
                                                {item.discount || 0}%
                                            </div>
                                        </td>
                                        <td>
                                            <div className="badge badge-info badge-sm rounded p-4">
                                                <strong>{item?.sale?.type || 'N/A'}</strong>
                                            </div>
                                            <div className="badge bg-[#E5FBF4] badge-sm mt-1 rounded p-4">
                                                <strong>{item?.warehouse_id ? 'Stock Item' : 'Pickup Item'}</strong>
                                            </div>
                                        </td>
                                        <td>
                                            <div className="font-semibold text-primary">
                                                {calculateItemTotal(item)} Tk
                                            </div>
                                        </td>
                                        <td>
                                            <div className="text-sm">
                                                {item.warehouse?.name || 'N/A'}
                                            </div>
                                        </td>
                                        <td>
                                            <div className="text-xs text-gray-500">
                                                {formatDate(item.created_at)}
                                            </div>
                                        </td>
                                    </tr>

                                    {/* Expanded Row Details */}
                                    {expandedRow === index && (
                                        <tr className="bg-base-200">
                                            <td colSpan="11">
                                                <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                                                    <div>
                                                        <strong style={{ fontSize: '16px' }}>Product Details</strong>
                                                        <div className="mt-2 space-y-1">
                                                            <div><strong>Name:</strong> {item.product?.name || item.product_name}</div>
                                                            <div><strong>Code:</strong> {item.product?.product_no || 'N/A'}</div>
                                                            {item.variant && (
                                                                <>
                                                                    <div><strong>Variant Attributes:</strong> {getVariantAttributes(item.variant)}</div>
                                                                    <div><strong>Variant Values:</strong> {getVariantText(item.variant)}</div>
                                                                    {item.variant.sku && (
                                                                        <div><strong>SKU:</strong> {item.variant.sku}</div>
                                                                    )}
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <strong style={{ fontSize: '16px' }}>Sale Details</strong>
                                                        <div className="mt-2 space-y-1">
                                                            <div><strong>Sale ID:</strong> {item.sale_id}</div>
                                                            <div><strong>Invoice No:</strong> {item.sale?.invoice_no || 'N/A'}</div>
                                                            <div><strong>Status:</strong> {item.sale?.status || 'N/A'}</div>
                                                            <div><strong>Sale Type:</strong> {item.sale?.type || 'N/A'}</div>
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <strong style={{ fontSize: '16px' }}>Pricing Details</strong>
                                                        <div className="mt-2 space-y-1">
                                                            <div><strong>Unit Price:</strong> {parseFloat(item.unit_price).toFixed(2)} Tk</div>
                                                            <div><strong>Quantity:</strong> {item.quantity}</div>
                                                            <div><strong>Discount:</strong> {item.discount || 0}%</div>
                                                            <div><strong>VAT:</strong> {item.sale?.vat_tax || 0}%</div>
                                                            <div className="border-t pt-1 mt-1">
                                                                <strong>Subtotal:</strong> {(item.unit_price * item.quantity).toFixed(2)} Tk
                                                            </div>
                                                            <div className="font-semibold text-primary">
                                                                <strong>Total:</strong> {calculateItemTotal(item)} Tk
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <strong style={{ fontSize: '16px' }}>Additional Info</strong>
                                                        <div className="mt-2 space-y-1">
                                                            <div><strong>Warehouse:</strong> {item.warehouse?.name || 'N/A'}</div>
                                                            <div><strong>Sold By:</strong> System Admin</div>
                                                            <div><strong>Sale Date:</strong> {formatDate(item.created_at)}</div>
                                                            <div><strong>Created At:</strong> {formatDate(item.created_at)}</div>
                                                            <div><strong>Updated At:</strong> {formatDate(item.updated_at)}</div>
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
                ) : (
                    <div className="border border-gray-200 rounded-box px-5 py-10 flex flex-col justify-center items-center gap-2">
                        <Frown size={20} className="text-gray-500" />
                        <h1 className="text-gray-500 text-sm">
                            No sales items found!
                        </h1>
                        <p className="text-gray-400 text-xs">
                            Try adjusting your filters or check back later.
                        </p>
                    </div>
                )}
            </div>

            {/* Pagination */}
            {safeSalesItems.length > 0 && salesItems && (
                <div className="flex items-center justify-between mt-4 px-2">
                    <div className="text-sm text-gray-600">
                        Showing {salesItems.from || 0} to {salesItems.to || 0} of {salesItems.total || 0} entries
                    </div>
                    <div className="join">
                        {salesItems.prev_page_url && (
                            <Link
                                href={salesItems.prev_page_url}
                                className="join-item btn btn-sm"
                                preserveScroll
                                preserveState
                            >
                                Previous
                            </Link>
                        )}
                        {salesItems.links?.slice(1, -1).map((link, index) => (
                            <Link
                                key={index}
                                href={link.url}
                                className={`join-item btn btn-sm ${link.active ? 'bg-[#1e4d2b] text-white' : ''
                                    }`}
                                preserveScroll
                                preserveState
                                dangerouslySetInnerHTML={{ __html: link.label }}
                            />
                        ))}
                        {salesItems.next_page_url && (
                            <Link
                                href={salesItems.next_page_url}
                                className="join-item btn btn-sm"
                                preserveScroll
                                preserveState
                            >
                                Next
                            </Link>
                        )}
                    </div>
                </div>
            )}

            {/* Summary Stats */}
            {safeSalesItems.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
                    <div className="stat bg-[#1e4d2b] text-white rounded-box">
                        <div className="stat-title text-white">Total Items</div>
                        <div className="stat-value text-white text-lg">
                            {stats.totalItems}
                        </div>
                    </div>
                    <div className="stat bg-success/10 rounded-box">
                        <div className="stat-title">Total Quantity</div>
                        <div className="stat-value text-success text-lg">
                            {stats.totalQuantity}
                        </div>
                    </div>
                    <div className="stat bg-warning/10 rounded-box">
                        <div className="stat-title">Total Sales</div>
                        <div className="stat-value text-warning text-lg">
                            {stats.totalSales.toFixed(2)} Tk
                        </div>
                    </div>
                    <div className="stat bg-info/10 rounded-box">
                        <div className="stat-title">Avg. per Item</div>
                        <div className="stat-value text-info text-lg">
                            {stats.avgPerItem.toFixed(2)} Tk
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}