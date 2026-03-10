import { Link, router, useForm, usePage } from "@inertiajs/react";
import axios from "axios";
import {
    AlertCircle,
    AlertTriangle,
    Calendar,
    CheckCircle,
    ChevronRight,
    CreditCard,
    CreditCard as CreditCardIcon,
    DollarSign,
    Edit,
    Eye,
    FileText,
    Frown,
    Info,
    Landmark,
    Mail,
    MapPin,
    Percent,
    Phone,
    Plus,
    Receipt,
    Search,
    Smartphone,
    Trash2,
    TrendingDown,
    TrendingUp,
    User,
    Users,
    Wallet,
    X,
    Filter,
    Download,
    ChevronDown,
    ChevronUp,
} from "lucide-react";
import { useState } from "react";
import PageHeader from "../components/PageHeader";
import Pagination from "../components/Pagination";
import { useTranslation } from "../hooks/useTranslation";
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { toast } from "react-toastify";

export default function Customers({ customers, filters, accounts }) {
    const { auth } = usePage().props;
    const { t, locale } = useTranslation();
    const [model, setModel] = useState(false);
    const [advanceModel, setAdvanceModel] = useState(false);
    const [clearDueModel, setClearDueModel] = useState(false);
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [editProcessing, setEditProcessing] = useState(false);
    const [showFilters, setShowFilters] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);

    // Handle search and filters
    const [localFilters, setLocalFilters] = useState({
        search: filters.search || "",
        status: filters.status || "",
        date_from: filters.date_from || "",
        date_to: filters.date_to || "",
    });

    const [paymentData, setPaymentData] = useState({
        amount: "",
        payment_type: "cash",
        account_id: "",
        payment_date: new Date().toISOString().split("T")[0],
        notes: "",
    });

    const [clearDueData, setClearDueData] = useState({
        paid_amount: "",
        payment_type: "account_adjustment",
        account_id: "",
        type: "customer",
        txn_ref: `CDA-${Math.random().toString(36).substr(2, 10).toUpperCase()}`,
        notes: "Clearing due payment",
        payment_date: new Date().toISOString().split("T")[0],
    });

    const [processingPayment, setProcessingPayment] = useState(false);
    const [processingClearDue, setProcessingClearDue] = useState(false);
    const [paymentErrors, setPaymentErrors] = useState({});
    const [clearDueErrors, setClearDueErrors] = useState({});

    // Model close handle
    const modelClose = () => {
        customerForm.reset();
        setModel(false);
    };

    // Advance model close handle
    const advanceModelClose = () => {
        setPaymentData({
            amount: "",
            payment_type: "cash",
            account_id: "",
            payment_date: new Date().toISOString().split("T")[0],
            notes: "",
        });
        setSelectedCustomer(null);
        setPaymentErrors({});
        setAdvanceModel(false);
    };

    // Clear Due model close handle
    const clearDueModelClose = () => {
        setClearDueData({
            paid_amount: "",
            payment_type: "account_adjustment",
            account_id: "",
            type: "customer",
            txn_ref: `CDA-${Math.random().toString(36).substr(2, 10).toUpperCase()}`,
            notes: "Clearing due payment",
            payment_date: new Date().toISOString().split("T")[0],
        });
        setSelectedCustomer(null);
        setClearDueErrors({});
        setClearDueModel(false);
    };

    // Handle filter changes
    const handleFilter = (field, value) => {
        setLocalFilters(prev => ({ ...prev, [field]: value }));
    };

    const applyFilters = () => {
        const queryParams = {};
        if (localFilters.search) queryParams.search = localFilters.search;
        if (localFilters.status) queryParams.status = localFilters.status;
        if (localFilters.date_from) queryParams.date_from = localFilters.date_from;
        if (localFilters.date_to) queryParams.date_to = localFilters.date_to;

        router.get(
            route("customer.index"),
            queryParams,
            {
                preserveScroll: true,
                preserveState: true,
                replace: true,
            },
        );
    };

    const clearFilters = () => {
        setLocalFilters({ search: "", status: "", date_from: "", date_to: "" });
        router.get(route("customer.index"), {}, { replace: true });
    };

    const handleKeyPress = (e) => {
        if (e.key === "Enter") {
            applyFilters();
        }
    };

    // Format date for input
    const formatDateForInput = (dateString) => {
        if (!dateString) return '';
        return new Date(dateString).toISOString().split('T')[0];
    };

    // Toggle filter section
    const toggleFilters = () => {
        setShowFilters(!showFilters);
    };

    // Check if any filter is active
    const hasActiveFilters = () => {
        return localFilters.search || localFilters.status || localFilters.date_from || localFilters.date_to;
    };

    // Handle customer form submission
    const customerForm = useForm({
        id: "",
        customer_name: "",
        phone: "",
        address: "",
        email: "",
        advance_amount: null,
        account_id: "",
        due_amount: null,
        is_active: true,
    });

    const handleAdvancePayment = (customer) => {
        setSelectedCustomer(customer);
        setPaymentData({
            amount: "",
            payment_type: "cash",
            account_id: "",
            payment_date: new Date().toISOString().split("T")[0],
            notes: "",
        });
        setPaymentErrors({});
        setAdvanceModel(true);
    };

    const handleClearDue = (customer) => {
        setSelectedCustomer(customer);

        // Calculate total due amount
        const dueAmount = calculateDueAmount(customer.sales);

        // Set initial values
        setClearDueData({
            paid_amount: dueAmount,
            payment_type:
                customer.advance_amount > 0
                    ? "advance_adjustment"
                    : "account_adjustment",
            account_id: "",
            type: "customer",
            txn_ref: `CDA-${Math.random().toString(36).substr(2, 10).toUpperCase()}`,
            notes: `Clearing due payment for ${customer.customer_name}`,
            payment_date: new Date().toISOString().split("T")[0],
        });

        setClearDueErrors({});
        setClearDueModel(true);
    };

    const handleAdvanceSubmit = async (e) => {
        e.preventDefault();

        if (!selectedCustomer) return;

        // Validation
        const errors = {};
        const amount = parseFloat(paymentData.amount) || 0;

        if (amount <= 0) {
            errors.amount = t(
                "customer.advance_amount_error",
                "Advance amount must be greater than 0",
            );
        }

        if (!paymentData.account_id) {
            errors.account_id = t(
                "customer.select_account_error",
                "Please select an account",
            );
        }

        if (Object.keys(errors).length > 0) {
            setPaymentErrors(errors);
            return;
        }

        setProcessingPayment(true);

        router.post(
            route("advancePayment.store", { id: selectedCustomer.id }),
            {
                customer_id: selectedCustomer.id,
                amount: paymentData.amount,
                payment_type: paymentData.payment_type,
                type: "customer",
                account_id: paymentData.account_id,
                notes: paymentData.notes,
                is_advance: true,
                payment_date: paymentData.payment_date,
            },
            {
                onSuccess: () => {
                    advanceModelClose();
                    setProcessingPayment(false);
                },
                onError: (errors) => {
                    console.error("Advance payment error:", errors);
                    setPaymentErrors(errors);
                    setProcessingPayment(false);
                },
            },
        );
    };

    const handleClearDueSubmit = async (e) => {
        e.preventDefault();

        if (!selectedCustomer) return;

        // Validation
        const errors = {};
        const amount = parseFloat(clearDueData.paid_amount) || 0;
        const dueAmount = calculateDueAmount(selectedCustomer.sales);

        if (amount <= 0) {
            errors.paid_amount = t(
                "customer.amount_greater_than_zero",
                "Amount must be greater than 0",
            );
        }

        if (amount > dueAmount) {
            errors.paid_amount = t(
                "customer.amount_exceeds_due",
                "Amount cannot exceed total due amount",
            );
        }

        // Validate payment method
        if (clearDueData.payment_type === "advance_adjustment") {
            const advanceAmount =
                parseFloat(selectedCustomer.advance_amount) || 0;
            if (advanceAmount < amount) {
                errors.paid_amount = t(
                    "Advance amount is insufficient for this payment",
                );
            }
        }

        if (
            clearDueData.payment_type === "account_adjustment" &&
            !clearDueData.account_id
        ) {
            errors.account_id = t(
                "customer.select_account_error",
                "Please select an account",
            );
        }

        if (Object.keys(errors).length > 0) {
            setClearDueErrors(errors);
            return;
        }

        setProcessingClearDue(true);

        router.post(
            route("clearDue.store", { id: selectedCustomer.id }),
            clearDueData,
            {
                onSuccess: () => {
                    clearDueModelClose();
                    setProcessingClearDue(false);
                },
                onError: (errors) => {
                    console.error("Clear due error:", errors);
                    setClearDueErrors(errors);
                    setProcessingClearDue(false);
                },
            },
        );
    };

    const handlePaymentInputChange = (e) => {
        const { name, value } = e.target;
        setPaymentData((prev) => ({
            ...prev,
            [name]: name === "amount" ? parseFloat(value) || 0 : value,
        }));

        if (paymentErrors[name]) {
            setPaymentErrors((prev) => ({ ...prev, [name]: null }));
        }
    };

    const handleClearDueInputChange = (e) => {
        const { name, value } = e.target;
        setClearDueData((prev) => ({
            ...prev,
            [name]: name === "paid_amount" ? parseFloat(value) || 0 : value,
        }));

        if (clearDueErrors[name]) {
            setClearDueErrors((prev) => ({ ...prev, [name]: null }));
        }
    };

    const handleCustomerCreateForm = (e) => {
        e.preventDefault();

        if (customerForm.data.id) {
            customerForm.put(route("customer.update", customerForm.data.id), {
                onSuccess: () => {
                    customerForm.reset();
                    setModel(false);
                },
                onError: (errors) => {
                    console.log(errors);
                },
            });
        } else {
            customerForm.post(route("customer.store"), {
                onSuccess: () => {
                    customerForm.reset();
                    setModel(false);
                },
                onError: (errors) => {
                    console.log(errors);
                },
            });
        }
    };

    // Set full payment
    const handleFullPayment = () => {
        if (selectedCustomer) {
            const dueAmount = calculateDueAmount(selectedCustomer.sales) || 0;
            setPaymentData((prev) => ({
                ...prev,
                amount: Math.max(0, dueAmount),
            }));
        }
    };

    // Handle customer edit
    const handleCustomerEdit = (id) => {
        setEditProcessing(true);
        axios
            .get(route("customer.edit", { id: id }))
            .then((res) => {
                const data = res.data.data;
                customerForm.setData({
                    id: data.id,
                    customer_name: data.customer_name,
                    phone: data.phone,
                    address: data.address || "",
                    email: data.email || "",
                    advance_amount: parseFloat(data.advance_amount) || 0,
                    account_id: data.account_id || "",
                    due_amount: parseFloat(data.due_amount) || 0,
                    is_active: Boolean(data.is_active),
                });
                setModel(true);
            })
            .catch((error) => {
                console.error("Error fetching customer:", error);
            })
            .finally(() => {
                setEditProcessing(false);
            });
    };

    // Calculate due amount from sales
    const calculateDueAmount = (sales) => {
        if (!sales || sales.length === 0) return 0;
        return sales.reduce((total, sale) => {
            return total + (parseFloat(sale.due_amount) || 0);
        }, 0);
    };

    // Format currency
    const formatCurrency = (amount) => {
        const num = parseFloat(amount) || 0;
        return new Intl.NumberFormat("en-IN", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(num);
    };

    // Format date
    const formatDate = (dateString) => {
        if (!dateString) return t("customer.na", "N/A");
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString(
                locale === "bn" ? "bn-BD" : "en-US",
                {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                },
            );
        } catch (e) {
            return dateString;
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

    // Get payment method icon
    const getPaymentIcon = (type) => {
        switch (type) {
            case "cash":
                return <Wallet size={16} className="text-green-600" />;
            case "bank":
                return <Landmark size={16} className="text-blue-600" />;
            case "mobile":
                return <Smartphone size={16} className="text-purple-600" />;
            default:
                return <CreditCard size={16} />;
        }
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
                return <CreditCard size={14} className="text-gray-600" />;
        }
    };

    // Quick payment amount buttons
    const handleQuickAmount = (percentage) => {
        if (selectedCustomer) {
            const dueAmount = calculateDueAmount(selectedCustomer.sales) || 0;
            const amount = Math.round(dueAmount * percentage) / 100;
            setPaymentData((prev) => ({
                ...prev,
                amount: Math.max(0, amount),
            }));
        }
    };

    // Quick clear due amount buttons
    const handleQuickClearDueAmount = (percentage) => {
        if (selectedCustomer) {
            const dueAmount = calculateDueAmount(selectedCustomer.sales) || 0;
            const amount = Math.round(dueAmount * percentage) / 100;
            setClearDueData((prev) => ({
                ...prev,
                paid_amount: Math.max(0, amount),
            }));
        }
    };

    // Set full payment for clear due
    const handleFullClearDue = () => {
        if (selectedCustomer) {
            const dueAmount = calculateDueAmount(selectedCustomer.sales) || 0;
            setClearDueData((prev) => ({
                ...prev,
                paid_amount: Math.max(0, dueAmount),
            }));
        }
    };

    // Get account details
    const getAccountDetails = () => {
        if (!paymentData.account_id) return null;
        return accounts.find(
            (account) =>
                account.id.toString() === paymentData.account_id.toString(),
        );
    };

    const selectedAccount = getAccountDetails();

    // Get customer's default account details
    const getCustomerAccount = (accountId) => {
        if (!accountId) return null;
        return accounts.find(
            (account) => account.id.toString() === accountId.toString(),
        );
    };

    // Get payment method options for clear due
    const getPaymentMethodOptions = (customer) => {
        const options = [
            {
                value: "account_adjustment",
                label: t("customer.account_adjustment", "Account Adjustment"),
                icon: <Landmark size={16} />,
            },
        ];

        // Add advance adjustment option if customer has advance
        if (customer && parseFloat(customer.advance_amount) > 0) {
            options.unshift({
                value: "advance_adjustment",
                label: t("customer.advance_adjustment", "Advance Adjustment"),
                icon: <CreditCardIcon size={16} />,
                description: t(
                    "customer.use_customer_advance",
                    "Use customer advance balance",
                ),
            });
        }

        return options;
    };

    // Prepare data for export
    const prepareExportData = () => {
        return customers.data.map(customer => {
            const dueAmount = calculateDueAmount(customer.sales);
            const customerAccount = getCustomerAccount(customer.account_id);
            
            return {
                'Name': customer.customer_name,
                'Phone': customer.phone || 'N/A',
                'Email': customer.email || 'N/A',
                'Address': customer.address || 'N/A',
                'Advance (Tk)': formatCurrency(customer.advance_amount || 0),
                'Due (Tk)': formatCurrency(dueAmount),
                'Status': customer.is_active ? 'Active' : 'Inactive',
                'Default Account': customerAccount?.name || 'N/A',
                'Sales Count': customer.sales?.length || 0,
                'Created At': formatDate(customer.created_at)
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
            csvRows.push('FILTER INFORMATION');
            csvRows.push(`Search,${localFilters.search || 'None'}`);
            csvRows.push(`Status,${localFilters.status || 'All'}`);
            csvRows.push(`Date From,${localFilters.date_from || 'None'}`);
            csvRows.push(`Date To,${localFilters.date_to || 'None'}`);

            csvRows.push('');
            csvRows.push('SUMMARY STATISTICS');
            const totalAdvance = customers.data.reduce((sum, c) => sum + parseFloat(c.advance_amount || 0), 0);
            const totalDue = customers.data.reduce((sum, c) => sum + calculateDueAmount(c.sales), 0);
            
            csvRows.push(`Total Customers,${customers.total}`);
            csvRows.push(`Active Customers,${customers.data.filter(c => c.is_active).length}`);
            csvRows.push(`Total Advance (Tk),${totalAdvance.toFixed(2)}`);
            csvRows.push(`Total Due (Tk),${totalDue.toFixed(2)}`);

            const csvString = csvRows.join('\n');
            
            const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.href = url;
            link.download = `customers_report_${formatDateForFilename()}.csv`;
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

            const filterData = [
                { 'Filter': 'Search', 'Value': localFilters.search || 'None' },
                { 'Filter': 'Status', 'Value': localFilters.status || 'All' },
                { 'Filter': 'Date From', 'Value': localFilters.date_from || 'None' },
                { 'Filter': 'Date To', 'Value': localFilters.date_to || 'None' }
            ];
            const wsFilters = XLSX.utils.json_to_sheet(filterData);

            const totalAdvance = customers.data.reduce((sum, c) => sum + parseFloat(c.advance_amount || 0), 0);
            const totalDue = customers.data.reduce((sum, c) => sum + calculateDueAmount(c.sales), 0);
            
            const summaryData = [
                { 'Metric': 'Total Customers', 'Value': customers.total },
                { 'Metric': 'Active Customers', 'Value': customers.data.filter(c => c.is_active).length },
                { 'Metric': 'Total Advance (Tk)', 'Value': totalAdvance.toFixed(2) },
                { 'Metric': 'Total Due (Tk)', 'Value': totalDue.toFixed(2) }
            ];
            const wsSummary = XLSX.utils.json_to_sheet(summaryData);

            XLSX.utils.book_append_sheet(wb, ws, 'Customers');
            XLSX.utils.book_append_sheet(wb, wsFilters, 'Filters Applied');
            XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');

            XLSX.writeFile(wb, `customers_report_${formatDateForFilename()}.xlsx`);
            
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
            const exportData = prepareExportData();
            
            if (exportData.length === 0) {
                toast.warning('No data to export');
                return;
            }

            const doc = new jsPDF({
                orientation: 'landscape',
                unit: 'mm',
                format: 'a4'
            });

            doc.setFontSize(16);
            doc.setTextColor(30, 77, 43); // #1e4d2b color
            doc.text('Customers Report', 14, 15);
            
            doc.setFontSize(10);
            doc.setTextColor(100, 100, 100);
            doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 22);

            doc.setFontSize(9);
            doc.setTextColor(80, 80, 80);
            doc.text(`Search: ${localFilters.search || 'None'} | Status: ${localFilters.status || 'All'}`, 14, 29);
            doc.text(`Date Range: ${localFilters.date_from || 'Start'} to ${localFilters.date_to || 'End'}`, 14, 35);

            const tableColumns = [
                'Name',
                'Phone',
                'Advance',
                'Due',
                'Status',
                'Account'
            ];

            const tableRows = exportData.map(item => [
                item['Name'].substring(0, 15) + (item['Name'].length > 15 ? '...' : ''),
                item['Phone'],
                item['Advance (Tk)'],
                item['Due (Tk)'],
                item['Status'],
                item['Default Account'] === 'N/A' ? 'N/A' : item['Default Account'].substring(0, 10)
            ]);

            autoTable(doc, {
                head: [tableColumns],
                body: tableRows,
                startY: 40,
                theme: 'grid',
                styles: { fontSize: 8, cellPadding: 2 },
                headStyles: { fillColor: [30, 77, 43], textColor: [255, 255, 255] },
                alternateRowStyles: { fillColor: [245, 245, 245] }
            });

            const totalAdvance = customers.data.reduce((sum, c) => sum + parseFloat(c.advance_amount || 0), 0);
            const totalDue = customers.data.reduce((sum, c) => sum + calculateDueAmount(c.sales), 0);
            
            const finalY = doc.lastAutoTable.finalY + 10;
            
            doc.setFontSize(12);
            doc.setTextColor(30, 77, 43);
            doc.text('Summary Statistics', 14, finalY);
            
            doc.setFontSize(10);
            doc.setTextColor(0, 0, 0);
            doc.text(`Total Customers: ${customers.total}`, 14, finalY + 7);
            doc.text(`Active Customers: ${customers.data.filter(c => c.is_active).length}`, 14, finalY + 14);
            doc.text(`Total Advance: ${totalAdvance.toFixed(2)} Tk`, 14, finalY + 21);
            doc.text(`Total Due: ${totalDue.toFixed(2)} Tk`, 14, finalY + 28);

            doc.save(`customers_report_${formatDateForFilename()}.pdf`);
            
            toast.success('PDF downloaded successfully');
        } catch (error) {
            console.error('Error downloading PDF:', error);
            toast.error('Failed to download PDF');
        } finally {
            setIsDownloading(false);
        }
    };

    // const hasActiveFilters = localFilters.search || localFilters.status || localFilters.date_from || localFilters.date_to;

    return (
        <div
            className={`bg-white rounded-box p-3 md:p-4 ${locale === "bn" ? "bangla-font" : ""}`}
        >
            {/* Clear Due Modal */}
            {clearDueModel && selectedCustomer && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md transform transition-all overflow-hidden">
                        {/* Modal Header */}
                        <div className="px-6 py-5 border-b border-gray-200 bg-gradient-to-r from-orange-50 to-amber-100">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-orange-500 rounded-lg shadow-sm">
                                        <Receipt
                                            className="text-white"
                                            size={22}
                                        />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-black text-gray-900">
                                            {t(
                                                "customer.clear_due_payment",
                                                "Clear Due Payment",
                                            )}
                                        </h3>
                                        <p className="text-sm text-gray-600">
                                            {t(
                                                "customer.clear_due_desc",
                                                "Clear outstanding dues from customer",
                                            )}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={clearDueModelClose}
                                    className="btn btn-ghost btn-circle btn-sm hover:bg-gray-200"
                                    disabled={processingClearDue}
                                >
                                    <X size={20} />
                                </button>
                            </div>
                        </div>

                        {/* Modal Content */}
                        <div className="px-6 py-5 max-h-[75vh] overflow-y-auto">
                            {/* Customer Due Summary */}
                            <div className="mb-6 p-4 bg-white rounded-xl border border-red-200 shadow-sm">
                                <div className="flex items-start justify-between mb-4">
                                    <div>
                                        <h4 className="font-bold text-gray-900 text-lg">
                                            {selectedCustomer.customer_name}
                                        </h4>
                                        <div className="flex items-center gap-2 mt-1">
                                            <Phone
                                                size={14}
                                                className="text-gray-500"
                                            />
                                            <p className="text-sm text-gray-600">
                                                {selectedCustomer.phone}
                                            </p>
                                        </div>
                                    </div>
                                    <div
                                        className={`px-3 py-1 rounded-full ${selectedCustomer.is_active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"} text-xs font-bold flex items-center gap-1`}
                                    >
                                        {selectedCustomer.is_active ? (
                                            <CheckCircle size={12} />
                                        ) : (
                                            <X size={12} />
                                        )}
                                        {selectedCustomer.is_active
                                            ? t("customer.active", "Active")
                                            : t(
                                                  "customer.inactive",
                                                  "Inactive",
                                              )}
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="text-center p-3 bg-gradient-to-br from-green-50 to-green-100 rounded-lg border border-green-200">
                                        <div className="text-xs text-green-700 uppercase font-bold tracking-wider mb-1">
                                            {t(
                                                "customer.available_advance",
                                                "Available Advance",
                                            )}
                                        </div>
                                        <div className="text-xl font-black text-green-800">
                                            ৳
                                            {formatCurrency(
                                                selectedCustomer.advance_amount ||
                                                    0,
                                            )}
                                        </div>
                                    </div>
                                    <div className="text-center p-3 bg-gradient-to-br from-red-50 to-red-100 rounded-lg border border-red-200">
                                        <div className="text-xs text-red-700 uppercase font-bold tracking-wider mb-1">
                                            {t(
                                                "customer.total_due",
                                                "Total Due",
                                            )}
                                        </div>
                                        <div className="text-xl font-black text-red-800">
                                            ৳
                                            {formatCurrency(
                                                calculateDueAmount(
                                                    selectedCustomer.sales,
                                                ) || 0,
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Due Sales Info */}
                                {selectedCustomer.sales &&
                                    selectedCustomer.sales.filter(
                                        (s) => s.due_amount > 0,
                                    ).length > 0 && (
                                        <div className="mt-4 pt-4 border-t border-gray-200">
                                            <div className="flex items-center gap-2 mb-2">
                                                <AlertTriangle
                                                    size={14}
                                                    className="text-orange-600"
                                                />
                                                <span className="text-sm font-bold text-gray-700">
                                                    {t(
                                                        "customer.due_invoices",
                                                        "Due Invoices",
                                                    )}
                                                    :
                                                </span>
                                            </div>
                                            <div className="text-xs text-gray-600 space-y-1">
                                                {selectedCustomer.sales
                                                    .filter(
                                                        (s) => s.due_amount > 0,
                                                    )
                                                    .slice(0, 3)
                                                    .map((sale, idx) => (
                                                        <div
                                                            key={idx}
                                                            className="flex justify-between"
                                                        >
                                                            <span>
                                                                Invoice #
                                                                {
                                                                    sale.invoice_no
                                                                }
                                                            </span>
                                                            <span className="font-mono">
                                                                ৳
                                                                {formatCurrency(
                                                                    sale.due_amount,
                                                                )}
                                                            </span>
                                                        </div>
                                                    ))}
                                                {selectedCustomer.sales.filter(
                                                    (s) => s.due_amount > 0,
                                                ).length > 3 && (
                                                    <div className="text-center text-gray-500 italic">
                                                        +
                                                        {selectedCustomer.sales.filter(
                                                            (s) =>
                                                                s.due_amount >
                                                                0,
                                                        ).length - 3}{" "}
                                                        more invoices
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                            </div>

                            <form onSubmit={handleClearDueSubmit}>
                                <div className="space-y-6">
                                    {/* Amount Section */}
                                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                                        <div className="flex justify-between items-center mb-3">
                                            <label className="label-text font-bold text-gray-800 text-sm">
                                                {t(
                                                    "customer.amount_to_pay",
                                                    "Amount to Pay",
                                                )}{" "}
                                                *
                                            </label>
                                            <div className="flex gap-2">
                                                <button
                                                    type="button"
                                                    onClick={handleFullClearDue}
                                                    className="btn btn-xs btn-primary bg-gray-900 border-gray-900 hover:bg-black hover:border-black"
                                                    disabled={
                                                        processingClearDue
                                                    }
                                                >
                                                    {t(
                                                        "customer.full_payment",
                                                        "Full",
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                        <div className="relative">
                                            <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-600 font-bold text-lg">
                                                ৳
                                            </span>
                                            <input
                                                type="number"
                                                name="paid_amount"
                                                step="0.01"
                                                min="0.01"
                                                max={calculateDueAmount(
                                                    selectedCustomer.sales,
                                                )}
                                                value={clearDueData.paid_amount}
                                                onChange={
                                                    handleClearDueInputChange
                                                }
                                                className="input input-bordered w-full pl-4 py-4 text-lg font-mono border-gray-300 focus:border-gray-900 focus:ring-2 focus:ring-gray-900/20 bg-white"
                                                disabled={processingClearDue}
                                                required
                                                placeholder="0.00"
                                            />
                                        </div>
                                        {/* Quick Amount Buttons */}
                                        <div className="flex gap-2 mt-3">
                                            {[25, 50, 75].map((percent) => (
                                                <button
                                                    type="button"
                                                    key={percent}
                                                    onClick={() =>
                                                        handleQuickClearDueAmount(
                                                            percent / 100,
                                                        )
                                                    }
                                                    className="btn btn-xs btn-ghost hover:bg-gray-200 flex items-center gap-1"
                                                    disabled={
                                                        processingClearDue
                                                    }
                                                >
                                                    <Percent size={10} />
                                                    {percent}%
                                                </button>
                                            ))}
                                        </div>
                                        {clearDueErrors.paid_amount && (
                                            <div className="text-red-600 text-xs mt-2 flex items-center gap-2 bg-red-50 p-2 rounded-lg border border-red-200">
                                                <AlertCircle size={12} />
                                                {clearDueErrors.paid_amount}
                                            </div>
                                        )}
                                    </div>

                                    {/* Payment Method Selection */}
                                    <div>
                                        <label className="label-text font-bold text-gray-800 text-sm mb-3 block">
                                            {t(
                                                "customer.payment_method",
                                                "Payment Method",
                                            )}{" "}
                                            *
                                        </label>
                                        <div className="grid grid-cols-1 gap-3">
                                            {getPaymentMethodOptions(
                                                selectedCustomer,
                                            ).map((option) => (
                                                <label
                                                    key={option.value}
                                                    className={`flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all ${
                                                        clearDueData.payment_type ===
                                                        option.value
                                                            ? "border-gray-900 bg-gray-50"
                                                            : "border-gray-200 hover:border-gray-300"
                                                    }`}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <input
                                                            type="radio"
                                                            name="payment_type"
                                                            value={option.value}
                                                            checked={
                                                                clearDueData.payment_type ===
                                                                option.value
                                                            }
                                                            onChange={
                                                                handleClearDueInputChange
                                                            }
                                                            className="radio radio-primary"
                                                            disabled={
                                                                processingClearDue
                                                            }
                                                        />
                                                        <div className="flex items-center gap-2">
                                                            <div
                                                                className={`p-2 rounded-lg ${
                                                                    clearDueData.payment_type ===
                                                                    option.value
                                                                        ? "bg-gray-900 text-white"
                                                                        : "bg-gray-100 text-gray-600"
                                                                }`}
                                                            >
                                                                {option.icon}
                                                            </div>
                                                            <div>
                                                                <div className="font-bold text-sm">
                                                                    {
                                                                        option.label
                                                                    }
                                                                </div>
                                                                {option.description && (
                                                                    <div className="text-xs text-gray-500">
                                                                        {
                                                                            option.description
                                                                        }
                                                                    </div>
                                                                )}
                                                                {option.value ===
                                                                    "advance_adjustment" && (
                                                                    <div className="text-xs text-green-600 font-bold mt-1">
                                                                        {t(
                                                                            "customer.available_advance",
                                                                            "Available Advance",
                                                                        )}
                                                                        : ৳
                                                                        {formatCurrency(
                                                                            selectedCustomer.advance_amount ||
                                                                                0,
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    {option.value ===
                                                        "advance_adjustment" && (
                                                        <div className="text-xs font-bold text-green-700 bg-green-100 px-2 py-1 rounded">
                                                            ৳
                                                            {formatCurrency(
                                                                selectedCustomer.advance_amount ||
                                                                    0,
                                                            )}
                                                        </div>
                                                    )}
                                                </label>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Account Selection (only for account_adjustment) */}
                                    {clearDueData.payment_type ===
                                        "account_adjustment" && (
                                        <div>
                                            <label className="label-text font-bold text-gray-800 text-sm mb-3 block">
                                                {t(
                                                    "customer.payment_account",
                                                    "Payment Account",
                                                )}{" "}
                                                *
                                            </label>
                                            <div className="relative">
                                                <Landmark
                                                    size={18}
                                                    className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500"
                                                />
                                                <select
                                                    name="account_id"
                                                    value={
                                                        clearDueData.account_id
                                                    }
                                                    onChange={
                                                        handleClearDueInputChange
                                                    }
                                                    className="select select-bordered w-full pl-4 border-gray-300 focus:border-gray-900 focus:ring-2 focus:ring-gray-900/20 bg-white appearance-none"
                                                    disabled={
                                                        processingClearDue
                                                    }
                                                    required
                                                >
                                                    <option value="">
                                                        {t(
                                                            "customer.select_account",
                                                            "Select an account",
                                                        )}
                                                    </option>
                                                    {accounts.map((account) => (
                                                        <option
                                                            key={account.id}
                                                            value={account.id}
                                                        >
                                                            {account.name} - ৳
                                                            {formatCurrency(
                                                                account.current_balance,
                                                            )}
                                                        </option>
                                                    ))}
                                                </select>
                                                <ChevronRight
                                                    size={18}
                                                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 rotate-90"
                                                />
                                            </div>
                                            {clearDueErrors.account_id && (
                                                <div className="text-red-600 text-xs mt-2 flex items-center gap-2 bg-red-50 p-2 rounded-lg border border-red-200">
                                                    <AlertCircle size={12} />
                                                    {clearDueErrors.account_id}
                                                </div>
                                            )}

                                            {/* Selected Account Details */}
                                            {clearDueData.account_id &&
                                                accounts.find(
                                                    (acc) =>
                                                        acc.id.toString() ===
                                                        clearDueData.account_id.toString(),
                                                ) && (
                                                    <div className="mt-3 bg-gradient-to-r from-blue-50 to-indigo-50 p-3 rounded-lg border border-blue-200">
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center gap-2">
                                                                {getAccountIcon(
                                                                    accounts.find(
                                                                        (acc) =>
                                                                            acc.id.toString() ===
                                                                            clearDueData.account_id.toString(),
                                                                    ).type,
                                                                )}
                                                                <span className="font-bold text-sm">
                                                                    {
                                                                        accounts.find(
                                                                            (
                                                                                acc,
                                                                            ) =>
                                                                                acc.id.toString() ===
                                                                                clearDueData.account_id.toString(),
                                                                        ).name
                                                                    }
                                                                </span>
                                                            </div>
                                                            <div className="text-sm font-mono text-green-700">
                                                                ৳
                                                                {formatCurrency(
                                                                    accounts.find(
                                                                        (acc) =>
                                                                            acc.id.toString() ===
                                                                            clearDueData.account_id.toString(),
                                                                    )
                                                                        .current_balance,
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                        </div>
                                    )}

                                    {/* Transaction Reference */}
                                    <div>
                                        <label className="label-text font-bold text-gray-800 text-sm mb-2 block">
                                            {t(
                                                "customer.transaction_reference",
                                                "Transaction Reference",
                                            )}
                                        </label>
                                        <div className="relative">
                                            <FileText
                                                size={18}
                                                className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500"
                                            />
                                            <input
                                                type="text"
                                                name="txn_ref"
                                                value={clearDueData.txn_ref}
                                                onChange={
                                                    handleClearDueInputChange
                                                }
                                                className="input input-bordered w-full pl-12 py-3.5 border-gray-300 focus:border-gray-900 focus:ring-2 focus:ring-gray-900/20 bg-white font-mono text-sm"
                                                disabled={processingClearDue}
                                                placeholder="Auto-generated reference"
                                            />
                                        </div>
                                        <div className="text-xs text-gray-500 mt-1">
                                            {t(
                                                "customer.auto_generated_ref",
                                                "Auto-generated transaction reference",
                                            )}
                                        </div>
                                    </div>

                                    {/* Date and Notes */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="label-text font-bold text-gray-800 text-sm mb-2 block">
                                                {t(
                                                    "customer.payment_date",
                                                    "Payment Date",
                                                )}
                                            </label>
                                            <div className="relative">
                                                <Calendar
                                                    size={18}
                                                    className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500"
                                                />
                                                <input
                                                    type="date"
                                                    name="payment_date"
                                                    value={
                                                        clearDueData.payment_date
                                                    }
                                                    onChange={
                                                        handleClearDueInputChange
                                                    }
                                                    className="input input-bordered w-full pl-12 py-3.5 border-gray-300 focus:border-gray-900 focus:ring-2 focus:ring-gray-900/20 bg-white"
                                                    disabled={
                                                        processingClearDue
                                                    }
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="label-text font-bold text-gray-800 text-sm mb-2 block">
                                                {t("customer.notes", "Notes")}
                                            </label>
                                            <input
                                                type="text"
                                                name="notes"
                                                value={clearDueData.notes}
                                                onChange={
                                                    handleClearDueInputChange
                                                }
                                                className="input input-bordered w-full py-3.5 border-gray-300 focus:border-gray-900 focus:ring-2 focus:ring-gray-900/20 bg-white"
                                                placeholder={t(
                                                    "customer.payment_notes",
                                                    "Payment notes",
                                                )}
                                                disabled={processingClearDue}
                                            />
                                        </div>
                                    </div>

                                    {/* Payment Summary */}
                                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-xl border border-blue-200 shadow-sm">
                                        <div className="flex items-center gap-2 mb-4">
                                            <div className="p-1.5 bg-blue-100 rounded-lg">
                                                <Info
                                                    size={18}
                                                    className="text-blue-700"
                                                />
                                            </div>
                                            <h6 className="font-bold text-gray-900">
                                                {t(
                                                    "customer.payment_summary",
                                                    "Payment Summary",
                                                )}
                                            </h6>
                                        </div>

                                        <div className="space-y-3">
                                            <div className="flex justify-between items-center pb-3 border-b border-blue-200">
                                                <div className="text-sm text-gray-600">
                                                    {t(
                                                        "customer.payment_amount",
                                                        "Payment Amount",
                                                    )}
                                                </div>
                                                <div className="font-mono font-bold text-xl text-gray-900">
                                                    ৳
                                                    {formatCurrency(
                                                        clearDueData.paid_amount ||
                                                            0,
                                                    )}
                                                </div>
                                            </div>

                                            <div className="flex justify-between items-center">
                                                <div className="text-sm text-gray-600">
                                                    {t(
                                                        "customer.payment_method",
                                                        "Payment Method",
                                                    )}
                                                </div>
                                                <div className="font-bold text-gray-900">
                                                    {clearDueData.payment_type ===
                                                    "advance_adjustment"
                                                        ? t(
                                                              "customer.advance_adjustment",
                                                              "Advance Adjustment",
                                                          )
                                                        : clearDueData.payment_type ===
                                                            "account_adjustment"
                                                          ? t(
                                                                "customer.account_adjustment",
                                                                "Account Adjustment",
                                                            )
                                                          : t(
                                                                "customer.cash",
                                                                "Cash",
                                                            )}
                                                </div>
                                            </div>

                                            {clearDueData.payment_type ===
                                                "account_adjustment" &&
                                                clearDueData.account_id && (
                                                    <>
                                                        <div className="my-3 border-t border-blue-200 pt-3">
                                                            <div className="flex justify-between items-center">
                                                                <div className="text-sm text-gray-600">
                                                                    {t(
                                                                        "customer.selected_account",
                                                                        "Selected Account",
                                                                    )}
                                                                </div>
                                                                <div className="font-bold text-gray-900">
                                                                    {
                                                                        accounts.find(
                                                                            (
                                                                                a,
                                                                            ) =>
                                                                                a.id.toString() ===
                                                                                clearDueData.account_id.toString(),
                                                                        )?.name
                                                                    }
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <div className="bg-white p-3 rounded-lg border border-blue-200">
                                                            <div className="flex justify-between items-center">
                                                                <div className="text-sm font-bold text-gray-800">
                                                                    {t(
                                                                        "customer.balance_after_payment",
                                                                        "Balance After Payment",
                                                                    )}
                                                                </div>
                                                                <div className="font-mono font-bold text-xl text-blue-700">
                                                                    ৳
                                                                    {formatCurrency(
                                                                        (accounts.find(
                                                                            (
                                                                                a,
                                                                            ) =>
                                                                                a.id.toString() ===
                                                                                clearDueData.account_id.toString(),
                                                                        )
                                                                            ?.current_balance ||
                                                                            0) -
                                                                            (clearDueData.paid_amount ||
                                                                                0),
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </>
                                                )}

                                            {clearDueData.payment_type ===
                                                "advance_adjustment" && (
                                                <div className="bg-white p-3 rounded-lg border border-green-200">
                                                    <div className="flex justify-between items-center">
                                                        <div className="text-sm font-bold text-gray-800">
                                                            {t(
                                                                "customer.advance_after_payment",
                                                                "Advance After Payment",
                                                            )}
                                                        </div>
                                                        <div className="font-mono font-bold text-xl text-green-700">
                                                            ৳
                                                            {formatCurrency(
                                                                (selectedCustomer.advance_amount ||
                                                                    0) -
                                                                    (clearDueData.paid_amount ||
                                                                        0),
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Errors */}
                                    {clearDueErrors.submit && (
                                        <div className="bg-red-50 text-red-700 border border-red-200 p-4 rounded-xl">
                                            <div className="flex items-center gap-3">
                                                <AlertCircle
                                                    size={20}
                                                    className="text-red-600"
                                                />
                                                <div>
                                                    <div className="font-bold">
                                                        {t(
                                                            "customer.payment_error",
                                                            "Payment Error",
                                                        )}
                                                    </div>
                                                    <div className="text-sm mt-1">
                                                        {clearDueErrors.submit}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Action Buttons */}
                                <div className="flex gap-3 mt-8 pt-6 border-t border-gray-200">
                                    <button
                                        type="button"
                                        onClick={clearDueModelClose}
                                        className="btn btn-ghost flex-1 hover:bg-gray-100 text-gray-700 border border-gray-300"
                                        disabled={processingClearDue}
                                    >
                                        {t("customer.cancel", "Cancel")}
                                    </button>
                                    <button
                                        type="submit"
                                        className="btn btn-warning flex-1 bg-orange-600 border-orange-600 hover:bg-orange-700 hover:border-orange-700 text-white"
                                        disabled={
                                            processingClearDue ||
                                            !clearDueData.paid_amount ||
                                            (clearDueData.payment_type ===
                                                "account_adjustment" &&
                                                !clearDueData.account_id)
                                        }
                                    >
                                        {processingClearDue ? (
                                            <>
                                                <span className="loading loading-spinner loading-sm"></span>
                                                {t(
                                                    "customer.processing",
                                                    "Processing...",
                                                )}
                                            </>
                                        ) : (
                                            <>
                                                <CheckCircle size={18} />
                                                {t(
                                                    "customer.clear_due",
                                                    "Clear Due",
                                                )}
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Advance Payment Modal */}
            {advanceModel && selectedCustomer && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md transform transition-all overflow-hidden">
                        {/* Modal Header */}
                        <div className="px-6 py-5 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-green-500 rounded-lg shadow-sm">
                                        <DollarSign
                                            className="text-white"
                                            size={22}
                                        />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-black text-gray-900">
                                            {t(
                                                "customer.add_advance_payment",
                                                "Add Advance Payment",
                                            )}
                                        </h3>
                                        <p className="text-sm text-gray-600">
                                            {t(
                                                "customer.advance_payment_desc",
                                                "Record advance payment for customer",
                                            )}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={advanceModelClose}
                                    className="btn btn-ghost btn-circle btn-sm hover:bg-gray-200"
                                    disabled={processingPayment}
                                >
                                    <X size={20} />
                                </button>
                            </div>
                        </div>

                        {/* Modal Content */}
                        <div className="px-6 py-5 max-h-[75vh] overflow-y-auto">
                            {/* Customer Info Card */}
                            <div className="mb-6 p-4 bg-white rounded-xl border border-gray-200 shadow-sm">
                                <div className="flex items-start justify-between mb-4">
                                    <div>
                                        <h4 className="font-bold text-gray-900 text-lg">
                                            {selectedCustomer.customer_name}
                                        </h4>
                                        <div className="flex items-center gap-2 mt-1">
                                            <Phone
                                                size={14}
                                                className="text-gray-500"
                                            />
                                            <p className="text-sm text-gray-600">
                                                {selectedCustomer.phone}
                                            </p>
                                        </div>
                                    </div>
                                    <div
                                        className={`px-3 py-1 rounded-full ${selectedCustomer.is_active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"} text-xs font-bold flex items-center gap-1`}
                                    >
                                        {selectedCustomer.is_active ? (
                                            <CheckCircle size={12} />
                                        ) : (
                                            <X size={12} />
                                        )}
                                        {selectedCustomer.is_active
                                            ? t("customer.active", "Active")
                                            : t(
                                                  "customer.inactive",
                                                  "Inactive",
                                              )}
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="text-center p-3 bg-gradient-to-br from-green-50 to-green-100 rounded-lg border border-green-200">
                                        <div className="text-xs text-green-700 uppercase font-bold tracking-wider mb-1">
                                            {t(
                                                "customer.current_advance",
                                                "Current Advance",
                                            )}
                                        </div>
                                        <div className="text-xl font-black text-green-800">
                                            ৳
                                            {formatCurrency(
                                                selectedCustomer.advance_amount ||
                                                    0,
                                            )}
                                        </div>
                                    </div>
                                    <div className="text-center p-3 bg-gradient-to-br from-red-50 to-red-100 rounded-lg border border-red-200">
                                        <div className="text-xs text-red-700 uppercase font-bold tracking-wider mb-1">
                                            {t(
                                                "customer.total_due",
                                                "Total Due",
                                            )}
                                        </div>
                                        <div className="text-xl font-black text-red-800">
                                            ৳
                                            {formatCurrency(
                                                calculateDueAmount(
                                                    selectedCustomer.sales,
                                                ) || 0,
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <form onSubmit={handleAdvanceSubmit}>
                                <div className="space-y-6">
                                    {/* Amount Section */}
                                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                                        <div className="flex justify-between items-center mb-3">
                                            <label className="label-text font-bold text-gray-800 text-sm">
                                                {t("customer.amount", "Amount")}{" "}
                                                *
                                            </label>
                                            <div className="flex gap-2">
                                                <button
                                                    type="button"
                                                    onClick={handleFullPayment}
                                                    className="btn btn-xs btn-primary bg-gray-900 border-gray-900 hover:bg-black hover:border-black"
                                                    disabled={processingPayment}
                                                >
                                                    {t("customer.full", "Full")}
                                                </button>
                                            </div>
                                        </div>
                                        <div className="relative">
                                            <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-600 font-bold text-lg">
                                                ৳
                                            </span>
                                            <input
                                                type="number"
                                                name="amount"
                                                step="0.01"
                                                min="0.01"
                                                value={paymentData.amount}
                                                onChange={
                                                    handlePaymentInputChange
                                                }
                                                className="input input-bordered w-full pl-4 py-4 text-lg font-mono border-gray-300 focus:border-gray-900 focus:ring-2 focus:ring-gray-900/20 bg-white"
                                                disabled={processingPayment}
                                                required
                                                placeholder="0.00"
                                            />
                                        </div>
                                        {paymentErrors.amount && (
                                            <div className="text-red-600 text-xs mt-2 flex items-center gap-2 bg-red-50 p-2 rounded-lg border border-red-200">
                                                <AlertCircle size={12} />
                                                {paymentErrors.amount}
                                            </div>
                                        )}
                                    </div>

                                    {/* Account Selection */}
                                    <div>
                                        <label className="label-text font-bold text-gray-800 text-sm mb-3 block">
                                            {t(
                                                "customer.payment_account",
                                                "Payment Account",
                                            )}{" "}
                                            *
                                        </label>
                                        <div className="relative">
                                            <Landmark
                                                size={18}
                                                className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500"
                                            />
                                            <select
                                                name="account_id"
                                                value={paymentData.account_id}
                                                onChange={
                                                    handlePaymentInputChange
                                                }
                                                className="select select-bordered w-full pl-4 border-gray-300 focus:border-gray-900 focus:ring-2 focus:ring-gray-900/20 bg-white appearance-none"
                                                disabled={processingPayment}
                                                required
                                            >
                                                <option value="">
                                                    {t(
                                                        "customer.select_account",
                                                        "Select an account",
                                                    )}
                                                </option>
                                                {accounts.map((account) => (
                                                    <option
                                                        key={account.id}
                                                        value={account.id}
                                                    >
                                                        {account.name} - ৳
                                                        {formatCurrency(
                                                            account.current_balance,
                                                        )}
                                                    </option>
                                                ))}
                                            </select>
                                            <ChevronRight
                                                size={18}
                                                className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 rotate-90"
                                            />
                                        </div>
                                        {paymentErrors.account_id && (
                                            <div className="text-red-600 text-xs mt-2 flex items-center gap-2 bg-red-50 p-2 rounded-lg border border-red-200">
                                                <AlertCircle size={12} />
                                                {paymentErrors.account_id}
                                            </div>
                                        )}
                                    </div>

                                    {/* Selected Account Details */}
                                    {selectedAccount && (
                                        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-xl border border-blue-200 shadow-sm">
                                            <div className="flex items-center justify-between mb-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 bg-white rounded-lg border border-blue-200">
                                                        {getPaymentIcon(
                                                            selectedAccount.type ||
                                                                "bank",
                                                        )}
                                                    </div>
                                                    <div>
                                                        <h5 className="font-bold text-gray-900">
                                                            {
                                                                selectedAccount.name
                                                            }
                                                        </h5>
                                                        <p className="text-xs text-gray-600">
                                                            {t(
                                                                "customer.account_details",
                                                                "Account Details",
                                                            )}
                                                        </p>
                                                    </div>
                                                </div>
                                                <span
                                                    className={`text-xs font-bold px-3 py-1.5 rounded-full ${selectedAccount.type === "cash" ? "bg-green-100 text-green-800" : selectedAccount.type === "bank" ? "bg-blue-100 text-blue-800" : "bg-purple-100 text-purple-800"}`}
                                                >
                                                    {selectedAccount.type
                                                        ? t(
                                                              `customer.${selectedAccount.type}`,
                                                              selectedAccount.type
                                                                  .charAt(0)
                                                                  .toUpperCase() +
                                                                  selectedAccount.type.slice(
                                                                      1,
                                                                  ),
                                                          )
                                                        : "Bank"}
                                                </span>
                                            </div>

                                            <div className="grid grid-cols-2 gap-4 mt-4">
                                                <div className="bg-white p-3 rounded-lg border border-blue-100">
                                                    <div className="text-xs text-gray-500 mb-1">
                                                        {t(
                                                            "customer.account_number",
                                                            "Account Number",
                                                        )}
                                                    </div>
                                                    <div className="font-mono text-sm font-bold text-gray-800">
                                                        {selectedAccount.account_number ||
                                                            t(
                                                                "customer.na",
                                                                "N/A",
                                                            )}
                                                    </div>
                                                </div>
                                                <div className="bg-white p-3 rounded-lg border border-blue-100">
                                                    <div className="text-xs text-gray-500 mb-1">
                                                        {t(
                                                            "customer.bank_name",
                                                            "Bank Name",
                                                        )}
                                                    </div>
                                                    <div className="font-bold text-sm text-gray-800">
                                                        {selectedAccount.bank_name ??
                                                            selectedAccount.mobile_provider ??
                                                            t(
                                                                "customer.cash",
                                                                "Cash",
                                                            )}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="mt-4 pt-4 border-t border-blue-200">
                                                <div className="flex items-center justify-between">
                                                    <div className="text-sm text-gray-700 font-medium">
                                                        {t(
                                                            "customer.current_balance",
                                                            "Current Balance",
                                                        )}
                                                        :
                                                    </div>
                                                    <div className="font-mono font-bold text-xl text-green-700">
                                                        ৳
                                                        {formatCurrency(
                                                            selectedAccount.current_balance ||
                                                                0,
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Date and Notes */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="label-text font-bold text-gray-800 text-sm mb-2 block">
                                                {t(
                                                    "customer.payment_date",
                                                    "Payment Date",
                                                )}
                                            </label>
                                            <div className="relative">
                                                <Calendar
                                                    size={18}
                                                    className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500"
                                                />
                                                <input
                                                    type="date"
                                                    name="payment_date"
                                                    value={
                                                        paymentData.payment_date
                                                    }
                                                    onChange={
                                                        handlePaymentInputChange
                                                    }
                                                    className="input input-bordered w-full pl-12 py-3.5 border-gray-300 focus:border-gray-900 focus:ring-2 focus:ring-gray-900/20 bg-white"
                                                    disabled={processingPayment}
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="label-text font-bold text-gray-800 text-sm mb-2 block">
                                                {t("customer.notes", "Notes")} (
                                                {t(
                                                    "customer.optional",
                                                    "Optional",
                                                )}
                                                )
                                            </label>
                                            <input
                                                type="text"
                                                name="notes"
                                                value={paymentData.notes}
                                                onChange={
                                                    handlePaymentInputChange
                                                }
                                                className="input input-bordered w-full py-3.5 border-gray-300 focus:border-gray-900 focus:ring-2 focus:ring-gray-900/20 bg-white"
                                                placeholder={t(
                                                    "customer.payment_reference",
                                                    "Payment reference",
                                                )}
                                                disabled={processingPayment}
                                            />
                                        </div>
                                    </div>

                                    {/* Payment Summary Card */}
                                    <div className="bg-gradient-to-r from-amber-50 to-orange-50 p-4 rounded-xl border border-amber-200 shadow-sm">
                                        <div className="flex items-center gap-2 mb-4">
                                            <div className="p-1.5 bg-amber-100 rounded-lg">
                                                <Info
                                                    size={18}
                                                    className="text-amber-700"
                                                />
                                            </div>
                                            <h6 className="font-bold text-gray-900">
                                                {t(
                                                    "customer.payment_summary",
                                                    "Payment Summary",
                                                )}
                                            </h6>
                                        </div>

                                        <div className="space-y-3">
                                            <div className="flex justify-between items-center pb-3 border-b border-amber-200">
                                                <div className="text-sm text-gray-600">
                                                    {t(
                                                        "customer.amount_to_pay",
                                                        "Amount to Pay",
                                                    )}
                                                </div>
                                                <div className="font-mono font-bold text-xl text-gray-900">
                                                    ৳
                                                    {formatCurrency(
                                                        paymentData.amount || 0,
                                                    )}
                                                </div>
                                            </div>

                                            <div className="flex justify-between items-center">
                                                <div className="text-sm text-gray-600">
                                                    {t(
                                                        "customer.payment_account",
                                                        "Payment Account",
                                                    )}
                                                </div>
                                                <div className="font-bold text-gray-900">
                                                    {selectedAccount
                                                        ? selectedAccount.name
                                                        : t(
                                                              "customer.not_selected",
                                                              "Not selected",
                                                          )}
                                                </div>
                                            </div>

                                            <div className="flex justify-between items-center">
                                                <div className="text-sm text-gray-600">
                                                    {t(
                                                        "customer.payment_date",
                                                        "Payment Date",
                                                    )}
                                                </div>
                                                <div className="font-medium">
                                                    {paymentData.payment_date}
                                                </div>
                                            </div>

                                            {selectedAccount && (
                                                <>
                                                    <div className="my-3 border-t border-amber-200 pt-3">
                                                        <div className="flex justify-between items-center">
                                                            <div className="text-sm text-gray-600">
                                                                {t(
                                                                    "customer.current_balance",
                                                                    "Current Balance",
                                                                )}
                                                            </div>
                                                            <div className="font-mono font-bold text-green-700">
                                                                ৳
                                                                {formatCurrency(
                                                                    selectedAccount.current_balance ||
                                                                        0,
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="bg-white p-3 rounded-lg border border-amber-200">
                                                        <div className="flex justify-between items-center">
                                                            <div className="text-sm font-bold text-gray-800">
                                                                {t(
                                                                    "customer.balance_after_payment",
                                                                    "Balance After Payment",
                                                                )}
                                                            </div>
                                                            <div className="font-mono font-bold text-xl text-blue-700">
                                                                ৳
                                                                {formatCurrency(
                                                                    (selectedAccount.current_balance ||
                                                                        0) -
                                                                        (paymentData.amount ||
                                                                            0),
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    {/* Errors */}
                                    {paymentErrors.submit && (
                                        <div className="bg-red-50 text-red-700 border border-red-200 p-4 rounded-xl">
                                            <div className="flex items-center gap-3">
                                                <AlertCircle
                                                    size={20}
                                                    className="text-red-600"
                                                />
                                                <div>
                                                    <div className="font-bold">
                                                        {t(
                                                            "customer.payment_error",
                                                            "Payment Error",
                                                        )}
                                                    </div>
                                                    <div className="text-sm mt-1">
                                                        {paymentErrors.submit}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Action Buttons */}
                                <div className="flex gap-3 mt-8 pt-6 border-t border-gray-200">
                                    <button
                                        type="button"
                                        onClick={advanceModelClose}
                                        className="btn btn-ghost flex-1 hover:bg-gray-100 text-gray-700 border border-gray-300"
                                        disabled={processingPayment}
                                    >
                                        {t("customer.cancel", "Cancel")}
                                    </button>
                                    <button
                                        type="submit"
                                        className="btn btn-success flex-1 bg-green-600 border-green-600 hover:bg-green-700 hover:border-green-700 text-white"
                                        disabled={
                                            processingPayment ||
                                            !paymentData.amount ||
                                            !paymentData.account_id
                                        }
                                    >
                                        {processingPayment ? (
                                            <>
                                                <span className="loading loading-spinner loading-sm"></span>
                                                {t(
                                                    "customer.processing",
                                                    "Processing...",
                                                )}
                                            </>
                                        ) : (
                                            <>
                                                <CheckCircle size={18} />
                                                {t(
                                                    "customer.submit_payment",
                                                    "Submit Payment",
                                                )}
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Page Header */}
            <PageHeader
                title={t("customer.title", "Customer Management")}
                subtitle={t(
                    "customer.subtitle",
                    "Manage your all customers from here.",
                )}
            >
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => {
                            customerForm.reset();
                            setModel(true);
                        }}
                        className="btn bg-[#1e4d2b] hover:bg-[#1a4326] text-white btn-sm flex items-center gap-2"
                    >
                        <Plus size={16} />
                        <span>{t("customer.add_customer", "Add Customer")}</span>
                    </button>
                </div>
            </PageHeader>

            {/* Collapsible Filter Card */}
            <div className="bg-base-100 rounded-box border border-base-content/5 mb-6 overflow-hidden">
                <div 
                    className="flex items-center justify-between p-4 cursor-pointer hover:bg-base-200 transition-colors"
                    onClick={toggleFilters}
                >
                    <div className="flex items-center gap-2">
                        <Filter size={18} className="text-[#1e4d2b]" />
                        <h3 className="text-lg font-semibold text-neutral">Filters</h3>
                        {hasActiveFilters && (
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

                {showFilters && (
                    <div className="p-4 border-t border-base-content/5">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            {/* Search */}
                            <fieldset className="fieldset">
                                <legend className="fieldset-legend">Search</legend>
                                <div className="relative">
                                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input
                                        type="search"
                                        value={localFilters.search}
                                        onChange={(e) => handleFilter("search", e.target.value)}
                                        onKeyPress={handleKeyPress}
                                        placeholder={t(
                                            "customer.search_placeholder",
                                            "Search customers...",
                                        )}
                                        className="input input-sm input-bordered w-full pl-8"
                                    />
                                </div>
                            </fieldset>

                            {/* Status */}
                            <fieldset className="fieldset">
                                <legend className="fieldset-legend">Status</legend>
                                <select
                                    value={localFilters.status}
                                    onChange={(e) => handleFilter("status", e.target.value)}
                                    className="select select-sm select-bordered w-full"
                                >
                                    <option value="">{t("customer.all_status", "All Status")}</option>
                                    <option value="active">{t("customer.active", "Active")}</option>
                                    <option value="inactive">{t("customer.inactive", "Inactive")}</option>
                                </select>
                            </fieldset>

                            {/* Date From */}
                            <fieldset className="fieldset">
                                <legend className="fieldset-legend">Date From</legend>
                                <div className="relative">
                                    <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input
                                        type="date"
                                        value={formatDateForInput(localFilters.date_from)}
                                        onChange={(e) => handleFilter("date_from", e.target.value)}
                                        className="input input-sm input-bordered w-full pl-8"
                                    />
                                </div>
                            </fieldset>

                            {/* Date To */}
                            <fieldset className="fieldset">
                                <legend className="fieldset-legend">Date To</legend>
                                <div className="relative">
                                    <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input
                                        type="date"
                                        value={formatDateForInput(localFilters.date_to)}
                                        onChange={(e) => handleFilter("date_to", e.target.value)}
                                        min={formatDateForInput(localFilters.date_from)}
                                        className="input input-sm input-bordered w-full pl-8"
                                    />
                                </div>
                            </fieldset>
                        </div>

                        {/* Active Filters Display */}
                        {hasActiveFilters && (
                            <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-gray-600">
                                <span className="font-medium">Active Filters:</span>
                                {localFilters.search && (
                                    <span className="badge badge-outline badge-sm">
                                        Search: {localFilters.search}
                                    </span>
                                )}
                                {localFilters.status && (
                                    <span className="badge badge-outline badge-sm">
                                        Status: {localFilters.status}
                                    </span>
                                )}
                                {localFilters.date_from && (
                                    <span className="badge badge-outline badge-sm">
                                        From: {new Date(localFilters.date_from).toLocaleDateString()}
                                    </span>
                                )}
                                {localFilters.date_to && (
                                    <span className="badge badge-outline badge-sm">
                                        To: {new Date(localFilters.date_to).toLocaleDateString()}
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
                        disabled={isDownloading || customers.data.length === 0}
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

            {/* Summary Stats - Responsive */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3 mb-4">
                <div className="bg-gray-900 text-white rounded-box p-3">
                    <p className="text-xs uppercase tracking-wider font-bold text-gray-300 mb-1">
                        {t("customer.total_customers", "Total Customers")}
                    </p>
                    <div className="flex items-center justify-between">
                        <p className="text-lg md:text-xl font-black">{customers.total}</p>
                        <Users size={16} className="text-gray-400" />
                    </div>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-box p-3">
                    <p className="text-xs uppercase tracking-wider font-bold text-green-700 mb-1">
                        {t("customer.active_customers", "Active Customers")}
                    </p>
                    <div className="flex items-center justify-between">
                        <p className="text-lg md:text-xl font-black text-green-700">
                            {customers.data.filter((c) => c.is_active).length}
                        </p>
                        <CheckCircle size={16} className="text-green-500" />
                    </div>
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-box p-3">
                    <p className="text-xs uppercase tracking-wider font-bold text-amber-700 mb-1">
                        {t("customer.total_advance", "Total Advance")}
                    </p>
                    <div className="flex items-center justify-between">
                        <p className="text-lg md:text-xl font-black text-amber-700">
                            ৳{formatCurrency(
                                customers.data.reduce(
                                    (sum, c) =>
                                        sum + parseFloat(c.advance_amount || 0),
                                    0,
                                ),
                            )}
                        </p>
                        <TrendingUp size={16} className="text-amber-500" />
                    </div>
                </div>
                <div className="bg-red-50 border border-red-200 rounded-box p-3">
                    <p className="text-xs uppercase tracking-wider font-bold text-red-700 mb-1">
                        {t("customer.total_due", "Total Due")}
                    </p>
                    <div className="flex items-center justify-between">
                        <p className="text-lg md:text-xl font-black text-red-700">
                            ৳{formatCurrency(
                                customers.data.reduce(
                                    (sum, c) =>
                                        sum + calculateDueAmount(c.sales),
                                    0,
                                ),
                            )}
                        </p>
                        <TrendingDown size={16} className="text-red-500" />
                    </div>
                </div>
            </div>

            {/* Customers Table - Responsive */}
            <div className="print:hidden">
                <div className="overflow-x-auto -mx-2">
                    {customers.data.length > 0 ? (
                        <>
                            {/* Desktop/Tablet Table */}
                            <div className="hidden md:block">
                                <table className="table table-auto w-full text-sm">
                                    <thead className="bg-gray-900 text-white uppercase text-[10px] tracking-widest">
                                        <tr>
                                            <th className="py-2 px-3">#</th>
                                            <th className="py-2 px-3">{t("customer.contact_info", "Contact Info")}</th>
                                            <th className="py-2 px-3">{t("customer.address", "Address")}</th>
                                            <th className="py-2 px-3">{t("customer.financial_status", "Financial Status")}</th>
                                            <th className="py-2 px-3 text-right">{t("customer.command", "Command")}</th>
                                        </tr>
                                    </thead>
                                    <tbody className="font-bold text-sm text-gray-700">
                                        {customers.data.map((customer, index) => {
                                            const dueAmount = calculateDueAmount(customer.sales);
                                            const hasDue = dueAmount > 0;
                                            const customerAccount = getCustomerAccount(customer.account_id);

                                            return (
                                                <tr key={customer.id} className="hover:bg-gray-50 border-b">
                                                    <td className="py-2 px-3 text-gray-400 font-mono text-xs">
                                                        {index + 1}
                                                    </td>
                                                    <td className="py-2 px-3">
                                                        <div className="max-w-[120px]">
                                                            <p className="font-bold text-gray-900 uppercase text-xs">
                                                                {customer.customer_name}
                                                            </p>
                                                            <span className="text-[10px] flex items-center gap-1 text-gray-400 font-bold uppercase tracking-wider">
                                                                <Phone size={10} /> {customer.phone}
                                                            </span>
                                                            {customerAccount && (
                                                                <span className="text-[10px] flex items-center gap-1 text-blue-500 font-bold uppercase tracking-wider mt-1">
                                                                    {getAccountIcon(customerAccount.type)}
                                                                    <span>{customerAccount.name}</span>
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="py-2 px-3">
                                                        <div className="max-w-[120px]">
                                                            {customer.address ? (
                                                                <div className="flex items-center gap-2 text-gray-900 uppercase text-xs">
                                                                    <MapPin size={12} className="text-blue-600" />
                                                                    <span className="line-clamp-2">
                                                                        {customer.address.substring(0, 30)}...
                                                                    </span>
                                                                </div>
                                                            ) : (
                                                                <div className="flex items-center gap-2 text-gray-400 uppercase text-[10px] font-bold">
                                                                    <span className="text-gray-400">📍</span>
                                                                    {t("customer.no_address", "No address")}
                                                                </div>
                                                            )}
                                                            <div className="mt-1">
                                                                <span className={`badge border-none font-bold text-[9px] uppercase py-1 px-2 ${customer.is_active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
                                                                    {customer.is_active
                                                                        ? t("customer.active", "Active")
                                                                        : t("customer.inactive", "Inactive")}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="py-2 px-3">
                                                        <div className="flex flex-col gap-1">
                                                            <div className="flex items-center justify-between">
                                                                <span className="text-xs text-gray-600">
                                                                    {t("customer.advance", "Advance")}:
                                                                </span>
                                                                <span className="font-mono text-xs font-bold text-green-600">
                                                                    ৳{formatCurrency(customer.advance_amount || 0)}
                                                                </span>
                                                            </div>
                                                            <div className="flex items-center justify-between">
                                                                <span className="text-xs text-gray-600">
                                                                    {t("customer.due", "Due")}:
                                                                </span>
                                                                <span className={`font-mono text-xs font-bold ${hasDue ? "text-red-600" : "text-gray-500"}`}>
                                                                    ৳{formatCurrency(dueAmount)}
                                                                </span>
                                                            </div>
                                                            <div className="mt-1 space-y-1">
                                                                <button
                                                                    onClick={() => handleAdvancePayment(customer)}
                                                                    className="btn btn-xs btn-success w-full flex items-center justify-center gap-1"
                                                                >
                                                                    <DollarSign size={12} />
                                                                    {t("customer.add_advance", "Add Advance")}
                                                                </button>
                                                                {hasDue && (
                                                                    <button
                                                                        onClick={() => handleClearDue(customer)}
                                                                        className="btn btn-xs btn-warning w-full flex items-center justify-center gap-1"
                                                                    >
                                                                        <Receipt size={12} />
                                                                        {t("customer.clear_due", "Clear Due")}
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="py-2 px-3 text-right">
                                                        <div className="flex justify-end gap-1">
                                                            <Link
                                                                href={route("customer.show", { id: customer.id })}
                                                                className="btn btn-ghost btn-square btn-xs p-1 hover:bg-blue-600 hover:text-white text-blue-600"
                                                                title={t("customer.view_details", "View Details")}
                                                            >
                                                                <Eye size={12} />
                                                            </Link>

                                                            <button
                                                                disabled={editProcessing}
                                                                onClick={() => handleCustomerEdit(customer.id)}
                                                                className="btn btn-ghost btn-square btn-xs p-1 hover:bg-amber-600 hover:text-white text-amber-600"
                                                                title={t("customer.edit", "Edit")}
                                                            >
                                                                <Edit size={12} />
                                                            </button>

                                                            <Link
                                                                href={route("customer.del", { id: customer.id })}
                                                                onClick={(e) => {
                                                                    if (!confirm(t("customer.delete_confirmation", "Are you sure you want to delete this customer?"))) {
                                                                        e.preventDefault();
                                                                    }
                                                                }}
                                                                className="btn btn-ghost btn-square btn-xs p-1 text-red-400 hover:bg-red-600 hover:text-white"
                                                                title={t("customer.delete", "Delete")}
                                                            >
                                                                <Trash2 size={12} />
                                                            </Link>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            {/* Mobile Card View */}
                            <div className="md:hidden space-y-3">
                                {customers.data.map((customer, index) => {
                                    const dueAmount = calculateDueAmount(customer.sales);
                                    const hasDue = dueAmount > 0;
                                    const customerAccount = getCustomerAccount(customer.account_id);

                                    return (
                                        <div key={customer.id} className="bg-white border rounded-lg p-3 shadow-sm">
                                            {/* Card Header */}
                                            <div className="flex justify-between items-start mb-2">
                                                <div className="flex-1">
                                                    <div className="flex items-start justify-between">
                                                        <div>
                                                            <h3 className="font-bold text-sm">{customer.customer_name}</h3>
                                                            <p className="text-xs text-gray-600">{customer.phone}</p>
                                                        </div>
                                                        <span className={`badge badge-xs ${customer.is_active ? "badge-success" : "badge-error"}`}>
                                                            {customer.is_active
                                                                ? t("customer.active", "Active")
                                                                : t("customer.inactive", "Inactive")}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Card Body */}
                                            <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                                                <div>
                                                    <span className="text-gray-500">Address:</span>
                                                    <p className="font-medium truncate">{customer.address || t("customer.no_address", "No address")}</p>
                                                </div>
                                                <div className="text-right">
                                                    <span className="text-gray-500">Advance:</span>
                                                    <p className="font-medium text-success">৳{formatCurrency(customer.advance_amount || 0)}</p>
                                                </div>
                                                <div>
                                                    <span className="text-gray-500">Due:</span>
                                                    <p className={`font-bold ${hasDue ? 'text-error' : 'text-success'}`}>
                                                        ৳{formatCurrency(dueAmount)}
                                                    </p>
                                                </div>
                                                {customerAccount && (
                                                    <div className="col-span-2">
                                                        <span className="text-gray-500">Account:</span>
                                                        <p className="font-medium text-blue-600">{customerAccount.name}</p>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Card Footer - Actions */}
                                            <div className="flex justify-between items-center pt-2 border-t">
                                                <div className="flex items-center gap-1">
                                                    <button
                                                        onClick={() => handleAdvancePayment(customer)}
                                                        className="btn btn-xs btn-success p-1"
                                                        title={t("customer.add_advance", "Add Advance")}
                                                    >
                                                        <DollarSign size={12} />
                                                    </button>
                                                    {hasDue && (
                                                        <button
                                                            onClick={() => handleClearDue(customer)}
                                                            className="btn btn-xs btn-warning p-1"
                                                            title={t("customer.clear_due", "Clear Due")}
                                                        >
                                                            <Receipt size={12} />
                                                        </button>
                                                    )}
                                                </div>
                                                
                                                <div className="flex items-center gap-1">
                                                    <Link
                                                        href={route("customer.show", { id: customer.id })}
                                                        className="btn btn-ghost btn-square btn-xs p-1 hover:bg-blue-600 hover:text-white text-blue-600"
                                                        title={t("customer.view_details", "View Details")}
                                                    >
                                                        <Eye size={12} />
                                                    </Link>

                                                    <button
                                                        disabled={editProcessing}
                                                        onClick={() => handleCustomerEdit(customer.id)}
                                                        className="btn btn-ghost btn-square btn-xs p-1 hover:bg-amber-600 hover:text-white text-amber-600"
                                                        title={t("customer.edit", "Edit")}
                                                    >
                                                        <Edit size={12} />
                                                    </button>

                                                    <Link
                                                        href={route("customer.del", { id: customer.id })}
                                                        onClick={(e) => {
                                                            if (!confirm(t("customer.delete_confirmation", "Are you sure you want to delete this customer?"))) {
                                                                e.preventDefault();
                                                            }
                                                        }}
                                                        className="btn btn-ghost btn-square btn-xs p-1 text-red-400 hover:bg-red-600 hover:text-white"
                                                        title={t("customer.delete", "Delete")}
                                                    >
                                                        <Trash2 size={12} />
                                                    </Link>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </>
                    ) : (
                        <div className="border border-gray-200 rounded-box px-4 py-12 flex flex-col justify-center items-center gap-3">
                            <Frown size={28} className="text-gray-400" />
                            <h1 className="text-gray-500 text-base font-medium text-center">
                                {localFilters.search
                                    ? t('customer.no_customers_matching', 'No customers matching "{{search}}"', { search: localFilters.search })
                                    : t('customer.no_customers_found', 'No customers found')}
                            </h1>
                            <button
                                onClick={() => setModel(true)}
                                className="btn bg-[#1e4d2b] text-white btn-sm mt-2"
                            >
                                <Plus size={14} />
                                {t("customer.add_first_customer", "Add Your First Customer")}
                            </button>
                        </div>
                    )}
                </div>

                {/* Pagination */}
                {customers.data.length > 0 && (
                    <div className="mt-4">
                        <Pagination data={customers} />
                    </div>
                )}
            </div>

            {/* Add/Edit Customer Modal */}
            <dialog
                className={`modal ${model ? "modal-open" : ""} items-start justify-center`}
            >
                <div className="modal-box w-full max-w-4xl p-0 overflow-hidden items-start justify-center">
                    {/* Modal Header */}
                    <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-6 py-4 w-full">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-[#1e4d2b] text-white rounded-lg">
                                    <User size={20} className="text-white" />
                                </div>
                                <div>
                                    <h1 className="text-xl font-black text-gray-900">
                                        {customerForm.data.id
                                            ? t(
                                                  "customer.edit_customer",
                                                  "Edit Customer",
                                              )
                                            : t(
                                                  "customer.new_customer",
                                                  "New Customer",
                                              )}
                                    </h1>
                                    <p className="text-sm text-gray-500">
                                        {customerForm.data.id
                                            ? t(
                                                  "customer.update_customer_info",
                                                  "Update customer information",
                                              )
                                            : t(
                                                  "customer.add_new_customer",
                                                  "Add a new customer to your contacts",
                                              )}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={modelClose}
                                className="btn btn-ghost btn-circle btn-sm hover:bg-gray-100"
                            >
                                <X size={20} />
                            </button>
                        </div>
                    </div>

                    {/* Modal Body */}
                    <div className="px-6 py-4 max-h-[70vh] overflow-y-auto">
                        <form onSubmit={handleCustomerCreateForm}>
                            {/* Basic Information Section */}
                            <div className="mb-8">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    {/* Customer Name */}
                                    <div className="form-control">
                                        <label className="label py-0 mb-2">
                                            <span className="label-text font-bold text-gray-700 text-sm">
                                                {t(
                                                    "customer.customer_name",
                                                    "Customer Name",
                                                )}{" "}
                                                <span className="text-red-500">
                                                    *
                                                </span>
                                            </span>
                                        </label>
                                        <div className="relative">
                                            <User
                                                size={16}
                                                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                                            />
                                            <input
                                                type="text"
                                                value={
                                                    customerForm.data
                                                        .customer_name
                                                }
                                                onChange={(e) =>
                                                    customerForm.setData(
                                                        "customer_name",
                                                        e.target.value,
                                                    )
                                                }
                                                className="input input-bordered w-full pl-4 py-3 border-gray-300 focus:border-gray-900 focus:ring-1 focus:ring-gray-900"
                                                placeholder={t(
                                                    "customer.enter_customer_name",
                                                    "Enter customer name",
                                                )}
                                                required
                                            />
                                        </div>
                                        {customerForm.errors.customer_name && (
                                            <div className="text-red-600 text-xs mt-2 flex items-center gap-2 bg-red-50 p-2 rounded">
                                                <AlertCircle size={12} />
                                                {
                                                    customerForm.errors
                                                        .customer_name
                                                }
                                            </div>
                                        )}
                                    </div>

                                    {/* Phone */}
                                    <div className="form-control">
                                        <label className="label py-0 mb-2">
                                            <span className="label-text font-bold text-gray-700 text-sm">
                                                {t("customer.phone", "Phone")}{" "}
                                                <span className="text-red-500">
                                                    *
                                                </span>
                                            </span>
                                        </label>
                                        <div className="relative">
                                            <Phone
                                                size={16}
                                                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                                            />
                                            <input
                                                type="tel"
                                                value={customerForm.data.phone}
                                                onChange={(e) =>
                                                    customerForm.setData(
                                                        "phone",
                                                        e.target.value,
                                                    )
                                                }
                                                className="input input-bordered w-full pl-4 py-3 border-gray-300 focus:border-gray-900 focus:ring-1 focus:ring-gray-900"
                                                placeholder={t(
                                                    "customer.enter_phone_number",
                                                    "Enter phone number",
                                                )}
                                                required
                                            />
                                        </div>
                                        {customerForm.errors.phone && (
                                            <div className="text-red-600 text-xs mt-2 flex items-center gap-2 bg-red-50 p-2 rounded">
                                                <AlertCircle size={12} />
                                                {customerForm.errors.phone}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Financial Information Section */}
                            <div className="mb-8">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    {/* Advance Amount */}
                                    <div className="form-control">
                                        <label className="label py-0 mb-2">
                                            <span className="label-text font-bold text-gray-700 text-sm">
                                                {t(
                                                    "customer.advance_amount",
                                                    "Advance Amount",
                                                )}
                                            </span>
                                            {customerForm.data.id && (
                                                <span className="text-xs text-gray-500 ml-2">
                                                    {t(
                                                        "customer.readonly_for_editing",
                                                        "(Read-only for editing)",
                                                    )}
                                                </span>
                                            )}
                                        </label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 font-bold">
                                                ৳
                                            </span>
                                            <input
                                                type="number"
                                                // step="0.01"
                                                // min="0"
                                                value={
                                                    customerForm.data
                                                        .advance_amount
                                                }
                                                onChange={(e) =>
                                                    customerForm.setData(
                                                        "advance_amount",
                                                        parseFloat(
                                                            e.target.value
                                                        ) 
                                                    )
                                                }
                                                className={`input input-bordered w-full pl-4 py-3 ${customerForm.data.id ? "bg-gray-100 cursor-not-allowed text-gray-500" : "border-gray-300 focus:border-gray-900 focus:ring-1 focus:ring-gray-900"}`}
                                                placeholder={t(
                                                    "customer.enter_advance_amount",
                                                    "Enter advance amount",
                                                )}
                                                readOnly={
                                                    !!customerForm.data.id
                                                }
                                            />
                                        </div>
                                    </div>
                                    <div className="form-control">
                                        <label className="label py-0 mb-2">
                                            <span className="label-text font-bold text-gray-700 text-sm">
                                                {t(
                                                    "customer.due_amount",
                                                    "Due Amount",
                                                )}
                                            </span>
                                            {customerForm.data.id && (
                                                <span className="text-xs text-gray-500 ml-2">
                                                    {t(
                                                        "customer.readonly_for_editing",
                                                        "(Read-only for editing)",
                                                    )}
                                                </span>
                                            )}
                                        </label>

                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 font-bold">
                                                ৳
                                            </span>
                                            <input
                                                type="number"
                                                // step="0.01"
                                                // min="0"
                                                value={
                                                    customerForm.data.due_amount
                                                }
                                                onChange={(e) =>
                                                    customerForm.setData(
                                                        "due_amount",
                                                        parseFloat(
                                                            e.target.value
                                                        ) 
                                                    )
                                                }
                                                className={`input input-bordered w-full pl-4 py-3 ${customerForm.data.id ? "bg-gray-100 cursor-not-allowed text-gray-500" : "border-gray-300 focus:border-gray-900 focus:ring-1 focus:ring-gray-900"}`}
                                                placeholder={t(
                                                    "customer.enter_due_amount",
                                                    "Enter due amount",
                                                )}
                                                readOnly={
                                                    !!customerForm.data.id
                                                }
                                            />
                                        </div>
                                    </div>

                                    {/* Default Payment Account */}
                                    <div className="form-control">
                                        <label className="label py-0 mb-2">
                                            <span className="label-text font-bold text-gray-700 text-sm">
                                                {t(
                                                    "customer.default_payment_account",
                                                    "Default Payment Account",
                                                )}
                                            </span>
                                        </label>
                                        <div className="relative">
                                            <Landmark
                                                size={16}
                                                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                                            />
                                            <select
                                                value={
                                                    customerForm.data.account_id
                                                }
                                                onChange={(e) =>
                                                    customerForm.setData(
                                                        "account_id",
                                                        e.target.value,
                                                    )
                                                }
                                                className="select select-bordered w-full pl-4 py-3 border-gray-300 focus:border-gray-900 focus:ring-1 focus:ring-gray-900"
                                            >
                                                <option value="">
                                                    {t(
                                                        "customer.select_default_account",
                                                        "Select default account (optional)",
                                                    )}
                                                </option>
                                                {accounts.map((account) => (
                                                    <option
                                                        key={account.id}
                                                        value={account.id}
                                                    >
                                                        {account.name} - ৳
                                                        {formatCurrency(
                                                            account.current_balance,
                                                        )}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        {customerForm.errors.account_id && (
                                            <div className="text-red-600 text-xs mt-2 flex items-center gap-2 bg-red-50 p-2 rounded">
                                                <AlertCircle size={12} />
                                                {customerForm.errors.account_id}
                                            </div>
                                        )}
                                    </div>

                                    {/* Status */}
                                    <div className="form-control">
                                        <label className="label py-0 mb-2">
                                            <span className="label-text font-bold text-gray-700 text-sm">
                                                {t("customer.status", "Status")}
                                            </span>
                                        </label>
                                        <label className="flex items-center justify-between p-3 border border-gray-300 rounded-lg hover:border-gray-900 cursor-pointer">
                                            <div className="flex items-center gap-3">
                                                <div
                                                    className={`p-1 rounded ${customerForm.data.is_active ? "bg-green-100" : "bg-red-100"}`}
                                                >
                                                    {customerForm.data
                                                        .is_active ? (
                                                        <CheckCircle
                                                            size={14}
                                                            className="text-green-600"
                                                        />
                                                    ) : (
                                                        <X
                                                            size={14}
                                                            className="text-red-600"
                                                        />
                                                    )}
                                                </div>
                                                <span className="font-bold">
                                                    {customerForm.data.is_active
                                                        ? t(
                                                              "customer.active_customer",
                                                              "Active Customer",
                                                          )
                                                        : t(
                                                              "customer.inactive_customer",
                                                              "Inactive Customer",
                                                          )}
                                                </span>
                                            </div>
                                            <input
                                                type="checkbox"
                                                checked={
                                                    customerForm.data.is_active
                                                }
                                                onChange={(e) =>
                                                    customerForm.setData(
                                                        "is_active",
                                                        e.target.checked,
                                                    )
                                                }
                                                className="toggle toggle-primary"
                                            />
                                        </label>
                                    </div>
                                </div>
                            </div>

                            {/* Address Section */}
                            <div className="mb-8">
                                <div className="form-control">
                                    <label className="label py-0 mb-2">
                                        <span className="label-text font-bold text-gray-700 text-sm">
                                            {t("customer.address", "Address")}
                                        </span>
                                    </label>
                                    <div className="relative">
                                        <textarea
                                            value={customerForm.data.address}
                                            onChange={(e) =>
                                                customerForm.setData(
                                                    "address",
                                                    e.target.value,
                                                )
                                            }
                                            className="textarea textarea-bordered w-full pl-4 py-3 border-gray-300 focus:border-gray-900 focus:ring-1 focus:ring-gray-900 min-h-[80px]"
                                            rows="3"
                                            placeholder={t(
                                                "customer.enter_full_address",
                                                "Enter full address (optional)",
                                            )}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Selected Account Preview (if any) */}
                            {customerForm.data.account_id &&
                                getCustomerAccount(
                                    customerForm.data.account_id,
                                ) && (
                                    <div className="mb-8">
                                        <div className="flex items-center gap-2 mb-4">
                                            <div className="p-1.5 bg-blue-100 rounded">
                                                <Landmark
                                                    size={14}
                                                    className="text-blue-600"
                                                />
                                            </div>
                                            <h3 className="font-bold text-gray-900">
                                                {t(
                                                    "customer.selected_account",
                                                    "Selected Account",
                                                )}
                                            </h3>
                                            <div className="flex-1 h-px bg-gray-200"></div>
                                        </div>

                                        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-xl border border-blue-200 shadow-sm">
                                            <div className="flex items-center justify-between mb-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 bg-white rounded-lg border border-blue-200">
                                                        {getAccountIcon(
                                                            getCustomerAccount(
                                                                customerForm
                                                                    .data
                                                                    .account_id,
                                                            ).type,
                                                        )}
                                                    </div>
                                                    <div>
                                                        <h5 className="font-bold text-gray-900">
                                                            {
                                                                getCustomerAccount(
                                                                    customerForm
                                                                        .data
                                                                        .account_id,
                                                                ).name
                                                            }
                                                        </h5>
                                                        <p className="text-xs text-gray-600">
                                                            {t(
                                                                "customer.default_payment_account",
                                                                "Default payment account",
                                                            )}
                                                        </p>
                                                    </div>
                                                </div>
                                                <span
                                                    className={`text-xs font-bold px-3 py-1.5 rounded-full ${getCustomerAccount(customerForm.data.account_id).type === "cash" ? "bg-green-100 text-green-800" : getCustomerAccount(customerForm.data.account_id).type === "bank" ? "bg-blue-100 text-blue-800" : "bg-purple-100 text-purple-800"}`}
                                                >
                                                    {getCustomerAccount(
                                                        customerForm.data
                                                            .account_id,
                                                    ).type || "Bank"}
                                                </span>
                                            </div>

                                            <div className="mt-4 pt-4 border-t border-blue-200">
                                                <div className="flex items-center justify-between">
                                                    <div className="text-sm text-gray-700 font-medium">
                                                        {t(
                                                            "customer.current_balance",
                                                            "Current Balance",
                                                        )}
                                                        :
                                                    </div>
                                                    <div className="font-mono font-bold text-xl text-green-700">
                                                        ৳
                                                        {formatCurrency(
                                                            getCustomerAccount(
                                                                customerForm
                                                                    .data
                                                                    .account_id,
                                                            ).current_balance ||
                                                                0,
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                            {/* Action Buttons */}
                            <div className="sticky bottom-0 bg-white border-t border-gray-200 -mx-6 px-6 py-4 mt-8">
                                <div className="flex gap-3">
                                    <button
                                        type="button"
                                        onClick={modelClose}
                                        className="btn btn-ghost flex-1 hover:bg-gray-100"
                                    >
                                        {t("customer.cancel", "Cancel")}
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={customerForm.processing}
                                        className="btn bg-[#1e4d2b] text-white flex-1 hover:bg-gray-800"
                                    >
                                        {customerForm.processing ? (
                                            <>
                                                <span className="loading loading-spinner loading-sm"></span>
                                                {t(
                                                    "customer.processing",
                                                    "Processing...",
                                                )}
                                            </>
                                        ) : customerForm.data.id ? (
                                            <>
                                                <CheckCircle size={18} />
                                                {t(
                                                    "customer.update_customer",
                                                    "Update Customer",
                                                )}
                                            </>
                                        ) : (
                                            <>
                                                <Plus size={18} />
                                                {t(
                                                    "customer.create_customer",
                                                    "Create Customer",
                                                )}
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            </dialog>
        </div>
    );
}