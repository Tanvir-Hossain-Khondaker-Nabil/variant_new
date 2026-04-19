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
    AlertCircle,
    ArrowDownRight,
    ArrowRight,
    ArrowUpRight,
    BanknoteIcon,
    Building,
    Calendar,
    CalendarDays,
    Check,
    CheckCircle,
    ChevronLeft,
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
    TrendingUp,
    User,
    Wallet,
    XCircle,
    Download,
    ChevronDown,
    ChevronUp,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Line, Pie } from "react-chartjs-2";
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { toast } from "react-toastify";

// Register ChartJS components
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

export default function CustomerLedger({
    customer = null,
    sales = [],
    stats = {},
    chart_data = {},
    filters = {},
    accounts = [],
}) {
    const { auth } = usePage().props;
    const [activeTab, setActiveTab] = useState("transactions");
    const [selectedSale, setSelectedSale] = useState(null);
    const [exportFormat, setExportFormat] = useState("pdf");
    const [paymentStats, setPaymentStats] = useState({});
    const [monthlyChartData, setMonthlyChartData] = useState(null);
    const [paymentChartData, setPaymentChartData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [showFilters, setShowFilters] = useState(true);
    const [isDownloading, setIsDownloading] = useState(false);

    const paidAmountRef = useRef(null);

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
        type: "customer",
    });
    const [selectedSales, setSelectedSales] = useState([]);
    const [isPartialPayment, setIsPartialPayment] = useState(false);
    const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);

    // Initialize filter form
    const filterForm = useForm({
        search: filters.search || "",
        start_date: filters.start_date || "",
        end_date: filters.end_date || "",
    });

    // Check if data is loaded
    useEffect(() => {
        if (customer) {
            setIsLoading(false);
            // Calculate total due amount
            const totalDue = sales.reduce((sum, sale) => {
                const saleDue = sale.grand_total - (sale.paid_amount || 0);
                return sum + Math.max(0, saleDue);
            }, 0);
            setDueAmount(totalDue);
            setAdvanceAmount(customer?.advance_amount || 0);

            // Initialize payment form with total due
            setPaymentForm((prev) => ({
                ...prev,
                paid_amount: totalDue.toString(),
                account_id: accounts.length > 0 ? accounts[0].id : "",
            }));
        }
    }, [customer, sales, accounts]);

    // Prepare chart data when component mounts or data changes
    useEffect(() => {
        if (!customer) return;

        // Prepare monthly sales chart
        if (chart_data.monthly_sales) {
            const monthlyLabels = Object.keys(chart_data.monthly_sales);
            const monthlyValues = Object.values(chart_data.monthly_sales);

            setMonthlyChartData({
                labels: monthlyLabels,
                datasets: [
                    {
                        label: "Monthly Sales",
                        data: monthlyValues,
                        backgroundColor: "rgba(59, 130, 246, 0.1)",
                        borderColor: "rgb(59, 130, 246)",
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
                "rgba(34, 197, 94, 0.8)",
                "rgba(249, 115, 22, 0.8)",
                "rgba(59, 130, 246, 0.8)",
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
    }, [chart_data, customer]);

    const handleFilter = () => {
        if (!customer) return;

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

        router.get(
            route("ledgers.customer", { id: customer.id }),
            queryParams,
            {
                preserveScroll: true,
                preserveState: true,
                replace: true,
            },
        );
    };

    const clearFilters = () => {
        if (!customer) return;

        filterForm.setData({
            search: "",
            start_date: "",
            end_date: "",
        });
        setTimeout(() => {
            router.get(
                route("ledgers.customer", { id: customer.id }),
                {},
                {
                    preserveScroll: true,
                    preserveState: true,
                },
            );
        }, 0);
    };

    // Toggle filter section
    const toggleFilters = () => {
        setShowFilters(!showFilters);
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

    // Prepare data for export
    const prepareExportData = () => {
        return sales.map(sale => {
            const saleDue = sale.grand_total - (sale.paid_amount || 0);
            
            return {
                'Invoice No': sale.invoice_no || sale.id,
                'Date': formatDate(sale.created_at),
                'Time': new Date(sale.created_at).toLocaleTimeString(),
                'Items Count': sale.items?.length || 0,
                'Payment Method': sale.payment_type || 'N/A',
                'Status': saleDue > 0 ? 'Pending' : 'Paid',
                'Total Amount (Tk)': formatCurrency(sale.grand_total),
                'Paid Amount (Tk)': formatCurrency(sale.paid_amount || 0),
                'Due Amount (Tk)': formatCurrency(saleDue),
                'Created By': sale.creator?.name || 'System'
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
            csvRows.push('CUSTOMER INFORMATION');
            csvRows.push(`Customer Name,${customer?.customer_name || 'N/A'}`);
            csvRows.push(`Phone,${customer?.phone || 'N/A'}`);
            csvRows.push(`Email,${customer?.email || 'N/A'}`);
            csvRows.push(`Address,${customer?.address || 'N/A'}`);
            csvRows.push(`Current Balance,${formatCurrency(customer?.advance_amount || 0)}`);

            csvRows.push('');
            csvRows.push('FILTER INFORMATION');
            csvRows.push(`Search,${filterForm.data.search || 'None'}`);
            csvRows.push(`Date From,${filterForm.data.start_date || 'None'}`);
            csvRows.push(`Date To,${filterForm.data.end_date || 'None'}`);

            csvRows.push('');
            csvRows.push('SUMMARY STATISTICS');
            csvRows.push(`Total Transactions,${sales.length}`);
            csvRows.push(`Total Sales Amount,${formatCurrency(stats?.total_sales || 0)}`);
            csvRows.push(`Total Due Amount,${formatCurrency(stats?.total_due || 0)}`);

            const csvString = csvRows.join('\n');
            
            const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.href = url;
            link.download = `customer_ledger_${customer?.id}_${formatDateForFilename()}.csv`;
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

            // Customer info sheet
            const customerInfo = [
                { 'Field': 'Customer Name', 'Value': customer?.customer_name || 'N/A' },
                { 'Field': 'Phone', 'Value': customer?.phone || 'N/A' },
                { 'Field': 'Email', 'Value': customer?.email || 'N/A' },
                { 'Field': 'Address', 'Value': customer?.address || 'N/A' },
                { 'Field': 'Current Balance', 'Value': formatCurrency(customer?.advance_amount || 0) }
            ];
            const wsCustomer = XLSX.utils.json_to_sheet(customerInfo);

            // Filter info sheet
            const filterData = [
                { 'Filter': 'Search', 'Value': filterForm.data.search || 'None' },
                { 'Filter': 'Date From', 'Value': filterForm.data.start_date || 'None' },
                { 'Filter': 'Date To', 'Value': filterForm.data.end_date || 'None' }
            ];
            const wsFilters = XLSX.utils.json_to_sheet(filterData);

            // Summary sheet
            const summaryData = [
                { 'Metric': 'Total Transactions', 'Value': sales.length },
                { 'Metric': 'Total Sales Amount', 'Value': formatCurrency(stats?.total_sales || 0) },
                { 'Metric': 'Total Due Amount', 'Value': formatCurrency(stats?.total_due || 0) }
            ];
            const wsSummary = XLSX.utils.json_to_sheet(summaryData);

            XLSX.utils.book_append_sheet(wb, ws, 'Transactions');
            XLSX.utils.book_append_sheet(wb, wsCustomer, 'Customer Info');
            XLSX.utils.book_append_sheet(wb, wsFilters, 'Filters Applied');
            XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');

            XLSX.writeFile(wb, `customer_ledger_${customer?.id}_${formatDateForFilename()}.xlsx`);
            
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
            
            if (sales.length === 0) {
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
            doc.setTextColor(30, 77, 43);
            doc.text(`Customer Ledger: ${customer?.customer_name || 'Customer'}`, 14, 15);
            
            // Add customer info
            doc.setFontSize(10);
            doc.setTextColor(100, 100, 100);
            doc.text(`Phone: ${customer?.phone || 'N/A'} | Email: ${customer?.email || 'N/A'}`, 14, 22);
            doc.text(`Address: ${customer?.address || 'N/A'}`, 14, 28);
            
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

            const tableRows = sales.map(sale => {
                const saleDue = sale.grand_total - (sale.paid_amount || 0);
                return [
                    (sale.invoice_no || sale.id).substring(0, 8),
                    formatDate(sale.created_at),
                    sale.items?.length || 0,
                    sale.payment_type || 'N/A',
                    saleDue > 0 ? 'Pending' : 'Paid',
                    formatCurrency(sale.grand_total),
                    formatCurrency(sale.paid_amount || 0),
                    formatCurrency(saleDue)
                ];
            });

            // Add table
            autoTable(doc, {
                head: [tableColumns],
                body: tableRows,
                startY: 45,
                theme: 'grid',
                styles: { fontSize: 8, cellPadding: 2 },
                headStyles: { fillColor: [30, 77, 43], textColor: [255, 255, 255] },
                alternateRowStyles: { fillColor: [245, 245, 245] }
            });

            // Add summary statistics
            const finalY = doc.lastAutoTable.finalY + 10;
            
            doc.setFontSize(12);
            doc.setTextColor(30, 77, 43);
            doc.text('Summary Statistics', 14, finalY);
            
            doc.setFontSize(10);
            doc.setTextColor(0, 0, 0);
            doc.text(`Total Transactions: ${sales.length}`, 14, finalY + 7);
            doc.text(`Total Sales: ${formatCurrency(stats?.total_sales || 0)} Tk`, 14, finalY + 14);
            doc.text(`Total Paid: ${formatCurrency(stats?.total_paid || 0)} Tk`, 14, finalY + 21);
            doc.text(`Total Due: ${formatCurrency(stats?.total_due || 0)} Tk`, 14, finalY + 28);
            doc.text(`Current Balance: ${formatCurrency(customer?.advance_amount || 0)} Tk`, 14, finalY + 35);

            // Save PDF
            doc.save(`customer_ledger_${customer?.id}_${formatDateForFilename()}.pdf`);
            
            toast.success('PDF downloaded successfully');
        } catch (error) {
            console.error('Error downloading PDF:', error);
            toast.error('Failed to download PDF');
        } finally {
            setIsDownloading(false);
        }
    };

    const getStatusBadge = (status) => {
        const statusConfig = {
            paid: {
                label: "Paid",
                color: "bg-emerald-100 text-emerald-800 border-emerald-200",
                icon: CheckCircle,
            },
            pending: {
                label: "Pending",
                color: "bg-amber-100 text-amber-800 border-amber-200",
                icon: Clock,
            },
            overdue: {
                label: "Overdue",
                color: "bg-rose-100 text-rose-800 border-rose-200",
                icon: AlertCircle,
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
            alert("Please enter a valid payment amount");
            return;
        }

        if (paidAmount > dueAmount) {
            alert(
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
            customer_id: customer.id,
            is_partial: isPartialPayment,
            type: "customer",
        };

        // If partial payment, include selected sales
        if (isPartialPayment && selectedSales.length > 0) {
            paymentData.selected_sales = selectedSales.map((sale) => sale.id);
        }

        router.post(route("clearDue.store", customer.id), paymentData, {
            onSuccess: () => {
                alert(
                    `Payment of ৳${formatCurrency(paidAmount)} processed successfully!`,
                );
                setShowDueClearance(false);
                router.reload();
            },
            onError: (errors) => {
                alert(
                    Object.values(errors).join("\n") ||
                        "An error occurred while processing the payment.",
                );
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

    const toggleSaleSelection = (sale) => {
        setSelectedSales((prev) => {
            const isSelected = prev.some((s) => s.id === sale.id);
            if (isSelected) {
                return prev.filter((s) => s.id !== sale.id);
            } else {
                return [...prev, sale];
            }
        });
    };

    const selectAllSales = () => {
        const unpaidSales = sales.filter((sale) => {
            const saleDue = sale.grand_total - (sale.paid_amount || 0);
            return saleDue > 0;
        });
        setSelectedSales(unpaidSales);
    };

    const clearSelection = () => {
        setSelectedSales([]);
    };

    const calculateSelectedDue = () => {
        return selectedSales.reduce((sum, sale) => {
            const saleDue = sale.grand_total - (sale.paid_amount || 0);
            return sum + saleDue;
        }, 0);
    };

    const calculateRemainingBalance = () => {
        const paid = parseFloat(paymentForm.paid_amount) || 0;
        const remainingDue = dueAmount - paid;
        const newAdvance = advanceAmount + paid;

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
            <div className="bg-gradient-to-r from-white to-emerald-50 rounded-xl shadow-lg border border-emerald-100 mb-8">
                <div className="p-6">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-emerald-100 to-emerald-200 flex items-center justify-center">
                                <CheckCircle className="h-5 w-5 text-emerald-600" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-gray-900">
                                    Clear Due Amount
                                </h2>
                                <p className="text-sm text-gray-600">
                                    Process customer payment
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
                            {/* Left Column - Customer Info */}
                            <div className="lg:col-span-1 space-y-4">
                                <div className="p-4 bg-white rounded-lg border border-gray-200">
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                                            <User className="h-5 w-5 text-blue-600" />
                                        </div>
                                        <div>
                                            <h4 className="font-semibold text-gray-900">
                                                {customer?.customer_name}
                                            </h4>
                                            <p className="text-sm text-gray-600">
                                                {customer?.phone || "No phone"}
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
                                                className="h-4 w-4 text-blue-600"
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
                        className="h-4 w-4 text-blue-600"
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
                                                    onClick={selectAllSales}
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
                                                    focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                                 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                required
                                            />
                                        </div>
                                    </div>

                                    {/* Payment Type */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Received Payment Type
                                        </label>
                                        <select
                                            name="payment_type"
                                            value={paymentForm.payment_type}
                                            onChange={handlePaymentInputChange}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg
                               focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                                            Receiver Account
                                        </label>
                                        <select
                                            name="account_id"
                                            value={paymentForm.account_id}
                                            onChange={handlePaymentInputChange}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg
                               focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                                                        account.current_balance,
                                                    )}{" "}
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
                                 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                placeholder="Add any notes about this payment..."
                                            />
                                        </div>
                                    )}
                                </div>

                                {/* Payment Summary */}
                                <div className="p-4 bg-gradient-to-r from-emerald-50 to-blue-50 rounded-lg border border-emerald-100">
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
                                        className="flex-1 px-6 py-3 bg-gradient-to-r from-emerald-600 to-emerald-700
                             text-white font-medium rounded-lg hover:from-emerald-700
                             hover:to-emerald-800 transition-all disabled:opacity-50
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
                        {isPartialPayment && selectedSales.length > 0 && (
                            <div className="mt-6 pt-6 border-t">
                                <h4 className="font-semibold text-gray-900 mb-3">
                                    Selected Invoices
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {selectedSales.map((sale) => {
                                        const saleDue =
                                            sale.grand_total -
                                            (sale.paid_amount || 0);
                                        return (
                                            <div
                                                key={sale.id}
                                                className="p-3 bg-white border rounded-lg hover:border-blue-300 cursor-pointer"
                                                onClick={() =>
                                                    toggleSaleSelection(sale)
                                                }
                                            >
                                                <div className="flex items-center justify-between mb-2">
                                                    <div className="flex items-center gap-2">
                                                        <div
                                                            className={`h-4 w-4 rounded-full border flex items-center justify-center ${
                                                                selectedSales.some(
                                                                    (s) =>
                                                                        s.id ===
                                                                        sale.id,
                                                                )
                                                                    ? "bg-blue-600 border-blue-600"
                                                                    : "border-gray-300"
                                                            }`}
                                                        >
                                                            {selectedSales.some(
                                                                (s) =>
                                                                    s.id ===
                                                                    sale.id,
                                                            ) && (
                                                                <Check className="h-3 w-3 text-white" />
                                                            )}
                                                        </div>
                                                        <span className="font-medium text-gray-900">
                                                            {sale.invoice_no ||
                                                                sale.id}
                                                        </span>
                                                    </div>
                                                    <span className="text-sm font-bold text-rose-600">
                                                        ৳
                                                        {formatCurrency(
                                                            saleDue,
                                                        )}
                                                    </span>
                                                </div>
                                                <div className="text-xs text-gray-500">
                                                    {formatDate(
                                                        sale.created_at,
                                                    )}{" "}
                                                    • Total: ৳
                                                    {formatCurrency(
                                                        sale.grand_total,
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

    // Show loading state
    if (isLoading || !customer) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">
                        Loading customer ledger...
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <Head title={`${customer?.customer_name || "Customer"} Ledger`} />

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
                                    Customer Ledger
                                </h1>
                                <p className="text-gray-600 mt-1">
                                    Detailed transaction history and analytics
                                    for {customer?.customer_name}
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
                                                : "bg-gradient-to-r from-emerald-600 to-emerald-700 text-white hover:from-emerald-700 hover:to-emerald-800"
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

                    {/* Customer Info Card */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                            <div className="flex items-start gap-4">
                                <div className="h-16 w-16 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center">
                                    <User className="h-7 w-7 text-blue-600" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-gray-900">
                                        {customer?.customer_name ||
                                            "Unknown Customer"}
                                    </h2>
                                    <div className="flex flex-wrap items-center gap-4 mt-2">
                                        {customer?.phone && (
                                            <div className="flex items-center gap-2 text-sm text-gray-600">
                                                <Phone className="h-4 w-4" />
                                                {customer.phone}
                                            </div>
                                        )}
                                        {customer?.email && (
                                            <div className="flex items-center gap-2 text-sm text-gray-600">
                                                <Mail className="h-4 w-4" />
                                                {customer.email}
                                            </div>
                                        )}
                                        {customer?.address && (
                                            <div className="flex items-center gap-2 text-sm text-gray-600">
                                                <MapPin className="h-4 w-4" />
                                                <span className="max-w-xs">
                                                    {customer.address}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-col md:items-end gap-2">
                                <div
                                    className={`text-2xl font-bold ${(customer?.advance_amount || 0) >= 0 ? "text-emerald-600" : "text-rose-600"}`}
                                >
                                    ৳
                                    {formatCurrency(
                                        customer?.advance_amount || 0,
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
                            <Filter className="h-5 w-5 text-gray-700" />
                            <h3 className="text-lg font-semibold text-gray-900">
                                Filter Transactions
                            </h3>
                            {hasActiveFilters && (
                                <span className="badge badge-sm bg-blue-600 text-white ml-2">Active</span>
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
                                    focus:ring-2 focus:ring-blue-500 focus:border-transparent
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
                                   focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-700"
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
                                   focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-700"
                                            min={filterForm.data.start_date}
                                        />
                                    </div>
                                </div>

                                <div className="md:col-span-2">
                                    <button
                                        onClick={handleFilter}
                                        className="w-full h-11 bg-gradient-to-r from-blue-600 to-blue-700 text-white
                                  font-medium rounded-lg hover:from-blue-700 hover:to-blue-800
                                  focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
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
                        title="Total Sales"
                        value={`৳${formatCurrency(stats?.total_sales || 0)}`}
                        subtitle={`${sales?.length || 0} transactions`}
                        icon={DollarSign}
                        color="bg-gradient-to-br from-emerald-500/10 to-emerald-600/10 text-emerald-600"
                    />

                    <StatCard
                        title="Total Transactions"
                        value={stats?.total_transactions || 0}
                        subtitle="All time transactions"
                        icon={Receipt}
                        color="bg-gradient-to-br from-blue-500/10 to-blue-600/10 text-blue-600"
                    />

                    <StatCard
                        title="Total Due Amount"
                        value={`৳${formatCurrency(stats?.total_due || 0)}`}
                        subtitle="due amount of sales"
                        icon={TrendingUp}
                        color="bg-gradient-to-br from-purple-500/10 to-purple-600/10 text-purple-600"
                    />

                    <StatCard
                        title="Current Balance"
                        value={`৳${formatCurrency(customer?.advance_amount || 0)}`}
                        subtitle={
                            (customer?.advance_amount || 0) >= 0
                                ? "Customer credit"
                                : "Customer debit"
                        }
                        icon={Wallet}
                        color={
                            (customer?.advance_amount || 0) >= 0
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
                            disabled={isDownloading || sales.length === 0}
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
                    {/* Monthly Sales Chart */}
                    {monthlyChartData && (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                            <div className="flex items-center justify-between mb-5">
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                                        <LineChart className="h-5 w-5" />
                                        Monthly Sales Trend
                                    </h3>
                                    <p className="text-sm text-gray-600 mt-1">
                                        Sales performance over time
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

                {/* Transactions Section */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    {/* Tabs */}
                    <div className="border-b border-gray-200">
                        <nav className="flex flex-wrap px-6" aria-label="Tabs">
                            <button
                                onClick={() => setActiveTab("transactions")}
                                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                                    activeTab === "transactions"
                                        ? "border-blue-600 text-blue-600"
                                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                                }`}
                            >
                                <div className="flex items-center gap-2">
                                    <Receipt className="h-4 w-4" />
                                    Transactions ({sales?.length || 0})
                                </div>
                            </button>
                            <button
                                onClick={() => setActiveTab("details")}
                                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                                    activeTab === "details"
                                        ? "border-blue-600 text-blue-600"
                                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                                }`}
                            >
                                <div className="flex items-center gap-2">
                                    <User className="h-4 w-4" />
                                    Customer Details
                                </div>
                            </button>
                        </nav>
                    </div>

                    {/* Tab Content */}
                    <div className="p-6">
                        {activeTab === "transactions" ? (
                            sales?.length > 0 ? (
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
                                            {sales.map((sale) => {
                                                const saleDue =
                                                    sale.grand_total -
                                                    (sale.paid_amount || 0);
                                                return (
                                                    <tr
                                                        key={sale.id}
                                                        className="hover:bg-gray-50/50 transition-colors"
                                                    >
                                                        <td className="px-4 py-4 whitespace-nowrap">
                                                            <div className="text-sm font-medium text-gray-900">
                                                                {sale.invoice_no ||
                                                                    sale.id}
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-4 whitespace-nowrap">
                                                            <div className="text-sm text-gray-900">
                                                                {formatDate(
                                                                    sale.created_at,
                                                                )}
                                                            </div>
                                                            <div className="text-xs text-gray-500">
                                                                {formatDateTime(
                                                                    sale.created_at,
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-4">
                                                            <div className="text-sm text-gray-900">
                                                                {sale.items
                                                                    ?.length ||
                                                                    0}{" "}
                                                                items
                                                            </div>
                                                            {sale
                                                                .items?.[0] && (
                                                                <div className="text-xs text-gray-500 truncate max-w-xs">
                                                                    {
                                                                        sale
                                                                            .items[0]
                                                                            .product
                                                                            ?.name
                                                                    }{" "}
                                                                    (
                                                                    {
                                                                        sale
                                                                            .items[0]
                                                                            .variant
                                                                            ?.sku
                                                                    }
                                                                    )
                                                                    {sale.items
                                                                        ?.length >
                                                                        1 &&
                                                                        ` +${sale.items.length - 1} more`}
                                                                </div>
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-4 whitespace-nowrap">
                                                            {getPaymentMethodBadge(
                                                                sale.payment_type,
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-4 whitespace-nowrap">
                                                            {getStatusBadge(
                                                                saleDue > 0
                                                                    ? "pending"
                                                                    : "paid",
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-4 whitespace-nowrap">
                                                            <div className="text-sm font-bold text-gray-900">
                                                                ৳
                                                                {formatCurrency(
                                                                    sale.grand_total,
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-4 whitespace-nowrap">
                                                            <div className="text-sm font-bold text-emerald-600">
                                                                ৳
                                                                {formatCurrency(
                                                                    sale.paid_amount,
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-4 whitespace-nowrap">
                                                            <div
                                                                className={`text-sm font-bold ${saleDue > 0 ? "text-rose-600" : "text-emerald-600"}`}
                                                            >
                                                                ৳
                                                                {formatCurrency(
                                                                    saleDue,
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-4 whitespace-nowrap">
                                                            <div className="flex items-center gap-2">
                                                                <Link
                                                                    href={route(
                                                                        "sales.show",
                                                                        {
                                                                            sale: sale.id,
                                                                        },
                                                                    )}
                                                                    className="p-1.5 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                                                                    title="View Details"
                                                                >
                                                                    <Eye className="h-4 w-4" />
                                                                </Link>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="py-12 text-center">
                                    <div className="mx-auto h-16 w-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                                        <Receipt className="h-8 w-8 text-gray-400" />
                                    </div>
                                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                        No transactions found
                                    </h3>
                                    <p className="text-gray-600 max-w-md mx-auto mb-6">
                                        {hasActiveFilters
                                            ? "Try adjusting your search filters to find transactions."
                                            : "This customer doesn't have any transactions yet."}
                                    </p>
                                    {hasActiveFilters && (
                                        <button
                                            onClick={clearFilters}
                                            className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-medium rounded-lg hover:from-blue-700 hover:to-blue-800"
                                        >
                                            Clear Filters
                                        </button>
                                    )}
                                </div>
                            )
                        ) : (
                            /* Customer Details Tab */
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
                                                    {customer?.phone ||
                                                        "Not provided"}
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-between py-2 border-b border-gray-100">
                                                <span className="text-sm font-medium text-gray-600">
                                                    Email
                                                </span>
                                                <span className="text-sm text-gray-900">
                                                    {customer?.email ||
                                                        "Not provided"}
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-between py-2 border-b border-gray-100">
                                                <span className="text-sm font-medium text-gray-600">
                                                    Address
                                                </span>
                                                <span className="text-sm text-gray-900 text-right max-w-xs">
                                                    {customer?.address ||
                                                        "Not provided"}
                                                </span>
                                            </div>
                                            {customer?.company_name && (
                                                <div className="flex items-center justify-between py-2 border-b border-gray-100">
                                                    <span className="text-sm font-medium text-gray-600">
                                                        Company
                                                    </span>
                                                    <span className="text-sm text-gray-900">
                                                        {customer.company_name}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <h4 className="text-lg font-semibold text-gray-900">
                                            Transaction Summary
                                        </h4>
                                        <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm text-gray-600">
                                                    First Purchase
                                                </span>
                                                <span className="text-sm font-medium text-gray-900">
                                                    {sales?.length > 0
                                                        ? formatDate(
                                                              sales[0]
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
                                                    {sales?.length > 0
                                                        ? formatDate(
                                                              sales[
                                                                  sales.length -
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
                                                    {sales?.length || 0}{" "}
                                                    transaction
                                                    {sales?.length !== 1
                                                        ? "s"
                                                        : ""}
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm text-gray-600">
                                                    Customer Since
                                                </span>
                                                <span className="text-sm font-medium text-gray-900">
                                                    {formatDate(
                                                        customer?.created_at,
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