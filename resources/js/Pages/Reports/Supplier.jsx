import { Link, router, useForm, usePage } from "@inertiajs/react";
import axios from "axios";
import {
    AlertCircle,
    AlertTriangle,
    Calendar,
    CheckCircle,
    ChevronRight,
    CreditCard,
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
    Users,
    Wallet,
    X,
    Filter,
    Building,
    Download,
    ChevronDown,
    ChevronUp,
} from "lucide-react";
import { useState } from "react";
import PageHeader from "../../components/PageHeader";
import Pagination from "../../components/Pagination";
import { useTranslation } from "../../hooks/useTranslation";
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { toast } from "react-toastify";

export default function Suppliers({ suppliers, filters, accounts }) {
    const { auth } = usePage().props;
    const { t, locale } = useTranslation();
    const [model, setModel] = useState(false);
    const [advanceModel, setAdvanceModel] = useState(false);
    const [clearDueModel, setClearDueModel] = useState(false);
    const [selectedSupplier, setSelectedSupplier] = useState(null);
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
        type: "supplier",
        txn_ref: `SDA-${Math.random().toString(36).substr(2, 10).toUpperCase()}`,
        notes: "Clearing due payment",
        payment_date: new Date().toISOString().split("T")[0],
    });

    const [processingPayment, setProcessingPayment] = useState(false);
    const [processingClearDue, setProcessingClearDue] = useState(false);
    const [paymentErrors, setPaymentErrors] = useState({});
    const [clearDueErrors, setClearDueErrors] = useState({});

    // Model close handle
    const modelClose = () => {
        supplierForm.reset();
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
        setSelectedSupplier(null);
        setPaymentErrors({});
        setAdvanceModel(false);
    };

    // Clear Due model close handle
    const clearDueModelClose = () => {
        setClearDueData({
            paid_amount: "",
            payment_type: "account_adjustment",
            account_id: "",
            type: "supplier",
            txn_ref: `SDA-${Math.random().toString(36).substr(2, 10).toUpperCase()}`,
            notes: "Clearing due payment",
            payment_date: new Date().toISOString().split("T")[0],
        });
        setSelectedSupplier(null);
        setClearDueErrors({});
        setClearDueModel(false);
    };

    // Handle search
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
            route("reports.supplier"),
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
        router.get(route("reports.supplier"), {}, { replace: true });
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

    // Check if any filter is active
    const hasActiveFilters = () => {
        return localFilters.search || localFilters.status || localFilters.date_from || localFilters.date_to;
    };

    // Handle supplier form submission
    const supplierForm = useForm({
        id: "",
        name: "",
        phone: "",
        company: "",
        address: "",
        email: "",
        advance_amount: 0,
        account_id: "",
        due_amount: 0,
        is_active: true,
        type: true,
    });

    const handleAdvancePayment = (supplier) => {
        setSelectedSupplier(supplier);
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

    const handleClearDue = (supplier) => {
        setSelectedSupplier(supplier);

        // Calculate total due amount
        const dueAmount = calculateDueAmount(supplier.purchases);

        // Set initial values
        setClearDueData({
            paid_amount: dueAmount,
            payment_type: "account_adjustment",
            account_id: "",
            type: "supplier",
            txn_ref: `SDA-${Math.random().toString(36).substr(2, 10).toUpperCase()}`,
            notes: `Clearing due payment for ${supplier.name}`,
            payment_date: new Date().toISOString().split("T")[0],
        });

        setClearDueErrors({});
        setClearDueModel(true);
    };

    const handleAdvanceSubmit = async (e) => {
        e.preventDefault();

        if (!selectedSupplier) return;

        // Validation
        const errors = {};
        const amount = parseFloat(paymentData.amount) || 0;

        if (amount <= 0) {
            errors.amount = t(
                "supplier.advance_amount_error",
                "Advance amount must be greater than 0",
            );
        }

        if (!paymentData.account_id) {
            errors.account_id = t(
                "supplier.select_account_error",
                "Please select an account",
            );
        }

        if (Object.keys(errors).length > 0) {
            setPaymentErrors(errors);
            return;
        }

        setProcessingPayment(true);

        router.post(
            route("advancePayment.store", { id: selectedSupplier.id }),
            {
                supplier_id: selectedSupplier.id,
                amount: paymentData.amount,
                payment_type: paymentData.payment_type,
                type: "supplier",
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

    const handleSupplierCreateForm = (e) => {
        e.preventDefault();

        if (supplierForm.data.id) {
            supplierForm.put(route("supplier.update", supplierForm.data.id), {
                onSuccess: () => {
                    supplierForm.reset();
                    setModel(false);
                },
                onError: (errors) => {
                    console.log(errors);
                },
            });
        } else {
            supplierForm.post(route("supplier.store"), {
                onSuccess: () => {
                    supplierForm.reset();
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
        if (selectedSupplier) {
            const dueAmount = calculateDueAmount(selectedSupplier.purchases) || 0;
            setPaymentData((prev) => ({
                ...prev,
                amount: Math.max(0, dueAmount),
            }));
        }
    };

    // Handle supplier edit
    const handleSupplierEdit = (id) => {
        setEditProcessing(true);
        axios
            .get(route("supplier.edit", { id: id }))
            .then((res) => {
                const data = res.data.data;
                supplierForm.setData({
                    id: data.id,
                    name: data.name,
                    phone: data.phone,
                    address: data.address || "",
                    email: data.email || "",
                    company: data.company || "",
                    advance_amount: parseFloat(data.advance_amount) || 0,
                    account_id: data.account_id || "",
                    due_amount: parseFloat(data.due_amount) || 0,
                    is_active: Boolean(data.is_active),
                    type: data.type || true,
                });
                setModel(true);
            })
            .catch((error) => {
                console.error("Error fetching supplier:", error);
            })
            .finally(() => {
                setEditProcessing(false);
            });
    };

    // Calculate due amount from purchases
    const calculateDueAmount = (purchases) => {
        if (!purchases || purchases.length === 0) return 0;
        return purchases.reduce((total, purchase) => {
            const due = (parseFloat(purchase.grand_total) || 0) - (parseFloat(purchase.paid_amount) || 0);
            return total + (due > 0 ? due : 0);
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
        if (selectedSupplier) {
            const dueAmount = calculateDueAmount(selectedSupplier.purchases) || 0;
            const amount = Math.round(dueAmount * percentage) / 100;
            setPaymentData((prev) => ({
                ...prev,
                amount: Math.max(0, amount),
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

    // Get supplier's default account details
    const getSupplierAccount = (accountId) => {
        if (!accountId) return null;
        return accounts.find(
            (account) => account.id.toString() === accountId.toString(),
        );
    };

    // Get payment method options for clear due
    const getPaymentMethodOptions = (supplier) => {
        const options = [
            {
                value: "account_adjustment",
                label: t("supplier.account_adjustment", "Account Adjustment"),
                icon: <Landmark size={16} />,
            },
        ];

        return options;
    };

    // Fetch all suppliers for export
    const fetchAllSuppliersForExport = async () => {
        try {
            const response = await axios.get(route('reports.supplier.export'), {
                params: {
                    search: localFilters.search,
                    status: localFilters.status,
                    date_from: localFilters.date_from,
                    date_to: localFilters.date_to
                }
            });
            return response.data.suppliers;
        } catch (error) {
            console.error('Error fetching all suppliers:', error);
            toast.error('Failed to fetch all suppliers data');
            throw error;
        }
    };

    // Prepare data for export
    const prepareExportData = (suppliersData) => {
        return suppliersData.map(supplier => {
            const dueAmount = calculateDueAmount(supplier.purchases);
            
            return {
                'Name': supplier.name,
                'Phone': supplier.phone || 'N/A',
                'Company': supplier.company || 'N/A',
                'Email': supplier.email || 'N/A',
                'Address': supplier.address || 'N/A',
                'Advance (Tk)': formatCurrency(supplier.advance_amount || 0),
                'Due (Tk)': formatCurrency(dueAmount),
                'Status': supplier.is_active ? 'Active' : 'Inactive',
                'Type': supplier.type ? 'Global' : 'Local',
                'Default Account': supplier.account_id ? 
                    accounts.find(a => a.id === supplier.account_id)?.name || 'N/A' : 'N/A',
                'Purchases Count': supplier.purchases?.length || 0,
                'Created At': new Date(supplier.created_at).toLocaleDateString()
            };
        });
    };

    // Download as CSV
    const downloadCSV = async () => {
        try {
            setIsDownloading(true);
            
            // Fetch all suppliers
            const allSuppliers = await fetchAllSuppliersForExport();
            
            if (allSuppliers.length === 0) {
                toast.warning('No data to export');
                return;
            }

            const exportData = prepareExportData(allSuppliers);

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
            const totalAdvance = allSuppliers.reduce((sum, s) => sum + parseFloat(s.advance_amount || 0), 0);
            const totalDue = allSuppliers.reduce((sum, s) => sum + calculateDueAmount(s.purchases), 0);
            
            csvRows.push(`Total Suppliers,${allSuppliers.length}`);
            csvRows.push(`Active Suppliers,${allSuppliers.filter(s => s.is_active).length}`);
            csvRows.push(`Total Advance (Tk),${totalAdvance.toFixed(2)}`);
            csvRows.push(`Total Due (Tk),${totalDue.toFixed(2)}`);

            const csvString = csvRows.join('\n');
            
            const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.href = url;
            link.download = `suppliers_report_${formatDateForFilename()}.csv`;
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
            
            // Fetch all suppliers
            const allSuppliers = await fetchAllSuppliersForExport();
            
            if (allSuppliers.length === 0) {
                toast.warning('No data to export');
                return;
            }

            const exportData = prepareExportData(allSuppliers);

            const wb = XLSX.utils.book_new();
            const ws = XLSX.utils.json_to_sheet(exportData);

            const filterData = [
                { 'Filter': 'Search', 'Value': localFilters.search || 'None' },
                { 'Filter': 'Status', 'Value': localFilters.status || 'All' },
                { 'Filter': 'Date From', 'Value': localFilters.date_from || 'None' },
                { 'Filter': 'Date To', 'Value': localFilters.date_to || 'None' }
            ];
            const wsFilters = XLSX.utils.json_to_sheet(filterData);

            const totalAdvance = allSuppliers.reduce((sum, s) => sum + parseFloat(s.advance_amount || 0), 0);
            const totalDue = allSuppliers.reduce((sum, s) => sum + calculateDueAmount(s.purchases), 0);
            
            const summaryData = [
                { 'Metric': 'Total Suppliers', 'Value': allSuppliers.length },
                { 'Metric': 'Active Suppliers', 'Value': allSuppliers.filter(s => s.is_active).length },
                { 'Metric': 'Total Advance (Tk)', 'Value': totalAdvance.toFixed(2) },
                { 'Metric': 'Total Due (Tk)', 'Value': totalDue.toFixed(2) }
            ];
            const wsSummary = XLSX.utils.json_to_sheet(summaryData);

            XLSX.utils.book_append_sheet(wb, ws, 'Suppliers');
            XLSX.utils.book_append_sheet(wb, wsFilters, 'Filters Applied');
            XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');

            XLSX.writeFile(wb, `suppliers_report_${formatDateForFilename()}.xlsx`);
            
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
            
            // Fetch all suppliers
            const allSuppliers = await fetchAllSuppliersForExport();
            
            if (allSuppliers.length === 0) {
                toast.warning('No data to export');
                return;
            }

            const exportData = prepareExportData(allSuppliers);

            const doc = new jsPDF({
                orientation: 'landscape',
                unit: 'mm',
                format: 'a4'
            });

            doc.setFontSize(16);
            doc.setTextColor(30, 77, 43);
            doc.text('Suppliers Report', 14, 15);
            
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
                'Type'
            ];

            const tableRows = exportData.map(item => [
                item['Name'].substring(0, 15) + (item['Name'].length > 15 ? '...' : ''),
                item['Phone'],
                item['Advance (Tk)'],
                item['Due (Tk)'],
                item['Status'],
                item['Type']
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

            const totalAdvance = allSuppliers.reduce((sum, s) => sum + parseFloat(s.advance_amount || 0), 0);
            const totalDue = allSuppliers.reduce((sum, s) => sum + calculateDueAmount(s.purchases), 0);
            
            const finalY = doc.lastAutoTable.finalY + 10;
            
            doc.setFontSize(12);
            doc.setTextColor(30, 77, 43);
            doc.text('Summary Statistics', 14, finalY);
            
            doc.setFontSize(10);
            doc.setTextColor(0, 0, 0);
            doc.text(`Total Suppliers: ${allSuppliers.length}`, 14, finalY + 7);
            doc.text(`Active Suppliers: ${allSuppliers.filter(s => s.is_active).length}`, 14, finalY + 14);
            doc.text(`Total Advance: ${totalAdvance.toFixed(2)} Tk`, 14, finalY + 21);
            doc.text(`Total Due: ${totalDue.toFixed(2)} Tk`, 14, finalY + 28);

            doc.save(`suppliers_report_${formatDateForFilename()}.pdf`);
            
            toast.success('PDF downloaded successfully');
        } catch (error) {
            console.error('Error downloading PDF:', error);
            toast.error('Failed to download PDF');
        } finally {
            setIsDownloading(false);
        }
    };

    // Stats calculation
    const totalAdvance = suppliers.data.reduce((sum, s) => sum + parseFloat(s.advance_amount || 0), 0);
    const totalDue = suppliers.data.reduce((sum, s) => sum + calculateDueAmount(s.purchases), 0);
    const activeSuppliers = suppliers.data.filter(s => s.is_active).length;

    return (
        <div
            className={`bg-white rounded-box p-3 md:p-4 ${locale === "bn" ? "bangla-font" : ""}`}
        >
            {/* Clear Due Modal */}
            {clearDueModel && selectedSupplier && (
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
                                                "supplier.clear_due_payment",
                                                "Clear Due Payment",
                                            )}
                                        </h3>
                                        <p className="text-sm text-gray-600">
                                            {t(
                                                "supplier.clear_due_desc",
                                                "Clear outstanding dues to supplier",
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
                            {/* Supplier Due Summary */}
                            <div className="mb-6 p-4 bg-white rounded-xl border border-red-200 shadow-sm">
                                <div className="flex items-start justify-between mb-4">
                                    <div>
                                        <h4 className="font-bold text-gray-900 text-lg">
                                            {selectedSupplier.name}
                                        </h4>
                                        <div className="flex items-center gap-2 mt-1">
                                            <Phone
                                                size={14}
                                                className="text-gray-500"
                                            />
                                            <p className="text-sm text-gray-600">
                                                {selectedSupplier.phone}
                                            </p>
                                        </div>
                                    </div>
                                    <div
                                        className={`px-3 py-1 rounded-full ${selectedSupplier.is_active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"} text-xs font-bold flex items-center gap-1`}
                                    >
                                        {selectedSupplier.is_active ? (
                                            <CheckCircle size={12} />
                                        ) : (
                                            <X size={12} />
                                        )}
                                        {selectedSupplier.is_active
                                            ? t("supplier.active", "Active")
                                            : t(
                                                  "supplier.inactive",
                                                  "Inactive",
                                              )}
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="text-center p-3 bg-gradient-to-br from-green-50 to-green-100 rounded-lg border border-green-200">
                                        <div className="text-xs text-green-700 uppercase font-bold tracking-wider mb-1">
                                            {t(
                                                "supplier.current_advance",
                                                "Current Advance",
                                            )}
                                        </div>
                                        <div className="text-xl font-black text-green-800">
                                            ৳
                                            {formatCurrency(
                                                selectedSupplier.advance_amount ||
                                                    0,
                                            )}
                                        </div>
                                    </div>
                                    <div className="text-center p-3 bg-gradient-to-br from-red-50 to-red-100 rounded-lg border border-red-200">
                                        <div className="text-xs text-red-700 uppercase font-bold tracking-wider mb-1">
                                            {t(
                                                "supplier.total_due",
                                                "Total Due",
                                            )}
                                        </div>
                                        <div className="text-xl font-black text-red-800">
                                            ৳
                                            {formatCurrency(
                                                calculateDueAmount(
                                                    selectedSupplier.purchases,
                                                ) || 0,
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Due Purchases Info */}
                                {selectedSupplier.purchases &&
                                    selectedSupplier.purchases.filter(
                                        (p) => {
                                            const due = (parseFloat(p.grand_total) || 0) - (parseFloat(p.paid_amount) || 0);
                                            return due > 0;
                                        }
                                    ).length > 0 && (
                                        <div className="mt-4 pt-4 border-t border-gray-200">
                                            <div className="flex items-center gap-2 mb-2">
                                                <AlertTriangle
                                                    size={14}
                                                    className="text-orange-600"
                                                />
                                                <span className="text-sm font-bold text-gray-700">
                                                    {t(
                                                        "supplier.due_purchases",
                                                        "Due Purchases",
                                                    )}
                                                    :
                                                </span>
                                            </div>
                                            <div className="text-xs text-gray-600 space-y-1">
                                                {selectedSupplier.purchases
                                                    .filter((p) => {
                                                        const due = (parseFloat(p.grand_total) || 0) - (parseFloat(p.paid_amount) || 0);
                                                        return due > 0;
                                                    })
                                                    .slice(0, 3)
                                                    .map((purchase, idx) => {
                                                        const due = (parseFloat(purchase.grand_total) || 0) - (parseFloat(purchase.paid_amount) || 0);
                                                        return (
                                                            <div
                                                                key={idx}
                                                                className="flex justify-between"
                                                            >
                                                                <span>
                                                                    Purchase #
                                                                    {
                                                                        purchase.invoice_no
                                                                    }
                                                                </span>
                                                                <span className="font-mono">
                                                                    ৳
                                                                    {formatCurrency(
                                                                        due,
                                                                    )}
                                                                </span>
                                                            </div>
                                                        );
                                                    })}
                                                {selectedSupplier.purchases.filter((p) => {
                                                    const due = (parseFloat(p.grand_total) || 0) - (parseFloat(p.paid_amount) || 0);
                                                    return due > 0;
                                                }).length > 3 && (
                                                    <div className="text-center text-gray-500 italic">
                                                        +
                                                        {selectedSupplier.purchases.filter((p) => {
                                                            const due = (parseFloat(p.grand_total) || 0) - (parseFloat(p.paid_amount) || 0);
                                                            return due > 0;
                                                        }).length - 3}{" "}
                                                        more purchases
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                            </div>

                        
                        </div>
                    </div>
                </div>
            )}

            {/* Advance Payment Modal */}
            {advanceModel && selectedSupplier && (
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
                                                "supplier.add_advance_payment",
                                                "Add Advance Payment",
                                            )}
                                        </h3>
                                        <p className="text-sm text-gray-600">
                                            {t(
                                                "supplier.advance_payment_desc",
                                                "Record advance payment to supplier",
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
                            {/* Supplier Info Card */}
                            <div className="mb-6 p-4 bg-white rounded-xl border border-gray-200 shadow-sm">
                                <div className="flex items-start justify-between mb-4">
                                    <div>
                                        <h4 className="font-bold text-gray-900 text-lg">
                                            {selectedSupplier.name}
                                        </h4>
                                        <div className="flex items-center gap-2 mt-1">
                                            <Phone
                                                size={14}
                                                className="text-gray-500"
                                            />
                                            <p className="text-sm text-gray-600">
                                                {selectedSupplier.phone}
                                            </p>
                                        </div>
                                    </div>
                                    <div
                                        className={`px-3 py-1 rounded-full ${selectedSupplier.is_active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"} text-xs font-bold flex items-center gap-1`}
                                    >
                                        {selectedSupplier.is_active ? (
                                            <CheckCircle size={12} />
                                        ) : (
                                            <X size={12} />
                                        )}
                                        {selectedSupplier.is_active
                                            ? t("supplier.active", "Active")
                                            : t(
                                                  "supplier.inactive",
                                                  "Inactive",
                                              )}
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="text-center p-3 bg-gradient-to-br from-green-50 to-green-100 rounded-lg border border-green-200">
                                        <div className="text-xs text-green-700 uppercase font-bold tracking-wider mb-1">
                                            {t(
                                                "supplier.current_advance",
                                                "Current Advance",
                                            )}
                                        </div>
                                        <div className="text-xl font-black text-green-800">
                                            ৳
                                            {formatCurrency(
                                                selectedSupplier.advance_amount ||
                                                    0,
                                            )}
                                        </div>
                                    </div>
                                    <div className="text-center p-3 bg-gradient-to-br from-red-50 to-red-100 rounded-lg border border-red-200">
                                        <div className="text-xs text-red-700 uppercase font-bold tracking-wider mb-1">
                                            {t(
                                                "supplier.total_due",
                                                "Total Due",
                                            )}
                                        </div>
                                        <div className="text-xl font-black text-red-800">
                                            ৳
                                            {formatCurrency(
                                                calculateDueAmount(
                                                    selectedSupplier.purchases,
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
                                                {t("supplier.amount", "Amount")}{" "}
                                                *
                                            </label>
                                            <div className="flex gap-2">
                                                <button
                                                    type="button"
                                                    onClick={handleFullPayment}
                                                    className="btn btn-xs btn-primary bg-gray-900 border-gray-900 hover:bg-black hover:border-black"
                                                    disabled={processingPayment}
                                                >
                                                    {t("supplier.full", "Full")}
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
                                                "supplier.payment_account",
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
                                                        "supplier.select_account",
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
                                                                "supplier.account_details",
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
                                                              `supplier.${selectedAccount.type}`,
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
                                                            "supplier.account_number",
                                                            "Account Number",
                                                        )}
                                                    </div>
                                                    <div className="font-mono text-sm font-bold text-gray-800">
                                                        {selectedAccount.account_number ||
                                                            t(
                                                                "supplier.na",
                                                                "N/A",
                                                            )}
                                                    </div>
                                                </div>
                                                <div className="bg-white p-3 rounded-lg border border-blue-100">
                                                    <div className="text-xs text-gray-500 mb-1">
                                                        {t(
                                                            "supplier.bank_name",
                                                            "Bank Name",
                                                        )}
                                                    </div>
                                                    <div className="font-bold text-sm text-gray-800">
                                                        {selectedAccount.bank_name ??
                                                            selectedAccount.mobile_provider ??
                                                            t(
                                                                "supplier.cash",
                                                                "Cash",
                                                            )}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="mt-4 pt-4 border-t border-blue-200">
                                                <div className="flex items-center justify-between">
                                                    <div className="text-sm text-gray-700 font-medium">
                                                        {t(
                                                            "supplier.current_balance",
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
                                                    "supplier.payment_date",
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
                                                {t("supplier.notes", "Notes")} (
                                                {t(
                                                    "supplier.optional",
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
                                                    "supplier.payment_reference",
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
                                                    "supplier.payment_summary",
                                                    "Payment Summary",
                                                )}
                                            </h6>
                                        </div>

                                        <div className="space-y-3">
                                            <div className="flex justify-between items-center pb-3 border-b border-amber-200">
                                                <div className="text-sm text-gray-600">
                                                    {t(
                                                        "supplier.amount_to_pay",
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
                                                        "supplier.payment_account",
                                                        "Payment Account",
                                                    )}
                                                </div>
                                                <div className="font-bold text-gray-900">
                                                    {selectedAccount
                                                        ? selectedAccount.name
                                                        : t(
                                                              "supplier.not_selected",
                                                              "Not selected",
                                                          )}
                                                </div>
                                            </div>

                                            <div className="flex justify-between items-center">
                                                <div className="text-sm text-gray-600">
                                                    {t(
                                                        "supplier.payment_date",
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
                                                                    "supplier.current_balance",
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
                                                                    "supplier.balance_after_payment",
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
                                                            "supplier.payment_error",
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
                                        {t("supplier.cancel", "Cancel")}
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
                                                    "supplier.processing",
                                                    "Processing...",
                                                )}
                                            </>
                                        ) : (
                                            <>
                                                <CheckCircle size={18} />
                                                {t(
                                                    "supplier.submit_payment",
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
                title={t("supplier.supplier_report_title", "Supplier Management")}
                subtitle={t(
                    "supplier.supplier_report_subtitle",
                    "Manage your all suppliers from here.",
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
                        <Filter size={18} className="text-gray-900" />
                        <h3 className="text-lg font-semibold text-neutral">Filters</h3>
                        {hasActiveFilters() && (
                            <span className="badge badge-sm bg-gray-900 text-white ml-2">Active</span>
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
                            className="btn bg-gray-900 text-white btn-sm"
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
                                        placeholder={t("supplier.search_placeholder", "Search suppliers...")}
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
                                    <option value="">All Status</option>
                                    <option value="active">Active</option>
                                    <option value="inactive">Inactive</option>
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
                        {hasActiveFilters() && (
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
                        disabled={isDownloading || suppliers.data.length === 0}
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

            {/* Suppliers Table - Responsive */}
            <div className="print:hidden">
                <div className="overflow-x-auto -mx-2">
                    {suppliers.data.length > 0 ? (
                        <>
                            {/* Desktop/Tablet Table */}
                            <div className="hidden md:block">
                                <table className="table table-auto w-full text-sm">
                                    <thead className="bg-gray-900 text-white uppercase text-[10px] tracking-widest">
                                        <tr>
                                            <th className="py-2 px-3">#</th>
                                            <th className="py-2 px-3">{t("supplier.contact_info", "Contact Info")}</th>
                                            <th className="py-2 px-3">{t("supplier.address", "Address")}</th>
                                            <th className="py-2 px-3">{t("supplier.financial_status", "Financial Status")}</th>
                                        </tr>
                                    </thead>
                                    <tbody className="font-bold text-sm text-gray-700">
                                        {suppliers.data.map((supplier, index) => {
                                            const dueAmount = calculateDueAmount(supplier.purchases);
                                            const hasDue = dueAmount > 0;
                                            const supplierAccount = getSupplierAccount(supplier.account_id);

                                            return (
                                                <tr key={supplier.id} className="hover:bg-gray-50 border-b">
                                                    <td className="py-2 px-3 text-gray-400 font-mono text-xs">
                                                        {index + 1}
                                                    </td>
                                                    <td className="py-2 px-3">
                                                        <div className="max-w-[120px]">
                                                            <p className="font-bold text-gray-900 uppercase text-xs">
                                                                {supplier.name}
                                                            </p>
                                                            <span className="text-[10px] flex items-center gap-1 text-gray-400 font-bold uppercase tracking-wider">
                                                                <Phone size={10} /> {supplier.phone}
                                                            </span>
                                                            {supplier.company && (
                                                                <span className="text-[10px] flex items-center gap-1 text-gray-600 font-bold uppercase tracking-wider mt-1">
                                                                    <Building size={10} /> {supplier.company}
                                                                </span>
                                                            )}
                                                            {supplierAccount && (
                                                                <span className="text-[10px] flex items-center gap-1 text-blue-500 font-bold uppercase tracking-wider mt-1">
                                                                    {getAccountIcon(supplierAccount.type)}
                                                                    <span>{supplierAccount.name}</span>
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="py-2 px-3">
                                                        <div className="max-w-[120px]">
                                                            {supplier.address ? (
                                                                <div className="flex items-center gap-2 text-gray-900 uppercase text-xs">
                                                                    <MapPin size={12} className="text-blue-600" />
                                                                    <span className="line-clamp-2">
                                                                        {supplier.address.substring(0, 30)}...
                                                                    </span>
                                                                </div>
                                                            ) : (
                                                                <div className="flex items-center gap-2 text-gray-400 uppercase text-[10px] font-bold">
                                                                    <span className="text-gray-400">📍</span>
                                                                    {t("supplier.no_address", "No address")}
                                                                </div>
                                                            )}
                                                            <div className="mt-1">
                                                                <span className={`badge border-none font-bold text-[9px] uppercase py-1 px-2 ${supplier.is_active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
                                                                    {supplier.is_active
                                                                        ? t("supplier.active", "Active")
                                                                        : t("supplier.inactive", "Inactive")}
                                                                </span>
                                                                <span className={`badge border-none ml-1 font-bold text-[9px] uppercase py-1 px-2 ${supplier.type == 'global' ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
                                                                    {supplier.type || 'local'}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="py-2 px-3">
                                                        <div className="flex flex-col gap-1">
                                                            <div className="flex items-center justify-between">
                                                                <span className="text-xs text-gray-600">
                                                                    {t("supplier.advance", "Advance")}:
                                                                </span>
                                                                <span className="font-mono text-xs font-bold text-green-600">
                                                                    ৳{formatCurrency(supplier.advance_amount || 0)}
                                                                </span>
                                                            </div>
                                                            <div className="flex items-center justify-between">
                                                                <span className="text-xs text-gray-600">
                                                                    {t("supplier.due", "Due")}:
                                                                </span>
                                                                <span className={`font-mono text-xs font-bold ${hasDue ? "text-red-600" : "text-gray-500"}`}>
                                                                    ৳{formatCurrency(dueAmount)}
                                                                </span>
                                                            </div>
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
                                {suppliers.data.map((supplier, index) => {
                                    const dueAmount = calculateDueAmount(supplier.purchases);
                                    const hasDue = dueAmount > 0;
                                    const supplierAccount = getSupplierAccount(supplier.account_id);

                                    return (
                                        <div key={supplier.id} className="bg-white border rounded-lg p-3 shadow-sm">
                                            {/* Card Header */}
                                            <div className="flex justify-between items-start mb-2">
                                                <div className="flex-1">
                                                    <div className="flex items-start justify-between">
                                                        <div>
                                                            <h3 className="font-bold text-sm">{supplier.name}</h3>
                                                            <p className="text-xs text-gray-600">{supplier.phone}</p>
                                                            {supplier.company && (
                                                                <p className="text-xs text-gray-500">{supplier.company}</p>
                                                            )}
                                                        </div>
                                                        <div className="flex flex-col items-end gap-1">
                                                            <span className={`badge badge-xs ${supplier.is_active ? "badge-success" : "badge-error"}`}>
                                                                {supplier.is_active
                                                                    ? t("supplier.active", "Active")
                                                                    : t("supplier.inactive", "Inactive")}
                                                            </span>
                                                            <span className={`badge badge-xs ${supplier.type == 'global' ? "badge-success" : "badge-error"}`}>
                                                                {supplier.type || 'local'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Card Body */}
                                            <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                                                <div>
                                                    <span className="text-gray-500">Address:</span>
                                                    <p className="font-medium truncate">{supplier.address || t("supplier.no_address", "No address")}</p>
                                                </div>
                                                <div className="text-right">
                                                    <span className="text-gray-500">Advance:</span>
                                                    <p className="font-medium text-success">৳{formatCurrency(supplier.advance_amount || 0)}</p>
                                                </div>
                                                <div>
                                                    <span className="text-gray-500">Due:</span>
                                                    <p className={`font-bold ${hasDue ? 'text-error' : 'text-success'}`}>
                                                        ৳{formatCurrency(dueAmount)}
                                                    </p>
                                                </div>
                                                {supplierAccount && (
                                                    <div className="col-span-2">
                                                        <span className="text-gray-500">Account:</span>
                                                        <p className="font-medium text-blue-600">{supplierAccount.name}</p>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Card Footer - Actions */}
                                            <div className="flex justify-between items-center pt-2 border-t">
                                                <div className="flex items-center gap-1">
                                                    <button
                                                        onClick={() => handleAdvancePayment(supplier)}
                                                        className="btn btn-xs btn-success p-1"
                                                        title={t("supplier.add_advance", "Add Advance")}
                                                    >
                                                        <DollarSign size={12} />
                                                    </button>
                                                    {hasDue && (
                                                        <button
                                                            onClick={() => handleClearDue(supplier)}
                                                            className="btn btn-xs btn-warning p-1"
                                                            title={t("supplier.clear_due", "Clear Due")}
                                                        >
                                                            <Receipt size={12} />
                                                        </button>
                                                    )}
                                                </div>
                                                
                                                <div className="flex items-center gap-1">
                                                    {route().has('supplier.show') && (
                                                        <Link
                                                            href={route("supplier.show", { id: supplier.id })}
                                                            className="btn btn-ghost btn-square btn-xs p-1 hover:bg-blue-600 hover:text-white text-blue-600"
                                                            title={t("reports.supplier_details", "View Details")}
                                                        >
                                                            <Eye size={12} />
                                                        </Link>
                                                    )}

                                                    <button
                                                        disabled={editProcessing}
                                                        onClick={() => handleSupplierEdit(supplier.id)}
                                                        className="btn btn-ghost btn-square btn-xs p-1 hover:bg-amber-600 hover:text-white text-amber-600"
                                                        title={t("supplier.edit", "Edit")}
                                                    >
                                                        <Edit size={12} />
                                                    </button>
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
                                    ? t('supplier.no_suppliers_matching', 'No suppliers matching "{{search}}"', { search: localFilters.search })
                                    : t('supplier.no_suppliers_found', 'No suppliers found')}
                            </h1>
                        </div>
                    )}
                </div>

                {/* Pagination */}
                {suppliers.data.length > 0 && (
                    <div className="mt-4">
                        <Pagination data={suppliers} />
                    </div>
                )}
            </div>

            {/* Summary Stats - Responsive */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3 mt-4">
                <div className="bg-gray-900 text-white rounded-box p-3">
                    <p className="text-xs uppercase tracking-wider font-bold text-gray-300 mb-1">
                        {t("supplier.total_suppliers", "Total Suppliers")}
                    </p>
                    <div className="flex items-center justify-between">
                        <p className="text-lg md:text-xl font-black">{suppliers.total}</p>
                        <Users size={16} className="text-gray-400" />
                    </div>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-box p-3">
                    <p className="text-xs uppercase tracking-wider font-bold text-green-700 mb-1">
                        {t("supplier.active_suppliers", "Active Suppliers")}
                    </p>
                    <div className="flex items-center justify-between">
                        <p className="text-lg md:text-xl font-black text-green-700">
                            {activeSuppliers}
                        </p>
                        <CheckCircle size={16} className="text-green-500" />
                    </div>
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-box p-3">
                    <p className="text-xs uppercase tracking-wider font-bold text-amber-700 mb-1">
                        {t("supplier.total_advance", "Total Advance")}
                    </p>
                    <div className="flex items-center justify-between">
                        <p className="text-lg md:text-xl font-black text-amber-700">
                            ৳{formatCurrency(totalAdvance)}
                        </p>
                        <TrendingUp size={16} className="text-amber-500" />
                    </div>
                </div>
                <div className="bg-red-50 border border-red-200 rounded-box p-3">
                    <p className="text-xs uppercase tracking-wider font-bold text-red-700 mb-1">
                        {t("supplier.total_due", "Total Due")}
                    </p>
                    <div className="flex items-center justify-between">
                        <p className="text-lg md:text-xl font-black text-red-700">
                            ৳{formatCurrency(totalDue)}
                        </p>
                        <TrendingDown size={16} className="text-red-500" />
                    </div>
                </div>
            </div>

            {/* Add/Edit Supplier Modal */}
            <dialog
                className={`modal ${model ? "modal-open" : ""} items-start justify-center`}
            >
                <div className="modal-box w-full max-w-4xl p-0 overflow-hidden items-start justify-center">
                    {/* Modal Header */}
                    <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-6 py-4 w-full">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-gray-900 text-white rounded-lg">
                                    <Building size={20} className="text-white" />
                                </div>
                                <div>
                                    <h1 className="text-xl font-black text-gray-900">
                                        {supplierForm.data.id
                                            ? t(
                                                  "supplier.edit_supplier",
                                                  "Edit Supplier",
                                              )
                                            : t(
                                                  "supplier.new_supplier",
                                                  "New Supplier",
                                              )}
                                    </h1>
                                    <p className="text-sm text-gray-500">
                                        {supplierForm.data.id
                                            ? t(
                                                  "supplier.update_supplier_info",
                                                  "Update supplier information",
                                              )
                                            : t(
                                                  "supplier.add_new_supplier",
                                                  "Add a new supplier to your contacts",
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
                        <form onSubmit={handleSupplierCreateForm}>
                            {/* Basic Information Section */}
                            <div className="mb-8">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    {/* Supplier Name */}
                                    <div className="form-control">
                                        <label className="label py-0 mb-2">
                                            <span className="label-text font-bold text-gray-700 text-sm">
                                                {t(
                                                    "supplier.supplier_name",
                                                    "Supplier Name",
                                                )}{" "}
                                                <span className="text-red-500">
                                                    *
                                                </span>
                                            </span>
                                        </label>
                                        <div className="relative">
                                            <Building
                                                size={16}
                                                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                                            />
                                            <input
                                                type="text"
                                                value={supplierForm.data.name}
                                                onChange={(e) =>
                                                    supplierForm.setData(
                                                        "name",
                                                        e.target.value,
                                                    )
                                                }
                                                className="input input-bordered w-full pl-4 py-3 border-gray-300 focus:border-gray-900 focus:ring-1 focus:ring-gray-900"
                                                placeholder={t(
                                                    "supplier.enter_supplier_name",
                                                    "Enter supplier name",
                                                )}
                                                required
                                            />
                                        </div>
                                        {supplierForm.errors.name && (
                                            <div className="text-red-600 text-xs mt-2 flex items-center gap-2 bg-red-50 p-2 rounded">
                                                <AlertCircle size={12} />
                                                {supplierForm.errors.name}
                                            </div>
                                        )}
                                    </div>

                                    {/* Phone */}
                                    <div className="form-control">
                                        <label className="label py-0 mb-2">
                                            <span className="label-text font-bold text-gray-700 text-sm">
                                                {t("supplier.phone", "Phone")}{" "}
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
                                                value={supplierForm.data.phone}
                                                onChange={(e) =>
                                                    supplierForm.setData(
                                                        "phone",
                                                        e.target.value,
                                                    )
                                                }
                                                className="input input-bordered w-full pl-4 py-3 border-gray-300 focus:border-gray-900 focus:ring-1 focus:ring-gray-900"
                                                placeholder={t(
                                                    "supplier.enter_phone_number",
                                                    "Enter phone number",
                                                )}
                                                required
                                            />
                                        </div>
                                        {supplierForm.errors.phone && (
                                            <div className="text-red-600 text-xs mt-2 flex items-center gap-2 bg-red-50 p-2 rounded">
                                                <AlertCircle size={12} />
                                                {supplierForm.errors.phone}
                                            </div>
                                        )}
                                    </div>

                                    {/* Company Name */}
                                    <div className="form-control">
                                        <label className="label py-0 mb-2">
                                            <span className="label-text font-bold text-gray-700 text-sm">
                                                {t("supplier.company_name", "Company Name")}
                                            </span>
                                        </label>
                                        <input
                                            type="text"
                                            value={supplierForm.data.company}
                                            onChange={(e) =>
                                                supplierForm.setData(
                                                    "company",
                                                    e.target.value,
                                                )
                                            }
                                            className="input input-bordered w-full py-3 border-gray-300 focus:border-gray-900 focus:ring-1 focus:ring-gray-900"
                                            placeholder={t(
                                                "supplier.enter_company_name",
                                                "Enter company name (optional)",
                                            )}
                                        />
                                    </div>

                                    {/* Email */}
                                    <div className="form-control">
                                        <label className="label py-0 mb-2">
                                            <span className="label-text font-bold text-gray-700 text-sm">
                                                {t("supplier.email", "Email")}
                                            </span>
                                        </label>
                                        <div className="relative">
                                            <Mail
                                                size={16}
                                                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                                            />
                                            <input
                                                type="email"
                                                value={supplierForm.data.email}
                                                onChange={(e) =>
                                                    supplierForm.setData(
                                                        "email",
                                                        e.target.value,
                                                    )
                                                }
                                                className="input input-bordered w-full pl-4 py-3 border-gray-300 focus:border-gray-900 focus:ring-1 focus:ring-gray-900"
                                                placeholder={t(
                                                    "supplier.enter_email",
                                                    "Enter email (optional)",
                                                )}
                                            />
                                        </div>
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
                                                    "supplier.advance_amount",
                                                    "Advance Amount",
                                                )}
                                            </span>
                                            {supplierForm.data.id && (
                                                <span className="text-xs text-gray-500 ml-2">
                                                    {t(
                                                        "supplier.readonly_for_editing",
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
                                                step="0.01"
                                                min="0"
                                                value={
                                                    supplierForm.data
                                                        .advance_amount
                                                }
                                                onChange={(e) =>
                                                    supplierForm.setData(
                                                        "advance_amount",
                                                        parseFloat(
                                                            e.target.value,
                                                        ) || 0,
                                                    )
                                                }
                                                className={`input input-bordered w-full pl-4 py-3 ${supplierForm.data.id ? "bg-gray-100 cursor-not-allowed text-gray-500" : "border-gray-300 focus:border-gray-900 focus:ring-1 focus:ring-gray-900"}`}
                                                placeholder={t(
                                                    "supplier.enter_advance_amount",
                                                    "Enter advance amount",
                                                )}
                                                readOnly={
                                                    !!supplierForm.data.id
                                                }
                                            />
                                        </div>
                                    </div>
                                    <div className="form-control">
                                        <label className="label py-0 mb-2">
                                            <span className="label-text font-bold text-gray-700 text-sm">
                                                {t(
                                                    "supplier.due_amount",
                                                    "Due Amount",
                                                )}
                                            </span>
                                            {supplierForm.data.id && (
                                                <span className="text-xs text-gray-500 ml-2">
                                                    {t(
                                                        "supplier.readonly_for_editing",
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
                                                step="0.01"
                                                min="0"
                                                value={
                                                    supplierForm.data.due_amount
                                                }
                                                onChange={(e) =>
                                                    supplierForm.setData(
                                                        "due_amount",
                                                        parseFloat(
                                                            e.target.value,
                                                        ) || 0,
                                                    )
                                                }
                                                className={`input input-bordered w-full pl-4 py-3 ${supplierForm.data.id ? "bg-gray-100 cursor-not-allowed text-gray-500" : "border-gray-300 focus:border-gray-900 focus:ring-1 focus:ring-gray-900"}`}
                                                placeholder={t(
                                                    "supplier.enter_due_amount",
                                                    "Enter due amount",
                                                )}
                                                readOnly={
                                                    !!supplierForm.data.id
                                                }
                                            />
                                        </div>
                                    </div>

                                    {/* Default Payment Account */}
                                    <div className="form-control">
                                        <label className="label py-0 mb-2">
                                            <span className="label-text font-bold text-gray-700 text-sm">
                                                {t(
                                                    "supplier.default_payment_account",
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
                                                    supplierForm.data.account_id
                                                }
                                                onChange={(e) =>
                                                    supplierForm.setData(
                                                        "account_id",
                                                        e.target.value,
                                                    )
                                                }
                                                className="select select-bordered w-full pl-4 py-3 border-gray-300 focus:border-gray-900 focus:ring-1 focus:ring-gray-900"
                                            >
                                                <option value="">
                                                    {t(
                                                        "supplier.select_default_account",
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
                                        {supplierForm.errors.account_id && (
                                            <div className="text-red-600 text-xs mt-2 flex items-center gap-2 bg-red-50 p-2 rounded">
                                                <AlertCircle size={12} />
                                                {supplierForm.errors.account_id}
                                            </div>
                                        )}
                                    </div>

                                    {/* Status */}
                                    <div className="form-control">
                                        <label className="label py-0 mb-2">
                                            <span className="label-text font-bold text-gray-700 text-sm">
                                                {t("supplier.status", "Status")}
                                            </span>
                                        </label>
                                        <label className="flex items-center justify-between p-3 border border-gray-300 rounded-lg hover:border-gray-900 cursor-pointer">
                                            <div className="flex items-center gap-3">
                                                <div
                                                    className={`p-1 rounded ${supplierForm.data.is_active ? "bg-green-100" : "bg-red-100"}`}
                                                >
                                                    {supplierForm.data
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
                                                    {supplierForm.data.is_active
                                                        ? t(
                                                              "supplier.active_supplier",
                                                              "Active Supplier",
                                                          )
                                                        : t(
                                                              "supplier.inactive_supplier",
                                                              "Inactive Supplier",
                                                          )}
                                                </span>
                                            </div>
                                            <input
                                                type="checkbox"
                                                checked={
                                                    supplierForm.data.is_active
                                                }
                                                onChange={(e) =>
                                                    supplierForm.setData(
                                                        "is_active",
                                                        e.target.checked,
                                                    )
                                                }
                                                className="toggle toggle-primary"
                                            />
                                        </label>
                                    </div>

                                    {/* Supplier Type (only for new suppliers) */}
                                    {!supplierForm.data.id && (
                                        <div className="form-control">
                                            <label className="label py-0 mb-2">
                                                <span className="label-text font-bold text-gray-700 text-sm">
                                                    {t("supplier.supplier_type", "Supplier Type")}
                                                </span>
                                            </label>
                                            <label className="flex items-center justify-between p-3 border border-gray-300 rounded-lg hover:border-gray-900 cursor-pointer">
                                                <div className="flex items-center gap-3">
                                                    <div
                                                        className={`p-1 rounded ${supplierForm.data.type ? "bg-green-100" : "bg-red-100"}`}
                                                    >
                                                        {supplierForm.data
                                                            .type ? (
                                                            <CheckCircle
                                                                size={14}
                                                                className="text-green-600"
                                                            />
                                                        ) : (
                                                            <CheckCircle
                                                                size={14}
                                                                className="text-red-600"
                                                            />
                                                        )}
                                                    </div>
                                                    <span className="font-bold">
                                                        {supplierForm.data.type
                                                             ? t("supplier.global_supplier", "Global Supplier")
                                                             : t("supplier.local_supplier", "Local Supplier")}
                                                    </span>
                                                </div>
                                                <input
                                                    type="checkbox"
                                                    checked={
                                                        supplierForm.data.type
                                                    }
                                                    onChange={(e) => {
                                                        supplierForm.setData(
                                                            "type",
                                                            e.target.checked,
                                                        )
                                                    }}
                                                    className="toggle toggle-primary"
                                                />
                                            </label>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Address Section */}
                            <div className="mb-8">
                                <div className="form-control">
                                    <label className="label py-0 mb-2">
                                        <span className="label-text font-bold text-gray-700 text-sm">
                                            {t("supplier.address", "Address")}
                                        </span>
                                    </label>
                                    <div className="relative">
                                        <textarea
                                            value={supplierForm.data.address}
                                            onChange={(e) =>
                                                supplierForm.setData(
                                                    "address",
                                                    e.target.value,
                                                )
                                            }
                                            className="textarea textarea-bordered w-full pl-4 py-3 border-gray-300 focus:border-gray-900 focus:ring-1 focus:ring-gray-900 min-h-[80px]"
                                            rows="3"
                                            placeholder={t(
                                                "supplier.enter_full_address",
                                                "Enter full address (optional)",
                                            )}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Selected Account Preview (if any) */}
                            {supplierForm.data.account_id &&
                                getSupplierAccount(
                                    supplierForm.data.account_id,
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
                                                    "supplier.selected_account",
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
                                                            getSupplierAccount(
                                                                supplierForm
                                                                    .data
                                                                    .account_id,
                                                            ).type,
                                                        )}
                                                    </div>
                                                    <div>
                                                        <h5 className="font-bold text-gray-900">
                                                            {
                                                                getSupplierAccount(
                                                                    supplierForm
                                                                        .data
                                                                        .account_id,
                                                                ).name
                                                            }
                                                        </h5>
                                                        <p className="text-xs text-gray-600">
                                                            {t(
                                                                "supplier.default_payment_account",
                                                                "Default payment account",
                                                            )}
                                                        </p>
                                                    </div>
                                                </div>
                                                <span
                                                    className={`text-xs font-bold px-3 py-1.5 rounded-full ${getSupplierAccount(supplierForm.data.account_id).type === "cash" ? "bg-green-100 text-green-800" : getSupplierAccount(supplierForm.data.account_id).type === "bank" ? "bg-blue-100 text-blue-800" : "bg-purple-100 text-purple-800"}`}
                                                >
                                                    {getSupplierAccount(
                                                        supplierForm.data
                                                            .account_id,
                                                    ).type || "Bank"}
                                                </span>
                                            </div>

                                            <div className="mt-4 pt-4 border-t border-blue-200">
                                                <div className="flex items-center justify-between">
                                                    <div className="text-sm text-gray-700 font-medium">
                                                        {t(
                                                            "supplier.current_balance",
                                                            "Current Balance",
                                                        )}
                                                        :
                                                    </div>
                                                    <div className="font-mono font-bold text-xl text-green-700">
                                                        ৳
                                                        {formatCurrency(
                                                            getSupplierAccount(
                                                                supplierForm
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
                                        {t("supplier.cancel", "Cancel")}
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={supplierForm.processing}
                                        className="btn bg-gray-900 text-white flex-1 hover:bg-black"
                                    >
                                        {supplierForm.processing ? (
                                            <>
                                                <span className="loading loading-spinner loading-sm"></span>
                                                {t(
                                                    "supplier.processing",
                                                    "Processing...",
                                                )}
                                            </>
                                        ) : supplierForm.data.id ? (
                                            <>
                                                <CheckCircle size={18} />
                                                {t(
                                                    "supplier.update_supplier",
                                                    "Update Supplier",
                                                )}
                                            </>
                                        ) : (
                                            <>
                                                <Plus size={18} />
                                                {t(
                                                    "supplier.create_supplier",
                                                    "Create Supplier",
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