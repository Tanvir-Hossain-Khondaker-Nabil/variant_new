import { Head, Link, router, useForm, usePage } from "@inertiajs/react";
import {
    ArcElement,
    BarElement,
    CategoryScale,
    Chart as ChartJS,
    Filler,
    Legend,
    LinearScale,
    LineElement,
    PointElement,
    Title,
    Tooltip,
} from "chart.js";
import {
    ArrowDownRight,
    ArrowRight,
    ArrowUpRight,
    BanknoteIcon,
    Building,
    Building2,
    Calendar,
    CalendarDays,
    Check,
    CheckCircle,
    ChevronLeft,
    ChevronDown,
    ChevronUp,
    Clock,
    CreditCard as CreditCardIcon,
    DollarSign,
    Eye,
    Filter,
    LineChart,
    Mail,
    MapPin,
    Phone,
    PieChart as PieChartIcon,
    Receipt,
    RefreshCw,
    Search,
    ShoppingBag,
    TrendingUp,
    Wallet,
    XCircle,
    Download,
} from "lucide-react";
import { useEffect, useState ,useRef} from "react";
import { Line, Pie } from "react-chartjs-2";
import { toast } from "react-toastify";
import Pagination from "../../components/Pagination";
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
    ArcElement,
    PointElement,
    LineElement,
    Filler,
);

