import { router, Link } from "@inertiajs/react";
import { ArrowLeft, Calendar, DollarSign, FileText, CreditCard, CheckCircle, XCircle, Clock, Download, Printer, Banknote } from "lucide-react";
import { useTranslation } from "../../hooks/useTranslation";
import { useState } from "react";

export default function ShowInstallment({ installments, accounts }) {
    const { t, locale } = useTranslation();
    const [selectedInstallment, setSelectedInstallment] = useState(null);
    const [paymentForm, setPaymentForm] = useState({
        installment: null,
        show: false,
        account_id: '',
        payment_date: new Date().toISOString().split('T')[0],
        amount: '',
    });
    
    // Calculate totals
    const totalAmount = installments.reduce((sum, installment) => sum + parseFloat(installment.amount || 0), 0);
    const totalPaid = installments.reduce((sum, installment) => 
        sum + (installment.status === 'paid' ? parseFloat(installment.amount || 0) : 0), 0);
    const totalPending = installments.reduce((sum, installment) => 
        sum + (installment.status === 'pending' ? parseFloat(installment.amount || 0) : 0), 0);
    const totalOverdue = installments.reduce((sum, installment) => 
        sum + (installment.status === 'overdue' ? parseFloat(installment.amount || 0) : 0), 0);
    
    // Find first sale/purchase data
    const firstInstallment = installments[0];
    const transactionType = firstInstallment?.sale_id ? 'sale' : 'purchase';
    const transactionId = firstInstallment?.sale_id || firstInstallment?.purchase_id;
    
    const getStatusColor = (status) => {
        switch(status?.toLowerCase()) {
            case 'paid':
                return 'bg-green-100 text-green-800 border-green-200';
            case 'pending':
                return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            case 'overdue':
                return 'bg-red-100 text-red-800 border-red-200';
            case 'partial':
                return 'bg-blue-100 text-blue-800 border-blue-200';
            default:
                return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };
    
    const getStatusIcon = (status) => {
        switch(status?.toLowerCase()) {
            case 'paid':
                return <CheckCircle size={16} className="text-green-600" />;
            case 'pending':
                return <Clock size={16} className="text-yellow-600" />;
            case 'overdue':
                return <XCircle size={16} className="text-red-600" />;
            case 'partial':
                return <CreditCard size={16} className="text-blue-600" />;
            default:
                return <Clock size={16} className="text-gray-600" />;
        }
    };
    
    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString(locale === 'bn' ? 'bn-BD' : 'en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    const showPaymentForm = (installment) => {
        setPaymentForm({
            installment: installment,
            show: true,
            account_id: '',
            payment_date: new Date().toISOString().split('T')[0],
            amount: parseFloat(installment.amount || 0).toFixed(2),
        });
    };

    const submitPayment = () => {
        if (!paymentForm.account_id) {
            alert(t('installment.select_account_required', 'Please select an account'));
            return;
        }

        if (confirm(t('installment.confirm_mark_paid', 'Are you sure you want to mark this installment as paid?'))) {
            router.put(route('installments.update', paymentForm.installment.id), {
                status: 'paid',
                account_id: paymentForm.account_id,
                payment_date: paymentForm.payment_date,
                amount: paymentForm.amount,
            }, {
                onSuccess: () => {
                    setPaymentForm({
                        installment: null,
                        show: false,
                        account_id: '',
                        payment_date: new Date().toISOString().split('T')[0],
                        amount: '',
                    });
                }
            });
        }
    };
    
    return (
        <div className={`min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-4 ${locale === 'bn' ? 'bangla-font' : ''}`}>
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800">
                            {t('installment.installment_details', 'Installment Details')}
                        </h1>
                        <p className="text-gray-600 mt-2">
                            {transactionType === 'sale' 
                                ? t('installment.sale_installments', 'Installments for Sale') 
                                : t('installment.purchase_installments', 'Installments for Purchase')} 
                            #{transactionId}
                        </p>
                    </div>
                    <div className="flex items-center gap-4">
                        <Link
                            href={route('sales.index')} 
                            className="group flex items-center gap-2 px-4 py-2 bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200 hover:border-blue-300"
                        >
                            <ArrowLeft size={18} className="text-gray-600 group-hover:text-blue-600 transition-colors" />
                            <span className="font-medium text-gray-700 group-hover:text-blue-600 transition-colors">
                                {t('installment.back', 'Back')}
                            </span>
                        </Link>
                    </div>
                </div>
                
                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-medium text-gray-500">
                                {t('installment.total_amount', 'Total Amount')}
                            </h3>
                        </div>
                        <div className="text-2xl font-bold text-gray-800">
                            ৳ {totalAmount.toFixed(2)}
                        </div>
                        <div className="text-sm text-gray-500 mt-1">
                            {installments.length} {t('installment.installments', 'installments')}
                        </div>
                    </div>
                    
                    <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-medium text-gray-500">
                                {t('installment.paid', 'Paid')}
                            </h3>
                            <CheckCircle size={20} className="text-green-500" />
                        </div>
                        <div className="text-2xl font-bold text-green-600">
                           ৳ {totalPaid.toFixed(2)}
                        </div>
                        <div className="text-sm text-gray-500 mt-1">
                            {installments.filter(i => i.status === 'paid').length} {t('installment.completed', 'completed')}
                        </div>
                    </div>
                    
                    <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-medium text-gray-500">
                                {t('installment.pending', 'Pending')}
                            </h3>
                            <Clock size={20} className="text-yellow-500" />
                        </div>
                        <div className="text-2xl font-bold text-yellow-600">
                            ৳ {totalPending.toFixed(2)}
                        </div>
                        <div className="text-sm text-gray-500 mt-1">
                            {installments.filter(i => i.status === 'pending').length} {t('installment.due', 'due')}
                        </div>
                    </div>
                    
                    <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-medium text-gray-500">
                                {t('installment.overdue', 'Overdue')}
                            </h3>
                            <XCircle size={20} className="text-red-500" />
                        </div>
                        <div className="text-2xl font-bold text-red-600">
                           ৳ {totalOverdue.toFixed(2)}
                        </div>
                        <div className="text-sm text-gray-500 mt-1">
                            {installments.filter(i => i.status === 'overdue').length} {t('installment.overdue_installments', 'overdue')}
                        </div>
                    </div>
                </div>
                
                {/* Installment List Card */}
                <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100 mb-8">
                    <div className="px-6 py-4" style={{
                        background: "linear-gradient(rgb(15, 45, 26) 0%, rgb(30, 77, 43) 100%)",
                    }}>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <CreditCard className="text-white" size={24} />
                                <h2 className="text-xl font-semibold text-white">
                                    {t('installment.installment_schedule', 'Installment Schedule')}
                                </h2>
                            </div>
                        </div>
                    </div>
                    
                    <div className="p-6">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-gray-200">
                                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">
                                            {t('installment.installment', 'Installment')} #
                                        </th>
                                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">
                                            {t('installment.due_date', 'Due Date')}
                                        </th>
                                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">
                                            {t('installment.amount', 'Amount')}
                                        </th>
                                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">
                                            {t('installment.status', 'Status')}
                                        </th>
                                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">
                                            {t('installment.payment_date', 'Payment Date')}
                                        </th>
                                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">
                                            {t('installment.actions', 'Actions')}
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {installments.length === 0 ? (
                                        <tr>
                                            <td colSpan="6" className="text-center py-8 text-gray-500">
                                                {t('installment.no_installments', 'No installments found')}
                                            </td>
                                        </tr>
                                    ) : (
                                        installments.map((installment, index) => (
                                            <tr 
                                                key={installment.id} 
                                                className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                                            >
                                                <td className="py-4 px-4">
                                                    <div className="font-medium text-gray-800">
                                                        #{index + 1}
                                                    </div>
                                                </td>
                                                <td className="py-4 px-4">
                                                    <div className="flex items-center gap-2">
                                                        <Calendar size={14} className="text-gray-400" />
                                                        <span className="text-gray-700">
                                                            {formatDate(installment.due_date)}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="py-4 px-4">
                                                    <div className="font-semibold text-gray-800">
                                                        ৳ {parseFloat(installment.amount || 0).toFixed(2)}
                                                    </div>
                                                </td>
                                                <td className="py-4 px-4">
                                                    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border ${getStatusColor(installment.status)}`}>
                                                        {getStatusIcon(installment.status)}
                                                        <span className="text-sm font-medium capitalize">
                                                            {installment.status || 'pending'}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="py-4 px-4">
                                                    <div className="text-gray-700">
                                                        {installment.paid_date ? formatDate(installment.paid_date) : '—'}
                                                    </div>
                                                </td>
                                                <td className="py-4 px-4">
                                                    <div className="flex items-center gap-2">
                                                        {installment.status !== 'paid' && (
                                                            <button
                                                                onClick={() => showPaymentForm(installment)}
                                                                className="px-3 py-1 text-sm bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors"
                                                            >
                                                                {t('installment.mark_paid', 'Mark Paid')}
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={() => setSelectedInstallment(installment)}
                                                            className="px-3 py-1 text-sm border border-gray-300 hover:bg-gray-100 text-gray-700 rounded-lg transition-colors"
                                                        >
                                                            {t('installment.view', 'View')}
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
                
                {/* Installment Details Modal */}
                {selectedInstallment && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
                            <div className="px-6 py-4" style={{
                                background: "linear-gradient(rgb(15, 45, 26) 0%, rgb(30, 77, 43) 100%)",
                            }}>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <FileText className="text-white" size={20} />
                                        <h3 className="text-lg font-semibold text-white">
                                            {t('installment.installment_details', 'Installment Details')}
                                        </h3>
                                    </div>
                                    <button
                                        onClick={() => setSelectedInstallment(null)}
                                        className="text-white/80 hover:text-white"
                                    >
                                        <XCircle size={20} />
                                    </button>
                                </div>
                            </div>
                            
                            <div className="p-6 space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-500 mb-1">
                                        {t('installment.amount', 'Amount')}
                                    </label>
                                    <div className="text-lg font-bold text-gray-800">
                                       ৳ {parseFloat(selectedInstallment.amount || 0).toFixed(2)}
                                    </div>
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium text-gray-500 mb-1">
                                        {t('installment.due_date', 'Due Date')}
                                    </label>
                                    <div className="text-gray-700">
                                        {formatDate(selectedInstallment.due_date)}
                                    </div>
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium text-gray-500 mb-1">
                                        {t('installment.status', 'Status')}
                                    </label>
                                    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border ${getStatusColor(selectedInstallment.status)}`}>
                                        {getStatusIcon(selectedInstallment.status)}
                                        <span className="text-sm font-medium capitalize">
                                            {selectedInstallment.status || 'pending'}
                                        </span>
                                    </div>
                                </div>
                                
                                {selectedInstallment.payment_date && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-500 mb-1">
                                            {t('installment.payment_date', 'Payment Date')}
                                        </label>
                                        <div className="text-gray-700">
                                            {formatDate(selectedInstallment.payment_date)}
                                        </div>
                                    </div>
                                )}
                                
                                <div className="pt-4 flex justify-end">
                                    <button
                                        onClick={() => setSelectedInstallment(null)}
                                        className="px-6 py-2 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                                    >
                                        {t('installment.close', 'Close')}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Payment Form Modal */}
                {paymentForm.show && paymentForm.installment && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
                            <div className="px-6 py-4" style={{
                                background: "linear-gradient(rgb(15, 45, 26) 0%, rgb(30, 77, 43) 100%)",
                            }}>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <Banknote className="text-white" size={20} />
                                        <h3 className="text-lg font-semibold text-white">
                                            {t('installment.mark_as_paid', 'Mark as Paid')}
                                        </h3>
                                    </div>
                                    <button
                                        onClick={() => setPaymentForm({...paymentForm, show: false})}
                                        className="text-white/80 hover:text-white"
                                    >
                                        <XCircle size={20} />
                                    </button>
                                </div>
                            </div>
                            
                            <div className="p-6 space-y-4">
                                {/* Installment Info */}
                                <div className="bg-gray-50 p-4 rounded-lg mb-4">
                                    <h4 className="font-medium text-gray-800 mb-2">
                                        {t('installment.installment_info', 'Installment Information')}
                                    </h4>
                                    <div className="grid grid-cols-2 gap-2 text-sm">
                                        <div>
                                            <span className="text-gray-500">
                                                {t('installment.amount', 'Amount')}:
                                            </span>
                                            <span className="font-semibold text-gray-800 ml-2">
                                                ৳ {parseFloat(paymentForm.installment.amount || 0).toFixed(2)}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-gray-500">
                                                {t('installment.due_date', 'Due Date')}:
                                            </span>
                                            <span className="font-medium text-gray-800 ml-2">
                                                {formatDate(paymentForm.installment.due_date)}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Account Selection */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        {t('installment.select_account', 'Select Account')} *
                                    </label>
                                    <select
                                        value={paymentForm.account_id}
                                        onChange={(e) => setPaymentForm({...paymentForm, account_id: e.target.value})}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        required
                                    >
                                        <option value="">
                                            {t('installment.choose_account', 'Choose an account')}
                                        </option>
                                        {accounts.map((account) => (
                                            <option key={account.id} value={account.id}>
                                                {account.name} ({account.account_number}) -  ৳ {parseFloat(account.current_balance || 0).toFixed(2)}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Payment Date */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        {t('installment.payment_date', 'Payment Date')} *
                                    </label>
                                    <input
                                        type="date"
                                        value={paymentForm.payment_date}
                                        onChange={(e) => setPaymentForm({...paymentForm, payment_date: e.target.value})}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        required
                                    />
                                </div>

                                {/* Amount (can be modified for partial payments) */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        {t('installment.payment_amount', 'Payment Amount')} *
                                    </label>
                                    <input
                                        type="number"
                                        
                                        value={paymentForm.amount}
                                        onChange={(e) => setPaymentForm({...paymentForm, amount: e.target.value})}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        required
                                    />
                                    {parseFloat(paymentForm.amount) < parseFloat(paymentForm.installment.amount) && (
                                        <p className="text-yellow-600 text-sm mt-1">
                                            {t('installment.partial_payment_warning', 'This will be marked as a partial payment')}
                                        </p>
                                    )}
                                </div>


                                {/* Buttons */}
                                <div className="pt-4 flex justify-end gap-3">
                                    <button
                                        onClick={() => setPaymentForm({...paymentForm, show: false})}
                                        className="px-4 py-2 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                                    >
                                        {t('installment.cancel', 'Cancel')}
                                    </button>
                                    <button
                                        onClick={submitPayment}
                                        disabled={!paymentForm.account_id || !paymentForm.payment_date || !paymentForm.amount}
                                        className="px-6 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors"
                                    >
                                        {t('installment.confirm_payment', 'Confirm Payment')}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}