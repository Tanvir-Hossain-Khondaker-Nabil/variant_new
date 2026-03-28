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
    DollarSign,
    User,
    FileText as FileTextIcon,
    TrendingUp,
    TrendingDown,
    PieChart,
    BarChart,
    Clock,
    Edit,
    Eye,
    CreditCard,
    Home,
    Briefcase,
    Coffee,
    Car,
    ShoppingBag,
    Gift,
    Heart,
    Zap,
    Cloud,
    AlertCircle,
} from "lucide-react";
import React, { Fragment, useMemo, useState, useEffect } from "react";
import { useTranslation } from "../../hooks/useTranslation";
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { toast } from "react-toastify";
import axios from 'axios';

export default function Expense({ expenses, filters }) {
    const { auth } = usePage().props;
    const { t, locale } = useTranslation();
    const [showFilters, setShowFilters] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [selectedExpense, setSelectedExpense] = useState(null);
    const [showStats, setShowStats] = useState(false);

    const safeExpenses = expenses?.data || [];

    // Form state for filters
    const { data, setData } = useForm({
        search: filters?.search || "",
        start_date: filters?.start_date || "",
        end_date: filters?.end_date || "",
    });

    // Local filter state for UI
    const [localFilters, setLocalFilters] = useState({
        search: filters?.search || "",
        start_date: filters?.start_date || "",
        end_date: filters?.end_date || "",
    });

    // Update local filters when data changes
    useEffect(() => {
        setLocalFilters({
            search: data.search,
            start_date: data.start_date,
            end_date: data.end_date,
        });
    }, [data]);

    // Calculate expense statistics
    const expenseStats = useMemo(() => {
        if (!safeExpenses.length) {
            return {
                totalExpenses: 0,
                averageExpense: 0,
                maxExpense: 0,
                minExpense: 0,
                categoryBreakdown: {},
                monthlyTrend: {},
                recentExpenses: [],
            };
        }

        const total = safeExpenses.reduce((sum, exp) => sum + (parseFloat(exp.amount) || 0), 0);
        const amounts = safeExpenses.map(exp => parseFloat(exp.amount) || 0);
        const maxAmount = Math.max(...amounts, 0);
        const minAmount = Math.min(...amounts, 0);

        // Category breakdown
        const categoryBreakdown = {};
        safeExpenses.forEach(exp => {
            const categoryName = exp.category?.name || 'Uncategorized';
            if (!categoryBreakdown[categoryName]) {
                categoryBreakdown[categoryName] = {
                    count: 0,
                    total: 0,
                };
            }
            categoryBreakdown[categoryName].count++;
            categoryBreakdown[categoryName].total += parseFloat(exp.amount) || 0;
        });

        // Monthly trend
        const monthlyTrend = {};
        safeExpenses.forEach(exp => {
            if (exp.created_at) {
                const date = new Date(exp.created_at);
                const monthYear = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                if (!monthlyTrend[monthYear]) {
                    monthlyTrend[monthYear] = 0;
                }
                monthlyTrend[monthYear] += parseFloat(exp.amount) || 0;
            }
        });

        // Sort by month
        const sortedMonthlyTrend = Object.keys(monthlyTrend)
            .sort()
            .reduce((acc, key) => {
                acc[key] = monthlyTrend[key];
                return acc;
            }, {});

        return {
            totalExpenses: total,
            averageExpense: amounts.length ? total / amounts.length : 0,
            maxExpense: maxAmount,
            minExpense: minAmount,
            categoryBreakdown,
            monthlyTrend: sortedMonthlyTrend,
            totalCount: safeExpenses.length,
        };
    }, [safeExpenses]);

    const handleFilter = (e) => {
        e?.preventDefault();

        const params = {};
        if (data.search) params.search = data.search;
        if (data.start_date) params.start_date = data.start_date;
        if (data.end_date) params.end_date = data.end_date;

        router.get(route("reports.expense"), params, {
            preserveScroll: true,
            preserveState: true,
            replace: true,
        });
    };

    const handleFilterChange = (field, value) => {
        setData(field, value);
    };

    const clearFilters = () => {
        setData({ search: "", start_date: "", end_date: "" });

        router.get(route("reports.expense"), {}, {
            preserveScroll: true,
            preserveState: true,
            replace: true,
        });
    };

    const toggleFilters = () => {
        setShowFilters(!showFilters);
    };

    const toggleStats = () => {
        setShowStats(!showStats);
    };

    const hasActiveFilters = () => {
        return localFilters.search || localFilters.start_date || localFilters.end_date;
    };

    const handleKeyPress = (e) => {
        if (e.key === "Enter") {
            handleFilter(e);
        }
    };

    const formatDateForInput = (dateString) => {
        if (!dateString) return '';
        return dateString;
    };

    const formatDisplayDate = (dateString) => {
        if (!dateString) return '';
        return new Date(dateString).toLocaleDateString();
    };

    const formatDateForFilename = () => {
        const now = new Date();
        return now.toISOString().split('T')[0] + '_' +
            now.getHours() + '-' +
            now.getMinutes() + '-' +
            now.getSeconds();
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat("en-IN", { style: "currency", currency: "BDT" }).format(amount || 0);
    };

    const formatDateTime = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleString();
    };

    const getCategoryIcon = (categoryName) => {
        const icons = {
            'Rent': Home,
            'Utilities': Zap,
            'Salary': Briefcase,
            'Office Supplies': Package,
            'Travel': Car,
            'Meals': Coffee,
            'Entertainment': Gift,
            'Healthcare': Heart,
            'Marketing': TrendingUp,
            'Software': Cloud,
        };
        return icons[categoryName] || DollarSign;
    };

    const getCategoryColor = (categoryName) => {
        const colors = {
            'Rent': 'bg-blue-100 text-blue-600',
            'Utilities': 'bg-yellow-100 text-yellow-600',
            'Salary': 'bg-green-100 text-green-600',
            'Office Supplies': 'bg-purple-100 text-purple-600',
            'Travel': 'bg-indigo-100 text-indigo-600',
            'Meals': 'bg-orange-100 text-orange-600',
            'Entertainment': 'bg-pink-100 text-pink-600',
            'Healthcare': 'bg-red-100 text-red-600',
            'Marketing': 'bg-cyan-100 text-cyan-600',
            'Software': 'bg-gray-100 text-gray-600',
        };
        return colors[categoryName] || 'bg-gray-100 text-gray-600';
    };

    const handleViewDetails = (expense) => {
        setSelectedExpense(expense);
        setShowDetailsModal(true);
    };

    const closeDetailsModal = () => {
        setShowDetailsModal(false);
        setSelectedExpense(null);
    };

    // Fetch all expenses for export
    const fetchAllExpensesForExport = async () => {
        try {
            const response = await axios.get(route('reports.expense.export'), {
                params: {
                    search: localFilters.search,
                    start_date: localFilters.start_date,
                    end_date: localFilters.end_date
                }
            });
            
            console.log('Export response:', response.data);
            
            if (response.data && response.data.expenses) {
                return response.data.expenses;
            } else if (response.data && Array.isArray(response.data)) {
                return response.data;
            } else {
                throw new Error('Invalid response format from server');
            }
        } catch (error) {
            console.error('Error fetching all expenses:', error);
            
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
    const prepareExportData = (expensesData) => {
        return expensesData.map(expense => ({
            'Expense Name': expense.details || 'N/A',
            'Category': expense.category?.name || 'N/A',
            'Amount': expense.amount || 0,
            'Created By': expense.creator?.name || 'N/A',
            'Created At': expense.created_at ? new Date(expense.created_at).toLocaleDateString() : 'N/A',
            'Last Updated': expense.updated_at ? new Date(expense.updated_at).toLocaleDateString() : 'N/A',
        }));
    };

    // Calculate summary statistics for export data
    const calculateExportStats = (expensesData) => {
        const total = expensesData.reduce((sum, exp) => sum + (parseFloat(exp.amount) || 0), 0);
        const amounts = expensesData.map(exp => parseFloat(exp.amount) || 0);
        const avg = amounts.length ? total / amounts.length : 0;
        const max = Math.max(...amounts, 0);
        const min = Math.min(...amounts, 0);
        
        // Category breakdown
        const categoryBreakdown = {};
        expensesData.forEach(exp => {
            const categoryName = exp.category?.name || 'Uncategorized';
            if (!categoryBreakdown[categoryName]) {
                categoryBreakdown[categoryName] = {
                    count: 0,
                    total: 0,
                };
            }
            categoryBreakdown[categoryName].count++;
            categoryBreakdown[categoryName].total += parseFloat(exp.amount) || 0;
        });
        
        return {
            totalCount: expensesData.length,
            totalAmount: total,
            averageAmount: avg,
            maxAmount: max,
            minAmount: min,
            categoryBreakdown,
        };
    };

    // Download as CSV
    const downloadCSV = async () => {
        try {
            setIsDownloading(true);
            
            // Fetch all expenses using export endpoint
            const allExpenses = await fetchAllExpensesForExport();
            
            if (allExpenses.length === 0) {
                toast.warning(t('expense.no_data_export', 'No data to export'));
                return;
            }

            const exportData = prepareExportData(allExpenses);
            const stats = calculateExportStats(allExpenses);

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

            // Add filter information
            csvRows.push('');
            csvRows.push('FILTER INFORMATION');
            csvRows.push(`Search,${localFilters.search || 'None'}`);
            csvRows.push(`Date From,${localFilters.start_date || 'None'}`);
            csvRows.push(`Date To,${localFilters.end_date || 'None'}`);

            // Add summary statistics
            csvRows.push('');
            csvRows.push('SUMMARY STATISTICS');
            csvRows.push(`Total Expenses,${stats.totalCount}`);
            csvRows.push(`Total Amount,${stats.totalAmount}`);
            csvRows.push(`Average Amount,${stats.averageAmount.toFixed(2)}`);
            csvRows.push(`Maximum Amount,${stats.maxAmount}`);
            csvRows.push(`Minimum Amount,${stats.minAmount}`);

            // Add category breakdown
            csvRows.push('');
            csvRows.push('CATEGORY BREAKDOWN');
            Object.entries(stats.categoryBreakdown).forEach(([category, data]) => {
                const percentage = ((data.total / stats.totalAmount) * 100).toFixed(1);
                csvRows.push(`${category},Count: ${data.count},Total: ${data.total},Percentage: ${percentage}%`);
            });

            const csvString = csvRows.join('\n');

            const blob = new Blob(["\uFEFF" + csvString], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.href = url;
            link.download = `expense_report_${formatDateForFilename()}.csv`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            toast.success(`${allExpenses.length} expenses exported successfully to CSV`);
        } catch (error) {
            console.error('Error downloading CSV:', error);
            toast.error(t('expense.csv_download_failed', 'Failed to download CSV'));
        } finally {
            setIsDownloading(false);
        }
    };

    // Download as Excel
    const downloadExcel = async () => {
        try {
            setIsDownloading(true);
            
            // Fetch all expenses using export endpoint
            const allExpenses = await fetchAllExpensesForExport();
            
            if (allExpenses.length === 0) {
                toast.warning(t('expense.no_data_export', 'No data to export'));
                return;
            }

            const exportData = prepareExportData(allExpenses);
            const stats = calculateExportStats(allExpenses);

            const wb = XLSX.utils.book_new();
            const ws = XLSX.utils.json_to_sheet(exportData);

            // Add filter information sheet
            const filterData = [
                { 'Filter': 'Search', 'Value': localFilters.search || 'None' },
                { 'Filter': 'Date From', 'Value': localFilters.start_date || 'None' },
                { 'Filter': 'Date To', 'Value': localFilters.end_date || 'None' }
            ];
            const wsFilters = XLSX.utils.json_to_sheet(filterData);

            // Add summary statistics sheet
            const summaryData = [
                { 'Metric': 'Total Expenses', 'Value': stats.totalCount },
                { 'Metric': 'Total Amount', 'Value': stats.totalAmount },
                { 'Metric': 'Average Amount', 'Value': stats.averageAmount.toFixed(2) },
                { 'Metric': 'Maximum Amount', 'Value': stats.maxAmount },
                { 'Metric': 'Minimum Amount', 'Value': stats.minAmount },
            ];
            const wsSummary = XLSX.utils.json_to_sheet(summaryData);

            // Add category breakdown sheet
            const categoryData = Object.entries(stats.categoryBreakdown).map(([category, data]) => {
                const percentage = ((data.total / stats.totalAmount) * 100).toFixed(1);
                return {
                    'Category': category,
                    'Count': data.count,
                    'Total Amount': data.total,
                    'Percentage': percentage + '%',
                };
            });
            const wsCategory = XLSX.utils.json_to_sheet(categoryData);

            XLSX.utils.book_append_sheet(wb, ws, 'Expenses');
            XLSX.utils.book_append_sheet(wb, wsFilters, 'Filters Applied');
            XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');
            XLSX.utils.book_append_sheet(wb, wsCategory, 'Category Breakdown');

            XLSX.writeFile(wb, `expense_report_${formatDateForFilename()}.xlsx`);

            toast.success(`${allExpenses.length} expenses exported successfully to Excel`);
        } catch (error) {
            console.error('Error downloading Excel:', error);
            toast.error(t('expense.excel_download_failed', 'Failed to download Excel file'));
        } finally {
            setIsDownloading(false);
        }
    };

    // Download as PDF
    const downloadPDF = async () => {
        try {
            setIsDownloading(true);
            
            // Fetch all expenses using export endpoint
            const allExpenses = await fetchAllExpensesForExport();
            
            if (allExpenses.length === 0) {
                toast.warning(t('expense.no_data_export', 'No data to export'));
                return;
            }

            const exportData = prepareExportData(allExpenses);
            const stats = calculateExportStats(allExpenses);

            const doc = new jsPDF({
                orientation: 'landscape',
                unit: 'mm',
                format: 'a4'
            });

            // Title
            doc.setFontSize(16);
            doc.setTextColor(220, 38, 38); // Red color for expenses
            doc.text(t('expense.expense_report', 'Expense Report'), 14, 15);

            // Generation date
            doc.setFontSize(10);
            doc.setTextColor(100, 100, 100);
            doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 22);

            // Filter information
            doc.setFontSize(9);
            doc.setTextColor(80, 80, 80);
            let filterY = 29;
            doc.text(`Search: ${localFilters.search || 'None'}`, 14, filterY);
            filterY += 5;
            doc.text(`Date Range: ${formatDisplayDate(localFilters.start_date) || 'Start'} to ${formatDisplayDate(localFilters.end_date) || 'End'}`, 14, filterY);
            filterY += 5;

            // Table columns
            const tableColumns = [
                'Expense Name',
                'Category',
                'Amount',
                'Created By',
                'Date'
            ];

            const tableRows = exportData.slice(0, 50).map(item => [
                item['Expense Name'].substring(0, 25) + (item['Expense Name'].length > 25 ? '...' : ''),
                item['Category'].substring(0, 15),
                formatCurrency(item['Amount']),
                item['Created By'].substring(0, 15),
                item['Created At']
            ]);

            autoTable(doc, {
                head: [tableColumns],
                body: tableRows,
                startY: filterY + 5,
                theme: 'grid',
                styles: { fontSize: 8, cellPadding: 2 },
                headStyles: { fillColor: [220, 38, 38], textColor: [255, 255, 255] },
                alternateRowStyles: { fillColor: [255, 245, 245] },
                columnStyles: {
                    2: { halign: 'right' } // Amount column right-aligned
                }
            });

            // Summary statistics
            const finalY = doc.lastAutoTable.finalY + 10;

            doc.setFontSize(14);
            doc.setTextColor(220, 38, 38);
            doc.text(t('expense.summary_statistics', 'Summary Statistics'), 14, finalY);

            doc.setFontSize(10);
            doc.setTextColor(0, 0, 0);
            doc.text(`Total Expenses: ${stats.totalCount}`, 14, finalY + 7);
            doc.text(`Total Amount: ${formatCurrency(stats.totalAmount)}`, 14, finalY + 14);
            doc.text(`Average Amount: ${formatCurrency(stats.averageAmount)}`, 14, finalY + 21);
            doc.text(`Maximum Amount: ${formatCurrency(stats.maxAmount)}`, 14, finalY + 28);
            doc.text(`Minimum Amount: ${formatCurrency(stats.minAmount)}`, 14, finalY + 35);

            // Category breakdown
            doc.setFontSize(12);
            doc.setTextColor(220, 38, 38);
            doc.text(t('expense.category_breakdown', 'Category Breakdown'), 14, finalY + 45);

            let categoryY = finalY + 52;
            Object.entries(stats.categoryBreakdown).slice(0, 10).forEach(([category, data]) => {
                const percentage = ((data.total / stats.totalAmount) * 100).toFixed(1);
                doc.setFontSize(9);
                doc.setTextColor(0, 0, 0);
                doc.text(`${category}: ${data.count} expenses - ${formatCurrency(data.total)} (${percentage}%)`, 14, categoryY);
                categoryY += 6;
            });

            if (Object.keys(stats.categoryBreakdown).length > 10) {
                doc.setFontSize(8);
                doc.setTextColor(150, 150, 150);
                doc.text(`... and ${Object.keys(stats.categoryBreakdown).length - 10} more categories`, 14, categoryY);
            }

            if (exportData.length > 50) {
                doc.setFontSize(8);
                doc.setTextColor(150, 150, 150);
                doc.text(`Note: Showing first 50 of ${exportData.length} rows`, 14, categoryY + 7);
            }

            doc.save(`expense_report_${formatDateForFilename()}.pdf`);

            toast.success(`${allExpenses.length} expenses exported successfully to PDF`);
        } catch (error) {
            console.error('Error downloading PDF:', error);
            toast.error(t('expense.pdf_download_failed', 'Failed to download PDF'));
        } finally {
            setIsDownloading(false);
        }
    };

    // Fallback export with paginated data
    const fallbackExportWithPaginatedData = () => {
        try {
            if (safeExpenses.length === 0) {
                toast.warning(t('expense.no_data_export', 'No data to export'));
                return;
            }

            const exportData = prepareExportData(safeExpenses);
            const stats = calculateExportStats(safeExpenses);

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
            csvRows.push(`Date From,${localFilters.start_date || 'None'}`);
            csvRows.push(`Date To,${localFilters.end_date || 'None'}`);

            // Add summary statistics
            csvRows.push('');
            csvRows.push('SUMMARY STATISTICS (CURRENT PAGE ONLY)');
            csvRows.push(`Total Expenses (This Page),${stats.totalCount}`);
            csvRows.push(`Total Amount,${stats.totalAmount}`);
            csvRows.push(`Average Amount,${stats.averageAmount.toFixed(2)}`);
            csvRows.push(`Maximum Amount,${stats.maxAmount}`);
            csvRows.push(`Minimum Amount,${stats.minAmount}`);

            const csvString = csvRows.join('\n');

            const blob = new Blob(["\uFEFF" + csvString], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.href = url;
            link.download = `expense_report_paginated_${formatDateForFilename()}.csv`;
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

    // Sticky column helper classes
    const stickyLeftTh = "sticky left-0 z-30 bg-[#dc2626]";
    const stickyRightTh = "sticky right-0 z-30 bg-[#dc2626]";
    const stickyLeftTd = "sticky left-0 z-20 bg-white";
    const stickyRightTd = "sticky right-0 z-20 bg-white";
    const stickyShadowLeft = "shadow-[6px_0_10px_-10px_rgba(0,0,0,0.4)]";
    const stickyShadowRight = "shadow-[-6px_0_10px_-10px_rgba(0,0,0,0.4)]";

    return (
        <div className={`bg-white rounded-box p-5 ${locale === "bn" ? "bangla-font" : ""}`}>
            {/* Expense Details Modal */}
            {showDetailsModal && selectedExpense && (
                <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl border border-gray-100">
                        <div className="p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-xl font-black text-gray-900 flex items-center gap-2">
                                    <DollarSign size={20} className="text-red-600" />
                                    {t('expense.expense_details', 'Expense Details')}
                                </h3>
                                <button onClick={closeDetailsModal} className="btn btn-ghost btn-circle btn-sm">
                                    <X size={18} />
                                </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="col-span-2 bg-red-50 p-4 rounded-xl">
                                    <div className="text-sm text-gray-600">{t('expense.amount', 'Amount')}</div>
                                    <div className="text-3xl font-black text-red-600">{formatCurrency(selectedExpense.amount)}</div>
                                </div>

                                <div className="bg-gray-50 p-3 rounded-lg">
                                    <div className="text-xs text-gray-500">{t('expense.name', 'Expense Name')}</div>
                                    <div className="font-medium">{selectedExpense.name}</div>
                                </div>

                                <div className="bg-gray-50 p-3 rounded-lg">
                                    <div className="text-xs text-gray-500">{t('expense.category', 'Category')}</div>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className={`p-1 rounded ${getCategoryColor(selectedExpense.category?.name)}`}>
                                            {React.createElement(getCategoryIcon(selectedExpense.category?.name), { size: 14 })}
                                        </span>
                                        <span>{selectedExpense.category?.name || 'N/A'}</span>
                                    </div>
                                </div>

                                <div className="bg-gray-50 p-3 rounded-lg">
                                    <div className="text-xs text-gray-500">{t('expense.created_by', 'Created By')}</div>
                                    <div className="flex items-center gap-2">
                                        <User size={14} className="text-gray-400" />
                                        <span>{selectedExpense.creator?.name || 'N/A'}</span>
                                    </div>
                                </div>

                                <div className="bg-gray-50 p-3 rounded-lg">
                                    <div className="text-xs text-gray-500">{t('expense.created_at', 'Created At')}</div>
                                    <div>{formatDateTime(selectedExpense.created_at)}</div>
                                </div>

                                <div className="bg-gray-50 p-3 rounded-lg">
                                    <div className="text-xs text-gray-500">{t('expense.last_updated', 'Last Updated')}</div>
                                    <div>{formatDateTime(selectedExpense.updated_at)}</div>
                                </div>

                        
                            </div>

                            <div className="mt-6 flex justify-end">
                                <button onClick={closeDetailsModal} className="btn btn-primary">
                                    {t('common.close', 'Close')}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <PageHeader 
                title={t("expense.expense_report", "Expense Report")} 
                subtitle={t("expense.subtitle", "View and analyze all your expenses from here.")}
            >
                <div className="flex items-center gap-2 flex-wrap">
                    {/* Stats Toggle Button */}
                    <button
                        onClick={toggleStats}
                        className="btn btn-sm btn-outline"
                    >
                        <BarChart size={15} />
                        {showStats ? t('expense.hide_stats', 'Hide Stats') : t('expense.show_stats', 'Show Stats')}
                    </button>

                    {/* Filter Toggle Button */}
                    <button
                        onClick={toggleFilters}
                        className={`btn btn-sm ${showFilters ? 'bg-[#dc2626] text-white' : 'btn-outline'}`}
                    >
                        <Filter size={15} />
                        {t('expense.filters', 'Filters')}
                        {hasActiveFilters() && (
                            <span className="badge badge-sm bg-white text-[#dc2626] ml-1">
                                {t('expense.active', 'Active')}
                            </span>
                        )}
                        {showFilters ? <ChevronUp size={15} className="ml-1" /> : <ChevronDown size={15} className="ml-1" />}
                    </button>

                    {/* Download Dropdown */}
                    <div className="dropdown dropdown-end">
                        <button
                            className="btn bg-[#225E32] text-white btn-sm"
                            disabled={isDownloading || safeExpenses.length === 0}
                            tabIndex={0}
                        >
                            <Download size={14} />
                            {isDownloading
                                ? t('expense.downloading', 'Downloading...')
                                : t('expense.download_report', 'Download Report')}
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
                                    {t('expense.csv_format', 'CSV Format')}
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
                                    {t('expense.excel_format', 'Excel Format')}
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
                                    {t('expense.pdf_format', 'PDF Format')}
                                </button>
                            </li>
                        </ul>
                    </div>
                </div>
            </PageHeader>

            {/* Statistics Cards */}
            {showStats && (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                        <div className="bg-gradient-to-br from-red-50 to-red-100 p-4 rounded-xl border border-red-200">
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="text-sm text-red-600 font-medium">Total Expenses</div>
                                    <div className="text-2xl font-black text-red-700">{expenseStats.totalCount}</div>
                                </div>
                                <div className="p-3 bg-red-200 rounded-full">
                                    <DollarSign size={24} className="text-red-700" />
                                </div>
                            </div>
                            <div className="mt-2 text-xs text-red-600">
                                Total Amount: {formatCurrency(expenseStats.totalExpenses)}
                            </div>
                        </div>

                        <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-xl border border-blue-200">
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="text-sm text-blue-600 font-medium">Average Expense</div>
                                    <div className="text-2xl font-black text-blue-700"> ৳ {  expenseStats.averageExpense}</div>
                                </div>
                                <div className="p-3 bg-blue-200 rounded-full">
                                    <TrendingUp size={24} className="text-blue-700" />
                                </div>
                            </div>
                            <div className="mt-2 text-xs text-blue-600">
                                Per expense average
                            </div>
                        </div>

                        <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-xl border border-green-200">
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="text-sm text-green-600 font-medium">Highest Expense</div>
                                    <div className="text-2xl font-black text-green-700">৳{expenseStats.maxExpense}</div>
                                </div>
                                <div className="p-3 bg-green-200 rounded-full">
                                    <TrendingUp size={24} className="text-green-700" />
                                </div>
                            </div>
                            <div className="mt-2 text-xs text-green-600">
                                Maximum single expense
                            </div>
                        </div>

                        <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-xl border border-purple-200">
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="text-sm text-purple-600 font-medium">Lowest Expense</div>
                                    <div className="text-2xl font-black text-purple-700">{formatCurrency(expenseStats.minExpense)}</div>
                                </div>
                                <div className="p-3 bg-purple-200 rounded-full">
                                    <TrendingDown size={24} className="text-purple-700" />
                                </div>
                            </div>
                            <div className="mt-2 text-xs text-purple-600">
                                Minimum single expense
                            </div>
                        </div>
                    </div>

                    {/* Category Breakdown */}
                    {Object.keys(expenseStats.categoryBreakdown).length > 0 && (
                        <div className="mb-6 bg-white rounded-xl border border-gray-200 p-4">
                            <h3 className="text-lg font-black text-gray-900 mb-3 flex items-center gap-2">
                                <PieChart size={18} className="text-red-600" />
                                Category Breakdown
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                {Object.entries(expenseStats.categoryBreakdown).map(([category, data]) => {
                                    const percentage = ((data.total / expenseStats.totalExpenses) * 100).toFixed(1);
                                    const IconComponent = getCategoryIcon(category);
                                    
                                    return (
                                        <div key={category} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                                            <div className={`p-2 rounded-full ${getCategoryColor(category)}`}>
                                                <IconComponent size={16} />
                                            </div>
                                            <div className="flex-1">
                                                <div className="font-medium text-sm">{category}</div>
                                                <div className="flex justify-between text-xs">
                                                    <span>{data.count} expenses</span>
                                                    <span className="font-bold">{formatCurrency(data.total)}</span>
                                                </div>
                                                <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                                                    <div 
                                                        className="bg-red-600 h-1.5 rounded-full" 
                                                        style={{ width: `${percentage}%` }}
                                                    ></div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* Collapsible Filter Card */}
            <div className="bg-base-100 rounded-box border border-base-content/5 mb-6 overflow-hidden">
                {showFilters && (
                    <div className="p-4 border-t border-base-content/5">
                        <form onSubmit={handleFilter}>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {/* Search */}
                                <div className="form-control">
                                    <label className="label">
                                        <span className="label-text font-medium">
                                            {t('expense.search', 'Search')}
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
                                                "expense.search_placeholder",
                                                "Search by expense name or description...",
                                            )}
                                            className="input input-sm input-bordered w-full"
                                        />
                                    </div>
                                </div>

                                {/* Start Date */}
                                <div className="form-control">
                                    <label className="label">
                                        <span className="label-text font-medium">
                                            {t('expense.start_date', 'Start Date')}
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
                                            {t('expense.end_date', 'End Date')}
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
                                        {t('expense.active_filters', 'Active Filters:')}
                                    </span>
                                    {localFilters.search && (
                                        <span className="badge badge-outline badge-sm flex items-center gap-1">
                                            {t('expense.search', 'Search')}: {localFilters.search}
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
                                    {localFilters.start_date && (
                                        <span className="badge badge-outline badge-sm flex items-center gap-1">
                                            {t('expense.from', 'From')}: {formatDisplayDate(localFilters.start_date)}
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
                                            {t('expense.to', 'To')}: {formatDisplayDate(localFilters.end_date)}
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
                                        {t('expense.clear', 'Clear')}
                                    </button>
                                )}
                                <button
                                    type="submit"
                                    className="btn btn-sm bg-[#dc2626] text-white"
                                >
                                    <Search size={14} />
                                    {t('expense.apply_filters', 'Apply Filters')}
                                </button>
                            </div>
                        </form>
                    </div>
                )}
            </div>

            {/* Expenses Table */}
            <div className="overflow-x-auto rounded-xl border border-gray-100">
                {safeExpenses?.length > 0 ? (
                    <table className="table table-auto w-full min-w-[1000px]">
                        <thead className="bg-[#225E32] text-white">
                            <tr>
                                <th className="w-[80px]">{t('expense.sl', 'SL No')}</th>
                                <th>{t('expense.name', 'Expense Name')}</th>
                                <th className="w-[150px]">{t('expense.category', 'Category')}</th>
                                <th className="w-[120px] text-right">{t('expense.amount', 'Amount')}</th>
                                <th className="w-[150px]">{t('expense.created_by', 'Created By')}</th>
                                <th className="w-[120px]">{t('expense.date', 'Date')}</th>
                            </tr>
                        </thead>

                        <tbody>
                            {safeExpenses.map((expense, index) => {
                                const CategoryIcon = getCategoryIcon(expense.category?.name);
                                const categoryColor = getCategoryColor(expense.category?.name);
                                
                                return (
                                    <tr key={expense.id} className="hover:bg-gray-50">
                                        <td className="font-mono text-sm">
                                            {((expenses.current_page - 1) * expenses.per_page) + index + 1}
                                        </td>
                                        
                                        <td>
                                            <div className="font-medium">
                                                {expense.details || 'No Title'}
                                            </div>
                                        </td>

                                        <td>
                                            <div className="flex items-center gap-2">
                                                <span className={`p-1 rounded ${categoryColor}`}>
                                                    <CategoryIcon size={14} />
                                                </span>
                                                <span className="text-sm">
                                                    {expense.category?.name || t('expense.not_available', 'N/A')}
                                                </span>
                                            </div>
                                        </td>

                                        <td className="text-right">
                                            <div className="font-bold text-red-600">
                                                {formatCurrency(expense.amount)}
                                            </div>
                                        </td>

                                        <td>
                                            <div className="flex items-center gap-2">
                                                <User size={14} className="text-gray-400" />
                                                <span>{expense.creator?.name || 'N/A'}</span>
                                            </div>
                                        </td>

                                        <td>
                                            <div className="flex items-center gap-2">
                                                <Clock size={14} className="text-gray-400" />
                                                <span className="text-sm">
                                                    {new Date(expense.created_at).toLocaleDateString()}
                                                </span>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>

                        {/* Table Footer with Total */}
                        <tfoot className="bg-gray-50 font-bold">
                            <tr>
                                <td colSpan="3" className="text-right">
                                    {t('expense.total', 'Total')}:
                                </td>
                                <td className="text-right text-red-600">
                                    {formatCurrency(expenseStats.totalExpenses)}
                                </td>
                                <td colSpan="2"></td>
                            </tr>
                        </tfoot>
                    </table>
                ) : (
                    <div className="border border-gray-200 rounded-box px-5 py-10 flex flex-col justify-center items-center gap-2">
                        <Frown size={20} className="text-gray-500" />
                        <h1 className="text-gray-500 text-sm">{t("expense.no_expenses_found", "No expenses found!")}</h1>
                    </div>
                )}
            </div>

            <Pagination data={expenses} />
        </div>
    );
}