export default function SupplierLedger({
    supplier = null,
    purchases = {},
    stats = {},
    chart_data = {},
    filters = {},
    accounts = [],
}) {
    const { auth } = usePage().props;
    const [activeTab, setActiveTab] = useState("transactions");
    const [selectedPurchase, setSelectedPurchase] = useState(null);
    const [exportFormat, setExportFormat] = useState("pdf");
    const [paymentStats, setPaymentStats] = useState({});
    const [monthlyChartData, setMonthlyChartData] = useState(null);
    const [paymentChartData, setPaymentChartData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [showFilters, setShowFilters] = useState(true);
    const [isDownloading, setIsDownloading] = useState(false);

    // Due Clearance States
    const [showDueClearance, setShowDueClearance] = useState(false);
    const [dueAmount, setDueAmount] = useState(0);
    const [advanceAmount, setAdvanceAmount] = useState(0);
    const [paymentForm, setPaymentForm] = useState({
        paid_amount: "",
        payment_type: "cash",
        notes: "",
        account_id: "",
        date: new Date().toISOString().split("T")[0],
        type: "supplier",
    });
    const [selectedPurchases, setSelectedPurchases] = useState([]);
    const [isPartialPayment, setIsPartialPayment] = useState(false);
    const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
    const paidAmountRef = useRef(null);

    // Advance Payment Form
    const {
        data: advanceData,
        setData: setAdvanceData,
        post: postAdvance,
        processing: advanceProcessing,
        errors: advanceErrors,
    } = useForm({
        amount: "",
        payment_type: "cash",
        transaction_id: "",
        notes: "",
        date: new Date().toISOString().split("T")[0],
    });

    const handleAdvancePaymentSubmit = (e) => {
        e.preventDefault();

        const paidAmount = parseFloat(advanceData.amount) || 0;
        if (paidAmount <= 0) {
            toast.error("Please enter a valid advance amount");
            // alert("Please enter a valid advance amount");
            return;
        }

        postAdvance(route("advancePayment.store", supplier.id), {
            onSuccess: () => {
                toast.success(
                    `Advance payment of ৳${formatCurrency(paidAmount)} added successfully!`,
                );
                setShowDueClearance(false);
                router.reload();
            },
            onError: (errors) => {
                toast.error(
                    errors.paid_amount ||
                        errors.account_id ||
                        "An error occurred while processing the advance payment.",
                );
            },
        });
    };

    // Initialize filter form with query string values
    const filterForm = useForm({
        search: filters.search || "",
        start_date: filters.start_date || "",
        end_date: filters.end_date || "",
        page: filters.page || 1,
    });

    // Check if data is loaded
    useEffect(() => {
        if (supplier) {
            setIsLoading(false);
            // Calculate total due amount
            const purchasesData = purchases?.data || purchases || [];
            const totalDue = purchasesData.reduce((sum, purchase) => {
                const purchaseDue =
                    purchase.grand_total - (purchase.paid_amount || 0);
                return sum + Math.max(0, purchaseDue);
            }, 0);
            setDueAmount(totalDue);
            setAdvanceAmount(supplier?.advance_amount || 0);

            // Initialize payment form with total due
            setPaymentForm((prev) => ({
                ...prev,
                paid_amount: totalDue.toString(),
                account_id: accounts.length > 0 ? accounts[0].id : "",
            }));
        }
    }, [supplier, purchases, accounts]);

    // Prepare chart data when component mounts or data changes
    useEffect(() => {
        if (!supplier) return;

        // Prepare monthly purchases chart
        if (chart_data.monthly_purchases) {
            const monthlyLabels = Object.keys(chart_data.monthly_purchases);
            const monthlyValues = Object.values(chart_data.monthly_purchases);

            setMonthlyChartData({
                labels: monthlyLabels,
                datasets: [
                    {
                        label: "Monthly Purchases",
                        data: monthlyValues,
                        backgroundColor: "rgba(249, 115, 22, 0.1)",
                        borderColor: "rgb(249, 115, 22)",
                        borderWidth: 2,
                        fill: true,
                        tension: 0.4,
                    },
                ],
            });
        }

        // Prepare payment methods chart
        if (chart_data.payment_methods) {
            const paymentLabels = Object.keys(chart_data.payment_methods);
            const paymentValues = Object.values(chart_data.payment_methods);

            // Generate colors based on number of payment methods
            const backgroundColors = [
                "rgba(249, 115, 22, 0.8)",
                "rgba(59, 130, 246, 0.8)",
                "rgba(34, 197, 94, 0.8)",
                "rgba(168, 85, 247, 0.8)",
                "rgba(239, 68, 68, 0.8)",
                "rgba(234, 179, 8, 0.8)",
            ];

            setPaymentChartData({
                labels: paymentLabels,
                datasets: [
                    {
                        data: paymentValues,
                        backgroundColor: backgroundColors.slice(
                            0,
                            paymentLabels.length,
                        ),
                        borderWidth: 1,
                        borderColor: "#ffffff",
                    },
                ],
            });

            // Calculate payment method percentages
            const total = paymentValues.reduce((sum, val) => sum + val, 0);
            const paymentPercentages = {};
            paymentLabels.forEach((method, index) => {
                paymentPercentages[method] =
                    total > 0
                        ? ((paymentValues[index] / total) * 100).toFixed(1)
                        : 0;
            });
            setPaymentStats(paymentPercentages);
        }
    }, [chart_data, supplier]);

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

    // Toggle filter section
    const toggleFilters = () => {
        setShowFilters(!showFilters);
    };

    // Prepare data for export
    const prepareExportData = () => {
        const purchasesData = purchases?.data || purchases || [];
        
        return purchasesData.map(purchase => {
            const purchaseDue = purchase.grand_total - (purchase.paid_amount || 0);
            
            return {
                'Invoice No': purchase.purchase_no || purchase.id,
                'Date': formatDate(purchase.created_at),
                'Time': new Date(purchase.created_at).toLocaleTimeString(),
                'Items Count': purchase.items?.length || 0,
                'Payment Method': purchase.payment_type || 'N/A',
                'Status': purchaseDue > 0 ? 'Pending' : 'Completed',
                'Total Amount (Tk)': formatCurrency(purchase.grand_total),
                'Paid Amount (Tk)': formatCurrency(purchase.paid_amount || 0),
                'Due Amount (Tk)': formatCurrency(purchaseDue),
                'Created By': purchase.creator?.name || 'System'
            };
        });
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
            csvRows.push('SUPPLIER INFORMATION');
            csvRows.push(`Supplier Name,${supplier?.name || 'N/A'}`);
            csvRows.push(`Phone,${supplier?.phone || 'N/A'}`);
            csvRows.push(`Email,${supplier?.email || 'N/A'}`);
            csvRows.push(`Address,${supplier?.address || 'N/A'}`);
            csvRows.push(`Company,${supplier?.company_name || 'N/A'}`);
            csvRows.push(`Current Balance,${formatCurrency(supplier?.advance_amount || 0)}`);

            csvRows.push('');
            csvRows.push('FILTER INFORMATION');
            csvRows.push(`Search,${filterForm.data.search || 'None'}`);
            csvRows.push(`Date From,${filterForm.data.start_date || 'None'}`);
            csvRows.push(`Date To,${filterForm.data.end_date || 'None'}`);

            csvRows.push('');
            csvRows.push('SUMMARY STATISTICS');
            csvRows.push(`Total Purchases,${purchasesData.length}`);
            csvRows.push(`Total Purchase Amount,${formatCurrency(stats?.total_purchases || 0)}`);
            csvRows.push(`Total Due Amount,${formatCurrency(stats?.total_due || 0)}`);

            const csvString = csvRows.join('\n');
            
            const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.href = url;
            link.download = `supplier_ledger_${supplier?.id}_${formatDateForFilename()}.csv`;
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

            const wb = XLSX.utils.book_new();
            const ws = XLSX.utils.json_to_sheet(exportData);

            // Supplier info sheet
            const supplierInfo = [
                { 'Field': 'Supplier Name', 'Value': supplier?.name || 'N/A' },
                { 'Field': 'Phone', 'Value': supplier?.phone || 'N/A' },
                { 'Field': 'Email', 'Value': supplier?.email || 'N/A' },
                { 'Field': 'Address', 'Value': supplier?.address || 'N/A' },
                { 'Field': 'Company', 'Value': supplier?.company_name || 'N/A' },
                { 'Field': 'Current Balance', 'Value': formatCurrency(supplier?.advance_amount || 0) }
            ];
            const wsSupplier = XLSX.utils.json_to_sheet(supplierInfo);

            // Filter info sheet
            const filterData = [
                { 'Filter': 'Search', 'Value': filterForm.data.search || 'None' },
                { 'Filter': 'Date From', 'Value': filterForm.data.start_date || 'None' },
                { 'Filter': 'Date To', 'Value': filterForm.data.end_date || 'None' }
            ];
            const wsFilters = XLSX.utils.json_to_sheet(filterData);

            // Summary sheet
            const purchasesData = purchases?.data || purchases || [];
            const summaryData = [
                { 'Metric': 'Total Purchases', 'Value': purchasesData.length },
                { 'Metric': 'Total Purchase Amount', 'Value': formatCurrency(stats?.total_purchases || 0) },
                { 'Metric': 'Total Due Amount', 'Value': formatCurrency(stats?.total_due || 0) }
            ];
            const wsSummary = XLSX.utils.json_to_sheet(summaryData);

            XLSX.utils.book_append_sheet(wb, ws, 'Purchases');
            XLSX.utils.book_append_sheet(wb, wsSupplier, 'Supplier Info');
            XLSX.utils.book_append_sheet(wb, wsFilters, 'Filters Applied');
            XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');

            XLSX.writeFile(wb, `supplier_ledger_${supplier?.id}_${formatDateForFilename()}.xlsx`);
            
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
            const purchasesData = purchases?.data || purchases || [];
            
            if (purchasesData.length === 0) {
                toast.warning('No data to export');
                return;
            }

            const doc = new jsPDF({
                orientation: 'landscape',
                unit: 'mm',
                format: 'a4'
            });

            // Add title
            doc.setFontSize(18);
            doc.setTextColor(249, 115, 22); // Orange color
            doc.text(`Supplier Ledger: ${supplier?.name || 'Supplier'}`, 14, 15);
            
            // Add supplier info
            doc.setFontSize(10);
            doc.setTextColor(100, 100, 100);
            doc.text(`Phone: ${supplier?.phone || 'N/A'} | Email: ${supplier?.email || 'N/A'}`, 14, 22);
            doc.text(`Address: ${supplier?.address || 'N/A'}`, 14, 28);
            
            // Add filter information
            doc.setFontSize(9);
            doc.setTextColor(80, 80, 80);
            doc.text(`Search: ${filterForm.data.search || 'None'}`, 14, 35);
            doc.text(`Date Range: ${filterForm.data.start_date || 'Start'} to ${filterForm.data.end_date || 'End'}`, 14, 40);

            // Prepare table columns and rows
            const tableColumns = [
                'Invoice',
                'Date',
                'Items',
                'Method',
                'Status',
                'Total',
                'Paid',
                'Due'
            ];

            const tableRows = purchasesData.map(purchase => {
                const purchaseDue = purchase.grand_total - (purchase.paid_amount || 0);
                return [
                    (purchase.purchase_no || purchase.id).substring(0, 8),
                    formatDate(purchase.created_at),
                    purchase.items?.length || 0,
                    purchase.payment_type || 'N/A',
                    purchaseDue > 0 ? 'Pending' : 'Completed',
                    formatCurrency(purchase.grand_total),
                    formatCurrency(purchase.paid_amount || 0),
                    formatCurrency(purchaseDue)
                ];
            });

            // Add table
            autoTable(doc, {
                head: [tableColumns],
                body: tableRows,
                startY: 45,
                theme: 'grid',
                styles: { fontSize: 8, cellPadding: 2 },
                headStyles: { fillColor: [249, 115, 22], textColor: [255, 255, 255] },
                alternateRowStyles: { fillColor: [245, 245, 245] }
            });

            // Add summary statistics
            const finalY = doc.lastAutoTable.finalY + 10;
            
            doc.setFontSize(12);
            doc.setTextColor(249, 115, 22);
            doc.text('Summary Statistics', 14, finalY);
            
            doc.setFontSize(10);
            doc.setTextColor(0, 0, 0);
            doc.text(`Total Purchases: ${purchasesData.length}`, 14, finalY + 7);
            doc.text(`Total Purchase Amount: ${formatCurrency(stats?.total_purchases || 0)} Tk`, 14, finalY + 14);
            doc.text(`Total Paid: ${formatCurrency(stats?.total_paid || 0)} Tk`, 14, finalY + 21);
            doc.text(`Total Due: ${formatCurrency(stats?.total_due || 0)} Tk`, 14, finalY + 28);
            doc.text(`Current Balance: ${formatCurrency(supplier?.advance_amount || 0)} Tk`, 14, finalY + 35);

            // Save PDF
            doc.save(`supplier_ledger_${supplier?.id}_${formatDateForFilename()}.pdf`);
            
            toast.success('PDF downloaded successfully');
        } catch (error) {
            console.error('Error downloading PDF:', error);
            toast.error('Failed to download PDF');
        } finally {
            setIsDownloading(false);
        }
    };

    const handleFilter = () => {
        if (!supplier) return;

        const queryParams = {
            page: 1,
        };

        if (filterForm.data.search.trim()) {
            queryParams.search = filterForm.data.search.trim();
        }

        if (filterForm.data.start_date) {
            queryParams.start_date = filterForm.data.start_date;
        }

        if (filterForm.data.end_date) {
            queryParams.end_date = filterForm.data.end_date;
        }

        router.get(
            route("ledgers.supplier", { id: supplier.id }),
            queryParams,
            {
                preserveScroll: true,
                preserveState: true,
                replace: true,
            },
        );
    };

    const clearFilters = () => {
        if (!supplier) return;

        filterForm.setData({
            search: "",
            start_date: "",
            end_date: "",
            page: 1,
        });

        router.get(
            route("ledgers.supplier", { id: supplier.id }),
            {},
            {
                preserveScroll: true,
                preserveState: true,
                replace: true,
            },
        );
    };

    const handlePageChange = (page) => {
        if (!supplier) return;

        filterForm.setData("page", page);

        const queryParams = {
            page,
            ...(filterForm.data.search && { search: filterForm.data.search }),
            ...(filterForm.data.start_date && {
                start_date: filterForm.data.start_date,
            }),
            ...(filterForm.data.end_date && {
                end_date: filterForm.data.end_date,
            }),
        };

        router.get(
            route("ledgers.supplier", { id: supplier.id }),
            queryParams,
            {
                preserveScroll: true,
                preserveState: true,
                replace: true,
            },
        );
    };

    const formatCurrency = (amount) => {
        if (!amount && amount !== 0) return "0";
        return new Intl.NumberFormat("en-BD", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(amount);
    };

    const formatDate = (dateString) => {
        if (!dateString) return "";
        const date = new Date(dateString);
        return date.toLocaleDateString("en-BD", {
            day: "2-digit",
            month: "short",
            year: "numeric",
        });
    };

    const formatDateTime = (dateString) => {
        if (!dateString) return "";
        const date = new Date(dateString);
        return date.toLocaleDateString("en-BD", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    const getStatusBadge = (status) => {
        const statusConfig = {
            completed: {
                label: "Completed",
                color: "bg-emerald-100 text-emerald-800 border-emerald-200",
                icon: CheckCircle,
            },
            pending: {
                label: "Pending",
                color: "bg-amber-100 text-amber-800 border-amber-200",
                icon: Clock,
            },
            cancelled: {
                label: "Cancelled",
                color: "bg-gray-100 text-gray-800 border-gray-200",
                icon: XCircle,
            },
        };

        const config =
            statusConfig[status?.toLowerCase()] || statusConfig.pending;
        const Icon = config.icon;

        return (
            <span
                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${config.color}`}
            >
                <Icon className="h-3 w-3" />
                {config.label}
            </span>
        );
    };

    const getPaymentMethodBadge = (method) => {
        const methodConfig = {
            cash: {
                label: "Cash",
                color: "bg-green-100 text-green-800 border-green-200",
                icon: BanknoteIcon,
            },
            card: {
                label: "Card",
                color: "bg-blue-100 text-blue-800 border-blue-200",
                icon: CreditCardIcon,
            },
            bank_transfer: {
                label: "Bank Transfer",
                color: "bg-purple-100 text-purple-800 border-purple-200",
                icon: Building,
            },
            check: {
                label: "Check",
                color: "bg-yellow-100 text-yellow-800 border-yellow-200",
            },
            credit: {
                label: "Credit",
                color: "bg-orange-100 text-orange-800 border-orange-200",
            },
            online: {
                label: "Online",
                color: "bg-indigo-100 text-indigo-800 border-indigo-200",
            },
        };

        const config = methodConfig[method?.toLowerCase()] || {
            label: method || "Unknown",
            color: "bg-gray-100 text-gray-800 border-gray-200",
        };
        const Icon = config.icon || CreditCardIcon;

        return (
            <span
                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${config.color}`}
            >
                <Icon className="h-3 w-3" />
                {config.label}
            </span>
        );
    };

    const StatCard = ({
        title,
        value,
        subtitle,
        icon: Icon,
        color,
        trend,
        trendValue,
    }) => (
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
                <div className="flex-1">
                    <p className="text-sm font-medium text-gray-600 mb-1">
                        {title}
                    </p>
                    <p className="text-2xl font-bold text-gray-900">{value}</p>
                    {subtitle && (
                        <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
                    )}
                    {trend && (
                        <div className="flex items-center gap-1 mt-2">
                            {trend == "up" ? (
                                <ArrowUpRight className="h-4 w-4 text-emerald-500" />
                            ) : (
                                <ArrowDownRight className="h-4 w-4 text-rose-500" />
                            )}
                            <span
                                className={`text-xs font-medium ${trend === "up" ? "text-emerald-600" : "text-rose-600"}`}
                            >
                                {trendValue}
                            </span>
                        </div>
                    )}
                </div>
                <div className={`p-3 rounded-lg ${color}`}>
                    <Icon className="h-5 w-5" />
                </div>
            </div>
        </div>
    );

    const handleDueClearanceSubmit = (e) => {
        e.preventDefault();

        const paidAmount = parseFloat(paymentForm.paid_amount) || 0;
        if (paidAmount <= 0) {
            toast.error("Please enter a valid payment amount");
            return;
        }

        if (paidAmount > dueAmount) {
            toast.error(
                `Payment amount cannot exceed total due amount of ৳${formatCurrency(dueAmount)}`,
            );
            return;
        }

        // Prepare payment data
        const paymentData = {
            paid_amount: paidAmount,
            payment_type: paymentForm.payment_type,
            account_id: paymentForm.account_id,
            notes: paymentForm.notes,
            date: paymentForm.date,
            supplier_id: supplier.id,
            is_partial: isPartialPayment,
            type: "supplier",
        };

        // If partial payment, include selected purchases
        if (isPartialPayment && selectedPurchases.length > 0) {
            paymentData.selected_purchases = selectedPurchases.map(
                (purchase) => purchase.id,
            );
        }

        router.post(route("clearDue.store", supplier.id), paymentData, {
            onSuccess: () => {
                setShowDueClearance(false);
                router.reload();
            },
            onError: (errors) => {
                toast.error(
                    errors.paid_amount ||
                        errors.account_id ||
                        "An error occurred while processing the payment.",
                );
                // alert(Object.values(errors).join('\n') || 'An error occurred while processing the payment.');
            },
        });
    };

    const handlePaymentInputChange = (e) => {
        const { name, value } = e.target;
        setPaymentForm((prev) => ({
            ...prev,
            [name]: value,
        }));

        // keep focus
        setTimeout(() => {
            paidAmountRef.current?.focus();
        }, 0);
    };

    const togglePurchaseSelection = (purchase) => {
        setSelectedPurchases((prev) => {
            const isSelected = prev.some((p) => p.id === purchase.id);
            if (isSelected) {
                return prev.filter((p) => p.id !== purchase.id);
            } else {
                return [...prev, purchase];
            }
        });
    };

    const selectAllPurchases = () => {
        const purchasesData = purchases?.data || purchases || [];
        const unpaidPurchases = purchasesData.filter((purchase) => {
            const purchaseDue =
                purchase.grand_total - (purchase.paid_amount || 0);
            return purchaseDue > 0;
        });
        setSelectedPurchases(unpaidPurchases);
    };

    const clearSelection = () => {
        setSelectedPurchases([]);
    };

    const calculateSelectedDue = () => {
        return selectedPurchases.reduce((sum, purchase) => {
            const purchaseDue =
                purchase.grand_total - (purchase.paid_amount || 0);
            return sum + purchaseDue;
        }, 0);
    };

    const calculateRemainingBalance = () => {
        const paid = parseFloat(paymentForm.paid_amount) || 0;
        const remainingDue = dueAmount - paid;
        const newAdvance = advanceAmount - paid;

        return {
            remainingDue: Math.max(0, remainingDue),
            newAdvance: newAdvance,
        };
    };

    const DueClearanceForm = () => {
        const { remainingDue, newAdvance } = calculateRemainingBalance();
        const paidAmount = parseFloat(paymentForm.paid_amount) || 0;
        const selectedDue = calculateSelectedDue();

        return (
            <div className="bg-gradient-to-r from-white to-orange-50 rounded-xl shadow-lg border border-orange-100 mb-8">
                <div className="p-6">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-orange-100 to-orange-200 flex items-center justify-center">
                                <CheckCircle className="h-5 w-5 text-orange-600" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-gray-900">
                                    Clear Due Amount
                                </h2>
                                <p className="text-sm text-gray-600">
                                    Process supplier payment
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-500">
                                Total Due:
                            </span>
                            <span className="text-lg font-bold text-rose-600">
                                ৳{formatCurrency(dueAmount)}
                            </span>
                        </div>
                    </div>

                    <form onSubmit={handleDueClearanceSubmit}>
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Left Column - Supplier Info */}
                            <div className="lg:col-span-1 space-y-4">
                                <div className="p-4 bg-white rounded-lg border border-gray-200">
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center">
                                            <Building2 className="h-5 w-5 text-orange-600" />
                                        </div>
                                        <div>
                                            <h4 className="font-semibold text-gray-900">
                                                {supplier?.name}
                                            </h4>
                                            <p className="text-sm text-gray-600">
                                                {supplier?.phone || "No phone"}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                                            <span className="text-sm text-gray-600">
                                                Current Balance
                                            </span>
                                            <span
                                                className={`font-medium ${advanceAmount >= 0 ? "text-emerald-600" : "text-rose-600"}`}
                                            >
                                                ৳{formatCurrency(advanceAmount)}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                                            <span className="text-sm text-gray-600">
                                                Total Due
                                            </span>
                                            <span className="font-medium text-rose-600">
                                                ৳{formatCurrency(dueAmount)}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Payment Options */}
                                <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                                    <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                        <CreditCardIcon className="h-4 w-4" />
                                        Payment Options
                                    </h4>
                                    <div className="space-y-3">
                                        <label className="flex items-center gap-2 p-2 bg-white rounded border hover:bg-blue-50 cursor-pointer">
                                            <input
                                                type="radio"
                                                name="payment_option"
                                                checked={!isPartialPayment}
                                                onChange={() =>
                                                    setIsPartialPayment(false)
                                                }
                                                className="h-4 w-4 text-orange-600"
                                            />
                                            <div>
                                                <span className="font-medium">
                                                    Full Payment
                                                </span>
                                                <p className="text-xs text-gray-500">
                                                    Pay all due amounts
                                                </p>
                                            </div>
                                        </label>
                                        {/* <label className="flex items-center gap-2 p-2 bg-white rounded border hover:bg-blue-50 cursor-pointer">
                      <input
                        type="radio"
                        name="payment_option"
                        checked={isPartialPayment}
                        onChange={() => setIsPartialPayment(true)}
                        className="h-4 w-4 text-orange-600"
                      />
                      <div>
                        <span className="font-medium">Partial Payment</span>
                        <p className="text-xs text-gray-500">Pay selected invoices</p>
                      </div>
                    </label> */}
                                    </div>

                                    {isPartialPayment && (
                                        <div className="mt-4">
                                            <div className="flex justify-between items-center mb-2">
                                                <span className="text-sm text-gray-600">
                                                    Selected Due:
                                                </span>
                                                <span className="font-bold text-blue-600">
                                                    ৳
                                                    {formatCurrency(
                                                        selectedDue,
                                                    )}
                                                </span>
                                            </div>
                                            <div className="flex gap-2">
                                                <button
                                                    type="button"
                                                    onClick={selectAllPurchases}
                                                    className="flex-1 px-3 py-2 text-sm bg-white border border-gray-300 hover:bg-gray-50 rounded-lg"
                                                >
                                                    Select All
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={clearSelection}
                                                    className="flex-1 px-3 py-2 text-sm bg-white border border-gray-300 hover:bg-gray-50 rounded-lg"
                                                >
                                                    Clear All
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Middle Column - Payment Form */}
                            <div className="lg:col-span-2 space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* Paid Amount */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Paid Amount (৳)
                                        </label>
                                        <div className="relative">
                                            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                                            <input
                                                ref={paidAmountRef}
                                                type="number"
                                                name="paid_amount"
                                                value={paymentForm.paid_amount}
                                                onChange={
                                                    handlePaymentInputChange
                                                }
                                                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg
                                                focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                                placeholder="0.00"
                                                min="0"
                                                max={
                                                    isPartialPayment
                                                        ? selectedDue
                                                        : dueAmount
                                                }
                                                
                                                required
                                            />
                                        </div>
                                        <p className="text-xs text-gray-500 mt-1">
                                            Max: ৳
                                            {formatCurrency(
                                                isPartialPayment
                                                    ? selectedDue
                                                    : dueAmount,
                                            )}
                                        </p>
                                    </div>

                                    {/* Payment Date */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Payment Date
                                        </label>
                                        <div className="relative">
                                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                                            <input
                                                type="date"
                                                name="date"
                                                value={paymentForm.date}
                                                onChange={
                                                    handlePaymentInputChange
                                                }
                                                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg
                                 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                                required
                                            />
                                        </div>
                                    </div>

                                    {/* Payment Type */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Payment Type
                                        </label>
                                        <select
                                            name="payment_type"
                                            required
                                            value={paymentForm.payment_type}
                                            onChange={handlePaymentInputChange}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg
                               focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                        >
                                            <option value="">
                                                Select Payment Type
                                            </option>
                                            <option value="account_adjustment">
                                                Account Payment
                                            </option>
                                            <option value="advance_adjustment">
                                                Advance Adjustment
                                            </option>
                                        </select>
                                    </div>

                                    {/* Account */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Account
                                        </label>
                                        <select
                                            name="account_id"
                                            value={paymentForm.account_id}
                                            onChange={handlePaymentInputChange}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg
                               focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                            required
                                        >
                                            <option value="">
                                                Select Account
                                            </option>
                                            {accounts.map((account) => (
                                                <option
                                                    key={account.id}
                                                    value={account.id}
                                                >
                                                    {account.name} (৳
                                                    {formatCurrency(
                                                        account.current_balance ||
                                                            account.balance,
                                                    )}
                                                    )
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                {/* Advanced Options */}
                                <div className="border-t pt-4">
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setShowAdvancedOptions(
                                                !showAdvancedOptions,
                                            )
                                        }
                                        className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-2"
                                    >
                                        {showAdvancedOptions ? "Hide" : "Show"}{" "}
                                        Advanced Options
                                        <ArrowRight
                                            className={`h-3 w-3 transition-transform ${showAdvancedOptions ? "rotate-90" : ""}`}
                                        />
                                    </button>

                                    {showAdvancedOptions && (
                                        <div className="p-4 bg-gray-50 rounded-lg">
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Notes (Optional)
                                            </label>
                                            <textarea
                                                name="notes"
                                                value={paymentForm.notes}
                                                onChange={
                                                    handlePaymentInputChange
                                                }
                                                rows="2"
                                                className="w-full px-4 py-3 border border-gray-300 rounded-lg
                                 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                                placeholder="Add any notes about this payment..."
                                            />
                                        </div>
                                    )}
                                </div>

                                {/* Payment Summary */}
                                <div className="p-4 bg-gradient-to-r from-orange-50 to-blue-50 rounded-lg border border-orange-100">
                                    <h4 className="font-semibold text-gray-900 mb-4">
                                        Payment Summary
                                    </h4>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className="text-center p-3 bg-white rounded-lg border">
                                            <p className="text-sm text-gray-600 mb-1">
                                                Payment Amount
                                            </p>
                                            <p className="text-xl font-bold text-blue-600">
                                                ৳{formatCurrency(paidAmount)}
                                            </p>
                                        </div>
                                        <div className="text-center p-3 bg-white rounded-lg border">
                                            <p className="text-sm text-gray-600 mb-1">
                                                Remaining Due
                                            </p>
                                            <p
                                                className={`text-xl font-bold ${remainingDue > 0 ? "text-amber-600" : "text-emerald-600"}`}
                                            >
                                                ৳{formatCurrency(remainingDue)}
                                            </p>
                                        </div>
                                        <div className="text-center p-3 bg-white rounded-lg border">
                                            <p className="text-sm text-gray-600 mb-1">
                                                New Balance
                                            </p>
                                            <p
                                                className={`text-xl font-bold ${newAdvance >= 0 ? "text-emerald-600" : "text-rose-600"}`}
                                            >
                                                ৳{formatCurrency(newAdvance)}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex gap-3 pt-4 border-t">
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setShowDueClearance(false)
                                        }
                                        className="px-6 py-3 text-gray-700 bg-gray-100 hover:bg-gray-200
                             font-medium rounded-lg transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={
                                            paidAmount <= 0 ||
                                            paidAmount >
                                                (isPartialPayment
                                                    ? selectedDue
                                                    : dueAmount)
                                        }
                                        className="flex-1 px-6 py-3 bg-gradient-to-r from-orange-600 to-orange-700
                             text-white font-medium rounded-lg hover:from-orange-700
                             hover:to-orange-800 transition-all disabled:opacity-50
                             disabled:cursor-not-allowed shadow-sm hover:shadow"
                                    >
                                        <div className="flex items-center justify-center gap-2">
                                            <CheckCircle className="h-4 w-4" />
                                            Process Payment
                                        </div>
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Selected Invoices (for partial payment) */}
                        {isPartialPayment && selectedPurchases.length > 0 && (
                            <div className="mt-6 pt-6 border-t">
                                <h4 className="font-semibold text-gray-900 mb-3">
                                    Selected Purchase Invoices
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {selectedPurchases.map((purchase) => {
                                        const purchaseDue = purchase.grand_total - (purchase.paid_amount || 0);
                                        return (
                                            <div
                                                key={purchase.id}
                                                className="p-3 bg-white border rounded-lg hover:border-orange-300 cursor-pointer"
                                                onClick={() =>
                                                    togglePurchaseSelection(
                                                        purchase,
                                                    )
                                                }
                                            >
                                                <div className="flex items-center justify-between mb-2">
                                                    <div className="flex items-center gap-2">
                                                        <div
                                                            className={`h-4 w-4 rounded-full border flex items-center justify-center ${
                                                                selectedPurchases.some(
                                                                    (p) =>
                                                                        p.id ===
                                                                        purchase.id,
                                                                )
                                                                    ? "bg-orange-600 border-orange-600"
                                                                    : "border-gray-300"
                                                            }`}
                                                        >
                                                            {selectedPurchases.some(
                                                                (p) =>
                                                                    p.id ===
                                                                    purchase.id,
                                                            ) && (
                                                                <Check className="h-3 w-3 text-white" />
                                                            )}
                                                        </div>
                                                        <span className="font-medium text-gray-900">
                                                            {purchase.purchase_no ||
                                                                purchase.id}
                                                        </span>
                                                    </div>
                                                    <span className="text-sm font-bold text-rose-600">
                                                        ৳
                                                        {formatCurrency(
                                                            purchaseDue,
                                                        )}
                                                    </span>
                                                </div>
                                                <div className="text-xs text-gray-500">
                                                    {formatDate(
                                                        purchase.created_at,
                                                    )}{" "}
                                                    • Total: ৳
                                                    {formatCurrency(
                                                        purchase.grand_total,
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </form>
                </div>
            </div>
        );
    };

    const hasActiveFilters =
        filterForm.data.search ||
        filterForm.data.start_date ||
        filterForm.data.end_date;
    const purchasesData = purchases?.data || purchases || [];
    const totalItems = purchases?.total || purchasesData.length;

    // Show loading state
    if (isLoading || !supplier) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">
                        Loading supplier ledger...
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <Head title={`${supplier?.name || "Supplier"} Ledger`} />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header Section */}
                <div className="mb-8">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                        <div className="flex items-center gap-4">
                            <Link
                                href={route("ledgers.index")}
                                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                <ChevronLeft className="h-5 w-5" />
                            </Link>
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900">
                                    Supplier Ledger
                                </h1>
                                <p className="text-gray-600 mt-1">
                                    Detailed purchase history and analytics for{" "}
                                    {supplier?.name}
                                </p>
                            </div>
                        </div>

                        {dueAmount > 0 && (
                            <>
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={() =>
                                            setShowDueClearance(
                                                !showDueClearance,
                                            )
                                        }
                                        className={`px-4 py-2.5 text-sm font-medium rounded-xl flex items-center gap-2 shadow-sm hover:shadow transition-all ${
                                            showDueClearance
                                                ? "bg-gray-100 text-gray-700 hover:bg-gray-200"
                                                : "bg-gradient-to-r from-orange-600 to-orange-700 text-white hover:from-orange-700 hover:to-orange-800"
                                        }`}
                                    >
                                        <CheckCircle className="h-4 w-4" />
                                        {showDueClearance
                                            ? "Hide Due Clearance"
                                            : "Clear Due Amount"}
                                    </button>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Due Clearance Form (Shown on top when active) */}
                    {showDueClearance && <DueClearanceForm />}

                    {/* Supplier Info Card */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                            <div className="flex items-start gap-4">
                                <div className="h-16 w-16 rounded-full bg-gradient-to-br from-orange-100 to-orange-200 flex items-center justify-center">
                                    <Building2 className="h-7 w-7 text-orange-600" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-gray-900">
                                        {supplier?.name || "Unknown Supplier"}
                                    </h2>
                                    <div className="flex flex-wrap items-center gap-4 mt-2">
                                        {supplier?.phone && (
                                            <div className="flex items-center gap-2 text-sm text-gray-600">
                                                <Phone className="h-4 w-4" />
                                                {supplier.phone}
                                            </div>
                                        )}
                                        {supplier?.email && (
                                            <div className="flex items-center gap-2 text-sm text-gray-600">
                                                <Mail className="h-4 w-4" />
                                                {supplier.email}
                                            </div>
                                        )}
                                        {supplier?.address && (
                                            <div className="flex items-center gap-2 text-sm text-gray-600">
                                                <MapPin className="h-4 w-4" />
                                                <span className="max-w-xs">
                                                    {supplier.address}
                                                </span>
                                            </div>
                                        )}
                                        {supplier?.company_name && (
                                            <div className="flex items-center gap-2 text-sm text-gray-600">
                                                <Building2 className="h-4 w-4" />
                                                {supplier.company_name}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-col md:items-end gap-2">
                                <div
                                    className={`text-2xl font-bold ${(supplier?.advance_amount || 0) >= 0 ? "text-emerald-600" : "text-rose-600"}`}
                                >
                                    ৳
                                    {formatCurrency(
                                        supplier?.advance_amount || 0,
                                    )}
                                </div>
                                <div className="text-sm text-gray-500">
                                    Current Balance
                                </div>
                                <div className="text-sm">
                                    <span className="text-gray-600">
                                        Total Due:{" "}
                                    </span>
                                    <span className="font-medium text-rose-600">
                                        ৳{formatCurrency(dueAmount)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Collapsible Filters Section */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-6 overflow-hidden">
                    <div 
                        className="px-5 py-4 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors"
                        onClick={toggleFilters}
                    >
                        <div className="flex items-center gap-2">
                            <Filter className="h-5 w-5 text-orange-600" />
                            <h3 className="text-lg font-semibold text-gray-900">
                                Filter Purchases
                            </h3>
                            {hasActiveFilters && (
                                <span className="badge badge-sm bg-orange-600 text-white ml-2">Active</span>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            {hasActiveFilters && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        clearFilters();
                                    }}
                                    className="text-sm font-medium text-gray-600 hover:text-gray-900 flex items-center gap-2 transition-colors"
                                >
                                    <RefreshCw className="h-4 w-4" />
                                    Clear
                                </button>
                            )}
                            <button className="p-1 hover:bg-gray-200 rounded-full transition-colors">
                                {showFilters ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                            </button>
                        </div>
                    </div>

                    {showFilters && (
                        <div className="px-5 pb-5">
                            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                                <div className="md:col-span-4">
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                        <input
                                            type="search"
                                            value={filterForm.data.search}
                                            onChange={(e) =>
                                                filterForm.setData(
                                                    "search",
                                                    e.target.value,
                                                )
                                            }
                                            onKeyPress={(e) =>
                                                e.key === "Enter" && handleFilter()
                                            }
                                            placeholder="Search invoice number..."
                                            className="w-full h-11 pl-9 pr-4 border border-gray-300 rounded-lg
                                    focus:ring-2 focus:ring-orange-500 focus:border-transparent
                                    bg-gray-50 text-gray-700 placeholder-gray-500"
                                        />
                                    </div>
                                </div>

                                <div className="md:col-span-3">
                                    <div className="relative">
                                        <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                        <input
                                            type="date"
                                            value={filterForm.data.start_date}
                                            onChange={(e) =>
                                                filterForm.setData(
                                                    "start_date",
                                                    e.target.value,
                                                )
                                            }
                                            className="w-full h-11 pl-9 pr-4 border border-gray-300 rounded-lg bg-gray-50
                                   focus:ring-2 focus:ring-orange-500 focus:border-transparent text-gray-700"
                                        />
                                    </div>
                                </div>

                                <div className="md:col-span-3">
                                    <div className="relative">
                                        <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                        <input
                                            type="date"
                                            value={filterForm.data.end_date}
                                            onChange={(e) =>
                                                filterForm.setData(
                                                    "end_date",
                                                    e.target.value,
                                                )
                                            }
                                            className="w-full h-11 pl-9 pr-4 border border-gray-300 rounded-lg bg-gray-50
                                   focus:ring-2 focus:ring-orange-500 focus:border-transparent text-gray-700"
                                            min={filterForm.data.start_date}
                                        />
                                    </div>
                                </div>

                                <div className="md:col-span-2">
                                    <button
                                        onClick={handleFilter}
                                        className="w-full h-11 bg-gradient-to-r from-orange-600 to-orange-700 text-white
                                  font-medium rounded-lg hover:from-orange-700 hover:to-orange-800
                                  focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2
                                  transition-all duration-200"
                                    >
                                        Apply
                                    </button>
                                </div>
                            </div>

                            {/* Active Filters Display */}
                            {hasActiveFilters && (
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

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
                    <StatCard
                        title="Total Purchases"
                        value={`৳${formatCurrency(stats?.total_purchases || 0)}`}
                        subtitle={`${totalItems} purchase${totalItems !== 1 ? "s" : ""}`}
                        icon={ShoppingBag}
                        color="bg-gradient-to-br from-orange-500/10 to-orange-600/10 text-orange-600"
                    />

                    <StatCard
                        title="Total Transactions"
                        value={stats?.total_transactions || 0}
                        subtitle="All time purchases"
                        icon={Receipt}
                        color="bg-gradient-to-br from-blue-500/10 to-blue-600/10 text-blue-600"
                    />

                    <StatCard
                        title="Total Due Amount"
                        value={`৳${formatCurrency(stats?.total_due || 0)}`}
                        subtitle="due amount of purchases"
                        icon={TrendingUp}
                        color="bg-gradient-to-br from-purple-500/10 to-purple-600/10 text-purple-600"
                    />

                    <StatCard
                        title="Current Balance"
                        value={`৳${formatCurrency(supplier?.advance_amount || 0)}`}
                        subtitle={
                            (supplier?.advance_amount || 0) >= 0
                                ? "Supplier credit"
                                : "Supplier debit"
                        }
                        icon={Wallet}
                        color={
                            (supplier?.advance_amount || 0) >= 0
                                ? "bg-gradient-to-br from-emerald-500/10 to-emerald-600/10 text-emerald-600"
                                : "bg-gradient-to-br from-rose-500/10 to-rose-600/10 text-rose-600"
                        }
                    />
                </div>

                {/* Download Button */}
                <div className="flex justify-end mb-4">
                    <div className="dropdown dropdown-end">
                        <button 
                            className="btn bg-green-600 text-white btn-sm"
                            disabled={isDownloading || purchasesData.length === 0}
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

                {/* Charts Section */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                    {/* Monthly Purchases Chart */}
                    {monthlyChartData && (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                            <div className="flex items-center justify-between mb-5">
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                                        <LineChart className="h-5 w-5" />
                                        Monthly Purchases Trend
                                    </h3>
                                    <p className="text-sm text-gray-600 mt-1">
                                        Purchase performance over time
                                    </p>
                                </div>
                            </div>
                            <div className="h-64">
                                <Line
                                    data={monthlyChartData}
                                    options={{
                                        responsive: true,
                                        maintainAspectRatio: false,
                                        plugins: {
                                            legend: {
                                                display: false,
                                            },
                                        },
                                        scales: {
                                            y: {
                                                beginAtZero: true,
                                                ticks: {
                                                    callback: function (value) {
                                                        return (
                                                            "৳" +
                                                            formatCurrency(
                                                                value,
                                                            )
                                                        );
                                                    },
                                                },
                                            },
                                        },
                                    }}
                                />
                            </div>
                        </div>
                    )}

                    {/* Payment Methods Chart */}
                    {paymentChartData && (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                            <div className="flex items-center justify-between mb-5">
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                                        <PieChartIcon className="h-5 w-5" />
                                        Payment Methods
                                    </h3>
                                    <p className="text-sm text-gray-600 mt-1">
                                        Distribution by payment type
                                    </p>
                                </div>
                            </div>
                            <div className="h-64 flex items-center justify-center">
                                <div className="w-full max-w-xs">
                                    <Pie
                                        data={paymentChartData}
                                        options={{
                                            responsive: true,
                                            maintainAspectRatio: true,
                                            plugins: {
                                                legend: {
                                                    position: "right",
                                                    labels: {
                                                        boxWidth: 12,
                                                        padding: 15,
                                                        usePointStyle: true,
                                                        pointStyle: "circle",
                                                    },
                                                },
                                            },
                                        }}
                                    />
                                </div>
                            </div>
                            {Object.keys(paymentStats).length > 0 && (
                                <div className="mt-4 pt-4 border-t border-gray-100">
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                        {Object.entries(paymentStats).map(
                                            ([method, percentage]) => (
                                                <div
                                                    key={method}
                                                    className="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
                                                >
                                                    <span className="text-sm font-medium text-gray-700">
                                                        {method}
                                                    </span>
                                                    <span className="text-sm font-bold text-gray-900">
                                                        {percentage}%
                                                    </span>
                                                </div>
                                            ),
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Purchases Section */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    {/* Tabs */}
                    <div className="border-b border-gray-200">
                        <nav className="flex flex-wrap px-6" aria-label="Tabs">
                            <button
                                onClick={() => setActiveTab("transactions")}
                                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                                    activeTab === "transactions"
                                        ? "border-orange-600 text-orange-600"
                                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                                }`}
                            >
                                <div className="flex items-center gap-2">
                                    <Receipt className="h-4 w-4" />
                                    Purchases ({totalItems})
                                </div>
                            </button>
                            <button
                                onClick={() => setActiveTab("details")}
                                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                                    activeTab === "details"
                                        ? "border-orange-600 text-orange-600"
                                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                                }`}
                            >
                                <div className="flex items-center gap-2">
                                    <Building2 className="h-4 w-4" />
                                    Supplier Details
                                </div>
                            </button>
                        </nav>
                    </div>

                    {/* Tab Content */}
                    <div className="p-6">
                        {activeTab === "transactions" ? (
                            purchasesData.length > 0 ? (
                                <>
                                    <div className="overflow-x-auto">
                                        <table className="min-w-full divide-y divide-gray-200">
                                            <thead className="bg-gray-50">
                                                <tr>
                                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider">
                                                        Invoice No
                                                    </th>
                                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider">
                                                        Date
                                                    </th>
                                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider">
                                                        Items
                                                    </th>
                                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider">
                                                        Payment Method
                                                    </th>
                                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider">
                                                        Status
                                                    </th>
                                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider">
                                                        Total Amount
                                                    </th>
                                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider">
                                                        Paid Amount
                                                    </th>
                                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider">
                                                        Due Amount
                                                    </th>
                                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider">
                                                        Actions
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white divide-y divide-gray-100">
                                                {purchasesData.map(
                                                    (purchase) => {
                                                        const purchaseDue =
                                                            purchase.grand_total -
                                                            (purchase.paid_amount ||
                                                                0);
                                                        return (
                                                            <tr
                                                                key={
                                                                    purchase.id
                                                                }
                                                                className="hover:bg-gray-50/50 transition-colors"
                                                            >
                                                                <td className="px-4 py-4 whitespace-nowrap">
                                                                    <div className="text-sm font-medium text-gray-900">
                                                                        {purchase.purchase_no ||
                                                                            purchase.id}
                                                                    </div>
                                                                </td>
                                                                <td className="px-4 py-4 whitespace-nowrap">
                                                                    <div className="text-sm text-gray-900">
                                                                        {formatDate(
                                                                            purchase.created_at,
                                                                        )}
                                                                    </div>
                                                                    <div className="text-xs text-gray-500">
                                                                        {formatDateTime(
                                                                            purchase.created_at,
                                                                        )}
                                                                    </div>
                                                                </td>
                                                                <td className="px-4 py-4">
                                                                    <div className="text-sm text-gray-900">
                                                                        {purchase
                                                                            .items
                                                                            ?.length ||
                                                                            0}{" "}
                                                                        items
                                                                    </div>
                                                                    {purchase
                                                                        .items?.[0] && (
                                                                        <div className="text-xs text-gray-500 truncate max-w-xs">
                                                                            {
                                                                                purchase
                                                                                    .items[0]
                                                                                    .product_name
                                                                            }
                                                                            {purchase
                                                                                .items
                                                                                ?.length >
                                                                                1 &&
                                                                                ` +${purchase.items.length - 1} more`}
                                                                        </div>
                                                                    )}
                                                                </td>
                                                                <td className="px-4 py-4 whitespace-nowrap">
                                                                    {getPaymentMethodBadge(
                                                                        purchase.payment_type,
                                                                    )}
                                                                </td>
                                                                <td className="px-4 py-4 whitespace-nowrap">
                                                                    {getStatusBadge(
                                                                        purchaseDue >
                                                                            0
                                                                            ? "pending"
                                                                            : "completed",
                                                                    )}
                                                                </td>
                                                                <td className="px-4 py-4 whitespace-nowrap">
                                                                    <div className="text-sm font-bold text-gray-900">
                                                                        ৳
                                                                        {formatCurrency(
                                                                            purchase.grand_total,
                                                                        )}
                                                                    </div>
                                                                </td>
                                                                <td className="px-4 py-4 whitespace-nowrap">
                                                                    <div className="text-sm font-bold text-emerald-600">
                                                                        ৳
                                                                        {formatCurrency(
                                                                            purchase.paid_amount ||
                                                                                0,
                                                                        )}
                                                                    </div>
                                                                </td>
                                                                <td className="px-4 py-4 whitespace-nowrap">
                                                                    <div
                                                                        className={`text-sm font-bold ${purchaseDue > 0 ? "text-rose-600" : "text-emerald-600"}`}
                                                                    >
                                                                        ৳
                                                                        {formatCurrency(
                                                                            purchaseDue,
                                                                        )}
                                                                    </div>
                                                                </td>
                                                                <td className="px-4 py-4 whitespace-nowrap">
                                                                    <div className="flex items-center gap-2">
                                                                        <Link
                                                                            href={`/purchase/${purchase.id}`}
                                                                            className="p-1.5 text-gray-600 hover:text-orange-600 hover:bg-orange-50 rounded-md transition-colors"
                                                                            title="View Details"
                                                                        >
                                                                            <Eye className="h-4 w-4" />
                                                                        </Link>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        );
                                                    },
                                                )}
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* Pagination */}
                                    {purchases?.meta && (
                                        <div className="mt-6 pt-6 border-t border-gray-100">
                                            <Pagination
                                                data={purchases}
                                                onPageChange={handlePageChange}
                                                currentPage={
                                                    filterForm.data.page
                                                }
                                            />
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="py-12 text-center">
                                    <div className="mx-auto h-16 w-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                                        <ShoppingBag className="h-8 w-8 text-gray-400" />
                                    </div>
                                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                        No purchases found
                                    </h3>
                                    <p className="text-gray-600 max-w-md mx-auto mb-6">
                                        {hasActiveFilters
                                            ? "Try adjusting your search filters to find purchases."
                                            : "This supplier doesn't have any purchases yet."}
                                    </p>
                                    {hasActiveFilters && (
                                        <button
                                            onClick={clearFilters}
                                            className="px-5 py-2.5 bg-gradient-to-r from-orange-600 to-orange-700 text-white font-medium rounded-lg hover:from-orange-700 hover:to-orange-800"
                                        >
                                            Clear Filters
                                        </button>
                                    )}
                                </div>
                            )
                        ) : (
                            /* Supplier Details Tab */
                            <div className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-4">
                                        <h4 className="text-lg font-semibold text-gray-900">
                                            Contact Information
                                        </h4>
                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between py-2 border-b border-gray-100">
                                                <span className="text-sm font-medium text-gray-600">
                                                    Phone
                                                </span>
                                                <span className="text-sm text-gray-900">
                                                    {supplier?.phone ||
                                                        "Not provided"}
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-between py-2 border-b border-gray-100">
                                                <span className="text-sm font-medium text-gray-600">
                                                    Email
                                                </span>
                                                <span className="text-sm text-gray-900">
                                                    {supplier?.email ||
                                                        "Not provided"}
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-between py-2 border-b border-gray-100">
                                                <span className="text-sm font-medium text-gray-600">
                                                    Address
                                                </span>
                                                <span className="text-sm text-gray-900 text-right max-w-xs">
                                                    {supplier?.address ||
                                                        "Not provided"}
                                                </span>
                                            </div>
                                            {supplier?.company_name && (
                                                <div className="flex items-center justify-between py-2 border-b border-gray-100">
                                                    <span className="text-sm font-medium text-gray-600">
                                                        Company
                                                    </span>
                                                    <span className="text-sm text-gray-900">
                                                        {supplier.company_name}
                                                    </span>
                                                </div>
                                            )}
                                            {supplier?.contact_person && (
                                                <div className="flex items-center justify-between py-2 border-b border-gray-100">
                                                    <span className="text-sm font-medium text-gray-600">
                                                        Contact Person
                                                    </span>
                                                    <span className="text-sm text-gray-900">
                                                        {
                                                            supplier.contact_person
                                                        }
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <h4 className="text-lg font-semibold text-gray-900">
                                            Purchase Summary
                                        </h4>
                                        <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm text-gray-600">
                                                    First Purchase
                                                </span>
                                                <span className="text-sm font-medium text-gray-900">
                                                    {purchasesData.length > 0
                                                        ? formatDate(
                                                              purchasesData[0]
                                                                  ?.created_at,
                                                          )
                                                        : "No purchases yet"}
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm text-gray-600">
                                                    Last Purchase
                                                </span>
                                                <span className="text-sm font-medium text-gray-900">
                                                    {purchasesData.length > 0
                                                        ? formatDate(
                                                              purchasesData[
                                                                  purchasesData.length -
                                                                      1
                                                              ]?.created_at,
                                                          )
                                                        : "No purchases yet"}
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm text-gray-600">
                                                    Purchase Frequency
                                                </span>
                                                <span className="text-sm font-medium text-gray-900">
                                                    {totalItems} purchase
                                                    {totalItems !== 1
                                                        ? "s"
                                                        : ""}
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm text-gray-600">
                                                    Supplier Since
                                                </span>
                                                <span className="text-sm font-medium text-gray-900">
                                                    {formatDate(
                                                        supplier?.created_at,
                                                    )}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}