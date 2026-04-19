import React from "react";
import { Head, useForm, usePage, router } from "@inertiajs/react";
import PageHeader from "../../components/PageHeader";
import { ArrowLeft, Save, Calculator, Check } from "lucide-react";

export default function SaleEdit({ sale }) {
    const { auth } = usePage().props;
    
    const { data, setData, errors, processing, patch } = useForm({
        grand_total: sale.grand_total || 0,
        paid_amount: sale.paid_amount || 0,
        due_amount: sale.due_amount || 0,
        payment_type: sale.payment_type || "cash",
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        patch(route("sales.update", { sale: sale.id }), {
            preserveScroll: true,
        });
    };

    const calculateDueAmount = () => {
        const grandTotal = parseFloat(data.grand_total) || 0;
        const paidAmount = parseFloat(data.paid_amount) || 0;
        const dueAmount = grandTotal - paidAmount;
        
        setData("due_amount", Math.max(0, dueAmount).toFixed(2));
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-BD', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(amount);
    };

    const getStatusBadge = (status) => {
        const statusClasses = {
            completed: 'badge-success',
            cancelled: 'badge-error',
            pending: 'badge-warning',
        };
        
        return `badge capitalize ${statusClasses[status] || 'badge-warning'}`;
    };

    const getPaymentTypeOptions = () => [
        { value: "cash", label: "Cash" },
        { value: "card", label: "Card" },
        { value: "bank_transfer", label: "Bank Transfer" },
        { value: "digital_wallet", label: "Digital Wallet" },
    ];

    return (
        <div className="bg-white rounded-box p-5">
            <Head title={`Review Order Info - ${sale.invoice_no}`} />
            
            <PageHeader
                title={`Review Order Info for Accepted - ${sale.invoice_no}`}
                subtitle="Fill Up the Payment Information For General Dashboard before finalizing the Order."
            >
                <div className="flex items-center gap-3 flex-wrap">
                    <button
                        onClick={() => router.visit(route("sales.index"))}
                        className="btn btn-sm btn-ghost"
                    >
                        <ArrowLeft size={16} />
                        Back to Sales
                    </button>
                </div>
            </PageHeader>

            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Left Column - Read-only Information */}
                    <div className="space-y-4">
                        <div className="card bg-base-100 border">
                            <div className="card-body">
                                <h3 className="card-title text-lg">Sale Information</h3>
                                
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="label">
                                                <span className="label-text font-semibold">Invoice No</span>
                                            </label>
                                            <div className="font-mono font-semibold text-lg">
                                                {sale.invoice_no}
                                            </div>
                                        </div>
                                        
                                        <div>
                                            <label className="label">
                                                <span className="label-text font-semibold">Status </span> <br />
                                            </label>
                                            <span className={getStatusBadge(sale.status)}>
                                                {sale.status}
                                            </span>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="label">
                                            <span className="label-text font-semibold">Customer</span>
                                        </label>
                                        <div className="space-y-1">
                                            <p className="font-medium">
                                                {sale.customer?.customer_name || "Walk-in Customer"}
                                            </p>
                                            {sale.customer?.phone && (
                                                <p className="text-sm text-gray-500">
                                                    {sale.customer.phone}
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-3 gap-4">
                                  
                                        <div>
                                            <label className="label">
                                                <span className="label-text font-semibold">Shadow Sub Total</span>
                                            </label>
                                            <div className="font-semibold">
                                                {formatCurrency(sale.shadow_sub_total)} Tk
                                            </div>
                                        </div>

                                        <div>
                                            <label className="label">
                                                <span className="label-text font-semibold">Shadow Grand Total</span>
                                            </label>
                                            <div className="font-semibold">
                                                {formatCurrency(sale.shadow_grand_total)} Tk
                                            </div>
                                        </div>

                                        <div>
                                            <label className="label">
                                                <span className="label-text font-semibold">Shadow Paid Total</span>
                                            </label>
                                            <div className="font-semibold">
                                                {formatCurrency(sale.shadow_paid_amount)} Tk
                                            </div>
                                        </div>

                                        <div>
                                            <label className="label">
                                                <span className="label-text font-semibold">Shadow Due Total</span>
                                            </label>
                                            <div className="font-semibold">
                                                {formatCurrency(sale.shadow_due_amount)} Tk
                                            </div>
                                        </div>
                                        
                                        <div>
                                            <label className="label">
                                                <span className="label-text font-semibold">Discount</span>
                                            </label>
                                            <div className="font-semibold">
                                                {formatCurrency(sale.discount)} Tk
                                            </div>
                                        </div>
                                        
                                        <div>
                                            <label className="label">
                                                <span className="label-text font-semibold">VAT Tax</span>
                                            </label>
                                            <div className="font-semibold">
                                                {formatCurrency(sale.vat_tax)} Tk
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="label">
                                            <span className="label-text font-semibold">Sale Type</span> <br />
                                        </label>
                                        <div className="badge badge-outline capitalize">
                                            {sale.type}
                                        </div>
                                    </div>

                                    <div>
                                        <label className="label">
                                            <span className="label-text font-semibold">Created Date</span>
                                        </label>
                                        <div className="text-sm">
                                            {new Date(sale.created_at).toLocaleString("en-GB", {
                                                timeZone: "Asia/Dhaka",
                                                day: "2-digit",
                                                month: "2-digit",
                                                year: "numeric",
                                                hour: "2-digit",
                                                minute: "2-digit",
                                            })}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Sale Items Section */}
                        <div className="card bg-base-100 border">
                            <div className="card-body">
                                <h3 className="card-title text-lg">Sale Items</h3>
                                
                                <div className="overflow-x-auto">
                                    <table className="table table-auto w-full">
                                        <thead>
                                            <tr className="bg-base-200">
                                                <th>Product</th>
                                                <th>Variant</th>
                                                <th>Quantity</th>
                                                <th>Sh Price</th>
                                                <th>Sh Total</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {sale.items?.map((item, index) => (
                                                <tr key={item.id} className="hover:bg-base-100">
                                                    <td className="font-medium">
                                                        {item.product?.name || "N/A"} <br />
                                                      <span className="text-sm text-gray-500">({item.product?.product_no || " "})</span>
                                                    </td>
                                                    <td>
                                                        {item.variant?.size || "N/A"} {item.variant?.color ? ` - ${item.variant.color}` : ""}
                                                    </td>
                                                    <td className="text-center">
                                                        {item.quantity}
                                                    </td>
                                                    <td className="text-right">
                                                        {formatCurrency(item.shadow_unit_price)} Tk
                                                    </td>
                                                    <td className="text-right font-semibold">
                                                        {formatCurrency(item.shadow_total_price)} Tk
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                        <tfoot>
                                            <tr className="bg-base-200 font-semibold">
                                                <td colSpan="4" className="text-right">Total Items:</td>
                                                <td className="text-right">
                                                    {sale.items?.reduce((total, item) => total + item.quantity, 0) || 0}
                                                </td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="card bg-base-100 border border-primary">
                            <div className="card-body">
                                <h3 className="card-title text-lg text-primary">
                                    <Calculator size={20} />
                                    Payment Information
                                </h3>
                                
                                <div className="space-y-4">
                                    <div className="form-control">
                                        <label className="label">
                                            <span className="label-text font-semibold">Grand Total *</span>
                                        </label>
                                        <input
                                            type="number"
                                            
                                            min="0"
                                            value={data.grand_total}
                                            onChange={(e) => setData("grand_total", e.target.value)}
                                            onBlur={calculateDueAmount}
                                            className={`input input-bordered input-sm bg-gray-100 ${
                                                errors.grand_total ? "input-error" : ""
                                            }`}
                                            readOnly
                                        />
                                        {errors.grand_total && (
                                            <label className="label">
                                                <span className="label-text-alt text-error">
                                                    {errors.grand_total}
                                                </span>
                                            </label>
                                        )}
                                    </div>

                                    <div className="form-control">
                                        <label className="label">
                                            <span className="label-text font-semibold">Paid Amount *</span>
                                        </label>
                                        <input
                                            type="number"
                                            
                                            min="0"
                                            value={data.paid_amount}
                                            onChange={(e) => setData("paid_amount", e.target.value)}
                                            onBlur={calculateDueAmount}
                                            className={`input input-bordered ${
                                                errors.paid_amount ? "input-error" : ""
                                            }`}
                                            required
                                        />
                                        {errors.paid_amount && (
                                            <label className="label">
                                                <span className="label-text-alt text-error">
                                                    {errors.paid_amount}
                                                </span>
                                            </label>
                                        )}
                                    </div>

                                    <div className="form-control">
                                        <label className="label">
                                            <span className="label-text font-semibold">Due Amount *</span>
                                        </label>
                                        <input
                                            type="number"
                                            
                                            min="0"
                                            value={data.due_amount}
                                            onChange={(e) => setData("due_amount", e.target.value)}
                                            className={`input input-bordered ${
                                                errors.due_amount ? "input-error" : ""
                                            }`}
                                            required
                                        />
                                        {errors.due_amount && (
                                            <label className="label">
                                                <span className="label-text-alt text-error">
                                                    {errors.due_amount}
                                                </span>
                                            </label>
                                        )}
                                    </div>

                                    <div className="form-control">
                                        <label className="label">
                                            <span className="label-text font-semibold">Payment Type *</span>
                                        </label>
                                        <select
                                            value={data.payment_type}
                                            onChange={(e) => setData("payment_type", e.target.value)}
                                            className={`select select-bordered ${
                                                errors.payment_type ? "select-error" : ""
                                            }`}
                                            required
                                        >
                                            {getPaymentTypeOptions().map(option => (
                                                <option key={option.value} value={option.value}>
                                                    {option.label}
                                                </option>
                                            ))}
                                        </select>
                                        {errors.payment_type && (
                                            <label className="label">
                                                <span className="label-text-alt text-error">
                                                    {errors.payment_type}
                                                </span>
                                            </label>
                                        )}
                                    </div>

                                    <div className="form-control">
                                        <button
                                            type="button"
                                            onClick={calculateDueAmount}
                                            className="btn btn-outline btn-sm self-start"
                                        >
                                            <Calculator size={16} />
                                            Auto-calculate Due Amount
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Summary Card */}
                        <div className="card bg-base-100 border">
                            <div className="card-body">
                                <h3 className="card-title text-lg">Payment Summary</h3>
                                
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm">Grand Total:</span>
                                        <span className="font-semibold text-primary">
                                            {formatCurrency(data.grand_total)} Tk
                                        </span>
                                    </div>
                                    
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm">Paid Amount:</span>
                                        <span className="font-semibold text-success">
                                            {formatCurrency(data.paid_amount)} Tk
                                        </span>
                                    </div>
                                    
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm">Due Amount:</span>
                                        <span className={`font-semibold ${
                                            data.due_amount > 0 ? "text-error" : "text-success"
                                        }`}>
                                            {formatCurrency(data.due_amount)} Tk
                                        </span>
                                    </div>
                                    
                                    <div className="divider my-2"></div>
                                    
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm">Payment Status:</span>
                                        <span className={`badge ${
                                            data.due_amount > 0 ? "badge-warning" : "badge-success"
                                        }`}>
                                            {data.due_amount > 0 ? "Partial Payment" : "Fully Paid"}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end gap-3 pt-6 border-t">
                    <button
                        type="button"
                        onClick={() => router.visit(route("sales.index"))}
                        className="btn btn-ghost"
                        disabled={processing}
                    >
                        Cancel
                    </button>
                    
                    <button
                        type="submit"
                        className="btn bg-[#1e4d2b] text-white"
                        disabled={processing}
                    >
                        {processing ? (
                            <span className="loading loading-spinner"></span>
                        ) : (
                            <Check size={16} />
                        )}
                        Accepted Order
                    </button>
                </div>
            </form>
        </div>
    );
}