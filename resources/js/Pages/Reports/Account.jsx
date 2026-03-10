import { Link, router, useForm } from "@inertiajs/react";
import {
    ArrowUpDown,
    Landmark,
    Plus,
    Search,
    Smartphone,
    TrendingUp,
    Wallet,
    Filter,
    ChevronDown,
    ChevronUp,
    Download,
    CheckCircle,
    Calendar,
    X
} from "lucide-react";
import { useState, useEffect } from "react";
import PageHeader from "../../components/PageHeader";
import Pagination from "../../components/Pagination";
import { useTranslation } from "../../hooks/useTranslation";
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { toast } from "react-toastify";

export default function Accounts({ accounts, filters, totalBalance }) {
    const { t } = useTranslation();
    const [showFilters, setShowFilters] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);

    // Form state for filters
    const { data, setData } = useForm({
        search: filters?.search || "",
        type: filters?.type || "all",
        start_date: filters?.start_date || "",
        end_date: filters?.end_date || "",
    });

    // Local filter state for UI
    const [localFilters, setLocalFilters] = useState({
        search: filters?.search || "",
        type: filters?.type || "all",
        start_date: filters?.start_date || "",
        end_date: filters?.end_date || "",
    });

    // Update local filters when data changes
    useEffect(() => {
        setLocalFilters({
            search: data.search,
            type: data.type,
            start_date: data.start_date,
            end_date: data.end_date,
        });
    }, [data]);

    const handleFilter = (e) => {
        e?.preventDefault();

        // Build query params
        const params = {};
        if (data.search) params.search = data.search;
        if (data.type && data.type !== "all") params.type = data.type;
        if (data.start_date) params.start_date = data.start_date;
        if (data.end_date) params.end_date = data.end_date;

        router.get(route("reports.accounts"), params, {
            preserveScroll: true,
            preserveState: true,
            replace: true,
        });
    };

    const handleFilterChange = (field, value) => {
        setData(field, value);
    };

    const clearFilters = () => {
        setData({ 
            search: "", 
            type: "all",
            start_date: "",
            end_date: "" 
        });

        router.get(route("reports.accounts"), {}, {
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
               (localFilters.type && localFilters.type !== "all") ||
               localFilters.start_date ||
               localFilters.end_date;
    };

    const handleKeyPress = (e) => {
        if (e.key === "Enter") {
            handleFilter(e);
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

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat("en-BD", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(amount || 0);
    };

    const getTypeIcon = (type) => {
        switch (type) {
            case "cash":
                return <Wallet size={16} className="text-green-600" />;
            case "bank":
                return <Landmark size={16} className="text-blue-600" />;
            case "mobile_banking":
                return <Smartphone size={16} className="text-purple-600" />;
            default:
                return <Wallet size={16} />;
        }
    };

    const getTypeLabel = (type) => {
        switch (type) {
            case "cash":
                return t("account.cash", "Cash");
            case "bank":
                return t("account.bank", "Bank Account");
            case "mobile_banking":
                return t("account.mobile_banking", "Mobile Banking");
            default:
                return type;
        }
    };

    const getTypeBadgeColor = (type) => {
        switch (type) {
            case "cash":
                return "bg-green-100 text-green-700";
            case "bank":
                return "bg-blue-100 text-blue-700";
            case "mobile_banking":
                return "bg-purple-100 text-purple-700";
            default:
                return "bg-gray-100 text-gray-700";
        }
    };

    // Format date for display
    const formatDisplayDate = (dateString) => {
        if (!dateString) return '';
        return new Date(dateString).toLocaleDateString();
    };

    // Calculate statistics by type
    const getAccountsByType = (type) => {
        return accounts?.data?.filter(a => a.type === type) || [];
    };

    const getTotalByType = (type) => {
        return getAccountsByType(type).reduce((sum, account) => {
            return sum + parseFloat(account.current_balance || 0);
        }, 0);
    };

    const totalCash = getTotalByType('cash');
    const totalBank = getTotalByType('bank');
    const totalMobile = getTotalByType('mobile_banking');

    // Prepare data for export
    const prepareExportData = () => {
        return accounts.data.map(account => {
            return {
                'Name': account.name,
                'Type': getTypeLabel(account.type),
                'Account Number': account.account_number || 'N/A',
                'Bank/Provider': account.type === 'bank' ? account.bank_name || 'N/A' :
                    account.type === 'mobile_banking' ? account.mobile_provider || 'N/A' : 'N/A',
                'Current Balance (Tk)': formatCurrency(account.current_balance),
                'Status': account.is_active ? 'Active' : 'Inactive',
                'Default': account.is_default ? 'Yes' : 'No',
                'Total Payments': account.payments_count || 0,
                'Note': account.note || 'N/A',
                'Created At': account.created_at ? new Date(account.created_at).toLocaleDateString() : 'N/A'
            };
        });
    };

    // Download as CSV
    const downloadCSV = () => {
        try {
            setIsDownloading(true);
            const exportData = prepareExportData();

            if (exportData.length === 0) {
                toast.warning(t('account.no_data_export', 'No data to export'));
                return;
            }

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
            csvRows.push(`Account Type,${localFilters.type === 'all' ? 'All Types' : getTypeLabel(localFilters.type)}`);
            csvRows.push(`Date From,${localFilters.start_date || 'None'}`);
            csvRows.push(`Date To,${localFilters.end_date || 'None'}`);

            // Add summary statistics
            csvRows.push('');
            csvRows.push('SUMMARY STATISTICS');

            csvRows.push(`Total Accounts,${accounts.total}`);
            csvRows.push(`Active Accounts,${accounts.data.filter(a => a.is_active).length}`);
            csvRows.push(`Total Balance (Tk),${formatCurrency(totalBalance)}`);
            csvRows.push(`Cash Balance (Tk),${formatCurrency(totalCash)}`);
            csvRows.push(`Bank Balance (Tk),${formatCurrency(totalBank)}`);
            csvRows.push(`Mobile Banking Balance (Tk),${formatCurrency(totalMobile)}`);

            const csvString = csvRows.join('\n');

            const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.href = url;
            link.download = `accounts_report_${formatDateForFilename()}.csv`;
            link.click();
            URL.revokeObjectURL(url);

            toast.success(t('account.csv_downloaded', 'CSV downloaded successfully'));
        } catch (error) {
            console.error('Error downloading CSV:', error);
            toast.error(t('account.csv_download_failed', 'Failed to download CSV'));
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
                toast.warning(t('account.no_data_export', 'No data to export'));
                return;
            }

            const wb = XLSX.utils.book_new();
            const ws = XLSX.utils.json_to_sheet(exportData);

            // Add filter information sheet
            const filterData = [
                { 'Filter': 'Search', 'Value': localFilters.search || 'None' },
                { 'Filter': 'Account Type', 'Value': localFilters.type === 'all' ? 'All Types' : getTypeLabel(localFilters.type) },
                { 'Filter': 'Date From', 'Value': localFilters.start_date || 'None' },
                { 'Filter': 'Date To', 'Value': localFilters.end_date || 'None' }
            ];
            const wsFilters = XLSX.utils.json_to_sheet(filterData);

            // Add summary statistics sheet
            const summaryData = [
                { 'Metric': 'Total Accounts', 'Value': accounts.total },
                { 'Metric': 'Active Accounts', 'Value': accounts.data.filter(a => a.is_active).length },
                { 'Metric': 'Total Balance (Tk)', 'Value': formatCurrency(totalBalance) },
                { 'Metric': 'Cash Balance (Tk)', 'Value': formatCurrency(totalCash) },
                { 'Metric': 'Bank Balance (Tk)', 'Value': formatCurrency(totalBank) },
                { 'Metric': 'Mobile Banking Balance (Tk)', 'Value': formatCurrency(totalMobile) }
            ];
            const wsSummary = XLSX.utils.json_to_sheet(summaryData);

            XLSX.utils.book_append_sheet(wb, ws, 'Accounts');
            XLSX.utils.book_append_sheet(wb, wsFilters, 'Filters Applied');
            XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');

            XLSX.writeFile(wb, `accounts_report_${formatDateForFilename()}.xlsx`);

            toast.success(t('account.excel_downloaded', 'Excel file downloaded successfully'));
        } catch (error) {
            console.error('Error downloading Excel:', error);
            toast.error(t('account.excel_download_failed', 'Failed to download Excel file'));
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
                toast.warning(t('account.no_data_export', 'No data to export'));
                return;
            }

            const doc = new jsPDF({
                orientation: 'landscape',
                unit: 'mm',
                format: 'a4'
            });

            // Title
            doc.setFontSize(16);
            doc.setTextColor(30, 77, 43);
            doc.text(t('account.accounts_report', 'Accounts Report'), 14, 15);

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
                filterY += 6;
            }
            if (localFilters.type && localFilters.type !== 'all') {
                doc.text(`Account Type: ${getTypeLabel(localFilters.type)}`, 14, filterY);
                filterY += 6;
            }
            if (localFilters.start_date || localFilters.end_date) {
                doc.text(`Date Range: ${formatDisplayDate(localFilters.start_date) || 'Start'} to ${formatDisplayDate(localFilters.end_date) || 'End'}`, 14, filterY);
                filterY += 6;
            }

            // Table columns
            const tableColumns = [
                'Name',
                'Type',
                'Account No',
                'Balance',
                'Status',
                'Payments'
            ];

            const tableRows = exportData.map(item => [
                item['Name'].substring(0, 20) + (item['Name'].length > 20 ? '...' : ''),
                item['Type'],
                item['Account Number'] === 'N/A' ? 'N/A' : item['Account Number'].substring(0, 10) + (item['Account Number'].length > 10 ? '...' : ''),
                item['Current Balance (Tk)'],
                item['Status'],
                item['Total Payments'].toString()
            ]);

            autoTable(doc, {
                head: [tableColumns],
                body: tableRows,
                startY: filterY + 5,
                theme: 'grid',
                styles: { fontSize: 8, cellPadding: 2 },
                headStyles: { fillColor: [30, 77, 43], textColor: [255, 255, 255] },
                alternateRowStyles: { fillColor: [245, 245, 245] }
            });

            // Summary statistics
            const finalY = doc.lastAutoTable.finalY + 10;

            doc.setFontSize(12);
            doc.setTextColor(30, 77, 43);
            doc.text(t('account.summary_statistics', 'Summary Statistics'), 14, finalY);

            doc.setFontSize(10);
            doc.setTextColor(0, 0, 0);
            doc.text(`Total Accounts: ${accounts.total}`, 14, finalY + 7);
            doc.text(`Active Accounts: ${accounts.data.filter(a => a.is_active).length}`, 14, finalY + 14);
            doc.text(`Total Balance: ${formatCurrency(totalBalance)} Tk`, 14, finalY + 21);
            doc.text(`Cash: ${formatCurrency(totalCash)} | Bank: ${formatCurrency(totalBank)} | Mobile: ${formatCurrency(totalMobile)}`, 14, finalY + 28);

            doc.save(`accounts_report_${formatDateForFilename()}.pdf`);

            toast.success(t('account.pdf_downloaded', 'PDF downloaded successfully'));
        } catch (error) {
            console.error('Error downloading PDF:', error);
            toast.error(t('account.pdf_download_failed', 'Failed to download PDF'));
        } finally {
            setIsDownloading(false);
        }
    };

    return (
        <div className="bg-white rounded-box p-5">
            <PageHeader
                title={t("account.title", "Account Report")}
                subtitle={t(
                    "account.subtitle",
                    "View and analyze your bank, cash, and mobile accounts",
                )}
            >
            </PageHeader>

            {/* Collapsible Filter Card */}
            <div className="bg-base-100 rounded-box border border-base-content/5 mb-6 overflow-hidden">
                <div
                    className="flex items-center justify-between p-4 cursor-pointer hover:bg-base-200 transition-colors"
                    onClick={toggleFilters}
                >
                    <div className="flex items-center gap-2">
                        <Filter size={18} className="text-[#1e4d2b]" />
                        <h3 className="text-lg font-semibold text-neutral">
                            {t('account.filters', 'Filters')}
                        </h3>
                        {hasActiveFilters() && (
                            <span className="badge badge-sm bg-[#1e4d2b] text-white ml-2">
                                {t('account.active', 'Active')}
                            </span>
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
                            {t('account.clear', 'Clear')}
                        </button>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                handleFilter(e);
                            }}
                            className="btn bg-[#1e4d2b] text-white btn-sm"
                        >
                            <Search size={14} />
                            {t('account.filter', 'Filter')}
                        </button>
                        <button className="btn btn-ghost btn-sm">
                            {showFilters ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                        </button>
                    </div>
                </div>

                {showFilters && (
                    <div className="p-4 border-t border-base-content/5">
                        <form onSubmit={handleFilter}>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                {/* Search */}
                                <div className="form-control">
                                    <label className="label">
                                        <span className="label-text font-medium">
                                            {t('account.search', 'Search')}
                                        </span>
                                    </label>
                                    <div className="relative">
                                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                        <input
                                            type="text"
                                            name="search"
                                            value={data.search}
                                            onChange={(e) => handleFilterChange("search", e.target.value)}
                                            onKeyPress={handleKeyPress}
                                            placeholder={t(
                                                "account.search_placeholder",
                                                "Search by account name or number...",
                                            )}
                                            className="input input-sm input-bordered w-full pl-8"
                                        />
                                    </div>
                                </div>

                                {/* Account Type */}
                                <div className="form-control">
                                    <label className="label">
                                        <span className="label-text font-medium">
                                            {t('account.type', 'Account Type')}
                                        </span>
                                    </label>
                                    <select
                                        name="type"
                                        value={data.type}
                                        onChange={(e) => handleFilterChange("type", e.target.value)}
                                        className="select select-sm select-bordered w-full"
                                    >
                                        <option value="all">{t('account.all_types', 'All Types')}</option>
                                        <option value="cash">{t('account.cash', 'Cash')}</option>
                                        <option value="bank">{t('account.bank', 'Bank Account')}</option>
                                        <option value="mobile_banking">{t('account.mobile_banking', 'Mobile Banking')}</option>
                                    </select>
                                </div>

                                {/* Start Date */}
                                <div className="form-control">
                                    <label className="label">
                                        <span className="label-text font-medium">
                                            {t('account.start_date', 'Start Date')}
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
                                            {t('account.end_date', 'End Date')}
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
                                        {t('account.active_filters', 'Active Filters:')}
                                    </span>
                                    {localFilters.search && (
                                        <span className="badge badge-outline badge-sm flex items-center gap-1">
                                            {t('account.search', 'Search')}: {localFilters.search}
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
                                    {localFilters.type && localFilters.type !== "all" && (
                                        <span className="badge badge-outline badge-sm flex items-center gap-1">
                                            {t('account.type', 'Type')}: {getTypeLabel(localFilters.type)}
                                            <button
                                                onClick={() => {
                                                    setData('type', 'all');
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
                                            {t('account.from', 'From')}: {formatDisplayDate(localFilters.start_date)}
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
                                            {t('account.to', 'To')}: {formatDisplayDate(localFilters.end_date)}
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

                            <div className="mt-4 flex justify-end">
                                <button
                                    type="submit"
                                    className="btn btn-sm bg-[#1e4d2b] text-white"
                                >
                                    <Search size={14} />
                                    {t('account.apply_filters', 'Apply Filters')}
                                </button>
                            </div>
                        </form>
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
                        {isDownloading
                            ? t('account.downloading', 'Downloading...')
                            : t('account.download_report', 'Download Report')}
                    </button>
                    <ul tabIndex={0} className="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-40">
                        <li>
                            <button onClick={downloadCSV} className="btn btn-ghost btn-sm w-full text-left">
                                {t('account.csv_format', 'CSV Format')}
                            </button>
                        </li>
                        <li>
                            <button onClick={downloadExcel} className="btn btn-ghost btn-sm w-full text-left">
                                {t('account.excel_format', 'Excel Format')}
                            </button>
                        </li>
                        <li>
                            <button onClick={downloadPDF} className="btn btn-ghost btn-sm w-full text-left">
                                {t('account.pdf_format', 'PDF Format')}
                            </button>
                        </li>
                    </ul>
                </div>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-xl p-4 text-white">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm opacity-80">
                                {t("account.total_balance", "Total Balance")}
                            </p>
                            <p className="text-2xl font-black">
                                ৳{formatCurrency(totalBalance)}
                            </p>
                        </div>
                        <TrendingUp size={24} className="opacity-70" />
                    </div>
                </div>
                <div className="bg-white border rounded-xl p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-500">
                                {t("account.total_accounts", "Total Accounts")}
                            </p>
                            <p className="text-2xl font-black">
                                {accounts?.total || 0}
                            </p>
                        </div>
                        <Landmark size={24} className="text-gray-400" />
                    </div>
                </div>
                <div className="bg-white border rounded-xl p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-500">
                                {t("account.active_accounts", "Active Accounts")}
                            </p>
                            <p className="text-2xl font-black">
                                {accounts?.data?.filter((a) => a.is_active).length || 0}
                            </p>
                        </div>
                        <CheckCircle size={24} className="text-green-500" />
                    </div>
                </div>
                <div className="bg-white border rounded-xl p-4">
                    <Link
                        href={route("accounts.index")}
                        className="flex items-center justify-between hover:bg-gray-50 p-2 rounded-lg transition-colors"
                    >
                        <div>
                            <p className="text-sm text-gray-500">
                                {t("account.manage", "Manage Accounts")}
                            </p>
                            <p className="text-lg font-black text-red-600">
                                {t("account.click_to_manage", "Click to Manage")}
                            </p>
                        </div>
                        <ArrowUpDown size={24} className="text-red-600" />
                    </Link>
                </div>
            </div>

            {/* Accounts Table */}
            <div className="rounded-xl border border-gray-100 shadow-sm overflow-x-auto">
                <table className="table w-full">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="font-bold p-3 text-left">
                                {t("account.name", "Account Name")}
                            </th>
                            <th className="font-bold p-3 text-left">
                                {t("account.type", "Type")}
                            </th>
                            <th className="font-bold p-3 text-left">
                                {t("account.details", "Details")}
                            </th>
                            <th className="font-bold p-3 text-left">
                                {t("account.balance", "Balance")}
                            </th>
                            <th className="font-bold p-3 text-left">
                                {t("account.status", "Status")}
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {accounts?.data?.map((account) => (
                            <tr key={account.id} className="hover:bg-gray-50 border-b">
                                <td className="p-3">
                                    <div className="flex items-center gap-3">
                                        {getTypeIcon(account.type)}
                                        <div>
                                            <p className="font-bold">{account.name}</p>
                                            {account.account_number && (
                                                <p className="text-xs text-gray-500">
                                                    #{account.account_number}
                                                </p>
                                            )}
                                            {account.is_default && (
                                                <span className="badge badge-xs bg-green-100 text-green-700 border-none mt-1">
                                                    {t("account.default", "Default")}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </td>
                                <td className="p-3">
                                    <span className={`badge badge-sm ${getTypeBadgeColor(account.type)} border-none`}>
                                        {getTypeLabel(account.type)}
                                    </span>
                                </td>
                                <td className="p-3">
                                    {account.type === 'bank' && account.bank_name && (
                                        <div>
                                            <span className="text-sm font-medium">{account.bank_name}</span>
                                            {account.branch_name && (
                                                <p className="text-xs text-gray-500">{account.branch_name}</p>
                                            )}
                                        </div>
                                    )}
                                    {account.type === 'mobile_banking' && account.mobile_provider && (
                                        <span className="text-sm">{account.mobile_provider}</span>
                                    )}
                                    {account.type === 'cash' && (
                                        <span className="text-sm text-gray-500">—</span>
                                    )}
                                </td>
                                <td className="p-3">
                                    <span className="font-bold text-green-600">
                                        ৳{formatCurrency(account.current_balance)}
                                    </span>
                                </td>
                                <td className="p-3">
                                    {account.is_active ? (
                                        <span className="badge badge-sm bg-green-100 text-green-700 border-none">
                                            {t("account.active", "Active")}
                                        </span>
                                    ) : (
                                        <span className="badge badge-sm bg-red-100 text-red-700 border-none">
                                            {t("account.inactive", "Inactive")}
                                        </span>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {(!accounts?.data || accounts.data.length === 0) && (
                <div className="text-center py-12 text-gray-400">
                    <Landmark size={48} className="mx-auto mb-4 opacity-20" />
                    <p className="font-bold">
                        {t("account.no_accounts", "No accounts found")}
                    </p>
                    <p className="text-sm mt-2">
                        {hasActiveFilters()
                            ? t("account.try_different_filters", "Try different search or filter criteria")
                            : t("account.create_first", "Create your first account to get started")
                        }
                    </p>
                    {hasActiveFilters() && (
                        <button
                            onClick={clearFilters}
                            className="btn btn-sm btn-ghost mt-4"
                        >
                            {t("account.clear_filters", "Clear Filters")}
                        </button>
                    )}
                </div>
            )}

            {accounts?.data?.length > 0 && <Pagination data={accounts} />}
        </div>
    );
}