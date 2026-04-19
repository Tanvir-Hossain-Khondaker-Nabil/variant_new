import PageHeader from "../../components/PageHeader";
import Pagination from "../../components/Pagination";
import { Link, router, useForm, usePage } from "@inertiajs/react";
import {
    Frown,
    Search,
    Plus,
    Trash2,
    Package,
    ChevronDown,
    ChevronRight,
    Tag,
    Barcode,
    Printer,
    Copy,
    X,
    Layers,
    AlignLeft,
    AlignRight,
    CheckSquare,
    Square,
    MoreVertical,
    Filter,
    ChevronUp,
    Download,
    Calendar,
    FileText,
    Table as TableIcon,
    FileSpreadsheet,
    FileJson,
    Pen,
} from "lucide-react";
import React, { Fragment, useMemo, useState, useEffect } from "react";
import { useTranslation } from "../../hooks/useTranslation";
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { toast } from "react-toastify";
import axios from 'axios';

export default function Product({ product, filters, brands, categories, summary }) {
    const { auth } = usePage().props;
    const { t, locale } = useTranslation();
    const [showFilters, setShowFilters] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);

    const [expandedProducts, setExpandedProducts] = useState({});
    const [showBulkBarcodeModal, setShowBulkBarcodeModal] = useState(false);

    const [showIdentifierModal, setShowIdentifierModal] = useState(false);
    const [selectedIdentifierProduct, setSelectedIdentifierProduct] = useState(null);

    // store selected barcode rows (barcode is unique key)
    const [selectedBarcodeMap, setSelectedBarcodeMap] = useState(() => new Map());

    const [barcodeConfig, setBarcodeConfig] = useState({
        showProductName: true,
        showBatchNo: true,
        showSalePrice: true,
        align: "left",
        labelWidthMm: 36,
        labelHeightMm: 30,
        gapMm: 2,
        copiesMode: "one",
        fixedCopies: 1,
        barcodeImgHeightPx: 50,
    });

    const safeProducts = product?.data || [];

    // Form state for filters - matching backend expectations
    const { data, setData } = useForm({
        search: filters?.search || "",
        brand_id: filters?.brand_id || "",
        category_id: filters?.category_id || "",
        start_date: filters?.start_date || "",
        end_date: filters?.end_date || "",
    });

    // Local filter state for UI
    const [localFilters, setLocalFilters] = useState({
        search: filters?.search || "",
        brand_id: filters?.brand_id || "",
        category_id: filters?.category_id || "",
        start_date: filters?.start_date || "",
        end_date: filters?.end_date || "",
    });

    // Update local filters when data changes
    useEffect(() => {
        setLocalFilters({
            search: data.search,
            brand_id: data.brand_id,
            category_id: data.category_id,
            start_date: data.start_date,
            end_date: data.end_date,
        });
    }, [data]);

    const handleFilter = (e) => {
        e?.preventDefault();

        // Build query params - only include non-empty values
        const params = {};
        if (data.search) params.search = data.search;
        if (data.brand_id) params.brand_id = data.brand_id;
        if (data.category_id) params.category_id = data.category_id;
        if (data.start_date) params.start_date = data.start_date;
        if (data.end_date) params.end_date = data.end_date;

        router.get(route("product.list"), params, {
            preserveScroll: true,
            preserveState: true,
            replace: true,
        });
    };

    const handleFilterChange = (field, value) => {
        setData(field, value);
    };

    const getAllIdentifiersForProduct = (productItem) => {
        const rows = [];

        (productItem?.variants || []).forEach((variant) => {
            if (variant?.stock?.identifiers?.length) {
                variant.stock.identifiers.forEach((identifier) => {
                    rows.push({
                        id: identifier.id,
                        identifier_value: identifier.identifier_value,
                        identifier_type: identifier.identifier_type,
                        status: identifier.status,
                        batch_no: variant.stock?.batch_no || "N/A",
                        barcode: variant.stock?.barcode || "N/A",
                        variant_name: formatVariantDisplay(variant),
                        stock_id: variant.stock?.id,
                    });
                });
            }

            if (Array.isArray(variant?.stocks) && variant.stocks.length > 0) {
                variant.stocks.forEach((stock) => {
                    (stock.identifiers || []).forEach((identifier) => {
                        rows.push({
                            id: identifier.id,
                            identifier_value: identifier.identifier_value,
                            identifier_type: identifier.identifier_type,
                            status: identifier.status,
                            batch_no: stock?.batch_no || "N/A",
                            barcode: stock?.barcode || "N/A",
                            variant_name: formatVariantDisplay(variant),
                            stock_id: stock?.id,
                        });
                    });
                });
            }
        });

        const seen = new Set();
        return rows.filter((row) => {
            const key = `${row.id}-${row.identifier_value}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
    };

    const clearFilters = () => {
        setData({
            search: "",
            brand_id: "",
            category_id: "",
            start_date: "",
            end_date: ""
        });

        router.get(route("product.list"), {}, {
            preserveScroll: true,
            preserveState: true,
            replace: true,
        });
    };

    // Toggle filter section
    const toggleFilters = () => {
        setShowFilters(!showFilters);
    };

    // Check if any filter is active
    const hasActiveFilters = () => {
        return localFilters.search ||
            localFilters.brand_id ||
            localFilters.category_id ||
            localFilters.start_date ||
            localFilters.end_date;
    };

    const handleKeyPress = (e) => {
        if (e.key === "Enter") {
            handleFilter(e);
        }
    };

    // Format date for input
    const formatDateForInput = (dateString) => {
        if (!dateString) return '';
        return dateString;
    };

    // Format date for display
    const formatDisplayDate = (dateString) => {
        if (!dateString) return '';
        return new Date(dateString).toLocaleDateString();
    };

    // Format date for filename
    const formatDateForFilename = () => {
        const now = new Date();
        return now.toISOString().split('T')[0] + '_' +
            now.getHours() + '-' +
            now.getMinutes() + '-' +
            now.getSeconds();
    };

    // Toggle variant expansion
    const toggleExpand = (productId) => {
        setExpandedProducts((prev) => ({
            ...prev,
            [productId]: !prev[productId],
        }));
    };

    // Format variant display for attribute-based variants
    const formatVariantDisplay = (variant) => {
        if (!variant?.attribute_values || Object.keys(variant.attribute_values).length === 0) {
            return t("product.default_variant", "Default Variant");
        }

        const parts = [];
        for (const [attributeCode, value] of Object.entries(variant.attribute_values)) {
            parts.push(`${attributeCode}: ${value}`);
        }
        return parts.join(" | ");
    };

    // Format currency
    const formatCurrency = (amount) => {
        return new Intl.NumberFormat("en-IN", { style: "currency", currency: "BDT" }).format(amount || 0);
    };

    // Calculate total stock for a product
    const calculateTotalStock = (productItem) => {
        if (!productItem?.variants || productItem.variants.length === 0) return 0;
        return productItem.variants.reduce((total, variant) => total + (variant?.stock?.quantity || 0), 0);
    };

    // Get unique attributes count for a product
    const getUniqueAttributesCount = (productItem) => {
        if (!productItem?.variants || productItem.variants.length === 0) return 0;

        const allAttributes = new Set();
        productItem.variants.forEach((variant) => {
            if (variant?.attribute_values && Object.keys(variant.attribute_values).length > 0) {
                Object.keys(variant.attribute_values).forEach((attributeCode) => {
                    allAttributes.add(attributeCode);
                });
            }
        });

        return allAttributes.size;
    };

    // Fetch all products for export
    const fetchAllProductsForExport = async () => {
        try {
            const response = await axios.get(route('product.export'), {
                params: {
                    search: localFilters.search,
                    brand_id: localFilters.brand_id,
                    category_id: localFilters.category_id,
                    start_date: localFilters.start_date,
                    end_date: localFilters.end_date
                }
            });

            console.log('Export response:', response.data);

            if (response.data && response.data.products) {
                return response.data.products;
            } else if (response.data && Array.isArray(response.data)) {
                return response.data;
            } else {
                throw new Error('Invalid response format from server');
            }
        } catch (error) {
            console.error('Error fetching all products:', error);

            if (error.response) {
                toast.error(`Server error: ${error.response.status} - ${error.response.data?.message || 'Unknown error'}`);
            } else if (error.request) {
                toast.error('No response from server. Please check your network connection.');
            } else {
                toast.error(`Request error: ${error.message}`);
            }

            throw error;
        }
    };

    // Prepare data for export
    const prepareExportData = (productsData) => {
        const exportData = [];

        productsData.forEach(productItem => {
            // If product has variants, export each variant as a row
            if (productItem?.variants && productItem.variants.length > 0) {
                productItem.variants.forEach(variant => {
                    const barcodes = getVariantBarcodes(variant, productItem);

                    exportData.push({
                        'Product Name': productItem.name,
                        'Product Code': productItem.product_no || 'N/A',
                        'Category': productItem.category?.name || 'N/A',
                        'Brand': productItem.brand?.name || 'N/A',
                        'Variant': formatVariantDisplay(variant),
                        'Stock': variant?.stock?.quantity || 0,
                        'Price': variant?.stock?.sale_price || 0,
                        'Purchase Price': variant?.stock?.purchase_price || 0,
                        'Barcodes': barcodes.map(b => b.barcode).join(', '),
                        'Batch Numbers': barcodes.map(b => b.batch_no || 'N/A').join(', '),
                        'Attributes Count': Object.keys(variant?.attribute_values || {}).length,
                        'Created At': productItem.created_at ? new Date(productItem.created_at).toLocaleDateString() : 'N/A',
                    });
                });
            } else {
                // If no variants, export product as a single row
                exportData.push({
                    'Product Name': productItem.name,
                    'Product Code': productItem.product_no || 'N/A',
                    'Category': productItem.category?.name || 'N/A',
                    'Brand': productItem.brand?.name || 'N/A',
                    'Variant': 'N/A',
                    'Stock': 0,
                    'Price': 0,
                    'Purchase Price': 0,
                    'Barcodes': 'N/A',
                    'Batch Numbers': 'N/A',
                    'Attributes Count': 0,
                    'Created At': productItem.created_at ? new Date(productItem.created_at).toLocaleDateString() : 'N/A',
                });
            }
        });

        return exportData;
    };

    // Calculate export statistics
    const calculateExportStats = (productsData) => {
        const totalProducts = productsData.length;
        let totalStock = 0;
        let totalVariants = 0;
        let productsWithVariants = 0;

        productsData.forEach(productItem => {
            const productStock = calculateTotalStock(productItem);
            totalStock += productStock;

            const variantCount = productItem?.variants?.length || 0;
            totalVariants += variantCount;

            if (variantCount > 0) {
                productsWithVariants++;
            }
        });

        return {
            totalProducts,
            totalStock,
            totalVariants,
            productsWithVariants,
        };
    };

    // Download as CSV
    const downloadCSV = async () => {
        try {
            setIsDownloading(true);

            // Fetch all products using export endpoint
            const allProducts = await fetchAllProductsForExport();

            if (allProducts.length === 0) {
                toast.warning(t('product.no_data_export', 'No data to export'));
                return;
            }

            const exportData = prepareExportData(allProducts);
            const stats = calculateExportStats(allProducts);

            const headers = Object.keys(exportData[0]);
            const csvRows = [];

            // Headers
            csvRows.push(headers.join(','));

            // Data rows
            for (const row of exportData) {
                const values = headers.map(header => {
                    const value = row[header]?.toString() || '';
                    return `"${value.replace(/"/g, '""')}"`;
                });
                csvRows.push(values.join(','));
            }

            // Add filter information
            csvRows.push('');
            csvRows.push('FILTER INFORMATION');
            csvRows.push(`Search,${localFilters.search || 'None'}`);
            csvRows.push(`Brand,${brands?.find(b => b.id == localFilters.brand_id)?.name || 'None'}`);
            csvRows.push(`Category,${categories?.find(c => c.id == localFilters.category_id)?.name || 'None'}`);
            csvRows.push(`Date From,${localFilters.start_date || 'None'}`);
            csvRows.push(`Date To,${localFilters.end_date || 'None'}`);

            // Add summary statistics
            csvRows.push('');
            csvRows.push('SUMMARY STATISTICS');
            csvRows.push(`Total Products,${stats.totalProducts}`);
            csvRows.push(`Total Stock,${stats.totalStock}`);
            csvRows.push(`Total Variants,${stats.totalVariants}`);
            csvRows.push(`Products with Variants,${stats.productsWithVariants}`);

            const csvString = csvRows.join('\n');

            const blob = new Blob(["\uFEFF" + csvString], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.href = url;
            link.download = `products_report_${formatDateForFilename()}.csv`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            toast.success(`${stats.totalProducts} products exported successfully to CSV`);
        } catch (error) {
            console.error('Error downloading CSV:', error);
            toast.error(t('product.csv_download_failed', 'Failed to download CSV'));
        } finally {
            setIsDownloading(false);
        }
    };

    // Download as Excel
    const downloadExcel = async () => {
        try {
            setIsDownloading(true);

            // Fetch all products using export endpoint
            const allProducts = await fetchAllProductsForExport();

            if (allProducts.length === 0) {
                toast.warning(t('product.no_data_export', 'No data to export'));
                return;
            }

            const exportData = prepareExportData(allProducts);
            const stats = calculateExportStats(allProducts);

            const wb = XLSX.utils.book_new();
            const ws = XLSX.utils.json_to_sheet(exportData);

            // Add filter information sheet
            const filterData = [
                { 'Filter': 'Search', 'Value': localFilters.search || 'None' },
                { 'Filter': 'Brand', 'Value': brands?.find(b => b.id == localFilters.brand_id)?.name || 'None' },
                { 'Filter': 'Category', 'Value': categories?.find(c => c.id == localFilters.category_id)?.name || 'None' },
                { 'Filter': 'Date From', 'Value': localFilters.start_date || 'None' },
                { 'Filter': 'Date To', 'Value': localFilters.end_date || 'None' }
            ];
            const wsFilters = XLSX.utils.json_to_sheet(filterData);

            // Add summary statistics sheet
            const summaryData = [
                { 'Metric': 'Total Products', 'Value': stats.totalProducts },
                { 'Metric': 'Total Stock', 'Value': stats.totalStock },
                { 'Metric': 'Total Variants', 'Value': stats.totalVariants },
                { 'Metric': 'Products with Variants', 'Value': stats.productsWithVariants },
            ];
            const wsSummary = XLSX.utils.json_to_sheet(summaryData);

            XLSX.utils.book_append_sheet(wb, ws, 'Products');
            XLSX.utils.book_append_sheet(wb, wsFilters, 'Filters Applied');
            XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');

            XLSX.writeFile(wb, `products_report_${formatDateForFilename()}.xlsx`);

            toast.success(`${stats.totalProducts} products exported successfully to Excel`);
        } catch (error) {
            console.error('Error downloading Excel:', error);
            toast.error(t('product.excel_download_failed', 'Failed to download Excel file'));
        } finally {
            setIsDownloading(false);
        }
    };

    // Download as PDF
    const downloadPDF = async () => {
        try {
            setIsDownloading(true);

            // Fetch all products using export endpoint
            const allProducts = await fetchAllProductsForExport();

            if (allProducts.length === 0) {
                toast.warning(t('product.no_data_export', 'No data to export'));
                return;
            }

            const exportData = prepareExportData(allProducts);
            const stats = calculateExportStats(allProducts);

            const doc = new jsPDF({
                orientation: 'landscape',
                unit: 'mm',
                format: 'a4'
            });

            // Title
            doc.setFontSize(16);
            doc.setTextColor(30, 77, 43);
            doc.text(t('product.products_report', 'Products Report'), 14, 15);

            // Generation date
            doc.setFontSize(10);
            doc.setTextColor(100, 100, 100);
            doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 22);

            // Filter information
            doc.setFontSize(9);
            doc.setTextColor(80, 80, 80);
            let filterY = 29;
            if (localFilters.search) {
                doc.text(`Search: ${localFilters.search}`, 14, filterY);
                filterY += 5;
            }
            if (localFilters.brand_id) {
                doc.text(`Brand: ${brands?.find(b => b.id == localFilters.brand_id)?.name || 'None'}`, 14, filterY);
                filterY += 5;
            }
            if (localFilters.category_id) {
                doc.text(`Category: ${categories?.find(c => c.id == localFilters.category_id)?.name || 'None'}`, 14, filterY);
                filterY += 5;
            }
            if (localFilters.start_date || localFilters.end_date) {
                doc.text(`Date Range: ${formatDisplayDate(localFilters.start_date) || 'Start'} to ${formatDisplayDate(localFilters.end_date) || 'End'}`, 14, filterY);
                filterY += 5;
            }

            // Table columns
            const tableColumns = [
                'Product Name',
                'Code',
                'Category',
                'Brand',
                'Variant',
                'Stock',
                'Price',
                'Barcodes'
            ];

            const tableRows = exportData.slice(0, 50).map(item => [ // Limit to 50 rows for PDF
                item['Product Name'].substring(0, 15) + (item['Product Name'].length > 15 ? '...' : ''),
                item['Product Code'].substring(0, 8),
                item['Category'].substring(0, 8),
                item['Brand'].substring(0, 8),
                item['Variant'].substring(0, 10) + (item['Variant'].length > 10 ? '...' : ''),
                item['Stock'].toString(),
                formatCurrency(item['Price']),
                item['Barcodes'].substring(0, 10) + (item['Barcodes'].length > 10 ? '...' : '')
            ]);

            autoTable(doc, {
                head: [tableColumns],
                body: tableRows,
                startY: filterY + 5,
                theme: 'grid',
                styles: { fontSize: 7, cellPadding: 1.5 },
                headStyles: { fillColor: [30, 77, 43], textColor: [255, 255, 255] },
                alternateRowStyles: { fillColor: [245, 245, 245] }
            });

            // Summary statistics
            const finalY = doc.lastAutoTable.finalY + 10;

            doc.setFontSize(12);
            doc.setTextColor(30, 77, 43);
            doc.text(t('product.summary_statistics', 'Summary Statistics'), 14, finalY);

            doc.setFontSize(10);
            doc.setTextColor(0, 0, 0);
            doc.text(`Total Products: ${stats.totalProducts}`, 14, finalY + 7);
            doc.text(`Total Stock: ${stats.totalStock} units`, 14, finalY + 14);
            doc.text(`Total Variants: ${stats.totalVariants}`, 14, finalY + 21);
            doc.text(`Products with Variants: ${stats.productsWithVariants}`, 14, finalY + 28);

            if (exportData.length > 50) {
                doc.setFontSize(8);
                doc.setTextColor(150, 150, 150);
                doc.text(`Note: Showing first 50 of ${exportData.length} rows`, 14, finalY + 35);
            }

            doc.save(`products_report_${formatDateForFilename()}.pdf`);

            toast.success(`${stats.totalProducts} products exported successfully to PDF`);
        } catch (error) {
            console.error('Error downloading PDF:', error);
            toast.error(t('product.pdf_download_failed', 'Failed to download PDF'));
        } finally {
            setIsDownloading(false);
        }
    };

    // Fallback export with paginated data
    const fallbackExportWithPaginatedData = () => {
        try {
            if (safeProducts.length === 0) {
                toast.warning(t('product.no_data_export', 'No data to export'));
                return;
            }

            const exportData = prepareExportData(safeProducts);
            const stats = calculateExportStats(safeProducts);

            const headers = Object.keys(exportData[0]);
            const csvRows = [headers.join(',')];

            for (const row of exportData) {
                const values = headers.map(header => {
                    const value = row[header]?.toString() || '';
                    return `"${value.replace(/"/g, '""')}"`;
                });
                csvRows.push(values.join(','));
            }

            // Add filter information
            csvRows.push('');
            csvRows.push('FILTER INFORMATION (PAGINATED DATA - CURRENT PAGE ONLY)');
            csvRows.push(`Search,${localFilters.search || 'None'}`);
            csvRows.push(`Brand,${brands?.find(b => b.id == localFilters.brand_id)?.name || 'None'}`);
            csvRows.push(`Category,${categories?.find(c => c.id == localFilters.category_id)?.name || 'None'}`);
            csvRows.push(`Date From,${localFilters.start_date || 'None'}`);
            csvRows.push(`Date To,${localFilters.end_date || 'None'}`);

            // Add summary statistics
            csvRows.push('');
            csvRows.push('SUMMARY STATISTICS (CURRENT PAGE ONLY)');
            csvRows.push(`Total Products (This Page),${stats.totalProducts}`);
            csvRows.push(`Total Stock,${stats.totalStock}`);
            csvRows.push(`Total Variants,${stats.totalVariants}`);
            csvRows.push(`Products with Variants,${stats.productsWithVariants}`);

            const csvString = csvRows.join('\n');

            const blob = new Blob(["\uFEFF" + csvString], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.href = url;
            link.download = `products_report_paginated_${formatDateForFilename()}.csv`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            toast.warning('Using paginated data (export endpoint unavailable)');
        } catch (error) {
            console.error('Error in fallback export:', error);
            toast.error('Export failed');
        }
    };

    /**
     * ✅ Get barcodes for a variant (support multiple backend structures)
     */
    const getVariantBarcodes = (variant, productItem = null) => {
        const result = [];

        // 1) variant.stock.barcode (single)
        if (variant?.stock?.barcode) {
            result.push({
                barcode: variant.stock.barcode,
                batch_no: variant.stock.batch_no,
                quantity: variant.stock.quantity,
                purchase_price: variant.stock.purchase_price,
                sale_price: variant.stock.sale_price,
                warehouse_id: variant.stock.warehouse_id,
                variant_id: variant.id,
            });
        }

        // 2) variant.barcode (single) if no stock.barcode already
        if (!result.length && variant?.barcode) {
            result.push({
                barcode: variant.barcode,
                batch_no: variant?.batch_no,
                quantity: variant?.quantity,
                purchase_price: variant?.purchase_price,
                sale_price: variant?.sale_price,
                warehouse_id: variant?.warehouse_id,
                variant_id: variant.id,
            });
        }

        // 3) variant.stocks[] (multiple)
        if (Array.isArray(variant?.stocks) && variant.stocks.length > 0) {
            variant.stocks.forEach((s) => {
                if (s?.barcode) {
                    result.push({
                        barcode: s.barcode,
                        batch_no: s.batch_no,
                        quantity: s.quantity,
                        purchase_price: s.purchase_price,
                        sale_price: s.sale_price,
                        warehouse_id: s.warehouse_id,
                        variant_id: variant.id,
                    });
                }
            });
        }

        // 4) productItem.stocks[] fallback (multiple) - match variant_id if possible
        if (productItem && Array.isArray(productItem?.stocks) && productItem.stocks.length > 0) {
            const matched = productItem.stocks.filter((s) => {
                if (!s?.barcode) return false;
                if (s.variant_id && variant?.id) return String(s.variant_id) === String(variant.id);
                return true;
            });

            matched.forEach((s) => {
                if (!result.some((x) => x.barcode === s.barcode)) {
                    result.push({
                        barcode: s.barcode,
                        batch_no: s.batch_no,
                        quantity: s.quantity,
                        purchase_price: s.purchase_price,
                        sale_price: s.sale_price,
                        warehouse_id: s.warehouse_id,
                        variant_id: s.variant_id || variant?.id,
                    });
                }
            });
        }

        // unique by barcode
        const uniq = [];
        const seen = new Set();
        for (const row of result) {
            const code = String(row?.barcode || "").trim();
            if (code && !seen.has(code)) {
                seen.add(code);
                uniq.push({ ...row, barcode: code });
            }
        }
        return uniq;
    };

    // Copy barcode to clipboard
    const copyBarcode = (barcode) => {
        navigator.clipboard?.writeText(String(barcode || "")).then(() => {
            toast.success('Barcode copied to clipboard!');
        });
    };

    // Generate barcode image URL
    const generateBarcodeImage = (barcode) => {
        const code = String(barcode || "").trim();
        return `https://barcode.tec-it.com/barcode.ashx?data=${encodeURIComponent(code)}&code=Code128&dpi=96`;
    };

    // =========================
    // ✅ BULK BARCODE SELECT
    // =========================
    const selectedCount = selectedBarcodeMap.size;

    const toggleSelectBarcode = (row) => {
        const code = String(row?.barcode || "").trim();
        if (!code) return;

        setSelectedBarcodeMap((prev) => {
            const next = new Map(prev);
            if (next.has(code)) next.delete(code);
            else next.set(code, row);
            return next;
        });
    };

    const clearSelectedBarcodes = () => setSelectedBarcodeMap(new Map());

    const openBulkModal = () => {
        if (selectedCount <= 0) return alert("Select at least 1 barcode");
        setShowBulkBarcodeModal(true);
    };

    const closeBulkModal = () => setShowBulkBarcodeModal(false);

    const updateBarcodeConfig = (key, value) =>
        setBarcodeConfig((prev) => ({
            ...prev,
            [key]: value,
        }));

    // Build labels from selectedBarcodeMap + config copies
    const buildBulkLabels = () => {
        const { copiesMode, fixedCopies } = barcodeConfig;

        const resolveCopies = (qty) => {
            if (copiesMode === "fixed") return Math.max(1, Number(fixedCopies || 1));
            if (copiesMode === "byQty") return Math.max(1, Math.round(Number(qty || 1)));
            return 1;
        };

        const labels = [];
        for (const row of selectedBarcodeMap.values()) {
            const copies = resolveCopies(row?.quantity || 1);
            for (let i = 0; i < copies; i++) {
                labels.push({
                    codeValue: row.barcode,
                    imgSrc: generateBarcodeImage(row.barcode),
                    productName: row.productName || "",
                    variantName: row.variantName || "",
                    batchNo: row.batch_no || "",
                    salePrice: row.sale_price || "",
                });
            }
        }
        return labels;
    };

    // ✅ Professional bulk print
    const handleBulkBarcodePrint = () => {
        const labels = buildBulkLabels();
        if (!labels.length) return alert("No barcodes found to print.");

        const {
            showProductName,
            showBatchNo,
            showSalePrice,
            align,
            labelWidthMm,
            labelHeightMm,
            gapMm,
            barcodeImgHeightPx,
        } = barcodeConfig;

        const printWindow = window.open("", "_blank");
        if (!printWindow) return alert("Please allow popups to print barcodes.");

        const css = `
      @page { margin: 6mm; }
      @media print { .no-print { display:none !important; } body { padding:0; } }

      * { box-sizing:border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      body {
        margin:0;
        padding:10px;
        font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial;
        background:#fff;
        color:#0f172a;
      }

      .sheet { width:100%; }

      .grid{
        width: 100%;
        display: grid;
        grid-auto-flow: row;
        grid-template-columns: repeat(auto-fit, ${Number(labelWidthMm)}mm);
        gap:${Number(gapMm)}mm;
        justify-content:${align === "right" ? "end" : "start"};
        align-content:start;
      }

      .label{
        width:${Number(labelWidthMm)}mm;
        height:${Number(labelHeightMm)}mm;
        padding:4px 2px;
        border-radius:8px;
        background:#fff;
        border:1px solid #e5e7eb;
        display:flex;
        flex-direction:column;
        overflow:hidden;
        break-inside:avoid;
        page-break-inside:avoid;
        position:relative;
      }

      .barcodeArea {
        display:flex;
        flex-direction:column;
        align-items:center;
        justify-content:center;
        gap:4px;
        height:100%;
        width:100%;
        text-align:center;
      }

      .name {
        width:100%;
        font-weight:900;
        font-size:11px;
        line-height:1.15;
        color:#0f172a;
        display:-webkit-box;
        -webkit-line-clamp:2;
        -webkit-box-orient:vertical;
        overflow:hidden;
      }

      .variant {
        width:100%;
        font-weight:800;
        font-size:9px;
        color:#64748b;
        display:-webkit-box;
        -webkit-line-clamp:1;
        -webkit-box-orient:vertical;
        overflow:hidden;
      }

      .barcodeImg{
        height:${Number(barcodeImgHeightPx)}px;
        width:auto;
        max-width:92%;
        object-fit:contain;
        display:block;
        margin:0 auto;
      }

      .batch, .price {
        width:100%;
        font-size:10px;
        font-weight:900;
        line-height:1.1;
        white-space:nowrap;
        overflow:hidden;
        text-overflow:ellipsis;
      }
      .batch { color:#475569; font-weight:800; font-size:9px; }
      .price { color:#0f172a; }

      .no-print { text-align:center; margin-top:14px; color:#64748b; font-weight:900; }
      .btn { border:none; padding:8px 14px; border-radius:12px; font-weight:900; cursor:pointer; margin:0 6px; background:#111827; color:#fff; }
      .btn.ghost { background:#f1f5f9; color:#111827; }
    `;

        const escapeHtml = (s) =>
            String(s || "")
                .replaceAll("&", "&amp;")
                .replaceAll("<", "&lt;")
                .replaceAll(">", "&gt;")
                .replaceAll('"', "&quot;")
                .replaceAll("'", "&#039;");

        const labelsHtml = labels
            .map((l) => {
                const nameHtml = showProductName ? `<div class="name">${escapeHtml(l.productName || "")}</div>` : "";
                const variantHtml = showProductName ? `<div class="variant">${escapeHtml(l.variantName || "")}</div>` : "";

                const batchHtml = showBatchNo
                    ? `<div class="batch">${l.batchNo ? `Batch: ${escapeHtml(l.batchNo)}` : "Batch: -"}</div>`
                    : "";

                const priceHtml = showSalePrice
                    ? `<div class="price">${l.salePrice ? `৳${Number(l.salePrice).toFixed(2)}` : "-"}</div>`
                    : "";

                return `
          <div class="label">
            <div class="barcodeArea">
              ${nameHtml}
              ${variantHtml}
              <img class="barcodeImg" src="${escapeHtml(l.imgSrc)}" alt="Barcode ${escapeHtml(l.codeValue)}" />
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
        <div class="sheet"><div class="grid">${labelsHtml}</div></div>

        <div class="no-print">
          Total: ${labels.length} labels
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

        closeBulkModal();
    };

    // ====== Sticky column helper classes ======
    const stickyLeftTh = "sticky left-0 z-30 bg-[#1e4d2b]";
    const stickyRightTh = "sticky right-0 z-30 bg-[#1e4d2b]";
    const stickyLeftTd = "sticky left-0 z-20 bg-white";
    const stickyRightTd = "sticky right-0 z-20 bg-white";
    const stickyShadowLeft = "shadow-[6px_0_10px_-10px_rgba(0,0,0,0.4)]";
    const stickyShadowRight = "shadow-[-6px_0_10px_-10px_rgba(0,0,0,0.4)]";

    return (
        <div className={`bg-white rounded-box p-5 ${locale === "bn" ? "bangla-font" : ""}`}>
            {/* ✅ Bulk Barcode Settings Modal */}
            {showBulkBarcodeModal && (
                <div className="fixed inset-0 bg-black/30 flex items-start justify-center z-50 p-4 overflow-y-auto">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mt-16 border border-gray-100">
                        <div className="p-6">
                            <div className="flex items-center justify-between gap-3 mb-4">
                                <div>
                                    <h3 className="text-xl font-black text-gray-900 flex items-center gap-2">
                                        <Barcode size={20} className="text-primary" />
                                        Bulk Barcode Print
                                    </h3>
                                    <p className="text-xs text-gray-500 font-bold">
                                        Selected: <span className="text-gray-900">{selectedCount}</span> barcode(s)
                                    </p>
                                </div>
                                <button onClick={closeBulkModal} className="btn btn-ghost btn-circle btn-sm">
                                    <X size={18} />
                                </button>
                            </div>

                            <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                                <div className="text-[11px] font-black uppercase tracking-widest text-gray-500 mb-2 flex items-center gap-2">
                                    <Layers size={14} />
                                    Label Content
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    <label className="flex items-center gap-2 p-2 bg-white rounded-lg border border-gray-100 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={barcodeConfig.showProductName}
                                            onChange={(e) => updateBarcodeConfig("showProductName", e.target.checked)}
                                            className="checkbox checkbox-sm"
                                        />
                                        <span className="font-black text-sm">Product Name</span>
                                    </label>

                                    <label className="flex items-center gap-2 p-2 bg-white rounded-lg border border-gray-100 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={barcodeConfig.showBatchNo}
                                            onChange={(e) => updateBarcodeConfig("showBatchNo", e.target.checked)}
                                            className="checkbox checkbox-sm"
                                        />
                                        <span className="font-black text-sm">Batch No</span>
                                    </label>

                                    <label className="flex items-center gap-2 p-2 bg-white rounded-lg border border-gray-100 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={barcodeConfig.showSalePrice}
                                            onChange={(e) => updateBarcodeConfig("showSalePrice", e.target.checked)}
                                            className="checkbox checkbox-sm"
                                        />
                                        <span className="font-black text-sm">Sale Price</span>
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
                                            className={`btn btn-sm flex-1 ${barcodeConfig.align === "left" ? "btn-primary" : "btn-outline"
                                                }`}
                                        >
                                            <AlignLeft size={16} /> Left
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => updateBarcodeConfig("align", "right")}
                                            className={`btn btn-sm flex-1 ${barcodeConfig.align === "right" ? "btn-primary" : "btn-outline"
                                                }`}
                                        >
                                            <AlignRight size={16} /> Right
                                        </button>
                                    </div>
                                </div>

                                <div className="rounded-xl border border-gray-100 p-4">
                                    <div className="text-[11px] font-black uppercase tracking-widest text-gray-500 mb-2">Copies</div>

                                    <div className="flex flex-col gap-2">
                                        <label className="flex items-center gap-2 font-black text-sm cursor-pointer">
                                            <input
                                                type="radio"
                                                name="copiesMode"
                                                checked={barcodeConfig.copiesMode === "one"}
                                                onChange={() => updateBarcodeConfig("copiesMode", "one")}
                                            />
                                            One label
                                        </label>

                                        <label className="flex items-center gap-2 font-black text-sm cursor-pointer">
                                            <input
                                                type="radio"
                                                name="copiesMode"
                                                checked={barcodeConfig.copiesMode === "byQty"}
                                                onChange={() => updateBarcodeConfig("copiesMode", "byQty")}
                                            />
                                            By quantity
                                        </label>

                                        <label className="flex items-center gap-2 font-black text-sm cursor-pointer">
                                            <input
                                                type="radio"
                                                name="copiesMode"
                                                checked={barcodeConfig.copiesMode === "fixed"}
                                                onChange={() => updateBarcodeConfig("copiesMode", "fixed")}
                                            />
                                            Fixed
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

                            <div className="mt-3 grid grid-cols-1 sm:grid-cols-4 gap-3">
                                <div className="rounded-xl border border-gray-100 p-4">
                                    <div className="text-[11px] font-black uppercase tracking-widest text-gray-500 mb-2">W (mm)</div>
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
                                    <div className="text-[11px] font-black uppercase tracking-widest text-gray-500 mb-2">H (mm)</div>
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

                                <div className="rounded-xl border border-gray-100 p-4">
                                    <div className="text-[11px] font-black uppercase tracking-widest text-gray-500 mb-2">Img (px)</div>
                                    <input
                                        type="number"
                                        min="20"
                                        step="1"
                                        value={barcodeConfig.barcodeImgHeightPx}
                                        onChange={(e) => updateBarcodeConfig("barcodeImgHeightPx", e.target.value)}
                                        className="input input-sm input-bordered font-mono w-full"
                                    />
                                </div>
                            </div>

                            <div className="mt-4 flex gap-2">
                                <button type="button" onClick={closeBulkModal} className="btn btn-ghost flex-1">
                                    Cancel
                                </button>
                                <button type="button" onClick={handleBulkBarcodePrint} className="btn btn-primary flex-1">
                                    <Printer size={18} />
                                    Print Barcodes
                                </button>
                            </div>

                            <div className="mt-3 text-xs text-gray-500">
                                <div className="font-bold">Note:</div>
                                <div>Uses tec-it.com barcode service. Make sure your browser allows images from external sources.</div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <PageHeader title={t("product.product_list", "Product List")} subtitle={t("product.subtitle", "Manage your all products from here.")}>
                <div className="flex items-center gap-2 flex-wrap">
                    {/* Filter Toggle Button */}
                    <button
                        onClick={toggleFilters}
                        className={`btn btn-sm ${showFilters ? 'bg-[#1e4d2b] text-white' : 'btn-outline'}`}
                    >
                        <Filter size={15} />
                        {t('product.filters', 'Filters')}
                        {hasActiveFilters() && (
                            <span className="badge badge-sm bg-white text-[#1e4d2b] ml-1">
                                {t('product.active', 'Active')}
                            </span>
                        )}
                        {showFilters ? <ChevronUp size={15} className="ml-1" /> : <ChevronDown size={15} className="ml-1" />}
                    </button>

                    {/* Download Dropdown */}
                    {/* <div className="dropdown dropdown-end d-none">
                        <button
                            className="btn bg-green-600 text-white btn-sm"
                            disabled={isDownloading}
                            tabIndex={0}
                        >
                            <Download size={14} />
                            {isDownloading
                                ? t('product.downloading', 'Downloading...')
                                : t('product.download_report', 'Download Report')}
                        </button>
                        <ul tabIndex={0} className="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-48">
                            <li>
                                <button 
                                    onClick={async () => {
                                        try {
                                            await downloadCSV();
                                        } catch (error) {
                                            if (window.confirm('Export endpoint unavailable. Do you want to export only the current page data?')) {
                                                fallbackExportWithPaginatedData();
                                            }
                                        }
                                    }} 
                                    className="btn btn-ghost btn-sm w-full text-left"
                                >
                                    <FileText size={14} />
                                    {t('product.csv_format', 'CSV Format')}
                                </button>
                            </li>
                            <li>
                                <button 
                                    onClick={async () => {
                                        try {
                                            await downloadExcel();
                                        } catch (error) {
                                            if (window.confirm('Export endpoint unavailable. Do you want to export only the current page data?')) {
                                                toast.warning('Excel export with paginated data is not available. Please fix the export endpoint.');
                                            }
                                        }
                                    }} 
                                    className="btn btn-ghost btn-sm w-full text-left"
                                >
                                    <FileSpreadsheet size={14} />
                                    {t('product.excel_format', 'Excel Format')}
                                </button>
                            </li>
                            <li>
                                <button 
                                    onClick={async () => {
                                        try {
                                            await downloadPDF();
                                        } catch (error) {
                                            if (window.confirm('Export endpoint unavailable. Do you want to export only the current page data?')) {
                                                toast.warning('PDF export with paginated data is not available. Please fix the export endpoint.');
                                            }
                                        }
                                    }} 
                                    className="btn btn-ghost btn-sm w-full text-left"
                                >
                                    <FileJson size={14} />
                                    {t('product.pdf_format', 'PDF Format')}
                                </button>
                            </li>
                        </ul>
                    </div> */}

                    <button onClick={() => router.visit(route("product.add"))} className="btn bg-[#1e4d2b] text-white btn-sm">
                        <Plus size={15} /> {t("product.add_new", "Add New")}
                    </button>

                    {selectedCount > 0 && (
                        <>
                            <button type="button" onClick={openBulkModal} className="btn btn-sm bg-primary text-white">
                                <Printer size={14} />
                                Print ({selectedCount})
                            </button>
                            <button type="button" onClick={clearSelectedBarcodes} className="btn btn-sm btn-outline font-black" title="Clear selection">
                                <X size={16} /> Clear
                            </button>
                        </>
                    )}
                </div>
            </PageHeader>

            {/* Collapsible Filter Card - Matching the exact design from reference */}
            <div className="bg-base-100 rounded-box border border-base-content/5 mb-6 overflow-hidden">
                {showFilters && (
                    <div className="p-4 border-t border-base-content/5">
                        <form onSubmit={handleFilter}>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                                {/* Search */}
                                <div className="form-control">
                                    <label className="label">
                                        <span className="label-text font-medium">
                                            {t('product.search', 'Search')}
                                        </span>
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            name="search"
                                            value={data.search}
                                            onChange={(e) => handleFilterChange("search", e.target.value)}
                                            onKeyPress={handleKeyPress}
                                            placeholder={t(
                                                "product.search_placeholder",
                                                "Search by product name or code...",
                                            )}
                                            className="input input-sm input-bordered w-full"
                                        />
                                    </div>
                                </div>

                                {/* Brand Filter */}
                                <div className="form-control">
                                    <label className="label">
                                        <span className="label-text font-medium">
                                            {t('product.brand', 'Brand')}
                                        </span>
                                    </label>
                                    <select
                                        value={data.brand_id}
                                        onChange={(e) => handleFilterChange("brand_id", e.target.value)}
                                        className="select select-sm select-bordered w-full"
                                    >
                                        <option value="">{t('product.all_brands', 'All Brands')}</option>
                                        {brands?.map((brand) => (
                                            <option key={brand.id} value={brand.id}>
                                                {brand.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Category Filter */}
                                <div className="form-control">
                                    <label className="label">
                                        <span className="label-text font-medium">
                                            {t('product.category', 'Category')}
                                        </span>
                                    </label>
                                    <select
                                        value={data.category_id}
                                        onChange={(e) => handleFilterChange("category_id", e.target.value)}
                                        className="select select-sm select-bordered w-full"
                                    >
                                        <option value="">{t('product.all_categories', 'All Categories')}</option>
                                        {categories?.map((category) => (
                                            <option key={category.id} value={category.id}>
                                                {category.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Start Date */}
                                <div className="form-control">
                                    <label className="label">
                                        <span className="label-text font-medium">
                                            {t('product.start_date', 'Start Date')}
                                        </span>
                                    </label>
                                    <div className="relative">
                                        <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                        <input
                                            type="date"
                                            name="start_date"
                                            value={data.start_date}
                                            onChange={(e) => handleFilterChange("start_date", e.target.value)}
                                            className="input input-sm input-bordered w-full pl-8"
                                        />
                                    </div>
                                </div>

                                {/* End Date */}
                                <div className="form-control">
                                    <label className="label">
                                        <span className="label-text font-medium">
                                            {t('product.end_date', 'End Date')}
                                        </span>
                                    </label>
                                    <div className="relative">
                                        <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                        <input
                                            type="date"
                                            name="end_date"
                                            value={data.end_date}
                                            onChange={(e) => handleFilterChange("end_date", e.target.value)}
                                            min={data.start_date}
                                            className="input input-sm input-bordered w-full pl-8"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Active Filters Display */}
                            {hasActiveFilters() && (
                                <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-gray-600">
                                    <span className="font-medium">
                                        {t('product.active_filters', 'Active Filters:')}
                                    </span>
                                    {localFilters.search && (
                                        <span className="badge badge-outline badge-sm flex items-center gap-1">
                                            {t('product.search', 'Search')}: {localFilters.search}
                                            <button
                                                onClick={() => {
                                                    setData('search', '');
                                                    handleFilter();
                                                }}
                                                className="ml-1 hover:text-red-600"
                                            >
                                                <X size={12} />
                                            </button>
                                        </span>
                                    )}
                                    {localFilters.brand_id && (
                                        <span className="badge badge-outline badge-sm flex items-center gap-1">
                                            {t('product.brand', 'Brand')}: {brands?.find(b => b.id == localFilters.brand_id)?.name}
                                            <button
                                                onClick={() => {
                                                    setData('brand_id', '');
                                                    handleFilter();
                                                }}
                                                className="ml-1 hover:text-red-600"
                                            >
                                                <X size={12} />
                                            </button>
                                        </span>
                                    )}
                                    {localFilters.category_id && (
                                        <span className="badge badge-outline badge-sm flex items-center gap-1">
                                            {t('product.category', 'Category')}: {categories?.find(c => c.id == localFilters.category_id)?.name}
                                            <button
                                                onClick={() => {
                                                    setData('category_id', '');
                                                    handleFilter();
                                                }}
                                                className="ml-1 hover:text-red-600"
                                            >
                                                <X size={12} />
                                            </button>
                                        </span>
                                    )}
                                    {localFilters.start_date && (
                                        <span className="badge badge-outline badge-sm flex items-center gap-1">
                                            {t('product.from', 'From')}: {formatDisplayDate(localFilters.start_date)}
                                            <button
                                                onClick={() => {
                                                    setData('start_date', '');
                                                    handleFilter();
                                                }}
                                                className="ml-1 hover:text-red-600"
                                            >
                                                <X size={12} />
                                            </button>
                                        </span>
                                    )}
                                    {localFilters.end_date && (
                                        <span className="badge badge-outline badge-sm flex items-center gap-1">
                                            {t('product.to', 'To')}: {formatDisplayDate(localFilters.end_date)}
                                            <button
                                                onClick={() => {
                                                    setData('end_date', '');
                                                    handleFilter();
                                                }}
                                                className="ml-1 hover:text-red-600"
                                            >
                                                <X size={12} />
                                            </button>
                                        </span>
                                    )}
                                </div>
                            )}

                            <div className="mt-4 flex justify-end gap-2">
                                {hasActiveFilters() && (
                                    <button
                                        type="button"
                                        onClick={clearFilters}
                                        className="btn btn-ghost btn-sm"
                                    >
                                        {t('product.clear', 'Clear')}
                                    </button>
                                )}
                                <button
                                    type="submit"
                                    className="btn btn-sm bg-[#1e4d2b] text-white"
                                >
                                    <Search size={14} />
                                    {t('product.apply_filters', 'Apply Filters')}
                                </button>
                            </div>
                        </form>
                    </div>
                )}
            </div>

            {/* ✅ Wrapper: keep horizontal scroll, but sticky first & last columns */}
            <div className="overflow-x-auto rounded-xl border border-gray-100">
                {safeProducts?.length > 0 ? (
                    <table className="table table-auto w-full min-w-[1100px]">
                        <thead className="bg-[#1e4d2b] text-white">
                            <tr>
                                {/* Sticky LEFT: expand toggle */}
                                <th className={`${stickyLeftTh} ${stickyShadowLeft} w-[54px]`}></th>

                                <th>{t("product.product_name", "Product Name")}</th>
                                <th className="w-[140px]">{t("product.category", "Category")}</th>
                                <th className="w-[140px]">{t("product.brand", "Brand")}</th>
                                <th className="w-[140px]">{t("product.total_stock", "Total Stock")}</th>
                                <th className="w-[360px]">{t("product.variants", "Variants")}</th>
                                <th className="w-[360px]">{t("product.barcodes", "Barcodes")}</th>

                                {/* ✅ Sticky RIGHT: actions */}
                                <th className={`${stickyRightTh} ${stickyShadowRight} w-[120px] text-center`}>
                                    {t("product.actions", "Actions")}
                                </th>
                            </tr>
                        </thead>

                        <tbody>
                            {safeProducts.map((productItem) => {
                                const totalStock = calculateTotalStock(productItem);
                                const variantsCount = productItem?.variants?.length || 0;
                                const isExpanded = !!expandedProducts[productItem.id];

                                const totalBarcodes =
                                    productItem?.variants?.reduce((total, v) => total + getVariantBarcodes(v, productItem).length, 0) || 0;

                                return (
                                    <Fragment key={productItem.id}>
                                        <tr className="hover:bg-gray-50">
                                            {/* Sticky LEFT cell */}
                                            <td className={`${stickyLeftTd} ${stickyShadowLeft} w-[54px]`}>
                                                {variantsCount > 1 && (
                                                    <button
                                                        onClick={() => toggleExpand(productItem.id)}
                                                        className="btn btn-ghost btn-xs"
                                                        title={isExpanded ? "Hide variants" : "Show variants"}
                                                    >
                                                        {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                                    </button>
                                                )}
                                            </td>

                                            <td>
                                                <div className="font-medium">
                                                    {productItem.name}
                                                    <span className="text-xs text-gray-500">
                                                        {" "}
                                                        <i>({productItem.product_no})</i>{" "}
                                                    </span>
                                                </div>
                                            </td>

                                            <td>{productItem.category?.name || t("product.not_available", "N/A")}</td>
                                            <td>{productItem.brand?.name || t("product.not_available", "N/A")}</td>

                                            <td>
                                                <div className="flex items-center gap-2">
                                                    <Package size={16} className="text-blue-600" />
                                                    <div>
                                                        <div
                                                            className={`font-bold text-lg ${totalStock === 0 ? "text-error" : totalStock < 10 ? "text-warning" : "text-success"
                                                                }`}
                                                        >
                                                            {totalStock}
                                                        </div>
                                                        <div className="text-xs text-gray-500">{t("product.units", "units")}</div>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Variants */}
                                            <td className="max-w-[360px]">
                                                <div className="flex flex-col gap-2">
                                                    {!isExpanded && variantsCount > 1 && (
                                                        <button
                                                            onClick={() => toggleExpand(productItem.id)}
                                                            className="btn btn-ghost btn-xs w-full text-primary justify-start"
                                                        >
                                                            <ChevronDown size={12} className="mr-1" />
                                                            Show {variantsCount} variants
                                                        </button>
                                                    )}

                                                    {(isExpanded || variantsCount <= 1) &&
                                                        productItem?.variants?.map((variant) => {
                                                            const hasAttributes = variant?.attribute_values && Object.keys(variant.attribute_values).length > 0;
                                                            const variantStock = variant?.stock?.quantity || 0;
                                                            const variantPrice = variant?.stock?.sale_price || 0;
                                                            const barcodes = getVariantBarcodes(variant, productItem);

                                                            return (
                                                                <div
                                                                    key={variant.id}
                                                                    className={`border p-2 rounded text-xs ${hasAttributes ? "border-primary bg-[#1e4d2b] text-white" : "border-dashed border-neutral"
                                                                        }`}
                                                                >
                                                                    <div className="flex justify-between items-start">
                                                                        <div className="flex-1">
                                                                            <div className="font-medium">{formatVariantDisplay(variant)}</div>

                                                                            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs">
                                                                                <span>
                                                                                    {t("product.stock", "Stock")}: {variantStock}
                                                                                </span>
                                                                                {variantPrice > 0 && (
                                                                                    <span>
                                                                                        {t("product.price", "Price")}: {formatCurrency(variantPrice)}
                                                                                    </span>
                                                                                )}
                                                                                {barcodes.length > 0 && (
                                                                                    <span className="flex items-center gap-1">
                                                                                        <Barcode size={10} />
                                                                                        {barcodes.length} barcode(s)
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}

                                                    {isExpanded && variantsCount > 1 && (
                                                        <button
                                                            onClick={() => toggleExpand(productItem.id)}
                                                            className="btn btn-ghost btn-xs w-full text-primary mt-1 justify-start"
                                                        >
                                                            <ChevronRight size={12} className="mr-1" />
                                                            Hide variants
                                                        </button>
                                                    )}
                                                </div>
                                            </td>

                                            {/* Barcodes column */}
                                            <td className="max-w-[360px]">
                                                <div className="flex flex-col gap-2">
                                                    <div className="flex items-center gap-2">
                                                        <Barcode size={14} className="text-blue-600" />
                                                        <span className="text-sm font-bold">
                                                            {totalBarcodes} {totalBarcodes === 1 ? "barcode" : "barcodes"}
                                                        </span>
                                                    </div>

                                                    {totalBarcodes > 0 ? (
                                                        <div className="space-y-2">
                                                            {productItem?.variants?.map((variant) => {
                                                                const barcodes = getVariantBarcodes(variant, productItem);
                                                                if (!barcodes.length) return null;

                                                                const variantName = formatVariantDisplay(variant);

                                                                return (
                                                                    <div key={variant.id} className="border rounded-lg p-2 bg-white">
                                                                        <div className="space-y-1">
                                                                            {barcodes.map((b, idx) => {
                                                                                const isSelected = selectedBarcodeMap.has(b.barcode);

                                                                                const rowForBulk = {
                                                                                    barcode: b.barcode,
                                                                                    batch_no: b.batch_no,
                                                                                    quantity: b.quantity,
                                                                                    purchase_price: b.purchase_price,
                                                                                    sale_price: b.sale_price,
                                                                                    warehouse_id: b.warehouse_id,
                                                                                    variant_id: b.variant_id,
                                                                                    productName: productItem.name,
                                                                                    variantName,
                                                                                };

                                                                                return (
                                                                                    <div
                                                                                        key={`${variant.id}-${b.barcode}-${idx}`}
                                                                                        className={`flex items-center justify-between p-2 rounded text-xs border ${isSelected ? "bg-primary/10 border-primary/20" : "bg-gray-50 border-transparent"
                                                                                            }`}
                                                                                    >
                                                                                        <div className="flex items-center gap-2 min-w-0">
                                                                                            <button
                                                                                                type="button"
                                                                                                onClick={() => toggleSelectBarcode(rowForBulk)}
                                                                                                className="btn btn-ghost btn-xs"
                                                                                                title={isSelected ? "Unselect" : "Select"}
                                                                                            >
                                                                                                {isSelected ? (
                                                                                                    <CheckSquare size={16} className="text-primary" />
                                                                                                ) : (
                                                                                                    <Square size={16} className="text-gray-400" />
                                                                                                )}
                                                                                            </button>

                                                                                            <div className="min-w-0">
                                                                                                <div className="font-mono truncate max-w-[220px]">{b.barcode}</div>
                                                                                                <div className="text-[10px] text-gray-500">
                                                                                                    Batch: {b.batch_no || "N/A"} • Qty: {b.quantity || 0}
                                                                                                </div>
                                                                                            </div>
                                                                                        </div>

                                                                                        <div className="flex gap-1 shrink-0">
                                                                                            <button onClick={() => copyBarcode(b.barcode)} className="btn btn-xs btn-ghost" title="Copy Barcode">
                                                                                                <Copy size={10} />
                                                                                            </button>
                                                                                        </div>
                                                                                    </div>
                                                                                );
                                                                            })}
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    ) : (
                                                        <span className="text-xs text-gray-500 italic">No barcodes assigned</span>
                                                    )}
                                                </div>
                                            </td>

                                            {/* ✅ Sticky RIGHT Actions cell */}
                                            <td className={`${stickyRightTd} ${stickyShadowRight} text-center`}>
                                                <div className="flex items-center justify-center gap-2">
                                                    {/* Desktop icons */}
                                                    <div className="hidden md:flex items-center gap-2">
                                                        <Link
                                                            href={route("product.add", { id: productItem.id })}
                                                            className="btn btn-xs btn-warning"
                                                            title={t("product.edit", "Edit Product")}
                                                        >
                                                            <Pen size={10} />
                                                        </Link>

                                                        <Link
                                                            href={route("product.del", { id: productItem.id })}
                                                            onClick={(e) => {
                                                                if (
                                                                    !confirm(
                                                                        t(
                                                                            "product.delete_confirmation",
                                                                            "Are you sure you want to delete this product? This action cannot be undone."
                                                                        )
                                                                    )
                                                                ) {
                                                                    e.preventDefault();
                                                                }
                                                            }}
                                                            className="btn btn-xs btn-error"
                                                            title={t("product.delete", "Delete Product")}
                                                        >
                                                            <Trash2 size={10} />
                                                        </Link>

                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setSelectedIdentifierProduct(productItem);
                                                                setShowIdentifierModal(true);
                                                            }}
                                                            className="btn btn-xs btn-info text-white"
                                                            title="Show IMEI / Serial"
                                                        >
                                                            <Barcode size={10} />
                                                        </button>
                                                    </div>

                                                    {/* Mobile dropdown */}
                                                    <div className="md:hidden dropdown dropdown-end">
                                                        <button type="button" className="btn btn-xs btn-ghost" title="Actions">
                                                            <MoreVertical size={16} />
                                                        </button>
                                                        <ul className="dropdown-content z-[60] menu p-2 shadow bg-base-100 rounded-box w-44 border border-gray-100">
                                                            <li>
                                                                <Link href={route("product.add", { id: productItem.id })}>
                                                                    <Pen size={14} /> Edit
                                                                </Link>
                                                            </li>
                                                            <li>
                                                                <Link
                                                                    href={route("product.del", { id: productItem.id })}
                                                                    onClick={(e) => {
                                                                        if (!confirm("Delete this product?")) e.preventDefault();
                                                                    }}
                                                                >
                                                                    <Trash2 size={14} /> Delete
                                                                </Link>
                                                            </li>
                                                        </ul>
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>

                                        {/* Expanded variants row */}
                                        {isExpanded && (
                                            <tr>
                                                <td colSpan="8" className="bg-gray-50 p-4">
                                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                                        {productItem?.variants?.map((variant) => {
                                                            const barcodes = getVariantBarcodes(variant, productItem);
                                                            const variantStock = variant?.stock?.quantity || 0;
                                                            const variantPrice = variant?.stock?.sale_price || 0;
                                                            const variantName = formatVariantDisplay(variant);

                                                            return (
                                                                <div key={variant.id} className="border rounded-lg p-3 bg-white">
                                                                    <div className="font-medium mb-2">{variantName}</div>

                                                                    <div className="grid grid-cols-2 gap-2 mb-3">
                                                                        <div className="text-sm">
                                                                            <div className="text-gray-600">Stock</div>
                                                                            <div className="font-bold">{variantStock}</div>
                                                                        </div>
                                                                        <div className="text-sm">
                                                                            <div className="text-gray-600">Price</div>
                                                                            <div className="font-bold">{formatCurrency(variantPrice)}</div>
                                                                        </div>
                                                                    </div>

                                                                    {barcodes.length > 0 ? (
                                                                        <div>
                                                                            <div className="text-sm font-medium mb-2 flex items-center gap-2">
                                                                                <Barcode size={12} />
                                                                                Barcodes ({barcodes.length})
                                                                            </div>

                                                                            <div className="space-y-1">
                                                                                {barcodes.map((barcodeData, index) => {
                                                                                    const isSelected = selectedBarcodeMap.has(barcodeData.barcode);

                                                                                    const rowForBulk = {
                                                                                        barcode: barcodeData.barcode,
                                                                                        batch_no: barcodeData.batch_no,
                                                                                        quantity: barcodeData.quantity,
                                                                                        purchase_price: barcodeData.purchase_price,
                                                                                        sale_price: barcodeData.sale_price,
                                                                                        warehouse_id: barcodeData.warehouse_id,
                                                                                        variant_id: barcodeData.variant_id,
                                                                                        productName: productItem.name,
                                                                                        variantName,
                                                                                    };

                                                                                    return (
                                                                                        <div
                                                                                            key={`${variant.id}-${barcodeData.barcode}-${index}`}
                                                                                            className={`flex items-center justify-between p-2 rounded text-xs border ${isSelected ? "bg-primary/10 border-primary/20" : "bg-gray-50 border-transparent"
                                                                                                }`}
                                                                                        >
                                                                                            <div className="flex items-center gap-2">
                                                                                                <button
                                                                                                    type="button"
                                                                                                    onClick={() => toggleSelectBarcode(rowForBulk)}
                                                                                                    className="btn btn-ghost btn-xs"
                                                                                                >
                                                                                                    {isSelected ? (
                                                                                                        <CheckSquare size={16} className="text-primary" />
                                                                                                    ) : (
                                                                                                        <Square size={16} className="text-gray-400" />
                                                                                                    )}
                                                                                                </button>

                                                                                                <div className="min-w-0">
                                                                                                    <div className="font-mono truncate max-w-[220px]">{barcodeData.barcode}</div>
                                                                                                    <div className="text-gray-500">Batch: {barcodeData.batch_no || "N/A"}</div>
                                                                                                </div>
                                                                                            </div>

                                                                                            <div className="flex gap-1">
                                                                                                <button onClick={() => copyBarcode(barcodeData.barcode)} className="btn btn-xs btn-ghost">
                                                                                                    <Copy size={10} />
                                                                                                </button>
                                                                                            </div>
                                                                                        </div>
                                                                                    );
                                                                                })}
                                                                            </div>
                                                                        </div>
                                                                    ) : (
                                                                        <div className="text-sm text-gray-500 italic">No barcodes for this variant</div>
                                                                    )}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </Fragment>
                                );
                            })}
                        </tbody>
                    </table>
                ) : (
                    <div className="border border-gray-200 rounded-box px-5 py-10 flex flex-col justify-center items-center gap-2">
                        <Frown size={20} className="text-gray-500" />
                        <h1 className="text-gray-500 text-sm">{t("product.no_products_found", "No products found!")}</h1>
                    </div>
                )}
            </div>

            {showIdentifierModal && selectedIdentifierProduct && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[85vh] overflow-hidden border border-gray-100">
                        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                            <div>
                                <h3 className="text-lg font-black text-gray-900 flex items-center gap-2">
                                    <Barcode size={18} className="text-primary" />
                                    IMEI / Serial Numbers
                                </h3>
                                <p className="text-xs text-gray-500 font-medium mt-1">
                                    {selectedIdentifierProduct.name} ({selectedIdentifierProduct.product_no})
                                </p>
                            </div>

                            <button
                                onClick={() => {
                                    setShowIdentifierModal(false);
                                    setSelectedIdentifierProduct(null);
                                }}
                                className="btn btn-ghost btn-circle btn-sm"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto max-h-[70vh]">
                            {getAllIdentifiersForProduct(selectedIdentifierProduct).length > 0 ? (
                                <div className="overflow-x-auto rounded-xl border border-gray-200">
                                    <table className="table w-full">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th>#</th>
                                                <th>Type</th>
                                                <th>IMEI / Serial</th>
                                                <th>Variant</th>
                                                <th>Batch</th>
                                                <th>Barcode</th>
                                                <th>Status</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {getAllIdentifiersForProduct(selectedIdentifierProduct).map((row, index) => (
                                                <tr key={`${row.id}-${index}`} className="hover:bg-gray-50">
                                                    <td>{index + 1}</td>
                                                    <td>
                                                        <span className="badge badge-outline">
                                                            {row.identifier_type}
                                                        </span>
                                                    </td>
                                                    <td className="font-mono text-sm font-bold">
                                                        {row.identifier_value}
                                                    </td>
                                                    <td>{row.variant_name}</td>
                                                    <td>{row.batch_no}</td>
                                                    <td className="font-mono text-xs">{row.barcode}</td>
                                                    <td>
                                                        <span
                                                            className={`badge ${row.status === "sold"
                                                                ? "badge-error"
                                                                : row.status === "available"
                                                                    ? "badge-success"
                                                                    : "badge-warning"
                                                                }`}
                                                        >
                                                            {row.status}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="py-12 text-center">
                                    <Barcode size={32} className="mx-auto text-gray-300 mb-3" />
                                    <p className="text-gray-500 font-medium">No IMEI / Serial found</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
            <Pagination data={product} />

            {hasActiveFilters() && summary && (
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="rounded-xl border border-gray-200 bg-white p-4">
                        <div className="text-xs text-gray-500 font-medium">
                            {t('product.filtered_data_count', 'Filtered Data Count')}
                        </div>
                        <div className="text-xl font-bold text-[#1e4d2b] mt-1">
                            {summary.count || 0}
                        </div>
                    </div>

                    <div className="rounded-xl border border-gray-200 bg-white p-4">
                        <div className="text-xs text-gray-500 font-medium">
                            {t('product.sale_price_total', 'Sale Price Total')}
                        </div>
                        <div className="text-xl font-bold text-[#1e4d2b] mt-1">
                            {formatCurrency(summary.sale_price_total || 0)}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}