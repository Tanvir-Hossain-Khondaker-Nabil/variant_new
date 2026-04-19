import { useForm, router } from "@inertiajs/react";
import { useState, useEffect } from "react";
import { 
    ArrowLeft, Save, Building2, User, Mail, Phone, MapPin, 
    FileText, CreditCard, Calendar, DollarSign, Shield, 
    Star, FileCheck, TrendingUp, Clock, CheckCircle, XCircle,
    RefreshCw, AlertTriangle, Eye
} from "lucide-react";

export default function Edit({ dealership, companies, users }) {
    
    console.log("Dealership Data:", dealership);
    
    const { data, setData, put, processing, errors } = useForm({
        email: "",
        phone: "",
        address: "",
        credit_limit: "",
        payment_terms: "",
        contract_start: "",
        contract_end: "",
        status: "pending",
        remarks: "",
        contract_file: null,
        agreement_doc: null,
        bank_guarantee_doc: null,
        trade_license_doc: null,
        nid_doc: null,
        tax_clearance_doc: null
    });

    const [existingFiles, setExistingFiles] = useState({
        agreement_doc: null,
        bank_guarantee_doc: null,
        trade_license_doc: null,
        nid_doc: null,
        tax_clearance_doc: null,
        contract_file: null
    });

    useEffect(() => {
        if (dealership) {
            setData({
                company_id: dealership.company_id || "",
                name: dealership.name || "",
                owner_name: dealership.owner_name || "",
                email: dealership.email || "",
                phone: dealership.phone || "",
                address: dealership.address || "",
                trade_license_no: dealership.trade_license_no || "",
                tin_no: dealership.tin_no || "",
                nid_no: dealership.nid_no || "",
                advance_amount: dealership.advance_amount || "",
                due_amount: dealership.due_amount || "",
                credit_limit: dealership.credit_limit || "",
                payment_terms: dealership.payment_terms || "",
                contract_start: dealership.contract_start || "",
                contract_end: dealership.contract_end || "",
                contract_file: null,
                status: dealership.status || "pending",
                remarks: dealership.remarks || "",
                last_order_date: dealership.last_order_date || "",
                agreement_doc: null,
                bank_guarantee_doc: null,
                trade_license_doc: null,
                nid_doc: null,
                tax_clearance_doc: null
            });

            setExistingFiles({
                agreement_doc: dealership.agreement_doc,
                bank_guarantee_doc: dealership.bank_guarantee_doc,
                trade_license_doc: dealership.trade_license_doc,
                nid_doc: dealership.nid_doc,
                tax_clearance_doc: dealership.tax_clearance_doc,
                contract_file: dealership.contract_file
            });
        }
    }, [dealership]);

    // Handle file input changes
    const handleFileChange = (fieldName, file) => {
        setData(fieldName, file);
        // Keep existing file URL if no new file is selected
        if (!file && existingFiles[fieldName]) {
            setData(fieldName, existingFiles[fieldName]);
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        put(route("dealerships.update", dealership.id), {
            preserveScroll: true,
        });
    };

    // Format currency
    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-BD', {
            style: 'currency',
            currency: 'BDT',
            minimumFractionDigits: 2
        }).format(amount || 0);
    };

    // Format date for input fields
    const formatDateForInput = (dateString) => {
        if (!dateString) return '';
        return new Date(dateString).toISOString().split('T')[0];
    };

    // Get status details
    const getStatusDetails = (status) => {
        const details = {
            active: { label: 'Active', color: 'text-green-600', bgColor: 'bg-green-50', borderColor: 'border-green-200' },
            pending: { label: 'Pending', color: 'text-yellow-600', bgColor: 'bg-yellow-50', borderColor: 'border-yellow-200' },
            suspended: { label: 'Suspended', color: 'text-red-600', bgColor: 'bg-red-50', borderColor: 'border-red-200' },
            inactive: { label: 'Inactive', color: 'text-gray-600', bgColor: 'bg-gray-50', borderColor: 'border-gray-200' },
        };
        return details[status] || details.pending;
    };

    const statusDetails = getStatusDetails(dealership?.status);

    // Calculate contract days remaining
    const getContractDaysRemaining = () => {
        if (!dealership?.contract_end) return 0;
        const endDate = new Date(dealership.contract_end);
        const today = new Date();
        const diffTime = endDate - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays > 0 ? diffDays : 0;
    };

    const daysRemaining = getContractDaysRemaining();

    // Show loading state if dealership is not available yet
    if (!dealership) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
                <div className="max-w-7xl mx-auto">
                    <div className="flex items-center justify-center h-64">
                        <div className="text-center">
                            <RefreshCw className="animate-spin h-8 w-8 text-blue-600 mx-auto mb-4" />
                            <p className="text-gray-600">Loading dealership data...</p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800">Edit Dealership</h1>
                        <p className="text-gray-600 mt-2">Update dealership information and details</p>
                    </div>
                    <a
                        href={route("dealerships.index")}
                        className="group flex items-center gap-2 px-4 py-2 bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200 hover:border-blue-300"
                    >
                        <ArrowLeft size={18} className="text-gray-600 group-hover:text-blue-600 transition-colors" />
                        <span className="font-medium text-gray-700 group-hover:text-blue-600 transition-colors">Back</span>
                    </a>
                </div>

                {/* Current Status Banner */}
                <div className={`mb-6 p-4 rounded-xl border ${statusDetails.borderColor} ${statusDetails.bgColor}`}>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${statusDetails.bgColor}`}>
                                <Building2 size={20} className={statusDetails.color} />
                            </div>
                            <div>
                                <h3 className={`font-semibold ${statusDetails.color}`}>
                                    {dealership.name} - {statusDetails.label}
                                </h3>
                                <p className="text-sm text-gray-600">
                                    Dealership ID: #{dealership.id} • Created: {new Date(dealership.created_at).toLocaleDateString()}
                                </p>
                            </div>
                        </div>
                        {daysRemaining > 0 && (
                            <div className="text-right">
                                <p className={`text-sm font-medium ${
                                    daysRemaining < 30 ? 'text-red-600' : daysRemaining < 90 ? 'text-yellow-600' : 'text-green-600'
                                }`}>
                                    {daysRemaining} days remaining in contract
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Basic Information Card */}
                    <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100">
                        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4">
                            <div className="flex items-center gap-3">
                                <Building2 className="text-white" size={24} />
                                <h2 className="text-xl font-semibold text-white">Basic Information</h2>
                            </div>
                        </div>
                        <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                                    <Building2 size={16} className="text-blue-600" />
                                    Company *
                                </label>
                                <select
                                    value={data.company_id}
                                    disabled
                                    onChange={(e) => setData("company_id", e.target.value)}
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-gray-300"
                                >
                                    <option value="">Select Company</option>
                                    {companies?.map((c) => (
                                        <option key={c.id} value={c.id}>
                                            {c.name}
                                        </option>
                                    ))}
                                </select>
                                {errors.company_id && (
                                    <p className="text-red-500 text-sm mt-2 flex items-center gap-1">
                                         {errors.company_id}
                                    </p>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Dealership Name *
                                </label>
                                <input
                                    type="text"
                                    value={data.name}
                                    onChange={(e) => setData("name", e.target.value)}
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-gray-300 "
                                    placeholder="Enter dealership name"
                                    readOnly
                                />
                                {errors.name && (
                                    <p className="text-red-500 text-sm mt-2 flex items-center gap-1">
                                         {errors.name}
                                    </p>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                                    <User size={16} className="text-green-600" />
                                    Owner Name
                                </label>
                                <input
                                    type="text"
                                    value={data.owner_name}
                                    onChange={(e) => setData("owner_name", e.target.value)}
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-gray-300 "
                                    placeholder="Enter owner's full name"
                                    readOnly
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                                    <Mail size={16} className="text-red-500" />
                                    Email Address
                                </label>
                                <input
                                    type="email"
                                    value={data.email}
                                    onChange={(e) => setData("email", e.target.value)}
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-gray-300"
                                    placeholder="email@example.com"
                                    readOnly
                                />
                                {errors.email && (
                                    <p className="text-red-500 text-sm mt-2 flex items-center gap-1">{errors.email}</p>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                                    <Phone size={16} className="text-purple-600" />
                                    Phone Number
                                </label>
                                <input
                                    type="text"
                                    value={data.phone}
                                    onChange={(e) => setData("phone", e.target.value)}
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-whitw-50 "
                                    placeholder="+1 (555) 000-0000"
                                />
                                {errors.phone && (
                                    <p className="text-red-500 text-sm mt-2 flex items-center gap-1">{errors.phone}</p>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                                    <MapPin size={16} className="text-orange-500" />
                                    Address
                                </label>
                                <input
                                    type="text"
                                    value={data.address}
                                    onChange={(e) => setData("address", e.target.value)}
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white-50"
                                    placeholder="Full business address"
                                />
                                {errors.address && (
                                    <p className="text-red-500 text-sm mt-2 flex items-center gap-1">{errors.address}</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Legal & Registration Information */}
                    <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100">
                        <div className="bg-gradient-to-r from-amber-600 to-orange-600 px-6 py-4">
                            <div className="flex items-center gap-3">
                                <Shield className="text-white" size={24} />
                                <h2 className="text-xl font-semibold text-white">Legal & Registration</h2>
                            </div>
                        </div>
                        <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            <div className="bg-gradient-to-br from-amber-50 to-orange-50 p-4 rounded-xl border border-amber-100">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Trade License No.
                                </label>
                                <input
                                    readOnly
                                    type="text"
                                    value={data.trade_license_no}
                                    onChange={(e) => setData("trade_license_no", e.target.value)}
                                    className="w-full px-4 py-3  rounded-lg 0 transition-all duration-200 bg-gray-300"
                                    placeholder="Trade license number"
                                />
                                {errors.trade_license_no && (
                                    <p className="text-sm text-red-600 mt-2">{errors.trade_license_no}</p>
                                )}
                            </div>

                            <div className="bg-gradient-to-br from-blue-50 to-cyan-50 p-4 rounded-xl border border-blue-100">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    TIN No.
                                </label>
                                <input
                                    type="text"
                                    value={data.tin_no}
                                    onChange={(e) => setData("tin_no", e.target.value)}
                                    className="w-full px-4 py-3  rounded-lg  transition-all duration-200 bg-gray-300"
                                    placeholder="Tax identification number"
                                    readOnly
                                />
                                {errors.tin_no && (
                                    <p className="text-sm text-red-600 mt-2">{errors.tin_no}</p>
                                )}
                            </div>

                            <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-4 rounded-xl border border-green-100">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    NID No.
                                </label>
                                <input
                                    type="text"
                                    value={data.nid_no}
                                    onChange={(e) => setData("nid_no", e.target.value)}
                                    className="w-full px-4 py-3  rounded-lg  transition-all duration-200 bg-gray-300"
                                    placeholder="National ID number"
                                    readOnly
                                />
                                {errors.nid_no && (
                                    <p className="text-sm text-red-600 mt-2">{errors.nid_no}</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Financial Information Card */}
                    <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100">
                        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-4">
                            <div className="flex items-center gap-3">
                                <DollarSign className="text-white" size={24} />
                                <h2 className="text-xl font-semibold text-white">Financial Information</h2>
                            </div>
                        </div>
                        <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-4 rounded-xl border border-green-100">
                                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                                    <DollarSign size={16} className="text-green-600" />
                                    Advance Amount (Tk)
                                </label>
                                <input
                                    type="number"
                                    value={data.advance_amount}
                                    onChange={(e) => setData("advance_amount", e.target.value)}
                                    className="w-full px-4 py-3  rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200 bg-gray-300"
                                    placeholder="0.00"
                                    
                                    readOnly
                                />
                                {errors.advance_amount && (
                                    <p className="text-sm text-red-600 mt-2">{errors.advance_amount}</p>
                                )}
                            </div>

                            <div className="bg-gradient-to-br from-yellow-50 to-amber-50 p-4 rounded-xl border border-yellow-100">
                                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                                    <CreditCard size={16} className="text-yellow-600" />
                                    Due Amount (Tk)
                                </label>
                                <input
                                    type="number"
                                    value={data.due_amount}
                                    onChange={(e) => setData("due_amount", e.target.value)}
                                    className="w-full px-4 py-3  rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-all duration-200 bg-gray-300"
                                    placeholder="0.00"
                                    
                                    readOnly
                                />
                            </div>

                            <div className="bg-gradient-to-br from-blue-50 to-cyan-50 p-4 rounded-xl border border-blue-100">
                                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                                    <CreditCard size={16} className="text-blue-600" />
                                    Credit Limit (Tk)
                                </label>
                                <input
                                    type="number"
                                    value={data.credit_limit}
                                    onChange={(e) => setData("credit_limit", e.target.value)}
                                    className="w-full px-4 py-3 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white"
                                    placeholder="0.00"
                                    
                                />
                            </div>

                            <div className="bg-gradient-to-br from-purple-50 to-violet-50 p-4 rounded-xl border border-purple-100">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Payment Terms
                                </label>
                                <input
                                    type="text"
                                    value={data.payment_terms}
                                    onChange={(e) => setData("payment_terms", e.target.value)}
                                    className="w-full px-4 py-3 border border-purple-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200 bg-white"
                                    placeholder="e.g., 30 days credit"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Contract Information Card */}
                    <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100">
                        <div className="bg-gradient-to-r from-purple-600 to-pink-600 px-6 py-4">
                            <div className="flex items-center gap-3">
                                <Calendar className="text-white" size={24} />
                                <h2 className="text-xl font-semibold text-white">Contract Information</h2>
                            </div>
                        </div>
                        <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-4 rounded-xl border border-purple-100">
                                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                                    <Calendar size={16} className="text-purple-600" />
                                    Contract Start Date
                                </label>
                                <input
                                    type="date"
                                    value={formatDateForInput(data.contract_start)}
                                    onChange={(e) => setData("contract_start", e.target.value)}
                                    readOnly
                                    className="w-full px-4 py-3 border border-purple-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200 bg-gray-300"
                                />
                                {errors.contract_start && (
                                    <p className="text-sm text-red-600 mt-2">{errors.contract_start}</p>    
                                )}
                            </div>

                            <div className="bg-gradient-to-br from-pink-50 to-rose-50 p-4 rounded-xl border border-pink-100">
                                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                                    <Calendar size={16} className="text-pink-600" />
                                    Contract End Date
                                </label>
                                <input
                                    type="date"
                                    value={formatDateForInput(data.contract_end)}
                                    onChange={(e) => setData("contract_end", e.target.value)}
                                    readOnly
                                    className="w-full px-4 py-3 border border-pink-200 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-all duration-200 bg-gray-300"
                                />
                                {errors.contract_end && (
                                    <p className="text-sm text-red-600 mt-2">{errors.contract_end}</p>    
                                )}
                            </div>

                            <div className="bg-gradient-to-br from-gray-50 to-slate-50 p-4 rounded-xl border border-gray-100">
                                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                                    <Clock size={16} className="text-gray-600" />
                                    Last Order Date
                                </label>
                                <input
                                    type="date"
                                    value={formatDateForInput(data.last_order_date)}
                                    readOnly
                                    onChange={(e) => setData("last_order_date", e.target.value)}
                                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-gray-500 transition-all duration-200 bg-gray-300"
                                />
                            </div>

                            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-4 rounded-xl border border-blue-100">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Status
                                </label>
                                <select
                                    disabled
                                    value={data.status}
                                    onChange={(e) => setData("status", e.target.value)}
                                    className="w-full px-4 py-3 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-gray-300"
                                >
                                    <option value="pending">Pending</option>
                                    <option value="active">Active</option>
                                    <option value="suspended">Suspended</option>
                                    <option value="inactive">Inactive</option>
                                </select>
                            </div>
                        </div>
                    </div>


                    {/* Document Uploads Card */}
                    <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100">
                        <div className="bg-gradient-to-r from-indigo-600 to-blue-600 px-6 py-4">
                            <div className="flex items-center gap-3">
                                <FileCheck className="text-white" size={24} />
                                <h2 className="text-xl font-semibold text-white">Document Uploads</h2>
                            </div>
                        </div>
                        <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {/* Agreement Document */}
                            <div className="file-upload-container">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Agreement Document
                                </label>
                                <div className="space-y-2">
                                    {existingFiles.agreement_doc && (
                                        <div className="flex items-center justify-between bg-green-50 p-2 rounded-lg">
                                            <span className="text-sm text-green-700 flex items-center gap-1">
                                                <CheckCircle size={14} />
                                                File exists
                                            </span>
                                            <a 
                                                href={`/storage/${existingFiles.agreement_doc}`} 
                                                target="_blank" 
                                                rel="noopener noreferrer"
                                                className="btn btn-xs btn-outline"
                                            >
                                                <Eye size={12} /> View
                                            </a>
                                        </div>
                                    )}
                              
                                </div>
                                {errors.agreement_doc && (
                                    <p className="text-sm text-red-600 mt-2">{errors.agreement_doc}</p>
                                )}
                            </div>

                            {/* Bank Guarantee Document */}
                            <div className="file-upload-container">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Bank Guarantee Document
                                </label>
                                <div className="space-y-2">
                                    {existingFiles.bank_guarantee_doc && (
                                        <div className="flex items-center justify-between bg-green-50 p-2 rounded-lg">
                                            <span className="text-sm text-green-700 flex items-center gap-1">
                                                <CheckCircle size={14} />
                                                File exists
                                            </span>
                                            <a 
                                                href={`/storage/${existingFiles.bank_guarantee_doc}`} 
                                                target="_blank" 
                                                rel="noopener noreferrer"
                                                className="btn btn-xs btn-outline"
                                            >
                                                <Eye size={12} /> View
                                            </a>
                                        </div>
                                    )}
                           
                                </div>
                            </div>

                            {/* Trade License Document */}
                            <div className="file-upload-container">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Trade License Document
                                </label>
                                <div className="space-y-2">
                                    {existingFiles.trade_license_doc && (
                                        <div className="flex items-center justify-between bg-green-50 p-2 rounded-lg">
                                            <span className="text-sm text-green-700 flex items-center gap-1">
                                                <CheckCircle size={14} />
                                                File exists
                                            </span>
                                            <a
                                                href={`/storage/${existingFiles.trade_license_doc}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="btn btn-xs btn-outline"
                                            >
                                                <Eye size={12} /> View
                                            </a>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* NID Document */}
                            <div className="file-upload-container">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    NID Document
                                </label>
                                <div className="space-y-2">
                                    {existingFiles.nid_doc && (
                                        <div className="flex items-center justify-between bg-green-50 p-2 rounded-lg">
                                            <span className="text-sm text-green-700 flex items-center gap-1">
                                                <CheckCircle size={14} />
                                                File exists
                                            </span>
                                            <a
                                                href={`/storage/${existingFiles.nid_doc}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="btn btn-xs btn-outline"
                                            >
                                                <Eye size={12} /> View
                                            </a>
                                        </div>
                                    )}
                           
                                </div>
                            </div>

                            {/* Tax Clearance Document */}
                            <div className="file-upload-container">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Tax Clearance Document
                                </label>
                                <div className="space-y-2">
                                    {existingFiles.tax_clearance_doc && (
                                        <div className="flex items-center justify-between bg-green-50 p-2 rounded-lg">
                                            <span className="text-sm text-green-700 flex items-center gap-1">
                                                <CheckCircle size={14} />
                                                File exists
                                            </span>
                                            <a
                                                href={`/storage/${existingFiles.tax_clearance_doc}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="btn btn-xs btn-outline"
                                            >
                                                <Eye size={12} /> View
                                            </a>
                                        </div>
                                    )}
                                
                                </div>
                            </div>

                            {/* Contract File */}
                            <div className="file-upload-container">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Contract File
                                </label>
                                <div className="space-y-2">
                                    {existingFiles.contract_file && (
                                        <div className="flex items-center justify-between bg-green-50 p-2 rounded-lg">
                                            <span className="text-sm text-green-700 flex items-center gap-1">
                                                <CheckCircle size={14} />
                                                File exists
                                            </span>
                                            <a
                                                href={`/storage/${existingFiles.contract_file}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="btn btn-xs btn-outline"
                                            >
                                                <Eye size={12} /> View
                                            </a>
                                        </div>
                                    )}
                             
                                </div>
                            </div>
                        </div>

  
                    </div>

                    {/* Additional Information Card */}
                    <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100">
                        <div className="bg-gradient-to-r from-gray-600 to-slate-700 px-6 py-4">
                            <div className="flex items-center gap-3">
                                <FileText className="text-white" size={24} />
                                <h2 className="text-xl font-semibold text-white">Additional Information</h2>
                            </div>
                        </div>
                        <div className="p-6">
                            <div className="mb-6">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Remarks & Notes
                                </label>
                                <textarea
                                    value={data.remarks}
                                    onChange={(e) => setData("remarks", e.target.value)}
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-gray-50 hover:bg-white resize-none"
                                    rows={4}
                                    placeholder="Any additional notes or remarks about this dealership..."
                                />
                                {errors.remarks && (
                                    <p className="text-sm text-red-600 mt-2">{errors.remarks}</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Submit Buttons */}
                    <div className="flex justify-end gap-4">
                        <a
                            href={route("dealerships.index")}
                            className="group flex items-center gap-2 px-6 py-3 bg-white rounded-xl font-semibold text-gray-700 border border-gray-300 hover:border-red-300 hover:text-red-700 transition-all duration-200"
                        >
                            Cancel
                        </a>
                        <button
                            disabled={processing}
                            className={`
                                group flex items-center gap-3 px-8 py-3 rounded-xl font-semibold text-white
                                transition-all duration-200 transform hover:scale-105 active:scale-95
                                ${processing 
                                    ? 'bg-gray-400 cursor-not-allowed' 
                                    : 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 shadow-lg hover:shadow-xl'
                                }
                            `}
                        >
                            <Save size={20} className={processing ? 'animate-pulse' : 'group-hover:animate-bounce'} />
                            {processing ? "Updating Dealership..." : "Update Dealership"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}