import React, { useEffect, useState } from "react";
import PageHeader from "../../components/PageHeader";
import { Link, router, useForm, usePage } from "@inertiajs/react";
import { Eye, Search, RefreshCw, Frown, ChevronDown, ChevronUp, Package, Building, Calendar, Download, Filter } from "lucide-react";
import { toast } from "react-toastify";
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import axios from 'axios';

export default function PurchaseItems({ purchaseItems, filters, isShadowUser }) {
    const { flash } = usePage().props;
    const [expandedRow, setExpandedRow] = useState(null);
    const [showFilters, setShowFilters] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);

    // Handle search and filtering
    const searchForm = useForm({
        search: filters.search || "",
        date_from: filters.date_from || "",
        date_to: filters.date_to || "",
    });

    const handleFilterChange = (field, value) => {
        searchForm.setData(field, value);
        
        // If date_from is changed and date_to is before it, clear date_to
        if (field === 'date_from' && searchForm.data.date_to && value > searchForm.data.date_to) {
            searchForm.setData('date_to', '');
        }
    };

    const handleSearch = () => {
        // Only submit if both dates are provided or neither is provided
        const hasDateFrom = searchForm.data.date_from;
        const hasDateTo = searchForm.data.date_to;
        
        if ((hasDateFrom && !hasDateTo) || (!hasDateFrom && hasDateTo)) {
            toast.warning('Please provide both dates for date range filter or leave both empty');
            return;
        }
        
        searchForm.get(route("reports.purchase.items"), {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const clearFilters = () => {
        searchForm.reset();
        router.get(route("reports.purchase.items"));
    };

    // Toggle row expansion
    const toggleRow = (index) => {
        setExpandedRow(expandedRow === index ? null : index);
    };

    // Toggle filter section
    const toggleFilters = () => {
        setShowFilters(!showFilters);
    };

    // Check if any filter is active
    const hasActiveFilters = () => {
        return searchForm.data.search || searchForm.data.date_from || searchForm.data.date_to;
    };

    // Format date
    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
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

    // Format date for input
    const formatDateForInput = (dateString) => {
        if (!dateString) return '';
        return new Date(dateString).toISOString().split('T')[0];
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

    // Get variant text
    const getVariantText = (variant) => {
        if (!variant) return 'N/A';

        let attrsText = '';
        if (variant.attribute_values) {
            if (typeof variant.attribute_values === 'object') {
                attrsText = Object.entries(variant.attribute_values)
                    .map(([key, value]) => `${key}: ${value}`)
                    .join(', ');
            } else {
                attrsText = variant.attribute_values;
            }
        }

        return attrsText || 'N/A';
    };

    // Fetch all purchase items for export - UPDATED to match the controller method
    const fetchAllPurchaseItemsForExport = async () => {
        try {
            const response = await axios.get(route('reports.purchase-items.export'), {
                params: {
                    search: searchForm.data.search,
                    date_from: searchForm.data.date_from,
                    date_to: searchForm.data.date_to
                }
            });
            return response.data.purchaseItems;
        } catch (error) {
            console.error('Error fetching all purchase items:', error);
            toast.error('Failed to fetch all purchase items data');
            throw error;
        }
    };

    // Prepare data for export
    const prepareExportData = (itemsData) => {
        return itemsData.map(item => ({
            'Product Name': item.product?.name || item.product_name,
            'Product Code': item.product?.product_no || 'N/A',
            'Variant': item.variant ? getVariantText(item.variant) : (item.variant_name || 'N/A'),
            'Item Type': item?.item_type === 'real' ? 'Stock Item' : 'Pickup Item',
            'Unit Price (Tk)': parseFloat(item.unit_price).toFixed(2),
            'Quantity': item.quantity,
            'Discount (%)': item.discount || 0,
            'Total (Tk)': calculateItemTotal(item),
            'Warehouse': item?.warehouse?.name || 'N/A',
            'Purchase ID': item.purchase_id || 0,
            'Supplier': item.purchase?.supplier?.name || item?.supplier?.name || 'N/A',
            'Purchase Date': formatDate(item.created_at),
            'Status': item.purchase?.status || 'Completed',
            'Is Damaged': item.damage ? 'Yes' : 'No',
            'Damage Quantity': item.damage?.quantity || 0,
            'Damage Reason': item.damage?.reason || 'N/A'
        }));
    };

    // Calculate summary statistics
    const calculateSummaryStats = (itemsData) => {
        const stats = itemsData.reduce((acc, item) => {
            acc.totalItems += 1;
            acc.totalQuantity += parseFloat(item.quantity) || 0;
            acc.totalAmount += parseFloat(calculateItemTotal(item)) || 0;
            acc.totalDamageQuantity += parseFloat(item.damage?.quantity) || 0;
            return acc;
        }, {
            totalItems: 0,
            totalQuantity: 0,
            totalAmount: 0,
            totalDamageQuantity: 0
        });

        stats.averagePerItem = stats.totalAmount / (stats.totalItems || 1);
        stats.damagePercentage = stats.totalQuantity > 0 
            ? (stats.totalDamageQuantity / stats.totalQuantity * 100).toFixed(2) 
            : 0;

        return stats;
    };

    // Download as CSV
    const downloadCSV = async () => {
        try {
            setIsDownloading(true);
            
            // Fetch all purchase items
            const allItems = await fetchAllPurchaseItemsForExport();
            
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
            csvRows.push(`Search,${searchForm.data.search || 'None'}`);
            csvRows.push(`Date From,${searchForm.data.date_from || 'None'}`);
            csvRows.push(`Date To,${searchForm.data.date_to || 'None'}`);

            // Add summary section
            csvRows.push(''); // Empty row
            csvRows.push('SUMMARY STATISTICS');
            const stats = calculateSummaryStats(allItems);
            csvRows.push(`Total Items,${stats.totalItems}`);
            csvRows.push(`Total Quantity,${stats.totalQuantity.toFixed(0)}`);
            csvRows.push(`Total Amount (Tk),${stats.totalAmount.toFixed(2)}`);
            csvRows.push(`Average per Item (Tk),${stats.averagePerItem.toFixed(2)}`);
            csvRows.push(`Total Damage Quantity,${stats.totalDamageQuantity.toFixed(0)}`);
            csvRows.push(`Damage Percentage (%),${stats.damagePercentage}`);

            const csvString = csvRows.join('\n');
            
            // Create and download file
            const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.href = url;
            link.download = `purchase_items_report_${formatDateForFilename()}.csv`;
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
            
            // Fetch all purchase items
            const allItems = await fetchAllPurchaseItemsForExport();
            
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
                { 'Filter': 'Search', 'Value': searchForm.data.search || 'None' },
                { 'Filter': 'Date From', 'Value': searchForm.data.date_from || 'None' },
                { 'Filter': 'Date To', 'Value': searchForm.data.date_to || 'None' }
            ];
            const wsFilters = XLSX.utils.json_to_sheet(filterData);

            // Add summary to a new sheet
            const stats = calculateSummaryStats(allItems);
            const summaryData = [
                { 'Metric': 'Total Items', 'Value': stats.totalItems },
                { 'Metric': 'Total Quantity', 'Value': stats.totalQuantity.toFixed(0) },
                { 'Metric': 'Total Amount (Tk)', 'Value': stats.totalAmount.toFixed(2) },
                { 'Metric': 'Average per Item (Tk)', 'Value': stats.averagePerItem.toFixed(2) },
                { 'Metric': 'Total Damage Quantity', 'Value': stats.totalDamageQuantity.toFixed(0) },
                { 'Metric': 'Damage Percentage (%)', 'Value': stats.damagePercentage }
            ];
            const wsSummary = XLSX.utils.json_to_sheet(summaryData);

            // Add sheets to workbook
            XLSX.utils.book_append_sheet(wb, ws, 'Purchase Items');
            XLSX.utils.book_append_sheet(wb, wsFilters, 'Filters Applied');
            XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');

            // Generate and download file
            XLSX.writeFile(wb, `purchase_items_report_${formatDateForFilename()}.xlsx`);
            
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
            
            // Fetch all purchase items
            const allItems = await fetchAllPurchaseItemsForExport();
            
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
            doc.text('Purchase Items Report', 14, 15);
            
            // Add date
            doc.setFontSize(10);
            doc.setTextColor(100, 100, 100);
            doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 22);

            // Add filter information
            doc.setFontSize(9);
            doc.setTextColor(80, 80, 80);
            doc.text(`Filters: Search: ${searchForm.data.search || 'None'} | Date: ${searchForm.data.date_from || 'Start'} to ${searchForm.data.date_to || 'End'}`, 14, 29);

            // Prepare table columns and rows
            const tableColumns = [
                'Product',
                'Price',
                'Qty',
                'Total',
                'Type',
                'Date'
            ];

            const tableRows = exportData.map(item => [
                item['Product Name'].substring(0, 20) + (item['Product Name'].length > 20 ? '...' : ''),
                item['Unit Price (Tk)'],
                item['Quantity'],
                item['Total (Tk)'],
                item['Item Type'],
                item['Purchase Date'].split(',')[0] // Just the date part
            ]);

            // Add table using autoTable
            autoTable(doc, {
                head: [tableColumns],
                body: tableRows,
                startY: 35,
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
            doc.text(`Total Quantity: ${stats.totalQuantity.toFixed(0)}`, 14, finalY + 14);
            doc.text(`Total Amount: ${stats.totalAmount.toFixed(2)} Tk`, 14, finalY + 21);
            doc.text(`Average per Item: ${stats.averagePerItem.toFixed(2)} Tk`, 14, finalY + 28);
            doc.text(`Damage Quantity: ${stats.totalDamageQuantity.toFixed(0)} (${stats.damagePercentage}%)`, 14, finalY + 35);

            // Save PDF
            doc.save(`purchase_items_report_${formatDateForFilename()}.pdf`);
            
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

    const stats = calculateSummaryStats(purchaseItems.data);

    return (
        <div className="bg-white rounded-box p-5">
            <PageHeader
                title="All Purchase Items"
                description="Comprehensive list of all purchased items with detailed information"
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
                                handleSearch();
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
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {/* Search Filter - Updated to match backend */}
                            <fieldset className="fieldset">
                                <legend className="fieldset-legend">Search Product</legend>
                                <input
                                    type="text"
                                    className="input input-sm"
                                    placeholder="Search by product name or code..."
                                    value={searchForm.data.search}
                                    onChange={(e) => handleFilterChange("search", e.target.value)}
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    Search in product name or product code
                                </p>
                            </fieldset>

                            {/* Date From Filter */}
                            <fieldset className="fieldset">
                                <legend className="fieldset-legend">Date From</legend>
                                <input
                                    type="date"
                                    className="input input-sm"
                                    value={formatDateForInput(searchForm.data.date_from)}
                                    onChange={(e) => handleFilterChange("date_from", e.target.value)}
                                />
                            </fieldset>

                            {/* Date To Filter */}
                            <fieldset className="fieldset">
                                <legend className="fieldset-legend">Date To</legend>
                                <input
                                    type="date"
                                    className="input input-sm"
                                    value={formatDateForInput(searchForm.data.date_to)}
                                    onChange={(e) => handleFilterChange("date_to", e.target.value)}
                                    min={formatDateForInput(searchForm.data.date_from)}
                                    disabled={!searchForm.data.date_from}
                                />
                                {!searchForm.data.date_from && (
                                    <p className="text-xs text-gray-500 mt-1">
                                        Select date from first
                                    </p>
                                )}
                            </fieldset>
                        </div>

                        {/* Date Range Hint */}
                        {(searchForm.data.date_from || searchForm.data.date_to) && (
                            <div className="mt-2 text-sm text-amber-600 bg-amber-50 p-2 rounded">
                                Note: Date filter requires both From and To dates to work properly.
                            </div>
                        )}

                        {/* Active Filters Display */}
                        {hasActiveFilters() && (
                            <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-gray-600">
                                <span className="font-medium">Active Filters:</span>
                                {searchForm.data.search && (
                                    <span className="badge badge-outline badge-sm">
                                        Search: "{searchForm.data.search}"
                                    </span>
                                )}
                                {searchForm.data.date_from && (
                                    <span className="badge badge-outline badge-sm">
                                        From: {new Date(searchForm.data.date_from).toLocaleDateString()}
                                    </span>
                                )}
                                {searchForm.data.date_to && (
                                    <span className="badge badge-outline badge-sm">
                                        To: {new Date(searchForm.data.date_to).toLocaleDateString()}
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

            {/* Purchase Items Table */}
            <div className="overflow-x-auto rounded-box border border-base-content/5 bg-base-100">
                {purchaseItems.data.length > 0 ? (
                    <table className="table">
                        <thead className={`${isShadowUser ? 'bg-warning' : 'bg-[#1e4d2b]'} text-white`}>
                            <tr>
                                <th className="w-8"></th>
                                <th>Product</th>
                                <th>Type</th>
                                <th>Price</th>
                                <th>Qty</th>
                                <th>Discount</th>
                                <th>Total</th>
                                <th>Warehouse</th>
                                <th>Date</th>
                            </tr>
                        </thead>
                        <tbody>
                            {purchaseItems.data.map((item, index) => (
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
                                                    {item.product?.name || item?.product_name}
                                                    {item.product?.product_no && ` (${item.product.product_no})`}
                                                </div>
                                                {item.variant && (
                                                    <div className="text-xs text-gray-500">
                                                        Variant: {getVariantText(item.variant)}
                                                    </div>
                                                )}
                                                {item?.variant_name}
                                            </div>
                                        </td>
                                        <td>
                                            <div className="max-w-[150px]">
                                                {item?.item_type && (
                                                    <div className="badge badge-info badge-sm p-4 rounded">
                                                        <strong>{item?.item_type == 'real' ? 'Stock Item' : 'Pickup Item'}</strong>
                                                    </div>
                                                )}
                                                {item.damage && (
                                                    <div className="badge badge-error badge-sm mt-1 p-4 rounded">
                                                        <strong>Damaged ({item.damage.quantity})</strong>
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td>
                                            <div className="text-sm font-medium text-success">
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
                                            <div className="font-semibold text-primary">
                                                {calculateItemTotal(item)} Tk
                                            </div>
                                        </td>
                                        <td>
                                            <div className="text-sm">
                                                {item?.warehouse?.name || 'N/A'}
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
                                            <td colSpan="10">
                                                <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                                                    <div>
                                                        <strong style={{ fontSize: '16px' }}>Product Details</strong>
                                                        <div className="mt-2 space-y-1">
                                                            <div><strong>Name:</strong> {item.product?.name || item.product_name}</div>
                                                            <div><strong>Code:</strong> {item.product?.product_no || 'N/A'}</div>
                                                            {item.product?.category && (
                                                                <div><strong>Category:</strong> {item.product.category.name || 'N/A'}</div>
                                                            )}
                                                            {item.product?.brand && (
                                                                <div><strong>Brand:</strong> {item.product.brand.name || 'N/A'}</div>
                                                            )}
                                                            {item.variant && (
                                                                <div>
                                                                    <strong>Variant:</strong> {getVariantText(item.variant)}
                                                                    {item.variant?.sku && ` (SKU: ${item.variant.sku})`}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <strong style={{ fontSize: '16px' }}>Purchase Details</strong>
                                                        <div className="mt-2 space-y-1">
                                                            <div><strong>Purchase ID:</strong> {item.purchase_id || 0}</div>
                                                            <div><strong>Status:</strong> {item.purchase?.status || 'Completed'}</div>
                                                            <div><strong>Supplier:</strong> {item.purchase?.supplier?.name || item?.supplier?.name || 'N/A'}</div>
                                                            <div><strong>Payment Status:</strong> {item.purchase?.payment_status || 'Paid'}</div>
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <strong style={{ fontSize: '16px' }}>Pricing Details</strong>
                                                        <div className="mt-2 space-y-1">
                                                            <div><strong>Unit Price:</strong> {parseFloat(item.unit_price).toFixed(2)} Tk</div>
                                                            <div><strong>Quantity:</strong> {item.quantity}</div>
                                                            <div><strong>Discount:</strong> {item.discount || 0}%</div>
                                                            <div><strong>Tax Rate:</strong> {item.tax_rate || 0}%</div>
                                                            <div className="border-t pt-1 mt-1">
                                                                <strong>Subtotal:</strong> {(item.unit_price * item.quantity).toFixed(2)} Tk
                                                            </div>
                                                            <div className="font-semibold text-primary">
                                                                <strong>Total:</strong> {calculateItemTotal(item)} Tk
                                                            </div>
                                                        </div>
                                                    </div>
                                                    {item.damage && (
                                                        <div className="md:col-span-3 lg:col-span-3">
                                                            <strong style={{ fontSize: '16px', color: '#ef4444' }}>Damage Information</strong>
                                                            <div className="mt-2 grid grid-cols-1 md:grid-cols-3 gap-4 bg-red-50 p-3 rounded">
                                                                <div><strong>Damage Quantity:</strong> {item.damage.quantity}</div>
                                                                <div><strong>Reason:</strong> {item.damage.reason || 'N/A'}</div>
                                                                <div><strong>Date Reported:</strong> {formatDate(item.damage.created_at)}</div>
                                                            </div>
                                                        </div>
                                                    )}
                                                    <div className="md:col-span-3 lg:col-span-3">
                                                        <strong style={{ fontSize: '16px' }}>Additional Information</strong>
                                                        <div className="mt-2 grid grid-cols-1 md:grid-cols-3 gap-4">
                                                            <div>
                                                                <div><strong>Warehouse:</strong> {item?.warehouse?.name || 'N/A'}</div>
                                                                <div><strong>Created By:</strong> {item.purchase?.creator?.name || 'System Admin'}</div>
                                                            </div>
                                                            <div>
                                                                <div><strong>Purchase Date:</strong> {item?.created_at ? formatDate(item.created_at) : 'N/A'}</div>
                                                            </div>
                                                            <div>
                                                                <div><strong>Created At:</strong> {formatDate(item.created_at)}</div>
                                                                <div><strong>Updated At:</strong> {formatDate(item.updated_at)}</div>
                                                            </div>
                                                        </div>
                                                        {item.purchase?.notes && (
                                                            <div className="mt-3 p-2 bg-gray-50 rounded">
                                                                <strong>Notes:</strong> {item.purchase.notes}
                                                            </div>
                                                        )}
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
                            No purchase items found!
                        </h1>
                        <p className="text-gray-400 text-xs">
                            Try adjusting your filters or check back later.
                        </p>
                    </div>
                )}
            </div>

            {/* Pagination */}
            {purchaseItems.data.length > 0 && (
                <div className="flex items-center justify-between mt-4 px-2">
                    <div className="text-sm text-gray-600">
                        Showing {purchaseItems.from} to {purchaseItems.to} of {purchaseItems.total} entries
                    </div>
                    <div className="join">
                        {purchaseItems.prev_page_url && (
                            <Link
                                href={purchaseItems.prev_page_url}
                                className="join-item btn btn-sm"
                                preserveScroll
                                preserveState
                            >
                                Previous
                            </Link>
                        )}

                        {purchaseItems.links.slice(1, -1).map((link, index) => (
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

                        {purchaseItems.next_page_url && (
                            <Link
                                href={purchaseItems.next_page_url}
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
            {purchaseItems.data.length > 0 && (
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
                            {stats.totalQuantity.toFixed(0)}
                        </div>
                    </div>
                    <div className="stat bg-warning/10 rounded-box">
                        <div className="stat-title">Total Amount</div>
                        <div className="stat-value text-warning text-lg">
                            {stats.totalAmount.toFixed(2)} Tk
                        </div>
                    </div>
                    <div className="stat bg-info/10 rounded-box">
                        <div className="stat-title">Avg. per Item</div>
                        <div className="stat-value text-info text-lg">
                            {stats.averagePerItem.toFixed(2)} Tk
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}